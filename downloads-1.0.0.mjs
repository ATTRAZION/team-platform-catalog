import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/downloads/index.ts
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// modules/downloads/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; padding: 20px 24px; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: var(--accent); font-size: 13px; }
  main { display: grid; gap: 20px; padding: 24px; }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: var(--muted); font-weight: 600; }
  .facts { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin: 0 0 14px; }
  .fact { background: var(--panel-soft); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
  .fact span { display: block; color: var(--muted); font-size: 12px; }
  .fact strong { font-weight: 600; word-break: break-all; }
  button { font: inherit; background: var(--accent); color: var(--on-accent); border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  button.ghost { background: var(--panel-soft); color: var(--text); }
  button:disabled { opacity: .5; cursor: default; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; font-size: 12px; }
  td.num { white-space: nowrap; }
  .status { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: var(--panel-soft); white-space: nowrap; }
  .status-done { background: #1d3a2a; color: #8be0ab; }
  .status-error { background: #3a2426; color: #ff9a9a; }
  .status-downloading { background: #1c3040; color: #7fd4ff; }
  .status-paused { background: #3a3424; color: #ffd08a; }
  .muted { color: var(--muted); }
  .empty { color: var(--muted); }
  .error { color: #ff9a9a; font-size: 13px; min-height: 18px; }
  .hint { color: var(--muted); font-size: 12px; }
  code { background: var(--panel-soft); border: 1px solid var(--line); border-radius: 6px; padding: 1px 5px; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
  <a href="/api/tools/downloads/status">API \u0441\u0442\u0430\u0442\u0443\u0441\u0430</a>
</header>
<main>
  <section>
    <h2>\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435</h2>
    <div class="facts" id="facts"><div class="fact"><span>\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435</span><strong>\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</strong></div></div>
    <div class="row">
      <button id="launch" type="button">\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0447\u0438\u043A</button>
      <button id="reveal" class="ghost" type="button">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u0434\u0430\u043D\u043D\u044B\u0445</button>
      <button id="refresh" class="ghost" type="button">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button>
    </div>
    <p class="hint">\u041F\u0443\u0442\u044C \u043A \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044E \u0437\u0430\u0434\u0430\u0451\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 <code>TEAM_DOWNLOADER_DIR</code> (\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E <code>D:\\Downloader</code>).</p>
    <p class="error" id="message" role="status"></p>
  </section>

  <section>
    <h2>\u041E\u0447\u0435\u0440\u0435\u0434\u044C <span class="muted" id="queue-count"></span></h2>
    <table>
      <thead><tr><th>\u0424\u0430\u0439\u043B</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th><th>\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441</th><th>\u0420\u0430\u0437\u043C\u0435\u0440</th></tr></thead>
      <tbody id="queue"><tr><td colspan="4" class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</td></tr></tbody>
    </table>
  </section>

  <section>
    <h2>\u0418\u0441\u0442\u043E\u0440\u0438\u044F <span class="muted" id="history-count"></span></h2>
    <table>
      <thead><tr><th>\u0424\u0430\u0439\u043B</th><th>\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A</th><th>\u0420\u0430\u0437\u043C\u0435\u0440</th><th>\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E</th><th>SHA-256</th></tr></thead>
      <tbody id="history"><tr><td colspan="5" class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</td></tr></tbody>
    </table>
  </section>
</main>
<script>
(function () {
  var facts = document.getElementById('facts');
  var queue = document.getElementById('queue');
  var history = document.getElementById('history');
  var queueCount = document.getElementById('queue-count');
  var historyCount = document.getElementById('history-count');
  var message = document.getElementById('message');
  var launchButton = document.getElementById('launch');
  var revealButton = document.getElementById('reveal');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function bytes(value) {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) return '\u2014';
    if (value < 1024) return value + ' \u0411';
    var units = ['\u041A\u0411', '\u041C\u0411', '\u0413\u0411'];
    var size = value / 1024, index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
    return size.toFixed(size >= 10 ? 0 : 1) + ' ' + units[index];
  }

  function when(value) {
    if (typeof value !== 'number' || !value) return '\u2014';
    var date = new Date(value * 1000);
    return date.toLocaleString('ru-RU');
  }

  function fact(label, value) {
    return '<div class="fact"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
  }

  function statusClass(status) {
    return status === 'done' || status === 'error' || status === 'downloading' || status === 'paused'
      ? 'status status-' + status
      : 'status';
  }

  function say(text, isError) {
    message.textContent = text || '';
    message.style.color = isError ? '#ff9a9a' : '';
  }

  async function request(path, method) {
    var response = await fetch(path, { method: method || 'GET', cache: 'no-store' });
    var text = await response.text();
    var body = null;
    try { body = text ? JSON.parse(text) : null; } catch (error) { body = null; }
    if (!response.ok) {
      var reason = body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status;
      throw new Error(reason);
    }
    return body;
  }

  async function load() {
    try {
      var status = await request('/api/tools/downloads/status');
      var app = status.app || {};
      var counts = (status.queue && status.queue.counts) || {};
      facts.innerHTML = [
        fact('\u0412\u0435\u0440\u0441\u0438\u044F', app.version || '\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430'),
        fact('Portable exe', app.exe_exists ? '\u043D\u0430\u0439\u0434\u0435\u043D' : '\u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D'),
        fact('\u0420\u0430\u0437\u043C\u0435\u0440 exe', app.exe_exists ? bytes(app.exe_bytes) : '\u2014'),
        fact('\u041E\u0447\u0435\u0440\u0435\u0434\u044C', String((status.queue && status.queue.total) || 0)),
        fact('\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F', String(counts.downloading || 0)),
        fact('\u0413\u043E\u0442\u043E\u0432\u043E \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438', String(counts.done || 0)),
        fact('\u0418\u0441\u0442\u043E\u0440\u0438\u044F', String((status.history && status.history.count) || 0)),
        fact('\u041F\u0430\u043F\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445', app.data_dir || '\u2014')
      ].join('');
      facts.innerHTML += '<div class="fact" style="grid-column:1/-1"><span>\u041F\u0443\u0442\u044C \u043A \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044E</span><strong>' + esc(app.dir) + '</strong></div>';
      facts.innerHTML += '<div class="fact" style="grid-column:1/-1"><span>Portable exe</span><strong>' + esc(app.exe) + '</strong></div>';
      launchButton.disabled = !app.exe_exists;
      revealButton.disabled = !app.data_exists;

      var tasks = await request('/api/tools/downloads/tasks');
      var items = (tasks && tasks.tasks) || [];
      queueCount.textContent = items.length ? '(' + items.length + ')' : '';
      queue.innerHTML = items.length
        ? items.map(function (task) {
            var progress = task.size ? Math.round((task.done / task.size) * 100) + '%' : '\u2014';
            return '<tr><td>' + esc(task.name || task.url) + (task.error ? '<div class="error">' + esc(task.error) + '</div>' : '') +
              '</td><td><span class="' + statusClass(task.status) + '">' + esc(task.status) + '</span></td>' +
              '<td class="num">' + esc(progress) + '</td><td class="num">' + esc(bytes(task.size)) + '</td></tr>';
          }).join('')
        : '<tr><td colspan="4" class="empty">\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u043F\u0443\u0441\u0442\u0430</td></tr>';

      var loaded = await request('/api/tools/downloads/history?limit=25');
      var entries = (loaded && loaded.items) || [];
      historyCount.textContent = entries.length ? '(' + entries.length + ')' : '';
      history.innerHTML = entries.length
        ? entries.map(function (item) {
            return '<tr><td>' + esc(item.name) + (item.exists ? '' : ' <span class="muted">(\u0444\u0430\u0439\u043B\u0430 \u043D\u0435\u0442)</span>') +
              '</td><td class="muted">' + esc(item.host || item.url) + '</td>' +
              '<td class="num">' + esc(bytes(item.size)) + '</td>' +
              '<td class="num">' + esc(when(item.finished)) + '</td>' +
              '<td class="muted">' + (item.sha256 ? esc(item.sha256.slice(0, 12)) + '\u2026' : '\u2014') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="5" class="empty">\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u0443\u0441\u0442\u0430</td></tr>';
      say('');
    } catch (error) {
      facts.innerHTML = fact('\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435', '\u043E\u0448\u0438\u0431\u043A\u0430');
      say(error && error.message ? error.message : '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435', true);
    }
  }

  launchButton.addEventListener('click', async function () {
    launchButton.disabled = true;
    try {
      await request('/api/tools/downloads/launch', 'POST');
      say('\u0417\u0430\u0433\u0440\u0443\u0437\u0447\u0438\u043A \u0437\u0430\u043F\u0443\u0449\u0435\u043D');
    } catch (error) {
      say(error.message, true);
    }
    launchButton.disabled = false;
    setTimeout(load, 800);
  });

  revealButton.addEventListener('click', async function () {
    try {
      await request('/api/tools/downloads/reveal', 'POST');
    } catch (error) {
      say(error.message, true);
    }
  });

  document.getElementById('refresh').addEventListener('click', load);
  load();
})();
</script>
</body>
</html>`;

// modules/downloads/index.ts
var NO_STORE = { "cache-control": "no-store" };
var DEFAULT_APP_DIR = "D:\\Downloader";
var EXE_NAME = "\u0421\u043A\u0430\u0447\u0430\u0442\u044C.exe";
var TASK_STATUSES = ["queued", "downloading", "paused", "done", "error", "cancelled"];
function appDir() {
  return process.env.TEAM_DOWNLOADER_DIR?.trim() || DEFAULT_APP_DIR;
}
function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function itemsOf(value, key) {
  const list = Array.isArray(value) ? value : value?.[key];
  if (!Array.isArray(list)) return [];
  return list.filter((item) => !!item && typeof item === "object" && !Array.isArray(item));
}
function text(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function numberOrNull(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function appVersion(mainPy) {
  try {
    const match = /^VERSION\s*=\s*["']([^"']+)["']/m.exec(readFileSync(mainPy, "utf8"));
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}
function fileInfo(file) {
  try {
    const stat = statSync(file);
    return { exists: true, bytes: stat.size, updated_at: stat.mtime.toISOString() };
  } catch {
    return { exists: false, bytes: null, updated_at: null };
  }
}
function queueOf(dataDir) {
  const raw = itemsOf(readJson(join(dataDir, "tasks.json")), "tasks");
  const counts = {};
  for (const status of TASK_STATUSES) counts[status] = 0;
  const tasks = raw.map((item) => {
    const status = text(item.status, "queued");
    counts[status] = (counts[status] ?? 0) + 1;
    return {
      id: text(item.id),
      name: text(item.name) || text(item.url),
      url: text(item.url),
      status,
      size: numberOrNull(item.size),
      done: numberOrNull(item.done) ?? 0,
      error: text(item.error),
      created: numberOrNull(item.created)
    };
  });
  return { tasks, counts };
}
function historyOf(dataDir, limit) {
  const raw = itemsOf(readJson(join(dataDir, "history.json")), "items");
  return raw.slice(0, limit).map((item) => {
    const directory = text(item.directory);
    const name = text(item.name);
    return {
      name,
      url: text(item.url),
      size: numberOrNull(item.size),
      sha256: text(item.sha256),
      finished: numberOrNull(item.finished),
      host: text(item.host),
      exists: Boolean(directory && name && existsSync(join(directory, name)))
    };
  });
}
function snapshot() {
  const dir = appDir();
  const exe = join(dir, "portable", EXE_NAME);
  const mainPy = join(dir, "main.py");
  const exeInfo = fileInfo(exe);
  const portableData = join(dir, "portable", "data");
  const dataDir = exeInfo.exists || existsSync(portableData) ? portableData : join(dir, "data");
  const queue = queueOf(dataDir);
  return {
    app: {
      dir,
      exe,
      exe_exists: exeInfo.exists,
      exe_bytes: exeInfo.bytes,
      exe_updated_at: exeInfo.updated_at,
      source_exists: existsSync(mainPy),
      version: appVersion(mainPy),
      data_dir: dataDir,
      data_exists: existsSync(dataDir)
    },
    queue: { counts: queue.counts, total: queue.tasks.length },
    history: { count: historyOf(dataDir, Number.MAX_SAFE_INTEGER).length }
  };
}
function limitOf(request) {
  const parsed = Number(request.query.get("limit") ?? 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}
function missingApp(exe) {
  return {
    status: 404,
    headers: NO_STORE,
    body: {
      ok: false,
      error: { code: "downloader_app_missing", message: `\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D portable-\u0437\u0430\u0433\u0440\u0443\u0437\u0447\u0438\u043A: ${exe}` }
    }
  };
}
function launch() {
  const dir = appDir();
  const exe = join(dir, "portable", EXE_NAME);
  if (!existsSync(exe)) return missingApp(exe);
  try {
    const child = spawn(exe, [], { detached: true, stdio: "ignore", windowsHide: false });
    child.on("error", () => {
    });
    child.unref();
  } catch {
    return {
      status: 500,
      headers: NO_STORE,
      body: { ok: false, error: { code: "downloader_launch_failed", message: `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C ${exe}` } }
    };
  }
  return { status: 202, headers: NO_STORE, body: { ok: true, launched: true, exe } };
}
function reveal() {
  const dir = appDir();
  const exe = join(dir, "portable", EXE_NAME);
  const dataDir = existsSync(join(dir, "portable", "data")) || existsSync(exe) ? join(dir, "portable", "data") : join(dir, "data");
  if (!existsSync(dataDir)) {
    return {
      status: 404,
      headers: NO_STORE,
      body: { ok: false, error: { code: "downloader_data_missing", message: `\u041D\u0435\u0442 \u043F\u0430\u043F\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445: ${dataDir}` } }
    };
  }
  const opener = process.platform === "win32" ? "explorer.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  try {
    const child = spawn(opener, [dataDir], { detached: true, stdio: "ignore" });
    child.on("error", () => {
    });
    child.unref();
  } catch {
    return {
      status: 500,
      headers: NO_STORE,
      body: { ok: false, error: { code: "downloader_reveal_failed", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u0434\u0430\u043D\u043D\u044B\u0445" } }
    };
  }
  return { status: 202, headers: NO_STORE, body: { ok: true, opened: dataDir } };
}
var module = {
  id: "downloads",
  apiVersion: 1,
  permissions: ["process"],
  register(ctx) {
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", ...NO_STORE }
    }));
    ctx.api.add("GET", "/api/tools/downloads/status", () => ({
      headers: NO_STORE,
      body: { ok: true, ...snapshot() }
    }));
    ctx.api.add("GET", "/api/tools/downloads/tasks", () => {
      const dir = appDir();
      const dataDir = existsSync(join(dir, "portable", "data")) || existsSync(join(dir, "portable", EXE_NAME)) ? join(dir, "portable", "data") : join(dir, "data");
      const queue = queueOf(dataDir);
      return { headers: NO_STORE, body: { ok: true, tasks: queue.tasks, counts: queue.counts } };
    });
    ctx.api.add("GET", "/api/tools/downloads/history", (request) => {
      const dir = appDir();
      const dataDir = existsSync(join(dir, "portable", "data")) || existsSync(join(dir, "portable", EXE_NAME)) ? join(dir, "portable", "data") : join(dir, "data");
      const items = historyOf(dataDir, limitOf(request));
      return { headers: NO_STORE, body: { ok: true, items } };
    });
    ctx.api.add("POST", "/api/tools/downloads/launch", () => launch());
    ctx.api.add("POST", "/api/tools/downloads/reveal", () => reveal());
  }
};
var index_default = module;
export {
  index_default as default
};
