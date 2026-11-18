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

// modules/asset-license/licenses.ts
var CATALOG = [
  {
    id: "cc0-1.0",
    name: "CC0 1.0",
    attribution_required: false,
    commercial_use: true,
    share_alike: false,
    derivatives_allowed: true,
    ai_training: "allowed"
  },
  {
    id: "cc-by-4.0",
    name: "CC BY 4.0",
    attribution_required: true,
    commercial_use: true,
    share_alike: false,
    derivatives_allowed: true,
    ai_training: "unknown"
  },
  {
    id: "cc-by-sa-4.0",
    name: "CC BY-SA 4.0",
    attribution_required: true,
    commercial_use: true,
    share_alike: true,
    derivatives_allowed: true,
    ai_training: "unknown"
  },
  {
    id: "cc-by-nc-4.0",
    name: "CC BY-NC 4.0",
    attribution_required: true,
    commercial_use: false,
    share_alike: false,
    derivatives_allowed: true,
    ai_training: "unknown"
  },
  {
    id: "cc-by-nd-4.0",
    name: "CC BY-ND 4.0",
    attribution_required: true,
    commercial_use: true,
    share_alike: false,
    derivatives_allowed: false,
    ai_training: "unknown"
  },
  {
    id: "cc-by-nc-sa-4.0",
    name: "CC BY-NC-SA 4.0",
    attribution_required: true,
    commercial_use: false,
    share_alike: true,
    derivatives_allowed: true,
    ai_training: "unknown"
  },
  {
    id: "mit",
    name: "MIT",
    attribution_required: true,
    commercial_use: true,
    share_alike: false,
    derivatives_allowed: true,
    ai_training: "allowed"
  },
  {
    id: "apache-2.0",
    name: "Apache 2.0",
    attribution_required: true,
    commercial_use: true,
    share_alike: false,
    derivatives_allowed: true,
    ai_training: "allowed"
  },
  {
    id: "ofl-1.1",
    name: "SIL Open Font License 1.1",
    attribution_required: true,
    commercial_use: true,
    share_alike: true,
    derivatives_allowed: true,
    ai_training: "unknown"
  }
];
var BY_ID = new Map(CATALOG.map((license) => [license.id, license]));
function normalizeLicenseId(raw) {
  const compact = raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");
  const aliases = {
    cc0: "cc0-1.0",
    "cc-0": "cc0-1.0",
    "cc-by": "cc-by-4.0",
    "cc-by-sa": "cc-by-sa-4.0",
    "cc-by-nc": "cc-by-nc-4.0",
    "cc-by-nd": "cc-by-nd-4.0",
    "cc-by-nc-sa": "cc-by-nc-sa-4.0",
    "apache-2": "apache-2.0",
    "apache2": "apache-2.0",
    "ofl": "ofl-1.1"
  };
  return aliases[compact] ?? compact;
}
function licenseFacts(id) {
  return BY_ID.get(normalizeLicenseId(id)) ?? null;
}
function listLicenses() {
  return CATALOG.map((license) => ({ ...license }));
}

