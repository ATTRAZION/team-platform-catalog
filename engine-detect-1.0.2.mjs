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

// modules/engine-detect/scan.ts
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
var IGNORED = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  ".godot",
  "Library",
  "Temp",
  "obj",
  "bin",
  "Build",
  "Builds",
  "Intermediate",
  "Saved",
  "DerivedDataCache"
]);
var MAX_DEPTH = 4;
var MAX_ENTRIES = 2e3;
var MAX_TEXT = 1024 * 1024;
function fail(message, code, details = {}) {
  throw new ValidationError(message, details, { code });
}
function readText(path) {
  try {
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_TEXT) return "";
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
function fileIn(dir, name) {
  try {
    const path = join(dir, name);
    const info = lstatSync(path);
    return info.isFile() && !info.isSymbolicLink() ? path : null;
  } catch {
    return null;
  }
}
function dirIn(dir, name) {
  try {
    const path = join(dir, name);
    const info = lstatSync(path);
    return info.isDirectory() && !info.isSymbolicLink() ? path : null;
  } catch {
    return null;
  }
}
function stripRange(version) {
  return version.trim().replace(/^[~^<>=v\s]+/, "");
}
function godotVersion(source) {
  const features = /config\/features\s*=\s*PackedStringArray\(([^)]*)\)/.exec(source);
  const match = /"([0-9]+(?:\.[0-9]+){0,3})"/.exec(features?.[1] ?? "");
  return match?.[1] ?? null;
}
function cargoVersion(source) {
  const direct = /(?:^|\n)\s*bevy\s*=\s*["']([^"']+)["']/.exec(source)?.[1];
  if (direct) return stripRange(direct);
  const table = /(?:^|\n)\s*bevy\s*=\s*\{[^}]*\bversion\s*=\s*["']([^"']+)["']/.exec(source)?.[1];
  return table ? stripRange(table) : null;
}
function packageVersion(source) {
  try {
    const parsed = JSON.parse(source);
    for (const section of ["dependencies", "devDependencies"]) {
      const deps = parsed[section];
      if (deps && typeof deps === "object" && !Array.isArray(deps)) {
        const value = deps.phaser;
        if (typeof value === "string") return stripRange(value);
      }
    }
  } catch {
    return null;
  }
  return null;
}
function inspectDirectory(dir, names) {
  const found = [];
  if (names.has("project.godot")) {
    found.push({
      engine: "godot",
      version: godotVersion(readText(join(dir, "project.godot"))),
      path: "",
      markers: ["project.godot"],
      platforms: []
    });
  }
  if (names.has("Assets") && names.has("ProjectSettings") && dirIn(dir, "Assets") && dirIn(dir, "ProjectSettings")) {
    const versionFile = fileIn(join(dir, "ProjectSettings"), "ProjectVersion.txt");
    const version = /m_EditorVersion:\s*([^\s]+)/.exec(versionFile ? readText(versionFile) : "")?.[1] ?? null;
    found.push({
      engine: "unity",
      version,
      path: "",
      markers: ["Assets/", "ProjectSettings/"],
      platforms: []
    });
  }
  const uproject = [...names].find((name) => name.toLowerCase().endsWith(".uproject")) ?? null;
  if (uproject) {
    let version = null;
    const platforms = [];
    try {
      const parsed = JSON.parse(readText(join(dir, uproject)));
      if (typeof parsed.EngineAssociation === "string" && /^[0-9]/.test(parsed.EngineAssociation)) {
        version = parsed.EngineAssociation;
      }
      if (Array.isArray(parsed.TargetPlatforms)) {
        platforms.push(...parsed.TargetPlatforms.filter((item) => typeof item === "string"));
      }
    } catch {
    }
    found.push({ engine: "unreal", version, path: "", markers: [uproject], platforms });
  }
  const cargo = fileIn(dir, "Cargo.toml");
  if (cargo) {
    const source = readText(cargo);
    const version = cargoVersion(source);
    if (version || /(^|\n)\s*bevy\s*=/.test(source)) {
      found.push({ engine: "bevy", version, path: "", markers: ["Cargo.toml"], platforms: [] });
    }
  }
  const packageFile = fileIn(dir, "package.json");
  if (packageFile) {
    const version = packageVersion(readText(packageFile));
    if (version) found.push({ engine: "phaser", version, path: "", markers: ["package.json"], platforms: [] });
  }
  return found;
}
function detectEngines(rootInput) {
  if (!rootInput || !isAbsolute(rootInput)) fail("\u041D\u0443\u0436\u0435\u043D \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 \u043F\u0443\u0442\u044C \u043A \u043F\u0440\u043E\u0435\u043A\u0442\u0443", "engine_path_invalid", { path: rootInput });
  const root = resolve(rootInput);
  let rootInfo;
  try {
    rootInfo = lstatSync(root);
  } catch {
    fail("\u041F\u0430\u043F\u043A\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", "engine_path_invalid", { path: rootInput });
  }
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    fail("\u041D\u0443\u0436\u043D\u0430 \u043F\u0430\u043F\u043A\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430", "engine_path_invalid", { path: rootInput });
  }
  const projects = [];
  let entries = 0;
  const walk = (dir, depth) => {
    if (depth > MAX_DEPTH || entries >= MAX_ENTRIES) return;
    let listing;
    try {
      listing = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries += listing.length;
    const names = new Set(listing.map((entry) => entry.name));
    const here = inspectDirectory(dir, names);
    if (here.length) {
      const relativePath = relative(root, dir).replace(/\\/g, "/") || ".";
      projects.push(...here.map((project) => ({ ...project, path: relativePath })));
      return;
    }
    for (const entry of listing.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || IGNORED.has(entry.name)) continue;
      walk(join(dir, entry.name), depth + 1);
    }
  };
  walk(root, 0);
  if (!projects.length) {
    return [{ engine: "unknown", version: null, path: ".", markers: [], platforms: [], reason: "no_engine_markers" }];
  }
  return projects.sort((a, b) => a.path.localeCompare(b.path) || a.engine.localeCompare(b.engine));
}

