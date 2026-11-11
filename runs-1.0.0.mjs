import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/app/agent-executor.ts
import { spawn } from "node:child_process";

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
var NotFoundError = class extends AppError {
  constructor(message = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E") {
    super("not_found", message, 404);
  }
};
var ConflictError = class extends AppError {
  constructor(message, details = {}) {
    super("conflict", message, 409, details);
  }
};

// src/domain/runs/failure.ts
var RULES = [
  {
    kind: "quota",
    label: "\u043A\u0432\u043E\u0442\u0430 \u0438\u043B\u0438 \u043B\u0438\u043C\u0438\u0442 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432",
    re: /429|rate.?limit|usage.?limit|quota|insufficient (?:balance|funds|credits)|resource_exhausted|исчерпан[а-я]*\s+квот|квот[а-я]*\s+(?:исчерпан|законч|превыш)|лимит[а-я]*\s+запрос/i
  },
  {
    kind: "timeout",
    label: "\u0442\u0430\u0439\u043C\u0430\u0443\u0442",
    re: /timeout|timed.?out|AbortError|ETIMEDOUT/i
  },
  {
    kind: "network",
    label: "\u043E\u0431\u0440\u044B\u0432 \u0441\u0435\u0442\u0438",
    re: /ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|EPIPE|fetch failed|socket hang up|network|connection.?reset/i
  },
  {
    kind: "http",
    label: "HTTP-\u043E\u0442\u0432\u0435\u0442 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430",
    re: /HTTP\s*(?:401|402|403|408|5\d\d)/i
  },
  {
    // Отказ провайдера по самой модели — тоже инфраструктура, а не провал
    // исполнителя: иначе «model_coming_soon» сжигает попытки карточки.
    kind: "provider",
    label: "\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0438\u043B\u0438 \u043C\u0430\u0440\u0448\u0440\u0443\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
    re: /(?:provider|model|route).*unavailable|(?:модел|маршрут|провайдер).*недоступн|model_coming_soon|coming soon|upstream request failed|no such model/i
  },
  {
    kind: "auth",
    label: "\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0432\u0445\u043E\u0434",
    re: /требуется вход|войдите в (?:аккаунт|приложение)|not logged in|login required|authentication required|please log in|log in to continue|sign in/i
  }
];
function sourceText(text2) {
  return typeof text2 === "string" ? text2 : text2 === void 0 || text2 === null ? "" : String(text2);
}
function explainFailure(text2) {
  const source = sourceText(text2);
  const reasons = [];
  for (const rule of RULES) {
    const match = rule.re.exec(source);
    if (!match) continue;
    reasons.push({
      kind: rule.kind,
      label: rule.label,
      fragment: match[0].trim().replace(/\s+/g, " ").slice(0, 80)
    });
  }
  return { infrastructure: reasons.length > 0, reasons };
}
var FAILURE_CATEGORIES = RULES.map(({ kind, label }) => ({ kind, label }));

// src/domain/runs/retry.ts
var RETRY_FALLBACK_MS = 9e5;
var RETRY_MAX_MS = 36e5;
var RETRY_JITTER_MS = 3e4;
function parseRetryAfterSeconds(text2) {
  if (typeof text2 !== "string" || !text2) return null;
  const match = /retry[-_ ]?after\s*[:=]?\s*(\d+)/i.exec(text2);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}
function nextRetryAt(input = {}) {
  const now = Number.isFinite(input.now) ? input.now : Date.now();
  const random = input.random ?? Math.random;
  const seconds = Number.isFinite(input.retry_after_seconds) ? Number(input.retry_after_seconds) : parseRetryAfterSeconds(input.error_message);
  const explicit = Math.max(
    Number.isFinite(input.retry_at) ? Number(input.retry_at) : 0,
    seconds !== null && Number(seconds) > 0 ? now + Number(seconds) * 1e3 : 0
  );
  const jitter = Math.floor(random() * RETRY_JITTER_MS);
  if (explicit > now) return Math.min(explicit + 1e3 + jitter, now + RETRY_MAX_MS);
  return now + RETRY_FALLBACK_MS + jitter;
}
function nextRetryDelay(input = {}) {
  const now = Number.isFinite(input.now) ? input.now : Date.now();
  return Math.max(0, nextRetryAt({ ...input, now }) - now);
}

