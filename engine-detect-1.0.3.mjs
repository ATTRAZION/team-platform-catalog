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

// modules/engine-detect/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043A\u0430</title></head><body><main>
<h1>\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0434\u0432\u0438\u0436\u043A\u0430</h1>
<p>Godot, Unity, Unreal, Bevy \u0438 Phaser \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u044E\u0442\u0441\u044F \u043F\u043E \u0444\u0430\u0439\u043B\u0430\u043C \u043F\u0440\u043E\u0435\u043A\u0442\u0430: \u0431\u0435\u0437
\u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0430, \u0441\u0435\u0442\u0438 \u0438 \u0432\u043D\u0435\u0448\u043D\u0438\u0445 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C. \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0434\u0435\u0440\u0435\u0432\u043E \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442
<code>unknown</code> \u0441 \u043F\u0440\u0438\u0447\u0438\u043D\u043E\u0439, \u0430 \u043D\u0435 \u0434\u043E\u0433\u0430\u0434\u043A\u0443.</p>
<p><label>\u041F\u0430\u043F\u043A\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 (\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 \u043F\u0443\u0442\u044C)<br>
<input id="path" size="72" placeholder="D:\\projects\\game"></label></p>
<p><button id="detect">\u041D\u0430\u0439\u0442\u0438 \u0434\u0432\u0438\u0436\u043A\u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0430</button>
<button id="summary">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043C\u0430\u0440\u043A\u0435\u0440\u044B \u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u044B</button></p>
<p id="status" role="status"></p>
<h2>\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u044B</h2>
<div id="result"></div>
</main><script>
function say(message) { document.getElementById('status').textContent = message; }
function isAbsolute(value) { return /^[a-zA-Z]:[\\\\/]/.test(value) || value.charAt(0) === '/'; }
async function call(method, path, payload) {
  const init = { method: method, headers: { 'content-type': 'application/json' } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  const response = await fetch('/api/tools/engine-detect/' + path, init);
  const data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data && data.error && data.error.message ? data.error.message : '\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043A\u043E\u0434\u043E\u043C ' + response.status + '.');
  return data;
}
function cell(row, tag, value) { const el = document.createElement(tag); el.textContent = String(value); row.appendChild(el); }
function showProjects(projects) {
  const root = document.getElementById('result');
  root.textContent = '';
  const table = document.createElement('table');
  const head = document.createElement('tr');
  ['\u0414\u0432\u0438\u0436\u043E\u043A', '\u0412\u0435\u0440\u0441\u0438\u044F', '\u041F\u0443\u0442\u044C', '\u041C\u0430\u0440\u043A\u0435\u0440\u044B', '\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B'].forEach(function (label) { cell(head, 'th', label); });
  table.appendChild(head);
  projects.forEach(function (project) {
    const row = document.createElement('tr');
    cell(row, 'td', project.engine);
    cell(row, 'td', project.version || '\u2014');
    cell(row, 'td', project.path);
    cell(row, 'td', project.markers && project.markers.length ? project.markers.join(', ') : '\u043D\u0435\u0442 \u043C\u0430\u0440\u043A\u0435\u0440\u043E\u0432');
    cell(row, 'td', project.platforms && project.platforms.length ? project.platforms.join(', ') : '\u2014');
    table.appendChild(row);
  });
  root.appendChild(table);
}
document.getElementById('detect').onclick = async function () {
  const path = document.getElementById('path').value.trim();
  if (!path) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0430: \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 \u043F\u0443\u0442\u044C, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 D:\\\\projects\\\\game.'); return; }
  if (!isAbsolute(path)) { say('\u041F\u0443\u0442\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C: \u0441 \u0434\u0438\u0441\u043A\u0430 (D:\\\\projects\\\\game) \u0438\u043B\u0438 \u043E\u0442 \u043A\u043E\u0440\u043D\u044F (/home/ivan/game).'); return; }
  say('\u041E\u0431\u0445\u043E\u0436\u0443 \u0434\u0435\u0440\u0435\u0432\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u2026');
  try {
    const data = await call('POST', 'detect', { path: path });
    showProjects(data.projects);
    if (data.projects.length === 1 && data.projects[0].engine === 'unknown') {
      say('\u0414\u0432\u0438\u0436\u043E\u043A \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D: \u0432 \u0434\u0435\u0440\u0435\u0432\u0435 \u043D\u0435\u0442 \u043C\u0430\u0440\u043A\u0435\u0440\u043E\u0432 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0445 \u0434\u0432\u0438\u0436\u043A\u043E\u0432.');
    } else {
      say('\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432: ' + data.projects.length + ' \u2014 ' + data.projects.map(function (item) { return item.engine + (item.version ? ' ' + item.version : ''); }).join(', ') + '.');
    }
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
document.getElementById('summary').onclick = async function () {
  say('\u0427\u0438\u0442\u0430\u044E \u043C\u0430\u0440\u043A\u0435\u0440\u044B \u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u044B\u2026');
  try {
    const data = await call('GET', 'summary');
    const root = document.getElementById('result');
    root.textContent = '';
    const list = document.createElement('ul');
    Object.keys(data.markers).forEach(function (engine) {
      const item = document.createElement('li');
      item.textContent = engine + ': ' + data.markers[engine].join(', ');
      list.appendChild(item);
    });
    root.appendChild(list);
    say('\u0414\u0432\u0438\u0436\u043A\u0438: ' + data.engines.join(', ') + '. \u041E\u0431\u0445\u043E\u0434 \u043D\u0435 \u0433\u043B\u0443\u0431\u0436\u0435 ' + data.limits.depth + ' \u0443\u0440\u043E\u0432\u043D\u0435\u0439, \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ' + data.limits.entries + ' \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u0421\u0435\u0442\u044C \u0438 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u044B \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442\u0441\u044F.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
</script></body></html>`;

// modules/engine-detect/index.ts
var NO_STORE = { "cache-control": "no-store" };
var ENGINES = ["godot", "unity", "unreal", "bevy", "phaser"];
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
