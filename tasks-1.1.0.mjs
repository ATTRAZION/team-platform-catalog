import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/adapters/storage/sqlite.ts
import { backup, DatabaseSync } from "node:sqlite";

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
  constructor(message, details = {}, options = {}) {
    super(options.code ?? "validation_failed", message, options.status ?? 400, details);
  }
};
var NotFoundError = class extends AppError {
  /** Детали необязательны: старые вызовы без них продолжают работать. */
  constructor(message = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", details = {}) {
    super("not_found", message, 404, details);
  }
};
var ConflictError = class extends AppError {
  constructor(message, details = {}) {
    super("conflict", message, 409, details);
  }
};
var ForbiddenError = class extends AppError {
  constructor(message = "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043F\u043E\u043B\u043D\u043E\u043C\u043E\u0447\u0438\u0439", details = {}) {
    super("forbidden", message, 403, details);
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
    proposed_due_at: row.proposed_due_at,
    proposed_by: row.proposed_by,
    approved_due_at: row.approved_due_at,
    approved_by: row.approved_by,
    actual_at: row.actual_at,
    pending_assignee: row.pending_assignee,
    handover_requested_at: row.handover_requested_at,
    handover_requested_by: row.handover_requested_by,
    handover_note: row.handover_note,
    owner_until: row.owner_until,
    handover_from: row.handover_from,
    handover_accepted_at: row.handover_accepted_at,
    sla_paused_at: row.sla_paused_at,
    sla_pause_reason: row.sla_pause_reason,
    sla_pause_total_ms: row.sla_pause_total_ms ?? 0,
    sla_escalated_at: row.sla_escalated_at,
    sla_escalated_to: row.sla_escalated_to,
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
  assignee, tags, blocked_reason, proposed_due_at, proposed_by, approved_due_at, approved_by,
  actual_at, pending_assignee, handover_requested_at, handover_requested_by, handover_note,
  owner_until, handover_from, handover_accepted_at, sla_paused_at, sla_pause_reason,
  sla_pause_total_ms, sla_escalated_at, sla_escalated_to, created_at, updated_at`;
function searchText(title, description) {
  return `${title}
${description}`.toLowerCase();
}
var SqliteTaskRepository = class {
  #db;
  #audit;
  constructor(db, audit) {
    this.#db = db;
    this.#audit = audit ?? null;
  }
  insert(task, event2, audit) {
    this.#db.transaction(() => {
      const columnNames = `${COLUMNS}, search_text`;
      this.#db.raw.prepare(`INSERT INTO tasks (${columnNames}) VALUES (${", ?".repeat(31).slice(1)})`).run(
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
        task.proposed_due_at,
        task.proposed_by,
        task.approved_due_at,
        task.approved_by,
        task.actual_at,
        task.pending_assignee,
        task.handover_requested_at,
        task.handover_requested_by,
        task.handover_note,
        task.owner_until,
        task.handover_from,
        task.handover_accepted_at,
        task.sla_paused_at,
        task.sla_pause_reason,
        task.sla_pause_total_ms,
        task.sla_escalated_at,
        task.sla_escalated_to,
        task.created_at,
        task.updated_at,
        searchText(task.title, task.description)
      );
      this.#appendEvent(event2);
      if (audit) {
        if (!this.#audit) throw new Error("\u0410\u0443\u0434\u0438\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D \u043A \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0443 \u0437\u0430\u0434\u0430\u0447");
        this.#audit.append(audit);
      }
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
  /** Кандидаты автоматического тика: только незакрытые карточки со сроком. */
  dueCandidates() {
    const rows = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM tasks
      WHERE status NOT IN ('done', 'cancelled')
        AND (owner_until IS NOT NULL OR approved_due_at IS NOT NULL OR proposed_due_at IS NOT NULL)
      ORDER BY updated_at ASC`).all();
    return rows.map(toTask);
  }
  updateWithExpectation(next2, expectation, event2) {
    return this.#db.transaction(() => {
      const result = this.#db.raw.prepare(`UPDATE tasks SET
          status = ?, revision = ?, created_by = ?, assignee = ?, blocked_reason = ?,
          proposed_due_at = ?, proposed_by = ?, approved_due_at = ?, approved_by = ?,
          actual_at = ?, pending_assignee = ?, handover_requested_at = ?, handover_requested_by = ?,
          handover_note = ?, owner_until = ?, handover_from = ?, handover_accepted_at = ?,
          sla_paused_at = ?, sla_pause_reason = ?, sla_pause_total_ms = ?, sla_escalated_at = ?,
          sla_escalated_to = ?, updated_at = ?
        WHERE id = ? AND status = ? AND revision = ? AND updated_at = ?`).run(
        next2.status,
        next2.revision,
        next2.created_by,
        next2.assignee,
        next2.blocked_reason,
        next2.proposed_due_at,
        next2.proposed_by,
        next2.approved_due_at,
        next2.approved_by,
        next2.actual_at,
        next2.pending_assignee,
        next2.handover_requested_at,
        next2.handover_requested_by,
        next2.handover_note,
        next2.owner_until,
        next2.handover_from,
        next2.handover_accepted_at,
        next2.sla_paused_at,
        next2.sla_pause_reason,
        next2.sla_pause_total_ms,
        next2.sla_escalated_at,
        next2.sla_escalated_to,
        next2.updated_at,
        next2.id,
        expectation.status,
        expectation.revision,
        expectation.updated_at
      );
      if (Number(result.changes) !== 1) return false;
      this.#appendEvent(event2);
      return true;
    });
  }
  #appendEvent(event2) {
    this.#db.raw.prepare("INSERT INTO task_events (task_id, type, actor, payload, created_at) VALUES (?, ?, ?, ?, ?)").run(event2.task_id, event2.type, event2.actor, JSON.stringify(event2.payload), event2.created_at);
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
var TASK_STATUSES = ["open", "claimed", "blocked", "done", "cancelled"];
var TASK_TYPES = ["work", "research", "maintenance", "internal", "human"];
var TRANSITIONS = {
  open: ["claimed", "blocked", "done", "cancelled"],
  claimed: ["open", "blocked", "done", "cancelled"],
  blocked: ["open", "claimed", "done", "cancelled"],
  done: ["open"],
  // Отменённая карточка — такой же закрытый терминал, как done: для неё
  // останавливаются SLA-часы и автоматические переходы.
  cancelled: ["open"]
};
function optionalIso(raw, field) {
  const value = text(raw, field, 40);
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u043E\u0436\u0438\u0434\u0430\u043B\u0430\u0441\u044C \u0434\u0430\u0442\u0430 ISO 8601`);
  }
  return new Date(parsed).toISOString();
}
function normalizeExpectation(raw) {
  const expected = record(raw, "expected");
  const updatedAt = text(expected.updated_at, "expected.updated_at", 40, true);
  if (!Number.isFinite(Date.parse(updatedAt))) {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABexpected.updated_at\xBB: \u043E\u0436\u0438\u0434\u0430\u043B\u0430\u0441\u044C \u0434\u0430\u0442\u0430 ISO");
  }
  return {
    status: oneOf(expected.status, "expected.status", TASK_STATUSES, "open"),
    revision: integer(expected.revision, "expected.revision", 1, Number.MAX_SAFE_INTEGER, 1),
    updated_at: updatedAt
  };
}
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
    tags,
    proposed_due_at: optionalIso(input.proposed_due_at, "proposed_due_at")
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
    proposed_by: input.proposed_due_at ? input.created_by : null,
    approved_due_at: null,
    approved_by: null,
    actual_at: null,
    pending_assignee: null,
    handover_requested_at: null,
    handover_requested_by: null,
    handover_note: null,
    owner_until: null,
    handover_from: null,
    handover_accepted_at: null,
    sla_paused_at: null,
    sla_pause_reason: null,
    sla_pause_total_ms: 0,
    sla_escalated_at: null,
    sla_escalated_to: null,
    created_at: at,
    updated_at: at
  };
  return {
    task,
    event: {
      task_id: task.id,
      type: "task.created",
      actor: task.created_by,
      payload: {
        title: task.title,
        type: task.type,
        priority: task.priority,
        assignee: task.assignee,
        proposed_due_at: task.proposed_due_at
      },
      created_at: at
    }
  };
}
function normalizeStatusChange(raw) {
  const input = record(raw, "\u0421\u043C\u0435\u043D\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430");
  const assigneeRaw = input.assignee;
  return {
    to: oneOf(input.to ?? input.expected_status, "to", TASK_STATUSES, "open"),
    agent: text(input.agent, "agent", 100, true),
    reason: text(input.reason, "reason", 2e3) || null,
    assignee: assigneeRaw === void 0 ? void 0 : optionalName(assigneeRaw, "assignee"),
    expectation: normalizeExpectation(input.expected)
  };
}
function normalizeHandoverRequest(raw) {
  const input = record(raw, "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438");
  return {
    to: text(input.to, "to", 100, true),
    owner_until: optionalIso(input.owner_until, "owner_until") ?? "",
    actor: text(input.actor, "actor", 100, true),
    note: text(input.note, "note", 500) || null,
    expectation: normalizeExpectation(input.expected)
  };
}
function normalizeActorAction(raw) {
  const input = record(raw, "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441 \u0437\u0430\u0434\u0430\u0447\u0435\u0439");
  return {
    actor: text(input.actor, "actor", 100, true),
    note: text(input.note, "note", 500) || null,
    expectation: normalizeExpectation(input.expected)
  };
}
function normalizeDueAction(raw) {
  const input = record(raw, "\u0421\u0440\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438");
  return {
    action: oneOf(input.action, "action", ["propose", "approve"], "propose"),
    due_at: optionalIso(input.due_at, "due_at"),
    actor: text(input.actor, "actor", 100, true),
    expectation: normalizeExpectation(input.expected)
  };
}
function normalizeSlaAction(raw) {
  const input = record(raw, "SLA \u0437\u0430\u0434\u0430\u0447\u0438");
  return {
    action: oneOf(input.action, "action", ["pause", "resume", "escalate"], "pause"),
    actor: text(input.actor, "actor", 100, true),
    reason: text(input.reason, "reason", 500) || null,
    to: optionalName(input.to, "to"),
    expectation: normalizeExpectation(input.expected)
  };
}
var TASK_SYSTEM_ACTORS = ["mission", "telegram", "system"];
var TASK_PERMISSION_MATRIX = Object.freeze({
  "task.status.change": ["owner", "assignee"],
  "task.status.claim": ["owner", "assignee", "viewer"],
  "task.status.reopen": ["owner"],
  "task.assign": ["owner"],
  "task.handover.request": ["owner", "assignee"],
  "task.handover.accept": ["pending_assignee"],
  "task.handover.decline": ["pending_assignee"],
  "task.due.propose": ["owner", "assignee"],
  "task.due.approve": ["owner"],
  "task.sla.pause": ["owner", "assignee"],
  "task.sla.resume": ["owner", "assignee"],
  "task.sla.escalate": ["owner", "assignee"]
});
function taskActorRole(task, actor) {
  if (task.pending_assignee && actor === task.pending_assignee) return "pending_assignee";
  if (actor === task.created_by) return "owner";
  if (actor === task.assignee) return "assignee";
  return "viewer";
}
function isTaskClosed(status) {
  return status === "done" || status === "cancelled";
}
function requireTaskPermission(task, actor, action, description) {
  const allowed = TASK_PERMISSION_MATRIX[action];
  const role = taskActorRole(task, actor);
  if (!allowed.includes(role)) {
    throw new ForbiddenError(
      `\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xAB${description}\xBB \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E: \u0443 \xAB${actor}\xBB \u0440\u043E\u043B\u044C ${role}, \u043D\u0443\u0436\u043D\u0430 ${allowed.join(" \u0438\u043B\u0438 ")}`,
      { actor, role, allowed, action, task_id: task.id }
    );
  }
}
function requireSystemActor(actor) {
  if (!TASK_SYSTEM_ACTORS.includes(actor)) {
    throw new ForbiddenError(
      `\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0439 \u043F\u0443\u0442\u044C \u0441\u043C\u0435\u043D\u044B \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u043C \u0430\u043A\u0442\u043E\u0440\u0430\u043C, \u0430 \u043D\u0435 \xAB${actor}\xBB`,
      { actor, allowed: TASK_SYSTEM_ACTORS }
    );
  }
}
function taskEffectiveDue(task) {
  const due = task.approved_due_at ?? task.proposed_due_at;
  if (!due) return null;
  const base = Date.parse(due);
  if (!Number.isFinite(base)) return null;
  return new Date(base + Math.max(0, task.sla_pause_total_ms || 0)).toISOString();
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
function event(task, type, actor, payload, at) {
  return { task_id: task.id, type, actor, payload, created_at: at };
}
function next(task, now, patch, type, actor, payload) {
  const at = nextTimestamp(task.updated_at, now);
  const nextTask = { ...task, ...patch, revision: task.revision + 1, updated_at: at };
  return { task: nextTask, event: event(nextTask, type, actor, payload, at) };
}
function changeTaskStatus(task, change, now, options = {}) {
  assertExpectation(task, change.expectation);
  if (change.to === task.status) throw new ValidationError(`\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0443\u0436\u0435 \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 \xAB${task.status}\xBB`);
  if (!TRANSITIONS[task.status].includes(change.to)) {
    throw new ValidationError(`\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043F\u0435\u0440\u0435\u0445\u043E\u0434 ${task.status} \u2192 ${change.to}`, { from: task.status, to: change.to });
  }
  if (change.to === "blocked" && !change.reason) {
    throw new ValidationError("\u0414\u043B\u044F \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u043D\u0443\u0436\u043D\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0432 \u043F\u043E\u043B\u0435 \xABreason\xBB");
  }
  if (options.system) {
    requireSystemActor(change.agent);
  } else {
    const action = change.to === "open" && isTaskClosed(task.status) ? "task.status.reopen" : change.to === "claimed" && !task.assignee ? "task.status.claim" : "task.status.change";
    requireTaskPermission(task, change.agent, action, "\u0441\u043C\u0435\u043D\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441");
    if (change.assignee !== void 0 && change.assignee !== change.agent) {
      requireTaskPermission(task, change.agent, "task.assign", "\u043D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F");
    }
  }
  const at = nextTimestamp(task.updated_at, now);
  const assignee = change.assignee !== void 0 ? change.assignee : change.to === "claimed" && !task.assignee ? change.agent : change.to === "open" ? null : task.assignee;
  const closing = change.to === "done" || change.to === "cancelled";
  const reopening = change.to === "open";
  const nextTask = {
    ...task,
    status: change.to,
    revision: task.revision + 1,
    assignee,
    blocked_reason: change.to === "blocked" ? change.reason : null,
    actual_at: closing ? at : reopening ? null : task.actual_at,
    pending_assignee: closing || reopening ? null : task.pending_assignee,
    owner_until: closing || reopening ? null : task.owner_until,
    handover_from: closing || reopening ? null : task.handover_from,
    sla_paused_at: closing || reopening ? null : task.sla_paused_at,
    sla_pause_reason: closing || reopening ? null : task.sla_pause_reason,
    sla_pause_total_ms: closing || reopening ? 0 : task.sla_pause_total_ms,
    sla_escalated_at: closing || reopening ? null : task.sla_escalated_at,
    sla_escalated_to: closing || reopening ? null : task.sla_escalated_to,
    updated_at: at
  };
  return {
    task: nextTask,
    event: event(
      nextTask,
      "task.status_changed",
      change.agent,
      {
        from: task.status,
        to: change.to,
        revision: nextTask.revision,
        reason: change.reason,
        actual_at: nextTask.actual_at
      },
      at
    )
  };
}
function requestTaskHandover(task, change, now) {
  assertExpectation(task, change.expectation);
  requireTaskPermission(task, change.actor, "task.handover.request", "\u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438");
  if (!change.owner_until) throw new ValidationError("\u041F\u043E\u043B\u0435 \xABowner_until\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E: \u043A\u043E\u0433\u0434\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C");
  if (Date.parse(change.owner_until) <= now.getTime()) {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABowner_until\xBB: \u0441\u0440\u043E\u043A \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0432 \u0431\u0443\u0434\u0443\u0449\u0435\u043C");
  }
  if (isTaskClosed(task.status)) throw new ValidationError("\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u0434\u0430\u0442\u044C \u0437\u0430\u043A\u0440\u044B\u0442\u0443\u044E \u0437\u0430\u0434\u0430\u0447\u0443");
  if (task.pending_assignee) throw new ConflictError("\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u0443\u0436\u0435 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u0440\u0438\u043D\u044F\u0442\u0438\u044F", { current: task });
  if (change.to === task.assignee) throw new ValidationError("\u042D\u0442\u043E\u0442 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0443\u0436\u0435 \u0432\u043B\u0430\u0434\u0435\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0435\u0439");
  return next(
    task,
    now,
    {
      pending_assignee: change.to,
      handover_requested_at: nextTimestamp(task.updated_at, now),
      handover_requested_by: change.actor,
      handover_note: change.note,
      owner_until: change.owner_until,
      handover_from: task.assignee
    },
    "task.handover_requested",
    change.actor,
    { to: change.to, owner_until: change.owner_until, note: change.note }
  );
}
function acceptTaskHandover(task, action, now) {
  assertExpectation(task, action.expectation);
  if (!task.pending_assignee) throw new ValidationError("\u041D\u0435\u0442 \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0435\u0439 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438");
  requireTaskPermission(task, action.actor, "task.handover.accept", "\u043F\u0440\u0438\u043D\u044F\u0442\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438");
  if (task.owner_until && Date.parse(task.owner_until) <= now.getTime()) {
    throw new ValidationError("\u0421\u0440\u043E\u043A \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043D\u043E\u0439 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0443\u0436\u0435 \u0438\u0441\u0442\u0451\u043A");
  }
  return next(
    task,
    now,
    {
      assignee: task.pending_assignee,
      pending_assignee: null,
      handover_accepted_at: nextTimestamp(task.updated_at, now),
      handover_note: null
    },
    "task.handover_accepted",
    action.actor,
    { from: task.assignee, to: task.pending_assignee, owner_until: task.owner_until }
  );
}
function declineTaskHandover(task, action, now) {
  assertExpectation(task, action.expectation);
  if (!task.pending_assignee) throw new ValidationError("\u041D\u0435\u0442 \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0435\u0439 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438");
  requireTaskPermission(task, action.actor, "task.handover.decline", "\u043E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438");
  return next(
    task,
    now,
    { pending_assignee: null, owner_until: null, handover_from: null, handover_note: null },
    "task.handover_declined",
    action.actor,
    { from: task.assignee, to: task.pending_assignee, note: action.note }
  );
}
function proposeTaskDue(task, action, now) {
  assertExpectation(task, action.expectation);
  requireTaskPermission(task, action.actor, "task.due.propose", "\u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0441\u0440\u043E\u043A");
  if (action.action !== "propose") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABpropose\xBB");
  if (!action.due_at) throw new ValidationError("\u041F\u043E\u043B\u0435 \xABdue_at\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0441\u0440\u043E\u043A\u0430");
  if (isTaskClosed(task.status)) throw new ValidationError("\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0441\u0440\u043E\u043A \u0437\u0430\u043A\u0440\u044B\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438");
  if (task.sla_paused_at) throw new ValidationError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 SLA: \u0441\u0440\u043E\u043A \u043D\u0430 \u043F\u0430\u0443\u0437\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F");
  return next(
    task,
    now,
    {
      proposed_due_at: action.due_at,
      proposed_by: action.actor,
      approved_due_at: null,
      approved_by: null,
      sla_pause_total_ms: 0,
      sla_escalated_at: null,
      sla_escalated_to: null
    },
    "task.due_proposed",
    action.actor,
    { due_at: action.due_at }
  );
}
function approveTaskDue(task, action, now) {
  assertExpectation(task, action.expectation);
  requireTaskPermission(task, action.actor, "task.due.approve", "\u0443\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0441\u0440\u043E\u043A");
  if (action.action !== "approve") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABapprove\xBB");
  if (!task.proposed_due_at) throw new ValidationError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0441\u0440\u043E\u043A");
  if (action.due_at && action.due_at !== task.proposed_due_at) {
    throw new ValidationError("\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u0441\u0440\u043E\u043A; \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439");
  }
  if (isTaskClosed(task.status)) throw new ValidationError("\u041D\u0435\u043B\u044C\u0437\u044F \u0443\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0441\u0440\u043E\u043A \u0437\u0430\u043A\u0440\u044B\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438");
  if (task.sla_paused_at) throw new ValidationError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 SLA: \u0441\u0440\u043E\u043A \u043D\u0430 \u043F\u0430\u0443\u0437\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F");
  return next(
    task,
    now,
    { approved_due_at: task.proposed_due_at, approved_by: action.actor },
    "task.due_approved",
    action.actor,
    { due_at: task.proposed_due_at, proposed_by: task.proposed_by }
  );
}
function pauseTaskSla(task, action, now) {
  assertExpectation(task, action.expectation);
  requireTaskPermission(task, action.actor, "task.sla.pause", "\u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C SLA");
  if (action.action !== "pause") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABpause\xBB");
  if (isTaskClosed(task.status)) throw new ValidationError("SLA \u0437\u0430\u043A\u0440\u044B\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438 \u043D\u0435 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442\u0441\u044F");
  if (task.sla_paused_at) throw new ValidationError("SLA \u0443\u0436\u0435 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
  if (!task.approved_due_at && !task.proposed_due_at) throw new ValidationError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u0441\u0440\u043E\u043A");
  if (!action.reason) throw new ValidationError("\u0414\u043B\u044F \u043F\u0430\u0443\u0437\u044B SLA \u043D\u0443\u0436\u043D\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430");
  return next(
    task,
    now,
    // Это факт времени, а не версия записи: nextTimestamp добавил бы
    // миллисекунды к паузе и украл бы их из оставшегося SLA.
    { sla_paused_at: now.toISOString(), sla_pause_reason: action.reason },
    "task.sla_paused",
    action.actor,
    { reason: action.reason }
  );
}
function resumeTaskSla(task, action, now) {
  assertExpectation(task, action.expectation);
  requireTaskPermission(task, action.actor, "task.sla.resume", "\u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C SLA");
  if (action.action !== "resume") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABresume\xBB");
  if (!task.sla_paused_at) throw new ValidationError("SLA \u043D\u0435 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
  const pausedFor = Math.max(0, now.getTime() - Date.parse(task.sla_paused_at));
  return next(
    task,
    now,
    {
      sla_paused_at: null,
      sla_pause_reason: null,
      sla_pause_total_ms: task.sla_pause_total_ms + pausedFor
    },
    "task.sla_resumed",
    action.actor,
    { paused_for_ms: pausedFor, paused_total_ms: task.sla_pause_total_ms + pausedFor }
  );
}
function escalateTaskSla(task, action, now) {
  assertExpectation(task, action.expectation);
  requireTaskPermission(task, action.actor, "task.sla.escalate", "\u044D\u0441\u043A\u0430\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C SLA");
  if (action.action !== "escalate") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABescalate\xBB");
  if (isTaskClosed(task.status)) throw new ValidationError("SLA \u0437\u0430\u043A\u0440\u044B\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438 \u043D\u0435 \u044D\u0441\u043A\u0430\u043B\u0438\u0440\u0443\u0435\u0442\u0441\u044F");
  const due = taskEffectiveDue(task);
  if (!due) throw new ValidationError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u0441\u0440\u043E\u043A");
  if (task.sla_paused_at) throw new ValidationError("SLA \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0435\u0433\u043E");
  if (Date.parse(due) > now.getTime()) throw new ValidationError("\u0421\u0440\u043E\u043A \u0435\u0449\u0451 \u043D\u0435 \u043D\u0430\u0441\u0442\u0443\u043F\u0438\u043B");
  if (task.sla_escalated_at) throw new ConflictError("SLA \u0443\u0436\u0435 \u044D\u0441\u043A\u0430\u043B\u0438\u0440\u043E\u0432\u0430\u043D", { current: task });
  if (!action.to) throw new ValidationError("\u041F\u043E\u043B\u0435 \xABto\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E: \u043A\u043E\u043C\u0443 \u044D\u0441\u043A\u0430\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C");
  return next(
    task,
    now,
    { sla_escalated_at: nextTimestamp(task.updated_at, now), sla_escalated_to: action.to },
    "task.sla_escalated",
    action.actor,
    { title: task.title, due_at: due, to: action.to, reason: action.reason }
  );
}
function expireTaskOwnership(task, now) {
  if (isTaskClosed(task.status) || !task.owner_until) return null;
  if (Date.parse(task.owner_until) > now.getTime()) return null;
  const pending = Boolean(task.pending_assignee);
  const restored = pending ? task.assignee : task.handover_from ?? task.assignee;
  return next(
    task,
    now,
    {
      assignee: restored,
      pending_assignee: null,
      owner_until: null,
      handover_from: null,
      handover_note: null
    },
    "task.handover_expired",
    "system",
    {
      title: task.title,
      from: task.assignee,
      to: restored,
      pending,
      owner_until: task.owner_until
    }
  );
}
function transferTaskOwnership(task, change, now) {
  const participant = text(change.participant, "participant", 100, true);
  const successor = text(change.successor, "successor", 100, true);
  const actor = text(change.actor, "actor", 100, true);
  if (participant === successor) {
    throw new ValidationError("\u041F\u0440\u0435\u0435\u043C\u043D\u0438\u043A \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u043B\u0438\u0447\u0430\u0442\u044C\u0441\u044F \u043E\u0442 \u0443\u0445\u043E\u0434\u044F\u0449\u0435\u0433\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430");
  }
  const patch = {};
  const fields = [];
  if (task.created_by === participant) {
    patch.created_by = successor;
    fields.push("created_by");
  }
  if (task.assignee === participant) {
    patch.assignee = successor;
    fields.push("assignee");
  }
  if (task.pending_assignee === participant) {
    patch.pending_assignee = successor;
    fields.push("pending_assignee");
  }
  if (!fields.length) {
    throw new ValidationError("\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043D\u0435 \u0432\u043B\u0430\u0434\u0435\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0435\u0439", { task_id: task.id, participant });
  }
  return next(
    task,
    now,
    patch,
    "task.ownership_transferred",
    actor,
    {
      title: task.title,
      from: participant,
      to: successor,
      fields
    }
  );
}
function autoEscalateTaskSla(task, now, to) {
  if (isTaskClosed(task.status) || task.sla_paused_at || task.sla_escalated_at) return null;
  const due = taskEffectiveDue(task);
  if (!due || Date.parse(due) > now.getTime()) return null;
  return next(
    task,
    now,
    { sla_escalated_at: nextTimestamp(task.updated_at, now), sla_escalated_to: to },
    "task.sla_escalated",
    "system",
    { title: task.title, due_at: due, to, automatic: true }
  );
}
function taskSla(task, now) {
  const due = taskEffectiveDue(task);
  let state = "on_track";
  if (isTaskClosed(task.status)) state = "closed";
  else if (task.sla_escalated_at) state = "escalated";
  else if (task.sla_paused_at) state = "paused";
  else if (due && Date.parse(due) <= now.getTime()) state = "overdue";
  return {
    state,
    due_at: due,
    paused_at: task.sla_paused_at,
    paused_total_ms: task.sla_pause_total_ms,
    escalated_at: task.sla_escalated_at,
    escalated_to: task.sla_escalated_to
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
  #audit;
  constructor(repo, bus, clock, log, audit) {
    this.#repo = repo;
    this.#bus = bus;
    this.#clock = clock;
    this.#log = log.child({ module: "tasks" });
    this.#audit = audit ?? null;
  }
  create(raw) {
    const { task, event: event2 } = createTask(normalizeNewTask(raw), this.#clock.now());
    const audit = this.#audit?.draft({
      action: event2.type,
      target: { kind: "task", id: task.id },
      actor: event2.actor,
      payload: event2.payload,
      at: event2.created_at
    });
    this.#repo.insert(task, event2, audit);
    this.#publish(event2);
    this.#log.info("\u0417\u0430\u0434\u0430\u0447\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430", {
      task_id: task.id,
      type: task.type,
      priority: task.priority,
      proposed_due_at: task.proposed_due_at
    });
    return this.#view(task);
  }
  get(id) {
    this.tick();
    const task = this.#repo.get(id);
    if (!task) throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    return { task: this.#view(task), events: this.#repo.events(id, 100) };
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
    this.tick();
    const limit = raw.limit === void 0 || raw.limit === "" ? 50 : Number(raw.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new ValidationError("\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \xABlimit\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 1 \u0434\u043E 200");
    }
    const page = this.#repo.list({
      status: enumParam(raw.status, "status", TASK_STATUSES),
      type: enumParam(raw.type, "type", TASK_TYPES),
      assignee: raw.assignee?.trim() || void 0,
      search: raw.q?.trim() || void 0,
      limit,
      cursor: raw.cursor?.trim() || void 0
    });
    return { ...page, items: page.items.map((task) => this.#view(task)) };
  }
  /**
   * Один детерминированный проход по фактическому времени. Никаких таймеров:
   * приложение вызывает tick из точки входа/чтения, а часы инжектируются.
   */
  tick(at = this.#clock.now()) {
    let checked = 0;
    let escalated = 0;
    let ownershipReturned = 0;
    for (const candidate of this.#repo.dueCandidates()) {
      checked += 1;
      let current = this.#repo.get(candidate.id);
      if (!current) continue;
      const expiry = expireTaskOwnership(current, at);
      if (expiry) {
        if (!this.#repo.updateWithExpectation(expiry.task, this.#expectation(current), expiry.event)) {
          continue;
        }
        this.#publish(expiry.event);
        ownershipReturned += 1;
        this.#log.info("\u0421\u0440\u043E\u043A \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0438\u0441\u0442\u0451\u043A", {
          task_id: current.id,
          from: current.assignee,
          to: expiry.task.assignee,
          revision: expiry.task.revision
        });
        current = this.#repo.get(candidate.id);
        if (!current) continue;
      }
      const escalation = autoEscalateTaskSla(current, at, current.created_by);
      if (!escalation) continue;
      if (!this.#repo.updateWithExpectation(escalation.task, this.#expectation(current), escalation.event)) {
        continue;
      }
      this.#publish(escalation.event);
      escalated += 1;
      this.#log.info("SLA \u044D\u0441\u043A\u0430\u043B\u0438\u0440\u043E\u0432\u0430\u043D \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438", {
        task_id: current.id,
        to: escalation.task.sla_escalated_to,
        revision: escalation.task.revision
      });
    }
    return { checked, escalated, ownership_returned: ownershipReturned };
  }
  /**
   * Смена статуса с оптимистичной блокировкой: клиент присылает ожидаемые
   * status/revision/updated_at, сервер применяет изменение только при полном
   * совпадении и отвечает 409 с текущей карточкой и списком расхождений.
   */
  changeStatus(id, raw, options = {}) {
    const change = normalizeStatusChange(raw);
    const current = this.#repo.get(id);
    if (!current) throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    const { task, event: event2 } = changeTaskStatus(current, change, this.#clock.now(), options);
    if (!this.#repo.updateWithExpectation(task, change.expectation, event2)) {
      throw this.#conflict(id, change.expectation);
    }
    this.#publish(event2);
    this.#log.info("\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438\u0437\u043C\u0435\u043D\u0451\u043D", {
      task_id: id,
      from: current.status,
      to: task.status,
      revision: task.revision,
      agent: change.agent
    });
    return this.#view(task);
  }
  /** Передача только предлагает нового владельца; до принятия assignee не меняется. */
  requestHandover(id, raw) {
    const change = normalizeHandoverRequest(raw);
    return this.#apply(
      id,
      change.expectation,
      (task, now) => requestTaskHandover(task, change, now),
      "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0430",
      { to: change.to, owner_until: change.owner_until }
    );
  }
  /**
   * Прямой перенос владения при уходе участника. Это не handover с
   * принятием: участник уже недоступен, поэтому создатель, ответственность
   * и ожидающая передача меняются одной записью с событием для аудита.
   */
  transferOwnership(id, raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const current = this.#repo.get(id);
    if (!current) throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    const change = transferTaskOwnership(current, {
      participant: String(input.participant ?? ""),
      successor: String(input.successor ?? ""),
      actor: String(input.actor ?? "")
    }, this.#clock.now());
    if (!this.#repo.updateWithExpectation(change.task, this.#expectation(current), change.event)) {
      throw this.#conflict(id, this.#expectation(current));
    }
    this.#publish(change.event);
    this.#log.info("\u0412\u043B\u0430\u0434\u0435\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0435\u0439 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043E \u043F\u0440\u0438 \u0443\u0445\u043E\u0434\u0435", {
      task_id: id,
      from: input.participant,
      to: input.successor,
      revision: change.task.revision
    });
    return this.#view(change.task);
  }
  acceptHandover(id, raw) {
    const action = normalizeActorAction(raw);
    return this.#apply(
      id,
      action.expectation,
      (task, now) => acceptTaskHandover(task, action, now),
      "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u043F\u0440\u0438\u043D\u044F\u0442\u0430",
      { by: action.actor }
    );
  }
  declineHandover(id, raw) {
    const action = normalizeActorAction(raw);
    return this.#apply(
      id,
      action.expectation,
      (task, now) => declineTaskHandover(task, action, now),
      "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430",
      { by: action.actor }
    );
  }
  proposeDue(id, raw) {
    const action = normalizeDueAction(raw);
    if (action.action !== "propose") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABpropose\xBB");
    return this.#apply(
      id,
      action.expectation,
      (task, now) => proposeTaskDue(task, action, now),
      "\u0421\u0440\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D",
      { due_at: action.due_at, by: action.actor }
    );
  }
  approveDue(id, raw) {
    const action = normalizeDueAction(raw);
    if (action.action !== "approve") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABapprove\xBB");
    return this.#apply(
      id,
      action.expectation,
      (task, now) => approveTaskDue(task, action, now),
      "\u0421\u0440\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D",
      { by: action.actor }
    );
  }
  pauseSla(id, raw) {
    const action = normalizeSlaAction(raw);
    if (action.action !== "pause") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABpause\xBB");
    return this.#apply(
      id,
      action.expectation,
      (task, now) => pauseTaskSla(task, action, now),
      "SLA \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D",
      { reason: action.reason, by: action.actor }
    );
  }
  resumeSla(id, raw) {
    const action = normalizeSlaAction(raw);
    if (action.action !== "resume") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABresume\xBB");
    return this.#apply(
      id,
      action.expectation,
      (task, now) => resumeTaskSla(task, action, now),
      "SLA \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D",
      { by: action.actor }
    );
  }
  escalateSla(id, raw) {
    const action = normalizeSlaAction(raw);
    if (action.action !== "escalate") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \xABescalate\xBB");
    return this.#apply(
      id,
      action.expectation,
      (task, now) => escalateTaskSla(task, action, now),
      "SLA \u044D\u0441\u043A\u0430\u043B\u0438\u0440\u043E\u0432\u0430\u043D",
      { to: action.to, by: action.actor }
    );
  }
  #apply(id, expectation, operation, message, details) {
    const current = this.#repo.get(id);
    if (!current) throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    const { task, event: event2 } = operation(current, this.#clock.now());
    if (!this.#repo.updateWithExpectation(task, expectation, event2)) {
      throw this.#conflict(id, expectation);
    }
    this.#publish(event2);
    this.#log.info(message, {
      task_id: id,
      revision: task.revision,
      event: event2.type,
      ...details
    });
    return this.#view(task);
  }
  #conflict(id, expectation) {
    const actual = this.#repo.get(id);
    if (!actual) return new ConflictError(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u0438\u0441\u0447\u0435\u0437\u043B\u0430`, { id });
    return new ConflictError("\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C \u0441 \u043C\u043E\u043C\u0435\u043D\u0442\u0430 \u0447\u0442\u0435\u043D\u0438\u044F", {
      current: this.#view(actual),
      mismatches: expectationMismatches(actual, expectation)
    });
  }
  #expectation(task) {
    return { status: task.status, revision: task.revision, updated_at: task.updated_at };
  }
  #view(task) {
    return { ...task, sla: taskSla(task, this.#clock.now()) };
  }
  #publish(event2) {
    this.#bus.publish({
      type: event2.type,
      entity: { kind: "task", id: event2.task_id },
      actor: event2.actor,
      at: event2.created_at,
      data: event2.payload
    });
  }
};

// src/domain/exports/csv.ts
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

// src/app/export-format.ts
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
  },
  {
    // Ответственность и сроки — отдельные факты карточки, а не текст заметки.
    // Старые строки получают NULL и читаются без миграции данных.
    version: "tasks/0002_ownership_and_dates",
    sql: `
      ALTER TABLE tasks ADD COLUMN proposed_due_at TEXT;
      ALTER TABLE tasks ADD COLUMN proposed_by TEXT;
      ALTER TABLE tasks ADD COLUMN approved_due_at TEXT;
      ALTER TABLE tasks ADD COLUMN approved_by TEXT;
      ALTER TABLE tasks ADD COLUMN actual_at TEXT;
      ALTER TABLE tasks ADD COLUMN pending_assignee TEXT;
      ALTER TABLE tasks ADD COLUMN handover_requested_at TEXT;
      ALTER TABLE tasks ADD COLUMN handover_requested_by TEXT;
      ALTER TABLE tasks ADD COLUMN handover_note TEXT;
      ALTER TABLE tasks ADD COLUMN owner_until TEXT;
      ALTER TABLE tasks ADD COLUMN handover_accepted_at TEXT;
      ALTER TABLE tasks ADD COLUMN sla_paused_at TEXT;
      ALTER TABLE tasks ADD COLUMN sla_pause_reason TEXT;
      ALTER TABLE tasks ADD COLUMN sla_escalated_at TEXT;
      ALTER TABLE tasks ADD COLUMN sla_escalated_to TEXT;
      CREATE INDEX tasks_due ON tasks (approved_due_at, status);
      CREATE INDEX tasks_pending_assignee ON tasks (pending_assignee);
    `
  },
  {
    // Детерминированный SLA-тик и возврат владельца: эффективный срок
    // учитывает завершённые паузы, а handover_from хранит, к кому вернуться.
    version: "tasks/0003_sla_tick_and_owner",
    sql: `
      ALTER TABLE tasks ADD COLUMN handover_from TEXT;
      ALTER TABLE tasks ADD COLUMN sla_pause_total_ms INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX tasks_owner_until ON tasks (owner_until, status);
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
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: var(--accent); font-size: 13px; }
  main { display: grid; gap: 20px; grid-template-columns: minmax(280px, 360px) 1fr; padding: 24px; align-items: start; }
  @media (max-width: 860px) { main { grid-template-columns: 1fr; } }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: var(--muted); font-weight: 600; }
  label { display: grid; gap: 4px; font-size: 13px; color: var(--muted); margin-bottom: 10px; }
  input, select, textarea, button { font: inherit; }
  input, select, textarea { background: var(--bg); color: inherit; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
  textarea { min-height: 64px; resize: vertical; }
  button { background: var(--accent); color: var(--on-accent); border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  button.ghost { background: var(--panel-soft); color: var(--text); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  li { border: 1px solid var(--line); border-radius: 10px; padding: 12px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .title { font-weight: 600; }
  .meta { color: var(--muted); font-size: 12px; }
  .status { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: var(--panel-soft); }
  .status-done { background: #1d3a2a; color: #8be0ab; }
  .status-blocked { background: #3a2426; color: #ff9a9a; }
  .status-cancelled { background: #3a2426; color: #ffb3b3; }
  .error { color: #ff9a9a; font-size: 13px; min-height: 18px; }
  .empty { color: var(--muted); }
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
      <label>\u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u043C\u044B\u0439 \u0441\u0440\u043E\u043A<input name="proposed_due_at" type="date"></label>
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
  var statuses = ['open', 'claimed', 'blocked', 'done', 'cancelled'];

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
    var due = (task.sla && task.sla.due_at) || task.approved_due_at || task.proposed_due_at;
    if (due) {
      item.appendChild(el('div', 'meta', '\u0441\u0440\u043E\u043A: ' + due.slice(0, 10) +
        (task.approved_due_at ? ' (\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D)' : ' (\u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D)') +
        (task.sla ? ' \xB7 SLA: ' + task.sla.state : '')));
    }
    if (task.pending_assignee) {
      item.appendChild(el('div', 'meta', '\u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0430: \u0436\u0434\u0451\u0442 ' + task.pending_assignee));
    } else if (task.assignee) {
      item.appendChild(el('div', 'meta', '\u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446: ' + task.assignee));
    }

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

    var handover = el('div', 'row');
    var to = el('input');
    to.placeholder = '\u041A\u043E\u043C\u0443 \u043F\u0435\u0440\u0435\u0434\u0430\u0442\u044C';
    to.maxLength = 100;
    var until = el('input');
    until.type = 'datetime-local';
    until.title = '\u041E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0434\u043E';
    var send = el('button', 'ghost', '\u041F\u0435\u0440\u0435\u0434\u0430\u0442\u044C');
    send.type = 'button';
    send.addEventListener('click', function () {
      if (!to.value.trim() || !until.value) { alert('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u0435\u043B\u044F \u0438 \u0441\u0440\u043E\u043A \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438'); return; }
      send.disabled = true;
      request('/api/tasks/' + encodeURIComponent(task.id) + '/handover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: to.value.trim(),
          owner_until: new Date(until.value).toISOString(),
          actor: task.assignee || task.created_by,
          expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
        })
      }).then(load).catch(function (error) { send.disabled = false; alert(error.message); });
    });
    handover.appendChild(to);
    handover.appendChild(until);
    handover.appendChild(send);
    if (task.pending_assignee) {
      var accept = el('button', '', '\u041F\u0440\u0438\u043D\u044F\u0442\u044C');
      accept.type = 'button';
      accept.addEventListener('click', function () {
        accept.disabled = true;
        request('/api/tasks/' + encodeURIComponent(task.id) + '/handover/accept', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            actor: task.pending_assignee,
            expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
          })
        }).then(load).catch(function (error) { accept.disabled = false; alert(error.message); });
      });
      var decline = el('button', 'ghost', '\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C');
      decline.type = 'button';
      decline.addEventListener('click', function () {
        decline.disabled = true;
        request('/api/tasks/' + encodeURIComponent(task.id) + '/handover/decline', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            actor: task.pending_assignee,
            expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
          })
        }).then(load).catch(function (error) { decline.disabled = false; alert(error.message); });
      });
      handover.appendChild(accept);
      handover.appendChild(decline);
    }
    item.appendChild(handover);

    var dates = el('div', 'row');
    var dueInput = el('input');
    dueInput.type = 'date';
    var propose = el('button', 'ghost', '\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0441\u0440\u043E\u043A');
    propose.type = 'button';
    propose.addEventListener('click', function () {
      if (!dueInput.value) { alert('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0434\u0430\u0442\u0443'); return; }
      propose.disabled = true;
      request('/api/tasks/' + encodeURIComponent(task.id) + '/dates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'propose',
          due_at: new Date(dueInput.value).toISOString(),
          actor: task.assignee || task.created_by,
          expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
        })
      }).then(load).catch(function (error) { propose.disabled = false; alert(error.message); });
    });
    dates.appendChild(dueInput);
    dates.appendChild(propose);
    if (task.proposed_due_at && !task.approved_due_at) {
      var approve = el('button', '', '\u0423\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0441\u0440\u043E\u043A');
      approve.type = 'button';
      approve.addEventListener('click', function () {
        approve.disabled = true;
        request('/api/tasks/' + encodeURIComponent(task.id) + '/dates', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            actor: task.created_by,
            expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
          })
        }).then(load).catch(function (error) { approve.disabled = false; alert(error.message); });
      });
      dates.appendChild(approve);
    }
    item.appendChild(dates);

    var sla = el('div', 'row');
    if (task.sla && task.sla.state === 'paused') {
      var resume = el('button', 'ghost', '\u0412\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C SLA');
      resume.type = 'button';
      resume.addEventListener('click', function () {
        resume.disabled = true;
        request('/api/tasks/' + encodeURIComponent(task.id) + '/sla', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'resume', actor: task.assignee || task.created_by,
            expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
          })
        }).then(load).catch(function (error) { resume.disabled = false; alert(error.message); });
      });
      sla.appendChild(resume);
    } else if (task.sla && task.sla.due_at && task.status !== 'done' && task.status !== 'cancelled') {
      var pause = el('button', 'ghost', '\u041F\u0430\u0443\u0437\u0430 SLA');
      pause.type = 'button';
      pause.addEventListener('click', function () {
        var reason = prompt('\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043F\u0430\u0443\u0437\u044B SLA');
        if (!reason) return;
        pause.disabled = true;
        request('/api/tasks/' + encodeURIComponent(task.id) + '/sla', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'pause', actor: task.assignee || task.created_by, reason: reason,
            expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
          })
        }).then(load).catch(function (error) { pause.disabled = false; alert(error.message); });
      });
      sla.appendChild(pause);
      if (task.sla.state === 'overdue') {
        var escalate = el('button', '', '\u042D\u0441\u043A\u0430\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C');
        escalate.type = 'button';
        escalate.addEventListener('click', function () {
          var target = prompt('\u041A\u043E\u043C\u0443 \u044D\u0441\u043A\u0430\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C SLA?');
          if (!target) return;
          escalate.disabled = true;
          request('/api/tasks/' + encodeURIComponent(task.id) + '/sla', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'escalate', actor: task.assignee || task.created_by, to: target,
              expected: { status: task.status, revision: task.revision, updated_at: task.updated_at }
            })
          }).then(load).catch(function (error) { escalate.disabled = false; alert(error.message); });
        });
        sla.appendChild(escalate);
      }
    }
    if (sla.childNodes.length) item.appendChild(sla);
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
    var proposed = data.get('proposed_due_at');
    if (proposed) payload.proposed_due_at = new Date(proposed).toISOString();
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
      const unsubscribe = ctx.bus.subscribe((event2) => {
        if (closed) return;
        res.write(`event: ${event2.type}
data: ${JSON.stringify(event2)}

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
        proposed_due_at: task.proposed_due_at ?? "",
        approved_due_at: task.approved_due_at ?? "",
        actual_at: task.actual_at ?? "",
        pending_assignee: task.pending_assignee ?? "",
        owner_until: task.owner_until ?? "",
        sla_state: task.sla?.state ?? "",
        created_at: task.created_at,
        updated_at: task.updated_at
      }));
      return {
        raw: format === "csv" ? csv(rows, ["id", "title", "description", "type", "status", "priority", "created_by", "assignee", "tags", "blocked_reason", "proposed_due_at", "approved_due_at", "actual_at", "pending_assignee", "owner_until", "sla_state", "created_at", "updated_at"]) : JSON.stringify({ exported_at: (/* @__PURE__ */ new Date()).toISOString(), count: items.length, tasks: items }, null, 2),
        headers: downloadHeaders("team-tasks", format)
      };
    });
    ctx.api.add("GET", "/api/tasks/events", (request) => openEventStream(request));
    ctx.api.add("POST", "/api/tasks/tick", () => ({ body: tasks.tick() }));
    ctx.api.add("GET", "/api/tasks/:id", (request) => ({
      body: tasks.get(request.params.id ?? "")
    }));
    ctx.api.add("POST", "/api/tasks/:id/status", (request) => ({
      body: { task: tasks.changeStatus(request.params.id ?? "", request.body) }
    }));
    ctx.api.add("POST", "/api/tasks/:id/handover", (request) => ({
      body: { task: tasks.requestHandover(request.params.id ?? "", request.body) }
    }));
    ctx.api.add("POST", "/api/tasks/:id/handover/accept", (request) => ({
      body: { task: tasks.acceptHandover(request.params.id ?? "", request.body) }
    }));
    ctx.api.add("POST", "/api/tasks/:id/handover/decline", (request) => ({
      body: { task: tasks.declineHandover(request.params.id ?? "", request.body) }
    }));
    ctx.api.add("POST", "/api/tasks/:id/dates", (request) => {
      const action = request.body?.action;
      return {
        body: {
          task: action === "approve" ? tasks.approveDue(request.params.id ?? "", request.body) : tasks.proposeDue(request.params.id ?? "", request.body)
        }
      };
    });
    ctx.api.add("POST", "/api/tasks/:id/sla", (request) => {
      const action = request.body?.action;
      return {
        body: {
          task: action === "resume" ? tasks.resumeSla(request.params.id ?? "", request.body) : action === "escalate" ? tasks.escalateSla(request.params.id ?? "", request.body) : tasks.pauseSla(request.params.id ?? "", request.body)
        }
      };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
