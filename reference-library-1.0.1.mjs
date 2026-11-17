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

// team-host-api:src/kernel/ids.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var newId = host2["newId"];

// team-host-api:src/kernel/validate.ts
var host3 = globalThis["__teamPlatformHostApi"] ?? {};
var integer = host3["integer"];
var oneOf = host3["oneOf"];
var optionalInteger = host3["optionalInteger"];
var optionalName = host3["optionalName"];
var record = host3["record"];
var requiredOneOf = host3["requiredOneOf"];
var text = host3["text"];

// modules/reference-library/service.ts
var MAX_ITEMS = 2e3;
var MAX_TITLE = 200;
var MAX_NOTES = 4e3;
var MAX_META = 4e3;
var MAX_TAGS = 32;
var MAX_TAG_LEN = 40;
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
function toRef(row) {
  return {
    id: row.id,
    title: row.title,
    asset_id: row.asset_id,
    source_url: row.source_url,
    category: row.category,
    tags: parseTags(row.tags),
    notes: row.notes,
    palette_id: row.palette_id,
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function normalizeTags(raw) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError("tags \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C \u0441\u0442\u0440\u043E\u043A", { reason: "ref_tags_invalid" });
  if (raw.length > MAX_TAGS) throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0442\u0435\u0433\u043E\u0432", { reason: "ref_too_many_tags", limit: MAX_TAGS });
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const t of raw) {
    const v = String(t).trim().toLowerCase();
    if (!v) continue;
    if (v.length > MAX_TAG_LEN) throw new ValidationError("\u0422\u0435\u0433 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439", { reason: "ref_tag_too_long", limit: MAX_TAG_LEN });
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
var ReferenceLibraryService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM reference_library_items").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM reference_library_items ORDER BY updated_at DESC LIMIT ?").all(safe);
    return rows.map(toRef);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM reference_library_items WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return toRef(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430");
    const title = text(input.title, "title", MAX_TITLE, true);
    const assetId = input.asset_id === void 0 || input.asset_id === null || input.asset_id === "" ? null : text(input.asset_id, "asset_id", 120, true);
    const sourceUrl = input.source_url === void 0 || input.source_url === null || input.source_url === "" ? null : text(input.source_url, "source_url", 500, true);
    const category = input.category === void 0 || input.category === null || input.category === "" ? "general" : text(input.category, "category", 60, true);
    const tags = normalizeTags(input.tags);
    const notes = input.notes === void 0 || input.notes === null ? "" : text(input.notes, "notes", MAX_NOTES, false);
    const paletteId = input.palette_id === void 0 || input.palette_id === null || input.palette_id === "" ? null : text(input.palette_id, "palette_id", 120, true);
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "ref_metadata_too_long" });
    if (this.#count() >= MAX_ITEMS) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043E\u0432 (2000)", { reason: "ref_count_limit" });
    }
    const id = newId("ref");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO reference_library_items (id, title, asset_id, source_url, category, tags, notes, palette_id, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, assetId, sourceUrl, category, JSON.stringify(tags), notes, paletteId, metaStr, now, now);
    return { id, title, asset_id: assetId, source_url: sourceUrl, category, tags, notes, palette_id: paletteId, metadata, created_at: now, updated_at: now };
  }
  update(id, raw) {
    const existing = this.get(id);
    const input = record(raw, "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430");
    const title = input.title === void 0 ? existing.title : text(input.title, "title", MAX_TITLE, true);
    const assetId = input.asset_id === void 0 ? existing.asset_id : input.asset_id === null || input.asset_id === "" ? null : text(input.asset_id, "asset_id", 120, true);
    const sourceUrl = input.source_url === void 0 ? existing.source_url : input.source_url === null || input.source_url === "" ? null : text(input.source_url, "source_url", 500, true);
    const category = input.category === void 0 ? existing.category : text(input.category, "category", 60, true);
    const tags = input.tags === void 0 ? existing.tags : normalizeTags(input.tags);
    const notes = input.notes === void 0 ? existing.notes : text(input.notes, "notes", MAX_NOTES, false);
    const paletteId = input.palette_id === void 0 ? existing.palette_id : input.palette_id === null || input.palette_id === "" ? null : text(input.palette_id, "palette_id", 120, true);
    const metadata = input.metadata === void 0 ? existing.metadata : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "ref_metadata_too_long" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      UPDATE reference_library_items SET title=?, asset_id=?, source_url=?, category=?, tags=?, notes=?, palette_id=?, metadata=?, updated_at=? WHERE id=?
    `).run(title, assetId, sourceUrl, category, JSON.stringify(tags), notes, paletteId, metaStr, now, id);
    return { id, title, asset_id: assetId, source_url: sourceUrl, category, tags, notes, palette_id: paletteId, metadata, created_at: existing.created_at, updated_at: now };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM reference_library_items WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    this.#db.raw.prepare("DELETE FROM reference_library_items WHERE id = ?").run(id);
    return { removed: true, id };
  }
  search(query, category, tag, limit = 50) {
    const safe = Math.min(Math.max(limit, 1), 200);
    const q = query.trim().toLowerCase();
    const conditions = [];
    const params = [];
    if (q) {
      conditions.push("(LOWER(title) LIKE ? OR LOWER(notes) LIKE ? OR LOWER(tags) LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }
    if (tag) {
      conditions.push("LOWER(tags) LIKE ?");
      params.push(`%"${tag.toLowerCase()}"%`);
    }
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const rows = this.#db.raw.prepare(`SELECT * FROM reference_library_items ${where} ORDER BY updated_at DESC LIMIT ?`).all(...params, safe);
    return rows.map(toRef);
  }
  categories() {
    const rows = this.#db.raw.prepare("SELECT DISTINCT category FROM reference_library_items ORDER BY category").all();
    return rows.map((r) => r.category);
  }
  tags() {
    const rows = this.#db.raw.prepare("SELECT tags FROM reference_library_items").all();
    const set = /* @__PURE__ */ new Set();
    for (const r of rows) for (const t of parseTags(r.tags)) set.add(t);
    return [...set].sort();
  }
  summary() {
    return { items: this.#count(), limit: MAX_ITEMS, categories: this.categories().length, tags: this.tags().length };
  }
};

// modules/reference-library/schema.ts
var referenceLibraryMigrations = [
  {
    version: "reference-library/1_refs",
    sql: `
      CREATE TABLE reference_library_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        asset_id TEXT,
        source_url TEXT,
        category TEXT NOT NULL DEFAULT 'general',
        tags TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        palette_id TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_reflib_created ON reference_library_items (created_at);
      CREATE INDEX idx_reflib_category ON reference_library_items (category);
      CREATE INDEX idx_reflib_title ON reference_library_items (title);
    `
  }
];

// modules/reference-library/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "reference_library_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0411\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043E\u0432</title></head><body><h1>\u0411\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043E\u0432</h1><p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043E\u0432 \u0441 \u0442\u0435\u0433\u0430\u043C\u0438, \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F\u043C\u0438 \u0438 \u043F\u043E\u0438\u0441\u043A\u043E\u043C.</p></body></html>`;
var module = {
  id: "reference-library",
  apiVersion: 1,
  migrations: referenceLibraryMigrations,
  register(ctx) {
    const svc = new ReferenceLibraryService({ db: ctx.storage });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/reference-library/items", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.search(request.query.get("q") ?? "", request.query.get("category") ?? void 0, request.query.get("tag") ?? void 0, Number(request.query.get("limit") ?? 50)) }
    }));
    ctx.api.add("GET", "/api/tools/reference-library/items/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, item: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/reference-library/items", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, item: result } };
    });
    ctx.api.add("PATCH", "/api/tools/reference-library/items/:id", (request) => {
      const result = svc.update(request.params.id, bodyOf(request.body));
      return { status: 200, headers: NO_STORE, body: { ok: true, item: result } };
    });
    ctx.api.add("DELETE", "/api/tools/reference-library/items/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/reference-library/categories", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, categories: svc.categories() }
    }));
    ctx.api.add("GET", "/api/tools/reference-library/tags", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, tags: svc.tags() }
    }));
    ctx.api.add("GET", "/api/tools/reference-library/summary", () => ({
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
