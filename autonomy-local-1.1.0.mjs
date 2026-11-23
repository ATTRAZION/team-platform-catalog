import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/autonomy-local/index.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync4, readFileSync as readFileSync4, writeFileSync as writeFileSync4 } from "node:fs";

// modules/autonomy-local/page.ts
var PAGE = String.raw`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Автономный прогон</title></head><body><main><h1>Автономный прогон</h1><p>Модуль готовит агента <code>autonomy-local-task</code>: он получает задачу из платформы, выполняет шаги в указанном каталоге и подтверждает итог командами проверки. Очередь, отмена, повторы и дерево процессов — у раздела «Запуски»; здесь только подготовка и настройка.</p><p><strong>Это не граница безопасности:</strong> разрешённый интерпретатор может сделать всё, что доступно вашему пользователю. Запускайте на каталоге без секретов.</p><p id="setup" role="status"></p><label>Рабочий каталог (абсолютный путь)<br><input id="workspace" size="80" maxlength="400"></label><br><label>Шагов <input id="steps" type="number" min="1" max="100" value="12"></label> <label>Вызовов инструментов <input id="calls" type="number" min="1" max="500" value="40"></label> <label>Секунд <input id="seconds" type="number" min="30" max="3600" value="600"></label><p><button id="prepare">Подготовить агента</button></p><p id="status" role="status"></p><pre id="result"></pre><h2>Как запустить</h2><ol><li>Откройте «Задачи» и создайте карточку: заголовок и описание — это цель агента.</li><li>Откройте «Запуски», выберите агента <code>autonomy-local-task</code> и эту карточку.</li><li>Итог, ledger проверок и причина отказа появятся в результате запуска.</li></ol><p>Повторный запуск той же карточки с новой попыткой начинает прогон заново; продолжение после падения платформы идёт с чекпоинта той же попытки.</p></main><script>
function el(id){return document.getElementById(id)}
function text(id,value){el(id).textContent=value}
function load(){
  fetch('/api/tools/autonomy-local/status').then(function(r){return r.json()}).then(function(d){
    text('setup', (d.configured?'Модель: '+d.model+'. ':'Модель не настроена: '+d.reason+' ')+(d.agent_registered?'Агент зарегистрирован.':'Агент ещё не подготовлен.' )+' Разрешённые команды: '+d.allow.join(', '));
    if(d.workspace_env && !el('workspace').value)el('workspace').value=d.workspace_env;
  }).catch(function(){text('setup','Настройки недоступны.')});
}
el('prepare').onclick=function(){
  var body={workspace:el('workspace').value,budget:{max_steps:Number(el('steps').value),max_tool_calls:Number(el('calls').value),max_seconds:Number(el('seconds').value)}};
  el('prepare').disabled=true;text('status','Готовлю агента…');text('result','');
  fetch('/api/tools/autonomy-local/prepare-agent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return {s:r.status,d:d}})}).then(function(x){
    el('prepare').disabled=false;
    if(!x.d.ok){text('status','Отказ: '+(x.d.error&&x.d.error.message||x.s));return}
    text('status',x.d.registered?'Агент записан в реестр: его видно в «Запусках» без перезапуска.':'Запись готова, но в реестр не попала: '+x.d.reason);
    text('result',JSON.stringify(x.d.agent,null,2));
    load();
  }).catch(function(e){el('prepare').disabled=false;text('status','Сеть: '+e.message)});
};
load();
</script></body></html>`;

