import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/author-studio/service.ts
import { createHash } from "node:crypto";

// team-host-api:src/kernel/clock.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var fixedClock = host["fixedClock"];
var nextTimestamp = host["nextTimestamp"];
var systemClock = host["systemClock"];

// team-host-api:src/kernel/errors.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host2["AppError"];
var ConflictError = host2["ConflictError"];
var ForbiddenError = host2["ForbiddenError"];
var NotFoundError = host2["NotFoundError"];
var UpstreamError = host2["UpstreamError"];
var ValidationError = host2["ValidationError"];
var isAppError = host2["isAppError"];

// team-host-api:src/kernel/ids.ts
var host3 = globalThis["__teamPlatformHostApi"] ?? {};
var newId = host3["newId"];

// team-host-api:src/kernel/validate.ts
var host4 = globalThis["__teamPlatformHostApi"] ?? {};
var integer = host4["integer"];
var oneOf = host4["oneOf"];
var optionalInteger = host4["optionalInteger"];
var optionalName = host4["optionalName"];
var record = host4["record"];
var requiredOneOf = host4["requiredOneOf"];
var text = host4["text"];

// modules/author-studio/export-citations.ts
var EXPORT_CITATIONS_ERROR_CODE = "export_citations_unresolved";
var ExportCitationsError = class extends AppError {
  constructor(message, details) {
    super(EXPORT_CITATIONS_ERROR_CODE, `${message} (${EXPORT_CITATIONS_ERROR_CODE})`, 409, details);
  }
};
function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}
function sorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
function assessExportCitations(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0442\u0447\u0451\u0442 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430", { reason: "invalid_export", field: "export" });
  }
  const input = raw;
  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new ValidationError("\u0421\u043F\u0438\u0441\u043E\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u043F\u0443\u0441\u0442", { reason: "invalid_sources", field: "sources" });
  }
  if (!Array.isArray(input.citations)) {
    throw new ValidationError("\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u0441\u044B\u043B\u043E\u043A \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C", { reason: "invalid_citations", field: "citations" });
  }
  const bibliography = /* @__PURE__ */ new Map();
  const incomplete = /* @__PURE__ */ new Set();
  for (const [position, entry] of input.sources.entries()) {
    const source = typeof entry === "object" && entry !== null ? entry : {};
    const sourceId = trimmed(source.source_id);
    if (!sourceId) {
      throw new ValidationError(`\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u2116${position} \u0431\u0435\u0437 source_id`, {
        reason: "invalid_sources",
        field: `sources[${position}]`
      });
    }
    bibliography.set(sourceId, source);
    if (!trimmed(source.author) || typeof source.year !== "number" || !Number.isInteger(source.year)) {
      incomplete.add(sourceId);
    }
  }
  const problems = [];
  const missingSources = /* @__PURE__ */ new Set();
  const missingLocators = /* @__PURE__ */ new Set();
  const cited = /* @__PURE__ */ new Set();
  const citations = input.citations;
  for (const [position, entry] of citations.entries()) {
    const citation = typeof entry === "object" && entry !== null ? entry : {};
    const sourceId = trimmed(citation.source_id);
    if (!sourceId) {
      throw new ValidationError(`\u0421\u0441\u044B\u043B\u043A\u0430 \u2116${position} \u0431\u0435\u0437 source_id`, {
        reason: "invalid_citations",
        field: `citations[${position}]`
      });
    }
    cited.add(sourceId);
    if (!bibliography.has(sourceId)) missingSources.add(sourceId);
    if (!trimmed(citation.locator)) missingLocators.add(sourceId);
  }
  if (incomplete.size > 0) problems.push({ reason: "source_incomplete", source_ids: sorted(incomplete) });
  if (missingLocators.size > 0) problems.push({ reason: "citation_locator_missing", source_ids: sorted(missingLocators) });
  if (missingSources.size > 0) problems.push({ reason: "citation_source_missing", source_ids: sorted(missingSources) });
  problems.sort((left, right) => left.reason.localeCompare(right.reason));
  const referenced = [...cited].filter((sourceId) => bibliography.has(sourceId));
  return {
    passed: problems.length === 0,
    citations: citations.length,
    bibliography: new Set(referenced).size,
    problems,
    unreferenced_sources: sorted([...bibliography.keys()].filter((sourceId) => !cited.has(sourceId)))
  };
}
function requireExportCitations(raw) {
  const report = assessExportCitations(raw);
  if (report.passed) return report;
  const problem = report.problems[0];
  const details = {
    reason: problem.reason,
    source_ids: problem.source_ids,
    count: problem.source_ids.length,
    problems: report.problems
  };
  if (problem.reason === "citation_source_missing") details.missing_sources = problem.source_ids;
  throw new ExportCitationsError(
    `\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D: ${problem.reason} (${problem.source_ids.join(", ")})`,
    details
  );
}