// src/app/agent-executor.ts
var OUTPUT_TAIL = 2e4;
var RESULT_TAIL = 4e3;
var CHUNK = 2e3;
function killTree(child, log) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    try {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore"
      });
      killer.on("error", () => {
        try {
          child.kill();
        } catch {
        }
      });
    } catch (error) {
      log.warn("taskkill \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u043B\u0441\u044F, \u043F\u0440\u043E\u0431\u0443\u0435\u043C child.kill", { error: String(error) });
      try {
        child.kill();
      } catch {
      }
    }
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
    }
  }
  const force = setTimeout(() => {
    try {
      if (child.pid) process.kill(-child.pid, "SIGKILL");
    } catch {
    }
  }, 2e3);
  force.unref();
}
var AgentExecutor = class {
  #service;
  #registry;
  #log;
  #options;
  #timer = null;
  #child = null;
  #active = null;
  #runningRunId = null;
  #stopping = false;
  #autoStartBlocked = false;
  #autoStartFilterErrorLogged = false;
  #providerGuardBlocked = false;
  #providerGuardErrorLogged = false;
  constructor(service, registry, log, options) {
    this.#service = service;
    this.#registry = registry;
    this.#log = log.child({ module: "executor" });
    this.#options = options;
  }
  get running() {
    return this.#runningRunId !== null;
  }
  get currentRunId() {
    return this.#runningRunId;
  }
  /** Публичный список агентов для панели; env не отдаётся. */
  list() {
    return this.#registry.ids().flatMap((id) => {
      const agent = this.#registry.get(id);
      if (!agent) return [];
      return [{
        id: agent.id,
        command: agent.command,
        args: [...agent.args],
        cwd: agent.cwd,
        timeout_ms: agent.timeout_ms
      }];
    });
  }
  start() {
    if (this.#timer || this.#stopping) return;
    this.#timer = setInterval(() => void this.tick(), this.#options.intervalMs);
    this.#timer.unref();
    this.#log.info("\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0437\u0430\u043F\u0443\u0449\u0435\u043D", {
      owner: this.#options.owner,
      interval_ms: this.#options.intervalMs,
      lease_ms: this.#options.leaseMs
    });
    void this.tick();
  }
  async stop() {
    if (this.#stopping) {
      await this.#active;
      return;
    }
    this.#stopping = true;
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    if (this.#child) killTree(this.#child, this.#log);
    await this.#active;
    this.#log.info("\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
  }
  /** Один цикл: забрать не больше одного запуска и довести его до конца. */
  async tick() {
    if (this.#stopping || this.#active) return;
    const work = this.#claimAndRun();
    this.#active = work;
    try {
      await work;
    } finally {
      this.#active = null;
    }
  }
  async #claimAndRun() {
    if (!this.#autoStartPermitted()) return;
    const providerFilter = this.#providerGuardFilter();
    if (providerFilter === null) return;
    const run = this.#service.claimNext({
      owner: this.#options.owner,
      lease_ms: this.#options.leaseMs
    }, this.#autoStartTaskFilter(), providerFilter);
    if (!run) return;
    this.#runningRunId = run.id;
    this.#log.info("\u0412\u0437\u044F\u0442 \u0437\u0430\u043F\u0443\u0441\u043A", { run_id: run.id, agent: run.agent, attempt: run.attempt });
    try {
      await this.#execute(run);
    } catch (error) {
      this.#log.error("\u0417\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F", {
        run_id: run.id,
        error: error instanceof Error ? error.stack : String(error)
      });
    } finally {
      this.#runningRunId = null;
      this.#child = null;
    }
  }
  #autoStartPermitted() {
    const gate = this.#options.autoStartAllowed;
    if (!gate) return true;
    let allowed = false;
    try {
      allowed = gate();
    } catch (error) {
      this.#log.warn("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C: \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    if (!allowed) {
      if (!this.#autoStartBlocked) {
        this.#autoStartBlocked = true;
        this.#log.info("\u0410\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u043C\u0438 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438");
      }
      return false;
    }
    if (this.#autoStartBlocked) {
      this.#autoStartBlocked = false;
      this.#log.info("\u0410\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u0441\u043D\u043E\u0432\u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u043C\u0438 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438");
    }
    return true;
  }
  /** Фильтр резерва; при ошибке безопасно блокирует автозапуск без спама логов. */
  #autoStartTaskFilter() {
    const filter = this.#options.autoStartTaskIds;
    if (!filter) return void 0;
    try {
      const ids = filter();
      if (this.#autoStartFilterErrorLogged) {
        this.#autoStartFilterErrorLogged = false;
        this.#log.info("\u0424\u0438\u043B\u044C\u0442\u0440 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u0441\u043D\u043E\u0432\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D");
      }
      return ids === null ? void 0 : ids;
    } catch (error) {
      if (!this.#autoStartFilterErrorLogged) {
        this.#autoStartFilterErrorLogged = true;
        this.#log.warn("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u044B: \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return [];
    }
  }
  /**
   * Проверка провайдеров. `null` — автозапуск заблокирован полностью,
   * `without_model` — ждут только запуски с моделью. Ошибка безопасно
   * блокирует автозапуск без спама логов.
   */
  #providerGuardFilter() {
    const guard = this.#options.providerGuard;
    if (!guard) return "any";
    let state;
    try {
      state = guard();
    } catch (error) {
      if (!this.#providerGuardErrorLogged) {
        this.#providerGuardErrorLogged = true;
        this.#log.warn("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C: \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return null;
    }
    if (this.#providerGuardErrorLogged) {
      this.#providerGuardErrorLogged = false;
      this.#log.info("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u0441\u043D\u043E\u0432\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
    }
    if (state.reason === "settings_error") {
      if (!this.#providerGuardBlocked) {
        this.#providerGuardBlocked = true;
        this.#log.warn("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D", {
          configured: state.configured,
          total: state.total
        });
      }
      return null;
    }
    if (!state.auto_start_allowed) {
      if (!this.#providerGuardBlocked) {
        this.#providerGuardBlocked = true;
        this.#log.info("\u0410\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u0441 \u043C\u043E\u0434\u0435\u043B\u044C\u044E \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u043E\u0439 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432", {
          reason: state.reason,
          configured: state.configured,
          total: state.total
        });
      }
      return "without_model";
    }
    if (this.#providerGuardBlocked) {
      this.#providerGuardBlocked = false;
      this.#log.info("\u0410\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u0441\u043D\u043E\u0432\u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u043E\u0439 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432", {
        configured: state.configured,
        total: state.total
      });
    }
    return "any";
  }
  async #execute(run) {
    const definition = this.#registry.get(run.agent);
    if (!definition) {
      this.#complete(run, {
        outcome: "failed",
        error_class: "unknown_agent",
        error_message: `\u0410\u0433\u0435\u043D\u0442 \xAB${run.agent}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0444\u0430\u0439\u043B\u0435 \u0430\u0433\u0435\u043D\u0442\u043E\u0432`
      });
      return;
    }
    const epoch = run.lease_epoch;
    let child;
    try {
      child = spawn(definition.command, [...definition.args], {
        cwd: definition.cwd ?? process.cwd(),
        env: {
          ...process.env,
          TEAM_RUN_ID: run.id,
          TEAM_AGENT: run.agent,
          TEAM_MODEL: run.model ?? "",
          TEAM_TASK_ID: run.task_id ?? "",
          TEAM_ATTEMPT: String(run.attempt),
          ...definition.env
        },
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      this.#complete(run, {
        outcome: "failed",
        error_class: "spawn_failed",
        error_message: String(error)
      });
      return;
    }
    this.#child = child;
    let output = "";
    const append = (stream, chunk) => {
      const text2 = chunk.toString("utf8");
      output = `${output}${text2}`.slice(-OUTPUT_TAIL);
      for (let offset = 0; offset < text2.length; offset += CHUNK) {
        this.#service.appendOutput(run.id, stream, text2.slice(offset, offset + CHUNK));
      }
    };
    child.stdout?.on("data", (chunk) => append("stdout", chunk));
    child.stderr?.on("data", (chunk) => append("stderr", chunk));
    let killReason = null;
    const requestKill = (reason) => {
      if (killReason) return;
      killReason = reason;
      this.#log.warn("\u041E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C \u043F\u0440\u043E\u0446\u0435\u0441\u0441 \u0430\u0433\u0435\u043D\u0442\u0430", { run_id: run.id, reason, pid: child.pid });
      killTree(child, this.#log);
    };
    const heartbeatMs = this.#options.heartbeatMs ?? Math.max(500, Math.min(2e3, Math.floor(this.#options.leaseMs / 3)));
    let pinging = false;
    const heartbeat = setInterval(() => {
      if (pinging) return;
      pinging = true;
      void (async () => {
        try {
          const current2 = await this.#service.heartbeat(run.id, {
            owner: this.#options.owner,
            epoch,
            lease_ms: this.#options.leaseMs
          });
          if (current2.cancel_requested_at) requestKill("cancel");
        } catch (error) {
          if (error instanceof ConflictError) requestKill("lease_lost");
          else this.#log.warn("Heartbeat \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F", { run_id: run.id, error: String(error) });
        } finally {
          pinging = false;
        }
      })();
    }, heartbeatMs);
    heartbeat.unref();
    const timeout = definition.timeout_ms ? setTimeout(() => requestKill("timeout"), definition.timeout_ms) : null;
    timeout?.unref();
    const result = await new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      child.once("error", (error) => done({ code: null, signal: null, error }));
      child.once("close", (code, signal) => done({ code, signal, error: null }));
    });
    clearInterval(heartbeat);
    if (timeout) clearTimeout(timeout);
    if (this.#stopping) {
      this.#release(run, epoch);
      return;
    }
    if (killReason === "lease_lost") {
      this.#log.warn("\u0410\u0440\u0435\u043D\u0434\u0430 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u0430: \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u043C", { run_id: run.id });
      return;
    }
    const current = this.#safeGet(run.id);
    const cancelRequested = killReason === "cancel" || current?.cancel_requested_at != null;
    if (cancelRequested) {
      this.#complete(run, {
        outcome: "cancelled",
        exit_code: result.code,
        error_class: null,
        error_message: null,
        result: output.trim().slice(-RESULT_TAIL)
      });
      return;
    }
    if (killReason === "timeout") {
      this.#fail(run, {
        outcome: "failed",
        exit_code: result.code,
        error_class: "timeout",
        error_message: `\u041F\u0440\u043E\u0446\u0435\u0441\u0441 \u043F\u0440\u0435\u0432\u044B\u0441\u0438\u043B \u043B\u0438\u043C\u0438\u0442 ${definition.timeout_ms} \u043C\u0441 \u0438 \u0431\u044B\u043B \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D`,
        result: output.trim().slice(-RESULT_TAIL)
      }, output);
      return;
    }
    if (result.error) {
      this.#complete(run, {
        outcome: "failed",
        exit_code: null,
        error_class: "spawn_failed",
        error_message: result.error.message
      });
      return;
    }
    if (result.code === 0) {
      this.#complete(run, {
        outcome: "succeeded",
        exit_code: 0,
        error_class: null,
        error_message: null,
        result: output.trim().slice(-RESULT_TAIL)
      });
      this.#availabilityClear(run.agent);
      return;
    }
    this.#fail(run, {
      outcome: "failed",
      exit_code: result.code,
      error_class: "process_exit",
      error_message: `\u041F\u0440\u043E\u0446\u0435\u0441\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441 \u043A\u043E\u0434\u043E\u043C ${result.code ?? "\u043D\u0435\u0442"} (${result.signal ?? "\u0431\u0435\u0437 \u0441\u0438\u0433\u043D\u0430\u043B\u0430"})`,
      result: output.trim().slice(-RESULT_TAIL)
    }, output);
  }
  /**
   * Сбой провайдера — не провал работы: он тратит попытку только когда попытки
   * кончились. До этого запуск уходит в очередь с временем `not_before`, а
   * участник получает паузу, чтобы тот же лимит не ловили новые задания.
   */
  #fail(run, report, output) {
    const explanation = explainFailure([
      report.error_class ?? "",
      report.error_message ?? "",
      // Короткий вывод агента часто содержит сообщение провайдера (429, квота),
      // а длинный отчёт — рассуждение о квотах, а не сбой. Граница как в старом
      // мосте: только короткая машинная строка.
      output.trim().length > 0 && output.trim().length <= 2e3 ? output : ""
    ].join("\n"));
    const now = Date.now();
    let retryAt = null;
    if (explanation.infrastructure) {
      retryAt = new Date(now + this.#retryDelay(run, explanation, report.error_class ?? null, output, now));
      this.#pause(run.agent, explanation, retryAt);
    }
    if (!explanation.infrastructure || run.attempt >= run.max_attempts) {
      this.#complete(run, report);
      return;
    }
    try {
      this.#service.reschedule(run.id, {
        owner: this.#options.owner,
        epoch: run.lease_epoch,
        lease_ms: this.#options.leaseMs,
        not_before: (retryAt ?? new Date(now)).toISOString(),
        reason: explanation.reasons.map((reason) => reason.label).join(", "),
        error_class: report.error_class ?? null
      });
      this.#log.warn("\u0418\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u044B\u0439 \u0441\u0431\u043E\u0439: \u0437\u0430\u043F\u0443\u0441\u043A \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0442 \u043F\u043E\u0441\u043B\u0435 \u043F\u0430\u0443\u0437\u044B", {
        run_id: run.id,
        agent: run.agent,
        attempt: run.attempt,
        max_attempts: run.max_attempts,
        reasons: explanation.reasons.map((reason) => reason.fragment),
        not_before: (retryAt ?? new Date(now)).toISOString()
      });
    } catch (error) {
      this.#log.warn("\u041F\u043E\u0432\u0442\u043E\u0440 \u043D\u0435 \u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D: \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u043C", {
        run_id: run.id,
        error: error instanceof Error ? error.message : String(error)
      });
      this.#complete(run, report);
    }
  }
  #retryDelay(run, failure, errorClass, output, now) {
    const custom = this.#options.retryWaitMs;
    if (custom) {
      try {
        return Math.max(0, custom({ run, failure, error_class: errorClass, now }));
      } catch (error) {
        this.#log.warn("\u0421\u0432\u043E\u044F \u0437\u0430\u0434\u0435\u0440\u0436\u043A\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u043D\u0435 \u043F\u043E\u0441\u0447\u0438\u0442\u0430\u043D\u0430", {
          run_id: run.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return nextRetryDelay({ error_message: `${failure.reasons.map((r) => r.fragment).join(" ")} ${output.slice(-400)}`, now });
  }
  #pause(agent, failure, until) {
    const availability = this.#options.availability;
    if (!availability) return;
    try {
      availability.pause(agent, until, {
        reason: failure.reasons.map((reason) => reason.label).join(", "),
        kind: failure.reasons[0]?.kind ?? "provider"
      });
    } catch (error) {
      this.#log.warn("\u041F\u0430\u0443\u0437\u0430 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B\u0430\u0441\u044C", {
        agent,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  #availabilityClear(agent) {
    try {
      this.#options.availability?.clear(agent);
    } catch (error) {
      this.#log.warn("\u041F\u0430\u0443\u0437\u0430 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430 \u043D\u0435 \u0441\u043D\u044F\u0442\u0430", {
        agent,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  #safeGet(id) {
    try {
      return this.#service.get(id).run;
    } catch {
      return null;
    }
  }
  #complete(run, report) {
    try {
      this.#service.complete(run.id, {
        owner: this.#options.owner,
        epoch: run.lease_epoch,
        outcome: report.outcome,
        exit_code: report.exit_code ?? null,
        error_class: report.error_class ?? null,
        error_message: report.error_message ?? null,
        result: report.result ?? null
      });
      this.#log.info("\u0417\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u043C", {
        run_id: run.id,
        outcome: report.outcome,
        exit_code: report.exit_code ?? null,
        error_class: report.error_class ?? null
      });
    } catch (error) {
      this.#log.warn("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0437\u0430\u043F\u0443\u0441\u043A\u0430", {
        run_id: run.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  #release(run, epoch) {
    try {
      this.#service.release(run.id, { owner: this.#options.owner, epoch });
    } catch (error) {
      this.#log.warn("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0437\u0430\u043F\u0443\u0441\u043A \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C", {
        run_id: run.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
};

// src/app/availability-service.ts
function toPause(row) {
  return {
    agent: row.agent,
    until: row.until,
    reason: row.reason,
    kind: row.kind,
    strikes: row.strikes,
    updated_at: row.updated_at
  };
}
function timeLabel(iso) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
var AgentAvailability = class {
  #db;
  #log;
  constructor(db, log) {
    this.#db = db;
    this.#log = log.child({ module: "agents" });
  }
  /** Пауза до `until`; повторный сбой не сокращает уже назначенный срок. */
  pause(agent, until, info) {
    const id = String(agent ?? "").trim();
    if (!id) throw new Error("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043F\u0430\u0443\u0437\u044B");
    if (Number.isNaN(until.getTime())) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043F\u0430\u0443\u0437\u044B");
    const previous = this.#row(id);
    const target = previous && Date.parse(previous.until) > until.getTime() ? previous.until : until.toISOString();
    const record2 = {
      agent: id,
      until: target,
      reason: String(info.reason ?? "").slice(0, 500),
      kind: String(info.kind ?? "").slice(0, 40),
      strikes: (previous?.strikes ?? 0) + 1,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.#db.raw.prepare(`INSERT INTO agent_availability (agent, until, reason, kind, strikes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(agent) DO UPDATE SET
          until = excluded.until, reason = excluded.reason, kind = excluded.kind,
          strikes = excluded.strikes, updated_at = excluded.updated_at`).run(record2.agent, record2.until, record2.reason, record2.kind, record2.strikes, record2.updated_at);
    this.#log.warn("\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043D\u0430 \u043F\u0430\u0443\u0437\u0435 \u043F\u043E\u0441\u043B\u0435 \u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u043E\u0433\u043E \u0441\u0431\u043E\u044F", {
      agent: record2.agent,
      until: record2.until,
      kind: record2.kind,
      strikes: record2.strikes
    });
    return record2;
  }
  clear(agent) {
    const result = this.#db.raw.prepare("DELETE FROM agent_availability WHERE agent = ?").run(String(agent ?? "").trim());
    return Number(result.changes) > 0;
  }
  active(agent, now = /* @__PURE__ */ new Date()) {
    const row = this.#row(String(agent ?? "").trim());
    if (!row) return null;
    const until = Date.parse(row.until);
    if (!Number.isFinite(until) || until <= now.getTime()) return null;
    return toPause(row);
  }
  list(now = /* @__PURE__ */ new Date()) {
    const rows = this.#db.raw.prepare("SELECT agent, until, reason, kind, strikes, updated_at FROM agent_availability ORDER BY until ASC, agent ASC").all();
    return rows.map((row) => {
      const until = Date.parse(row.until);
      return {
        ...toPause(row),
        active: Number.isFinite(until) && until > now.getTime(),
        remaining_ms: Number.isFinite(until) ? Math.max(0, until - now.getTime()) : 0
      };
    });
  }
  /** Причина пропуска для меню и статуса; `null` — участник доступен. */
  skipReason(agent, now = /* @__PURE__ */ new Date()) {
    const pause = this.active(agent, now);
    if (!pause) return null;
    return `\u043D\u0430 \u043F\u0430\u0443\u0437\u0435 \u0434\u043E ${timeLabel(pause.until)}${pause.reason ? ` (${pause.reason})` : ""}`;
  }
  #row(agent) {
    if (!agent) return null;
    const row = this.#db.raw.prepare("SELECT agent, until, reason, kind, strikes, updated_at FROM agent_availability WHERE agent = ?").get(agent);
    return row ?? null;
  }
};

// src/kernel/clock.ts
var systemClock = {
  now: () => /* @__PURE__ */ new Date()
};
function nextTimestamp(previous, now) {
  const base = now.getTime();
  const prev = previous ? Date.parse(previous) : Number.NaN;
  return new Date(Number.isFinite(prev) ? Math.max(base, prev + 1) : base).toISOString();
}

// src/kernel/ids.ts
import { randomUUID } from "node:crypto";
function newId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// src/kernel/validate.ts
function record(raw, what) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`${what}: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442`);
  }
  return raw;
}
function text(raw, field, max, required = false) {
  if (raw === void 0 || raw === null) {
    if (required) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E`);
    return "";
  }
  if (typeof raw !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  const value = raw.trim();
  if (required && !value) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E`);
  if (value.length > max) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${max} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  return value;
}
function oneOf(raw, field, allowed, fallback) {
  if (raw === void 0 || raw === null) return fallback;
  const value = String(raw);
  if (!allowed.includes(value)) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E ${allowed.join(", ")}`, { value });
  }
  return value;
}
function integer(raw, field, min, max, fallback) {
  if (raw === void 0 || raw === null) return fallback;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}

