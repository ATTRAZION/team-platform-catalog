import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/workspace-search/index.ts
import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, opendirSync, readFileSync, readSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, join, relative, sep } from "node:path";

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/workspace-search/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "8799", port = Number(portText), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0443\u0436\u043D\u044B \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u0438 TEAM_TASK_ID.\n");
    process.exitCode = 1;
    return;
  }
  async function request(path, init = {}) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { ...init, redirect: "error", signal: AbortSignal.timeout(3e4) });
    if (!response.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}`);
    return response.json();
  }
  try {
    const task = (await request(`/api/tasks/${encodeURIComponent(id)}`))?.task;
    if (!task || task.id !== id || typeof task.description !== "string" || !["open", "claimed", "blocked"].includes(task.status)) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    const terms = [...task.description.matchAll(/^[ \t]*FIND:[ \t]*(.*?)[ \t]*$/gim)].map((m) => m[1].trim());
    if (terms.length !== 1 || !terms[0] || terms[0].length > 120) throw new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443 FIND: \u0438\u0441\u043A\u043E\u043C\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 (\u0434\u043E 120 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)");
    const result = await request("/api/tools/workspace-search/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: terms[0] }) });
    if (result?.ok !== true || !Array.isArray(result.matches) || result.matches.length > 30 || typeof result.truncated !== "boolean") throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u043E\u0438\u0441\u043A\u0430");
    const lines = result.matches.flatMap((match) => {
      if (typeof match?.path !== "string" || match.path.length > 400 || /[\x00-\x1f\x7f]/.test(match.path) || !Number.isSafeInteger(match.line) || match.line < 1 || typeof match.text !== "string") return [];
      return [`${match.path}:${match.line}: ${match.text.replace(/[\x00-\x1f\x7f]+/g, " ").slice(0, 240)}`];
    });
    const selected = [];
    let size = 0;
    for (const line of lines) {
      if (size + line.length + 1 > 3e3) break;
      selected.push(line);
      size += line.length + 1;
    }
    process.stdout.write(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u0443\u043A\u0432\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A; \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${selected.length} \u0438\u0437 ${lines.length}${result.truncated || selected.length < lines.length ? ", \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D" : ""}; \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0438 \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u043B\u043D\u044B\u043C \u0438\u043D\u0434\u0435\u043A\u0441\u043E\u043C:
${selected.join("\n")}
`);
  } catch (error) {
    process.stderr.write(`\u041F\u043E\u0438\u0441\u043A \u0432 \u043A\u043E\u0434\u0435: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/workspace-search/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A \u043F\u043E \u043A\u043E\u0434\u0443</title></head><body><main><h1>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A \u043F\u043E \u043A\u043E\u0434\u0443</h1><p>\u0418\u0449\u0435\u0442 \u0431\u0443\u043A\u0432\u0430\u043B\u044C\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0431\u0435\u0437 \u0443\u0447\u0451\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0447\u0435\u0439 \u043F\u0430\u043F\u043A\u0435. \u041D\u0435 \u0432\u0441\u0435 \u0444\u0430\u0439\u043B\u044B \u043E\u0431\u0445\u043E\u0434\u044F\u0442\u0441\u044F; \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u043C.</p><p id="setup" role="status"></p><label>\u0422\u0435\u043A\u0441\u0442 <input id="q" maxlength="120"></label> <button id="search">\u041D\u0430\u0439\u0442\u0438</button><p id="status" role="status"></p><ul id="results"></ul><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u0447</h2><p>\u0412 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0438 \u0437\u0430\u0434\u0430\u0447\u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443 FIND: \u0438\u0441\u043A\u043E\u043C\u044B\u0439 \u0442\u0435\u043A\u0441\u0442.</p><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F</button><pre id="agent" role="status"></pre></main><script>
fetch('/api/tools/workspace-search/status').then(r=>r.json()).then(d=>document.getElementById('setup').textContent=d.configured?'\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u0437\u0430\u0434\u0430\u043D\u0430.':'\u0423\u043A\u0430\u0436\u0438\u0442\u0435 TEAM_CODE_WORKSPACE \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443.').catch(()=>document.getElementById('setup').textContent='\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0443\u044E \u043F\u0430\u043F\u043A\u0443.');
document.getElementById('search').onclick=async()=>{const status=document.getElementById('status'),list=document.getElementById('results');list.replaceChildren();status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';try{const r=await fetch('/api/tools/workspace-search/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:document.getElementById('q').value})}),d=await r.json();if(!r.ok)throw Error(d.error.message);for(const m of d.matches){const item=document.createElement('li');item.textContent=m.path+':'+m.line+': '+m.text;list.append(item)}status.textContent='\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439: '+d.matches.length+'; \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E \u0444\u0430\u0439\u043B\u043E\u0432: '+d.scanned+(d.truncated?' \u2014 \u043F\u043E\u0438\u0441\u043A \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D':'')+(d.skipped?'; \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: '+d.skipped:'')}catch(e){status.textContent=e.message}};
document.getElementById('prepare').onclick=async()=>{const out=document.getElementById('agent');try{const r=await fetch('/api/tools/workspace-search/prepare-agent',{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error.message);out.textContent=JSON.stringify(d.agent,null,2)}catch(e){out.textContent=e.message}};
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

// modules/workspace-search/index.ts
var MAX_ENTRIES = 5e3;
var MAX_BYTES = 8 * 1024 * 1024;
var MAX_FILE = 128 * 1024;
var MAX_MATCHES = 30;
var MAX_DEPTH = 12;
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function exclusionForName(name) {
  if (!name) return "invalid_name";
  if (name.startsWith(".")) return "hidden";
  if (/^(node_modules|dist|build|secrets?)$/i.test(name)) return "blocked_directory";
  if (/[<>"|?*:\\\x00-\x1f\x7f]/.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) return "invalid_name";
  return null;
}
function inRoot(root, target) {
  const rel = relative(root, target);
  return !!rel && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
function search(rootPath, query) {
  const root = realpathSync(rootPath), needle = query.toLowerCase();
  if (!statSync(root).isDirectory()) throw new Error("invalid_root");
  const matches = [];
  const excluded = [];
  const pending = [{ absolute: root, path: "", depth: 0 }];
  let entries = 0, scanned = 0, bytes = 0, skipped = 0, truncated = false;
  const deadline = Date.now() + 3e3;
  const skip = (path, reason) => {
    skipped++;
    if (path && excluded.length < 100) excluded.push({ path, reason });
  };
  outer: while (pending.length) {
    const current = pending.pop();
    let dir;
    try {
      if (!statSync(current.absolute).isDirectory()) {
        if (current.path) skip(current.path, "not_directory");
        continue;
      }
      if (current.path && lstatSync(current.absolute).isSymbolicLink()) {
        skip(current.path, "symlink");
        continue;
      }
      if (current.path && !inRoot(root, realpathSync(current.absolute))) {
        skip(current.path, "outside_root");
        continue;
      }
      dir = opendirSync(current.absolute);
    } catch {
      if (!current.path) throw new Error("root_unavailable");
      skip(current.path, "unreadable");
      continue;
    }
    try {
      for (; ; ) {
        if (entries >= MAX_ENTRIES || Date.now() >= deadline) {
          truncated = true;
          break outer;
        }
        const entry = dir.readSync();
        if (!entry) break;
        entries++;
        const nameProblem = exclusionForName(entry.name);
        const path = current.path ? `${current.path}/${entry.name}` : entry.name;
        if (nameProblem) {
          skip(path, nameProblem);
          continue;
        }
        if (path.length > 400) {
          skip(path, "path_too_long");
          continue;
        }
        const absolute = join(current.absolute, entry.name);
        if (entry.isSymbolicLink()) {
          let reason = "symlink";
          try {
            if (!inRoot(root, realpathSync(absolute))) reason = "outside_root";
          } catch {
            reason = "unreadable";
          }
          skip(path, reason);
          continue;
        }
        if (entry.isDirectory()) {
          if (current.depth >= MAX_DEPTH) {
            skip(path, "too_deep");
            truncated = true;
          } else pending.push({ absolute, path, depth: current.depth + 1 });
          continue;
        }
        if (!entry.isFile() || !WORKSPACE_TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
          skip(path, "unsupported_extension");
          continue;
        }
        if (/(password|credential|secret|token|private.?key)/i.test(entry.name)) {
          skip(path, "sensitive_name");
          continue;
        }
        let fd;
        try {
          if (lstatSync(absolute).isSymbolicLink() || !inRoot(root, realpathSync(absolute))) {
            skip(path, "outside_root");
            continue;
          }
          fd = openSync(absolute, "r");
          const stat = fstatSync(fd);
          if (!stat.isFile() || stat.size > MAX_FILE) {
            skip(path, "too_large");
            continue;
          }
          if (bytes + stat.size > MAX_BYTES) {
            truncated = true;
            skip(path, "budget");
            break outer;
          }
          bytes += stat.size;
          const data = Buffer.alloc(stat.size);
          if (readSync(fd, data, 0, data.length, 0) !== data.length || data.includes(0)) {
            skip(path, "binary");
            continue;
          }
          const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
          scanned++;
          const lines = text.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i], at = line.toLowerCase().indexOf(needle);
            if (at < 0) continue;
            const start = Math.max(0, at - 60), snippet = line.slice(start, start + 240).replace(/[\x00-\x1f\x7f]/g, " ");
            matches.push({ path, line: i + 1, text: `${start ? "\u2026" : ""}${snippet}${start + 240 < line.length ? "\u2026" : ""}` });
            if (matches.length >= MAX_MATCHES) {
              truncated = true;
              break outer;
            }
          }
        } catch {
          skip(path, "unreadable");
        } finally {
          if (fd !== void 0) closeSync(fd);
        }
      }
    } finally {
      dir.closeSync();
    }
  }
  return { ok: true, query, matches, entries, scanned, bytes, skipped, truncated, excluded };
}
var module = {
  id: "workspace-search",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/workspace-search/status", () => {
      const root = process.env.TEAM_CODE_WORKSPACE?.trim() || "";
      try {
        return { body: { ok: true, configured: isAbsolute(root) && statSync(root).isDirectory() } };
      } catch {
        return { body: { ok: true, configured: false } };
      }
    });
    ctx.api.add("POST", "/api/tools/workspace-search/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return fail(503, "port_unavailable", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex");
      const path = join(ctx.paths.data, `workspace-search-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "workspace-search-agent", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 45e3 }, sha256: digest } };
      } catch {
        return fail(500, "agent_prepare_failed", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F.");
      }
    });
    ctx.api.add("POST", "/api/tools/workspace-search/search", (c) => {
      const root = process.env.TEAM_CODE_WORKSPACE?.trim() || "";
      if (!root || !isAbsolute(root)) return fail(503, "workspace_unconfigured", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0439 TEAM_CODE_WORKSPACE \u043F\u0435\u0440\u0435\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.");
      const data = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      const query = typeof data.query === "string" ? data.query.trim() : "";
      if (!query || query.length > 120 || /[\x00-\x1f\x7f]/.test(query)) return fail(400, "validation_failed", "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443 \u0442\u0435\u043A\u0441\u0442\u0430 \u0434\u043E 120 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
      try {
        return { body: search(root, query) };
      } catch {
        return fail(503, "workspace_unavailable", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433.");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
