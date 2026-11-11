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
  constructor(message, details = {}) {
    super("validation_failed", message, 400, details);
  }
};
var NotFoundError = class extends AppError {
  constructor(message = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E") {
    super("not_found", message, 404);
  }
};
var UpstreamError = class extends AppError {
  constructor(message, details = {}) {
    super("upstream_error", message, 502, details);
  }
};

// src/adapters/integrations/github.ts
var API = "https://api.github.com";
var GitHubAdapter = class {
  #secrets;
  #fetch;
  constructor(secrets, fetchImpl = fetch) {
    this.#secrets = secrets;
    this.#fetch = fetchImpl;
  }
  #token() {
    const token = this.#secrets().token;
    if (!token) throw new UpstreamError("GitHub \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D: \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0442\u043E\u043A\u0435\u043D \u0432 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u0445");
    return token;
  }
  async #request(path, init = {}) {
    const token = this.#token();
    let response;
    try {
      response = await this.#fetch(`${API}${path}`, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(15e3),
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "team-platform",
          ...init.body ? { "content-type": "application/json" } : {},
          ...init.headers
        }
      });
    } catch {
      throw new UpstreamError("GitHub \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0435\u0442\u044C");
    }
    const body = await response.text();
    if (!response.ok) {
      const rateRemaining = response.headers.get("x-ratelimit-remaining");
      const rateReset = Number(response.headers.get("x-ratelimit-reset") ?? 0);
      let reason = `HTTP ${response.status}`;
      if (response.status === 401) {
        reason = "\u0442\u043E\u043A\u0435\u043D \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D (HTTP 401)";
      } else if (response.status === 403 && rateRemaining === "0") {
        reason = rateReset > 0 ? `\u043B\u0438\u043C\u0438\u0442 GitHub \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D \u0434\u043E ${new Date(rateReset * 1e3).toISOString()}` : "\u043B\u0438\u043C\u0438\u0442 GitHub \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D";
      } else if (response.status === 404) {
        reason = "\u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E (HTTP 404)";
      } else if (response.status === 403) {
        reason = "\u0434\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D (HTTP 403)";
      } else {
        try {
          const parsed = JSON.parse(body);
          if (parsed.message) reason += `: ${parsed.message}`;
        } catch {
        }
      }
      throw new UpstreamError(`GitHub: ${reason}`, { status: response.status });
    }
    return body ? JSON.parse(body) : null;
  }
  async status() {
    const checked_at = (/* @__PURE__ */ new Date()).toISOString();
    if (!this.#secrets().token) {
      return { configured: false, ok: null, account: null, error: null, checked_at };
    }
    try {
      const user = await this.#request("/user");
      return { configured: true, ok: true, account: user.login ?? null, error: null, checked_at };
    } catch (error) {
      return {
        configured: true,
        ok: false,
        account: null,
        error: error instanceof Error ? error.message : String(error),
        checked_at
      };
    }
  }
  async repoInfo(repo) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}`);
    return {
      full_name: data.full_name ?? repo,
      default_branch: data.default_branch ?? "main",
      private: Boolean(data.private),
      description: data.description ?? null,
      pushed_at: data.pushed_at ?? null
    };
  }
  /** `null` — репозиторий существует, но пуст (GitHub отвечает 409). */
  async head(repo, ref) {
    assertRepo(repo);
    try {
      const data = await this.#request(`/repos/${repo}/commits/${encodeURIComponent(ref)}`);
      return {
        sha: data.sha,
        message: data.commit?.message ?? "",
        author: data.commit?.author?.name ?? data.commit?.committer?.name ?? "",
        date: data.commit?.author?.date ?? data.commit?.committer?.date ?? ""
      };
    } catch (error) {
      if (error instanceof UpstreamError && error.details.status === 409) return null;
      throw error;
    }
  }
  async tree(repo, sha) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}/git/trees/${encodeURIComponent(sha)}?recursive=1`);
    const files = (data.tree ?? []).filter((entry) => entry.type === "blob").map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size ?? 0,
      mode: entry.mode
    })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    return { files, truncated: data.truncated === true };
  }
  async blob(repo, sha) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}/git/blobs/${encodeURIComponent(sha)}`);
    if (typeof data.content !== "string") {
      throw new UpstreamError("GitHub: \u0431\u043B\u043E\u0431 \u043F\u0440\u0438\u0448\u0451\u043B \u0431\u0435\u0437 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0433\u043E");
    }
    const encoding = data.encoding === "utf-8" ? "utf-8" : "base64";
    const buffer = encoding === "base64" ? Buffer.from(data.content.replace(/\s+/g, ""), "base64") : Buffer.from(data.content, "utf8");
    return { content: buffer, size: data.size ?? buffer.length, encoding };
  }
  async repos(limit = 20) {
    const data = await this.#request(`/user/repos?per_page=${limit}&sort=updated`);
    return data.map((repo) => ({
      full_name: repo.full_name,
      private: repo.private,
      updated_at: repo.updated_at,
      open_issues: repo.open_issues_count ?? 0
    }));
  }
  async issues(repo, limit = 20) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}/issues?state=open&per_page=${limit}`);
    return data.map(toIssue);
  }
  async createIssue(repo, input) {
    assertRepo(repo);
    const title = input.title.trim();
    if (!title) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u0435\u043D \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438");
    const data = await this.#request(`/repos/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body: input.body ?? "" })
    });
    return toIssue(data);
  }
  async pulls(repo, state = "open", limit = 20) {
    assertRepo(repo);
    const data = await this.#request(
      `/repos/${repo}/pulls?state=${state}&per_page=${Math.min(Math.max(limit, 1), 100)}&sort=updated&direction=desc`
    );
    return data.map(toPull);
  }
  async pull(repo, number) {
    assertRepo(repo);
    if (!Number.isInteger(number) || number < 1) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u0435\u043D \u043D\u043E\u043C\u0435\u0440 PR");
    return toPull(await this.#request(`/repos/${repo}/pulls/${number}`));
  }
  async createPull(repo, input) {
    assertRepo(repo);
    const title = input.title.trim();
    const head = input.head.trim();
    const base = input.base.trim();
    if (!title) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u0435\u043D \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A PR");
    if (!head || !base) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u043D\u044B \u0432\u0435\u0442\u043A\u0438 head \u0438 base");
    return toPull(await this.#request(`/repos/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title,
        head,
        base,
        body: input.body ?? "",
        draft: input.draft === true
      })
    }));
  }
};
function toPull(pull) {
  return {
    number: pull.number,
    title: pull.title,
    state: pull.state,
    draft: pull.draft === true,
    url: pull.html_url,
    created_at: pull.created_at,
    updated_at: pull.updated_at,
    author: pull.user?.login ?? "",
    head: pull.head?.ref ?? pull.head?.label ?? "",
    base: pull.base?.ref ?? "",
    mergeable: typeof pull.mergeable === "boolean" ? pull.mergeable : null
  };
}
function assertRepo(repo) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new UpstreamError("GitHub: \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A owner/name");
  }
}
function toIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    created_at: issue.created_at,
    author: issue.user?.login ?? ""
  };
}

// src/adapters/storage/sqlite-github.ts
var META_COLUMNS = `id, repo, ref, commit_sha, commit_message, commit_author, commit_date,
  generated_at, created_at, file_count, total_bytes, truncated, truncation_reason, empty`;
var SNAPSHOT_COLUMNS = `${META_COLUMNS}, files_json`;
var INSERT_COLUMNS = `repo, ref, commit_sha, commit_message, commit_author, commit_date,
  generated_at, created_at, files_json, file_count, total_bytes, truncated, truncation_reason, empty`;