// modules/author-studio/publish-metadata.ts
var PUBLISH_METADATA_ERROR_CODE = "publish_metadata_incomplete";
var PUBLISH_CHANNELS = ["internal", "public"];
var PUBLISH_LICENSES = [
  "cc-by-4.0",
  "cc-by-sa-4.0",
  "cc0-1.0",
  "all-rights-reserved"
];
var PublishMetadataError = class extends AppError {
  constructor(message, details) {
    super(PUBLISH_METADATA_ERROR_CODE, `${message} (${PUBLISH_METADATA_ERROR_CODE})`, 409, details);
  }
};
function trimmed2(value) {
  return typeof value === "string" ? value.trim() : "";
}
function channelOf(raw) {
  const value = trimmed2(raw) || "internal";
  if (!PUBLISH_CHANNELS.includes(value)) {
    throw new ValidationError(`\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043A\u0430\u043D\u0430\u043B \xAB${value}\xBB`, {
      reason: "invalid_channel",
      channel: value,
      allowed: [...PUBLISH_CHANNELS]
    });
  }
  return value;
}
function licenseOf(raw) {
  const value = trimmed2(raw).toLowerCase();
  if (!value) return null;
  if (!PUBLISH_LICENSES.includes(value)) {
    throw new PublishMetadataError(`\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \xAB${value}\xBB \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F`, {
      reason: "license_unknown",
      license: value,
      allowed: [...PUBLISH_LICENSES]
    });
  }
  return value;
}
function requirePublishMetadata(raw, options = {}) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043B\u0438\u0441\u044C \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438", {
      reason: "invalid_metadata",
      field: "metadata"
    });
  }
  const input = raw;
  for (const field of ["title", "author", "license"]) {
    const value = input[field];
    if (value !== void 0 && value !== null && typeof value !== "string") {
      throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`, {
        reason: "invalid_metadata",
        field
      });
    }
  }
  const channel = channelOf(options.channel);
  const title = trimmed2(input.title);
  const author = trimmed2(input.author);
  const missing = [];
  if (!author) missing.push("author");
  if (!title) missing.push("title");
  missing.sort();
  if (missing.length > 0) {
    throw new PublishMetadataError(`\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u043D\u0435\u043F\u043E\u043B\u043D\u0430: \u043D\u0435\u0442 ${missing.join(", ")}`, {
      reason: "metadata_missing",
      missing,
      channel
    });
  }
  const license = licenseOf(input.license);
  if (channel === "public" && license === null) {
    throw new PublishMetadataError("\u041E\u0442\u043A\u0440\u044B\u0442\u0430\u044F \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044E", {
      reason: "license_missing",
      channel,
      allowed: [...PUBLISH_LICENSES]
    });
  }
  return { title, author, license };
}

// modules/author-studio/version-diff.ts
var DIFF_MAX_LINES = 5e3;
function assertBudget(before, after) {
  if (before.length > DIFF_MAX_LINES || after.length > DIFF_MAX_LINES) {
    throw new ValidationError(
      `diff: \u0431\u043E\u043B\u044C\u0448\u0435 ${DIFF_MAX_LINES} \u0441\u0442\u0440\u043E\u043A \u0432 \u0441\u043D\u0438\u043C\u043A\u0435 (${Math.max(before.length, after.length)})`,
      {
        reason: "diff_budget_exceeded",
        max_lines: DIFF_MAX_LINES,
        before_lines: before.length,
        after_lines: after.length
      }
    );
  }
}
function lines(text2) {
  return text2.split("\n");
}
function lcsTable(before, after) {
  const table = [];
  for (let i = 0; i <= before.length; i += 1) table.push(new Uint32Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}
function diffLines(beforeText, afterText) {
  const before = lines(beforeText);
  const after = lines(afterText);
  assertBudget(before, after);
  const table = lcsTable(before, after);
  const changes = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      changes.push({ op: "same", line: before[i], before_line: i + 1, after_line: j + 1 });
      unchanged += 1;
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      changes.push({ op: "remove", line: before[i], before_line: i + 1, after_line: null });
      removed += 1;
      i += 1;
    } else {
      changes.push({ op: "add", line: after[j], before_line: null, after_line: j + 1 });
      added += 1;
      j += 1;
    }
  }
  while (i < before.length) {
    changes.push({ op: "remove", line: before[i], before_line: i + 1, after_line: null });
    removed += 1;
    i += 1;
  }
  while (j < after.length) {
    changes.push({ op: "add", line: after[j], before_line: null, after_line: j + 1 });
    added += 1;
    j += 1;
  }
  return { changes, added, removed, unchanged };
}

// modules/author-studio/service.ts
var KINDS = ["note", "template", "citation", "asset", "draft"];
var LINK_KINDS = ["references", "derived-from", "related"];
function metadataValue(raw) {
  if (raw === void 0 || raw === null) return {};
  return record(raw, "metadata");
}
function parseMetadata(raw) {
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  } catch {
  }
  return {};
}
function toItem(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function toVersion(row) {
  return {
    id: row.id,
    draft_id: row.draft_id,
    version: Number(row.version),
    title: row.title,
    body: row.body,
    digest: row.digest,
    created_at: row.created_at
  };
}
function toExport(row) {
  return {
    id: row.id,
    draft_id: row.draft_id,
    version_id: row.version_id,
    format: row.format,
    author: row.author,
    license: row.license,
    digest: row.digest,
    content: row.content,
    created_at: row.created_at
  };
}
function versionDigest(title, body) {
  return createHash("sha256").update(`${title}
${body}`, "utf8").digest("hex");
}
function textValue(raw) {
  return typeof raw === "string" ? raw.trim() : "";
}
var AuthorStudioService = class {
  #db;
  #clock;
  constructor(db, clock = systemClock) {
    this.#db = db;
    this.#clock = clock;
  }
  list(kind = void 0, query = "", limit = 50) {
    const validKind = kind === void 0 || kind === null ? void 0 : requiredOneOf(text(kind, "kind", 40, true), "kind", KINDS);
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const conditions = [];
    const params = [];
    if (validKind) {
      conditions.push("kind = ?");
      params.push(validKind);
    }
    const q = query.trim();
    if (q) {
      conditions.push("(title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')");
      const pattern = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      params.push(pattern, pattern);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.#db.raw.prepare(
      `SELECT * FROM author_studio_items ${where} ORDER BY updated_at DESC LIMIT ?`
    ).all(...params, safeLimit);
    return rows.map(toItem);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM author_studio_items WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u0442\u0443\u0434\u0438\u0438 \u0430\u0432\u0442\u043E\u0440\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return toItem(row);
  }
  create(raw) {
    const input = record(raw, "\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u0442\u0443\u0434\u0438\u0438 \u0430\u0432\u0442\u043E\u0440\u0430");
    const kind = requiredOneOf(text(input.kind, "kind", 40, true), "kind", KINDS);
    const title = text(input.title, "title", 200, true);
    const body = text(input.body, "body", 2e4);
    const metadata = metadataValue(input.metadata);
    const now = this.#clock.now().toISOString();
    const item = {
      id: newId("studio"),
      kind,
      title,
      body,
      metadata,
      created_at: now,
      updated_at: now
    };
    this.#db.raw.prepare(`
      INSERT INTO author_studio_items (id, kind, title, body, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(item.id, item.kind, item.title, item.body, JSON.stringify(item.metadata), item.created_at, item.updated_at);
    return item;
  }
  update(id, raw) {
    const current = this.get(id);
    const input = record(raw, "\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u0442\u0443\u0434\u0438\u0438 \u0430\u0432\u0442\u043E\u0440\u0430");
    const kind = input.kind === void 0 ? current.kind : requiredOneOf(text(input.kind, "kind", 40, true), "kind", KINDS);
    const title = input.title === void 0 ? current.title : text(input.title, "title", 200, true);
    const body = input.body === void 0 ? current.body : text(input.body, "body", 2e4);
    const metadata = input.metadata === void 0 ? current.metadata : metadataValue(input.metadata);
    const updatedAt = nextTimestamp(current.updated_at, this.#clock.now());
    this.#db.raw.prepare(`
      UPDATE author_studio_items
      SET kind = ?, title = ?, body = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `).run(kind, title, body, JSON.stringify(metadata), updatedAt, id);
    return this.get(id);
  }
  remove(id) {
    const result = this.#db.raw.prepare("DELETE FROM author_studio_items WHERE id = ?").run(id);
    if (Number(result.changes) === 0) throw new NotFoundError("\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u0442\u0443\u0434\u0438\u0438 \u0430\u0432\u0442\u043E\u0440\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return { removed: true };
  }
  /**
   * Создаёт черновик из шаблона, подставляя переменные в заголовок и текст.
   * Шаблон остаётся неизменным; результат — обычный черновик со ссылкой на
   * источник шаблона в метаданных.
   */
  instantiateTemplate(templateId, raw = {}) {
    const template = this.get(templateId);
    if (template.kind !== "template") {
      throw new ValidationError("\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0441\u043E\u0437\u0434\u0430\u0451\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0438\u0437 \u0448\u0430\u0431\u043B\u043E\u043D\u0430", {
        reason: "template_required",
        item_id: templateId
      });
    }
    const input = raw === void 0 || raw === null ? {} : record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438\u0437 \u0448\u0430\u0431\u043B\u043E\u043D\u0430");
    const variables = input.variables === void 0 || input.variables === null ? {} : record(input.variables, "variables");
    const renderedTitle = renderTemplate(template.title, variables);
    const renderedBody = renderTemplate(template.body, variables);
    const missing = missingTemplateVariables(template.title, template.body, variables);
    if (missing.length > 0) {
      throw new ValidationError("\u0412 \u0448\u0430\u0431\u043B\u043E\u043D\u0435 \u043E\u0441\u0442\u0430\u043B\u0438\u0441\u044C \u043D\u0435\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435", {
        reason: "template_variable_missing",
        template_id: templateId,
        missing
      });
    }
    const title = input.title === void 0 ? text(renderedTitle, "title", 200, true) : text(input.title, "title", 200, true);
    const body = input.body === void 0 ? text(renderedBody, "body", 2e4) : text(input.body, "body", 2e4);
    const metadata = {
      ...template.metadata,
      template_id: template.id,
      variables
    };
    return this.create({ kind: "draft", title, body, metadata });
  }
  /** Снимок версии: только с черновика, с непустым текстом, монотонным номером. */
  snapshot(id) {
    const draft = this.get(id);
    if (draft.kind !== "draft") {
      throw new ValidationError("\u0412\u0435\u0440\u0441\u0438\u044F \u0441\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430", { reason: "draft_required", item_id: id });
    }
    if (!draft.body.trim()) {
      throw new ConflictError("\u0423 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u043D\u0435\u0442 \u0442\u0435\u043A\u0441\u0442\u0430 \u2014 \u0441\u043D\u0438\u043C\u043E\u043A \u0432\u0435\u0440\u0441\u0438\u0438 \u043F\u0443\u0441\u0442", {
        reason: "draft_body_empty",
        draft_id: id
      });
    }
    return this.#db.transaction(() => {
      const last = this.#db.raw.prepare("SELECT MAX(version) AS version FROM author_studio_versions WHERE draft_id = ?").get(id);
      const version = Number(last?.version ?? 0) + 1;
      const snapshot = {
        id: newId("version"),
        draft_id: id,
        version,
        title: draft.title,
        body: draft.body,
        digest: versionDigest(draft.title, draft.body),
        created_at: this.#clock.now().toISOString()
      };
      this.#db.raw.prepare(`
        INSERT INTO author_studio_versions (id, draft_id, version, title, body, digest, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        snapshot.id,
        snapshot.draft_id,
        snapshot.version,
        snapshot.title,
        snapshot.body,
        snapshot.digest,
        snapshot.created_at
      );
      return snapshot;
    });
  }
  versions(draftId) {
    const draft = this.get(draftId);
    if (draft.kind !== "draft") {
      throw new ValidationError("\u0412\u0435\u0440\u0441\u0438\u0438 \u0435\u0441\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0443 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430", { reason: "draft_required", item_id: draftId });
    }
    const rows = this.#db.raw.prepare("SELECT * FROM author_studio_versions WHERE draft_id = ? ORDER BY version ASC").all(draftId);
    return rows.map(toVersion);
  }
  version(versionId) {
    const row = this.#db.raw.prepare("SELECT * FROM author_studio_versions WHERE id = ?").get(versionId);
    if (!row) throw new NotFoundError("\u0412\u0435\u0440\u0441\u0438\u044F \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return toVersion(row);
  }
  /** Проверка неизменности: digest пересчитывается из сохранённого снимка. */
  verifyVersion(versionId) {
    const version = this.version(versionId);
    const actual = versionDigest(version.title, version.body);
    return {
      version_id: version.id,
      valid: actual === version.digest,
      digest: version.digest,
      expected: actual
    };
  }
  /**
   * Сравнение двух снимков одного черновика. Изменения — построчные, поэтому
   * перестановка строк не выдаётся за полную переделку текста.
   */
  diffVersions(fromId, toId) {
    const from = this.version(fromId);
    const to = this.version(toId);
    if (from.draft_id !== to.draft_id) {
      throw new ValidationError("\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043D\u0438\u043C\u043A\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430", {
        reason: "diff_requires_same_draft",
        from_draft_id: from.draft_id,
        to_draft_id: to.draft_id
      });
    }
    if (from.id === to.id) {
      throw new ValidationError("\u041D\u0443\u0436\u043D\u044B \u0434\u0432\u0430 \u0440\u0430\u0437\u043D\u044B\u0445 \u0441\u043D\u0438\u043C\u043A\u0430", {
        reason: "diff_requires_distinct_versions",
        version_id: from.id
      });
    }
    const diff = diffLines(from.body, to.body);
    return {
      draft_id: from.draft_id,
      from: { version_id: from.id, version: from.version, digest: from.digest },
      to: { version_id: to.id, version: to.version, digest: to.digest },
      digests_equal: from.digest === to.digest,
      added: diff.added,
      removed: diff.removed,
      unchanged: diff.unchanged,
      changes: diff.changes
    };
  }
  /** Связь между элементами: ссылка, происхождение или родство. */
  link(raw) {
    const input = record(raw, "\u0421\u0432\u044F\u0437\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432");
    const fromId = text(input.from_id, "from_id", 200, true);
    const toId = text(input.to_id, "to_id", 200, true);
    const kind = requiredOneOf(text(input.kind, "kind", 40, true), "kind", LINK_KINDS);
    this.get(fromId);
    this.get(toId);
    if (fromId === toId) {
      throw new ValidationError("\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0441\u0441\u044B\u043B\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0441\u0435\u0431\u044F", { reason: "link_self", item_id: fromId });
    }
    const existing = this.#db.raw.prepare("SELECT id FROM author_studio_links WHERE from_id = ? AND to_id = ? AND kind = ?").get(fromId, toId, kind);
    if (existing) {
      throw new ConflictError("\u0422\u0430\u043A\u0430\u044F \u0441\u0432\u044F\u0437\u044C \u0443\u0436\u0435 \u0435\u0441\u0442\u044C", { reason: "link_exists", from_id: fromId, to_id: toId, kind });
    }
    if (kind !== "related" && this.#reaches(toId, fromId)) {
      throw new ConflictError("\u0421\u0432\u044F\u0437\u044C \u0437\u0430\u043C\u044B\u043A\u0430\u0435\u0442 \u0446\u0438\u043A\u043B", { reason: "link_cycle", from_id: fromId, to_id: toId, kind });
    }
    const link = {
      id: newId("link"),
      from_id: fromId,
      to_id: toId,
      kind,
      created_at: this.#clock.now().toISOString()
    };
    this.#db.raw.prepare(`
      INSERT INTO author_studio_links (id, from_id, to_id, kind, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(link.id, link.from_id, link.to_id, link.kind, link.created_at);
    return link;
  }
  linksOf(id) {
    this.get(id);
    const select = (column) => this.#db.raw.prepare(`SELECT * FROM author_studio_links WHERE ${column} = ? ORDER BY created_at ASC`).all(id);
    return { outgoing: select("from_id"), incoming: select("to_id") };
  }
  /**
   * Карточки источников черновика в каноническом порядке — их записывает
   * прогон сценария, и по ним же он воспроизводится.
   */
  sourceCards(draftId) {
    this.get(draftId);
    return this.#citationsOf(draftId).map((citation) => ({
      source_id: citation.citation.source_id,
      author: citation.source.author,
      year: citation.source.year,
      locator: citation.citation.locator
    })).sort((left, right) => left.source_id === right.source_id ? left.locator.localeCompare(right.locator) : left.source_id.localeCompare(right.source_id));
  }
  /** Сводка работы автора: элементы по видам, версии, экспорты и связи. */
  metrics() {
    const itemsByKind = Object.fromEntries(KINDS.map((kind) => [kind, 0]));
    const kinds = this.#db.raw.prepare("SELECT kind, COUNT(*) AS c FROM author_studio_items GROUP BY kind").all();
    for (const row of kinds) itemsByKind[row.kind] = Number(row.c);
    const count = (sql) => Number(this.#db.raw.prepare(sql).get().c);
    const latest = this.#db.raw.prepare("SELECT MAX(updated_at) AS t FROM author_studio_items").get();
    return {
      items_by_kind: itemsByKind,
      drafts_with_versions: count("SELECT COUNT(DISTINCT draft_id) AS c FROM author_studio_versions"),
      versions: count("SELECT COUNT(*) AS c FROM author_studio_versions"),
      exports: count("SELECT COUNT(*) AS c FROM author_studio_exports"),
      links: count("SELECT COUNT(*) AS c FROM author_studio_links"),
      latest_activity_at: latest?.t ?? null
    };
  }
  /**
   * Экспорт статьи: только по снимку версии, с заголовком/автором и с
   * разрешёнными цитатами. Цитаты — элементы `citation` с `metadata.draft_id`
   * этого черновика; «висящая» ссылка останавливает выгрузку.
   */
  exportDraft(id, raw) {
    const draft = this.get(id);
    if (draft.kind !== "draft") {
      throw new ValidationError("\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0432\u043E\u0437\u043C\u043E\u0436\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430", { reason: "draft_required", item_id: id });
    }
    const input = raw === void 0 || raw === null ? {} : record(raw, "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430");
    const channel = oneOf(input.channel, "channel", ["internal", "public"], "internal");
    const format = oneOf(input.format, "format", ["markdown", "html", "bibtex", "ris"], "markdown");
    const metadata = requirePublishMetadata(
      { title: draft.title, author: input.author, license: input.license },
      { channel }
    );
    const latest = this.versions(id).at(-1);
    if (!latest) {
      throw new ConflictError("\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u0435\u043D: \u0443 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u0430 \u0432\u0435\u0440\u0441\u0438\u0438", {
        reason: "draft_version_required",
        draft_id: id
      });
    }
    const citations = this.#citationsOf(id);
    if (citations.length > 0) {
      requireExportCitations({
        sources: citations.map((citation) => citation.source),
        citations: citations.map((citation) => citation.citation)
      });
    }
    const citationCards = citations.map((citation) => ({
      source_id: citation.source.source_id,
      author: citation.source.author,
      year: citation.source.year,
      locator: citation.citation.locator
    }));
    const content = format === "markdown" ? renderArticle({
      title: latest.title,
      body: latest.body,
      author: metadata.author,
      license: metadata.license,
      citations: citations.map((citation) => citation.line)
    }) : format === "html" ? renderHtml({ title: latest.title, body: latest.body, author: metadata.author, license: metadata.license, citations: citations.map((c) => c.line) }) : format === "bibtex" ? renderBibtex({ title: latest.title, author: metadata.author, citations: citationCards }) : renderRis({ title: latest.title, author: metadata.author, citations: citationCards });
    const exported = {
      id: newId("export"),
      draft_id: id,
      version_id: latest.id,
      format,
      author: metadata.author,
      license: metadata.license ?? "all-rights-reserved",
      digest: createHash("sha256").update(content, "utf8").digest("hex"),
      content,
      created_at: this.#clock.now().toISOString()
    };
    this.#db.raw.prepare(`
      INSERT INTO author_studio_exports (id, draft_id, version_id, format, author, license, digest, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exported.id,
      exported.draft_id,
      exported.version_id,
      format,
      exported.author,
      exported.license,
      exported.digest,
      exported.content,
      exported.created_at
    );
    return exported;
  }
  exports(draftId) {
    const rows = this.#db.raw.prepare("SELECT * FROM author_studio_exports WHERE draft_id = ? ORDER BY created_at ASC").all(draftId);
    return rows.map(toExport);
  }
  /**
   * Читательский режим: только снимок версии (по умолчанию последний),
   * заголовок, абзацы и список источников. Записи нет — сводка после чтения
   * совпадает с прежней.
   */
  readDraft(id, versionId) {
    const draft = this.get(id);
    if (draft.kind !== "draft") {
      throw new ValidationError("\u0427\u0438\u0442\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439 \u0440\u0435\u0436\u0438\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430", {
        reason: "draft_required",
        item_id: id
      });
    }
    const requested = versionId ? text(versionId, "version", 200, true) : void 0;
    const target = requested ? this.version(requested) : this.versions(id).at(-1);
    if (!target) {
      throw new ConflictError("\u0427\u0438\u0442\u0430\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E: \u0443 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u0430 \u0432\u0435\u0440\u0441\u0438\u0438", {
        reason: "draft_version_required",
        draft_id: id
      });
    }
    if (target.draft_id !== id) {
      throw new ValidationError("\u0421\u043D\u0438\u043C\u043E\u043A \u043F\u0440\u0438\u043D\u0430\u0434\u043B\u0435\u0436\u0438\u0442 \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0443", {
        reason: "version_of_other_draft",
        draft_id: id,
        version_id: target.id
      });
    }
    const sources = this.#citationsOf(id).map((citation) => citation.line);
    const paragraphs = target.body.trim().split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0);
    return {
      draft_id: id,
      version_id: target.id,
      version: target.version,
      digest: target.digest,
      title: target.title,
      paragraphs,
      sources,
      read_only: true
    };
  }
  exportById(exportId) {
    const row = this.#db.raw.prepare("SELECT * FROM author_studio_exports WHERE id = ?").get(exportId);
    if (!row) throw new NotFoundError("\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return toExport(row);
  }
  /** Достижим ли `target` по направленным связям от `start`. */
  #reaches(start, target) {
    const seen = /* @__PURE__ */ new Set();
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.pop();
      if (current === target) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      const rows = this.#db.raw.prepare("SELECT to_id FROM author_studio_links WHERE from_id = ? AND kind <> 'related'").all(current);
      for (const row of rows) queue.push(row.to_id);
    }
    return false;
  }
  #citationsOf(draftId) {
    const rows = this.#db.raw.prepare("SELECT * FROM author_studio_items WHERE kind = ? ORDER BY created_at ASC").all("citation");
    return rows.map(toItem).filter((item) => textValue(item.metadata.draft_id) === draftId).map((item) => {
      const sourceId = textValue(item.metadata.source_id);
      const locator = textValue(item.metadata.locator);
      const year = Number(item.metadata.year);
      return {
        source: {
          source_id: sourceId,
          author: textValue(item.metadata.author),
          year,
          digest: textValue(item.metadata.digest) || createHash("sha256").update(sourceId).digest("hex")
        },
        citation: { source_id: sourceId, locator },
        line: `${textValue(item.metadata.author)} (${Number.isFinite(year) ? year : "\u2014"}). ${sourceId}. ${locator}`
      };
    });
  }
};
var TEMPLATE_VARIABLE = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
function renderTemplate(value, variables) {
  return value.replace(TEMPLATE_VARIABLE, (_match, name) => {
    const raw = variables[name];
    if (raw === void 0 || raw === null) return `{{${name}}}`;
    return String(raw);
  });
}
function missingTemplateVariables(title, body, variables) {
  const names = /* @__PURE__ */ new Set();
  for (const value of [title, body]) {
    for (const match of value.matchAll(TEMPLATE_VARIABLE)) names.add(match[1]);
  }
  return [...names].filter((name) => variables[name] === void 0 || variables[name] === null || String(variables[name]).trim() === "").sort();
}
function renderArticle(input) {
  const lines2 = [
    `# ${input.title}`,
    "",
    `\u0410\u0432\u0442\u043E\u0440: ${input.author}`,
    `\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F: ${input.license ?? "all-rights-reserved"}`,
    "",
    input.body.trim()
  ];
  if (input.citations.length > 0) {
    lines2.push("", "## \u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438", ...input.citations.map((line) => `- ${line}`));
  }
  return `${lines2.join("\n")}
`;
}
function sanitizeBibtexKey(value) {
  const cleaned = value.replace(/[^A-Za-z0-9_-]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "source";
}
function renderHtml(input) {
  const paragraphs = input.body.trim().split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br />")}</p>`).join("\n");
  const citationList = input.citations.length > 0 ? `<h2>\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438</h2>
<ul>
${input.citations.map((line) => `  <li>${escapeHtml(line)}</li>`).join("\n")}
</ul>` : "";
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.title)}</title>
</head>
<body>
<h1>${escapeHtml(input.title)}</h1>
<p>\u0410\u0432\u0442\u043E\u0440: ${escapeHtml(input.author ?? "")}</p>
<p>\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F: ${escapeHtml(input.license ?? "all-rights-reserved")}</p>
${paragraphs}
${citationList}
</body>
</html>
`;
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderBibtex(input) {
  const lines2 = [];
  if (input.citations.length === 0) {
    lines2.push(`% Bibliography for: ${input.title}`);
    lines2.push(`% Author: ${input.author ?? ""}`);
    return `${lines2.join("\n")}
