import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/adapters/storage/sqlite-people.ts
function toPerson(row) {
  return {
    id: row.id,
    display: row.display,
    handles: JSON.parse(row.handles),
    notes: row.notes,
    tags: JSON.parse(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_seen_at: row.last_seen_at
  };
}
function toEntry(row) {
  return {
    id: row.id,
    person_id: row.person_id,
    text: row.text,
    source: row.source,
    kind: row.kind === "message" ? "message" : "note",
    created_at: row.created_at
  };
}
function likePattern(query) {
  return `%${query.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
var SqlitePeopleStore = class {
  #db;
  constructor(db) {
    this.#db = db;
  }
  count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS total FROM people").get();
    return Number(row.total);
  }
  list(query, limit) {
    const base = `
      SELECT p.*, (SELECT COUNT(*) FROM person_entries e WHERE e.person_id = p.id) AS entries_count
      FROM people p
    `;
    const rows = query.trim() ? this.#db.raw.prepare(`${base}
          WHERE p.search_text LIKE ? ESCAPE '\\'
             OR EXISTS (
               SELECT 1 FROM person_entries e
               WHERE e.person_id = p.id AND e.search_text LIKE ? ESCAPE '\\'
             )
          ORDER BY p.updated_at DESC
          LIMIT ?`).all(likePattern(query), likePattern(query), limit) : this.#db.raw.prepare(`${base} ORDER BY p.updated_at DESC LIMIT ?`).all(limit);
    return rows.map((row) => ({ ...toPerson(row), entries_count: Number(row.entries_count ?? 0) }));
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM people WHERE id = ?").get(id);
    return row ? toPerson(row) : null;
  }
  insert(person, searchText2) {
    this.#db.raw.prepare(`
      INSERT INTO people (id, display, handles, notes, tags, search_text, created_at, updated_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      person.id,
      person.display,
      JSON.stringify(person.handles),
      person.notes,
      JSON.stringify(person.tags),
      searchText2,
      person.created_at,
      person.updated_at,
      person.last_seen_at
    );
    return person;
  }
  update(id, patch, searchText2, updatedAt) {
    const current = this.get(id);
    if (!current) return null;
    const display = patch.display ?? current.display;
    const handles = patch.handles ?? current.handles;
    const notes = patch.notes ?? current.notes;
    const tags = patch.tags ?? current.tags;
    this.#db.raw.prepare(`
      UPDATE people
      SET display = ?, handles = ?, notes = ?, tags = ?, search_text = ?, updated_at = ?
      WHERE id = ?
    `).run(display, JSON.stringify(handles), notes, JSON.stringify(tags), searchText2, updatedAt, id);
    return this.get(id);
  }
  remove(id) {
    const result = this.#db.raw.prepare("DELETE FROM people WHERE id = ?").run(id);
    return Number(result.changes) > 0;
  }
  entries(personId, limit) {
    const rows = this.#db.raw.prepare("SELECT * FROM person_entries WHERE person_id = ? ORDER BY id DESC LIMIT ?").all(personId, limit);
    return rows.map(toEntry);
  }
  addEntry(personId, text2, source, kind, now) {
    const person = this.get(personId);
    if (!person) return null;
    const result = this.#db.raw.prepare(`
      INSERT INTO person_entries (person_id, text, source, kind, search_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(personId, text2, source, kind, text2.toLowerCase(), now);
    this.#db.raw.prepare("UPDATE people SET updated_at = ?, last_seen_at = ? WHERE id = ?").run(now, now, personId);
    const row = this.#db.raw.prepare("SELECT * FROM person_entries WHERE id = ?").get(Number(result.lastInsertRowid));
    return toEntry(row);
  }
  searchEntries(query, limit, personId) {
    const rows = personId ? this.#db.raw.prepare(`
          SELECT * FROM person_entries
          WHERE person_id = ? AND search_text LIKE ? ESCAPE '\\'
          ORDER BY id DESC LIMIT ?
        `).all(personId, likePattern(query), limit) : this.#db.raw.prepare(`
          SELECT * FROM person_entries
          WHERE search_text LIKE ? ESCAPE '\\'
          ORDER BY id DESC LIMIT ?
        `).all(likePattern(query), limit);
    return rows.map(toEntry);
  }
};

// src/kernel/clock.ts
var systemClock = {
  now: () => /* @__PURE__ */ new Date()
};
function nextTimestamp(previous, now) {
  const base = now.getTime();
  const prev = previous ? Date.parse(previous) : Number.NaN;
  return new Date(Number.isFinite(prev) ? Math.max(base, prev + 1) : base).toISOString();
}

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
var NotFoundError = class extends AppError {
  constructor(message = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E") {
    super("not_found", message, 404);
  }
};

// src/kernel/ids.ts
import { randomUUID } from "node:crypto";
function newId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// src/kernel/validate.ts
function record(raw, what) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`${what}: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442`);
  }
  return raw;
}
function text(raw, field, max, required = false) {
  if (raw === void 0 || raw === null) {
    if (required) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E`);
    return "";
  }
  if (typeof raw !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  const value = raw.trim();
  if (required && !value) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E`);
  if (value.length > max) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${max} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  return value;
}

// src/app/people-service.ts
var MAX_ENTRIES = 2e3;
function stringList(raw, field, max, itemMax) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C`);
  const values = raw.map((value, index) => text(value, `${field}[${index}]`, itemMax, true));
  return [...new Set(values)].slice(0, max);
}
function searchText(person) {
  return [person.display, ...person.handles, ...person.tags, person.notes].join("\n").toLowerCase();
}
var PeopleService = class {
  #store;
  #clock;
  constructor(store, clock = systemClock) {
    this.#store = store;
    this.#clock = clock;
  }
  stats() {
    return { count: this.#store.count() };
  }
  list(query = "", limit = 50) {
    const items = this.#store.list(query, limit);
    return { items, count: items.length };
  }
  get(id, limit = 50) {
    const person = this.#store.get(id);
    if (!person) throw new NotFoundError("\u0427\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A");
    return { person, entries: this.#store.entries(id, limit) };
  }
  create(raw) {
    const input = record(raw, "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430");
    const display = text(input.display, "display", 200, true);
    const handles = stringList(input.handles, "handles", 20, 200);
    const tags = stringList(input.tags, "tags", 20, 80);
    const notes = text(input.notes, "notes", 4e3);
    const now = this.#clock.now().toISOString();
    const person = {
      id: newId("person"),
      display,
      handles,
      tags,
      notes,
      created_at: now,
      updated_at: now,
      last_seen_at: null
    };
    return this.#store.insert(person, searchText(person));
  }
  update(id, raw) {
    const input = record(raw, "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430");
    const patch = {};
    if (input.display !== void 0) patch.display = text(input.display, "display", 200, true);
    if (input.handles !== void 0) patch.handles = stringList(input.handles, "handles", 20, 200);
    if (input.tags !== void 0) patch.tags = stringList(input.tags, "tags", 20, 80);
    if (input.notes !== void 0) patch.notes = text(input.notes, "notes", 4e3);
    if (!Object.keys(patch).length) throw new ValidationError("\u041D\u0435\u0442 \u043F\u043E\u043B\u0435\u0439 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F");
    const current = this.#store.get(id);
    if (!current) throw new NotFoundError("\u0427\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A");
    const merged = { ...current, ...patch };
    const updated = this.#store.update(
      id,
      patch,
      searchText(merged),
      nextTimestamp(current.updated_at, this.#clock.now())
    );
    if (!updated) throw new NotFoundError("\u0427\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A");
    return updated;
  }
  remove(id) {
    if (!this.#store.remove(id)) throw new NotFoundError("\u0427\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A");
    return { removed: true };
  }
  addEntry(id, raw) {
    const input = record(raw, "\u0417\u0430\u043F\u0438\u0441\u044C \u043F\u0430\u043C\u044F\u0442\u0438");
    const entryText = text(input.text, "text", 4e3, true);
    const source = text(input.source, "source", 120) || "panel";
    const kind = input.kind === "message" ? "message" : "note";
    const entry = this.#store.addEntry(id, entryText, source, kind, this.#clock.now().toISOString());
    if (!entry) throw new NotFoundError("\u0427\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A");
    return entry;
  }
  search(query, limit = 20, personId) {
    const q = query.trim();
    if (!q) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0438\u0441\u043A\u0430");
    if (q.length > 200) throw new ValidationError("\u041F\u043E\u0438\u0441\u043A \u0434\u043B\u0438\u043D\u043D\u0435\u0435 200 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    return {
      people: this.#store.list(q, limit),
      entries: this.#store.searchEntries(q, Math.min(limit * 2, MAX_ENTRIES), personId)
    };
  }
};

// src/modules/people/schema.ts
var peopleMigrations = [
  {
    version: "people/0001_people",
    sql: `
      CREATE TABLE people (
        id TEXT PRIMARY KEY,
        display TEXT NOT NULL,
        handles TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        -- lower() \u0432 SQLite \u043F\u043E\u043D\u0438\u043C\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E ASCII, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043A\u0438\u0440\u0438\u043B\u043B\u0438\u0446\u0443 \u043F\u0440\u0438\u0432\u043E\u0434\u0438\u0442
        -- \u043A \u043D\u0438\u0436\u043D\u0435\u043C\u0443 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0443 \u043A\u043E\u0434 \u0437\u0430\u043F\u0438\u0441\u0438.
        search_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_seen_at TEXT
      );
      CREATE INDEX people_updated ON people (updated_at DESC);

      CREATE TABLE person_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id TEXT NOT NULL REFERENCES people (id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'panel',
        kind TEXT NOT NULL DEFAULT 'note',
        search_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX person_entries_person ON person_entries (person_id, id DESC);
    `
  }
];

// src/modules/people/people.module.ts
function numberParam(raw, fallback, min, max) {
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}
function requiredId(value) {
  if (!value) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D id \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430");
  return value;
}
function registerPeopleRoutes(router, deps) {
  const { people } = deps;
  router.add("GET", "/api/people", (c) => ({
    body: {
      ok: true,
      ...people.list(c.query.get("q") ?? "", numberParam(c.query.get("limit"), 50, 1, 200))
    }
  }));
  router.add("GET", "/api/people/search", (c) => ({
    body: {
      ok: true,
      ...people.search(
        c.query.get("q") ?? "",
        numberParam(c.query.get("limit"), 20, 1, 100),
        c.query.get("person") ?? void 0
      )
    }
  }));
  router.add("POST", "/api/people", (c) => ({
    status: 201,
    body: { ok: true, person: people.create(c.body) }
  }));
  router.add("GET", "/api/people/:id", (c) => ({
    body: {
      ok: true,
      ...people.get(requiredId(c.params.id), numberParam(c.query.get("limit"), 50, 1, 500))
    }
  }));
  router.add("PATCH", "/api/people/:id", (c) => ({
    body: { ok: true, person: people.update(requiredId(c.params.id), c.body) }
  }));
  router.add("DELETE", "/api/people/:id", (c) => ({
    body: { ok: true, ...people.remove(requiredId(c.params.id)) }
  }));
  router.add("POST", "/api/people/:id/entries", (c) => ({
    status: 201,
    body: { ok: true, entry: people.addEntry(requiredId(c.params.id), c.body) }
  }));
}

// modules/people/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u041B\u044E\u0434\u0438 \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { display: grid; gap: 20px; grid-template-columns: minmax(260px, 340px) 1fr; padding: 24px; align-items: start; }
  @media (max-width: 820px) { main { grid-template-columns: 1fr; } }
  section { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  label { display: grid; gap: 4px; font-size: 13px; color: #aab4c5; margin-bottom: 10px; }
  input, textarea, button { font: inherit; }
  input, textarea { background: #0f1216; color: inherit; border: 1px solid #2b3240; border-radius: 8px; padding: 8px 10px; }
  button { background: #2d5bff; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  li { border: 1px solid #232833; border-radius: 10px; padding: 12px; }
  .title { font-weight: 600; }
  .meta { color: #7f8a9c; font-size: 12px; }
  .error { color: #ff9a9a; font-size: 13px; min-height: 18px; }
  .empty { color: #7f8a9c; }
</style>
</head>
<body>
<header>
  <h1>\u041B\u044E\u0434\u0438</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <section>
    <h2>\u041D\u043E\u0432\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430</h2>
    <form id="create">
      <label>\u0418\u043C\u044F<input name="display" maxlength="200" required></label>
      <label>\u0420\u0443\u0447\u043A\u0438 (\u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E)<input name="handles" placeholder="telegram:@name, github:login"></label>
      <label>\u0422\u0435\u0433\u0438 (\u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E)<input name="tags"></label>
      <label>\u0417\u0430\u043C\u0435\u0442\u043A\u0438<textarea name="notes" rows="3" maxlength="4000"></textarea></label>
      <button type="submit">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
      <p class="error" id="create-error"></p>
    </form>
  </section>
  <section>
    <h2>\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438</h2>
    <label>\u041F\u043E\u0438\u0441\u043A<input id="q" placeholder="\u0438\u043C\u044F, \u0440\u0443\u0447\u043A\u0430, \u0437\u0430\u043C\u0435\u0442\u043A\u0430"></label>
    <ul id="list"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
  </section>
</main>
<script>
(function () {
  var list = document.getElementById('list');
  var error = document.getElementById('create-error');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function request(path, options) {
    return fetch(path, options).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error((body.error && body.error.message) || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430');
        return body;
      });
    });
  }

  function split(value) {
    return String(value || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function load() {
    var q = document.getElementById('q').value;
    return request('/api/people?limit=100&q=' + encodeURIComponent(q)).then(function (body) {
      list.textContent = '';
      var items = body.items || [];
      if (!items.length) {
        list.appendChild(el('li', 'empty', '\u041D\u0438\u043A\u043E\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E'));
        return;
      }
      items.forEach(function (person) {
        var row = el('li');
        row.appendChild(el('div', 'title', person.display));
        if (person.handles && person.handles.length) row.appendChild(el('div', 'meta', person.handles.join(', ')));
        if (person.tags && person.tags.length) row.appendChild(el('div', 'meta', '#' + person.tags.join(' #')));
        if (person.notes) row.appendChild(el('div', 'meta', person.notes));
        list.appendChild(row);
      });
    }).catch(function (failure) {
      list.textContent = '';
      list.appendChild(el('li', 'empty', failure.message));
    });
  }

  document.getElementById('create').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    var data = new FormData(form);
    error.textContent = '';
    request('/api/people', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        display: data.get('display'),
        handles: split(data.get('handles')),
        tags: split(data.get('tags')),
        notes: data.get('notes') || ''
      })
    }).then(function () {
      form.reset();
      return load();
    }).catch(function (failure) {
      error.textContent = failure.message;
    });
  });

  document.getElementById('q').addEventListener('input', load);
  load();
})();
</script>
</body>
</html>
`;

// modules/people/index.ts
var module = {
  id: "people",
  apiVersion: 1,
  migrations: peopleMigrations,
  register(ctx) {
    const people = new PeopleService(new SqlitePeopleStore(ctx.storage));
    ctx.publish({ people });
    registerPeopleRoutes(ctx.api, { people });
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
