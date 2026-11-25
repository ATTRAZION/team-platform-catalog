import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/open-library-search/index.ts
import { createHash } from "node:crypto";
import { lstatSync as lstatSync2, mkdirSync as mkdirSync2, readFileSync, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/open-library-search/rate-gate.ts
import { DatabaseSync } from "node:sqlite";
import { lstatSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
var INTERVAL_MS = 3500;
function acquireRateLease(now = Date.now()) {
  const dir = process.env.TEAM_OPEN_LIBRARY_RATE_DIR || join(tmpdir(), "team-platform-open-library-rate-v1");
  let guard, state, held = false;
  const close = () => {
    if (state) {
      try {
        state.close();
      } catch {
      }
      state = void 0;
    }
    if (guard) {
      if (held) {
        try {
          guard.exec("ROLLBACK");
        } catch {
        }
        held = false;
      }
      try {
        guard.close();
      } catch {
      }
      guard = void 0;
    }
  };
  try {
    mkdirSync(dir, { recursive: true });
    if (!lstatSync(dir).isDirectory()) throw new Error("invalid_directory");
    const guardPath = join(dir, "guard.sqlite"), statePath = join(dir, "state.sqlite");
    for (const path of [guardPath, statePath]) {
      try {
        if (!lstatSync(path).isFile()) throw new Error("invalid_database_path");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    guard = new DatabaseSync(guardPath);
    guard.exec("PRAGMA busy_timeout=0");
    try {
      guard.exec("BEGIN IMMEDIATE");
      held = true;
    } catch (error) {
      if (/locked|busy/i.test(String(error))) {
        close();
        return { status: "busy" };
      }
      throw error;
    }
    state = new DatabaseSync(statePath);
    state.exec("PRAGMA busy_timeout=0; CREATE TABLE IF NOT EXISTS throttle (id INTEGER PRIMARY KEY CHECK(id=1), started INTEGER NOT NULL)");
    const row = state.prepare("SELECT started FROM throttle WHERE id=1").get();
    if (row && (!Number.isSafeInteger(row.started) || row.started < 0)) throw new Error("invalid_state");
    if (row && now - row.started < INTERVAL_MS) {
      close();
      return { status: "busy" };
    }
    state.prepare("INSERT INTO throttle (id, started) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET started=excluded.started").run(now);
    state.close();
    state = void 0;
    return { status: "ready", release: close };
  } catch {
    close();
    return { status: "unavailable" };
  }
}

// modules/open-library-search/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "", id = process.env.TEAM_TASK_ID || "", port = Number(portText);
  if (!/^\d{1,5}$/.test(portText) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u0438\u043B\u0438 \u0437\u0430\u0434\u0430\u0447\u0430.\n");
    process.exitCode = 1;
    return;
  }
  try {
    const base = `http://127.0.0.1:${port}`;
    const taskResponse = await fetch(`${base}/api/tasks/${encodeURIComponent(id)}`, { redirect: "error", signal: AbortSignal.timeout(5e3) });
    if (!taskResponse.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${taskResponse.status}`);
    const task = (await taskResponse.json())?.task;
    if (!task || task.id !== id || typeof task.title !== "string" || typeof task.description !== "string" || ["done", "cancelled"].includes(task.status)) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    const authorLines = [...task.description.matchAll(/^[ \t]*AUTHOR:[ \t]*(.*?)[ \t]*$/gim)].map((m) => m[1].trim());
    if (authorLines.length > 1 || authorLines.length && !authorLines[0]) throw new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 \u043E\u0434\u043D\u043E\u0439 \u043D\u0435\u043F\u0443\u0441\u0442\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u0438 AUTHOR: \u0438\u043C\u044F");
    const params = new URLSearchParams({ title: task.title.trim() });
    if (authorLines.length) params.set("author", authorLines[0]);
    const response = await fetch(`${base}/api/tools/open-library-search/search?${params}`, { redirect: "error", signal: AbortSignal.timeout(25e3) });
    if (!response.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}`);
    const data = await response.json();
    if (data?.ok !== true || !Array.isArray(data.works) || data.works.length > 5) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430");
    const lines = data.works.map((work) => {
      if (!work || typeof work.title !== "string" || work.title.length > 250 || !/^https:\/\/openlibrary\.org\/works\/OL[1-9]\d{0,15}W$/.test(work.url) || !Array.isArray(work.authors)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C");
      const title = work.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim(), authors = work.authors.filter((x) => typeof x === "string").slice(0, 3).map((x) => x.replace(/[\x00-\x1f\x7f]+/g, " ").slice(0, 100)).join(", ");
      return `${title} \u2014 ${authors || "\u0430\u0432\u0442\u043E\u0440 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"} \u2014 ${Number.isInteger(work.year) ? work.year : "\u0433\u043E\u0434 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D"} \u2014 ${work.url}`;
    });
    process.stdout.write(`Open Library: \u0434\u043E \u043F\u044F\u0442\u0438 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043F\u043E \u0440\u0435\u043B\u0435\u0432\u0430\u043D\u0442\u043D\u043E\u0441\u0442\u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430. \u0421\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435, \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C \u0438 \u043F\u0440\u0430\u0432\u0430 \u043D\u0430 \u043A\u043D\u0438\u0433\u0438 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B.
${lines.length ? lines.join("\n") : "\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E."}
`);
  } catch (error) {
    process.stderr.write(`\u041F\u043E\u0438\u0441\u043A \u043A\u043D\u0438\u0433: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/open-library-search/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>\u041F\u043E\u0438\u0441\u043A \u043A\u043D\u0438\u0433</title></head><body><main><h1>\u041F\u043E\u0438\u0441\u043A \u043A\u043D\u0438\u0433 Open Library</h1><p>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0438\u043C\u044F \u0430\u0432\u0442\u043E\u0440\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0432 Open Library. \u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u043A\u043D\u0438\u0433 \u0438 \u043F\u0440\u0430\u0432\u0430 \u043D\u0430 \u043D\u0438\u0445.</p><label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 <input id="title" maxlength="200"></label><label>\u0410\u0432\u0442\u043E\u0440 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E) <input id="author" maxlength="120"></label><button id="search">\u0418\u0441\u043A\u0430\u0442\u044C</button><p id="status" role="status"></p><ul id="results"></ul><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C</h2><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0430</button><pre id="agent" style="white-space:pre-wrap"></pre></main><script>
document.getElementById('search').onclick=async()=>{const guard=document.getElementById('status');if(!document.getElementById('title').value.trim()){guard.textContent='\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043D\u0438\u0433\u0438. \u041F\u043E\u0438\u0441\u043A \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D.';return}const b=document.getElementById('search'),s=document.getElementById('status'),list=document.getElementById('results');b.disabled=true;list.replaceChildren();s.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';try{const p=new URLSearchParams({title:document.getElementById('title').value});const author=document.getElementById('author').value.trim();if(author)p.set('author',author);const r=await fetch('/api/tools/open-library-search/search?'+p),d=await r.json();if(!r.ok)throw Error(d.error?.message||'\u041E\u0448\u0438\u0431\u043A\u0430');for(const x of d.works){const li=document.createElement('li'),a=document.createElement('a');a.href=x.url;a.textContent=x.title;a.target='_blank';a.rel='noopener noreferrer';li.append(a,document.createTextNode(' \u2014 '+(x.authors.join(', ')||'\u0430\u0432\u0442\u043E\u0440 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D')+' \u2014 '+(x.year||'\u0433\u043E\u0434 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D')));list.append(li)}s.textContent=d.works.length?'\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0435\u0439: '+d.works.length:'\u041D\u0435\u0442 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439.'}catch(e){s.textContent=e.message}finally{b.disabled=false}};
document.getElementById('prepare').onclick=async()=>{const b=document.getElementById('prepare'),out=document.getElementById('agent');b.disabled=true;try{const r=await fetch('/api/tools/open-library-search/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error?.message||'\u041E\u0448\u0438\u0431\u043A\u0430');out.textContent=JSON.stringify(d.agent,null,2)}catch(e){out.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/open-library-search/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function valid(value, max) {
  return value.length > 0 && value.length <= max && /^[\p{L}\p{N} .,\-'’]+$/u.test(value);
}
async function boundedJson(response) {
  if (!response.body) throw new Error("missing_body");
  const reader = response.body.getReader(), chunks = [];
  let bytes = 0;
  try {
    for (; ; ) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > 1e6) {
        await reader.cancel();
        throw new Error("too_large");
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
}
var module = {
  id: "open-library-search",
  apiVersion: 1,
  register(ctx) {
    let active = null;
    const cache = /* @__PURE__ */ new Map();
    ctx.onShutdown(() => {
      active?.abort();
      cache.clear();
    });
    ctx.api.add("POST", "/api/tools/open-library-search/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return fail(503, "port_unavailable", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex"), path = join2(ctx.paths.data, `open-library-agent-${digest}.mjs`);
      try {
        mkdirSync2(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync2(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "open-library-research", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 45e3 }, sha256: digest } };
      } catch {
        return fail(500, "agent_prepare_failed", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0430");
      }
    });
    ctx.api.add("GET", "/api/tools/open-library-search/search", async (c) => {
      const title = (c.query.get("title") || "").trim(), author = (c.query.get("author") || "").trim();
      if (!valid(title, 200) || author && !valid(author, 120)) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0434\u043E 200 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0438, \u043F\u0440\u0438 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438, \u0438\u043C\u044F \u0430\u0432\u0442\u043E\u0440\u0430 \u0434\u043E 120 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0431\u0435\u0437 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0445 \u0437\u043D\u0430\u043A\u043E\u0432.");
      const key = JSON.stringify([title, author]), now = Date.now(), cached = cache.get(key);
      if (cached && now >= cached.at && now - cached.at < 6e5) return { headers: { "cache-control": "no-store" }, body: { ...cached.body, cached: true } };
      if (cached) cache.delete(key);
      if (active) return fail(429, "busy", "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F.");
      const lease = acquireRateLease();
      if (lease.status === "busy") return fail(429, "local_rate_limit", "\u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0438 \u043F\u0430\u0443\u0437\u044B 3,5 \u0441\u0435\u043A\u0443\u043D\u0434\u044B. \u0414\u0440\u0443\u0433\u0438\u0435 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u0442\u043E\u0436\u0435 \u0434\u043E\u043B\u0436\u043D\u044B \u0441\u043E\u0431\u043B\u044E\u0434\u0430\u0442\u044C \u043B\u0438\u043C\u0438\u0442 Open Library.");
      if (lease.status !== "ready") return fail(503, "rate_gate_unavailable", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043E\u0431\u0449\u0443\u044E \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432; \u043F\u043E\u0438\u0441\u043A \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.");
      const controller = new AbortController();
      active = controller;
      try {
        const params = new URLSearchParams({ title, limit: "5", fields: "key,title,author_name,first_publish_year" });
        if (author) params.set("author", author);
        const response = await fetch(`https://openlibrary.org/search.json?${params}`, { headers: { accept: "application/json", "user-agent": "TeamPlatform/0.8 local-research" }, redirect: "error", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2e4)]) });
        if (response.status === 429) return fail(429, "source_rate_limited", "Open Library \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u044B; \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        if (!response.ok) throw new Error("upstream");
        const data = await boundedJson(response);
        if (!Array.isArray(data?.docs) || data.docs.length > 5) throw new Error("invalid_response");
        const works = data.docs.flatMap((item) => {
          if (!item || typeof item.key !== "string" || !/^\/works\/OL[1-9]\d{0,15}W$/.test(item.key) || typeof item.title !== "string" || !item.title.trim() || item.title.length > 250) return [];
          const title2 = item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim();
          const authors = Array.isArray(item.author_name) ? item.author_name.filter((x) => typeof x === "string" && x.trim().length > 0 && x.length <= 100).slice(0, 3).map((x) => x.replace(/[\x00-\x1f\x7f]+/g, " ").trim()) : [];
          const year = Number.isInteger(item.first_publish_year) && item.first_publish_year >= 1 && item.first_publish_year <= 3e3 ? item.first_publish_year : null;
          return [{ title: title2, authors, year, url: `https://openlibrary.org${item.key}` }];
        });
        const body = { ok: true, title, author: author || null, works };
        if (cache.size >= 10) cache.delete(cache.keys().next().value);
        cache.set(key, { at: Date.now(), body });
        return { headers: { "cache-control": "no-store" }, body: { ...body, cached: false } };
      } catch {
        return fail(503, "source_unavailable", "Open Library \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      } finally {
        if (active === controller) active = null;
        lease.release();
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
