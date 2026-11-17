import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// team-host-api:src/adapters/http/router.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host2["Router"];
var ScopedRouter = host2["ScopedRouter"];

// modules/providers/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; padding: 20px 24px; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: var(--accent); font-size: 13px; }
  main { display: grid; gap: 20px; padding: 24px; max-width: 1040px; }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: var(--muted); font-weight: 600; }
  .guard { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel-soft); }
  .guard strong { display: block; }
  .guard small { color: var(--muted); }
  .guard-state { margin-left: auto; font-size: 12px; color: #e8ce8b; }
  .providers { display: grid; gap: 10px; }
  .provider { display: grid; grid-template-columns: minmax(170px, 1fr) minmax(220px, 1.4fr) auto; gap: 10px; align-items: start; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
  .provider-name { font-weight: 600; overflow-wrap: anywhere; }
  .provider-name small, .provider-details { display: block; color: var(--muted); font-weight: 400; font-size: 11px; overflow-wrap: anywhere; }
  .provider-details + .provider-details { margin-top: 3px; }
  .provider-name a { color: var(--accent); font-size: 11px; }
  .state, .kind { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--panel-soft); color: var(--muted); margin-left: 6px; }
  .kind { color: var(--accent); background: rgba(76, 201, 240, 0.14); }
  .state-ok { background: #1d3a2a; color: #8be0ab; }
  .state-missing { background: #3a3320; color: #e8ce8b; }
  .provider-actions { grid-column: 2 / -1; display: flex; gap: 8px; flex-wrap: wrap; }
  input[type="password"], input[type="text"], textarea { width: 100%; background: var(--bg); color: inherit; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font: inherit; }
  textarea { min-height: 74px; resize: vertical; }
  button { background: var(--accent); color: var(--on-accent); border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; font: inherit; }
  button.ghost { background: var(--panel-soft); color: var(--text); }
  button.danger { background: #51252c; color: #ffb5b5; }
  button:disabled { opacity: .6; cursor: default; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li.agent { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .meta { color: var(--muted); font-size: 12px; }
  .empty { color: var(--muted); }
  .result { min-height: 20px; font-size: 13px; }
  .result-ok { color: #8be0ab; }
  .result-error { color: #ff9a9a; }
  .custom-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .custom-form label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; }
  .custom-form .wide { grid-column: 1 / -1; }
  .custom-form .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .custom-form input[readonly] { opacity: .65; }
  @media (max-width: 760px) {
    .provider { grid-template-columns: 1fr; }
    .provider-actions { grid-column: 1; }
    .custom-form { grid-template-columns: 1fr; }
    .custom-form .wide { grid-column: 1; }
    .guard-state { margin-left: 0; }
  }
</style>
</head>
<body>
<header>
  <h1>\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B</h1>
  <a href="/m/tools/">\u2190 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B</a>
  <a href="/">\u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <section>
    <h2>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0435\u0440\u0435\u0434 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C</h2>
    <div class="guard">
      <label><input id="guard-enabled" type="checkbox"> \u041D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u0441 \u043C\u043E\u0434\u0435\u043B\u044C\u044E \u0431\u0435\u0437 \u043A\u043B\u044E\u0447\u0430</label>
      <span id="guard-state" class="guard-state">\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</span>
      <button id="guard-save" type="button" class="ghost">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
    </div>
    <p class="meta">\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u0435\u0442. \u0420\u0443\u0447\u043D\u043E\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u043D\u0435 \u0437\u0430\u0442\u0440\u0430\u0433\u0438\u0432\u0430\u0435\u0442\u0441\u044F.</p>
  </section>

  <section>
    <h2>\u041A\u043B\u044E\u0447\u0438 \u0438 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u044B</h2>
    <div id="providers" class="providers"><p class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</p></div>
    <p id="providers-result" class="result"></p>
  </section>

  <section>
    <h2 id="custom-heading">\u041A\u0430\u0441\u0442\u043E\u043C\u043D\u044B\u0439 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440</h2>
    <p class="meta">OpenAI-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 endpoint. \u041A\u043B\u044E\u0447 \u043C\u043E\u0436\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u043C\u0438 \u0438\u043B\u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u0432\u044B\u0448\u0435.</p>
    <form id="custom-form" class="custom-form">
      <label>ID
        <input id="custom-id" type="text" required pattern="[a-z][a-z0-9._-]{1,40}" placeholder="strata" autocomplete="off">
      </label>
      <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435
        <input id="custom-title" type="text" placeholder="Strata (local)" autocomplete="off">
      </label>
      <label class="wide">Base URL
        <input id="custom-base" type="text" required placeholder="http://127.0.0.1:8080/v1" autocomplete="off">
      </label>
      <label class="wide">\u041C\u043E\u0434\u0435\u043B\u0438
        <textarea id="custom-models" required placeholder="qwen3.8-flash-next&#10;iq3_s-8k"></textarea>
        <span class="meta">\u041F\u043E \u043E\u0434\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u0438\u043B\u0438 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E.</span>
      </label>
      <label>\u041C\u043E\u0434\u0435\u043B\u044C \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E
        <input id="custom-default" type="text" placeholder="\u043F\u0435\u0440\u0432\u0430\u044F \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430" autocomplete="off">
      </label>
      <label>API key
        <input id="custom-key" type="password" placeholder="\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E" autocomplete="off">
      </label>
      <div class="wide actions">
        <button id="custom-submit" type="submit">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430</button>
        <button id="custom-reset" type="button" class="ghost">\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C</button>
      </div>
    </form>
    <p id="custom-result" class="result"></p>
  </section>

  <section>
    <h2>\u0410\u0433\u0435\u043D\u0442\u044B \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F</h2>
    <ul id="agents"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
  </section>
</main>
<script>
(function () {
  var providersNode = document.getElementById('providers');
  var guardNode = document.getElementById('guard-enabled');
  var guardState = document.getElementById('guard-state');
  var agentsNode = document.getElementById('agents');
  var result = document.getElementById('providers-result');
  var customForm = document.getElementById('custom-form');
  var customHeading = document.getElementById('custom-heading');
  var customId = document.getElementById('custom-id');
  var customTitle = document.getElementById('custom-title');
  var customBase = document.getElementById('custom-base');
  var customModels = document.getElementById('custom-models');
  var customDefault = document.getElementById('custom-default');
  var customKey = document.getElementById('custom-key');
  var customSubmit = document.getElementById('custom-submit');
  var customResult = document.getElementById('custom-result');
  var providersData = [];
  var editingCustom = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
        if (!response.ok) {
          throw new Error(body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status);
        }
        return body;
      });
    });
  }

  function showResult(text, ok) {
    result.textContent = text;
    result.className = 'result ' + (ok ? 'result-ok' : 'result-error');
  }

  function showCustomResult(text, ok) {
    customResult.textContent = text;
    customResult.className = 'result ' + (ok ? 'result-ok' : 'result-error');
  }

  function providerById(id) {
    for (var i = 0; i < providersData.length; i += 1) {
      if (providersData[i].id === id) return providersData[i];
    }
    return null;
  }

  function renderProviders(providers) {
    providersData = providers || [];
    if (!providersData.length) {
      providersNode.innerHTML = '<p class="empty">\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.</p>';
      return;
    }
    providersNode.innerHTML = providersData.map(function (provider) {
      var custom = provider.kind === 'custom';
      var details = custom
        ? '<small class="provider-details">' + esc(provider.base_url) + '</small>'
          + '<small class="provider-details">\u043C\u043E\u0434\u0435\u043B\u0438: ' + esc((provider.models || []).join(', ') || '\u2014') + '</small>'
          + (provider.default_model ? '<small class="provider-details">\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E: ' + esc(provider.default_model) + '</small>' : '')
        : '<small>' + esc(provider.env)
          + (provider.link ? ' \xB7 <a href="' + esc(provider.link) + '" target="_blank" rel="noreferrer">\u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043A\u043B\u044E\u0447</a>' : '')
          + '</small>';
      return '<div class="provider">'
        + '<div class="provider-name">' + esc(provider.title)
        + '<span class="state ' + (provider.configured ? 'state-ok' : 'state-missing') + '">'
        + (provider.configured ? '\u043A\u043B\u044E\u0447 \u0435\u0441\u0442\u044C' : '\u043D\u0443\u0436\u0435\u043D \u043A\u043B\u044E\u0447') + '</span>'
        + '<span class="kind">' + (custom ? '\u043A\u0430\u0441\u0442\u043E\u043C\u043D\u044B\u0439' : '\u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439') + '</span>'
        + details + '</div>'
        + '<input id="provider-' + esc(provider.id) + '" type="password" autocomplete="off" placeholder="'
        + (provider.configured ? '\u043D\u043E\u0432\u044B\u0439 \u043A\u043B\u044E\u0447 (\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C)' : '\u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043A\u043B\u044E\u0447') + '">'
        + '<button type="button" data-save="' + esc(provider.id) + '">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>'
        + (custom
          ? '<div class="provider-actions">'
            + '<button type="button" class="ghost" data-edit="' + esc(provider.id) + '">\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C</button>'
            + '<button type="button" class="danger" data-remove="' + esc(provider.id) + '">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>'
            + '</div>'
          : '')
        + '</div>';
    }).join('');
  }

  function renderAgents(agents) {
    var items = agents && agents.items ? agents.items : [];
    if (!items.length) {
      agentsNode.innerHTML = '<li class="empty">\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043D\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432.</li>';
      return;
    }
    agentsNode.innerHTML = items.map(function (agent) {
      return '<li class="agent"><strong>' + esc(agent.id) + '</strong>'
        + '<span class="meta">' + esc(agent.description || agent.kind || '') + '</span></li>';
    }).join('');
  }

  function resetCustom() {
    editingCustom = null;
    customForm.reset();
    customId.readOnly = false;
    customSubmit.textContent = '\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430';
    customHeading.textContent = '\u041A\u0430\u0441\u0442\u043E\u043C\u043D\u044B\u0439 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440';
    showCustomResult('', true);
  }

  function fillCustom(provider) {
    editingCustom = provider.id;
    customId.value = provider.id;
    customId.readOnly = true;
    customTitle.value = provider.title || '';
    customBase.value = provider.base_url || '';
    customModels.value = (provider.models || []).join('\\n');
    customDefault.value = provider.default_model || '';
    customKey.value = '';
    customSubmit.textContent = '\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F';
    customHeading.textContent = '\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C: ' + (provider.title || provider.id);
    showCustomResult('\u041A\u043B\u044E\u0447 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u0443\u0441\u0442\u044B\u043C, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C.', true);
    customHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function load() {
    return request('/api/providers').then(function (body) {
      renderProviders(body.providers || []);
      var guard = body.guard || {};
      guardNode.checked = Boolean(guard.enabled);
      guardState.textContent = guard.enabled
        ? (guard.auto_start_allowed ? '\u043A\u043B\u044E\u0447\u0435\u0439 \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E' : '\u043D\u0443\u0436\u0435\u043D \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u0438\u043D \u043A\u043B\u044E\u0447')
        : '\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430';
      renderAgents(body.agents);
    }).catch(function (error) {
      providersNode.innerHTML = '<p class="result-error">' + esc(error.message) + '</p>';
      guardState.textContent = '\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C';
      agentsNode.innerHTML = '<li class="result-error">' + esc(error.message) + '</li>';
    });
  }

  providersNode.addEventListener('click', function (event) {
    var saveButton = event.target.closest('[data-save]');
    var editButton = event.target.closest('[data-edit]');
    var removeButton = event.target.closest('[data-remove]');
    if (editButton) {
      var provider = providerById(editButton.getAttribute('data-edit'));
      if (provider) fillCustom(provider);
      return;
    }
    if (removeButton) {
      var removeId = removeButton.getAttribute('data-remove');
      if (!window.confirm('\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u0430\u0441\u0442\u043E\u043C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430 \xAB' + removeId + '\xBB \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u043A\u043B\u044E\u0447\u043E\u043C?')) return;
      removeButton.disabled = true;
      request('/api/providers/custom/' + encodeURIComponent(removeId), { method: 'DELETE' })
        .then(function (body) {
          if (editingCustom === removeId) resetCustom();
          renderProviders(body.providers || []);
          showResult('\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0443\u0434\u0430\u043B\u0451\u043D.', true);
        })
        .catch(function (error) { showResult(error.message, false); })
        .then(function () { removeButton.disabled = false; });
      return;
    }
    if (!saveButton) return;
    var id = saveButton.getAttribute('data-save');
    var input = document.getElementById('provider-' + id);
    if (!input || !input.value.trim()) {
      showResult('\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043B\u044E\u0447 \u0438\u043B\u0438 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u043B\u0435 \u043F\u0443\u0441\u0442\u044B\u043C.', false);
      return;
    }
    saveButton.disabled = true;
    request('/api/providers/configure', { method: 'POST', body: { id: id, key: input.value.trim() } })
      .then(function (body) {
        renderProviders(body.providers || []);
        showResult('\u041A\u043B\u044E\u0447 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.', true);
      })
      .catch(function (error) { showResult(error.message, false); })
      .then(function () { saveButton.disabled = false; });
  });

  customForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var id = customId.value.trim().toLowerCase();
    var baseUrl = customBase.value.trim();
    var models = customModels.value.split(/[\\n,]+/).map(function (model) { return model.trim(); }).filter(Boolean);
    if (!id) { showCustomResult('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 ID \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430.', false); return; }
    if (!baseUrl) { showCustomResult('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 base URL.', false); return; }
    if (!models.length) { showCustomResult('\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u043C\u043E\u0434\u0435\u043B\u044C.', false); return; }
    var body = {
      id: id,
      title: customTitle.value.trim(),
      base_url: baseUrl,
      models: models,
      default_model: customDefault.value.trim(),
      key: customKey.value.trim()
    };
    var path = editingCustom ? '/api/providers/custom/' + encodeURIComponent(editingCustom) : '/api/providers/custom';
    customSubmit.disabled = true;
    request(path, { method: editingCustom ? 'PUT' : 'POST', body: body })
      .then(function (body) {
        renderProviders(body.providers || []);
        resetCustom();
        showCustomResult('\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D. \u0415\u0433\u043E base URL \u0438 \u043C\u043E\u0434\u0435\u043B\u0438 \u0443\u0436\u0435 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435.', true);
      })
      .catch(function (error) { showCustomResult(error.message, false); })
      .then(function () { customSubmit.disabled = false; });
  });

  document.getElementById('custom-reset').addEventListener('click', function () {
    resetCustom();
  });

  document.getElementById('guard-save').addEventListener('click', function () {
    request('/api/providers/guard', { method: 'PUT', body: { enabled: guardNode.checked } })
      .then(function (body) {
        var guard = body.guard || {};
        guardState.textContent = guard.enabled
          ? (guard.auto_start_allowed ? '\u043A\u043B\u044E\u0447\u0435\u0439 \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E' : '\u043D\u0443\u0436\u0435\u043D \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u0438\u043D \u043A\u043B\u044E\u0447')
          : '\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430';
        showResult('\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430.', true);
      })
      .catch(function (error) { showResult(error.message, false); });
  });

  load();
})();
</script>
</body>
</html>
`;

// modules/providers/index.ts
function textField(body, name, required = true) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (value === void 0 || value === null || value === "") {
    if (required) throw new ValidationError(`\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 ${name}`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  return value.trim();
}
var module = {
  id: "providers",
  apiVersion: 1,
  register(ctx) {
    const host3 = ctx.require("tools");
    const api = new ScopedRouter(["/api/providers"]);
    api.add("GET", "/api/providers", () => ({
      body: {
        ok: true,
        providers: host3.tools.providerList(),
        guard: host3.toolbox.providerGuard(),
        agents: host3.tools.agents()
      }
    }));
    api.add("PUT", "/api/providers/guard", (c) => ({
      body: { ok: true, guard: host3.toolbox.configureProviderGuard(c.body) }
    }));
    api.add("POST", "/api/providers/configure", (c) => {
      const settings = host3.tools.configureProvider(
        textField(c.body, "id"),
        textField(c.body, "key", false)
      );
      return {
        body: { ok: true, providers: host3.tools.providerList(), settings }
      };
    });
    api.add("POST", "/api/providers/custom", (c) => {
      const settings = host3.tools.configureCustomProvider(c.body);
      return {
        body: { ok: true, providers: host3.tools.providerList(), settings }
      };
    });
    api.add("PUT", "/api/providers/custom/:id", (c) => {
      const id = String(c.params.id ?? "");
      const body = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? { ...c.body, id } : { id };
      const settings = host3.tools.configureCustomProvider(body);
      return {
        body: { ok: true, providers: host3.tools.providerList(), settings }
      };
    });
    api.add("DELETE", "/api/providers/custom/:id", (c) => {
      const settings = host3.tools.removeCustomProvider(String(c.params.id ?? ""));
      return {
        body: { ok: true, providers: host3.tools.providerList(), settings }
      };
    });
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.log.info("\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B");
  }
};
var index_default = module;
export {
  index_default as default
};
