import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/modern-web-local/index.ts
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/modern-web-local/task-agent-runtime.ts
async function runAgent() {
  const portText = process.env.TEAM_LOCAL_PLATFORM_PORT || "", id = process.env.TEAM_TASK_ID || "", port = Number(portText);
  if (!/^\d{1,5}$/.test(portText) || port < 1 || port > 65535 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    process.stderr.write("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442 \u0438\u043B\u0438 \u0437\u0430\u0434\u0430\u0447\u0430.\n");
    process.exitCode = 1;
    return;
  }
  try {
    const base = `http://127.0.0.1:${port}`;
    const taskResponse = await fetch(`${base}/api/tasks/${encodeURIComponent(id)}`, { redirect: "error", signal: AbortSignal.timeout(5e3) });
    if (!taskResponse.ok) throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443");
    const task = (await taskResponse.json())?.task;
    if (!task || task.id !== id || typeof task.description !== "string" || ["done", "cancelled"].includes(task.status)) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    const lines = [...task.description.matchAll(/^[ \t]*GUIDE:[ \t]*(.*?)[ \t]*$/gim)].map((m) => m[1].trim());
    if (lines.length > 1 || lines.length && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(lines[0])) throw new Error("GUIDE: \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0441\u0442\u0440\u043E\u0447\u043D\u044B\u043C\u0438 \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u043C\u0438 \u0431\u0443\u043A\u0432\u0430\u043C\u0438, \u0446\u0438\u0444\u0440\u0430\u043C\u0438 \u0438 \u0434\u0435\u0444\u0438\u0441\u0430\u043C\u0438");
    const response = await fetch(`${base}/api/tools/modern-web-local/scan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lines.length ? { guide: lines[0] } : {}), redirect: "error", signal: AbortSignal.timeout(4e4) });
    if (!response.ok) throw new Error(`\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 API \u0432\u0435\u0440\u043D\u0443\u043B HTTP ${response.status}`);
    const result = await response.json();
    if (result?.ok !== true || typeof result.report !== "string" || result.report.length > 3800) throw new Error("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442");
    process.stdout.write(`${result.report}
`);
  } catch (error) {
    process.stderr.write(`\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u0435\u0431-\u043A\u043E\u0434\u0430: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
  }
}

// modules/modern-web-local/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u0435\u0431-\u043A\u043E\u0434\u0430</title></head><body><main><h1>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u0435\u0431-\u043A\u043E\u0434\u0430</h1><p>\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u0435\u043A\u0442, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0443\u043A\u0430\u0437\u0430\u043B \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u2014 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F, \u0438\u0445 \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C \u043A\u043E\u0434\u0430.</p><p id="status" role="status"></p><label>\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u0430 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E) <input id="guide" maxlength="64" placeholder="sanitize-untrusted-html"></label><button id="scan">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442</button><pre id="report" style="white-space:pre-wrap"></pre><h2>\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C</h2><button id="prepare">\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0430</button><pre id="agent" style="white-space:pre-wrap"></pre></main><script>
fetch('/api/tools/modern-web-local/status').then(r=>r.json()).then(d=>{document.getElementById('status').textContent=d.configured?'\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B.':'\u041D\u0443\u0436\u043D\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u043F\u0443\u0442\u0438 \u043A \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0443, Node.js \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0443.'});
for(const [id,path,out] of [['scan','scan','report'],['prepare','prepare-agent','agent']])document.getElementById(id).onclick=async()=>{const b=document.getElementById(id),o=document.getElementById(out);b.disabled=true;o.textContent='\u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F\u2026';try{const guide=document.getElementById('guide').value.trim();const r=await fetch('/api/tools/modern-web-local/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(id==='scan'&&guide?{guide}:{})}),d=await r.json();if(!r.ok)throw Error(d.error?.message||'\u041E\u0448\u0438\u0431\u043A\u0430');o.textContent=d.report||JSON.stringify(d.agent,null,2)}catch(e){o.textContent=e.message}finally{b.disabled=false}};
</script></body></html>`;

// modules/modern-web-local/index.ts
var HASHES = ["ce15b805ce2fd1e0150e36a128955b6dcebcb1a005253d9df55c8b1b3f4e9d41", "d752acf0c5a723a8d9cdf89b3187fdb594ab17947c60770a9f871b00119903df"];
function fail(status, message) {
  return { status, body: { ok: false, error: { message } } };
}
function hash(file) {
  const info = statSync(file);
  if (!info.isFile() || info.size > 6e6) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0440\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430");
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}
function setup() {
  const node = process.env.TEAM_MODERN_WEB_NODE?.trim() || "", cli = process.env.TEAM_MODERN_WEB_CLI?.trim() || "", root = process.env.TEAM_CODE_WORKSPACE?.trim() || "";
  if (![node, cli, root].every(isAbsolute)) throw new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0435 \u043F\u0443\u0442\u0438 \u043A Node.js, Modern Web Guidance \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0443");
  if (!statSync(node).isFile() || !statSync(cli).isFile() || !statSync(root).isDirectory()) throw new Error("\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u0438\u043B\u0438 \u043F\u0440\u043E\u0435\u043A\u0442");
  const canonicalCli = realpathSync(cli), scanner = join(dirname(canonicalCli), "legacy-scan.mjs");
  if (hash(canonicalCli) !== HASHES[0] || hash(scanner) !== HASHES[1]) throw new Error("\u0412\u0435\u0440\u0441\u0438\u044F \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0439 1.0.0");
  return { node: realpathSync(node), cli: canonicalCli, root: realpathSync(root) };
}
function report(raw, selectedGuide) {
  const data = raw;
  if (!data || !Number.isSafeInteger(data.totalFindings) || data.totalFindings < 0 || !Array.isArray(data.guides) || data.guides.length > 1e3) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442");
  const clean = (v, limit) => typeof v === "string" ? v.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, limit) : "";
  const lines = [], checks = [];
  for (const guide of data.guides) {
    if (!Array.isArray(guide?.rules)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442");
    for (const rule of guide.rules) {
      if (!Array.isArray(rule?.findings)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442");
      if (selectedGuide && rule.findings.length) {
        const rubric = rule.verifierRubric;
        if (!rubric || !Array.isArray(rubric.keepWhen) || !Array.isArray(rubric.dropWhen)) throw new Error("\u041D\u0435\u0442 \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438");
        const id = clean(rule.ruleId, 120);
        for (const [label, values] of [["\u041F\u0440\u0438\u043C\u0435\u043D\u044F\u0442\u044C, \u0435\u0441\u043B\u0438", rubric.keepWhen], ["\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C, \u0435\u0441\u043B\u0438", rubric.dropWhen]]) {
          if (values.length > 50) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0443\u0441\u043B\u043E\u0432\u0438\u0439");
          for (const value of values) {
            const text2 = clean(value, 241);
            if (!text2) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u0435");
            checks.push(`${id}: ${label}: ${text2.length > 240 ? `${text2.slice(0, 239)}\u2026` : text2}`);
          }
        }
      }
      for (const item of rule.findings) {
        const file = clean(item?.file, 300), id = clean(rule.ruleId, 120), summary = clean(rule.summary, 250);
        if (!file || isAbsolute(file) || file.split(/[\\/]/).some((part) => part === "..") || !id || !summary || !Number.isSafeInteger(item.line) || item.line < 1) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u043D\u0430\u0445\u043E\u0434\u043A\u0430");
        const line = `${file}:${item.line} \u2014 ${id}: ${summary}`;
        if (lines.length < 20 && lines.join("\n").length + line.length < (selectedGuide ? 1500 : 2900)) lines.push(line);
      }
    }
  }
  let text = `Modern Web Guidance 1.0.0 (Google Chrome): \u043D\u0430\u0439\u0434\u0435\u043D\u043E ${data.totalFindings}; \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${lines.length}. \u042D\u0442\u043E \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430, \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0439\u0442\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0438 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u0432. \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0441\u0442\u0440\u043E\u043A\u0438 \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B.
${lines.join("\n")}`.trim();
  if (selectedGuide && checks.length) {
    text += "\n\n\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0430\u0432\u0442\u043E\u0440\u043E\u0432 (\u043C\u043E\u0433\u0443\u0442 \u0431\u044B\u0442\u044C \u0441\u043E\u043A\u0440\u0430\u0449\u0435\u043D\u044B):";
    let shown = 0;
    for (const check of checks) {
      if (text.length + check.length + 1 > 3600) break;
      text += `
${check}`;
      shown++;
    }
    if (shown < checks.length) text += `
\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u0443\u0441\u043B\u043E\u0432\u0438\u0439: ${shown} \u0438\u0437 ${checks.length}; \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u043C. \u0432 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0435.`;
  }
  return text;
}
var module = {
  id: "modern-web-local",
  apiVersion: 1,
  register(ctx) {
    let active = null;
    ctx.onShutdown(async () => {
      const child = active;
      if (child) await new Promise((resolve) => {
        child.once("close", () => resolve());
        child.kill();
      });
    });
    ctx.api.add("GET", "/api/tools/modern-web-local/status", () => {
      try {
        setup();
        return { body: { ok: true, configured: true } };
      } catch {
        return { body: { ok: true, configured: false } };
      }
    });
    ctx.api.add("POST", "/api/tools/modern-web-local/prepare-agent", (c) => {
      const port = localRequestPort(c);
      if (!port) return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B");
      const source = `(${runAgent.toString()})();
`, digest = createHash("sha256").update(source).digest("hex"), path = join(ctx.paths.data, `modern-web-agent-${digest}.mjs`);
      try {
        mkdirSync(ctx.paths.data, { recursive: true });
        try {
          writeFileSync(path, source, { flag: "wx" });
        } catch (error) {
          if (error.code !== "EEXIST" || !lstatSync(path).isFile() || readFileSync(path, "utf8") !== source) throw error;
        }
        return { body: { ok: true, agent: { id: "modern-web-agent", command: "node", args: [path], env: { TEAM_LOCAL_PLATFORM_PORT: port }, timeout_ms: 45e3 } } };
      } catch {
        return fail(500, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0430");
      }
    });
    ctx.api.add("POST", "/api/tools/modern-web-local/scan", async (c) => {
      const data = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      if (data.guide !== void 0 && (typeof data.guide !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(data.guide))) return fail(400, "GUIDE: \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0438\u0437 \u0441\u0442\u0440\u043E\u0447\u043D\u044B\u0445 \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0445 \u0431\u0443\u043A\u0432, \u0446\u0438\u0444\u0440 \u0438 \u0434\u0435\u0444\u0438\u0441\u043E\u0432");
      const guide = typeof data.guide === "string" ? data.guide : "";
      let settings;
      try {
        settings = setup();
      } catch (error) {
        return fail(503, error instanceof Error ? error.message : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438");
      }
      if (active) return fail(409, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F");
      const env = { DISABLE_TELEMETRY: "1", ENABLE_FILE_LOGGING: "false", NO_COLOR: "1" };
      for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
      try {
        const output = await new Promise((resolve, reject) => {
          const args = [settings.cli, "legacy-scan", settings.root, "--json"];
          if (guide) args.push("--guide", guide);
          const child = spawn(settings.node, args, { cwd: settings.root, env, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
          active = child;
          const chunks = [];
          let size = 0, stopped = false;
          const stop = () => {
            stopped = true;
            child.kill();
          };
          const timer = setTimeout(stop, 3e4);
          c.res?.once("close", stop);
          child.stdout.on("data", (chunk) => {
            size += chunk.length;
            if (size > 2e6) stop();
            else chunks.push(chunk);
          });
          child.stderr.resume();
          child.once("error", reject);
          child.once("close", (code) => {
            clearTimeout(timer);
            c.res?.off("close", stop);
            if (active === child) active = null;
            if (code !== 0 || stopped) reject(new Error("scan failed"));
            else resolve(Buffer.concat(chunks).toString("utf8"));
          });
        });
        return { body: { ok: true, report: report(JSON.parse(output), guide) } };
      } catch {
        return fail(503, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0443\u044E \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
