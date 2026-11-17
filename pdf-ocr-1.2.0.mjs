import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/pdf-ocr/index.ts
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { statSync } from "node:fs";

// modules/pdf-ocr/page.ts
var PAGE = String.raw`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Распознавание PDF</title></head><body><main><h1>Распознавание страниц PDF</h1><p>Выберите PDF до 16 МБ и до 20 последовательных страниц. Документ обрабатывается локально; проверьте полученный текст.</p><p id="setup" role="status"></p><label>PDF <input id="file" type="file" accept="application/pdf"></label> <label>С <input id="page" type="number" min="1" max="10000" value="1"></label> <label>По <input id="page-end" type="number" min="1" max="10000" placeholder="та же"></label> <button id="run">Распознать</button> <button id="stop" disabled>Остановить</button><p id="status" role="status"></p><img id="preview" alt="Последняя обработанная страница PDF" style="max-width:100%;height:auto" hidden><p><label>Текст<br><textarea id="text" rows="12" cols="70"></textarea></label></p><h2>Создать задачу</h2><p>Проверьте и исправьте текст. Для задачи допускается до 10 500 символов; более длинный текст разделите.</p><label>Поручение<br><textarea id="instruction" rows="3" cols="60" maxlength="1000">Подготовь краткое содержание текста.</textarea></label><p><button id="task">Создать задачу</button></p><p id="task-status" role="status"></p><h2>Длинный текст</h2><p>Подготовьте и проверьте части, затем создавайте задачи по одной. Размер учитывает только текст; проверьте лимит выбранного агента.</p><label>Символов в части <input id="part-size" type="number" min="2" max="10000" value="9000"></label> <button id="parts-prepare">Подготовить части</button><p id="parts-status" role="status"></p><div id="parts"></div></main><script>
fetch('/api/tools/pdf-ocr/status').then(r=>r.json()).then(d=>document.getElementById('setup').textContent=d.configured?'Путь к обработчику PDF задан.':'Укажите путь к pdftoppm и перезапустите платформу.').catch(()=>document.getElementById('setup').textContent='Не удалось проверить настройки.');
let stopping=false;
document.getElementById('stop').onclick=()=>{stopping=true;document.getElementById('status').textContent='Остановка после текущей операции…'};
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(r.status===404&&url==='/api/tools/ocr-local/recognize')throw Error('Установите и включите модуль локального OCR.');const d=await r.json();if(!r.ok)throw Error(d.error.message);return d}
const source=document.getElementById('text'),instruction=document.getElementById('instruction'),prepare=document.getElementById('parts-prepare'),parts=document.getElementById('parts'),partsStatus=document.getElementById('parts-status');
let rows=[],stale=false,busy=false;
function refreshParts(){for(const row of rows)row.button.disabled=busy||stale||row.state!=='ready'}
function invalidateParts(){if(rows.length){stale=true;partsStatus.textContent='Текст изменён; подготовьте части заново. Созданные задачи остаются на доске.';refreshParts()}}
source.addEventListener('input',invalidateParts);
prepare.onclick=()=>{
 const value=source.value,limit=Number(document.getElementById('part-size').value);
 if(!value.trim()||!Number.isInteger(limit)||limit<2||limit>10000){partsStatus.textContent='Введите текст и размер от 2 до 10 000 символов.';return}
 const chunks=[];for(let pos=0;pos<value.length;){let end=Math.min(pos+limit,value.length);if(end<value.length&&value.charCodeAt(end-1)>=0xD800&&value.charCodeAt(end-1)<=0xDBFF&&value.charCodeAt(end)>=0xDC00&&value.charCodeAt(end)<=0xDFFF)end--;chunks.push(value.slice(pos,end));pos=end;if(chunks.length>100){partsStatus.textContent='Получается больше 100 частей. Увеличьте размер или сократите текст.';return}}
 parts.replaceChildren();rows=[];stale=false;partsStatus.textContent='Проверьте части и создайте нужные задачи по одной.';
 chunks.forEach((chunk,i)=>{
  const section=document.createElement('section'),details=document.createElement('details'),summary=document.createElement('summary'),preview=document.createElement('pre'),button=document.createElement('button'),status=document.createElement('p');
  summary.textContent='Часть '+(i+1)+' из '+chunks.length+' — '+chunk.length+' символов';preview.className='part-preview';preview.style.whiteSpace='pre-wrap';preview.textContent=chunk;details.append(summary,preview);button.type='button';button.className='part-create';button.textContent='Создать задачу';status.className='part-status';status.setAttribute('role','status');section.append(details,button,status);parts.append(section);
  const row={button,status,state:'ready'};rows.push(row);
  button.onclick=async()=>{if(busy||stale||row.state!=='ready')return;busy=true;refreshParts();source.disabled=true;instruction.disabled=true;prepare.disabled=true;document.getElementById('run').disabled=true;document.getElementById('task').disabled=true;status.textContent='Создание задачи…';
   try{const d=await post('/api/tools/ocr-tasks/task',{text:'Часть '+(i+1)+' из '+chunks.length+'\n'+chunk,instruction:instruction.value});if(typeof d.task?.id!=='string'||!d.task.id)throw Error('Некорректный ответ');row.state='done';status.textContent='Создана задача '+d.task.id+'.'}catch{row.state='unknown';status.textContent='Результат не подтверждён. Проверьте доску задач перед повторной отправкой.'}finally{busy=false;source.disabled=false;instruction.disabled=false;prepare.disabled=false;document.getElementById('run').disabled=false;document.getElementById('task').disabled=false;refreshParts()}
  };
 });
};
document.getElementById('run').onclick=async()=>{
 const b=document.getElementById('run'),input=document.getElementById('file'),f=input.files[0],start=Number(document.getElementById('page').value),endValue=document.getElementById('page-end').value,end=endValue?Number(endValue):start,status=document.getElementById('status'),text=document.getElementById('text'),preview=document.getElementById('preview'),stop=document.getElementById('stop'),task=document.getElementById('task');
 if(!f||f.size<5||f.size>16000000||!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>10000||end-start+1>20){status.textContent='Выберите PDF до 16 МБ и диапазон до 20 страниц.';return}
 invalidateParts();prepare.disabled=true;b.disabled=true;input.disabled=true;text.disabled=true;task.disabled=true;stop.disabled=false;stopping=false;text.value='';preview.hidden=true;preview.removeAttribute('src');status.textContent='Загрузка PDF…';let id='',completed=0,total=end-start+1;
 try{
  let d=await post('/api/tools/pdf-ocr/uploads',{size:f.size});id=d.id;if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Некорректная загрузка');
  for(let offset=0;offset<f.size;){if(stopping)throw Error('Остановлено пользователем');const bytes=new Uint8Array(await f.slice(offset,offset+384000).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));d=await post('/api/tools/pdf-ocr/uploads/'+id+'/chunks',{offset,data:btoa(s)});if(d.offset!==offset+bytes.length)throw Error('Некорректное смещение загрузки');offset=d.offset;status.textContent='Загружено '+offset+' из '+f.size+' байт…'}
  for(let page=start;page<=end;page++){
   if(stopping)throw Error('Остановлено пользователем');status.textContent='Обработка страницы '+page+' ('+(completed+1)+' из '+total+')…';d=await post('/api/tools/pdf-ocr/uploads/'+id+'/render',{page,keep:true});
   if(stopping)throw Error('Остановлено пользователем');preview.src='data:image/jpeg;base64,'+d.image;preview.hidden=false;status.textContent='Распознавание страницы '+page+'…';d=await post('/api/tools/ocr-local/recognize',{image:d.image});
   if(typeof d.text!=='string')throw Error('Некорректный ответ OCR');text.value+=(text.value?'\n\n':'')+'--- Страница '+page+' ---\n'+(d.text||'(текст не найден)');completed++;
  }
  status.textContent='Готово: страниц '+completed+'. Проверьте текст.';
 }catch(e){status.textContent='Обработано '+completed+' из '+total+'. '+e.message}finally{if(id)try{await post('/api/tools/pdf-ocr/uploads/'+id+'/cancel',{})}catch{}b.disabled=false;input.disabled=false;text.disabled=false;task.disabled=false;prepare.disabled=false;stop.disabled=true}
};
document.getElementById('task').onclick=async()=>{const b=document.getElementById('task'),out=document.getElementById('task-status');b.disabled=true;try{const r=await fetch('/api/tools/ocr-tasks/task',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:document.getElementById('text').value,instruction:document.getElementById('instruction').value})});if(r.status===404)throw Error('Установите и включите модули задач и создания задачи из OCR.');const d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent='Создана задача '+d.task.id+'.'}catch(e){out.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/pdf-ocr/index.ts
var MAX_PDF = 16e6;
var MAX_INLINE = 6e5;
var MAX_CHUNK = 384e3;
var MAX_IMAGE = 6e5;
var BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
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
function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function pageNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= 1e4;
}
var module = {
  id: "pdf-ocr",
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
    ctx.api.add("GET", "/api/tools/pdf-ocr/status", () => ({ body: { ok: true, configured: file(process.env.TEAM_PDFTOPPM_PATH?.trim() || "") } }));
    const render = async (pdf, page, res) => {
      if (pdf.length > MAX_PDF || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") return fail(400, "\u041D\u0443\u0436\u0435\u043D \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 PDF");
      const exe = process.env.TEAM_PDFTOPPM_PATH?.trim() || "";
      if (!file(exe)) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u043A \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C\u0443 pdftoppm");
      if (active) return fail(409, "\u0414\u0440\u0443\u0433\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0435\u0449\u0451 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F");
      const env = {};
      for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
      try {
        const output = await new Promise((resolve, reject) => {
          const number = String(page), child = spawn(exe, ["-f", number, "-l", number, "-singlefile", "-scale-to", "1800", "-jpeg", "-jpegopt", "quality=75", "-"], { windowsHide: true, shell: false, env, stdio: ["pipe", "pipe", "pipe"] });
          active = child;
          const chunks = [];
          let bytes = 0, stopped = false, tooLarge = false;
          const stop = () => {
            stopped = true;
            child.kill();
          };
          const timer = setTimeout(stop, 2e4);
          res?.once("close", stop);
          child.stdout.on("data", (chunk) => {
            bytes += chunk.length;
            if (bytes > MAX_IMAGE) {
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
            res?.off("close", stop);
            if (active === child) active = null;
            if (tooLarge) return reject(new Error("image_too_large"));
            if (code !== 0 || stopped) return reject(new Error("render_failed"));
            const result = Buffer.concat(chunks);
            if (result.length < 3 || !result.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return reject(new Error("invalid_image"));
            resolve(result);
          });
          child.stdin.end(pdf);
        });
        return { body: { ok: true, page, image: output.toString("base64"), bytes: output.length } };
      } catch (error) {
        return error.message === "image_too_large" ? fail(413, "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0431\u043E\u043B\u044C\u0448\u0435 600 \u041A\u0411; \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 PDF \u043C\u0435\u043D\u044C\u0448\u0435\u0433\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u0430") : fail(422, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C PDF \u0438\u043B\u0438 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u0443\u044E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443");
      }
    };
    ctx.api.add("POST", "/api/tools/pdf-ocr/render", async (c) => {
      const obj = object(c.body);
      if (typeof obj.pdf !== "string" || obj.pdf.length > Math.ceil(MAX_INLINE / 3) * 4 || !BASE64.test(obj.pdf)) return fail(400, "\u0414\u043B\u044F \u043F\u0440\u044F\u043C\u043E\u0439 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u043D\u0443\u0436\u0435\u043D PDF \u0434\u043E 600 \u041A\u0411");
      if (!pageNumber(obj.page)) return fail(400, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043E\u0442 1 \u0434\u043E 10000");
      const pdf = Buffer.from(obj.pdf, "base64");
      if (pdf.length > MAX_INLINE) return fail(400, "\u0414\u043B\u044F \u043F\u0440\u044F\u043C\u043E\u0439 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u043D\u0443\u0436\u0435\u043D PDF \u0434\u043E 600 \u041A\u0411");
      if (upload) return fail(409, "\u0414\u0440\u0443\u0433\u0430\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      return render(pdf, obj.page, c.res);
    });
    ctx.api.add("POST", "/api/tools/pdf-ocr/uploads", (c) => {
      const size = object(c.body).size;
      if (!Number.isInteger(size) || size < 5 || size > MAX_PDF) return fail(400, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u0430\u0437\u043C\u0435\u0440 PDF \u0434\u043E 16 \u041C\u0411");
      if (upload || active) return fail(409, "\u0414\u0440\u0443\u0433\u0430\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0435\u0449\u0451 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      const id = randomUUID(), timer = setTimeout(release, 12e4);
      timer.unref();
      upload = { id, buffer: Buffer.alloc(size), offset: 0, timer };
      return { status: 201, body: { ok: true, id, offset: 0 } };
    });
    ctx.api.add("POST", "/api/tools/pdf-ocr/uploads/:id/chunks", (c) => {
      if (!upload || upload.id !== c.params.id) return fail(404, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430");
      const obj = object(c.body);
      if (obj.offset !== upload.offset || typeof obj.data !== "string" || obj.data.length > Math.ceil(MAX_CHUNK / 3) * 4 || !BASE64.test(obj.data)) return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0438\u043B\u0438 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435");
      const chunk = Buffer.from(obj.data, "base64");
      if (!chunk.length || chunk.length > MAX_CHUNK || upload.offset + chunk.length > upload.buffer.length) return fail(400, "\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430 \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C");
      chunk.copy(upload.buffer, upload.offset);
      upload.offset += chunk.length;
      renew();
      return { body: { ok: true, offset: upload.offset } };
    });
    ctx.api.add("POST", "/api/tools/pdf-ocr/uploads/:id/cancel", (c) => {
      if (!upload || upload.id !== c.params.id) return fail(404, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430");
      release();
      return { body: { ok: true } };
    });
    ctx.api.add("POST", "/api/tools/pdf-ocr/uploads/:id/render", async (c) => {
      if (!upload || upload.id !== c.params.id) return fail(404, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u0430");
      const obj = object(c.body);
      if (!pageNumber(obj.page)) return fail(400, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043E\u0442 1 \u0434\u043E 10000");
      if (obj.keep !== void 0 && typeof obj.keep !== "boolean") return fail(400, "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u0440\u0438\u0437\u043D\u0430\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438");
      if (upload.offset !== upload.buffer.length) return fail(409, "PDF \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D \u043D\u0435 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E");
      if (active) return fail(409, "\u0414\u0440\u0443\u0433\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0435\u0449\u0451 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F");
      if (!file(process.env.TEAM_PDFTOPPM_PATH?.trim() || "")) return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u043A \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C\u0443 pdftoppm");
      const pdf = upload.buffer, id = upload.id, keep = obj.keep === true;
      if (keep) renew();
      else release();
      const result = await render(pdf, obj.page, c.res);
      if (keep && upload?.id === id) renew();
      return result;
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