// modules/autonomy-local/model.ts
var ModelError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ModelError";
  }
};
function modelFromEnv() {
  const baseUrl = (process.env.TEAM_AUTONOMY_BASE_URL ?? "").trim();
  const model = (process.env.TEAM_AUTONOMY_MODEL ?? "").trim();
  if (!baseUrl) return { config: null, reason: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 TEAM_AUTONOMY_BASE_URL (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 http://127.0.0.1:8080/v1)." };
  if (!/^https?:\/\/[^\s]+$/.test(baseUrl)) return { config: null, reason: "TEAM_AUTONOMY_BASE_URL \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C http(s)-\u0430\u0434\u0440\u0435\u0441\u043E\u043C." };
  if (!model) return { config: null, reason: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 TEAM_AUTONOMY_MODEL." };
  const timeoutMs = Number(process.env.TEAM_AUTONOMY_TIMEOUT_MS ?? "120000");
  const maxTokens = Number(process.env.TEAM_AUTONOMY_MAX_TOKENS ?? "2048");
  return {
    config: {
      baseUrl: baseUrl.replace(/\/+$/, ""),
      model,
      apiKey: (process.env.TEAM_AUTONOMY_API_KEY ?? "").trim(),
      timeoutMs: Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 5e3), 3e5) : 12e4,
      maxTokens: Number.isFinite(maxTokens) ? Math.min(Math.max(maxTokens, 128), 8192) : 2048
    },
    reason: ""
  };
}
function parseToolCalls(raw) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) throw new ModelError("\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u0435\u0440\u043D\u0443\u043B\u0430 tool_calls \u043D\u0435 \u0441\u043F\u0438\u0441\u043A\u043E\u043C.");
  if (raw.length > 8) throw new ModelError("\u041C\u043E\u0434\u0435\u043B\u044C \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u043B\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 8 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u0437\u0430 \u0448\u0430\u0433.");
  const result = [];
  for (const [index, item] of raw.entries()) {
    const call = item ?? {};
    const name = call.function?.name;
    if (typeof name !== "string" || !/^[a-z_]{1,40}$/.test(name)) {
      throw new ModelError("\u041C\u043E\u0434\u0435\u043B\u044C \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u0431\u0435\u0437 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0433\u043E \u0438\u043C\u0435\u043D\u0438.");
    }
    const argumentsText = typeof call.function?.arguments === "string" ? call.function.arguments : JSON.stringify(call.function?.arguments ?? {});
    let args = null;
    try {
      args = JSON.parse(argumentsText || "{}");
    } catch {
      args = null;
    }
    const id = typeof call.id === "string" && call.id ? call.id : `call_${index + 1}`;
    result.push({ id, name, args, raw_args: argumentsText.slice(0, 8e3) });
  }
  return result;
}
async function callModel(config, messages, tools, signal) {
  const headers = { "content-type": "application/json" };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
  let response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(config.timeoutMs)]),
      body: JSON.stringify({
        model: config.model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: config.maxTokens
      })
    });
  } catch (error) {
    if (signal.aborted) throw new ModelError("\u0417\u0430\u043F\u0440\u043E\u0441 \u043A \u043C\u043E\u0434\u0435\u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0451\u043D.");
    throw new ModelError(`\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: ${error instanceof Error ? error.message : "\u0441\u0435\u0442\u0435\u0432\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}`);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new ModelError(`\u041C\u043E\u0434\u0435\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ModelError("\u041E\u0442\u0432\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F JSON.");
  }
  const choice = data.choices;
  if (!Array.isArray(choice) || !choice.length) throw new ModelError("\u0412 \u043E\u0442\u0432\u0435\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435\u0442 choices.");
  const message = choice[0].message;
  if (!message || typeof message !== "object") throw new ModelError("\u0412 \u043E\u0442\u0432\u0435\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435\u0442 message.");
  const content = message.content;
  const usage = data.usage;
  return {
    content: typeof content === "string" ? content : "",
    toolCalls: parseToolCalls(message.tool_calls),
    promptTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : 0,
    completionTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : 0
  };
}

// modules/autonomy-local/sandbox.ts
import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
var SandboxError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "SandboxError";
    this.code = code;
  }
};
var MAX_READ_BYTES = 16 * 1024;
var MAX_WRITE_BYTES = 64 * 1024;
var MAX_OUTPUT_BYTES = 8 * 1024;
var MAX_ARGUMENTS = 32;
var MAX_ARGUMENT_CHARS = 500;
var BLOCKED_SEGMENTS = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  ".secrets",
  "secrets",
  ".ssh",
  ".aws",
  ".gnupg"
]);
function blockedName(name) {
  const lower = name.toLowerCase();
  if (!lower) return true;
  if (BLOCKED_SEGMENTS.has(lower)) return true;
  if (lower === ".env" || lower.startsWith(".env.")) return true;
  return /(password|passwd|credential|secret|token|private[._-]?key)/i.test(lower);
}
function segmentsOf(relPath) {
  if (typeof relPath !== "string" || !relPath || relPath.length > 400) {
    throw new SandboxError("path_invalid", "\u041F\u0443\u0442\u044C \u043F\u0443\u0441\u0442 \u0438\u043B\u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439.");
  }
  if (isAbsolute(relPath) || relPath.includes(":") || /[\x00-\x1f]/.test(relPath)) {
    throw new SandboxError("path_forbidden", "\u041D\u0443\u0436\u0435\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u0443\u0442\u044C \u0432\u043D\u0443\u0442\u0440\u0438 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.");
  }
  const parts = relPath.split(/[\\/]+/).filter(Boolean);
  if (!parts.length) throw new SandboxError("path_forbidden", "\u041D\u0443\u0436\u0435\u043D \u043F\u0443\u0442\u044C \u043A \u0444\u0430\u0439\u043B\u0443 \u0432\u043D\u0443\u0442\u0440\u0438 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.");
  if (parts.length > 32) throw new SandboxError("path_forbidden", "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0433\u043B\u0443\u0431\u043E\u043A\u0430\u044F \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u043F\u0443\u0442\u0438.");
  for (const part of parts) {
    if (part === "." || part === "..") {
      throw new SandboxError("path_forbidden", "\u041F\u0435\u0440\u0435\u0445\u043E\u0434\u044B \xAB.\xBB \u0438 \xAB..\xBB \u0432 \u043F\u0443\u0442\u0438 \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u044B.");
    }
    if (blockedName(part)) {
      throw new SandboxError("path_forbidden", `\u0421\u0435\u0433\u043C\u0435\u043D\u0442 \xAB${part}\xBB \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D \u0434\u043B\u044F \u0430\u0433\u0435\u043D\u0442\u0430.`);
    }
  }
  return parts;
}
function inside(root, target) {
  const rel = relative(root, target);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
function workspaceRoot(path) {
  if (typeof path !== "string" || !isAbsolute(path)) {
    throw new SandboxError("workspace_invalid", "\u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C \u043F\u0443\u0442\u0451\u043C.");
  }
  const real = realpathSync(path);
  if (!statSync(real).isDirectory()) {
    throw new SandboxError("workspace_invalid", "\u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u043E\u043C.");
  }
  if (dirname(real) === real) {
    throw new SandboxError("workspace_invalid", "\u041A\u043E\u0440\u0435\u043D\u044C \u0434\u0438\u0441\u043A\u0430 \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u043A \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433.");
  }
  return real;
}
function existingAncestorChecks(root, parts) {
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    if (!existsSync(current)) break;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw new SandboxError("path_forbidden", "\u0421\u0438\u043C\u0432\u043E\u043B\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u0432 \u0440\u0430\u0431\u043E\u0447\u0435\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u044B.");
    }
  }
  return current;
}
function writablePath(root, relPath) {
  const parts = segmentsOf(relPath);
  const target = existingAncestorChecks(root, parts);
  const parent = dirname(target);
  if (existsSync(parent)) {
    const realParent = realpathSync(parent);
    if (realParent !== root && !inside(root, realParent)) {
      throw new SandboxError("path_forbidden", "\u041F\u0443\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.");
    }
  }
  return target;
}
function readablePath(root, relPath) {
  const parts = segmentsOf(relPath);
  const candidate = existingAncestorChecks(root, parts);
  const real = realpathSync(candidate);
  if (!inside(root, real)) {
    throw new SandboxError("path_forbidden", "\u041F\u0443\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.");
  }
  if (!statSync(real).isFile()) {
    throw new SandboxError("path_invalid", "\u042D\u0442\u043E \u043D\u0435 \u0444\u0430\u0439\u043B.");
  }
  return real;
}
function readWorkspaceFile(root, relPath, startLine = 1, endLine = 200) {
  const start = Number.isSafeInteger(startLine) && startLine >= 1 ? startLine : 1;
  const end = Number.isSafeInteger(endLine) ? endLine : start + 199;
  if (end < start) throw new SandboxError("invalid_range", "\u041A\u043E\u043D\u0435\u0447\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430 \u043C\u0435\u043D\u044C\u0448\u0435 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u043E\u0439.");
  if (end - start >= 200) throw new SandboxError("invalid_range", "\u0417\u0430 \u043E\u0434\u0438\u043D \u0440\u0430\u0437 \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 200 \u0441\u0442\u0440\u043E\u043A.");
  const target = readablePath(root, relPath);
  const size = statSync(target).size;
  if (size > MAX_READ_BYTES * 4) {
    throw new SandboxError("file_too_large", "\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 64 \u041A\u0411: \u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0435\u0433\u043E \u0447\u0430\u0441\u0442\u044F\u043C\u0438 \u0447\u0435\u0440\u0435\u0437 run_command.");
  }
  const fd = openSync(target, "r");
  try {
    const stat = fstatSync(fd);
    const length = Math.min(stat.size, MAX_READ_BYTES);
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, 0);
    if (buffer.includes(0)) throw new SandboxError("file_not_text", "\u0424\u0430\u0439\u043B \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0442\u0435\u043A\u0441\u0442\u043E\u043C UTF-8.");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    const lines = text.split("\n");
    const selected = lines.slice(start - 1, end);
    const content = selected.join("\n");
    return {
      path: relPath,
      start_line: start,
      end_line: start + Math.max(0, selected.length - 1),
      content,
      truncated: start > 1 || end < lines.length || stat.size > MAX_READ_BYTES
    };
  } finally {
    closeSync(fd);
  }
}
function writeWorkspaceFile(root, relPath, content) {
  if (typeof content !== "string") throw new SandboxError("content_invalid", "\u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439.");
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_WRITE_BYTES) {
    throw new SandboxError("content_too_large", "\u0417\u0430 \u043E\u0434\u043D\u0443 \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 64 \u041A\u0411.");
  }
  const target = writablePath(root, relPath);
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
    throw new SandboxError("path_forbidden", "\u0417\u0430\u043F\u0438\u0441\u044C \u043F\u043E\u0432\u0435\u0440\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u0438 \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u0430.");
  }
  writeFileSync(target, content, { encoding: "utf8", flag: "w" });
  return { path: relPath, bytes };
}
function listWorkspace(root, relPath = ".") {
  const target = relPath === "." || relPath === "" ? root : readableDirectory(root, relPath);
  const entries = readdirSync(target, { withFileTypes: true }).filter((entry) => !blockedName(entry.name)).slice(0, 200).map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? "dir" : "file"
  })).sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}
function readableDirectory(root, relPath) {
  const parts = segmentsOf(relPath);
  const candidate = existingAncestorChecks(root, parts);
  const real = realpathSync(candidate);
  if (!inside(root, real)) {
    throw new SandboxError("path_forbidden", "\u041F\u0443\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.");
  }
  if (!statSync(real).isDirectory()) throw new SandboxError("path_invalid", "\u042D\u0442\u043E \u043D\u0435 \u043A\u0430\u0442\u0430\u043B\u043E\u0433.");
  return real;
}
var DEFAULT_ALLOW = ["node", "node.exe", "python", "python3", "py", "py.exe", "deno", "bun", "bun.exe"];
function allowSet(raw) {
  const value = (raw ?? "").trim();
  if (!value) return new Set(DEFAULT_ALLOW);
  const items = value.split(",").map((item) => basename(item.trim()).toLowerCase()).filter(Boolean);
  return new Set(items.length ? items : DEFAULT_ALLOW);
}
function scrubbedEnv() {
  const env = {};
  for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "TEMP", "TMP"]) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  env.PYTHONIOENCODING = "utf-8";
  env.PYTHONDONTWRITEBYTECODE = "1";
  env.TEAM_AUTONOMY_SANDBOX = "1";
  return env;
}
function validateArgv(argv, allow) {
  if (!Array.isArray(argv) || argv.length < 1 || argv.length > MAX_ARGUMENTS) {
    throw new SandboxError("argv_invalid", "\u041D\u0443\u0436\u0435\u043D \u043C\u0430\u0441\u0441\u0438\u0432 argv \u0438\u0437 1\u201332 \u0441\u0442\u0440\u043E\u043A \u0431\u0435\u0437 \u043E\u0431\u043E\u043B\u043E\u0447\u043A\u0438.");
  }
  const result = [];
  for (const item of argv) {
    if (typeof item !== "string" || !item || item.length > MAX_ARGUMENT_CHARS || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(item)) {
      throw new SandboxError("argv_invalid", "\u041A\u0430\u0436\u0434\u044B\u0439 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442 \u2014 \u0441\u0442\u0440\u043E\u043A\u0430 \u0434\u043E 500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0431\u0435\u0437 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0445 \u0437\u043D\u0430\u043A\u043E\u0432.");
    }
    result.push(item);
  }
  const executable = basename(result[0]).toLowerCase();
  if (!allow.has(executable)) {
    throw new SandboxError(
      "command_not_allowed",
      `\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \xAB${executable}\xBB \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 allowlist. \u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u044B: ${[...allow].sort().join(", ")}.`
    );
  }
  return result;
}
async function runCommand(root, argv, allow, options = {}) {
  const safeArgv = validateArgv(argv, allow);
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 2e4, 1e3), 12e4);
  const started = Date.now();
  return await new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new SandboxError("cancelled", "\u0417\u0430\u043F\u0443\u0441\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D."));
      return;
    }
    const child = spawn(safeArgv[0], safeArgv.slice(1), {
      cwd: root,
      shell: false,
      windowsHide: true,
      env: scrubbedEnv(),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let truncated = false;
    let timedOut = false;
    const onAbort = () => {
      child.kill();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    const collect = (chunk, target) => {
      const text = chunk.toString("utf8");
      if (target === "out") {
        if (stdout.length < MAX_OUTPUT_BYTES) stdout += text;
        if (stdout.length > MAX_OUTPUT_BYTES) {
          stdout = stdout.slice(0, MAX_OUTPUT_BYTES);
          truncated = true;
        }
      } else {
        if (stderr.length < MAX_OUTPUT_BYTES) stderr += text;
        if (stderr.length > MAX_OUTPUT_BYTES) {
          stderr = stderr.slice(0, MAX_OUTPUT_BYTES);
          truncated = true;
        }
      }
      if (truncated) child.kill();
    };
    child.stdout?.on("data", (chunk) => collect(chunk, "out"));
    child.stderr?.on("data", (chunk) => collect(chunk, "err"));
    child.once("error", (error) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      reject(new SandboxError("spawn_failed", `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443: ${error.message}`));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      resolve({
        exit_code: code,
        stdout,
        stderr,
        timed_out: timedOut,
        output_truncated: truncated,
        duration_ms: Date.now() - started
      });
    });
  });
}

// modules/autonomy-local/runtime.ts
import { appendFileSync, existsSync as existsSync2, readFileSync, renameSync, statSync as statSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join2 } from "node:path";
var DEFAULT_BUDGET = { max_steps: 12, max_tool_calls: 40, max_seconds: 600 };
var MAX_MESSAGE_CHARS = 8e3;
var MAX_MESSAGES = 60;
var MAX_EVENTS_BYTES = 2 * 1024 * 1024;
function clampBudget(raw) {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const int = (value, fallback, min, max) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isSafeInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
  };
  return {
    max_steps: int(input.max_steps, DEFAULT_BUDGET.max_steps, 1, 100),
    max_tool_calls: int(input.max_tool_calls, DEFAULT_BUDGET.max_tool_calls, 1, 500),
    max_seconds: int(input.max_seconds, DEFAULT_BUDGET.max_seconds, 30, 3600)
  };
}
function createRunState(input) {
  const budget = clampBudget(input.budget);
  const now = /* @__PURE__ */ new Date();
  const state = {
    id: input.id,
    goal: input.goal,
    workspace: input.workspace,
    status: "queued",
    verification: "none",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    started_at: null,
    finished_at: null,
    deadline_at: new Date(now.getTime() + budget.max_seconds * 1e3).toISOString(),
    step: 0,
    tool_calls: 0,
    budget,
    claims: [],
    summary: null,
    error: null,
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    usage: { prompt_tokens: 0, completion_tokens: 0 }
  };
  state.messages.push({ role: "user", content: `\u0426\u0435\u043B\u044C: ${input.goal}

\u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433: ${input.workspace}` });
  return state;
}
var SYSTEM_PROMPT = [
  "\u0422\u044B \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u044B\u0439 \u0430\u0433\u0435\u043D\u0442 Team Platform. \u0422\u044B \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0448\u044C \u043E\u0434\u0438\u043D, \u0431\u0435\u0437 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u0432 \u043A\u043E\u043D\u0442\u0443\u0440\u0435.",
  "\u041F\u0440\u0430\u0432\u0438\u043B\u0430:",
  "1. \u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0439 \u0442\u043E\u043B\u044C\u043A\u043E \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438. \u041D\u0435 \u043E\u043F\u0438\u0441\u044B\u0432\u0430\u0439, \u0447\u0442\u043E \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0448\u044C\u0441\u044F \u0441\u0434\u0435\u043B\u0430\u0442\u044C, \u2014 \u0434\u0435\u043B\u0430\u0439.",
  "2. \u0412\u0441\u0435 \u043F\u0443\u0442\u0438 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430. \u0410\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u0435 \u043F\u0443\u0442\u0438 \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u044B.",
  "3. \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u043C\u043E\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439, \u0430 \u043D\u0435 \u0441\u043B\u043E\u0432\u0430\u043C\u0438. \u0415\u0441\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u2014 \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u044F\u0439 \u0438\u043B\u0438 \u043E\u0442\u0437\u044B\u0432\u0430\u0439 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435.",
  "4. \u041A\u0430\u0436\u0434\u043E\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0438\u0442\u043E\u0433\u0430 \u0437\u0430\u043A\u0440\u0435\u043F\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u043C record_claim \u0441 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 (\u043A\u043E\u0434 \u0432\u044B\u0445\u043E\u0434\u0430 0 = \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E).",
  "5. \u041D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043D\u0435 \u0441\u0441\u044B\u043B\u0430\u0439\u0441\u044F \u043D\u0430 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u043D\u0435 \u0447\u0438\u0442\u0430\u043B.",
  "6. \u041A\u043E\u0433\u0434\u0430 \u0440\u0430\u0431\u043E\u0442\u0430 \u0437\u0430\u043A\u043E\u043D\u0447\u0435\u043D\u0430, \u0432\u044B\u0437\u043E\u0432\u0438 finish \u0441 \u043A\u0440\u0430\u0442\u043A\u0438\u043C \u0438\u0442\u043E\u0433\u043E\u043C. \u0411\u0435\u0437 finish \u043F\u0440\u043E\u0433\u043E\u043D \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u043C.",
  "7. \u0411\u044E\u0434\u0436\u0435\u0442 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D: \u0435\u0441\u043B\u0438 \u0448\u0430\u0433\u0438 \u0438\u043B\u0438 \u0432\u044B\u0437\u043E\u0432\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u043A\u043E\u043D\u0447\u0430\u044E\u0442\u0441\u044F, \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0439 \u0440\u0430\u0431\u043E\u0442\u0443, \u0430 \u043D\u0435 \u043D\u0430\u0447\u0438\u043D\u0430\u0439 \u043D\u043E\u0432\u0443\u044E."
].join("\n");
var TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u043E\u0432 \u0432\u043D\u0443\u0442\u0440\u0438 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "\u041E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u0443\u0442\u044C; \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u043A\u043E\u0440\u0435\u043D\u044C." } },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0434\u043E 200 \u0441\u0442\u0440\u043E\u043A \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430 \u0432\u043D\u0443\u0442\u0440\u0438 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          start_line: { type: "integer", minimum: 1 },
          end_line: { type: "integer", minimum: 1 }
        },
        required: ["path"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0444\u0430\u0439\u043B (\u0434\u043E 64 \u041A\u0411) \u0432\u043D\u0443\u0442\u0440\u0438 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0438\u0437 allowlist \u0431\u0435\u0437 \u043E\u0431\u043E\u043B\u043E\u0447\u043A\u0438. \u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u043A\u043E\u0434 \u0432\u044B\u0445\u043E\u0434\u0430, stdout \u0438 stderr.",
      parameters: {
        type: "object",
        properties: {
          argv: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 32 },
          timeout_ms: { type: "integer", minimum: 1e3, maximum: 12e4 }
        },
        required: ["argv"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "record_claim",
      description: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0435\u0433\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438. \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443; exit 0 = \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E.",
      parameters: {
        type: "object",
        properties: {
          statement: { type: "string" },
          argv: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 32 }
        },
        required: ["statement", "argv"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "finish",
      description: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u043F\u0440\u043E\u0433\u043E\u043D \u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0438\u0442\u043E\u0433.",
      parameters: {
        type: "object",
        properties: { summary: { type: "string" } },
        required: ["summary"],
        additionalProperties: false
      }
    }
  }
];
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function statePath(dir) {
  return join2(dir, "state.json");
}
function saveState(dir, state) {
  state.updated_at = nowIso();
  const target = statePath(dir);
  const temp = `${target}.tmp`;
  writeFileSync2(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, target);
}
function loadState(dir) {
  const target = statePath(dir);
  if (!existsSync2(target)) return null;
  const raw = JSON.parse(readFileSync(target, "utf8"));
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !Array.isArray(raw.messages)) return null;
  return raw;
}
function appendEvent(dir, event) {
  const target = join2(dir, "events.jsonl");
  try {
    if (existsSync2(target) && statSync2(target).size > MAX_EVENTS_BYTES) {
      renameSync(target, `${target}.1`);
    }
  } catch {
  }
  appendFileSync(target, `${JSON.stringify({ at: nowIso(), ...event })}
`, "utf8");
}
function cap(text) {
  return text.length > MAX_MESSAGE_CHARS ? `${text.slice(0, MAX_MESSAGE_CHARS)}
\u2026\u043E\u0431\u0440\u0435\u0437\u0430\u043D\u043E` : text;
}
function trimMessages(messages) {
  if (messages.length <= MAX_MESSAGES) return messages;
  const system = messages[0];
  if (!system) return messages;
  const tail = messages.slice(-(MAX_MESSAGES - 1));
  const firstAssistant = tail.findIndex((message) => message.role === "assistant");
  return [system, ...firstAssistant > 0 ? tail.slice(firstAssistant) : tail];
}
function argumentOf(args, key) {
  return args && typeof args === "object" && !Array.isArray(args) ? args[key] : void 0;
}
async function checkClaim(state, claim, sandbox, signal) {
  try {
    const result = await runCommand(state.workspace, claim.argv, sandbox.allow, { timeoutMs: 3e4, signal });
    claim.exit_code = result.exit_code;
    claim.status = result.exit_code === 0 ? "passed" : "failed";
    claim.output = cap(`${result.stdout}${result.stderr ? `
${result.stderr}` : ""}`.trim()).slice(0, 2e3);
  } catch (error) {
    claim.exit_code = null;
    claim.status = "failed";
    claim.output = error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438";
  }
  claim.checked_at = nowIso();
}
async function executeTool(state, call, sandbox, signal) {
  const args = call.args;
  try {
    switch (call.name) {
      case "list_files": {
        const path = argumentOf(args, "path");
        const entries = listWorkspace(state.workspace, typeof path === "string" ? path : ".");
        return { content: cap(JSON.stringify({ ok: true, entries })), done: false };
      }
      case "read_file": {
        const path = argumentOf(args, "path");
        if (typeof path !== "string") throw new SandboxError("path_invalid", "\u041D\u0443\u0436\u0435\u043D path.");
        const start = argumentOf(args, "start_line");
        const end = argumentOf(args, "end_line");
        const file = readWorkspaceFile(
          state.workspace,
          path,
          typeof start === "number" ? start : 1,
          typeof end === "number" ? end : 200
        );
        return { content: cap(JSON.stringify({ ok: true, ...file })), done: false };
      }
      case "write_file": {
        const path = argumentOf(args, "path");
        const content = argumentOf(args, "content");
        if (typeof path !== "string" || typeof content !== "string") {
          throw new SandboxError("arg_invalid", "\u041D\u0443\u0436\u043D\u044B path \u0438 content.");
        }
        const written = writeWorkspaceFile(state.workspace, path, content);
        return { content: cap(JSON.stringify({ ok: true, ...written })), done: false };
      }
      case "run_command": {
        const argv = argumentOf(args, "argv");
        const timeoutMs = argumentOf(args, "timeout_ms");
        const result = await runCommand(state.workspace, argv, sandbox.allow, {
          timeoutMs: typeof timeoutMs === "number" ? timeoutMs : 2e4,
          signal
        });
        return { content: cap(JSON.stringify({ ok: result.exit_code === 0, ...result })), done: false };
      }
      case "record_claim": {
        const statement = argumentOf(args, "statement");
        const argv = argumentOf(args, "argv");
        if (typeof statement !== "string" || !statement.trim() || statement.length > 500) {
          throw new SandboxError("arg_invalid", "\u041D\u0443\u0436\u043D\u043E \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0434\u043E 500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
        }
        if (!Array.isArray(argv)) throw new SandboxError("arg_invalid", "\u041D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 argv.");
        const claim = {
          id: `claim-${state.claims.length + 1}`,
          statement: statement.trim(),
          argv: argv.filter((item) => typeof item === "string"),
          status: "pending",
          exit_code: null,
          output: "",
          checked_at: null
        };
        state.claims.push(claim);
        await checkClaim(state, claim, sandbox, signal);
        return {
          content: cap(JSON.stringify({
            ok: claim.status === "passed",
            claim_id: claim.id,
            status: claim.status,
            exit_code: claim.exit_code,
            output: claim.output,
            hint: claim.status === "passed" ? "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u043E\u0448\u043B\u0430." : "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430: \u0438\u0441\u043F\u0440\u0430\u0432\u044C \u0438\u043B\u0438 \u043E\u0442\u0437\u043E\u0432\u0438 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435."
          })),
          done: false
        };
      }
      case "finish": {
        const summary = argumentOf(args, "summary");
        state.summary = typeof summary === "string" ? cap(summary.trim()).slice(0, 4e3) : "";
        return { content: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u043D\u044F\u0442\u043E.", done: true };
      }
      default:
        return { content: JSON.stringify({ ok: false, error: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \xAB${call.name}\xBB.` }), done: false };
    }
  } catch (error) {
    const message = error instanceof SandboxError ? `${error.code}: ${error.message}` : error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430";
    return { content: JSON.stringify({ ok: false, error: cap(message) }), done: false };
  }
}
async function runLoop(options) {
  const { state, dir, model, sandbox, signal } = options;
  state.status = "running";
  if (!state.started_at) state.started_at = nowIso();
  state.error = null;
  saveState(dir, state);
  appendEvent(dir, { type: "run_started", step: state.step });
  let nudges = 0;
  let finishing = false;
  try {
    while (true) {
      if (signal.aborted) {
        state.status = "cancelled";
        state.error = "\u041F\u0440\u043E\u0433\u043E\u043D \u043E\u0442\u043C\u0435\u043D\u0451\u043D.";
        break;
      }
      if (state.step >= state.budget.max_steps) {
        state.status = "budget_exhausted";
        state.error = `\u041B\u0438\u043C\u0438\u0442 \u0448\u0430\u0433\u043E\u0432: ${state.budget.max_steps}.`;
        break;
      }
      if (state.tool_calls >= state.budget.max_tool_calls) {
        state.status = "budget_exhausted";
        state.error = `\u041B\u0438\u043C\u0438\u0442 \u0432\u044B\u0437\u043E\u0432\u043E\u0432 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432: ${state.budget.max_tool_calls}.`;
        break;
      }
      if (Date.now() > Date.parse(state.deadline_at)) {
        state.status = "budget_exhausted";
        state.error = `\u041B\u0438\u043C\u0438\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u0438: ${state.budget.max_seconds} \u0441.`;
        break;
      }
      let reply;
      try {
        reply = await callModel(model, trimMessages(state.messages), TOOLS, signal);
      } catch (error) {
        if (signal.aborted) {
          state.status = "cancelled";
          state.error = "\u041F\u0440\u043E\u0433\u043E\u043D \u043E\u0442\u043C\u0435\u043D\u0451\u043D.";
          break;
        }
        state.status = "failed";
        state.error = error instanceof ModelError ? error.message : "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u0437\u043E\u0432\u0430 \u043C\u043E\u0434\u0435\u043B\u0438.";
        break;
      }
      state.step += 1;
      state.usage.prompt_tokens += reply.promptTokens;
      state.usage.completion_tokens += reply.completionTokens;
      state.messages.push({
        role: "assistant",
        content: reply.content ? cap(reply.content) : null,
        ...reply.toolCalls.length ? {
          tool_calls: reply.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: call.raw_args }
          }))
        } : {}
      });
      if (!reply.toolCalls.length) {
        nudges += 1;
        if (nudges >= 2) {
          state.status = "failed";
          state.error = "\u041C\u043E\u0434\u0435\u043B\u044C \u0434\u0432\u0430\u0436\u0434\u044B \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u0431\u0435\u0437 \u0432\u044B\u0437\u043E\u0432\u0430 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430.";
          break;
        }
        state.messages.push({
          role: "user",
          content: "\u0412\u044B\u0437\u043E\u0432\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442. \u0415\u0441\u043B\u0438 \u0440\u0430\u0431\u043E\u0442\u0430 \u0437\u0430\u043A\u043E\u043D\u0447\u0435\u043D\u0430 \u2014 finish, \u0438\u043D\u0430\u0447\u0435 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u0448\u0430\u0433."
        });
        saveState(dir, state);
        appendEvent(dir, { type: "no_tool_call", step: state.step });
        continue;
      }
      nudges = 0;
      for (const call of reply.toolCalls) {
        if (state.tool_calls >= state.budget.max_tool_calls) {
          state.status = "budget_exhausted";
          state.error = `\u041B\u0438\u043C\u0438\u0442 \u0432\u044B\u0437\u043E\u0432\u043E\u0432 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432: ${state.budget.max_tool_calls}.`;
          break;
        }
        state.tool_calls += 1;
        const outcome = await executeTool(state, call, sandbox, signal);
        state.messages.push({ role: "tool", tool_call_id: call.id, content: outcome.content });
        appendEvent(dir, { type: "tool", step: state.step, tool: call.name, ok: !outcome.content.includes('"ok":false') });
        if (outcome.done) {
          finishing = true;
          break;
        }
      }
      saveState(dir, state);
      if (state.status === "budget_exhausted") break;
      if (finishing) break;
    }
    if (finishing && !signal.aborted) {
      for (const claim of state.claims) await checkClaim(state, claim, sandbox, signal);
      const failed = state.claims.filter((claim) => claim.status !== "passed");
      if (!state.claims.length) {
        state.verification = "none";
        state.status = "done";
      } else if (failed.length) {
        state.verification = "failed";
        state.status = "failed_verification";
        state.error = `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0438 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F: ${failed.map((claim) => claim.id).join(", ")}.`;
      } else {
        state.verification = "passed";
        state.status = "done";
      }
    }
  } catch (error) {
    state.status = signal.aborted ? "cancelled" : "failed";
    state.error = error instanceof Error ? error.message : "\u041D\u0435\u043F\u0440\u0435\u0434\u0432\u0438\u0434\u0435\u043D\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0433\u043E\u043D\u0430.";
  } finally {
    const finalStatus = String(state.status);
    if (finalStatus === "running" || finalStatus === "queued") {
      state.status = signal.aborted ? "cancelled" : "failed";
      if (!state.error) state.error = "\u041F\u0440\u043E\u0433\u043E\u043D \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0431\u0435\u0437 \u0438\u0442\u043E\u0433\u043E\u0432\u043E\u0433\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0430.";
    }
    if (finalStatus !== "queued" && finalStatus !== "running") state.finished_at = nowIso();
    state.messages = trimMessages(state.messages);
    saveState(dir, state);
    appendEvent(dir, { type: "run_finished", status: state.status, step: state.step, verification: state.verification });
  }
  return state;
}

