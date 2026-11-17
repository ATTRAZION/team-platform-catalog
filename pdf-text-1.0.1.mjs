import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/pdf-text/index.ts
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { isAbsolute } from "node:path";
import { statSync } from "node:fs";

// modules/pdf-text/page.ts
var PAGE = String.raw`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Текст из PDF</title></head><body><main><h1>Текст из PDF</h1><p>Извлекается встроенный текст; изображения и сканы не распознаются. Выберите до 20 страниц PDF размером до 16 МБ.</p><p id="setup" role="status"></p><label>PDF <input id="file" type="file" accept="application/pdf"></label> <label>С <input id="page" type="number" min="1" max="10000" value="1"></label> <label>По <input id="page-end" type="number" min="1" max="10000" placeholder="та же"></label> <button id="run">Извлечь текст</button> <button id="stop" disabled>Остановить</button><p id="status" role="status"></p><p><label>Проверьте текст<br><textarea id="text" rows="14" cols="70"></textarea></label></p><p>Для задачи оставьте в поле не более 10 500 символов; длинный текст можно обрабатывать по страницам.</p><label>Поручение<br><textarea id="instruction" rows="3" cols="60" maxlength="1000">Подготовь краткое содержание текста.</textarea></label><p><button id="task">Создать задачу</button></p><p id="task-status" role="status"></p></main><script>
fetch('/api/tools/pdf-text/status').then(r=>r.json()).then(d=>document.getElementById('setup').textContent=d.configured?'Путь к Python задан; наличие pypdf проверяется при обработке.':'Укажите путь к Python с pypdf и перезапустите платформу.').catch(()=>document.getElementById('setup').textContent='Не удалось проверить настройки.');
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(r.status===404&&url==='/api/tools/ocr-tasks/task')throw Error('Установите модули задач и создания задачи из текста.');const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Ошибка');return d}
let stopping=false;document.getElementById('stop').onclick=()=>{stopping=true;document.getElementById('status').textContent='Остановка после текущей страницы…'};
document.getElementById('run').onclick=async()=>{const button=document.getElementById('run'),input=document.getElementById('file'),f=input.files[0],start=Number(document.getElementById('page').value),endValue=document.getElementById('page-end').value,end=endValue?Number(endValue):start,status=document.getElementById('status'),text=document.getElementById('text'),stop=document.getElementById('stop'),task=document.getElementById('task');
 if(!f||f.size<5||f.size>16000000||!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>10000||end-start+1>20){status.textContent='Выберите PDF до 16 МБ и диапазон до 20 страниц.';return}
 button.disabled=true;input.disabled=true;text.disabled=true;task.disabled=true;stop.disabled=false;stopping=false;text.value='';status.textContent='Загрузка PDF…';let id='',completed=0,total=end-start+1;
 try{let d=await post('/api/tools/pdf-text/uploads',{size:f.size});id=d.id;if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Некорректная загрузка');
  for(let offset=0;offset<f.size;){if(stopping)throw Error('Остановлено пользователем');const bytes=new Uint8Array(await f.slice(offset,offset+384000).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));d=await post('/api/tools/pdf-text/uploads/'+id+'/chunks',{offset,data:btoa(s)});if(d.offset!==offset+bytes.length)throw Error('Некорректное смещение');offset=d.offset;status.textContent='Загружено '+offset+' из '+f.size+' байт…'}
  for(let page=start;page<=end;page++){if(stopping)throw Error('Остановлено пользователем');status.textContent='Страница '+page+' ('+(completed+1)+' из '+total+')…';d=await post('/api/tools/pdf-text/uploads/'+id+'/extract',{page,keep:true});if(typeof d.text!=='string')throw Error('Некорректный ответ');text.value+=(text.value?'\n\n':'')+'--- Страница '+page+' ---\n'+(d.text||'(встроенный текст отсутствует)');completed++}
  status.textContent='Готово: страниц '+completed+'. Проверьте текст и порядок.';
 }catch(e){status.textContent='Обработано '+completed+' из '+total+'. '+e.message}finally{if(id)try{await post('/api/tools/pdf-text/uploads/'+id+'/cancel',{})}catch{}button.disabled=false;input.disabled=false;text.disabled=false;task.disabled=false;stop.disabled=true}
};
document.getElementById('task').onclick=async()=>{const b=document.getElementById('task'),out=document.getElementById('task-status');b.disabled=true;try{const d=await post('/api/tools/ocr-tasks/task',{source:'pdf-text',text:document.getElementById('text').value,instruction:document.getElementById('instruction').value});out.textContent='Создана задача '+d.task.id+'.'}catch(e){out.textContent=e.message+' Если ответ о создании не получен, проверьте доску задач перед повтором.'}finally{b.disabled=false}};
</script></body></html>`;

// modules/pdf-text/worker.ts
var WORKER = String.raw`
import io, json, sys
from pypdf import PdfReader
try:
    raw = sys.stdin.buffer.read()
    reader = PdfReader(io.BytesIO(raw), strict=False)
    if reader.is_encrypted:
        raise ValueError('encrypted')
    page = int(sys.argv[1])
    if page < 1 or page > len(reader.pages):
        raise ValueError('page')
    text = reader.pages[page - 1].extract_text() or ''
    if len(text) > 100000 or len(text.encode('utf-8')) > 400000:
        sys.exit(3)
    sys.stdout.buffer.write(json.dumps({'text': text}, ensure_ascii=False).encode('utf-8'))
except Exception:
    sys.exit(2)
`;

