import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/adapters/storage/sqlite.ts
import { DatabaseSync } from "node:sqlite";

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
var ConflictError = class extends AppError {
  constructor(message, details = {}) {
    super("conflict", message, 409, details);
  }
};

// src/adapters/storage/cursor.ts
function encodeCursor(at, id) {
  return Buffer.from(`${at}\0${id}`, "utf8").toString("base64url");
}
function decodeCursor(cursor) {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const index = decoded.indexOf("\0");
  if (index <= 0) throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u0443\u0440\u0441\u043E\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B");
  const at = decoded.slice(0, index);
  if (Number.isNaN(Date.parse(at))) throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u0443\u0440\u0441\u043E\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B");
  return { at, id: decoded.slice(index + 1) };
}

// src/adapters/storage/sqlite.ts
function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    priority: row.priority,
    revision: row.revision,
    created_by: row.created_by,
    assignee: row.assignee,
    tags: JSON.parse(row.tags),
    blocked_reason: row.blocked_reason,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function toEvent(row) {
  return {
    task_id: row.task_id,
    type: row.type,
    actor: row.actor,
    payload: JSON.parse(row.payload),
    created_at: row.created_at
  };
}
var COLUMNS = `id, title, description, type, status, priority, revision, created_by,
  assignee, tags, blocked_reason, created_at, updated_at`;
function searchText(title, description) {
  return `${title}
${description}`.toLowerCase();
}
var SqliteTaskRepository = class {
  #db;
  constructor(db) {
    this.#db = db;
  }
  insert(task, event) {
    this.#db.transaction(() => {
      const columnNames = `${COLUMNS}, search_text`;
      this.#db.raw.prepare(`INSERT INTO tasks (${columnNames}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        task.id,
        task.title,
        task.description,
        task.type,
        task.status,
        task.priority,
        task.revision,
        task.created_by,
        task.assignee,
        JSON.stringify(task.tags),
        task.blocked_reason,
        task.created_at,
        task.updated_at,
        searchText(task.title, task.description)
      );
      this.#appendEvent(event);
    });
  }
  get(id) {
    const row = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM tasks WHERE id = ?`).get(id);
    return row ? toTask(row) : null;
  }
  list(query) {
    const where = [];
    const params = [];
    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }
    if (query.type) {
      where.push("type = ?");
      params.push(query.type);
    }
    if (query.assignee) {
      where.push("assignee = ?");
      params.push(query.assignee);
    }
    if (query.search) {
      where.push("instr(search_text, ?) > 0");
      params.push(query.search.toLowerCase());
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.push("(updated_at < ? OR (updated_at = ? AND id < ?))");
      params.push(cursor.at, cursor.at, cursor.id);
    }
    const limit = Math.min(Math.max(query.limit, 1), 200);
    const sql = `SELECT ${COLUMNS} FROM tasks
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, id DESC
      LIMIT ?`;
    const rows = this.#db.raw.prepare(sql).all(...params, limit + 1);
    const items = rows.slice(0, limit).map(toTask);
    const last = items.at(-1);
    return {
      items,
      next_cursor: rows.length > limit && last ? encodeCursor(last.updated_at, last.id) : null
    };
  }
  events(taskId, limit) {
    const rows = this.#db.raw.prepare("SELECT task_id, type, actor, payload, created_at FROM task_events WHERE task_id = ? ORDER BY seq DESC LIMIT ?").all(taskId, Math.min(Math.max(limit, 1), 500));
    return rows.reverse().map(toEvent);
  }
  updateWithExpectation(next, expectation, event) {
    return this.#db.transaction(() => {
      const result = this.#db.raw.prepare(`UPDATE tasks SET
          status = ?, revision = ?, assignee = ?, blocked_reason = ?, updated_at = ?
        WHERE id = ? AND status = ? AND revision = ? AND updated_at = ?`).run(
        next.status,
        next.revision,
        next.assignee,
        next.blocked_reason,
        next.updated_at,
        next.id,
        expectation.status,
        expectation.revision,
        expectation.updated_at
      );
      if (Number(result.changes) !== 1) return false;
      this.#appendEvent(event);
      return true;
    });
  }
  #appendEvent(event) {
    this.#db.raw.prepare("INSERT INTO task_events (task_id, type, actor, payload, created_at) VALUES (?, ?, ?, ?, ?)").run(event.task_id, event.type, event.actor, JSON.stringify(event.payload), event.created_at);
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
function oneOf(raw, field, allowed, fallback) {
  if (raw === void 0 || raw === null) return fallback;
  const value = String(raw);
  if (!allowed.includes(value)) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E ${allowed.join(", ")}`, { value });
  }
  return value;
}
function optionalName(raw, field) {
  if (raw === void 0 || raw === null) return null;
  const value = text(raw, field, 100, true);
  return value || null;
}
function integer(raw, field, min, max, fallback) {
  if (raw === void 0 || raw === null) return fallback;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}

