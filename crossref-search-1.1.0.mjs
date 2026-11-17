import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/crossref-search/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041F\u043E\u0438\u0441\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439</title></head><body><main><h1>\u041F\u043E\u0438\u0441\u043A \u043D\u0430\u0443\u0447\u043D\u044B\u0445 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439</h1><p>\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432 Crossref. \u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435, \u043D\u0435 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u0443\u0435\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u0442\u0435\u043A\u0441\u0442\u0443 \u0438 \u043F\u043E\u043B\u043D\u043E\u0442\u0443 \u043E\u0445\u0432\u0430\u0442\u0430.</p><p><label>\u0422\u0435\u043C\u0430 <input id="q" maxlength="300"></label></p><p><label>\u0421 <input id="from" type="date"></label> <label>\u041F\u043E <input id="to" type="date"></label> <button id="search">\u041D\u0430\u0439\u0442\u0438</button></p><p id="status" role="status"></p><div id="results"></div></main><script>
document.getElementById('search').onclick=async()=>{const status=document.getElementById('status'),root=document.getElementById('results');root.textContent='';status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';try{const params=new URLSearchParams({q:document.getElementById('q').value,from:document.getElementById('from').value,to:document.getElementById('to').value});const r=await fetch('/api/tools/crossref-search/search?'+params);const data=await r.json();if(!r.ok)throw Error(data.error.message);for(const work of data.works){const p=document.createElement('p'),a=document.createElement('a'),meta=document.createElement('span');a.href=work.url;a.target='_blank';a.rel='noreferrer';a.textContent=work.title;meta.textContent=' \u2014 '+(work.published||'\u0434\u0430\u0442\u0430 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430')+'; '+(work.authors.join(', ')||'\u0430\u0432\u0442\u043E\u0440\u044B \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B')+'; DOI: '+work.doi;p.append(a,meta);root.append(p)}status.textContent=data.works.length?'\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B: '+data.works.length:'\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.'}catch(e){status.textContent=e.message}};
</script></body></html>`;

// modules/crossref-search/rate-gate.ts
import { DatabaseSync } from "node:sqlite";
import { lstatSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
var INTERVAL_MS = 1e3;
function acquireRateLease(now = Date.now()) {
  const dir = process.env.TEAM_CROSSREF_RATE_DIR || join(tmpdir(), "team-platform-crossref-rate-v1");
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

// modules/crossref-search/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function date(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
function dateParts(raw) {
  const v = raw;
  const parts = Array.isArray(v?.["date-parts"]) ? v["date-parts"][0] : null;
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 3 || !parts.every((n) => Number.isInteger(n) && n > 0)) return null;
  if (parts[0] > 9999 || parts.length > 1 && parts[1] > 12 || parts.length > 2 && parts[2] > 31) return null;
  const value = parts.map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-");
  return parts.length === 3 && !date(value) ? null : value;
}
var module = {
  id: "crossref-search",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/crossref-search/search", async (c) => {
      const query = (c.query.get("q") || "").trim(), from = c.query.get("from") || "", to = c.query.get("to") || "";
      if (!query || query.length > 300 || from && !date(from) || to && !date(to) || from && to && from > to) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043E 300 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0438 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u0434\u0430\u0442\u044B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0413\u0413\u0413\u0413-\u041C\u041C-\u0414\u0414.");
      const lease = acquireRateLease();
      if (lease.status === "busy") return fail(429, "local_rate_limit", "\u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0438 \u043F\u0430\u0443\u0437\u044B \u043F\u0435\u0440\u0435\u0434 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u043C.");
      if (lease.status !== "ready") return fail(503, "rate_gate_unavailable", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 Crossref; \u043F\u043E\u0438\u0441\u043A \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.");
      const params = new URLSearchParams({ "query.title": query, rows: "10", select: "DOI,title,author,publisher,published,type", sort: "relevance" });
      const filters = [from ? `from-pub-date:${from}` : "", to ? `until-pub-date:${to}` : ""].filter(Boolean);
      if (filters.length) params.set("filter", filters.join(","));
      try {
        const response = await fetch(`https://api.crossref.org/works?${params}`, { headers: { "user-agent": "TeamPlatform/0.8 (local research; https://attrazion.github.io/team-platform-catalog/catalog.json)", accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(15e3) });
        if (response.status === 429) return fail(429, "rate_limited", "Crossref \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        if (!response.ok) throw new Error("upstream");
        const data = await response.json();
        if (!Array.isArray(data.message?.items)) throw new Error("invalid_response");
        const works = data.message.items.flatMap((item) => {
          const doi = typeof item.DOI === "string" ? item.DOI : "";
          const title = Array.isArray(item.title) && typeof item.title[0] === "string" ? item.title[0] : "";
          if (!/^10\.\d{4,9}\/\S{1,200}$/i.test(doi) || !title) return [];
          const authors = Array.isArray(item.author) ? item.author.slice(0, 15).flatMap((author) => {
            if (!author || typeof author !== "object") return [];
            const full = [author.given, author.family].filter((x) => typeof x === "string").join(" ").trim();
            return full ? [full] : typeof author.name === "string" ? [author.name] : [];
          }) : [];
          return [{ doi, title, authors, published: dateParts(item.published), type: typeof item.type === "string" ? item.type : null, publisher: typeof item.publisher === "string" ? item.publisher : null, url: `https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, "/")}` }];
        });
        return { body: { ok: true, query, from: from || null, to: to || null, works } };
      } catch {
        return fail(503, "source_unavailable", "Crossref \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      } finally {
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
