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

// team-host-api:src/kernel/clock.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var fixedClock = host2["fixedClock"];
var nextTimestamp = host2["nextTimestamp"];
var systemClock = host2["systemClock"];

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

// modules/peer-review/service.ts
var TARGET_KINDS = ["draft", "citation", "note", "document"];
var STATUSES = ["open", "reviewed", "responded", "closed"];
var VERDICTS = ["accept", "minor_revision", "major_revision", "reject"];
var SEVERITIES = ["blocking", "major", "minor", "note"];
var DECISIONS = ["accepted", "rejected", "discussed"];
var PEER_REVIEW_LIMITS = {
  max_requests: 500,
  max_reviews_per_request: 20,
  max_comments_per_review: 50,
  max_text_chars: 8e3
};
var REQUEST_FIELDS = `id, target_kind, target_id, target_label, title, question, reviewer, due_at,
  status, close_reason, created_at, updated_at`;
function fieldText(raw, name, max, code, options = {}) {
  if (raw === void 0 || raw === null) {
    if (options.required) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${name}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E`, { field: name }, { code });
    return "";
  }
  if (typeof raw !== "string") {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${name}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`, { field: name }, { code });
  }
  const value = raw.trim();
  if (options.required && !value) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${name}\xBB \u043F\u0443\u0441\u0442\u043E\u0435`, { field: name }, { code });
  }
  if (value.length > max) {
    throw new AppError(
      options.limitCode ?? "peer_review_too_large",
      `\u041F\u043E\u043B\u0435 \xAB${name}\xBB \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${max} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`,
      413,
      { field: name, length: value.length, max }
    );
  }
  return value;
}
function enumField(raw, name, allowed, code, fallback) {
  if (raw === void 0 || raw === null) {
    if (fallback !== void 0) return fallback;
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${name}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E: ${allowed.join(", ")}`, { field: name }, { code });
  }
  const value = String(raw);
  if (!allowed.includes(value)) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${name}\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E ${allowed.join(", ")}`, { field: name, value }, { code });
  }
  return value;
}
function optionalEnum(raw, name, allowed, code) {
  if (raw === void 0 || raw === null || raw === "") return void 0;
  return enumField(raw, name, allowed, code);
}
function requestIdOf(raw) {
  return entityId(raw, "review", "peer_review_id_invalid");
}
function entityId(raw, prefix, code) {
  const id = text(raw, "id", 80, true);
  if (!new RegExp(`^${prefix}_[a-z0-9]{8,32}$`, "i").test(id)) {
    throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440", { id }, { code });
  }
  return id;
}
function dueAtOf(raw) {
  const value = fieldText(raw, "due_at", 40, "peer_review_due_invalid");
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABdue_at\xBB: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u0434\u0430\u0442\u0430 ISO 8601", { value }, {
      code: "peer_review_due_invalid"
    });
  }
  return new Date(parsed).toISOString();
}
function commentsOf(raw) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABcomments\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C", {}, { code: "peer_review_comments_invalid" });
  }
  if (raw.length > PEER_REVIEW_LIMITS.max_comments_per_review) {
    throw new AppError(
      "peer_review_comments_too_many",
      `\u0417\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0439 \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${PEER_REVIEW_LIMITS.max_comments_per_review}`,
      400,
      { comments: raw.length, max: PEER_REVIEW_LIMITS.max_comments_per_review }
    );
  }
  return raw.map((item, index) => {
    const body = record(item, `comments[${index}]`);
    const locator = fieldText(body.locator, `comments[${index}].locator`, 200, "peer_review_comment_invalid");
    return {
      severity: enumField(body.severity, `comments[${index}].severity`, SEVERITIES, "peer_review_severity_invalid", "minor"),
      text: fieldText(body.text, `comments[${index}].text`, 4e3, "peer_review_comment_invalid", { required: true }),
      locator: locator || null
    };
  });
}
var PeerReviewService = class {
  #db;
  #log;
  #clock;
  constructor(deps) {
    this.#db = deps.db;
    this.#log = deps.log.child({ module: "peer-review" });
    this.#clock = deps.clock ?? systemClock;
  }
  /** Запрос замечаний к существующему элементу студии автора. */
  createRequest(raw) {
    const body = raw === void 0 || raw === null ? {} : record(raw, "\u0437\u0430\u043F\u0440\u043E\u0441 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438");
    const title = fieldText(body.title, "title", 200, "peer_review_title_invalid", { required: true });
    const targetKind = enumField(body.target_kind, "target_kind", TARGET_KINDS, "peer_review_target_kind_invalid");
    const targetId = fieldText(body.target_id, "target_id", 120, "peer_review_target_invalid", { required: true });
    const targetLabel = fieldText(body.target_label, "target_label", 200, "peer_review_target_invalid");
    const question = fieldText(body.question, "question", PEER_REVIEW_LIMITS.max_text_chars, "peer_review_question_invalid", {
      required: true
    });
    const reviewer = fieldText(body.reviewer, "reviewer", 120, "peer_review_reviewer_invalid");
    const dueAt = dueAtOf(body.due_at);
    const presence = this.#targetPresence(targetKind, targetId);
    if (presence === null) {
      throw new AppError(
        "peer_review_target_unresolved",
        "\u041C\u043E\u0434\u0443\u043B\u044C \xABauthor-studio\xBB \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D: \u0430\u0434\u0440\u0435\u0441\u0430\u0442\u0430 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C",
        409,
        { target_kind: targetKind, target_id: targetId, module: "author-studio" }
      );
    }
    if (!presence) {
      throw new AppError("peer_review_target_missing", "\u042D\u043B\u0435\u043C\u0435\u043D\u0442, \u043A \u043A\u043E\u0442\u043E\u0440\u043E\u043C\u0443 \u043F\u0440\u043E\u0441\u044F\u0442 \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u044F, \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", 404, {
        target_kind: targetKind,
        target_id: targetId
      });
    }
    const total = Number(this.#db.raw.prepare("SELECT count(*) AS n FROM peer_review_requests").get().n);
    if (total >= PEER_REVIEW_LIMITS.max_requests) {
      throw new AppError(
        "peer_review_quota_exceeded",
        `\u0412 \u043F\u0440\u043E\u0444\u0438\u043B\u0435 \u0443\u0436\u0435 ${total} \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438: \u043F\u0440\u0435\u0434\u0435\u043B ${PEER_REVIEW_LIMITS.max_requests}`,
        409,
        { requests: total, max: PEER_REVIEW_LIMITS.max_requests }
      );
    }
    const now = this.#now();
    const row = {
      id: newId("review"),
      target_kind: targetKind,
      target_id: targetId,
      target_label: targetLabel || null,
      title,
      question,
      reviewer: reviewer || null,
      due_at: dueAt,
      status: "open",
      close_reason: null,
      created_at: now,
      updated_at: now
    };
    this.#db.raw.prepare(
      `INSERT INTO peer_review_requests (${REQUEST_FIELDS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      row.id,
      row.target_kind,
      row.target_id,
      row.target_label,
      row.title,
      row.question,
      row.reviewer,
      row.due_at,
      row.status,
      row.close_reason,
      row.created_at,
      row.updated_at
    );
    this.#log.info("\u0417\u0430\u043F\u0440\u043E\u0441 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438 \u0441\u043E\u0437\u0434\u0430\u043D", { id: row.id, target_kind: row.target_kind });
    return this.#requestView(row);
  }
  list(query = "", status = void 0, limit = 20) {
    const q = text(query, "q", 200);
    const bounded = integer(limit, "limit", 1, 100, 20);
    const statusFilter = optionalEnum(status, "status", STATUSES, "peer_review_status_invalid");
    const clauses = [];
    const params = [];
    if (statusFilter) {
      clauses.push("status = ?");
      params.push(statusFilter);
    }
    if (q) {
      clauses.push("(title LIKE ? OR COALESCE(target_label, '') LIKE ? OR question LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = Number(this.#db.raw.prepare(
      `SELECT count(*) AS n FROM peer_review_requests ${where}`
    ).get(...params).n);
    const rows = this.#db.raw.prepare(
      `SELECT ${REQUEST_FIELDS} FROM peer_review_requests ${where}
       ORDER BY updated_at DESC, id DESC LIMIT ?`
    ).all(...params, bounded);
    return { requests: rows.map((row) => this.#row(row)), total, limit: bounded };
  }
  get(rawId) {
    return this.#requestView(this.#mustFindRequest(rawId));
  }
  /** Рецензия: вердикт, сводка и замечания. Отправленная рецензия неизменяема. */
  submitReview(rawRequestId, raw) {
    const request = this.#mustFindRequest(rawRequestId);
    this.#assertOpen(request);
    const body = raw === void 0 || raw === null ? {} : record(raw, "\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044F");
    const verdict = enumField(body.verdict, "verdict", VERDICTS, "peer_review_verdict_invalid");
    const summary = fieldText(body.summary, "summary", PEER_REVIEW_LIMITS.max_text_chars, "peer_review_summary_invalid", {
      required: true
    });
    const reviewer = fieldText(body.reviewer, "reviewer", 120, "peer_review_reviewer_invalid", { required: true });
    const comments = commentsOf(body.comments);
    const duplicate = this.#db.raw.prepare(
      "SELECT id FROM peer_review_reviews WHERE request_id = ? AND reviewer = ?"
    ).get(request.id, reviewer);
    if (duplicate) {
      throw new ConflictError("\u042D\u0442\u043E\u0442 \u0440\u0435\u0446\u0435\u043D\u0437\u0435\u043D\u0442 \u0443\u0436\u0435 \u043E\u0441\u0442\u0430\u0432\u0438\u043B \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E", {
        reason: "review_exists",
        request_id: request.id,
        review_id: duplicate.id,
        reviewer
      });
    }
    const count = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM peer_review_reviews WHERE request_id = ?"
    ).get(request.id).n);
    if (count >= PEER_REVIEW_LIMITS.max_reviews_per_request) {
      throw new ConflictError("\u041A \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \u0443\u0436\u0435 \u0441\u043E\u0431\u0440\u0430\u043D\u043E \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0439", {
        reason: "reviews_limit",
        request_id: request.id,
        max: PEER_REVIEW_LIMITS.max_reviews_per_request
      });
    }
    const now = this.#now();
    const row = {
      id: newId("feedback"),
      request_id: request.id,
      verdict,
      summary,
      reviewer,
      comments: JSON.stringify(comments),
      created_at: now
    };
    this.#db.raw.prepare(
      "INSERT INTO peer_review_reviews (id, request_id, verdict, summary, reviewer, comments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(row.id, row.request_id, row.verdict, row.summary, row.reviewer, row.comments, row.created_at);
    this.#setStatus(request, "reviewed", now);
    this.#log.info("\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430", { request_id: request.id, review_id: row.id, verdict });
    return this.#reviewView(row);
  }
  /** Ответ автора на конкретную рецензию: принято, отклонено или обсуждение. */
  respond(rawReviewId, raw) {
    const reviewId = entityId(rawReviewId, "feedback", "peer_review_review_id_invalid");
    const review = this.#db.raw.prepare(
      "SELECT * FROM peer_review_reviews WHERE id = ?"
    ).get(reviewId);
    if (!review) {
      throw new AppError("peer_review_review_not_found", `\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u044F \xAB${reviewId}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`, 404, { id: reviewId });
    }
    const request = this.#mustFindRequest(review.request_id);
    this.#assertOpen(request);
    const existing = this.#db.raw.prepare(
      "SELECT id FROM peer_review_responses WHERE review_id = ?"
    ).get(review.id);
    if (existing) {
      throw new ConflictError("\u041D\u0430 \u044D\u0442\u0443 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E \u0430\u0432\u0442\u043E\u0440 \u0443\u0436\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B", {
        reason: "response_exists",
        review_id: review.id,
        response_id: existing.id
      });
    }
    const body = raw === void 0 || raw === null ? {} : record(raw, "\u043E\u0442\u0432\u0435\u0442 \u0430\u0432\u0442\u043E\u0440\u0430");
    const decision = enumField(body.decision, "decision", DECISIONS, "peer_review_decision_invalid");
    const textValue = fieldText(body.text, "text", PEER_REVIEW_LIMITS.max_text_chars, "peer_review_response_invalid", {
      required: true
    });
    const now = this.#now();
    const row = {
      id: newId("reply"),
      request_id: request.id,
      review_id: review.id,
      decision,
      body: textValue,
      created_at: now
    };
    this.#db.raw.prepare(
      "INSERT INTO peer_review_responses (id, request_id, review_id, decision, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(row.id, row.request_id, row.review_id, row.decision, row.body, row.created_at);
    this.#setStatus(request, "responded", now);
    this.#log.info("\u041E\u0442\u0432\u0435\u0442 \u0430\u0432\u0442\u043E\u0440\u0430 \u0437\u0430\u043F\u0438\u0441\u0430\u043D", { request_id: request.id, review_id: review.id, decision });
    return {
      response: this.#responseView(row),
      request: this.#requestView(this.#mustFindRequest(request.id))
    };
  }
  /** Закрытие запроса: причина обязательна, закрытый запрос больше не меняется. */
  close(rawId, raw) {
    const request = this.#mustFindRequest(rawId);
    this.#assertOpen(request);
    const body = raw === void 0 || raw === null ? {} : record(raw, "\u0437\u0430\u043A\u0440\u044B\u0442\u0438\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u0430");
    const reason = fieldText(body.reason, "reason", 500, "peer_review_reason_invalid", { required: true });
    const now = this.#now();
    this.#db.raw.prepare(
      "UPDATE peer_review_requests SET status = ?, close_reason = ?, updated_at = ? WHERE id = ?"
    ).run("closed", reason, now, request.id);
    this.#log.info("\u0417\u0430\u043F\u0440\u043E\u0441 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438 \u0437\u0430\u043A\u0440\u044B\u0442", { id: request.id });
    return this.#requestView(this.#mustFindRequest(request.id));
  }
  remove(rawId) {
    const request = this.#mustFindRequest(rawId);
    const reviewsRemoved = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM peer_review_reviews WHERE request_id = ?"
    ).get(request.id).n);
    const responsesRemoved = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM peer_review_responses WHERE request_id = ?"
    ).get(request.id).n);
    this.#db.raw.prepare("DELETE FROM peer_review_responses WHERE request_id = ?").run(request.id);
    this.#db.raw.prepare("DELETE FROM peer_review_reviews WHERE request_id = ?").run(request.id);
    this.#db.raw.prepare("DELETE FROM peer_review_requests WHERE id = ?").run(request.id);
    const remaining = Number(this.#db.raw.prepare("SELECT count(*) AS n FROM peer_review_requests").get().n);
    this.#log.info("\u0417\u0430\u043F\u0440\u043E\u0441 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438 \u0443\u0434\u0430\u043B\u0451\u043D", {
      id: request.id,
      reviews: reviewsRemoved,
      responses: responsesRemoved
    });
    return {
      removed: this.#row(request),
      reviews_removed: reviewsRemoved,
      responses_removed: responsesRemoved,
      remaining
    };
  }
  summary() {
    const requests = Number(this.#db.raw.prepare("SELECT count(*) AS n FROM peer_review_requests").get().n);
    const byStatus = {};
    for (const row of this.#db.raw.prepare(
      "SELECT status, count(*) AS n FROM peer_review_requests GROUP BY status"
    ).all()) {
      byStatus[row.status] = Number(row.n);
    }
    const reviews = Number(this.#db.raw.prepare("SELECT count(*) AS n FROM peer_review_reviews").get().n);
    const responses = Number(this.#db.raw.prepare("SELECT count(*) AS n FROM peer_review_responses").get().n);
    const byVerdict = {};
    for (const row of this.#db.raw.prepare(
      "SELECT verdict, count(*) AS n FROM peer_review_reviews GROUP BY verdict"
    ).all()) {
      byVerdict[row.verdict] = Number(row.n);
    }
    const last = this.#db.raw.prepare(
      "SELECT MAX(updated_at) AS latest FROM peer_review_requests"
    ).get().latest;
    return {
      requests,
      by_status: byStatus,
      reviews,
      responses,
      by_verdict: byVerdict,
      last_activity_at: last,
      limits: PEER_REVIEW_LIMITS
    };
  }
  #assertOpen(request) {
    if (request.status === "closed") {
      throw new AppError("peer_review_closed", "\u0417\u0430\u043F\u0440\u043E\u0441 \u0437\u0430\u043A\u0440\u044B\u0442: \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438 \u0438 \u043E\u0442\u0432\u0435\u0442\u044B \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u044E\u0442\u0441\u044F", 409, {
        id: request.id,
        close_reason: request.close_reason
      });
    }
  }
  #setStatus(request, status, now) {
    this.#db.raw.prepare(
      "UPDATE peer_review_requests SET status = ?, updated_at = ? WHERE id = ?"
    ).run(status, now, request.id);
  }
  #mustFindRequest(rawId) {
    const id = requestIdOf(rawId);
    const row = this.#db.raw.prepare(
      `SELECT ${REQUEST_FIELDS} FROM peer_review_requests WHERE id = ?`
    ).get(id);
    if (!row) {
      throw new AppError("peer_review_not_found", `\u0417\u0430\u043F\u0440\u043E\u0441 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438 \xAB${id}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`, 404, { id });
    }
    return row;
  }
  /**
   * Наличие адресата проверяется по таблице студии автора: у неё нет
   * опубликованного сервиса поиска, а «рецензия к удалённому черновику» должна
   * быть видна как таковая. `null` — студия не установлена, проверить нечем.
   */
  #targetPresence(kind, targetId) {
    const table = this.#db.raw.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'author_studio_items'"
    ).get();
    if (!table) return null;
    const kinds = kind === "document" ? ["draft", "note", "citation", "asset"] : [kind];
    const placeholders = kinds.map(() => "?").join(", ");
    const row = this.#db.raw.prepare(
      `SELECT id FROM author_studio_items WHERE id = ? AND kind IN (${placeholders})`
    ).get(targetId, ...kinds);
    return row !== void 0;
  }
  #row(row) {
    const reviews = this.#reviews(row.id);
    const responses = reviews.filter((review) => review.response !== null).length;
    return {
      id: row.id,
      target_kind: row.target_kind,
      target_id: row.target_id,
      target_label: row.target_label,
      title: row.title,
      question: row.question,
      reviewer: row.reviewer,
      due_at: row.due_at,
      status: row.status,
      reviews_count: reviews.length,
      responses_count: responses,
      last_verdict: reviews.length ? reviews[reviews.length - 1].verdict : null,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  #requestView(row) {
    return {
      ...this.#row(row),
      close_reason: row.close_reason,
      reviews: this.#reviews(row.id),
      target_present: this.#targetPresence(row.target_kind, row.target_id)
    };
  }
  #reviews(requestId) {
    const rows = this.#db.raw.prepare(
      "SELECT * FROM peer_review_reviews WHERE request_id = ? ORDER BY created_at, id"
    ).all(requestId);
    return rows.map((row) => this.#reviewView(row));
  }
  #reviewView(row) {
    const response = this.#db.raw.prepare(
      "SELECT * FROM peer_review_responses WHERE review_id = ?"
    ).get(row.id);
    return {
      id: row.id,
      request_id: row.request_id,
      verdict: row.verdict,
      summary: row.summary,
      reviewer: row.reviewer,
      comments: this.#comments(row.comments),
      created_at: row.created_at,
      response: response ? this.#responseView(response) : null
    };
  }
  #responseView(row) {
    return {
      id: row.id,
      review_id: row.review_id,
      decision: row.decision,
      text: row.body,
      created_at: row.created_at
    };
  }
  #comments(raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item !== null && typeof item === "object" && typeof item.text === "string" && SEVERITIES.includes(item.severity));
    } catch {
      return [];
    }
  }
  #now() {
    const previous = this.#db.raw.prepare(
      "SELECT MAX(updated_at) AS latest FROM peer_review_requests"
    ).get().latest;
    return nextTimestamp(previous, this.#clock.now());
  }
};

