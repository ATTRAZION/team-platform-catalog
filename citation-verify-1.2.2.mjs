import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/citation-verify/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0446\u0438\u0442\u0430\u0442</title></head><body><main>
<h1>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0446\u0438\u0442\u0430\u0442 \u043F\u043E Crossref</h1>
<p>\u041C\u043E\u0434\u0443\u043B\u044C \u0431\u0435\u0440\u0451\u0442 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u0432 Crossref \u0438 \u0441\u0432\u0435\u0440\u044F\u0435\u0442 \u0438\u0445 \u0441 \u0442\u0435\u043C, \u0447\u0442\u043E
\u0437\u0430\u044F\u0432\u043B\u0435\u043D\u043E \u0432 \u0446\u0438\u0442\u0430\u0442\u0435: \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\u043C, \u0430\u0432\u0442\u043E\u0440\u043E\u043C \u0438 \u0433\u043E\u0434\u043E\u043C. \u0412\u0442\u043E\u0440\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u043F\u043E \u0432\u0441\u0435\u043C
\u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u043C \u0446\u0438\u0442\u0430\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0432\u0435\u0440\u0434\u0438\u043A\u0442 \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0439. \u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u043E\u0442\u0432\u0435\u0442 \u043C\u043E\u0436\u0435\u0442
\u0437\u0430\u043F\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u043B\u0438 \u043E\u0442\u043A\u0430\u0437\u0430\u0442\u044C: \u0442\u043E\u0433\u0434\u0430 \u043C\u043E\u0434\u0443\u043B\u044C \u043D\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043F\u0440\u0438\u0447\u0438\u043D\u0443, \u0430 \u043D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0435\u0442
\u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435.</p>
<section>
<h2>\u0421\u0432\u043E\u0434\u043A\u0430</h2>
<p id="summary" role="status">\u041F\u0440\u043E\u0432\u0435\u0440\u043E\u043A \u0432 \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u0435\u0449\u0451 \u043D\u0435 \u0431\u044B\u043B\u043E. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 DOI
\u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u0432\u0438\u0434\u0430 10.1038/nature07245 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044E\xBB \u2014 \u043E\u0442\u0432\u0435\u0442
\u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 \u0438 \u0432\u0435\u0440\u0434\u0438\u043A\u0442 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043D\u0438\u0436\u0435.</p>
</section>
<section>
<h2>\u041E\u0434\u043D\u0430 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F</h2>
<p><label for="doi">DOI \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438</label>
<input id="doi" size="36" maxlength="200" placeholder="10.1038/nature07245"></p>
<p><label for="title">\u041E\u0436\u0438\u0434\u0430\u0435\u043C\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435</label>
<input id="title" size="48" maxlength="500"></p>
<p><label for="author">\u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u0430\u0432\u0442\u043E\u0440</label>
<input id="author" size="28" maxlength="200" placeholder="LeCun">
<label for="year">\u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u0433\u043E\u0434</label>
<input id="year" size="6" maxlength="4" placeholder="2015"></p>
</section>
<section>
<h2>\u0412\u0441\u0435 \u0446\u0438\u0442\u0430\u0442\u044B \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430</h2>
<p><label for="draft-id">\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430</label>
<input id="draft-id" size="36" maxlength="120" placeholder="draft-7f3a"></p>
</section>
<p><button id="retry">\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441</button>
<button id="check" data-required="doi">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044E</button>
<button id="draft" data-required="draft-id">\u0421\u0432\u0435\u0440\u0438\u0442\u044C \u0446\u0438\u0442\u0430\u0442\u044B \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430</button></p>
<p id="status" role="status"></p>
<section>
<h2>\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0439 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438</h2>
<div id="result"><p class="hint">\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 \u0435\u0449\u0451 \u043D\u0435\u0442: \u043E\u043D \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.</p></div>
</section>
<section>
<h2>\u0426\u0438\u0442\u0430\u0442\u044B \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430</h2>
<ul id="items"><li class="hint">\u0421\u043F\u0438\u0441\u043A\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442: \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u0435 \u0441\u0432\u0435\u0440\u043A\u0443 \u0446\u0438\u0442\u0430\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430.</li></ul>
</section>
</main><script>
var VERDICT = { exact: '\u0442\u043E\u0447\u043D\u043E\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435', metadata_mismatch: '\u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0438', not_found: '\u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C', ambiguous: '\u043D\u0435\u043E\u0434\u043D\u043E\u0437\u043D\u0430\u0447\u043D\u043E: \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E' };
var REASON = { insufficient_fields: '\u0434\u043B\u044F \u0441\u0432\u0435\u0440\u043A\u0438 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u043F\u043E\u043B\u0435\u0439', multiple_candidates: '\u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0445 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432' };
var FIELD_RU = { doi: '\u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440', title: '\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435', authors: '\u0430\u0432\u0442\u043E\u0440\u044B', author: '\u0430\u0432\u0442\u043E\u0440', year: '\u0433\u043E\u0434', doi_not_found: '\u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u0441 \u0442\u0430\u043A\u0438\u043C \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u043E\u043C \u0432 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0435 \u043D\u0435\u0442', rate_limited: '\u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432', source_unavailable: '\u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0435\u0432\u0435\u0440\u043D\u043E', invalid_candidates: '\u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u044B \u043E\u043F\u0438\u0441\u0430\u043D\u044B \u043D\u0435\u0432\u0435\u0440\u043D\u043E', invalid_doi: '\u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u0446\u0438\u0442\u0430\u0442\u044B \u043D\u0435\u0432\u0435\u0440\u0435\u043D' };
var CHECK_STATE = { match: '\u0441\u043E\u0432\u043F\u0430\u043B\u043E', mismatch: '\u0440\u0430\u0441\u0445\u043E\u0434\u0438\u0442\u0441\u044F', not_compared: '\u043D\u0435 \u0441\u0432\u0435\u0440\u044F\u043B\u043E\u0441\u044C' };
var session = { total: 0, exact: 0, mismatch: 0, other: 0 };
var lastCall = null;
function say(message) { document.getElementById('status').textContent = message; }
function valueOf(id) { return document.getElementById(id).value.trim(); }
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}
function reset(id) {
  var box = document.getElementById(id);
  while (box.firstChild) box.removeChild(box.firstChild);
  return box;
}
async function api(method, path) {
  var response = await fetch('/api/tools/citation-verify/' + path, { method: method, headers: { 'content-type': 'application/json' } });
  var data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data && data.error && data.error.message ? data.error.message : '\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043A\u043E\u0434\u043E\u043C ' + response.status + '.');
  return data;
}
function showSummary() {
  var node = document.getElementById('summary');
  if (!session.total) return;
  node.textContent = '\u041F\u0440\u043E\u0432\u0435\u0440\u043E\u043A \u0432 \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438: ' + session.total + ' \xB7 \u0442\u043E\u0447\u043D\u044B\u0445 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439: ' + session.exact + ' \xB7 \u0441 \u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435\u043C: ' + session.mismatch + ' \xB7 \u0438\u043D\u044B\u0445 \u0438\u0441\u0445\u043E\u0434\u043E\u0432: ' + session.other + '.';
}
function renderVerdict(data) {
  var box = reset('result');
  box.appendChild(el('p', null, '\u0412\u0435\u0440\u0434\u0438\u043A\u0442: ' + (VERDICT[data.verdict] || data.verdict) + '.'));
  if (data.reason) box.appendChild(el('p', 'hint', '\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ' + (REASON[data.reason] || data.reason) + '.'));
  if (data.checks) {
    var table = el('table');
    var header = el('tr');
    header.appendChild(el('th', null, '\u043F\u043E\u043B\u0435'));
    header.appendChild(el('th', null, '\u0441\u0432\u0435\u0440\u043A\u0430'));
    table.appendChild(header);
    ['doi', 'title', 'authors', 'year'].forEach(function (field) {
      var row = el('tr');
      row.appendChild(el('td', null, FIELD_RU[field]));
      row.appendChild(el('td', null, CHECK_STATE[data.checks[field]] || data.checks[field]));
      table.appendChild(row);
    });
    box.appendChild(table);
  }
  if (data.mismatches && data.mismatches.length) {
    box.appendChild(el('p', 'hint', '\u0420\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F: ' + data.mismatches.map(function (name) { return FIELD_RU[name] || name; }).join(', ') + '.'));
  }
  if (data.source) {
    box.appendChild(el('h3', null, data.source.title || '\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E'));
    box.appendChild(el('p', null, '\u0410\u0432\u0442\u043E\u0440\u044B: ' + ((data.source.authors || []).join(', ') || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B')));
    box.appendChild(el('p', 'hint', '\u0414\u0430\u0442\u0430 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438: ' + (data.source.published || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430') + ' \xB7 \u0438\u0437\u0434\u0430\u0442\u0435\u043B\u044C: ' + (data.source.publisher || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D') + ' \xB7 \u0442\u0438\u043F: ' + (data.source.type || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D')));
    box.appendChild(el('p', 'hint', '\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440: ' + data.source.doi + ' \xB7 \u0430\u0434\u0440\u0435\u0441: ' + data.source.url));
  }
}
function showDraft(items) {
  var list = reset('items');
  if (!items.length) {
    list.appendChild(el('li', 'hint', '\u0412 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0435 \u043D\u0435\u0442 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u0446\u0438\u0442\u0430\u0442: \u0441\u0432\u0435\u0440\u044F\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0432 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u2014 \u0438\u0445 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430.'));
    return;
  }
  items.forEach(function (item) {
    var line = el('li');
    line.appendChild(el('strong', null, String(item.source_id)));
    line.appendChild(el('span', 'hint', ' \xB7 ' + (item.verdict ? (VERDICT[item.verdict] || item.verdict) : '\u043E\u0442\u0432\u0435\u0442 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D') + (item.verified ? ' \xB7 \u0446\u0438\u0442\u0430\u0442\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430' : ' \xB7 \u0446\u0438\u0442\u0430\u0442\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430')));
    if (item.mismatches && item.mismatches.length) {
      line.appendChild(el('div', 'hint', '\u041F\u0440\u0438\u0447\u0438\u043D\u044B: ' + item.mismatches.map(function (name) { return FIELD_RU[name] || name; }).join(', ') + '.'));
    }
    list.appendChild(line);
  });
}
async function run(kind, query) {
  lastCall = { kind: kind, query: query };
  say('\u0417\u0430\u043F\u0440\u043E\u0441 \u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0443\u2026');
  try {
    var data = kind === 'draft' ? await api('GET', 'draft?' + query) : await api('GET', 'verify?' + query);
    session.total += 1;
    if (kind === 'draft') {
      showDraft(data.results || []);
      session.exact += data.verified || 0;
      session.mismatch += (data.total || 0) - (data.verified || 0);
      say('\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A: ' + data.total + ' \xB7 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E: ' + data.verified + '.');
    } else {
      renderVerdict(data);
      if (data.verdict === 'exact') session.exact += 1;
      else if (data.verdict === 'metadata_mismatch') session.mismatch += 1;
      else session.other += 1;
      say('\u041E\u0442\u0432\u0435\u0442 \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ' + (VERDICT[data.verdict] || data.verdict) + '.');
    }
    showSummary();
  } catch (error) {
    session.total += 1;
    session.other += 1;
    showSummary();
    say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.');
  }
}
document.getElementById('check').onclick = function () {
  var query = 'doi=' + encodeURIComponent(valueOf('doi'));
  ['title', 'author', 'year'].forEach(function (field) {
    if (valueOf(field)) query += '&' + field + '=' + encodeURIComponent(valueOf(field));
  });
  run('verify', query);
};
document.getElementById('draft').onclick = function () {
  run('draft', 'draft_id=' + encodeURIComponent(valueOf('draft-id')));
};
document.getElementById('retry').onclick = function () {
  if (!lastCall) { say('\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043E\u0434\u043D\u0443 \u0438\u0437 \u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A \u0432\u044B\u0448\u0435.'); return; }
  run(lastCall.kind, lastCall.query);
};
</script></body></html>`;

// modules/citation-verify/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
var DOI_RE = /^10\.\d{4,9}\/\S{1,200}$/i;
function normalizeWork(item) {
  const doi = typeof item?.DOI === "string" ? item.DOI : "";
  if (!DOI_RE.test(doi)) return null;
  const title = Array.isArray(item.title) && typeof item.title[0] === "string" ? item.title[0] : "";
  if (!title) return null;
  const authors = Array.isArray(item.author) ? item.author.flatMap((a) => {
    if (!a || typeof a !== "object") return [];
    const full = [a.given, a.family].filter((x) => typeof x === "string").join(" ").trim();
    if (full) return [full];
    return typeof a.name === "string" ? [a.name] : [];
  }) : [];
  let published = null;
  const parts = Array.isArray(item.published?.["date-parts"]) ? item.published["date-parts"][0] : null;
  if (Array.isArray(parts) && parts.length >= 1 && parts.every((n) => Number.isInteger(n))) {
    published = parts.map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-").slice(0, parts.length === 1 ? 4 : parts.length === 2 ? 7 : 10);
  }
  return {
    doi,
    title,
    authors,
    published,
    type: typeof item.type === "string" ? item.type : null,
    publisher: typeof item.publisher === "string" ? item.publisher : null,
    url: `https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, "/")}`
  };
}
function yearOf(published) {
  if (!published) return null;
  const m = published.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}
function workRecord(work) {
  return {
    doi: work.doi,
    title: work.title,
    authors: work.authors,
    year: yearOf(work.published)
  };
}
function legacyMismatches(mismatches) {
  return mismatches.map((field) => field === "authors" ? "author" : field);
}
function cardRecord(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const source = raw;
  if (source.doi !== void 0 && source.doi !== null && typeof source.doi !== "string") return null;
  if (source.title !== void 0 && source.title !== null && typeof source.title !== "string") return null;
  const rawDoi = typeof source.doi === "string" ? source.doi.trim() : null;
  if (rawDoi && !DOI_RE.test(rawDoi)) return null;
  const doi = rawDoi && DOI_RE.test(rawDoi) ? rawDoi : null;
  const title = typeof source.title === "string" && source.title.trim() ? source.title.trim() : null;
  if (!doi && !title) return null;
  let authors = [];
  if (source.authors !== void 0 && source.authors !== null) {
    if (!Array.isArray(source.authors) || source.authors.some((entry) => typeof entry !== "string")) return null;
    authors = source.authors;
  }
  let year = null;
  if (source.year !== void 0 && source.year !== null) {
    if (typeof source.year !== "number" || !Number.isInteger(source.year)) return null;
    year = source.year;
  }
  return { doi, title, authors, year };
}
function candidateRecords(raw) {
  if (!Array.isArray(raw)) return null;
  const records = raw.map(cardRecord);
  return records.every((record) => record !== null) ? records : null;
}
function matcherOf(ctx) {
  return ctx.require("citation-match");
}
function cardsOf(ctx, draftId) {
  return ctx.require("author-studio").citations(draftId);
}
async function lookupCrossref(doi) {
  let response;
  try {
    response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "user-agent": "TeamPlatform/0.8 (local research)", accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15e3)
    });
  } catch {
    return { ok: false, failure: "source_unavailable" };
  }
  if (response.status === 404) return { ok: false, failure: "doi_not_found" };
  if (response.status === 429) return { ok: false, failure: "rate_limited" };
  if (!response.ok) return { ok: false, failure: "source_unavailable" };
  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, failure: "source_unavailable" };
  }
  const work = normalizeWork(data?.message);
  return work ? { ok: true, work } : { ok: false, failure: "source_unavailable" };
}
function draftFailure(card, failure) {
  return {
    citation_id: card.citation_id,
    source_id: card.source_id,
    verified: false,
    verdict: failure === "source_unavailable" || failure === "rate_limited" ? null : "not_found",
    reason: null,
    matched_by: null,
    checks: null,
    mismatches: [failure],
    candidates: [],
    source: null
  };
}
var module = {
  id: "citation-verify",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/citation-verify/verify", async (c) => {
      const doi = (c.query.get("doi") || "").trim();
      if (!doi || !DOI_RE.test(doi)) {
        return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 DOI (\u0444\u043E\u0440\u043C\u0430\u0442 10.xxxx/...).");
      }
      const expectedAuthor = (c.query.get("author") || "").trim();
      const expectedYearRaw = (c.query.get("year") || "").trim();
      const expectedTitle = (c.query.get("title") || "").trim();
      const expectedYear = expectedYearRaw ? Number(expectedYearRaw) : null;
      if (expectedYearRaw && !Number.isInteger(expectedYear)) {
        return fail(400, "validation_failed", "\u0413\u043E\u0434 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C.");
      }
      const lookup = await lookupCrossref(doi);
      if (!lookup.ok) {
        if (lookup.failure === "doi_not_found") {
          return {
            body: {
              ok: true,
              doi,
              verified: false,
              verdict: "not_found",
              reason: null,
              matched_by: null,
              checks: null,
              mismatches: ["doi_not_found"],
              source: null
            }
          };
        }
        if (lookup.failure === "rate_limited") {
          return fail(429, "rate_limited", "Crossref \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        }
        return fail(503, "source_unavailable", "Crossref \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      }
      const work = lookup.work;
      const citation = {
        doi: work.doi,
        title: expectedTitle || null,
        authors: expectedAuthor ? [expectedAuthor] : [],
        year: expectedYear
      };
      const match = matcherOf(ctx).compare(citation, [workRecord(work)]);
      return {
        body: {
          ok: true,
          doi,
          verified: match.verdict === "exact",
          verdict: match.verdict,
          reason: match.reason,
          matched_by: match.matched_by,
          checks: match.checks,
          mismatches: legacyMismatches(match.mismatches),
          source: work
        }
      };
    });
    ctx.api.add("GET", "/api/tools/citation-verify/draft", async (c) => {
      const draftId = (c.query.get("draft_id") || "").trim();
      if (!draftId) return fail(400, "validation_failed", "\u041D\u0443\u0436\u0435\u043D draft_id.");
      const matcher = matcherOf(ctx);
      let cards;
      try {
        cards = cardsOf(ctx, draftId);
      } catch {
        return fail(503, "storage_unavailable", "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.");
      }
      const results = [];
      for (const card of cards) {
        let records = [];
        let failure = null;
        if (card.candidates !== null && card.candidates !== void 0) {
          const parsed = candidateRecords(card.candidates);
          if (parsed === null) failure = "invalid_candidates";
          else records = parsed;
        } else if (!DOI_RE.test(card.source_id)) {
          failure = "invalid_doi";
        } else {
          const lookup = await lookupCrossref(card.source_id);
          if (!lookup.ok) failure = lookup.failure;
          else records = [workRecord(lookup.work)];
        }
        if (failure) {
          results.push(draftFailure(card, failure));
          continue;
        }
        const citation = {
          doi: DOI_RE.test(card.source_id) ? card.source_id : null,
          title: card.title,
          authors: card.authors,
          year: card.year
        };
        const match = matcher.compare(citation, records);
        results.push({
          citation_id: card.citation_id,
          source_id: card.source_id,
          verified: match.verdict === "exact",
          verdict: match.verdict,
          reason: match.reason,
          matched_by: match.matched_by,
          checks: match.checks,
          mismatches: match.mismatches,
          candidates: match.candidates,
          source: match.record
        });
      }
      const verifiedCount = results.filter((result) => result.verified).length;
      return { body: { ok: true, draft_id: draftId, total: results.length, verified: verifiedCount, results } };
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