function commitOf(row) {
  if (!row.commit_sha) return null;
  return {
    sha: row.commit_sha,
    message: row.commit_message ?? "",
    author: row.commit_author ?? "",
    date: row.commit_date ?? ""
  };
}
function toMeta(row) {
  return {
    id: row.id,
    repo: row.repo,
    ref: row.ref,
    commit: commitOf(row),
    file_count: row.file_count,
    total_bytes: row.total_bytes,
    truncated: row.truncated === 1,
    truncation_reason: row.truncation_reason ?? null,
    empty: row.empty === 1,
    generated_at: row.generated_at,
    created_at: row.created_at
  };
}
function toSnapshot(row) {
  return {
    ...toMeta(row),
    files: JSON.parse(row.files_json)
  };
}
function toWatch(row) {
  return {
    repo: row.repo,
    ref: row.ref,
    enabled: row.enabled === 1,
    last_checked_at: row.last_checked_at,
    last_commit_sha: row.last_commit_sha,
    last_snapshot_id: row.last_snapshot_id,
    last_error: row.last_error,
    next_check_at: row.next_check_at,
    last_change_at: row.last_change_at,
    last_added: row.last_added,
    last_modified: row.last_modified,
    last_deleted: row.last_deleted,
    last_diff: row.last_diff ? JSON.parse(row.last_diff) : null
  };
}
function toSearchMeta(row) {
  return {
    id: row.id,
    repo: row.repo,
    ref: row.ref,
    commit: row.commit_sha ? {
      sha: row.commit_sha,
      message: row.commit_message ?? "",
      author: row.commit_author ?? "",
      date: row.commit_date ?? ""
    } : null,
    generated_at: row.generated_at,
    created_at: row.created_at,
    files_total: row.files_total,
    paths_count: row.paths_count,
    symbols_count: row.symbols_count,
    indexed_files: row.indexed_files,
    binary_files: row.binary_files,
    large_files: row.large_files,
    error_files: row.error_files,
    skipped_limit_files: row.skipped_limit_files,
    truncated: row.truncated === 1,
    truncation_reason: row.truncation_reason ?? null,
    content_truncated: row.content_truncated === 1,
    content_truncated_reason: row.content_truncated_reason,
    skipped: JSON.parse(row.skipped_json),
    skipped_truncated: row.skipped_truncated === 1,
    empty: row.empty === 1
  };
}
function toEvent(row) {
  return {
    id: row.id,
    repo: row.repo,
    commit_sha: row.commit_sha || null,
    created_at: row.created_at,
    baseline: row.baseline === 1,
    added: row.added,
    modified: row.modified,
    deleted: row.deleted,
    diff: JSON.parse(row.diff_json)
  };
}
var SqliteGitHubStore = class {
  #db;
  constructor(db) {
    this.#db = db;
  }
  insertSnapshot(index) {
    const result = this.#db.raw.prepare(`INSERT INTO github_snapshots (${INSERT_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      index.repo,
      index.ref,
      index.commit?.sha ?? null,
      index.commit?.message ?? null,
      index.commit?.author ?? null,
      index.commit?.date ?? null,
      index.generated_at,
      index.generated_at,
      JSON.stringify(index.files),
      index.file_count,
      index.total_bytes,
      index.truncated ? 1 : 0,
      index.truncation_reason,
      index.empty ? 1 : 0
    );
    return Number(result.lastInsertRowid);
  }
  latestSnapshot(repo, ref) {
    const row = this.#db.raw.prepare(`SELECT ${SNAPSHOT_COLUMNS} FROM github_snapshots
        WHERE repo = ? AND ref = ? ORDER BY id DESC LIMIT 1`).get(repo, ref);
    return row ? toSnapshot(row) : null;
  }
  getSnapshot(id) {
    const row = this.#db.raw.prepare(`SELECT ${SNAPSHOT_COLUMNS} FROM github_snapshots WHERE id = ?`).get(id);
    return row ? toSnapshot(row) : null;
  }
  listSnapshots(repo, limit) {
    const rows = this.#db.raw.prepare(`SELECT ${META_COLUMNS} FROM github_snapshots
        WHERE repo = ? ORDER BY id DESC LIMIT ?`).all(repo, Math.min(Math.max(limit, 1), 100));
    return rows.map(toMeta);
  }
  listRecentSnapshots(repo, limit) {
    const rows = this.#db.raw.prepare(`SELECT ${META_COLUMNS} FROM github_snapshots
        WHERE (? = '' OR repo = ?) ORDER BY id DESC LIMIT ?`).all(repo, repo, Math.min(Math.max(limit, 1), 50));
    return rows.map(toMeta);
  }
  saveWatch(watch) {
    this.#db.raw.prepare(`INSERT INTO github_watch (repo, ref, enabled, last_checked_at, last_commit_sha,
          last_snapshot_id, last_error, next_check_at, last_change_at, last_added,
          last_modified, last_deleted, last_diff)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (repo) DO UPDATE SET
          ref = excluded.ref,
          enabled = excluded.enabled,
          last_checked_at = excluded.last_checked_at,
          last_commit_sha = excluded.last_commit_sha,
          last_snapshot_id = excluded.last_snapshot_id,
          last_error = excluded.last_error,
          next_check_at = excluded.next_check_at,
          last_change_at = excluded.last_change_at,
          last_added = excluded.last_added,
          last_modified = excluded.last_modified,
          last_deleted = excluded.last_deleted,
          last_diff = excluded.last_diff`).run(
      watch.repo,
      watch.ref,
      watch.enabled ? 1 : 0,
      watch.last_checked_at,
      watch.last_commit_sha,
      watch.last_snapshot_id,
      watch.last_error,
      watch.next_check_at,
      watch.last_change_at,
      watch.last_added,
      watch.last_modified,
      watch.last_deleted,
      watch.last_diff ? JSON.stringify(watch.last_diff) : null
    );
  }
  getWatch(repo) {
    const row = this.#db.raw.prepare(`SELECT repo, ref, enabled, last_checked_at, last_commit_sha, last_snapshot_id,
          last_error, next_check_at, last_change_at, last_added, last_modified, last_deleted,
          last_diff FROM github_watch WHERE repo = ?`).get(repo);
    return row ? toWatch(row) : null;
  }
  listWatches() {
    const rows = this.#db.raw.prepare(`SELECT repo, ref, enabled, last_checked_at, last_commit_sha, last_snapshot_id,
          last_error, next_check_at, last_change_at, last_added, last_modified, last_deleted,
          last_diff FROM github_watch ORDER BY repo`).all();
    return rows.map(toWatch);
  }
  removeWatch(repo) {
    const result = this.#db.raw.prepare("DELETE FROM github_watch WHERE repo = ?").run(repo);
    return Number(result.changes) > 0;
  }
  recordEvent(event) {
    const result = this.#db.raw.prepare(`INSERT INTO github_watch_events (repo, commit_sha, created_at, baseline,
          added, modified, deleted, diff_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (repo, commit_sha) DO NOTHING`).run(
      event.repo,
      event.commit_sha ?? "",
      event.created_at,
      event.baseline ? 1 : 0,
      event.added,
      event.modified,
      event.deleted,
      JSON.stringify(event.diff)
    );
    return Number(result.changes) === 1;
  }
  listEvents(repo, limit) {
    const rows = this.#db.raw.prepare(`SELECT id, repo, commit_sha, created_at, baseline, added, modified, deleted, diff_json
        FROM github_watch_events WHERE repo = ? ORDER BY id DESC LIMIT ?`).all(repo, Math.min(Math.max(limit, 1), 100));
    return rows.map(toEvent);
  }
  insertSearchIndex(index, entries) {
    return this.#db.transaction(() => {
      const result = this.#db.raw.prepare(`INSERT INTO github_search_indexes (repo, ref, commit_sha, commit_message,
            commit_author, commit_date, generated_at, created_at, files_total, paths_count,
            symbols_count, indexed_files, binary_files, large_files, error_files,
            skipped_limit_files, truncated, truncation_reason, content_truncated,
            content_truncated_reason, skipped_json, skipped_truncated, empty)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        index.repo,
        index.ref,
        index.commit?.sha ?? null,
        index.commit?.message ?? null,
        index.commit?.author ?? null,
        index.commit?.date ?? null,
        index.generated_at,
        index.generated_at,
        index.files_total,
        index.paths_count,
        index.symbols_count,
        index.indexed_files,
        index.binary_files,
        index.large_files,
        index.error_files,
        index.skipped_limit_files,
        index.truncated ? 1 : 0,
        index.truncation_reason,
        index.content_truncated ? 1 : 0,
        index.content_truncated_reason,
        JSON.stringify(index.skipped),
        index.skipped_truncated ? 1 : 0,
        index.empty ? 1 : 0
      );
      const id = Number(result.lastInsertRowid);
      const insert = this.#db.raw.prepare(`INSERT INTO github_search_entries
            (index_id, kind, name, symbol_kind, path, line, lower_name, lower_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const entry of entries) {
        insert.run(
          id,
          entry.kind,
          entry.name,
          entry.symbol_kind,
          entry.path,
          entry.line,
          entry.name.toLowerCase(),
          entry.path.toLowerCase()
        );
      }
      return id;
    });
  }
  latestSearchIndex(repo, ref = "") {
    const row = this.#db.raw.prepare(`SELECT * FROM github_search_indexes
        WHERE repo = ? AND (? = '' OR ref = ?)
        ORDER BY id DESC LIMIT 1`).get(repo, ref, ref);
    return row ? toSearchMeta(row) : null;
  }
  searchEntries(indexId, query, limit) {
    const rows = this.#db.raw.prepare(`SELECT kind, name, symbol_kind, path, line FROM github_search_entries
        WHERE index_id = ? AND (instr(lower_name, ?) > 0 OR instr(lower_path, ?) > 0)
        LIMIT ?`).all(indexId, query.toLowerCase(), query.toLowerCase(), Math.min(Math.max(limit, 1), 2e3));
    return rows.map((row) => ({
      kind: row.kind === "symbol" ? "symbol" : "path",
      name: row.name,
      symbol_kind: row.symbol_kind ?? null,
      path: row.path,
      line: row.line
    }));
  }
};

// src/domain/github/snapshot.ts
function byPath(left, right) {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}
function capDiff(diff, limit = 200) {
  const added = diff.added.slice(0, limit);
  const modified = diff.modified.slice(0, limit);
  const deleted = diff.deleted.slice(0, limit);
  const listsTruncated = added.length < diff.added.length || modified.length < diff.modified.length || deleted.length < diff.deleted.length;
  if (!listsTruncated && diff.lists_truncated === false) return diff;
  return { ...diff, added, modified, deleted, lists_truncated: listsTruncated };
}
function diffIndexes(previous, next) {
  const before = new Map(previous.files.map((file) => [file.path, file]));
  const after = new Map(next.files.map((file) => [file.path, file]));
  const added = next.files.filter((file) => !before.has(file.path)).sort(byPath);
  const modified = [];
  for (const file of next.files) {
    const old = before.get(file.path);
    if (!old || old.sha === file.sha && old.mode === file.mode) continue;
    modified.push({
      path: file.path,
      before_sha: old.sha,
      after_sha: file.sha,
      before_size: old.size,
      after_size: file.size
    });
  }
  modified.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const deletionsUnknown = next.truncated;
  const deleted = deletionsUnknown ? [] : previous.files.filter((file) => !after.has(file.path)).map((file) => file.path).sort();
  const reasons = [];
  if (previous.truncated) reasons.push("\u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0441\u043D\u0438\u043C\u043E\u043A \u0443\u0441\u0435\u0447\u0451\u043D");
  if (next.truncated) reasons.push("\u043D\u043E\u0432\u044B\u0439 \u0441\u043D\u0438\u043C\u043E\u043A \u0443\u0441\u0435\u0447\u0451\u043D");
  return {
    added,
    modified,
    deleted,
    added_count: added.length,
    modified_count: modified.length,
    deleted_count: deleted.length,
    incomplete: previous.truncated || next.truncated,
    incomplete_reason: reasons.length ? reasons.join("; ") : null,
    deletions_unknown: deletionsUnknown,
    lists_truncated: false
  };
}

// src/domain/github/search.ts
var BINARY_EXTENSIONS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "tif",
  "tiff",
  "avif",
  "zip",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "tar",
  "jar",
  "war",
  "ear",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "mp3",
  "wav",
  "ogg",
  "flac",
  "m4a",
  "aac",
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "ttf",
  "otf",
  "woff",
  "woff2",
  "eot",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "dat",
  "db",
  "sqlite",
  "sqlite3",
  "mdb",
  "class",
  "pyc",
  "pyo",
  "o",
  "obj",
  "lib",
  "a",
  "wasm",
  "node",
  "psd",
  "ai",
  "sketch",
  "blend",
  "fbx",
  "glb",
  "gltf",
  "stl"
]);
var CODE_EXTENSIONS = /* @__PURE__ */ new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "cs",
  "rb",
  "php",
  "sh",
  "bash",
  "zsh",
  "c",
  "h",
  "cc",
  "cpp",
  "cxx",
  "hpp",
  "swift",
  "scala",
  "lua",
  "pl",
  "r",
  "sql",
  "graphql",
  "proto",
  "vue",
  "svelte"
]);
function baseName(path) {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(index + 1) : path;
}
function extensionOf(path) {
  const base = baseName(path);
  const index = base.lastIndexOf(".");
  return index > 0 ? base.slice(index + 1).toLowerCase() : "";
}
function isKnownBinaryPath(path) {
  return BINARY_EXTENSIONS.has(extensionOf(path));
}
function isCodePath(path) {
  return CODE_EXTENSIONS.has(extensionOf(path));
}
function isBinaryContent(content) {
  const sample = content.subarray(0, Math.min(content.length, 8e3));
  if (!sample.length) return false;
  let control = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || byte > 13 && byte < 32) control += 1;
  }
  return control / sample.length > 0.1;
}
var JS_RULES = [
  { re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/, kind: "function" },
  { re: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: "class" },
  { re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: "interface" },
  { re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=/, kind: "type" },
  { re: /^\s*(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/, kind: "enum" },
  { re: /^\s*(?:export\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)/, kind: "module" },
  { re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>|class\b)/, kind: "function" },
  { re: /^\s*constructor\s*\(/, kind: "method" },
  {
    re: /^\s*(?:public|private|protected|static|async|readonly|override|get|set)\s+(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::[^{;]+)?\{/,
    kind: "method"
  }
];
var PY_RULES = [
  { re: /^\s*class\s+([A-Za-z_]\w*)/, kind: "class" },
  { re: /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/, kind: "function" }
];
var GO_RULES = [
  { re: /^\s*func\s+\([^)]*\)\s*([A-Za-z_]\w*)/, kind: "method" },
  { re: /^\s*func\s+([A-Za-z_]\w*)/, kind: "function" },
  { re: /^\s*type\s+([A-Za-z_]\w*)\s+struct\b/, kind: "struct" },
  { re: /^\s*type\s+([A-Za-z_]\w*)\s+interface\b/, kind: "interface" },
  { re: /^\s*type\s+([A-Za-z_]\w*)\s+/, kind: "type" }
];
var RUST_RULES = [
  { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:const\s+)?fn\s+([A-Za-z_]\w*)/, kind: "function" },
  { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?struct\s+([A-Za-z_]\w*)/, kind: "struct" },
  { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?enum\s+([A-Za-z_]\w*)/, kind: "enum" },
  { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?trait\s+([A-Za-z_]\w*)/, kind: "trait" },
  { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?type\s+([A-Za-z_]\w*)/, kind: "type" },
  { re: /^\s*macro_rules!\s*([A-Za-z_]\w*)/, kind: "macro" }
];
var JVM_RULES = [
  { re: /^\s*(?:(?:public|private|protected|internal|abstract|final|sealed|open|data|static|partial)\s+)*(?:class|record)\s+([A-Za-z_]\w*)/, kind: "class" },
  { re: /^\s*(?:(?:public|private|protected|internal|abstract|sealed)\s+)*interface\s+([A-Za-z_]\w*)/, kind: "interface" },
  { re: /^\s*(?:(?:public|private|protected|internal)\s+)*enum\s+([A-Za-z_]\w*)/, kind: "enum" }
];
var RUBY_RULES = [
  { re: /^\s*def\s+(?:self\.)?([A-Za-z_]\w*[!?=]?)/, kind: "method" },
  { re: /^\s*class\s+([A-Za-z_]\w*)/, kind: "class" },
  { re: /^\s*module\s+([A-Za-z_]\w*)/, kind: "module" }
];
var PHP_RULES = [
  { re: /^\s*(?:public|private|protected|static|abstract|final|\s)*function\s+([A-Za-z_]\w*)/, kind: "function" },
  { re: /^\s*(?:abstract\s+|final\s+)?class\s+([A-Za-z_]\w*)/, kind: "class" },
  { re: /^\s*interface\s+([A-Za-z_]\w*)/, kind: "interface" },
  { re: /^\s*trait\s+([A-Za-z_]\w*)/, kind: "trait" }
];
var SHELL_RULES = [
  { re: /^\s*function\s+([A-Za-z_]\w*)/, kind: "function" },
  { re: /^\s*([A-Za-z_]\w*)\s*\(\)\s*\{/, kind: "function" }
];
var GENERIC_RULES = [
  { re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/, kind: "function" },
  { re: /^\s*class\s+([A-Za-z_]\w*)/, kind: "class" },
  { re: /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/, kind: "function" }
];
function rulesFor(path) {
  const ext = extensionOf(path);
  if (["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext)) return JS_RULES;
  if (["py"].includes(ext)) return PY_RULES;
  if (["go"].includes(ext)) return GO_RULES;
  if (["rs"].includes(ext)) return RUST_RULES;
  if (["java", "kt", "kts", "cs", "scala"].includes(ext)) return JVM_RULES;
  if (["rb"].includes(ext)) return RUBY_RULES;
  if (["php"].includes(ext)) return PHP_RULES;
  if (["sh", "bash", "zsh"].includes(ext)) return SHELL_RULES;
  return GENERIC_RULES;
}
function isComment(line) {
  const trimmed = line.trim();
  return !trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*") || trimmed.startsWith("/*") || trimmed.startsWith("<!--") || trimmed.startsWith("--");
}
function extractSymbols(path, text) {
  const lines = text.split(/\r?\n/);
  const rules = rulesFor(path);
  const symbols = [];
  const seen = /* @__PURE__ */ new Set();
  const python = extensionOf(path) === "py";
  let classIndent = null;
  const push = (name, kind, line) => {
    if (!name || ["if", "for", "while", "switch", "catch", "with", "return"].includes(name)) return;
    const key = `${kind}:${name}:${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    symbols.push({ name, kind, line });
  };
  lines.forEach((line, index) => {
    if (isComment(line)) return;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (python && classIndent !== null && indent <= classIndent && !/^\s*class\s+/.test(line)) {
      classIndent = null;
    }
    for (const rule of rules) {
      const match = line.match(rule.re);
      if (!match) continue;
      const name = match[1] ?? (rule.kind === "method" && /^\s*constructor\s*\(/.test(line) ? "constructor" : "");
      let kind = rule.kind;
      if (python && kind === "function" && classIndent !== null && indent > classIndent) kind = "method";
      push(name, kind, index + 1);
      if (python && kind === "class") classIndent = indent;
      break;
    }
  });
  return symbols;
}
function scoreHit(entry, query) {
  const q = query.toLowerCase();
  const name = entry.name.toLowerCase();
  const path = entry.path.toLowerCase();
  const base = baseName(path);
  let score = 0;
  if (entry.kind === "symbol") {
    if (name === q) score = 120;
    else if (name.startsWith(q)) score = 100;
    else if (name.includes(q)) score = 80;
    else if (path.includes(q)) score = 40;
    if (score > 0) score += 5;
  } else {
    if (path === q) score = 110;
    else if (base === q) score = 100;
    else if (path.startsWith(q)) score = 85;
    else if (base.startsWith(q)) score = 80;
    else if (path.includes(q)) score = 60;
    else if (base.includes(q)) score = 55;
  }
  return score;
}

// src/app/github-service.ts
var CONTENT_CONCURRENCY = 6;
var SKIPPED_LIMIT = 500;
var EMPTY_DIFF = {
  added: [],
  modified: [],
  deleted: [],
  added_count: 0,
  modified_count: 0,
  deleted_count: 0,
  incomplete: false,
  incomplete_reason: null,
  deletions_unknown: false,
  lists_truncated: false
};
function normalizeRepo(value) {
  const repo = value.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new ValidationError("\u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A owner/name");
  }
  return repo;
}
function normalizeRef(value) {
  const ref = (value ?? "").trim();
  if (!ref) return "";
  if (ref.length > 200 || !/^[\w./-]+$/.test(ref)) {
    throw new ValidationError("\u0418\u043C\u044F \u0432\u0435\u0442\u043A\u0438 \u0438\u043B\u0438 \u0442\u0435\u0433\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B");
  }
  return ref;
}
function sameSnapshot(left, right) {
  return (left.commit?.sha ?? null) === (right.commit?.sha ?? null) && left.truncated === right.truncated && left.file_count === right.file_count;
}
var GitHubService = class {
  #adapter;
  #store;
  #bus;
  #log;
  #options;
  #now;
  #timer = null;
  #checkingAll = false;
  #locks = /* @__PURE__ */ new Map();
  constructor(adapter, store, bus, log, options) {
    this.#adapter = adapter;
    this.#store = store;
    this.#bus = bus;
    this.#log = log.child({ module: "github" });
    this.#options = options;
    this.#now = options.now ?? (() => /* @__PURE__ */ new Date());
  }
  get intervalMs() {
    return this.#options.watchIntervalMs;
  }
  get running() {
    return this.#timer !== null;
  }
  get maxFiles() {
    return this.#options.maxFiles;
  }
  start() {
    if (this.#timer || this.#options.watchIntervalMs <= 0) return;
    this.#timer = setInterval(() => void this.checkAll(), this.#options.watchIntervalMs);
    this.#timer.unref();
    this.#log.info("\u0421\u0442\u043E\u0440\u043E\u0436 GitHub \u0437\u0430\u043F\u0443\u0449\u0435\u043D", { interval_ms: this.#options.watchIntervalMs });
  }
  stop() {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = null;
    this.#log.info("\u0421\u0442\u043E\u0440\u043E\u0436 GitHub \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
  }
  /** Индекс без записи в историю: дерево, коммит и честный признак усечения. */
  async index(repoInput, refInput) {
    const repo = normalizeRepo(repoInput);
    const info = await this.#adapter.repoInfo(repo);
    const ref = normalizeRef(refInput) || info.default_branch;
    const generated_at = this.#now().toISOString();
    let commit;
    try {
      commit = await this.#adapter.head(repo, ref);
    } catch (error) {
      if (error instanceof Error && "details" in error && error.details?.status === 404) {
        throw new ValidationError(`GitHub: \u0432\u0435\u0442\u043A\u0430 \xAB${ref}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 ${repo}`);
      }
      throw error;
    }
    if (!commit) {
      return {
        repo,
        ref,
        commit: null,
        files: [],
        file_count: 0,
        total_bytes: 0,
        truncated: false,
        truncation_reason: null,
        empty: true,
        generated_at
      };
    }
    const tree = await this.#adapter.tree(repo, commit.sha);
    let files = tree.files;
    let truncated = tree.truncated;
    let truncationReason = tree.truncated ? "github" : null;
    if (files.length > this.#options.maxFiles) {
      files = files.slice(0, this.#options.maxFiles);
      truncated = true;
      truncationReason = truncationReason ?? "file_limit";
    }
    return {
      repo,
      ref,
      commit,
      files,
      file_count: files.length,
      total_bytes: files.reduce((sum, file) => sum + file.size, 0),
      truncated,
      truncation_reason: truncationReason,
      empty: false,
      generated_at
    };
  }
  /** Снимок сохраняется один раз на коммит: повтор возвращает существующий. */
  async snapshot(repoInput, refInput) {
    const index = await this.index(repoInput, refInput);
    const latest = this.#store.latestSnapshot(index.repo, index.ref);
    if (latest && sameSnapshot(latest, index)) {
      return { snapshot: latest, reused: true };
    }
    const id = this.#store.insertSnapshot(index);
    this.#log.info("\u0421\u043D\u0438\u043C\u043E\u043A GitHub \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D", {
      repo: index.repo,
      ref: index.ref,
      commit: index.commit?.sha ?? null,
      files: index.file_count,
      truncated: index.truncated
    });
    return { snapshot: { ...index, id, created_at: index.generated_at }, reused: false };
  }
  get searchMaxFiles() {
    return this.#options.searchMaxFiles ?? 500;
  }
  get searchMaxBytes() {
    return this.#options.searchMaxBytes ?? 262144;
  }
  /**
   * Строит поисковый индекс путей и символов по тому же коммиту, что и
   * файловый снимок. Содержимое тянется только для текстовых кандидатов;
   * бинарные, большие и недоступные файлы получают явный статус.
   */
  async buildSearchIndex(repoInput, refInput, force = false) {
    const index = await this.index(repoInput, refInput);
    const latest = this.#store.latestSearchIndex(index.repo, index.ref);
    if (!force && latest && (latest.commit?.sha ?? null) === (index.commit?.sha ?? null) && latest.truncated === index.truncated && latest.files_total === index.file_count) {
      return { index: latest, reused: true };
    }
    const now = this.#now().toISOString();
    const maxBytes = this.searchMaxBytes;
    const maxContentFiles = this.searchMaxFiles;
    const entries = [];
    const skipped = [];
    const counts = { indexed: 0, binary: 0, large: 0, error: 0, limit: 0 };
    let skippedTruncated = false;
    const addSkipped = (file, status, reason) => {
      const key = status === "file_limit" ? "limit" : status === "too_large" ? "large" : status;
      counts[key] += 1;
      if (skipped.length < SKIPPED_LIMIT) skipped.push({ path: file.path, status, reason, bytes: file.size });
      else skippedTruncated = true;
    };
    for (const file of index.files) {
      entries.push({
        kind: "path",
        name: baseName(file.path),
        symbol_kind: null,
        path: file.path,
        line: null
      });
    }
    const candidates = [];
    for (const file of index.files) {
      if (isKnownBinaryPath(file.path)) {
        addSkipped(file, "binary", "\u0434\u0432\u043E\u0438\u0447\u043D\u043E\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0444\u0430\u0439\u043B\u0430");
      } else if (file.size > maxBytes) {
        addSkipped(file, "too_large", `\u0444\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 \u043B\u0438\u043C\u0438\u0442\u0430 ${maxBytes} \u0431\u0430\u0439\u0442`);
      } else {
        candidates.push(file);
      }
    }
    candidates.sort((left, right) => {
      const code = Number(isCodePath(right.path)) - Number(isCodePath(left.path));
      return code !== 0 ? code : left.size - right.size || (left.path < right.path ? -1 : 1);
    });
    const limited = candidates.slice(0, maxContentFiles);
    for (const file of candidates.slice(maxContentFiles)) {
      addSkipped(file, "file_limit", `\u043B\u0438\u043C\u0438\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0433\u043E ${maxContentFiles} \u0444\u0430\u0439\u043B\u043E\u0432`);
    }
    const processFile = async (file) => {
      try {
        const blob = await this.#adapter.blob(index.repo, file.sha);
        if (blob.size > maxBytes || blob.content.length > maxBytes) {
          addSkipped(file, "too_large", `\u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u043B\u0438\u043C\u0438\u0442\u0430 ${maxBytes} \u0431\u0430\u0439\u0442`);
          return;
        }
        if (isBinaryContent(blob.content)) {
          addSkipped(file, "binary", "\u0434\u0432\u043E\u0438\u0447\u043D\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435");
          return;
        }
        const symbols = extractSymbols(file.path, blob.content.toString("utf8"));
        for (const symbol of symbols) {
          entries.push({
            kind: "symbol",
            name: symbol.name,
            symbol_kind: symbol.kind,
            path: file.path,
            line: symbol.line
          });
        }
        counts.indexed += 1;
      } catch (error) {
        const status = statusOf(error);
        if (status === 401 || status === 403 || status === 429) throw error;
        addSkipped(file, "error", error instanceof Error ? error.message : String(error));
      }
    };
    let cursor = 0;
    let fatal = null;
    const workers = Array.from({ length: Math.min(CONTENT_CONCURRENCY, limited.length) }, async () => {
      while (!fatal) {
        const file = limited[cursor];
        cursor += 1;
        if (!file) return;
        try {
          await processFile(file);
        } catch (error) {
          fatal = error;
        }
      }
    });
    await Promise.all(workers);
    if (fatal) throw fatal;
    const draft = {
      repo: index.repo,
      ref: index.ref,
      commit: index.commit,
      generated_at: now,
      files_total: index.file_count,
      paths_count: index.file_count,
      symbols_count: entries.filter((entry) => entry.kind === "symbol").length,
      indexed_files: counts.indexed,
      binary_files: counts.binary,
      large_files: counts.large,
      error_files: counts.error,
      skipped_limit_files: counts.limit,
      truncated: index.truncated,
      truncation_reason: index.truncation_reason,
      content_truncated: candidates.length > maxContentFiles,
      content_truncated_reason: candidates.length > maxContentFiles ? `\u043B\u0438\u043C\u0438\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0433\u043E ${maxContentFiles} \u0444\u0430\u0439\u043B\u043E\u0432` : null,
      skipped,
      skipped_truncated: skippedTruncated,
      empty: index.empty
    };
    const id = this.#store.insertSearchIndex(draft, entries);
    const saved = { ...draft, id, created_at: now };
    this.#log.info("\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0438\u043D\u0434\u0435\u043A\u0441 GitHub \u043F\u043E\u0441\u0442\u0440\u043E\u0435\u043D", {
      repo: index.repo,
      ref: index.ref,
      commit: index.commit?.sha ?? null,
      files: draft.files_total,
      indexed: draft.indexed_files,
      symbols: draft.symbols_count,
      binary: draft.binary_files,
      large: draft.large_files,
      errors: draft.error_files,
      truncated: draft.truncated,
      content_truncated: draft.content_truncated
    });
    return { index: saved, reused: false };
  }
  latestSearchIndex(repoInput, refInput) {
    return this.#store.latestSearchIndex(normalizeRepo(repoInput), normalizeRef(refInput));
  }
  search(repoInput, queryInput, refInput, limit = 50) {
    const repo = normalizeRepo(repoInput);
    const query = queryInput.trim();
    if (!query) throw new ValidationError("\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0443\u0441\u0442");
    const index = this.#store.latestSearchIndex(repo, normalizeRef(refInput));
    if (!index) throw new NotFoundError(`\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0438\u043D\u0434\u0435\u043A\u0441 ${repo} \u043D\u0435 \u043F\u043E\u0441\u0442\u0440\u043E\u0435\u043D`);
    const raw = this.#store.searchEntries(index.id, query, 1e3);
    const scored = [];
    for (const entry of raw) {
      const score = scoreHit(entry, query);
      if (score > 0) scored.push({ ...entry, score });
    }
    scored.sort((left, right) => right.score - left.score || left.kind.localeCompare(right.kind) || left.path.localeCompare(right.path) || (left.line ?? 0) - (right.line ?? 0));
    const max = Math.min(Math.max(limit, 1), 100);
    return {
      index,
      query,
      symbols: scored.filter((entry) => entry.kind === "symbol").slice(0, max),
      paths: scored.filter((entry) => entry.kind === "path").slice(0, max),
      total: scored.length,
      matches_truncated: raw.length >= 1e3
    };
  }
  listSnapshots(repoInput, limit = 20) {
    return this.#store.listSnapshots(normalizeRepo(repoInput), limit);
  }
  /**
   * Поиск по сохранённым снимкам: слова запроса ищутся по путям, а с `deep` или
   * пустым результатом путей — ещё и по строкам файлов через GitHub API.
   * Локальные клоны не нужны, но содержимое читается с теми же лимитами.
   */
  async searchSnapshots(repoInput, queryInput, options = {}) {
    const repo = repoInput ? normalizeRepo(repoInput) : "";
    const query = queryInput.trim();
    if (!query) throw new ValidationError("\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0443\u0441\u0442");
    const words = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))].slice(0, 5);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const maxContentFiles = Math.min(Math.max(options.maxContentFiles ?? 25, 1), 100);
    const snapshots = this.#store.listRecentSnapshots(repo, 10);
    const pathHits = [];
    const others = [];
    let files = 0;
    for (const meta of snapshots) {
      const snapshot = this.#store.getSnapshot(meta.id);
      if (!snapshot) continue;
      files += snapshot.files.length;
      for (const entry of snapshot.files) {
        const lower = entry.path.toLowerCase();
        const matched = words.filter((word) => lower.includes(word)).length;
        const candidate = { snapshot: meta, file: entry, score: matched };
        if (matched > 0) pathHits.push(candidate);
        else others.push(candidate);
      }
    }
    pathHits.sort((left, right) => right.score - left.score || left.snapshot.repo.localeCompare(right.snapshot.repo) || left.file.path.localeCompare(right.file.path));
    others.sort((left, right) => left.file.size - right.file.size || left.file.path.localeCompare(right.file.path));
    const results = pathHits.slice(0, limit * 2).map((hit) => ({
      repo: hit.snapshot.repo,
      path: hit.file.path,
      kind: "path",
      line: null,
      text: null,
      snapshot_id: hit.snapshot.id,
      commit_sha: hit.snapshot.commit?.sha ?? null,
      score: hit.score * 10
    }));
    let contentFiles = 0;
    let skippedFiles = 0;
    const wantContent = options.deep === true || results.length === 0;
    let contentTruncated = false;
    if (wantContent) {
      const candidates = [...pathHits, ...others];
      if (candidates.length > maxContentFiles) contentTruncated = true;
      for (const candidate of candidates.slice(0, maxContentFiles)) {
        if (candidate.file.size > this.searchMaxBytes) {
          skippedFiles += 1;
          continue;
        }
        let blob;
        try {
          blob = await this.#adapter.blob(candidate.snapshot.repo, candidate.file.sha);
        } catch {
          skippedFiles += 1;
          continue;
        }
        contentFiles += 1;
        if (isBinaryContent(blob.content)) {
          skippedFiles += 1;
          continue;
        }
        const lines = blob.content.toString("utf8").split(/\r?\n/);
        let perFile = 0;
        for (let index = 0; index < lines.length && perFile < 3; index += 1) {
          const line = lines[index] ?? "";
          const lower = line.toLowerCase();
          const matched = words.filter((word) => lower.includes(word)).length;
          if (!matched) continue;
          results.push({
            repo: candidate.snapshot.repo,
            path: candidate.file.path,
            kind: "content",
            line: index + 1,
            text: line.trim().slice(0, 240),
            snapshot_id: candidate.snapshot.id,
            commit_sha: candidate.snapshot.commit?.sha ?? null,
            score: matched * 10 + 5
          });
          perFile += 1;
        }
      }
    }
    results.sort((left, right) => right.score - left.score || left.repo.localeCompare(right.repo) || left.path.localeCompare(right.path) || (left.line ?? 0) - (right.line ?? 0));
    const source = contentFiles === 0 ? "index" : results.some((hit) => hit.kind === "path") ? "mixed" : "scan";
    return {
      query,
      repo: repo || null,
      deep: wantContent,
      source,
      results: results.slice(0, limit).map(({ score: _score, ...hit }) => hit),
      total: results.length,
      truncated: contentTruncated || results.length > limit,
      scanned: { snapshots: snapshots.length, files, content_files: contentFiles, skipped_files: skippedFiles }
    };
  }
  getSnapshot(id) {
    const snapshot = this.#store.getSnapshot(id);
    if (!snapshot) throw new NotFoundError(`\u0421\u043D\u0438\u043C\u043E\u043A ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    return snapshot;
  }
  getWatch(repoInput) {
    return this.#store.getWatch(normalizeRepo(repoInput));
  }
  listWatches() {
    return this.#store.listWatches();
  }
  listEvents(repoInput, limit = 20) {
    return this.#store.listEvents(normalizeRepo(repoInput), limit);
  }
  async addWatch(repoInput, refInput) {
    const repo = normalizeRepo(repoInput);
    const index = await this.index(repo, refInput);
    const latest = this.#store.latestSnapshot(repo, index.ref);
    let snapshotId;
    let baseline = false;
    if (latest && sameSnapshot(latest, index)) {
      snapshotId = latest.id;
    } else {
      snapshotId = this.#store.insertSnapshot(index);
      baseline = !latest;
    }
    const existing = this.#store.getWatch(repo);
    const keepHistory = existing !== null && existing.ref === index.ref && latest !== null;
    const now = this.#now();
    const watch = {
      repo,
      ref: index.ref,
      enabled: true,
      last_checked_at: now.toISOString(),
      last_commit_sha: index.commit?.sha ?? null,
      last_snapshot_id: snapshotId,
      last_error: null,
      next_check_at: this.#nextCheck(now),
      last_change_at: keepHistory ? existing.last_change_at : null,
      last_added: keepHistory ? existing.last_added : 0,
      last_modified: keepHistory ? existing.last_modified : 0,
      last_deleted: keepHistory ? existing.last_deleted : 0,
      last_diff: keepHistory ? existing.last_diff : null
    };
    this.#store.saveWatch(watch);
    if (baseline) {
      this.#store.recordEvent({
        repo,
        commit_sha: index.commit?.sha ?? null,
        created_at: now.toISOString(),
        baseline: true,
        added: 0,
        modified: 0,
        deleted: 0,
        diff: EMPTY_DIFF
      });
    }
    this.#log.info("\u0421\u0442\u043E\u0440\u043E\u0436 GitHub \u0432\u043A\u043B\u044E\u0447\u0451\u043D", { repo, ref: index.ref, baseline });
    return watch;
  }
  setWatchEnabled(repoInput, enabled) {
    const repo = normalizeRepo(repoInput);
    const watch = this.#store.getWatch(repo);
    if (!watch) throw new NotFoundError(`\u0421\u0442\u043E\u0440\u043E\u0436 \u0434\u043B\u044F ${repo} \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0451\u043D`);
    const next = {
      ...watch,
      enabled,
      next_check_at: enabled ? this.#nextCheck(this.#now()) : null
    };
    this.#store.saveWatch(next);
    return next;
  }
  removeWatch(repoInput) {
    return this.#store.removeWatch(normalizeRepo(repoInput));
  }
  /** Ручная проверка одного репозитория или всех включённых сторожей. */
  async checkAll() {
    if (this.#checkingAll) return [];
    this.#checkingAll = true;
    try {
      const watches = this.#store.listWatches().filter((watch) => watch.enabled);
      const results = [];
      for (const watch of watches) {
        results.push(await this.check(watch.repo));
      }
      return results;
    } finally {
      this.#checkingAll = false;
    }
  }
  async check(repoInput, refInput) {
    const repo = normalizeRepo(repoInput);
    const existing = this.#locks.get(repo);
    if (existing) return existing;
    const work = this.#checkLocked(repo, refInput).finally(() => this.#locks.delete(repo));
    this.#locks.set(repo, work);
    return work;
  }
  async #checkLocked(repo, refInput) {
    const watch = this.#store.getWatch(repo);
    const ref = watch?.ref ?? normalizeRef(refInput);
    const checkedAt = this.#now().toISOString();
    let index;
    try {
      index = await this.index(repo, ref);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (watch) {
        this.#store.saveWatch({
          ...watch,
          last_checked_at: checkedAt,
          last_error: message,
          next_check_at: this.#nextCheck(this.#now())
        });
      }
      this.#log.warn("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 GitHub \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C", { repo, error: message });
      return {
        repo,
        ref: ref || "",
        ok: false,
        changed: false,
        baseline: false,
        unchanged: false,
        checked_at: checkedAt,
        commit_sha: null,
        snapshot_id: null,
        diff: null,
        error: message
      };
    }
    const latest = this.#store.latestSnapshot(repo, index.ref);
    const unchanged = latest !== null && sameSnapshot(latest, index);
    const now = this.#now();
    if (unchanged && latest) {
      if (watch) {
        this.#store.saveWatch({
          ...watch,
          ref: index.ref,
          last_checked_at: now.toISOString(),
          last_commit_sha: index.commit?.sha ?? null,
          last_snapshot_id: latest.id,
          last_error: null,
          next_check_at: this.#nextCheck(now)
        });
      }
      return {
        repo,
        ref: index.ref,
        ok: true,
        changed: false,
        baseline: false,
        unchanged: true,
        checked_at: now.toISOString(),
        commit_sha: index.commit?.sha ?? null,
        snapshot_id: latest.id,
        diff: null,
        error: null
      };
    }
    const baseline = latest === null;
    const diff = baseline ? EMPTY_DIFF : capDiff(diffIndexes(latest, index));
    const snapshotId = this.#store.insertSnapshot(index);
    const recorded = this.#store.recordEvent({
      repo,
      commit_sha: index.commit?.sha ?? null,
      created_at: now.toISOString(),
      baseline,
      added: diff.added_count,
      modified: diff.modified_count,
      deleted: diff.deleted_count,
      diff
    });
    const counts = diff.added_count + diff.modified_count + diff.deleted_count;
    const changed = !baseline && (counts > 0 || diff.incomplete);
    if (watch) {
      this.#store.saveWatch({
        ...watch,
        ref: index.ref,
        last_checked_at: now.toISOString(),
        last_commit_sha: index.commit?.sha ?? null,
        last_snapshot_id: snapshotId,
        last_error: null,
        next_check_at: this.#nextCheck(now),
        last_change_at: changed ? now.toISOString() : watch.last_change_at,
        last_added: diff.added_count,
        last_modified: diff.modified_count,
        last_deleted: diff.deleted_count,
        last_diff: changed ? diff : watch.last_diff
      });
    }
    if (!baseline && recorded && changed) {
      this.#bus.publish({
        type: "github.watch_changed",
        entity: { kind: "github", id: repo },
        actor: "github-watch",
        at: now.toISOString(),
        data: {
          repo,
          ref: index.ref,
          commit: index.commit?.sha ?? null,
          added: diff.added_count,
          modified: diff.modified_count,
          deleted: diff.deleted_count,
          incomplete: diff.incomplete
        }
      });
    }
    this.#log.info("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 GitHub \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430", {
      repo,
      ref: index.ref,
      baseline,
      added: diff.added_count,
      modified: diff.modified_count,
      deleted: diff.deleted_count,
      incomplete: diff.incomplete
    });
    return {
      repo,
      ref: index.ref,
      ok: true,
      changed,
      baseline,
      unchanged: false,
      checked_at: now.toISOString(),
      commit_sha: index.commit?.sha ?? null,
      snapshot_id: snapshotId,
      diff,
      error: null
    };
  }
  #nextCheck(now) {
    if (this.#options.watchIntervalMs <= 0) return null;
    return new Date(now.getTime() + this.#options.watchIntervalMs).toISOString();
  }
};
function statusOf(error) {
  if (!error || typeof error !== "object" || !("details" in error)) return null;
  const details = error.details;
  return typeof details?.status === "number" ? details.status : null;
}

// src/adapters/http/router.ts
var Router = class {
  #routes = [];
  #mounts = [];
  add(method, path, handler) {
    this.#routes.push({
      method: method.toUpperCase(),
      segments: path.split("/").filter(Boolean),
      handler
    });
    return this;
  }
  get routes() {
    return this.#routes.length;
  }
  /**
   * Подключить чужой роутер под префиксом: пути внутри него считаются
   * относительными. Так модуль получает `/m/<id>/…` и не спорит с ядром
   * за общие адреса.
   */
  mount(prefix, router) {
    this.#mounts.push({ segments: prefix.split("/").filter(Boolean), router });
    return this;
  }
  /** Снять все вложенные роутеры: нужна при перезагрузке модулей. */
  clearMounts() {
    this.#mounts.length = 0;
    return this;
  }
  match(method, pathname) {
    const root = this.#matchMount(method, pathname, true);
    if (root) return root;
    const own = this.#matchRoute(method, pathname);
    if (own) return own;
    return this.#matchMount(method, pathname, false);
  }
  #matchMount(method, pathname, rootOnly) {
    const parts = pathname.split("/").filter(Boolean);
    for (const mount of this.#mounts) {
      if (rootOnly !== (mount.segments.length === 0)) continue;
      if (mount.segments.length > parts.length) continue;
      const params = {};
      let matched = true;
      for (let i = 0; i < mount.segments.length; i += 1) {
        const expected = mount.segments[i];
        const actual = parts[i];
        if (expected.startsWith(":")) {
          params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;
      const rest = parts.slice(mount.segments.length).join("/");
      const inner = mount.router.match(method, `/${rest}`);
      if (inner) return { handler: inner.handler, params: { ...params, ...inner.params } };
    }
    return null;
  }
  #matchRoute(method, pathname) {
    const parts = pathname.split("/").filter(Boolean);
    for (const route of this.#routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.segments.length !== parts.length) continue;
      const params = {};
      let matched = true;
      for (let i = 0; i < route.segments.length; i += 1) {
        const expected = route.segments[i];
        const actual = parts[i];
        if (expected.startsWith(":")) {
          params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
          matched = false;
          break;
        }
      }
      if (matched) return { handler: route.handler, params };
    }
    return null;
  }
};
var ScopedRouter = class extends Router {
  #prefixes;
  #mode;
  constructor(prefixes, mode = "allow") {
    super();
    this.#prefixes = prefixes.map((prefix) => prefix.replace(/\/+$/, ""));
    this.#mode = mode;
  }
  #matches(pathname) {
    return this.#prefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  }
  match(method, pathname) {
    const matched = this.#matches(pathname);
    if (this.#mode === "allow" ? !matched : matched) return null;
    return super.match(method, pathname);
  }
};

// src/modules/github/schema.ts
var githubMigrations = [
  {
    version: "github/0001_snapshots_watch",
    sql: `
      CREATE TABLE github_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo TEXT NOT NULL,
        ref TEXT NOT NULL,
        commit_sha TEXT,
        commit_message TEXT,
        commit_author TEXT,
        commit_date TEXT,
        generated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        files_json TEXT NOT NULL,
        file_count INTEGER NOT NULL,
        total_bytes INTEGER NOT NULL,
        truncated INTEGER NOT NULL DEFAULT 0,
        truncation_reason TEXT,
        empty INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX github_snapshots_repo ON github_snapshots (repo, ref, id DESC);

      CREATE TABLE github_watch (
        repo TEXT PRIMARY KEY,
        ref TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_checked_at TEXT,
        last_commit_sha TEXT,
        last_snapshot_id INTEGER,
        last_error TEXT,
        next_check_at TEXT,
        last_change_at TEXT,
        last_added INTEGER NOT NULL DEFAULT 0,
        last_modified INTEGER NOT NULL DEFAULT 0,
        last_deleted INTEGER NOT NULL DEFAULT 0,
        last_diff TEXT
      );

      CREATE TABLE github_watch_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        created_at TEXT NOT NULL,
        baseline INTEGER NOT NULL DEFAULT 0,
        added INTEGER NOT NULL DEFAULT 0,
        modified INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0,
        diff_json TEXT NOT NULL,
        UNIQUE (repo, commit_sha)
      );
      CREATE INDEX github_watch_events_repo ON github_watch_events (repo, id DESC);
    `
  },
  {
    version: "github/0002_search_index",
    sql: `
      CREATE TABLE github_search_indexes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo TEXT NOT NULL,
        ref TEXT NOT NULL,
        commit_sha TEXT,
        commit_message TEXT,
        commit_author TEXT,
        commit_date TEXT,
        generated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        files_total INTEGER NOT NULL,
        paths_count INTEGER NOT NULL,
        symbols_count INTEGER NOT NULL,
        indexed_files INTEGER NOT NULL,
        binary_files INTEGER NOT NULL,
        large_files INTEGER NOT NULL,
        error_files INTEGER NOT NULL,
        skipped_limit_files INTEGER NOT NULL,
        truncated INTEGER NOT NULL DEFAULT 0,
        truncation_reason TEXT,
        content_truncated INTEGER NOT NULL DEFAULT 0,
        content_truncated_reason TEXT,
        skipped_json TEXT NOT NULL,
        skipped_truncated INTEGER NOT NULL DEFAULT 0,
        empty INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX github_search_indexes_repo ON github_search_indexes (repo, ref, id DESC);

      CREATE TABLE github_search_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        index_id INTEGER NOT NULL REFERENCES github_search_indexes (id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        symbol_kind TEXT,
        path TEXT NOT NULL,
        line INTEGER,
        lower_name TEXT NOT NULL,
        lower_path TEXT NOT NULL
      );
      CREATE INDEX github_search_entries_index ON github_search_entries (index_id);
      CREATE INDEX github_search_entries_name ON github_search_entries (index_id, lower_name);
      CREATE INDEX github_search_entries_path ON github_search_entries (index_id, lower_path);
    `
  }
];

// src/modules/github/github.module.ts
function stringField(body, name, required = true) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (value === void 0 || value === null) {
    if (required) throw new ValidationError(`\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 ${name}`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  return value;
}
function boolField(body, name) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (typeof value !== "boolean") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C true \u0438\u043B\u0438 false`);
  return value;
}
function numberParam(raw, fallback, min, max) {
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}
function registerGitHubRoutes(router, github) {
  router.add("GET", "/api/tools/github/index", async (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    const index = await github.index(repo, c.query.get("ref") ?? void 0);
    const limit = numberParam(c.query.get("limit"), 100, 1, 500);
    const files = index.files.slice(0, limit);
    return {
      body: {
        ok: true,
        index: { ...index, files },
        files_total: index.files.length,
        files_truncated: files.length < index.files.length
      }
    };
  });
  router.add("POST", "/api/tools/github/snapshot", async (c) => {
    const result = await github.snapshot(stringField(c.body, "repo"), stringField(c.body, "ref", false) || void 0);
    const files = result.snapshot.files.slice(0, 100);
    return {
      body: {
        ok: true,
        reused: result.reused,
        snapshot: { ...result.snapshot, files },
        files_total: result.snapshot.files.length,
        files_truncated: files.length < result.snapshot.files.length
      }
    };
  });
  router.add("GET", "/api/tools/github/snapshots", (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    return {
      body: {
        ok: true,
        snapshots: github.listSnapshots(repo, numberParam(c.query.get("limit"), 20, 1, 100))
      }
    };
  });
  router.add("GET", "/api/tools/github/snapshots/search", async (c) => {
    const query = c.query.get("q") ?? "";
    if (!query.trim()) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 q");
    return {
      body: {
        ok: true,
        ...await github.searchSnapshots(
          c.query.get("repo") ?? void 0,
          query,
          {
            deep: c.query.get("deep") === "1" || c.query.get("deep") === "true",
            limit: numberParam(c.query.get("limit"), 20, 1, 100)
          }
        )
      }
    };
  });
  router.add("GET", "/api/tools/github/snapshots/:id", (c) => {
    const id = Number(c.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError("id \u0441\u043D\u0438\u043C\u043A\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0446\u0435\u043B\u044B\u043C");
    const snapshot = github.getSnapshot(id);
    const offset = numberParam(c.query.get("offset"), 0, 0, 1e6);
    const limit = numberParam(c.query.get("limit"), 100, 1, 500);
    const files = snapshot.files.slice(offset, offset + limit);
    return {
      body: {
        ok: true,
        snapshot: { ...snapshot, files: [] },
        files,
        offset,
        total: snapshot.files.length,
        next_offset: offset + files.length < snapshot.files.length ? offset + files.length : null
      }
    };
  });
  router.add("GET", "/api/tools/github/watch", () => ({
    body: {
      ok: true,
      watches: github.listWatches(),
      interval_ms: github.intervalMs,
      running: github.running
    }
  }));
  router.add("POST", "/api/tools/github/watch", async (c) => ({
    body: {
      ok: true,
      watch: await github.addWatch(stringField(c.body, "repo"), stringField(c.body, "ref", false) || void 0)
    }
  }));
  router.add("POST", "/api/tools/github/watch/toggle", (c) => ({
    body: {
      ok: true,
      watch: github.setWatchEnabled(stringField(c.body, "repo"), boolField(c.body, "enabled"))
    }
  }));
  router.add("POST", "/api/tools/github/watch/remove", (c) => ({
    body: { ok: true, removed: github.removeWatch(stringField(c.body, "repo")) }
  }));
  router.add("POST", "/api/tools/github/watch/run", async (c) => {
    const repo = stringField(c.body, "repo", false);
    const results = repo ? [await github.check(repo, stringField(c.body, "ref", false) || void 0)] : await github.checkAll();
    return { body: { ok: true, results } };
  });
  router.add("GET", "/api/tools/github/search-index", (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    return {
      body: {
        ok: true,
        index: github.latestSearchIndex(repo, c.query.get("ref") ?? void 0)
      }
    };
  });
  router.add("POST", "/api/tools/github/search-index", async (c) => {
    const body = c.body && typeof c.body === "object" ? c.body : {};
    if (body.force !== void 0 && typeof body.force !== "boolean") {
      throw new ValidationError("\u041F\u043E\u043B\u0435 force \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C true \u0438\u043B\u0438 false");
    }
    const result = await github.buildSearchIndex(
      stringField(c.body, "repo"),
      stringField(c.body, "ref", false) || void 0,
      body.force === true
    );
    return { body: { ok: true, reused: result.reused, index: result.index } };
  });
  router.add("GET", "/api/tools/github/search", (c) => {
    const repo = c.query.get("repo") ?? "";
    const query = c.query.get("q") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    if (!query.trim()) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 q");
    return {
      body: {
        ok: true,
        ...github.search(
          repo,
          query,
          c.query.get("ref") ?? void 0,
          numberParam(c.query.get("limit"), 50, 1, 100)
        )
      }
    };
  });
  router.add("GET", "/api/tools/github/watch/events", (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    return {
      body: {
        ok: true,
        events: github.listEvents(repo, numberParam(c.query.get("limit"), 20, 1, 100))
      }
    };
  });
}

// src/modules/tools/tools.module.ts
function stringField2(body, name, required = true) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (value === void 0 || value === null) {
    if (required) throw new ValidationError(`\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 ${name}`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  return value;
}
function boolField2(body, name) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (typeof value !== "boolean") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C boolean`);
  return value;
}
function numberParam2(raw, fallback, min, max) {
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}
function registerToolsRoutes(router, deps) {
  const { tools, toolbox, entire } = deps;
  router.add("GET", "/api/tools", async (c) => ({
    body: { ok: true, ...await tools.catalog(c.query.get("refresh") === "1") }
  }));
  router.add("GET", "/api/tools/telegram/status", async () => ({
    body: { ok: true, status: await tools.telegramSnapshot() }
  }));
  router.add("POST", "/api/tools/telegram/configure", (c) => {
    const body = c.body && typeof c.body === "object" ? c.body : {};
    const input = { ...body };
    for (const key of ["owners", "contacts", "groups"]) {
      if (typeof input[key] === "string") input[key] = input[key].split(/[\s,]+/).filter(Boolean);
    }
    return { body: { ok: true, status: tools.configureTelegram(input) } };
  });
  router.add("POST", "/api/tools/telegram/login", async (c) => ({
    body: { ok: true, status: await tools.beginTelegramLogin(stringField2(c.body, "phone")) }
  }));
  router.add("GET", "/api/tools/telegram/auth-status", async () => ({
    body: { ok: true, status: await tools.telegramSnapshot() }
  }));
  router.add("POST", "/api/tools/telegram/code", (c) => ({
    body: { ok: true, status: tools.submitTelegramCode(stringField2(c.body, "code")) }
  }));
  router.add("POST", "/api/tools/telegram/password", (c) => ({
    body: { ok: true, status: tools.submitTelegramPassword(stringField2(c.body, "password")) }
  }));
  router.add("POST", "/api/tools/telegram/cancel-login", async () => ({
    body: { ok: true, status: await tools.cancelTelegramLogin() }
  }));
  router.add("POST", "/api/tools/telegram/check", async () => ({
    body: { ok: true, status: await tools.checkTelegram() }
  }));
  router.add("POST", "/api/tools/telegram/send", async (c) => ({
    body: { ok: true, ...await tools.sendTelegram(stringField2(c.body, "chat"), stringField2(c.body, "text")) }
  }));
  router.add("POST", "/api/tools/telegram/logout", async () => ({
    body: { ok: true, status: await tools.logoutTelegram() }
  }));
  router.add("GET", "/api/tools/entire", async () => ({
    body: {
      ok: true,
      status: await toolbox.entireStatus(),
      sync: entire.overview()
    }
  }));
  router.add("POST", "/api/tools/entire/sync", () => ({
    status: 202,
    body: { ok: true, sync: entire.startSync() }
  }));
  router.add("PUT", "/api/tools/entire/settings", (c) => ({
    body: { ok: true, sync: entire.configure(c.body) }
  }));
  router.add("GET", "/api/tools/freebuff", async () => ({
    body: { ok: true, status: await toolbox.freebuffStatus() }
  }));
  router.add("GET", "/api/tools/freebuff/models", async () => ({
    body: { ok: true, models: await toolbox.freebuffModels() }
  }));
  router.add("POST", "/api/tools/freebuff/chat", async (c) => ({
    body: { ok: true, result: await toolbox.freebuffChat(c.body) }
  }));
  router.add("GET", "/api/tools/reserve", () => ({
    body: { ok: true, state: toolbox.reserve() }
  }));
  router.add("PUT", "/api/tools/reserve", (c) => ({
    body: { ok: true, state: toolbox.configureReserve(c.body) }
  }));
  router.add("POST", "/api/tools/reserve/items", (c) => ({
    body: { ok: true, state: toolbox.addReserve(stringField2(c.body, "task_id")) }
  }));
  router.add("DELETE", "/api/tools/reserve/items/:task", (c) => ({
    body: { ok: true, state: toolbox.removeReserve(c.params.task ?? "") }
  }));
  router.add("GET", "/api/tools/spare", () => ({
    body: { ok: true, state: toolbox.spare() }
  }));
  router.add("PUT", "/api/tools/spare", (c) => ({
    body: { ok: true, state: toolbox.configureSpare(c.body) }
  }));
  router.add("POST", "/api/tools/spare/override", (c) => ({
    body: { ok: true, state: toolbox.setSpareOverride(c.body) }
  }));
  router.add("GET", "/api/tools/providers/guard", () => ({
    body: { ok: true, state: toolbox.providerGuard() }
  }));
  router.add("PUT", "/api/tools/providers/guard", (c) => ({
    body: { ok: true, state: toolbox.configureProviderGuard(c.body) }
  }));
  router.add("POST", "/api/tools/providers/configure", (c) => ({
    body: {
      ok: true,
      settings: tools.configureProvider(stringField2(c.body, "id"), stringField2(c.body, "key", false))
    }
  }));
  router.add("POST", "/api/tools/sites/configure", (c) => {
    const site = stringField2(c.body, "site").trim().toLowerCase();
    const fields = c.body && typeof c.body === "object" ? c.body.fields : void 0;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043E\u0431\u044A\u0435\u043A\u0442 fields \u0441 \u043F\u043E\u043B\u044F\u043C\u0438 \u0441\u0430\u0439\u0442\u0430");
    }
    const values = {};
    for (const [name, value] of Object.entries(fields)) {
      if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
      values[name] = value;
    }
    if (!Object.keys(values).length) throw new ValidationError("\u041D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043E \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044F \u0441\u0430\u0439\u0442\u0430");
    return { body: { ok: true, settings: tools.configureSite(site, values) } };
  });
  router.add("POST", "/api/tools/:id/configure", (c) => ({
    body: { ok: true, settings: tools.configure(c.params.id ?? "", c.body) }
  }));
  router.add("POST", "/api/tools/:id/test", async (c) => ({
    body: { ok: true, status: await tools.test(c.params.id ?? "") }
  }));
  router.add("POST", "/api/tools/github/accounts/active", (c) => ({
    body: { ok: true, settings: tools.setGithubAccount(stringField2(c.body, "login")) }
  }));
  router.add("GET", "/api/tools/vault", () => ({
    body: { ok: true, ...tools.vault() }
  }));
  router.add("DELETE", "/api/tools/sites/:site", (c) => ({
    body: { ok: true, settings: tools.removeSite(c.params.site ?? "") }
  }));
  router.add("GET", "/api/tools/agents", () => ({
    body: { ok: true, ...tools.agents() }
  }));
  router.add("GET", "/api/tools/github/pulls", async (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    const state = c.query.get("state");
    if (state && !["open", "closed", "all"].includes(state)) {
      throw new ValidationError("state: open, closed \u0438\u043B\u0438 all");
    }
    return {
      body: {
        ok: true,
        pulls: await tools.pulls(
          repo,
          state ?? "open",
          numberParam2(c.query.get("limit"), 20, 1, 100)
        )
      }
    };
  });
  router.add("GET", "/api/tools/github/pulls/:number", async (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    const number = Number(c.params.number);
    if (!Number.isInteger(number) || number < 1) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043D\u043E\u043C\u0435\u0440 PR");
    return { body: { ok: true, pull: await tools.pull(repo, number) } };
  });
  router.add("POST", "/api/tools/github/pulls", async (c) => ({
    body: {
      ok: true,
      pull: await tools.createPull(stringField2(c.body, "repo"), {
        title: stringField2(c.body, "title"),
        head: stringField2(c.body, "head"),
        base: stringField2(c.body, "base"),
        body: stringField2(c.body, "body", false),
        draft: c.body && typeof c.body === "object" ? c.body.draft === true : false
      })
    }
  }));
  router.add("GET", "/api/tools/github/repos", async (c) => ({
    body: {
      ok: true,
      repos: await tools.repos(numberParam2(c.query.get("limit"), 20, 1, 100))
    }
  }));
  router.add("GET", "/api/tools/github/issues", async (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    return {
      body: { ok: true, issues: await tools.issues(repo, numberParam2(c.query.get("limit"), 20, 1, 100)) }
    };
  });
  router.add("POST", "/api/tools/github/issues", async (c) => ({
    body: {
      ok: true,
      issue: await tools.createIssue(
        stringField2(c.body, "repo"),
        stringField2(c.body, "title"),
        stringField2(c.body, "body", false)
      )
    }
  }));
  router.add("GET", "/api/tools/discord/status", () => ({
    body: { ok: true, status: tools.discordStatus() }
  }));
  router.add("POST", "/api/tools/discord/bot", async (c) => ({
    body: { ok: true, status: await tools.configureDiscordBot(boolField2(c.body, "enabled")) }
  }));
  router.add("POST", "/api/tools/discord/bot/check", async () => ({
    body: { ok: true, status: await tools.checkDiscordBot() }
  }));
  router.add("POST", "/api/tools/discord/presence", async (c) => ({
    body: { ok: true, status: await tools.setDiscordPresence(boolField2(c.body, "enabled")) }
  }));
  router.add("GET", "/api/tools/discord/personal", async () => ({
    body: { ok: true, channels: await tools.personalChannels() }
  }));
  router.add("POST", "/api/tools/discord/personal/send", async (c) => ({
    body: {
      ok: true,
      ...await tools.sendPersonal(
        stringField2(c.body, "channel_id"),
        stringField2(c.body, "content")
      )
    }
  }));
  router.add("GET", "/api/tools/discord/guilds", async () => ({
    body: { ok: true, guilds: await tools.guilds() }
  }));
  router.add("GET", "/api/tools/discord/channels", async (c) => ({
    body: {
      ok: true,
      channels: await tools.channels(c.query.get("guild") ?? "")
    }
  }));
  router.add("POST", "/api/tools/discord/send", async (c) => ({
    body: { ok: true, ...await tools.sendDiscord(stringField2(c.body, "content")) }
  }));
  router.add("POST", "/api/tools/discord/test-send", async () => ({
    body: { ok: true, ...await tools.sendDiscordTest() }
  }));
  router.add("POST", "/api/tools/discord/file", async (c) => {
    const name = stringField2(c.body, "name");
    const encoded = stringField2(c.body, "data");
    if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new ValidationError("\u041F\u043E\u043B\u0435 data \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C base64");
    }
    if (encoded.length > 36e6) throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 25 \u041C\u0411");
    const data = Buffer.from(encoded, "base64");
    if (data.toString("base64") !== encoded || data.byteLength > 25 * 1024 * 1024) {
      throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u043B\u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0444\u0430\u0439\u043B");
    }
    return {
      body: {
        ok: true,
        ...await tools.sendDiscordFile(name, data, stringField2(c.body, "text", false))
      }
    };
  });
  router.add("GET", "/api/tools/google/calendar", async (c) => ({
    body: {
      ok: true,
      events: await tools.calendar(numberParam2(c.query.get("days"), 7, 1, 30))
    }
  }));
  router.add("GET", "/api/tools/google/mail", async (c) => ({
    body: {
      ok: true,
      messages: await tools.mail(numberParam2(c.query.get("limit"), 10, 1, 20))
    }
  }));
  router.add("GET", "/api/tools/google/drive", async (c) => ({
    body: {
      ok: true,
      files: await tools.drive(numberParam2(c.query.get("limit"), 10, 1, 20))
    }
  }));
}

// src/modules/tools/integration-page.ts
function integrationPage(title, summary) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  main { max-width: 720px; padding: 28px 24px; display: grid; gap: 16px; }
  h1 { margin: 0; font-size: 22px; }
  p { margin: 0; color: #aab4c5; }
  a { color: #8fb4ff; }
  .links { display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; }
  .card { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
</style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p>${summary}</p>
  <div class="card">
    <p>\u041C\u043E\u0434\u0443\u043B\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D. \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u2014 \u0432 \u043E\u0431\u0449\u0435\u043C \u043C\u043E\u0434\u0443\u043B\u0435 \xAB\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B\xBB.</p>
  </div>
  <div class="links">
    <a href="/m/tools/">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B</a>
    <a href="/">\u041A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443</a>
  </div>
</main>
</body>
</html>`;
}

// modules/github/index.ts
var module = {
  id: "github",
  apiVersion: 1,
  migrations: [...githubMigrations],
  register(ctx) {
    const host = ctx.require("tools");
    host.tools.enable("github");
    const github = new GitHubService(
      new GitHubAdapter(() => host.store.get().github),
      new SqliteGitHubStore(ctx.storage),
      ctx.bus,
      ctx.log,
      { ...ctx.settings.github }
    );
    const api = new ScopedRouter(["/api/tools/github"]);
    registerToolsRoutes(api, host);
    registerGitHubRoutes(api, github);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: integrationPage(
        "GitHub",
        "\u0422\u043E\u043A\u0435\u043D\u044B, \u043F\u0443\u043B-\u0440\u0435\u043A\u0432\u0435\u0441\u0442\u044B, \u0437\u0430\u0434\u0430\u0447\u0438, \u043F\u043E\u0438\u0441\u043A \u043F\u043E \u043A\u043E\u0434\u0443 \u0438 \u0441\u0442\u043E\u0440\u043E\u0436 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0435\u0432."
      ),
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    github.start();
    ctx.onShutdown(() => github.stop());
  }
};
var index_default = module;
export {
  index_default as default
};
