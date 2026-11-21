import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// modules/task-reminders/schema.ts
var taskReminderMigrations = [
  {
    version: "task-reminders/0001_reminder_state",
    sql: `
      CREATE TABLE task_reminders (
        task_id TEXT NOT NULL,
        due_at TEXT NOT NULL,
        kind TEXT NOT NULL,
        fired_at TEXT NOT NULL,
        missed INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (task_id, due_at, kind)
      );
      CREATE INDEX task_reminders_fired ON task_reminders (fired_at);

      CREATE TABLE task_reminder_runtime (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_tick_at TEXT
      );
      INSERT INTO task_reminder_runtime (id, last_tick_at) VALUES (1, NULL);
    `
  }
];

// modules/task-reminders/reminders.ts
var DEFAULT_LEAD_MINUTES = 24 * 60;
var MIN_LEAD_MINUTES = 5;
var MAX_LEAD_MINUTES = 14 * 24 * 60;
var ACTIVE_TASK_STATUSES = ["open", "claimed", "blocked"];
function leadMinutes(raw) {
  if (raw === void 0 || raw === null || raw === "") return DEFAULT_LEAD_MINUTES;
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new RangeError("lead_minutes: \u043D\u0443\u0436\u043D\u043E \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u043C\u0438\u043D\u0443\u0442");
  }
  if (value < MIN_LEAD_MINUTES || value > MAX_LEAD_MINUTES) {
    throw new RangeError(`lead_minutes: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E ${MIN_LEAD_MINUTES}\u2026${MAX_LEAD_MINUTES}`);
  }
  return value;
}
function planReminders(tasks, now, leadMs) {
  const dueSoon = [];
  const overdue = [];
  const invalid = [];
  for (const task of tasks) {
    const due = Date.parse(task.approved_due_at);
    if (!Number.isFinite(due)) {
      invalid.push({ task_id: task.id, approved_due_at: task.approved_due_at });
      continue;
    }
    if (due > now && due - now > leadMs) continue;
    const reminder = {
      task_id: task.id,
      title: task.title,
      assignee: task.assignee,
      due_at: task.approved_due_at,
      kind: due <= now ? "overdue" : "due_soon"
    };
    if (reminder.kind === "overdue") overdue.push(reminder);
    else dueSoon.push(reminder);
  }
  const byDue = (left, right) => Date.parse(left.due_at) - Date.parse(right.due_at);
  return {
    due_soon: dueSoon.sort(byDue),
    overdue: overdue.sort(byDue),
    invalid_due: invalid
  };
}

