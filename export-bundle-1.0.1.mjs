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

// modules/export-bundle/service.ts
import { createHash } from "node:crypto";

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

// modules/export-bundle/service.ts
var MAX_BUNDLES = 500;
var MAX_NAME = 120;
var MAX_META = 4e3;
var MAX_ITEMS = 200;
var MAX_PAYLOAD = 5e5;
function parseItems(raw) {
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
function canonical(items) {
  return JSON.stringify(items, Object.keys(items).sort());
}
function checksumOf(items) {
  return createHash("sha256").update(canonical(items)).digest("hex");
}
function normalizeItem(raw, index) {
  const input = record(raw, `\u044D\u043B\u0435\u043C\u0435\u043D\u0442 ${index + 1}`);
  const kind = text(input.kind, "kind", 60, true);
  const id = input.id === void 0 || input.id === null || input.id === "" ? void 0 : text(input.id, "id", 120, true);
  if (input.data === void 0) {
    throw new ValidationError("\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 data", { reason: "bundle_item_data_required", index });
  }
  return { kind, id, data: input.data };
}
var ExportBundleService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM export_bundles").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM export_bundles ORDER BY created_at DESC LIMIT ?").all(safe);
    return rows.map((r) => this.#toBundle(r));
  }
  #toBundle(row) {
    const items = parseItems(row.items);
    const kinds = [...new Set(items.map((i) => i.kind))];
    return {
      id: row.id,
      name: row.name,
      items,
      checksum: row.checksum,
      metadata: parseMetadata(row.metadata),
      created_at: row.created_at,
      manifest: { version: "1.0.0", item_count: items.length, kinds, created_at: row.created_at }
    };
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM export_bundles WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0411\u0430\u043D\u0434\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return this.#toBundle(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0431\u0430\u043D\u0434\u043B\u0430");
    const name = text(input.name, "name", MAX_NAME, true);
    if (!Array.isArray(input.items)) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043C\u0430\u0441\u0441\u0438\u0432 items", { reason: "bundle_items_required" });
    }
    if (input.items.length === 0) {
      throw new ValidationError("\u0411\u0430\u043D\u0434\u043B \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C", { reason: "bundle_empty" });
    }
    if (input.items.length > MAX_ITEMS) {
      throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432", { reason: "bundle_too_many_items", limit: MAX_ITEMS });
    }
    const items = input.items.map((it, i) => normalizeItem(it, i));
    const payloadStr = JSON.stringify(items);
    if (payloadStr.length > MAX_PAYLOAD) {
      throw new ValidationError("\u0411\u0430\u043D\u0434\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439", { reason: "bundle_too_large", limit: MAX_PAYLOAD });
    }
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "bundle_metadata_too_long" });
    if (this.#count() >= MAX_BUNDLES) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0431\u0430\u043D\u0434\u043B\u043E\u0432 (500)", { reason: "bundle_count_limit" });
    }
    const checksum = checksumOf(items);
    const id = newId("bundle");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO export_bundles (id, name, items, checksum, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, payloadStr, checksum, metaStr, now);
    return this.get(id);
  }
  verify(id) {
    const bundle = this.get(id);
    const computed = checksumOf(bundle.items);
    return { ok: computed === bundle.checksum, stored: bundle.checksum, computed };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM export_bundles WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0411\u0430\u043D\u0434\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    this.#db.raw.prepare("DELETE FROM export_bundles WHERE id = ?").run(id);
    return { removed: true, id };
  }
  summary() {
    return { bundles: this.#count(), limit: MAX_BUNDLES };
  }
};

// modules/export-bundle/schema.ts
var exportBundleMigrations = [
  {
    version: "export-bundle/1_bundles",
    sql: `
      CREATE TABLE export_bundles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        items TEXT NOT NULL,
        checksum TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_export_bundle_created ON export_bundles (created_at);
      CREATE INDEX idx_export_bundle_name ON export_bundles (name);
    `
  }
];

// modules/export-bundle/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "export_bundle_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u042D\u043A\u0441\u043F\u043E\u0440\u0442-\u0431\u0430\u043D\u0434\u043B\u044B</title></head><body><h1>\u042D\u043A\u0441\u043F\u043E\u0440\u0442-\u0431\u0430\u043D\u0434\u043B\u044B</h1><p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u0431\u0430\u043D\u0434\u043B\u044B \u0441 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u043E\u0439.</p></body></html>`;
var module = {
  id: "export-bundle",
  apiVersion: 1,
  migrations: exportBundleMigrations,
  register(ctx) {
    const svc = new ExportBundleService({ db: ctx.storage });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/export-bundle/bundles", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/export-bundle/bundles/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, bundle: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/export-bundle/bundles", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, bundle: result } };
    });
    ctx.api.add("DELETE", "/api/tools/export-bundle/bundles/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/export-bundle/bundles/:id/verify", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, verification: svc.verify(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/export-bundle/summary", () => ({
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
