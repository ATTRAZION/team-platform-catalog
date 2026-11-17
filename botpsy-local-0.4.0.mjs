import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/botpsy-local/index.ts
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// modules/botpsy-local/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BotPsy</title></head><body><main><h1>BotPsy: \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u0438\u0441\u043A\u0430</h1><p>\u041C\u043E\u0434\u0435\u043B\u044C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u0442 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043B\u044F \u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u0438. \u042D\u0442\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u043F\u043E\u0438\u0441\u043A: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u043F\u0435\u0440\u0435\u0434 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435\u043C. \u041C\u043E\u0434\u0435\u043B\u044C \u043C\u043E\u0436\u0435\u0442 \u043E\u0448\u0438\u0431\u0430\u0442\u044C\u0441\u044F.</p><p id="setup" role="status"></p><label>\u041F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435<br><textarea id="task" rows="5" cols="70" maxlength="1000"></textarea></label><p><button id="run">\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043B\u044F \u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u0438</button></p><fieldset><legend>\u0420\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430</legend><label><input type="checkbox" value="workspace"> \u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u043F\u0440\u043E\u0435\u043A\u0442</label> <label><input type="checkbox" value="wikipedia"> \u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u044F</label> <label><input type="checkbox" value="arxiv"> arXiv</label> <label><input type="checkbox" value="crossref"> Crossref</label> <label><input type="checkbox" value="openalex"> OpenAlex</label> <label><input type="checkbox" value="europepmc"> Europe PMC</label> <label><input type="checkbox" value="hn"> Hacker News</label> <label><input type="checkbox" value="openlibrary"> Open Library</label></fieldset><p><button id="choose">\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0438 \u0437\u0430\u043F\u0440\u043E\u0441</button></p><p id="status" role="status"></p><pre id="result"></pre><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0438 \u0437\u0430\u0434\u0430\u0447</h2><p>\u041F\u043E\u0441\u043B\u0435 \u044F\u0432\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442 \u0437\u0430\u043F\u0440\u043E\u0441 \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A. \u041D\u0435 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0439\u0442\u0435 \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u0432\u0435\u0434\u0435\u043D\u0438\u044F; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B. \u0414\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0438\u0437 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0441\u0442\u0440\u043E\u043A\u0443 TOOLS: workspace, wikipedia, arxiv, crossref, openalex, europepmc, hn, openlibrary \u0441 \u043D\u0443\u0436\u043D\u044B\u043C\u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430\u043C\u0438.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u0439</button><pre id="agent" role="status"></pre></main><script>
fetch('/api/tools/botpsy-local/status').then(r=>r.json()).then(d=>document.getElementById('setup').textContent=d.configured?'\u041F\u0443\u0442\u0438 \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443 \u0438 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0430\u0439\u0434\u0435\u043D\u044B; \u0445\u0435\u0448 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435.':'\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A llama-server \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438, \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443.').catch(()=>document.getElementById('setup').textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438.');
document.getElementById('run').onclick=async()=>{const b=document.getElementById('run'),s=document.getElementById('status'),o=document.getElementById('result');b.disabled=true;s.textContent='\u041C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442\u2026';o.textContent='';try{const r=await fetch('/api/tools/botpsy-local/propose-wikipedia',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task:document.getElementById('task').value})}),d=await r.json();if(!r.ok)throw Error(d.error.message);o.textContent=d.query;s.textContent='\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0435\u0440\u0435\u0434 \u043F\u043E\u0438\u0441\u043A\u043E\u043C.'}catch(e){s.textContent=e.message}finally{b.disabled=false}};
document.getElementById('choose').onclick=async()=>{const b=document.getElementById('choose'),s=document.getElementById('status'),o=document.getElementById('result'),allowed=Array.from(document.querySelectorAll('fieldset input:checked'),x=>x.value);b.disabled=true;s.textContent='\u041C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442\u2026';o.textContent='';try{const r=await fetch('/api/tools/botpsy-local/propose-search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task:document.getElementById('task').value,allowed})}),d=await r.json();if(!r.ok)throw Error(d.error.message);o.textContent=d.tool+': '+d.query;s.textContent='\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0438 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0435\u0440\u0435\u0434 \u043F\u043E\u0438\u0441\u043A\u043E\u043C.'}catch(e){s.textContent=e.message}finally{b.disabled=false}};
document.getElementById('prepare').onclick=async()=>{const b=document.getElementById('prepare'),out=document.getElementById('agent');b.disabled=true;try{const r=await fetch('/api/tools/botpsy-local/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify({agent:d.agent,search_agent:d.search_agent},null,2)}catch(e){out.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/botpsy-local/validate-tool.ts
function oneQuery(data) {
  if (!Array.isArray(data?.choices) || data.choices.length !== 1) return null;
  const choice = data?.choices?.[0], calls = choice?.message?.tool_calls;
  if (choice?.finish_reason !== "tool_calls" || !Array.isArray(calls) || calls.length !== 1 || calls[0]?.type !== "function" || typeof calls[0]?.function?.name !== "string" || typeof calls[0]?.function?.arguments !== "string" || calls[0].function.arguments.length > 2048) return null;
  let args;
  try {
    args = JSON.parse(calls[0].function.arguments);
  } catch {
    return null;
  }
  if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length !== 1 || typeof args.query !== "string" || !args.query.trim() || args.query.length > 300 || /[\x00-\x1f\x7f]/.test(args.query)) return null;
  return { name: calls[0].function.name, query: args.query.trim() };
}
function wikipediaQuery(data) {
  const result = oneQuery(data);
  return result?.name === "search_wikipedia" ? result.query : null;
}
var SEARCH_NAMES = { workspace: "workspace_search", wikipedia: "wikipedia_search", arxiv: "arxiv_search", crossref: "crossref_search", openalex: "openalex_search", europepmc: "europe_pmc_search", hn: "hacker_news_search", openlibrary: "open_library_search" };
function searchProposal(data, allowed) {
  const result = oneQuery(data);
  if (!result) return null;
  const tool = allowed.find((name) => SEARCH_NAMES[name] === result.name);
  if (!tool || result.query.length > (tool === "wikipedia" ? 300 : 120)) return null;
  if (tool === "arxiv" && !/^[a-zA-Z0-9]+(?:[ ]+[a-zA-Z0-9]+){0,7}$/.test(result.query)) return null;
  if (tool === "europepmc" && !/^[\p{L}\p{N}\s.,'’-]+$/u.test(result.query)) return null;
  if (tool === "openlibrary" && !/^[\p{L}\p{N} .,\-'’]+$/u.test(result.query)) return null;
  return { tool, query: result.query };
}

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/botpsy-local/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "", port = Number(portText), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u0438 TEAM_TASK_ID.\n");
    process.exitCode = 1;
    return;
  }
  const base = `http://127.0.0.1:${port}`;
  async function request(path, init = {}, timeout = 125e3) {
    const r = await fetch(base + path, { ...init, redirect: "error", signal: AbortSignal.timeout(timeout) });
    if (!r.ok) throw Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${r.status}`);
    return r.json();
  }
  try {
    const task = (await request(`/api/tasks/${encodeURIComponent(id)}`))?.task;
    const title = typeof task?.title === "string" ? task.title.trim() : "";
    if (!task || task.id !== id || ["done", "cancelled"].includes(task.status) || !title || title.length > 200 || /[\x00-\x1f\x7f]/.test(title)) throw Error("\u041D\u0443\u0436\u043D\u0430 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C \u0434\u043E 200 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const proposal = await request("/api/tools/botpsy-local/propose-wikipedia", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: title }) });
    if (proposal?.ok !== true || proposal.tool !== "search_wikipedia" || typeof proposal.query !== "string" || !proposal.query.trim() || proposal.query.length > 300 || /[\x00-\x1f\x7f]/.test(proposal.query)) throw Error("\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u043B\u0430 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441");
    const result = await request(`/api/tools/wikipedia-search/search?lang=ru&q=${encodeURIComponent(proposal.query)}`, {}, 2e4);
    if (!Array.isArray(result?.results)) throw Error("\u041F\u043E\u0438\u0441\u043A \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0442\u0430\u0442\u0435\u0439");
    const entries = result.results.slice(0, 5).flatMap((item) => Number.isSafeInteger(item?.id) && item.id > 0 && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 150)} \u2014 https://ru.wikipedia.org/?curid=${item.id}`] : []);
    if (!entries.length) throw Error("\u041F\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0441\u0442\u0430\u0442\u044C\u0438");
    process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u043B\u0430 \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u0438 (\u0434\u043E 5; \u0441\u0442\u0430\u0442\u044C\u0438 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u044B, \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u043B\u0435\u0432\u0430\u043D\u0442\u043D\u043E\u0441\u0442\u044C):
${entries.join("\n")}
`);
  } catch (error) {
    process.stderr.write(`BotPsy: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/botpsy-local/search-agent-runtime.ts
async function runSearchAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "", port = Number(portText), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u0438 TEAM_TASK_ID.\n");
    process.exitCode = 1;
    return;
  }
  const base = `http://127.0.0.1:${port}`;
  async function request(path, init = {}, timeout = 125e3) {
    const r = await fetch(base + path, { ...init, redirect: "error", signal: AbortSignal.timeout(timeout) });
    if (!r.ok) throw Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${r.status}`);
    return r.json();
  }
  try {
    const task = (await request(`/api/tasks/${encodeURIComponent(id)}`))?.task;
    if (!task || task.id !== id || ["done", "cancelled"].includes(task.status) || typeof task.title !== "string" || typeof task.description !== "string") throw Error("\u041D\u0443\u0436\u043D\u0430 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430");
    const lines = task.description.split(/\r?\n/).filter((line) => /^TOOLS:[ \t]*/.test(line));
    const allowed = lines.length === 1 ? lines[0].replace(/^TOOLS:[ \t]*/, "").split(",").map((x) => x.trim()) : [];
    if (allowed.length < 1 || allowed.length > 8 || allowed.some((x) => !["workspace", "wikipedia", "arxiv", "crossref", "openalex", "europepmc", "hn", "openlibrary"].includes(x)) || new Set(allowed).size !== allowed.length) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443 TOOLS \u0441 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u043C\u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430\u043C\u0438: workspace, wikipedia, arxiv, crossref, openalex, europepmc, hn, openlibrary.");
    const title = task.title.trim();
    if (!title || title.length > 200 || /[\x00-\x1f\x7f]/.test(title)) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0434\u043E 200 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const proposal = await request("/api/tools/botpsy-local/propose-search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: title, allowed }) });
    if (proposal?.ok !== true || !allowed.includes(proposal.tool) || typeof proposal.query !== "string" || !proposal.query.trim() || proposal.query.length > (proposal.tool === "wikipedia" ? 300 : 120) || /[\x00-\x1f\x7f]/.test(proposal.query) || proposal.tool === "arxiv" && !/^[a-zA-Z0-9]+(?:[ ]+[a-zA-Z0-9]+){0,7}$/.test(proposal.query) || proposal.tool === "europepmc" && !/^[\p{L}\p{N}\s.,'’-]+$/u.test(proposal.query) || proposal.tool === "openlibrary" && !/^[\p{L}\p{N} .,\-'’]+$/u.test(proposal.query)) throw Error("\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u043B\u0430 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043F\u043E\u0438\u0441\u043A");
    const q = encodeURIComponent(proposal.query);
    if (proposal.tool === "workspace") {
      const result = await request("/api/tools/workspace-search/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: proposal.query }) }, 2e4);
      if (!Array.isArray(result?.matches) || typeof result.truncated !== "boolean") throw Error("\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442");
      const entries = result.matches.slice(0, 15).flatMap((item) => typeof item?.path === "string" && Number.isSafeInteger(item.line) && item.line > 0 ? [`${item.path.replace(/[\x00-\x1f\x7f]+/g, " ").slice(0, 400)}:${item.line}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u043F\u0440\u043E\u0435\u043A\u0442; \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
${entries.length ? entries.join("\n") : "\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E."}
${result.truncated || result.matches.length > 15 ? "\u0421\u043F\u0438\u0441\u043E\u043A \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u043C.\n" : ""}`);
    } else if (proposal.tool === "wikipedia") {
      const result = await request(`/api/tools/wikipedia-search/search?lang=ru&q=${q}`, {}, 2e4);
      if (!Array.isArray(result?.results)) throw Error("\u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u044F \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0442\u0430\u0442\u0435\u0439");
      const entries = result.results.slice(0, 5).flatMap((item) => Number.isSafeInteger(item?.id) && item.id > 0 && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 150)} \u2014 https://ru.wikipedia.org/?curid=${item.id}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 \u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u044E; \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
${entries.length ? entries.join("\n") : "\u0421\u0442\u0430\u0442\u044C\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B."}
\u0421\u0442\u0430\u0442\u044C\u0438 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u044B; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u043B\u0435\u0432\u0430\u043D\u0442\u043D\u043E\u0441\u0442\u044C.
`);
    } else if (proposal.tool === "arxiv") {
      const result = await request(`/api/tools/arxiv-search/search?q=${q}&limit=5&sort=relevance`, {}, 2e4);
      if (!Array.isArray(result?.works)) throw Error("arXiv \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439");
      const entries = result.works.slice(0, 5).flatMap((item) => typeof item?.id === "string" && /^https:\/\/arxiv\.org\/abs\/(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})(?:v[1-9]\d*)?$/i.test(item.id) && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 180)} \u2014 ${item.id}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 arXiv; \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
${entries.length ? entries.join("\n") : "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B."}
\u041F\u0440\u0435\u043F\u0440\u0438\u043D\u0442\u044B \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u044B \u0438 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E.
`);
    } else if (proposal.tool === "crossref") {
      const result = await request(`/api/tools/crossref-search/search?q=${q}`, {}, 2e4);
      if (!Array.isArray(result?.works)) throw Error("Crossref \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439");
      const entries = result.works.slice(0, 5).flatMap((item) => typeof item?.doi === "string" && /^10\.\d{4,9}\/[^\s\x00-\x1f\x7f]{1,200}$/i.test(item.doi) && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 180)} \u2014 https://doi.org/${encodeURIComponent(item.doi).replace(/%2F/gi, "/")}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 Crossref; \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
${entries.length ? entries.join("\n") : "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B."}
\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E; \u0441\u0442\u0430\u0442\u044C\u0438 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u044B \u0438 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E.
`);
    } else if (proposal.tool === "openalex") {
      const result = await request(`/api/tools/openalex-search/search?q=${q}`, {}, 2e4);
      if (!Array.isArray(result?.works)) throw Error("OpenAlex \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439");
      const entries = result.works.slice(0, 5).flatMap((item) => typeof item?.id === "string" && /^https:\/\/openalex\.org\/W\d+$/.test(item.id) && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 180)} \u2014 ${item.id}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 OpenAlex; \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
${entries.length ? entries.join("\n") : "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B."}
\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u0437\u0430\u043C\u0435\u043D\u044F\u044E\u0442 \u0447\u0442\u0435\u043D\u0438\u0435 \u0441\u0442\u0430\u0442\u0435\u0439 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432.
`);
    } else if (proposal.tool === "europepmc") {
      const result = await request(`/api/tools/europe-pmc-search/search?q=${q}`, {}, 2e4);
      if (!Array.isArray(result?.works)) throw Error("Europe PMC \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439");
      const entries = result.works.slice(0, 5).flatMap((item) => typeof item?.url === "string" && /^https:\/\/europepmc\.org\/article\/[A-Z][A-Z0-9]{1,7}\/[A-Za-z0-9_.-]{1,80}$/.test(item.url) && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 180)} \u2014 ${item.url}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 Europe PMC; \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
${entries.length ? entries.join("\n") : "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B."}
\u0421\u0442\u0430\u0442\u044C\u0438 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u044B, \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u0438 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B.
`);
    } else if (proposal.tool === "hn") {
      const result = await request(`/api/tools/hn-search/search?q=${q}&days=14`, {}, 2e4);
      if (!Array.isArray(result?.stories)) throw Error("Hacker News \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439");
      const entries = result.stories.slice(0, 5).flatMap((item) => typeof item?.id === "string" && /^[1-9]\d{0,15}$/.test(item.id) && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 180)} \u2014 https://news.ycombinator.com/item?id=${item.id}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 Hacker News; \u0437\u0430\u043F\u0440\u043E\u0441: ${proposal.query}
