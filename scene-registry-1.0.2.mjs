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

// modules/scene-registry/service.ts
var MAX_SCENES = 500;
var MAX_NAME = 160;
var MAX_NOTES = 4e3;
var MAX_META = 4e3;
var MAX_OBJECTS = 500;
var ENGINES = ["three", "blender", "other"];
function parseJson(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function positionOf(raw) {
  if (raw === void 0 || raw === null) return null;
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw new ValidationError("position \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C \u0438\u0437 \u0442\u0440\u0451\u0445 \u0447\u0438\u0441\u0435\u043B", { reason: "scene_position_invalid" });
  }
  const nums = raw.map((v) => Number(v));
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new ValidationError("position \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0447\u0438\u0441\u043B\u0430", { reason: "scene_position_invalid" });
  }
  const [x, y, z] = nums;
  return [x, y, z];
}
function normalizeObject(raw, index, materialExists) {
  const input = record(raw, `\u043E\u0431\u044A\u0435\u043A\u0442 ${index + 1}`);
  const name = text(input.name, `objects[${index}].name`, 160, true);
  const type = input.type === void 0 || input.type === null || input.type === "" ? null : text(input.type, `objects[${index}].type`, 80, true);
  const materialId = input.material_id === void 0 || input.material_id === null || input.material_id === "" ? null : text(input.material_id, `objects[${index}].material_id`, 120, true);
  if (materialId && materialExists && !materialExists(materialId)) {
    throw new ValidationError("\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0438\u043D\u0441\u043F\u0435\u043A\u0442\u043E\u0440\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432", {
      reason: "scene_material_not_found",
      index,
      material_id: materialId
    });
  }
  const assetId = input.asset_id === void 0 || input.asset_id === null || input.asset_id === "" ? null : text(input.asset_id, `objects[${index}].asset_id`, 120, true);
  return { name, type, material_id: materialId, asset_id: assetId, position: positionOf(input.position) };
}
function objectsOf(raw, materialExists) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError("objects \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C", { reason: "scene_objects_invalid" });
  if (raw.length > MAX_OBJECTS) throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432", { reason: "scene_too_many_objects", limit: MAX_OBJECTS });
  return raw.map((o, i) => normalizeObject(o, i, materialExists));
}
function engineOf(raw, fallback) {
  if (raw === void 0 || raw === null || raw === "") {
    if (fallback) return fallback;
    return "three";
  }
  const v = String(raw);
  if (!ENGINES.includes(v)) {
    throw new ValidationError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0434\u0432\u0438\u0436\u043E\u043A \u0441\u0446\u0435\u043D\u044B", { reason: "scene_engine_unknown", allowed: ENGINES });
  }
  return v;
}
function optionalId(raw, field) {
  if (raw === void 0 || raw === null || raw === "") return null;
  return text(raw, field, 120, true);
}
var SceneRegistryService = class {
  #db;
  #materialExists;
  constructor(options) {
    this.#db = options.db;
    this.#materialExists = options.materialExists;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM scene_registry_scenes").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM scene_registry_scenes ORDER BY updated_at DESC LIMIT ?").all(safe);
    return rows.map((r) => this.#toRecord(r));
  }
  #toRecord(row) {
    return {
      id: row.id,
      name: row.name,
      engine: row.engine,
      objects: parseJson(row.objects, []),
      notes: row.notes,
      three_d_studio_game_id: row.three_d_studio_game_id,
      composition_id: row.composition_id,
      metadata: parseJson(row.metadata, {}),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM scene_registry_scenes WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0421\u0446\u0435\u043D\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return this.#toRecord(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0441\u0446\u0435\u043D\u044B");
    const name = text(input.name, "name", MAX_NAME, true);
    const engine = engineOf(input.engine, null);
    const objects = objectsOf(input.objects, this.#materialExists);
    const notes = input.notes === void 0 || input.notes === null ? "" : text(input.notes, "notes", MAX_NOTES, false);
    const gameId = optionalId(input.three_d_studio_game_id, "three_d_studio_game_id");
    const compositionId = optionalId(input.composition_id, "composition_id");
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "scene_metadata_too_long" });
    if (this.#count() >= MAX_SCENES) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0441\u0446\u0435\u043D (500)", { reason: "scene_count_limit" });
    }
    const id = newId("scene");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO scene_registry_scenes (id, name, engine, objects, notes, three_d_studio_game_id, composition_id, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, engine, JSON.stringify(objects), notes, gameId, compositionId, metaStr, now, now);
    return { id, name, engine, objects, notes, three_d_studio_game_id: gameId, composition_id: compositionId, metadata, created_at: now, updated_at: now };
  }
  update(id, raw) {
    const existing = this.get(id);
    const input = record(raw, "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0446\u0435\u043D\u044B");
    const name = input.name === void 0 ? existing.name : text(input.name, "name", MAX_NAME, true);
    const engine = engineOf(input.engine, existing.engine);
    const objects = input.objects === void 0 ? existing.objects : objectsOf(input.objects, this.#materialExists);
    const notes = input.notes === void 0 ? existing.notes : text(input.notes, "notes", MAX_NOTES, false);
    const gameId = input.three_d_studio_game_id === void 0 ? existing.three_d_studio_game_id : optionalId(input.three_d_studio_game_id, "three_d_studio_game_id");
    const compositionId = input.composition_id === void 0 ? existing.composition_id : optionalId(input.composition_id, "composition_id");
    const metadata = input.metadata === void 0 ? existing.metadata : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "scene_metadata_too_long" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      UPDATE scene_registry_scenes SET name=?, engine=?, objects=?, notes=?, three_d_studio_game_id=?, composition_id=?, metadata=?, updated_at=? WHERE id=?
    `).run(name, engine, JSON.stringify(objects), notes, gameId, compositionId, metaStr, now, id);
    return { id, name, engine, objects, notes, three_d_studio_game_id: gameId, composition_id: compositionId, metadata, created_at: existing.created_at, updated_at: now };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM scene_registry_scenes WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0421\u0446\u0435\u043D\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    this.#db.raw.prepare("DELETE FROM scene_registry_scenes WHERE id = ?").run(id);
    return { removed: true, id };
  }
  exportJson(scene) {
    return JSON.stringify(scene, null, 2);
  }
  import(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new ValidationError("\u0418\u043C\u043F\u043E\u0440\u0442 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 JSON-\u043E\u0431\u044A\u0435\u043A\u0442 \u0441\u0446\u0435\u043D\u044B", { reason: "scene_import_invalid" });
    }
    return this.create(raw);
  }
  summary() {
    return { scenes: this.#count(), limit: MAX_SCENES, engines: [...ENGINES] };
  }
};

// modules/scene-registry/schema.ts
var sceneRegistryMigrations = [
  {
    version: "scene-registry/1_scenes",
    sql: `
      CREATE TABLE scene_registry_scenes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        engine TEXT NOT NULL,
        objects TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        three_d_studio_game_id TEXT,
        composition_id TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_scene_registry_created ON scene_registry_scenes (created_at);
      CREATE INDEX idx_scene_registry_name ON scene_registry_scenes (name);
      CREATE INDEX idx_scene_registry_engine ON scene_registry_scenes (engine);
    `
  }
];

// modules/scene-registry/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "scene_registry_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0420\u0435\u0435\u0441\u0442\u0440 \u0441\u0446\u0435\u043D</title></head><body><main>
<h1>\u0420\u0435\u0435\u0441\u0442\u0440 \u0441\u0446\u0435\u043D</h1>
<p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0435\u0441\u0442\u0440 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 3D-\u0441\u0446\u0435\u043D: \u0434\u043E 500 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u2014 \u0434\u0432\u0438\u0436\u043E\u043A (three, blender, other), \u043E\u0431\u044A\u0435\u043A\u0442\u044B \u0441\u043E \u0441\u0441\u044B\u043B\u043A\u0430\u043C\u0438 \u043D\u0430 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438\u043D\u0441\u043F\u0435\u043A\u0442\u043E\u0440\u0430 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432, \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u043A \u0438\u0433\u0440\u0435 three-d-studio \u0438 \u0432\u0435\u0440\u0441\u0438\u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u0438, \u0437\u0430\u043C\u0435\u0442\u043A\u0438, \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u0438 \u0438\u043C\u043F\u043E\u0440\u0442 JSON. \u0411\u0435\u0437 \u0441\u0435\u0442\u0438 \u0438 \u043A\u043B\u044E\u0447\u0435\u0439.</p>
<p>\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u0446\u0435\u043D\u044B. \u041E\u0431\u044A\u0435\u043A\u0442\u044B \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F JSON-\u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 <code>[{"name":"Hero","type":"mesh","material_id":"mat-1"}]</code>; \u0441\u0441\u044B\u043B\u043A\u0430 <code>material_id</code> \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043F\u043E \u0438\u043D\u0441\u043F\u0435\u043A\u0442\u043E\u0440\u0443 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432. \u0418\u043C\u043F\u043E\u0440\u0442 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 JSON-\u043E\u0431\u044A\u0435\u043A\u0442 \u0441\u0446\u0435\u043D\u044B, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0439 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u043E\u043C.</p>
<section>
<h2>\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0446\u0435\u043D\u0443</h2>
<label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u0446\u0435\u043D\u044B<br><input id="name" maxlength="160" /></label>
<label>\u0414\u0432\u0438\u0436\u043E\u043A<br><select id="engine"><option value="three">three</option><option value="blender">blender</option><option value="other">other</option></select></label>
<label>\u041E\u0431\u044A\u0435\u043A\u0442\u044B (JSON-\u043C\u0430\u0441\u0441\u0438\u0432, \u043C\u043E\u0436\u043D\u043E \u043F\u0443\u0441\u0442\u043E)<br><textarea id="objects" rows="6" cols="60"></textarea></label>
<label>\u0417\u0430\u043C\u0435\u0442\u043A\u0438<br><textarea id="notes" rows="3" cols="60"></textarea></label>
<p><button id="create" type="button">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0446\u0435\u043D\u0443</button> <button id="list" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button> <button id="summary" type="button">\u0421\u0432\u043E\u0434\u043A\u0430</button></p>
</section>
<section>
<h2>\u0418\u043C\u043F\u043E\u0440\u0442 \u0441\u0446\u0435\u043D\u044B \u0438\u0437 JSON</h2>
<label>JSON-\u043E\u0431\u044A\u0435\u043A\u0442 \u0441\u0446\u0435\u043D\u044B<br><textarea id="import" rows="6" cols="60"></textarea></label>
<p><button id="do-import" type="button">\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0446\u0435\u043D\u0443</button></p>
</section>
<section>
<h2>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043F\u043E \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0443 \u0441\u0446\u0435\u043D\u044B</h2>
<label>\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0446\u0435\u043D\u044B<br><input id="id" maxlength="120" /></label>
<p><button id="load" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0446\u0435\u043D\u0443</button> <button id="export" type="button">\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C JSON</button> <button id="delete" type="button">\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0446\u0435\u043D\u0443</button></p>
</section>
<p id="status" role="status"></p>
<pre id="result"></pre>
<script>
(function () {
  'use strict';
  var NL = String.fromCharCode(10);
  var nameEl = document.getElementById('name');
  var engineEl = document.getElementById('engine');
  var objectsEl = document.getElementById('objects');
  var notesEl = document.getElementById('notes');
  var importEl = document.getElementById('import');
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
  function parseObjects() {
    var raw = objectsEl.value.trim();
    if (!raw) return undefined;
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('\xAB\u041E\u0431\u044A\u0435\u043A\u0442\u044B\xBB \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C JSON-\u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C.');
    return parsed;
  }
  document.getElementById('create').addEventListener('click', function () {
    if (!nameEl.value.trim()) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u0446\u0435\u043D\u044B.'); return; }
    var objects;
    try { objects = parseObjects(); } catch (err) { say('\u041E\u0431\u044A\u0435\u043A\u0442\u044B \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D\u044B \u043D\u0435\u0432\u0435\u0440\u043D\u043E: ' + err.message); return; }
    var payload = { name: nameEl.value.trim(), engine: engineEl.value };
    if (objects !== undefined) payload.objects = objects;
    if (notesEl.value) payload.notes = notesEl.value;
    say('\u0421\u043E\u0437\u0434\u0430\u044E \u0441\u0446\u0435\u043D\u0443\u2026');
    request('/api/tools/scene-registry/scenes', { method: 'POST', body: JSON.stringify(payload) })
      .then(function (body) { say('\u0421\u0446\u0435\u043D\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430. \u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440: ' + body.scene.id); show(body.scene); })
      .catch(function (err) { say('\u0421\u0446\u0435\u043D\u0430 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430: ' + err.message); });
  });
  document.getElementById('do-import').addEventListener('click', function () {
    var raw = importEl.value.trim();
    if (!raw) { say('\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 JSON-\u043E\u0431\u044A\u0435\u043A\u0442 \u0441\u0446\u0435\u043D\u044B \u0434\u043B\u044F \u0438\u043C\u043F\u043E\u0440\u0442\u0430.'); return; }
    var parsed;
    try { parsed = JSON.parse(raw); } catch (err) { say('\u0418\u043C\u043F\u043E\u0440\u0442: JSON \u043D\u0435 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D \u2014 ' + err.message); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { say('\u0418\u043C\u043F\u043E\u0440\u0442 \u043E\u0436\u0438\u0434\u0430\u0435\u0442 JSON-\u043E\u0431\u044A\u0435\u043A\u0442 \u0441\u0446\u0435\u043D\u044B.'); return; }
    say('\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u044E \u0441\u0446\u0435\u043D\u0443\u2026');
    request('/api/tools/scene-registry/import', { method: 'POST', body: raw })
      .then(function (body) { say('\u0421\u0446\u0435\u043D\u0430 \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0430. \u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440: ' + body.scene.id); show(body.scene); })
      .catch(function (err) { say('\u0418\u043C\u043F\u043E\u0440\u0442 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D: ' + err.message); });
  });
  document.getElementById('list').addEventListener('click', function () {
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0446\u0435\u043D\u2026');
    request('/api/tools/scene-registry/scenes')
      .then(function (body) {
        var items = body.items || [];
        if (!items.length) { say('\u0421\u0446\u0435\u043D \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.'); show(''); return; }
        show(items.map(function (s) { return s.id + ' \xB7 ' + s.name + ' \xB7 ' + s.engine + ' \xB7 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432: ' + s.objects.length; }).join(NL));
        say('\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u0446\u0435\u043D: ' + items.length);
      })
      .catch(function (err) { say('\u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ' + err.message); });
  });
  document.getElementById('summary').addEventListener('click', function () {
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u0432\u043E\u0434\u043A\u0443\u2026');
    request('/api/tools/scene-registry/summary')
      .then(function (body) { say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430.'); show(body.summary); })
      .catch(function (err) { say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430: ' + err.message); });
  });
  function requireId(action) {
    if (!idEl.value.trim()) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0446\u0435\u043D\u044B \u0434\u043B\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \xAB' + action + '\xBB.'); return ''; }
    return idEl.value.trim();
  }
  document.getElementById('load').addEventListener('click', function () {
    var id = requireId('\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0446\u0435\u043D\u0443');
    if (!id) return;
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u0446\u0435\u043D\u0443\u2026');
    request('/api/tools/scene-registry/scenes/' + encodeURIComponent(id))
      .then(function (body) { say('\u0421\u0446\u0435\u043D\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430.'); show(body.scene); })
      .catch(function (err) { say('\u0421\u0446\u0435\u043D\u0430 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430: ' + err.message); });
  });
  document.getElementById('export').addEventListener('click', function () {
    var id = requireId('\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C JSON');
    if (!id) return;
    say('\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u044E \u0441\u0446\u0435\u043D\u0443\u2026');
    request('/api/tools/scene-registry/scenes/' + encodeURIComponent(id) + '/export')
      .then(function (body) { say('\u0421\u0446\u0435\u043D\u0430 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0430.'); show(body); })
      .catch(function (err) { say('\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D: ' + err.message); });
  });
  document.getElementById('delete').addEventListener('click', function () {
    var id = requireId('\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0446\u0435\u043D\u0443');
    if (!id) return;
    say('\u0423\u0434\u0430\u043B\u044F\u044E \u0441\u0446\u0435\u043D\u0443\u2026');
    request('/api/tools/scene-registry/scenes/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function () { say('\u0421\u0446\u0435\u043D\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0430: ' + id); show(''); })
      .catch(function (err) { say('\u0421\u0446\u0435\u043D\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0430: ' + err.message); });
  });
})();
</script>
</main></body></html>`;
var module = {
  id: "scene-registry",
  apiVersion: 1,
  migrations: sceneRegistryMigrations,
  register(ctx) {
    let materialExists;
    try {
      const materials = ctx.require("material-inspector");
      materialExists = (id) => {
        try {
          materials.get(id);
          return true;
        } catch {
          return false;
        }
      };
    } catch {
      materialExists = void 0;
    }
    const svc = new SceneRegistryService({ db: ctx.storage, materialExists });
    ctx.publish?.(svc);
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/scene-registry/scenes", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/scene-registry/scenes/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, scene: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/scene-registry/scenes", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, scene: result } };
    });
    ctx.api.add("PATCH", "/api/tools/scene-registry/scenes/:id", (request) => {
      const result = svc.update(request.params.id, bodyOf(request.body));
      return { status: 200, headers: NO_STORE, body: { ok: true, scene: result } };
    });
    ctx.api.add("DELETE", "/api/tools/scene-registry/scenes/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/scene-registry/scenes/:id/export", (request) => {
      const scene = svc.get(request.params.id);
      return { status: 200, headers: { ...NO_STORE, "content-type": "application/json; charset=utf-8" }, raw: svc.exportJson(scene) };
    });
    ctx.api.add("POST", "/api/tools/scene-registry/import", (request) => {
      const result = svc.import(request.body);
      return { status: 201, headers: NO_STORE, body: { ok: true, scene: result } };
    });
    ctx.api.add("GET", "/api/tools/scene-registry/summary", () => ({
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