// modules/pdf-text/index.ts
var MAX_PDF = 16e6;
var MAX_CHUNK = 384e3;
var MAX_OUTPUT = 5e5;
var BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
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
function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function pageNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= 1e4;
}
var module = {
  id: "pdf-text",
  apiVersion: 1,
  register(ctx) {
    let active = null;
    let upload = null;
    const release = () => {
      if (upload) clearTimeout(upload.timer);
      upload = null;
    };
    const renew = () => {
      if (!upload) return;
      clearTimeout(upload.timer);
      upload.timer = setTimeout(release, 12e4);
      upload.timer.unref();
    };
    ctx.onShutdown(async () => {
      release();
      const child = active;
      if (child) await new Promise((resolve) => {
        child.once("close", () => resolve());
        child.kill();
      });
    });
    ctx.api.add("GET", "/api/tools/pdf-text/status", () => ({ body: { ok: true, configured: file(process.env.TEAM_PDFTEXT_PYTHON?.trim() || "") } }));
    ctx.api.add("POST", "/api/tools/pdf-text/uploads", (c) => {
      const size = object(c.body).size;
      if (!Number.isInteger(size) || size < 5 || size > MAX_PDF) return fail(400, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u0430\u0437\u043C\u0435\u0440 PDF \u0434\u043E 16 \u041C\u0411");
      if (upload || active) return fail(409, "\u0414\u0440\u0443\u0433\u0430\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      const id = randomUUID(), timer = setTimeout(release, 12e4);
      timer.unref();
      upload = { id, buffer: Buffer.alloc(size), offset: 0, timer };
      return { status: 201, body: { ok: true, id, offset: 0 } };
    });
    ctx.api.add("POST", "/api/tools/pdf-text/uploads/:id/chunks", (c) => {
      if (!upload || upload.id !== c.params.id) return fail(404, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430");
      const data = object(c.body);
      if (data.offset !== upload.offset || typeof data.data !== "string" || data.data.length > Math.ceil(MAX_CHUNK / 3) * 4 || !BASE64.test(data.data)) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0438\u043B\u0438 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435");
      const chunk = Buffer.from(data.data, "base64");
      if (!chunk.length || chunk.length > MAX_CHUNK || upload.offset + chunk.length > upload.buffer.length) return fail(400, "\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430 \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C");
      chunk.copy(upload.buffer, upload.offset);
      upload.offset += chunk.length;
      renew();
      return { body: { ok: true, offset: upload.offset } };
    });
    ctx.api.add("POST", "/api/tools/pdf-text/uploads/:id/cancel", (c) => {
      if (!upload || upload.id !== c.params.id) return fail(404, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430");
      release();
      return { body: { ok: true } };
    });
    ctx.api.add("POST", "/api/tools/pdf-text/uploads/:id/extract", async (c) => {
      if (!upload || upload.id !== c.params.id) return fail(404, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430");
      const data = object(c.body);
      if (!pageNumber(data.page)) return fail(400, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043E\u0442 1 \u0434\u043E 10000");
      if (data.keep !== void 0 && typeof data.keep !== "boolean") return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u0440\u0438\u0437\u043D\u0430\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F");
      if (upload.offset !== upload.buffer.length) return fail(409, "PDF \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D \u043D\u0435 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E");
      if (active) return fail(409, "\u0414\u0440\u0443\u0433\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0435\u0449\u0451 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F");
      const python = process.env.TEAM_PDFTEXT_PYTHON?.trim() || "";
      if (!file(python)) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u043A Python \u0441 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u043C pypdf");
      const pdf = upload.buffer, id = upload.id, keep = data.keep === true, page = data.page;
      if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") return fail(400, "\u041D\u0443\u0436\u0435\u043D \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 PDF");
      const digest = createHash("sha256").update(pdf).digest("hex");
      if (keep) renew();
      else release();
      const env = { PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", PYTHONNOUSERSITE: "1" };
      for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
      try {
        const result = await new Promise((resolve, reject) => {
          const child = spawn(python, ["-c", WORKER, String(page)], { windowsHide: true, shell: false, env, stdio: ["pipe", "pipe", "pipe"] });
          active = child;
          const chunks = [];
          let bytes = 0, stopped = false, tooLarge = false;
          const stop = () => {
            stopped = true;
            child.kill();
          };
          const timer = setTimeout(stop, 2e4);
          c.res?.once("close", stop);
          child.stdout.on("data", (chunk) => {
            bytes += chunk.length;
            if (bytes > MAX_OUTPUT) {
              tooLarge = true;
              stop();
            } else chunks.push(chunk);
          });
          child.stderr.resume();
          child.stdin.on("error", () => {
          });
          child.once("error", reject);
          child.once("close", (code) => {
            clearTimeout(timer);
            c.res?.off("close", stop);
            if (active === child) active = null;
            if (tooLarge || code === 3) reject(new Error("too_large"));
            else if (code !== 0 || stopped) reject(new Error("extract_failed"));
            else resolve(Buffer.concat(chunks));
          });
          child.stdin.end(pdf);
        });
        const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(result));
        if (typeof parsed.text !== "string" || parsed.text.length > 1e5) throw new Error("extract_failed");
        return { headers: { "cache-control": "no-store" }, body: { ok: true, page, text: parsed.text, source_sha256: digest } };
      } catch (error) {
        return error.message === "too_large" ? fail(413, "\u0422\u0435\u043A\u0441\u0442 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0440\u0430\u0437\u043C\u0435\u0440") : fail(422, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 PDF, \u043D\u043E\u043C\u0435\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0438 pypdf");
      } finally {
        if (keep && upload?.id === id) renew();
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
