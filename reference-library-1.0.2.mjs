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
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>\u0411\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043E\u0432</title></head>
<body><main>
<h1>\u0411\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043E\u0432</h1>
<p>\u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u044B \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E: \u0434\u043E 2000 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0441 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\u043C, \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0435\u0439, \u0442\u0435\u0433\u0430\u043C\u0438, \u0437\u0430\u043C\u0435\u0442\u043A\u043E\u0439 \u0438 \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u043D\u0430 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A. \u0421\u0435\u0442\u044C \u0438 \u0432\u043D\u0435\u0448\u043D\u0438\u0435 \u0441\u0435\u0440\u0432\u0438\u0441\u044B \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442\u0441\u044F.</p>
<section>
  <h2>\u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441</h2>
  <p><label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 <input id="title" maxlength="200" size="50" /></label></p>
  <p><label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F <input id="category" maxlength="60" placeholder="general" /></label> <label>\u0422\u0435\u0433\u0438 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E <input id="tags" maxlength="600" size="40" placeholder="\u0437\u0430\u043A\u0430\u0442, \u0442\u0451\u043F\u043B\u044B\u0439 \u0441\u0432\u0435\u0442" /></label></p>
  <p><label>\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A <input id="source-url" maxlength="500" size="60" /></label></p>
  <p><label>\u0417\u0430\u043C\u0435\u0442\u043A\u0430 <textarea id="notes" rows="3" cols="60" maxlength="4000"></textarea></label></p>
  <p><button id="add-btn">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441</button></p>
</section>
<section>
  <h2>\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0435</h2>
  <p><label>\u0422\u0435\u043A\u0441\u0442 \u0432 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0438, \u0437\u0430\u043C\u0435\u0442\u043A\u0435 \u0438\u043B\u0438 \u0442\u0435\u0433\u0430\u0445 <input id="q" maxlength="200" size="40" /></label> <label>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F <select id="filter-category"><option value="">\u043B\u044E\u0431\u0430\u044F</option></select></label> <label>\u0422\u0435\u0433 <select id="filter-tag"><option value="">\u043B\u044E\u0431\u043E\u0439</option></select></label></p>
  <p><button id="search-btn">\u041D\u0430\u0439\u0442\u0438</button> <button id="refs-btn">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 \u0438 \u0442\u0435\u0433\u0438</button> <button id="summary-btn">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443</button></p>
</section>
<section>
  <h2>\u041E\u0434\u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u044C</h2>
  <p><label>\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 <input id="ref-id" maxlength="120" size="30" /></label> <button id="load-btn">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C</button></p>
  <p><label>\u041D\u043E\u0432\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 <input id="edit-title" maxlength="200" size="40" /></label> <label>\u041D\u043E\u0432\u0430\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F <input id="edit-category" maxlength="60" /></label> <button id="save-btn">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F</button></p>
</section>
<p id="status" role="status"></p>
<section>
  <h2>\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442</h2>
  <p id="result-note" role="status">\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0441\u043F\u0438\u0441\u043E\u043A \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0445 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u043E\u0432 \u0438\u043B\u0438 \u043E\u0434\u043D\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C.</p>
  <ul id="items"></ul>