// src/domain/tasks/task.ts
var TASK_STATUSES = ["open", "claimed", "blocked", "done"];
var TASK_TYPES = ["work", "research", "maintenance", "internal", "human"];
var TRANSITIONS = {
  open: ["claimed", "blocked", "done"],
  claimed: ["open", "blocked", "done"],
  blocked: ["open", "claimed", "done"],
  done: ["open"]
};
function normalizeNewTask(raw) {
  const input = record(raw, "\u0417\u0430\u0434\u0430\u0447\u0430");
  const tagsRaw = input.tags ?? [];
  if (!Array.isArray(tagsRaw)) throw new ValidationError("\u041F\u043E\u043B\u0435 \xABtags\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C");
  const tags = [...new Set(tagsRaw.map((tag) => text(tag, "tags", 40, true)))].slice(0, 20);
  return {
    title: text(input.title, "title", 200, true),
    description: text(input.description, "description", 2e4),
    type: oneOf(input.type, "type", TASK_TYPES, "internal"),
    priority: integer(input.priority, "priority", 0, 3, 0),
    created_by: text(input.created_by, "created_by", 100, true),
    assignee: optionalName(input.assignee, "assignee"),
    tags
  };
}
function createTask(input, now) {
  const at = now.toISOString();
  const task = {
    id: newId("task"),
    ...input,
    status: "open",
    revision: 1,
    blocked_reason: null,
    created_at: at,
    updated_at: at
  };
  return {
    task,
    event: {
      task_id: task.id,
      type: "task.created",
      actor: task.created_by,
      payload: { title: task.title, type: task.type, priority: task.priority, assignee: task.assignee },
      created_at: at
    }
  };
}
function normalizeStatusChange(raw) {
  const input = record(raw, "\u0421\u043C\u0435\u043D\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430");
  const expected = record(input.expected, "expected");
  const to = oneOf(input.to ?? input.expected_status, "to", TASK_STATUSES, "open");
  const expectation = {
    status: oneOf(expected.status ?? input.expected_status, "expected.status", TASK_STATUSES, "open"),
    revision: integer(expected.revision ?? input.expected_revision, "expected.revision", 1, Number.MAX_SAFE_INTEGER, 1),
    updated_at: text(expected.updated_at ?? input.expected_updated_at, "expected.updated_at", 40, true)
  };
  if (Number.isNaN(Date.parse(expectation.updated_at))) {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABexpected.updated_at\xBB: \u043E\u0436\u0438\u0434\u0430\u043B\u0430\u0441\u044C \u0434\u0430\u0442\u0430 ISO");
  }
  const assigneeRaw = input.assignee;
  return {
    to,
    agent: text(input.agent, "agent", 100, true),
    reason: text(input.reason, "reason", 2e3) || null,
    assignee: assigneeRaw === void 0 ? void 0 : optionalName(assigneeRaw, "assignee"),
    expectation
  };
}
function expectationMismatches(task, expectation) {
  const mismatches = [];
  if (task.status !== expectation.status) mismatches.push(`status: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F ${expectation.status}, \u0441\u0435\u0439\u0447\u0430\u0441 ${task.status}`);
  if (task.revision !== expectation.revision) mismatches.push(`revision: \u043E\u0436\u0438\u0434\u0430\u043B\u0430\u0441\u044C ${expectation.revision}, \u0441\u0435\u0439\u0447\u0430\u0441 ${task.revision}`);
  if (task.updated_at !== expectation.updated_at) {
    mismatches.push(`updated_at: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F ${expectation.updated_at}, \u0441\u0435\u0439\u0447\u0430\u0441 ${task.updated_at}`);
  }
  return mismatches;
}
function assertExpectation(task, expectation) {
  const mismatches = expectationMismatches(task, expectation);
  if (mismatches.length) {
    throw new ConflictError("\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C \u0441 \u043C\u043E\u043C\u0435\u043D\u0442\u0430 \u0447\u0442\u0435\u043D\u0438\u044F", { current: task, mismatches });
  }
}
function changeTaskStatus(task, change, now) {
  assertExpectation(task, change.expectation);
  if (change.to === task.status) throw new ValidationError(`\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0443\u0436\u0435 \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 \xAB${task.status}\xBB`);
  if (!TRANSITIONS[task.status].includes(change.to)) {
    throw new ValidationError(`\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043F\u0435\u0440\u0435\u0445\u043E\u0434 ${task.status} \u2192 ${change.to}`, { from: task.status, to: change.to });
  }
  if (change.to === "blocked" && !change.reason) {
    throw new ValidationError("\u0414\u043B\u044F \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u043D\u0443\u0436\u043D\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0432 \u043F\u043E\u043B\u0435 \xABreason\xBB");
  }
  const at = nextTimestamp(task.updated_at, now);
  const assignee = change.assignee !== void 0 ? change.assignee : change.to === "claimed" && !task.assignee ? change.agent : change.to === "open" ? null : task.assignee;
  const next = {
    ...task,
    status: change.to,
    revision: task.revision + 1,
    assignee,
    blocked_reason: change.to === "blocked" ? change.reason : null,
    updated_at: at
  };
  return {
    task: next,
    event: {
      task_id: task.id,
      type: "task.status_changed",
      actor: change.agent,
      payload: { from: task.status, to: change.to, revision: next.revision, reason: change.reason },
      created_at: at
    }
  };
}