// modules/peer-review/schema.ts
var peerReviewMigrations = [
  {
    version: "peer-review/1_reviews",
    sql: `
      CREATE TABLE peer_review_requests (
        id TEXT PRIMARY KEY,
        target_kind TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_label TEXT,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        reviewer TEXT,
        due_at TEXT,
        status TEXT NOT NULL,
        close_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_peer_review_requests_status ON peer_review_requests (status);
      CREATE INDEX idx_peer_review_requests_target ON peer_review_requests (target_kind, target_id);
      CREATE INDEX idx_peer_review_requests_updated ON peer_review_requests (updated_at);

      CREATE TABLE peer_review_reviews (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL REFERENCES peer_review_requests(id) ON DELETE CASCADE,
        verdict TEXT NOT NULL,
        summary TEXT NOT NULL,
        reviewer TEXT NOT NULL,
        comments TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (request_id, reviewer)
      );
      CREATE INDEX idx_peer_review_reviews_request ON peer_review_reviews (request_id);

      CREATE TABLE peer_review_responses (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        review_id TEXT NOT NULL REFERENCES peer_review_reviews(id) ON DELETE CASCADE,
        decision TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (review_id)
      );
      CREATE INDEX idx_peer_review_responses_request ON peer_review_responses (request_id);
    `
  }
];

