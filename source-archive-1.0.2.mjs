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

// modules/source-archive/service.ts
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

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

// modules/source-archive/service.ts
var MEDIA_TYPES = ["text/plain", "text/html"];
var TARGET_KINDS = ["citation", "draft", "note", "document", "external"];
var SOURCE_ARCHIVE_LIMITS = {
  max_snapshots: 200,
  max_total_bytes: 64 * 1024 * 1024,
  max_content_bytes: 1024 * 1024,
  max_links_per_snapshot: 20
};
var SNAPSHOT_FIELDS = `id, title, source_url, media_type, origin_kind, origin_path, origin_note,
  content, sha256, bytes, metadata, created_at`;
function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function snapshotId(raw) {
  const id = text(raw, "id", 80, true);
  if (!/^snapshot_[a-z0-9]{8,32}$/i.test(id)) {
    throw new ValidationError("\u0421\u043D\u0438\u043C\u043E\u043A: \u043D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440", { id }, { code: "source_archive_id_invalid" });
  }
  return id;
}
function sourceUrl(raw) {
  const value = text(raw, "source_url", 2e3);
  if (!value) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABsource_url\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C URL", { value }, {
      code: "source_archive_url_invalid"
    });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABsource_url\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B \u0442\u043E\u043B\u044C\u043A\u043E http \u0438 https", { protocol: parsed.protocol }, {
      code: "source_archive_url_invalid"
    });
  }
  return parsed.toString();
}
function metadataOf(raw) {
  if (raw === void 0 || raw === null) return {};
  const value = record(raw, "metadata");
  const json = JSON.stringify(value);
  if (json.length > 4e3) {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABmetadata\xBB \u0431\u043E\u043B\u044C\u0448\u0435 4000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432", { bytes: json.length }, {
      code: "source_archive_metadata_too_large"
    });
  }
  return value;
}
function linkInput(raw) {
  const body = record(raw, "\u0441\u0432\u044F\u0437\u044C");
  const label = text(body.target_label, "target_label", 200);
  return {
    target_kind: requiredOneOf(body.target_kind, "target_kind", TARGET_KINDS),
    target_id: text(body.target_id, "target_id", 120, true),
    target_label: label || null
  };
}
function previewOf(content) {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}\u2026` : flat;
}
var SourceArchiveService = class {
  #db;
  #resolveFile;
  #log;
  #clock;
  constructor(deps) {
    this.#db = deps.db;
    this.#resolveFile = deps.resolveFile;
    this.#log = deps.log.child({ module: "source-archive" });
    this.#clock = deps.clock ?? systemClock;
  }
  /**
   * Сохранение снимка. Вход — либо `content` (вставленный текст), либо `file`
   * (путь внутри каталога данных модуля). Оба сразу — отказ: непонятно, что
   * именно архивируется.
   */
  capture(raw) {
    const body = raw === void 0 || raw === null ? {} : record(raw, "\u0441\u043D\u0438\u043C\u043E\u043A");
    const title = text(body.title, "title", 200, true);
    const mediaType = oneOf(body.media_type, "media_type", MEDIA_TYPES, "text/plain");
    const url = sourceUrl(body.source_url);
    const metadata = metadataOf(body.metadata);
    const note = text(body.note, "note", 500);
    const content = this.#contentOf(body, mediaType);
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > SOURCE_ARCHIVE_LIMITS.max_content_bytes) {
      throw new AppError(
        "source_archive_too_large",
        `\u0421\u043D\u0438\u043C\u043E\u043A \u0431\u043E\u043B\u044C\u0448\u0435 ${Math.floor(SOURCE_ARCHIVE_LIMITS.max_content_bytes / 1024)} \u041A\u0438\u0411`,
        413,
        { bytes, max: SOURCE_ARCHIVE_LIMITS.max_content_bytes }
      );
    }
    const digest = sha256(content);
    const existing = this.#db.raw.prepare(
      `SELECT ${SNAPSHOT_FIELDS} FROM source_archive_snapshots
       WHERE sha256 = ? AND title = ? AND COALESCE(source_url, '') = COALESCE(?, '')
       ORDER BY created_at LIMIT 1`
    ).get(digest, title, url);
    if (existing) {
      return { snapshot: this.#view(existing), duplicate: true };
    }
    const usage = this.summary();
    if (usage.snapshots >= SOURCE_ARCHIVE_LIMITS.max_snapshots) {
      throw new AppError(
        "source_archive_quota_exceeded",
        `\u0410\u0440\u0445\u0438\u0432 \u0443\u0436\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 ${usage.snapshots} \u0441\u043D\u0438\u043C\u043A\u043E\u0432: \u043F\u0440\u0435\u0434\u0435\u043B ${SOURCE_ARCHIVE_LIMITS.max_snapshots}`,
        409,
        { snapshots: usage.snapshots, max: SOURCE_ARCHIVE_LIMITS.max_snapshots }
      );
    }
    if (usage.bytes + bytes > SOURCE_ARCHIVE_LIMITS.max_total_bytes) {
      throw new AppError(
        "source_archive_quota_exceeded",
        "\u0410\u0440\u0445\u0438\u0432 \u0437\u0430\u043D\u044F\u043B \u0431\u044B \u0431\u043E\u043B\u044C\u0448\u0435 \u0434\u0438\u0441\u043A\u043E\u0432\u043E\u0433\u043E \u0431\u044E\u0434\u0436\u0435\u0442\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044F",
        409,
        {
          bytes: usage.bytes,
          incoming: bytes,
          max: SOURCE_ARCHIVE_LIMITS.max_total_bytes
        }
      );
    }
    const links = Array.isArray(body.links) ? body.links : [];
    if (links.length > SOURCE_ARCHIVE_LIMITS.max_links_per_snapshot) {
      throw new ValidationError(
        `\u041A \u0441\u043D\u0438\u043C\u043A\u0443 \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${SOURCE_ARCHIVE_LIMITS.max_links_per_snapshot} \u0441\u0441\u044B\u043B\u043E\u043A`,
        { links: links.length },
        { code: "source_archive_links_too_many" }
      );
    }
    const normalizedLinks = links.map((link) => linkInput(link));
    const row = {
      id: newId("snapshot"),
      title,
      source_url: url,
      media_type: mediaType,
      origin_kind: body.file === void 0 || body.file === null ? "text" : "file",
      origin_path: typeof body.file === "string" && body.file.trim() ? body.file.trim() : null,
      origin_note: note || null,
      content,
      sha256: digest,
      bytes,
      metadata: JSON.stringify(metadata),
      created_at: this.#now()
    };
    this.#db.raw.prepare(
      `INSERT INTO source_archive_snapshots (${SNAPSHOT_FIELDS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      row.id,
      row.title,
      row.source_url,
      row.media_type,
      row.origin_kind,
      row.origin_path,
      row.origin_note,
      row.content,
      row.sha256,
      row.bytes,
      row.metadata,
      row.created_at
    );
    for (const link of normalizedLinks) {
      this.#insertLink(row.id, link);
    }
    this.#log.info("\u0421\u043D\u0438\u043C\u043E\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D", {
      id: row.id,
      bytes: row.bytes,
      media_type: row.media_type,
      origin: row.origin_kind
    });
    return { snapshot: this.#view(row), duplicate: false };
  }
  /** Список без содержимого: `q` ищет по заголовку, URL и тексту снимка. */
  list(query = "", limit = 20) {
    const q = text(query, "q", 200);
    const bounded = integer(limit, "limit", 1, 100, 20);
    const where = q ? "WHERE title LIKE ? OR COALESCE(source_url, '') LIKE ? OR content LIKE ?" : "";
    const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
    const total = Number(this.#db.raw.prepare(
      `SELECT count(*) AS n FROM source_archive_snapshots ${where}`
    ).get(...params).n);
    const rows = this.#db.raw.prepare(
      `SELECT ${SNAPSHOT_FIELDS} FROM source_archive_snapshots ${where}
       ORDER BY created_at DESC, id DESC LIMIT ?`
    ).all(...params, bounded);
    return { snapshots: rows.map((row) => this.#row(row)), total, limit: bounded };
  }
  get(rawId) {
    return this.#view(this.#mustFind(rawId));
  }
  summary() {
    const totals = this.#db.raw.prepare(
      "SELECT count(*) AS n, COALESCE(SUM(bytes), 0) AS bytes, MIN(created_at) AS oldest, MAX(created_at) AS newest FROM source_archive_snapshots"
    ).get();
    const links = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM source_archive_links"
    ).get().n);
    const byMedia = {};
    const kinds = this.#db.raw.prepare(
      "SELECT media_type, count(*) AS n FROM source_archive_snapshots GROUP BY media_type"
    ).all();
    for (const kind of kinds) byMedia[kind.media_type] = Number(kind.n);
    const bytes = Number(totals.bytes);
    return {
      snapshots: Number(totals.n),
      bytes,
      links,
      by_media_type: byMedia,
      oldest: totals.oldest,
      newest: totals.newest,
      last_capture_at: totals.newest,
      limits: SOURCE_ARCHIVE_LIMITS,
      quota: {
        snapshots_left: Math.max(0, SOURCE_ARCHIVE_LIMITS.max_snapshots - Number(totals.n)),
        bytes_left: Math.max(0, SOURCE_ARCHIVE_LIMITS.max_total_bytes - bytes)
      }
    };
  }
  /** Привязка снимка к цитате/черновику/заметке/документу. */
  link(rawId, input) {
    const snapshot = this.#mustFind(rawId);
    const link = linkInput(input);
    const duplicate = this.#db.raw.prepare(
      "SELECT id FROM source_archive_links WHERE snapshot_id = ? AND target_kind = ? AND target_id = ?"
    ).get(snapshot.id, link.target_kind, link.target_id);
    if (duplicate) {
      throw new ConflictError("\u0422\u0430\u043A\u0430\u044F \u0441\u0432\u044F\u0437\u044C \u0443\u0436\u0435 \u0435\u0441\u0442\u044C", {
        reason: "link_exists",
        snapshot_id: snapshot.id,
        target_kind: link.target_kind,
        target_id: link.target_id
      });
    }
    const count = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM source_archive_links WHERE snapshot_id = ?"
    ).get(snapshot.id).n);
    if (count >= SOURCE_ARCHIVE_LIMITS.max_links_per_snapshot) {
      throw new ConflictError("\u041A \u0441\u043D\u0438\u043C\u043A\u0443 \u0443\u0436\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043E \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0441\u0441\u044B\u043B\u043E\u043A", {
        reason: "links_limit",
        snapshot_id: snapshot.id,
        max: SOURCE_ARCHIVE_LIMITS.max_links_per_snapshot
      });
    }
    const id = this.#insertLink(snapshot.id, link);
    const row = this.#db.raw.prepare("SELECT * FROM source_archive_links WHERE id = ?").get(id);
    return this.#linkView(row);
  }
  unlink(rawId, rawLinkId) {
    const snapshot = this.#mustFind(rawId);
    const linkId = text(rawLinkId, "link_id", 80, true);
    const row = this.#db.raw.prepare(
      "SELECT * FROM source_archive_links WHERE id = ? AND snapshot_id = ?"
    ).get(linkId, snapshot.id);
    if (!row) {
      throw new AppError("source_archive_link_not_found", "\u0421\u0432\u044F\u0437\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", 404, {
        snapshot_id: snapshot.id,
        link_id: linkId
      });
    }
    this.#db.raw.prepare("DELETE FROM source_archive_links WHERE id = ?").run(linkId);
    const remaining = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM source_archive_links WHERE snapshot_id = ?"
    ).get(snapshot.id).n);
    return { removed: this.#linkView(row), remaining };
  }
  /** Удаление снимка вместе со связями: содержимое и адреса уходят целиком. */
  remove(rawId) {
    const row = this.#mustFind(rawId);
    const linksRemoved = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM source_archive_links WHERE snapshot_id = ?"
    ).get(row.id).n);
    this.#db.raw.prepare("DELETE FROM source_archive_links WHERE snapshot_id = ?").run(row.id);
    this.#db.raw.prepare("DELETE FROM source_archive_snapshots WHERE id = ?").run(row.id);
    const remaining = Number(this.#db.raw.prepare(
      "SELECT count(*) AS n FROM source_archive_snapshots"
    ).get().n);
    this.#log.info("\u0421\u043D\u0438\u043C\u043E\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 \u0443\u0434\u0430\u043B\u0451\u043D", { id: row.id, bytes: row.bytes, links: linksRemoved });
    return { removed: { id: row.id, title: row.title, bytes: row.bytes }, links_removed: linksRemoved, remaining };
  }
  /** Сверка всех снимков: изменившийся текст виден как расхождение хеша. */
  verify() {
    const rows = this.#db.raw.prepare(
      "SELECT id, title, content, sha256 FROM source_archive_snapshots ORDER BY created_at"
    ).all();
    const failed = [];
    for (const row of rows) {
      const actual = sha256(row.content);
      if (actual !== row.sha256) {
        failed.push({ id: row.id, title: row.title, expected: row.sha256, actual });
      }
    }
    return { checked: rows.length, failed, ok: failed.length === 0 };
  }
  #contentOf(body, mediaType) {
    const hasContent = body.content !== void 0 && body.content !== null;
    const hasFile = body.file !== void 0 && body.file !== null;
    if (hasContent && hasFile) {
      throw new ValidationError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043B\u0438\u0431\u043E \xABcontent\xBB, \u043B\u0438\u0431\u043E \xABfile\xBB, \u0430 \u043D\u0435 \u043E\u0431\u0430", {}, {
        code: "source_archive_input_ambiguous"
      });
    }
    if (hasFile) {
      const relative = text(body.file, "file", 300, true);
      const path = this.#resolveFile(relative);
      let size = 0;
      try {
        size = statSync(path).size;
      } catch {
        throw new AppError("source_archive_file_missing", "\u0424\u0430\u0439\u043B \u0434\u043B\u044F \u0441\u043D\u0438\u043C\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", 404, { file: relative });
      }
      if (size > SOURCE_ARCHIVE_LIMITS.max_content_bytes) {
        throw new AppError("source_archive_too_large", "\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u0430 \u0441\u043D\u0438\u043C\u043A\u0430", 413, {
          file: relative,
          bytes: size,
          max: SOURCE_ARCHIVE_LIMITS.max_content_bytes
        });
      }
      const content = readFileSync(path, "utf8");
      if (!content.trim()) {
        throw new ValidationError("\u0424\u0430\u0439\u043B \u043F\u0443\u0441\u0442: \u0441\u043D\u0438\u043C\u043E\u043A \u043D\u0435\u0447\u0435\u0433\u043E \u0445\u0440\u0430\u043D\u0438\u0442\u044C", { file: relative }, {
          code: "source_archive_content_empty"
        });
      }
      return content;
    }
    if (!hasContent) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \xABcontent\xBB (\u0432\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442) \u0438\u043B\u0438 \xABfile\xBB (\u0444\u0430\u0439\u043B \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043C\u043E\u0434\u0443\u043B\u044F)", {}, {
        code: "source_archive_content_required"
      });
    }
    if (typeof body.content !== "string") {
      throw new ValidationError("\u041F\u043E\u043B\u0435 \xABcontent\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439", {}, { code: "source_archive_content_invalid" });
    }
    if (!body.content.trim()) {
      throw new ValidationError("\u041F\u043E\u043B\u0435 \xABcontent\xBB \u043F\u0443\u0441\u0442\u043E\u0435: \u0441\u043D\u0438\u043C\u043E\u043A \u043D\u0435\u0447\u0435\u0433\u043E \u0445\u0440\u0430\u043D\u0438\u0442\u044C", {}, {
        code: "source_archive_content_empty"
      });
    }
    if (mediaType === "text/html" && !/<[a-z!/]/i.test(body.content)) {
      throw new ValidationError("\u0414\u043B\u044F media_type=text/html \u0442\u0435\u043A\u0441\u0442 \u043D\u0435 \u043F\u043E\u0445\u043E\u0436 \u043D\u0430 HTML", {}, {
        code: "source_archive_html_invalid"
      });
    }
    return body.content;
  }
  #insertLink(snapshotId2, link) {
    const id = newId("link");
    this.#db.raw.prepare(
      "INSERT INTO source_archive_links (id, snapshot_id, target_kind, target_id, target_label, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, snapshotId2, link.target_kind, link.target_id, link.target_label, this.#now());
    return id;
  }
  #mustFind(rawId) {
    const id = snapshotId(rawId);
    const row = this.#db.raw.prepare(
      `SELECT ${SNAPSHOT_FIELDS} FROM source_archive_snapshots WHERE id = ?`
    ).get(id);
    if (!row) {
      throw new AppError("source_archive_not_found", `\u0421\u043D\u0438\u043C\u043E\u043A \xAB${id}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`, 404, { id });
    }
    return row;
  }
  #links(snapshotId2) {
    const rows = this.#db.raw.prepare(
      "SELECT * FROM source_archive_links WHERE snapshot_id = ? ORDER BY created_at, id"
    ).all(snapshotId2);
    return rows.map((row) => this.#linkView(row));
  }
  #linkView(row) {
    return {
      id: row.id,
      target_kind: row.target_kind,
      target_id: row.target_id,
      target_label: row.target_label,
      created_at: row.created_at,
      target_present: this.#targetPresent(row.target_kind, row.target_id)
    };
  }
  /**
   * Адресат связи проверяется по таблице студии автора, если она есть в
   * профиле. Это единственное чтение чужой таблицы: у студии нет опубликованного
   * сервиса поиска, а связь на удалённую цитату должна быть видна как таковая.
   * Нет таблицы — `null` («проверить нечем»), а не выдуманный `false`.
   */
  #targetPresent(kind, targetId) {
    if (kind === "external") return null;
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
    return {
      id: row.id,
      title: row.title,
      source_url: row.source_url,
      media_type: row.media_type,
      origin: { kind: row.origin_kind, path: row.origin_path, note: row.origin_note },
      sha256: row.sha256,
      bytes: row.bytes,
      metadata: this.#metadata(row.metadata),
      created_at: row.created_at,
      links_count: Number(this.#db.raw.prepare(
        "SELECT count(*) AS n FROM source_archive_links WHERE snapshot_id = ?"
      ).get(row.id).n),
      preview: previewOf(row.content)
    };
  }
  #view(row) {
    return {
      ...this.#row(row),
      content: row.content,
      intact: sha256(row.content) === row.sha256,
      links: this.#links(row.id)
    };
  }
  #metadata(raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  #now() {
    const previous = this.#db.raw.prepare(
      "SELECT MAX(created_at) AS latest FROM source_archive_snapshots"
    ).get().latest;
    return nextTimestamp(previous, this.#clock.now());
  }
};

