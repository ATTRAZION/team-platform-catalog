import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/adapters/http/router.ts
var Router = class {
  #routes = [];
  #mounts = [];
  add(method, path, handler) {
    this.#routes.push({
      method: method.toUpperCase(),
      segments: path.split("/").filter(Boolean),
      handler
    });
    return this;
  }
  get routes() {
    return this.#routes.length;
  }
  /**
   * Подключить чужой роутер под префиксом: пути внутри него считаются
   * относительными. Так модуль получает `/m/<id>/…` и не спорит с ядром
   * за общие адреса.
   */
  mount(prefix, router) {
    this.#mounts.push({ segments: prefix.split("/").filter(Boolean), router });
    return this;
  }
  /** Снять все вложенные роутеры: нужна при перезагрузке модулей. */
  clearMounts() {
    this.#mounts.length = 0;
    return this;
  }
  match(method, pathname) {
    const root = this.#matchMount(method, pathname, true);
    if (root) return root;
    const own = this.#matchRoute(method, pathname);
    if (own) return own;
    return this.#matchMount(method, pathname, false);
  }
  #matchMount(method, pathname, rootOnly) {
    const parts = pathname.split("/").filter(Boolean);
    for (const mount of this.#mounts) {
      if (rootOnly !== (mount.segments.length === 0)) continue;
      if (mount.segments.length > parts.length) continue;
      const params = {};
      let matched = true;
      for (let i = 0; i < mount.segments.length; i += 1) {
        const expected = mount.segments[i];
        const actual = parts[i];
        if (expected.startsWith(":")) {
          params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;
      const rest = parts.slice(mount.segments.length).join("/");
      const inner = mount.router.match(method, `/${rest}`);
      if (inner) return { handler: inner.handler, params: { ...params, ...inner.params } };
    }
    return null;
  }
  #matchRoute(method, pathname) {
    const parts = pathname.split("/").filter(Boolean);
    for (const route of this.#routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.segments.length !== parts.length) continue;
      const params = {};
      let matched = true;
      for (let i = 0; i < route.segments.length; i += 1) {
        const expected = route.segments[i];
        const actual = parts[i];
        if (expected.startsWith(":")) {
          params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
          matched = false;
          break;
        }
      }
      if (matched) return { handler: route.handler, params };
    }
    return null;
  }
};
var ScopedRouter = class extends Router {
  #prefixes;
  #mode;
  constructor(prefixes, mode = "allow") {
    super();
    this.#prefixes = prefixes.map((prefix) => prefix.replace(/\/+$/, ""));
    this.#mode = mode;
  }
  #matches(pathname) {
    return this.#prefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  }
  match(method, pathname) {
    const matched = this.#matches(pathname);
    if (this.#mode === "allow" ? !matched : matched) return null;
    return super.match(method, pathname);
  }
};

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

// src/modules/tools/tools.module.ts
function stringField(body, name, required = true) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (value === void 0 || value === null) {
    if (required) throw new ValidationError(`\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 ${name}`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  return value;
}
function boolField(body, name) {
  const value = body && typeof body === "object" ? body[name] : void 0;
  if (typeof value !== "boolean") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C boolean`);
  return value;
}
function numberParam(raw, fallback, min, max) {
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return value;
}
function registerToolsRoutes(router, deps) {
  const { tools, toolbox, entire } = deps;
  router.add("GET", "/api/tools", async (c) => ({
    body: { ok: true, ...await tools.catalog(c.query.get("refresh") === "1") }
  }));
  router.add("GET", "/api/tools/telegram/status", async () => ({
    body: { ok: true, status: await tools.telegramSnapshot() }
  }));
  router.add("POST", "/api/tools/telegram/configure", (c) => {
    const body = c.body && typeof c.body === "object" ? c.body : {};
    const input = { ...body };
    for (const key of ["owners", "contacts", "groups"]) {
      if (typeof input[key] === "string") input[key] = input[key].split(/[\s,]+/).filter(Boolean);
    }
    return { body: { ok: true, status: tools.configureTelegram(input) } };
  });
  router.add("POST", "/api/tools/telegram/login", async (c) => ({
    body: { ok: true, status: await tools.beginTelegramLogin(stringField(c.body, "phone")) }
  }));
  router.add("GET", "/api/tools/telegram/auth-status", async () => ({
    body: { ok: true, status: await tools.telegramSnapshot() }
  }));
  router.add("POST", "/api/tools/telegram/code", (c) => ({
    body: { ok: true, status: tools.submitTelegramCode(stringField(c.body, "code")) }
  }));
  router.add("POST", "/api/tools/telegram/password", (c) => ({
    body: { ok: true, status: tools.submitTelegramPassword(stringField(c.body, "password")) }
  }));
  router.add("POST", "/api/tools/telegram/cancel-login", async () => ({
    body: { ok: true, status: await tools.cancelTelegramLogin() }
  }));
  router.add("POST", "/api/tools/telegram/check", async () => ({
    body: { ok: true, status: await tools.checkTelegram() }
  }));
  router.add("POST", "/api/tools/telegram/send", async (c) => ({
    body: { ok: true, ...await tools.sendTelegram(stringField(c.body, "chat"), stringField(c.body, "text")) }
  }));
  router.add("POST", "/api/tools/telegram/logout", async () => ({
    body: { ok: true, status: await tools.logoutTelegram() }
  }));
  router.add("GET", "/api/tools/entire", async () => ({
    body: {
      ok: true,
      status: await toolbox.entireStatus(),
      sync: entire.overview()
    }
  }));
  router.add("POST", "/api/tools/entire/sync", () => ({
    status: 202,
    body: { ok: true, sync: entire.startSync() }
  }));
  router.add("PUT", "/api/tools/entire/settings", (c) => ({
    body: { ok: true, sync: entire.configure(c.body) }
  }));
  router.add("GET", "/api/tools/freebuff", async () => ({
    body: { ok: true, status: await toolbox.freebuffStatus() }
  }));
  router.add("GET", "/api/tools/freebuff/models", async () => ({
    body: { ok: true, models: await toolbox.freebuffModels() }
  }));
  router.add("POST", "/api/tools/freebuff/chat", async (c) => ({
    body: { ok: true, result: await toolbox.freebuffChat(c.body) }
  }));
  router.add("GET", "/api/tools/reserve", () => ({
    body: { ok: true, state: toolbox.reserve() }
  }));
  router.add("PUT", "/api/tools/reserve", (c) => ({
    body: { ok: true, state: toolbox.configureReserve(c.body) }
  }));
  router.add("POST", "/api/tools/reserve/items", (c) => ({
    body: { ok: true, state: toolbox.addReserve(stringField(c.body, "task_id")) }
  }));
  router.add("DELETE", "/api/tools/reserve/items/:task", (c) => ({
    body: { ok: true, state: toolbox.removeReserve(c.params.task ?? "") }
  }));
  router.add("GET", "/api/tools/spare", () => ({
    body: { ok: true, state: toolbox.spare() }
  }));
  router.add("PUT", "/api/tools/spare", (c) => ({
    body: { ok: true, state: toolbox.configureSpare(c.body) }
  }));
  router.add("POST", "/api/tools/spare/override", (c) => ({
    body: { ok: true, state: toolbox.setSpareOverride(c.body) }
  }));
  router.add("GET", "/api/tools/providers/guard", () => ({
    body: { ok: true, state: toolbox.providerGuard() }
  }));
  router.add("PUT", "/api/tools/providers/guard", (c) => ({
    body: { ok: true, state: toolbox.configureProviderGuard(c.body) }
  }));
  router.add("POST", "/api/tools/providers/configure", (c) => ({
    body: {
      ok: true,
      settings: tools.configureProvider(stringField(c.body, "id"), stringField(c.body, "key", false))
    }
  }));
  router.add("POST", "/api/tools/sites/configure", (c) => {
    const site = stringField(c.body, "site").trim().toLowerCase();
    const fields = c.body && typeof c.body === "object" ? c.body.fields : void 0;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043E\u0431\u044A\u0435\u043A\u0442 fields \u0441 \u043F\u043E\u043B\u044F\u043C\u0438 \u0441\u0430\u0439\u0442\u0430");
    }
    const values = {};
    for (const [name, value] of Object.entries(fields)) {
      if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 ${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
      values[name] = value;
    }
    if (!Object.keys(values).length) throw new ValidationError("\u041D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043E \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044F \u0441\u0430\u0439\u0442\u0430");
    return { body: { ok: true, settings: tools.configureSite(site, values) } };
  });
  router.add("POST", "/api/tools/:id/configure", (c) => ({
    body: { ok: true, settings: tools.configure(c.params.id ?? "", c.body) }
  }));
  router.add("POST", "/api/tools/:id/test", async (c) => ({
    body: { ok: true, status: await tools.test(c.params.id ?? "") }
  }));
  router.add("POST", "/api/tools/github/accounts/active", (c) => ({
    body: { ok: true, settings: tools.setGithubAccount(stringField(c.body, "login")) }
  }));
  router.add("GET", "/api/tools/vault", () => ({
    body: { ok: true, ...tools.vault() }
  }));
  router.add("DELETE", "/api/tools/sites/:site", (c) => ({
    body: { ok: true, settings: tools.removeSite(c.params.site ?? "") }
  }));
  router.add("GET", "/api/tools/agents", () => ({
    body: { ok: true, ...tools.agents() }
  }));
  router.add("GET", "/api/tools/github/pulls", async (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    const state = c.query.get("state");
    if (state && !["open", "closed", "all"].includes(state)) {
      throw new ValidationError("state: open, closed \u0438\u043B\u0438 all");
    }
    return {
      body: {
        ok: true,
        pulls: await tools.pulls(
          repo,
          state ?? "open",
          numberParam(c.query.get("limit"), 20, 1, 100)
        )
      }
    };
  });
  router.add("GET", "/api/tools/github/pulls/:number", async (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    const number = Number(c.params.number);
    if (!Number.isInteger(number) || number < 1) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043D\u043E\u043C\u0435\u0440 PR");
    return { body: { ok: true, pull: await tools.pull(repo, number) } };
  });
  router.add("POST", "/api/tools/github/pulls", async (c) => ({
    body: {
      ok: true,
      pull: await tools.createPull(stringField(c.body, "repo"), {
        title: stringField(c.body, "title"),
        head: stringField(c.body, "head"),
        base: stringField(c.body, "base"),
        body: stringField(c.body, "body", false),
        draft: c.body && typeof c.body === "object" ? c.body.draft === true : false
      })
    }
  }));
  router.add("GET", "/api/tools/github/repos", async (c) => ({
    body: {
      ok: true,
      repos: await tools.repos(numberParam(c.query.get("limit"), 20, 1, 100))
    }
  }));
  router.add("GET", "/api/tools/github/issues", async (c) => {
    const repo = c.query.get("repo") ?? "";
    if (!repo) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 repo (owner/name)");
    return {
      body: { ok: true, issues: await tools.issues(repo, numberParam(c.query.get("limit"), 20, 1, 100)) }
    };
  });
  router.add("POST", "/api/tools/github/issues", async (c) => ({
    body: {
      ok: true,
      issue: await tools.createIssue(
        stringField(c.body, "repo"),
        stringField(c.body, "title"),
        stringField(c.body, "body", false)
      )
    }
  }));
  router.add("GET", "/api/tools/discord/status", () => ({
    body: { ok: true, status: tools.discordStatus() }
  }));
  router.add("POST", "/api/tools/discord/bot", async (c) => ({
    body: { ok: true, status: await tools.configureDiscordBot(boolField(c.body, "enabled")) }
  }));
  router.add("POST", "/api/tools/discord/bot/check", async () => ({
    body: { ok: true, status: await tools.checkDiscordBot() }
  }));
  router.add("POST", "/api/tools/discord/presence", async (c) => ({
    body: { ok: true, status: await tools.setDiscordPresence(boolField(c.body, "enabled")) }
  }));
  router.add("GET", "/api/tools/discord/personal", async () => ({
    body: { ok: true, channels: await tools.personalChannels() }
  }));
  router.add("POST", "/api/tools/discord/personal/send", async (c) => ({
    body: {
      ok: true,
      ...await tools.sendPersonal(
        stringField(c.body, "channel_id"),
        stringField(c.body, "content")
      )
    }
  }));
  router.add("GET", "/api/tools/discord/guilds", async () => ({
    body: { ok: true, guilds: await tools.guilds() }
  }));
  router.add("GET", "/api/tools/discord/channels", async (c) => ({
    body: {
      ok: true,
      channels: await tools.channels(c.query.get("guild") ?? "")
    }
  }));
  router.add("POST", "/api/tools/discord/send", async (c) => ({
    body: { ok: true, ...await tools.sendDiscord(stringField(c.body, "content")) }
  }));
  router.add("POST", "/api/tools/discord/test-send", async () => ({
    body: { ok: true, ...await tools.sendDiscordTest() }
  }));
  router.add("POST", "/api/tools/discord/file", async (c) => {
    const name = stringField(c.body, "name");
    const encoded = stringField(c.body, "data");
    if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new ValidationError("\u041F\u043E\u043B\u0435 data \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C base64");
    }
    if (encoded.length > 36e6) throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 25 \u041C\u0411");
    const data = Buffer.from(encoded, "base64");
    if (data.toString("base64") !== encoded || data.byteLength > 25 * 1024 * 1024) {
      throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u043B\u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0444\u0430\u0439\u043B");
    }
    return {
      body: {
        ok: true,
        ...await tools.sendDiscordFile(name, data, stringField(c.body, "text", false))
      }
    };
  });
  router.add("GET", "/api/tools/google/calendar", async (c) => ({
    body: {
      ok: true,
      events: await tools.calendar(numberParam(c.query.get("days"), 7, 1, 30))
    }
  }));
  router.add("GET", "/api/tools/google/mail", async (c) => ({
    body: {
      ok: true,
      messages: await tools.mail(numberParam(c.query.get("limit"), 10, 1, 20))
    }
  }));
  router.add("GET", "/api/tools/google/drive", async (c) => ({
    body: {
      ok: true,
      files: await tools.drive(numberParam(c.query.get("limit"), 10, 1, 20))
    }
  }));
}

// src/modules/tools/integration-page.ts
function integrationPage(title, summary) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  main { max-width: 720px; padding: 28px 24px; display: grid; gap: 16px; }
  h1 { margin: 0; font-size: 22px; }
  p { margin: 0; color: #aab4c5; }
  a { color: #8fb4ff; }
  .links { display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; }
  .card { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
</style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p>${summary}</p>
  <div class="card">
    <p>\u041C\u043E\u0434\u0443\u043B\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D. \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u2014 \u0432 \u043E\u0431\u0449\u0435\u043C \u043C\u043E\u0434\u0443\u043B\u0435 \xAB\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B\xBB.</p>
  </div>
  <div class="links">
    <a href="/m/tools/">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B</a>
    <a href="/">\u041A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443</a>
  </div>
</main>
</body>
</html>`;
}

// modules/google/index.ts
var module = {
  id: "google",
  apiVersion: 1,
  register(ctx) {
    const host = ctx.require("tools");
    host.tools.enable("google");
    const api = new ScopedRouter(["/api/tools/google"]);
    registerToolsRoutes(api, host);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: integrationPage(
        "Google",
        "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C, \u043F\u043E\u0447\u0442\u0430 \u0438 Drive \u0447\u0435\u0440\u0435\u0437 OAuth-\u0442\u043E\u043A\u0435\u043D\u044B Google."
      ),
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