</section>
<script>
// \u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F \u043D\u0430 \u0432\u0435\u0440\u0448\u0438\u043D\u0435 \u0441\u043A\u0440\u0438\u043F\u0442\u0430 \u043D\u0430\u0437\u044B\u0432\u0430\u0435\u043C statusLine, \u0430 \u043D\u0435
// status: \xABvar status\xBB \u043D\u0430 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u043E\u043C \u0443\u0440\u043E\u0432\u043D\u0435 \u2014 \u044D\u0442\u043E \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u043E window.status,
// \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u043F\u0440\u0438\u0432\u043E\u0434\u0438\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043A \u0441\u0442\u0440\u043E\u043A\u0435, \u0438 \u0437\u0430\u043F\u0438\u0441\u044C \u0432 textContent \u043C\u043E\u043B\u0447\u0430 \u043F\u0440\u043E\u043F\u0430\u0434\u0430\u0435\u0442
// (\u043F\u043E\u0439\u043C\u0430\u043D\u043E \u0436\u0438\u0432\u044B\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C 2026-11-24).
var statusLine = document.getElementById('status');
var note = document.getElementById('result-note');
var list = document.getElementById('items');
function say(text) { statusLine.textContent = text; }
function noteSay(text) { note.textContent = text; }
function field(id) { return document.getElementById(id).value.trim(); }
async function api(method, path, body) {
  var r = await fetch(path, { method: method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  var data = await r.json().catch(function () { return null; });
  if (!r.ok) { throw Error(data && data.error && data.error.message ? data.error.message : '\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ' + r.status); }
  return data;
}
function tagsOf(value) {
  var out = [];
  var parts = value.split(',');
  for (var i = 0; i < parts.length; i += 1) { var one = parts[i].trim(); if (one) out.push(one); }
  return out;
}
function fillSelect(id, values, emptyLabel) {
  var select = document.getElementById(id);
  var keep = select.value;
  select.textContent = '';
  var blank = document.createElement('option');
  blank.value = '';
  blank.textContent = emptyLabel;
  select.append(blank);
  for (var i = 0; i < values.length; i += 1) {
    var option = document.createElement('option');
    option.value = values[i];
    option.textContent = values[i];
    select.append(option);
  }
  select.value = keep;
}
function rowOf(item) {
  var li = document.createElement('li');
  var title = document.createElement('strong');
  title.textContent = item.title;
  var meta = document.createElement('span');
  meta.textContent = ' \u2014 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F: ' + item.category
    + (item.tags.length ? '; \u0442\u0435\u0433\u0438: ' + item.tags.join(', ') : '; \u0442\u0435\u0433\u043E\u0432 \u043D\u0435\u0442')
    + (item.notes ? '; \u0437\u0430\u043C\u0435\u0442\u043A\u0430: ' + item.notes : '')
    + (item.source_url ? '; \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A: ' + item.source_url : '');
  var open = document.createElement('button');
  open.textContent = '\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C';
  open.onclick = function () { openItem(item.id); };
  var remove = document.createElement('button');
  remove.textContent = '\u0423\u0434\u0430\u043B\u0438\u0442\u044C';
  remove.onclick = function () { removeItem(item.id, remove); };
  li.append(title, meta, open, remove);
  return li;
}
async function openItem(id) {
  say('\u0427\u0438\u0442\u0430\u0435\u043C \u0437\u0430\u043F\u0438\u0441\u044C\u2026');
  try {
    var data = await api('GET', '/api/tools/reference-library/items/' + encodeURIComponent(id));
    document.getElementById('ref-id').value = data.item.id;
    document.getElementById('edit-title').value = data.item.title;
    document.getElementById('edit-category').value = data.item.category;
    list.textContent = '';
    list.append(rowOf(data.item));
    noteSay('\u0417\u0430\u043F\u0438\u0441\u044C ' + data.item.id + ': \xAB' + data.item.title + '\xBB, \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F ' + data.item.category + ', \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0430 ' + data.item.updated_at + '. \u041F\u043E\u043B\u044F \u043D\u0438\u0436\u0435 \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u044C.');
    say('\u0417\u0430\u043F\u0438\u0441\u044C \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430.');
  } catch (error) { say(error.message); }
}
async function removeItem(id, button) {
  if (button.textContent === '\u0423\u0434\u0430\u043B\u0438\u0442\u044C') {
    button.textContent = '\u0422\u043E\u0447\u043D\u043E \u0443\u0434\u0430\u043B\u0438\u0442\u044C?';
    say('\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0422\u043E\u0447\u043D\u043E \u0443\u0434\u0430\u043B\u0438\u0442\u044C?\xBB \u0435\u0449\u0451 \u0440\u0430\u0437: \u0437\u0430\u043F\u0438\u0441\u044C ' + id + ' \u0438\u0441\u0447\u0435\u0437\u043D\u0435\u0442 \u0431\u0435\u0437 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C.');
    return;
  }
  say('\u0423\u0434\u0430\u043B\u044F\u0435\u043C\u2026');
  try {
    await api('DELETE', '/api/tools/reference-library/items/' + encodeURIComponent(id));
    noteSay('\u0417\u0430\u043F\u0438\u0441\u044C ' + id + ' \u0443\u0434\u0430\u043B\u0435\u043D\u0430.');
    say('\u0423\u0434\u0430\u043B\u0435\u043D\u043E.');
  } catch (error) { say(error.message); button.textContent = '\u0423\u0434\u0430\u043B\u0438\u0442\u044C'; }
}
document.getElementById('add-btn').onclick = async function () {
  var title = field('title');
  if (!title) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430 \u2014 \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  this.disabled = true;
  say('\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u043C \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u2026');
  try {
    var body = { title: title, tags: tagsOf(field('tags')) };
    if (field('category')) body.category = field('category');
    if (field('source-url')) body.source_url = field('source-url');
    if (field('notes')) body.notes = field('notes');
    var data = await api('POST', '/api/tools/reference-library/items', body);
    document.getElementById('ref-id').value = data.item.id;
    list.textContent = '';
    list.append(rowOf(data.item));
    noteSay('\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \xAB' + data.item.title + '\xBB \u0441 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u043E\u043C ' + data.item.id + '.');
    say('\u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
document.getElementById('search-btn').onclick = async function () {
  this.disabled = true;
  say('\u0418\u0449\u0435\u043C\u2026');
  try {
    // \u0421\u0442\u0440\u043E\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E: URLSearchParams \u043D\u0435\u0442 \u0432 \u043F\u0435\u0441\u043E\u0447\u043D\u0438\u0446\u0435,
    // \u0432 \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u043F\u0440\u043E\u0433\u043E\u043D \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u043F\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u043E\u0432.
    var query = '';
    if (field('q')) query += '&q=' + encodeURIComponent(field('q'));
    if (field('filter-category')) query += '&category=' + encodeURIComponent(field('filter-category'));
    if (field('filter-tag')) query += '&tag=' + encodeURIComponent(field('filter-tag'));
    var data = await api('GET', '/api/tools/reference-library/items?' + query);
    list.textContent = '';
    for (var i = 0; i < data.items.length; i += 1) list.append(rowOf(data.items[i]));
    noteSay(data.items.length
      ? '\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0435\u0439: ' + data.items.length + '. \u0423 \u043A\u0430\u0436\u0434\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u0438 \u0435\u0441\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0438 \xAB\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C\xBB \u0438 \xAB\u0423\u0434\u0430\u043B\u0438\u0442\u044C\xBB.'
      : '\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E: \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0438\u0441\u043A\u0430, \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E \u0438\u043B\u0438 \u0442\u0435\u0433.');
    say(data.items.length ? '\u041F\u043E\u0438\u0441\u043A \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D.' : '\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
document.getElementById('refs-btn').onclick = async function () {
  this.disabled = true;
  say('\u0427\u0438\u0442\u0430\u0435\u043C \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 \u0438 \u0442\u0435\u0433\u0438\u2026');
  try {
    var cats = await api('GET', '/api/tools/reference-library/categories');
    var tg = await api('GET', '/api/tools/reference-library/tags');
    fillSelect('filter-category', cats.categories, '\u043B\u044E\u0431\u0430\u044F');
    fillSelect('filter-tag', tg.tags, '\u043B\u044E\u0431\u043E\u0439');
    noteSay('\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438: ' + (cats.categories.length ? cats.categories.join(', ') : '\u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439')
      + '. \u0422\u0435\u0433\u0438: ' + (tg.tags.length ? tg.tags.join(', ') : '\u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E') + '.');
    say('\u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B: \u0444\u0438\u043B\u044C\u0442\u0440\u044B \u043F\u043E\u0438\u0441\u043A\u0430 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
document.getElementById('summary-btn').onclick = async function () {
  this.disabled = true;
  say('\u0427\u0438\u0442\u0430\u0435\u043C \u0441\u0432\u043E\u0434\u043A\u0443\u2026');
  try {
    var data = await api('GET', '/api/tools/reference-library/summary');
    noteSay('\u0417\u0430\u043F\u0438\u0441\u0435\u0439: ' + data.summary.items + ' \u0438\u0437 ' + data.summary.limit + '; \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0439: ' + data.summary.categories + '; \u0442\u0435\u0433\u043E\u0432: ' + data.summary.tags + '.');
    say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
document.getElementById('load-btn').onclick = async function () {
  var id = field('ref-id');
  if (!id) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430 \u2014 \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  await openItem(id);
};
document.getElementById('save-btn').onclick = async function () {
  var id = field('ref-id');
  if (!id) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u043F\u0438\u0441\u0438, \u043A\u043E\u0442\u043E\u0440\u0443\u044E \u043D\u0443\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u2014 \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  var title = field('edit-title');
  var category = field('edit-category');
  if (!title && !category) { say('\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043D\u043E\u0432\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u043D\u043E\u0432\u0443\u044E \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E: \u043C\u0435\u043D\u044F\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E, \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  this.disabled = true;
  say('\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u043C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F\u2026');
  try {
    var body = {};
    if (title) body.title = title;
    if (category) body.category = category;
    var data = await api('PATCH', '/api/tools/reference-library/items/' + encodeURIComponent(id), body);
    list.textContent = '';
    list.append(rowOf(data.item));
    noteSay('\u0417\u0430\u043F\u0438\u0441\u044C ' + id + ' \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430: \xAB' + data.item.title + '\xBB, \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F ' + data.item.category + '.');
    say('\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
noteSay('\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0441 \u043A\u043D\u043E\u043F\u043A\u0438 \xAB\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\xBB, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041D\u0430\u0439\u0442\u0438\xBB, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0432\u0435\u0441\u044C \u0441\u043F\u0438\u0441\u043E\u043A.');
</script>
</main></body>
</html>`;
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
  PAGE,
  index_default as default
};