// modules/asset-license/service.ts
var MAX_RECORDS = 2e3;
var MAX_SOURCE = 500;
var MAX_LICENSE = 100;
var MAX_URL = 500;
var MAX_NOTE = 2e3;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "asset_license_body_invalid"
    });
  }
  return raw;
}
function requiredText(value, field, max, code) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 ${field}`, { field }, { code });
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 ${field} \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${max} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`, { field, limit: max }, {
      code: code.replace(/_required$/, "_too_long")
    });
  }
  return trimmed;
}
function optionalText(value, max, code) {
  if (value === void 0 || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u0430\u0441\u044C \u0441\u0442\u0440\u043E\u043A\u0430", {}, { code });
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new ValidationError(`\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${max} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`, { limit: max }, { code });
  }
  return trimmed;
}
function dateOf(value) {
  if (value === void 0 || value === null || value === "") {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new ValidationError("fixed_at \u2014 \u0434\u0430\u0442\u0430 \u0413\u0413\u0413\u0413-\u041C\u041C-\u0414\u0414", { received: value }, {
      code: "asset_license_fixed_at_invalid"
    });
  }
  const normalized = value.trim();
  const parsed = /* @__PURE__ */ new Date(`${normalized}T00:00:00Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new ValidationError("fixed_at \u2014 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0430\u044F \u0434\u0430\u0442\u0430", { received: value }, {
      code: "asset_license_fixed_at_invalid"
    });
  }
  return normalized;
}
function shaOf(value) {
  if (value === void 0 || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value.trim())) {
    throw new ValidationError("sha256 \u2014 64 \u0448\u0435\u0441\u0442\u043D\u0430\u0434\u0446\u0430\u0442\u0435\u0440\u0438\u0447\u043D\u044B\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u0430", { received: value }, {
      code: "asset_license_sha256_invalid"
    });
  }
  return value.trim().toLowerCase();
}
function normalizeAi(value) {
  return value === "allowed" || value === "prohibited" || value === "unknown" ? value : "unknown";
}
function subjectFromRecord(record, assetId, sha256) {
  return {
    record_id: record.id || null,
    license: record.license,
    known: licenseFacts(record.license) !== null,
    attribution_required: record.attribution_required,
    commercial_use: record.commercial_use,
    share_alike: record.share_alike,
    derivatives_allowed: record.derivatives_allowed,
    asset_id: assetId,
    sha256
  };
}
function subjectFromFacts(license, facts) {
  return {
    record_id: null,
    license,
    known: facts !== null,
    attribution_required: facts?.attribution_required ?? true,
    commercial_use: facts?.commercial_use ?? false,
    share_alike: facts?.share_alike ?? false,
    derivatives_allowed: facts?.derivatives_allowed ?? false
  };
}
function blockersOf(subject) {
  if (subject.missing) {
    return [{
      record_id: null,
      license: "",
      reason: "license_missing",
      asset_id: subject.asset_id,
      sha256: subject.sha256
    }];
  }
  const blockers = [];
  if (!subject.known) blockers.push({ record_id: subject.record_id, license: subject.license, reason: "unknown_license" });
  if (!subject.commercial_use) blockers.push({ record_id: subject.record_id, license: subject.license, reason: "non_commercial" });
  if (subject.share_alike) blockers.push({ record_id: subject.record_id, license: subject.license, reason: "share_alike" });
  if (!subject.derivatives_allowed) blockers.push({ record_id: subject.record_id, license: subject.license, reason: "no_derivatives" });
  return blockers;
}
function assetOf(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError("assets \u2014 \u043C\u0430\u0441\u0441\u0438\u0432 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432 { asset_id, sha256 }", { received: typeof raw }, {
      code: "asset_license_assets_invalid"
    });
  }
  const source = raw;
  const asset_id = requiredText(source.asset_id, "asset_id", 200, "asset_license_asset_id_required");
  const sha256 = shaOf(source.sha256);
  if (!sha256) {
    throw new ValidationError("\u0423 \u0430\u0441\u0441\u0435\u0442\u0430 \u043D\u0443\u0436\u0435\u043D sha256", { asset_id }, {
      code: "asset_license_asset_sha256_required"
    });
  }
  return { asset_id, sha256 };
}
function missingSubject(asset) {
  return {
    record_id: null,
    license: "",
    known: false,
    attribution_required: false,
    commercial_use: false,
    share_alike: false,
    derivatives_allowed: false,
    asset_id: asset.asset_id,
    sha256: asset.sha256,
    missing: true
  };
}
function toRecord(row) {
  return {
    id: row.id,
    source: row.source,
    license: row.license,
    license_url: row.license_url,
    attribution_required: row.attribution_required === 1,
    commercial_use: row.commercial_use === 1,
    share_alike: row.share_alike === 1,
    derivatives_allowed: row.derivatives_allowed === 1,
    ai_training: normalizeAi(row.ai_training),
    fixed_at: row.fixed_at,
    sha256: row.sha256,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
var AssetLicenseService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM asset_licenses").get();
    return Number(row?.c ?? 0);
  }
  list(options = {}) {
    const limit = Math.min(Math.max(Math.trunc(options.limit ?? 100), 1), MAX_RECORDS);
    const clauses = [];
    const params = [];
    if (options.license) {
      clauses.push("license = ?");
      params.push(normalizeLicenseId(options.license));
    }
    if (options.commercial !== void 0) {
      clauses.push("commercial_use = ?");
      params.push(options.commercial ? 1 : 0);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.#db.raw.prepare(`SELECT * FROM asset_licenses ${where} ORDER BY updated_at DESC, id DESC LIMIT ?`).all(...params, limit);
    return rows.map(toRecord);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM asset_licenses WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0417\u0430\u043F\u0438\u0441\u044C \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return toRecord(row);
  }
  create(raw) {
    const input = bodyOf(raw);
    const source = requiredText(input.source, "source", MAX_SOURCE, "asset_license_source_required");
    const license = normalizeLicenseId(requiredText(input.license, "license", MAX_LICENSE, "asset_license_license_required"));
    const licenseUrl = optionalText(input.license_url, MAX_URL, "asset_license_url_too_long");
    const note = optionalText(input.note, MAX_NOTE, "asset_license_note_too_long") ?? "";
    const fixedAt = dateOf(input.fixed_at);
    const sha256 = shaOf(input.sha256);
    if (this.#count() >= MAX_RECORDS) {
      throw new ConflictError(`\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 (${MAX_RECORDS})`, { reason: "asset_license_limit" });
    }
    const facts = licenseFacts(license);
    const record = {
      id: newId("license"),
      source,
      license,
      license_url: licenseUrl,
      attribution_required: facts?.attribution_required ?? true,
      commercial_use: facts?.commercial_use ?? false,
      share_alike: facts?.share_alike ?? false,
      derivatives_allowed: facts?.derivatives_allowed ?? false,
      ai_training: facts?.ai_training ?? "unknown",
      fixed_at: fixedAt,
      sha256,
      note,
      created_at: "",
      updated_at: ""
    };
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO asset_licenses (
        id, source, license, license_url, attribution_required, commercial_use,
        share_alike, derivatives_allowed, ai_training, fixed_at, sha256, note,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.source,
      record.license,
      record.license_url,
      record.attribution_required ? 1 : 0,
      record.commercial_use ? 1 : 0,
      record.share_alike ? 1 : 0,
      record.derivatives_allowed ? 1 : 0,
      record.ai_training,
      record.fixed_at,
      record.sha256,
      record.note,
      now,
      now
    );
    return { ...record, created_at: now, updated_at: now };
  }
  remove(id) {
    this.get(id);
    this.#db.raw.prepare("DELETE FROM asset_licenses WHERE id = ?").run(id);
    return { removed: true, id };
  }
  /** Последняя запись лицензии для файла с этим sha256; имени файла не доверяем. */
  findBySha256(value) {
    const sha256 = shaOf(value);
    if (!sha256) return null;
    const row = this.#db.raw.prepare("SELECT * FROM asset_licenses WHERE sha256 = ? ORDER BY updated_at DESC, id DESC LIMIT 1").get(sha256);
    return row ? toRecord(row) : null;
  }
  /**
   * `{ assets }` — набор конкретных файлов с sha256; `{ ids }` — записи
   * реестра; `{ license }` — одна лицензия без записи; пустое тело — весь
   * реестр. «Можно шипить» только при нуле причин.
   */
  shipCheck(raw) {
    const input = bodyOf(raw);
    let subjects;
    if (input.assets !== void 0) {
      if (!Array.isArray(input.assets)) {
        throw new ValidationError("assets \u2014 \u043C\u0430\u0441\u0441\u0438\u0432 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432 { asset_id, sha256 }", { received: typeof input.assets }, {
          code: "asset_license_assets_invalid"
        });
      }
      if (input.assets.length > MAX_RECORDS) {
        throw new ValidationError(`\u0411\u043E\u043B\u044C\u0448\u0435 ${MAX_RECORDS} \u0430\u0441\u0441\u0435\u0442\u043E\u0432 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F`, { limit: MAX_RECORDS }, {
          code: "asset_license_assets_too_many"
        });
      }
      subjects = input.assets.map(assetOf).map((asset) => {
        const record = this.findBySha256(asset.sha256);
        return record ? subjectFromRecord(record, asset.asset_id, asset.sha256) : missingSubject(asset);
      });
    } else if (input.license !== void 0) {
      const license = normalizeLicenseId(requiredText(input.license, "license", MAX_LICENSE, "asset_license_license_required"));
      subjects = [subjectFromFacts(license, licenseFacts(license))];
    } else if (input.ids !== void 0) {
      if (!Array.isArray(input.ids)) {
        throw new ValidationError("ids \u2014 \u043C\u0430\u0441\u0441\u0438\u0432 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u043E\u0432", { received: typeof input.ids }, {
          code: "asset_license_ids_invalid"
        });
      }
      if (input.ids.length > MAX_RECORDS) {
        throw new ValidationError(`\u0411\u043E\u043B\u044C\u0448\u0435 ${MAX_RECORDS} \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F`, { limit: MAX_RECORDS }, {
          code: "asset_license_ids_too_many"
        });
      }
      subjects = input.ids.map((id) => subjectFromRecord(this.get(String(id))));
    } else {
      subjects = this.list({ limit: MAX_RECORDS }).map((record) => subjectFromRecord(record));
    }
    const blockers = subjects.flatMap(blockersOf);
    if (!subjects.length) {
      blockers.push({ record_id: null, license: "", reason: "no_records" });
    }
    const assets = subjects.filter((subject) => subject.asset_id !== void 0 && subject.sha256 !== void 0).map((subject) => ({
      asset_id: subject.asset_id,
      sha256: subject.sha256,
      record_id: subject.record_id,
      license: subject.license || null,
      blockers: blockersOf(subject)
    }));
    return {
      shippable: blockers.length === 0,
      checked: subjects.length,
      blockers,
      attribution_required: subjects.filter((subject) => subject.attribution_required).map((subject) => ({ record_id: subject.record_id, license: subject.license })),
      assets
    };
  }
  summary() {
    const rows = this.#db.raw.prepare("SELECT license, COUNT(*) AS c FROM asset_licenses GROUP BY license ORDER BY license").all();
    const byLicense = {};
    for (const row of rows) byLicense[row.license] = Number(row.c);
    return { records: this.#count(), limit: MAX_RECORDS, by_license: byLicense };
  }
};

// modules/asset-license/schema.ts
var assetLicenseMigrations = [
  {
    version: "asset-license/1_records",
    sql: `
      CREATE TABLE asset_licenses (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        license TEXT NOT NULL,
        license_url TEXT,
        attribution_required INTEGER NOT NULL,
        commercial_use INTEGER NOT NULL,
        share_alike INTEGER NOT NULL,
        derivatives_allowed INTEGER NOT NULL,
        ai_training TEXT NOT NULL,
        fixed_at TEXT NOT NULL,
        sha256 TEXT,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_asset_licenses_license ON asset_licenses (license);
      CREATE INDEX idx_asset_licenses_updated ON asset_licenses (updated_at);
      CREATE INDEX idx_asset_licenses_sha ON asset_licenses (sha256);
    `
  }
];

// modules/asset-license/page.ts
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u0420\u0435\u0435\u0441\u0442\u0440 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439 \u0430\u0441\u0441\u0435\u0442\u043E\u0432</title></head><body>
<h1>\u0420\u0435\u0435\u0441\u0442\u0440 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439 \u0430\u0441\u0441\u0435\u0442\u043E\u0432</h1>
<p>\u041E\u0434\u0438\u043D \u0440\u0435\u0435\u0441\u0442\u0440 \u0434\u043B\u044F 3D \u0438 \u0433\u0435\u0439\u043C\u0434\u0435\u0432\u0430: \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A, \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F, \u0430\u0442\u0440\u0438\u0431\u0443\u0446\u0438\u044F, \u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u0435
\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435, share-alike, \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u043D\u044B\u0435, \u0437\u0430\u043F\u0440\u0435\u0442 \u0418\u0418-\u043E\u0431\u0443\u0447\u0435\u043D\u0438\u044F, \u0434\u0430\u0442\u0430 \u0444\u0438\u043A\u0441\u0430\u0446\u0438\u0438 \u0438
<code>sha256</code> \u0444\u0430\u0439\u043B\u0430.</p>
<p><code>POST /api/tools/asset-license/records</code> \u2014
<code>{ source, license, license_url?, fixed_at?, sha256?, note? }</code>.
<code>GET .../records</code>, <code>GET .../records/:id</code>,
<code>DELETE .../records/:id</code>, <code>GET .../licenses</code>,
<code>GET .../summary</code>.</p>
<p><code>POST /api/tools/asset-license/ship-check</code> \u0441
<code>{ assets: [{ asset_id, sha256 }] }</code>, <code>{ ids }</code>,
<code>{ license }</code> \u0438\u043B\u0438 \u043F\u0443\u0441\u0442\u044B\u043C \u0442\u0435\u043B\u043E\u043C. \u041D\u0430\u0431\u043E\u0440 \u0430\u0441\u0441\u0435\u0442\u043E\u0432 \u0438\u0449\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u043E
<code>sha256</code>; \u0444\u0430\u0439\u043B \u0431\u0435\u0437 \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 <code>license_missing</code>.
\u041E\u0442\u0432\u0435\u0442 \u2014
<code>shippable</code>, <code>checked</code>, <code>blockers</code> \u0438
<code>attribution_required</code>. \u041F\u0440\u0438\u0447\u0438\u043D\u044B \u043E\u0442\u043A\u0430\u0437\u0430:
<code>non-commercial</code> (NC), <code>share-alike</code> (SA),
<code>no-derivatives</code> (ND), <code>unknown-license</code> \u0438
<code>no-records</code> \u0438 <code>license-missing</code>. \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u044E\u0449\u0435\u0439.</p>
<p>\u042D\u0442\u043E \u0444\u0430\u043A\u0442\u044B \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438, \u0430 \u043D\u0435 \u044E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0437\u0430\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435: \u0430\u0442\u0440\u0438\u0431\u0443\u0446\u0438\u044F \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F,
\u0430 \u0437\u0430\u043F\u0440\u0435\u0442 \u0418\u0418-\u043E\u0431\u0443\u0447\u0435\u043D\u0438\u044F \u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u043C \u043F\u043E\u043B\u0435\u043C.</p>
</body></html>`;

// modules/asset-license/index.ts
var NO_STORE = { "cache-control": "no-store" };
function bodyOf2(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "asset_license_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "asset-license",
  apiVersion: 1,
  migrations: assetLicenseMigrations,
  register(ctx) {
    const svc = new AssetLicenseService({ db: ctx.storage });
    ctx.publish?.({
      findBySha256: (sha256) => svc.findBySha256(sha256),
      shipCheck: (raw) => svc.shipCheck(raw)
    });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/asset-license/licenses", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, licenses: listLicenses() }
    }));
    ctx.api.add("GET", "/api/tools/asset-license/records", (request) => {
      const limit = Number(request.query.get("limit") ?? 100);
      const license = request.query.get("license") ?? void 0;
      const commercialRaw = request.query.get("commercial");
      const commercial = commercialRaw === null ? void 0 : commercialRaw === "true";
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          items: svc.list({
            limit: Number.isFinite(limit) ? limit : 100,
            license: license || void 0,
            commercial
          })
        }
      };
    });
    ctx.api.add("GET", "/api/tools/asset-license/records/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, record: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/asset-license/records", (request) => ({
      status: 201,
      headers: NO_STORE,
      body: { ok: true, record: svc.create(bodyOf2(request.body)) }
    }));
    ctx.api.add("DELETE", "/api/tools/asset-license/records/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/asset-license/ship-check", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, ...svc.shipCheck(bodyOf2(request.body)) }
    }));
    ctx.api.add("GET", "/api/tools/asset-license/summary", () => ({
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