// modules/source-archive/schema.ts
var sourceArchiveMigrations = [
  {
    version: "source-archive/1_snapshots",
    sql: `
      CREATE TABLE source_archive_snapshots (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_url TEXT,
        media_type TEXT NOT NULL,
        origin_kind TEXT NOT NULL,
        origin_path TEXT,
        origin_note TEXT,
        content TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_source_archive_snapshots_sha ON source_archive_snapshots (sha256);
      CREATE INDEX idx_source_archive_snapshots_created ON source_archive_snapshots (created_at);

      CREATE TABLE source_archive_links (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL REFERENCES source_archive_snapshots(id) ON DELETE CASCADE,
        target_kind TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_label TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (snapshot_id, target_kind, target_id)
      );
      CREATE INDEX idx_source_archive_links_snapshot ON source_archive_links (snapshot_id);
    `
  }
];

// modules/source-archive/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u041E\u0444\u043B\u0430\u0439\u043D-\u0430\u0440\u0445\u0438\u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #d0d7de; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #0969da; font-size: 13px; text-decoration: none; }
  main { padding: 24px; max-width: 980px; }
  form { display: grid; gap: 10px; margin-bottom: 24px; }
  label { font-size: 13px; color: #57606a; }
  input, textarea { font: inherit; padding: 8px 10px; border: 1px solid #d0d7de; border-radius: 8px; }
  textarea { min-height: 120px; resize: vertical; }
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
  code, .mono { font-family: ui-monospace, Consolas, monospace; font-size: 12px; word-break: break-all; }
  pre { white-space: pre-wrap; background: #f6f8fa; padding: 12px; border-radius: 8px; max-height: 320px; overflow: auto; }
</style>
</head>
<body>
<header>
  <h1>\u041E\u0444\u043B\u0430\u0439\u043D-\u0430\u0440\u0445\u0438\u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <div class="status" id="status"></div>
  <form id="capture" data-required="title,content">
    <label for="title">\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430</label>
    <input id="title" name="title" required maxlength="200" placeholder="\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u041E\u0442\u0447\u0451\u0442 \u043E \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438, 2024">
    <label for="source_url">\u0410\u0434\u0440\u0435\u0441 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E; \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u043A\u0430\u043A \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435, \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F)</label>
    <input id="source_url" name="source_url" placeholder="https://example.org/paper">
    <label for="content">\u0422\u0435\u043A\u0441\u0442 \u0438\u043B\u0438 HTML \u0441\u043D\u0438\u043C\u043A\u0430</label>
    <textarea id="content" name="content" required placeholder="\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430"></textarea>
    <div>
      <button class="button primary" type="submit">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0441\u043D\u0438\u043C\u043E\u043A</button>
      <button class="button" type="button" id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button>
    </div>
  </form>
  <div id="detail"></div>
  <table>
    <thead>
      <tr><th>\u0421\u043D\u0438\u043C\u043E\u043A</th><th>\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A</th><th>\u0420\u0430\u0437\u043C\u0435\u0440</th><th>\u0421\u0432\u044F\u0437\u0438</th><th></th></tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
</main>
<script>
const API = '/api/tools/source-archive';
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
  if (!response.ok) {
    const error = body.error || {};
    throw new Error(error.message || ('HTTP ' + response.status));
  }
  return body;
}

async function load() {
  try {
    const data = await call('/snapshots?limit=50');
    rows.innerHTML = '';
    if (!data.snapshots.length) {
      rows.innerHTML = '<tr><td colspan="5" class="empty">\u0421\u043D\u0438\u043C\u043A\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442</td></tr>';
      return;
    }
    for (const snapshot of data.snapshots) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong></strong><div class="mono"></div></td>'
        + '<td class="mono"></td><td></td><td></td><td></td>';
      tr.children[0].querySelector('strong').textContent = snapshot.title;
      tr.children[0].querySelector('div').textContent = snapshot.id;
      tr.children[1].textContent = snapshot.source_url || ('\u0444\u0430\u0439\u043B: ' + (snapshot.origin.path || '\u2014'));
      tr.children[2].textContent = snapshot.bytes + ' \u0411';
      tr.children[3].textContent = String(snapshot.links_count);
      const actions = tr.children[4];
      const read = document.createElement('button');
      read.className = 'button';
      read.textContent = '\u0427\u0438\u0442\u0430\u0442\u044C';
      read.onclick = () => show(snapshot.id);
      const remove = document.createElement('button');
      remove.className = 'button danger';
      remove.textContent = '\u0423\u0434\u0430\u043B\u0438\u0442\u044C';
      remove.style.marginLeft = '6px';
      remove.onclick = async () => {
        try {
          const result = await call('/snapshots/' + snapshot.id, { method: 'DELETE' });
          say('\u0423\u0434\u0430\u043B\u0451\u043D \u0441\u043D\u0438\u043C\u043E\u043A: ' + result.removed.title);
          detail.innerHTML = '';
          await load();
        } catch (error) { say(error.message, true); }
      };
      actions.append(read, remove);
      rows.append(tr);
    }
  } catch (error) { say(error.message, true); }
}