// modules/peer-review/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u0438</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #d0d7de; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #0969da; font-size: 13px; text-decoration: none; }
  main { padding: 24px; max-width: 1040px; }
  form { display: grid; gap: 10px; margin-bottom: 24px; padding: 16px; border: 1px solid #d0d7de; border-radius: 10px; }
  label { font-size: 13px; color: #57606a; }
  input, textarea, select { font: inherit; padding: 8px 10px; border: 1px solid #d0d7de; border-radius: 8px; }
  textarea { min-height: 90px; resize: vertical; }
  button { font: inherit; cursor: pointer; }
  .button { border: 1px solid #d0d7de; background: #f6f8fa; border-radius: 8px; padding: 8px 12px; }
  .button.primary { background: #0969da; color: #fff; border-color: #0969da; }
  .button.danger { background: #cf222e; color: #fff; border-color: #cf222e; }
  .status { min-height: 1.5em; color: #57606a; }
  .status.error { color: #cf222e; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d0d7de; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; }
  .empty { color: #57606a; padding: 16px 0; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; background: #ddf4ff; font-size: 12px; }
  code, .mono { font-family: ui-monospace, Consolas, monospace; font-size: 12px; word-break: break-all; }
  .card { border: 1px solid #d0d7de; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
</head>
<body>
<header>
  <h1>\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u0438</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <div class="status" id="status"></div>

  <form id="create">
    <strong>\u0417\u0430\u043F\u0440\u043E\u0441 \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0439</strong>
    <label for="target_id">\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u0442\u0443\u0434\u0438\u0438 \u0430\u0432\u0442\u043E\u0440\u0430 (id \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u0438\u043B\u0438 \u0446\u0438\u0442\u0430\u0442\u044B \u2014 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u044D\u0442\u043E\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435)</label>
    <input id="target_id" name="target_id" required maxlength="120" placeholder="item_\u2026">
    <div class="row">
      <label for="target_kind">\u0412\u0438\u0434</label>
      <select id="target_kind" name="target_kind">
        <option value="draft">\u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A</option>
        <option value="citation">\u0446\u0438\u0442\u0430\u0442\u0430</option>
        <option value="note">\u0437\u0430\u043C\u0435\u0442\u043A\u0430</option>
        <option value="document">\u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442</option>
      </select>
      <label for="reviewer">\u0420\u0435\u0446\u0435\u043D\u0437\u0435\u043D\u0442 (\u043F\u043E\u0434\u043F\u0438\u0441\u044C, \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)</label>
      <input id="reviewer" name="reviewer" maxlength="120" placeholder="\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u043D\u0430\u0443\u0447\u043D\u044B\u0439 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C">
    </div>
    <label for="title">\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0437\u0430\u043F\u0440\u043E\u0441\u0430</label>
    <input id="title" name="title" required maxlength="200" placeholder="\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442 \u0432\u043E \u0432\u0432\u0435\u0434\u0435\u043D\u0438\u0438">
    <label for="question">\u0427\u0442\u043E \u0438\u043C\u0435\u043D\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</label>
    <textarea id="question" name="question" required placeholder="\u0412\u043E\u043F\u0440\u043E\u0441 \u043A \u0440\u0435\u0446\u0435\u043D\u0437\u0435\u043D\u0442\u0443"></textarea>
    <label for="due_at">\u0421\u0440\u043E\u043A (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E, ISO 8601)</label>
    <input id="due_at" name="due_at" placeholder="2026-11-20">
    <div><button class="button primary" type="submit">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441</button></div>
  </form>

  <div id="detail"></div>

  <table>
    <thead>
      <tr><th>\u0417\u0430\u043F\u0440\u043E\u0441</th><th>\u0410\u0434\u0440\u0435\u0441\u0430\u0442</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th><th>\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u0438</th><th></th></tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
</main>
<script>
const API = '/api/tools/peer-review';
const status = document.getElementById('status');
const rows = document.getElementById('rows');
const detail = document.getElementById('detail');

function say(message, error) {
  status.textContent = message;
  status.className = error ? 'status error' : 'status';
}

async function call(path, init) {
  const response = await fetch(API + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init && init.headers ? init.headers : {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body.error && body.error.message) || ('HTTP ' + response.status));
  return body;
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function actions(request) {
  if (request.status === 'closed') return '<span class="mono">\u0437\u0430\u043A\u0440\u044B\u0442: ' + esc(request.close_reason) + '</span>';
  const closable = request.status !== 'closed';
  return '<button class="button" data-close="' + esc(request.id) + '">\u0417\u0430\u043A\u0440\u044B\u0442\u044C</button>'
    + (closable ? '<button class="button" data-review="' + esc(request.id) + '">\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u044F</button>' : '');
}

async function refresh() {
  try {
    const body = await call('/requests?limit=50');
    rows.innerHTML = '';
    if (!body.requests.length) {
      rows.innerHTML = '<tr><td colspan="5" class="empty">\u0417\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442</td></tr>';
      return;
    }
    for (const request of body.requests) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + esc(request.title) + '<div class="mono">' + esc(request.id) + '</div></td>'
        + '<td>' + esc(request.target_kind) + ' <span class="mono">' + esc(request.target_id) + '</span></td>'
        + '<td><span class="badge">' + esc(request.status) + '</span><div class="mono">' + esc(request.last_verdict || '') + '</div></td>'
        + '<td>' + esc(request.reviews_count) + ' / \u043E\u0442\u0432\u0435\u0442\u043E\u0432 ' + esc(request.responses_count) + '</td>'
        + '<td><div class="row">' + actions(request) + '<button class="button" data-open="' + esc(request.id) + '">\u0427\u0438\u0442\u0430\u0442\u044C</button></div></td>';
      rows.appendChild(tr);
    }
  } catch (error) {
    say(error.message, true);
  }
}

async function openRequest(id) {
  try {
    const body = await call('/requests/' + encodeURIComponent(id));
    const request = body.request;
    detail.innerHTML = '<div class="card"><strong>' + esc(request.title) + '</strong>'
      + '<div>' + esc(request.question) + '</div>'
      + '<div class="mono">' + esc(request.target_kind) + ' ' + esc(request.target_id) + ' \xB7 \u0441\u0442\u0430\u0442\u0443\u0441 ' + esc(request.status)
      + ' \xB7 \u0430\u0434\u0440\u0435\u0441\u0430\u0442 ' + esc(request.target_present === null ? '\u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C' : (request.target_present ? '\u043D\u0430\u0439\u0434\u0435\u043D' : '\u0443\u0434\u0430\u043B\u0451\u043D')) + '</div></div>'
      + request.reviews.map((review) => '<div class="card"><strong>' + esc(review.verdict) + '</strong> \u2014 ' + esc(review.reviewer)
        + '<div>' + esc(review.summary) + '</div>'
        + review.comments.map((comment) => '<div>\xB7 [' + esc(comment.severity) + '] ' + esc(comment.text) + '</div>').join('')
        + (review.response ? '<div class="mono">\u043E\u0442\u0432\u0435\u0442: ' + esc(review.response.decision) + ' \u2014 ' + esc(review.response.text) + '</div>'
          : '<form data-respond="' + esc(review.id) + '"><label>\u041E\u0442\u0432\u0435\u0442 \u0430\u0432\u0442\u043E\u0440\u0430</label><textarea name="text" required></textarea>'
            + '<div class="row"><select name="decision"><option value="accepted">\u043F\u0440\u0438\u043D\u044F\u0442\u043E</option><option value="rejected">\u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E</option><option value="discussed">\u043E\u0431\u0441\u0443\u0436\u0434\u0435\u043D\u043E</option></select>'
            + '<button class="button primary" type="submit">\u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C</button></div></form>')
        + '</div>').join('');
    for (const form of detail.querySelectorAll('form[data-respond]')) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await call('/reviews/' + encodeURIComponent(form.dataset.respond) + '/responses', {
            method: 'POST',
            body: JSON.stringify({ decision: form.decision.value, text: form.text.value }),
          });
          say('\u041E\u0442\u0432\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0430\u043D');
          await refresh();
          await openRequest(id);
        } catch (error) { say(error.message, true); }
      });
    }
  } catch (error) {
    say(error.message, true);
  }
}

async function reviewRequest(id) {
  const verdict = prompt('\u0412\u0435\u0440\u0434\u0438\u043A\u0442: accept, minor_revision, major_revision \u0438\u043B\u0438 reject', 'minor_revision');
  if (!verdict) return;
  const reviewer = prompt('\u041A\u0442\u043E \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0440\u0443\u0435\u0442 (\u043F\u043E\u0434\u043F\u0438\u0441\u044C)', '\u0440\u0435\u0446\u0435\u043D\u0437\u0435\u043D\u0442');
  if (!reviewer) return;
  const summary = prompt('\u0421\u0432\u043E\u0434\u043A\u0430 \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0439');
  if (!summary) return;
  try {
    await call('/requests/' + encodeURIComponent(id) + '/reviews', {
      method: 'POST',
      body: JSON.stringify({ verdict: verdict.trim(), reviewer: reviewer.trim(), summary, comments: [] }),
    });
    say('\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u044F \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0430');
    await refresh();
  } catch (error) { say(error.message, true); }
}

document.getElementById('create').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  try {
    const body = await call('/requests', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title.value,
        question: form.question.value,
        target_kind: form.target_kind.value,
        target_id: form.target_id.value,
        reviewer: form.reviewer.value,
        due_at: form.due_at.value,
      }),
    });
    say('\u0417\u0430\u043F\u0440\u043E\u0441 \u0441\u043E\u0437\u0434\u0430\u043D: ' + body.request.id);
    form.reset();
    await refresh();
  } catch (error) { say(error.message, true); }
});

document.getElementById('rows').addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.open) await openRequest(button.dataset.open);
  if (button.dataset.review) await reviewRequest(button.dataset.review);
  if (button.dataset.close) {
    const reason = prompt('\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F', '\u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u044F \u0443\u0447\u0442\u0435\u043D\u044B');
    if (!reason) return;
    try {
      await call('/requests/' + encodeURIComponent(button.dataset.close) + '/close', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      say('\u0417\u0430\u043F\u0440\u043E\u0441 \u0437\u0430\u043A\u0440\u044B\u0442');
      await refresh();
    } catch (error) { say(error.message, true); }
  }
});