// modules/engine-detect/index.ts
var NO_STORE = { "cache-control": "no-store" };
var ENGINES = ["godot", "unity", "unreal", "bevy", "phaser"];
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043A\u0430</title></head><body>
<h1>\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043A\u0430</h1>
<p>Godot, Unity, Unreal, Bevy \u0438 Phaser \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u044E\u0442\u0441\u044F \u043F\u043E \u0444\u0430\u0439\u043B\u0430\u043C \u043F\u0440\u043E\u0435\u043A\u0442\u0430: \u0431\u0435\u0437
\u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430, \u0441\u0435\u0442\u0438 \u0438 \u0432\u043D\u0435\u0448\u043D\u0438\u0445 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C. \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442
<code>unknown</code> \u0441 \u043F\u0440\u0438\u0447\u0438\u043D\u043E\u0439, \u0430 \u043D\u0435 \u0434\u043E\u0433\u0430\u0434\u043A\u0443.</p>
<p><code>POST /api/tools/engine-detect/detect</code> \u0441 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C
<code>{ path }</code>; \u043E\u0431\u0445\u043E\u0434 \u043D\u0435 \u0433\u043B\u0443\u0431\u0436\u0435 \u0447\u0435\u0442\u044B\u0440\u0451\u0445 \u0443\u0440\u043E\u0432\u043D\u0435\u0439, symlink \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E\u0442\u0441\u044F.</p>
<p><code>GET /api/tools/engine-detect/summary</code> \u2014 \u043C\u0430\u0440\u043A\u0435\u0440\u044B \u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u044B.</p>
</body></html>`;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "engine_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "engine-detect",
  apiVersion: 1,
  register(ctx) {
    ctx.publish?.({
      detect: (path) => detectEngines(path),
      detectEngines: (path) => detectEngines(path)
    });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/engine-detect/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: {
        ok: true,
        engines: [...ENGINES],
        markers: {
          godot: ["project.godot"],
          unity: ["Assets/", "ProjectSettings/"],
          unreal: ["*.uproject"],
          bevy: ["Cargo.toml \u0441 bevy"],
          phaser: ["package.json \u0441 phaser"]
        },
        limits: { depth: 4, entries: 2e3 },
        needs: { network: false, process: false }
      }
    }));
    ctx.api.add("POST", "/api/tools/engine-detect/detect", (request) => {
      const body = bodyOf(request.body);
      const path = String(body.path ?? "").trim();
      if (!path) {
        throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 path", {}, { code: "engine_path_required" });
      }
      return { status: 200, headers: NO_STORE, body: { ok: true, projects: detectEngines(path) } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