// src/app/task-service.ts
function enumParam(value, field, allowed) {
  if (value === void 0 || value === "") return void 0;
  if (!allowed.includes(value)) {
    throw new ValidationError(`\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \xAB${field}\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E ${allowed.join(", ")}`, { value });
  }
  return value;
}
var TaskService = class {
  #repo;
  #bus;
  #clock;
  #log;
  constructor(repo, bus, clock, log) {
    this.#repo = repo;
    this.#bus = bus;
    this.#clock = clock;
    this.#log = log.child({ module: "tasks" });
  }
  create(raw) {
    const { task, event } = createTask(normalizeNewTask(raw), this.#clock.now());
    this.#repo.insert(task, event);
    this.#publish(event);
    this.#log.info("\u0417\u0430\u0434\u0430\u0447\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430", { task_id: task.id, type: task.type, priority: task.priority });
    return task;
  }
  get(id) {
    const task = this.#repo.get(id);
    if (!task) throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    return { task, events: this.#repo.events(id, 100) };
  }
  /** Вся история для выгрузки: страницы по 200, пока есть курсор. */
  exportAll() {
    const items = [];
    let cursor;
    for (let guard = 0; guard < 500; guard += 1) {
      const page = this.list({ limit: "200", cursor });
      items.push(...page.items);
      if (!page.next_cursor) break;
      cursor = page.next_cursor;
    }
    return items;
  }
  list(raw) {
    const limit = raw.limit === void 0 || raw.limit === "" ? 50 : Number(raw.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new ValidationError("\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \xABlimit\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 1 \u0434\u043E 200");
    }
    return this.#repo.list({
      status: enumParam(raw.status, "status", TASK_STATUSES),
      type: enumParam(raw.type, "type", TASK_TYPES),
      assignee: raw.assignee?.trim() || void 0,
      search: raw.q?.trim() || void 0,
      limit,
      cursor: raw.cursor?.trim() || void 0
    });
  }
  /**
   * Смена статуса с оптимистичной блокировкой: клиент присылает ожидаемые
   * status/revision/updated_at, сервер применяет изменение только при полном
   * совпадении и отвечает 409 с текущей карточкой и списком расхождений.
   */
  changeStatus(id, raw) {
    const change = normalizeStatusChange(raw);
    const current = this.#repo.get(id);
    if (!current) throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    const { task, event } = changeTaskStatus(current, change, this.#clock.now());
    if (!this.#repo.updateWithExpectation(task, change.expectation, event)) {
      const actual = this.#repo.get(id);
      if (!actual) throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
      throw new ConflictError("\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C \u0441 \u043C\u043E\u043C\u0435\u043D\u0442\u0430 \u0447\u0442\u0435\u043D\u0438\u044F", {
        current: actual,
        mismatches: expectationMismatches(actual, change.expectation)
      });
    }
    this.#publish(event);
    this.#log.info("\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438\u0437\u043C\u0435\u043D\u0451\u043D", {
      task_id: id,
      from: current.status,
      to: task.status,
      revision: task.revision,
      agent: change.agent
    });
    return task;
  }
  #publish(event) {
    this.#bus.publish({
      type: event.type,
      entity: { kind: "task", id: event.task_id },
      actor: event.actor,
      at: event.created_at,
      data: event.payload
    });
  }
};