// modules/task-reminders/service.ts
function isoAt(raw, fallback) {
  if (raw === void 0 || raw === null || raw === "") return fallback;
  if (typeof raw !== "string") throw new ValidationError("\u041F\u043E\u043B\u0435 \xABat\xBB: \u043E\u0436\u0438\u0434\u0430\u043B\u0430\u0441\u044C ISO-\u0441\u0442\u0440\u043E\u043A\u0430");
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) throw new ValidationError("\u041F\u043E\u043B\u0435 \xABat\xBB: \u043D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0434\u0430\u0442\u0430");
  return parsed;
}
var TaskReminderService = class {
  #db;
  #bus;
  constructor(db, bus) {
    this.#db = db;
    this.#bus = bus;
  }
  /**
   * Один детерминированный проход. Время приходит в теле (`at`) — это делает
   * проверку воспроизводимой и снимает вопрос часовых поясов: сравниваются
   * абсолютные моменты, а не «локальные 09:00».
   */
  tick(raw = {}, now = Date.now()) {
    const at = isoAt(raw.at, now);
    const lead = leadMinutes(raw.lead_minutes);
    const atIso = new Date(at).toISOString();
    this.#assertTasksInstalled();
    const leadMs = lead * 6e4;
    const plan = planReminders(this.#activeTasks(), at, leadMs);
    const insert = this.#db.raw.prepare(`INSERT OR IGNORE INTO task_reminders (task_id, due_at, kind, fired_at, missed)
      VALUES (?, ?, ?, ?, ?)`);
    let fired = 0;
    let missed = 0;
    let duplicates = 0;
    for (const reminder of [...plan.overdue, ...plan.due_soon]) {
      const wasMissed = reminder.kind === "overdue" && at - Date.parse(reminder.due_at) > leadMs;
      const inserted = insert.run(reminder.task_id, reminder.due_at, reminder.kind, atIso, wasMissed ? 1 : 0);
      if (Number(inserted.changes ?? 0) === 0) {
        duplicates += 1;
        continue;
      }
      if (wasMissed) missed += 1;
      fired += 1;
      this.#bus.publish({
        type: "task.reminder.due",
        entity: { kind: "task", id: reminder.task_id },
        actor: "system",
        at: atIso,
        data: {
          task_id: reminder.task_id,
          title: reminder.title,
          assignee: reminder.assignee,
          due_at: reminder.due_at,
          kind: reminder.kind,
          lead_minutes: lead,
          missed: wasMissed
        }
      });
    }
    this.#db.raw.prepare(`UPDATE task_reminder_runtime SET last_tick_at = ?
        WHERE id = 1 AND (last_tick_at IS NULL OR last_tick_at < ?)`).run(atIso, atIso);
    return {
      at: atIso,
      lead_minutes: lead,
      checked: plan.due_soon.length + plan.overdue.length + plan.invalid_due.length,
      fired,
      due_soon: plan.due_soon.length,
      overdue: plan.overdue.length,
      missed,
      duplicates,
      invalid_due: plan.invalid_due.length
    };
  }
  /**
   * Сводка — это и есть штатная точка чтения: проход выполняется здесь же, как
   * SLA-тик в задачах, поэтому напоминание выдаётся при открытии страницы без
   * ручного POST. Повтор безопасен: ключ `(task_id, due_at, kind)` не даёт
   * второго события, поэтому лишний тик ничего не ломает.
   */
  summary(raw = {}, now = Date.now()) {
    this.tick(raw, now);
    const at = isoAt(raw.at, now);
    const lead = leadMinutes(raw.lead_minutes);
    const plan = planReminders(this.#activeTasks(), at, lead * 6e4);
    const stateOf = this.#db.raw.prepare(
      "SELECT fired_at, missed FROM task_reminders WHERE task_id = ? AND due_at = ? AND kind = ?"
    );
    const totals = this.#db.raw.prepare(
      "SELECT COUNT(*) AS fired, COALESCE(SUM(missed), 0) AS missed FROM task_reminders"
    ).get();
    const view = (reminder) => {
      const state = stateOf.get(reminder.task_id, reminder.due_at, reminder.kind);
      return {
        ...reminder,
        fired_at: state?.fired_at ?? null,
        missed: state ? Number(state.missed) === 1 : false
      };
    };
    return {
      at: new Date(at).toISOString(),
      lead_minutes: lead,
      last_tick_at: this.#lastTickAt(),
      due_soon: plan.due_soon.map(view),
      overdue: plan.overdue.map(view),
      counts: {
        due_soon: plan.due_soon.length,
        overdue: plan.overdue.length,
        fired: Number(totals?.fired ?? 0),
        missed: Number(totals?.missed ?? 0)
      }
    };
  }
  /** Только активные карточки с утверждённым сроком: остальные напоминать не о чем. */
  #activeTasks() {
    const placeholders = ACTIVE_TASK_STATUSES.map(() => "?").join(", ");
    return this.#db.raw.prepare(`SELECT id, title, assignee, approved_due_at FROM tasks
        WHERE status IN (${placeholders}) AND approved_due_at IS NOT NULL`).all(...ACTIVE_TASK_STATUSES);
  }
  /**
   * Напоминания живут поверх доски задач: без её таблицы модуль не должен
   * выдавать пустой успех — это была бы ложная тишина вместо причины.
   */
  #assertTasksInstalled() {
    const table = this.#db.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get();
    if (!table?.name) {
      throw new ValidationError("\u041C\u043E\u0434\u0443\u043B\u044C \xABtasks\xBB \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D: \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0442\u044C \u043D\u0435 \u043E \u0447\u0435\u043C", {
        reason: "tasks_module_missing"
      });
    }
  }
  #lastTickAt() {
    const row = this.#db.raw.prepare("SELECT last_tick_at FROM task_reminder_runtime WHERE id = 1").get();
    return row?.last_tick_at ?? null;
  }
};

// modules/task-reminders/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043E \u0441\u0440\u043E\u043A\u0430\u0445</title>
  <style>
    :root { color-scheme: light dark; }
    body { font: 15px/1.5 system-ui, sans-serif; margin: 0; padding: 24px; max-width: 960px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { opacity: .7; margin-bottom: 16px; }
    .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
    label { display: flex; gap: 6px; align-items: center; }
    input { width: 80px; padding: 4px 6px; }
    button { padding: 6px 12px; cursor: pointer; }
    section { margin-top: 20px; }
    h2 { font-size: 16px; margin: 0 0 8px; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { padding: 8px 10px; border: 1px solid #8884; border-radius: 6px; margin-bottom: 6px; }
    .due { font-variant-numeric: tabular-nums; }
    .late { border-color: #c33; }
    .pill { font-size: 12px; padding: 1px 6px; border-radius: 999px; background: #8882; margin-left: 6px; }
    .empty { opacity: .6; }
    .error { color: #c33; }
  </style>
</head>
<body>
  <h1>\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043E \u0441\u0440\u043E\u043A\u0430\u0445</h1>
  <p class="meta">\u0421\u0440\u043E\u043A \u0431\u0435\u0440\u0451\u0442\u0441\u044F \u0438\u0437 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u043E\u0439 \u0434\u0430\u0442\u044B \u0437\u0430\u0434\u0430\u0447\u0438. \u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u043E\u0431 \u043E\u0434\u043D\u043E\u043C \u0441\u0440\u043E\u043A\u0435 \u0432\u044B\u0434\u0430\u0451\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0440\u0430\u0437; \u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u0441\u0440\u043E\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043D\u043E\u0432\u043E\u0435. \u041F\u0440\u043E\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u2014 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430 \u043D\u0443\u0436\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0440\u0443\u0447\u043D\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.</p>

  <div class="row">
    <label>\u0417\u0430 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0438\u043D\u0443\u0442 \u0434\u043E \u0441\u0440\u043E\u043A\u0430 <input id="lead" type="number" min="5" max="20160" value="1440"></label>
    <button id="check" type="button">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441</button>
    <span id="status" class="meta"></span>
  </div>
  <p id="error" class="error" hidden></p>
  <p class="meta" id="facts">\u0412\u044B\u0434\u0430\u043D\u043E: \u2014</p>

  <section>
    <h2>\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E <span id="overdue-count" class="pill">0</span></h2>
    <ul id="overdue" class="empty">\u2014</ul>
  </section>

  <section>
    <h2>\u0421\u043A\u043E\u0440\u043E \u0441\u0440\u043E\u043A <span id="soon-count" class="pill">0</span></h2>
    <ul id="soon" class="empty">\u2014</ul>
  </section>

  <script>
    'use strict';
    const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const when = (iso) => {
      const at = new Date(iso);
      return Number.isNaN(at.getTime()) ? iso : at.toLocaleString('ru-RU');
    };

    function item(reminder) {
      const li = document.createElement('li');
      if (reminder.kind === 'overdue') li.className = 'late';
      const title = document.createElement('strong');
      title.textContent = reminder.title;
      li.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = '\u0441\u0440\u043E\u043A ' + when(reminder.due_at)
        + (reminder.assignee ? ' \xB7 ' + reminder.assignee : '')
        + (reminder.fired_at ? ' \xB7 \u043D\u0430\u043F\u043E\u043C\u043D\u0438\u043B\u0438 ' + when(reminder.fired_at) : ' \xB7 \u0435\u0449\u0451 \u043D\u0435 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043B\u0438')
        + (reminder.missed ? ' \xB7 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E' : '');
      li.appendChild(meta);
      return li;
    }

    function fill(id, items) {
      const node = document.getElementById(id);
      node.textContent = '';
      if (!items.length) {
        node.className = 'empty';
        node.textContent = '\u2014';
        return;
      }
      node.className = '';
      for (const reminder of items) node.appendChild(item(reminder));
    }

    async function load() {
      const lead = document.getElementById('lead').value || '1440';
      const response = await fetch('/api/tools/task-reminders/summary?lead_minutes=' + encodeURIComponent(lead));
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || '\u0441\u0432\u043E\u0434\u043A\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430');
      fill('overdue', body.overdue);
      fill('soon', body.due_soon);
      document.getElementById('overdue-count').textContent = body.counts.overdue;
      document.getElementById('soon-count').textContent = body.counts.due_soon;
      // fired \u2014 \u0432\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F, \u0430 planned \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0441\u043F\u0438\u0441\u043E\u043A.
      const planned = body.counts.due_soon + body.counts.overdue;
      document.getElementById('facts').textContent = '\u0412 \u043F\u043B\u0430\u043D\u0435 ' + planned
        + ' \xB7 \u0432\u044B\u0434\u0430\u043D\u043E \u0432\u0441\u0435\u0433\u043E ' + body.counts.fired
        + (body.counts.missed ? ' \xB7 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E ' + body.counts.missed : '');
      document.getElementById('status').textContent = '\u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E ' + when(body.at)
        + ' \xB7 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043F\u0440\u043E\u0445\u043E\u0434 ' + (body.last_tick_at ? when(body.last_tick_at) : '\u043D\u0435 \u0431\u044B\u043B\u043E');
    }

    async function tick() {
      const lead = document.getElementById('lead').value || '1440';
      const response = await fetch('/api/tools/task-reminders/tick', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lead_minutes: Number(lead) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || '\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430');
      document.getElementById('status').textContent = '\u0432 \u044D\u0442\u043E\u043C \u043F\u0440\u043E\u0445\u043E\u0434\u0435 \u0432\u044B\u0434\u0430\u043D\u043E: ' + body.fired;
      await load();
    }

    document.getElementById('check').addEventListener('click', () => {
      const error = document.getElementById('error');
      error.hidden = true;
      tick().catch((reason) => { error.hidden = false; error.textContent = reason.message; });
    });
    load().catch((reason) => {
      const error = document.getElementById('error');
      error.hidden = false;
      error.textContent = reason.message;
    });
  </script>
</body>
</html>`;

// modules/task-reminders/index.ts
function input(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442: { at?, lead_minutes? }");
  }
  return raw;
}
function guarded(run) {
  try {
    return run();
  } catch (error) {
    if (error instanceof RangeError) throw new ValidationError(error.message);
    throw error;
  }
}
var ReminderTicker = class {
  #service;
  #log;
  #intervalMs;
  #timer = null;
  constructor(service, log, intervalMs) {
    this.#service = service;
    this.#log = log.child({ module: "task-reminders" });
    this.#intervalMs = intervalMs;
  }
  get intervalMs() {
    return this.#intervalMs;
  }
  get running() {
    return this.#timer !== null;
  }
  start() {
    if (this.#timer || this.#intervalMs <= 0) return;
    this.#timer = setInterval(() => this.tick(), this.#intervalMs);
    this.#timer.unref();
    this.#log.info("\u041F\u0440\u043E\u0445\u043E\u0434 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u0437\u0430\u043F\u0443\u0449\u0435\u043D", { interval_ms: this.#intervalMs });
  }
  stop() {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = null;
    this.#log.info("\u041F\u0440\u043E\u0445\u043E\u0434 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
  }
  tick() {
    try {
      const result = this.#service.tick();
      if (result.fired) {
        this.#log.info("\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043E \u0441\u0440\u043E\u043A\u0430\u0445 \u0432\u044B\u0434\u0430\u043D\u044B", {
          fired: result.fired,
          overdue: result.overdue,
          missed: result.missed
        });
      }
      return result;
    } catch (error) {
      this.#log.error("\u041F\u0440\u043E\u0445\u043E\u0434 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u0443\u043F\u0430\u043B", {
        error: error instanceof Error ? error.stack : String(error)
      });
      return null;
    }
  }
};
var module = {
  id: "task-reminders",
  apiVersion: 1,
  migrations: taskReminderMigrations,
  register(ctx) {
    const reminders = new TaskReminderService(ctx.storage, ctx.bus);
    ctx.publish({ reminders });
    const ticker = new ReminderTicker(reminders, ctx.log, ctx.settings.taskReminders.intervalMs);
    ticker.start();
    ctx.onShutdown(() => ticker.stop());
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.api.add("POST", "/api/tools/task-reminders/tick", (request) => ({
      body: guarded(() => reminders.tick(input(request.body)))
    }));
    ctx.api.add("GET", "/api/tools/task-reminders/summary", (request) => ({
      body: guarded(() => reminders.summary(input(Object.fromEntries(request.query.entries()))))
    }));
  }
};
var index_default = module;
export {
  ReminderTicker,
  index_default as default
};
