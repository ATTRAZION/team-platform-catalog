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

// modules/profile-fork/service.ts
import { createHash } from "node:crypto";
import {
  closeSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";

// src/kernel/validate.ts
function integer(raw, field, min, max, fallback) {
  if (raw === void 0 || raw === null) return fallback;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}

// modules/profile-fork/service.ts
var PROFILE_FORK_VERSION = 1;
var PROFILE_FORK_DIR_PREFIX = "team-profile-fork-";
var PROFILE_FORK_ID_PATTERN = /^team-profile-fork-[A-Za-z0-9]{6,}$/;
var PROFILE_FORK_DEFAULT_TTL_MS = 12 * 60 * 60 * 1e3;
var PROFILE_FORK_DEFAULT_MAX = 5;
var PROFILE_FORK_EXCLUDED = [
  "backups",
  "browser-profile",
  "secrets",
  "integrations.json",
  "adapters"
];
var TRANSIENT_NAMES = [".module-mutation.lock", ".profile-users"];
var MAX_LABEL_LENGTH = 80;
function forkError(code, message, status, details = {}) {
  return new AppError(code, message, status, details);
}
function timeOf(value) {
  return value.getTime();
}
function hashFile(path) {
  const hash = createHash("sha256");
  const handle = openSync(path, "r");
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    for (; ; ) {
      const read = readSync(handle, buffer, 0, buffer.length, null);
      if (read <= 0) break;
      hash.update(buffer.subarray(0, read));
    }
  } finally {
    closeSync(handle);
  }
  return hash.digest("hex");
}
function measure(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      let info;
      try {
        info = lstatSync(path);
      } catch {
        continue;
      }
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) {
        walk(path);
        continue;
      }
      if (!info.isFile()) continue;
      files += 1;
      bytes += info.size;
    }
  };
  walk(dir);
  return { files, bytes };
}
function comparable(value) {
  const resolved = resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function samePath(left, right) {
  return comparable(left) === comparable(right);
}
function quoteIdentifier(name) {
  return `"${name.replaceAll('"', '""')}"`;
}
function plainRow(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = value instanceof Uint8Array ? `<blob ${value.byteLength} B>` : value;
  }
  return result;
}
var ProfileForkService = class {
  #dataDir;
  #registryDir;
  #backup;
  #tmpRoot;
  #ttlMs;
  #maxForks;
  #now;
  #log;
  constructor(options) {
    this.#dataDir = resolve(options.dataDir);
    this.#registryDir = resolve(options.registryDir);
    this.#backup = options.backup;
    this.#tmpRoot = resolve(options.tmpRoot ?? process.env.TEAM_PROFILE_FORK_ROOT ?? tmpdir());
    this.#ttlMs = Math.max(1e3, options.ttlMs ?? PROFILE_FORK_DEFAULT_TTL_MS);
    this.#maxForks = Math.max(1, options.maxForks ?? PROFILE_FORK_DEFAULT_MAX);
    this.#now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.#log = options.log;
  }
  get root() {
    return this.#tmpRoot;
  }
  list() {
    const forks = this.#records();
    const active = forks.filter((fork) => !this.#expired(fork)).length;
    return {
      fork_version: PROFILE_FORK_VERSION,
      forks,
      limits: { ttl_ms: this.#ttlMs, max_forks: this.#maxForks, active }
    };
  }
  get(rawId) {
    const id = this.#id(rawId);
    const record = this.#records().find((fork) => fork.id === id);
    if (!record) throw forkError("profile_fork_not_found", `\u0424\u043E\u0440\u043A \xAB${id}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`, 404, { id });
    return record;
  }
  /**
   * Копия живого профиля. Снимок базы идёт первым: без него копия каталога
   * данных бесполезна. Любая ошибка убирает недоделанный каталог, чтобы форк
   * не выглядел рабочим.
   */
  async create(input = {}) {
    const label = this.#label(input.label);
    this.#assertProfile();
    const records = this.#records();
    const active = records.filter((fork) => !this.#expired(fork));
    if (active.length >= this.#maxForks) {
      throw forkError(
        "profile_fork_limit",
        `\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043F\u0440\u0435\u0434\u0435\u043B \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u0444\u043E\u0440\u043A\u043E\u0432 (${this.#maxForks}); \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u043D\u0435\u043D\u0443\u0436\u043D\u044B\u0435`,
        409,
        { limit: this.#maxForks, active: active.map((fork) => fork.id) }
      );
    }
    mkdirSync(this.#tmpRoot, { recursive: true });
    const dir = mkdtempSync(join(this.#tmpRoot, PROFILE_FORK_DIR_PREFIX));
    const id = basename(dir);
    const dbPath = join(dir, "platform.db");
    const dataDir = join(dir, "data");
    try {
      try {
        await this.#backup(dbPath);
      } catch {
        throw forkError("profile_fork_unavailable", "\u0421\u043D\u0438\u043C\u043E\u043A \u0431\u0430\u0437\u044B \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D", 503, {
          reason: "snapshot_failed"
        });
      }
      const inspected = this.#measureDb(dbPath);
      if (inspected.verdict !== "ok") {
        throw forkError("profile_fork_integrity", "\u0421\u043D\u0438\u043C\u043E\u043A \u0431\u0430\u0437\u044B \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0446\u0435\u043B\u043E\u0441\u0442\u043D\u043E\u0441\u0442\u0438", 500, {
          reason: "integrity_check",
          verdict: inspected.verdict.slice(0, 120)
        });
      }
      let skipped;
      try {
        skipped = this.#copyData(dataDir);
      } catch {
        throw forkError("profile_fork_unavailable", "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u043D\u0435 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D", 503, {
          reason: "data_copy_failed",
          copied: "\u0447\u0430\u0441\u0442\u0438\u0447\u043D\u043E"
        });
      }
      const copied = measure(dataDir);
      const createdAt = this.#now();
      const created = timeOf(createdAt);
      const record = {
        fork_version: PROFILE_FORK_VERSION,
        id,
        label,
        created_at: new Date(created).toISOString(),
        expires_at: new Date(created + this.#ttlMs).toISOString(),
        dir,
        db_path: dbPath,
        data_dir: dataDir,
        db_bytes: inspected.db_bytes,
        db_sha256: inspected.db_sha256,
        tables: inspected.tables,
        integrity: "ok",
        data_files: copied.files,
        bytes: inspected.db_bytes + copied.bytes,
        skipped: [...skipped].sort(),
        limitations: [
          "\u043A\u043E\u043F\u0438\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430 \u0434\u0430\u043D\u043D\u044B\u0445: secrets, integrations.json, adapters, backups \u0438 browser-profile \u043D\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044F\u0442\u0441\u044F",
          "\u0432\u043D\u0435\u0448\u043D\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u043E\u0434\u0443\u043B\u0435\u0439 (TEAM_MODULES_DIR \u0432\u043D\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F) \u043D\u0435 \u043A\u043E\u043F\u0438\u0440\u0443\u0435\u0442\u0441\u044F",
          "\u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438 \u0441 \u043A\u043B\u044E\u0447\u0430\u043C\u0438 \u0432 \u0444\u043E\u0440\u043A\u0435 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B: \u0441\u0435\u043A\u0440\u0435\u0442\u044B \u0432 \u043A\u043E\u043F\u0438\u044E \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0430\u044E\u0442"
        ],
        run: {
          env: {
            TEAM_PLATFORM_DATA_DIR: dataDir,
            TEAM_PLATFORM_DB: dbPath,
            TEAM_MODULES_DIR: join(dataDir, "modules")
          },
          note: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u044D\u043A\u0437\u0435\u043C\u043F\u043B\u044F\u0440 \u043D\u0430 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u043C \u043F\u043E\u0440\u0442\u0443; \u0432\u043E\u0437\u0432\u0440\u0430\u0442 \u2014 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0435\u0433\u043E \u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u043E\u0440\u043A"
        }
      };
      writeFileSync(join(dir, "fork.json"), `${JSON.stringify(record, null, 2)}
`);
      this.#save([record, ...records.filter((fork) => fork.id !== id)]);
      this.#log.info("\u0424\u043E\u0440\u043A \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D", { id, db_bytes: record.db_bytes, data_files: record.data_files });
      return record;
    } catch (error) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
      throw error;
    }
  }
  /**
   * Возврат: каталог форка удаляется целиком. Удаляется только каталог с нашим
   * префиксом внутри корня форков; запись реестра, ведущая наружу, — отказ.
   */
  discard(rawId) {
    const id = this.#id(rawId);
    const records = this.#records();
    const record = records.find((fork) => fork.id === id);
    if (!record) throw forkError("profile_fork_not_found", `\u0424\u043E\u0440\u043A \xAB${id}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`, 404, { id });
    this.#assertOwned(record);
    const present = existsSync(record.dir);
    const measured = present ? measure(record.dir) : { files: 0, bytes: 0 };
    rmSync(record.dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    this.#save(records.filter((fork) => fork.id !== id));
    this.#log.info("\u0424\u043E\u0440\u043A \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0443\u0434\u0430\u043B\u0451\u043D", { id, present, bytes: measured.bytes });
    return {
      discarded: { id, present, files: measured.files, bytes: measured.bytes },
      remaining: records.length - 1
    };
  }
  /**
   * Стражи перед стартом эксперимента на копии: форк известен, запись ведёт
   * внутрь корня форков, это не настоящий профиль и копия цела. Любое
   * сомнение — отказ: экземпляр, поднятый на чужом или битом каталоге,
   * записывал бы в настоящие данные или падал посреди эксперимента.
   */
  planRun(rawId) {
    const { id, record, dir, dbPath, dataDir, inspected } = this.#verified(rawId);
    const warnings = [];
    if (this.#expired(record)) warnings.push("\u0441\u0440\u043E\u043A \u0444\u043E\u0440\u043A\u0430 \u0438\u0441\u0442\u0451\u043A: \u043A\u043E\u043F\u0438\u044E \u0443\u0434\u0430\u043B\u0438\u0442 purge, \u044D\u043A\u0441\u043F\u0435\u0440\u0438\u043C\u0435\u043D\u0442 \u0432\u0441\u0451 \u0435\u0449\u0451 \u0447\u0438\u0442\u0430\u0435\u0442 \u0435\u0451");
    if (!existsSync(join(dir, "fork.json"))) warnings.push("fork.json \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442: \u0444\u043E\u0440\u043A \u043D\u0430\u0439\u0434\u0435\u043D \u043F\u043E \u0440\u0435\u0435\u0441\u0442\u0440\u0443 \u0438\u043B\u0438 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044E");
    if (!existsSync(dataDir)) warnings.push("\u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0434\u0430\u043D\u043D\u044B\u0445 \u043A\u043E\u043F\u0438\u0438 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442: \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0431\u0430\u0437\u0430");
    return {
      fork_version: PROFILE_FORK_VERSION,
      id,
      dir,
      db_path: dbPath,
      data_dir: dataDir,
      env: {
        TEAM_PLATFORM_DATA_DIR: dataDir,
        TEAM_PLATFORM_DB: dbPath,
        TEAM_MODULES_DIR: join(dataDir, "modules"),
        TEAM_PROFILE_FORK_ROOT: this.#tmpRoot
      },
      warnings,
      checked: {
        integrity: "ok",
        db_bytes: inspected.db_bytes,
        db_sha256: inspected.db_sha256,
        tables: inspected.tables,
        data_files: measure(dataDir).files
      }
    };
  }
  /**
   * Общие стражи копии: форк известен, каталог принадлежит корню форков, запись
   * не ведёт в настоящий профиль и база цела. Один путь для плана запуска и
   * для чтения — иначе читатель доверял бы записи реестра, которую не сверяли.
   */
  #verified(rawId) {
    const id = this.#id(rawId);
    const record = this.#records().find((fork) => fork.id === id);
    if (!record) throw forkError("profile_fork_not_found", `\u0424\u043E\u0440\u043A \xAB${id}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`, 404, { id });
    const dir = resolve(record.dir);
    const dbPath = join(dir, "platform.db");
    const dataDir = join(dir, "data");
    if (this.#leadsToProfile([dir, record.db_path, record.data_dir])) {
      throw forkError("profile_fork_source_denied", "\u0417\u0430\u043F\u0438\u0441\u044C \u0444\u043E\u0440\u043A\u0430 \u0432\u0435\u0434\u0451\u0442 \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F", 409, {
        id,
        reason: "profile_is_source"
      });
    }
    this.#assertOwned(record);
    if (typeof record.db_path !== "string" || typeof record.data_dir !== "string" || !samePath(record.db_path, dbPath) || !samePath(record.data_dir, dataDir)) {
      throw forkError("profile_fork_mismatch", `\u0417\u0430\u043F\u0438\u0441\u044C \u0444\u043E\u0440\u043A\u0430 \xAB${id}\xBB \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043D\u0435 \u043D\u0430 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043A\u043E\u043F\u0438\u0438`, 409, {
        id,
        reason: "registry_paths"
      });
    }
    const inspected = this.#measureDb(dbPath);
    if (inspected.verdict !== "ok") {
      throw forkError("profile_fork_corrupt", "\u041A\u043E\u043F\u0438\u044F \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0446\u0435\u043B\u043E\u0441\u0442\u043D\u043E\u0441\u0442\u0438", 409, {
        id,
        reason: "integrity_check",
        verdict: inspected.verdict.slice(0, 120)
      });
    }
    if (typeof record.db_sha256 === "string" && record.db_sha256 && inspected.db_sha256 !== record.db_sha256) {
      throw forkError("profile_fork_corrupt", "\u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u043A\u043E\u043F\u0438\u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F", 409, {
        id,
        reason: "sha256",
        expected: record.db_sha256,
        actual: inspected.db_sha256
      });
    }
    return { id, record, dir, dbPath, dataDir, inspected };
  }
  /**
   * Чтение копии: таблицы и строки одной таблицы через соединение только на
   * чтение. Любая запись упирается в SQLite, а не в дисциплину вызывающего.
   */
  read(rawId, input = {}) {
    const { id, dbPath } = this.#verified(rawId);
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const before = hashFile(dbPath);
      const names = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      ).all().map((row) => String(row.name));
      const tables = names.map((name) => ({
        name,
        rows: Number(db.prepare(`SELECT count(*) AS n FROM ${quoteIdentifier(name)}`).get().n)
      }));
      const limit = integer(input.limit, "limit", 1, 200, 20);
      let table = null;
      let rows = [];
      let truncated = false;
      if (input.table !== void 0 && input.table !== null && input.table !== "") {
        const requested = typeof input.table === "string" ? input.table.trim() : "";
        table = tables.find((item) => item.name === requested)?.name ?? null;
        if (!table) {
          throw forkError("profile_fork_table_unknown", "\u0422\u0430\u043A\u043E\u0439 \u0442\u0430\u0431\u043B\u0438\u0446\u044B \u0432 \u043A\u043E\u043F\u0438\u0438 \u043D\u0435\u0442", 400, {
            table: requested.slice(0, 64),
            available: tables.map((item) => item.name).slice(0, 50)
          });
        }
        const found = db.prepare(`SELECT * FROM ${quoteIdentifier(table)} LIMIT ?`).all(limit + 1);
        truncated = found.length > limit;
        rows = found.slice(0, limit).map(plainRow);
      }
      const after = hashFile(dbPath);
      return {
        fork_version: PROFILE_FORK_VERSION,
        id,
        read_only: true,
        db_path: dbPath,
        db_sha256: before,
        sha256_after: after,
        unchanged: before === after,
        tables,
        table,
        limit,
        truncated,
        rows
      };
    } finally {
      db.close();
    }
  }
  purge() {
    const purged = [];
    const kept = [];
    const failed = [];
    for (const fork of this.#records()) {
      if (!this.#expired(fork)) {
        kept.push(fork.id);
        continue;
      }
      try {
        const result = this.discard(fork.id);
        purged.push({ id: fork.id, bytes: result.discarded.bytes });
      } catch (error) {
        failed.push({ id: fork.id, code: error instanceof AppError ? error.code : "profile_fork_discard_failed" });
      }
    }
    return { purged, kept, failed };
  }
  #expired(fork) {
    const expires = Date.parse(fork.expires_at);
    return Number.isFinite(expires) && timeOf(this.#now()) >= expires;
  }
  #id(raw) {
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!PROFILE_FORK_ID_PATTERN.test(value)) {
      throw forkError("profile_fork_id_invalid", "\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0444\u043E\u0440\u043A\u0430 \u043D\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0435\u043D", 400, {
        id: value.slice(0, 64),
        pattern: PROFILE_FORK_ID_PATTERN.source
      });
    }
    return value;
  }
  #label(raw) {
    if (raw === void 0 || raw === null) return null;
    if (typeof raw !== "string") {
      throw forkError("profile_fork_label_invalid", "\u041F\u043E\u043C\u0435\u0442\u043A\u0430 \u0444\u043E\u0440\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439", 400, {
        reason: "not_a_string"
      });
    }
    const value = raw.trim();
    if (!value) return null;
    if (value.length > MAX_LABEL_LENGTH || /[\u0000-\u001f\u007f]/.test(value)) {
      throw forkError("profile_fork_label_invalid", `\u041F\u043E\u043C\u0435\u0442\u043A\u0430 \u0444\u043E\u0440\u043A\u0430: \u0434\u043E ${MAX_LABEL_LENGTH} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0431\u0435\u0437 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0445`, 400, {
        reason: "length_or_control_characters",
        max: MAX_LABEL_LENGTH
      });
    }
    return value;
  }
  #assertProfile() {
    let isDirectory = false;
    try {
      isDirectory = existsSync(this.#dataDir) && statSync(this.#dataDir).isDirectory();
    } catch {
      isDirectory = false;
    }
    if (!isDirectory) {
      throw forkError("profile_fork_unavailable", "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D", 503, {
        reason: "data_dir_missing"
      });
    }
  }
  /**
   * Путь указывает на сам профиль, на его базу или на его родителя: писать
   * туда нельзя. Копия внутри профиля (например `<профиль>/.forks`) — это
   * отдельный каталог и допустима: `#assertOwned` всё равно требует, чтобы он
   * лежал прямо в корне форков.
   */
  #leadsToProfile(paths) {
    const root = comparable(this.#dataDir);
    const db = comparable(join(this.#dataDir, "platform.db"));
    return paths.some((path) => {
      if (typeof path !== "string" || !path.trim()) return false;
      const candidate = comparable(resolve(path));
      return candidate === root || candidate === db || root.startsWith(`${candidate}${sep}`);
    });
  }
  #measureDb(dbPath) {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const check = db.prepare("PRAGMA integrity_check").get();
      const verdict = check ? String(Object.values(check)[0] ?? "").trim().toLowerCase() : "";
      const tables = Number(
        db.prepare(
          "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        ).get().n
      );
      return { tables, db_bytes: statSync(dbPath).size, db_sha256: hashFile(dbPath), verdict };
    } finally {
      db.close();
    }
  }
  #assertOwned(record) {
    const dir = resolve(record.dir);
    if (!PROFILE_FORK_ID_PATTERN.test(record.id) || basename(dir) !== record.id || !samePath(dirname(dir), this.#tmpRoot)) {
      throw forkError("profile_fork_mismatch", `\u0417\u0430\u043F\u0438\u0441\u044C \u0444\u043E\u0440\u043A\u0430 \xAB${record.id}\xBB \u0432\u0435\u0434\u0451\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u043A\u043E\u0440\u043D\u044F \u0444\u043E\u0440\u043A\u043E\u0432`, 409, {
        id: record.id,
        reason: "dir_outside_root"
      });
    }
    if (!existsSync(dir)) return;
    const info = lstatSync(dir);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw forkError("profile_fork_mismatch", `\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0444\u043E\u0440\u043A\u0430 \xAB${record.id}\xBB \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u043E\u043C`, 409, {
        id: record.id,
        reason: "not_a_directory"
      });
    }
  }
  #copyData(targetDir) {
    mkdirSync(targetDir, { recursive: true });
    const skipped = [];
    const excluded = PROFILE_FORK_EXCLUDED.map((name) => name.toLowerCase());
    for (const entry of readdirSync(this.#dataDir, { withFileTypes: true })) {
      const name = entry.name;
      const lower = name.toLowerCase();
      if (excluded.includes(lower) || lower.startsWith("platform.db") || TRANSIENT_NAMES.includes(name)) {
        skipped.push(name);
        continue;
      }
      const from = join(this.#dataDir, name);
      const source = comparable(resolve(from));
      const forkRoot = comparable(resolve(this.#tmpRoot));
      if (forkRoot === source || forkRoot.startsWith(source + sep)) {
        skipped.push(name);
        continue;
      }
      cpSync(from, join(targetDir, name), {
        recursive: true,
        force: true,
        filter: (source2) => {
          try {
            return !lstatSync(source2).isSymbolicLink();
          } catch {
            return false;
          }
        }
      });
    }
    return skipped;
  }
  #registryPath() {
    return join(this.#registryDir, "forks.json");
  }
  /** Реестр читается терпимо: битый файл не должен ронять выдачу. */
  #read() {
    try {
      const parsed = JSON.parse(readFileSync(this.#registryPath(), "utf8"));
      if (!Array.isArray(parsed.forks)) return [];
      return parsed.forks.filter((item) => {
        if (typeof item !== "object" || item === null) return false;
        const candidate = item;
        return typeof candidate.id === "string" && PROFILE_FORK_ID_PATTERN.test(candidate.id) && typeof candidate.dir === "string" && typeof candidate.created_at === "string" && typeof candidate.expires_at === "string";
      });
    } catch (error) {
      if (existsSync(this.#registryPath())) this.#log.warn("\u0420\u0435\u0435\u0441\u0442\u0440 \u0444\u043E\u0440\u043A\u043E\u0432 \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F", { error: String(error) });
      return [];
    }
  }
  /** Каталоги, пережившие потерю реестра: форк узнаётся по своему `fork.json`. */
  #scan() {
    let entries;
    try {
      entries = readdirSync(this.#tmpRoot, { withFileTypes: true });
    } catch {
      return [];
    }
    const found = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !PROFILE_FORK_ID_PATTERN.test(entry.name)) continue;
      const dir = join(this.#tmpRoot, entry.name);
      try {
        const parsed = JSON.parse(readFileSync(join(dir, "fork.json"), "utf8"));
        if (parsed.id !== entry.name || typeof parsed.created_at !== "string" || typeof parsed.expires_at !== "string") continue;
        found.push({
          ...parsed,
          dir,
          db_path: join(dir, "platform.db"),
          data_dir: join(dir, "data")
        });
      } catch {
      }
    }
    return found;
  }
  #records() {
    const merged = /* @__PURE__ */ new Map();
    for (const record of this.#read()) merged.set(record.id, record);
    for (const record of this.#scan()) if (!merged.has(record.id)) merged.set(record.id, record);
    return [...merged.values()].filter((record) => typeof record.db_path === "string" && existsSync(record.dir) && existsSync(record.db_path)).sort((left, right) => right.created_at.localeCompare(left.created_at));
  }
  #save(records) {
    mkdirSync(this.#registryDir, { recursive: true });
    const path = this.#registryPath();
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, `${JSON.stringify({ version: PROFILE_FORK_VERSION, forks: records }, null, 2)}
`);
    renameSync(temporary, path);
  }
};

// modules/profile-fork/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0424\u043E\u0440\u043A \u043F\u0440\u043E\u0444\u0438\u043B\u044F</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #d0d7de; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #0969da; font-size: 13px; text-decoration: none; }
  main { padding: 24px; max-width: 980px; }
  .toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  button { font: inherit; cursor: pointer; }
  .button { border: 1px solid #d0d7de; background: #f6f8fa; border-radius: 8px; padding: 8px 12px; }
  .button.primary { background: #0969da; color: #fff; border-color: #0969da; }
  .button.danger { background: #cf222e; color: #fff; border-color: #cf222e; }
  .button:disabled { opacity: .6; cursor: wait; }
  .status { min-height: 1.5em; color: #57606a; }
  .status.error { color: #cf222e; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d0d7de; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; }
  .empty { color: #57606a; padding: 16px 0; }
  code { font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
  .mono { font-family: ui-monospace, Consolas, monospace; font-size: 12px; word-break: break-all; }
</style>
</head>
<body>
<header>
  <h1>\u0424\u043E\u0440\u043A \u043F\u0440\u043E\u0444\u0438\u043B\u044F</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <div class="toolbar">
    <button class="button primary" id="create" type="button">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043F\u0438\u044E</button>
    <button class="button" id="refresh" type="button">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button>
    <span class="status" id="status"></span>
  </div>
  <table>
    <thead><tr><th>\u041A\u043E\u043F\u0438\u044F</th><th>\u0421\u043E\u0437\u0434\u0430\u043D\u0430</th><th>\u0418\u0441\u0442\u0435\u043A\u0430\u0435\u0442</th><th>\u0411\u0430\u0437\u0430</th><th></th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <p class="empty" id="empty" hidden>\u041A\u043E\u043F\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.</p>
</main>
<script>
(function () {
  var API = '/api/tools/profile-fork/forks';
  var rows = document.getElementById('rows');
  var empty = document.getElementById('empty');
  var status = document.getElementById('status');
  var createButton = document.getElementById('create');
  var refreshButton = document.getElementById('refresh');
  var busy = false;

  function setStatus(text, isError) {
    status.textContent = text || '';
    status.classList.toggle('error', Boolean(isError));
  }

  function fmt(value) {
    try { return new Date(value).toLocaleString('ru-RU'); } catch (e) { return String(value); }
  }

  function cell(text) {
    var td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  async function request(path, init) {
    var response = await fetch(path, Object.assign({ cache: 'no-store' }, init || {}));
    var text = await response.text();
    var body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
    if (!response.ok) {
      var reason = body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status;
      throw new Error(reason);
    }
    return body;
  }

  async function load() {
    if (busy) return;
    busy = true;
    setStatus('\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026', false);
    try {
      var body = await request(API);
      rows.textContent = '';
      var forks = (body && body.forks) || [];
      empty.hidden = forks.length !== 0;
      forks.forEach(function (fork) {
        var tr = document.createElement('tr');
        tr.appendChild(cell(fork.label || fork.id));
        tr.appendChild(cell(fmt(fork.created_at)));
        tr.appendChild(cell(fmt(fork.expires_at)));
        var db = document.createElement('td');
        db.className = 'mono';
        db.textContent = fork.db_path;
        tr.appendChild(db);
        var actions = document.createElement('td');
        var button = document.createElement('button');
        button.className = 'button danger';
        button.type = 'button';
        button.textContent = '\u0423\u0434\u0430\u043B\u0438\u0442\u044C';
        button.addEventListener('click', function () { removeFork(fork.id); });
        actions.appendChild(button);
        tr.appendChild(actions);
        rows.appendChild(tr);
      });
      setStatus('\u041A\u043E\u043F\u0438\u0439: ' + forks.length, false);
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      busy = false;
    }
  }

  async function createFork() {
    if (busy) return;
    busy = true;
    createButton.disabled = true;
    setStatus('\u0421\u043E\u0437\u0434\u0430\u044E \u043A\u043E\u043F\u0438\u044E\u2026', false);
    try {
      var body = await request(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: '\u044D\u043A\u0441\u043F\u0435\u0440\u0438\u043C\u0435\u043D\u0442' }),
      });
      setStatus('\u041A\u043E\u043F\u0438\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0430: ' + (body.fork && body.fork.id), false);
      await load();
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      busy = false;
      createButton.disabled = false;
    }
  }

  async function removeFork(id) {
    if (busy) return;
    if (!window.confirm('\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u043E\u043F\u0438\u044E ' + id + '?')) return;
    busy = true;
    setStatus('\u0423\u0434\u0430\u043B\u044F\u044E \u043A\u043E\u043F\u0438\u044E\u2026', false);
    try {
      await request(API + '/' + encodeURIComponent(id), { method: 'DELETE' });
      setStatus('\u041A\u043E\u043F\u0438\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0430.', false);
      await load();
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      busy = false;
    }
  }

  createButton.addEventListener('click', createFork);
  refreshButton.addEventListener('click', load);
  void load();
})();
</script>
</body>
</html>`;

// modules/profile-fork/index.ts
var NO_STORE = { "cache-control": "no-store" };
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "profile_fork_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "profile-fork",
  apiVersion: 1,
  register(ctx) {
    const service = new ProfileForkService({
      dataDir: ctx.settings.dataDir,
      registryDir: ctx.paths.data,
      backup: (destination) => ctx.storage.backupTo(destination),
      tmpRoot: process.env.TEAM_PROFILE_FORK_ROOT,
      log: ctx.log
    });
    ctx.publish(service);
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.api.add("GET", "/api/tools/profile-fork/forks", () => ({
      headers: NO_STORE,
      body: { ok: true, ...service.list() }
    }));
    ctx.api.add("POST", "/api/tools/profile-fork/forks", async (request) => ({
      status: 201,
      headers: NO_STORE,
      body: { ok: true, fork: await service.create({ label: bodyOf(request.body).label }) }
    }));
    ctx.api.add("GET", "/api/tools/profile-fork/forks/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, fork: service.get(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/profile-fork/forks/:id/plan", (request) => ({
      headers: NO_STORE,
      body: { ok: true, plan: service.planRun(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/profile-fork/forks/:id/reader", (request) => ({
      headers: NO_STORE,
      body: {
        ok: true,
        reader: service.read(request.params.id, {
          table: request.query.get("table") ?? void 0,
          limit: request.query.get("limit") ?? void 0
        })
      }
    }));
    ctx.api.add("DELETE", "/api/tools/profile-fork/forks/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...service.discard(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/profile-fork/purge", () => ({
      headers: NO_STORE,
      body: { ok: true, ...service.purge() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
