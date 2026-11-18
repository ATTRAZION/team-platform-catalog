import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/whisper-local/index.ts
import { randomUUID } from "node:crypto";
import { spawn as spawn3 } from "node:child_process";
import { appendFileSync, closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync as readFileSync3, readSync, readdirSync, renameSync, statSync as statSync3, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

// modules/whisper-local/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u0430\u0443\u0434\u0438\u043E</title></head><body><main><h1>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u0430\u0443\u0434\u0438\u043E \u0438 \u0432\u0438\u0434\u0435\u043E</h1><p>WAV, MP3, OGG, FLAC \u0438 \u043F\u0435\u0440\u0432\u0430\u044F \u0437\u0432\u0443\u043A\u043E\u0432\u0430\u044F \u0434\u043E\u0440\u043E\u0436\u043A\u0430 MP4 \u0434\u043E 64 \u041C\u0438\u0411 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E. \u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0432\u0438\u0434\u0435\u043E \u043D\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0435\u0442\u0441\u044F. \u0412 MOSS \u043D\u043E\u043C\u0435\u0440\u0430 \u0433\u043E\u0432\u043E\u0440\u044F\u0449\u0438\u0445 \u0432 \u0440\u0430\u0437\u043D\u044B\u0445 \u0430\u0443\u0434\u0438\u043E\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430\u0445 \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B.</p><p id="setup" role="status">\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438\u2026</p><label>\u0414\u0432\u0438\u0436\u043E\u043A: <select id="engine"><option value="whisper">Whisper</option><option value="qwen">Qwen3-ASR (\u0434\u043E 20 \u043C\u0438\u043D\u0443\u0442, \u0431\u0435\u0437 SRT)</option><option value="moss">MOSS: \u0433\u043E\u0432\u043E\u0440\u044F\u0449\u0438\u0435 (\u0434\u043E 5 \u043C\u0438\u043D\u0443\u0442, \u0431\u0435\u0437 SRT)</option></select></label><input id="audio" type="file" accept=".wav,.mp3,.ogg,.flac,.mp4,audio/wav,audio/mpeg,audio/ogg,audio/flac,video/mp4"><button id="start">\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u0430\u0442\u044C</button><button id="cancel" disabled>\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C</button><p id="status" role="status"></p><pre id="text" style="white-space:pre-wrap"></pre><section><h2>\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u044B SRT</h2><button id="subtitles" disabled>\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u044B</button><p id="subtitle-status" role="status"></p><label for="srt">\u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0432 \u0444\u0430\u0439\u043B \u0441 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C .srt \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0442\u0430\u0439\u043C\u043A\u043E\u0434\u044B.</label><br><textarea id="srt" rows="8" cols="70" readonly></textarea></section><section><h2>\u0417\u0430\u0434\u0430\u0447\u0430 \u043F\u043E \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0435</h2><p>\u0420\u0430\u0437\u043C\u0435\u0440 \u0447\u0430\u0441\u0442\u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D \u0432 \u0441\u0438\u043C\u0432\u043E\u043B\u0430\u0445, \u043D\u043E \u044D\u0442\u043E \u043D\u0435 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u0443\u0435\u0442, \u0447\u0442\u043E \u043E\u043D\u0430 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u043F\u043E\u043C\u0435\u0441\u0442\u0438\u0442\u0441\u044F \u0432 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438. \u041C\u043E\u0434\u0435\u043B\u044C \u0442\u0430\u043A\u0436\u0435 \u043C\u043E\u0436\u0435\u0442 \u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F\u043C \u0438\u0437 \u0437\u0430\u043F\u0438\u0441\u0438 \u0432\u043C\u0435\u0441\u0442\u043E \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u043F\u043E \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0443 \u0438 \u043F\u0440\u0438 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438 \u0434\u0435\u043B\u0438\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E.</p><label>\u041F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435<br><textarea id="instruction" rows="3" cols="60" maxlength="1000">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C \u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438 \u0432\u044B\u0434\u0435\u043B\u0438 \u043E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u043C\u044B\u0441\u043B\u0438.</textarea></label><p><label>\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0432 \u0447\u0430\u0441\u0442\u0438: <select id="part-size"><option value="10000">10000</option><option value="5000">5000</option><option value="2000">2000</option></select></label> <button id="parts" disabled>\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0447\u0430\u0441\u0442\u0438 \u0437\u0430\u043F\u0438\u0441\u0438</button> <label>\u0412 \u0437\u0430\u0434\u0430\u0447\u0443: <select id="part"><option value="">\u0412\u0441\u044F \u0437\u0430\u043F\u0438\u0441\u044C</option></select></label></p><p id="part-status" role="status"></p><p><button id="task" disabled>\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443</button></p><p id="task-status" role="status"></p></section><h2>\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F</h2><div id="history"></div></main><script>
const status=document.getElementById('status'), text=document.getElementById('text'), start=document.getElementById('start'), cancel=document.getElementById('cancel'), task=document.getElementById('task');let active=null,selected=null,partsHash=null,partsSize=null;
function selectJob(j){selected=j.state==='done'?j.id:null;partsHash=null;partsSize=null;document.getElementById('part').replaceChildren(new Option('\u0412\u0441\u044F \u0437\u0430\u043F\u0438\u0441\u044C',''));document.getElementById('parts').disabled=!selected;document.getElementById('part-status').textContent='';task.disabled=!selected;document.getElementById('subtitles').disabled=!selected||(j.engine==='qwen'||j.engine==='moss');document.getElementById('srt').value='';document.getElementById('subtitle-status').textContent='';text.textContent=j.text||j.message||'';document.getElementById('task-status').textContent=''}
async function api(path,body){const r=await fetch('/api/tools/whisper-local'+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error.message);return j}
async function history(){const d=await api('/jobs');const root=document.getElementById('history');root.textContent='';for(const j of d.jobs.slice().reverse()){const b=document.createElement('button');b.textContent=(j.name||j.id)+' \u2014 '+j.state;b.onclick=async()=>{try{selectJob((await api('/jobs/'+j.id)).job)}catch(e){status.textContent=e.message}};root.append(b,document.createElement('br'))}}
start.onclick=async()=>{const file=document.getElementById('audio').files[0];if(!file||file.size>64*1024*1024){status.textContent='\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B \u0438\u043B\u0438 MP4 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C \u0434\u043E 64 \u041C\u0438\u0411';return}start.disabled=true;selectJob({state:'uploading'});try{const created=await api('/jobs',{name:file.name});active=created.job.id;for(let offset=0;offset<file.size;offset+=384*1024){const bytes=new Uint8Array(await file.slice(offset,offset+384*1024).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));await api('/jobs/'+active+'/chunks',{offset,data:btoa(s)});status.textContent='\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 '+Math.min(file.size,offset+bytes.length)+' / '+file.size}await api('/jobs/'+active+'/start',{engine:document.getElementById('engine').value});cancel.disabled=false;let j;do{await new Promise(r=>setTimeout(r,1500));j=(await api('/jobs/'+active)).job;status.textContent=j.message||j.state}while(j.state==='processing');selectJob(j);await history()}catch(e){status.textContent=e.message}finally{active=null;start.disabled=false;cancel.disabled=true}};
document.getElementById('subtitles').onclick=async()=>{if(!selected)return;const id=selected,out=document.getElementById('subtitle-status');try{const d=await api('/jobs/'+encodeURIComponent(id)+'/subtitles');if(selected!==id)return;document.getElementById('srt').value=d.srt;out.textContent='\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0438 \u0432\u0440\u0435\u043C\u044F: \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u043C\u043E\u0436\u0435\u0442 \u043E\u0448\u0438\u0431\u0430\u0442\u044C\u0441\u044F.'}catch(e){if(selected===id)out.textContent=e.message}};
document.getElementById('part-size').onchange=()=>{partsHash=null;partsSize=null;document.getElementById('part').replaceChildren(new Option('\u0412\u0441\u044F \u0437\u0430\u043F\u0438\u0441\u044C',''));document.getElementById('part-status').textContent='\u0420\u0430\u0437\u043C\u0435\u0440 \u0438\u0437\u043C\u0435\u043D\u0451\u043D; \u043F\u043E\u043A\u0430\u0436\u0438\u0442\u0435 \u0447\u0430\u0441\u0442\u0438 \u0437\u0430\u043D\u043E\u0432\u043E.'};
document.getElementById('parts').onclick=async()=>{if(!selected)return;const id=selected,size=Number(document.getElementById('part-size').value),out=document.getElementById('part-status');try{const r=await fetch('/api/tools/transcript-tasks/'+encodeURIComponent(id)+'/parts?size='+size);if(r.status===404)throw Error('\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u0438 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u0417\u0430\u0434\u0430\u0447\u0438 \u0438\u0437 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043E\u043A\xBB.');const d=await r.json();if(!r.ok)throw Error(d.error.message);if(selected!==id||Number(document.getElementById('part-size').value)!==size)return;if(d.part_size!==size)throw Error('\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u0417\u0430\u0434\u0430\u0447\u0438 \u0438\u0437 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043E\u043A\xBB \u0434\u043E \u0432\u0435\u0440\u0441\u0438\u0438 1.2.0.');const list=document.getElementById('part');list.replaceChildren(new Option('\u0412\u0441\u044F \u0437\u0430\u043F\u0438\u0441\u044C',''));for(const p of d.parts)list.add(new Option('\u0427\u0430\u0441\u0442\u044C '+(p.index+1)+'/'+d.parts.length+': '+p.preview,p.index));partsHash=d.sha256;partsSize=size;out.textContent='\u0427\u0430\u0441\u0442\u0438 \u0441\u043E\u0437\u0434\u0430\u044E\u0442\u0441\u044F \u0432 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438; \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E.'}catch(e){if(selected===id)out.textContent=e.message}};
task.onclick=async()=>{if(!selected)return;task.disabled=true;const out=document.getElementById('task-status'),index=document.getElementById('part').value;try{const body={instruction:document.getElementById('instruction').value};if(index!==''){body.part_index=Number(index);body.transcript_sha256=partsHash;body.part_size=partsSize}const r=await fetch('/api/tools/transcript-tasks/'+encodeURIComponent(selected)+'/task',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(r.status===404)throw Error('\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u0438 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \xAB\u0417\u0430\u0434\u0430\u0447\u0438 \u0438\u0437 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043E\u043A\xBB \u0438 \xAB\u0414\u043E\u0441\u043A\u0430 \u0437\u0430\u0434\u0430\u0447\xBB.');const d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent='\u0421\u043E\u0437\u0434\u0430\u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 '+d.task.id+'. \u041D\u0430\u0437\u043D\u0430\u0447\u044C\u0442\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F \u043D\u0430 \u0434\u043E\u0441\u043A\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432.'}catch(e){out.textContent=e.message}finally{task.disabled=!selected}};
cancel.onclick=async()=>{if(active)try{await api('/jobs/'+active+'/cancel',{})}catch(e){status.textContent=e.message}};history().catch(e=>status.textContent=e.message);api('/status').then(s=>{document.getElementById('setup').textContent='Whisper: '+(s.cli_configured&&s.model_configured?'\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D':'\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D')+'; Qwen3-ASR: '+(s.qwen_configured?'\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D':'\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D')+'; MOSS: '+(s.moss_configured?'\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D':'\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D')+'. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C FFmpeg \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435.'}).catch(e=>document.getElementById('setup').textContent=e.message);
</script></body></html>`;

// modules/whisper-local/qwen-asr.ts
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:net";

// modules/whisper-local/qwen-audio.ts
var RATE = 16e3;
var MAX_SECONDS = 20 * 60;
var CHUNK_SAMPLES = 30 * RATE;
var SEARCH_SAMPLES = 4 * RATE;
var WINDOW_SAMPLES = RATE / 10;
function splitQwenAudio(wav) {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") throw new Error("qwen_bad_wav");
  let format = false, data;
  for (let pos = 12; pos + 8 <= wav.length; ) {
    const id = wav.toString("ascii", pos, pos + 4), size = wav.readUInt32LE(pos + 4), start = pos + 8, end = start + size;
    if (end > wav.length) throw new Error("qwen_bad_wav");
    if (id === "fmt ") {
      if (size < 16) throw new Error("qwen_bad_wav");
      format = wav.readUInt16LE(start) === 1 && wav.readUInt16LE(start + 2) === 1 && wav.readUInt32LE(start + 4) === RATE && wav.readUInt16LE(start + 14) === 16;
    } else if (id === "data") {
      if (data) throw new Error("qwen_bad_wav");
      data = wav.subarray(start, end);
    }
    pos = end + (size & 1);
  }
  if (!format || !data || !data.length || data.length % 2) throw new Error("qwen_bad_wav");
  const samples = data.length / 2;
  if (samples > MAX_SECONDS * RATE) throw new Error("qwen_audio_too_long");
  const chunks = [];
  for (let start = 0; start < samples; ) {
    let end = Math.min(samples, start + CHUNK_SAMPLES);
    if (end < samples) {
      let bestEnergy = Infinity, best = end;
      for (let candidate = end - SEARCH_SAMPLES; candidate <= end - WINDOW_SAMPLES; candidate += WINDOW_SAMPLES) {
        let energy = 0;
        for (let i = candidate; i < candidate + WINDOW_SAMPLES; i++) energy += Math.abs(data.readInt16LE(i * 2));
        if (energy <= bestEnergy) {
          bestEnergy = energy;
          best = candidate + WINDOW_SAMPLES;
        }
      }
      end = best;
    }
    const pcm = data.subarray(start * 2, end * 2), header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write("WAVEfmt ", 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(RATE, 24);
    header.writeUInt32LE(RATE * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);
    chunks.push(Buffer.concat([header, pcm]));
    start = end;
  }
  return chunks;
}

// modules/whisper-local/qwen-asr.ts
async function freePort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const address = socket.address();
  if (!address || typeof address === "string") throw new Error("port_unavailable");
  const port = address.port;
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  return port;
}
async function transcribeQwen(path, config, track, cancelled, progress) {
  if (statSync(path).size > 20 * 60 * 16e3 * 2 + 1024 * 1024) throw new Error("qwen_audio_too_long");
  const chunks = splitQwenAudio(readFileSync(path));
  const port = await freePort();
  if (cancelled()) throw new Error("cancelled");
  const key = randomBytes(32).toString("hex");
  const base = `http://127.0.0.1:${port}`;
  const headers = { Authorization: `Bearer ${key}` };
  const child = spawn(config.server, ["--model", config.model, "--mmproj", config.projector, "--host", "127.0.0.1", "--port", String(port), "--threads", "4", "--threads-batch", "4", "--ctx-size", "8192", "--parallel", "1", "--n-gpu-layers", "0", "--no-mmproj-offload", "--no-webui", "--api-key", key], { windowsHide: true, stdio: "ignore", shell: false });
  track(child);
  let exited = false;
  const closed = new Promise((resolve) => {
    child.once("error", () => {
      exited = true;
      resolve();
    });
    child.once("close", () => {
      exited = true;
      resolve();
    });
  });
  try {
    const deadline = Date.now() + 12e4;
    let ready = false;
    while (Date.now() < deadline && !cancelled() && !exited) {
      try {
        const response = await fetch(`${base}/health`, { headers, signal: AbortSignal.timeout(1500) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready || cancelled() || exited) throw new Error("qwen_start_failed");
    const properties = await fetch(`${base}/props`, { headers, signal: AbortSignal.timeout(5e3) });
    const props = await properties.json();
    if (!properties.ok || props.model_path?.toLowerCase() !== config.model.toLowerCase() || exited) throw new Error("qwen_wrong_server");
    const texts = [];
    let totalLength = 0;
    for (const [index, chunk] of chunks.entries()) {
      if (cancelled() || exited) throw new Error("cancelled");
      progress(index + 1, chunks.length);
      const form = new FormData();
      form.set("model", "qwen3-asr");
      form.set("response_format", "json");
      form.set("file", new Blob([Uint8Array.from(chunk)], { type: "audio/wav" }), "audio.wav");
      const result = await fetch(`${base}/v1/audio/transcriptions`, { method: "POST", headers, body: form, signal: AbortSignal.timeout(24e4) });
      if (!result.ok || cancelled() || exited) throw new Error("qwen_transcription_failed");
      const data = await result.json();
      if (typeof data.text !== "string") throw new Error("qwen_invalid_result");
      const text = data.text.replace(/^language [^<\r\n]+<asr_text>/, "").trim();
      totalLength += text.length + 1;
      if (totalLength > 1e6) throw new Error("qwen_invalid_result");
      if (text) texts.push(text);
    }
    if (!texts.length) throw new Error("qwen_empty_result");
    return texts.join(" ");
  } finally {
    if (!exited) child.kill();
    await closed;
    track(null);
  }
}

// modules/whisper-local/moss-asr.ts
import { spawn as spawn2 } from "node:child_process";
import { readFileSync as readFileSync2, statSync as statSync2 } from "node:fs";
var WORKER = String.raw`
import array, hashlib, importlib.abc, importlib.util, json, os, pathlib, stat, sys, tarfile, wave
sys.stdout.reconfigure(encoding='utf-8')
print(json.dumps({'pid':os.getpid()}), flush=True)
if sys.stdin.readline().strip() != 'start': sys.exit(2)
root=pathlib.Path(sys.argv[1]).resolve(); audio=pathlib.Path(sys.argv[2]).resolve(); lengths=json.loads(sys.argv[3])
if not isinstance(lengths,list) or not 1<=len(lengths)<=16 or any(type(n)!=int or n<1 or n>480000 for n in lengths): raise ValueError('chunk plan')
model=root/'MOSS-Transcribe-Diarize-Q5_K_M.gguf'
if model.stat().st_size != 700314304: raise ValueError('model size')
h=hashlib.sha256()
with model.open('rb') as f:
    while chunk:=f.read(1024*1024): h.update(chunk)
if h.hexdigest()!='1f492eaf6ab449dfa44726b072bef0268f2c0b71055576ef53c2f91bd9d47df2': raise ValueError('model hash')
bindings=root/'transcribe-python'/'transcribe_cpp'
expected={'__init__.py':'09c342336a2060d2ab2294d56e84dcc7d2295145','_abi.py':'2bb9bfb478feb862dd5be4e3203fdededcf7e955','_generated.py':'844dfa8a416cf46a7a9fe49f2ddc450164946e8e','_library.py':'b0e7597e8fdfd29b80682437adc2b39ff2b89e43','errors.py':'b82fea02dda72b59f067eb4a19722ff673653e6e'}
verified={}
for name, expected_hash in expected.items():
    data=(bindings/name).read_bytes()
    if hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=expected_hash: raise ValueError('binding hash')
    verified[name]=data
archive=root/'transcribe-native-v0.4.1.tar.gz.partial'
h=hashlib.sha256()
with archive.open('rb') as f:
    while chunk:=f.read(1024*1024): h.update(chunk)
if h.hexdigest()!='272eb97795048ccb557c85bb9dd44c9e530e1c928443114c39816a8a5f76269d': raise ValueError('archive hash')
native=root/'native-0.4.1'
def reparse(path):
    return bool(getattr(os.lstat(path),'st_file_attributes',0) & 0x400) or pathlib.Path(path).is_symlink()
if reparse(native): raise ValueError('native link')
expected_native=set()
with tarfile.open(archive,'r:gz') as tar:
    items=tar.getmembers()
    for item in items:
        path=pathlib.PurePosixPath(item.name)
        if not item.isfile() or len(path.parts)<2 or path.parts[0]!='transcribe-native-windows-x86_64-cpu-vulkan' or '..' in path.parts: raise ValueError('archive entry')
        rel=pathlib.Path(*path.parts[1:]).as_posix()
        if rel in expected_native: raise ValueError('duplicate native file')
        expected_native.add(rel)
    actual_native=set()
    for parent,dirs,files in os.walk(native,followlinks=False):
        for name in dirs+files:
            target=pathlib.Path(parent)/name
            if reparse(target): raise ValueError('native link')
        for name in files:
            target=pathlib.Path(parent)/name
            if not stat.S_ISREG(os.lstat(target).st_mode): raise ValueError('native file type')
            actual_native.add(target.relative_to(native).as_posix())
    if actual_native!=expected_native: raise ValueError('unexpected native files')
    for item in items:
        path=pathlib.PurePosixPath(item.name); target=native.joinpath(*path.parts[1:]); src=tar.extractfile(item)
        if src is None or hashlib.sha256(src.read()).digest()!=hashlib.sha256(target.read_bytes()).digest(): raise ValueError('native hash')
with wave.open(str(audio),'rb') as f:
    if f.getframerate()!=16000 or f.getnchannels()!=1 or f.getsampwidth()!=2 or f.getcomptype()!='NONE': raise ValueError('audio format')
    frames=f.getnframes()
    if frames<1 or frames>4800000 or sum(lengths)!=frames: raise ValueError('audio length')
    samples=array.array('h'); samples.frombytes(f.readframes(frames))
    if len(samples)!=frames: raise ValueError('truncated audio')
if sys.byteorder!='little': samples.byteswap()
class VerifiedLoader(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == 'transcribe_cpp': name='__init__.py'; package=True
        elif fullname.startswith('transcribe_cpp.'):
            name=fullname.removeprefix('transcribe_cpp.')+'.py'; package=False
            if name not in verified: raise ModuleNotFoundError('unverified binding module')
        else: return None
        return importlib.util.spec_from_loader(fullname,self,is_package=package)
    def create_module(self, spec): return None
    def exec_module(self, module):
        name='__init__.py' if module.__name__=='transcribe_cpp' else module.__name__.removeprefix('transcribe_cpp.')+'.py'
        module.__file__=str(bindings/name)
        exec(compile(verified[name],module.__file__,'exec'),module.__dict__)
sys.meta_path.insert(0,VerifiedLoader()); os.environ['TRANSCRIBE_LIBRARY']=str(native/'transcribe.dll')
with os.add_dll_directory(str(native)):
    import transcribe_cpp
    if transcribe_cpp.__version__!='0.4.1' or transcribe_cpp.native_version()!='0.4.1': raise ValueError('ABI')
    segments=[]; empty_parts=[]; offset=0
    with transcribe_cpp.Model(model,backend='cpu') as engine:
        for index,length in enumerate(lengths):
            print(json.dumps({'part':index+1,'total':len(lengths)}),flush=True)
            pcm=array.array('f',(x/32768.0 for x in samples[offset:offset+length]))
            with engine.session(n_threads=4,n_ctx=4096) as session:
                result=session.run(pcm,diarize='on',timestamps='segment')
            chunk_ms=(length+8)//16; base_ms=(offset+8)//16
            if not result.segments: empty_parts.append(index+1)
            for segment in result.segments:
                if not (0<=segment.t0_ms<=segment.t1_ms<=chunk_ms): raise ValueError('segment bounds')
                segments.append({'part':index+1,'start_ms':base_ms+segment.t0_ms,'end_ms':base_ms+segment.t1_ms,'speaker':segment.speaker_id,'text':segment.text})
            offset+=length
print(json.dumps({'duration_ms':(frames+8)//16,'segments':segments,'empty_parts':empty_parts},ensure_ascii=False,allow_nan=False),flush=True)
`;
function validateMossResult(value, lengths) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !lengths.length || lengths.length > 16 || lengths.some((n) => !Number.isSafeInteger(n) || n < 1 || n > 48e4)) throw new Error("moss_invalid_result");
  const data = value, frames = lengths.reduce((a, b) => a + b, 0), durationMs = Math.round(frames / 16);
  if (!Number.isSafeInteger(data.duration_ms) || data.duration_ms !== durationMs || !Array.isArray(data.segments) || data.segments.length > 3e3 || !Array.isArray(data.empty_parts) || data.empty_parts.some((x) => !Number.isSafeInteger(x) || x < 1 || x > lengths.length) || new Set(data.empty_parts).size !== data.empty_parts.length) throw new Error("moss_invalid_result");
  const starts = [];
  let offset = 0;
  for (const length of lengths) {
    starts.push(Math.round(offset / 16));
    offset += length;
  }
  let last = -1, lastPart = 0, total = 0;
  const segments = data.segments.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("moss_invalid_result");
    const s = item, part = s.part, start = s.start_ms, end = s.end_ms, speaker = s.speaker, text = s.text;
    if (!Number.isSafeInteger(part) || part < 1 || part > lengths.length || part < lastPart) throw new Error("moss_invalid_result");
    const index = part - 1, partStart = starts[index], partEnd = partStart + Math.round(lengths[index] / 16);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < partStart || start < last || end < start || end > partEnd || end > durationMs || !Number.isSafeInteger(speaker) || speaker < 0 || speaker > 999 || typeof text !== "string" || !text.trim() || text.length > 2e3 || /[\x00-\x1f\x7f]/.test(text)) throw new Error("moss_invalid_result");
    last = start;
    lastPart = part;
    total += text.length;
    if (total > 1e5) throw new Error("moss_invalid_result");
    return { part, start_ms: start, end_ms: end, speaker, text: text.trim() };
  });
  const represented = new Set(segments.map((s) => s.part)), empty = data.empty_parts;
  if (empty.some((n) => represented.has(n)) || represented.size + empty.length !== lengths.length) throw new Error("moss_invalid_result");
  if (!segments.length) throw new Error("moss_no_segments");
  return { segments, empty_parts: [...empty].sort((a, b) => a - b), part_count: lengths.length };
}
function planMossAudio(wav) {
  const chunks = splitQwenAudio(wav), lengths = chunks.map((chunk) => (chunk.length - 44) / 2);
  if (lengths.reduce((a, b) => a + b, 0) > 300 * 16e3) throw new Error("moss_audio_too_long");
  return lengths;
}
async function transcribeMoss(path, config, track, cancelled, progress = () => {
}) {
  if (statSync2(path).size > 300 * 16e3 * 2 + 1024 * 1024) throw new Error("moss_audio_too_long");
  const lengths = planMossAudio(readFileSync2(path));
  if (cancelled()) throw new Error("cancelled");
  const env = {};
  for (const key of ["SYSTEMROOT", "WINDIR", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
  env.PATH = process.platform === "win32" ? `${process.env.SYSTEMROOT || process.env.WINDIR || "C:\\Windows"}\\System32` : process.env.PATH || "";
  env.PYTHONIOENCODING = "utf-8";
  env.PYTHONDONTWRITEBYTECODE = "1";
  env.HF_HUB_OFFLINE = "1";
  env.TRANSFORMERS_OFFLINE = "1";
  const child = spawn2(config.python, ["-I", "-S", "-u", "-c", WORKER, config.lab, path, JSON.stringify(lengths)], { windowsHide: true, shell: false, stdio: ["pipe", "pipe", "ignore"], env });
  track(child);
  let output = "", ready = false, bad = false, reported = 0, final = null;
  const closed = new Promise((resolve) => {
    child.on("error", () => {
      bad = true;
      if (!child.pid) resolve({ code: null });
    });
    child.once("close", (code) => resolve({ code }));
  });
  const timeout = setTimeout(() => {
    bad = true;
    child.stdin?.end("stop\n");
    child.kill();
  }, 18e5);
  child.stdin?.on("error", () => {
    bad = true;
  });
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    output += chunk;
    if (output.length > 1e6) {
      bad = true;
      child.stdin?.end("stop\n");
      child.kill();
      return;
    }
    while (output.includes("\n") && !bad) {
      const line = output.slice(0, output.indexOf("\n"));
      output = output.slice(output.indexOf("\n") + 1);
      try {
        const message = JSON.parse(line);
        if (!ready) {
          if (message.pid !== child.pid || cancelled()) throw new Error("worker mismatch");
          ready = true;
          child.stdin?.end("start\n");
        } else if (message.part !== void 0) {
          if (final !== null || message.part !== reported + 1 || message.total !== lengths.length) throw new Error("invalid progress");
          reported++;
          progress(reported, lengths.length);
        } else {
          if (final !== null || reported !== lengths.length || message.duration_ms === void 0 || message.segments === void 0 || message.empty_parts === void 0) throw new Error("invalid result");
          final = message;
        }
      } catch {
        bad = true;
        if (child.stdin && !child.stdin.destroyed && !child.stdin.writableEnded) child.stdin.end("stop\n");
        child.kill();
      }
    }
  });
  try {
    const { code } = await closed;
    if (bad || cancelled() || !ready || code !== 0 || output.trim() || final === null) throw new Error("moss_failed");
    return validateMossResult(final, lengths);
  } finally {
    clearTimeout(timeout);
    track(null);
  }
}