`;
  }
  input.citations.forEach((citation, index) => {
    const key = `${sanitizeBibtexKey(citation.source_id)}${index + 1}`;
    const year = Number.isFinite(citation.year) ? citation.year : "";
    lines2.push(`@misc{${key},`);
    lines2.push(`  author = {${citation.author}},`);
    lines2.push(`  title = {${citation.source_id}},`);
    if (year !== "") lines2.push(`  year = {${year}},`);
    if (citation.locator.trim()) lines2.push(`  note = {${citation.locator.trim()}},`);
    lines2.push("}");
    lines2.push("");
  });
  return `${lines2.join("\n").trimEnd()}
`;
}
function renderRis(input) {
  const lines2 = [];
  for (const citation of input.citations) {
    lines2.push("TY  - GEN");
    if (citation.author.trim()) lines2.push(`AU  - ${citation.author.trim()}`);
    lines2.push(`TI  - ${citation.source_id}`);
    if (Number.isFinite(citation.year)) lines2.push(`PY  - ${citation.year}`);
    if (citation.locator.trim()) lines2.push(`N1  - ${citation.locator.trim()}`);
    lines2.push("ER  -");
    lines2.push("");
  }
  if (input.citations.length === 0) {
    lines2.push(`% Bibliography for: ${input.title}`);
  }
  return `${lines2.join("\n").trimEnd()}
`;
}

// modules/author-studio/replay.ts
import { createHash as createHash2 } from "node:crypto";
function digest(value) {
  return createHash2("sha256").update(value, "utf8").digest("hex");
}
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  return `{${entries.join(",")}}`;
}
function stepFingerprint(kind, payload) {
  return digest(canonicalJson({ kind, payload }));
}
function runDigest(steps) {
  return digest(steps.map((step) => `${step.position}:${step.kind}:${step.fingerprint}`).join("\n"));
}
function parseSteps(raw) {
  const value = JSON.parse(raw);
  if (!Array.isArray(value)) throw new ValidationError("\u0417\u0430\u043F\u0438\u0441\u044C \u0440\u0435\u043F\u043B\u0435\u044F \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0430: \u0448\u0430\u0433\u0438 \u043D\u0435 \u043C\u0430\u0441\u0441\u0438\u0432");
  return value;
}
function parseReport(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function toRecord(row) {
  return {
    id: row.id,
    draft_id: row.draft_id,
    status: row.status,
    final_digest: row.final_digest,
    author: row.author,
    license: row.license,
    steps: parseSteps(row.steps),
    created_at: row.created_at,
    last_replay_at: row.last_replay_at,
    last_report: parseReport(row.last_report)
  };
}
function sourcesPayload(sources) {
  return { citations: sources };
}
var AuthorStudioReplayService = class {
  #db;
  #studio;
  constructor(db, studio) {
    this.#db = db;
    this.#studio = studio;
  }
  list(draftId) {
    this.#studio.get(draftId);
    const rows = this.#db.raw.prepare("SELECT * FROM author_studio_replays WHERE draft_id = ? ORDER BY created_at DESC").all(draftId);
    return rows.map(toRecord);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM author_studio_replays WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0417\u0430\u043F\u0438\u0441\u044C \u0440\u0435\u043F\u043B\u0435\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return toRecord(row);
  }
  /**
   * Запись прогона: снимок текущего сценария черновика в шаги. Экспортный шаг
   * вычисляется тем же кодом, что и настоящий экспорт, но созданная им строка
   * сразу удаляется — прогон не добавляет статей в профиль.
   */
  record(draftId, raw) {
    const draft = this.#studio.get(draftId);
    if (draft.kind !== "draft") {
      throw new ValidationError("\u041F\u0440\u043E\u0433\u043E\u043D \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430", {
        reason: "draft_required",
        item_id: draftId
      });
    }
    const input = raw === void 0 || raw === null ? {} : record(raw, "\u041F\u0440\u043E\u0433\u043E\u043D \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F");
    const author = text(input.author, "author", 200, true);
    const requestedLicense = text(input.license, "license", 200);
    const versions = this.#studio.versions(draftId);
    if (versions.length === 0) {
      throw new ConflictError("\u0417\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E: \u0443 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u0430 \u0432\u0435\u0440\u0441\u0438\u0438", {
        reason: "draft_version_required",
        draft_id: draftId
      });
    }
    const sources = this.#studio.sourceCards(draftId);
    const steps = [];
    const push = (kind, payload) => {
      steps.push({ position: steps.length + 1, kind, fingerprint: stepFingerprint(kind, payload), payload });
    };
    push("draft", { title: draft.title, body: draft.body });
    if (sources.length > 0) push("source", sourcesPayload(sources));
    push("version", { versions: versions.map((version) => ({ version: version.version, title: version.title, body: version.body })) });
    const exported = this.#studio.exportDraft(draftId, { author, license: requestedLicense || void 0 });
    this.#db.raw.prepare("DELETE FROM author_studio_exports WHERE id = ?").run(exported.id);
    push("export", { author: exported.author, license: exported.license, content: exported.content });
    const replay = {
      id: newId("replay"),
      draft_id: draftId,
      status: "recorded",
      final_digest: runDigest(steps),
      author: exported.author,
      license: exported.license,
      steps,
      created_at: systemClock.now().toISOString(),
      last_replay_at: null,
      last_report: null
    };
    this.#db.raw.prepare(`
      INSERT INTO author_studio_replays (id, draft_id, status, final_digest, author, license, steps, created_at, last_replay_at, last_report)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
    `).run(
      replay.id,
      replay.draft_id,
      replay.status,
      replay.final_digest,
      replay.author,
      replay.license,
      JSON.stringify(replay.steps),
      replay.created_at
    );
    return replay;
  }
  /**
   * Воспроизведение на чистом состоянии: объекты создаются заново из payload
   * шагов, отпечатки пересчитываются боевым кодом модуля, а созданное затем
   * удаляется — в профиле не остаётся ни статей, ни версий, ни экспортов.
   */
  replay(id) {
    const stored = this.get(id);
    for (const step of stored.steps) {
      const actual = stepFingerprint(step.kind, step.payload);
      if (actual !== step.fingerprint) {
        return this.#diverge(stored, {
          position: step.position,
          kind: step.kind,
          expected: step.fingerprint,
          actual
        });
      }
    }
    const created = { items: [], versions: [], exports: [] };
    let actualSteps = [];
    try {
      actualSteps = this.#execute(stored, created);
    } finally {
      const remove = (table, ids) => {
        const statement = this.#db.raw.prepare(`DELETE FROM ${table} WHERE id = ?`);
        for (const item of ids) statement.run(item);
      };
      remove("author_studio_exports", created.exports);
      remove("author_studio_versions", created.versions);
      remove("author_studio_items", created.items);
    }
    const mismatch = this.#compare(stored.steps, actualSteps);
    if (mismatch) return this.#diverge(stored, mismatch);
    const report = {
      match: true,
      steps: stored.steps.map((step) => ({
        position: step.position,
        kind: step.kind,
        fingerprint: step.fingerprint
      })),
      final_digest: runDigest(stored.steps),
      mismatch: null
    };
    this.#db.raw.prepare(`
      UPDATE author_studio_replays SET status = 'replayed', last_replay_at = ?, last_report = ? WHERE id = ?
    `).run(systemClock.now().toISOString(), JSON.stringify(report), stored.id);
    return this.get(stored.id);
  }
  #execute(stored, created) {
    const draftStep = stored.steps.find((step) => step.kind === "draft");
    const versionStep = stored.steps.find((step) => step.kind === "version");
    const sourceStep = stored.steps.find((step) => step.kind === "source");
    if (!draftStep || !versionStep) {
      throw new ValidationError("\u0417\u0430\u043F\u0438\u0441\u044C \u0440\u0435\u043F\u043B\u0435\u044F \u043D\u0435\u043F\u043E\u043B\u043D\u0430: \u043D\u0435\u0442 \u0448\u0430\u0433\u043E\u0432 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u0438\u043B\u0438 \u0432\u0435\u0440\u0441\u0438\u0439", {
        reason: "replay_incomplete",
        replay_id: stored.id
      });
    }
    const steps = [];
    const push = (kind, payload) => {
      steps.push({ position: steps.length + 1, kind, fingerprint: stepFingerprint(kind, payload), payload });
    };
    const draftPayload = draftStep.payload;
    const draft = this.#studio.create({
      kind: "draft",
      title: draftPayload.title,
      body: draftPayload.body
    });
    created.items.push(draft.id);
    push("draft", { title: draft.title, body: draft.body });
    const citations = sourceStep?.payload?.citations ?? [];
    for (const citation of citations) {
      const item = this.#studio.create({
        kind: "citation",
        title: `\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: ${String(citation.source_id)}`,
        metadata: { draft_id: draft.id, ...citation }
      });
      created.items.push(item.id);
    }
    if (citations.length > 0) push("source", sourcesPayload(this.#studio.sourceCards(draft.id)));
    const versions = versionStep.payload.versions ?? [];
    for (const version of versions) {
      this.#studio.update(draft.id, { title: version.title, body: version.body });
      const snapshot = this.#studio.snapshot(draft.id);
      created.versions.push(snapshot.id);
    }
    push("version", {
      versions: this.#studio.versions(draft.id).map((version) => ({
        version: version.version,
        title: version.title,
        body: version.body
      }))
    });
    const exported = this.#studio.exportDraft(draft.id, { author: stored.author, license: stored.license });
    created.exports.push(exported.id);
    push("export", { author: exported.author, license: exported.license, content: exported.content });
    return steps;
  }
  #compare(expected, actual) {
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      const want = expected[index];
      const got = actual[index];
      if (!want || !got || want.kind !== got.kind || want.fingerprint !== got.fingerprint) {
        return {
          position: want?.position ?? got?.position ?? index + 1,
          kind: want?.kind ?? got?.kind ?? "export",
          expected: want?.fingerprint ?? "",
          actual: got?.fingerprint ?? ""
        };
      }
    }
    return null;
  }
  #diverge(stored, mismatch) {
    const report = {
      match: false,
      steps: stored.steps.map((step) => ({
        position: step.position,
        kind: step.kind,
        fingerprint: step.fingerprint
      })),
      final_digest: stored.final_digest,
      mismatch
    };
    this.#db.raw.prepare(`
      UPDATE author_studio_replays SET status = 'diverged', last_replay_at = ?, last_report = ? WHERE id = ?
    `).run(systemClock.now().toISOString(), JSON.stringify(report), stored.id);
    throw new ConflictError(
      `\u0420\u0435\u043F\u043B\u0435\u0439 \u0440\u0430\u0437\u043E\u0448\u0451\u043B\u0441\u044F \u043D\u0430 \u0448\u0430\u0433\u0435 ${mismatch.position} (${mismatch.kind})`,
      {
        reason: "replay_mismatch",
        replay_id: stored.id,
        step: { position: mismatch.position, kind: mismatch.kind },
        expected: mismatch.expected,
        actual: mismatch.actual,
        final_digest: stored.final_digest
      }
    );
  }
};

// modules/author-studio/routes.ts
function requiredId(value) {
  if (!value) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D id \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430");
  return value;
}
function registerAuthorStudioRoutes(router, studio, replays) {
  router.add("GET", "/api/author-studio/items", (c) => ({
    body: {
      ok: true,
      items: studio.list(
        c.query.get("kind"),
        c.query.get("q") ?? "",
        integer(c.query.get("limit"), "limit", 1, 200, 50)
      )
    }
  }));
  router.add("POST", "/api/author-studio/items", (c) => ({
    status: 201,
    body: { ok: true, item: studio.create(c.body) }
  }));
  router.add("GET", "/api/author-studio/items/:id", (c) => ({
    body: { ok: true, item: studio.get(requiredId(c.params.id)) }
  }));
  router.add("PATCH", "/api/author-studio/items/:id", (c) => ({
    body: { ok: true, item: studio.update(requiredId(c.params.id), c.body) }
  }));
  router.add("DELETE", "/api/author-studio/items/:id", (c) => ({
    body: { ok: true, ...studio.remove(requiredId(c.params.id)) }
  }));
  router.add("POST", "/api/author-studio/templates/:id/instantiate", (c) => ({
    status: 201,
    body: { ok: true, item: studio.instantiateTemplate(requiredId(c.params.id), c.body) }
  }));
  router.add("POST", "/api/author-studio/drafts/:id/versions", (c) => ({
    status: 201,
    body: { ok: true, version: studio.snapshot(requiredId(c.params.id)) }
  }));
  router.add("GET", "/api/author-studio/drafts/:id/versions", (c) => {
    const id = requiredId(c.params.id);
    return {
      body: { ok: true, items: studio.versions(id) }
    };
  });
  router.add("GET", "/api/author-studio/versions/:id", (c) => ({
    body: { ok: true, version: studio.version(requiredId(c.params.id)) }
  }));
  router.add("GET", "/api/author-studio/versions/:id/verify", (c) => ({
    body: { ok: true, check: studio.verifyVersion(requiredId(c.params.id)) }
  }));
  router.add("GET", "/api/author-studio/versions/:id/diff/:other", (c) => ({
    body: { ok: true, diff: studio.diffVersions(requiredId(c.params.id), requiredId(c.params.other)) }
  }));
  router.add("POST", "/api/author-studio/links", (c) => ({
    status: 201,
    body: { ok: true, link: studio.link(c.body) }
  }));
  router.add("GET", "/api/author-studio/items/:id/links", (c) => ({
    body: { ok: true, ...studio.linksOf(requiredId(c.params.id)) }
  }));
  router.add("GET", "/api/author-studio/drafts/:id/read", (c) => ({
    body: {
      ok: true,
      view: studio.readDraft(requiredId(c.params.id), c.query.get("version") ?? void 0)
    }
  }));
  router.add("POST", "/api/author-studio/drafts/:id/replays", (c) => ({
    status: 201,
    body: { ok: true, replay: replays.record(requiredId(c.params.id), c.body) }
  }));
  router.add("GET", "/api/author-studio/drafts/:id/replays", (c) => ({
    body: { ok: true, items: replays.list(requiredId(c.params.id)) }
  }));
  router.add("GET", "/api/author-studio/replays/:id", (c) => ({
    body: { ok: true, replay: replays.get(requiredId(c.params.id)) }
  }));
  router.add("POST", "/api/author-studio/replays/:id/replay", (c) => ({
    body: { ok: true, replay: replays.replay(requiredId(c.params.id)) }
  }));
  router.add("GET", "/api/author-studio/metrics", () => ({
    body: { ok: true, metrics: studio.metrics() }
  }));
  router.add("POST", "/api/author-studio/drafts/:id/export", (c) => ({
    status: 201,
    body: { ok: true, export: studio.exportDraft(requiredId(c.params.id), c.body) }
  }));
  router.add("GET", "/api/author-studio/exports/:id", (c) => ({
    body: { ok: true, export: studio.exportById(requiredId(c.params.id)) }
  }));
}

// modules/author-studio/schema.ts
var authorStudioMigrations = [
  {
    version: "author-studio/0001_items",
    sql: `
      CREATE TABLE author_studio_items (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('note', 'template', 'citation', 'asset', 'draft')),
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX author_studio_items_kind ON author_studio_items (kind, updated_at DESC);
    `
  },
  {
    version: "author-studio/0002_versions_exports",
    sql: `
      CREATE TABLE author_studio_versions (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        digest TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (draft_id, version)
      );
      CREATE INDEX author_studio_versions_draft ON author_studio_versions (draft_id, version DESC);

      CREATE TABLE author_studio_exports (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL,
        version_id TEXT NOT NULL,
        format TEXT NOT NULL,
        author TEXT NOT NULL,
        license TEXT NOT NULL,
        digest TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX author_studio_exports_draft ON author_studio_exports (draft_id, created_at DESC);
    `
  },
  {
    version: "author-studio/0003_links",
    sql: `
      CREATE TABLE author_studio_links (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('references', 'derived-from', 'related')),
        created_at TEXT NOT NULL,
        UNIQUE (from_id, to_id, kind)
      );
      CREATE INDEX author_studio_links_from ON author_studio_links (from_id, created_at DESC);
      CREATE INDEX author_studio_links_to ON author_studio_links (to_id, created_at DESC);
    `
  },
  {
    version: "author-studio/0004_replays",
    sql: `
      CREATE TABLE author_studio_replays (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('recorded', 'replayed', 'diverged')),
        final_digest TEXT NOT NULL,
        author TEXT NOT NULL,
        license TEXT NOT NULL,
        steps TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_replay_at TEXT,
        last_report TEXT
      );
      CREATE INDEX author_studio_replays_draft ON author_studio_replays (draft_id, created_at DESC);
    `
  }
];

// modules/author-studio/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0421\u0442\u0443\u0434\u0438\u044F \u0430\u0432\u0442\u043E\u0440\u0430 \u2014 \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439 \u0432\u0438\u0434</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #d0d7de; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #0969da; font-size: 13px; text-decoration: none; }
  main { padding: 24px; max-width: 980px; }
  .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin-bottom: 16px; }
  label { display: grid; gap: 4px; font-size: 13px; color: #57606a; }
  select { font: inherit; padding: 7px 10px; border: 1px solid #d0d7de; border-radius: 8px; min-width: 220px; }
  button { font: inherit; cursor: pointer; }
  .button { border: 1px solid #d0d7de; background: #f6f8fa; border-radius: 8px; padding: 8px 12px; }
  .button.primary { background: #0969da; color: #fff; border-color: #0969da; }
  .button:disabled { opacity: .5; cursor: default; }
  .status { min-height: 1.5em; color: #57606a; }
  .status.error { color: #cf222e; }
  .mono { font-family: ui-monospace, Consolas, monospace; font-size: 12px; word-break: break-all; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .pill { border: 1px solid #d0d7de; border-radius: 999px; padding: 2px 10px; font-size: 12px; color: #57606a; }
  .pill.readonly { border-color: #1a7f37; color: #1a7f37; }
  article { border: 1px solid #d0d7de; border-radius: 12px; padding: 24px; }
  article h1 { margin: 0 0 16px; font-size: 26px; line-height: 1.25; }
  article p { margin: 0 0 14px; }
  article h2 { margin: 24px 0 8px; font-size: 16px; }
  article ul { margin: 0; padding-left: 20px; }
  .empty { color: #57606a; padding: 16px 0; }
</style>
</head>
<body>
<header>
  <h1>\u0421\u0442\u0443\u0434\u0438\u044F \u0430\u0432\u0442\u043E\u0440\u0430 \u2014 \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439 \u0432\u0438\u0434</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <div class="controls">
    <label for="drafts">\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A
      <select id="drafts"></select>
    </label>
    <label for="versions">\u0421\u043D\u0438\u043C\u043E\u043A \u0432\u0435\u0440\u0441\u0438\u0438
      <select id="versions"></select>
    </label>
    <button class="button primary" type="button" id="show">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u043D\u0438\u043C\u043E\u043A</button>
    <button class="button" type="button" id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button>
  </div>
  <div class="status" id="status"></div>
  <div id="view"></div>
</main>
<script>
const API = '/api/author-studio';
const statusEl = document.getElementById('status');
const draftsEl = document.getElementById('drafts');
const versionsEl = document.getElementById('versions');
const showButton = document.getElementById('show');
const viewEl = document.getElementById('view');

function say(message, error) {
  statusEl.textContent = message;
  statusEl.className = error ? 'status error' : 'status';
}

/** \u0422\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u0435\u043D\u0438\u0435: \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u0443\u043C\u0435\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u043D\u0438\u0447\u0435\u0433\u043E, \u043A\u0440\u043E\u043C\u0435 GET. */
async function get(path) {
  const response = await fetch(API + path, { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body.error || {};
    const reason = error.details && error.details.reason;
    const message = error.message || ('HTTP ' + response.status);
    throw new Error(reason ? message + ' (' + reason + ')' : message);
  }
  return body;
}

function option(value, text) {
  const item = document.createElement('option');
  item.value = value;
  item.textContent = text;
  return item;
}

function empty(text) {
  viewEl.innerHTML = '';
  const note = document.createElement('p');
  note.className = 'empty';
  note.textContent = text;
  viewEl.append(note);
}

function render(view) {
  viewEl.innerHTML = '';
  const meta = document.createElement('div');
  meta.className = 'meta';
  const add = (text, extra) => {
    const pill = document.createElement('span');
    pill.className = extra ? 'pill ' + extra : 'pill';
    pill.textContent = text;
    meta.append(pill);
  };
  add(view.read_only ? '\u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u0435\u043D\u0438\u0435' : '\u0438\u0437\u043C\u0435\u043D\u044F\u0435\u043C\u044B\u0439 \u0432\u0438\u0434', 'readonly');
  add('\u0432\u0435\u0440\u0441\u0438\u044F ' + view.version);
  add('\u0441\u043D\u0438\u043C\u043E\u043A ' + view.version_id);
  const digest = document.createElement('span');
  digest.className = 'pill mono';
  digest.textContent = 'sha256 ' + String(view.digest || '').slice(0, 16) + '\u2026';
  digest.title = '\u041E\u0442\u043F\u0435\u0447\u0430\u0442\u043E\u043A \u0441\u043D\u0438\u043C\u043A\u0430: ' + (view.digest || '');
  meta.append(digest);

  const article = document.createElement('article');
  article.id = 'reader';
  const title = document.createElement('h1');
  title.id = 'reader-title';
  title.textContent = view.title;
  article.append(title);
  const body = document.createElement('div');
  body.id = 'reader-body';
  for (const paragraph of view.paragraphs) {
    const node = document.createElement('p');
    node.textContent = paragraph;
    body.append(node);
  }
  article.append(body);
  if (view.sources.length > 0) {
    const heading = document.createElement('h2');
    heading.textContent = '\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438';
    const list = document.createElement('ul');
    list.id = 'reader-sources';
    for (const source of view.sources) {
      const node = document.createElement('li');
      node.textContent = source;
      list.append(node);
    }
    article.append(heading, list);
  }
  viewEl.append(meta, article);
  say('\u0421\u043D\u0438\u043C\u043E\u043A v' + view.version + ': \u0430\u0431\u0437\u0430\u0446\u0435\u0432 ' + view.paragraphs.length
    + ', \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 ' + view.sources.length + '. \u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0435\u0433\u043E.');
}

async function show(versionId) {
  const draftId = draftsEl.value;
  if (!draftId) {
    say('\u041D\u0435\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F', true);
    return;
  }
  const query = versionId ? '?version=' + encodeURIComponent(versionId) : '';
  showButton.disabled = true;
  try {
    const data = await get('/drafts/' + encodeURIComponent(draftId) + '/read' + query);
    render(data.view);
  } catch (error) {
    viewEl.innerHTML = '';
    say(error.message, true);
  } finally {
    showButton.disabled = false;
  }
}

async function loadVersions() {
  const draftId = draftsEl.value;
  versionsEl.innerHTML = '';
  if (!draftId) {
    versionsEl.append(option('', '\u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u043E\u0432'));
    versionsEl.disabled = true;
    empty('\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442: \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0438 \u0441\u043D\u0438\u043C\u043E\u043A \u0432\u0435\u0440\u0441\u0438\u0438 \u0432 API \u0441\u0442\u0443\u0434\u0438\u0438.');
    return;
  }
  try {
    const data = await get('/drafts/' + encodeURIComponent(draftId) + '/versions');
    const items = data.items || [];
    if (items.length === 0) {
      versionsEl.append(option('', '\u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u043E\u0432'));
      versionsEl.disabled = true;
      empty('\u0423 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u0435\u0449\u0451 \u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u0430 \u0432\u0435\u0440\u0441\u0438\u0438 \u2014 \u0447\u0438\u0442\u0430\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E. \u0421\u043D\u0438\u043C\u043E\u043A \u0441\u043E\u0437\u0434\u0430\u0451\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u043C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435\u043C.');
      return;
    }
    versionsEl.disabled = false;
    for (const version of items) {
      versionsEl.append(option(
        version.id,
        'v' + version.version + ' \xB7 ' + String(version.digest || '').slice(0, 12) + '\u2026',
      ));
    }
    versionsEl.value = items[items.length - 1].id;
  } catch (error) {
    say(error.message, true);
    return;
  }
  await show(versionsEl.value);
}

async function loadDrafts() {
  try {
    const data = await get('/items?kind=draft&limit=200');
    const items = data.items || [];
    draftsEl.innerHTML = '';
    if (items.length === 0) {
      draftsEl.append(option('', '\u043D\u0435\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u043E\u0432'));
      draftsEl.disabled = true;
      versionsEl.innerHTML = '';
      versionsEl.append(option('', '\u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u043E\u0432'));
      versionsEl.disabled = true;
      empty('\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442: \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0438 \u0441\u043D\u0438\u043C\u043E\u043A \u0432\u0435\u0440\u0441\u0438\u0438 \u0432 API \u0441\u0442\u0443\u0434\u0438\u0438.');
      say('\u0421\u0442\u0443\u0434\u0438\u044F \u043F\u0443\u0441\u0442\u0430');
      return;
    }
    draftsEl.disabled = false;
    for (const item of items) draftsEl.append(option(item.id, item.title));
    say('\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u043E\u0432: ' + items.length);
  } catch (error) {
    say(error.message, true);
    return;
  }
  await loadVersions();
}

draftsEl.onchange = loadVersions;
versionsEl.onchange = () => show(versionsEl.value);
showButton.onclick = () => show(versionsEl.value);
document.getElementById('refresh').onclick = loadDrafts;
loadDrafts();
</script>
</body>
</html>`;

// modules/author-studio/index.ts
var module = {
  id: "author-studio",
  apiVersion: 1,
  migrations: authorStudioMigrations,
  register(ctx) {
    const studio = new AuthorStudioService(ctx.storage);
    const replays = new AuthorStudioReplayService(ctx.storage, studio);
    registerAuthorStudioRoutes(ctx.api, studio, replays);
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
