import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/workspace-code/index.ts
import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, sep } from "node:path";

// modules/workspace-code/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0424\u0430\u0439\u043B\u044B \u043F\u0440\u043E\u0435\u043A\u0442\u0430</title></head><body><main><h1>\u0427\u0442\u0435\u043D\u0438\u0435 \u0444\u0430\u0439\u043B\u043E\u0432 \u043F\u0440\u043E\u0435\u043A\u0442\u0430</h1><p>\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0434\u043E \u0442\u0440\u0451\u0445 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u0443\u0442\u0435\u0439, \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0435. \u041A\u043E\u0440\u0435\u043D\u044C \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u0437\u0430\u0434\u0430\u0451\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 TEAM_CODE_WORKSPACE.</p><textarea id="paths" rows="4" cols="70"></textarea><p><button id="read">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C</button></p><p id="status" role="status"></p><pre id="result" style="white-space:pre-wrap"></pre></main><script>
document.getElementById('read').onclick=async()=>{const status=document.getElementById('status'),out=document.getElementById('result');out.textContent='';try{const paths=document.getElementById('paths').value.split('\\n').map(x=>x.trim()).filter(Boolean);const r=await fetch('/api/tools/workspace-code/read',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({paths})});const data=await r.json();if(!r.ok)throw Error(data.error.message);out.textContent=data.files.map(f=>f.path+(f.truncated?' (\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442)':'')+'\\n'+f.excerpt).join('\\n\\n');status.textContent='\u0413\u043E\u0442\u043E\u0432\u043E'}catch(e){status.textContent=e.message}};
</script></body></html>`;

// modules/workspace-file-types.ts
var WORKSPACE_TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".py",
  ".html",
  ".css",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".cs",
  ".c",
  ".h",
  ".cc",
  ".cpp",
  ".hpp",
  ".swift",
  ".rb",
  ".php",
  ".lua",
  ".sh",
  ".bash",
  ".ps1",
  ".psm1",
  ".bat",
  ".cmd",
  ".sql",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".proto"
]);

// modules/workspace-code/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function allowedPath(path) {
  if (!path || path.length > 400 || isAbsolute(path) || path.includes("\\") || path.includes(":")) return false;
  const parts = path.split("/");
  if (parts.some((part) => !part || part.startsWith(".") || /[<>"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part) || /^(node_modules|dist|build|secrets?)$/i.test(part))) return false;
  const name = parts.at(-1) ?? "";
  return WORKSPACE_TEXT_EXTENSIONS.has(extname(name).toLowerCase()) && !/(password|credential|secret|token|private.?key)/i.test(name);
}
function read(root, path, startLine = 1, endLine = 150) {
  if (!allowedPath(path)) throw new Error("forbidden");
  const canonicalRoot = realpathSync(root);
  let current = canonicalRoot;
  for (const segment of path.split("/")) {
    current = join(current, segment);
    if (lstatSync(current).isSymbolicLink()) throw new Error("forbidden");
  }
  const canonical = realpathSync(current), rel = relative(canonicalRoot, canonical);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("forbidden");
  const fd = openSync(canonical, "r");
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 128 * 1024) throw new Error("invalid_file");
    const bytes = Buffer.alloc(stat.size);
    if (readSync(fd, bytes, 0, bytes.length, 0) !== bytes.length) throw new Error("file_changed");
    if (bytes.includes(0)) throw new Error("invalid_file");
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const lines = content.split("\n");
    if (startLine > lines.length) throw new Error("line_out_of_range");
    const selected = lines.slice(startLine - 1, endLine).join("\n");
    const excerpt = selected.slice(0, 3e3);
    const shownEnd = startLine + excerpt.split("\n").length - 1;
    return { path, start_line: startLine, end_line: shownEnd, excerpt, truncated: startLine > 1 || endLine < lines.length || excerpt.length < selected.length, excerpt_sha256: createHash("sha256").update(excerpt).digest("hex") };
  } finally {
    closeSync(fd);
  }
}
var module = {
  id: "workspace-code",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/workspace-code/status", () => {
      const root = process.env.TEAM_CODE_WORKSPACE?.trim() || "";
      try {
        return { body: { ok: true, configured: isAbsolute(root) && statSync(root).isDirectory() } };
      } catch {
        return { body: { ok: true, configured: false } };
      }
    });
    ctx.api.add("POST", "/api/tools/workspace-code/read", (c) => {
      const root = process.env.TEAM_CODE_WORKSPACE?.trim() || "";
      if (!root || !isAbsolute(root)) return fail(503, "workspace_unconfigured", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 TEAM_CODE_WORKSPACE \u043F\u0435\u0440\u0435\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.");
      const value = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body.paths : null;
      if (!Array.isArray(value) || value.length < 1 || value.length > 3 || value.some((p) => typeof p !== "string") || new Set(value).size !== value.length) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0442 \u043E\u0434\u043D\u043E\u0433\u043E \u0434\u043E \u0442\u0440\u0451\u0445 \u0440\u0430\u0437\u043D\u044B\u0445 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u0443\u0442\u0435\u0439.");
      try {
        return { body: { ok: true, files: value.map((path) => read(root, path)) } };
      } catch {
        return fail(400, "file_unavailable", "\u0424\u0430\u0439\u043B \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D, \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D \u0438\u043B\u0438 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043D\u0435\u0431\u043E\u043B\u044C\u0448\u0438\u043C UTF-8 \u0442\u0435\u043A\u0441\u0442\u043E\u043C.");
      }
    });
    ctx.api.add("POST", "/api/tools/workspace-code/read-ranges", (c) => {
      const root = process.env.TEAM_CODE_WORKSPACE?.trim() || "";
      if (!root || !isAbsolute(root)) return fail(503, "workspace_unconfigured", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 TEAM_CODE_WORKSPACE \u043F\u0435\u0440\u0435\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.");
      const value = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body.files : null;
      if (!Array.isArray(value) || value.length < 1 || value.length > 3 || value.some((v) => !v || typeof v !== "object" || Array.isArray(v) || typeof v.path !== "string" || !Number.isSafeInteger(v.start_line) || !Number.isSafeInteger(v.end_line) || v.start_line < 1 || v.end_line < v.start_line || v.end_line - v.start_line >= 150) || new Set(value.map((v) => v.path)).size !== value.length) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0434\u043E \u0442\u0440\u0451\u0445 \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u044B \u0434\u043E 150 \u0441\u0442\u0440\u043E\u043A.");
      try {
        return { body: { ok: true, files: value.map((v) => read(root, v.path, v.start_line, v.end_line)) } };
      } catch {
        return fail(400, "file_unavailable", "\u0424\u0430\u0439\u043B \u0438\u043B\u0438 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u043B\u0438\u0431\u043E \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D.");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
