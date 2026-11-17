import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/ocr-local/index.ts
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";

// modules/ocr-local/worker.ts
var WORKER = String.raw`
import base64, io, json, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = 12000000
from rapidocr.utils.download_file import DownloadFile
def deny_download(*args, **kwargs):
    raise RuntimeError('Automatic model download disabled')
DownloadFile.run = deny_download
from rapidocr import RapidOCR
import numpy as np
raw = json.load(sys.stdin)
data = base64.b64decode(raw['image'], validate=True)
with Image.open(io.BytesIO(data)) as img:
    if img.format not in ('PNG', 'JPEG') or img.width * img.height > 12000000:
        raise ValueError('Unsupported image')
    image = np.array(img.convert('RGB'))
engine = RapidOCR(params={'Det.model_path': sys.argv[1], 'Rec.model_path': sys.argv[2]})
result = engine(image, use_cls=False)
lines = list(result.txts or ())
print(json.dumps({'lines': lines[:1000]}, ensure_ascii=False))
`;

// modules/ocr-local/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0442\u0435\u043A\u0441\u0442\u0430</title></head><body><main><h1>\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0442\u0435\u043A\u0441\u0442\u0430</h1><p>PNG \u0438\u043B\u0438 JPEG \u0434\u043E 600 \u041A\u0411 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442: \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u043C\u043E\u0436\u0435\u0442 \u043E\u0448\u0438\u0431\u0430\u0442\u044C\u0441\u044F.</p><p id="setup" role="status"></p><button id="verify">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u0438</button><p id="verification" role="status"></p><input id="file" type="file" accept="image/png,image/jpeg"><button id="run">\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C</button><p id="status" role="status"></p><textarea id="result" rows="16" cols="80" aria-label="\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442"></textarea><section><h2>\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443</h2><p>\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438 \u0438\u0441\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0432\u044B\u0448\u0435: \u043E\u043D \u0431\u0443\u0434\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u0432 \u0437\u0430\u0434\u0430\u0447\u0435.</p><label>\u041F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435<br><textarea id="instruction" rows="3" cols="60" maxlength="1000">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C \u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0442\u0435\u043A\u0441\u0442\u0430.</textarea></label><p><button id="task">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443</button></p><p id="task-status" role="status"></p></section></main><script>
const status=document.getElementById('status');fetch('/api/tools/ocr-local/status').then(r=>r.json()).then(d=>document.getElementById('setup').textContent=d.configured?'\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u0443\u0442\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B.':'\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A Python \u0438 \u043C\u043E\u0434\u0435\u043B\u044F\u043C, \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443.');document.getElementById('run').onclick=async()=>{const b=document.getElementById('run'),f=document.getElementById('file').files[0];if(!f||f.size>600000){status.textContent='\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 PNG \u0438\u043B\u0438 JPEG \u0434\u043E 600 \u041A\u0411';return}b.disabled=true;status.textContent='\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435\u2026';try{const bytes=new Uint8Array(await f.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));const r=await fetch('/api/tools/ocr-local/recognize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:btoa(s)})});const d=await r.json();if(!r.ok)throw Error(d.error.message);document.getElementById('result').value=d.text;status.textContent=d.text?'\u0413\u043E\u0442\u043E\u0432\u043E':'\u0422\u0435\u043A\u0441\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.'}catch(e){status.textContent=e.message}finally{b.disabled=false}};
document.getElementById('task').onclick=async()=>{const b=document.getElementById('task'),out=document.getElementById('task-status');b.disabled=true;try{const r=await fetch('/api/tools/ocr-tasks/task',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:document.getElementById('result').value,instruction:document.getElementById('instruction').value})});if(r.status===404)throw Error('\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u0438 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \xAB\u0417\u0430\u0434\u0430\u0447\u0438 \u0438\u0437 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u043E\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430\xBB \u0438 \xAB\u0414\u043E\u0441\u043A\u0430 \u0437\u0430\u0434\u0430\u0447\xBB.');const d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent='\u0417\u0430\u0434\u0430\u0447\u0430 '+d.task.id+' \u0441\u043E\u0437\u0434\u0430\u043D\u0430. \u041D\u0430\u0437\u043D\u0430\u0447\u044C\u0442\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F \u043D\u0430 \u0434\u043E\u0441\u043A\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432.'}catch(e){out.textContent=e.message}finally{b.disabled=false}};
document.getElementById('verify').onclick=async()=>{const b=document.getElementById('verify'),out=document.getElementById('verification'),label=s=>s==='match'?'\u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u044D\u0442\u0430\u043B\u043E\u043D\u043E\u043C':s==='different'?'\u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \u044D\u0442\u0430\u043B\u043E\u043D\u0430':'\u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430';b.disabled=true;out.textContent='\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430\u2026';try{const r=await fetch('/api/tools/ocr-local/verify-models',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent='\u0414\u0435\u0442\u0435\u043A\u0442\u043E\u0440: '+label(d.detector.status)+'; \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435: '+label(d.recognizer.status)+'. \u042D\u0442\u0430\u043B\u043E\u043D: '+d.reference+'.'}catch(e){out.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/ocr-local/index.ts
var MAX_BYTES = 6e5;
var KNOWN_DETECTOR = "090f04abcd9d9a7498bc4ebf677e4cb9bdce1fe4197ddb7e529f1ef44e1ff94f";
var KNOWN_RECOGNIZER = "90f761b4bfcce0c8c561c0cb5c887b0971d3ec01c32164bdf7374a35b0982711";
async function checkHash(path, expected) {
  if (!isFile(path)) return { status: "unavailable", sha256: null };
  try {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    const sha256 = hash.digest("hex");
    return { status: sha256 === expected ? "match" : "different", sha256 };
  } catch {
    return { status: "unavailable", sha256: null };
  }
}
function fail(status, message) {
  return { status, body: { ok: false, error: { message } } };
}
function isFile(path) {
  try {
    return !!path && statSync(path).isFile();
  } catch {
    return false;
  }
}
var module = {
  id: "ocr-local",
  apiVersion: 1,
  register(ctx) {
    let active = null;
    ctx.onShutdown(async () => {
      const child = active;
      if (!child) return;
      await new Promise((resolve) => {
        child.once("close", () => resolve());
        child.kill();
      });
    });
    ctx.api.add("GET", "/api/tools/ocr-local/status", () => ({ body: { ok: true, configured: [process.env.TEAM_OCR_PYTHON, process.env.TEAM_OCR_DET_MODEL, process.env.TEAM_OCR_REC_MODEL].every((p) => isFile(p?.trim() || "")) } }));
    let verifying = false;
    ctx.api.add("POST", "/api/tools/ocr-local/verify-models", async () => {
      if (verifying) return fail(409, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      verifying = true;
      try {
        const [detector, recognizer] = await Promise.all([
          checkHash(process.env.TEAM_OCR_DET_MODEL?.trim() || "", KNOWN_DETECTOR),
          checkHash(process.env.TEAM_OCR_REC_MODEL?.trim() || "", KNOWN_RECOGNIZER)
        ]);
        return { body: { ok: true, reference: "RapidOCR 3.10.0: PP-OCRv6 detector small + PP-OCRv5 Cyrillic recognizer mobile", detector, recognizer } };
      } finally {
        verifying = false;
      }
    });
    ctx.api.add("POST", "/api/tools/ocr-local/recognize", async (c) => {
      const obj = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      if (typeof obj.image !== "string" || obj.image.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(obj.image)) return fail(400, "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 PNG \u0438\u043B\u0438 JPEG \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C \u0434\u043E 600 \u041A\u0411");
      const bytes = Buffer.from(obj.image, "base64");
      const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!bytes.length || bytes.length > MAX_BYTES || !png && !jpeg) return fail(400, "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E PNG \u0438 JPEG \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C \u0434\u043E 600 \u041A\u0411");
      const python = process.env.TEAM_OCR_PYTHON?.trim() || "", detector = process.env.TEAM_OCR_DET_MODEL?.trim() || "", recognizer = process.env.TEAM_OCR_REC_MODEL?.trim() || "";
      if (![python, detector, recognizer].every(isFile)) return fail(503, "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A Python \u0438 \u0434\u0432\u0443\u043C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u043C \u043C\u043E\u0434\u0435\u043B\u044F\u043C OCR");
      if (active) return fail(409, "\u0414\u0440\u0443\u0433\u043E\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      const env = { PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", OMP_NUM_THREADS: "4" };
      for (const name of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[name]) env[name] = process.env[name];
      try {
        const result = await new Promise((resolve, reject) => {
          const child = spawn(python, ["-c", WORKER, detector, recognizer], { windowsHide: true, shell: false, env, stdio: ["pipe", "pipe", "pipe"] });
          active = child;
          let out = "", stopped = false;
          const stop = () => {
            stopped = true;
            child.kill();
          };
          const timer = setTimeout(stop, 6e4);
          c.res?.once("close", stop);
          child.stdout.setEncoding("utf8");
          child.stdout.on("data", (chunk) => {
            out += chunk;
            if (out.length > 2e5) stop();
          });
          child.stderr.resume();
          child.stdin.on("error", () => {
          });
          child.once("error", reject);
          child.once("close", (code) => {
            clearTimeout(timer);
            c.res?.off("close", stop);
            if (active === child) active = null;
            if (code !== 0 || stopped) {
              reject(new Error("worker failed"));
              return;
            }
            try {
              const data = JSON.parse(out);
              if (!Array.isArray(data.lines) || !data.lines.every((line) => typeof line === "string")) throw new Error();
              resolve(data.lines);
            } catch {
              reject(new Error("invalid output"));
            }
          });
          child.stdin.end(JSON.stringify({ image: obj.image }));
        });
        return { body: { ok: true, lines: result, text: result.join("\n") } };
      } catch {
        return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0432\u0438\u0436\u043E\u043A, \u043C\u043E\u0434\u0435\u043B\u0438 \u0438 \u0444\u043E\u0440\u043C\u0430\u0442");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
