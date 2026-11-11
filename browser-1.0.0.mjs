import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/kernel/errors.ts
var AppError = class extends Error {
  code;
  status;
  details;
  constructor(code, message, status, details = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
};
var ValidationError = class extends AppError {
  constructor(message, details = {}) {
    super("validation_failed", message, 400, details);
  }
};
var UpstreamError = class extends AppError {
  constructor(message, details = {}) {
    super("upstream_error", message, 502, details);
  }
};
var ConflictError = class extends AppError {
  constructor(message, details = {}) {
    super("conflict", message, 409, details);
  }
};

// src/app/browser-service.ts
import { createServer } from "node:net";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";

// src/adapters/browser/cdp.ts
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
function socketCtor() {
  const ctor = globalThis.WebSocket;
  if (!ctor) throw new AppError("browser_unavailable", "\u0412 \u044D\u0442\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 Node \u043D\u0435\u0442 WebSocket: \u043D\u0443\u0436\u0435\u043D Node 22+", 503);
  return ctor;
}
function messageText(event) {
  if (!event || typeof event !== "object") return "";
  const data = event.data;
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  return data === void 0 ? "" : String(data);
}
var CdpSession = class _CdpSession {
  #socket;
  #nextId = 0;
  #pending = /* @__PURE__ */ new Map();
  #closed = false;
  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener("message", (event) => this.#onMessage(event));
    socket.addEventListener("close", () => this.#onClose(new Error("CDP-\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u043E")));
    socket.addEventListener("error", () => this.#onClose(new Error("\u041E\u0448\u0438\u0431\u043A\u0430 CDP-\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F")));
  }
  static open(url, timeoutMs = 1e4) {
    const Ctor = socketCtor();
    return new Promise((resolve, reject) => {
      let session = null;
      let socket;
      try {
        socket = new Ctor(url);
      } catch (error) {
        reject(new AppError("browser_unavailable", `CDP \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u043B\u0441\u044F: ${String(error)}`, 503));
        return;
      }
      const timer = setTimeout(() => {
        try {
          socket.close();
        } catch {
        }
        reject(new AppError("browser_unavailable", "CDP \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u043B\u0441\u044F \u0437\u0430 \u043E\u0442\u0432\u0435\u0434\u0451\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F", 503));
      }, timeoutMs);
      const onOpen = () => {
        clearTimeout(timer);
        session = new _CdpSession(socket);
        resolve(session);
      };
      const onError = () => {
        clearTimeout(timer);
        if (!session) reject(new AppError("browser_unavailable", "CDP-\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E", 503));
      };
      socket.addEventListener("open", onOpen);
      socket.addEventListener("error", onError);
    });
  }
  #onMessage(event) {
    let message;
    try {
      message = JSON.parse(messageText(event));
    } catch {
      return;
    }
    if (typeof message.id !== "number") return;
    const pending = this.#pending.get(message.id);
    if (!pending) return;
    this.#pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(new AppError("browser_error", message.error.message || "CDP \u0432\u0435\u0440\u043D\u0443\u043B \u043E\u0448\u0438\u0431\u043A\u0443", 502));
      return;
    }
    pending.resolve(message.result);
  }
  #onClose(error) {
    if (this.#closed) return;
    this.#closed = true;
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }
  send(method, params = {}, timeoutMs = 2e4) {
    if (this.#closed) return Promise.reject(new AppError("browser_unavailable", "CDP-\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0443\u0436\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u043E", 503));
    const id = this.#nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new AppError("browser_timeout", `CDP ${method} \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${timeoutMs} \u043C\u0441`, 504));
      }, timeoutMs);
      this.#pending.set(id, {
        resolve: (value) => resolve(value),
        reject,
        timer
      });
      try {
        this.#socket.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timer);
        this.#pending.delete(id);
        reject(new AppError("browser_unavailable", `CDP ${method} \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D: ${String(error)}`, 503));
      }
    });
  }
  /** Выполняет выражение на странице и возвращает значение по значению. */
  async evaluate(expression, timeoutMs = 2e4) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true
    }, timeoutMs);
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435";
      throw new AppError("browser_error", detail, 502);
    }
    return result.result?.value;
  }
  close() {
    this.#onClose(new AppError("browser_disconnected", "CDP-\u0441\u0435\u0441\u0441\u0438\u044F \u0437\u0430\u043A\u0440\u044B\u0442\u0430", 503));
    try {
      this.#socket.close();
    } catch {
    }
  }
};
async function getJson(url, timeoutMs = 3e3) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new AppError("browser_unavailable", `CDP \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: ${String(error)}`, 503);
  }
  if (!response.ok) throw new AppError("browser_unavailable", `CDP \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ${response.status}`, 503);
  return await response.json();
}
function version(port, timeoutMs = 3e3) {
  return getJson(`http://127.0.0.1:${port}/json/version`, timeoutMs);
}
async function pages(port, timeoutMs = 4e3) {
  const list = await getJson(`http://127.0.0.1:${port}/json/list`, timeoutMs);
  return list.filter((target) => target.type === "page" && Boolean(target.webSocketDebuggerUrl));
}
async function alive(port) {
  if (!port) return false;
  try {
    await version(port, 2e3);
    return true;
  } catch {
    return false;
  }
}
function executable(env = process.env) {
  const candidates = [
    env.TEAM_BROWSER_EXECUTABLE,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter((value) => Boolean(value));
  for (const candidate of candidates) if (existsSync(candidate)) return candidate;
  return null;
}
function spawnBrowser(options) {
  mkdirSync(options.profileDir, { recursive: true });
  const args = [
    `--remote-debugging-port=${options.port}`,
    `--user-data-dir=${options.profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--no-service-autorun",
    "--disable-sync",
    "--disable-features=Translate,msEdgeWelcomePage",
    "--window-size=1280,900"
  ];
  if (options.headless) args.push("--headless=new", "--disable-gpu");
  args.push(options.startUrl ?? "about:blank");
  return spawn(options.executablePath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });
}
async function processId(port, fallback) {
  try {
    const info = await getJson(`http://127.0.0.1:${port}/json/version`, 2e3);
    return Number.isInteger(info.pid) && info.pid && info.pid > 0 ? info.pid : fallback;
  } catch {
    return fallback;
  }
}
function kill(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      return;
    }
    process.kill(pid, "SIGTERM");
    setTimeout(() => {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
      }
    }, 2e3).unref();
  } catch {
  }
}
function profileOf(dataDir) {
  return join(dataDir, "browser-profile");
}

