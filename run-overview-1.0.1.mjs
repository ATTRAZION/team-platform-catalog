import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/run-overview/page.ts
var PAGE = String.raw`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Обзор работы агентов</title></head><body><main><h1>Обзор работы агентов</h1><p>Показаны запуски и типы их событий, без содержания вывода. Это не полная трасса вызовов инструментов. Данные могут измениться во время просмотра.</p><label>Идентификатор задачи <input id="task" maxlength="100"></label> <button id="load">Найти</button> <button id="next" disabled>Следующая страница</button><p id="status" role="status"></p><pre id="result"></pre></main><script>
let cursor=null,current='';const status=document.getElementById('status'),result=document.getElementById('result'),next=document.getElementById('next'),load=document.getElementById('load');
async function fetchPage(append){load.disabled=true;next.disabled=true;try{const q=new URLSearchParams({task_id:current});if(append&&cursor)q.set('cursor',cursor);const r=await fetch('/api/tools/run-overview?'+q);const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Ошибка загрузки');cursor=d.next_cursor||null;const rows=d.items.map(x=>[x.id+' · '+x.agent+' · '+x.status,'Попытка '+x.attempt+'/'+x.max_attempts+(x.retry_of?' · повтор '+x.retry_of:''),...x.events.map(e=>e.created_at+' · '+e.type),...(x.events_may_be_truncated?['Список событий может быть неполным']:[])].join('\n')).join('\n\n');if(append)result.textContent+=(rows?'\n\n'+rows:'');else result.textContent=rows;status.textContent=d.items.length?'Показано запусков на странице: '+d.items.length+(cursor?'; есть следующая страница.':'.'):'Запуски не найдены. Это не подтверждает существование задачи.'}catch(e){status.textContent=e.message}finally{load.disabled=false;next.disabled=!cursor}}
load.onclick=()=>{const wanted=document.getElementById('task').value.trim();if(!wanted){result.textContent='';document.getElementById('status').textContent='Укажите id задачи — список запусков не запрошен.';return}current=document.getElementById('task').value.trim();cursor=null;result.textContent='';fetchPage(false)};next.onclick=()=>{if(cursor)fetchPage(true)};
</script></body></html>`;

// modules/run-overview/index.ts
var module = {
  id: "run-overview",
  apiVersion: 1,
  register(ctx) {
    const { runs } = ctx.require("runs");
    ctx.api.add("GET", "/api/tools/run-overview", (c) => {
      const taskId = c.query.get("task_id")?.trim() || "";
      const cursor = c.query.get("cursor") || void 0;
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(taskId) || cursor && cursor.length > 1e3) return { status: 400, body: { error: { code: "invalid_request", message: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438 \u043A\u0443\u0440\u0441\u043E\u0440." } } };
      const page = runs.list({ task_id: taskId, limit: "50", cursor });
      const items = page.items.map((run) => {
        const detail = runs.get(run.id);
        return {
          id: run.id,
          task_id: run.task_id,
          agent: run.agent,
          status: run.status,
          attempt: run.attempt,
          max_attempts: run.max_attempts,
          retry_of: run.retry_of,
          retry_attempt: run.retry_attempt,
          created_at: run.created_at,
          started_at: run.started_at,
          finished_at: run.finished_at,
          events: detail.events.map((event) => ({ type: event.type, created_at: event.created_at })),
          events_may_be_truncated: detail.events.length >= 100
        };
      });
      return { headers: { "cache-control": "no-store" }, body: { task_id: taskId, items, next_cursor: page.next_cursor, complete_snapshot: false } };
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
