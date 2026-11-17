import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/workspace-git/index.ts
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, join } from "node:path";

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

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

// modules/workspace-git/task-agent-runtime.ts
async function runAgent() {
  const text = process.env.TEAM_LOCAL_PLATFORM_PORT || "", port = Number(text), id = process.env.TEAM_TASK_ID || "";
  if (!/^\d{1,5}$/.test(text) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u0438\u043B\u0438 \u0437\u0430\u0434\u0430\u0447\u0430.\n");
    process.exitCode = 1;
    return;
  }
  try {
    const base = `http://127.0.0.1:${port}`, taskResponse = await fetch(`${base}/api/tasks/${encodeURIComponent(id)}`, { redirect: "error", signal: AbortSignal.timeout(5e3) });
    if (!taskResponse.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${taskResponse.status}`);
    const task = (await taskResponse.json())?.task;
    if (!task || task.id !== id || ["done", "cancelled"].includes(task.status)) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    const response = await fetch(`${base}/api/tools/workspace-git/status`, { redirect: "error", signal: AbortSignal.timeout(35e3) });
    if (!response.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}`);
    const data = await response.json();
    if (data?.ok !== true || !Array.isArray(data.files) || data.files.length > 100 || typeof data.truncated !== "boolean" || !Number.isSafeInteger(data.skipped)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 Git");
    const lines = data.files.slice(0, 20).map((item) => {
      if (typeof item?.path !== "string" || item.path.length > 400 || /[\x00-\x1f\x7f]/.test(item.path) || typeof item.status !== "string" || !/^[ MTADU?!]{2}$/.test(item.status)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C Git");
      return `${item.status} ${item.path}`;
    });
    process.stdout.write(`\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F Git \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C \u043F\u0440\u043E\u0435\u043A\u0442\u0435: \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${lines.length} \u0438\u0437 ${data.files.length}${data.truncated ? " (\u0441\u043F\u0438\u0441\u043E\u043A \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D)" : ""}; \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u043F\u0443\u0442\u0435\u0439: ${data.skipped}. \u0418\u043D\u0434\u0435\u043A\u0441 \u0438 \u0440\u0430\u0431\u043E\u0447\u0435\u0435 \u0434\u0435\u0440\u0435\u0432\u043E \u043C\u043E\u0433\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438. \u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E.
${lines.length ? lines.join("\n") : "\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0438\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0445 \u0444\u0430\u0439\u043B\u043E\u0432 \u043D\u0435\u0442."}
`);
  } catch (error) {
    process.stderr.write(`Git-\u043E\u0431\u0437\u043E\u0440: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/workspace-git/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F Git</title></head><body><main><h1>\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F Git</h1><p>\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432 \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0438. \u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0438 \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u044B \u043D\u0435 \u0437\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E\u0442\u0441\u044F.</p><p id="status" role="status"></p><button id="scan">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F</button><pre id="result" style="white-space:pre-wrap"></pre><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C</h2><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0430</button><pre id="agent" style="white-space:pre-wrap"></pre></main><script>
fetch('/api/tools/workspace-git/config').then(r=>r.json()).then(d=>{document.getElementById('status').textContent=d.configured?'\u041F\u0443\u0442\u0438 \u043A Git \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0443 \u0437\u0430\u0434\u0430\u043D\u044B.':'\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A Git \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0443.'});
for(const [id,path,out] of [['scan','status','result'],['prepare','prepare-agent','agent']])document.getElementById(id).onclick=async()=>{const b=document.getElementById(id),o=document.getElementById(out);b.disabled=true;o.textContent='\u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F\u2026';try{const r=await fetch('/api/tools/workspace-git/'+path,id==='scan'?{}:{method:'POST'}),d=await r.json();if(!r.ok)throw Error(d.error?.message||'\u041E\u0448\u0438\u0431\u043A\u0430');o.textContent=id==='scan'?'\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439: '+d.files.length+(d.truncated?' (\u0441\u043F\u0438\u0441\u043E\u043A \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D)':'')+'; \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u043F\u0443\u0442\u0435\u0439: '+d.skipped+'\\n'+d.files.map(x=>x.status+' '+x.path).join('\\n'):JSON.stringify(d.agent,null,2)}catch(e){o.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/workspace-git/index.ts
function fail(status, message) {
  return { status, body: { ok: false, error: { message } } };
}
function allowedPath(path) {
  if (!path || path.length > 400 || isAbsolute(path) || path.includes("\\") || path.includes(":")) return false;
  const parts = path.split("/");
  if (parts.some((part) => !part || part.startsWith(".") || /[<>"|?*\x00-\x1f\x7f]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part) || /^(node_modules|dist|build|secrets?)$/i.test(part))) return false;
  const name = parts.at(-1) ?? "";
  return WORKSPACE_TEXT_EXTENSIONS.has(extname(name).toLowerCase()) && !/(password|credential|secret|token|private.?key)/i.test(name);
}
function parseStatus(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text && !text.endsWith("\0")) throw new Error("incomplete");
  const records = text ? text.slice(0, -1).split("\0") : [], files = [];
  let skipped = 0, truncated = false;
  for (const entry of records) {
    if (entry.length < 4 || entry[2] !== " " || !/^[ MTADU?!]{2}$/.test(entry.slice(0, 2))) throw new Error("invalid_status");
    const status = entry.slice(0, 2), path = entry.slice(3);
    if (!allowedPath(path)) {
      skipped++;
      continue;
    }
    if (files.length >= 100) {
      truncated = true;
      continue;
    }
    files.push({ status, path });
  }
  return { files, skipped, truncated };
}
var module = {
  id: "workspace-git",
  apiVersion: 1,
  register(ctx) {
    let active = null, busy = false;
    ctx.onShutdown(async () => {
      const child = active;
      if (child) await new Promise((resolve) => {
        child.once("close", () => resolve());
        child.kill();
      });
    });
    const config = () => {
      const git = process.env.TEAM_GIT_EXE?.trim() || "", workspace = process.env.TEAM_CODE_WORKSPACE?.trim() || "";
      if (!isAbsolute(git) || !isAbsolute(workspace) || !statSync(git).isFile() || !statSync(workspace).isDirectory()) throw new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0435 \u043F\u0443\u0442\u0438 TEAM_GIT_EXE \u0438 TEAM_CODE_WORKSPACE");
      return { git: realpathSync(git), workspace: realpathSync(workspace) };
    };
    ctx.api.add("GET", "/api/tools/workspace-git/config", () => {
      try {
        config();
        return { body: { ok: true, configured: true } };
      } catch {
        return { body: { ok: true, configured: false } };
      }
    });
    ctx.api.add("POST", "/api/tools/workspace-git/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex"), path = join(ctx.paths.data, `workspace-git-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "workspace-git-agent", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 4e4 } } };
      } catch {
        return fail(500, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0430");
      }
    });
    ctx.api.add("GET", "/api/tools/workspace-git/status", async (c) => {
      let settings;
      try {
        settings = config();
      } catch {
        return fail(503, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u0438 \u043A Git \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0443");
      }
      if (busy) return fail(409, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      busy = true;
      const env = { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0", GIT_PAGER: "cat", NO_COLOR: "1" };
      for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
      const run = (args, cap, allowNoMatch = false) => new Promise((resolve, reject) => {
        const child = spawn(settings.git, args, { cwd: settings.workspace, env, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
        active = child;
        const chunks = [];
        let size = 0, stopped = false;
        const stop = () => {
          stopped = true;
          child.kill();
        }, timer = setTimeout(stop, 7e3);
        c.res?.once("close", stop);
        child.stdout.on("data", (chunk) => {
          size += chunk.length;
          if (size > cap) stop();
          else chunks.push(chunk);
        });
        child.stderr.resume();
        child.once("error", reject);
        child.once("close", (code) => {
          clearTimeout(timer);
          c.res?.off("close", stop);
          if (active === child) active = null;
          if (code !== 0 && !(allowNoMatch && code === 1) || stopped) reject(new Error("git_failed"));
          else resolve(Buffer.concat(chunks));
        });
      });
      let stage = "\u0432\u0435\u0440\u0441\u0438\u044F Git";
      try {
        const ver = (await run(["--version"], 4096)).toString("utf8"), match = /^git version (\d+)\.(\d+)\./.exec(ver);
        if (!match || Number(match[1]) < 2 || Number(match[1]) === 2 && Number(match[2]) < 48) throw new Error("old_git");
        const args = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false"];
        stage = "\u043A\u043E\u0440\u0435\u043D\u044C \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F";
        const top = (await run([...args, "rev-parse", "--show-toplevel"], 32768)).toString("utf8").trim();
        const actual = statSync(top, { bigint: true }), expected = statSync(settings.workspace, { bigint: true });
        if (!actual.isDirectory() || !expected.isDirectory() || actual.ino === 0n || actual.dev !== expected.dev || actual.ino !== expected.ino) throw new Error("not_repo_root");
        stage = "\u0432\u043D\u0435\u0448\u043D\u0438\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u044B Git";
        const filters = await run([...args, "config", "--includes", "--name-only", "--get-regexp", "^filter\\..*\\.(clean|process|smudge|required)$"], 32768, true);
        if (filters.length) throw new Error("configured_filters");
        stage = "\u0441\u0442\u0430\u0442\u0443\u0441 Git";
        const output = await run([...args, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=all", "--no-renames"], 1e6);
        stage = "\u0440\u0430\u0437\u0431\u043E\u0440 \u0441\u0442\u0430\u0442\u0443\u0441\u0430";
        return { headers: { "cache-control": "no-store" }, body: { ok: true, ...parseStatus(output) } };
      } catch {
        return fail(503, `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F (${stage}): \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 Git 2.48+ \u0438 \u043F\u0443\u0442\u044C \u043A \u043A\u043E\u0440\u043D\u044E \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F`);
      } finally {
        busy = false;
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