// src/domain/browser/command.ts
var DEFAULT_TIMEOUT_MS = 15e3;
var MAX_TIMEOUT_MS = 6e4;
var DEFAULT_RETRY = 1;
var MAX_RETRY = 5;
var DEFAULT_RETRY_PAUSE_MS = 800;
var MAX_RETRY_PAUSE_MS = 1e4;
var MAX_SELECTOR = 500;
var MAX_URL = 2048;
var MAX_TEXT = 2e4;
var MAX_SCREENSHOT = 6 * 1024 * 1024;
var AGENT_RE = /^[A-Za-z0-9._:@-]{1,64}$/;
function agentName(value) {
  if (value === void 0 || value === null || value === "") return "default";
  if (typeof value !== "string") throw new ValidationError("\u041F\u043E\u043B\u0435 agent \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439");
  const agent = value.trim();
  if (!AGENT_RE.test(agent)) {
    throw new ValidationError("agent: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B \u0438 \u0441\u0438\u043C\u0432\u043E\u043B\u044B . _ : @ - (\u0434\u043E 64)");
  }
  return agent;
}
function selector(value, field = "selector") {
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  const text = value.trim();
  if (!text) throw new ValidationError(`\u041F\u043E\u043B\u0435 ${field} \u043F\u0443\u0441\u0442\u043E\u0435`);
  if (text.length > MAX_SELECTOR) throw new ValidationError(`\u041F\u043E\u043B\u0435 ${field} \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${MAX_SELECTOR} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  if (text.includes("\0")) throw new ValidationError(`\u041F\u043E\u043B\u0435 ${field} \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0441\u0438\u043C\u0432\u043E\u043B`);
  return text;
}
function browserUrl(value) {
  if (typeof value !== "string") throw new ValidationError("\u041F\u043E\u043B\u0435 url \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439");
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u043E\u043B\u043D\u044B\u0439 http(s) URL");
  if (url.length > MAX_URL) throw new ValidationError(`URL \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${MAX_URL} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) throw new Error("\u043F\u0443\u0441\u0442\u043E\u0439 \u0445\u043E\u0441\u0442");
  } catch {
    throw new ValidationError("URL \u043D\u0435 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F");
  }
  return url;
}
function expectation(value) {
  if (value === void 0 || value === null || value === "") return null;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    if (raw === "nav") return { kind: "nav" };
    const separator = raw.indexOf("=");
    if (separator < 1) {
      throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0451\u0442\u0441\u044F \u043A\u0430\u043A nav, url=\u2026, text=\u2026, gone=\u2026 \u0438\u043B\u0438 visible=\u2026");
    }
    const kind2 = raw.slice(0, separator).trim().toLowerCase();
    const rest = raw.slice(separator + 1).trim();
    if (!rest) throw new ValidationError(`\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 ${kind2} \u043F\u0443\u0441\u0442\u043E\u0435`);
    if (kind2 === "url") return { kind: "url", value: rest };
    if (kind2 === "text") return { kind: "text", value: rest };
    if (kind2 === "gone") return { kind: "gone", selector: selector(rest) };
    if (kind2 === "visible") return { kind: "visible", selector: selector(rest) };
    throw new ValidationError("\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0435 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F: nav, url, text, gone, visible");
  }
  if (typeof value !== "object") throw new ValidationError("\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439 \u0438\u043B\u0438 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C");
  const record = value;
  const kind = String(record.kind ?? "").toLowerCase();
  if (kind === "nav") return { kind: "nav" };
  if (kind === "url" || kind === "text") {
    const target = typeof record.value === "string" ? record.value.trim() : "";
    if (!target) throw new ValidationError(`\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 ${kind} \u043F\u0443\u0441\u0442\u043E\u0435`);
    return kind === "url" ? { kind: "url", value: target } : { kind: "text", value: target };
  }
  if (kind === "gone" || kind === "visible") {
    return { kind, selector: selector(record.selector) };
  }
  throw new ValidationError("\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0435 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F: nav, url, text, gone, visible");
}
function integer(value, fallback, min, max, field) {
  if (value === void 0 || value === null || value === "") return fallback;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ValidationError(`${field}: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return number;
}
function commandOptions(input) {
  const body = input && typeof input === "object" ? input : {};
  const expect = expectation(body.expect);
  return {
    timeoutMs: integer(body.timeout_ms, DEFAULT_TIMEOUT_MS, 200, MAX_TIMEOUT_MS, "timeout_ms"),
    // С названным ожиданием лишняя попытка вредит: действие могло сработать.
    retry: integer(body.retry, expect ? 0 : DEFAULT_RETRY, 0, MAX_RETRY, "retry"),
    retryPauseMs: integer(body.retry_pause_ms, DEFAULT_RETRY_PAUSE_MS, 0, MAX_RETRY_PAUSE_MS, "retry_pause_ms"),
    expect
  };
}
function describeExpectation(value) {
  switch (value.kind) {
    case "nav":
      return "\u043F\u0435\u0440\u0435\u0445\u043E\u0434 \u043D\u0430 \u0434\u0440\u0443\u0433\u0443\u044E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443";
    case "url":
      return `\u0430\u0434\u0440\u0435\u0441 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \xAB${value.value}\xBB`;
    case "text":
      return `\u0432\u0438\u0434\u0438\u043C\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \xAB${value.value}\xBB`;
    case "gone":
      return `\u044D\u043B\u0435\u043C\u0435\u043D\u0442 ${value.selector} \u0438\u0441\u0447\u0435\u0437`;
    case "visible":
      return `\u044D\u043B\u0435\u043C\u0435\u043D\u0442 ${value.selector} \u0432\u0438\u0434\u0435\u043D`;
  }
}

// src/app/browser-service.ts
var SESSION_FILE = "browser-session.json";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}
function rectScript(selector2) {
  return `(() => {
    const node = document.querySelector(${JSON.stringify(selector2)});
    if (!node) return null;
    node.scrollIntoView({ block: 'center', inline: 'center' });
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (!/auto|scroll/.test(style.overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
      const rect = node.getBoundingClientRect();
      const outer = parent.getBoundingClientRect();
      if (rect.top >= outer.top && rect.bottom <= outer.bottom) continue;
      parent.scrollTop += rect.top - outer.top - (parent.clientHeight - rect.height) / 2;
    }
    const box = node.getBoundingClientRect();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      width: box.width,
      height: box.height,
      inViewport: box.y + box.height / 2 >= 0 && box.y + box.height / 2 <= (window.innerHeight || 0),
      editable: node.isContentEditable || node.tagName === 'TEXTAREA'
        || (node.tagName === 'INPUT' && !['checkbox', 'radio', 'submit', 'button', 'file', 'range', 'color'].includes(String(node.type || '').toLowerCase())),
    };
  })()`;
}
function focusScript(selector2) {
  return `(() => {
    const node = document.querySelector(${JSON.stringify(selector2)});
    if (!node) return null;
    node.scrollIntoView({ block: 'center', inline: 'center' });
    if (typeof node.focus === 'function') node.focus();
    return {
      focused: document.activeElement === node || node.contains(document.activeElement),
      focusable: document.activeElement === node || node.contains(document.activeElement),
      tag: node.tagName,
      value: 'value' in node ? String(node.value ?? '') : String(node.textContent ?? ''),
    };
  })()`;
}
function textScript(selector2) {
  if (!selector2) return `document.body ? document.body.innerText : ''`;
  return `(() => {
    const node = document.querySelector(${JSON.stringify(selector2)});
    if (!node) return null;
    return node.innerText !== undefined ? node.innerText : (node.textContent || '');
  })()`;
}
var KEY_CODES = {
  Enter: { code: "Enter", keyCode: 13 },
  Tab: { code: "Tab", keyCode: 9 },
  Escape: { code: "Escape", keyCode: 27 },
  Backspace: { code: "Backspace", keyCode: 8 },
  Delete: { code: "Delete", keyCode: 46 },
  ArrowUp: { code: "ArrowUp", keyCode: 38 },
  ArrowDown: { code: "ArrowDown", keyCode: 40 },
  ArrowLeft: { code: "ArrowLeft", keyCode: 37 },
  ArrowRight: { code: "ArrowRight", keyCode: 39 },
  PageUp: { code: "PageUp", keyCode: 33 },
  PageDown: { code: "PageDown", keyCode: 34 }
};
var EDITING_KEYS = /* @__PURE__ */ new Set(["Backspace", "Delete", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown"]);
var BrowserService = class {
  #dataDir;
  #log;
  #store;
  #now;
  #headless;
  #executablePath;
  #launchTimeoutMs;
  #profileDir;
  #secrets = null;
  #runtime = null;
  #queue = Promise.resolve();
  constructor(options) {
    this.#dataDir = options.dataDir;
    this.#log = options.log.child({ module: "browser" });
    this.#store = options.store;
    this.#now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.#headless = options.headless ?? false;
    this.#executablePath = options.executablePath ?? executable(options.executableEnv ?? process.env);
    this.#launchTimeoutMs = options.launchTimeoutMs ?? 25e3;
    this.#profileDir = options.profileDir ?? profileOf(this.#dataDir);
  }
  useSecrets(secrets) {
    this.#secrets = secrets;
  }
  get profile() {
    return this.#profileDir;
  }
  get configured() {
    return this.#executablePath !== null;
  }
  /** Последовательные команды не переплетаются между собой. */
  #run(work) {
    const next = this.#queue.then(work, work);
    this.#queue = next.then(() => void 0, () => void 0);
    return next;
  }
  #statePath() {
    return join2(this.#dataDir, SESSION_FILE);
  }
  #auditPath() {
    return join2(this.#dataDir, "browser-audit.log");
  }
  #loadRuntime() {
    if (this.#runtime) return this.#runtime;
    try {
      const saved = JSON.parse(readFileSync(this.#statePath(), "utf8"));
      const port = Number(saved.port);
      const pid = Number(saved.pid);
      if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
      this.#runtime = {
        port,
        pid: Number.isInteger(pid) && pid > 0 ? pid : 0,
        visible: saved.visible === true,
        started_at: typeof saved.started_at === "string" ? saved.started_at : this.#now().toISOString()
      };
      return this.#runtime;
    } catch {
      return null;
    }
  }
  #saveRuntime(runtime) {
    this.#runtime = runtime;
    try {
      if (!runtime) {
        rmSync(this.#statePath(), { force: true });
        return;
      }
      writeFileSync(this.#statePath(), JSON.stringify(runtime, null, 2), "utf8");
    } catch (error) {
      this.#log.warn("\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E", { error: String(error) });
    }
  }
  #remember(action, agent, ok, note) {
    const redacted = this.#secrets ? this.#secrets.redact(note) : note;
    try {
      this.#store.audit({ at: this.#now().toISOString(), agent, action, ok, note: redacted.slice(0, 500) });
    } catch (error) {
      this.#log.warn("\u0416\u0443\u0440\u043D\u0430\u043B \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D", { error: String(error) });
    }
    try {
      writeFileSync(this.#auditPath(), JSON.stringify({
        at: this.#now().toISOString(),
        agent,
        action,
        ok,
        note: redacted.slice(0, 500)
      }) + "\n", { encoding: "utf8", flag: "a" });
    } catch {
    }
  }
  audit(limit = 50) {
    return this.#store.listAudit(limit);
  }
  async #ensure() {
    const existing = this.#loadRuntime();
    if (existing && await alive(existing.port)) return existing;
    if (!this.#executablePath) {
      throw new AppError(
        "browser_unavailable",
        "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D Edge \u0438\u043B\u0438 Chrome. \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u0432 TEAM_BROWSER_EXECUTABLE.",
        503
      );
    }
    const port = await freePort();
    const startedAt = this.#now().toISOString();
    const child = spawnBrowser({
      executablePath: this.#executablePath,
      profileDir: this.profile,
      port,
      headless: this.#headless
    });
    const fallbackPid = child.pid ?? 0;
    child.unref();
    const deadline = Date.now() + this.#launchTimeoutMs;
    while (Date.now() < deadline) {
      if (await alive(port)) {
        const pid = await processId(port, fallbackPid);
        const runtime = { port, pid, visible: !this.#headless, started_at: startedAt };
        this.#saveRuntime(runtime);
        this.#log.info("\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0437\u0430\u043F\u0443\u0449\u0435\u043D", { port, pid, profile: this.profile, headless: this.#headless });
        return runtime;
      }
      await sleep(250);
    }
    kill(fallbackPid);
    this.#saveRuntime(null);
    throw new AppError(
      "browser_unavailable",
      `\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u043B CDP \u043D\u0430 \u043F\u043E\u0440\u0442\u0443 ${port}`,
      503
    );
  }
  async status() {
    const runtime = this.#loadRuntime();
    const running = runtime ? await alive(runtime.port) : false;
    if (!running && runtime) {
      this.#saveRuntime(null);
    }
    const live = running && runtime ? await pages(runtime.port).catch(() => []) : [];
    if (live.length) {
      try {
        this.#store.prune(live.map((target) => target.id));
      } catch (error) {
        this.#log.warn("\u0423\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0435 \u0430\u0440\u0435\u043D\u0434\u044B \u0432\u043A\u043B\u0430\u0434\u043E\u043A \u043D\u0435 \u043E\u0447\u0438\u0449\u0435\u043D\u044B", { error: String(error) });
      }
    }
    return {
      running,
      port: running && runtime ? runtime.port : null,
      pid: running && runtime ? runtime.pid : null,
      profile: this.profile,
      executable: this.#executablePath,
      headless: this.#headless,
      visible: running && runtime ? runtime.visible : false,
      tabs: this.#describe(live),
      leases: this.#store.listLeases(),
      error: running || !this.#executablePath ? null : "Edge \u0438\u043B\u0438 Chrome \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D"
    };
  }
  #describe(targets) {
    const leases = this.#store.listLeases();
    return targets.map((target) => {
      const owners = leases.filter((lease) => lease.target_id === target.id).map((lease) => lease.name);
      return {
        id: target.id,
        url: target.url,
        title: target.title,
        owners,
        owner: owners[0] ?? null,
        leased: owners.length > 0
      };
    });
  }
  async #listPages(port) {
    return pages(port);
  }
  async #createTab(port) {
    const info = await version(port);
    const browser = await CdpSession.open(info.webSocketDebuggerUrl);
    try {
      const created = await browser.send("Target.createTarget", { url: "about:blank" });
      const list = await this.#listPages(port);
      const target = list.find((entry) => entry.id === created.targetId);
      if (!target) throw new AppError("browser_unavailable", "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u0441\u043E\u0437\u0434\u0430\u043B \u0432\u043A\u043B\u0430\u0434\u043A\u0443, \u043D\u043E \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043B \u0435\u0451 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435", 503);
      return target;
    } finally {
      browser.close();
    }
  }
  async #page(agent) {
    const runtime = await this.#ensure();
    const targets = await this.#listPages(runtime.port);
    const leases = this.#store.listLeases();
    const known = new Set(targets.map((target2) => target2.id));
    if (leases.some((lease2) => !known.has(lease2.target_id))) this.#store.prune(targets.map((target2) => target2.id));
    const lease = this.#store.readLease(agent);
    if (lease) {
      const target2 = targets.find((entry) => entry.id === lease.target_id);
      if (target2) {
        return { target: target2, lease: this.#touch(agent, lease, target2) };
      }
    }
    const ordinary = targets.filter((entry) => /^https?:/i.test(entry.url));
    const fallback = agent === "default" ? ordinary[0] ?? targets[0] : void 0;
    const target = fallback ?? await this.#createTab(runtime.port);
    return { target, lease: this.#touch(agent, lease, target, Boolean(fallback)) };
  }
  #touch(name, lease, target, keepLease = false) {
    const at = this.#now().toISOString();
    const next = {
      name,
      target_id: target.id,
      url: target.url,
      title: target.title,
      leased_at: keepLease && lease ? lease.leased_at : lease?.target_id === target.id ? lease.leased_at : at,
      used_at: at
    };
    this.#store.saveLease(next);
    return next;
  }
  async #withPage(agentInput, action, work) {
    const agent = agentName(agentInput);
    return this.#run(async () => {
      const context = await this.#page(agent);
      const cdp = await CdpSession.open(context.target.webSocketDebuggerUrl);
      try {
        const result = await work(cdp, context);
        const fresh = (await this.#listPages(this.#runtime?.port ?? 0).catch(() => [])).find((entry) => entry.id === context.target.id) ?? context.target;
        this.#touch(agent, { ...context.lease, name: agent }, fresh, true);
        this.#remember(action, agent, true, `${action} ${fresh.url}`.slice(0, 500));
        return {
          result,
          tab: {
            id: fresh.id,
            url: fresh.url,
            title: fresh.title,
            owners: [agent],
            owner: agent,
            leased: true
          }
        };
      } catch (error) {
        this.#remember(action, agent, false, error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        cdp.close();
      }
    });
  }
  async #navigate(cdp, url, timeoutMs) {
    await cdp.send("Page.enable");
    const nav = await cdp.send("Page.navigate", { url });
    if (nav.errorText) throw new AppError("browser_error", `\u041F\u0435\u0440\u0435\u0445\u043E\u0434 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F: ${nav.errorText}`, 502);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const ready = await cdp.evaluate("document.readyState").catch(() => "loading");
      if (ready === "complete") return;
      await sleep(200);
    }
    throw new AppError("browser_timeout", `\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C \u0437\u0430 ${timeoutMs} \u043C\u0441`, 504);
  }
  async #waitExpectation(cdp, expect, beforeUrl, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    for (; ; ) {
      const met = await cdp.evaluate(`(() => {
        const exp = ${JSON.stringify(expect)};
        if (exp.kind === 'nav') return location.href !== ${JSON.stringify(beforeUrl)};
        if (exp.kind === 'url') return location.href.includes(exp.value);
        if (exp.kind === 'text') return (document.body ? document.body.innerText : '').includes(exp.value);
        const node = document.querySelector(exp.selector);
        if (exp.kind === 'gone') return !node;
        if (!node) return false;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })()`).catch(() => false);
      if (met) return true;
      if (Date.now() >= deadline) return false;
      await sleep(200);
    }
  }
  #effectDeadline(options) {
    return Math.min(options.timeoutMs, 5e3);
  }
  async #attempts(options, work) {
    const total = options.retry + 1;
    let last = { ok: false, effect: null };
    for (let attempt = 1; attempt <= total; attempt += 1) {
      last = await work(attempt);
      if (last.ok) return { ...last, attempts: attempt };
      if (attempt < total) await sleep(options.retryPauseMs);
    }
    return { ...last, attempts: total };
  }
  async open(agent, url, options) {
    const { tab } = await this.#withPage(agent, "open", async (cdp) => {
      const before = await cdp.evaluate("location.href").catch(() => "");
      await this.#navigate(cdp, url, options.timeoutMs);
      if (options.expect) {
        const met = await this.#waitExpectation(cdp, options.expect, before, options.timeoutMs);
        if (!met) {
          throw new ConflictError(`\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: ${describeExpectation(options.expect)}`);
        }
      }
      return true;
    });
    return {
      action: "open",
      tab_id: tab.id,
      url: tab.url || url,
      title: tab.title,
      verified: true,
      attempts: 1,
      effect: "\u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430",
      expected: options.expect ? describeExpectation(options.expect) : null
    };
  }
  async text(agent, selectorInput) {
    const { result, tab } = await this.#withPage(agent, "text", async (cdp) => {
      const value = await cdp.evaluate(textScript(selectorInput));
      if (value === null) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${selectorInput}`);
      return this.#secrets ? this.#secrets.redact(value) : value;
    });
    return { text: result.slice(0, MAX_TEXT), tab_id: tab.id, url: tab.url };
  }
  async click(agent, selector2, options) {
    const { result, tab } = await this.#withPage(agent, "click", async (cdp) => {
      const before = await cdp.evaluate(
        `({ url: location.href, text: (document.body ? document.body.innerText : '').slice(0, 4000) })`
      );
      const outcome = await this.#attempts(options, async () => {
        const box = await cdp.evaluate(rectScript(selector2));
        if (!box) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${selector2}`);
        if (!box.inViewport) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0432\u043D\u0435 \u043E\u043A\u043D\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430: ${selector2}`);
        if (box.width > 0 && box.height > 0) {
          await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, button: "none" });
          await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
          await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
        } else {
          await cdp.evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector2)}); if (node && typeof node.click === 'function') node.click(); })()`);
        }
        if (options.expect) {
          const met = await this.#waitExpectation(cdp, options.expect, before.url, options.timeoutMs);
          return {
            ok: met,
            effect: met ? `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435: ${describeExpectation(options.expect)}` : null,
            ...met ? {} : { reason: `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: ${describeExpectation(options.expect)}` }
          };
        }
        const deadline = Date.now() + this.#effectDeadline(options);
        while (Date.now() < deadline) {
          const after = await cdp.evaluate(`(() => {
            const node = document.querySelector(${JSON.stringify(selector2)});
            return {
              url: location.href,
              text: (document.body ? document.body.innerText : '').slice(0, 4000),
              focused: !!node && (document.activeElement === node || node.contains(document.activeElement)),
            };
          })()`).catch(() => null);
          if (after && after.url !== before.url) return { ok: true, effect: "\u043F\u0435\u0440\u0435\u0445\u043E\u0434 \u043F\u043E \u0430\u0434\u0440\u0435\u0441\u0443" };
          if (after && after.text !== before.text) return { ok: true, effect: "\u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C" };
          if (after && after.focused) return { ok: true, effect: "\u0444\u043E\u043A\u0443\u0441 \u043D\u0430 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0435" };
          await sleep(200);
        }
        return { ok: false, effect: null, reason: "\u044D\u0444\u0444\u0435\u043A\u0442 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D" };
      });
      return outcome;
    });
    return {
      action: "click",
      tab_id: tab.id,
      url: tab.url,
      title: tab.title,
      verified: result.ok,
      attempts: result.attempts,
      effect: result.effect,
      expected: options.expect ? describeExpectation(options.expect) : null,
      ...result.ok ? {} : { reason: result.reason ?? "\u044D\u0444\u0444\u0435\u043A\u0442 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D" }
    };
  }
  async fill(agent, selector2, value, options, secretRef) {
    const { result, tab } = await this.#withPage(agent, "fill", async (cdp) => {
      const before = await cdp.evaluate("location.href");
      const outcome = await this.#attempts(options, async () => {
        const applied = await cdp.evaluate(`(() => {
          const node = document.querySelector(${JSON.stringify(selector2)});
          if (!node) return null;
          node.scrollIntoView({ block: 'center' });
          if (typeof node.focus === 'function') node.focus();
          node.value = ${JSON.stringify(value)};
          node.dispatchEvent(new Event('input', { bubbles: true }));
          node.dispatchEvent(new Event('change', { bubbles: true }));
          return String(node.value);
        })()`);
        if (applied === null) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${selector2}`);
        const reached = applied === value;
        if (!reached) return { ok: false, effect: null, reason: "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u0434\u043E\u0448\u043B\u043E \u0434\u043E \u043F\u043E\u043B\u044F" };
        if (options.expect) {
          const met = await this.#waitExpectation(cdp, options.expect, before, options.timeoutMs);
          return {
            ok: met,
            effect: met ? `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435: ${describeExpectation(options.expect)}` : null,
            ...met ? {} : { reason: `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: ${describeExpectation(options.expect)}` }
          };
        }
        return { ok: true, effect: "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u043E\u043B\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E" };
      });
      return outcome;
    });
    return {
      action: "fill",
      tab_id: tab.id,
      url: tab.url,
      title: tab.title,
      verified: result.ok,
      attempts: result.attempts,
      effect: result.effect,
      expected: options.expect ? describeExpectation(options.expect) : null,
      filled: secretRef ? "[secret]" : "text",
      ...result.ok ? {} : { reason: result.reason ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E" }
    };
  }
  async insert(agent, text, into, options) {
    const { result, tab } = await this.#withPage(agent, "insert", async (cdp) => {
      const before = await cdp.evaluate("location.href");
      const outcome = await this.#attempts(options, async () => {
        if (into) {
          const focus = await cdp.evaluate(focusScript(into));
          if (!focus) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${into}`);
          if (!focus.focused) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0444\u043E\u043A\u0443\u0441: ${into}`);
        }
        await cdp.send("Input.insertText", { text });
        const after = into ? await cdp.evaluate(`(() => {
              const node = document.querySelector(${JSON.stringify(into)});
              if (!node) return null;
              return { value: 'value' in node ? String(node.value ?? '') : String(node.textContent ?? '') };
            })()`) : null;
        if (after && !after.value.includes(text)) {
          return { ok: false, effect: null, reason: "\u0441\u0438\u043C\u0432\u043E\u043B\u044B \u043D\u0435 \u0434\u043E\u0448\u043B\u0438 \u0434\u043E \u043F\u043E\u043B\u044F" };
        }
        if (options.expect) {
          const met = await this.#waitExpectation(cdp, options.expect, before, options.timeoutMs);
          return {
            ok: met,
            effect: met ? `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435: ${describeExpectation(options.expect)}` : null,
            ...met ? {} : { reason: `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: ${describeExpectation(options.expect)}` }
          };
        }
        return { ok: true, effect: after ? "\u0441\u0438\u043C\u0432\u043E\u043B\u044B \u0434\u043E\u0448\u043B\u0438 \u0434\u043E \u043F\u043E\u043B\u044F" : "\u0442\u0435\u043A\u0441\u0442 \u0432\u0441\u0442\u0430\u0432\u043B\u0435\u043D" };
      });
      return outcome;
    });
    return {
      action: "insert",
      tab_id: tab.id,
      url: tab.url,
      title: tab.title,
      verified: result.ok,
      attempts: result.attempts,
      effect: result.effect,
      expected: options.expect ? describeExpectation(options.expect) : null,
      ...result.ok ? {} : { reason: result.reason ?? "\u0432\u0432\u043E\u0434 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D" }
    };
  }
  async press(agent, key, count, into, options) {
    const spec = KEY_CODES[key];
    if (!spec) throw new ValidationError(`\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u043A\u043B\u0430\u0432\u0438\u0448\u0438: ${Object.keys(KEY_CODES).join(", ")}`);
    const { result, tab } = await this.#withPage(agent, "press", async (cdp) => {
      const before = await cdp.evaluate("location.href");
      const outcome = await this.#attempts(options, async () => {
        if (into) {
          const focus = await cdp.evaluate(focusScript(into));
          if (!focus) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${into}`);
          if (!focus.focused) throw new ConflictError(`\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0444\u043E\u043A\u0443\u0441: ${into}`);
        }
        for (let index = 0; index < count; index += 1) {
          const text = key === "Enter" ? { text: "\r", unmodifiedText: "\r" } : {};
          await cdp.send("Input.dispatchKeyEvent", {
            type: EDITING_KEYS.has(key) ? "rawKeyDown" : "keyDown",
            windowsVirtualKeyCode: spec.keyCode,
            nativeVirtualKeyCode: spec.keyCode,
            code: spec.code,
            key,
            ...text
          });
          await cdp.send("Input.dispatchKeyEvent", {
            type: "keyUp",
            windowsVirtualKeyCode: spec.keyCode,
            nativeVirtualKeyCode: spec.keyCode,
            code: spec.code,
            key
          });
        }
        if (options.expect) {
          const met = await this.#waitExpectation(cdp, options.expect, before, options.timeoutMs);
          return {
            ok: met,
            effect: met ? `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435: ${describeExpectation(options.expect)}` : null,
            ...met ? {} : { reason: `\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: ${describeExpectation(options.expect)}` }
          };
        }
        if (key === "Enter") {
          const deadline = Date.now() + this.#effectDeadline(options);
          while (Date.now() < deadline) {
            const url = await cdp.evaluate("location.href").catch(() => before);
            if (url !== before) return { ok: true, effect: "\u043F\u0435\u0440\u0435\u0445\u043E\u0434 \u043F\u043E Enter" };
            await sleep(200);
          }
          return { ok: true, effect: "\u043A\u043B\u0430\u0432\u0438\u0448\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430" };
        }
        return { ok: true, effect: "\u043A\u043B\u0430\u0432\u0438\u0448\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430" };
      });
      return outcome;
    });
    return {
      action: "press",
      tab_id: tab.id,
      url: tab.url,
      title: tab.title,
      verified: result.ok,
      attempts: result.attempts,
      effect: result.effect,
      expected: options.expect ? describeExpectation(options.expect) : null,
      ...result.ok ? {} : { reason: result.reason ?? "\u043A\u043B\u0430\u0432\u0438\u0448\u0430 \u043D\u0435 \u0434\u0430\u043B\u0430 \u044D\u0444\u0444\u0435\u043A\u0442\u0430" }
    };
  }
  async wait(agent, selector2, timeoutMs) {
    const { result, tab } = await this.#withPage(agent, "wait", async (cdp) => {
      const deadline = Date.now() + timeoutMs;
      for (; ; ) {
        const visible = await cdp.evaluate(`(() => {
          const node = document.querySelector(${JSON.stringify(selector2)});
          if (!node) return false;
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        })()`).catch(() => false);
        if (visible) return true;
        if (Date.now() >= deadline) return false;
        await sleep(200);
      }
    });
    return {
      action: "wait",
      tab_id: tab.id,
      url: tab.url,
      title: tab.title,
      verified: result,
      attempts: 1,
      effect: result ? "\u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0432\u0438\u0434\u0435\u043D" : null,
      expected: `\u044D\u043B\u0435\u043C\u0435\u043D\u0442 ${selector2} \u0432\u0438\u0434\u0435\u043D`,
      ...result ? {} : { reason: `\u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0435 \u043F\u043E\u044F\u0432\u0438\u043B\u0441\u044F \u0437\u0430 ${timeoutMs} \u043C\u0441` }
    };
  }
  async newTab(agent) {
    const agentNameValue = agentName(agent);
    return this.#run(async () => {
      const runtime = await this.#ensure();
      const target = await this.#createTab(runtime.port);
      await this.#window(target.id, true);
      const at = this.#now().toISOString();
      this.#store.saveLease({
        name: agentNameValue,
        target_id: target.id,
        url: target.url,
        title: target.title,
        leased_at: at,
        used_at: at
      });
      this.#remember("new", agentNameValue, true, target.id);
      return {
        action: "new",
        tab_id: target.id,
        url: target.url || "about:blank",
        title: target.title,
        verified: true,
        attempts: 1,
        effect: "\u043D\u043E\u0432\u0430\u044F \u0432\u043A\u043B\u0430\u0434\u043A\u0430",
        expected: null
      };
    });
  }
  async tabs() {
    const status = await this.status();
    return { running: status.running, tabs: status.tabs };
  }
  async screenshot(agent) {
    const { result, tab } = await this.#withPage(agent, "screenshot", async (cdp) => {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      if (!shot.data) throw new AppError("browser_error", "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u043D\u0438\u043C\u043E\u043A", 502);
      return shot.data;
    });
    return {
      data: result,
      bytes: Math.floor(result.length * 3 / 4),
      tab_id: tab.id,
      url: tab.url
    };
  }
  async #window(targetId, visible) {
    const runtime = this.#runtime;
    if (!runtime) return;
    const info = await version(runtime.port);
    const browser = await CdpSession.open(info.webSocketDebuggerUrl);
    try {
      const window = await browser.send("Browser.getWindowForTarget", { targetId });
      await browser.send("Browser.setWindowBounds", {
        windowId: window.windowId,
        bounds: visible ? { left: 80, top: 60, width: 1280, height: 900, windowState: "normal" } : { left: -32e3, top: -32e3, windowState: "normal" }
      });
    } finally {
      browser.close();
    }
  }
  async show(agent) {
    const { result, tab } = await this.#withPage(agent, "show", async (_cdp, context) => {
      await this.#window(context.target.id, true);
      return true;
    });
    if (result && this.#runtime) this.#saveRuntime({ ...this.#runtime, visible: true });
    return {
      action: "show",
      tab_id: tab.id,
      url: tab.url,
      title: tab.title,
      verified: result,
      attempts: 1,
      effect: "\u043E\u043A\u043D\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E",
      expected: null
    };
  }
  async hide(agent) {
    const { result, tab } = await this.#withPage(agent, "hide", async (_cdp, context) => {
      await this.#window(context.target.id, false);
      return true;
    });
    if (result && this.#runtime) this.#saveRuntime({ ...this.#runtime, visible: false });
    return {
      action: "hide",
      tab_id: tab.id,
      url: tab.url,
      title: tab.title,
      verified: result,
      attempts: 1,
      effect: "\u043E\u043A\u043D\u043E \u0443\u0431\u0440\u0430\u043D\u043E \u0437\u0430 \u043A\u0440\u0430\u0439 \u044D\u043A\u0440\u0430\u043D\u0430",
      expected: null
    };
  }
  async stop() {
    return this.#run(async () => {
      const runtime = this.#loadRuntime();
      let stopped = false;
      if (runtime && await alive(runtime.port)) {
        try {
          const info = await version(runtime.port);
          const browser = await CdpSession.open(info.webSocketDebuggerUrl);
          try {
            await browser.send("Browser.close");
            stopped = true;
          } finally {
            browser.close();
          }
        } catch {
        }
        if (!stopped && runtime.pid) {
          kill(runtime.pid);
          stopped = true;
        }
      }
      this.#store.clearLeases();
      this.#saveRuntime(null);
      if (stopped) this.#log.info("\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
      return { running: false, stopped };
    });
  }
  /** Закрывает браузер, который запустило приложение, при выходе. */
  async shutdown() {
    const runtime = this.#loadRuntime();
    if (!runtime) return;
    if (await alive(runtime.port)) {
      try {
        const info = await version(runtime.port);
        const browser = await CdpSession.open(info.webSocketDebuggerUrl, 3e3);
        try {
          await browser.send("Browser.close", {}, 3e3);
        } finally {
          browser.close();
        }
      } catch {
        if (runtime.pid) kill(runtime.pid);
      }
    }
    this.#store.clearLeases();
    this.#saveRuntime(null);
  }
};

// src/adapters/storage/sqlite-browser.ts
var LEASE_COLUMNS = "name, target_id, url, title, leased_at, used_at";
var AUDIT_KEEP = 500;
function leaseOf(row) {
  return {
    name: row.name,
    target_id: row.target_id,
    url: row.url,
    title: row.title,
    leased_at: row.leased_at,
    used_at: row.used_at
  };
}
var SqliteBrowserStore = class {
  #db;
  constructor(db) {
    this.#db = db;
  }
  readLease(name) {
    const row = this.#db.raw.prepare(`SELECT ${LEASE_COLUMNS} FROM browser_tabs WHERE name = ?`).get(name);
    return row ? leaseOf(row) : null;
  }
  listLeases() {
    const rows = this.#db.raw.prepare(`SELECT ${LEASE_COLUMNS} FROM browser_tabs ORDER BY name`).all();
    return rows.map(leaseOf);
  }
  saveLease(lease) {
    this.#db.raw.prepare(`INSERT INTO browser_tabs (name, target_id, url, title, leased_at, used_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (name) DO UPDATE SET
          target_id = excluded.target_id,
          url = excluded.url,
          title = excluded.title,
          used_at = excluded.used_at`).run(lease.name, lease.target_id, lease.url, lease.title, lease.leased_at, lease.used_at);
  }
  prune(knownIds) {
    const known = new Set(knownIds);
    let removed = 0;
    for (const lease of this.listLeases()) {
      if (known.has(lease.target_id)) continue;
      this.#db.raw.prepare("DELETE FROM browser_tabs WHERE name = ?").run(lease.name);
      removed += 1;
    }
    return removed;
  }
  clearLeases() {
    this.#db.raw.prepare("DELETE FROM browser_tabs").run();
  }
  audit(entry) {
    this.#db.raw.prepare(`INSERT INTO browser_audit (at, agent, action, ok, note) VALUES (?, ?, ?, ?, ?)`).run(entry.at, entry.agent, entry.action, entry.ok ? 1 : 0, entry.note);
    this.#db.raw.prepare(`DELETE FROM browser_audit WHERE id <= (
        SELECT MAX(id) FROM browser_audit
      ) - ?`).run(AUDIT_KEEP);
  }
  listAudit(limit) {
    const rows = this.#db.raw.prepare(`SELECT id, at, agent, action, ok, note FROM browser_audit ORDER BY id DESC LIMIT ?`).all(Math.min(Math.max(limit, 1), 200));
    return rows.map((row) => ({
      id: row.id,
      at: row.at,
      agent: row.agent,
      action: row.action,
      ok: row.ok === 1,
      note: row.note
    }));
  }
};

// src/modules/browser/schema.ts
var browserMigrations = [
  {
    version: "browser/0001_tabs_audit",
    sql: `
      CREATE TABLE browser_tabs (
        name TEXT PRIMARY KEY,
        target_id TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        leased_at TEXT NOT NULL,
        used_at TEXT NOT NULL
      );
      CREATE TABLE browser_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at TEXT NOT NULL,
        agent TEXT NOT NULL,
        action TEXT NOT NULL,
        ok INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX browser_audit_at ON browser_audit (id DESC);
    `
  }
];

// src/modules/browser/browser.module.ts
function stringField(body, name, required = true) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (value === void 0 || value === null) {
    if (required) throw new ValidationError(`\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 ${name}`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  return value;
}
function integer2(value, fallback, min, max, field) {
  if (value === void 0 || value === null || value === "") return fallback;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ValidationError(`${field}: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return number;
}
function bodyOf(body) {
  if (body === void 0 || body === null) return {};
  if (typeof body !== "object" || Array.isArray(body)) throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C");
  return body;
}
function registerBrowserRoutes(router, deps) {
  const { browser, secret } = deps;
  router.add("GET", "/api/browser", async (c) => {
    const status = await browser.status();
    return {
      body: {
        ok: true,
        ...status,
        configured: browser.configured,
        audit: browser.audit(integer2(c.query.get("audit"), 20, 1, 200, "audit"))
      }
    };
  });
  router.add("GET", "/api/browser/tabs", async () => ({
    body: { ok: true, ...await browser.tabs() }
  }));
  router.add("GET", "/api/browser/screenshot", async (c) => {
    const shot = await browser.screenshot(c.query.get("agent") ?? void 0);
    return { body: { ok: true, ...shot } };
  });
  router.add("POST", "/api/browser/open", async (c) => {
    const body = bodyOf(c.body);
    return {
      body: {
        ok: true,
        ...await browser.open(body.agent, browserUrl(body.url), commandOptions(body))
      }
    };
  });
  router.add("POST", "/api/browser/text", async (c) => {
    const body = bodyOf(c.body);
    const target = body.selector === void 0 || body.selector === null || body.selector === "" ? null : selector(body.selector);
    return { body: { ok: true, ...await browser.text(body.agent, target) } };
  });
  router.add("POST", "/api/browser/click", async (c) => {
    const body = bodyOf(c.body);
    return {
      body: {
        ok: true,
        ...await browser.click(body.agent, selector(body.selector), commandOptions(body))
      }
    };
  });
  router.add("POST", "/api/browser/fill", async (c) => {
    const body = bodyOf(c.body);
    const target = selector(body.selector);
    const secretRef = body.secret === void 0 || body.secret === null || body.secret === "" ? "" : stringField(body, "secret").trim();
    let value;
    if (secretRef) {
      value = secret(secretRef);
      if (!value) throw new ValidationError(`\u0421\u0435\u043A\u0440\u0435\u0442 ${secretRef} \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D`);
    } else {
      value = stringField(body, "value");
    }
    return {
      body: {
        ok: true,
        ...await browser.fill(body.agent, target, value, commandOptions(body), secretRef || void 0)
      }
    };
  });
  router.add("POST", "/api/browser/insert", async (c) => {
    const body = bodyOf(c.body);
    const text = stringField(body, "text");
    if (!text) throw new ValidationError("\u041F\u043E\u043B\u0435 text \u043F\u0443\u0441\u0442\u043E\u0435");
    if (text.length > 2e3) throw new ValidationError("\u041F\u043E\u043B\u0435 text \u0434\u043B\u0438\u043D\u043D\u0435\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const into = body.into === void 0 || body.into === null || body.into === "" ? null : selector(body.into, "into");
    return {
      body: {
        ok: true,
        ...await browser.insert(body.agent, text, into, commandOptions(body))
      }
    };
  });
  router.add("POST", "/api/browser/press", async (c) => {
    const body = bodyOf(c.body);
    const into = body.into === void 0 || body.into === null || body.into === "" ? null : selector(body.into, "into");
    return {
      body: {
        ok: true,
        ...await browser.press(
          body.agent,
          stringField(body, "key"),
          integer2(body.count, 1, 1, 20, "count"),
          into,
          commandOptions(body)
        )
      }
    };
  });
  router.add("POST", "/api/browser/wait", async (c) => {
    const body = bodyOf(c.body);
    return {
      body: {
        ok: true,
        ...await browser.wait(
          body.agent,
          selector(body.selector),
          integer2(body.timeout_ms, 15e3, 200, 6e4, "timeout_ms")
        )
      }
    };
  });
  router.add("POST", "/api/browser/new", async (c) => {
    const body = bodyOf(c.body);
    return { body: { ok: true, ...await browser.newTab(agentName(body.agent)) } };
  });
  router.add("POST", "/api/browser/show", async (c) => {
    const body = bodyOf(c.body);
    return { body: { ok: true, ...await browser.show(body.agent) } };
  });
  router.add("POST", "/api/browser/hide", async (c) => {
    const body = bodyOf(c.body);
    return { body: { ok: true, ...await browser.hide(body.agent) } };
  });
  router.add("POST", "/api/browser/stop", async () => ({
    body: { ok: true, ...await browser.stop() }
  }));
}

// modules/browser/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { display: grid; gap: 20px; padding: 24px; max-width: 960px; }
  section { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .state { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: #222a36; }
  .state-ready { background: #1d3a2a; color: #8be0ab; }
  .state-setup { background: #3a3320; color: #e8ce8b; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; }
  .type { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: #cbd4e1; }
  .meta { color: #7f8a9c; font-size: 12px; }
  .empty { color: #7f8a9c; }
</style>
</head>
<body>
<header>
  <h1>\u0411\u0440\u0430\u0443\u0437\u0435\u0440</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <section>
    <h2>\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435</h2>
    <div class="row" id="status"><span class="meta">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</span></div>
    <p class="meta">\u0417\u0430\u0434\u0430\u0439\u0442\u0435 TEAM_BROWSER_EXECUTABLE, \u0435\u0441\u043B\u0438 Chromium \u043D\u0435 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.</p>
  </section>
  <section>
    <h2>\u0416\u0443\u0440\u043D\u0430\u043B \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439</h2>
    <ul id="audit"><li class="empty">\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E</li></ul>
  </section>
</main>
<script>
(function () {
  var status = document.getElementById('status');
  var audit = document.getElementById('audit');
  var configured = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function load() {
    fetch('/api/browser?audit=50').then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error((body.error && body.error.message) || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430');
        return body;
      });
    }).then(function (body) {
      configured = body.configured === true;
      status.textContent = '';
      status.appendChild(el('span', configured ? 'state state-ready' : 'state state-setup',
        configured ? '\u0433\u043E\u0442\u043E\u0432' : '\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D'));
      status.appendChild(el('span', 'meta',
        '\u0432\u043A\u043B\u0430\u0434\u043E\u043A: ' + ((body.tabs && body.tabs.length) || 0) + (body.executable ? ' \xB7 ' + body.executable : '')));

      audit.textContent = '';
      var items = body.audit || [];
      if (!items.length) {
        audit.appendChild(el('li', 'empty', '\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E'));
        return;
      }
      items.forEach(function (entry) {
        var row = el('li');
        var head = el('div', 'row');
        head.appendChild(el('span', 'type', entry.action));
        head.appendChild(el('span', 'meta', entry.ok ? '\u0443\u0441\u043F\u0435\u0445' : '\u043E\u0448\u0438\u0431\u043A\u0430'));
        row.appendChild(head);
        row.appendChild(el('div', 'meta', entry.agent + ' \xB7 ' + entry.at + (entry.note ? ' \xB7 ' + entry.note : '')));
        audit.appendChild(row);
      });
    }).catch(function (failure) {
      status.textContent = '';
      status.appendChild(el('span', 'meta', failure.message));
    });
  }

  load();
  setInterval(load, 5000);
})();
</script>
</body>
</html>
`;

// modules/browser/index.ts
var module = {
  id: "browser",
  apiVersion: 1,
  migrations: browserMigrations,
  register(ctx) {
    const tools = () => {
      try {
        return ctx.require("tools").tools;
      } catch {
        return null;
      }
    };
    const browser = new BrowserService({
      dataDir: ctx.settings.dataDir,
      profileDir: ctx.settings.browser.profileDir || void 0,
      executablePath: ctx.settings.browser.executable || void 0,
      headless: ctx.settings.browser.headless,
      log: ctx.log,
      store: new SqliteBrowserStore(ctx.storage)
    });
    browser.useSecrets({
      siteSecret: (ref) => {
        const service = tools();
        if (!service) throw new UpstreamError("\u0421\u0435\u043A\u0440\u0435\u0442\u044B \u0441\u0430\u0439\u0442\u043E\u0432 \u0445\u0440\u0430\u043D\u0438\u0442 \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438\xBB");
        return service.siteSecret(ref);
      },
      redact: (text) => tools()?.redactSecrets(text) ?? text
    });
    ctx.publish({ browser });
    registerBrowserRoutes(ctx.api, {
      browser,
      secret: (ref) => {
        const service = tools();
        if (!service) throw new UpstreamError("\u0421\u0435\u043A\u0440\u0435\u0442\u044B \u0441\u0430\u0439\u0442\u043E\u0432 \u0445\u0440\u0430\u043D\u0438\u0442 \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438\xBB");
        return service.siteSecret(ref);
      }
    });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.onShutdown(() => browser.shutdown());
  }
};
var index_default = module;
export {
  index_default as default
};
