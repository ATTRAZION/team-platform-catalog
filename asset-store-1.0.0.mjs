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

// modules/asset-store/service.ts
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

// modules/asset-store/service.ts
var MAX_FILE_BYTES = 1 * 1024 * 1024;
var MAX_TOTAL_BYTES = 64 * 1024 * 1024;
var MAX_FILES = 200;
var MAX_NAME = 200;
var MAX_META = 4e3;
function parseMetadata(raw) {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
  }
  return {};
}
function toFile(row) {
  return {
    id: row.id,
    name: row.name,
    mime: row.mime,
    size: Number(row.size),
    sha256: row.sha256,
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at
  };
}
var AssetStoreService = class {
  #db;
  #dataDir;
  constructor(options) {
    this.#db = options.db;
    this.#dataDir = options.dataDir;
    mkdirSync(this.#dataDir, { recursive: true });
  }
  #totalBytes() {
    const row = this.#db.raw.prepare("SELECT COALESCE(SUM(size),0) AS s FROM asset_store_files").get();
    return Number(row?.s ?? 0);
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM asset_store_files").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 50) {
    const safe = Math.min(Math.max(limit, 1), 200);
    const rows = this.#db.raw.prepare("SELECT * FROM asset_store_files ORDER BY created_at DESC LIMIT ?").all(safe);
    return rows.map(toFile);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM asset_store_files WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    const file = toFile(row);
    let content = "";
    try {
      content = readFileSync(join(this.#dataDir, row.storage_path)).toString("base64");
    } catch {
      throw new NotFoundError("\u0424\u0430\u0439\u043B \u043D\u0430 \u0434\u0438\u0441\u043A\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    }
    return { ...file, content_base64: content };
  }
  upload(raw) {
    const input = record(raw, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u0430\u0439\u043B\u0430");
    const name = text(input.name, "name", MAX_NAME, true);
    const mime = text(input.mime, "mime", 120, true);
    const contentBase64 = text(input.content_base64, "content_base64", 2 * 1024 * 1024, true);
    let buf;
    try {
      buf = Buffer.from(contentBase64, "base64");
    } catch {
      throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 base64", { reason: "asset_base64_invalid" });
    }
    if (buf.toString("base64").replace(/=+$/, "") !== contentBase64.replace(/=+$/, "")) {
      throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 base64", { reason: "asset_base64_invalid" });
    }
    if (buf.length === 0) throw new ValidationError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B", { reason: "asset_empty" });
    if (buf.length > MAX_FILE_BYTES) {
      throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 1 \u041C\u0438\u0411", { reason: "asset_too_large", size: buf.length, limit: MAX_FILE_BYTES });
    }
    if (this.#count() >= MAX_FILES) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 (200)", { reason: "asset_count_limit" });
    }
    if (this.#totalBytes() + buf.length > MAX_TOTAL_BYTES) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 (64 \u041C\u0438\u0411)", { reason: "asset_storage_limit" });
    }
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) {
      throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "asset_metadata_too_long" });
    }
    const id = newId("asset");
    const storagePath = `${id}.bin`;
    const sha256 = createHash("sha256").update(buf).digest("hex");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    writeFileSync(join(this.#dataDir, storagePath), buf);
    try {
      this.#db.raw.prepare(`
        INSERT INTO asset_store_files (id, name, mime, size, sha256, storage_path, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, mime, buf.length, sha256, storagePath, metaStr, now);
    } catch (e) {
      try {
        unlinkSync(join(this.#dataDir, storagePath));
      } catch {
      }
      throw e;
    }
    return {
      id,
      name,
      mime,
      size: buf.length,
      sha256,
      metadata,
      created_at: now
    };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT storage_path FROM asset_store_files WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    this.#db.raw.prepare("DELETE FROM asset_store_files WHERE id = ?").run(id);
    try {
      unlinkSync(join(this.#dataDir, row.storage_path));
    } catch {
    }
    return { removed: true, id };
  }
  summary() {
    return {
      files: this.#count(),
      bytes: this.#totalBytes(),
      limit_files: MAX_FILES,
      limit_bytes: MAX_TOTAL_BYTES
    };
  }
  verify() {
    const rows = this.#db.raw.prepare("SELECT id, sha256, storage_path FROM asset_store_files").all();
    const mismatches = [];
    for (const row of rows) {
      try {
        const buf = readFileSync(join(this.#dataDir, row.storage_path));
        const actual = createHash("sha256").update(buf).digest("hex");
        if (actual !== row.sha256) mismatches.push({ id: row.id, expected: row.sha256, actual });
      } catch {
        mismatches.push({ id: row.id, expected: row.sha256, actual: "missing" });
      }
    }
    return { ok: mismatches.length === 0, checked: rows.length, mismatches };
  }
};

// modules/asset-store/schema.ts
var assetStoreMigrations = [
  {
    version: "asset-store/1_files",
    sql: `
      CREATE TABLE asset_store_files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_asset_store_files_created ON asset_store_files (created_at);
      CREATE INDEX idx_asset_store_files_name ON asset_store_files (name);
    `
  }
];

// modules/asset-store/page.ts
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><title>\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0444\u0430\u0439\u043B\u043E\u0432</title></head>
<body><h1>\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0444\u0430\u0439\u043B\u043E\u0432</h1><p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0431\u0438\u043D\u0430\u0440\u043D\u044B\u0445 \u0444\u0430\u0439\u043B\u043E\u0432 \u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u043E\u0439 \u0446\u0435\u043B\u043E\u0441\u0442\u043D\u043E\u0441\u0442\u0438.</p></body>
</html>`;

// modules/asset-store/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "asset_store_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var module = {
  id: "asset-store",
  apiVersion: 1,
  migrations: assetStoreMigrations,
  register(ctx) {
    const store = new AssetStoreService({ db: ctx.storage, dataDir: ctx.paths.data });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/asset-store/files", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: store.list(Number(request.query.get("limit") ?? 50)) }
    }));
    ctx.api.add("GET", "/api/tools/asset-store/files/:id", (request) => {
      const file = store.get(request.params.id);
      return { headers: NO_STORE, body: { ok: true, file } };
    });
    ctx.api.add("POST", "/api/tools/asset-store/upload", (request) => {
      const result = store.upload(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, file: result } };
    });
    ctx.api.add("DELETE", "/api/tools/asset-store/files/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...store.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/asset-store/summary", () => ({
      headers: NO_STORE,
      body: { ok: true, summary: store.summary() }
    }));
    ctx.api.add("GET", "/api/tools/asset-store/verify", () => ({
      headers: NO_STORE,
      body: { ok: true, report: store.verify() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
