import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/julia-local/index.ts
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

// modules/julia-local/page.ts
var PAGE = String.raw`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Локальный выбор вариантов</title></head><body><main><h1>Локальный выбор вариантов</h1><p>Модель сравнивает только предложенные варианты. Ответ и вероятности могут быть ошибочными; решение остаётся за вами. Никакие задачи не запускаются.</p><p id="setup" role="status"></p><label>Текст ситуации<br><textarea id="state" rows="6" cols="70" maxlength="2000"></textarea></label><br><label>Вопрос<br><input id="question" size="70" maxlength="300" value="Какой вариант лучше подходит?"></label><br><label>Варианты, по одному на строке (2–6)<br><textarea id="options" rows="6" cols="70"></textarea></label><p><button id="run">Сравнить варианты</button></p><p id="status" role="status"></p><pre id="result"></pre></main><script>
fetch('/api/tools/julia-local/status').then(r=>r.json()).then(d=>document.getElementById('setup').textContent=d.configured?'Пути настроены; хеш модели проверяется при запуске.':'Укажите пути к llama-server и Julia-1 и перезапустите платформу.').catch(()=>document.getElementById('setup').textContent='Настройки недоступны.');
document.getElementById('run').onclick=async()=>{const b=document.getElementById('run'),s=document.getElementById('status'),out=document.getElementById('result');b.disabled=true;s.textContent='Модель запускается…';out.textContent='';try{const options=document.getElementById('options').value.split('\n').map(x=>x.trim()).filter(Boolean);const r=await fetch('/api/tools/julia-local/choose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state:document.getElementById('state').value,question:document.getElementById('question').value,options})});const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Ошибка');out.textContent='Предложение: '+d.choice+'\n\n'+d.options.map(x=>x.label+': '+(x.probability*100).toFixed(1)+'%').join('\n');s.textContent='Проверьте ответ: оценки не гарантируют правильность.'}catch(e){s.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/local-request-port.ts
function localRequestPort(context) {
  const port2 = context.req?.socket?.localPort;
  return Number.isInteger(port2) && port2 > 0 && port2 <= 65535 ? String(port2) : null;
}

// modules/julia-local/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "8799", port2 = Number(portText), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port2) || port2 < 1 || port2 > 65535 || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u0438 TEAM_TASK_ID.\n");
    process.exitCode = 1;
    return;
  }
  const base = `http://127.0.0.1:${port2}`;
  async function request(path, init = {}) {
    const response = await fetch(base + path, { ...init, redirect: "error", signal: AbortSignal.timeout(65e3) });
    if (!response.ok) throw Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}`);
    return response.json();
  }
  try {
    const task = (await request(`/api/tasks/${encodeURIComponent(id)}`))?.task;
    if (!task || task.id !== id || typeof task.title !== "string" || typeof task.description !== "string" || ["done", "cancelled"].includes(task.status)) throw Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    const lines = task.description.split(/\r?\n/), stateLines = lines.filter((line) => /^STATE:[ \t]*/.test(line));
    const state = stateLines.length === 1 ? stateLines[0].replace(/^STATE:[ \t]*/, "").trim() : "";
    const options = lines.filter((line) => /^OPTION:[ \t]*/.test(line)).map((line) => line.replace(/^OPTION:[ \t]*/, "").trim());
    if (!state || state.length > 2e3 || !task.title.trim() || task.title.trim().length > 300 || options.length < 2 || options.length > 6 || options.some((x) => !x || x.length > 150) || new Set(options).size !== options.length) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443 STATE: \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044F \u0438 \u043E\u0442 2 \u0434\u043E 6 \u0440\u0430\u0437\u043D\u044B\u0445 \u0441\u0442\u0440\u043E\u043A OPTION: \u0432\u0430\u0440\u0438\u0430\u043D\u0442");
    const result = await request("/api/tools/julia-local/choose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state, question: task.title.trim(), options }) });
    if (result?.ok !== true || result.model_sha256 !== "1ea6a7e87156eeeda88cb7a36a61265b37ba7b993897b7289b99aea5b5e47069" || !options.includes(result.choice) || !Array.isArray(result.options) || result.options.length !== options.length || result.options.some((x, i) => x?.label !== options[i] || typeof x.probability !== "number" || !Number.isFinite(x.probability) || x.probability < 0 || x.probability > 1)) throw Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u0438");
    const clean = (text) => text.replace(/[\x00-\x1f\x7f]+/g, " ").trim();
    const output = `\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043C\u043E\u0434\u0435\u043B\u0438: ${clean(result.choice)}
