import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

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
  constructor(message, details = {}, options = {}) {
    super(options.code ?? "validation_failed", message, options.status ?? 400, details);
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
var FIELDS = {
  github: [
    { name: "token", label: "Personal access token", type: "password", placeholder: "ghp_\u2026 (\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C)" },
    { name: "owner", label: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 / \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0446\u0438\u044F", placeholder: "\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, ATTRAZION" }
  ],
  discord: [
    { name: "bot_token", label: "\u0422\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430", type: "password", placeholder: "\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C" },
    { name: "webhook_url", label: "URL \u0432\u0435\u0431\u0445\u0443\u043A\u0430", type: "password", placeholder: "https://discord.com/api/webhooks/\u2026" },
    { name: "channel_id", label: "ID \u043A\u0430\u043D\u0430\u043B\u0430 \u0431\u043E\u0442\u0430", placeholder: "1234567890" },
    { name: "application_id", label: "Application ID (Rich Presence)", placeholder: "1234567890" },
    { name: "user_token", label: "\u0422\u043E\u043A\u0435\u043D \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430", type: "password", placeholder: "\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C" }
  ],
  google: [
    { name: "client_id", label: "OAuth client_id", placeholder: "\u2026apps.googleusercontent.com" },
    { name: "client_secret", label: "client_secret", type: "password", placeholder: "\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C" },
    { name: "refresh_token", label: "refresh_token", type: "password", placeholder: "\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C" }
  ],
  telegram: [
    { name: "api_id", label: "api_id", type: "number", placeholder: "\u0441 my.telegram.org" },
    { name: "api_hash", label: "api_hash", type: "password", placeholder: "\u043F\u0443\u0441\u0442\u043E \u2014 \u043D\u0435 \u043C\u0435\u043D\u044F\u0442\u044C" },
    {
      name: "mode",
      label: "\u0420\u0435\u0436\u0438\u043C",
      type: "select",
      options: [
        { value: "off", label: "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D" },
        { value: "watch", label: "\u041D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435" },
        { value: "answer", label: "\u041F\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0443 \u0438 \u043E\u0442\u0432\u0435\u0447\u0430\u0442\u044C" }
      ]
    }
  ],
  entire: [
    { name: "repo_path", label: "\u041F\u0443\u0442\u044C \u043A \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044E", placeholder: "D:\\work\\project" },
    { name: "cli_path", label: "\u041F\u0443\u0442\u044C \u043A Entire CLI", placeholder: "entire" }
  ],
  freebuff: []
};
function fieldHtml(field) {
  const id = "field-" + field.name;
  const label = `<label for="${id}">${field.label}</label>`;
  if (field.type === "select") {
    return `<div class="field">${label}<select id="${id}" name="${field.name}">` + (field.options ?? []).map((option) => `<option value="${option.value}">${option.label}</option>`).join("") + "</select></div>";
  }
  const type = field.type === "password" ? "password" : field.type === "number" ? "number" : "text";
  return `<div class="field">${label}<input id="${id}" name="${field.name}" type="${type}"` + (field.placeholder ? ` placeholder="${field.placeholder}"` : "") + ' autocomplete="off"></div>';
}
function integrationPage(id, title, summary) {
  const fields = FIELDS[id] ?? [];
  const description = `${summary} \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u2014 \u0432 \u044D\u0442\u043E\u043C \u043C\u043E\u0434\u0443\u043B\u0435.`;
  const form = fields.length ? `<form id="settings" class="settings">${fields.map(fieldHtml).join("")}<div class="actions"><button type="submit">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button><button id="check" class="ghost" type="button">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</button></div></form>` : '<p class="hint">\u041A\u043B\u044E\u0447 Freebuff \u0437\u0430\u0434\u0430\u0451\u0442\u0441\u044F \u0432 \u043C\u043E\u0434\u0443\u043B\u0435 \xAB\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B\xBB. \u0417\u0434\u0435\u0441\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0441\u0442\u0430\u0442\u0443\u0441, \u043C\u043E\u0434\u0435\u043B\u0438 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430.</p><div class="actions"><button id="check" class="ghost" type="button">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</button><a class="button ghost" href="/m/providers/">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432</a></div>';
  const extras = {
    github: '<section class="card"><h2>\u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0438</h2><div class="actions"><button id="github-repos" class="ghost" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0438</button></div><ul id="repos"></ul></section>',
    discord: '<section class="card"><h2>\u041C\u043E\u0441\u0442 Discord</h2><div class="actions"><button id="discord-presence" class="ghost" type="button">Presence</button><button id="discord-bot" class="ghost" type="button">\u0411\u043E\u0442-\u043A\u043E\u043C\u0430\u043D\u0434\u044B</button><button id="discord-test" class="ghost" type="button">\u0422\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435</button></div><p id="discord-state" class="hint"></p></section>',
    google: '<section class="card"><h2>\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C</h2><div class="actions"><button id="google-calendar" class="ghost" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F</button></div><ul id="calendar"></ul></section>',
    telegram: '<section class="card"><h2>\u0412\u0445\u043E\u0434 \u0432 Telegram</h2><div id="telegram-state" class="hint">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</div><div id="telegram-auth"></div></section>',
    entire: '<section class="card"><h2>\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F</h2><p id="entire-state" class="hint">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</p><div class="actions"><button id="entire-sync" class="ghost" type="button">\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E</button></div></section>',
    freebuff: '<section class="card"><h2>\u041C\u043E\u0434\u0435\u043B\u0438</h2><div class="actions"><button id="freebuff-models" class="ghost" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u043E\u0434\u0435\u043B\u0435\u0439</button></div><ul id="models"></ul></section>'
  };
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 20px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { display: grid; gap: 18px; padding: 24px; max-width: 820px; }
  .card { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 10px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  .lead { margin: 0 0 8px; color: #aab4c5; }
  .status { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
  .state { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #222a36; color: #aab4c5; }
  .state-ok { background: #1d3a2a; color: #8be0ab; }
  .state-error { background: #3a2426; color: #ff9a9a; }
  .state-setup { background: #3a3320; color: #e8ce8b; }
  .settings { display: grid; gap: 12px; }
  .field { display: grid; gap: 4px; font-size: 13px; color: #aab4c5; }
  input, select { width: 100%; background: #0f1216; color: inherit; border: 1px solid #2b3240; border-radius: 8px; padding: 8px 10px; font: inherit; }
  .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
  button, .button { background: #2d5bff; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; font: inherit; font-size: 13px; text-decoration: none; display: inline-block; }
  button.ghost, .button.ghost { background: #222a36; color: #cbd4e1; }
  button.danger { background: transparent; border: 1px solid rgba(255,107,107,.4); color: #ff9a9a; }
  button:disabled { opacity: .6; cursor: default; }
  .hint { color: #7f8a9c; font-size: 12px; margin: 6px 0; white-space: pre-wrap; }
  ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
  li { border: 1px solid #232833; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
  .result { min-height: 20px; font-size: 13px; }
  .result-ok { color: #8be0ab; }
  .result-error { color: #ff9a9a; }
  code { color: #cbd4e1; }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <a href="/m/tools/">\u2190 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B</a>
  <a href="/">\u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <section class="card">
    <p class="lead">${description}</p>
    <div class="status"><span id="status" class="state">\u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u2026</span><span id="status-detail" class="hint"></span></div>
    ${form}
    <p id="result" class="result"></p>
  </section>
  ${extras[id] ?? ""}
</main>
<script>
(function () {
  var ID = ${JSON.stringify(id)};
  var state = { catalog: null, telegram: null, entire: null, freebuff: null, discord: null };
  var statusNode = document.getElementById('status');
  var detailNode = document.getElementById('status-detail');
  var resultNode = document.getElementById('result');

  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function request(path, options) {
    options = options || {};
    return fetch(path, {
      method: options.method || 'GET',
      headers: { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store'
    }).then(function (response) {
      return response.text().then(function (text) {
        var body = null;
        try { body = text ? JSON.parse(text) : null; } catch (ignore) { body = null; }
        if (!response.ok) throw new Error(body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status);
        return body;
      });
    });
  }
  function result(text, ok) {
    resultNode.textContent = text || '';
    resultNode.className = 'result ' + (ok ? 'result-ok' : 'result-error');
  }
  function setStatus(stateName, detail) {
    statusNode.textContent = stateName;
    statusNode.className = 'state ' + (stateName === 'ok' || stateName === '\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E' ? 'state-ok' : stateName === '\u043E\u0448\u0438\u0431\u043A\u0430' ? 'state-error' : 'state-setup');
    detailNode.textContent = detail || '';
  }
  function renderStatus() {
    var settings = state.catalog && state.catalog.settings ? state.catalog.settings[ID] : null;
    if (ID === 'entire') {
      var entire = state.entire || {};
      var sync = entire.sync || {};
      setStatus(sync.configured ? '\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E' : '\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E', sync.configured ? '\u0441\u0435\u0441\u0441\u0438\u0439: ' + (sync.total_sessions || 0) : '\u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0438 CLI');
      var node = document.getElementById('entire-state');
      if (node) node.textContent = '\u0421\u0435\u0441\u0441\u0438\u0439: ' + (sync.total_sessions || 0) + ' \xB7 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F: ' + (sync.last_sync || '\u2014');
      return;
    }
    if (ID === 'freebuff') {
      var freebuff = state.freebuff || {};
      var status = freebuff.status || {};
      setStatus(status.configured ? '\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E' : '\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E', status.model || '');
      return;
    }
    if (ID === 'telegram') {
      var telegram = state.telegram || {};
      var account = telegram.account ? (telegram.account.name || telegram.account.username || telegram.account.id) : '';
      setStatus(telegram.logged_in ? '\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E' : '\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E', account ? '\u0430\u043A\u043A\u0430\u0443\u043D\u0442: ' + account : (telegram.auth_hint || '\u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0445\u043E\u0434'));
      return;
    }
    if (ID === 'discord') {
      var discord = state.discord || {};
      setStatus(discord.configured ? '\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E' : '\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E', discord.mode || '');
      return;
    }
    setStatus(settings && settings.configured ? '\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E' : '\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E', settings && settings.owner ? '\u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446: ' + settings.owner : '');
  }
  function collect() {
    var body = {};
    var form = document.getElementById('settings');
    if (!form) return body;
    Array.prototype.forEach.call(form.querySelectorAll('input, select'), function (input) {
      if (input.type === 'password' && !input.value) return;
      if (input.value === '') return;
      body[input.name] = input.type === 'number' ? Number(input.value) : input.value;
    });
    if (ID === 'github') {
      if (!body.token && !body.owner) throw new Error('\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u043E\u043A\u0435\u043D \u0438\u043B\u0438 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430.');
    }
    return body;
  }
  function save() {
    var body;
    try { body = collect(); } catch (error) { result(error.message, false); return; }
    if (!Object.keys(body).length) { result('\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u043F\u043E\u043B\u0435.', false); return; }
    var path = ID === 'entire' ? '/api/tools/entire/settings' : '/api/tools/' + ID + '/configure';
    var method = ID === 'entire' ? 'PUT' : 'POST';
    request(path, { method: method, body: body }).then(function () {
      result('\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.', true);
      return load();
    }).catch(function (error) { result(error.message, false); });
  }
  function check() {
    if (ID === 'entire') {
      return request('/api/tools/entire').then(function (body) { state.entire = body; renderStatus(); result('\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 Entire \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E.', true); })
        .catch(function (error) { result(error.message, false); });
    }
    if (ID === 'freebuff' || ID === 'telegram' || ID === 'discord') {
      var path = ID === 'freebuff' ? '/api/tools/freebuff' : '/api/tools/' + ID + '/status';
      return request(path).then(function (body) { state[ID] = ID === 'freebuff' ? body : body.status; renderStatus(); result('\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E.', true); })
        .catch(function (error) { result(error.message, false); });
    }
    return request('/api/tools/' + ID + '/test', { method: 'POST' }).then(function (body) {
      result(body.status && body.status.summary ? body.status.summary : '\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u043E\u0448\u043B\u0430.', true);
      return load();
    }).catch(function (error) { result(error.message, false); });
  }
  function load() {
    return request('/api/tools').then(function (body) {
      state.catalog = body;
      renderStatus();
      if (ID === 'telegram') return loadTelegram();
      if (ID === 'entire') return loadEntire();
      if (ID === 'freebuff') return loadFreebuff();
      if (ID === 'discord') return loadDiscord();
      return null;
    }).catch(function (error) { setStatus('\u043E\u0448\u0438\u0431\u043A\u0430', error.message); });
  }
  function loadTelegram() {
    return request('/api/tools/telegram/status').then(function (body) {
      state.telegram = body.status || body;
      renderStatus();
      renderTelegramAuth();
    }).catch(function (error) { setStatus('\u043E\u0448\u0438\u0431\u043A\u0430', error.message); });
  }
  function renderTelegramAuth() {
    var node = document.getElementById('telegram-auth');
    var status = state.telegram || {};
    if (status.logged_in) {
      node.innerHTML = '<div class="actions"><button id="tg-check" class="ghost" type="button">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435</button>'
        + '<button id="tg-logout" class="danger" type="button">\u0412\u044B\u0439\u0442\u0438 \u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u044E</button></div>'
        + '<div class="field"><label>\u041A\u043E\u043C\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</label><input id="tg-chat" placeholder="@username, id \u0438\u043B\u0438 me"></div>'
        + '<div class="field"><label>\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435</label><input id="tg-message" maxlength="3500"></div>'
        + '<div class="actions"><button id="tg-send" type="button">\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</button></div>';
      document.getElementById('tg-check').onclick = function () { request('/api/tools/telegram/check', { method: 'POST' }).then(loadTelegram).catch(function (error) { result(error.message, false); }); };
      document.getElementById('tg-logout').onclick = function () { request('/api/tools/telegram/logout', { method: 'POST' }).then(loadTelegram).catch(function (error) { result(error.message, false); }); };
      document.getElementById('tg-send').onclick = function () {
        request('/api/tools/telegram/send', { method: 'POST', body: {
          chat: document.getElementById('tg-chat').value.trim(),
          text: document.getElementById('tg-message').value.trim()
        } }).then(function () { result('\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E.', true); }).catch(function (error) { result(error.message, false); });
      };
      return;
    }
    if (status.auth_state === 'code_required') {
      node.innerHTML = '<div class="field"><label>\u041A\u043E\u0434 \u0438\u0437 Telegram</label><input id="tg-code" inputmode="numeric" autocomplete="one-time-code"></div>'
        + '<div class="actions"><button id="tg-code-send" type="button">\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043A\u043E\u0434</button>'
        + '<button id="tg-cancel" class="ghost" type="button">\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C</button></div>';
      document.getElementById('tg-code-send').onclick = function () {
        request('/api/tools/telegram/code', { method: 'POST', body: { code: document.getElementById('tg-code').value.trim() } })
          .then(loadTelegram).catch(function (error) { result(error.message, false); });
      };
      document.getElementById('tg-cancel').onclick = function () {
        request('/api/tools/telegram/cancel-login', { method: 'POST' }).then(loadTelegram).catch(function (error) { result(error.message, false); });
      };
      return;
    }
    if (status.auth_state === 'password_required') {
      node.innerHTML = '<div class="field"><label>\u041F\u0430\u0440\u043E\u043B\u044C 2FA</label><input id="tg-password" type="password" autocomplete="current-password"></div>'
        + '<div class="actions"><button id="tg-password-send" type="button">\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C 2FA</button>'
        + '<button id="tg-cancel" class="ghost" type="button">\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C</button></div>';
      document.getElementById('tg-password-send').onclick = function () {
        request('/api/tools/telegram/password', { method: 'POST', body: { password: document.getElementById('tg-password').value } })
          .then(loadTelegram).catch(function (error) { result(error.message, false); });
      };
      document.getElementById('tg-cancel').onclick = function () {
        request('/api/tools/telegram/cancel-login', { method: 'POST' }).then(loadTelegram).catch(function (error) { result(error.message, false); });
      };
      return;
    }
    node.innerHTML = '<div class="field"><label>\u0422\u0435\u043B\u0435\u0444\u043E\u043D</label><input id="tg-phone" type="tel" placeholder="+71234567890" autocomplete="tel"></div>'
      + '<div class="actions"><button id="tg-login" type="button">\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043A\u043E\u0434</button></div>'
      + '<p class="hint">\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 api_id \u0438 api_hash \u0432\u044B\u0448\u0435.</p>';
    document.getElementById('tg-login').onclick = function () {
      request('/api/tools/telegram/login', { method: 'POST', body: { phone: document.getElementById('tg-phone').value.trim() } })
        .then(loadTelegram).catch(function (error) { result(error.message, false); });
    };
  }
  function loadEntire() {
    return request('/api/tools/entire').then(function (body) { state.entire = body; renderStatus(); })
      .catch(function (error) { setStatus('\u043E\u0448\u0438\u0431\u043A\u0430', error.message); });
  }
  function loadFreebuff() {
    return request('/api/tools/freebuff').then(function (body) { state.freebuff = body; renderStatus(); })
      .catch(function (error) { setStatus('\u043E\u0448\u0438\u0431\u043A\u0430', error.message); });
  }
  function loadDiscord() {
    return request('/api/tools/discord/status').then(function (body) { state.discord = body.status || body; renderStatus(); })
      .catch(function () { /* \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0434\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 */ });
  }

  var form = document.getElementById('settings');
  if (form) form.addEventListener('submit', function (event) { event.preventDefault(); save(); });
  var checkButton = document.getElementById('check');
  if (checkButton) checkButton.addEventListener('click', check);

  var repos = document.getElementById('github-repos');
  if (repos) repos.onclick = function () {
    repos.disabled = true;
    request('/api/tools/github/repos?limit=10').then(function (body) {
      var items = body.repos || body.items || [];
      document.getElementById('repos').innerHTML = items.length
        ? items.map(function (repo) { return '<li><strong>' + esc(repo.full_name || repo.name) + '</strong> <span class="hint">' + esc(repo.private ? 'private' : 'public') + '</span></li>'; }).join('')
        : '<li class="hint">\u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.</li>';
    }).catch(function (error) { result(error.message, false); }).then(function () { repos.disabled = false; });
  };

  var calendar = document.getElementById('google-calendar');
  if (calendar) calendar.onclick = function () {
    calendar.disabled = true;
    request('/api/tools/google/calendar?limit=5').then(function (body) {
      var items = body.events || body.items || [];
      document.getElementById('calendar').innerHTML = items.length
        ? items.map(function (event) { return '<li><strong>' + esc(event.summary || event.title) + '</strong> <span class="hint">' + esc(event.start || '') + '</span></li>'; }).join('')
        : '<li class="hint">\u0421\u043E\u0431\u044B\u0442\u0438\u0439 \u043D\u0435\u0442.</li>';
    }).catch(function (error) { result(error.message, false); }).then(function () { calendar.disabled = false; });
  };

  var presence = document.getElementById('discord-presence');
  if (presence) presence.onclick = function () {
    var enabled = !(state.discord && state.discord.presence);
    request('/api/tools/discord/presence', { method: 'POST', body: { enabled: enabled } })
      .then(function () { result(enabled ? 'Rich Presence \u0432\u043A\u043B\u044E\u0447\u0451\u043D.' : 'Rich Presence \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D.', true); return loadDiscord(); })
      .catch(function (error) { result(error.message, false); });
  };
  var bot = document.getElementById('discord-bot');
  if (bot) bot.onclick = function () {
    var enabled = !(state.discord && state.discord.bot_enabled);
    request('/api/tools/discord/bot', { method: 'POST', body: { enabled: enabled } })
      .then(function () { result(enabled ? '\u0411\u043E\u0442 \u0437\u0430\u043F\u0443\u0449\u0435\u043D.' : '\u0411\u043E\u0442 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.', true); return loadDiscord(); })
      .catch(function (error) { result(error.message, false); });
  };
  var discordTest = document.getElementById('discord-test');
  if (discordTest) discordTest.onclick = function () {
    request('/api/tools/discord/test-send', { method: 'POST' }).then(function () { result('\u0422\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E.', true); })
      .catch(function (error) { result(error.message, false); });
  };

  var sync = document.getElementById('entire-sync');
  if (sync) sync.onclick = function () {
    request('/api/tools/entire/sync', { method: 'POST' }).then(function () { result('\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430.', true); return loadEntire(); })
      .catch(function (error) { result(error.message, false); });
  };
  var models = document.getElementById('freebuff-models');
  if (models) models.onclick = function () {
    models.disabled = true;
    request('/api/tools/freebuff/models').then(function (body) {
      var items = body.models || [];
      document.getElementById('models').innerHTML = items.length
        ? items.map(function (model) { return '<li><strong>' + esc(model.id || model.name) + '</strong> <span class="hint">' + esc(model.description || '') + '</span></li>'; }).join('')
        : '<li class="hint">\u041C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.</li>';
    }).catch(function (error) { result(error.message, false); }).then(function () { models.disabled = false; });
  };

  load();
})();
</script>
</body>
</html>`;
}

// modules/entire/index.ts
var module = {
  id: "entire",
  apiVersion: 1,
  register(ctx) {
    const host2 = ctx.require("tools");
    host2.tools.enable("entire");
    const api = new ScopedRouter(["/api/tools/entire"]);
    registerToolsRoutes(api, host2);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: integrationPage(
        "entire",
        "Entire",
        "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0441\u0435\u0441\u0441\u0438\u0439 Entire CLI, pull-\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F."
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
