import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/semantic-tasks/index.ts
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// modules/semantic-tasks/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0437\u0430\u0434\u0430\u0447\u0430\u043C</title></head><body><main><h1>\u0421\u043C\u044B\u0441\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0438\u0441\u043A \u043F\u043E \u0437\u0430\u0434\u0430\u0447\u0430\u043C</h1><p>\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u043E 100 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441. \u0418\u0445 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0431\u0443\u0434\u0443\u0442 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u044B \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u044B.</p><p><strong>\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B:</strong> \u043D\u0430 \u043C\u0430\u043B\u043E\u043C \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u0442\u0435\u0441\u0442\u0435 Nomic Q4 \u0438 BGE-M3 F16 \u0432\u044B\u0431\u0440\u0430\u043B\u0438 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u043F\u0435\u0440\u0432\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432 3 \u0438 7 \u0441\u043B\u0443\u0447\u0430\u044F\u0445 \u0438\u0437 10. \u041E\u0431\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u043E\u0448\u0438\u0431\u0430\u043B\u0438\u0441\u044C; \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0440\u0435\u0448\u0435\u043D\u0438\u0439.</p><p><label>\u0417\u0430\u043F\u0440\u043E\u0441 <input id="query" maxlength="1000"></label> <button id="search">\u041D\u0430\u0439\u0442\u0438</button></p><p id="status" role="status"></p><p id="selection" role="status">\u0412\u044B\u0431\u0440\u0430\u043D\u043E: 0 \u0438\u0437 100</p><button id="prev" disabled>\u041D\u0430\u0437\u0430\u0434</button> <button id="next" disabled>\u0414\u0430\u043B\u0435\u0435</button> <button id="clear">\u0421\u043D\u044F\u0442\u044C \u0432\u044B\u0431\u043E\u0440</button><div id="tasks"></div><h2>\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B</h2><ol id="results"></ol><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u0447</h2><p>\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u0440\u0435\u0435\u0441\u0442\u0440 \u0430\u0433\u0435\u043D\u0442\u043E\u0432, \u0443\u043A\u0430\u0437\u0430\u0432 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0434\u0430\u043F\u0442\u0435\u0440</button><pre id="agent"></pre></main><script>
const status=document.getElementById('status'),root=document.getElementById('tasks'),prev=document.getElementById('prev'),next=document.getElementById('next'),search=document.getElementById('search'),selection=document.getElementById('selection');
const selected=new Set(),cursors=[null];let page=0,nextCursor=null,loading=false;
function count(){selection.textContent='\u0412\u044B\u0431\u0440\u0430\u043D\u043E: '+selected.size+' \u0438\u0437 100'}
async function show(index,cursor){if(loading)return;loading=true;prev.disabled=next.disabled=search.disabled=true;try{const p=new URLSearchParams({limit:'50'});if(cursor)p.set('cursor',cursor);const r=await fetch('/api/tasks?'+p),d=await r.json();if(!r.ok||!Array.isArray(d.items)||(d.next_cursor!==null&&typeof d.next_cursor!=='string'))throw Error('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0438');page=index;cursors[index]=cursor;cursors.length=index+1;nextCursor=d.next_cursor;root.textContent='';for(const t of d.items){const p=document.createElement('p'),label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.value=t.id;box.setAttribute('data-task-id',t.id);box.checked=selected.has(t.id);box.onchange=()=>{if(box.checked&&selected.size>=100){box.checked=false;status.textContent='\u041C\u043E\u0436\u043D\u043E \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 100 \u0437\u0430\u0434\u0430\u0447.';return}if(box.checked)selected.add(t.id);else selected.delete(t.id);count()};label.append(box,document.createTextNode(' '+t.title+' ('+t.status+')'));p.append(label);root.append(p)}status.textContent='\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 '+(page+1)+'; \u0437\u0430\u0434\u0430\u0447: '+d.items.length;count()}catch(e){status.textContent=e.message}finally{loading=false;prev.disabled=page===0;next.disabled=!nextCursor;search.disabled=false}}
prev.onclick=()=>{if(page>0)show(page-1,cursors[page-1])};next.onclick=()=>{if(nextCursor)show(page+1,nextCursor)};document.getElementById('clear').onclick=()=>{selected.clear();for(const box of root.querySelectorAll('input'))box.checked=false;count()};
search.onclick=async()=>{const out=document.getElementById('results');search.disabled=true;out.textContent='';try{status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';const r=await fetch('/api/tools/semantic-tasks/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:document.getElementById('query').value,task_ids:[...selected]})});const d=await r.json();if(!r.ok)throw Error(d.error.message);for(const m of d.matches){const li=document.createElement('li');li.textContent=m.title+' ('+m.id+') \u2014 '+m.score.toFixed(3);out.append(li)}status.textContent='\u041C\u043E\u0434\u0435\u043B\u044C: '+d.model+'; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438.'}catch(e){status.textContent=e.message}finally{search.disabled=false}};
document.getElementById('prepare').onclick=async()=>{const out=document.getElementById('agent');try{const r=await fetch('/api/tools/semantic-tasks/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify({agents:[d.agent]},null,2)}catch(e){out.textContent=e.message}};show(0,null);
</script></body></html>`;

// modules/semantic-tasks/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "8799", port = Number(portText), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u0438 TEAM_TASK_ID.\n");
    process.exitCode = 1;
    return;
  }
  const base = `http://127.0.0.1:${port}`;
  async function request(path, init = {}) {
    const response = await fetch(base + path, { ...init, redirect: "error", signal: AbortSignal.timeout(65e3) });
    if (!response.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}`);
    return response.json();
  }
  try {
    const task = (await request(`/api/tasks/${encodeURIComponent(id)}`))?.task;
    if (!task || task.id !== id || typeof task.title !== "string" || typeof task.description !== "string" || ["done", "cancelled"].includes(task.status)) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    const line = task.description.match(/^TASKS:[ \t]*(.+)$/im)?.[1] || "";
    const ids = line.split(",").map((part) => part.trim()).filter(Boolean);
    if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length || ids.some((value) => !/^[A-Za-z0-9_-]{1,100}$/.test(value))) throw new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 TASKS: id1, id2 \u2014 \u043E\u0442 1 \u0434\u043E 100 \u0440\u0430\u0437\u043D\u044B\u0445 \u0437\u0430\u0434\u0430\u0447");
    const result = await request("/api/tools/semantic-tasks/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: task.title, task_ids: ids }) });
    if (result?.ok !== true || typeof result.model !== "string" || typeof result.model_digest !== "string" || !/^[a-f0-9]{64}$/.test(result.model_digest) || !Array.isArray(result.matches) || result.matches.length !== ids.length || new Set(result.matches.map((m) => m?.id)).size !== ids.length || result.matches.some((m) => !ids.includes(m?.id) || typeof m.title !== "string" || typeof m.score !== "number" || !Number.isFinite(m.score))) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043F\u043E\u0438\u0441\u043A\u0430 \u043F\u043E \u0437\u0430\u0434\u0430\u0447\u0430\u043C");
    const clean = (value) => value.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 200);
    const output = `\u041F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u043E: \u043D\u0430 \u043D\u0435\u0431\u043E\u043B\u044C\u0448\u043E\u043C \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u0442\u0435\u0441\u0442\u0435 Nomic Q4 \u0434\u0430\u043B\u0430 3 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0445 \u043F\u0435\u0440\u0432\u044B\u0445 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 \u0438\u0437 10, BGE-M3 F16 \u2014 7 \u0438\u0437 10. \u041D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0440\u0435\u0448\u0435\u043D\u0438\u0439; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B. \u041C\u043E\u0434\u0435\u043B\u044C ${clean(result.model)}, digest ${result.model_digest}:
${result.matches.map((m) => `${m.id}: ${m.score.toFixed(4)}`).join("\n")}
`;
    if (output.length > 3900) throw new Error("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0434\u043B\u044F \u0437\u0430\u043F\u0438\u0441\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0430; \u0440\u0430\u0437\u0434\u0435\u043B\u0438\u0442\u0435 \u0432\u044B\u0431\u043E\u0440 \u0437\u0430\u0434\u0430\u0447");
    process.stdout.write(output);
  } catch (error) {
    process.stderr.write(`\u041F\u043E\u0438\u0441\u043A \u0437\u0430\u0434\u0430\u0447: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/semantic-tasks/index.ts
var module = {
  id: "semantic-tasks",
  apiVersion: 1,
  register(ctx) {
    const { tasks } = ctx.require("tasks");
    const rank = ctx.require("semantic-rank");
    ctx.api.add("POST", "/api/tools/semantic-tasks/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return { status: 503, body: { error: { code: "port_unavailable", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B." } } };
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `semantic-tasks-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "semantic-tasks-agent", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 11e4 }, sha256: digest } };
      } catch {
        return { status: 500, body: { error: { code: "agent_prepare_failed", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0434\u0430\u043F\u0442\u0435\u0440 \u0430\u0433\u0435\u043D\u0442\u0430." } } };
      }
    });
    ctx.api.add("POST", "/api/tools/semantic-tasks/search", async (c) => {
      const body = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      const ids = body.task_ids, query = typeof body.query === "string" ? body.query.trim() : "";
      if (!query || query.length > 1e3 || !Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) || new Set(ids).size !== ids.length) return { status: 400, body: { error: { code: "validation_failed", message: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0438 \u043E\u0442 1 \u0434\u043E 100 \u0440\u0430\u0437\u043D\u044B\u0445 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u043E\u0432 \u0437\u0430\u0434\u0430\u0447." } } };
      const selected = [];
      try {
        for (const id of ids) {
          const task = tasks.get(id).task, text = `${task.title}
${task.description}`;
          if (text.length > 2e3) return { status: 413, body: { error: { code: "task_too_long", message: "\u041E\u0434\u043D\u0430 \u0438\u0437 \u0437\u0430\u0434\u0430\u0447 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432; \u0441\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u0435 \u0432\u044B\u0431\u043E\u0440 \u0438\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442." } } };
          selected.push({ id: task.id, title: task.title, text });
        }
      } catch {
        return { status: 404, body: { error: { code: "task_unavailable", message: "\u041E\u0434\u043D\u0430 \u0438\u0437 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u0434\u0430\u0447 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430." } } };
      }
      if (selected.reduce((n, item) => n + item.text.length, 0) > 12e4) return { status: 413, body: { error: { code: "selection_too_long", message: "\u0421\u0443\u043C\u043C\u0430\u0440\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0437\u0430\u0434\u0430\u0447 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 120000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432." } } };
      const batches = [];
      let batch = [], size = 0;
      for (const item of selected) {
        if (batch.length === 20 || size + item.text.length > 24e3) {
          batches.push(batch);
          batch = [];
          size = 0;
        }
        batch.push(item);
        size += item.text.length;
      }
      if (batch.length) batches.push(batch);
      const deadline = AbortSignal.timeout(5e4), matches = [];
      let model = null, digest = null;
      for (const group of batches) {
        if (deadline.aborted || c.res?.destroyed) return { status: 504, body: { error: { code: "search_timeout", message: "\u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0438\u0441\u043A\u0430 \u0438\u0441\u0442\u0435\u043A\u043B\u043E; \u0447\u0430\u0441\u0442\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0451\u043D." } } };
        const result = await rank.search({ query, documents: group.map(({ id, text }) => ({ id, text })) }, c.res, deadline);
        if (deadline.aborted) return { status: 504, body: { error: { code: "search_timeout", message: "\u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0438\u0441\u043A\u0430 \u0438\u0441\u0442\u0435\u043A\u043B\u043E; \u0447\u0430\u0441\u0442\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0451\u043D." } } };
        if (result.status && result.status !== 200) return result;
        const data = result.body;
        if (!data?.ok || typeof data.model !== "string" || typeof data.model_digest !== "string" || !/^[a-f0-9]{64}$/.test(data.model_digest) || !Array.isArray(data.matches) || data.matches.length !== group.length || new Set(data.matches.map((m) => m?.id)).size !== group.length || data.matches.some((m) => !m || !group.some((t) => t.id === m.id) || typeof m.score !== "number" || !Number.isFinite(m.score))) return { status: 502, body: { error: { code: "invalid_rank", message: "\u041C\u043E\u0434\u0443\u043B\u044C \u0440\u0430\u043D\u0436\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442." } } };
        if (model !== null && (model !== data.model || digest !== data.model_digest)) return { status: 409, body: { error: { code: "model_changed", message: "\u041C\u043E\u0434\u0435\u043B\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u043F\u043E\u0438\u0441\u043A\u0430; \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441." } } };
        model = data.model;
        digest = data.model_digest;
        matches.push(...data.matches);
      }
      const positions = new Map(selected.map((item, index) => [item.id, index]));
      matches.sort((a, b) => b.score - a.score || positions.get(a.id) - positions.get(b.id));
      return { body: { ok: true, model, model_digest: digest, matches: matches.map((m) => ({ ...m, title: selected[positions.get(m.id)].title })) } };
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
