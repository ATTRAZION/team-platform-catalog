import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/three-d-studio/index.ts
import { readFileSync } from "node:fs";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// modules/three-d-studio/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>3D-\u0441\u0442\u0443\u0434\u0438\u044F</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font: 14px/1.45 system-ui, "Segoe UI", sans-serif; color: #e8eef8; background: #0d1117; }
  h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: 0.2px; }
  h2 { margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 1.1px; color: #94a3b8; }
  p { margin: 0; }
  .sub { color: #94a3b8; max-width: 760px; }
  .note { margin-top: 12px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(242, 181, 68, 0.35); background: rgba(242, 181, 68, 0.08); color: #ffd591; max-width: 820px; }
  .bar { display: flex; align-items: center; gap: 10px; margin: 20px 0 10px; }
  .bar h2 { margin: 0; }
  .spacer { flex: 1; }
  button, .button { font: inherit; font-weight: 600; padding: 7px 13px; border-radius: 9px; border: 1px solid #2b3a4d; background: #16202b; color: #e8eef8; cursor: pointer; text-decoration: none; display: inline-block; }
  button:hover, .button:hover { border-color: #3f8cff; }
  button:disabled { opacity: 0.55; cursor: progress; }
  .button.play { border-color: #2f8f6d; background: #1b5e47; color: #eafff6; }
  .list { display: grid; gap: 8px; }
  .task, .game { border: 1px solid #223041; border-radius: 12px; background: #121a24; padding: 12px 14px; }
  .task { display: flex; align-items: center; gap: 12px; }
  .task .title { flex: 1; min-width: 0; }
  .task .title strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { color: #8493a8; font-size: 12px; }
  .game { display: grid; grid-template-columns: 150px 1fr; gap: 14px; }
  .game img { width: 150px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid #223041; background: #0b0e14; }
  .game .body { min-width: 0; display: grid; gap: 6px; }
  .game .title { font-size: 16px; font-weight: 650; }
  .checks { color: #7ee2b8; font-size: 12px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
  .empty { color: #8493a8; padding: 14px; border: 1px dashed #2b3a4d; border-radius: 12px; }
  #status { min-height: 22px; margin-top: 14px; color: #9fb0c6; }
  #status.error { color: #ff9b9b; }
  #status.ok { color: #7ee2b8; }
  .engine { color: #6f7c90; font-size: 12px; }
</style>
</head>
<body>
  <h1>3D-\u0441\u0442\u0443\u0434\u0438\u044F</h1>
  <p class="sub">\u0412\u043E\u0437\u044C\u043C\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0441 \u0434\u043E\u0441\u043A\u0438 \u2014 Blender \u0441\u043E\u0431\u0435\u0440\u0451\u0442 \u0441\u0446\u0435\u043D\u0443, \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442 <code>.blend</code>, \u0430 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u043E\u0435\u0442 \u0435\u0451 \u0438 \u043E\u0442\u0434\u0430\u0441\u0442 \u0433\u043E\u0442\u043E\u0432\u0443\u044E \u0438\u0433\u0440\u0443. \u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A <code>demo</code> \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0434\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442: \u043E\u043D \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0444\u0430\u0439\u043B\u043E\u0432.</p>
  <div class="note">\u0418\u0433\u0440\u0430 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0433\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u0441\u0446\u0435\u043D\u044B: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u043C\u043E\u043D\u0435\u0442\u044B, \u0446\u0435\u043B\u044C \u0438 \u0442\u043E\u0447\u043A\u0430 \u0441\u0442\u0430\u0440\u0442\u0430. \u0415\u0441\u043B\u0438 Blender \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0438\u043B\u0438 \u0441\u0446\u0435\u043D\u0430 \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u043B\u0430\u0441\u044C, \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043D\u0435 \u0431\u0443\u0434\u0435\u0442 \u2014 \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u0438\u0447\u0438\u043D\u0430.</div>

  <div class="bar">
    <h2>\u0417\u0430\u0434\u0430\u0447\u0438 \u043D\u0430 \u0434\u043E\u0441\u043A\u0435</h2>
    <span class="spacer"></span>
    <button type="button" id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button>
  </div>
  <div class="list" id="tasks"><div class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0437\u0430\u0434\u0430\u0447\u2026</div></div>

  <div class="bar">
    <h2>\u0421\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u044B</h2>
    <span class="spacer"></span>
  </div>
  <div class="list" id="games"><div class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0431\u043E\u0440\u043E\u043A\u2026</div></div>

  <div id="status" role="status" aria-live="polite"></div>

<script>
(function () {
  'use strict';

  var tasksNode = document.getElementById('tasks');
  var gamesNode = document.getElementById('games');
  var statusNode = document.getElementById('status');
  var refresh = document.getElementById('refresh');
  var busy = false;

  function el(name, className, text) {
    var node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function say(text, kind) {
    statusNode.textContent = text || '';
    statusNode.className = kind || '';
  }

  function request(path, init) {
    return fetch(path, {
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      ...(init || {})
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          var message = body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status;
          throw new Error(message);
        }
        return body;
      });
    });
  }

  function renderTasks(items) {
    tasksNode.textContent = '';
    var open = items.filter(function (task) {
      return task.status !== 'done' && task.status !== 'cancelled';
    });
    if (!open.length) {
      tasksNode.appendChild(el('div', 'empty', '\u041D\u0430 \u0434\u043E\u0441\u043A\u0435 \u043D\u0435\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u2014 \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u0418\u0433\u0440\u0430: \u0441\u043E\u0431\u0435\u0440\u0438 \u0442\u0440\u0438 \u043C\u043E\u043D\u0435\u0442\u044B\xBB.'));
      return;
    }
    open.slice(0, 12).forEach(function (task) {
      var row = el('div', 'task');
      var title = el('div', 'title');
      title.appendChild(el('strong', '', task.title));
      title.appendChild(el('span', 'meta', '\u0421\u0442\u0430\u0442\u0443\u0441: ' + task.status + (task.assignee ? ' \xB7 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C: ' + task.assignee : '')));
      var build = el('button', '', '\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0438\u0433\u0440\u0443');
      build.type = 'button';
      build.addEventListener('click', function () { buildGame(task, build); });
      row.appendChild(title);
      row.appendChild(build);
      tasksNode.appendChild(row);
    });
  }

  function renderGames(games) {
    gamesNode.textContent = '';
    if (!games.length) {
      gamesNode.appendChild(el('div', 'empty', '\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u0438\u0433\u0440\u044B. \u0421\u043E\u0431\u0435\u0440\u0438\u0442\u0435 \u0435\u0451 \u0438\u0437 \u0437\u0430\u0434\u0430\u0447\u0438 \u0432\u044B\u0448\u0435 \u2014 \u044D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434.'));
      return;
    }
    games.forEach(function (game) {
      var card = el('div', 'game');
      var image = document.createElement('img');
      image.src = game.preview_url;
      image.alt = '\u041F\u0440\u0435\u0432\u044C\u044E \u0443\u0440\u043E\u0432\u043D\u044F \xAB' + game.title + '\xBB';
      image.loading = 'lazy';
      var body = el('div', 'body');
      body.appendChild(el('div', 'title', game.title));
      body.appendChild(el('div', 'meta', '\u0417\u0430\u0434\u0430\u0447\u0430 ' + game.task_id + ' \xB7 ' + game.evidence.coins + ' \u043C\u043E\u043D\u0435\u0442 \xB7 ' + game.evidence.objects + ' \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432'));
      body.appendChild(el('div', 'checks', '\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E: ' + game.evidence.checks.join(' \xB7 ')));
      body.appendChild(el('div', 'engine', '\u0414\u0432\u0438\u0436\u043E\u043A: ' + game.evidence.engine + ' \xB7 sha256 ' + game.artifacts.blend.sha256.slice(0, 16) + '\u2026'));
      var actions = el('div', 'actions');
      var play = el('a', 'button play', '\u0418\u0433\u0440\u0430\u0442\u044C');
      play.href = game.play_url;
      play.target = '_blank';
      play.rel = 'noopener';
      var verify = el('button', '', '\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043D\u043E\u0432\u0430');
      verify.type = 'button';
      verify.addEventListener('click', function () { verifyGame(game, verify); });
      actions.appendChild(play);
      actions.appendChild(verify);
      body.appendChild(actions);
      card.appendChild(image);
      card.appendChild(body);
      gamesNode.appendChild(card);
    });
  }

  function load() {
    if (busy) return;
    say('\u0427\u0438\u0442\u0430\u044E \u0434\u043E\u0441\u043A\u0443 \u0438 \u0441\u0431\u043E\u0440\u043A\u0438\u2026');
    Promise.all([request('/api/tasks?limit=40'), request('/api/tools/three-d/games')])
      .then(function (values) {
        renderTasks(values[0].items || []);
        renderGames(values[1].games || []);
        say('');
      })
      .catch(function (error) { say(error.message, 'error'); });
  }

  function buildGame(task, button) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    say('Blender \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442 \u0441\u0446\u0435\u043D\u0443 \u043F\u043E \u0437\u0430\u0434\u0430\u0447\u0435 \xAB' + task.title + '\xBB\u2026');
    request('/api/tools/three-d/games', { method: 'POST', body: JSON.stringify({ task_id: task.id }) })
      .then(function (body) {
        say('\u0418\u0433\u0440\u0430 \u0441\u043E\u0431\u0440\u0430\u043D\u0430 \u0438 \u0441\u0446\u0435\u043D\u0430 \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u0430: ' + body.game.evidence.checks.join(', ') + '.', 'ok');
        return true;
      })
      .catch(function (error) {
        say('\u0418\u0433\u0440\u0430 \u043D\u0435 \u0441\u043E\u0431\u0440\u0430\u043D\u0430: ' + error.message, 'error');
        return false;
      })
      .then(function (built) {
        busy = false;
        button.disabled = false;
        if (built) load();
      });
  }

  function verifyGame(game, button) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    say('\u041F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E \u0441\u0446\u0435\u043D\u0443 \xAB' + game.title + '\xBB \u0432 Blender\u2026');
    request('/api/tools/three-d/games/' + encodeURIComponent(game.id) + '/verify', { method: 'POST', body: '{}' })
      .then(function (body) {
        say('\u0421\u0446\u0435\u043D\u0430 \u043E\u0442\u043A\u0440\u044B\u043B\u0430\u0441\u044C \u0441\u043D\u043E\u0432\u0430: ' + body.evidence.checks.join(' \xB7 ') + '.', 'ok');
      })
      .catch(function (error) { say('\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430: ' + error.message, 'error'); })
      .then(function () { busy = false; button.disabled = false; });
  }

  refresh.addEventListener('click', load);
  load();
})();
</script>
</body>
</html>
`;

// modules/three-d-studio/index.ts
var BASE = "/api/tools/three-d/games";
function bodyOf(raw) {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
}
var module = {
  id: "three-d-studio",
  apiVersion: 1,
  permissions: ["process", "storage"],
  requiresKernel: [{ name: "three-d-builder", contractVersion: 1 }],
  register(ctx) {
    const { tasks } = ctx.require("tasks");
    const builder = ctx.kernelServices.require("three-d-builder");
    const view = (game) => ({
      ...game,
      play_url: `${BASE}/${game.id}/play`,
      preview_url: `${BASE}/${game.id}/preview`
    });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", BASE, () => ({
      headers: { "cache-control": "no-store" },
      body: { games: builder.list().map(view) }
    }));
    ctx.api.add("POST", BASE, async (request) => {
      const body = bodyOf(request.body);
      const taskId = typeof body.task_id === "string" ? body.task_id.trim() : "";
      if (!taskId) {
        throw new ValidationError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0441 \u0434\u043E\u0441\u043A\u0438: \u0438\u0433\u0440\u0430 \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u043F\u043E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435", {
          reason: "task_id_missing",
          field: "task_id"
        });
      }
      const task = tasks.get(taskId).task;
      const game = await builder.build({ task_id: task.id, title: task.title });
      ctx.log.info("\u0418\u0433\u0440\u0430 \u0441\u043E\u0431\u0440\u0430\u043D\u0430 \u0438\u0437 \u0437\u0430\u0434\u0430\u0447\u0438", {
        game: game.id,
        task: task.id,
        blend_sha256: game.artifacts.blend.sha256.slice(0, 12),
        engine: game.evidence.engine
      });
      return { status: 201, body: { game: view(game) } };
    });
    ctx.api.add("GET", `${BASE}/:id`, (request) => ({
      headers: { "cache-control": "no-store" },
      body: { game: view(builder.get(request.params.id ?? "")) }
    }));
    ctx.api.add("POST", `${BASE}/:id/verify`, async (request) => {
      const id = request.params.id ?? "";
      builder.get(id);
      const evidence = await builder.verify(id);
      return {
        headers: { "cache-control": "no-store" },
        body: { game_id: id, evidence }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/play`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync(game.artifacts.game.path),
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/game.js`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync(game.artifacts.script.path),
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/game.css`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync(game.artifacts.style.path),
        headers: {
          "content-type": "text/css; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/mesh.glb`, (request) => {
      const game = builder.get(request.params.id ?? "");
      const mesh = game.artifacts.mesh;
      if (!mesh) throw new NotFoundError(`\u0423 \u0441\u0431\u043E\u0440\u043A\u0438 \xAB${game.id}\xBB \u043D\u0435\u0442 \u0441\u0435\u0442\u043A\u0438`);
      return {
        raw: readFileSync(mesh.path),
        headers: {
          "content-type": "model/gltf-binary",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/preview`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync(game.artifacts.preview.path),
        headers: {
          "content-type": "image/png",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
