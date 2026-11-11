import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/app/journal-service.ts
var JournalService = class {
  #db;
  constructor(db) {
    this.#db = db;
  }
  list(options) {
    const entityFilter = options.entity ? "WHERE entity_kind = ?" : "";
    const params = [];
    if (options.entity) params.push(options.entity);
    params.push(options.limit, options.offset);
    const rows = this.#db.raw.prepare(`
      SELECT seq, entity_kind, entity_id, type, actor, payload, created_at
      FROM (
        SELECT seq, 'task' AS entity_kind, task_id AS entity_id, type, actor, payload, created_at
        FROM task_events
        UNION ALL
        SELECT seq, 'run' AS entity_kind, run_id AS entity_id, type, actor, payload, created_at
        FROM run_events
      ) ${entityFilter}
      ORDER BY created_at DESC, seq DESC
      LIMIT ? OFFSET ?
    `).all(...params);
    return {
      items: rows.map((row) => ({
        seq: Number(row.seq),
        entity_kind: row.entity_kind === "task" ? "task" : "run",
        entity_id: row.entity_id,
        type: row.type,
        actor: row.actor,
        payload: JSON.parse(row.payload),
        created_at: row.created_at
      })),
      limit: options.limit,
      offset: options.offset
    };
  }
};

// src/kernel/errors.ts
var AppError = class extends Error {
  code;
  status;
  details;
  constructor(code, message, status, details = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
};
var ValidationError = class extends AppError {
  constructor(message, details = {}) {
    super("validation_failed", message, 400, details);
  }
};

// src/modules/people/people.module.ts
function numberParam(raw, fallback, min, max) {
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}
function registerJournalRoutes(router, journal) {
  router.add("GET", "/api/journal", (c) => {
    const rawEntity = c.query.get("entity");
    if (rawEntity && rawEntity !== "task" && rawEntity !== "run") {
      throw new ValidationError("\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 entity: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E task \u0438\u043B\u0438 run");
    }
    return {
      body: {
        ok: true,
        ...journal.list({
          entity: rawEntity ? rawEntity : void 0,
          limit: numberParam(c.query.get("limit"), 50, 1, 200),
          offset: numberParam(c.query.get("offset"), 0, 0, 1e6)
        })
      }
    };
  });
}

// modules/journal/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0416\u0443\u0440\u043D\u0430\u043B \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { padding: 24px; max-width: 960px; }
  section { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .type { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: #cbd4e1; }
  .meta { color: #7f8a9c; font-size: 12px; }
  .empty { color: #7f8a9c; }
</style>
</head>
<body>
<header>
  <h1>\u0416\u0443\u0440\u043D\u0430\u043B</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <section>
    <h2>\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F</h2>
    <ul id="list"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
  </section>
</main>
<script>
(function () {
  var list = document.getElementById('list');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  fetch('/api/journal?limit=100').then(function (response) {
    return response.json().then(function (body) {
      if (!response.ok) throw new Error((body.error && body.error.message) || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430');
      return body;
    });
  }).then(function (body) {
    list.textContent = '';
    var items = body.items || [];
    if (!items.length) {
      list.appendChild(el('li', 'empty', '\u0421\u043E\u0431\u044B\u0442\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442'));
      return;
    }
    items.forEach(function (event) {
      var row = el('li');
      var head = el('div', 'row');
      head.appendChild(el('span', 'type', event.type));
      head.appendChild(el('span', 'meta', event.entity_kind + ' ' + event.entity_id));
      row.appendChild(head);
      row.appendChild(el('div', 'meta', event.actor + ' \xB7 ' + event.created_at));
      list.appendChild(row);
    });
  }).catch(function (failure) {
    list.textContent = '';
    list.appendChild(el('li', 'empty', failure.message));
  });
})();
</script>
</body>
</html>
`;

// modules/journal/index.ts
var module = {
  id: "journal",
  apiVersion: 1,
  register(ctx) {
    const journal = new JournalService(ctx.storage);
    ctx.publish({ journal });
    registerJournalRoutes(ctx.api, journal);
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