// src/domain/runs/run.ts
var RUN_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"];
var TERMINAL_RUN_STATUSES = ["succeeded", "failed", "cancelled"];
var RUN_OUTCOMES = ["succeeded", "failed", "cancelled"];
var DEFAULT_LEASE_MS = 6e4;
var LEASE_MIN_MS = 1e3;
var LEASE_MAX_MS = 36e5;
var DEFAULT_MAX_ATTEMPTS = 3;
function normalizeNewRun(raw) {
  const input = record(raw, "\u0417\u0430\u043F\u0443\u0441\u043A");
  return {
    task_id: text(input.task_id, "task_id", 100) || null,
    agent: text(input.agent, "agent", 100, true),
    model: text(input.model, "model", 100) || null,
    max_attempts: integer(input.max_attempts, "max_attempts", 1, 10, DEFAULT_MAX_ATTEMPTS),
    idempotency_key: text(input.idempotency_key, "idempotency_key", 200) || null
  };
}
function leaseValue(raw, fallback) {
  return integer(raw, "lease_ms", LEASE_MIN_MS, LEASE_MAX_MS, fallback);
}
function normalizeClaim(raw, fallbackLeaseMs = DEFAULT_LEASE_MS) {
  const input = record(raw ?? {}, "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u0437\u0430\u043F\u0443\u0441\u043A");
  return {
    owner: text(input.owner, "owner", 100, true),
    lease_ms: leaseValue(input.lease_ms, fallbackLeaseMs)
  };
}
function normalizeLease(raw, fallbackLeaseMs = DEFAULT_LEASE_MS) {
  const input = record(raw, "\u0410\u0440\u0435\u043D\u0434\u0430");
  return {
    owner: text(input.owner, "owner", 100, true),
    epoch: integer(input.epoch, "epoch", 1, Number.MAX_SAFE_INTEGER, 1),
    lease_ms: leaseValue(input.lease_ms, fallbackLeaseMs)
  };
}
function normalizeRunReport(raw) {
  const input = record(raw, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0437\u0430\u043F\u0443\u0441\u043A\u0430");
  return {
    outcome: requiredOutcome(input.outcome),
    exit_code: input.exit_code === void 0 || input.exit_code === null ? null : integer(input.exit_code, "exit_code", -1e6, 1e6, 0),
    error_class: text(input.error_class, "error_class", 100) || null,
    error_message: text(input.error_message, "error_message", 2e3) || null,
    result: text(input.result, "result", 2e4) || null
  };
}
function requiredOutcome(raw) {
  if (raw === void 0 || raw === null) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xABoutcome\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E: ${RUN_OUTCOMES.join(", ")}`);
  }
  return oneOf(raw, "outcome", RUN_OUTCOMES, "failed");
}
function queueRun(input, now) {
  const at = now.toISOString();
  const run = {
    id: newId("run"),
    ...input,
    status: "queued",
    attempt: 0,
    lease_owner: null,
    lease_epoch: 0,
    lease_expires_at: null,
    cancel_requested_at: null,
    exit_code: null,
    error_class: null,
    error_message: null,
    result: null,
    not_before: null,
    revision: 1,
    created_at: at,
    started_at: null,
    finished_at: null,
    updated_at: at
  };
  return {
    run,
    event: {
      run_id: run.id,
      type: "run.queued",
      actor: run.agent,
      payload: { agent: run.agent, model: run.model, task_id: run.task_id, max_attempts: run.max_attempts },
      created_at: at
    }
  };
}
function leaseDeadline(now, ttlMs) {
  return new Date(now.getTime() + ttlMs).toISOString();
}
function claimRun(run, claim, now) {
  if (run.status !== "queued") {
    throw new ConflictError(`\u0417\u0430\u043F\u0443\u0441\u043A \u043D\u0435 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438: \u0441\u0442\u0430\u0442\u0443\u0441 \xAB${run.status}\xBB`, { current: run });
  }
  if (run.attempt >= run.max_attempts) {
    throw new ConflictError("\u041F\u043E\u043F\u044B\u0442\u043A\u0438 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u044B: \u0437\u0430\u043F\u0443\u0441\u043A \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0451\u043D \u0432 failed", {
      current: run,
      max_attempts: run.max_attempts
    });
  }
  const at = nextTimestamp(run.updated_at, now);
  const next = {
    ...run,
    status: "running",
    attempt: run.attempt + 1,
    lease_owner: claim.owner,
    lease_epoch: run.lease_epoch + 1,
    lease_expires_at: leaseDeadline(now, claim.lease_ms),
    not_before: null,
    started_at: run.started_at ?? at,
    revision: run.revision + 1,
    updated_at: at
  };
  return {
    run: next,
    event: {
      run_id: run.id,
      type: "run.claimed",
      actor: claim.owner,
      payload: {
        attempt: next.attempt,
        lease_epoch: next.lease_epoch,
        lease_expires_at: next.lease_expires_at
      },
      created_at: at
    }
  };
}
function assertActiveLease(run, lease, now) {
  if (run.status !== "running") {
    throw new ConflictError(`\u0417\u0430\u043F\u0443\u0441\u043A \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F: \u0441\u0442\u0430\u0442\u0443\u0441 \xAB${run.status}\xBB`, { current: run });
  }
  const mismatches = [];
  if (run.lease_owner !== lease.owner) {
    mismatches.push(`lease_owner: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F ${lease.owner}, \u0441\u0435\u0439\u0447\u0430\u0441 ${run.lease_owner ?? "\u043D\u0435\u0442"}`);
  }
  if (run.lease_epoch !== lease.epoch) {
    mismatches.push(`lease_epoch: \u043E\u0436\u0438\u0434\u0430\u043B\u0430\u0441\u044C ${lease.epoch}, \u0441\u0435\u0439\u0447\u0430\u0441 ${run.lease_epoch}`);
  }
  if (mismatches.length) {
    throw new ConflictError("\u0410\u0440\u0435\u043D\u0434\u0430 \u043F\u0440\u0438\u043D\u0430\u0434\u043B\u0435\u0436\u0438\u0442 \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E", { current: run, mismatches });
  }
  if (!run.lease_expires_at || Date.parse(run.lease_expires_at) <= now.getTime()) {
    throw new ConflictError("\u0410\u0440\u0435\u043D\u0434\u0430 \u0438\u0441\u0442\u0435\u043A\u043B\u0430: \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C\u0441\u044F", {
      current: run,
      reason: "lease_expired"
    });
  }
}
function heartbeatRun(run, lease, now) {
  assertActiveLease(run, lease, now);
  return {
    ...run,
    lease_expires_at: leaseDeadline(now, lease.lease_ms),
    revision: run.revision + 1,
    updated_at: nextTimestamp(run.updated_at, now)
  };
}
function completeRun(run, report, lease, now) {
  assertActiveLease(run, lease, now);
  const at = nextTimestamp(run.updated_at, now);
  const next = {
    ...run,
    status: report.outcome,
    exit_code: report.exit_code,
    error_class: report.error_class,
    error_message: report.error_message,
    result: report.result,
    // Владелец и эпоха остаются для аудита, срок снимается: активной аренды нет.
    lease_expires_at: null,
    finished_at: at,
    revision: run.revision + 1,
    updated_at: at
  };
  return {
    run: next,
    event: {
      run_id: run.id,
      type: `run.${report.outcome}`,
      actor: lease.owner,
      payload: {
        exit_code: report.exit_code,
        error_class: report.error_class,
        attempt: run.attempt,
        cancel_requested: run.cancel_requested_at !== null
      },
      created_at: at
    }
  };
}
function requestCancel(run, actor, now) {
  if (TERMINAL_RUN_STATUSES.includes(run.status)) {
    return { run, event: null, changed: false, finished: true };
  }
  const at = nextTimestamp(run.updated_at, now);
  if (run.status === "queued") {
    return {
      run: { ...run, status: "cancelled", finished_at: at, revision: run.revision + 1, updated_at: at },
      event: {
        run_id: run.id,
        type: "run.cancelled",
        actor,
        payload: { from: "queued" },
        created_at: at
      },
      changed: true,
      finished: false
    };
  }
  if (run.cancel_requested_at) {
    return { run, event: null, changed: false, finished: false };
  }
  return {
    run: { ...run, cancel_requested_at: at, revision: run.revision + 1, updated_at: at },
    event: {
      run_id: run.id,
      type: "run.cancel_requested",
      actor,
      payload: { attempt: run.attempt },
      created_at: at
    },
    changed: true,
    finished: false
  };
}
function requeueAfterFailure(run, lease, actor, detail, notBefore, now) {
  assertActiveLease(run, lease, now);
  const at = nextTimestamp(run.updated_at, now);
  return {
    run: {
      ...run,
      status: "queued",
      lease_owner: null,
      lease_expires_at: null,
      cancel_requested_at: null,
      not_before: notBefore.toISOString(),
      finished_at: null,
      revision: run.revision + 1,
      updated_at: at
    },
    event: {
      run_id: run.id,
      type: "run.requeued",
      actor,
      payload: {
        reason: detail.reason,
        error_class: detail.error_class,
        attempt: run.attempt,
        max_attempts: run.max_attempts,
        not_before: notBefore.toISOString(),
        infrastructure: true
      },
      created_at: at
    }
  };
}
function releaseRun(run, lease, actor, reason, now) {
  assertActiveLease(run, lease, now);
  const at = nextTimestamp(run.updated_at, now);
  return {
    run: {
      ...run,
      status: "queued",
      lease_owner: null,
      lease_expires_at: null,
      not_before: null,
      revision: run.revision + 1,
      updated_at: at
    },
    event: {
      run_id: run.id,
      type: "run.requeued",
      actor,
      payload: { reason, attempt: run.attempt },
      created_at: at
    }
  };
}
function recoverExpired(run, now) {
  if (run.status !== "running" || !run.lease_expires_at) return null;
  if (Date.parse(run.lease_expires_at) > now.getTime()) return null;
  const at = nextTimestamp(run.updated_at, now);
  if (run.cancel_requested_at) {
    return {
      action: "cancelled",
      run: { ...run, status: "cancelled", lease_expires_at: null, finished_at: at, revision: run.revision + 1, updated_at: at },
      event: {
        run_id: run.id,
        type: "run.cancelled",
        actor: "watchdog",
        payload: { reason: "lease_expired", cancel_requested: true, attempt: run.attempt },
        created_at: at
      }
    };
  }
  if (run.attempt < run.max_attempts) {
    return {
      action: "requeued",
      run: {
        ...run,
        status: "queued",
        lease_owner: null,
        lease_expires_at: null,
        not_before: null,
        revision: run.revision + 1,
        updated_at: at
      },
      event: {
        run_id: run.id,
        type: "run.requeued",
        actor: "watchdog",
        payload: { reason: "lease_expired", attempt: run.attempt, max_attempts: run.max_attempts },
        created_at: at
      }
    };
  }
  return {
    action: "failed",
    run: {
      ...run,
      status: "failed",
      lease_expires_at: null,
      error_class: "lease_expired",
      error_message: "\u0410\u0440\u0435\u043D\u0434\u0430 \u0438\u0441\u0442\u0435\u043A\u043B\u0430, \u043F\u043E\u043F\u044B\u0442\u043A\u0438 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u044B",
      finished_at: at,
      revision: run.revision + 1,
      updated_at: at
    },
    event: {
      run_id: run.id,
      type: "run.failed",
      actor: "watchdog",
      payload: { reason: "lease_expired", attempt: run.attempt, max_attempts: run.max_attempts },
      created_at: at
    }
  };
}

// src/app/run-service.ts
var SWEEP_BATCH = 200;
var SWEEP_MAX_BATCHES = 10;
var RunService = class {
  #repo;
  #bus;
  #clock;
  #log;
  #defaultLeaseMs;
  constructor(repo, bus, clock, log, options = {}) {
    this.#repo = repo;
    this.#bus = bus;
    this.#clock = clock;
    this.#log = log.child({ module: "runs" });
    this.#defaultLeaseMs = options.defaultLeaseMs ?? DEFAULT_LEASE_MS;
  }
  create(raw) {
    const input = normalizeNewRun(raw);
    const { run, event } = queueRun(input, this.#clock.now());
    if (!this.#repo.insert(run, event)) {
      if (!run.idempotency_key) throw new ConflictError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0443\u0441\u043A \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C");
      const existing = this.#repo.findByIdempotencyKey(run.idempotency_key);
      if (!existing) throw new ConflictError("\u0418\u0434\u0435\u043C\u043F\u043E\u0442\u0435\u043D\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0437\u0430\u043D\u044F\u0442 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u043C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C", {
        idempotency_key: run.idempotency_key
      });
      this.#log.info("\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u0430\u044F \u043F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0437\u0430\u043F\u0443\u0441\u043A\u0430", {
        run_id: existing.id,
        idempotency_key: run.idempotency_key
      });
      return { run: existing, deduplicated: true };
    }
    this.#publish(event);
    this.#log.info("\u0417\u0430\u043F\u0443\u0441\u043A \u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C", { run_id: run.id, agent: run.agent, model: run.model });
    return { run, deduplicated: false };
  }
  get(id) {
    const run = this.#repo.get(id);
    if (!run) throw new NotFoundError(`\u0417\u0430\u043F\u0443\u0441\u043A ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    return { run, events: this.#repo.events(id, 100) };
  }
  /** Вся история запусков для выгрузки. */
  exportAll() {
    const items = [];
    let cursor;
    for (let guard = 0; guard < 500; guard += 1) {
      const page = this.list({ limit: "200", cursor });
      items.push(...page.items);
      if (!page.next_cursor) break;
      cursor = page.next_cursor;
    }
    return items;
  }
  list(raw) {
    const limit = raw.limit === void 0 || raw.limit === "" ? 50 : Number(raw.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new ValidationError("\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \xABlimit\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 1 \u0434\u043E 200");
    }
    return this.#repo.list({
      status: raw.status ? oneOf(raw.status, "status", RUN_STATUSES, "queued") : void 0,
      agent: raw.agent?.trim() || void 0,
      task_id: raw.task_id?.trim() || void 0,
      limit,
      cursor: raw.cursor?.trim() || void 0
    });
  }
  /**
   * Захват следующего запуска. `null` — очередь пуста, это не ошибка.
   * `allowedTaskIds` ограничивает выбор карточками из резерва; без аргумента
   * выбор не фильтруется, поэтому ручной claim остаётся свободным.
   */
  claimNext(raw, allowedTaskIds, modelFilter = "any") {
    const claim = normalizeClaim(raw, this.#defaultLeaseMs);
    const now = this.#clock.now();
    const decision = this.#repo.claimNext(
      (queued) => claimRun(queued, claim, now),
      allowedTaskIds,
      modelFilter
    );
    if (!decision) return null;
    this.#publish(decision.event);
    this.#log.info("\u0417\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0445\u0432\u0430\u0447\u0435\u043D", {
      run_id: decision.run.id,
      owner: claim.owner,
      attempt: decision.run.attempt,
      lease_expires_at: decision.run.lease_expires_at
    });
    return decision.run;
  }
  heartbeat(id, raw) {
    const lease = normalizeLease(raw, this.#defaultLeaseMs);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = this.#requireRun(id);
      const now = this.#clock.now();
      const next = heartbeatRun(current, lease, now);
      if (this.#repo.updateActiveLease(next, current.revision, lease.owner, lease.epoch, now, null)) {
        return next;
      }
    }
    throw this.#leaseLost(id);
  }
  complete(id, raw) {
    const input = record(raw, "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430");
    const lease = normalizeLease(input, this.#defaultLeaseMs);
    const report = normalizeRunReport(input);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = this.#requireRun(id);
      const now = this.#clock.now();
      const { run, event } = completeRun(current, report, lease, now);
      if (!this.#repo.updateActiveLease(run, current.revision, lease.owner, lease.epoch, now, event)) {
        continue;
      }
      this.#publish(event);
      this.#log.info("\u0417\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D", {
        run_id: id,
        outcome: run.status,
        exit_code: run.exit_code,
        error_class: run.error_class,
        attempt: run.attempt
      });
      return run;
    }
    throw this.#leaseLost(id);
  }
  /** Поток вывода процесса: живые события для окна и история в журнале. */
  appendOutput(id, stream, chunk) {
    if (!chunk) return;
    const event = {
      run_id: id,
      type: "run.output",
      actor: "executor",
      payload: { stream, chunk },
      created_at: this.#clock.now().toISOString()
    };
    this.#repo.appendEvent(event);
    this.#publish(event);
  }
  /** Штатная остановка исполнителя: запуск возвращается в очередь. */
  release(id, lease, reason = "executor_stopped") {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = this.#requireRun(id);
      const now = this.#clock.now();
      const { run, event } = releaseRun(current, lease, "executor", reason, now);
      if (!this.#repo.updateActiveLease(run, current.revision, lease.owner, lease.epoch, now, event)) {
        continue;
      }
      this.#publish(event);
      this.#log.warn("\u0417\u0430\u043F\u0443\u0441\u043A \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0451\u043D \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C", { run_id: id, reason, attempt: run.attempt });
      return run;
    }
    throw this.#leaseLost(id);
  }
  /**
   * Повтор после инфраструктурного сбоя: запуск возвращается в очередь, но не
   * раньше `not_before`. Терминальный статус не ставится, попытка не теряется.
   */
  reschedule(id, raw) {
    const input = record(raw, "\u041F\u043E\u0432\u0442\u043E\u0440 \u0437\u0430\u043F\u0443\u0441\u043A\u0430");
    const lease = normalizeLease(input, this.#defaultLeaseMs);
    const reason = text(input.reason, "reason", 300) || "\u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u044B\u0439 \u0441\u0431\u043E\u0439";
    const errorClass = text(input.error_class, "error_class", 100) || null;
    const notBefore = this.#notBefore(input.not_before);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = this.#requireRun(id);
      const now = this.#clock.now();
      const { run, event } = requeueAfterFailure(
        current,
        lease,
        "executor",
        { reason, error_class: errorClass },
        notBefore,
        now
      );
      if (!this.#repo.updateActiveLease(run, current.revision, lease.owner, lease.epoch, now, event)) {
        continue;
      }
      this.#publish(event);
      this.#log.warn("\u0417\u0430\u043F\u0443\u0441\u043A \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0442 \u043F\u043E\u0441\u043B\u0435 \u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u043E\u0433\u043E \u0441\u0431\u043E\u044F", {
        run_id: id,
        reason,
        not_before: run.not_before,
        attempt: run.attempt,
        max_attempts: run.max_attempts
      });
      return run;
    }
    throw this.#leaseLost(id);
  }
  /**
   * Ручной повтор завершённого запуска: создаёт новый запуск с теми же
   * агентом, моделью, карточкой и лимитом попыток. Активный запуск сначала
   * нужно отменить, иначе повтор создал бы дубль работы.
   */
  retry(id) {
    const source = this.#requireRun(id);
    if (source.status === "queued" || source.status === "running") {
      throw new ConflictError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A, \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0435\u0433\u043E", {
        status: source.status
      });
    }
    const created = this.create({
      agent: source.agent,
      model: source.model ?? void 0,
      task_id: source.task_id ?? void 0,
      max_attempts: source.max_attempts
    });
    this.#log.info("\u0417\u0430\u043F\u0443\u0441\u043A \u043F\u043E\u0432\u0442\u043E\u0440\u0451\u043D \u0432\u0440\u0443\u0447\u043D\u0443\u044E", {
      source_id: source.id,
      run_id: created.run.id
    });
    return { run: created.run, source_id: source.id, deduplicated: created.deduplicated };
  }
  cancel(id, raw) {
    const input = raw === void 0 || raw === null ? {} : record(raw, "\u041E\u0442\u043C\u0435\u043D\u0430 \u0437\u0430\u043F\u0443\u0441\u043A\u0430");
    const actor = text(input.actor, "actor", 100) || "human";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = this.#requireRun(id);
      const now = this.#clock.now();
      const result = requestCancel(current, actor, now);
      if (!result.changed) {
        return { run: result.run, requested: false, finished: result.finished };
      }
      if (!this.#repo.update(result.run, current.revision, result.event)) {
        continue;
      }
      if (result.event) this.#publish(result.event);
      this.#log.info("\u041E\u0442\u043C\u0435\u043D\u0430 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u0430", {
        run_id: id,
        actor,
        from: current.status,
        finished: result.finished
      });
      return { run: result.run, requested: true, finished: result.finished };
    }
    throw this.#leaseLost(id);
  }
  /**
   * Восстановление просроченных аренд. Отдельный метод, чтобы тесты управляли
   * временем и не зависели от таймера.
   */
  sweepExpired(now = this.#clock.now()) {
    const results = [];
    for (let batch = 0; batch < SWEEP_MAX_BATCHES; batch += 1) {
      const expired = this.#repo.listExpired(now, SWEEP_BATCH);
      if (!expired.length) break;
      let progressed = 0;
      for (const run of expired) {
        const recovery = recoverExpired(run, now);
        if (!recovery) continue;
        const owner = run.lease_owner;
        if (!owner) continue;
        if (!this.#repo.updateExpiredLease(recovery.run, run.revision, owner, run.lease_epoch, now, recovery.event)) {
          continue;
        }
        progressed += 1;
        this.#publish(recovery.event);
        results.push({ run_id: run.id, action: recovery.action });
        this.#log.warn("\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u0430\u044F \u0430\u0440\u0435\u043D\u0434\u0430 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430", {
          run_id: run.id,
          action: recovery.action,
          attempt: run.attempt,
          owner
        });
      }
      if (!progressed) break;
    }
    return results;
  }
  #notBefore(raw) {
    if (raw === void 0 || raw === null || raw === "") return this.#clock.now();
    const value = typeof raw === "string" ? Date.parse(raw) : Number.NaN;
    if (!Number.isFinite(value)) {
      throw new ValidationError("\u041F\u043E\u043B\u0435 \xABnot_before\xBB: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u0434\u0430\u0442\u0430 ISO 8601");
    }
    return new Date(value);
  }
  #requireRun(id) {
    const run = this.#repo.get(id);
    if (!run) throw new NotFoundError(`\u0417\u0430\u043F\u0443\u0441\u043A ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    return run;
  }
  /** Конфликт с текущим состоянием: клиент должен перечитать запуск. */
  #leaseLost(id) {
    const actual = this.#repo.get(id);
    if (!actual) return new ConflictError(`\u0417\u0430\u043F\u0443\u0441\u043A ${id} \u0438\u0441\u0447\u0435\u0437`, { id });
    return new ConflictError("\u0410\u0440\u0435\u043D\u0434\u0430 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u0430 \u0438\u043B\u0438 \u0437\u0430\u043F\u0443\u0441\u043A \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F", {
      current: actual,
      reason: actual.status === "running" ? "lease_expired" : "not_running"
    });
  }
  #publish(event) {
    this.#bus.publish({
      type: event.type,
      entity: { kind: "run", id: event.run_id },
      actor: event.actor,
      at: event.created_at,
      data: event.payload
    });
  }
};

// src/app/run-watchdog.ts
var RunWatchdog = class {
  #service;
  #log;
  #intervalMs;
  #timer = null;
  constructor(service, log, intervalMs) {
    this.#service = service;
    this.#log = log.child({ module: "watchdog" });
    this.#intervalMs = intervalMs;
  }
  get intervalMs() {
    return this.#intervalMs;
  }
  get running() {
    return this.#timer !== null;
  }
  start() {
    if (this.#timer || this.#intervalMs <= 0) return;
    this.#timer = setInterval(() => this.sweep(), this.#intervalMs);
    this.#timer.unref();
    this.#log.info("\u041D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u0437\u0430\u043F\u0443\u0449\u0435\u043D", { interval_ms: this.#intervalMs });
  }
  stop() {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = null;
    this.#log.info("\u041D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
  }
  sweep(now) {
    try {
      return this.#service.sweepExpired(now);
    } catch (error) {
      this.#log.error("\u041E\u0431\u0445\u043E\u0434 \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0445 \u0430\u0440\u0435\u043D\u0434 \u0443\u043F\u0430\u043B", {
        error: error instanceof Error ? error.stack : String(error)
      });
      return [];
    }
  }
};

// src/adapters/agents/file-registry.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
function defaultAgents() {
  if (process.platform === "win32") {
    return [{
      id: "demo",
      command: "cmd",
      // ping из System32, а не `timeout`: в PATH может оказаться GNU timeout.
      args: ["/c", "for /l %i in (1,1,15) do @(echo line %i & %SystemRoot%\\System32\\ping.exe -n 2 127.0.0.1 >nul)"],
      cwd: null,
      env: {},
      timeout_ms: 6e4
    }];
  }
  return [{
    id: "demo",
    command: "sh",
    args: ["-c", "for i in $(seq 1 15); do echo line $i; sleep 1; done"],
    cwd: null,
    env: {},
    timeout_ms: 6e4
  }];
}
function normalizeAgent(raw, index) {
  const input = record(raw, `\u0410\u0433\u0435\u043D\u0442 #${index + 1}`);
  const id = text(input.id, "id", 100, true);
  const argsRaw = input.args ?? [];
  if (!Array.isArray(argsRaw)) throw new ValidationError(`\u0410\u0433\u0435\u043D\u0442 \xAB${id}\xBB: args \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C`);
  const envRaw = input.env ?? {};
  const envInput = record(envRaw, `\u0410\u0433\u0435\u043D\u0442 \xAB${id}\xBB: env`);
  const env = {};
  for (const [key, value] of Object.entries(envInput)) {
    if (typeof value !== "string") throw new ValidationError(`\u0410\u0433\u0435\u043D\u0442 \xAB${id}\xBB: env.${key} \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
    env[key] = value;
  }
  return {
    id,
    command: text(input.command, "command", 500, true),
    args: argsRaw.map((arg, argIndex) => text(arg, `args[${argIndex}]`, 500, true)),
    cwd: text(input.cwd, "cwd", 500) || null,
    env,
    timeout_ms: input.timeout_ms === void 0 || input.timeout_ms === null ? null : integer(input.timeout_ms, "timeout_ms", 1e3, 36e5, 6e4)
  };
}
function serialize(agent) {
  return {
    id: agent.id,
    command: agent.command,
    args: [...agent.args],
    ...agent.cwd ? { cwd: agent.cwd } : {},
    ...Object.keys(agent.env).length ? { env: agent.env } : {},
    ...agent.timeout_ms ? { timeout_ms: agent.timeout_ms } : {}
  };
}
function loadAgentRegistry(file, log) {
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    const seed = { agents: defaultAgents().map(serialize) };
    writeFileSync(file, `${JSON.stringify(seed, null, 2)}
`, "utf8");
    log.info("\u0421\u043E\u0437\u0434\u0430\u043D \u0444\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432", { file });
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new ValidationError(`\u0424\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \xAB${file}\xBB: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 JSON`, { error: String(error) });
  }
  const input = record(parsed, "\u0424\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432");
  if (!Array.isArray(input.agents)) {
    throw new ValidationError(`\u0424\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \xAB${file}\xBB: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043C\u0430\u0441\u0441\u0438\u0432 agents`);
  }
  const agents = input.agents.map(normalizeAgent);
  if (!agents.length) throw new ValidationError(`\u0424\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \xAB${file}\xBB: \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u0430\u0433\u0435\u043D\u0442\u0430`);
  const map = /* @__PURE__ */ new Map();
  for (const agent of agents) {
    if (map.has(agent.id)) throw new ValidationError(`\u0424\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \xAB${file}\xBB: \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F id \xAB${agent.id}\xBB`);
    map.set(agent.id, agent);
  }
  log.info("\u0410\u0433\u0435\u043D\u0442\u044B \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B", { file, agents: [...map.keys()] });
  return {
    get: (id) => map.get(id) ?? null,
    ids: () => [...map.keys()]
  };
}

// src/adapters/storage/cursor.ts
function encodeCursor(at, id) {
  return Buffer.from(`${at}\0${id}`, "utf8").toString("base64url");
}
function decodeCursor(cursor) {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const index = decoded.indexOf("\0");
  if (index <= 0) throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u0443\u0440\u0441\u043E\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B");
  const at = decoded.slice(0, index);
  if (Number.isNaN(Date.parse(at))) throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u0443\u0440\u0441\u043E\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B");
  return { at, id: decoded.slice(index + 1) };
}

// src/adapters/storage/sqlite-runs.ts
var COLUMNS = `id, task_id, agent, model, status, attempt, max_attempts, idempotency_key,
  lease_owner, lease_epoch, lease_expires_at, cancel_requested_at, exit_code, error_class,
  error_message, result, not_before, revision, created_at, started_at, finished_at, updated_at`;
var SET = `task_id = ?, agent = ?, model = ?, status = ?, attempt = ?, max_attempts = ?,
  idempotency_key = ?, lease_owner = ?, lease_epoch = ?, lease_expires_at = ?,
  cancel_requested_at = ?, exit_code = ?, error_class = ?, error_message = ?, result = ?,
  not_before = ?, revision = ?, created_at = ?, started_at = ?, finished_at = ?, updated_at = ?`;
function toRun(row) {
  return {
    id: row.id,
    task_id: row.task_id,
    agent: row.agent,
    model: row.model,
    status: row.status,
    attempt: row.attempt,
    max_attempts: row.max_attempts,
    idempotency_key: row.idempotency_key,
    lease_owner: row.lease_owner,
    lease_epoch: row.lease_epoch,
    lease_expires_at: row.lease_expires_at,
    cancel_requested_at: row.cancel_requested_at,
    exit_code: row.exit_code,
    error_class: row.error_class,
    error_message: row.error_message,
    result: row.result,
    not_before: row.not_before,
    revision: row.revision,
    created_at: row.created_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    updated_at: row.updated_at
  };
}
function toEvent(row) {
  return {
    run_id: row.run_id,
    type: row.type,
    actor: row.actor,
    payload: JSON.parse(row.payload),
    created_at: row.created_at
  };
}
function values(run) {
  return [
    run.task_id,
    run.agent,
    run.model,
    run.status,
    run.attempt,
    run.max_attempts,
    run.idempotency_key,
    run.lease_owner,
    run.lease_epoch,
    run.lease_expires_at,
    run.cancel_requested_at,
    run.exit_code,
    run.error_class,
    run.error_message,
    run.result,
    run.not_before,
    run.revision,
    run.created_at,
    run.started_at,
    run.finished_at,
    run.updated_at
  ];
}
var SqliteRunRepository = class {
  #db;
  constructor(db) {
    this.#db = db;
  }
  insert(run, event) {
    return this.#db.transaction(() => {
      const result = this.#db.raw.prepare(`INSERT INTO runs (${COLUMNS}) VALUES (${", ?".repeat(22).slice(1)})
          ON CONFLICT DO NOTHING`).run(run.id, ...values(run));
      if (Number(result.changes) !== 1) return false;
      this.#appendEvent(event);
      return true;
    });
  }
  get(id) {
    const row = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM runs WHERE id = ?`).get(id);
    return row ? toRun(row) : null;
  }
  findByIdempotencyKey(key) {
    const row = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM runs WHERE idempotency_key = ?`).get(key);
    return row ? toRun(row) : null;
  }
  list(query) {
    const where = [];
    const params = [];
    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }
    if (query.agent) {
      where.push("agent = ?");
      params.push(query.agent);
    }
    if (query.task_id) {
      where.push("task_id = ?");
      params.push(query.task_id);
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.push("(created_at < ? OR (created_at = ? AND id < ?))");
      params.push(cursor.at, cursor.at, cursor.id);
    }
    const limit = Math.min(Math.max(query.limit, 1), 200);
    const sql = `SELECT ${COLUMNS} FROM runs
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`;
    const rows = this.#db.raw.prepare(sql).all(...params, limit + 1);
    const items = rows.slice(0, limit).map(toRun);
    const last = items.at(-1);
    return {
      items,
      next_cursor: rows.length > limit && last ? encodeCursor(last.created_at, last.id) : null
    };
  }
  events(runId, limit) {
    const rows = this.#db.raw.prepare("SELECT run_id, type, actor, payload, created_at FROM run_events WHERE run_id = ? ORDER BY seq DESC LIMIT ?").all(runId, Math.min(Math.max(limit, 1), 500));
    return rows.reverse().map(toEvent);
  }
  appendEvent(event) {
    this.#appendEvent(event);
  }
  claimNext(decide, allowedTaskIds, modelFilter = "any") {
    return this.#db.transaction(() => {
      const filter = allowedTaskIds === void 0 ? "" : allowedTaskIds.length === 0 ? " AND 1 = 0" : ` AND task_id IN (${allowedTaskIds.map(() => "?").join(", ")})`;
      const modelFilterSql = modelFilter === "without_model" ? " AND (model IS NULL OR model = '')" : "";
      const row = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM runs
          WHERE status = 'queued'
            AND (not_before IS NULL OR not_before <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))${filter}${modelFilterSql}
          ORDER BY created_at ASC, rowid ASC LIMIT 1`).all(...allowedTaskIds ?? []).at(0);
      if (!row) return null;
      const current = toRun(row);
      const decision = decide(current);
      const result = this.#db.raw.prepare(`UPDATE runs SET ${SET} WHERE id = ? AND status = 'queued' AND revision = ?`).run(...values(decision.run), decision.run.id, current.revision);
      if (Number(result.changes) !== 1) return null;
      this.#appendEvent(decision.event);
      return decision;
    });
  }
  update(next, expectedRevision, event) {
    return this.#db.transaction(() => {
      const result = this.#db.raw.prepare(`UPDATE runs SET ${SET} WHERE id = ? AND revision = ?`).run(...values(next), next.id, expectedRevision);
      if (Number(result.changes) !== 1) return false;
      if (event) this.#appendEvent(event);
      return true;
    });
  }
  updateActiveLease(next, expectedRevision, owner, epoch, now, event) {
    return this.#db.transaction(() => {
      const result = this.#db.raw.prepare(`UPDATE runs SET ${SET}
          WHERE id = ? AND revision = ? AND status = 'running'
            AND lease_owner = ? AND lease_epoch = ? AND lease_expires_at > ?`).run(...values(next), next.id, expectedRevision, owner, epoch, now.toISOString());
      if (Number(result.changes) !== 1) return false;
      if (event) this.#appendEvent(event);
      return true;
    });
  }
  updateExpiredLease(next, expectedRevision, owner, epoch, now, event) {
    return this.#db.transaction(() => {
      const result = this.#db.raw.prepare(`UPDATE runs SET ${SET}
          WHERE id = ? AND revision = ? AND status = 'running'
            AND lease_owner = ? AND lease_epoch = ? AND lease_expires_at <= ?`).run(...values(next), next.id, expectedRevision, owner, epoch, now.toISOString());
      if (Number(result.changes) !== 1) return false;
      this.#appendEvent(event);
      return true;
    });
  }
  listExpired(now, limit) {
    const rows = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM runs
        WHERE status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?
        ORDER BY lease_expires_at ASC LIMIT ?`).all(now.toISOString(), Math.min(Math.max(limit, 1), 500));
    return rows.map(toRun);
  }
  #appendEvent(event) {
    this.#db.raw.prepare("INSERT INTO run_events (run_id, type, actor, payload, created_at) VALUES (?, ?, ?, ?, ?)").run(event.run_id, event.type, event.actor, JSON.stringify(event.payload), event.created_at);
  }
};

