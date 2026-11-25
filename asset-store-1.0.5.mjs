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

// modules/asset-store/service.ts
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
function toFile(row, glb = null, audio = null, license = null) {
  return {
    id: row.id,
    name: row.name,
    mime: row.mime,
    size: Number(row.size),
    sha256: row.sha256,
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at,
    glb,
    audio,
    license
  };
}
var AssetStoreService = class {
  #db;
  #dataDir;
  #glbInfo;
  #audioInfo;
  #licenseInfo;
  constructor(options) {
    this.#db = options.db;
    this.#dataDir = options.dataDir;
    this.#glbInfo = options.glbInfo ?? null;
    this.#audioInfo = options.audioInfo ?? null;
    this.#licenseInfo = options.licenseInfo ?? null;
    mkdirSync(this.#dataDir, { recursive: true });
  }
  #parseGlb(buffer) {
    const service = this.#glbInfo;
    if (!service) return null;
    const fn = typeof service === "function" ? service : service.parse ?? service.parseGlb ?? service.inspect ?? service.inspectBuffer ?? service.read ?? null;
    if (typeof fn !== "function") return null;
    try {
      const result = fn(buffer);
      if (result && typeof result === "object" && "glb" in result) {
        return result.glb ?? null;
      }
      return result ?? null;
    } catch {
      return null;
    }
  }
  #resolveLicense(sha256) {
    const service = this.#licenseInfo;
    if (!service) return null;
    const fn = typeof service === "function" ? service : service.findBySha256 ?? service.find ?? null;
    if (typeof fn !== "function") return null;
    try {
      const found = fn(sha256);
      const records = Array.isArray(found) ? found : found ? [found] : [];
      if (records.length === 1) return records[0];
      if (records.length > 1) return { ambiguous: true, candidates: records };
      return null;
    } catch {
      return null;
    }
  }
  #parseAudio(buffer) {
    const service = this.#audioInfo;
    if (!service) return null;
    const fn = typeof service === "function" ? service : service.parse ?? service.parseAudio ?? service.inspect ?? service.inspectBuffer ?? service.read ?? null;
    if (typeof fn !== "function") return null;
    try {
      const result = fn(buffer);
      if (result && typeof result === "object" && "audio" in result) {
        return result.audio ?? null;
      }
      return result ?? null;
    } catch {
      return null;
    }
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
    return rows.map((row) => {
      let glb = null;
      let audio = null;
      try {
        const buf = readFileSync(join(this.#dataDir, row.storage_path));
        glb = this.#parseGlb(buf);
        audio = this.#parseAudio(buf);
      } catch {
        glb = null;
        audio = null;
      }
      return toFile(row, glb, audio, this.#resolveLicense(row.sha256));
    });
  }
  /** Лёгкие метаданные ассета из БД, без чтения содержимого с диска. */
  getMetadata(id) {
    const row = this.#db.raw.prepare("SELECT * FROM asset_store_files WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return toFile(row, null, null, this.#resolveLicense(row.sha256));
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM asset_store_files WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    const file = toFile(row);
    let content = "";
    let buf = null;
    try {
      buf = readFileSync(join(this.#dataDir, row.storage_path));
      content = buf.toString("base64");
    } catch {
      throw new NotFoundError("\u0424\u0430\u0439\u043B \u043D\u0430 \u0434\u0438\u0441\u043A\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    }
    const glb = buf ? this.#parseGlb(buf) : null;
    const audio = buf ? this.#parseAudio(buf) : null;
    const license = this.#resolveLicense(row.sha256);
    return { ...file, content_base64: content, glb, audio, license };
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
    const glb = this.#parseGlb(buf);
    const audio = this.#parseAudio(buf);
    const license = this.#resolveLicense(sha256);
    return {
      id,
      name,
      mime,
      size: buf.length,
      sha256,
      metadata,
      created_at: now,
      glb,
      audio,
      license
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
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0444\u0430\u0439\u043B\u043E\u0432</title></head><body><main>
<h1>\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0444\u0430\u0439\u043B\u043E\u0432 \u043F\u0440\u043E\u0435\u043A\u0442\u0430</h1>
<p>\u0424\u0430\u0439\u043B \u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C \u0438 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u043E\u0439: \u043E\u0434\u0438\u043D \u0444\u0430\u0439\u043B
\u0434\u043E 1 \u041C\u0438\u0411, \u0432\u0441\u0435\u0433\u043E \u0434\u043E 200 \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 64 \u041C\u0438\u0411. \u0414\u043B\u044F \u0444\u0430\u0439\u043B\u0430 \u0438\u0449\u0435\u0442\u0441\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u043F\u043E
\u0435\u0433\u043E \u0441\u0443\u043C\u043C\u0435, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0430\u0431\u043E\u0440\u0430 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \xAB\u043C\u043E\u0436\u043D\u043E \u043B\u0438 \u043E\u0442\u0434\u0430\u0432\u0430\u0442\u044C\xBB, \u0430 \u043D\u0435
\u043D\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044E \u043D\u0430\u0443\u0433\u0430\u0434.</p>
<section>
<h2>\u0421\u0432\u043E\u0434\u043A\u0430</h2>
<p id="summary" role="status">\u0421\u0432\u043E\u0434\u043A\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u0430.</p>
</section>
<section>
<h2>\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u0430\u0439\u043B\u0430</h2>
<p><label for="file">\u0424\u0430\u0439\u043B</label>
<input id="file" type="file"></p>
<p><button id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button>
<button id="upload" data-required="file">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B</button>
<button id="shipcheck">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u043D\u0430\u0431\u043E\u0440\u0430</button></p>
<p id="status" role="status"></p>
</section>
<section>
<h2>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439</h2>
<div id="ship-out"><p class="hint">\u041D\u0430\u0431\u043E\u0440 \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u043B\u0441\u044F: \u043E\u043D \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043F\u043E \u0442\u0435\u043C \u0444\u0430\u0439\u043B\u0430\u043C, \u0447\u0442\u043E \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0435\u043D\u044B \u043D\u0438\u0436\u0435.</p></div>
</section>
<section>
<h2>\u0424\u0430\u0439\u043B\u044B \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430</h2>
<ul id="items"><li class="hint">\u0421\u043F\u0438\u0441\u043E\u043A \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D.</li></ul>
</section>
</main><script>
var BLOCKER_RU = { unknown_license: '\u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043D\u0435 \u0438\u0437 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430', non_commercial: '\u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0432 \u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u043C \u043F\u0440\u043E\u0435\u043A\u0442\u0435', share_alike: '\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u043D\u043E\u0435 \u043E\u0431\u044F\u0437\u0430\u043D\u043E \u043E\u0441\u0442\u0430\u0442\u044C\u0441\u044F \u043F\u043E\u0434 \u0442\u043E\u0439 \u0436\u0435 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0435\u0439', no_derivatives: '\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u043D\u044B\u0435 \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u044B', license_missing: '\u0434\u043B\u044F \u0444\u0430\u0439\u043B\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0438 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438', no_records: '\u0432 \u0440\u0435\u0435\u0441\u0442\u0440\u0435 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438', ambiguous_license: '\u0434\u043B\u044F \u0444\u0430\u0439\u043B\u0430 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438' };
var loadedIds = [];
function say(message) { document.getElementById('status').textContent = message; }
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}
function reset(id) {
  var box = document.getElementById(id);
  while (box.firstChild) box.removeChild(box.firstChild);
  return box;
}
async function api(method, path, payload) {
  var init = { method: method, headers: { 'content-type': 'application/json' } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  var response = await fetch('/api/tools/asset-store/' + path, init);
  var data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data && data.error && data.error.message ? data.error.message : '\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043A\u043E\u0434\u043E\u043C ' + response.status + '.');
  return data;
}
function humanBytes(value) {
  var bytes = Number(value) || 0;
  if (bytes >= 1048576) return (Math.round(bytes / 1048.576) / 1000).toFixed(2) + ' \u041C\u0438\u0411';
  if (bytes >= 1024) return (Math.round(bytes / 10.24) / 100).toFixed(2) + ' \u041A\u0438\u0411';
  return bytes + ' \u0411';
}
function readBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result).split(',')[1] || ''); };
    reader.onerror = function () { reject(new Error('\u0424\u0430\u0439\u043B \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D: \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043E\u0442\u0434\u0430\u043B \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435.')); };
    reader.readAsDataURL(file);
  });
}
function licenseNote(file) {
  var record = file.license;
  if (!record) return '\u0437\u0430\u043F\u0438\u0441\u0438 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u043D\u0435\u0442';
  if (record.ambiguous) return '\u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E: ' + ((record.candidates || []).length);
  return '\u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F ' + (record.license || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430') + ', \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0430 ' + (record.fixed_at || '\u0431\u0435\u0437 \u0434\u0430\u0442\u044B');
}
function showFiles(items) {
  var list = reset('items');
  loadedIds = items.map(function (file) { return file.id; });
  if (!items.length) {
    list.appendChild(el('li', 'hint', '\u0424\u0430\u0439\u043B\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0432\u044B\u0448\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B\xBB: \u043E\u043D \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0432 \u044D\u0442\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435 \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C \u0438 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u043E\u0439.'));
    return;
  }
  items.forEach(function (file) {
    var line = el('li');
    line.appendChild(el('strong', null, String(file.name)));
    line.appendChild(el('span', 'hint', ' \xB7 ' + humanBytes(file.size) + ' \xB7 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D ' + String(file.created_at).replace('T', ' ').slice(0, 16) + ' \xB7 ' + file.id));
    line.appendChild(el('div', 'hint', '\u0421\u0443\u043C\u043C\u0430: ' + String(file.sha256).slice(0, 24) + ' \xB7 ' + licenseNote(file)));
    list.appendChild(line);
  });
}
async function load() {
  say('\u0427\u0438\u0442\u0430\u044E \u0441\u0432\u043E\u0434\u043A\u0443 \u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432\u2026');
  try {
    var report = await api('GET', 'summary');
    var page = await api('GET', 'files');
    document.getElementById('summary').textContent = '\u0424\u0430\u0439\u043B\u043E\u0432: ' + report.summary.files + ' \u0438\u0437 ' + report.summary.limit_files + ' \xB7 \u0437\u0430\u043D\u044F\u0442\u043E ' + humanBytes(report.summary.bytes) + ' \u0438\u0437 ' + humanBytes(report.summary.limit_bytes) + ' \xB7 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0445: ' + page.items.length + '.';
    showFiles(page.items);
    say('\u0421\u043F\u0438\u0441\u043E\u043A \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D: \u0444\u0430\u0439\u043B\u043E\u0432 ' + report.summary.files + '.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
}
function showShip(data) {
  var box = reset('ship-out');
  box.appendChild(el('p', null, '\u041D\u0430\u0431\u043E\u0440 \u043E\u0442\u0434\u0430\u0432\u0430\u0442\u044C: ' + (data.shippable ? '\u043C\u043E\u0436\u043D\u043E' : '\u043D\u0435\u043B\u044C\u0437\u044F') + ' \xB7 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u0444\u0430\u0439\u043B\u043E\u0432: ' + data.checked + ' \xB7 \u043F\u0440\u0438\u0447\u0438\u043D \u043E\u0442\u043A\u0430\u0437\u0430: ' + data.blockers.length + '.'));
  if (data.blockers.length) {
    var list = el('ul');
    data.blockers.forEach(function (blocker) {
      var note = BLOCKER_RU[blocker.reason] || blocker.reason;
      if (blocker.license) note += ' \xB7 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F ' + blocker.license;
      if (blocker.asset_id) note += ' \xB7 \u0444\u0430\u0439\u043B ' + blocker.asset_id;
      list.appendChild(el('li', null, note));
    });
    box.appendChild(list);
  }
  var needed = (data.attribution_required || []).map(function (item) { return item.license; }).filter(Boolean);
  if (needed.length) box.appendChild(el('p', 'hint', '\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0443\u043A\u0430\u0437\u0430\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u0440\u0430: ' + needed.join(', ') + '.'));
}
document.getElementById('refresh').onclick = load;
document.getElementById('upload').onclick = async function () {
  var input = document.getElementById('file');
  var file = input.files && input.files.length ? input.files[0] : null;
  if (!file) { say('\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B: \u043A\u043D\u043E\u043F\u043A\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043F\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u0444\u0430\u0439\u043B\u0443.'); return; }
  if (file.size > 1048576) { say('\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 1 \u041C\u0438\u0411: \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0444\u0430\u0439\u043B\u044B \u043D\u0435 \u043A\u0440\u0443\u043F\u043D\u0435\u0435 1 \u041C\u0438\u0411.'); return; }
  say('\u0427\u0438\u0442\u0430\u044E \u0444\u0430\u0439\u043B \u0438 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E \u0435\u0433\u043E \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435\u2026');
  try {
    var content = await readBase64(file);
    var data = await api('POST', 'upload', { name: String(file.name).slice(0, 200), mime: file.type || 'application/octet-stream', content_base64: content });
    say('\u0424\u0430\u0439\u043B \xAB' + data.file.name + '\xBB \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ' + humanBytes(data.file.size) + ', \u0441\u0443\u043C\u043C\u0430 ' + String(data.file.sha256).slice(0, 12) + '.');
    input.value = '';
    await load();
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
document.getElementById('shipcheck').onclick = async function () {
  if (!loadedIds.length) { say('\u0424\u0430\u0439\u043B\u043E\u0432 \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043D\u0435\u0442: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0442\u044C \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u043D\u0435\u0447\u0435\u0433\u043E. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0432\u044B\u0448\u0435 \u2014 \u0438 \u043D\u0430\u0431\u043E\u0440 \u0441\u0442\u0430\u043D\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C\u044B\u043C.'); return; }
  say('\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 ' + loadedIds.length + ' \u0444\u0430\u0439\u043B\u043E\u0432\u2026');
  try {
    var data = await api('POST', 'ship-check', { asset_ids: loadedIds });
    showShip(data);
    say(data.shippable ? '\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u0430: \u043F\u0440\u0438\u0447\u0438\u043D \u043E\u0442\u043A\u0430\u0437\u0430 \u043D\u0435\u0442.' : '\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u0430: \u043F\u0440\u0438\u0447\u0438\u043D ' + data.blockers.length + '.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
load();
</script></body></html>`;

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
    let glbInfo = null;
    try {
      glbInfo = ctx.require("glb-info");
    } catch {
      glbInfo = null;
    }
    let audioInfo = null;
    try {
      audioInfo = ctx.require("audio-info");
    } catch {
      audioInfo = null;
    }
    let licenseInfo = null;
    try {
      licenseInfo = ctx.require("asset-license");
    } catch {
      licenseInfo = null;
    }
    const store = new AssetStoreService({ db: ctx.storage, dataDir: ctx.paths.data, glbInfo, audioInfo, licenseInfo });
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
    ctx.api.add("POST", "/api/tools/asset-store/ship-check", (request) => {
      const body = bodyOf(request.body);
      if (!Array.isArray(body.asset_ids)) {
        throw new ValidationError("asset_ids \u2014 \u043C\u0430\u0441\u0441\u0438\u0432 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u043E\u0432 \u0430\u0441\u0441\u0435\u0442\u043E\u0432", { received: typeof body.asset_ids }, {
          code: "asset_store_asset_ids_invalid"
        });
      }
      if (body.asset_ids.length > 200) {
        throw new ValidationError("\u0411\u043E\u043B\u044C\u0448\u0435 200 \u0430\u0441\u0441\u0435\u0442\u043E\u0432 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F", { limit: 200 }, {
          code: "asset_store_asset_ids_too_many"
        });
      }
      const files = body.asset_ids.map((id) => store.getMetadata(String(id)));
      const result = ctx.require("asset-license").shipCheck({
        assets: files.map((file) => ({ asset_id: file.id, sha256: file.sha256 }))
      });
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          ...result,
          assets: result.assets.map((asset) => ({
            ...asset,
            name: files.find((file) => file.id === asset.asset_id)?.name ?? null
          }))
        }
      };
    });
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
