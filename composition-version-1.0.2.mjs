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
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0412\u0435\u0440\u0441\u0438\u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0439</title></head><body><main>
<h1>\u0412\u0435\u0440\u0441\u0438\u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0439</h1>
<p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0441\u043D\u0438\u043C\u043A\u043E\u0432 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0439: \u0434\u043E 1000 \u0432\u0435\u0440\u0441\u0438\u0439 \u0441 \u0442\u0435\u0433\u0430\u043C\u0438, \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u043C\u0438, \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0435\u0439, \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435\u043C \u0434\u0432\u0443\u0445 \u0432\u0435\u0440\u0441\u0438\u0439 \u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u043E\u043C JSON. \u0411\u0435\u0437 \u0441\u0435\u0442\u0438 \u0438 \u043A\u043B\u044E\u0447\u0435\u0439.</p>
<p>\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0441\u0430\u043C\u0430 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044F \u2014 JSON (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 <code>{"layers":["bg","fg"]}</code>). \u0422\u0435\u0433\u0438 \u2014 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E, \u0434\u043E 24 \u0448\u0442\u0443\u043A. \u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043F\u043E \u0435\u0451 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0443, \u0435\u0441\u043B\u0438 \u043E\u043D\u0430 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.</p>
<section>
<h2>\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E</h2>
<label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0432\u0435\u0440\u0441\u0438\u0438<br><input id="name" maxlength="120" /></label>
<label>\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F (\u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440, \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)<br><input id="parent" maxlength="120" /></label>
<label>\u0422\u0435\u0433\u0438 (\u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E)<br><input id="tags" maxlength="400" /></label>
<label>\u0417\u0430\u043C\u0435\u0442\u043A\u0430<br><textarea id="note" rows="2" cols="60"></textarea></label>
<label>\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044F (JSON)<br><textarea id="composition" rows="6" cols="60"></textarea></label>
<p><button id="create" type="button">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E</button> <button id="list" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button> <button id="tags-list" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u0435\u0433\u0438</button> <button id="summary" type="button">\u0421\u0432\u043E\u0434\u043A\u0430</button></p>
</section>
<section>
<h2>\u0421\u0440\u0430\u0432\u043D\u0438\u0442\u044C \u0434\u0432\u0435 \u0432\u0435\u0440\u0441\u0438\u0438</h2>
<label>\u0412\u0435\u0440\u0441\u0438\u044F A<br><input id="a" maxlength="120" /></label>
<label>\u0412\u0435\u0440\u0441\u0438\u044F B<br><input id="b" maxlength="120" /></label>
<p><button id="diff" type="button">\u0421\u0440\u0430\u0432\u043D\u0438\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u0438</button></p>
</section>
<section>
<h2>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043F\u043E \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0443 \u0432\u0435\u0440\u0441\u0438\u0438</h2>
<label>\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0432\u0435\u0440\u0441\u0438\u0438<br><input id="id" maxlength="120" /></label>
<p><button id="load" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E</button> <button id="delete" type="button">\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E</button></p>
</section>
<p id="status" role="status"></p>
<pre id="result"></pre>
<script>
(function () {
  'use strict';
  var NL = String.fromCharCode(10);
  var nameEl = document.getElementById('name');
  var parentEl = document.getElementById('parent');
  var tagsEl = document.getElementById('tags');
  var noteEl = document.getElementById('note');
  var compEl = document.getElementById('composition');
  var aEl = document.getElementById('a');
  var bEl = document.getElementById('b');
  var idEl = document.getElementById('id');
  var statusEl = document.getElementById('status');
  var resultEl = document.getElementById('result');
  function say(text) { statusEl.textContent = text || ''; }
  function show(value) { resultEl.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
  function request(path, init) {
    return fetch(path, {
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      ...(init || {})
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          var message = body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status;
          throw new Error(message);
        }
        return body;
      });
    });
  }
  document.getElementById('create').addEventListener('click', function () {
    if (!nameEl.value.trim()) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0432\u0435\u0440\u0441\u0438\u0438.'); return; }
    var raw = compEl.value.trim();
    if (!raw) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044E \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 JSON.'); return; }
    var composition;
    try { composition = JSON.parse(raw); } catch (err) { say('\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044F \u043D\u0435 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D\u0430 \u043A\u0430\u043A JSON: ' + err.message); return; }
    var payload = { name: nameEl.value.trim(), composition: composition };
    if (parentEl.value.trim()) payload.parent_id = parentEl.value.trim();
    if (noteEl.value) payload.note = noteEl.value;
    var tagList = tagsEl.value.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t; });
    if (tagList.length) payload.tags = tagList;
    say('\u0421\u043E\u0437\u0434\u0430\u044E \u0432\u0435\u0440\u0441\u0438\u044E\u2026');
    request('/api/tools/composition-version/versions', { method: 'POST', body: JSON.stringify(payload) })
      .then(function (body) { say('\u0412\u0435\u0440\u0441\u0438\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0430. \u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440: ' + body.version.id); show(body.version); })
      .catch(function (err) { say('\u0412\u0435\u0440\u0441\u0438\u044F \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430: ' + err.message); });
  });
  document.getElementById('list').addEventListener('click', function () {
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u043F\u0438\u0441\u043E\u043A \u0432\u0435\u0440\u0441\u0438\u0439\u2026');
    request('/api/tools/composition-version/versions')
      .then(function (body) {
        var items = body.items || [];
        if (!items.length) { say('\u0412\u0435\u0440\u0441\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.'); show(''); return; }
        show(items.map(function (v) { return v.id + ' \xB7 ' + v.name + (v.tags.length ? ' \xB7 ' + v.tags.join(',') : ''); }).join(NL));
        say('\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0432\u0435\u0440\u0441\u0438\u0439: ' + items.length);
      })
      .catch(function (err) { say('\u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ' + err.message); });
  });
  document.getElementById('tags-list').addEventListener('click', function () {
    say('\u0427\u0438\u0442\u0430\u044E \u0442\u0435\u0433\u0438\u2026');
    request('/api/tools/composition-version/tags')
      .then(function (body) { say('\u0422\u0435\u0433\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B.'); show((body.tags || []).join(NL)); })
      .catch(function (err) { say('\u0422\u0435\u0433\u0438 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B: ' + err.message); });
  });
  document.getElementById('summary').addEventListener('click', function () {
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u0432\u043E\u0434\u043A\u0443\u2026');
    request('/api/tools/composition-version/summary')
      .then(function (body) { say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430.'); show(body.summary); })
      .catch(function (err) { say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430: ' + err.message); });
  });
  document.getElementById('diff').addEventListener('click', function () {
    if (!aEl.value.trim() || !bEl.value.trim()) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u044B \u043E\u0431\u0435\u0438\u0445 \u0432\u0435\u0440\u0441\u0438\u0439 \u0434\u043B\u044F \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F.'); return; }
    say('\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E \u0432\u0435\u0440\u0441\u0438\u0438\u2026');
    request('/api/tools/composition-version/diff?a=' + encodeURIComponent(aEl.value.trim()) + '&b=' + encodeURIComponent(bEl.value.trim()))
      .then(function (body) { say('\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0433\u043E\u0442\u043E\u0432\u043E: ' + body.diff.summary); show(body.diff); })
      .catch(function (err) { say('\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: ' + err.message); });
  });
  function requireId(action) {
    if (!idEl.value.trim()) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0432\u0435\u0440\u0441\u0438\u0438 \u0434\u043B\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \xAB' + action + '\xBB.'); return ''; }
    return idEl.value.trim();
  }
  document.getElementById('load').addEventListener('click', function () {
    var id = requireId('\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E');
    if (!id) return;
    say('\u0427\u0438\u0442\u0430\u044E \u0432\u0435\u0440\u0441\u0438\u044E\u2026');
    request('/api/tools/composition-version/versions/' + encodeURIComponent(id))
      .then(function (body) { say('\u0412\u0435\u0440\u0441\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430.'); show(body.version); })
      .catch(function (err) { say('\u0412\u0435\u0440\u0441\u0438\u044F \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430: ' + err.message); });
  });
  document.getElementById('delete').addEventListener('click', function () {
    var id = requireId('\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E');
    if (!id) return;
    say('\u0423\u0434\u0430\u043B\u044F\u044E \u0432\u0435\u0440\u0441\u0438\u044E\u2026');
    request('/api/tools/composition-version/versions/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function () { say('\u0412\u0435\u0440\u0441\u0438\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0430: ' + id); show(''); })
      .catch(function (err) { say('\u0412\u0435\u0440\u0441\u0438\u044F \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0430: ' + err.message); });
  });
})();
</script>
</main></body></html>`;
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