// src/app/export-format.ts
function csv(rows, columns) {
  const cell = (value) => {
    let text2 = value === null || value === void 0 ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text2)) text2 = `'${text2}`;
    return `"${text2.replace(/"/g, '""')}"`;
  };
  const lines = [columns.map(cell).join(";"), ...rows.map((row) => columns.map((column) => cell(row[column])).join(";"))];
  return `\uFEFF${lines.join("\r\n")}\r
`;
}
function downloadHeaders(name, format) {
  const extension = format === "csv" ? "csv" : "json";
  return {
    "content-disposition": `attachment; filename="${name}.${extension}"`,
    "cache-control": "no-store"
  };
}

// src/modules/runs/schema.ts
var runsMigrations = [
  {
    version: "runs/0001_runs",
    sql: `
      CREATE TABLE runs (
        id TEXT PRIMARY KEY,
        -- \u041C\u044F\u0433\u043A\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443: \u0447\u0443\u0436\u0443\u044E \u0441\u0445\u0435\u043C\u0443 \u0432\u043D\u0435\u0448\u043D\u0438\u043C \u043A\u043B\u044E\u0447\u043E\u043C \u043D\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u043C.
        task_id TEXT,
        agent TEXT NOT NULL,
        model TEXT,
        status TEXT NOT NULL,
        attempt INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        idempotency_key TEXT,
        lease_owner TEXT,
        lease_epoch INTEGER NOT NULL DEFAULT 0,
        lease_expires_at TEXT,
        cancel_requested_at TEXT,
        exit_code INTEGER,
        error_class TEXT,
        error_message TEXT,
        result TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT,
        updated_at TEXT NOT NULL
      );

      -- \u041F\u043E\u0432\u0442\u043E\u0440 \u0441 \u0442\u0435\u043C \u0436\u0435 \u043A\u043B\u044E\u0447\u043E\u043C \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u0437\u0430\u043F\u0443\u0441\u043A, \u0430 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0432\u0442\u043E\u0440\u043E\u0439.
      CREATE UNIQUE INDEX runs_idempotency ON runs (idempotency_key)
        WHERE idempotency_key IS NOT NULL;
      CREATE INDEX runs_queue ON runs (status, created_at);
      CREATE INDEX runs_lease ON runs (status, lease_expires_at);
      CREATE INDEX runs_agent ON runs (agent, created_at);

      CREATE TABLE run_events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX run_events_run ON run_events (run_id, seq);
    `
  },
  {
    // Повтор после инфраструктурного сбоя не выдаётся раньше сброса квоты;
    // NULL — обычный запуск без задержки.
    version: "runs/0002_not_before",
    sql: `
      ALTER TABLE runs ADD COLUMN not_before TEXT;
      CREATE INDEX runs_ready ON runs (status, not_before, created_at);
    `
  }
];

