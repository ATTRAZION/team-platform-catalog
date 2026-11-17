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

// modules/material-inspector/service.ts
var MAX_MATERIALS = 1e3;
var MAX_NAME = 120;
var MAX_META = 4e3;
var ALPHA_MODES = ["opaque", "mask", "blend"];
var HEX_RE = /^#[0-9a-fA-F]{6}$/;
function parseJson(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function materialOf(raw, base) {
  const input = record(raw, "\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B");
  const out = { ...base };
  if (input.base_color !== void 0) {
    const v = String(input.base_color);
    if (!HEX_RE.test(v)) throw new ValidationError("base_color \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C #RRGGBB", { reason: "material_color_invalid", field: "base_color" });
    out.base_color = v.toLowerCase();
  }
  if (input.emissive_color !== void 0) {
    const v = String(input.emissive_color);
    if (!HEX_RE.test(v)) throw new ValidationError("emissive_color \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C #RRGGBB", { reason: "material_color_invalid", field: "emissive_color" });
    out.emissive_color = v.toLowerCase();
  }
  const num = (field, min, max) => {
    if (input[field] === void 0) return;
    const v = Number(input[field]);
    if (!Number.isFinite(v) || v < min || v > max) {
      throw new ValidationError(`${field} \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0442 ${min} \u0434\u043E ${max}`, { reason: "material_range_invalid", field });
    }
    out[field] = v;
  };
  num("metallic", 0, 1);
  num("roughness", 0, 1);
  num("opacity", 0, 1);
  num("emissive_strength", 0, 100);
  num("ior", 1, 3);
  if (input.alpha_mode !== void 0) {
    const v = String(input.alpha_mode);
    if (!ALPHA_MODES.includes(v)) {
      throw new ValidationError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 alpha_mode", { reason: "material_alpha_unknown", allowed: ALPHA_MODES });
    }
    out.alpha_mode = v;
  }
  if (input.double_sided !== void 0) out.double_sided = Boolean(input.double_sided);
  for (const field of ["albedo_asset_id", "normal_asset_id", "metallic_roughness_asset_id", "occlusion_asset_id"]) {
    if (input[field] === void 0) continue;
    const v = input[field];
    out[field] = v === null || v === "" ? null : text(v, field, 120, true);
  }
  return out;
}
var DEFAULTS = {
  base_color: "#ffffff",
  metallic: 0,
  roughness: 1,
  emissive_color: "#000000",
  emissive_strength: 0,
  opacity: 1,
  ior: 1.5,
  alpha_mode: "opaque",
  double_sided: false,
  albedo_asset_id: null,
  normal_asset_id: null,
  metallic_roughness_asset_id: null,
  occlusion_asset_id: null
};
var MaterialInspectorService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM material_inspector_materials").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM material_inspector_materials ORDER BY updated_at DESC LIMIT ?").all(safe);
    return rows.map((r) => this.#toRecord(r));
  }
  #toRecord(row) {
    return {
      id: row.id,
      name: row.name,
      material: parseJson(row.material, { ...DEFAULTS }),
      metadata: parseJson(row.metadata, {}),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM material_inspector_materials WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return this.#toRecord(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430");
    const name = text(input.name, "name", MAX_NAME, true);
    const material = materialOf(input.material ?? {}, { ...DEFAULTS });
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "material_metadata_too_long" });
    if (this.#count() >= MAX_MATERIALS) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 (1000)", { reason: "material_count_limit" });
    }
    const id = newId("mat");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO material_inspector_materials (id, name, material, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, JSON.stringify(material), metaStr, now, now);
    return { id, name, material, metadata, created_at: now, updated_at: now };
  }
  update(id, raw) {
    const existing = this.get(id);
    const input = record(raw, "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430");
    const name = input.name === void 0 ? existing.name : text(input.name, "name", MAX_NAME, true);
    const material = input.material === void 0 ? existing.material : materialOf(input.material, existing.material);
    const metadata = input.metadata === void 0 ? existing.metadata : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "material_metadata_too_long" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      UPDATE material_inspector_materials SET name = ?, material = ?, metadata = ?, updated_at = ? WHERE id = ?
    `).run(name, JSON.stringify(material), metaStr, now, id);
    return { id, name, material, metadata, created_at: existing.created_at, updated_at: now };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM material_inspector_materials WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    this.#db.raw.prepare("DELETE FROM material_inspector_materials WHERE id = ?").run(id);
    return { removed: true, id };
  }
  exportJson(record2) {
    return JSON.stringify(record2, null, 2);
  }
  summary() {
    return { materials: this.#count(), limit: MAX_MATERIALS, alpha_modes: [...ALPHA_MODES] };
  }
};

// modules/material-inspector/schema.ts
var materialInspectorMigrations = [
  {
    version: "material-inspector/1_materials",
    sql: `
      CREATE TABLE material_inspector_materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        material TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_matinsp_created ON material_inspector_materials (created_at);
      CREATE INDEX idx_matinsp_name ON material_inspector_materials (name);
    `
  }
];

// modules/material-inspector/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "material_inspector_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0418\u043D\u0441\u043F\u0435\u043A\u0442\u043E\u0440 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432</title></head><body><h1>\u0418\u043D\u0441\u043F\u0435\u043A\u0442\u043E\u0440 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432</h1><p>PBR-\u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0438 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u0442\u0435\u043A\u0441\u0442\u0443\u0440.</p></body></html>`;
var module = {
  id: "material-inspector",
  apiVersion: 1,
  migrations: materialInspectorMigrations,
  register(ctx) {
    const svc = new MaterialInspectorService({ db: ctx.storage });
    ctx.publish?.(svc);
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/material-inspector/materials", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/material-inspector/materials/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, material: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/material-inspector/materials", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, material: result } };
    });
    ctx.api.add("PATCH", "/api/tools/material-inspector/materials/:id", (request) => {
      const result = svc.update(request.params.id, bodyOf(request.body));
      return { status: 200, headers: NO_STORE, body: { ok: true, material: result } };
    });
    ctx.api.add("DELETE", "/api/tools/material-inspector/materials/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/material-inspector/materials/:id/export", (request) => {
      const material = svc.get(request.params.id);
      return { status: 200, headers: { ...NO_STORE, "content-type": "application/json; charset=utf-8" }, raw: svc.exportJson(material) };
    });
    ctx.api.add("GET", "/api/tools/material-inspector/summary", () => ({
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
