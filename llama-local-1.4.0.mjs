import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/llama-local/index.ts
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// modules/llama-local/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "8799", port = Number(portText), id = process.env.TEAM_TASK_ID || "";
  const model = process.env.TEAM_LLAMA_MODEL_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !["", "gemma-3-4b", "smollm2-360m"].includes(model)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B, TEAM_TASK_ID \u0438 \u043C\u043E\u0434\u0435\u043B\u044C.\n");
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
    const prompt = `${task.title}

${task.description}`;
    if (!prompt.trim() || prompt.length > 2e3) throw new Error("\u0422\u0435\u043A\u0441\u0442 \u0437\u0430\u0434\u0430\u0447\u0438 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0434\u043E 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const result = await request("/api/tools/llama-local/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, ...model ? { model } : {} }) });
    if (result?.ok !== true || typeof result.content !== "string" || !result.content.trim() || result.content.length > 3500 || typeof result.truncated !== "boolean" || !["Gemma 3 4B Q4_K_M", "SmolLM2 360M Instruct Q8_0"].includes(result.model)) throw new Error("\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442");
    const warning = result.model === "Gemma 3 4B Q4_K_M" ? "\u043E\u043D\u0430 \u043E\u0448\u0438\u0431\u0430\u043B\u0430\u0441\u044C \u0432 \u043F\u0440\u043E\u0441\u0442\u043E\u043C \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u0432\u043E\u043F\u0440\u043E\u0441\u0435" : "\u044D\u043A\u0441\u043F\u0435\u0440\u0438\u043C\u0435\u043D\u0442\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u0447\u0430\u0441\u0442\u043E \u043E\u0448\u0438\u0431\u0430\u043B\u0430\u0441\u044C \u0434\u0430\u0436\u0435 \u0432 \u043F\u0440\u043E\u0441\u0442\u044B\u0445 \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u0445; \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u043D\u0430 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439";
    process.stdout.write(`\u041E\u0442\u0432\u0435\u0442 ${result.model} (${warning}; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442; \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u044B${result.truncated ? "; \u043E\u0442\u0432\u0435\u0442 \u043E\u0431\u0440\u0435\u0437\u0430\u043D \u043F\u043E \u043B\u0438\u043C\u0438\u0442\u0443" : ""}):
${result.content}
`);
  } catch (error) {
    process.stderr.write(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/llama-local/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C GGUF</title></head><body><main><h1>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C GGUF</h1><p>\u041C\u043E\u0434\u0435\u043B\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E \u0445\u0435\u0448\u0443 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430 \u0438 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043D\u0430 CPU. Gemma \u043D\u0430 \u043D\u0435\u0431\u043E\u043B\u044C\u0448\u043E\u043C \u0442\u0435\u0441\u0442\u0435 \u043E\u0448\u0438\u0431\u043B\u0430\u0441\u044C \u0434\u0430\u0436\u0435 \u0432 \u043F\u0440\u043E\u0441\u0442\u043E\u043C \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u0432\u043E\u043F\u0440\u043E\u0441\u0435. \u042D\u043A\u0441\u043F\u0435\u0440\u0438\u043C\u0435\u043D\u0442\u0430\u043B\u044C\u043D\u0430\u044F SmolLM2 360M \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u043D\u0430 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0438 \u0447\u0430\u0441\u0442\u043E \u043E\u0448\u0438\u0431\u0430\u043B\u0430\u0441\u044C \u0434\u0430\u0436\u0435 \u0432 \u043F\u0440\u043E\u0441\u0442\u044B\u0445 \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u0445. \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u043E\u0442\u0432\u0435\u0442\u044B \u0438 \u043D\u0435 \u043F\u043E\u0440\u0443\u0447\u0430\u0439\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u044F\u043C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F.</p><p>\u041A\u0430\u0436\u0434\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0440\u043E\u0446\u0435\u0441\u0441.</p><p id="setup" role="status"></p><label>\u041C\u043E\u0434\u0435\u043B\u044C <select id="model"></select></label><p><label>\u0417\u0430\u043F\u0440\u043E\u0441<br><textarea id="prompt" rows="8" cols="70" maxlength="2000"></textarea></label></p><p><button id="send">\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</button></p><p id="status" role="status"></p><pre id="result" style="white-space:pre-wrap"></pre><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u0447</h2><p>\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u0440\u0435\u0435\u0441\u0442\u0440 \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F</button><pre id="agent" style="white-space:pre-wrap"></pre></main><script>
fetch('/api/tools/llama-local/status').then(r=>r.json()).then(d=>{document.getElementById('setup').textContent=d.configured?'\u041F\u0443\u0442\u0438 \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443 \u0438 \u043C\u043E\u0434\u0435\u043B\u0438 \u0437\u0430\u0434\u0430\u043D\u044B.':'\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443 \u0438 \u043C\u043E\u0434\u0435\u043B\u0438, \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443.';const s=document.getElementById('model');if(d.default_configured){const o=document.createElement('option');o.value='';o.textContent='\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E';s.append(o)}for(const m of d.models){if(!m.configured)continue;const o=document.createElement('option');o.value=m.id;o.textContent=m.name;s.append(o)}}).catch(()=>document.getElementById('setup').textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438.');
document.getElementById('send').onclick=async()=>{const b=document.getElementById('send'),status=document.getElementById('status'),out=document.getElementById('result'),model=document.getElementById('model').value;b.disabled=true;out.textContent='';status.textContent='\u041C\u043E\u0434\u0435\u043B\u044C \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442\u2026';try{const r=await fetch('/api/tools/llama-local/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:document.getElementById('prompt').value,...(model?{model}: {})})}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=d.content;status.textContent=d.model+(d.truncated?': \u041E\u0442\u0432\u0435\u0442 \u043E\u0431\u0440\u0435\u0437\u0430\u043D \u043F\u043E \u043B\u0438\u043C\u0438\u0442\u0443. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0435\u0433\u043E.':': \u041E\u0442\u0432\u0435\u0442 \u043F\u043E\u043B\u0443\u0447\u0435\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0435\u0433\u043E.')}catch(e){status.textContent=e.message}finally{b.disabled=false}};
document.getElementById('prepare').onclick=async()=>{const b=document.getElementById('prepare'),out=document.getElementById('agent');b.disabled=true;try{const r=await fetch('/api/tools/llama-local/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify({agents:[d.agent,d.gemma_agent,d.smol_agent]},null,2)}catch(e){out.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/llama-local/index.ts
var MODELS = /* @__PURE__ */ new Map([
  ["882e8d2db44dc554fb0ea5077cb7e4bc49e7342a1f0da57901c0802ea21a0863", { id: "gemma-3-4b", name: "Gemma 3 4B Q4_K_M" }],
  ["48ab3034d0dd401fbc721eb1df3217902fee7dab9078992d66431f09b7750201", { id: "smollm2-360m", name: "SmolLM2 360M Instruct Q8_0" }]
]);
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
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("port");
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return address.port;
}
var module = {
  id: "llama-local",
  apiVersion: 1,
  register(ctx) {
    let busy = false, phase = "idle", child = null, active = null, execution = null;
    const settings = () => ({ exe: process.env.TEAM_LLAMA_SERVER?.trim() || "", model: process.env.TEAM_LLAMA_MODEL?.trim() || "", gemma: process.env.TEAM_LLAMA_GEMMA_MODEL?.trim() || "", smol: process.env.TEAM_LLAMA_SMOL_MODEL?.trim() || "" });
    ctx.onShutdown(async () => {
      active?.abort();
      child?.kill();
      if (execution) await execution;
    });
    ctx.api.add("GET", "/api/tools/llama-local/status", () => {
      const { exe, model, gemma, smol } = settings(), server = file(exe), defaultConfigured = file(model);
      const models = [
        { id: "gemma-3-4b", name: "Gemma 3 4B Q4_K_M", configured: file(gemma) },
        { id: "smollm2-360m", name: "SmolLM2 360M Instruct Q8_0", configured: file(smol) }
      ];
      return { body: { ok: true, configured: server && (defaultConfigured || models.some((m) => m.configured)), server_configured: server, default_configured: defaultConfigured, busy, phase, models, supported_models: [...MODELS.values()].map((m) => m.name) } };
    });
    ctx.api.add("POST", "/api/tools/llama-local/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return { status: 503, body: { error: { code: "port_unavailable", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B." } } };
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `llama-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        const agent = { id: "llama-local-task", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 11e4 };
        const gemma_agent = { ...agent, id: "llama-gemma-task", env: { ...agent.env, TEAM_LLAMA_MODEL_ID: "gemma-3-4b" } };
        const smol_agent = { ...agent, id: "llama-smollm-task", env: { ...agent.env, TEAM_LLAMA_MODEL_ID: "smollm2-360m" } };
        return { body: { ok: true, agent, gemma_agent, smol_agent, sha256: digest } };
      } catch {
        return fail(500, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F");
      }
    });
    ctx.api.add("POST", "/api/tools/llama-local/chat", async (c) => {
      const input = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      if (!prompt || prompt.length > 2e3) return fail(400, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043E 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
      const selected = input.model === void 0 ? "" : input.model;
      if (typeof selected !== "string" || !["", "gemma-3-4b", "smollm2-360m"].includes(selected)) return fail(400, "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C");
      const { exe, model: defaultModel, gemma, smol } = settings();
      const model = selected === "gemma-3-4b" ? gemma : selected === "smollm2-360m" ? smol : defaultModel;
      if (!file(exe) || !file(model)) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443 \u0438 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438");
      if (busy) return fail(409, "\u041C\u043E\u0434\u0435\u043B\u044C \u0443\u0436\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \u0434\u0440\u0443\u0433\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441");
      busy = true;
      phase = "verifying";
      const controller = new AbortController();
      active = controller;
      const abort = () => controller.abort();
      c.res?.once("close", abort);
      const deadline = setTimeout(abort, 55e3);
      let finished, pendingTermination = false;
      execution = new Promise((resolve) => {
        finished = resolve;
      });
      try {
        const hash = createHash("sha256");
        for await (const chunk of createReadStream(model, { signal: controller.signal })) hash.update(chunk);
        const modelSha = hash.digest("hex"), modelInfo = MODELS.get(modelSha);
        if (!modelInfo || selected && modelInfo.id !== selected) return fail(400, "\u0425\u0435\u0448 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u044C\u044E");
        const port = await freePort(), token = randomBytes(32).toString("hex");
        if (controller.signal.aborted) throw new Error("cancelled");
        const env = {};
        for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
        phase = "starting";
        const proc = spawn(exe, ["-m", model, "--host", "127.0.0.1", "--port", String(port), "-c", "2048", "-t", "4", "-tb", "4", "-ngl", "0", "-np", "1", "--no-webui", "--api-key", token], { windowsHide: true, env, stdio: "ignore", shell: false });
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
            if (closed || spawnError) throw new Error("server exited");
            try {
              const response2 = await fetch(`${base}/health`, { headers, redirect: "error", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1e3)]) });
              if (response2.ok) break;
            } catch {
            }
            await sleep(200, void 0, { signal: controller.signal });
          }
          if (controller.signal.aborted) throw new Error("cancelled");
          const propsResponse = await fetch(`${base}/props`, { headers, redirect: "error", signal: controller.signal });
          if (!propsResponse.ok || closed) throw new Error("server properties unavailable");
          const props = await propsResponse.json();
          if (props.model_path !== model) throw new Error("unexpected model");
          phase = "generating";
          const response = await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, redirect: "error", signal: controller.signal, body: JSON.stringify({ model: "local", messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: 128, stream: false }) });
          if (!response.ok) throw new Error("inference failed");
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (typeof content !== "string" || !content.trim() || content.length > 3500) throw new Error("invalid output");
          const reason = data.choices?.[0]?.finish_reason;
          if (reason !== "stop" && reason !== "length") throw new Error("unknown finish reason");
          return { body: { ok: true, model: modelInfo.name, model_id: modelInfo.id, model_sha256: modelSha, content, truncated: reason === "length" } };
        } finally {
          phase = "stopping";
          controller.signal.removeEventListener("abort", stop);
          stop();
          let timer;
          const timeout = new Promise((resolve) => {
            timer = setTimeout(resolve, 1e4);
          });
          await Promise.race([exited, timeout]);
          if (timer) clearTimeout(timer);
          if (!closed) {
            pendingTermination = true;
            void exited.then(() => {
              if (child === proc) {
                child = null;
                busy = false;
                phase = "idle";
              }
            });
            throw new Error("server did not stop");
          }
          if (child === proc) child = null;
        }
      } catch {
        return controller.signal.aborted ? fail(499, "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043C\u0435\u043D\u0451\u043D \u0438\u043B\u0438 \u0432\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F \u0438\u0441\u0442\u0435\u043A\u043B\u043E") : fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0443\u044E \u043C\u043E\u0434\u0435\u043B\u044C");
      } finally {
        clearTimeout(deadline);
        c.res?.off("close", abort);
        active = null;
        if (!pendingTermination) {
          busy = false;
          phase = "idle";
        }
        finished();
        execution = null;
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
