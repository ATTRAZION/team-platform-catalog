import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

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

// modules/composition-version/service.ts
var MAX_VERSIONS = 1e3;
var MAX_NAME = 120;
var MAX_NOTE = 2e3;
var MAX_META = 4e3;
var MAX_PAYLOAD = 2e5;
var MAX_TAGS = 24;
var MAX_TAG_LEN = 40;
function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function parseTags(raw) {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map((x) => String(x));
  } catch {
  }
  return [];
}
function parseMetadata(raw) {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
  }
  return {};
}
function toVersion(row) {
  return {
    id: row.id,
    name: row.name,
    composition: parseJson(row.composition),
    tags: parseTags(row.tags),
    note: row.note,
    parent_id: row.parent_id,
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at
  };
}
function normalizeTags(raw) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError("tags \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C \u0441\u0442\u0440\u043E\u043A", { reason: "version_tags_invalid" });
  if (raw.length > MAX_TAGS) throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0442\u0435\u0433\u043E\u0432", { reason: "version_too_many_tags", limit: MAX_TAGS });
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const t of raw) {
    const v = String(t).trim().toLowerCase();
    if (!v) continue;
    if (v.length > MAX_TAG_LEN) throw new ValidationError("\u0422\u0435\u0433 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439", { reason: "version_tag_too_long", limit: MAX_TAG_LEN });
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
var CompositionVersionService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM composition_versions").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM composition_versions ORDER BY created_at DESC LIMIT ?").all(safe);
    return rows.map(toVersion);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM composition_versions WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0412\u0435\u0440\u0441\u0438\u044F \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return toVersion(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0432\u0435\u0440\u0441\u0438\u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0438");
    const name = text(input.name, "name", MAX_NAME, true);
    if (input.composition === void 0) {
      throw new ValidationError("\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 composition", { reason: "version_composition_required" });
    }
    const payloadStr = JSON.stringify(input.composition);
    if (payloadStr.length > MAX_PAYLOAD) {
      throw new ValidationError("\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u0430\u044F", { reason: "version_payload_too_large", limit: MAX_PAYLOAD });
    }
    const tags = normalizeTags(input.tags);
    const note = input.note === void 0 || input.note === null ? "" : text(input.note, "note", MAX_NOTE, false);
    const parentId = input.parent_id === void 0 || input.parent_id === null || input.parent_id === "" ? null : text(input.parent_id, "parent_id", 120, true);
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "version_metadata_too_long" });
    if (this.#count() >= MAX_VERSIONS) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0432\u0435\u0440\u0441\u0438\u0439 (1000)", { reason: "version_count_limit" });
    }
    if (parentId) {
      const parent = this.#db.raw.prepare("SELECT id FROM composition_versions WHERE id = ?").get(parentId);
      if (!parent) throw new ValidationError("\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", { reason: "version_parent_not_found", parent_id: parentId });
    }
    const id = newId("ver");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO composition_versions (id, name, composition, tags, note, parent_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, payloadStr, JSON.stringify(tags), note, parentId, metaStr, now);
    return { id, name, composition: input.composition, tags, note, parent_id: parentId, metadata, created_at: now };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM composition_versions WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0412\u0435\u0440\u0441\u0438\u044F \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    this.#db.raw.prepare("DELETE FROM composition_versions WHERE id = ?").run(id);
    return { removed: true, id };
  }
  tags() {
    const rows = this.#db.raw.prepare("SELECT tags FROM composition_versions").all();
    const set = /* @__PURE__ */ new Set();
    for (const r of rows) for (const t of parseTags(r.tags)) set.add(t);
    return [...set].sort();
  }
  diff(aId, bId) {
    const a = this.get(aId);
    const b = this.get(bId);
    const changed = JSON.stringify(a.composition) !== JSON.stringify(b.composition);
    return {
      a: aId,
      b: bId,
      changed,
      summary: changed ? "\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F" : "\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u044B"
    };
  }
  summary() {
    return { versions: this.#count(), limit: MAX_VERSIONS, tags: this.tags().length };
  }
};

// modules/composition-version/schema.ts
var compositionVersionMigrations = [
  {
    version: "composition-version/1_versions",
    sql: `
      CREATE TABLE composition_versions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        composition TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        note TEXT NOT NULL DEFAULT '',
        parent_id TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_compver_created ON composition_versions (created_at);
      CREATE INDEX idx_compver_name ON composition_versions (name);
      CREATE INDEX idx_compver_parent ON composition_versions (parent_id);
    `
  }
];

// modules/composition-version/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "composition_version_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0412\u0435\u0440\u0441\u0438\u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0439</title></head><body><h1>\u0412\u0435\u0440\u0441\u0438\u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0439</h1><p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u043D\u0438\u043C\u043A\u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0439 \u0441 \u0432\u0435\u0440\u0441\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\u043C.</p></body></html>`;
var module = {
  id: "composition-version",
  apiVersion: 1,
  migrations: compositionVersionMigrations,
  register(ctx) {
    const svc = new CompositionVersionService({ db: ctx.storage });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/composition-version/versions", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/composition-version/versions/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, version: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/composition-version/versions", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, version: result } };
    });
    ctx.api.add("DELETE", "/api/tools/composition-version/versions/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/composition-version/diff", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, diff: svc.diff(request.query.get("a"), request.query.get("b")) }
    }));
    ctx.api.add("GET", "/api/tools/composition-version/tags", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, tags: svc.tags() }
    }));
    ctx.api.add("GET", "/api/tools/composition-version/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, summary: svc.summary() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
