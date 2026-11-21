import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/activity-predictions/index.ts
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// modules/activity-predictions/predictions.ts
var actions = {
  "task.create": { title: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443", view: "tasks", example: "\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435." },
  "task.status": { title: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438", view: "tasks", example: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443, \u0435\u0441\u043B\u0438 \u0437\u0430\u0434\u0430\u0447\u0430 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u0430." },
  "run.create": { title: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0430", view: "runs", example: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443, \u0430\u0433\u0435\u043D\u0442\u0430 \u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0443\u044E \u043C\u043E\u0434\u0435\u043B\u044C." },
  "mission.plan": { title: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u043F\u043B\u0430\u043D \u043C\u0438\u0441\u0441\u0438\u0438", view: "missions", example: "\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0446\u0435\u043B\u044C \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u043B\u0430\u043D\u0430." },
  "mission.create": { title: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043C\u0438\u0441\u0441\u0438\u044E", view: "missions", example: "\u0420\u0430\u0437\u0431\u0435\u0439\u0442\u0435 \u0446\u0435\u043B\u044C \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C\u044B\u0435 \u044D\u0442\u0430\u043F\u044B." }
};
var MAX_GAP_MS = 30 * 60 * 1e3;
var MAX_CONTEXT_MS = 10 * 60 * 1e3;
function isInputAction(action) {
  return typeof action === "string" && (Object.hasOwn(actions, action) || /^view:[a-z0-9][a-z0-9-]{0,63}$/.test(action) && action !== "view:activity-predictions");
}
function isOutcome(action) {
  return action === "run.failed" || action === "run.succeeded";
}
function isTab(id) {
  return typeof id === "string" && /^[a-f0-9-]{36}$/.test(id);
}
function predict(rows, tab, now) {
  const local = rows.filter((row) => row.tab === tab);
  const last = local.at(-1);
  const suggestions = [];
  const outcome = rows.findLast((row) => isOutcome(row.action));
  if (outcome?.action === "run.failed" && now - outcome.at <= MAX_CONTEXT_MS) {
    suggestions.push({
      action: "view:runs",
      view: "runs",
      title: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0443 \u0437\u0430\u043F\u0443\u0441\u043A\u0430",
      reason: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0436\u0443\u0440\u043D\u0430\u043B \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0430\u0433\u0435\u043D\u0442\u0430, \u043C\u043E\u0434\u0435\u043B\u0438 \u0438\u043B\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0443\u044E \u043A\u0432\u043E\u0442\u0443.",
      source: "context"
    });
  }
  if (!last || now - last.at > MAX_GAP_MS) return suggestions;
  const counts = /* @__PURE__ */ new Map();
  const previous = /* @__PURE__ */ new Map();
  let total = 0;
  for (const row of rows) {
    if (isOutcome(row.action)) continue;
    const before = previous.get(row.tab);
    previous.set(row.tab, row);
    if (before?.action !== last.action || row.at - before.at > MAX_GAP_MS) continue;
    total++;
    if (row.action === before.action) continue;
    counts.set(row.action, (counts.get(row.action) ?? 0) + 1);
  }
  for (const [action, matches] of [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    if (matches < 2 || suggestions.length === 3) break;
    if (suggestions.some((item) => item.action === action)) continue;
    const request = Object.hasOwn(actions, action) ? actions[action] : void 0;
    suggestions.push({
      action,
      title: request?.title ?? "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0430\u0437\u0434\u0435\u043B",
      view: request?.view ?? action.slice(5),
      example: request?.example,
      reason: `\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u043B\u043E \u0437\u0430 \u043F\u043E\u0445\u043E\u0436\u0438\u043C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435\u043C ${matches} \u0438\u0437 ${total} \u0440\u0430\u0437.`,
      source: "history",
      matches,
      total
    });
  }
  if (!suggestions.length && last.action === "task.create") {
    suggestions.push({
      action: "run.create",
      ...actions["run.create"],
      reason: "\u0412\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u043E \u0441\u043E\u0437\u0434\u0430\u043B\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u0440\u0443\u0447\u0438\u0442\u044C \u0435\u0451 \u0430\u0433\u0435\u043D\u0442\u0443.",
      source: "context"
    });
  }
  return suggestions;
}

// modules/activity-predictions/page.ts
var PAGE = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>\u041F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u044F</title>
<style>
main { max-width: 800px; margin: 0 auto; padding: 24px; }
section { border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-block: 16px; background: var(--panel); }
button { margin: 4px 8px 4px 0; }
li { margin-block: 12px; }
</style></head>
<body><main>
<h1>\u041F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u044F</h1>
<p>\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u044B \u043D\u0430 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430\u0445 \u043C\u0435\u0436\u0434\u0443 \u0440\u0430\u0437\u0434\u0435\u043B\u0430\u043C\u0438, \u0442\u0438\u043F\u0430\u0445 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432. \u0423\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0434\u043E 500 \u0441\u043E\u0431\u044B\u0442\u0438\u0439 \u044D\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 30 \u0434\u043D\u0435\u0439.</p>
<section>
  <h2>\u0427\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0434\u0430\u043B\u044C\u0448\u0435</h2>
  <p id="status" role="status">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</p>
  <ul id="suggestions"></ul>
  <button id="refresh" type="button">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button>
</section>
<section>
  <h2>\u0418\u0441\u0442\u043E\u0440\u0438\u044F</h2>
  <p id="history"></p>
  <button id="toggle" type="button" disabled>\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0431\u043E\u0440</button>
  <button id="reset" type="button" disabled>\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044E</button>
</section>
</main>
<script>
const base = '/api/tools/activity-predictions';
const status = document.getElementById('status');
const list = document.getElementById('suggestions');
const historyInfo = document.getElementById('history');
const toggle = document.getElementById('toggle');
const reset = document.getElementById('reset');
let enabled = false;
let busy = false;
async function json(path, init) {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.message || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430');
  return data;
}
async function load() {
  const tab = new URLSearchParams(location.search).get('tab');
  const data = await json(tab ? base + '?tab=' + encodeURIComponent(tab) : base);
  const names = { tasks: '\u0414\u043E\u0441\u043A\u0430 \u0437\u0430\u0434\u0430\u0447', runs: '\u0417\u0430\u043F\u0443\u0441\u043A\u0438', missions: '\u041C\u0438\u0441\u0441\u0438\u0438',
    home: '\u0413\u043B\u0430\u0432\u043D\u0430\u044F', catalog: '\u041A\u0430\u0442\u0430\u043B\u043E\u0433', backup: '\u0420\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0435 \u043A\u043E\u043F\u0438\u0438' };
  enabled = data.enabled;
  toggle.textContent = enabled ? '\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0431\u043E\u0440' : '\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u0441\u0431\u043E\u0440';
  toggle.disabled = data.unavailable;
  reset.disabled = false;
  historyInfo.textContent = '\u0421\u043E\u0431\u044B\u0442\u0438\u0439 \u0432 \u0438\u0441\u0442\u043E\u0440\u0438\u0438: ' + data.count + '.';
  list.replaceChildren();
  const suggestions = data.suggestions;
  status.textContent = data.unavailable ? '\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430. \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0435 \u0435\u0451, \u0447\u0442\u043E\u0431\u044B \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0431\u043E\u0440.' :
    !enabled ? '\u0421\u0431\u043E\u0440 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.' : suggestions.length ? '' :
    '\u041F\u043E\u043A\u0430 \u043C\u0430\u043B\u043E \u0434\u0430\u043D\u043D\u044B\u0445. \u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0445\u0441\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u0438\u043B\u0438 \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0437\u0430\u043F\u0443\u0441\u043A\u0430.';
  for (const item of suggestions) {
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.view === 'catalog' ? '/' : '/m/' + encodeURIComponent(item.view) + '/';
    link.textContent = item.action.startsWith('view:') && item.source === 'history'
      ? '\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB' + (Object.hasOwn(names, item.view) ? names[item.view] : item.view) + '\xBB'
      : item.title;
    const reason = document.createElement('p');
    reason.textContent = item.reason + (item.example ? ' ' + item.example : '');
    row.append(link, reason);
    list.append(row);
  }
}
async function update(body) {
  if (busy) return;
  busy = true;
  try {
    if (body) await json(base + '/settings', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
    });
    await load();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
  }
}
document.getElementById('refresh').onclick = () => update();
toggle.onclick = () => update({ enabled: !enabled });
reset.onclick = () => update({ reset: true });
update();
</script></body></html>`;

// modules/activity-predictions/room.ts
function suggestRoom(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.missions)) return [];
  const { missions, member_id } = raw;
  const result = [];
  for (const mission of missions) {
    if (result.length === 3) break;
    if (!Array.isArray(mission.stages) || typeof mission.id !== "string") continue;
    const failed = mission.stages.find((stage) => stage.status === "failed");
    const blocked = mission.stages.find((stage) => stage.status === "queued" && !stage.waits?.available && !stage.waits?.dependency);
    const report = mission.stages.find((stage) => stage.operation === "image.report@1" && stage.status === "succeeded");
    if (failed) result.push({
      mission_id: mission.id,
      title: mission.author_id === member_id ? "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u044D\u0442\u0430\u043F" : "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0431\u043E\u0439 \u044D\u0442\u0430\u043F\u0430",
      reason: "\u042D\u0442\u0430\u043F \xAB" + failed.title + "\xBB \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439. \u0413\u043E\u0442\u043E\u0432\u044B\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0445 \u044D\u0442\u0430\u043F\u043E\u0432 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.",
      target: "mission"
    });
    else if (blocked) result.push({
      mission_id: mission.id,
      title: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430",
      reason: "\u042D\u0442\u0430\u043F \xAB" + blocked.title + "\xBB \u0436\u0434\u0451\u0442 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0435 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E. \u041D\u0430 \u0434\u043E\u0441\u043A\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043F\u0440\u0438\u0447\u0438\u043D\u044B \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F.",
      target: "devices"
    });
    else if (report) result.push({
      mission_id: mission.id,
      title: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0433\u043E\u0442\u043E\u0432\u0443\u044E \u0441\u0432\u043E\u0434\u043A\u0443",
      reason: "\u0412\u0441\u0435 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u044B\u0435 \u044D\u0442\u0430\u043F\u044B \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u044B.",
      target: "mission"
    });
  }
  return result;
}

// modules/activity-predictions/index.ts
var LIMIT = 500;
var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
function sanitizeRows(rows, now = Date.now()) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(-LIMIT).filter((row) => row && typeof row === "object" && (isInputAction(row.action) && isTab(row.tab) || isOutcome(row.action) && row.tab === "background") && Number.isSafeInteger(row.at) && row.at <= now && row.at >= now - MAX_AGE_MS).map(({ action, tab, at }) => ({ action, tab, at }));
}
var module = {
  id: "activity-predictions",
  apiVersion: 1,
  register(ctx) {
    ctx.publish({ suggestRoom });
    const file = ctx.paths.resolve("history.json");
    let data = { enabled: true, rows: [] };
    let unavailable = false;
    let generation = randomUUID();
    try {
      if (existsSync(file)) {
        const stored = JSON.parse(readFileSync(file, "utf8"));
        if (typeof stored?.enabled !== "boolean" || !Array.isArray(stored.rows)) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0438\u0441\u0442\u043E\u0440\u0438\u0438");
        data = { enabled: stored.enabled, rows: sanitizeRows(stored.rows) };
      }
    } catch {
      unavailable = true;
      data.enabled = false;
      ctx.log.warn("\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u0440\u0435\u0434\u0441\u043A\u0430\u0437\u0430\u043D\u0438\u0439 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u0430. \u0421\u0431\u043E\u0440 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.");
    }
    const save = (next) => {
      const temp = ctx.paths.resolve("history.tmp");
      writeFileSync(temp, JSON.stringify(next), { encoding: "utf8", mode: 384 });
      renameSync(temp, file);
      data = next;
      unavailable = false;
    };
    const add = (action, tab) => {
      if (!data.enabled) return;
      const last = data.rows.at(-1);
      const at = Date.now();
      if (last?.action === action && last.tab === tab && at - last.at < 1e3) return;
      save({ enabled: true, rows: sanitizeRows([...data.rows, { action, tab, at }], at) });
    };
    ctx.onShutdown(ctx.bus.subscribe((event) => {
      if (isOutcome(event.type)) add(event.type, "background");
    }));
    ctx.api.add("POST", "/api/tools/activity-predictions/observe", ({ body }) => {
      const input = body;
      if (!input || !isInputAction(input.action) || !isTab(input.tab) || !isTab(input.generation) || Object.keys(input).length !== 3) {
        throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u0442\u0438\u043F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F, \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0432\u043A\u043B\u0430\u0434\u043A\u0438 \u0438 \u0432\u0435\u0440\u0441\u0438\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438.");
      }
      if (input.generation !== generation) return { status: 409, body: { generation, enabled: data.enabled } };
      add(input.action, input.tab);
      return { status: 204 };
    });
    ctx.api.add("GET", "/api/tools/activity-predictions", ({ query }) => {
      const now = Date.now();
      const rows = sanitizeRows(data.rows, now);
      const tab = query.get("tab") ?? rows.findLast((row) => !isOutcome(row.action))?.tab ?? "";
      return { headers: { "cache-control": "no-store" }, body: {
        enabled: data.enabled,
        generation,
        unavailable,
        count: rows.length,
        suggestions: data.enabled ? predict(rows, isTab(tab) ? tab : "", now) : []
      } };
    });
    ctx.api.add("POST", "/api/tools/activity-predictions/settings", ({ body }) => {
      const input = body;
      if (!input || Object.keys(input).length !== 1 || typeof input.enabled !== "boolean" && input.reset !== true) {
        throw new ValidationError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 enabled \u0438\u043B\u0438 reset.");
      }
      save({
        enabled: typeof input.enabled === "boolean" ? input.enabled : data.enabled,
        rows: input.reset === true ? [] : sanitizeRows(data.rows)
      });
      generation = randomUUID();
      return { body: { ok: true, enabled: data.enabled, generation } };
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
