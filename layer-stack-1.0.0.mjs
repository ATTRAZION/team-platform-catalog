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

// modules/layer-stack/service.ts
var MAX_STACKS = 500;
var MAX_LAYERS = 64;
var MAX_NAME = 120;
var MAX_META = 4e3;
var BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"];
function parseLayers(raw) {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v;
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
function toStack(row) {
  return {
    id: row.id,
    name: row.name,
    layers: parseLayers(row.layers),
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function normalizeLayer(raw, index) {
  const input = record(raw, `\u0441\u043B\u043E\u0439 ${index + 1}`);
  const name = text(input.name ?? `\u0421\u043B\u043E\u0439 ${index + 1}`, "name", 120, true);
  const assetId = input.asset_id === void 0 || input.asset_id === null || input.asset_id === "" ? null : text(input.asset_id, "asset_id", 120, true);
  const opacityRaw = input.opacity === void 0 ? 1 : Number(input.opacity);
  if (!Number.isFinite(opacityRaw) || opacityRaw < 0 || opacityRaw > 1) {
    throw new ValidationError("opacity \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0442 0 \u0434\u043E 1", { reason: "layer_opacity_invalid", index });
  }
  const blendRaw = input.blend === void 0 ? "normal" : String(input.blend);
  if (!BLEND_MODES.includes(blendRaw)) {
    throw new ValidationError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u043D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u044F", { reason: "layer_blend_unknown", index, allowed: BLEND_MODES });
  }
  return {
    id: String(input.id ?? newId("layer")),
    name,
    asset_id: assetId,
    opacity: opacityRaw,
    blend: blendRaw,
    visible: input.visible === void 0 ? true : Boolean(input.visible),
    locked: input.locked === void 0 ? false : Boolean(input.locked)
  };
}
var LayerStackService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM layer_stacks").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM layer_stacks ORDER BY updated_at DESC LIMIT ?").all(safe);
    return rows.map(toStack);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM layer_stacks WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0421\u0442\u0435\u043A \u0441\u043B\u043E\u0451\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return toStack(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u0430 \u0441\u043B\u043E\u0451\u0432");
    const name = text(input.name, "name", MAX_NAME, true);
    const layersRaw = input.layers;
    if (!Array.isArray(layersRaw)) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043C\u0430\u0441\u0441\u0438\u0432 layers", { reason: "stack_layers_required" });
    }
    if (layersRaw.length > MAX_LAYERS) {
      throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0441\u043B\u043E\u0451\u0432", { reason: "stack_too_many_layers", limit: MAX_LAYERS });
    }
    const layers = layersRaw.map((l, i) => normalizeLayer(l, i));
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) {
      throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "stack_metadata_too_long" });
    }
    if (this.#count() >= MAX_STACKS) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0441\u0442\u0435\u043A\u043E\u0432 (500)", { reason: "stack_count_limit" });
    }
    const id = newId("stack");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO layer_stacks (id, name, layers, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, JSON.stringify(layers), metaStr, now, now);
    return { id, name, layers, metadata, created_at: now, updated_at: now };
  }
  update(id, raw) {
    const existing = this.get(id);
    const input = record(raw, "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u0430 \u0441\u043B\u043E\u0451\u0432");
    const name = input.name === void 0 ? existing.name : text(input.name, "name", MAX_NAME, true);
    let layers = existing.layers;
    if (input.layers !== void 0) {
      if (!Array.isArray(input.layers)) {
        throw new ValidationError("layers \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C", { reason: "stack_layers_invalid" });
      }
      if (input.layers.length > MAX_LAYERS) {
        throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0441\u043B\u043E\u0451\u0432", { reason: "stack_too_many_layers", limit: MAX_LAYERS });
      }
      layers = input.layers.map((l, i) => normalizeLayer(l, i));
    }
    const metadata = input.metadata === void 0 ? existing.metadata : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) {
      throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "stack_metadata_too_long" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      UPDATE layer_stacks SET name = ?, layers = ?, metadata = ?, updated_at = ? WHERE id = ?
    `).run(name, JSON.stringify(layers), metaStr, now, id);
    return { id, name, layers, metadata, created_at: existing.created_at, updated_at: now };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM layer_stacks WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0421\u0442\u0435\u043A \u0441\u043B\u043E\u0451\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    this.#db.raw.prepare("DELETE FROM layer_stacks WHERE id = ?").run(id);
    return { removed: true, id };
  }
  exportJson(stack) {
    return JSON.stringify(stack, null, 2);
  }
  summary() {
    return { stacks: this.#count(), limit: MAX_STACKS, blend_modes: [...BLEND_MODES] };
  }
};

// modules/layer-stack/schema.ts
var layerStackMigrations = [
  {
    version: "layer-stack/1_stacks",
    sql: `
      CREATE TABLE layer_stacks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        layers TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_layer_stacks_created ON layer_stacks (created_at);
      CREATE INDEX idx_layer_stacks_name ON layer_stacks (name);
    `
  }
];

// modules/layer-stack/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "layer_stack_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0421\u0442\u0435\u043A\u0438 \u0441\u043B\u043E\u0451\u0432</title></head><body><h1>\u0421\u0442\u0435\u043A\u0438 \u0441\u043B\u043E\u0451\u0432</h1><p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u043E\u0432 \u0441\u043B\u043E\u0451\u0432 \u0441 \u0440\u0435\u0436\u0438\u043C\u0430\u043C\u0438 \u043D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u044F.</p></body></html>`;
var module = {
  id: "layer-stack",
  apiVersion: 1,
  migrations: layerStackMigrations,
  register(ctx) {
    const svc = new LayerStackService({ db: ctx.storage });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/layer-stack/stacks", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/layer-stack/stacks/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, stack: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/layer-stack/stacks", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, stack: result } };
    });
    ctx.api.add("PATCH", "/api/tools/layer-stack/stacks/:id", (request) => {
      const result = svc.update(request.params.id, bodyOf(request.body));
      return { status: 200, headers: NO_STORE, body: { ok: true, stack: result } };
    });
    ctx.api.add("DELETE", "/api/tools/layer-stack/stacks/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/layer-stack/stacks/:id/export", (request) => {
      const stack = svc.get(request.params.id);
      const format = (request.query.get("format") ?? "json").toLowerCase();
      if (format === "json") {
        return { status: 200, headers: { ...NO_STORE, "content-type": "application/json; charset=utf-8" }, raw: svc.exportJson(stack) };
      }
      return { status: 200, headers: NO_STORE, body: { ok: true, stack, format } };
    });
    ctx.api.add("GET", "/api/tools/layer-stack/summary", () => ({
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