// src/modules/agents/schema.ts
var agentsMigrations = [
  {
    // Пауза участника после инфраструктурного сбоя переживает перезапуск:
    // иначе новая квота снова уйдёт тому же недоступному агенту.
    version: "agents/0001_availability",
    sql: `
      CREATE TABLE agent_availability (
        agent TEXT PRIMARY KEY,
        until TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT '',
        strikes INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX agent_availability_until ON agent_availability (until);
    `
  }
];

// modules/runs/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0417\u0430\u043F\u0443\u0441\u043A\u0438 \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { display: grid; gap: 20px; grid-template-columns: minmax(280px, 360px) 1fr; padding: 24px; align-items: start; }
  @media (max-width: 900px) { main { grid-template-columns: 1fr; } }
  section { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  label { display: grid; gap: 4px; font-size: 13px; color: #aab4c5; margin-bottom: 10px; }
  input, select, button { font: inherit; }
  input, select { background: #0f1216; color: inherit; border: 1px solid #2b3240; border-radius: 8px; padding: 8px 10px; }
  button { background: #2d5bff; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  button.ghost { background: #222a36; color: #cbd4e1; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  li { border: 1px solid #232833; border-radius: 10px; padding: 12px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .id { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: #cbd4e1; }
  .meta { color: #7f8a9c; font-size: 12px; white-space: pre-wrap; }
  .status { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: #222a36; }
  .status-running { background: #24304a; color: #a8c5ff; }
  .status-succeeded { background: #1d3a2a; color: #8be0ab; }
  .status-failed { background: #3a2426; color: #ff9a9a; }
  .error { color: #ff9a9a; font-size: 13px; min-height: 18px; }
  .empty { color: #7f8a9c; }
</style>
</head>
<body>
<header>
  <h1>\u0417\u0430\u043F\u0443\u0441\u043A\u0438</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
  <a href="/api/runs/export?format=json">\u044D\u043A\u0441\u043F\u043E\u0440\u0442</a>
</header>
<main>
  <section>
    <h2>\u041F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C</h2>
    <form id="create">
      <label>\u0410\u0433\u0435\u043D\u0442<select name="agent" id="agent" required></select></label>
      <label>\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430<input name="task_id" maxlength="100" placeholder="\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E"></label>
      <label>\u041C\u043E\u0434\u0435\u043B\u044C<input name="model" maxlength="100" placeholder="\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E"></label>
      <label>\u041F\u043E\u043F\u044B\u0442\u043E\u043A<input name="max_attempts" type="number" min="1" max="10" value="3"></label>
      <button type="submit">\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C</button>
      <p class="error" id="create-error"></p>
    </form>
  </section>
  <section>
    <h2>\u041E\u0447\u0435\u0440\u0435\u0434\u044C <span class="meta" id="count"></span></h2>
    <ul id="list"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
  </section>
</main>
<script>
(function () {
  var list = document.getElementById('list');
  var count = document.getElementById('count');
  var createError = document.getElementById('create-error');
  var select = document.getElementById('agent');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function request(path, options) {
    return fetch(path, options).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error((body.error && body.error.message) || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430');
        return body;
      });
    });
  }

  function loadAgents() {
    return request('/api/agents').then(function (body) {
      select.textContent = '';
      var agents = body.agents || [];
      if (!agents.length) {
        select.appendChild(el('option', '', '\u041D\u0435\u0442 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0445 \u0430\u0433\u0435\u043D\u0442\u043E\u0432'));
        select.disabled = true;
        return;
      }
      agents.forEach(function (agent) {
        var option = el('option', '', agent.id);
        option.value = agent.id;
        select.appendChild(option);
      });
      if (body.default) select.value = body.default;
    }).catch(function (error) {
      createError.textContent = error.message;
    });
  }

  function action(run, name) {
    return request('/api/runs/' + encodeURIComponent(run.id) + '/' + name, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actor: 'module-runs' })
    }).then(load);
  }

  function show(run) {
    var item = el('li');
    var row = el('div', 'row');
    row.appendChild(el('span', 'id', run.id));
    row.appendChild(el('span', 'status status-' + run.status, run.status));
    row.appendChild(el('span', 'meta', run.agent + (run.model ? ' \xB7 ' + run.model : '')));
    if (run.attempt) row.appendChild(el('span', 'meta', '\u043F\u043E\u043F\u044B\u0442\u043A\u0430 ' + run.attempt + '/' + run.max_attempts));
    item.appendChild(row);
    item.appendChild(el('div', 'meta', run.task_id ? '\u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 ' + run.task_id : '\u0431\u0435\u0437 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438'));
    if (run.error_message) item.appendChild(el('div', 'meta', run.error_class + ': ' + run.error_message));

    var actions = el('div', 'row');
    if (run.status === 'queued' || run.status === 'running') {
      var cancel = el('button', 'ghost', '\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C');
      cancel.type = 'button';
      cancel.addEventListener('click', function () {
        cancel.disabled = true;
        action(run, 'cancel').catch(function (error) {
          cancel.disabled = false;
          alert(error.message);
        });
      });
      actions.appendChild(cancel);
    }
    if (run.status === 'failed' || run.status === 'cancelled') {
      var retry = el('button', 'ghost', '\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C');
      retry.type = 'button';
      retry.addEventListener('click', function () {
        retry.disabled = true;
        action(run, 'retry').catch(function (error) {
          retry.disabled = false;
          alert(error.message);
        });
      });
      actions.appendChild(retry);
    }
    if (actions.childNodes.length) item.appendChild(actions);
    return item;
  }

  function load() {
    return request('/api/runs?limit=50').then(function (page) {
      list.textContent = '';
      var items = page.items || [];
      count.textContent = '\xB7 ' + (page.total === undefined ? items.length : page.total);
      if (!items.length) {
        list.appendChild(el('li', 'empty', '\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u043F\u0443\u0441\u0442\u0430'));
        return;
      }
      items.forEach(function (run) { list.appendChild(show(run)); });
    }).catch(function (error) {
      list.textContent = '';
      list.appendChild(el('li', 'empty', error.message));
    });
  }

  document.getElementById('create').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    var data = new FormData(form);
    var payload = {
      agent: data.get('agent'),
      max_attempts: Number(data.get('max_attempts') || 3)
    };
    var task = data.get('task_id');
    var model = data.get('model');
    if (task) payload.task_id = task;
    if (model) payload.model = model;
    createError.textContent = '';
    request('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function () {
      form.reset();
      return load();
    }).catch(function (error) {
      createError.textContent = error.message;
    });
  });

  loadAgents();
  load();
  setInterval(load, 5000);
})();
</script>
</body>
</html>
`;

// modules/runs/index.ts
var module = {
  id: "runs",
  apiVersion: 1,
  migrations: [...runsMigrations, ...agentsMigrations],
  register(ctx) {
    const availability = new AgentAvailability(ctx.storage, ctx.log);
    const runs = new RunService(new SqliteRunRepository(ctx.storage), ctx.bus, systemClock, ctx.log, {
      defaultLeaseMs: ctx.settings.executor.leaseMs
    });
    const shared = ctx.settings.executorHandle?.() ?? null;
    let executor = shared;
    if (!executor && ctx.settings.executor.enabled) {
      executor = new AgentExecutor(runs, loadAgentRegistry(ctx.settings.executor.agentsFile, ctx.log), ctx.log, {
        owner: `executor-${process.pid}`,
        intervalMs: ctx.settings.executor.intervalMs,
        leaseMs: ctx.settings.executor.leaseMs
      });
      ctx.onShutdown(async () => {
        await executor?.stop();
      });
    }
    ctx.publish({ runs, executor, availability });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.api.add("GET", "/api/agents", () => {
      const agents = executor?.list() ?? [];
      return { body: { ok: true, agents, default: agents[0]?.id ?? null } };
    });
    ctx.api.add("GET", "/api/agents/availability", () => ({
      body: { ok: true, agents: availability.list() }
    }));
    ctx.api.add("POST", "/api/agents/:id/resume", (request) => ({
      body: {
        ok: true,
        cleared: availability.clear(request.params.id ?? ""),
        agents: availability.list()
      }
    }));
    ctx.api.add("POST", "/api/runs", (request) => {
      const result = runs.create(request.body);
      return { status: result.deduplicated ? 200 : 201, body: result };
    });
    ctx.api.add("GET", "/api/runs", (request) => {
      const query = Object.fromEntries(request.query.entries());
      return { body: runs.list(query) };
    });
    ctx.api.add("GET", "/api/runs/export", (request) => {
      const format = request.query.get("format") === "csv" ? "csv" : "json";
      const items = runs.exportAll();
      const rows = items.map((run) => ({
        id: run.id,
        task_id: run.task_id ?? "",
        agent: run.agent,
        model: run.model ?? "",
        status: run.status,
        attempt: run.attempt,
        max_attempts: run.max_attempts,
        exit_code: run.exit_code ?? "",
        error_class: run.error_class ?? "",
        error_message: run.error_message ?? "",
        result: run.result ?? "",
        created_at: run.created_at,
        started_at: run.started_at ?? "",
        finished_at: run.finished_at ?? ""
      }));
      return {
        raw: format === "csv" ? csv(rows, ["id", "task_id", "agent", "model", "status", "attempt", "max_attempts", "exit_code", "error_class", "error_message", "result", "created_at", "started_at", "finished_at"]) : JSON.stringify({ exported_at: (/* @__PURE__ */ new Date()).toISOString(), count: items.length, runs: items }, null, 2),
        headers: downloadHeaders("team-runs", format)
      };
    });
    ctx.api.add("POST", "/api/runs/claim", (request) => ({
      body: { run: runs.claimNext(request.body) }
    }));
    ctx.api.add("GET", "/api/runs/:id", (request) => ({
      body: runs.get(request.params.id ?? "")
    }));
    ctx.api.add("POST", "/api/runs/:id/heartbeat", (request) => ({
      body: { run: runs.heartbeat(request.params.id ?? "", request.body) }
    }));
    ctx.api.add("POST", "/api/runs/:id/complete", (request) => ({
      body: { run: runs.complete(request.params.id ?? "", request.body) }
    }));
    ctx.api.add("POST", "/api/runs/:id/cancel", (request) => ({
      body: runs.cancel(request.params.id ?? "", request.body)
    }));
    ctx.api.add("POST", "/api/runs/:id/retry", (request) => ({
      status: 201,
      body: runs.retry(request.params.id ?? "")
    }));
    if (ctx.settings.watchdogIntervalMs > 0 && !shared) {
      const watchdog = new RunWatchdog(runs, ctx.log, ctx.settings.watchdogIntervalMs);
      watchdog.start();
      ctx.onShutdown(() => watchdog.stop());
    }
    executor?.start();
  }
};
var index_default = module;
export {
  index_default as default
};