${entries.length ? entries.join("\n") : "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B."}
\u042D\u0442\u043E \u043E\u0431\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u044F \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 14 \u0434\u043D\u0435\u0439; \u0434\u0430\u0442\u044B \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0445 \u0441\u043E\u0431\u044B\u0442\u0438\u0439 \u0438 \u0434\u043E\u0441\u0442\u043E\u0432\u0435\u0440\u043D\u043E\u0441\u0442\u044C \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B.
`);
    } else if (proposal.tool === "openlibrary") {
      const result = await request(`/api/tools/open-library-search/search?title=${q}`, {}, 25e3);
      if (!Array.isArray(result?.works)) throw Error("Open Library \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0441\u043F\u0438\u0441\u043E\u043A \u043A\u043D\u0438\u0433");
      const entries = result.works.slice(0, 5).flatMap((item) => typeof item?.url === "string" && /^https:\/\/openlibrary\.org\/works\/OL[1-9]\d{0,15}W$/.test(item.url) && typeof item.title === "string" && item.title.trim() ? [`${item.title.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 180)} \u2014 ${item.url}`] : []);
      process.stdout.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u044B\u0431\u0440\u0430\u043B\u0430 Open Library; \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435: ${proposal.query}
${entries.length ? entries.join("\n") : "\u041A\u043D\u0438\u0433\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B."}
\u042D\u0442\u043E \u0434\u0430\u043D\u043D\u044B\u0435 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430; \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435, \u043D\u0430\u043B\u0438\u0447\u0438\u0435 \u0438 \u043F\u0440\u0430\u0432\u0430 \u043D\u0430 \u043A\u043D\u0438\u0433\u0443 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B.
`);
    }
  } catch (error) {
    process.stderr.write(`BotPsy: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/botpsy-local/index.ts
var MODEL_SHA = "3ad45ab73cc5a45a200cda373f9cf7262741cc005b6e32b3a6221cb0c28e06be";
function file(path) {
  try {
    return !!path && statSync(path).isFile();
  } catch {
    return false;
  }
}
function fail(status, message) {
  return { status, body: { ok: false, error: { message } } };
}
async function freePort() {
  const probe = createServer();
  await new Promise((ok, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", ok);
  });
  const address = probe.address();
  if (!address || typeof address === "string") throw Error("port");
  await new Promise((ok, reject) => probe.close((e) => e ? reject(e) : ok()));
  return address.port;
}
var module = {
  id: "botpsy-local",
  apiVersion: 1,
  register(ctx) {
    let busy = false, child = null, active = null, execution = null;
    const settings = () => ({ exe: process.env.TEAM_BOTPSY_SERVER?.trim() || "", model: process.env.TEAM_BOTPSY_MODEL?.trim() || "" });
    ctx.onShutdown(async () => {
      active?.abort();
      child?.kill();
      if (execution) await execution;
    });
    ctx.api.add("GET", "/api/tools/botpsy-local/status", () => {
      const { exe, model } = settings();
      return { body: { ok: true, configured: file(exe) && file(model), server_configured: file(exe), model_configured: file(model), busy } };
    });
    ctx.api.add("POST", "/api/tools/botpsy-local/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `botpsy-agent-${digest}.mjs`);
      const searchSource = `(${runSearchAgent.toString()})();
`, searchDigest = createHash("sha256").update(searchSource).digest("hex");
      const searchPath = join(ctx.paths.data, `botpsy-search-agent-${searchDigest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        for (const [target, content] of [[path, source], [searchPath, searchSource]]) {
          try {
            writeFileSync(target, content, { flag: "wx" });
          } catch (e) {
            if (e.code !== "EEXIST" || !lstatSync(target).isFile() || readFileSync(target, "utf8") !== content) throw e;
          }
        }
        const agent = { id: "botpsy-wikipedia", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 15e4 };
        return { body: { ok: true, sha256: digest, agent, search_agent: { ...agent, id: "botpsy-search", args: [searchPath] }, search_sha256: searchDigest } };
      } catch {
        return fail(500, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F");
      }
    });
    const propose = async (c, multi) => {
      const input = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      const task = typeof input.task === "string" ? input.task.trim() : "";
      if (!task || task.length > (multi ? 200 : 1e3) || /[\x00-\x1f\x7f]/.test(task)) return fail(400, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u043F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435");
      const allowed = input.allowed;
      if (multi && (!Array.isArray(allowed) || allowed.length < 1 || allowed.length > 8 || allowed.some((x) => typeof x !== "string" || !Object.hasOwn(SEARCH_NAMES, x)) || new Set(allowed).size !== allowed.length)) return fail(400, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u043F\u043E\u0438\u0441\u043A\u0430");
      const { exe, model } = settings();
      if (!file(exe) || !file(model)) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443 \u0438 \u043C\u043E\u0434\u0435\u043B\u0438 BotPsy");
      if (busy) return fail(409, "\u041C\u043E\u0434\u0435\u043B\u044C \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u043F\u0440\u043E\u0441");
      busy = true;
      const controller = new AbortController();
      active = controller;
      const abort = () => controller.abort();
      c.res?.once("close", abort);
      const deadline = setTimeout(abort, 12e4);
      let finish, pending = false;
      execution = new Promise((resolve) => {
        finish = resolve;
      });
      try {
        const hash = createHash("sha256");
        for await (const chunk of createReadStream(model, { signal: controller.signal })) hash.update(chunk);
        if (hash.digest("hex") !== MODEL_SHA) return fail(400, "\u0425\u0435\u0448 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u044C\u044E BotPsy Q8");
        const port = await freePort(), token = randomBytes(32).toString("hex");
        if (controller.signal.aborted) throw Error("cancelled");
        const env = {};
        for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
        const proc = spawn(exe, ["-m", model, "--host", "127.0.0.1", "--port", String(port), "-c", "8192", "-t", "4", "-tb", "4", "-ngl", "0", "-np", "1", "--jinja", "--no-webui", "--api-key", token], { windowsHide: true, shell: false, stdio: "ignore", env });
        child = proc;
        let closed = false, spawnError = false;
        const exited = new Promise((resolve) => {
          proc.once("error", () => {
            spawnError = true;
          });
          proc.once("close", () => {
            closed = true;
            resolve();
          });
        });
        const stop = () => {
          if (!closed) proc.kill();
        };
        controller.signal.addEventListener("abort", stop, { once: true });
        const base = `http://127.0.0.1:${port}`, headers = { authorization: `Bearer ${token}` };
        try {
          while (!controller.signal.aborted) {
            if (closed || spawnError) throw Error("server exited");
            try {
              const r = await fetch(`${base}/health`, { headers, redirect: "error", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1e3)]) });
              if (r.ok) break;
            } catch {
            }
            await sleep(200, void 0, { signal: controller.signal });
          }
          if (controller.signal.aborted) throw Error("cancelled");
          const propsResponse = await fetch(`${base}/props`, { headers, redirect: "error", signal: controller.signal });
          if (!propsResponse.ok || closed) throw Error("server properties unavailable");
          const props = await propsResponse.json();
          if (props.model_path !== model) throw Error("unexpected model");
          const descriptions = { workspace: "Search literal text in the local project code files", wikipedia: "Search public Wikipedia articles by topic", arxiv: "Search scientific preprints on arXiv using 1 to 8 English keywords", crossref: "Search scholarly publications by title in the Crossref metadata database", openalex: "Search OpenAlex for scholarly research works and publication metadata", europepmc: "Search Europe PMC for biomedical research articles and life sciences publications", hn: "Search recent Hacker News technology stories and discussions", openlibrary: "Search the Open Library book catalog by book title" };
          const specs = multi ? allowed.map((name) => ({ name: SEARCH_NAMES[name], description: descriptions[name] })) : [{ name: "search_wikipedia", description: "Search encyclopedia by title or phrase" }];
          const tools = specs.map((spec) => ({ type: "function", function: { ...spec, parameters: { type: "object", properties: { query: { type: "string", description: "Exact search phrase" } }, required: ["query"], additionalProperties: false } } }));
          const response = await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, redirect: "error", signal: controller.signal, body: JSON.stringify({ model: "botpsy", messages: [{ role: "user", content: task }], tools, tool_choice: "auto", temperature: 0, max_tokens: 1200, stream: false }) });
          if (!response.ok) throw Error("inference failed");
          const result = await response.json();
          const proposal = multi ? searchProposal(result, allowed) : (() => {
            const query = wikipediaQuery(result);
            return query ? { tool: "search_wikipedia", query } : null;
          })();
          if (!proposal) return fail(422, "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u043B\u0430 \u043E\u0434\u0438\u043D \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043B\u044F \u043F\u043E\u0438\u0441\u043A\u0430");
          return { headers: { "cache-control": "no-store" }, body: { ok: true, ...proposal, model_sha256: MODEL_SHA } };
        } finally {
          controller.signal.removeEventListener("abort", stop);
          stop();
          let timer;
          await Promise.race([exited, new Promise((resolve) => {
            timer = setTimeout(resolve, 1e4);
          })]);
          if (timer) clearTimeout(timer);
          if (!closed) {
            pending = true;
            void exited.then(() => {
              if (child === proc) {
                child = null;
                busy = false;
              }
            });
            throw Error("server did not stop");
          }
          if (child === proc) child = null;
        }
      } catch {
        return controller.signal.aborted ? fail(499, "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043C\u0435\u043D\u0451\u043D \u0438\u043B\u0438 \u0432\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F \u0438\u0441\u0442\u0435\u043A\u043B\u043E") : fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0443\u044E \u043C\u043E\u0434\u0435\u043B\u044C");
      } finally {
        clearTimeout(deadline);
        c.res?.off("close", abort);
        active = null;
        if (!pending) busy = false;
        finish();
        execution = null;
      }
    };
    ctx.api.add("POST", "/api/tools/botpsy-local/propose-wikipedia", (c) => propose(c, false));
    ctx.api.add("POST", "/api/tools/botpsy-local/propose-search", (c) => propose(c, true));
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