// modules/autonomy-local/cli.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync2 } from "node:fs";
import { join as join3 } from "node:path";
function endpointPort() {
  const portText = (process.env.TEAM_LOCAL_PLATFORM_PORT ?? "").trim();
  if (/^\d{1,5}$/.test(portText)) return Number(portText);
  const file = (process.env.TEAM_AUTONOMY_ENDPOINT ?? "").trim();
  if (!file || !existsSync3(file)) return null;
  try {
    const info = JSON.parse(readFileSync2(file, "utf8"));
    return Number.isSafeInteger(info.port) && Number(info.port) > 0 && Number(info.port) < 65536 ? Number(info.port) : null;
  } catch {
    return null;
  }
}
function budgetFromEnv() {
  const raw = (process.env.TEAM_AUTONOMY_BUDGET ?? "").trim();
  if (!raw) return clampBudget({});
  try {
    return clampBudget(JSON.parse(raw));
  } catch {
    return clampBudget({});
  }
}
async function loadTask(port, taskId) {
  const response = await fetch(`http://127.0.0.1:${port}/api/tasks/${encodeURIComponent(taskId)}`, {
    redirect: "error",
    signal: AbortSignal.timeout(15e3)
  });
  if (!response.ok) throw new Error(`\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 HTTP ${response.status} \u0434\u043B\u044F \u0437\u0430\u0434\u0430\u0447\u0438`);
  const data = await response.json();
  if (!data.task || data.task.id !== taskId) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0438\u043B\u0438 id \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u043B");
  return data.task;
}
async function runAutonomyCli() {
  const taskId = (process.env.TEAM_TASK_ID ?? "").trim();
  const attempt = Number(process.env.TEAM_ATTEMPT ?? "1");
  const dataDir = (process.env.TEAM_AUTONOMY_DATA ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(taskId) || !Number.isSafeInteger(attempt) || attempt < 1) {
    process.stderr.write("\u0410\u0433\u0435\u043D\u0442 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u043C: \u043D\u0443\u0436\u043D\u044B TEAM_TASK_ID \u0438 TEAM_ATTEMPT.\n");
    process.exitCode = 2;
    return;
  }
  if (!dataDir) {
    process.stderr.write("\u041D\u0435 \u0437\u0430\u0434\u0430\u043D \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0434\u0430\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0443\u043B\u044F (TEAM_AUTONOMY_DATA).\n");
    process.exitCode = 2;
    return;
  }
  const { config, reason } = modelFromEnv();
  if (!config) {
    process.stderr.write(`\u041C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0430: ${reason}
`);
    process.exitCode = 2;
    return;
  }
  const port = endpointPort();
  if (!port) {
    process.stderr.write("\u041D\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B: \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043C\u043E\u0434\u0443\u043B\u044F \u0438 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0430\u0433\u0435\u043D\u0442\u0430 \u0437\u0430\u043D\u043E\u0432\u043E.\n");
    process.exitCode = 2;
    return;
  }
  let state = null;
  const dir = join3(dataDir, "runs", `${taskId}-a${attempt}`);
  try {
    const task = await loadTask(port, taskId);
    if (typeof task.title !== "string" || typeof task.description !== "string") {
      throw new Error("\u0423 \u0437\u0430\u0434\u0430\u0447\u0438 \u043D\u0435\u0442 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u0438\u043B\u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F");
    }
    if (task.status === "done" || task.status === "cancelled") {
      throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    }
    const goal = `${task.title.trim()}

${task.description.trim()}`.trim();
    if (!goal) throw new Error("\u041F\u0443\u0441\u0442\u0430\u044F \u0446\u0435\u043B\u044C");
    if (goal.length > 8e3) throw new Error("\u0426\u0435\u043B\u044C \u0434\u043B\u0438\u043D\u043D\u0435\u0435 8000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const workspaceEnv = (process.env.TEAM_AUTONOMY_WORKSPACE ?? "").trim();
    const workspace = workspaceEnv ? workspaceRoot(workspaceEnv) : process.cwd();
    mkdirSync2(dir, { recursive: true });
    const previous = loadState(dir);
    state = previous && ["running", "queued", "interrupted"].includes(previous.status) ? previous : createRunState({ id: `${taskId}-a${attempt}`, goal, workspace, budget: budgetFromEnv() });
    if (!previous) saveState(dir, state);
  } catch (error) {
    process.stderr.write(`\u0410\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u044B\u0439 \u043F\u0440\u043E\u0433\u043E\u043D \u043D\u0435 \u043D\u0430\u0447\u0430\u0442: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}
`);
    process.exitCode = 1;
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    const finished = await runLoop({
      state,
      dir,
      model: config,
      sandbox: { allow: allowSet(process.env.TEAM_AUTONOMY_ALLOW_COMMANDS) },
      signal: controller.signal
    });
    const claims = finished.claims.length ? finished.claims.map((claim) => `- ${claim.id} [${claim.status}] ${claim.statement}`).join("\n") : "- \u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A \u043D\u0435\u0442: \u0438\u0442\u043E\u0433 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D";
    process.stdout.write([
      `\u0421\u0442\u0430\u0442\u0443\u0441: ${finished.status} (\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: ${finished.verification})`,
      finished.summary ? `\u0418\u0442\u043E\u0433: ${finished.summary}` : "\u0418\u0442\u043E\u0433: \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u044B\u0437\u0432\u0430\u043B\u0430 finish",
      `\u0428\u0430\u0433\u043E\u0432: ${finished.step}/${finished.budget.max_steps}, \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432: ${finished.tool_calls}/${finished.budget.max_tool_calls}`,
      "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0438:",
      claims,
      finished.error ? `\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${finished.error}` : "",
      ""
    ].filter(Boolean).join("\n"));
    process.exitCode = finished.status === "done" ? 0 : finished.status === "failed_verification" ? 4 : finished.status === "budget_exhausted" ? 3 : 1;
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}

// modules/autonomy-local/registry.ts
import { existsSync as existsSync4, readFileSync as readFileSync3, renameSync as renameSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname as dirname2, join as join4 } from "node:path";
import { mkdirSync as mkdirSync3 } from "node:fs";
function runnerSource(endpointFile) {
  return [
    "// \u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043C\u043E\u0434\u0443\u043B\u0435\u043C autonomy-local. \u041D\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
    "import { readFileSync } from 'node:fs';",
    `const endpoint = ${JSON.stringify(endpointFile)};`,
    "let info;",
    "try {",
    "  info = JSON.parse(readFileSync(endpoint, 'utf8'));",
    "} catch {",
    "  process.stderr.write('\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 \u0440\u0430\u043D\u0442\u0430\u0439\u043C\u0430 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u0438\u0438: \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043C\u043E\u0434\u0443\u043B\u044F \u0438 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0430\u0433\u0435\u043D\u0442\u0430 \u0437\u0430\u043D\u043E\u0432\u043E.\\n');",
    "  process.exit(2);",
    "}",
    "if (!info || typeof info.bundle !== 'string' || !info.bundle.startsWith('file:')) {",
    "  process.stderr.write('\u0424\u0430\u0439\u043B \u0440\u0430\u043D\u0442\u0430\u0439\u043C\u0430 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u0438\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D.\\n');",
    "  process.exit(2);",
    "}",
    "const { runAutonomyCli } = await import(info.bundle);",
    "await runAutonomyCli();",
    ""
  ].join("\n");
}
function writeRunner(file, source) {
  mkdirSync3(dirname2(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  writeFileSync3(temp, source, "utf8");
  renameSync2(temp, file);
}
function mergeAgentRecord(file, record) {
  if (!file) return { registered: false, reason: "\u0424\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D \u0432 \u044D\u0442\u043E\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435." };
  let rows = [];
  if (existsSync4(file)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync3(file, "utf8"));
    } catch {
      return { registered: false, reason: "\u0424\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 JSON: \u043D\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E." };
    }
    const agents = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed.agents : null;
    if (!Array.isArray(agents) || !agents.length) {
      return { registered: false, reason: "\u0412 \u0444\u0430\u0439\u043B\u0435 \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u043D\u0435\u0442 \u043D\u0435\u043F\u0443\u0441\u0442\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u043A\u0430 agents: \u043D\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E." };
    }
    rows = agents;
  }
  const kept = rows.filter((row) => {
    const id = row && typeof row === "object" ? row.id : null;
    return id !== record.id;
  });
  kept.push({ ...record });
  const temp = `${file}.tmp-${process.pid}`;
  try {
    mkdirSync3(dirname2(file), { recursive: true });
    writeFileSync3(temp, `${JSON.stringify({ agents: kept }, null, 2)}
`, "utf8");
    renameSync2(temp, file);
  } catch (error) {
    return { registered: false, reason: `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}` };
  }
  return { registered: true, reason: "" };
}
function endpointPath(dataDir) {
  return join4(dataDir, "runtime.json");
}
function runnerPath(dataDir) {
  return join4(dataDir, "autonomy-runner.mjs");
}
var AGENT_ID = "autonomy-local-task";

// modules/local-request-port.ts
function localRequestPort(context) {
  const port = context.req?.socket?.localPort;
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

// modules/autonomy-local/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
var module = {
  id: "autonomy-local",
  apiVersion: 1,
  permissions: ["process", "network", "storage"],
  register(ctx) {
    const dataDir = ctx.paths.data;
    mkdirSync4(dataDir, { recursive: true });
    const endpointFile = endpointPath(dataDir);
    const runner = runnerPath(dataDir);
    const agentsFile = ctx.settings.executor.agentsFile || "";
    const bundle = import.meta.url;
    const remember = (port) => {
      if (!port) return null;
      const value = Number(port);
      if (!Number.isSafeInteger(value) || value < 1 || value > 65535) return null;
      const body = `${JSON.stringify({ port: value, bundle, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, null, 2)}
`;
      try {
        if (!existsSync5(endpointFile) || readFileSync4(endpointFile, "utf8") !== body) {
          writeFileSync4(endpointFile, body, "utf8");
        }
      } catch {
      }
      return value;
    };
    const agentRegistered = () => {
      if (!agentsFile || !existsSync5(agentsFile)) return false;
      try {
        const parsed = JSON.parse(readFileSync4(agentsFile, "utf8"));
        return Array.isArray(parsed.agents) && parsed.agents.some((row) => row && typeof row === "object" && row.id === AGENT_ID);
      } catch {
        return false;
      }
    };
    ctx.api.add("GET", "/api/tools/autonomy-local/status", (request) => {
      const port = remember(localRequestPort(request));
      const { config, reason } = modelFromEnv();
      return {
        headers: { "cache-control": "no-store" },
        body: {
          ok: true,
          configured: config !== null,
          model: config?.model ?? null,
          base_url: config?.baseUrl ?? null,
          reason: config ? "" : reason,
          workspace_env: process.env.TEAM_AUTONOMY_WORKSPACE?.trim() || null,
          allow: [...allowSet(process.env.TEAM_AUTONOMY_ALLOW_COMMANDS)].sort(),
          agent_id: AGENT_ID,
          agent_registered: agentRegistered(),
          agents_file: agentsFile || null,
          endpoint_port: port
        }
      };
    });
    ctx.api.add("POST", "/api/tools/autonomy-local/prepare-agent", (request) => {
      const { config, reason } = modelFromEnv();
      if (!config) return fail(503, "model_unconfigured", reason);
      const port = remember(localRequestPort(request)) ?? remember(
        readEndpointPort(endpointFile)?.toString() ?? null
      );
      if (!port) return fail(503, "endpoint_unknown", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u043E\u0440\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B.");
      const body = asRecord(request.body);
      const workspaceInput = typeof body.workspace === "string" && body.workspace.trim() ? body.workspace.trim() : (process.env.TEAM_AUTONOMY_WORKSPACE ?? "").trim();
      let workspace;
      try {
        workspace = workspaceRoot(workspaceInput);
      } catch (error) {
        return fail(400, "workspace_invalid", error instanceof SandboxError ? error.message : "\u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D.");
      }
      const budget = clampBudget(body.budget);
      if (budget.max_seconds * 1e3 + 12e4 > 36e5) {
        return fail(400, "budget_too_large", "\u041B\u0438\u043C\u0438\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0432\u0435\u043B\u0438\u043A \u0434\u043B\u044F \u0442\u0430\u0439\u043C\u0430\u0443\u0442\u0430 \u0437\u0430\u043F\u0443\u0441\u043A\u0430.");
      }
      try {
        writeRunner(runner, runnerSource(endpointFile));
      } catch (error) {
        return fail(500, "runner_write_failed", `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0440\u0430\u043D\u043D\u0435\u0440: ${error instanceof Error ? error.message : "\u043E\u0448\u0438\u0431\u043A\u0430"}`);
      }
      const record = {
        id: AGENT_ID,
        command: process.execPath,
        args: [runner],
        // cwd — рабочий каталог исследования: на нём же исполнитель берёт
        // блокировку, поэтому два прогона в одном каталоге не пересекутся.
        cwd: workspace,
        env: {
          TEAM_AUTONOMY_DATA: dataDir,
          TEAM_AUTONOMY_ENDPOINT: endpointFile,
          TEAM_AUTONOMY_BUDGET: JSON.stringify(budget)
        },
        timeout_ms: budget.max_seconds * 1e3 + 12e4,
        requires_provider_keys: false
      };
      const merged = mergeAgentRecord(agentsFile, record);
      return {
        body: {
          ok: true,
          agent: record,
          runner,
          registered: merged.registered,
          reason: merged.reason,
          agents_file: agentsFile || null,
          budget
        }
      };
    });
    ctx.router.add("GET", "/", (request) => {
      remember(localRequestPort(request));
      return {
        raw: PAGE,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      };
    });
  }
};
function readEndpointPort(file) {
  try {
    const info = JSON.parse(readFileSync4(file, "utf8"));
    return Number.isSafeInteger(info.port) ? Number(info.port) : null;
  } catch {
    return null;
  }
}
var index_default = module;
export {
  index_default as default,
  runAutonomyCli
};
