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

// modules/playtest-session/index.ts
var NO_STORE = { "cache-control": "no-store" };
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "playtest_session_body_invalid" });
  }
  return raw;
}
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>\u0418\u0433\u0440\u043E\u0432\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F</title></head>
<body><main>
<h1>\u0418\u0433\u0440\u043E\u0432\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F</h1>
<p>\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \u0432\u043E\u043F\u0440\u043E\u0441 \xAB\u0432 \u043A\u0430\u043A\u043E\u043C \u0434\u0432\u0438\u0436\u043A\u0435 \u0438 \u043A\u0430\u043A\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 \u0441\u043E\u0431\u0440\u0430\u043D \u044D\u0442\u043E\u0442 \u043F\u0440\u043E\u0435\u043A\u0442\xBB: \u043F\u0443\u0442\u044C \u043A \u043F\u0430\u043F\u043A\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442\u0441\u044F \u043C\u043E\u0434\u0443\u043B\u044E \xAB\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043A\u0430\xBB. \u0417\u0430\u043F\u0438\u0441\u0438 \u043F\u043B\u0435\u0439\u0442\u0435\u0441\u0442\u0430 \u0437\u0434\u0435\u0441\u044C \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u044E\u0442\u0441\u044F \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0441\u0435\u0441\u0441\u0438\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u0442\u043E\u043C \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0441 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u043C \u0441\u0431\u043E\u0440\u043A\u0438.</p>
<p id="setup" role="status">\u0414\u0432\u0438\u0436\u043E\u043A \u0438 \u0432\u0435\u0440\u0441\u0438\u044F \u0431\u0435\u0440\u0443\u0442\u0441\u044F \u0438\u0437 \u043C\u043E\u0434\u0443\u043B\u044F \xAB\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043A\u0430\xBB. \u0415\u0441\u043B\u0438 \u043E\u043D \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D, \u043E\u0442\u0432\u0435\u0442 \u0431\u0443\u0434\u0435\u0442 \xABunknown\xBB \u2014 \u044D\u0442\u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043C\u043E\u0434\u0443\u043B\u044F, \u0430 \u043D\u0435 \u043E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430.</p>
<section>
  <p><label>\u041F\u0443\u0442\u044C \u043A \u043F\u0430\u043F\u043A\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 <input id="path" maxlength="500" size="70" placeholder="\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 \u043F\u0443\u0442\u044C \u043A \u043F\u0430\u043F\u043A\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430" /></label></p>
  <p><button id="context-btn">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u0432\u0435\u0440\u0441\u0438\u044E</button></p>
</section>
<p id="status" role="status"></p>
<section>
  <h2>\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442</h2>
  <p id="result-note" role="status">\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0434\u0432\u0438\u0436\u043E\u043A, \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u0431\u043E\u0440\u043A\u0438 \u0438 \u043F\u0443\u0442\u044C, \u043F\u043E \u043A\u043E\u0442\u043E\u0440\u043E\u043C\u0443 \u043E\u043D\u0438 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.</p>
  <pre id="result" style="white-space:pre-wrap"></pre>
</section>
<script>
var statusLine = document.getElementById('status');
var note = document.getElementById('result-note');
var out = document.getElementById('result');
function say(text) { statusLine.textContent = text; }
function noteSay(text) { note.textContent = text; }
function field(id) { return document.getElementById(id).value.trim(); }
async function api(method, path, body) {
  var r = await fetch(path, { method: method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  var data = await r.json().catch(function () { return null; });
  if (!r.ok) { throw Error(data && data.error && data.error.message ? data.error.message : '\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ' + r.status); }
  return data;
}
document.getElementById('context-btn').onclick = async function () {
  var path = field('path');
  if (!path) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u043A \u043F\u0430\u043F\u043A\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u2014 \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  this.disabled = true;
  say('\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u0432\u0435\u0440\u0441\u0438\u044E \u0441\u0431\u043E\u0440\u043A\u0438\u2026');
  try {
    var data = await api('POST', '/api/tools/playtest-session/context', { path: path });
    var known = Boolean(data.engine) && data.engine !== 'unknown';
    out.textContent = [
      '\u0414\u0432\u0438\u0436\u043E\u043A: ' + data.engine,
      '\u0412\u0435\u0440\u0441\u0438\u044F \u0441\u0431\u043E\u0440\u043A\u0438: ' + (data.version || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430'),
      '\u041F\u0443\u0442\u044C: ' + data.path,
    ].join('\\n');
    noteSay(known
      ? '\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0441\u0435\u0441\u0441\u0438\u0438 \u0433\u043E\u0442\u043E\u0432: \u043F\u0440\u043E\u0435\u043A\u0442 \u043E\u043F\u043E\u0437\u043D\u0430\u043D. \u0412\u0435\u0440\u0441\u0438\u044E \u0441\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u0441 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u043C \u0441\u0431\u043E\u0440\u043A\u0438 \u2014 \u043C\u043E\u0434\u0443\u043B\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0438\u0442\u0430\u0435\u0442 \u0435\u0451 \u0438\u0437 \u043F\u0440\u043E\u0435\u043A\u0442\u0430.'
      : '\u0414\u0432\u0438\u0436\u043E\u043A \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D: \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043A\u0430\xBB \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D, \u043B\u0438\u0431\u043E \u0432 \u044D\u0442\u043E\u0439 \u043F\u0430\u043F\u043A\u0435 \u043D\u0435\u0442 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u0435\u043C\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0443\u0442\u044C \u2014 \u0441\u0430\u043C \u0437\u0430\u043F\u0440\u043E\u0441 \u0431\u044B\u043B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u043C.');
    say(known ? '\u0414\u0432\u0438\u0436\u043E\u043A \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D.' : '\u0414\u0432\u0438\u0436\u043E\u043A \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D: \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u0435 \u2014 \u0432 \u0431\u043B\u043E\u043A\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
</script>
</main></body>
</html>`;
var module = {
  id: "playtest-session",
  apiVersion: 1,
  register(ctx) {
    let detect = null;
    try {
      const svc = ctx.require("engine-detect");
      detect = svc.detect ?? svc.detectEngines ?? null;
    } catch {
      detect = null;
    }
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("POST", "/api/tools/playtest-session/context", (request) => {
      const body = bodyOf(request.body);
      const path = String(body.path ?? "").trim();
      if (!path) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D path", {}, { code: "playtest_session_path_required" });
      const projects = detect ? detect(path) : [];
      const project = Array.isArray(projects) && projects.length ? projects[0] : null;
      return { status: 200, headers: NO_STORE, body: { ok: true, engine: project?.engine ?? "unknown", version: project?.version ?? null, path } };
    });
  }
};
var index_default = module;
export {
  PAGE,
  index_default as default
};
