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
      raw: '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>\u0418\u0433\u0440\u043E\u0432\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F</title></head><body><h1>\u0418\u0433\u0440\u043E\u0432\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F</h1><p>\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u043F\u043B\u0435\u0439\u0442\u0435\u0441\u0442\u0430: \u0434\u0432\u0438\u0436\u043E\u043A \u0438 \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u0431\u043E\u0440\u043A\u0438 \u0438\u0437 <code>engine-detect</code>, \u0437\u0430\u043F\u0438\u0441\u0438 \u0441\u0435\u0441\u0441\u0438\u0438 \u0438 \u0438\u0445 \u0441\u0432\u044F\u0437\u044C \u0441 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u043C.</p></body></html>',
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
  index_default as default
};