refresh();
</script>
</body>
</html>`;

// modules/peer-review/index.ts
var NO_STORE = { "cache-control": "no-store" };
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "peer_review_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "peer-review",
  apiVersion: 1,
  migrations: peerReviewMigrations,
  register(ctx) {
    const reviews = new PeerReviewService({ db: ctx.storage, log: ctx.log });
    ctx.publish({ reviews });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.api.add("GET", "/api/tools/peer-review/requests", (request) => ({
      headers: NO_STORE,
      body: {
        ok: true,
        ...reviews.list(
          request.query.get("q") ?? "",
          request.query.get("status") ?? void 0,
          request.query.get("limit") ?? void 0
        )
      }
    }));
    ctx.api.add("POST", "/api/tools/peer-review/requests", (request) => ({
      status: 201,
      headers: NO_STORE,
      body: { ok: true, request: reviews.createRequest(bodyOf(request.body)) }
    }));
    ctx.api.add("GET", "/api/tools/peer-review/requests/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, request: reviews.get(request.params.id) }
    }));
    ctx.api.add("DELETE", "/api/tools/peer-review/requests/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...reviews.remove(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/peer-review/requests/:id/reviews", (request) => ({
      status: 201,
      headers: NO_STORE,
      body: { ok: true, review: reviews.submitReview(request.params.id, bodyOf(request.body)) }
    }));
    ctx.api.add("POST", "/api/tools/peer-review/requests/:id/close", (request) => ({
      headers: NO_STORE,
      body: { ok: true, request: reviews.close(request.params.id, bodyOf(request.body)) }
    }));
    ctx.api.add("POST", "/api/tools/peer-review/reviews/:id/responses", (request) => ({
      status: 201,
      headers: NO_STORE,
      body: { ok: true, ...reviews.respond(request.params.id, bodyOf(request.body)) }
    }));
    ctx.api.add("GET", "/api/tools/peer-review/summary", () => ({
      headers: NO_STORE,
      body: { ok: true, summary: reviews.summary() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
