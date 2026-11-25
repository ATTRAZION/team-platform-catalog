import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/europe-pmc-search/index.ts
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/europe-pmc-search/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "8799", port = Number(portText), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u0438 TEAM_TASK_ID.\n");
    process.exitCode = 1;
    return;
  }
  async function get(path) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "error", signal: AbortSignal.timeout(3e4) });
    if (!response.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}; \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u043D\u0435\u0442`);
    return response.json();
  }
  try {
    const task = (await get(`/api/tasks/${encodeURIComponent(id)}`))?.task;
    if (!task || task.id !== id || typeof task.title !== "string" || !["open", "claimed", "blocked"].includes(task.status)) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    const q = task.title.trim();
    if (!q || q.length > 200 || !/^[\p{L}\p{N}\s.,'’-]+$/u.test(q)) throw new Error("\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430, \u0434\u043E 200 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const result = await get(`/api/tools/europe-pmc-search/search?${new URLSearchParams({ q })}`);
    if (result?.ok !== true || !Array.isArray(result.works) || result.works.length > 5) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430");
    const lines = result.works.flatMap((work) => {
      if (typeof work?.title !== "string" || !work.title.trim() || typeof work.url !== "string" || !/^https:\/\/europepmc\.org\/article\/[A-Z][A-Z0-9]{1,7}\/[A-Za-z0-9_.-]{1,80}$/.test(work.url)) return [];
      const title = work.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 200);
      return [`${title} \u2014 ${typeof work.year === "string" && /^\d{4}$/.test(work.year) ? work.year : "\u0433\u043E\u0434 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D"} \u2014 ${work.url}`];
    });
    if (!lines.length) throw new Error("Europe PMC \u043D\u0435 \u043D\u0430\u0448\u0451\u043B \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439");
    process.stdout.write(`Europe PMC (EMBL-EBI): \u0434\u043E 5 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432 \u043F\u043E \u0440\u0435\u043B\u0435\u0432\u0430\u043D\u0442\u043D\u043E\u0441\u0442\u0438; \u043F\u043E\u043B\u043D\u044B\u0435 \u0442\u0435\u043A\u0441\u0442\u044B \u0438 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B:
${lines.join("\n")}
`);
  } catch (error) {
    process.stderr.write(`Europe PMC: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/europe-pmc-search/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Europe PMC</title></head><body><main><h1>\u041F\u043E\u0438\u0441\u043A Europe PMC</h1><p>\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442\u0441\u044F \u0432 Europe PMC (EMBL-EBI). \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u2014 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435, \u0430 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0430\u0443\u0447\u043D\u044B\u0445 \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0438\u043B\u0438 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439 \u0441\u0442\u0430\u0442\u0435\u0439.</p><label>\u0422\u0435\u043C\u0430 <input id="q" maxlength="200"></label> <button id="search">\u041D\u0430\u0439\u0442\u0438</button><p id="status" role="status"></p><div id="results"></div><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u0447</h2><p>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0438\u0449\u0435\u0442 \u043F\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0443 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438; \u043F\u043E\u043B\u043D\u044B\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F</button><pre id="agent" role="status"></pre></main><script>
document.getElementById('search').onclick=async()=>{const guard=document.getElementById('status');if(!document.getElementById('q').value.trim()){guard.textContent='\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441: \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0441\u043B\u043E\u0432\u043E. \u041F\u043E\u0438\u0441\u043A \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D.';return}const status=document.getElementById('status'),root=document.getElementById('results');root.replaceChildren();status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';try{const r=await fetch('/api/tools/europe-pmc-search/search?'+new URLSearchParams({q:document.getElementById('q').value})),d=await r.json();if(!r.ok)throw Error(d.error.message);for(const w of d.works){const p=document.createElement('p'),a=document.createElement('a'),meta=document.createElement('span');a.href=w.url;a.target='_blank';a.rel='noreferrer';a.textContent=w.title;meta.textContent=' \u2014 '+(w.year||'\u0433\u043E\u0434 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D')+'; '+(w.authors||'\u0430\u0432\u0442\u043E\u0440\u044B \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B')+'; \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F: '+(w.openAccess===true?'\u0434\u0430':w.openAccess===false?'\u043D\u0435\u0442':'\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E');p.append(a,meta);root.append(p)}status.textContent=d.works.length?'\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B: '+d.works.length:'\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.'}catch(e){status.textContent=e.message}};
document.getElementById('prepare').onclick=async()=>{const out=document.getElementById('agent');try{const r=await fetch('/api/tools/europe-pmc-search/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify(d.agent,null,2)}catch(e){out.textContent=e.message}};
</script></body></html>`;

// modules/europe-pmc-search/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
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
  id: "europe-pmc-search",
  apiVersion: 1,
  register(ctx) {
    let active = null;
    ctx.onShutdown(() => active?.abort());
    ctx.api.add("POST", "/api/tools/europe-pmc-search/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return fail(503, "port_unavailable", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `europe-pmc-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "europe-pmc-research", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 45e3 }, sha256: digest } };
      } catch {
        return fail(500, "agent_prepare_failed", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F.");
      }
    });
    ctx.api.add("GET", "/api/tools/europe-pmc-search/search", async (c) => {
      const query = (c.query.get("q") || "").trim();
      if (!query || query.length > 200 || !/^[\p{L}\p{N}\s.,'’-]+$/u.test(query)) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u0434\u043E 200 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
      if (active) return fail(429, "busy", "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 Europe PMC \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F.");
      const controller = new AbortController();
      active = controller;
      const timeout = setTimeout(() => controller.abort(), 15e3);
      try {
        const params = new URLSearchParams({ query, format: "json", resultType: "lite", pageSize: "5" });
        const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`, { headers: { accept: "application/json", "user-agent": "TeamPlatform/0.8 (local research)" }, redirect: "error", signal: controller.signal });
        if (response.status === 429) return fail(429, "rate_limited", "Europe PMC \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441\u044B. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        if (!response.ok) throw new Error("upstream");
        const data = await boundedJson(response);
        if (!Array.isArray(data?.resultList?.result) || data.resultList.result.length > 5) throw new Error("invalid_response");
        const works = data.resultList.result.flatMap((item) => {
          if (!item || typeof item.id !== "string" || !/^[A-Za-z0-9_.-]{1,80}$/.test(item.id) || typeof item.source !== "string" || !/^[A-Z][A-Z0-9]{1,7}$/.test(item.source) || typeof item.title !== "string" || !item.title.trim() || item.title.length > 1e3) return [];
          const year = typeof item.pubYear === "string" && /^\d{4}$/.test(item.pubYear) ? item.pubYear : null;
          const authors = typeof item.authorString === "string" ? item.authorString.slice(0, 500) : null;
          const openAccess = item.isOpenAccess === "Y" ? true : item.isOpenAccess === "N" ? false : null;
          return [{ title: item.title, year, authors, openAccess, url: `https://europepmc.org/article/${item.source}/${item.id}` }];
        });
        return { body: { ok: true, query, works } };
      } catch {
        return fail(503, "source_unavailable", "Europe PMC \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      } finally {
        clearTimeout(timeout);
        if (active === controller) active = null;
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
