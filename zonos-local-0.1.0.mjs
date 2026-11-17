import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/zonos-local/index.ts
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

// modules/zonos-local/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZONOS</title></head><body><main><h1>\u042D\u043A\u0441\u043F\u0435\u0440\u0438\u043C\u0435\u043D\u0442\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435 ZONOS</h1><p>\u0417\u0430\u043F\u0438\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0451\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u0438 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0432 \u0434\u0430\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0443\u043B\u044F. \u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u0433\u043E\u043B\u043E\u0441\u0430 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.</p><p id="setup" role="status"></p><label>\u0422\u0435\u043A\u0441\u0442<br><textarea id="text" rows="8" cols="70" maxlength="1000"></textarea></label><p><button id="run">\u0421\u043E\u0437\u0434\u0430\u0442\u044C WAV</button> <button id="cancel" disabled>\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435</button> <button id="play" disabled>\u041F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044E\u044E \u0437\u0430\u043F\u0438\u0441\u044C</button> <button id="stop">\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435</button></p><p id="status" role="status"></p><p id="play-status" role="status"></p><h2>\u0417\u0430\u043F\u0438\u0441\u0438</h2><p>\u0417\u0434\u0435\u0441\u044C \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u044E\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 100 \u0444\u0430\u0439\u043B\u043E\u0432, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u043C \u0437\u0430\u0434\u0430\u0447.</p><button id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button><p id="history-status" role="status"></p><ul id="history"></ul><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u0447</h2><p>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u0435\u0442 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u043E\u0439 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438 \u0446\u0435\u043B\u0438\u043A\u043E\u043C. \u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0435\u0451 \u0432 \u0440\u0435\u0435\u0441\u0442\u0440 \u0430\u0433\u0435\u043D\u0442\u043E\u0432.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F</button><pre id="agent" role="status"></pre></main><script>
fetch('/api/tools/zonos-local/status').then(r=>r.json()).then(d=>{const names={node:'Node.js',script:'\u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 ZONOS',engine:'\u0441\u0431\u043E\u0440\u043A\u0430 \u0432\u0435\u0431-\u0434\u0432\u0438\u0436\u043A\u0430',model:'\u0444\u0430\u0439\u043B\u044B \u043C\u043E\u0434\u0435\u043B\u0438'},missing=Object.keys(names).filter(k=>!d.components?.[k]).map(k=>names[k]);document.getElementById('setup').textContent=d.configured?'\u0424\u0430\u0439\u043B\u044B \u043D\u0430\u0439\u0434\u0435\u043D\u044B; \u0445\u0435\u0448\u0438 \u043C\u043E\u0434\u0435\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C.':'\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0438\u043B\u0438 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B: '+missing.join(', ')+'. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443.'}).catch(()=>document.getElementById('setup').textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438.');
let currentId='',requestId='',context,source,sequence=0,cancelPromise=null;
document.getElementById('run').onclick=async()=>{const button=document.getElementById('run'),cancel=document.getElementById('cancel'),out=document.getElementById('status');button.disabled=true;cancelPromise=null;out.textContent='\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438\u2026';try{requestId=crypto.randomUUID();cancel.disabled=false;const r=await fetch('/api/tools/zonos-local/synthesize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:document.getElementById('text').value,request_id:requestId})}),d=await r.json();if(!r.ok)throw Error(d.error.message);currentId=d.id;document.getElementById('play').disabled=false;out.textContent='WAV \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D: '+d.path+' ('+d.bytes+' \u0431\u0430\u0439\u0442).';await refresh()}catch(e){const cancelled=cancelPromise?await cancelPromise:false;out.textContent=cancelled?'\u041E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E.':e.message}finally{button.disabled=false;cancel.disabled=true;requestId=''}};
document.getElementById('cancel').onclick=async()=>{const button=document.getElementById('cancel'),out=document.getElementById('status'),id=requestId;button.disabled=true;out.textContent='\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438\u2026';cancelPromise=(async()=>{try{const r=await fetch('/api/tools/zonos-local/cancel',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request_id:id})});return r.ok}catch{return false}})();const accepted=await cancelPromise;if(!accepted&&requestId===id){out.textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C; \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.';button.disabled=false}};
document.getElementById('stop').onclick=()=>{sequence++;if(source){source.stop();source=null}document.getElementById('play-status').textContent='\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E.'};
async function playRecording(id){const token=++sequence,out=document.getElementById('play-status');try{if(!context)context=new AudioContext();await context.resume();let bytes,offset=0,modified;do{const r=await fetch('/api/tools/zonos-local/audio?id='+encodeURIComponent(id)+'&offset='+offset),d=await r.json();if(!r.ok)throw Error(d.error.message);if(token!==sequence)return;if(!Number.isSafeInteger(d.total)||d.total<44||d.total>8000000||d.offset!==offset)throw Error('\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C');if(!bytes){bytes=new Uint8Array(d.total);modified=d.modified}if(bytes.length!==d.total||modified!==d.modified)throw Error('\u0417\u0430\u043F\u0438\u0441\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C');const chunk=Uint8Array.from(atob(d.audio),c=>c.charCodeAt(0));if(!chunk.length||offset+chunk.length>bytes.length)throw Error('\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0447\u0430\u0441\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u0438');bytes.set(chunk,offset);offset+=chunk.length}while(offset<bytes.length);const audio=await context.decodeAudioData(bytes.buffer);if(token!==sequence)return;if(source)source.stop();source=context.createBufferSource();source.buffer=audio;source.connect(context.destination);source.start();out.textContent='\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435\u2026'}catch(e){if(token===sequence)out.textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438: '+e.message}}
document.getElementById('play').onclick=()=>playRecording(currentId);
async function refresh(){const out=document.getElementById('history-status'),list=document.getElementById('history');try{const r=await fetch('/api/tools/zonos-local/recordings'),d=await r.json();if(!r.ok)throw Error(d.error.message);list.replaceChildren();for(const item of d.recordings){const li=document.createElement('li'),button=document.createElement('button');button.textContent='\u041F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C';button.onclick=()=>playRecording(item.id);li.append(button,document.createTextNode(' '+item.path+' \u2014 '+item.bytes+' \u0431\u0430\u0439\u0442, '+new Date(item.modified).toLocaleString()));list.append(li)}out.textContent=d.recordings.length?(d.truncated?'\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 100 \u0437\u0430\u043F\u0438\u0441\u0435\u0439.':'\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0435\u0439: '+d.recordings.length):'\u0417\u0430\u043F\u0438\u0441\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.'}catch(e){out.textContent=e.message}}
document.getElementById('refresh').onclick=refresh;refresh();
document.getElementById('prepare').onclick=async()=>{const b=document.getElementById('prepare'),out=document.getElementById('agent');b.disabled=true;try{const r=await fetch('/api/tools/zonos-local/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify(d.agent,null,2)}catch(e){out.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/zonos-local/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "", port = Number(portText), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u0438 TEAM_TASK_ID.\n");
    process.exitCode = 1;
    return;
  }
  const base = `http://127.0.0.1:${port}`;
  async function request(path, init = {}, timeout = 1e4) {
    const response = await fetch(base + path, { ...init, redirect: "error", signal: AbortSignal.timeout(timeout) });
    if (!response.ok) throw Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}`);
    return response.json();
  }
  try {
    const task = (await request(`/api/tasks/${encodeURIComponent(id)}`))?.task;
    if (!task || task.id !== id || typeof task.description !== "string" || !task.description.trim() || task.description.length > 1e3 || ["done", "cancelled"].includes(task.status)) throw Error("\u041D\u0443\u0436\u043D\u0430 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u0441 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const result = await request("/api/tools/zonos-local/synthesize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: task.description }) }, 625e3);
    if (result?.ok !== true || typeof result.path !== "string" || !result.path || result.path.length > 2e3 || /[\x00-\x1f\x7f]/.test(result.path) || !Number.isSafeInteger(result.bytes) || result.bytes < 44 || result.bytes > 8e6) throw Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043C\u043E\u0434\u0443\u043B\u044F \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u044F");
    process.stdout.write(`\u0421\u043E\u0437\u0434\u0430\u043D WAV: ${result.path} (${result.bytes} \u0431\u0430\u0439\u0442). \u0424\u0430\u0439\u043B \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0432 \u0434\u0430\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0443\u043B\u044F.
`);
  } catch (error) {
    process.stderr.write(`\u041E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/zonos-local/index.ts
var MAX_AUDIO = 8e6;
var CHUNK = 1e6;
var REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var AUDIO_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.wav$/;
function file(path) {
  try {
    return isAbsolute(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}
function readiness(node, script) {
  const nodeReady = file(node), scriptReady = file(script);
  let modelReady = false, engineReady = false;
  if (scriptReady) {
    const root = resolve(dirname(script), "..");
    const model = process.env.TEAM_ZONOS_MODEL_DIR?.trim() || join(root, ".tmp-zonos3-recon", ".tmp-zonos-web-model");
    const dist = process.env.TEAM_ZONOS_WEB_DIST?.trim() || join(root, ".tmp-zonos3-recon", ".tmp-zonos-git", "servers", "web", "dist");
    try {
      engineReady = isAbsolute(dist) && ["engine.js", "worker.js", "codec-worker.js"].every((name) => {
        const s = lstatSync(join(dist, name));
        return s.isFile() && s.size > 0;
      });
    } catch {
    }
    try {
      const manifest = JSON.parse(readFileSync(join(root, "docs", "zonos3-web-model-files-2026-11-15.json"), "utf8"));
      const names = /* @__PURE__ */ new Set();
      modelReady = isAbsolute(model) && manifest.revision === "d2d142a86b1e6aeb4252679673c86ecd86177bf8" && Array.isArray(manifest.files) && manifest.files.length === 18 && manifest.files.every((item) => {
        if (typeof item.path !== "string" || !/^web\/(backbone|zac)\/(manifest\.json|shard-\d{3}\.bin)$/.test(item.path) || names.has(item.path) || !Number.isSafeInteger(item.size) || item.size <= 0) return false;
        names.add(item.path);
        const s = lstatSync(join(model, ...item.path.split("/")));
        return s.isFile() && s.size === item.size;
      });
    } catch {
    }
  }
  return { node: nodeReady, script: scriptReady, engine: engineReady, model: modelReady };
}
function fail(status, message) {
  return { status, body: { ok: false, error: { message } } };
}
var module = {
  id: "zonos-local",
  apiVersion: 1,
  register(ctx) {
    let active = null;
    const config = () => ({ node: process.env.TEAM_ZONOS_NODE?.trim() || "", script: process.env.TEAM_ZONOS_SCRIPT?.trim() || "" });
    const stopping = /* @__PURE__ */ new WeakSet();
    const cancel = (child) => {
      if (stopping.has(child)) return;
      stopping.add(child);
      try {
        if (child.connected) child.send("cancel");
      } catch {
      }
      const fallback = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill();
      }, 1e4);
      fallback.unref();
      child.once("close", () => clearTimeout(fallback));
    };
    ctx.onShutdown(async () => {
      const job = active;
      if (!job) return;
      await new Promise((resolve2) => {
        job.child.once("close", () => resolve2());
        job.stop();
      });
    });
    ctx.api.add("GET", "/api/tools/zonos-local/status", () => {
      const { node, script } = config(), components = readiness(node, script);
      return { body: { ok: true, configured: Object.values(components).every(Boolean), components } };
    });
    ctx.api.add("POST", "/api/tools/zonos-local/cancel", (c) => {
      const data = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      if (typeof data.request_id !== "string" || !REQUEST_ID.test(data.request_id)) return fail(400, "\u041D\u0443\u0436\u0435\u043D \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u044F");
      if (!active || active.id !== data.request_id) return fail(409, "\u042D\u0442\u043E \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      active.stop();
      return { status: 202, body: { ok: true } };
    });
    ctx.api.add("POST", "/api/tools/zonos-local/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `zonos-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "zonos-agent", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 65e4 }, sha256: digest } };
      } catch {
        return fail(500, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F");
      }
    });
    ctx.api.add("GET", "/api/tools/zonos-local/recordings", () => {
      const directory = join(ctx.paths.data, "audio");
      try {
        const recordings = [];
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          if (!entry.isFile() || !AUDIO_NAME.test(entry.name)) continue;
          const path = join(directory, entry.name);
          try {
            const info = lstatSync(path);
            if (info.isFile() && info.size >= 44 && info.size <= MAX_AUDIO) recordings.push({ id: entry.name, path, bytes: info.size, modified: info.mtime.toISOString() });
          } catch {
          }
        }
        recordings.sort((a, b) => b.modified.localeCompare(a.modified) || a.id.localeCompare(b.id));
        return { headers: { "cache-control": "no-store" }, body: { ok: true, recordings: recordings.slice(0, 100), truncated: recordings.length > 100 } };
      } catch (error) {
        if (error.code === "ENOENT") return { headers: { "cache-control": "no-store" }, body: { ok: true, recordings: [], truncated: false } };
        return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0437\u0430\u043F\u0438\u0441\u0435\u0439");
      }
    });
    ctx.api.add("GET", "/api/tools/zonos-local/audio", (c) => {
      const id = c.query.get("id") || "", offsetText = c.query.get("offset") || "0";
      if (!AUDIO_NAME.test(id) || !/^(0|[1-9]\d{0,6})$/.test(offsetText)) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0437\u0430\u043F\u0438\u0441\u0438");
      const offset = Number(offsetText), path = join(ctx.paths.data, "audio", id);
      try {
        const info = lstatSync(path);
        if (!info.isFile() || info.size < 44 || info.size > MAX_AUDIO || offset >= info.size) return fail(404, "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
        const audio = readFileSync(path);
        if (audio.length !== info.size || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") return fail(404, "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
        return { headers: { "cache-control": "no-store" }, body: { ok: true, audio: audio.subarray(offset, offset + CHUNK).toString("base64"), offset, total: audio.length, modified: info.mtimeMs } };
      } catch {
        return fail(404, "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
      }
    });
    ctx.api.add("POST", "/api/tools/zonos-local/synthesize", async (c) => {
      const data = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      if (typeof data.text !== "string" || !data.text.trim() || data.text.length > 1e3 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(data.text)) return fail(400, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
      if (data.request_id !== void 0 && (typeof data.request_id !== "string" || !REQUEST_ID.test(data.request_id))) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u044F");
      const { node, script } = config();
      if (!file(node) || !file(script)) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A Node.js \u0438 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044E ZONOS");
      if (active) return fail(409, "\u0414\u0440\u0443\u0433\u043E\u0435 \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      const requestId = typeof data.request_id === "string" ? data.request_id : randomUUID();
      const id = `${randomUUID()}.wav`, dir = join(ctx.paths.data, "audio"), path = join(dir, id);
      try {
        mkdirSync(dir, { recursive: true });
        const env = {};
        for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "TEAM_ZONOS_MODEL_DIR", "TEAM_ZONOS_WEB_DIST"]) if (process.env[key]) env[key] = process.env[key];
        await new Promise((resolve2, reject) => {
          const child = spawn(node, [script, path], { windowsHide: true, shell: false, env, stdio: ["pipe", "pipe", "pipe", "ipc"] });
          let stopped = false;
          const stop = () => {
            stopped = true;
            cancel(child);
          };
          const job = { id: requestId, child, stop };
          active = job;
          const timer = setTimeout(stop, 61e4);
          c.res?.once("close", stop);
          child.stdout?.resume();
          child.stderr?.resume();
          child.stdin?.on("error", () => {
          });
          child.once("error", reject);
          child.once("close", (code) => {
            clearTimeout(timer);
            c.res?.off("close", stop);
            if (active === job) active = null;
            if (code !== 0 || stopped) reject(Error("synthesis failed"));
            else resolve2();
          });
          child.stdin?.end(data.text, "utf8");
        });
        const info = lstatSync(path);
        if (!info.isFile() || info.size < 44 || info.size > MAX_AUDIO) throw Error("invalid audio");
        const audio = readFileSync(path);
        if (audio.length !== info.size || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") throw Error("invalid audio");
        return { body: { ok: true, id, path, bytes: info.size } };
      } catch {
        return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u0443\u0434\u0438\u043E; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u043C\u043E\u0434\u0435\u043B\u044C");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
