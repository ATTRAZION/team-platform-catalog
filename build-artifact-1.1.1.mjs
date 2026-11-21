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
      raw: '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>\u0421\u0431\u043E\u0440\u043A\u0438 \u0438 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B</title></head><body><h1>\u0421\u0431\u043E\u0440\u043A\u0438 \u0438 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B</h1><p>\u041C\u0430\u043D\u0438\u0444\u0435\u0441\u0442\u044B \u0441\u0431\u043E\u0440\u043E\u043A: \u0434\u0432\u0438\u0436\u043E\u043A, \u0432\u0435\u0440\u0441\u0438\u044F, digest \u0438 \u0432\u0440\u0435\u043C\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F. \u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0439\u0442\u0435 \u0438 \u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0438\u0445 \u0447\u0435\u0440\u0435\u0437 <code>/api/tools/build-artifact/manifest</code>.</p></body></html>',
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
