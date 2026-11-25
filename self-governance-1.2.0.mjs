import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/self-governance/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>\u0421\u0430\u043C\u043E\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u0438 \u0440\u0438\u0441\u043A\u0438</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:18px;color:#e8ecf3;background:
 radial-gradient(1200px 400px at 12% -8%,rgba(255,86,86,.14),transparent 60%),
 radial-gradient(900px 380px at 92% 0%,rgba(47,109,246,.12),transparent 55%),#0e1015}
header{border:1px solid #3a2130;border-left:4px solid #ff5a5a;border-radius:12px;padding:14px 16px;background:#14101a;margin-bottom:14px}
h1{font-size:21px;margin:0 0 4px;letter-spacing:.2px}
h2{font-size:15px;margin:20px 0 8px}
.hint{color:#a7b1c4;margin:0;max-width:92ch}
#status{margin:10px 0 0;font-size:13px;color:#9ee6bd;white-space:pre-wrap}
#status.err{color:#ff9c9c}
.capnote{margin:8px 0 0;font-size:13px;color:#9ee6bd;max-width:92ch}
.capnote.err{color:#ff9c9c}
.unit{font-size:12px;color:#a7b1c4}
.forever{display:inline-flex;gap:4px;align-items:center;font-size:13px;color:#c8d2e2}
input:disabled{opacity:.45}
.mode{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
.badge{padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600}
.badge.calm{background:#173226;color:#9ee6bd}
.badge.hot{background:#3a1f2a;color:#ffb3b3}
.badge.stop{background:#4a1114;color:#ffd2d2}
.who{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
label{font-size:13px;color:#c8d2e2}
input{background:#1b2130;border:1px solid #2c3648;border-radius:8px;color:#e8ecf3;padding:6px 8px;font:inherit}
input.phrase{border-color:#5a3a2a;min-width:280px}
input:focus{outline:2px solid #2f6df6;outline-offset:1px}
button{border:0;border-radius:8px;padding:7px 13px;background:#2f6df6;color:#fff;cursor:pointer;font:inherit}
button.stop{background:#8d1f2b;font-weight:700}
button.red{background:transparent;border:1px solid #ff5a5a;color:#ffb3b3;font-weight:600}
button.ghost{background:#232a36;color:#cfd8e6}
button.small{padding:4px 10px;font-size:13px}
button:disabled{opacity:.45;cursor:not-allowed}
.cap{border:1px solid #232a36;border-radius:12px;padding:12px 14px;margin:0 0 10px;background:#12151d}
.cap.danger{border-color:#3a2a24}
.cap.locked{border-color:#2b2f3a;background:#101319}
.cap-top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.cap-title{font-weight:650;font-size:15px}
.pill{padding:1px 9px;border-radius:999px;font-size:12px;background:#22304a;color:#cfe0ff}
.pill.on{background:#173a29;color:#9ee6bd}
.pill.off{background:#2a2f3b;color:#a7b1c4}
.pill.expired{background:#3a2c14;color:#ffd9a0}
.pill.lock{background:#3b1a20;color:#ffb3b3}
.facts{margin:8px 0 0;padding:0;list-style:none;color:#b6c0d2;font-size:13px}
.facts li{margin:3px 0}
.facts b{color:#e8ecf3;font-weight:600}
.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
.meta{font-size:12px;color:#8e9aad;margin-top:8px;word-break:break-word}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:5px 8px;border-bottom:1px solid #1e2531;vertical-align:top}
th{color:#8e9aad;font-weight:600}
.locknote{margin-top:8px;padding:8px 10px;border-radius:8px;background:#1b1116;border:1px solid #3b1a20;color:#ffc4c4;font-size:13px}
.foot{margin-top:16px;color:#8e9aad;font-size:12px;max-width:92ch}
</style>
</head>
<body>
<header>
  <h1>\u0421\u0430\u043C\u043E\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u0438 \u0440\u0438\u0441\u043A\u0438</h1>
  <p class="hint">\u0417\u0434\u0435\u0441\u044C \u0440\u0435\u0448\u0430\u0435\u0442\u0441\u044F, \u0447\u0442\u043E \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0438\u043C\u0435\u0435\u0442 \u043F\u0440\u0430\u0432\u043E \u0434\u0435\u043B\u0430\u0442\u044C \u0431\u0435\u0437 \u0432\u0430\u0441. \u041F\u0440\u0430\u0432\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u044F\u0434\u0440\u043E\u043C \u0432 \u0441\u0430\u043C\u043E\u0439 \u0442\u043E\u0447\u043A\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F, \u0430 \u043D\u0435 \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435: \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u043E\u0435 \u043F\u0440\u0430\u0432\u043E \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442, \u0447\u0442\u043E \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043D\u0435 \u0431\u0435\u0440\u0451\u0442 \u043E\u0447\u0435\u0440\u0435\u0434\u044C, \u0430\u0433\u0435\u043D\u0442 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u043B\u0438\u0448\u043D\u0438\u0445 \u043A\u043E\u043C\u0430\u043D\u0434, \u043C\u043E\u0434\u0443\u043B\u0438 \u043D\u0435 \u0441\u0442\u0430\u0432\u044F\u0442\u0441\u044F \u0441\u0430\u043C\u0438. \u0412\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u043E\u0435 \u043E\u043F\u0430\u0441\u043D\u043E\u0435 \u043F\u0440\u0430\u0432\u043E \u0432\u0441\u0435\u0433\u0434\u0430 \u043A\u043E\u043D\u0435\u0447\u043D\u043E \u0441\u0440\u043E\u043A\u043E\u043C \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u043E \u0441\u0443\u0442\u043E\u0447\u043D\u044B\u043C \u0431\u044E\u0434\u0436\u0435\u0442\u043E\u043C.</p>
  <div class="mode">
    <span id="mode" class="badge calm">\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</span>
    <button id="stop-btn" class="stop">\u041E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0441\u0442\u043E\u043F-\u043A\u0440\u0430\u043D</button>
    <button id="stop-release" class="ghost" hidden>\u041F\u043E\u0434\u043D\u044F\u0442\u044C \u0441\u0442\u043E\u043F-\u043A\u0440\u0430\u043D</button>
  </div>
  <div class="who">
    <label for="actor">\u041E\u0442 \u0438\u043C\u0435\u043D\u0438</label>
    <input id="actor" size="22" placeholder="\u0438\u043C\u044F \u0442\u043E\u0433\u043E, \u043A\u0442\u043E \u0440\u0435\u0448\u0430\u0435\u0442">
    <label for="stop-reason">\u043F\u0440\u0438\u0447\u0438\u043D\u0430</label>
    <input id="stop-reason" size="36" placeholder="\u043F\u043E\u0447\u0435\u043C\u0443 \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C">
    <input id="stop-phrase" class="phrase" placeholder="\u0444\u0440\u0430\u0437\u0430 \u0434\u043B\u044F \u043F\u043E\u0434\u044A\u0451\u043C\u0430: \u0440\u0430\u0437\u043C\u043E\u0440\u043E\u0437\u0438\u0442\u044C \u0441\u0430\u043C\u043E\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435" hidden>
  </div>
  <p id="status"></p>
</header>

<h2>\u041A\u0440\u0430\u0441\u043D\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430</h2>
<p class="hint">\u0412\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0441\u0440\u0430\u0437\u0443 \u0432\u0441\u0435 \u043F\u0440\u0430\u0432\u0430, \u0443 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0435\u0441\u0442\u044C \u043C\u0435\u0445\u0430\u043D\u0438\u0437\u043C, \u043D\u0430 \u043E\u0434\u0438\u043D \u0438 \u0442\u043E\u0442 \u0436\u0435 \u0441\u0440\u043E\u043A. \u041F\u0440\u0430\u0432\u0430 \u0431\u0435\u0437 \u043C\u0435\u0445\u0430\u043D\u0438\u0437\u043C\u0430 \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u0437\u0430\u043F\u0435\u0440\u0442\u044B\u043C\u0438: \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0438\u0445 \u0431\u044B\u043B\u043E \u0431\u044B \u043E\u0431\u043C\u0430\u043D\u043E\u043C, \u0430 \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435\u043C. \u041D\u0438\u0436\u0435 \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0435\u043D\u043E, \u0447\u0442\u043E \u0438\u043C\u0435\u043D\u043D\u043E \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F \u0438 \u0447\u0435\u043C \u044D\u0442\u043E \u043E\u0431\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F.</p>
<div class="cap danger">
  <ul class="facts" id="red-list"></ul>
  <div class="controls">
    <input id="red-phrase" class="phrase" placeholder="\u0444\u0440\u0430\u0437\u0430 \u043A\u0440\u0430\u0441\u043D\u043E\u0439 \u043A\u043D\u043E\u043F\u043A\u0438">
    <label for="red-ttl">\u043D\u0430 \u043C\u0438\u043D\u0443\u0442</label><input id="red-ttl" size="5" value="60">
    <label for="red-reason">\u043F\u0440\u0438\u0447\u0438\u043D\u0430</label><input id="red-reason" size="36" placeholder="\u0437\u0430\u0447\u0435\u043C \u0438 \u0434\u043E \u043A\u0430\u043A\u043E\u0433\u043E \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430">
    <button id="red-btn" class="red" data-required="red-reason,red-phrase">\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0432\u0441\u0451 \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u043C\u043E\u0435</button>
  </div>
  <p class="meta" id="red-locked"></p>
</div>

<h2>\u041B\u0435\u0441\u0442\u043D\u0438\u0446\u0430 \u043F\u0440\u0430\u0432</h2>
<div id="caps"></div>

<h2>\u0421\u0430\u043C\u043E\u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043C\u043E\u0434\u0443\u043B\u0438</h2>
<p class="hint">\u0427\u0442\u043E \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u043B\u0430 \u0441\u0430\u043C\u0430 \u043F\u043E \u043F\u0440\u0430\u0432\u0443 \u0441\u0430\u043C\u043E\u043C\u043E\u0434\u0443\u043B\u044F\u0446\u0438\u0438: \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u043A\u043B\u044E\u0447\u043E\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u044F, \u0434\u043E\u0432\u0435\u0440\u0438\u0435 local, \u0432 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0438 \u0432 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0443 \u044D\u0442\u043E \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0430\u0435\u0442. \u0421\u043D\u044F\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0438\u043B\u0438 \u0432\u0441\u0451 \u0440\u0430\u0437\u043E\u043C. \u0415\u0441\u043B\u0438 \u0441\u0430\u043C\u043E\u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043C\u043E\u0434\u0443\u043B\u044C \u043B\u043E\u043C\u0430\u0435\u0442 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443, \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0432\u043E\u043E\u0440\u0443\u0436\u0430\u0435\u0442 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C, \u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u0438\u0434\u0451\u0442 \u0431\u0435\u0437 \u043D\u0438\u0445.</p>
<div class="cap">
  <ul class="facts" id="self-list"></ul>
  <div class="controls">
    <label for="self-reason">\u043F\u0440\u0438\u0447\u0438\u043D\u0430</label><input id="self-reason" size="36" placeholder="\u043F\u043E\u0447\u0435\u043C\u0443 \u0441\u043D\u0438\u043C\u0430\u0435\u043C">
    <button id="self-remove-all" class="stop" data-required="self-reason">\u0421\u043D\u044F\u0442\u044C \u0432\u0435\u0441\u044C \u043A\u0430\u043D\u0430\u043B</button>
    <button id="self-safe" class="ghost" data-required="self-reason">\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u0430\u043C\u043E\u0441\u0431\u043E\u0440\u043A\u0443 \u0434\u043E \u0440\u0430\u0437\u0431\u043E\u0440\u0430</button>
    <button id="self-safe-release" class="ghost" hidden data-required="self-reason">\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0441\u0430\u043C\u043E\u0441\u0431\u043E\u0440\u043A\u0443</button>
  </div>
  <p class="meta" id="self-mode"></p>
</div>

<h2>\u0416\u0443\u0440\u043D\u0430\u043B \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0439</h2>
<p class="hint">\u041A\u0430\u0436\u0434\u043E\u0435 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435, \u043A\u0430\u0436\u0434\u043E\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u0430 \u0438 \u043A\u0430\u0436\u0434\u044B\u0439 \u043E\u0442\u043A\u0430\u0437 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u044C: \u043A\u0442\u043E, \u043A\u043E\u0433\u0434\u0430, \u0447\u0442\u043E \u0438 \u043F\u043E\u0447\u0435\u043C\u0443. \u0421\u0442\u0440\u043E\u043A\u0438 \u0436\u0443\u0440\u043D\u0430\u043B\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u044E\u0442\u0441\u044F.</p>
<table><thead><tr><th>\u0432\u0440\u0435\u043C\u044F</th><th>\u043A\u0442\u043E</th><th>\u043F\u0440\u0430\u0432\u043E</th><th>\u0441\u043E\u0431\u044B\u0442\u0438\u0435</th><th>\u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u044C</th></tr></thead><tbody id="journal"></tbody></table>

<p class="foot">\u042D\u043A\u0440\u0430\u043D \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u0438\u0442\u0440\u0438\u043D\u0430. \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0436\u0438\u0432\u0443\u0442 \u0432 \u044F\u0434\u0440\u0435: \u0441\u043D\u044F\u0442\u044C \u044D\u0442\u043E\u0442 \u043C\u043E\u0434\u0443\u043B\u044C \u043D\u0435\u043B\u044C\u0437\u044F \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u0442\u044C \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F, \u2014 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0432 \u043A\u043E\u0434\u0435 \u0442\u043E\u0447\u0435\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438 \u0441\u0442\u043E\u0440\u043E\u0436\u0430\u0442\u0441\u044F \u0433\u0435\u0439\u0442\u043E\u043C audit:governance. \u0413\u0440\u0430\u043D\u0438\u0446\u044B D-056 (\u0441\u0430\u043C\u043E\u043C\u043E\u0434\u0443\u043B\u044F\u0446\u0438\u044F) \u0438 D-052 (\u0437\u0430\u043A\u0440\u044B\u0442\u043E\u0435 \u043C\u043D\u043E\u0436\u0435\u0441\u0442\u0432\u043E \u0440\u0430\u043D\u0442\u0430\u0439\u043C\u043E\u0432) \u044D\u0442\u043E\u0442 \u044D\u043A\u0440\u0430\u043D \u043D\u0435 \u043E\u0442\u043C\u0435\u043D\u044F\u0435\u0442.</p>

<script>
var state = null;
var status = document.getElementById('status');
var actorInput = document.getElementById('actor');
var mode = document.getElementById('mode');

function esc(value){
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function say(text, bad){ status.textContent = text; status.className = bad ? 'err' : ''; }
// \u0420\u0435\u043F\u043B\u0438\u043A\u0430 \u0440\u044F\u0434\u043E\u043C \u0441 \u043A\u043D\u043E\u043F\u043A\u043E\u0439: \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0440\u0430\u0432 \u0434\u043B\u0438\u043D\u043D\u044B\u0439, \u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0432 \u0448\u0430\u043F\u043A\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B
// \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u0442 \u0441\u043E \u0441\u0442\u0440\u043E\u043A\u043E\u0439, \u043A\u043E\u0442\u043E\u0440\u0443\u044E \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u043E \u0442\u0440\u043E\u0433\u0430\u043B.
function tell(target, text, bad){ target.textContent = text; target.className = 'capnote' + (bad ? ' err' : ''); }
// \u0421\u0442\u0440\u043E\u043A\u0438 \u043F\u0440\u0430\u0432 \u043F\u0435\u0440\u0435\u0440\u0438\u0441\u043E\u0432\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0446\u0435\u043B\u0438\u043A\u043E\u043C (\u0441\u0432\u043E\u0439 \u043E\u0442\u0432\u0435\u0442 \u044F\u0434\u0440\u0430, \u043E\u043F\u0440\u043E\u0441 \u0440\u0430\u0437 \u0432 15
// \u0441\u0435\u043A\u0443\u043D\u0434), \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0440\u0435\u043F\u043B\u0438\u043A\u0430 \u0436\u0438\u0432\u0451\u0442 \u0432 \u043F\u0430\u043C\u044F\u0442\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B: \u0438\u043D\u0430\u0447\u0435 \xAB\u041F\u0440\u0430\u0432\u043E \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E\xBB
// \u0441\u0442\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u0432 \u0442\u043E\u0442 \u0436\u0435 \u043C\u043E\u043C\u0435\u043D\u0442, \u043A\u043E\u0433\u0434\u0430 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F.
var rowNotes = {};
function remember(capId, text, bad){ rowNotes[capId] = { text: text, bad: bad, until: Date.now() + 120000 }; }
function unitLabel(text){
  var span = document.createElement('span');
  span.className = 'unit';
  span.textContent = text;
  return span;
}
function who(){
  // \u041A\u0430\u0434\u0440 \u043C\u043E\u0434\u0443\u043B\u044F \u0436\u0438\u0432\u0451\u0442 \u0432 opaque origin: \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u0443 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043D\u0435\u0442,
  // \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0438\u043C\u044F \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0434\u0435\u0440\u0436\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u044D\u043A\u0440\u0430\u043D\u0430.
  return actorInput.value.trim();
}
async function api(method, path, body){
  var response = await fetch(path, {
    method: method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  var json = await response.json();
  return { status: response.status, json: json };
}
function refusalLine(json, fallback){
  var error = json && json.error;
  if (!error) return fallback;
  var line = error.message || fallback;
  if (error.instruction) line += ' \u0427\u0442\u043E \u0434\u0435\u043B\u0430\u0442\u044C: ' + error.instruction;
  if (error.where) line += ' (\u0413\u0434\u0435: ' + error.where + ')';
  return line;
}
function timeOf(value){
  if (!value) return '';
  var date = new Date(value);
  return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
function statePill(cap){
  if (cap.mechanism === 'absent') return '<span class="pill lock">\u0437\u0430\u043F\u0435\u0440\u0442\u043E: \u043D\u0435\u0442 \u043C\u0435\u0445\u0430\u043D\u0438\u0437\u043C\u0430</span>';
  if (cap.reason === 'expired') return '<span class="pill expired">\u0441\u0440\u043E\u043A \u0438\u0441\u0442\u0451\u043A</span>';
  if (cap.effective) return '<span class="pill on">\u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E</span>';
  if (cap.enabled) return '<span class="pill expired">\u043D\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442</span>';
  return '<span class="pill off">\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E</span>';
}

function renderMode(){
  if (!state) return;
  if (state.frozen) {
    mode.textContent = '\u0421\u0442\u043E\u043F-\u043A\u0440\u0430\u043D \u043E\u043F\u0443\u0449\u0435\u043D: \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043D\u0435 \u0434\u0435\u043B\u0430\u0435\u0442 \u043D\u0438\u0447\u0435\u0433\u043E \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u043E\u0433\u043E';
    mode.className = 'badge stop';
  } else {
    var hot = state.capabilities.filter(function (cap) { return cap.effective && cap.tier >= 3; });
    if (hot.length) {
      var until = hot.map(function (cap) { return cap.expires_at; }).filter(Boolean).sort()[0];
      mode.textContent = '\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E \u0431\u0435\u0437 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430: ' + hot.map(function (cap) { return cap.title; }).join(', ') + (until ? ' \u2014 \u0434\u043E ' + timeOf(until) : '');
      mode.className = 'badge hot';
    } else {
      mode.textContent = '\u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C: \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0437\u0430\u043C\u0435\u0447\u0430\u0435\u0442 \u0438 \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u0442, \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u0432\u0430\u0448\u0435\u043C\u0443 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044E';
      mode.className = 'badge calm';
    }
  }
  document.getElementById('stop-btn').hidden = state.frozen;
  document.getElementById('stop-release').hidden = !state.frozen;
  document.getElementById('stop-phrase').hidden = !state.frozen;
}

function renderRed(){
  var list = document.getElementById('red-list');
  list.textContent = '';
  (state.red.consequences || []).forEach(function (row) {
    var item = document.createElement('li');
    item.innerHTML = '<b>' + esc(row.title) + '</b> \u2014 ' + esc(row.risk) + '<br>\u0446\u0435\u043D\u0430: ' + esc(row.damage);
    list.appendChild(item);
  });
  var locked = (state.capabilities || []).filter(function (cap) { return cap.mechanism === 'absent'; });
  document.getElementById('red-locked').textContent = locked.length
    ? '\u041E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u0437\u0430\u043F\u0435\u0440\u0442\u044B\u043C\u0438: ' + locked.map(function (cap) { return cap.title; }).join(', ') + '. ' + (locked[0].mechanism_note || '')
    : '';
  document.getElementById('red-phrase').placeholder = '\u0444\u0440\u0430\u0437\u0430: ' + state.red.phrase;
  document.getElementById('red-ttl').value = String(state.red.default_ttl_minutes);
}

function capabilityRow(cap){
  var row = document.createElement('div');
  row.className = 'cap' + (cap.tier >= 3 ? ' danger' : '') + (cap.mechanism === 'absent' ? ' locked' : '');

  var top = document.createElement('div');
  top.className = 'cap-top';
  top.innerHTML = '<span class="cap-title">' + esc(cap.title) + '</span>'
    + '<span class="pill">\u0441\u0442\u0443\u043F\u0435\u043D\u044C ' + esc(cap.tier) + '</span>' + statePill(cap);
  row.appendChild(top);

  var facts = document.createElement('ul');
  facts.className = 'facts';
  facts.innerHTML = '<li>\u043E\u0442\u043A\u0440\u043E\u0435\u0442: ' + esc(cap.risk) + '</li>'
    + '<li><b>\u0446\u0435\u043D\u0430:</b> ' + esc(cap.damage) + '</li>'
    + '<li>\u043A\u0430\u043A \u043E\u0442\u043A\u0430\u0442\u0438\u0442\u044C: ' + esc(cap.reversibility) + '</li>';
  row.appendChild(facts);

  if (cap.mechanism === 'absent') {
    var note = document.createElement('div');
    note.className = 'locknote';
    note.textContent = '\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F. ' + cap.mechanism_note;
    row.appendChild(note);
    return row;
  }

  var controls = document.createElement('div');
  controls.className = 'controls';

  var reason = document.createElement('input');
  reason.size = 34;
  reason.placeholder = '\u043F\u0440\u0438\u0447\u0438\u043D\u0430: \u0437\u0430\u0447\u0435\u043C \u044D\u0442\u043E \u043D\u0443\u0436\u043D\u043E';
  reason.id = 'reason-' + cap.id;
  reason.setAttribute('aria-label', '\u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0434\u043B\u044F ' + cap.title);
  controls.appendChild(reason);

  var ttl = null;
  // \u042F\u0434\u0440\u043E \u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u0441\u0440\u043E\u043A \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0442\u0430\u043C, \u0433\u0434\u0435 \u043F\u0440\u0430\u0432\u043E \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430
  // (ttl_required = \u043D\u0435 ttl_allowed). \u041F\u043E\u044D\u0442\u043E\u043C\u0443 \u043F\u043E\u043B\u0435 \u0441\u0440\u043E\u043A\u0430 \u043D\u0443\u0436\u043D\u043E \u0438 \u0442\u0430\u043C, \u0433\u0434\u0435 \u0441\u0440\u043E\u043A
  // \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D, \u0438 \u0442\u0430\u043C, \u0433\u0434\u0435 \u043E\u043D \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F: \u0438\u043D\u0430\u0447\u0435 \u043E\u043F\u0430\u0441\u043D\u043E\u0435 \u043F\u0440\u0430\u0432\u043E (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440
  // \xAB\u0417\u0430\u043F\u0443\u0441\u043A\u0430\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u0431\u0435\u0437 \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430\xBB) \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043D\u0435\u0447\u0435\u043C \u2014 \u044F\u0434\u0440\u043E \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442
  // \xABttl_required\xBB, \u0430 \u0432\u0432\u0435\u0441\u0442\u0438 \u043C\u0438\u043D\u0443\u0442\u0443 \u043D\u0435\u0433\u0434\u0435. \u0416\u0438\u0432\u043E\u0439 \u043F\u0440\u043E\u043A\u043B\u0438\u043A \u044D\u0442\u043E \u0438 \u043F\u043E\u043A\u0430\u0437\u0430\u043B.
  if (cap.ttl_allowed || cap.ttl_required) {
    controls.appendChild(unitLabel(cap.ttl_required ? '\u0441\u0440\u043E\u043A, \u043C\u0438\u043D \u2014 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E' : '\u0441\u0440\u043E\u043A, \u043C\u0438\u043D'));
    ttl = document.createElement('input');
    ttl.size = 5;
    ttl.value = String(state.red.default_ttl_minutes);
    ttl.id = 'ttl-' + cap.id;
    ttl.title = cap.ttl_required
      ? '\u0431\u0435\u0437 \u0441\u0440\u043E\u043A\u0430 \u044D\u0442\u043E \u043F\u0440\u0430\u0432\u043E \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0442 1 \u0434\u043E 1440 \u043C\u0438\u043D\u0443\u0442'
      : '\u043D\u0430 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0438\u043D\u0443\u0442 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u043E (\u043C\u043E\u0436\u043D\u043E \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C)';
    ttl.setAttribute('aria-label', '\u0441\u0440\u043E\u043A \u0432 \u043C\u0438\u043D\u0443\u0442\u0430\u0445 \u0434\u043B\u044F ' + cap.title);
    controls.appendChild(ttl);
  }
  // \u0423 \u043E\u043F\u0430\u0441\u043D\u043E\u0433\u043E \u043F\u0440\u0430\u0432\u0430 \u0441\u0440\u043E\u043A \u043C\u043E\u0436\u043D\u043E \u0441\u043D\u044F\u0442\u044C, \u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043B\u043E\u0432\u0430\u043C\u0438: \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0444\u0440\u0430\u0437\u0430
  // \xAB\u2026 \u0431\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E\xBB. \u0427\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0435 \u043E\u0431\u044F\u0437\u0430\u043D \u043F\u0440\u0438\u0434\u0443\u043C\u044B\u0432\u0430\u0442\u044C \u0447\u0438\u0441\u043B\u043E \u043C\u0438\u043D\u0443\u0442, \u043A\u043E\u0442\u043E\u0440\u043E\u0433\u043E \u043D\u0435
  // \u0437\u043D\u0430\u0435\u0442, \u2014 \u0430 \xAB\u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430\xBB \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u043E\u0438\u0437\u043D\u0435\u0441\u0451\u043D\u043D\u044B\u043C \u0440\u0435\u0448\u0435\u043D\u0438\u0435\u043C \u0432 \u0436\u0443\u0440\u043D\u0430\u043B\u0435.
  var foreverBox = null;
  if (cap.ttl_required && cap.indefinite_phrase) {
    var forever = document.createElement('label');
    forever.className = 'forever';
    foreverBox = document.createElement('input');
    foreverBox.type = 'checkbox';
    foreverBox.id = 'forever-' + cap.id;
    foreverBox.title = '\u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0431\u0435\u0437 \u0441\u0440\u043E\u043A\u0430: \u0442\u043E\u0433\u0434\u0430 \u0432 \u043F\u043E\u043B\u0435 \u0444\u0440\u0430\u0437\u044B \u043D\u0443\u0436\u043D\u043E \u0432\u0432\u0435\u0441\u0442\u0438 \xAB' + cap.indefinite_phrase + '\xBB';
    forever.appendChild(foreverBox);
    forever.appendChild(document.createTextNode(' \u0431\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E'));
    controls.appendChild(forever);
  }
  var budget = null;
  if (cap.budget_allowed) {
    controls.appendChild(unitLabel('\u0440\u0430\u0437 \u0432 \u0441\u0443\u0442\u043A\u0438'));
    budget = document.createElement('input');
    budget.size = 4;
    budget.value = '3';
    budget.title = '\u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437 \u0432 \u0441\u0443\u0442\u043A\u0438 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0441\u043C\u043E\u0436\u0435\u0442 \u0432\u043E\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043F\u0440\u0430\u0432\u043E\u043C';
    budget.setAttribute('aria-label', '\u0441\u0443\u0442\u043E\u0447\u043D\u044B\u0439 \u0431\u044E\u0434\u0436\u0435\u0442 \u0434\u043B\u044F ' + cap.title);
    controls.appendChild(budget);
  }
  var phrase = null;
  if (cap.confirm === 'phrase') {
    phrase = document.createElement('input');
    phrase.className = 'phrase';
    phrase.id = 'phrase-' + cap.id;
    phrase.size = 30;
    phrase.placeholder = '\u0444\u0440\u0430\u0437\u0430: ' + cap.phrase;
    phrase.setAttribute('aria-label', '\u0444\u0440\u0430\u0437\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0434\u043B\u044F ' + cap.title);
    controls.appendChild(phrase);
  }

  var required = ['reason-' + cap.id];
  if (ttl && cap.ttl_required) required.push('ttl-' + cap.id);
  if (phrase) required.push('phrase-' + cap.id);
  // \u041E\u0442\u0432\u0435\u0442 \u043F\u0440\u043E \u043F\u0443\u0441\u0442\u044B\u0435 \u043F\u043E\u043B\u044F \u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u0434\u043E\u043B\u0436\u0435\u043D \u0432\u0438\u0434\u0435\u0442\u044C \u0442\u0430\u043C \u0436\u0435,
  // \u0433\u0434\u0435 \u043D\u0430\u0436\u0430\u043B. \u0421\u0442\u0440\u043E\u043A\u0430 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F \u0432 \u0448\u0430\u043F\u043A\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0434\u043B\u044F \u0434\u043B\u0438\u043D\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u043A\u0430 \u043F\u0440\u0430\u0432 \u043D\u0435
  // \u0433\u043E\u0434\u0438\u0442\u0441\u044F: \u043F\u0440\u043E\u043A\u043B\u0438\u043A \u0432\u043D\u0438\u0437 \u0437\u0430 \xAB\u041B\u0435\u0441\u0442\u043D\u0438\u0446\u0435\u0439 \u043F\u0440\u0430\u0432\xBB \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043A\u0430\u043A \xAB\u043A\u043D\u043E\u043F\u043A\u0430 \u043C\u0451\u0440\u0442\u0432\u0430\u044F\xBB.
  var rowNote = document.createElement('p');
  rowNote.className = 'capnote';
  rowNote.id = 'capnote-' + cap.id;
  rowNote.setAttribute('role', 'status');

  var grant = document.createElement('button');
  grant.className = 'small';
  grant.setAttribute('data-required', required.join(','));
  grant.setAttribute('data-status', 'capnote-' + cap.id);
  grant.textContent = cap.enabled ? '\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E' : '\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C';
  grant.addEventListener('click', async function () {
    var body = {
      capability: cap.id, action: 'on', actor: who(),
      reason: reason.value.trim(),
    };
    var foreverOn = foreverBox && foreverBox.checked;
    if (ttl && !foreverOn) body.ttl_minutes = Number(ttl.value);
    if (budget) body.budget = Number(budget.value);
    if (phrase) body.phrase = phrase.value;
    var answer = await api('POST', '/api/governance/grants', body);
    if (answer.status !== 200) {
      var refusal = refusalLine(answer.json, '\u041F\u0440\u0430\u0432\u043E \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E');
      remember(cap.id, refusal, true); tell(rowNote, refusal, true); return;
    }
    state = answer.json.state;
    var success = '\u041F\u0440\u0430\u0432\u043E \xAB' + cap.title + '\xBB \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E'
      + (body.ttl_minutes ? ' \u043D\u0430 ' + body.ttl_minutes + ' \u043C\u0438\u043D' : (foreverOn ? ' \u0431\u0435\u0437 \u0441\u0440\u043E\u043A\u0430' : ''))
      + (body.budget ? ', \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ' + body.budget + ' \u0440\u0430\u0437 \u0432 \u0441\u0443\u0442\u043A\u0438' : '') + '.';
    remember(cap.id, success, false); tell(rowNote, success, false);
    renderAll();
  });
  controls.appendChild(grant);

  var revoke = document.createElement('button');
  revoke.className = 'small ghost';
  revoke.setAttribute('data-required', 'reason-' + cap.id);
  revoke.setAttribute('data-status', 'capnote-' + cap.id);
  revoke.textContent = '\u0417\u0430\u043F\u0440\u0435\u0442\u0438\u0442\u044C';
  revoke.addEventListener('click', async function () {
    var answer = await api('POST', '/api/governance/grants', { capability: cap.id, action: 'off', actor: who(), reason: reason.value.trim() });
    if (answer.status !== 200) {
      var refusalOff = refusalLine(answer.json, '\u041F\u0440\u0430\u0432\u043E \u043D\u0435 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E');
      remember(cap.id, refusalOff, true); tell(rowNote, refusalOff, true); return;
    }
    state = answer.json.state;
    remember(cap.id, '\u041F\u0440\u0430\u0432\u043E \xAB' + cap.title + '\xBB \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E.', false);
    tell(rowNote, '\u041F\u0440\u0430\u0432\u043E \xAB' + cap.title + '\xBB \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E.', false);
    renderAll();
  });
  controls.appendChild(revoke);
  row.appendChild(controls);

  // \u0427\u0438\u0441\u043B\u043E\u0432\u043E\u0435 \u043F\u043E\u043B\u0435 \u0431\u0435\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 \u2014 \u044D\u0442\u043E \u043F\u043E\u043B\u0435, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0435\u0442: \u0447\u0435\u043B\u043E\u0432\u0435\u043A
  // \u043D\u0435 \u0437\u043D\u0430\u0435\u0442, \u0447\u0442\u043E \u0432 \u043D\u0451\u043C \u0437\u0430 \u0435\u0434\u0438\u043D\u0438\u0446\u0430. \u041F\u043E\u044D\u0442\u043E\u043C\u0443 \u0443 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043F\u043E\u043B\u044F \u0441\u0432\u043E\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u044C.
  var legend = [];
  legend.push('\u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u2014 \u0437\u0430\u0447\u0435\u043C \u044D\u0442\u043E \u043D\u0443\u0436\u043D\u043E, \u043E\u043D\u0430 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u0436\u0443\u0440\u043D\u0430\u043B');
  if (ttl) legend.push('\u0441\u0440\u043E\u043A \u2014 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0438\u043D\u0443\u0442 \u043F\u0440\u0430\u0432\u043E \u0431\u0443\u0434\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C'
    + (cap.ttl_required
      ? '; \u0431\u0435\u0437 \u0441\u0440\u043E\u043A\u0430 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043F\u0438\u0441\u0430\u0432 \u0444\u0440\u0430\u0437\u0443 \xAB' + cap.indefinite_phrase + '\xBB'
      : '; \u043C\u043E\u0436\u043D\u043E \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C'));
  if (budget) legend.push('\u0447\u0438\u0441\u043B\u043E \u2014 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437 \u0432 \u0441\u0443\u0442\u043A\u0438 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E \u044D\u0442\u0438\u043C \u043F\u0440\u0430\u0432\u043E\u043C \u0432\u043E\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F');
  if (phrase) legend.push('\u0444\u0440\u0430\u0437\u0430 \u2014 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0435\u0451 \u0441\u043B\u043E\u0432\u043E \u0432 \u0441\u043B\u043E\u0432\u043E: \xAB' + cap.phrase + '\xBB');
  var fieldsHint = document.createElement('p');
  fieldsHint.className = 'hint';
  fieldsHint.textContent = '\u043F\u043E\u043B\u044F \u0441\u0442\u0440\u043E\u043A\u0438: ' + legend.join(' \xB7 ');
  row.appendChild(fieldsHint);
  row.appendChild(rowNote);

  // \u041F\u0435\u0440\u0435\u0440\u0438\u0441\u043E\u0432\u043A\u0430 \u0441\u0442\u0440\u043E\u043A \u0443\u0431\u0438\u0432\u0430\u0435\u0442 \u0441\u0442\u0430\u0440\u044B\u0435 \u0443\u0437\u043B\u044B: \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0438\u0432\u0448\u0443\u044E\u0441\u044F \u0440\u0435\u043F\u043B\u0438\u043A\u0443 \u0441\u0442\u0430\u0432\u0438\u043C \u043D\u0430
  // \u0441\u0432\u0435\u0436\u0438\u0439 \u0443\u0437\u0435\u043B, \u043F\u043E\u043A\u0430 \u043E\u043D\u0430 \u043D\u0435 \u0443\u0441\u0442\u0430\u0440\u0435\u043B\u0430. \u041F\u0440\u0430\u0432\u043A\u0430 \u043B\u044E\u0431\u043E\u0433\u043E \u043F\u043E\u043B\u044F \u0440\u0435\u043F\u043B\u0438\u043A\u0443 \u0441\u043D\u0438\u043C\u0430\u0435\u0442:
  // \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u043D\u0430\u0447\u0430\u043B \u043D\u043E\u0432\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u2014 \u0441\u0442\u0430\u0440\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0435\u043C\u0443 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C.
  var remembered = rowNotes[cap.id];
  if (remembered && Date.now() < remembered.until) {
    tell(rowNote, remembered.text, remembered.bad);
  } else if (remembered) {
    delete rowNotes[cap.id];
  }
  [reason, ttl, budget, phrase].forEach(function (field) {
    if (!field) return;
    field.addEventListener('input', function () {
      delete rowNotes[cap.id];
      rowNote.textContent = '';
    });
  });
  if (foreverBox) {
    // \u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \xAB\u0431\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E\xBB \u043C\u0435\u043D\u044F\u0435\u0442 \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u0444\u0440\u0430\u0437\u044B, \u0438 \u043D\u0430\u0431\u043E\u0440 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0445
    // \u043F\u043E\u043B\u0435\u0439: \u0441\u0440\u043E\u043A \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u0451\u0442 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u0442\u044C\u0441\u044F, \u0444\u0440\u0430\u0437\u0430 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0434\u0440\u0443\u0433\u0430\u044F.
    foreverBox.addEventListener('change', function () {
      if (foreverBox.checked) {
        ttl.disabled = true;
        if (phrase) phrase.placeholder = '\u0444\u0440\u0430\u0437\u0430 \u0431\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E: ' + cap.indefinite_phrase;
        grant.setAttribute('data-required', ['reason-' + cap.id, 'phrase-' + cap.id].join(','));
      } else {
        ttl.disabled = false;
        if (phrase) phrase.placeholder = '\u0444\u0440\u0430\u0437\u0430: ' + cap.phrase;
        grant.setAttribute('data-required', required.join(','));
      }
      delete rowNotes[cap.id];
      rowNote.textContent = '';
    });
  }

  var meta = document.createElement('div');
  meta.className = 'meta';
  var bits = [];
  if (cap.granted_by) bits.push('\u0432\u043A\u043B\u044E\u0447\u0438\u043B: ' + cap.granted_by + ' ' + timeOf(cap.granted_at));
  if (cap.expires_at) bits.push('\u0434\u043E ' + timeOf(cap.expires_at));
  if (cap.budget !== null) bits.push('\u0431\u044E\u0434\u0436\u0435\u0442 ' + cap.used_24h + '/' + cap.budget + ' \u0437\u0430 \u0441\u0443\u0442\u043A\u0438');
  if (cap.requires_titles.length) bits.push('\u0442\u0440\u0435\u0431\u0443\u0435\u0442: ' + cap.requires_titles.join(', '));
  if (!cap.effective && cap.reason_message) bits.push('\u043F\u043E\u0447\u0435\u043C\u0443 \u043D\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442: ' + cap.reason_message);
  meta.textContent = bits.join(' \xB7 ');
  row.appendChild(meta);
  return row;
}

function renderCaps(){
  var box = document.getElementById('caps');
  box.textContent = '';
  state.capabilities.forEach(function (cap) { box.appendChild(capabilityRow(cap)); });
}

async function renderJournal(){
  var answer = await api('GET', '/api/governance/journal?limit=40');
  var body = document.getElementById('journal');
  body.textContent = '';
  (answer.json.events || []).forEach(function (event) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + esc(timeOf(event.at)) + '</td><td>' + esc(event.actor) + '</td><td>'
      + esc(event.capability) + '</td><td>' + esc(event.action) + '</td><td>' + esc(event.detail) + '</td>';
    body.appendChild(tr);
  });
}

async function renderSelf(){
  var answer = await api('GET', '/api/self-development/self-modules');
  var box = document.getElementById('self-list');
  box.textContent = '';
  var rows = answer.json.modules || [];
  if (!rows.length) {
    var empty = document.createElement('li');
    empty.textContent = '\u0421\u0430\u043C\u043E\u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0443\u043B\u0435\u0439 \u043D\u0435\u0442: \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u0441\u0435\u0431\u0435 \u043D\u0435 \u0441\u0442\u0430\u0432\u0438\u043B\u0430.';
    box.appendChild(empty);
  }
  rows.forEach(function (row) {
    var li = document.createElement('li');
    li.textContent = row.id + ' ' + row.version + ' \xB7 \u0441\u043E\u0431\u0440\u0430\u043D\u043E ' + timeOf(row.built_at) + ' \xB7 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A ' + row.draft_id + ' \xB7 \u043A\u0442\u043E: ' + row.actor;
    var btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = '\u0421\u043D\u044F\u0442\u044C';
    btn.addEventListener('click', async function () {
      var answer2 = await api('POST', '/api/self-development/self-modules/remove', { id: row.id, actor: who(), reason: document.getElementById('self-reason').value.trim() });
      if (answer2.status !== 200) { say(refusalLine(answer2.json, '\u041C\u043E\u0434\u0443\u043B\u044C \u043D\u0435 \u0441\u043D\u044F\u0442'), true); return; }
      say('\u0421\u0430\u043C\u043E\u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043C\u043E\u0434\u0443\u043B\u044C \xAB' + row.id + '\xBB \u0441\u043D\u044F\u0442.');
      await renderSelf();
    });
    li.appendChild(btn);
    box.appendChild(li);
  });
  var safe = answer.json.safe_mode || {};
  var meta = document.getElementById('self-mode');
  meta.textContent = safe.armed
    ? '\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u0441 ' + timeOf(safe.at) + ': ' + (safe.reason || '') + ' \xB7 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E: ' + (safe.disabled || []).join(', ')
    : '\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D: \u0441\u0430\u043C\u043E\u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u044E\u0442\u0441\u044F \u043A\u0430\u043A \u043E\u0431\u044B\u0447\u043D\u043E.';
  document.getElementById('self-safe').hidden = !!safe.armed;
  document.getElementById('self-safe-release').hidden = !safe.armed;
}

function renderAll(){
  renderMode();
  renderRed();
  renderCaps();
  renderSelf();
  renderJournal();
}

document.getElementById('stop-btn').addEventListener('click', async function () {
  var answer = await api('POST', '/api/governance/kill-switch', { action: 'engage', actor: who(), reason: document.getElementById('stop-reason').value.trim() });
  if (answer.status !== 200) { say(refusalLine(answer.json, '\u0421\u0442\u043E\u043F-\u043A\u0440\u0430\u043D \u043D\u0435 \u043E\u043F\u0443\u0449\u0435\u043D'), true); return; }
  state = answer.json.state;
  say('\u0421\u0442\u043E\u043F-\u043A\u0440\u0430\u043D \u043E\u043F\u0443\u0449\u0435\u043D: \u0432\u0441\u0435 \u043F\u0440\u0430\u0432\u0430 \u0441\u0430\u043C\u043E\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u044F \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044B\u043C\u0438.');
  renderAll();
});

document.getElementById('stop-release').addEventListener('click', async function () {
  var answer = await api('POST', '/api/governance/kill-switch', {
    action: 'release', actor: who(),
    phrase: document.getElementById('stop-phrase').value,
    reason: document.getElementById('stop-reason').value.trim(),
  });
  if (answer.status !== 200) { say(refusalLine(answer.json, '\u0421\u0442\u043E\u043F-\u043A\u0440\u0430\u043D \u043D\u0435 \u043F\u043E\u0434\u043D\u044F\u0442'), true); return; }
  state = answer.json.state;
  say('\u0421\u0442\u043E\u043F-\u043A\u0440\u0430\u043D \u043F\u043E\u0434\u043D\u044F\u0442. \u041F\u0440\u0430\u0432\u0430 \u0432\u0435\u0440\u043D\u0443\u043B\u0438\u0441\u044C \u0432 \u0442\u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435, \u0432 \u043A\u043E\u0442\u043E\u0440\u043E\u043C \u0431\u044B\u043B\u0438.');
  renderAll();
});

document.getElementById('red-btn').addEventListener('click', async function () {
  var answer = await api('POST', '/api/governance/red-button', {
    actor: who(),
    phrase: document.getElementById('red-phrase').value,
    reason: document.getElementById('red-reason').value.trim(),
    ttl_minutes: Number(document.getElementById('red-ttl').value),
  });
  if (answer.status !== 200) { say(refusalLine(answer.json, '\u041A\u0440\u0430\u0441\u043D\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430 \u043D\u0435 \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0430'), true); return; }
  say('\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u0432\u0441\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u043C\u044B\u0435 \u043F\u0440\u0430\u0432\u0430 \u0434\u043E ' + timeOf(answer.json.expires_at) + '. \u0417\u0430\u043F\u0435\u0440\u0442\u044B: ' + (answer.json.still_locked || []).map(function (row) { return row.id; }).join(', '));
  await refresh();
});

document.getElementById('self-remove-all').addEventListener('click', async function () {
  var answer = await api('POST', '/api/self-development/self-modules/remove', { all: true, actor: who(), reason: document.getElementById('self-reason').value.trim() });
  if (answer.status !== 200) { say(refusalLine(answer.json, '\u041A\u0430\u043D\u0430\u043B \u0441\u0430\u043C\u043E\u0441\u0431\u043E\u0440\u043A\u0438 \u043D\u0435 \u0441\u043D\u044F\u0442'), true); return; }
  say('\u0421\u043D\u044F\u0442 \u0432\u0435\u0441\u044C \u043A\u0430\u043D\u0430\u043B \u0441\u0430\u043C\u043E\u0441\u0431\u043E\u0440\u043A\u0438: ' + ((answer.json.removed || []).join(', ') || '\u0438 \u0442\u0430\u043A \u043F\u0443\u0441\u0442\u043E') + '.');
  await renderSelf();
});

document.getElementById('self-safe').addEventListener('click', async function () {
  var answer = await api('POST', '/api/self-development/self-modules/safe-mode', { action: 'engage', actor: who(), reason: document.getElementById('self-reason').value.trim() });
  if (answer.status !== 200) { say(refusalLine(answer.json, '\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0451\u043D'), true); return; }
  say('\u0421\u0430\u043C\u043E\u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u0434\u043E \u0440\u0430\u0437\u0431\u043E\u0440\u0430: ' + ((answer.json.disabled || []).join(', ') || '\u043D\u0435\u0447\u0435\u0433\u043E \u0432\u044B\u043A\u043B\u044E\u0447\u0430\u0442\u044C') + '.');
  await renderSelf();
});

document.getElementById('self-safe-release').addEventListener('click', async function () {
  var answer = await api('POST', '/api/self-development/self-modules/safe-mode', { action: 'release', actor: who(), reason: document.getElementById('self-reason').value.trim() });
  if (answer.status !== 200) { say(refusalLine(answer.json, '\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u043D\u0435 \u0441\u043D\u044F\u0442'), true); return; }
  say('\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0441\u043D\u044F\u0442: \u0441\u0430\u043C\u043E\u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \u0441\u043D\u043E\u0432\u0430 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u044E\u0442\u0441\u044F.');
  await renderSelf();
});
async function refresh(){
  var answer = await api('GET', '/api/governance/policy');
  if (answer.status !== 200) { say('\u041F\u043B\u043E\u0441\u043A\u043E\u0441\u0442\u044C \u043F\u0440\u0430\u0432 \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442: ' + refusalLine(answer.json, ''), true); return; }
  state = answer.json;
  renderAll();
}

actorInput.placeholder = '\u0438\u043C\u044F \u0440\u0435\u0448\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u044D\u0442\u043E\u043C \u044D\u043A\u0440\u0430\u043D\u0435: \u0436\u0443\u0440\u043D\u0430\u043B \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442 \u0435\u0433\u043E';
refresh();
setInterval(function () { if (!document.hidden) refresh(); }, 15000);
</script>
</body>
</html>`;

// modules/self-governance/index.ts
var module = {
  id: "self-governance",
  apiVersion: 1,
  permissions: [],
  register(ctx) {
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