// src/app/export-format.ts
function csv(rows, columns) {
  const cell = (value) => {
    let text2 = value === null || value === void 0 ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text2)) text2 = `'${text2}`;
    return `"${text2.replace(/"/g, '""')}"`;
  };
  const lines = [columns.map(cell).join(";"), ...rows.map((row) => columns.map((column) => cell(row[column])).join(";"))];
  return `\uFEFF${lines.join("\r\n")}\r
`;
}
function downloadHeaders(name, format) {
  const extension = format === "csv" ? "csv" : "json";
  return {
    "content-disposition": `attachment; filename="${name}.${extension}"`,
    "cache-control": "no-store"
  };
}

// src/modules/tasks/schema.ts
var tasksMigrations = [
  {
    version: "tasks/0001_tasks",
    sql: `
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'internal',
        status TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        revision INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL,
        assignee TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        blocked_reason TEXT,
        -- \u041D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \u043F\u043E\u0438\u0441\u043A\u0430: lower() \u0432 SQLite \u043F\u043E\u043D\u0438\u043C\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E ASCII,
        -- \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043A\u0438\u0440\u0438\u043B\u043B\u0438\u0446\u0443 \u043F\u0440\u0438\u0432\u043E\u0434\u0438\u0442 \u043A \u043D\u0438\u0436\u043D\u0435\u043C\u0443 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0443 \u0441\u0430\u043C \u043A\u043E\u0434 \u0437\u0430\u043F\u0438\u0441\u0438.
        search_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX tasks_status_updated ON tasks (status, updated_at);
      CREATE INDEX tasks_assignee ON tasks (assignee);

      CREATE TABLE task_events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX task_events_task ON task_events (task_id, seq);
    `
  }
];