\u041E\u0446\u0435\u043D\u043A\u0438 \u043D\u0435 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u0443\u044E\u0442 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u043E; \u0437\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043F\u0435\u0440\u0435\u043D\u0430\u0437\u043D\u0430\u0447\u0430\u0435\u0442\u0441\u044F \u0438 \u043D\u0435 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F.
\u041C\u043E\u0434\u0435\u043B\u044C Julia-1 Q8_0, SHA-256 ${result.model_sha256}.
${result.options.map((x) => `${clean(x.label)}: ${(x.probability * 100).toFixed(1)}%`).join("\n")}
`;
    process.stdout.write(output);
  } catch (error) {
    process.stderr.write(`\u0412\u044B\u0431\u043E\u0440 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/julia-local/index.ts
var MODEL_SHA = "1ea6a7e87156eeeda88cb7a36a61265b37ba7b993897b7289b99aea5b5e47069";
function file(path) {
  try {
    return isAbsolute(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}
function fail(status, message) {
  return { status, body: { ok: false, error: { message } } };
}
async function port() {
  const s = createServer();
  await new Promise((resolve, reject) => {
    s.once("error", reject);
    s.listen(0, "127.0.0.1", resolve);
  });
  const a = s.address();
  if (!a || typeof a === "string") throw Error("port");
  await new Promise((resolve, reject) => s.close((e) => e ? reject(e) : resolve()));
  return a.port;
}
var module = {
  id: "julia-local",
  apiVersion: 1,
  register(ctx) {
    let busy = false, child = null, active = null, execution = null;
    const settings = () => ({ exe: process.env.TEAM_JULIA_SERVER?.trim() || "", model: process.env.TEAM_JULIA_MODEL?.trim() || "" });
    ctx.onShutdown(async () => {
      active?.abort();
      child?.kill();
      if (execution) await execution;
    });
    ctx.api.add("POST", "/api/tools/julia-local/prepare-agent", (c) => {
      const portValue = localRequestPort(c);
      if (!portValue) return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `julia-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "julia-choice-agent", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: portValue }, timeout_ms: 11e4 }, sha256: digest } };
      } catch {
        return fail(500, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0434\u0430\u043F\u0442\u0435\u0440 \u0430\u0433\u0435\u043D\u0442\u0430.");
      }
    });
    ctx.api.add("GET", "/api/tools/julia-local/status", () => {
      const { exe, model } = settings();
      return { body: { ok: true, configured: file(exe) && file(model), busy } };
    });
    ctx.api.add("POST", "/api/tools/julia-local/choose", async (c) => {
      const input = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      const state = typeof input.state === "string" ? input.state.trim() : "", question = typeof input.question === "string" ? input.question.trim() : "";
      const options = Array.isArray(input.options) ? input.options : [];
      if (!state || state.length > 2e3 || !question || question.length > 300 || options.length < 2 || options.length > 6 || options.some((v) => typeof v !== "string" || !v.trim() || v.trim().length > 150) || new Set(options.map((v) => typeof v === "string" ? v.trim() : v)).size !== options.length) return fail(400, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0434\u043E 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u0432\u043E\u043F\u0440\u043E\u0441 \u0434\u043E 300 \u0438 \u043E\u0442 2 \u0434\u043E 6 \u0440\u0430\u0437\u043D\u044B\u0445 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 \u0434\u043E 150 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
      const labels = options.map((x) => x.trim()), { exe, model } = settings();
      if (!file(exe) || !file(model)) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0435 \u043F\u0443\u0442\u0438 \u043A llama-server \u0438 \u043C\u043E\u0434\u0435\u043B\u0438 Julia-1.");
      if (busy) return fail(409, "\u041C\u043E\u0434\u0435\u043B\u044C \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u043F\u0440\u043E\u0441.");
      busy = true;
      const controller = new AbortController();
      active = controller;
      const abort = () => controller.abort();
      c.res?.once("close", abort);
      const timer = setTimeout(abort, 55e3);
      let finished, pendingTermination = false;
      execution = new Promise((resolve) => {
        finished = resolve;
      });
      try {
        const hash = createHash("sha256");
        for await (const chunk of createReadStream(model, { signal: controller.signal })) hash.update(chunk);
        if (hash.digest("hex") !== MODEL_SHA) return fail(400, "\u0425\u0435\u0448 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0435\u0439 Julia-1.");
        const listenPort = await port(), token = randomBytes(32).toString("hex");
        if (controller.signal.aborted) throw Error("cancelled");
        const env = {};
        for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
        const proc = spawn(exe, ["-m", model, "--host", "127.0.0.1", "--port", String(listenPort), "-c", "2048", "-t", "2", "-tb", "2", "-ngl", "0", "-np", "1", "--no-webui", "--api-key", token], { windowsHide: true, env, stdio: "ignore", shell: false });
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
        const base = `http://127.0.0.1:${listenPort}`, headers = { authorization: `Bearer ${token}` };
        try {
          while (!controller.signal.aborted) {
            if (closed || spawnError) throw Error("server exited");
            try {
              if ((await fetch(`${base}/health`, { headers, redirect: "error", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1e3)]) })).ok) break;
            } catch {
            }
            await sleep(200, void 0, { signal: controller.signal });
          }
          if (controller.signal.aborted) throw Error("cancelled");
          const p = await fetch(`${base}/props`, { headers, redirect: "error", signal: controller.signal });
          if (!p.ok || closed || (await p.json()).model_path !== model) throw Error("model mismatch");
          const criteria = Object.fromEntries(labels.map((label, i) => [`option${i + 1}`, label]));
          const response = await fetch(`${base}/v1/systemone`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, redirect: "error", signal: controller.signal, body: JSON.stringify({ state, questions: { choice: { type: "choice", instructions: question, criteria } } }) });
          if (!response.ok) throw Error("inference");
          const data = await response.json();
          const answer = data.answers?.choice, probs = answer?.probabilities;
          if (!answer || typeof answer.choice !== "string" || !Object.hasOwn(criteria, answer.choice) || !probs || Object.keys(probs).length !== labels.length || Object.keys(criteria).some((k) => typeof probs[k] !== "number" || !Number.isFinite(probs[k]) || probs[k] < 0 || probs[k] > 1)) throw Error("invalid answer");
          const sum = Object.values(probs).reduce((a, b) => a + b, 0);
          if (Math.abs(sum - 1) > 0.02) throw Error("invalid probabilities");
          return { headers: { "cache-control": "no-store" }, body: { ok: true, model: "Julia-1 Q8_0", model_sha256: MODEL_SHA, choice: labels[Number(answer.choice.slice(6)) - 1], options: labels.map((label, i) => ({ label, probability: probs[`option${i + 1}`] })) } };
        } finally {
          controller.signal.removeEventListener("abort", stop);
          stop();
          let wait;
          await Promise.race([exited, new Promise((resolve) => {
            wait = setTimeout(resolve, 1e4);
          })]);
          if (wait) clearTimeout(wait);
          if (!closed) {
            pendingTermination = true;
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
        return controller.signal.aborted ? fail(499, "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043C\u0435\u043D\u0451\u043D \u0438\u043B\u0438 \u0432\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F \u0438\u0441\u0442\u0435\u043A\u043B\u043E.") : fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435.");
      } finally {
        clearTimeout(timer);
        c.res?.off("close", abort);
        active = null;
        if (!pendingTermination) busy = false;
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