// modules/whisper-local/moss-transcript.ts
function formatMossTranscript(segments, total) {
  const time = (ms) => `${String(Math.floor(ms / 6e4)).padStart(2, "0")}:${String(Math.floor(ms / 1e3) % 60).padStart(2, "0")}.${String(ms % 1e3).padStart(3, "0")}`;
  const ranges = [];
  let text = "";
  for (let part = 1; part <= total; part++) {
    if (part > 1) text += "\n\n";
    if (total > 1) text += `[\u0410\u0443\u0434\u0438\u043E\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 ${part}/${total}; \u043D\u043E\u043C\u0435\u0440\u0430 \u0433\u043E\u0432\u043E\u0440\u044F\u0449\u0438\u0445 \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B]
`;
    const lines = segments.filter((s) => (s.part ?? 1) === part);
    if (!lines.length) {
      text += "\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u044B \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u043E\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430.";
      continue;
    }
    for (const [i, s] of lines.entries()) {
      if (i) text += "\n";
      const start = text.length;
      text += `[${time(s.start_ms)}\u2013${time(s.end_ms)}] ${total > 1 ? `\u0410\u0443\u0434\u0438\u043E\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 ${part}/${total}, \u0433\u043E\u0432\u043E\u0440\u044F\u0449\u0438\u0439 ${s.speaker}` : `\u0413\u043E\u0432\u043E\u0440\u044F\u0449\u0438\u0439 ${s.speaker}`}: ${s.text}`;
      ranges.push({ start, end: text.length, part, total, speaker: s.speaker });
    }
  }
  return { text, ranges };
}
function checkedMossRanges(text, segments, total) {
  if (!Number.isSafeInteger(total) || total < 1 || total > 16 || !Array.isArray(segments) || !segments.length || segments.length > 3e3 || text.length > 5e5) return null;
  let lastPart = 0, totalText = 0;
  for (const s of segments) {
    if (!s || typeof s !== "object") return null;
    const part = s.part ?? (total === 1 ? 1 : void 0);
    if (!Number.isSafeInteger(part) || part < 1 || part > total || part < lastPart || !Number.isSafeInteger(s.start_ms) || !Number.isSafeInteger(s.end_ms) || s.start_ms < 0 || s.end_ms < s.start_ms || s.end_ms > 3e5 || !Number.isSafeInteger(s.speaker) || s.speaker < 0 || s.speaker > 999 || typeof s.text !== "string" || !s.text.trim() || s.text.length > 2e3 || /[\x00-\x1f\x7f]/.test(s.text)) return null;
    totalText += s.text.length;
    if (totalText > 1e5) return null;
    lastPart = part;
  }
  const result = formatMossTranscript(segments, total);
  return result.text === text ? result.ranges : null;
}

