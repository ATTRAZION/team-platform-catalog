import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/semantic-rank/index.ts
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// modules/semantic-rank/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0421\u043C\u044B\u0441\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0438\u0441\u043A</title></head><body><main><h1>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u043C\u044B\u0441\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0438\u0441\u043A</h1><p>\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0438 \u0434\u043E 20 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0445 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u2014 \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 Ollama \u0438 \u043C\u043E\u0434\u0435\u043B\u044C Nomic \u0438\u043B\u0438 BGE-M3; \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439.</p><p><strong>\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B:</strong> \u043D\u0430 \u043C\u0430\u043B\u043E\u043C \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u0442\u0435\u0441\u0442\u0435 Nomic Q4 \u0438 BGE-M3 F16 \u0432\u044B\u0431\u0440\u0430\u043B\u0438 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u043F\u0435\u0440\u0432\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432 3 \u0438 7 \u0441\u043B\u0443\u0447\u0430\u044F\u0445 \u0438\u0437 10. \u041E\u0431\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u043E\u0448\u0438\u0431\u0430\u043B\u0438\u0441\u044C; \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0440\u0435\u0448\u0435\u043D\u0438\u0439.</p><label>\u0417\u0430\u043F\u0440\u043E\u0441 <input id="query" maxlength="1000"></label><p><label>\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B<br><textarea id="docs" rows="12" cols="80"></textarea></label></p><button id="search">\u041D\u0430\u0439\u0442\u0438</button><p id="status" role="status"></p><ol id="results"></ol><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u0447</h2><p>\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u0440\u0435\u0435\u0441\u0442\u0440 \u0430\u0433\u0435\u043D\u0442\u043E\u0432, \u0443\u043A\u0430\u0437\u0430\u0432 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0434\u0430\u043F\u0442\u0435\u0440</button><pre id="agent"></pre></main><script>
document.getElementById('search').onclick=async()=>{const guard=document.getElementById('status');if(!document.getElementById('query').value.trim()){guard.textContent='\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441: \u0447\u0442\u043E \u0440\u0430\u043D\u0436\u0438\u0440\u043E\u0432\u0430\u0442\u044C. \u041F\u043E\u0438\u0441\u043A \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D.';return}const out=document.getElementById('results'),status=document.getElementById('status'),button=document.getElementById('search');out.textContent='';button.disabled=true;status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';try{const lines=document.getElementById('docs').value.split('\\n').filter(s=>s.trim()),documents=lines.map((text,i)=>({id:String(i+1),text}));const r=await fetch('/api/tools/semantic-rank/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:document.getElementById('query').value,documents})});const d=await r.json();if(!r.ok)throw Error(d.error.message);for(const m of d.matches){const li=document.createElement('li');li.textContent=lines[Number(m.id)-1]+' \u2014 '+m.score.toFixed(3);out.append(li)}status.textContent='\u041C\u043E\u0434\u0435\u043B\u044C: '+d.model+'; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B.'}catch(e){status.textContent=e.message}finally{button.disabled=false}};
document.getElementById('prepare').onclick=async()=>{const out=document.getElementById('agent');try{const r=await fetch('/api/tools/semantic-rank/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify({agents:[d.agent]},null,2)}catch(e){out.textContent=e.message}};
</script></body></html>`;

// modules/semantic-rank/task-agent-runtime.ts
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
    const documents = [];
    for (const line of task.description.split("\n")) {
      const match = line.match(/^DOC[ \t]+([A-Za-z0-9_-]{1,40}):[ \t]*(.+)$/);
      if (match) documents.push({ id: match[1], text: match[2] });
    }
    if (!documents.length || documents.length > 20 || new Set(documents.map((d) => d.id)).size !== documents.length) throw new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0442 1 \u0434\u043E 20 \u0441\u0442\u0440\u043E\u043A DOC id: \u0442\u0435\u043A\u0441\u0442 \u0441 \u0440\u0430\u0437\u043D\u044B\u043C\u0438 id");
    const result = await request("/api/tools/semantic-rank/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: task.title, documents }) });
    if (result?.ok !== true || typeof result.model !== "string" || typeof result.model_digest !== "string" || !/^[a-f0-9]{64}$/.test(result.model_digest) || !Array.isArray(result.matches) || result.matches.length !== documents.length || new Set(result.matches.map((m) => m?.id)).size !== documents.length || result.matches.some((m) => !documents.some((d) => d.id === m?.id) || typeof m.score !== "number" || !Number.isFinite(m.score))) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u0441\u043C\u044B\u0441\u043B\u043E\u0432\u043E\u0433\u043E \u043F\u043E\u0438\u0441\u043A\u0430");
    process.stdout.write(`\u041F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u043E; \u043D\u0430 \u043D\u0435\u0431\u043E\u043B\u044C\u0448\u043E\u043C \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u0442\u0435\u0441\u0442\u0435 Nomic Q4 \u0434\u0430\u043B\u0430 3 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0445 \u043F\u0435\u0440\u0432\u044B\u0445 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 \u0438\u0437 10, BGE-M3 F16 \u2014 7 \u0438\u0437 10. \u041D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0440\u0435\u0448\u0435\u043D\u0438\u0439; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438. \u041C\u043E\u0434\u0435\u043B\u044C ${result.model}, digest ${result.model_digest}:
${result.matches.map((m) => `${m.id}: ${m.score.toFixed(4)}`).join("\n")}
`);
  } catch (error) {
    process.stderr.write(`\u0421\u043C\u044B\u0441\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0438\u0441\u043A: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/semantic-rank/index.ts
var MODELS = /* @__PURE__ */ new Set(["nomic-embed-text:v1.5", "nomic-embed-text:q4", "bge-m3:latest"]);
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function endpoint() {
  const value = process.env.TEAM_EMBEDDING_PORT || "11434", port = Number(value);
  return /^\d{1,5}$/.test(value) && Number.isInteger(port) && port >= 1 && port <= 65535 ? `http://127.0.0.1:${port}` : null;
}
async function localModel(base, model, signal) {
  const response = await fetch(`${base}/api/tags`, { redirect: "error", signal });
  if (!response.ok) throw new Error("tags");
  const data = await response.json();
  if (!Array.isArray(data.models)) throw new Error("tags");
  const item = data.models.find((m) => m?.name === model && typeof m.size === "number" && m.size >= 1024 * 1024 && !m.remote_model && !m.remote_host);
  return typeof item?.digest === "string" && /^[a-f0-9]{64}$/.test(item.digest) ? item.digest : null;
}
var module = {
  id: "semantic-rank",
  apiVersion: 1,
  register(ctx) {
    const active = /* @__PURE__ */ new Set();
    ctx.onShutdown(() => {
      for (const controller of active) controller.abort();
    });
    ctx.api.add("POST", "/api/tools/semantic-rank/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return { status: 503, body: { error: { code: "port_unavailable", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B." } } };
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `semantic-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "semantic-rank-task", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 11e4 }, sha256: digest } };
      } catch {
        return fail(500, "agent_prepare_failed", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0434\u0430\u043F\u0442\u0435\u0440 \u0430\u0433\u0435\u043D\u0442\u0430.");
      }
    });
    const search = async (body, res, externalSignal) => {
      const data = body && typeof body === "object" && !Array.isArray(body) ? body : {};
      const query = typeof data.query === "string" ? data.query.trim() : "", docs = data.documents;
      if (!query || query.length > 1e3 || !Array.isArray(docs) || docs.length < 1 || docs.length > 20 || docs.some((d) => !d || typeof d !== "object" || Array.isArray(d) || typeof d.id !== "string" || !d.id.trim() || d.id.length > 100 || typeof d.text !== "string" || !d.text.trim() || d.text.length > 2e3) || new Set(docs.map((d) => d.id)).size !== docs.length || docs.reduce((n, d) => n + d.text.length, 0) > 24e3) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0438 \u043E\u0442 1 \u0434\u043E 20 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u0441 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u043C\u0438 id \u0438 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u0434\u043E 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
      const base = endpoint();
      if (!base) return fail(503, "invalid_port", "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0440\u0442 Ollama.");
      const model = process.env.TEAM_EMBEDDING_MODEL || "nomic-embed-text:v1.5";
      if (!MODELS.has(model)) return fail(400, "invalid_model", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u044B \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B Nomic \u0438 BGE-M3.");
      const controller = new AbortController();
      active.add(controller);
      const abort = () => controller.abort();
      res?.once("close", abort);
      try {
        const signals = externalSignal ? [controller.signal, externalSignal] : [controller.signal];
        const digest = await localModel(base, model, AbortSignal.any([...signals, AbortSignal.timeout(3e3)]));
        if (!digest) return fail(503, "model_unavailable", "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.");
        const input = model === "bge-m3:latest" ? [query, ...docs.map((d) => d.text)] : [`search_query: ${query}`, ...docs.map((d) => `search_document: ${d.text}`)];
        const response = await fetch(`${base}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, redirect: "error", signal: AbortSignal.any([...signals, AbortSignal.timeout(55e3)]), body: JSON.stringify({ model, input, truncate: false, options: { num_gpu: 0, num_thread: 4 } }) });
        if (!response.ok) return fail(502, "model_error", "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0441\u043C\u043E\u0433\u043B\u0430 \u043F\u043E\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0442\u0435\u043A\u0441\u0442\u043E\u0432.");
        const result = await response.json(), vectors = result?.embeddings;
        if (!Array.isArray(vectors) || vectors.length !== docs.length + 1 || !Array.isArray(vectors[0]) || vectors[0].length < 1 || vectors[0].length > 4096 || vectors.some((v) => !Array.isArray(v) || v.length !== vectors[0].length || v.some((x) => typeof x !== "number" || !Number.isFinite(x)))) throw new Error("vectors");
        const norm = (v) => Math.hypot(...v), q = vectors[0], qNorm = norm(q);
        if (!qNorm) throw new Error("zero");
        const matches = docs.map((d, i) => {
          const vector = vectors[i + 1], length = norm(vector);
          if (!length) throw new Error("zero");
          const score = q.reduce((sum, n, j) => sum + n * vector[j], 0) / (qNorm * length);
          if (!Number.isFinite(score)) throw new Error("invalid_score");
          return { id: d.id, score, index: i };
        }).sort((a, b) => b.score - a.score || a.index - b.index).map(({ index: _index, ...item }) => item);
        return { body: { ok: true, model, model_digest: digest, matches } };
      } catch {
        return controller.signal.aborted || externalSignal?.aborted ? fail(499, "cancelled", "\u041F\u043E\u0438\u0441\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D.") : fail(503, "model_unavailable", "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 Ollama \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      } finally {
        active.delete(controller);
        res?.off("close", abort);
      }
    };
    ctx.publish({ search });
    ctx.api.add("POST", "/api/tools/semantic-rank/search", (c) => search(c.body, c.res));
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