// modules/tasks/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0414\u043E\u0441\u043A\u0430 \u0437\u0430\u0434\u0430\u0447 \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { display: grid; gap: 20px; grid-template-columns: minmax(280px, 360px) 1fr; padding: 24px; align-items: start; }
  @media (max-width: 860px) { main { grid-template-columns: 1fr; } }
  section { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  label { display: grid; gap: 4px; font-size: 13px; color: #aab4c5; margin-bottom: 10px; }
  input, select, textarea, button { font: inherit; }
  input, select, textarea { background: #0f1216; color: inherit; border: 1px solid #2b3240; border-radius: 8px; padding: 8px 10px; }
  textarea { min-height: 64px; resize: vertical; }
  button { background: #2d5bff; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  button.ghost { background: #222a36; color: #cbd4e1; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  li { border: 1px solid #232833; border-radius: 10px; padding: 12px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .title { font-weight: 600; }
  .meta { color: #7f8a9c; font-size: 12px; }
  .status { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: #222a36; }
  .status-done { background: #1d3a2a; color: #8be0ab; }
  .status-blocked { background: #3a2426; color: #ff9a9a; }
  .error { color: #ff9a9a; font-size: 13px; min-height: 18px; }
  .empty { color: #7f8a9c; }
</style>
</head>
<body>
<header>
  <h1>\u0414\u043E\u0441\u043A\u0430 \u0437\u0430\u0434\u0430\u0447</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
  <a href="/api/tasks/export?format=json">\u044D\u043A\u0441\u043F\u043E\u0440\u0442</a>
</header>
<main>
  <section>
    <h2>\u041D\u043E\u0432\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430</h2>
    <form id="create">
      <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435<input name="title" maxlength="200" required></label>
      <label>\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435<textarea name="description" maxlength="4000"></textarea></label>
      <label>\u0422\u0438\u043F
        <select name="type">
          <option value="work">work</option>
          <option value="research">research</option>
          <option value="maintenance">maintenance</option>
          <option value="internal">internal</option>
          <option value="human">human</option>
        </select>
      </label>
      <label>\u0410\u0432\u0442\u043E\u0440<input name="created_by" value="me" required></label>
      <label>\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442<input name="priority" type="number" value="0" min="0" max="100"></label>
      <button type="submit">\u0421\u043E\u0437\u0434\u0430\u0442\u044C</button>
      <p class="error" id="create-error"></p>
    </form>
  </section>
  <section>
    <h2>\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 <span class="meta" id="count"></span></h2>
    <ul id="list"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
  </section>
</main>
<script>
(function () {
  var list = document.getElementById('list');
  var count = document.getElementById('count');
  var createError = document.getElementById('create-error');
  var statuses = ['open', 'claimed', 'blocked', 'done'];

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

  function show(task) {
    var item = el('li');
    var row = el('div', 'row');
    row.appendChild(el('span', 'title', task.title));
    row.appendChild(el('span', 'status status-' + task.status, task.status));
    item.appendChild(row);
    if (task.description) item.appendChild(el('div', 'meta', task.description));
    item.appendChild(el('div', 'meta', task.type + ' \xB7 ' + task.created_by + ' \xB7 ' + task.updated_at));

    var actions = el('div', 'row');
    statuses.forEach(function (status) {
      if (status === task.status) return;
      var button = el('button', 'ghost', status);
      button.type = 'button';
      button.addEventListener('click', function () {
        button.disabled = true;
        request('/api/tasks/' + encodeURIComponent(task.id) + '/status', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            to: status,
            agent: 'module-tasks',
            expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
          })
        }).then(load).catch(function (error) {
          button.disabled = false;
          alert(error.message);
        });
      });
      actions.appendChild(button);
    });
    if (actions.childNodes.length) item.appendChild(actions);
    return item;
  }

  function load() {
    return request('/api/tasks?limit=50').then(function (page) {
      list.textContent = '';
      var items = page.items || [];
      count.textContent = '\xB7 ' + (page.total === undefined ? items.length : page.total);
      if (!items.length) {
        list.appendChild(el('li', 'empty', '\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E'));
        return;
      }
      items.forEach(function (task) { list.appendChild(show(task)); });
    }).catch(function (error) {
      list.textContent = '';
      list.appendChild(el('li', 'empty', error.message));
    });
  }

  document.getElementById('create').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    var data = new FormData(form);
    var payload = {
      title: data.get('title'),
      description: data.get('description') || '',
      type: data.get('type'),
      created_by: data.get('created_by'),
      priority: Number(data.get('priority') || 0)
    };
    createError.textContent = '';
    request('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function () {
      form.reset();
      return load();
    }).catch(function (error) {
      createError.textContent = error.message;
    });
  });

  load();
})();
</script>
</body>
</html>
`;

// modules/tasks/index.ts
var HEARTBEAT_MS = 15e3;
var module = {
  id: "tasks",
  apiVersion: 1,
  migrations: tasksMigrations,
  register(ctx) {
    const tasks = new TaskService(new SqliteTaskRepository(ctx.storage), ctx.bus, systemClock, ctx.log);
    ctx.publish({ tasks });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    const openEventStream = (request) => {
      const { res } = request;
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
        // Прокси иначе копит поток в буфере и живой канал «молчит».
        "x-accel-buffering": "no"
      });
      res.write("retry: 3000\n\n");
      let closed = false;
      const unsubscribe = ctx.bus.subscribe((event) => {
        if (closed) return;
        res.write(`event: ${event.type}
data: ${JSON.stringify(event)}

`);
      });
      const heartbeat = setInterval(() => {
        if (!closed) res.write(": ping\n\n");
      }, HEARTBEAT_MS);
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        res.end();
      };
      request.req.on("close", close);
      ctx.onShutdown(close);
      return null;
    };
    ctx.api.add("POST", "/api/tasks", (request) => {
      const task = tasks.create(request.body);
      return { status: 201, body: { task } };
    });
    ctx.api.add("GET", "/api/tasks", (request) => {
      const query = Object.fromEntries(request.query.entries());
      return { body: tasks.list(query) };
    });
    ctx.api.add("GET", "/api/tasks/export", (request) => {
      const format = request.query.get("format") === "csv" ? "csv" : "json";
      const items = tasks.exportAll();
      const rows = items.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        status: task.status,
        priority: task.priority,
        created_by: task.created_by,
        assignee: task.assignee ?? "",
        tags: task.tags.join(","),
        blocked_reason: task.blocked_reason ?? "",
        created_at: task.created_at,
        updated_at: task.updated_at
      }));
      return {
        raw: format === "csv" ? csv(rows, ["id", "title", "description", "type", "status", "priority", "created_by", "assignee", "tags", "blocked_reason", "created_at", "updated_at"]) : JSON.stringify({ exported_at: (/* @__PURE__ */ new Date()).toISOString(), count: items.length, tasks: items }, null, 2),
        headers: downloadHeaders("team-tasks", format)
      };
    });
    ctx.api.add("GET", "/api/tasks/events", (request) => openEventStream(request));
    ctx.api.add("GET", "/api/tasks/:id", (request) => ({
      body: tasks.get(request.params.id ?? "")
    }));
    ctx.api.add("POST", "/api/tasks/:id/status", (request) => ({
      body: { task: tasks.changeStatus(request.params.id ?? "", request.body) }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
