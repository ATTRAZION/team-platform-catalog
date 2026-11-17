import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/piper-local/index.ts
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// modules/piper-local/worker.ts
var WORKER = String.raw`
import io, sys, wave
from piper import PiperVoice
text = sys.stdin.buffer.read().decode('utf-8')
voice = PiperVoice.load(sys.argv[1], config_path=sys.argv[2], use_cuda=False)
out = io.BytesIO()
with wave.open(out, 'wb') as wav:
    if len(sys.argv) > 3:
        from piper import SynthesisConfig
        voice.synthesize_wav(text, wav, syn_config=SynthesisConfig(length_scale=1.0 / float(sys.argv[3])))
    else:
        voice.synthesize_wav(text, wav)
sys.stdout.buffer.write(out.getvalue())
`;

// modules/piper-local/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435</title></head><body><main><h1>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435</h1><p>\u0422\u0435\u043A\u0441\u0442 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E; WAV \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0432 \u043F\u0430\u043F\u043A\u0435 \u0434\u0430\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0443\u043B\u044F. \u0423\u0434\u0430\u043B\u044F\u0439\u0442\u0435 \u043D\u0435\u043D\u0443\u0436\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u043E.</p><p id="setup" role="status"></p><label>\u0422\u0435\u043A\u0441\u0442<br><textarea id="text" rows="8" cols="70" maxlength="1000"></textarea></label><p><label>\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0440\u0435\u0447\u0438 <select id="speed"><option value="">\u041F\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0435 \u0433\u043E\u043B\u043E\u0441\u0430</option><option value="0.5">0,5\xD7</option><option value="0.75">0,75\xD7</option><option value="1">1\xD7</option><option value="1.25">1,25\xD7</option><option value="1.5">1,5\xD7</option></select></label></p><p><button id="run">\u0421\u043E\u0437\u0434\u0430\u0442\u044C WAV</button></p><p id="status" role="status"></p><h2>\u0417\u0430\u043F\u0438\u0441\u0438</h2><p>\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 100 \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u041C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C \u0437\u0434\u0435\u0441\u044C \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C WAV \u043F\u043E \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u043C\u0443 \u043F\u0443\u0442\u0438.</p><button id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button><p id="history-status" role="status"></p><button id="stop-playback">\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435</button><p id="play-status" role="status"></p><ul id="history"></ul><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u0447</h2><p>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u0435\u0442 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438 \u0446\u0435\u043B\u0438\u043A\u043E\u043C (\u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432). \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u0440\u0435\u0435\u0441\u0442\u0440 \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F</button><pre id="agent" role="status"></pre></main><script>
fetch('/api/tools/piper-local/status').then(r=>r.json()).then(d=>document.getElementById('setup').textContent=d.configured?'\u041F\u0443\u0442\u0438 \u043A \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C\u0443 \u0434\u0432\u0438\u0436\u043A\u0443 \u0438 \u0433\u043E\u043B\u043E\u0441\u0443 \u0437\u0430\u0434\u0430\u043D\u044B.':'\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A Python, \u043C\u043E\u0434\u0435\u043B\u0438 \u0438 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438, \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443.').catch(()=>document.getElementById('setup').textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438.');
async function refresh(){const out=document.getElementById('history-status'),list=document.getElementById('history');try{const r=await fetch('/api/tools/piper-local/recordings'),d=await r.json();if(!r.ok)throw Error(d.error.message);list.replaceChildren();for(const item of d.recordings){const li=document.createElement('li');const play=document.createElement('button');play.textContent='\u041F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C';play.onclick=()=>playRecording(item.id,play);li.append(play,document.createTextNode(' '+item.path+' \u2014 '+item.bytes+' \u0431\u0430\u0439\u0442, '+new Date(item.modified).toLocaleString()));list.append(li)}out.textContent=d.recordings.length?(d.truncated?'\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 100 \u0437\u0430\u043F\u0438\u0441\u0435\u0439.':'\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0435\u0439: '+d.recordings.length):'\u0417\u0430\u043F\u0438\u0441\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.'}catch(e){out.textContent=e.message}}
let audioContext, currentAudio, playbackRequest=0;
function stopPlayback(){playbackRequest++;if(currentAudio){const source=currentAudio;currentAudio=null;source.stop()}document.getElementById('play-status').textContent='\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E.'}
document.getElementById('stop-playback').onclick=stopPlayback;
async function playRecording(id,button){const out=document.getElementById('play-status'),request=++playbackRequest;button.disabled=true;out.textContent='\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0437\u0430\u043F\u0438\u0441\u0438\u2026';try{if(!audioContext)audioContext=new AudioContext();await audioContext.resume();let bytes,offset=0,modified;do{const r=await fetch('/api/tools/piper-local/audio?id='+encodeURIComponent(id)+'&offset='+offset),d=await r.json();if(!r.ok)throw Error(d.error.message);if(request!==playbackRequest)return;if(!Number.isSafeInteger(d.total)||d.total<44||d.total>8000000||d.offset!==offset||typeof d.audio!=='string')throw Error('\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043E \u0437\u0430\u043F\u0438\u0441\u0438');if(!bytes){bytes=new Uint8Array(d.total);modified=d.modified}if(bytes.length!==d.total||modified!==d.modified)throw Error('\u0417\u0430\u043F\u0438\u0441\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C \u043F\u0440\u0438 \u0447\u0442\u0435\u043D\u0438\u0438');const chunk=Uint8Array.from(atob(d.audio),c=>c.charCodeAt(0));if(!chunk.length||offset+chunk.length>bytes.length)throw Error('\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0447\u0430\u0441\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u0438');bytes.set(chunk,offset);offset+=chunk.length}while(offset<bytes.length);const audio=await audioContext.decodeAudioData(bytes.buffer);if(request!==playbackRequest)return;if(currentAudio)currentAudio.stop();const source=audioContext.createBufferSource();source.buffer=audio;source.connect(audioContext.destination);currentAudio=source;source.onended=()=>{if(currentAudio===source){currentAudio=null;out.textContent='\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E.'}};source.start();out.textContent='\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435\u2026'}catch(e){if(request===playbackRequest)out.textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0437\u0430\u043F\u0438\u0441\u044C: '+e.message}finally{button.disabled=false}}
document.getElementById('refresh').onclick=refresh;refresh();
document.getElementById('run').onclick=async()=>{const b=document.getElementById('run'),out=document.getElementById('status');b.disabled=true;out.textContent='\u041E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435\u2026';try{const r=await fetch('/api/tools/piper-local/synthesize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:document.getElementById('text').value,...(document.getElementById('speed').value?{speed:Number(document.getElementById('speed').value)}:{})})});const d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent='WAV \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D: '+d.path+' ('+d.bytes+' \u0431\u0430\u0439\u0442). \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0444\u0430\u0439\u043B \u0432 \u043F\u0440\u043E\u0438\u0433\u0440\u044B\u0432\u0430\u0442\u0435\u043B\u0435.';await refresh()}catch(e){out.textContent=e.message}finally{b.disabled=false}};
document.getElementById('prepare').onclick=async()=>{const b=document.getElementById('prepare'),out=document.getElementById('agent');b.disabled=true;try{const r=await fetch('/api/tools/piper-local/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify(d.agent,null,2)}catch(e){out.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/piper-local/task-agent-runtime.ts
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
    if (!task || task.id !== id || typeof task.description !== "string" || !task.description.trim() || task.description.length > 1e3 || ["done", "cancelled"].includes(task.status)) throw new Error("\u041D\u0443\u0436\u043D\u0430 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u0441 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const rawSpeed = process.env.TEAM_PIPER_SPEED || "";
    if (rawSpeed && (!/^(?:0(?:\.\d+)?|1(?:\.\d+)?)$/.test(rawSpeed) || Number(rawSpeed) < 0.5 || Number(rawSpeed) > 1.5)) throw new Error("TEAM_PIPER_SPEED: \u0447\u0438\u0441\u043B\u043E \u043E\u0442 0.5 \u0434\u043E 1.5");
    const result = await request("/api/tools/piper-local/synthesize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: task.description, ...rawSpeed ? { speed: Number(rawSpeed) } : {} }) });
    if (result?.ok !== true || typeof result.path !== "string" || !result.path || result.path.length > 2e3 || /[\x00-\x1f\x7f]/.test(result.path) || !Number.isSafeInteger(result.bytes) || result.bytes < 44 || result.bytes > 8e6) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043C\u043E\u0434\u0443\u043B\u044F \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u044F");
    process.stdout.write(`\u0421\u043E\u0437\u0434\u0430\u043D WAV: ${result.path} (${result.bytes} \u0431\u0430\u0439\u0442). \u0424\u0430\u0439\u043B \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0432 \u0434\u0430\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0443\u043B\u044F.
`);
  } catch (error) {
    process.stderr.write(`\u041E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/piper-local/index.ts
var MAX_AUDIO = 8e6;
var AUDIO_CHUNK = 1e6;
var AUDIO_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.wav$/;
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
var module = {
  id: "piper-local",
  apiVersion: 1,
  register(ctx) {
    let active = null;
    const config = () => ({ python: process.env.TEAM_PIPER_PYTHON?.trim() || "", model: process.env.TEAM_PIPER_MODEL?.trim() || "", voiceConfig: process.env.TEAM_PIPER_CONFIG?.trim() || "" });
    ctx.onShutdown(async () => {
      const child = active;
      if (child) await new Promise((resolve) => {
        child.once("close", () => resolve());
        child.kill();
      });
    });
    ctx.api.add("POST", "/api/tools/piper-local/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return { status: 503, body: { error: { code: "port_unavailable", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B." } } };
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `piper-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "piper-agent", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 11e4 }, sha256: digest } };
      } catch {
        return { status: 500, body: { error: { code: "agent_prepare_failed", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0434\u0430\u043F\u0442\u0435\u0440 \u0430\u0433\u0435\u043D\u0442\u0430." } } };
      }
    });
    ctx.api.add("GET", "/api/tools/piper-local/status", () => {
      const { python, model, voiceConfig } = config();
      return { body: { ok: true, configured: [python, model, voiceConfig].every(file) } };
    });
    ctx.api.add("GET", "/api/tools/piper-local/recordings", () => {
      const directory = join(ctx.paths.data, "audio");
      try {
        const records = [];
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          if (!entry.isFile() || !AUDIO_NAME.test(entry.name)) continue;
          const path = join(directory, entry.name);
          try {
            const info = lstatSync(path);
            if (info.isFile() && info.size >= 44 && info.size <= MAX_AUDIO) records.push({ id: entry.name, path, bytes: info.size, modified: info.mtime.toISOString() });
          } catch {
          }
        }
        records.sort((a, b) => b.modified.localeCompare(a.modified) || a.path.localeCompare(b.path));
        return { body: { ok: true, recordings: records.slice(0, 100), truncated: records.length > 100 } };
      } catch (error) {
        if (error.code === "ENOENT") return { body: { ok: true, recordings: [], truncated: false } };
        return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0437\u0430\u043F\u0438\u0441\u0435\u0439");
      }
    });
    ctx.api.add("GET", "/api/tools/piper-local/audio", (c) => {
      const id = c.query.get("id") || "";
      if (!AUDIO_NAME.test(id)) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u043F\u0438\u0441\u0438");
      const offsetText = c.query.get("offset") || "0";
      if (!/^(0|[1-9]\d{0,6})$/.test(offsetText)) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0437\u0430\u043F\u0438\u0441\u0438");
      const offset = Number(offsetText);
      const path = join(ctx.paths.data, "audio", id);
      try {
        const info = lstatSync(path);
        if (!info.isFile() || info.size < 44 || info.size > MAX_AUDIO || offset >= info.size) return fail(404, "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
        const audio = readFileSync(path);
        if (audio.length !== info.size || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") return fail(404, "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
        return { headers: { "cache-control": "no-store" }, body: { ok: true, audio: audio.subarray(offset, offset + AUDIO_CHUNK).toString("base64"), offset, total: audio.length, modified: info.mtimeMs } };
      } catch {
        return fail(404, "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
      }
    });
    ctx.api.add("POST", "/api/tools/piper-local/synthesize", async (c) => {
      const data = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      if (typeof data.text !== "string" || !data.text.trim() || data.text.length > 1e3 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(data.text)) return fail(400, "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
      if (data.speed !== void 0 && (typeof data.speed !== "number" || !Number.isFinite(data.speed) || data.speed < 0.5 || data.speed > 1.5)) return fail(400, "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0447\u0438\u0441\u043B\u043E\u043C \u043E\u0442 0,5 \u0434\u043E 1,5");
      const { python, model, voiceConfig } = config();
      if (![python, model, voiceConfig].every(file)) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A Python, \u043C\u043E\u0434\u0435\u043B\u0438 \u0438 \u0435\u0451 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438");
      if (active) return fail(409, "\u0414\u0440\u0443\u0433\u043E\u0435 \u043E\u0437\u0432\u0443\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      const env = { PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", OMP_NUM_THREADS: "4" };
      for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
      try {
        const audio = await new Promise((resolve, reject) => {
          const args = ["-c", WORKER, model, voiceConfig];
          if (typeof data.speed === "number") args.push(String(data.speed));
          const child = spawn(python, args, { windowsHide: true, shell: false, env, stdio: ["pipe", "pipe", "pipe"] });
          active = child;
          let size = 0, stopped = false;
          const chunks = [];
          const stop = () => {
            stopped = true;
            child.kill();
          };
          const timer = setTimeout(stop, 55e3);
          c.res?.once("close", stop);
          child.stdout.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_AUDIO) stop();
            else chunks.push(chunk);
          });
          child.stderr.resume();
          child.stdin.on("error", () => {
          });
          child.once("error", reject);
          child.once("close", (code) => {
            clearTimeout(timer);
            c.res?.off("close", stop);
            if (active === child) active = null;
            if (code !== 0 || stopped) return reject(new Error("synthesis failed"));
            const result = Buffer.concat(chunks);
            if (result.length < 44 || result.toString("ascii", 0, 4) !== "RIFF" || result.toString("ascii", 8, 12) !== "WAVE") return reject(new Error("invalid wave"));
            resolve(result);
          });
          child.stdin.end(data.text, "utf8");
        });
        const directory = join(ctx.paths.data, "audio");
        mkdirSync(directory, { recursive: true });
        const path = join(directory, `${randomUUID()}.wav`);
        writeFileSync(path, audio, { flag: "wx" });
        return { body: { ok: true, path, bytes: audio.length } };
      } catch {
        return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u0443\u0434\u0438\u043E; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u0433\u043E\u043B\u043E\u0441");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
