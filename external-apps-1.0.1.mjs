import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/external-apps/index.ts
import { spawn as spawn2 } from "node:child_process";
import { existsSync as existsSync2, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// modules/external-apps/page.ts
var PAGE = String.raw`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Внешние приложения пользователя</title><style>
body{font-family:system-ui,sans-serif;margin:0;color:#15202b;background:#f6f8fa}
main{max-width:980px;margin:0 auto;padding:16px}
.card{background:#fff;border:1px solid #d7dee6;border-radius:8px;padding:12px;margin:10px 0}
.state{font-weight:600;padding:2px 8px;border-radius:10px;font-size:12px}
.state-working{background:#d8f3dc;color:#1b5e20}
.state-starting{background:#fff3cd;color:#7a5b00}
.state-idle,.state-stopped{background:#e8edf2;color:#374a5e}
.state-missing{background:#fde2e1;color:#8a1f1c}
.meta{color:#51606f;font-size:13px;margin:4px 0}
.why{color:#8a1f1c;font-size:13px}
button{padding:6px 10px;margin-right:6px;border:1px solid #9fb0c0;border-radius:6px;background:#fff;cursor:pointer}
pre{background:#0f1720;color:#cfe3f5;padding:8px;border-radius:6px;overflow:auto;font-size:12px}
.note{color:#374a5e}
</style></head><body><main>
<h1>Внешние приложения пользователя</h1>
<p>Здесь приложения, которые вы зарегистрировали сами. Это <strong>не рантаймы</strong>: платформа не устанавливает и не подменяет интерпретаторы (D-052). Она запускает зарегистрированное приложение по явному пути из реестра профиля, с вашего явного согласия на конкретный исполняемый файл (D-059), окно не показывает (<code>windowsHide</code>), вывод пишет в журнал профиля.</p>
<p id="apps-registry-note" class="meta"></p>
<p><button id="apps-refresh" type="button">Обновить</button><button id="apps-history-toggle" type="button" aria-expanded="false">История запусков</button></p>
<p id="apps-status" role="status"></p>
<div id="apps-list"></div>
<section id="apps-history" hidden><h2>История запусков</h2><pre id="apps-history-body"></pre></section>
<script>
var API='/api/tools/external-apps';
var pendingConsent={};
function el(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function failureText(error){
  var line=(error&&error.message)?error.message:'запрос не удался';
  if(error&&error.code){line+=' (код '+error.code+')';}
  if(error&&error.instruction){line+=' Что делать: '+error.instruction+(error.where?(' Где: '+error.where):'')}
  return line;
}
function networkText(error){
  var message=(error&&error.message)?error.message:String(error);
  return 'Сеть: '+message+' — ответ ядра не получен, instruction реестра отказов к нему не приложена';
}
function stateClass(state){return 'state state-'+state}
function render(data){
  var note=el('apps-registry-note');
  if(data.registry.broken){
    note.textContent='Реестр повреждён и потому пуст: '+data.registry.broken+'. Файл: '+data.registry.path+'. Исправьте JSON — список оживёт без перезапуска.';
  }else if(!data.apps.length){
    note.textContent='Реестр пуст. Добавьте файл '+data.registry.path+' со списком записей {"id","name","target","args":[],"cwd","note"} — разрешённые диски: '+data.drives.join(', ')+'. Пустой реестр — не ошибка: платформа просто нечего не запускает.';
  }else{
    var extra=data.registry.problems.length?(' Отдельные строки отброшены: '+data.registry.problems.join('; ')):'';
    note.textContent='Файл реестра: '+data.registry.path+'. Разрешённые диски: '+data.drives.join(',')+extra;
  }
  el('apps-list').innerHTML=data.apps.map(function(app){
    var consent=app.consent&&app.consent.granted;
    var buttons='<button type="button" data-action="start" data-app="'+esc(app.id)+'">Запустить</button>';
    if(app.state==='running'||app.state==='starting'){buttons+='<button type="button" data-action="stop" data-app="'+esc(app.id)+'">Остановить</button>';}
    if(pendingConsent[app.id]){buttons+='<button type="button" data-action="allow" data-app="'+esc(app.id)+'">Разрешить запуск</button>';}
    buttons+='<button type="button" data-action="folder" data-app="'+esc(app.id)+'">Открыть папку</button>';
    var why='';
    if(app.why){why='<p class="why">'+esc(app.why)+(app.refusal_code?(' · код '+esc(app.refusal_code)):'')+'</p>';}
    if(!consent&&app.state!=='missing'&&app.state!=='running'&&app.state!=='starting'){why+='<p class="meta">Согласие на этот исполняемый файл ещё не выдано: первый запуск спросит.</p>';}
    return '<div class="card" data-app-card="'+esc(app.id)+'"><h3>'+esc(app.name)+' <span class="'+stateClass(app.state)+'">'+esc(app.state_label)+'</span></h3>'
      +'<p class="meta">Цель: '+esc(app.target)+(app.args.length?(' · аргументы: '+esc(app.args.join(' '))):'')+'<br>Папка: '+esc(app.cwd||'')+'</p>'
      +'<p class="meta">Запусков: '+esc(app.launches)+' · последний код возврата: '+esc(app.last_exit_code===null?'нет данных':app.last_exit_code)+(app.pid?(' · pid '+esc(app.pid)):'')+'</p>'
      +(app.note?('<p class="note">'+esc(app.note)+'</p>'):'')
      +why
      +'<p>'+buttons+'</p></div>';
  }).join('');
}
function refresh(){
  fetch(API+'/apps').then(function(r){return r.json()}).then(function(d){
    if(d&&d.ok){render(d);}else{el('apps-status').textContent='Список не получен: '+(d&&d.error?failureText(d.error):'неожиданный ответ');}
  }).catch(networkText);
}
function act(action,id,confirm){
  if(confirm){pendingConsent[id]=true;}
  el('apps-status').textContent=action==='start'?(confirm?'Запускаю с согласием…':'Запускаю…'):'Останавливаю…';
  fetch(API+'/apps/'+encodeURIComponent(id)+'/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(confirm?{confirm:true}:{})})
    .then(function(r){return r.json().then(function(d){return {s:r.status,d:d}})})
    .then(function(x){
      if(!x.d||x.d.ok!==true){
        var message=(x.d&&x.d.error)?failureText(x.d.error):('HTTP '+x.s);
        if(x.d&&x.d.error&&x.d.error.code==='consent_required'){pendingConsent[id]=true;}
        el('apps-status').textContent='Отказ: '+message;
        refresh();
        return;
      }
      delete pendingConsent[id];
      el('apps-status').textContent=action==='stop'?('Остановлено: '+x.d.action):'Запущено, pid '+x.d.pid;
      refresh();
    })
    .catch(networkText);
}
function loadHistory(){
  fetch(API+'/history').then(function(r){return r.json()}).then(function(d){
    if(d&&d.ok){el('apps-history-body').textContent=d.events.map(function(e){return e.at+' · '+e.app+' · '+e.action+' · '+e.detail}).join('\n')||'событий нет';}
  }).catch(function(){el('apps-history-body').textContent='история недоступна';});
}document.getElementById('apps-refresh').onclick=function(){refresh();};
document.getElementById('apps-history-toggle').onclick=function(){
  var panel=el('apps-history');
  panel.hidden=!panel.hidden;
  this.setAttribute('aria-expanded',panel.hidden?'false':'true');
  if(!panel.hidden){loadHistory();}
};
document.addEventListener('click',function(event){
  var btn=event.target&&event.target.closest?event.target.closest('[data-action]'):null;
  if(!btn){return;}
  var action=btn.dataset.action;
  var id=btn.dataset.app;
  if(!id){return;}
  if(action==='start'){act('start',id,false);}
  else if(action==='allow'){act('start',id,true);}
  else if(action==='stop'){act('stop',id,false);}
  else if(action==='folder'){act('folder',id,false);}
});
refresh();
setInterval(refresh,4000);
</script></body></html>`;

// modules/external-apps/registry.ts
import { existsSync, statSync } from "node:fs";
var ID_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;
var DRIVE_RE = /^([A-Za-z]):[\\/]/;
var VARIABLE_MARKS = [
  [/%[^%]+%/, "%%-\u0440\u0430\u0441\u043A\u0440\u044B\u0442\u0438\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 Windows"],
  [/\$\{?[\w(]/, "\u043F\u043E\u0434\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 shell/powershell"],
  [/`/, "backtick-\u043F\u043E\u0434\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430"]
];
function parseRegistry(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      apps: [],
      broken: `\u0444\u0430\u0439\u043B \u043D\u0435 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A JSON: ${error instanceof Error ? error.message : String(error)}`,
      problems: []
    };
  }
  const rows = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray(parsed.apps) ? parsed.apps : null;
  if (rows === null) {
    return {
      apps: [],
      broken: '\u043E\u0436\u0438\u0434\u0430\u043B\u0438\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0439: \u043C\u0430\u0441\u0441\u0438\u0432 \u043B\u0438\u0431\u043E \u043E\u0431\u044A\u0435\u043A\u0442 {"apps": [\u2026]}',
      problems: []
    };
  }
  const apps = [];
  const problems = [];
  const seen = /* @__PURE__ */ new Set();
  rows.forEach((row, index) => {
    const where = `\u0441\u0442\u0440\u043E\u043A\u0430 ${index + 1}`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      problems.push(`${where}: \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u043E\u0431\u044A\u0435\u043A\u0442`);
      return;
    }
    const value = row;
    const id = typeof value.id === "string" ? value.id.trim() : "";
    if (!ID_RE.test(id)) {
      problems.push(`${where}: id \xAB${id}\xBB \u043D\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 (\u0441\u0442\u0440\u043E\u0447\u043D\u044B\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B, \u0434\u0435\u0444\u0438\u0441, 2..63 \u0437\u043D\u0430\u043A\u0430)`);
      return;
    }
    if (seen.has(id)) {
      problems.push(`${where}: id \xAB${id}\xBB \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F`);
      return;
    }
    const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : id;
    const target = typeof value.target === "string" ? value.target.trim().replace(/^"|"$/g, "") : "";
    if (!target) {
      problems.push(`${where}: \u0443 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \xAB${id}\xBB \u043F\u0443\u0441\u0442\u043E\u0439 target`);
      return;
    }
    if (!Array.isArray(value.args) || value.args.some((arg) => typeof arg !== "string")) {
      problems.push(`${where}: \u0443 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \xAB${id}\xBB args \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u0441\u0442\u0440\u043E\u043A`);
      return;
    }
    const cwd = typeof value.cwd === "string" ? value.cwd.trim().replace(/^"|"$/g, "") : "";
    if (cwd && !DRIVE_RE.test(cwd)) {
      problems.push(`${where}: \u0443 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \xAB${id}\xBB cwd \u043E\u0431\u044F\u0437\u0430\u043D \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C \u043F\u0443\u0442\u0451\u043C \u0441 \u0434\u0438\u0441\u043A\u043E\u043C`);
      return;
    }
    const note = typeof value.note === "string" ? value.note.trim() : "";
    seen.add(id);
    apps.push({ id, name, target, args: value.args, cwd, note });
  });
  return { apps, broken: null, problems };
}
function allowedDrives(env = process.env) {
  const raw = (env.TEAM_EXTERNAL_APP_DRIVES ?? "").trim();
  const source = raw ? raw.split(",") : ["C:", "D:"];
  return source.map((drive) => drive.trim().toUpperCase().replace(/\\/g, "")).filter((drive) => /^[A-Z]:$/.test(drive));
}
function checkAppPaths(app, options = { drives: allowedDrives() }) {
  const exists = options.exists ?? ((path) => existsSync(path));
  const isDirectory = options.isDirectory ?? ((path) => {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  });
  const target = checkPath(app.target, options.drives, "target");
  if (!target.ok) return target;
  if (!exists(app.target)) return { ok: false, code: "app_target_missing", detail: `\u0446\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${app.target}` };
  if (!isDirectoryOk(app.target, exists, isDirectory)) {
    return { ok: false, code: "app_target_missing", detail: `\u0446\u0435\u043B\u044C \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0444\u0430\u0439\u043B\u043E\u043C: ${app.target}` };
  }
  const cwd = app.cwd || app.target.slice(0, Math.max(app.target.lastIndexOf("\\"), app.target.lastIndexOf("/")) + 1);
  const cwdCheck = checkPath(cwd, options.drives, "cwd");
  if (!cwdCheck.ok) return cwdCheck;
  if (!isDirectory(cwd)) return { ok: false, code: "app_target_missing", detail: `\u0440\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${cwd}` };
  return { ok: true, target: app.target, cwd };
}
function isDirectoryOk(path, exists, isDirectory) {
  return exists(path) && !isDirectory(path);
}
function checkPath(path, drives, field) {
  if (!path) return { ok: false, code: "app_path_not_allowed", detail: `${field} \u043F\u0443\u0441\u0442` };
  if (/[<>|]/.test(path)) {
    return { ok: false, code: "app_path_not_allowed", detail: `${field} \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D\u043D\u044B\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B` };
  }
  if (/(^|[\\/])\.\.([\\/]|$)/.test(path)) {
    return { ok: false, code: "app_path_not_allowed", detail: `${field} \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043E\u0431\u0445\u043E\u0434 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430 \xAB..\xBB` };
  }
  for (const [mark, why] of VARIABLE_MARKS) {
    if (mark.test(path)) {
      return { ok: false, code: "app_path_not_allowed", detail: `${field} \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 ${why}: \u043E\u0431\u0445\u043E\u0434 \u0447\u0435\u0440\u0435\u0437 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D` };
    }
  }
  const drive = path.match(DRIVE_RE)?.[1]?.toUpperCase();
  if (!drive) {
    return { ok: false, code: "app_path_not_allowed", detail: `${field} \u043E\u0431\u044F\u0437\u0430\u043D \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C \u043F\u0443\u0442\u0451\u043C \u0441 \u0434\u0438\u0441\u043A\u043E\u043C` };
  }
  if (!drives.includes(`${drive}:`)) {
    return {
      ok: false,
      code: "app_path_not_allowed",
      detail: `${field} \u043B\u0435\u0436\u0438\u0442 \u043D\u0430 \u0434\u0438\u0441\u043A\u0435 ${drive}:, \u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E ${drives.join(", ")} (TEAM_EXTERNAL_APP_DRIVES)`
    };
  }
  return { ok: true, target: path, cwd: path };
}

// modules/external-apps/runner.ts
import { spawn } from "node:child_process";
var MAX_LOG_LINES = 200;
var ExternalAppRunner = class {
  #live = /* @__PURE__ */ new Map();
  #onLog;
  constructor(onLog = () => void 0) {
    this.#onLog = onLog;
  }
  runtime(appId) {
    const entry = this.#live.get(appId);
    if (entry) return { ...entry.runtime };
    const stored = this.#stopped.get(appId);
    return stored ? { ...stored } : null;
  }
  #stopped = /* @__PURE__ */ new Map();
  isRunning(appId) {
    const entry = this.#live.get(appId);
    return Boolean(entry && entry.runtime.state === "running");
  }
  runningIds() {
    return [...this.#live.entries()].filter(([, entry]) => entry.runtime.state === "running" || entry.runtime.state === "starting").map(([id]) => id);
  }
  logLines(appId) {
    return [...this.#live.get(appId)?.log ?? []];
  }
  /** Запуск по явному пути. Окно не показывается: `windowsHide: true`. */
  async start(appId, spec, confirmWindowMs = 3e3) {
    if (this.isRunning(appId)) return { ok: false, pid: null, code: "app_start_unconfirmed", detail: "\u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0443\u0436\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E" };
    const runtime = {
      state: "starting",
      pid: null,
      started_at: (/* @__PURE__ */ new Date()).toISOString(),
      stopped_at: null,
      last_exit_code: null,
      last_exit_signal: null,
      last_stop_mode: null
    };
    const entry = { runtime, child: void 0, log: [] };
    this.#live.set(appId, entry);
    let child;
    try {
      child = spawn(spec.target, spec.args, {
        cwd: spec.cwd,
        windowsHide: true,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      this.#live.delete(appId);
      return {
        ok: false,
        pid: null,
        code: "app_start_unconfirmed",
        detail: error instanceof Error ? error.message : String(error)
      };
    }
    entry.child = child;
    const capture = (chunk) => {
      for (const line of String(chunk).split(/\r?\n/)) {
        const text = line.trimEnd();
        if (!text) continue;
        entry.log.push(text.slice(0, 500));
        if (entry.log.length > MAX_LOG_LINES) entry.log.splice(0, entry.log.length - MAX_LOG_LINES);
        this.#onLog(appId, text.slice(0, 500));
      }
    };
    child.stdout?.on("data", capture);
    child.stderr?.on("data", capture);
    const settled = await new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        resolve(value);
      };
      child.once("spawn", () => {
        runtime.state = "running";
        runtime.pid = child.pid ?? null;
        finish({ ok: true, pid: runtime.pid });
      });
      child.once("error", (error) => {
        this.#live.delete(appId);
        this.#stopped.set(appId, {
          ...runtime,
          state: "idle",
          pid: null,
          stopped_at: (/* @__PURE__ */ new Date()).toISOString(),
          last_exit_code: typeof error.code === "string" ? null : null,
          last_stop_mode: "exit"
        });
        finish({
          ok: false,
          pid: null,
          code: "app_start_unconfirmed",
          detail: `${error.code ?? "spawn_error"}: ${error.message}`
        });
      });
      const timer = setTimeout(() => {
        if (runtime.state === "starting") finish({ ok: false, pid: null, code: "app_start_unconfirmed", detail: `\u043F\u0440\u043E\u0446\u0435\u0441\u0441 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0441\u0442\u0430\u0440\u0442 \u0437\u0430 ${confirmWindowMs} \u043C\u0441` });
      }, confirmWindowMs);
      child.once("close", () => clearTimeout(timer));
    });
    if (!settled.ok) return settled;
    child.once("close", (code, signal) => {
      runtime.state = "stopped";
      runtime.stopped_at = (/* @__PURE__ */ new Date()).toISOString();
      runtime.last_exit_code = code;
      runtime.last_exit_signal = signal;
      if (runtime.last_stop_mode === null) runtime.last_stop_mode = "exit";
      this.#stopped.set(appId, { ...runtime });
      this.#live.delete(appId);
    });
    return settled;
  }
  /**
   * Вежливая остановка: штатный `taskkill /PID` без `/F` (для GUI — запрос на
   * закрытие), окно ожидания, затем тихий добивающий `taskkill /T /F`.
   * На не-Windows — SIGTERM, затем SIGKILL.
   */
  async stop(appId, graceMs = 5e3) {
    const entry = this.#live.get(appId);
    const pid = entry?.runtime.pid ?? null;
    if (!entry || pid === null) throw new Error("not_running");
    const exited = new Promise((resolve) => {
      entry.child.once("close", () => resolve(true));
      setTimeout(() => resolve(false), graceMs).unref();
    });
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(pid)], { windowsHide: true, stdio: "ignore" });
    } else {
      entry.child.kill("SIGTERM");
    }
    if (await exited) {
      return { mode: "polite", exit_code: entry.runtime.last_exit_code, exit_signal: entry.runtime.last_exit_signal };
    }
    entry.runtime.last_stop_mode = "forced";
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    } else {
      entry.child.kill("SIGKILL");
    }
    await Promise.race([
      new Promise((resolve) => entry.child.once("close", () => resolve())),
      new Promise((resolve) => {
        setTimeout(resolve, 5e3).unref();
      })
    ]);
    return { mode: "forced", exit_code: entry.runtime.last_exit_code, exit_signal: entry.runtime.last_exit_signal };
  }
  /** Остановить всё живое: вызывается на выключении модуля и перезагрузке. */
  async shutdownAll() {
    for (const id of this.runningIds()) {
      try {
        await this.stop(id, 4e3);
      } catch {
      }
    }
  }
  forgetAllStopped() {
    this.#stopped.clear();
  }
};

// modules/external-apps/index.ts
var STATE_LABELS = {
  idle: "\u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E",
  starting: "\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F",
  running: "\u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442",
  stopped: "\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
  missing: "\u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E"
};
var module = {
  id: "external-apps",
  apiVersion: 1,
  permissions: ["process", "storage"],
  register(ctx) {
    const profileDir = ctx.settings.dataDir;
    const registryFile = join(profileDir, "external-apps.json");
    const consentFile = join(profileDir, "external-app-consents.json");
    const historyFile = join(ctx.paths.data, "history.json");
    const log = ctx.log;
    const runner = new ExternalAppRunner((appId, line) => {
      log.info("\u0432\u043D\u0435\u0448\u043D\u0435\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435: \u0432\u044B\u0432\u043E\u0434", { app: appId, line });
    });
    ctx.onShutdown(() => runner.shutdownAll());
    const readApps = () => {
      if (!existsSync2(registryFile)) return { apps: [], broken: null, problems: [] };
      let text = "";
      try {
        text = readFileSync(registryFile, "utf8");
      } catch (error) {
        return { apps: [], broken: `\u0444\u0430\u0439\u043B \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F: ${error instanceof Error ? error.message : String(error)}`, problems: [] };
      }
      return parseRegistry(text);
    };
    const readHistory = () => {
      if (!existsSync2(historyFile)) return { counts: {}, events: [] };
      try {
        const parsed = JSON.parse(readFileSync(historyFile, "utf8"));
        return {
          counts: parsed.counts && typeof parsed.counts === "object" ? parsed.counts : {},
          events: Array.isArray(parsed.events) ? parsed.events : []
        };
      } catch {
        return { counts: {}, events: [] };
      }
    };
    const writeHistory = (history) => {
      history.events = history.events.slice(-200);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        writeFileSync(historyFile, `${JSON.stringify(history, null, 2)}
`, "utf8");
      } catch (error) {
        log.warn("\u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0430", { error: error instanceof Error ? error.message : String(error) });
      }
    };
    const readConsents = () => {
      if (!existsSync2(consentFile)) return {};
      try {
        const parsed = JSON.parse(readFileSync(consentFile, "utf8"));
        const rows = Array.isArray(parsed.consents) ? parsed.consents : [];
        const map = {};
        for (const row of rows) {
          if (row && typeof row === "object") {
            const value = row;
            if (typeof value.app === "string" && typeof value.target === "string") {
              map[value.app] = { target: value.target, at: typeof value.at === "string" ? value.at : "" };
            }
          }
        }
        return map;
      } catch {
        return {};
      }
    };
    const saveConsent = (app) => {
      const consents = readConsents();
      consents[app.id] = { target: app.target, at: (/* @__PURE__ */ new Date()).toISOString() };
      const body = { consents: Object.entries(consents).map(([app_id, row]) => ({ app: app_id, target: row.target, at: row.at })) };
      writeFileSync(consentFile, `${JSON.stringify(body, null, 2)}
`, "utf8");
    };
    const describeApp = (app, consents) => {
      const drives = allowedDrives();
      const check = checkAppPaths(app, { drives });
      const runtime = runner.runtime(app.id);
      const history = readHistory();
      const consent = consents[app.id] ?? null;
      if (!check.ok) {
        return {
          id: app.id,
          name: app.name,
          target: app.target,
          args: app.args,
          cwd: app.cwd,
          note: app.note,
          state: "missing",
          state_label: STATE_LABELS["missing"],
          pid: null,
          why: check.detail,
          refusal_code: check.code,
          launches: history.counts[app.id]?.launches ?? 0,
          last_exit_code: history.counts[app.id]?.last_exit_code ?? null,
          consent: consent ? { granted: consent.target === app.target, target: consent.target, at: consent.at } : { granted: false, target: null, at: null }
        };
      }
      const state = runtime?.state ?? "idle";
      return {
        id: app.id,
        name: app.name,
        target: app.target,
        args: app.args,
        cwd: check.cwd,
        note: app.note,
        state,
        state_label: STATE_LABELS[state] ?? state,
        pid: state === "running" || state === "starting" ? runtime?.pid ?? null : runtime?.pid ?? null,
        started_at: runtime?.started_at ?? null,
        stopped_at: runtime?.stopped_at ?? null,
        last_exit_code: runtime?.last_exit_code ?? history.counts[app.id]?.last_exit_code ?? null,
        last_exit_signal: runtime?.last_exit_signal ?? null,
        last_stop_mode: runtime?.last_stop_mode ?? null,
        why: state === "stopped" && runtime?.last_exit_code !== null && runtime?.last_exit_code !== 0 ? `\u043F\u0440\u043E\u0446\u0435\u0441\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441\u0430\u043C, \u043A\u043E\u0434 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 ${runtime?.last_exit_code}` : "",
        launches: history.counts[app.id]?.launches ?? 0,
        consent: consent ? { granted: consent.target === app.target, target: consent.target, at: consent.at } : { granted: false, target: null, at: null }
      };
    };
    ctx.api.add("GET", "/api/tools/external-apps/apps", () => {
      const registry = readApps();
      const consents = readConsents();
      return {
        headers: { "cache-control": "no-store" },
        body: {
          ok: true,
          registry: { path: registryFile, broken: registry.broken, problems: registry.problems },
          drives: allowedDrives(),
          apps: registry.apps.map((app) => describeApp(app, consents))
        }
      };
    });
    ctx.api.add("POST", "/api/tools/external-apps/apps/:id/start", async (request) => {
      const id = request.params.id ?? "";
      const registry = readApps();
      if (registry.broken) {
        throw new AppError("app_registry_broken", `\u0440\u0435\u0435\u0441\u0442\u0440 \u0432\u043D\u0435\u0448\u043D\u0438\u0445 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D: ${registry.broken}`, 409);
      }
      const app = registry.apps.find((row) => row.id === id);
      if (!app) {
        throw new AppError("app_not_registered", `\u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \xAB${id}\xBB \u043D\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0432 ${registryFile}`, 404);
      }
      if (runner.isRunning(app.id)) {
        throw new AppError("app_already_running", `\u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \xAB${app.name}\xBB \u0443\u0436\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E (pid ${runner.runtime(app.id)?.pid})`, 409);
      }
      const check = checkAppPaths(app, { drives: allowedDrives() });
      if (!check.ok) throw new AppError(check.code, check.detail, check.code === "app_target_missing" ? 404 : 403);
      const consents = readConsents();
      const consent = consents[app.id];
      const confirmed = request.body?.confirm === true;
      if (!consent || consent.target !== app.target) {
        if (!confirmed) {
          const history3 = readHistory();
          history3.events.push({ at: (/* @__PURE__ */ new Date()).toISOString(), app: app.id, action: "refuse", detail: "consent: \u0437\u0430\u043F\u0443\u0441\u043A \u0431\u0435\u0437 \u044F\u0432\u043D\u043E\u0433\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D" });
          writeHistory(history3);
          throw new AppError(
            "consent_required",
            `consent_required: \u043F\u0435\u0440\u0432\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \xAB${app.name}\xBB \u2014 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0447\u0443\u0436\u043E\u0439 \u0438\u0441\u043F\u043E\u043B\u043D\u044F\u0435\u043C\u044B\u0439 \u0444\u0430\u0439\u043B \u0431\u0435\u0437 \u044F\u0432\u043D\u043E\u0433\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F. \u0424\u0430\u0439\u043B: ${app.target}`,
            409
          );
        }
        saveConsent(app);
        const history2 = readHistory();
        history2.events.push({ at: (/* @__PURE__ */ new Date()).toISOString(), app: app.id, action: "consent", detail: `\u0441\u043E\u0433\u043B\u0430\u0441\u0438\u0435 \u0432\u044B\u0434\u0430\u043D\u043E \u043D\u0430 ${app.target}` });
        writeHistory(history2);
        log.info("\u0441\u043E\u0433\u043B\u0430\u0441\u0438\u0435 \u043D\u0430 \u0432\u043D\u0435\u0448\u043D\u0435\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0432\u044B\u0434\u0430\u043D\u043E", { app: app.id, target: app.target, file: consentFile });
      }
      const started = await runner.start(app.id, { target: check.target, args: app.args, cwd: check.cwd });
      const history = readHistory();
      const counts = history.counts;
      if (!started.ok) {
        history.events.push({ at: (/* @__PURE__ */ new Date()).toISOString(), app: app.id, action: "refuse", detail: `start: ${started.detail}` });
        writeHistory(history);
        throw new AppError("app_start_unconfirmed", `\u043F\u0440\u043E\u0446\u0435\u0441\u0441 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0437\u0430\u043F\u0443\u0441\u043A: ${started.detail}`, 409);
      }
      counts[app.id] = {
        launches: (counts[app.id]?.launches ?? 0) + 1,
        last_exit_code: counts[app.id]?.last_exit_code ?? null,
        last_started_at: (/* @__PURE__ */ new Date()).toISOString(),
        last_stopped_at: counts[app.id]?.last_stopped_at ?? null
      };
      history.events.push({ at: (/* @__PURE__ */ new Date()).toISOString(), app: app.id, action: "start", detail: `pid ${started.pid}` });
      writeHistory(history);
      log.info("\u0432\u043D\u0435\u0448\u043D\u0435\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E", { app: app.id, pid: started.pid, target: app.target });
      return { body: { ok: true, pid: started.pid, app: describeApp(app, readConsents()) } };
    });
    ctx.api.add("POST", "/api/tools/external-apps/apps/:id/stop", async (request) => {
      const id = request.params.id ?? "";
      const registry = readApps();
      const app = registry.apps.find((row) => row.id === id);
      if (!app) {
        throw new AppError("app_not_registered", `\u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \xAB${id}\xBB \u043D\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0432 ${registryFile}`, 404);
      }
      if (!runner.isRunning(app.id)) {
        return { body: { ok: true, action: "already_stopped", app: describeApp(app, readConsents()) } };
      }
      const stopped = await runner.stop(app.id);
      const history = readHistory();
      const runtime = runner.runtime(app.id);
      history.counts[app.id] = {
        launches: history.counts[app.id]?.launches ?? 0,
        last_exit_code: runtime?.last_exit_code ?? null,
        last_started_at: history.counts[app.id]?.last_started_at ?? null,
        last_stopped_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      history.events.push({
        at: (/* @__PURE__ */ new Date()).toISOString(),
        app: app.id,
        action: "stop",
        detail: `${stopped.mode}, \u043A\u043E\u0434 ${stopped.exit_code}, \u0441\u0438\u0433\u043D\u0430\u043B ${stopped.exit_signal}`
      });
      writeHistory(history);
      log.info("\u0432\u043D\u0435\u0448\u043D\u0435\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E", { app: app.id, mode: stopped.mode, exit_code: stopped.exit_code, signal: stopped.exit_signal });
      return { body: { ok: true, action: stopped.mode, exit_code: stopped.exit_code, exit_signal: stopped.exit_signal, app: describeApp(app, readConsents()) } };
    });
    ctx.api.add("POST", "/api/tools/external-apps/apps/:id/folder", (request) => {
      const id = request.params.id ?? "";
      const registry = readApps();
      const app = registry.apps.find((row) => row.id === id);
      if (!app) {
        throw new AppError("app_not_registered", `\u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \xAB${id}\xBB \u043D\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0432 ${registryFile}`, 404);
      }
      const check = checkAppPaths(app, { drives: allowedDrives() });
      if (!check.ok) throw new AppError(check.code, check.detail, check.code === "app_target_missing" ? 404 : 403);
      spawn2("explorer.exe", [check.cwd], { windowsHide: true, stdio: "ignore" });
      return { body: { ok: true, folder: check.cwd } };
    });
    ctx.api.add("GET", "/api/tools/external-apps/history", () => {
      const history = readHistory();
      return { headers: { "cache-control": "no-store" }, body: { ok: true, counts: history.counts, events: history.events.slice(-50).reverse() } };
    });
    ctx.api.add("GET", "/api/tools/external-apps/apps/:id/log", (request) => {
      const id = request.params.id ?? "";
      return { headers: { "cache-control": "no-store" }, body: { ok: true, app: id, lines: runner.logLines(id) } };
    });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
