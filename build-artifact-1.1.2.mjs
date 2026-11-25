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

// modules/build-artifact/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \u0441\u0431\u043E\u0440\u043A\u0438</title></head><body><main>
<h1>\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \u0441\u0431\u043E\u0440\u043A\u0438</h1>
<p>\u041C\u0430\u043D\u0438\u0444\u0435\u0441\u0442 \u0441\u0431\u043E\u0440\u043A\u0438: \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440, \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u0432\u0435\u0440\u0441\u0438\u044F \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u0438\u0437
<code>engine-detect</code>, digest \u0438 \u0432\u0440\u0435\u043C\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F. \u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043A\u043E\u043C\u043F\u0438\u043B\u0438\u0440\u0443\u0435\u0442\u0441\u044F:
\u043C\u043E\u0434\u0443\u043B\u044C \u0445\u0440\u0430\u043D\u0438\u0442 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0443\u0436\u0435 \u0433\u043E\u0442\u043E\u0432\u043E\u0439 \u0441\u0431\u043E\u0440\u043A\u0438.</p>
<p><label>\u041F\u0430\u043F\u043A\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 (\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 \u043F\u0443\u0442\u044C)<br>
<input id="path" size="72" placeholder="D:\\projects\\game"></label></p>
<p><label>\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0431\u043E\u0440\u043A\u0438 <input id="build-id" maxlength="120" placeholder="build-2026-11-24-01"></label></p>
<p><label>\u0414\u0432\u0438\u0436\u043E\u043A, \u0435\u0441\u043B\u0438 \u043D\u0435 \u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 <input id="engine" maxlength="40" placeholder="\u043D\u0430\u043F\u0440. godot"></label>
<label>\u0412\u0435\u0440\u0441\u0438\u044F <input id="version" maxlength="60" placeholder="\u043D\u0430\u043F\u0440. 4.2"></label>
<label>Digest <input id="digest" maxlength="128" placeholder="sha256 \u0430\u0440\u0445\u0438\u0432\u0430"></label></p>
<p><button id="context">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u0432\u0435\u0440\u0441\u0438\u044E</button>
<button id="save">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043C\u0430\u043D\u0438\u0444\u0435\u0441\u0442</button>
<button id="load">\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u043C\u0430\u043D\u0438\u0444\u0435\u0441\u0442</button></p>
<p id="status" role="status"></p>
<h2>\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442</h2>
<pre id="result"></pre>
</main><script>
function say(message) { document.getElementById('status').textContent = message; }
function text(id) { return document.getElementById(id).value.trim(); }
function isAbsolute(value) { return /^[a-zA-Z]:[\\\\/]/.test(value) || value.charAt(0) === '/'; }
async function call(method, path, payload) {
  const init = { method: method, headers: { 'content-type': 'application/json' } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  const response = await fetch('/api/tools/build-artifact/' + path, init);
  const data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data && data.error && data.error.message ? data.error.message : '\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043A\u043E\u0434\u043E\u043C ' + response.status + '.');
  return data;
}
function showManifest(manifest) {
  document.getElementById('result').textContent = [
    '\u0421\u0431\u043E\u0440\u043A\u0430: ' + manifest.build_id,
    '\u0414\u0432\u0438\u0436\u043E\u043A: ' + manifest.engine,
    '\u0412\u0435\u0440\u0441\u0438\u044F: ' + (manifest.version || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430'),
    'Digest: ' + (manifest.digest || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D'),
    '\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: ' + manifest.saved_at,
  ].join('\\n');
}
document.getElementById('context').onclick = async function () {
  const path = text('path');
  if (!path) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0430: \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 \u043F\u0443\u0442\u044C, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 D:\\\\projects\\\\game.'); return; }
  if (!isAbsolute(path)) { say('\u041F\u0443\u0442\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C: \u0441 \u0434\u0438\u0441\u043A\u0430 (D:\\\\projects\\\\game) \u0438\u043B\u0438 \u043E\u0442 \u043A\u043E\u0440\u043D\u044F (/home/ivan/game).'); return; }
  say('\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u044E \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u0432\u0435\u0440\u0441\u0438\u044E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u2026');
  try {
    const data = await call('POST', 'context', { path: path });
    document.getElementById('result').textContent = ['\u041F\u0443\u0442\u044C: ' + data.path, '\u0414\u0432\u0438\u0436\u043E\u043A: ' + data.engine, '\u0412\u0435\u0440\u0441\u0438\u044F: ' + (data.version || '\u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0430')].join('\\n');
    say(data.engine === 'unknown' ? '\u0414\u0432\u0438\u0436\u043E\u043A \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u043C\u0430\u043D\u0438\u0444\u0435\u0441\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.' : '\u0414\u0432\u0438\u0436\u043E\u043A: ' + data.engine + (data.version ? ', \u0432\u0435\u0440\u0441\u0438\u044F ' + data.version : ''));
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
document.getElementById('save').onclick = async function () {
  const buildId = text('build-id');
  if (!buildId) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0431\u043E\u0440\u043A\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 build-2026-11-24-01.'); return; }
  const payload = { build_id: buildId };
  const path = text('path'), engine = text('engine'), version = text('version'), digest = text('digest');
  if (path) payload.path = path;
  if (engine) payload.engine = engine;
  if (version) payload.version = version;
  if (digest) payload.digest = digest;
  say('\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u044E \u043C\u0430\u043D\u0438\u0444\u0435\u0441\u0442\u2026');
  try {
    const data = await call('POST', 'manifest', payload);
    showManifest(data.manifest);
    say('\u041C\u0430\u043D\u0438\u0444\u0435\u0441\u0442 \xAB' + data.manifest.build_id + '\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D: \u0434\u0432\u0438\u0436\u043E\u043A ' + data.manifest.engine + '.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
document.getElementById('load').onclick = async function () {
  const buildId = text('build-id');
  if (!buildId) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0431\u043E\u0440\u043A\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C.'); return; }
  say('\u0427\u0438\u0442\u0430\u044E \u043C\u0430\u043D\u0438\u0444\u0435\u0441\u0442\u2026');
  try {
    const data = await call('GET', 'manifest/' + encodeURIComponent(buildId));
    showManifest(data.manifest);
    say('\u041C\u0430\u043D\u0438\u0444\u0435\u0441\u0442 \xAB' + data.manifest.build_id + '\xBB \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
</script></body></html>`;

// modules/build-artifact/index.ts
var NO_STORE = { "cache-control": "no-store" };
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "build_artifact_body_invalid" });
  }
  return raw;
}
function trimmed(v) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}
var module = {
  id: "build-artifact",
  apiVersion: 1,
  register(ctx) {
    let detect = null;
    try {
      const svc = ctx.require("engine-detect");
      detect = svc.detect ?? svc.detectEngines ?? null;
    } catch {
      detect = null;
    }
    ctx.storage.migrate([{
      version: "build-artifact/1_manifests",
      sql: `CREATE TABLE IF NOT EXISTS build_manifests (
        build_id TEXT PRIMARY KEY,
        engine TEXT NOT NULL,
        version TEXT,
        digest TEXT,
        saved_at TEXT NOT NULL
      )`
    }]);
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("POST", "/api/tools/build-artifact/context", (request) => {
      const body = bodyOf(request.body);
      const path = String(body.path ?? "").trim();
      if (!path) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D path", {}, { code: "build_artifact_path_required" });
      const projects = detect ? detect(path) : [];
      const project = Array.isArray(projects) && projects.length ? projects[0] : null;
      return { status: 200, headers: NO_STORE, body: { ok: true, engine: project?.engine ?? "unknown", version: project?.version ?? null, path } };
    });
    ctx.api.add("POST", "/api/tools/build-artifact/manifest", (request) => {
      const body = bodyOf(request.body);
      const buildId = trimmed(body.build_id);
      if (!buildId) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D build_id", {}, { code: "build_artifact_build_id_required" });
      const path = trimmed(body.path);
      let engine = trimmed(body.engine);
      let version = trimmed(body.version);
      if (path && detect) {
        const projects = detect(path);
        const project = Array.isArray(projects) && projects.length ? projects[0] : null;
        if (!engine) engine = project?.engine ?? null;
        if (!version) version = project?.version ?? null;
      }
      const finalEngine = engine ?? "unknown";
      const digest = trimmed(body.digest);
      const savedAt = (/* @__PURE__ */ new Date()).toISOString();
      ctx.storage.transaction(() => {
        ctx.storage.raw.prepare("INSERT OR REPLACE INTO build_manifests (build_id, engine, version, digest, saved_at) VALUES (?, ?, ?, ?, ?)").run(buildId, finalEngine, version, digest, savedAt);
      });
      const manifest = { build_id: buildId, engine: finalEngine, version, digest, saved_at: savedAt };
      return { status: 200, headers: NO_STORE, body: { ok: true, manifest } };
    });
    ctx.api.add("GET", "/api/tools/build-artifact/manifest/:build_id", (request) => {
      const buildId = String(request.params?.build_id ?? "").trim();
      const row = ctx.storage.raw.prepare("SELECT build_id, engine, version, digest, saved_at FROM build_manifests WHERE build_id = ?").get(buildId);
      if (!row) throw new ValidationError("\u041C\u0430\u043D\u0438\u0444\u0435\u0441\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", { build_id: buildId }, { code: "build_artifact_not_found" });
      const manifest = { build_id: row.build_id, engine: row.engine, version: row.version, digest: row.digest, saved_at: row.saved_at };
      return { status: 200, headers: NO_STORE, body: { ok: true, manifest } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
