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
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0420\u0435\u0435\u0441\u0442\u0440 \u0441\u0446\u0435\u043D</title></head><body><h1>\u0420\u0435\u0435\u0441\u0442\u0440 \u0441\u0446\u0435\u043D</h1><p>\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 3D-\u0441\u0446\u0435\u043D: \u0434\u0432\u0438\u0436\u043E\u043A, \u043E\u0431\u044A\u0435\u043A\u0442\u044B, \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B.</p></body></html>`;
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