// modules/whisper-local/index.ts
var MAX_FILE = 64 * 1024 * 1024;
var MAX_CHUNK = 384 * 1024;
function fail(status, message) {
  return { status, body: { ok: false, error: { message } } };
}
function input(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
var module = {
  id: "whisper-local",
  apiVersion: 1,
  register(ctx) {
    const jobs = /* @__PURE__ */ new Map();
    const running = /* @__PURE__ */ new Map();
    const work = /* @__PURE__ */ new Set();
    let stopping = false;
    const root = join(ctx.paths.data, "jobs");
    const api = new ScopedRouter(["/api/tools/whisper-local"]);
    ctx.publish({ getTranscript(id) {
      const job = jobs.get(id);
      return job?.state === "done" && typeof job.text === "string" ? { id: job.id, name: job.name ?? null, text: job.text, ...job.engine === "moss" ? { moss_ranges: checkedMossRanges(job.text, job.segments, job.moss_parts?.total ?? 1) } : {} } : null;
    } });
    const folder = (id) => join(root, id);
    const save = (job) => writeFileSync(join(folder(job.id), "job.json"), JSON.stringify(job), "utf8");
    if (existsSync(root)) for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/.test(entry.name)) continue;
      try {
        const job = JSON.parse(readFileSync3(join(folder(entry.name), "job.json"), "utf8"));
        if (job.id !== entry.name || !["uploading", "processing", "done", "failed", "cancelled"].includes(job.state)) continue;
        if (job.state === "uploading") {
          const file = join(folder(job.id), "input.wav");
          const actualSize = existsSync(file) ? statSync3(file).size : 0;
          if (actualSize > MAX_FILE) {
            job.state = "failed";
            job.message = "\u0420\u0430\u0437\u043C\u0435\u0440 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430 \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043F\u0440\u0435\u0434\u0435\u043B";
          } else job.size = actualSize;
          save(job);
        }
        if (job.state === "processing") {
          job.state = "failed";
          job.message = "\u0420\u0430\u0431\u043E\u0442\u0430 \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u0430 \u043F\u0440\u0438 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0435 \u043C\u043E\u0434\u0443\u043B\u044F";
          save(job);
        }
        jobs.set(job.id, job);
      } catch {
      }
    }
    const run = (id, exe, args) => new Promise((resolve, reject) => {
      const child = spawn3(exe, args, { windowsHide: true, stdio: "ignore", shell: false });
      running.set(id, child);
      const timer = setTimeout(() => child.kill(), 10 * 6e4);
      child.once("error", (error) => {
        clearTimeout(timer);
        running.delete(id);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        running.delete(id);
        code === 0 ? resolve() : reject(new Error("process_failed"));
      });
    });
    const stopChild = (child) => {
      if (child.stdin && !child.stdin.destroyed && !child.stdin.writableEnded) child.stdin.end("stop\n");
      child.kill();
    };
    ctx.onShutdown(async () => {
      stopping = true;
      for (const child of running.values()) stopChild(child);
      await Promise.allSettled([...work]);
    });
    api.add("GET", "/api/tools/whisper-local/jobs", () => ({ body: { ok: true, jobs: [...jobs.values()].map(({ text: _text, segments: _segments, ...job }) => job) } }));
    api.add("GET", "/api/tools/whisper-local/status", () => {
      const cli = process.env.TEAM_WHISPER_CLI?.trim() || "", model = process.env.TEAM_WHISPER_MODEL?.trim() || "";
      const isFile = (path) => {
        try {
          return !!path && statSync3(path).isFile();
        } catch {
          return false;
        }
      };
      const qwen_configured = ["TEAM_QWEN_ASR_SERVER", "TEAM_QWEN_ASR_MODEL", "TEAM_QWEN_ASR_PROJECTOR"].every((key) => {
        const path = process.env[key]?.trim() || "";
        return isAbsolute(path) && isFile(path);
      });
      const mossPython = process.env.TEAM_MOSS_PYTHON?.trim() || "", mossLab = process.env.TEAM_MOSS_LAB?.trim() || "";
      const moss_configured = isAbsolute(mossPython) && isFile(mossPython) && isAbsolute(mossLab) && isFile(join(mossLab, "MOSS-Transcribe-Diarize-Q5_K_M.gguf"));
      return { body: { ok: true, cli_configured: isFile(cli), model_configured: isFile(model), qwen_configured, moss_configured, ffmpeg_checked: false } };
    });
    api.add("POST", "/api/tools/whisper-local/jobs", (c) => {
      const data = input(c.body);
      if (data.name !== void 0 && (typeof data.name !== "string" || data.name.length > 200 || /[\x00-\x1f\x7f]/.test(data.name))) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F \u0444\u0430\u0439\u043B\u0430");
      const name = typeof data.name === "string" ? data.name.trim() : "";
      const id = randomUUID();
      mkdirSync(folder(id), { recursive: true });
      const job = { id, state: "uploading", size: 0, message: "", ...name ? { name } : {} };
      jobs.set(id, job);
      save(job);
      return { status: 201, body: { ok: true, job } };
    });
    api.add("POST", "/api/tools/whisper-local/jobs/:id/chunks", (c) => {
      const job = jobs.get(c.params.id ?? ""), data = input(c.body);
      if (!job) return fail(404, "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
      if (job.state !== "uploading") return fail(409, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
      if (data.offset !== job.size || typeof data.data !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.data) || data.data.length > MAX_CHUNK * 4 / 3 + 4) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0438\u043B\u0438 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435");
      const bytes = Buffer.from(data.data, "base64");
      if (!bytes.length || bytes.length > MAX_CHUNK || job.size + bytes.length > MAX_FILE) return fail(400, "\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 \u0438\u043B\u0438 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430 \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043F\u0440\u0435\u0434\u0435\u043B");
      appendFileSync(join(folder(job.id), "input.wav"), bytes);
      job.size += bytes.length;
      save(job);
      return { body: { ok: true, size: job.size } };
    });
    api.add("GET", "/api/tools/whisper-local/jobs/:id", (c) => {
      const job = jobs.get(c.params.id ?? "");
      return job ? { body: { ok: true, job } } : fail(404, "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
    });
    api.add("GET", "/api/tools/whisper-local/jobs/:id/subtitles", (c) => {
      const job = jobs.get(c.params.id ?? "");
      if (!job) return fail(404, "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
      if (job.state !== "done") return fail(409, "\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u0435\u0449\u0451 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u0430");
      if (job.engine === "moss" || job.engine === "qwen") return fail(404, "\u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0434\u0432\u0438\u0436\u043A\u0430 SRT \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u0451\u0442\u0441\u044F");
      try {
        const file = join(folder(job.id), "transcript.srt");
        const info = lstatSync(file);
        if (!info.isFile() || info.size > 1e6) throw new Error("invalid_subtitles");
        const srt = readFileSync3(file, "utf8");
        if (!srt.trim()) throw new Error("empty_subtitles");
        return { body: { ok: true, format: "srt", srt } };
      } catch {
        return fail(404, "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0438\u043B\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B; \u0434\u043B\u044F \u0441\u0442\u0430\u0440\u044B\u0445 \u0437\u0430\u0434\u0430\u043D\u0438\u0439 \u043D\u0443\u0436\u043D\u0430 \u043D\u043E\u0432\u0430\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430");
      }
    });
    api.add("POST", "/api/tools/whisper-local/jobs/:id/start", (c) => {
      const job = jobs.get(c.params.id ?? "");
      if (!job) return fail(404, "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
      if (job.state !== "uploading") return fail(409, "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0443\u0436\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E");
      const engine = input(c.body).engine ?? "whisper";
      if (engine !== "whisper" && engine !== "qwen" && engine !== "moss") return fail(400, "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0434\u0432\u0438\u0436\u043E\u043A \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F");
      const cli = process.env.TEAM_WHISPER_CLI?.trim() || "", model = process.env.TEAM_WHISPER_MODEL?.trim() || "", ffmpeg = process.env.TEAM_FFMPEG_PATH?.trim() || "ffmpeg";
      const qwen = { server: process.env.TEAM_QWEN_ASR_SERVER?.trim() || "", model: process.env.TEAM_QWEN_ASR_MODEL?.trim() || "", projector: process.env.TEAM_QWEN_ASR_PROJECTOR?.trim() || "" };
      const moss = { python: process.env.TEAM_MOSS_PYTHON?.trim() || "", lab: process.env.TEAM_MOSS_LAB?.trim() || "" };
      const isFile = (path) => {
        try {
          return !!path && statSync3(path).isFile();
        } catch {
          return false;
        }
      };
      if (engine === "whisper" && (!isFile(cli) || !isFile(model))) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 TEAM_WHISPER_CLI \u0438 TEAM_WHISPER_MODEL");
      if (engine === "qwen" && !Object.values(qwen).every((path) => isAbsolute(path) && isFile(path))) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0435 \u043F\u0443\u0442\u0438 \u043A \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C TEAM_QWEN_ASR_SERVER, TEAM_QWEN_ASR_MODEL \u0438 TEAM_QWEN_ASR_PROJECTOR");
      if (engine === "moss" && (!isAbsolute(moss.python) || !isFile(moss.python) || !isAbsolute(moss.lab) || !isFile(join(moss.lab, "MOSS-Transcribe-Diarize-Q5_K_M.gguf")))) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 TEAM_MOSS_PYTHON \u0438 TEAM_MOSS_LAB \u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u043C\u0438 \u0444\u0430\u0439\u043B\u0430\u043C\u0438");
      const source = join(folder(job.id), "input.wav");
      if (!existsSync(source) || job.size < 12) return fail(400, "\u041D\u0443\u0436\u0435\u043D \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B \u0438\u043B\u0438 MP4");
      const header = Buffer.alloc(12), fd = openSync(source, "r");
      try {
        readSync(fd, header, 0, 12, 0);
      } finally {
        closeSync(fd);
      }
      let format = "";
      if (header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WAVE") format = "wav";
      else if (header.toString("ascii", 0, 4) === "fLaC") format = "flac";
      else if (header.toString("ascii", 0, 4) === "OggS") format = "ogg";
      else if (header.toString("ascii", 0, 3) === "ID3" || header[0] === 255 && ((header[1] ?? 0) & 224) === 224) format = "mp3";
      else if (header.toString("ascii", 4, 8) === "ftyp") format = "mov";
      if (!format) return fail(400, "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F WAV, MP3, OGG, FLAC \u0438 MP4");
      if (work.size || running.size || [...jobs.values()].some((item) => item.state === "processing")) return fail(409, "\u0414\u0440\u0443\u0433\u0430\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0438\u043B\u0438 \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442\u0441\u044F");
      job.engine = engine;
      job.state = "processing";
      job.message = "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0430\u0443\u0434\u0438\u043E";
      save(job);
      const execution = (async () => {
        try {
          const normalized = join(folder(job.id), "normalized.wav"), output = join(folder(job.id), "transcript");
          const movOptions = format === "mov" ? ["-enable_drefs", "0", "-use_absolute_path", "0"] : [];
          const durationLimit = engine === "qwen" ? ["-t", "1201"] : engine === "moss" ? ["-t", "301"] : [];
          await run(job.id, ffmpeg, ["-nostdin", "-v", "error", "-protocol_whitelist", "file,pipe", "-f", format, ...movOptions, "-i", source, ...durationLimit, "-map", "0:a:0", "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "-y", normalized]);
          if (job.state !== "processing" || stopping) return;
          if (engine === "qwen") {
            job.message = "\u0417\u0430\u043F\u0443\u0441\u043A Qwen";
            save(job);
            job.text = await transcribeQwen(normalized, qwen, (child) => {
              if (child) running.set(job.id, child);
              else running.delete(job.id);
            }, () => stopping || job.state !== "processing", (current, total) => {
              if (!stopping && job.state === "processing") {
                job.message = `Qwen: \u0447\u0430\u0441\u0442\u044C ${current} \u0438\u0437 ${total}`;
                save(job);
              }
            });
          } else if (engine === "moss") {
            job.message = "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 MOSS";
            save(job);
            const result = await transcribeMoss(normalized, moss, (child) => {
              if (child) running.set(job.id, child);
              else running.delete(job.id);
            }, () => stopping || job.state !== "processing", (part, total) => {
              if (!stopping && job.state === "processing") {
                job.message = `MOSS: \u0430\u0443\u0434\u0438\u043E\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 ${part} \u0438\u0437 ${total}`;
                save(job);
              }
            });
            if (job.state !== "processing" || stopping) return;
            job.segments = result.segments;
            job.moss_parts = { total: result.part_count, empty: result.empty_parts };
            job.text = formatMossTranscript(result.segments, result.part_count).text;
          } else {
            job.message = "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 Whisper";
            save(job);
            await run(job.id, cli, ["-m", model, "-f", normalized, "-l", "auto", "-t", "4", "-ng", "-otxt", "-osrt", "-of", output, "-np"]);
            if (job.state !== "processing") return;
            const fileName = `${output}.txt`;
            if (!existsSync(fileName) || statSync3(fileName).size > 1e6) throw new Error("output_failed");
            job.text = readFileSync3(fileName, "utf8").trim();
          }
          if (job.state !== "processing") return;
          if (!job.text) throw new Error("empty_result");
          if (engine === "moss") {
            const completed = { ...job, state: "done", message: "" }, target = join(folder(job.id), "job.json"), tmp = join(folder(job.id), `job-${randomUUID()}.tmp`);
            writeFileSync(tmp, JSON.stringify(completed), { encoding: "utf8", flag: "wx" });
            renameSync(tmp, target);
            Object.assign(job, completed);
          } else {
            job.state = "done";
            job.message = "";
            save(job);
          }
        } catch (error) {
          if (job.state === "processing") {
            if (engine === "moss") {
              delete job.text;
              delete job.segments;
              delete job.moss_parts;
            }
            job.state = "failed";
            job.message = error instanceof Error && error.message === "qwen_audio_too_long" ? "\u0414\u043B\u044F Qwen \u043D\u0443\u0436\u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 20 \u043C\u0438\u043D\u0443\u0442" : error instanceof Error && error.message === "moss_audio_too_long" ? "\u0414\u043B\u044F MOSS \u043D\u0443\u0436\u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 5 \u043C\u0438\u043D\u0443\u0442" : error instanceof Error && error.message === "moss_no_segments" ? "MOSS \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u044B \u043D\u0438 \u0432 \u043E\u0434\u043D\u043E\u043C \u0430\u0443\u0434\u0438\u043E\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0435" : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0430\u0443\u0434\u0438\u043E \u0438\u043B\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435";
            save(job);
          }
        }
      })();
      work.add(execution);
      void execution.then(() => work.delete(execution), () => work.delete(execution));
      return { status: 202, body: { ok: true, job } };
    });
    api.add("POST", "/api/tools/whisper-local/jobs/:id/cancel", (c) => {
      const job = jobs.get(c.params.id ?? "");
      if (!job) return fail(404, "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
      if (job.state !== "processing") return fail(409, "\u041D\u0435\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0449\u0435\u0439\u0441\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438");
      job.state = "cancelled";
      job.message = "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E";
      save(job);
      const child = running.get(job.id);
      if (child) stopChild(child);
      return { body: { ok: true, job } };
    });
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