async function show(id) {
  try {
    const data = await call('/snapshots/' + id);
    const snapshot = data.snapshot;
    detail.innerHTML = '<h2></h2><p class="mono"></p><p></p><pre></pre>';
    detail.querySelector('h2').textContent = snapshot.title;
    detail.querySelector('.mono').textContent = 'sha256 ' + snapshot.sha256;
    detail.querySelector('p:last-of-type').textContent = snapshot.intact
      ? '\u0426\u0435\u043B\u043E\u0441\u0442\u043D\u043E\u0441\u0442\u044C: \u0445\u0435\u0448 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 (' + snapshot.links.length + ' \u0441\u0432\u044F\u0437\u0435\u0439)'
      : '\u0426\u0435\u043B\u043E\u0441\u0442\u043D\u043E\u0441\u0442\u044C: \u0445\u0435\u0448 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u2014 \u0442\u0435\u043A\u0441\u0442 \u0441\u043D\u0438\u043C\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0451\u043D';
    detail.querySelector('pre').textContent = snapshot.content;
  } catch (error) { say(error.message, true); }
}

document.getElementById('capture').onsubmit = async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = { title: form.get('title'), content: form.get('content') };
  if (form.get('source_url')) payload.source_url = form.get('source_url');
  if (/<[a-z!/]/i.test(String(payload.content))) payload.media_type = 'text/html';
  try {
    const result = await call('/snapshots', { method: 'POST', body: JSON.stringify(payload) });
    say(result.duplicate ? '\u0422\u0430\u043A\u043E\u0439 \u0441\u043D\u0438\u043C\u043E\u043A \u0443\u0436\u0435 \u0435\u0441\u0442\u044C: ' + result.snapshot.id : '\u0421\u043D\u0438\u043C\u043E\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D: ' + result.snapshot.id);
    event.target.reset();
    await load();
  } catch (error) { say(error.message, true); }
};
document.getElementById('refresh').onclick = load;
load();
</script>
</body>
</html>`;

// modules/source-archive/index.ts
var NO_STORE = { "cache-control": "no-store" };
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "source_archive_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "source-archive",
  apiVersion: 1,
  migrations: sourceArchiveMigrations,
  register(ctx) {
    const archive = new SourceArchiveService({
      db: ctx.storage,
      resolveFile: (relative) => ctx.paths.resolve(relative),
      log: ctx.log
    });
    ctx.publish({ archive });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.api.add("GET", "/api/tools/source-archive/snapshots", (request) => ({
      headers: NO_STORE,
      body: {
        ok: true,
        ...archive.list(request.query.get("q") ?? "", request.query.get("limit") ?? void 0)
      }
    }));
    ctx.api.add("POST", "/api/tools/source-archive/snapshots", (request) => {
      const result = archive.capture(bodyOf(request.body));
      return {
        // Новый снимок — 201, повторный — 200: клиенту видно, что строка не создана.
        status: result.duplicate ? 200 : 201,
        headers: NO_STORE,
        body: { ok: true, snapshot: result.snapshot, duplicate: result.duplicate }
      };
    });
    ctx.api.add("GET", "/api/tools/source-archive/snapshots/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, snapshot: archive.get(request.params.id) }
    }));
    ctx.api.add("DELETE", "/api/tools/source-archive/snapshots/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...archive.remove(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/source-archive/snapshots/:id/links", (request) => ({
      status: 201,
      headers: NO_STORE,
      body: { ok: true, link: archive.link(request.params.id, bodyOf(request.body)) }
    }));
    ctx.api.add(
      "DELETE",
      "/api/tools/source-archive/snapshots/:id/links/:linkId",
      (request) => ({
        headers: NO_STORE,
        body: { ok: true, ...archive.unlink(request.params.id, request.params.linkId) }
      })
    );
    ctx.api.add("GET", "/api/tools/source-archive/summary", () => ({
      headers: NO_STORE,
      body: { ok: true, summary: archive.summary() }
    }));
    ctx.api.add("GET", "/api/tools/source-archive/verify", () => ({
      headers: NO_STORE,
      body: { ok: true, report: archive.verify() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
