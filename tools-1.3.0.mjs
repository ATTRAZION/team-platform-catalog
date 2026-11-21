import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

// modules/tools/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; padding: 20px 24px; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: var(--accent); font-size: 13px; }
  main { display: grid; gap: 20px; padding: 24px; max-width: 1000px; }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: var(--muted); font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li.row { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  li.row .grow { flex: 1; min-width: 180px; }
  [hidden] { display: none !important; }
  li.service-card { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--panel-soft); }
  .service-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 11px 12px; }
  .service-head .grow { flex: 1; min-width: 180px; }
  .service-actions { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
  .link-action { color: var(--accent); font-size: 13px; text-decoration: none; padding: 6px 8px; border-radius: 8px; background: var(--panel-soft); }
  .link-action:hover { background: var(--panel-soft); }
  .service-settings { border-top: 1px solid var(--line); padding: 12px; background: var(--panel); display: grid; gap: 10px; }
  .settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .field { display: grid; gap: 4px; font-size: 12px; color: var(--muted); }
  .field input, .field select { width: 100%; }
  @media (max-width: 760px) { .settings-grid { grid-template-columns: 1fr; } }
  .title { font-weight: 600; }
  .meta { color: var(--muted); font-size: 12px; }
  .state { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--panel-soft); color: var(--muted); text-transform: uppercase; }
  .state-ok { background: #1d3a2a; color: #8be0ab; }
  .state-error { background: #3a2426; color: #ff9a9a; }
  .state-setup { background: #3a3320; color: #e8ce8b; }
  input, select { background: var(--bg); color: inherit; border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font: inherit; }
  input[type="number"] { width: 90px; }
  button { background: var(--accent); color: var(--on-accent); border: 0; border-radius: 8px; padding: 7px 12px; cursor: pointer; font: inherit; font-size: 13px; }
  button.ghost { background: var(--panel-soft); color: var(--text); }
  button.danger { background: transparent; border: 1px solid rgba(255,107,107,.4); color: #ff9a9a; }
  button:disabled { opacity: .6; cursor: default; }
  .controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
  .controls label { display: flex; gap: 6px; align-items: center; font-size: 13px; color: var(--muted); }
  .empty { color: var(--muted); }
  .result { min-height: 20px; font-size: 13px; }
  .result-ok { color: #8be0ab; }
  .result-error { color: #ff9a9a; }
  .site-form { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; margin-top: 10px; }
  @media (max-width: 760px) { .site-form { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <h1>\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B</h1>
  <a href="/m/providers/">\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B \u2192</a>
  <a href="/">\u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <section>
    <h2>\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 <button id="refresh" class="ghost" type="button">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button></h2>
    <ul id="tools"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
    <p id="tools-result" class="result"></p>
  </section>

  <section id="reserve-section">
    <h2>\u0420\u0435\u0437\u0435\u0440\u0432 \u0437\u0430\u0434\u0430\u0447</h2>
    <div class="controls">
      <label><input id="reserve-enabled" type="checkbox"> \u0412\u043A\u043B\u044E\u0447\u0451\u043D</label>
      <label>\u041B\u0438\u043C\u0438\u0442 <input id="reserve-limit" type="number" min="1" max="50"></label>
      <button id="reserve-save" type="button">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
      <span id="reserve-state" class="meta"></span>
    </div>
    <ul id="reserve-items"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
    <div id="reserve-candidates"></div>
  </section>

  <section id="spare-section">
    <h2>\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F</h2>
    <div class="controls">
      <label><input id="spare-enabled" type="checkbox"> \u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E</label>
      <label>\u0421 <input id="spare-start" type="number" min="0" max="23"></label>
      <label>\u0414\u043E <input id="spare-end" type="number" min="0" max="23"></label>
      <label>\u041B\u0438\u043C\u0438\u0442, \u043C\u0438\u043D <input id="spare-limit" type="number" min="0" max="1440"></label>
      <button id="spare-save" type="button">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
    </div>
    <div class="controls">
      <button class="ghost" type="button" data-override="auto">\u0410\u0432\u0442\u043E</button>
      <button class="ghost" type="button" data-override="open">\u041E\u0442\u043A\u0440\u044B\u0442\u044C</button>
      <button class="ghost" type="button" data-override="closed">\u0417\u0430\u043A\u0440\u044B\u0442\u044C</button>
      <span id="spare-state" class="meta"></span>
    </div>
  </section>

  <section id="sites-section">
    <h2>\u041F\u0430\u0440\u043E\u043B\u0438 \u0441\u0430\u0439\u0442\u043E\u0432</h2>
    <ul id="sites"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
    <div class="site-form">
      <input id="site-name" placeholder="\u0441\u0430\u0439\u0442, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 strata" autocomplete="off">
      <input id="site-field" placeholder="\u043F\u043E\u043B\u0435, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 api_key" autocomplete="off">
      <input id="site-value" type="password" placeholder="\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435" autocomplete="off">
      <button id="site-save" type="button">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
    </div>
  </section>
</main>
<script>
(function () {
  var state = { catalog: null, reserve: null, spare: null, openSettings: null };

  var SETUP = {
    github: [
      { name: 'owner', label: '\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 / \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0446\u0438\u044F', placeholder: '\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, ATTRAZION' },
      { name: 'token', label: 'Personal access token', type: 'password', placeholder: '\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C' }
    ],
    discord: [
      { name: 'bot_token', label: '\u0422\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430', type: 'password', placeholder: '\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C' },
      { name: 'webhook_url', label: 'URL \u0432\u0435\u0431\u0445\u0443\u043A\u0430', type: 'password', placeholder: 'https://discord.com/api/webhooks/\u2026' },
      { name: 'channel_id', label: 'ID \u043A\u0430\u043D\u0430\u043B\u0430 \u0431\u043E\u0442\u0430', placeholder: '1234567890' },
      { name: 'application_id', label: 'Application ID (Rich Presence)', placeholder: '1234567890' },
      { name: 'user_token', label: '\u0422\u043E\u043A\u0435\u043D \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430', type: 'password', placeholder: '\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C' }
    ],
    google: [
      { name: 'client_id', label: 'OAuth client_id', placeholder: '\u2026apps.googleusercontent.com' },
      { name: 'client_secret', label: 'client_secret', type: 'password', placeholder: '\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C' },
      { name: 'refresh_token', label: 'refresh_token', type: 'password', placeholder: '\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C' }
    ],
    telegram: [
      { name: 'api_id', label: 'api_id', type: 'number', placeholder: '\u0441 my.telegram.org' },
      { name: 'api_hash', label: 'api_hash', type: 'password', placeholder: '\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C' },
      { name: 'mode', label: '\u0420\u0435\u0436\u0438\u043C', type: 'select', options: [
        ['off', '\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D'], ['watch', '\u041D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435'], ['answer', '\u041F\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0443 \u0438 \u043E\u0442\u0432\u0435\u0447\u0430\u0442\u044C']
      ] }
    ],
    entire: [
      { name: 'repo_path', label: '\u041F\u0443\u0442\u044C \u043A \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044E', placeholder: 'D:\\work\\project' },
      { name: 'cli_path', label: '\u041F\u0443\u0442\u044C \u043A Entire CLI', placeholder: 'entire' }
    ]
  };
  var SECTION_LINKS = { sites: 'sites-section', reserve: 'reserve-section', spare: 'spare-section' };
  var MODULE_LINKS = {
    github: 'github', discord: 'discord', google: 'google', telegram: 'telegram',
    entire: 'entire', freebuff: 'freebuff', browser: 'browser'
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function request(path, options) {
    options = options || {};
    return fetch(path, {
      method: options.method || 'GET',
      headers: { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store'
    }).then(function (response) {
      return response.text().then(function (text) {
        var body = null;
        try { body = text ? JSON.parse(text) : null; } catch (ignore) { body = null; }
        if (!response.ok) throw new Error(body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status);
        return body;
      });
    });
  }

  function result(text, ok) {
    var node = document.getElementById('tools-result');
    node.textContent = text;
    node.className = 'result ' + (ok ? 'result-ok' : 'result-error');
  }

  function stateClass(value) {
    if (value === 'ok' || value === 'configured') return 'state state-ok';
    if (value === 'error') return 'state state-error';
    if (value === 'setup' || value === 'not_configured') return 'state state-setup';
    return 'state';
  }

  function stateLabel(value) {
    return ({ ok: '\u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442', configured: '\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E', setup: '\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E', error: '\u043E\u0448\u0438\u0431\u043A\u0430', off: '\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E' })[value] || value;
  }

  function currentValue(id, name) {
    var settings = state.catalog && state.catalog.settings;
    var block = settings && settings[id];
    var value = block && block[name];
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }

  function fieldHtml(id, field) {
    var value = field.type === 'password' ? '' : currentValue(id, field.name);
    var placeholder = field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '';
    if (field.type === 'select') {
      return '<div class="field"><label>' + esc(field.label) + '</label><select name="' + esc(field.name) + '">'
        + (field.options || []).map(function (option) {
          return '<option value="' + esc(option[0]) + '"' + (value === option[0] ? ' selected' : '') + '>'
            + esc(option[1]) + '</option>';
        }).join('')
        + '</select></div>';
    }
    return '<div class="field"><label>' + esc(field.label) + '</label><input name="' + esc(field.name)
      + '" type="' + esc(field.type || 'text') + '"' + placeholder
      + (value ? ' value="' + esc(value) + '"' : '') + ' autocomplete="off"></div>';
  }

  function settingsPanel(id) {
    var fields = SETUP[id];
    if (!fields) return '';
    return '<form class="service-settings" data-settings="' + esc(id) + '"'
      + (state.openSettings === id ? '' : ' hidden') + '>'
      + '<div class="settings-grid">' + fields.map(function (field) { return fieldHtml(id, field); }).join('') + '</div>'
      + '<div class="controls"><button type="submit">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>'
      + '<span class="meta">\u0421\u0435\u043A\u0440\u0435\u0442\u044B \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F; \u043F\u0443\u0441\u0442\u043E\u0435 \u043F\u043E\u043B\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F.</span></div></form>';
  }

  function renderTools(items) {
    var node = document.getElementById('tools');
    items = items.filter(function (item) { return item.id !== 'providers'; });
    if (!items.length) {
      node.innerHTML = '<li class="empty">\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.</li>';
      return;
    }
    node.innerHTML = items.map(function (item) {
      var canTest = item.id === 'github' || item.id === 'discord' || item.id === 'google';
      var setup = SETUP[item.id];
      var actions = [];
      if (setup) {
        actions.push('<button class="ghost" type="button" data-configure="' + esc(item.id) + '">'
          + (state.openSettings === item.id ? '\u0421\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438' : '\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C') + '</button>');
      }
      if (canTest) actions.push('<button class="ghost" type="button" data-test="' + esc(item.id) + '">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</button>');
      if (SECTION_LINKS[item.id]) {
        actions.push('<button class="ghost" type="button" data-scroll="' + esc(SECTION_LINKS[item.id]) + '">\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C</button>');
      }
      if (MODULE_LINKS[item.id]) {
        actions.push('<a class="link-action" href="/m/' + esc(MODULE_LINKS[item.id]) + '/">\u041E\u0442\u043A\u0440\u044B\u0442\u044C</a>');
      }
      return '<li class="service-card"><div class="service-head"><div class="grow"><span class="title">' + esc(item.title) + '</span> '
        + '<span class="' + stateClass(item.state) + '">' + esc(stateLabel(item.state)) + '</span>'
        + (item.summary ? '<div class="meta">' + esc(item.summary) + '</div>' : '')
        + '</div><div class="service-actions">' + actions.join('') + '</div></div>'
        + settingsPanel(item.id) + '</li>';
    }).join('');
  }

  function renderReserve(body) {
    var value = body || {};
    state.reserve = value;
    document.getElementById('reserve-enabled').checked = Boolean(value.enabled);
    document.getElementById('reserve-limit').value = value.limit == null ? 5 : value.limit;
    document.getElementById('reserve-state').textContent = value.settings_error
      ? '\u043E\u0448\u0438\u0431\u043A\u0430 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A'
      : '\u0437\u0430\u043D\u044F\u0442\u043E ' + (value.used || 0) + ' \u0438\u0437 ' + (value.limit || 0);
    var items = value.items || [];
    var node = document.getElementById('reserve-items');
    node.innerHTML = items.length
      ? items.map(function (item) {
          return '<li class="row"><span class="grow"><span class="title">' + esc(item.title || item.task_id || item.id)
            + '</span><div class="meta">' + esc(item.status || '') + '</div></span>'
            + '<button class="danger" type="button" data-reserve-remove="' + esc(item.task_id || item.id) + '">\u0423\u0431\u0440\u0430\u0442\u044C</button></li>';
        }).join('')
      : '<li class="empty">\u0420\u0435\u0437\u0435\u0440\u0432 \u043F\u0443\u0441\u0442.</li>';
    var candidates = value.candidates || [];
    document.getElementById('reserve-candidates').innerHTML = candidates.length
      ? '<div class="meta" style="margin-top:10px">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0440\u0435\u0437\u0435\u0440\u0432:</div><div class="controls">'
        + candidates.map(function (task) {
            return '<button class="ghost" type="button" data-reserve-add="' + esc(task.id) + '">'
              + esc(task.title) + '</button>';
          }).join('') + '</div>'
      : '';
  }

  function renderSpare(value) {
    state.spare = value || {};
    var spare = state.spare;
    document.getElementById('spare-enabled').checked = Boolean(spare.enabled);
    document.getElementById('spare-start').value = spare.start_hour == null ? 19 : spare.start_hour;
    document.getElementById('spare-end').value = spare.end_hour == null ? 8 : spare.end_hour;
    document.getElementById('spare-limit').value = spare.daily_limit_minutes == null ? 240 : spare.daily_limit_minutes;
    var label = spare.active ? '\u0430\u043A\u0442\u0438\u0432\u043D\u043E' : '\u043D\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u043E';
    if (spare.override) label += ' \xB7 \u0432\u0440\u0443\u0447\u043D\u0443\u044E: ' + spare.override;
    if (spare.reason) label += ' \xB7 ' + spare.reason;
    document.getElementById('spare-state').textContent = label;
  }

  function renderSites(body) {
    var sites = body || {};
    var entries = sites.entries || [];
    var node = document.getElementById('sites');
    node.innerHTML = entries.length
      ? entries.map(function (entry) {
          return '<li class="row"><span class="grow"><span class="title">' + esc(entry.site) + '</span>'
            + '<div class="meta">' + (entry.fields || []).map(function (field) { return '<code>' + esc(field) + '</code>'; }).join(', ')
            + '</div></span><button class="danger" type="button" data-site-remove="' + esc(entry.site) + '">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button></li>';
        }).join('')
      : '<li class="empty">\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0441\u0430\u0439\u0442\u043E\u0432 \u043D\u0435\u0442.</li>';
  }

  function load() {
    return Promise.all([
      request('/api/tools').then(function (body) { state.catalog = body; renderTools(body.items || []); }),
      request('/api/tools/reserve').then(function (body) { renderReserve(body.state); }),
      request('/api/tools/spare').then(function (body) { renderSpare(body.state); }),
      request('/api/tools/vault').then(function (body) { renderSites(body); })
    ]).catch(function (error) { result(error.message, false); });
  }

  document.getElementById('refresh').addEventListener('click', function () {
    result('\u041E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u2026', true);
    load().then(function () { result('\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E.', true); });
  });

  document.getElementById('tools').addEventListener('click', function (event) {
    var configure = event.target.closest('[data-configure]');
    if (configure) {
      var configureId = configure.getAttribute('data-configure');
      state.openSettings = state.openSettings === configureId ? null : configureId;
      renderTools((state.catalog && state.catalog.items) || []);
      return;
    }
    var scroll = event.target.closest('[data-scroll]');
    if (scroll) {
      var section = document.getElementById(scroll.getAttribute('data-scroll'));
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var button = event.target.closest('[data-test]');
    if (!button) return;
    var id = button.getAttribute('data-test');
    button.disabled = true;
    request('/api/tools/' + encodeURIComponent(id) + '/test', { method: 'POST' })
      .then(function (body) {
        result('\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 ' + id + ': ' + (body.status && body.status.summary ? body.status.summary : '\u0433\u043E\u0442\u043E\u0432\u043E'), true);
        return load();
      })
      .catch(function (error) { result(error.message, false); })
      .then(function () { button.disabled = false; });
  });

  document.getElementById('tools').addEventListener('submit', function (event) {
    var form = event.target.closest('[data-settings]');
    if (!form) return;
    event.preventDefault();
    var id = form.getAttribute('data-settings');
    var body = {};
    Array.prototype.forEach.call(form.querySelectorAll('input, select'), function (input) {
      if (input.value === '') return;
      body[input.name] = input.type === 'number' ? Number(input.value) : input.value;
    });
    if (!Object.keys(body).length) {
      result('\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u043F\u043E\u043B\u0435.', false);
      return;
    }
    var path = id === 'entire'
      ? '/api/tools/entire/settings'
      : '/api/tools/' + encodeURIComponent(id) + '/configure';
    request(path, { method: id === 'entire' ? 'PUT' : 'POST', body: body })
      .then(function () {
        state.openSettings = id;
        result('\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \xAB' + id + '\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.', true);
        return load();
      })
      .catch(function (error) { result(error.message, false); });
  });

  document.getElementById('reserve-save').addEventListener('click', function () {
    request('/api/tools/reserve', { method: 'PUT', body: {
      enabled: document.getElementById('reserve-enabled').checked,
      limit: Number(document.getElementById('reserve-limit').value)
    } }).then(function (body) { renderReserve(body.state); result('\u0420\u0435\u0437\u0435\u0440\u0432 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.', true); })
      .catch(function (error) { result(error.message, false); });
  });

  document.getElementById('reserve-items').addEventListener('click', function (event) {
    var button = event.target.closest('[data-reserve-remove]');
    if (!button) return;
    request('/api/tools/reserve/items/' + encodeURIComponent(button.getAttribute('data-reserve-remove')), { method: 'DELETE' })
      .then(function (body) { renderReserve(body.state); result('\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0443\u0431\u0440\u0430\u043D\u0430 \u0438\u0437 \u0440\u0435\u0437\u0435\u0440\u0432\u0430.', true); })
      .catch(function (error) { result(error.message, false); });
  });

  document.getElementById('reserve-candidates').addEventListener('click', function (event) {
    var button = event.target.closest('[data-reserve-add]');
    if (!button) return;
    request('/api/tools/reserve/items', { method: 'POST', body: { task_id: button.getAttribute('data-reserve-add') } })
      .then(function (body) { renderReserve(body.state); result('\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 \u0440\u0435\u0437\u0435\u0440\u0432.', true); })
      .catch(function (error) { result(error.message, false); });
  });

  document.getElementById('spare-save').addEventListener('click', function () {
    request('/api/tools/spare', { method: 'PUT', body: {
      enabled: document.getElementById('spare-enabled').checked,
      start_hour: Number(document.getElementById('spare-start').value),
      end_hour: Number(document.getElementById('spare-end').value),
      daily_limit_minutes: Number(document.getElementById('spare-limit').value)
    } }).then(function (body) { renderSpare(body.state); result('\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E.', true); })
      .catch(function (error) { result(error.message, false); });
  });

  document.querySelectorAll('[data-override]').forEach(function (button) {
    button.addEventListener('click', function () {
      request('/api/tools/spare/override', { method: 'POST', body: { override: button.getAttribute('data-override') } })
        .then(function (body) { renderSpare(body.state); result('\u0420\u0435\u0436\u0438\u043C \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D.', true); })
        .catch(function (error) { result(error.message, false); });
    });
  });

  document.getElementById('site-save').addEventListener('click', function () {
    var site = document.getElementById('site-name').value.trim();
    var field = document.getElementById('site-field').value.trim();
    var value = document.getElementById('site-value').value;
    if (!site || !field || !value) { result('\u041D\u0443\u0436\u043D\u044B \u0441\u0430\u0439\u0442, \u043F\u043E\u043B\u0435 \u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.', false); return; }
    request('/api/tools/sites/configure', { method: 'POST', body: { site: site, fields: { [field]: value } } })
      .then(function (body) {
        document.getElementById('site-value').value = '';
        result('\u041F\u043E\u043B\u0435 \u0441\u0430\u0439\u0442\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E.', true);
        return request('/api/tools/vault').then(function (vault) { renderSites(vault); });
      })
      .catch(function (error) { result(error.message, false); });
  });

  document.getElementById('sites').addEventListener('click', function (event) {
    var button = event.target.closest('[data-site-remove]');
    if (!button) return;
    request('/api/tools/sites/' + encodeURIComponent(button.getAttribute('data-site-remove')), { method: 'DELETE' })
      .then(function () { return request('/api/tools/vault').then(function (body) { renderSites(body); }); })
      .then(function () { result('\u0421\u0430\u0439\u0442 \u0443\u0434\u0430\u043B\u0451\u043D.', true); })
      .catch(function (error) { result(error.message, false); });
  });

  load();
})();
</script>
</body>
</html>
`;

// modules/tools/index.ts
var module = {
  id: "tools",
  apiVersion: 1,
  // Ровно те права, которые называет публикация `kernel/tools@1`
  // (схема v2, D-043): хранилище, события, сеть, процессы Entire CLI
  // и секреты интеграций. Выдача ручки без любого из них отклоняется ядром.
  permissions: ["storage", "events", "network", "process", "secrets"],
  requiresKernel: [{ name: "tools", contractVersion: 1 }],
  register(ctx) {
    const kernel = ctx.kernelServices.require("tools");
    kernel.resetEnabled();
    ctx.publish({
      tools: kernel.tools,
      toolbox: kernel.toolbox,
      entire: kernel.entire,
      store: kernel.store,
      registerRoutes: (router) => {
        kernel.registerRoutes(router);
      },
      page: (id, title, summary) => kernel.page(id, title, summary)
    });
    const core = new ScopedRouter(kernel.integrationPrefixes(), "deny");
    kernel.registerRoutes(core);
    ctx.api.mount("/", core);
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
