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
var NotFoundError = class extends AppError {
  constructor(message = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E") {
    super("not_found", message, 404);
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

// src/kernel/clock.ts
var systemClock = {
  now: () => /* @__PURE__ */ new Date()
};

// src/adapters/integrations/store.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
var LOGIN_RE = /^[A-Za-z0-9-]{1,39}$/;
var SITE_RE = /^[a-z0-9][a-z0-9._-]{1,80}$/;
var FIELD_RE = /^[a-z0-9][a-z0-9._-]{0,60}$/;
var MODES = ["off", "watch", "answer"];
var EMPTY = {
  github: { token: "", owner: "", accounts: [], active_login: "" },
  discord: {
    bot_token: "",
    webhook_url: "",
    channel_id: "",
    user_token: "",
    application_id: "",
    presence: false,
    user: null,
    mode: "watch",
    user_enabled: true,
    bot_enabled: false,
    bot_allowed_users: [],
    notify: { tasks: false, runs: false, errors: true }
  },
  google: { client_id: "", client_secret: "", refresh_token: "", access_token: "" },
  telegram: {
    session: "",
    api_id: "",
    api_hash: "",
    user: null,
    enabled: false,
    mode: "watch",
    owners: [],
    contacts: [],
    groups: [],
    agent: ""
  },
  providers: {},
  sites: {}
};
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
function profile(value, login) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const id = text(record.id);
  const name = text(record.name);
  const username = login(text(record.username)) ?? "";
  if (!id && !username && !name) return null;
  return { id, username, name: name || username || id };
}
function snowflakes(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of value) {
    const id = text(raw);
    if (/^\d{17,20}$/.test(id)) seen.add(id);
  }
  return [...seen];
}
function notifyOf(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    tasks: source.tasks === true,
    runs: source.runs === true,
    errors: source.errors !== false
  };
}
function telegramProfile(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const id = text(record.id) || text(record.user_id);
  const username = text(record.username);
  const name = text(record.name);
  if (!id && !username && !name) return null;
  return { id, username, name: name || username || id };
}
function telegramPeers(value) {
  const rows = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\s,]+/) : [];
  return [...new Set(rows.map((item) => text(item).replace(/^@/, "").toLowerCase()).filter((item) => item.length > 0 && item.length <= 80))].slice(0, 50);
}
function accountsOf(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Map();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw;
    const login = text(record.login);
    const token = text(record.token);
    if (!LOGIN_RE.test(login) || !token) continue;
    const key = login.toLowerCase();
    if (!seen.has(key)) seen.set(key, { login, token });
  }
  return [...seen.values()];
}
function sitesOf(value) {
  if (!value || typeof value !== "object") return {};
  const result = {};
  for (const [rawSite, rawFields] of Object.entries(value)) {
    const site = rawSite.trim().toLowerCase();
    if (!SITE_RE.test(site) || !rawFields || typeof rawFields !== "object") continue;
    const fields = {};
    for (const [rawField, rawValue] of Object.entries(rawFields)) {
      const field = rawField.trim().toLowerCase();
      const secret = text(rawValue);
      if (FIELD_RE.test(field) && secret) fields[field] = secret;
    }
    if (Object.keys(fields).length) result[site] = fields;
  }
  return result;
}
var IntegrationStore = class {
  #file;
  #document;
  #label;
  #env;
  #log;
  #stored = {};
  constructor(target, env, log) {
    this.#file = typeof target === "string" ? target : null;
    this.#document = typeof target === "string" ? null : target;
    this.#label = typeof target === "string" ? target : "\u0441\u0435\u043A\u0440\u0435\u0442\u044B \u043C\u043E\u0434\u0443\u043B\u044F";
    this.#env = env;
    this.#log = log;
    this.#load();
  }
  #load() {
    let raw = null;
    try {
      raw = this.#document ? this.#document.read() : this.#file && existsSync(this.#file) ? readFileSync(this.#file, "utf8") : null;
    } catch (error) {
      this.#log.warn("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0439 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u044B, \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u0443\u0441\u0442\u044B\u043C\u0438", {
        error: String(error),
        target: this.#label
      });
      return;
    }
    if (raw === null) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") this.#stored = parsed;
    } catch (error) {
      this.#log.warn("\u0424\u0430\u0439\u043B \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0439 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D, \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u0443\u0441\u0442\u044B\u043C\u0438", {
        error: String(error),
        target: this.#label
      });
    }
  }
  get() {
    const stored = this.#stored;
    const env = this.#env;
    const providers = { ...stored.providers ?? {} };
    for (const [name, envName] of PROVIDER_ENV) {
      const value = text(env[envName]);
      if (value) providers[name] = value;
    }
    const accounts = accountsOf(stored.github?.accounts);
    const requestedActive = text(env.GITHUB_OWNER) || text(stored.github?.active_login) || text(stored.github?.owner);
    const active = accounts.find((account) => account.login.toLowerCase() === requestedActive.toLowerCase()) ?? accounts[0] ?? null;
    const legacyToken = text(env.GITHUB_TOKEN) || text(stored.github?.token);
    const legacyOwner = text(env.GITHUB_OWNER) || text(stored.github?.owner);
    const github = {
      token: legacyToken || active?.token || "",
      owner: legacyOwner || active?.login || "",
      accounts,
      active_login: active?.login ?? ""
    };
    const discordStored = stored.discord;
    const mode = MODES.includes(discordStored?.mode) ? discordStored?.mode : EMPTY.discord.mode;
    return {
      github,
      discord: {
        bot_token: text(env.DISCORD_BOT_TOKEN) || text(discordStored?.bot_token),
        webhook_url: text(env.DISCORD_WEBHOOK_URL) || text(discordStored?.webhook_url),
        channel_id: text(env.DISCORD_CHANNEL_ID) || text(discordStored?.channel_id),
        user_token: text(env.DISCORD_USER_TOKEN) || text(discordStored?.user_token),
        application_id: text(env.DISCORD_APPLICATION_ID) || text(discordStored?.application_id),
        presence: discordStored?.presence === true,
        user: profile(discordStored?.user, (candidate) => candidate ? candidate : null),
        mode,
        user_enabled: discordStored?.user_enabled !== false,
        bot_enabled: discordStored?.bot_enabled === true,
        bot_allowed_users: snowflakes(discordStored?.bot_allowed_users),
        notify: notifyOf(discordStored?.notify)
      },
      google: {
        client_id: text(env.GOOGLE_CLIENT_ID) || text(stored.google?.client_id),
        client_secret: text(env.GOOGLE_CLIENT_SECRET) || text(stored.google?.client_secret),
        refresh_token: text(env.GOOGLE_REFRESH_TOKEN) || text(stored.google?.refresh_token),
        access_token: text(env.GOOGLE_ACCESS_TOKEN) || text(stored.google?.access_token)
      },
      telegram: {
        session: text(env.TELEGRAM_SESSION) || text(stored.telegram?.session),
        api_id: text(env.TELEGRAM_API_ID) || text(stored.telegram?.api_id),
        api_hash: text(env.TELEGRAM_API_HASH) || text(stored.telegram?.api_hash),
        user: telegramProfile(stored.telegram?.user),
        enabled: stored.telegram?.enabled === true,
        mode: ["off", "watch", "answer"].includes(stored.telegram?.mode ?? "") ? stored.telegram.mode : "watch",
        owners: telegramPeers(stored.telegram?.owners),
        contacts: telegramPeers(stored.telegram?.contacts),
        groups: telegramPeers(stored.telegram?.groups),
        agent: text(stored.telegram?.agent)
      },
      providers,
      sites: sitesOf(stored.sites)
    };
  }
  masked() {
    const secrets = this.get();
    const configuredAccounts = secrets.github.accounts.length > 0 ? secrets.github.accounts.map((account) => ({
      login: account.login,
      active: account.login.toLowerCase() === secrets.github.active_login.toLowerCase()
    })) : secrets.github.token ? [{ login: secrets.github.owner || "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439", active: true }] : [];
    const sites = Object.entries(secrets.sites).map(([site, fields]) => ({ site, fields: Object.keys(fields).sort() })).sort((left, right) => left.site.localeCompare(right.site));
    return {
      github: {
        configured: Boolean(secrets.github.token),
        owner: secrets.github.owner,
        env: Boolean(text(this.#env.GITHUB_TOKEN)),
        active_login: secrets.github.active_login,
        accounts: configuredAccounts
      },
      discord: {
        configured: Boolean(secrets.discord.bot_token || secrets.discord.webhook_url),
        mode: secrets.discord.bot_token ? "bot" : secrets.discord.webhook_url ? "webhook" : "off",
        channel_id: secrets.discord.channel_id,
        env: Boolean(text(this.#env.DISCORD_BOT_TOKEN) || text(this.#env.DISCORD_WEBHOOK_URL)),
        application_id: secrets.discord.application_id,
        presence: secrets.discord.presence,
        user_configured: Boolean(secrets.discord.user_token),
        user: secrets.discord.user ? {
          username: secrets.discord.user.username,
          name: secrets.discord.user.name,
          mode: secrets.discord.mode,
          enabled: secrets.discord.user_enabled
        } : null,
        bot_enabled: secrets.discord.bot_enabled,
        bot_allowed_users: secrets.discord.bot_allowed_users.length,
        notify: secrets.discord.notify
      },
      google: {
        configured: Boolean(
          secrets.google.client_id && secrets.google.client_secret && secrets.google.refresh_token || secrets.google.access_token
        ),
        env: Boolean(text(this.#env.GOOGLE_REFRESH_TOKEN) || text(this.#env.GOOGLE_ACCESS_TOKEN))
      },
      telegram: {
        configured: Boolean(secrets.telegram.api_id && secrets.telegram.api_hash),
        username: secrets.telegram.user?.username ?? "",
        user_id: secrets.telegram.user?.id ?? "",
        env: Boolean(text(this.#env.TELEGRAM_SESSION)),
        enabled: secrets.telegram.enabled,
        mode: secrets.telegram.mode,
        logged_in: Boolean(secrets.telegram.session),
        owners: [...secrets.telegram.owners],
        contacts: [...secrets.telegram.contacts],
        groups: [...secrets.telegram.groups],
        agent: secrets.telegram.agent
      },
      sites: { count: sites.length, entries: sites },
      providers: Object.fromEntries(PROVIDERS.map((p) => [p.id, Boolean(secrets.providers[p.id])]))
    };
  }
  /** Сохраняет только присланные поля; пустая строка очищает значение. */
  update(patch) {
    const stored = this.#stored;
    if (patch.github) {
      const github = { ...stored.github ?? {} };
      for (const key of ["token", "owner", "active_login"]) {
        if (patch.github[key] !== void 0) github[key] = text(patch.github[key]);
      }
      if (patch.github.accounts) {
        const merged = accountsOf(stored.github?.accounts);
        for (const account of accountsOf(patch.github.accounts)) {
          const index = merged.findIndex((entry) => entry.login.toLowerCase() === account.login.toLowerCase());
          if (index >= 0) merged[index] = account;
          else merged.push(account);
        }
        github.accounts = merged;
        if (!text(github.active_login)) github.active_login = merged[0]?.login ?? "";
      }
      stored.github = github;
    }
    if (patch.discord) {
      const discord = { ...stored.discord ?? {} };
      for (const key of ["bot_token", "webhook_url", "channel_id", "user_token", "application_id"]) {
        if (patch.discord[key] !== void 0) discord[key] = text(patch.discord[key]);
      }
      if (typeof patch.discord.presence === "boolean") discord.presence = patch.discord.presence;
      if (typeof patch.discord.user_enabled === "boolean") discord.user_enabled = patch.discord.user_enabled;
      if (typeof patch.discord.bot_enabled === "boolean") discord.bot_enabled = patch.discord.bot_enabled;
      if (patch.discord.bot_allowed_users !== void 0) {
        discord.bot_allowed_users = snowflakes(patch.discord.bot_allowed_users);
      }
      if (patch.discord.notify !== void 0) discord.notify = notifyOf(patch.discord.notify);
      if (patch.discord.mode !== void 0) {
        if (MODES.includes(patch.discord.mode)) discord.mode = patch.discord.mode;
      }
      if (patch.discord.user !== void 0) {
        discord.user = patch.discord.user === null ? null : profile(patch.discord.user, (name) => name || null);
      }
      stored.discord = discord;
    }
    if (patch.google) {
      stored.google = { ...stored.google, ...cleanStrings(patch.google) };
    }
    if (patch.telegram) {
      const telegram = { ...stored.telegram ?? {} };
      for (const key of ["session", "api_id", "api_hash"]) {
        if (patch.telegram[key] !== void 0) telegram[key] = text(patch.telegram[key]);
      }
      if (patch.telegram.user !== void 0) telegram.user = telegramProfile(patch.telegram.user);
      if (typeof patch.telegram.enabled === "boolean") telegram.enabled = patch.telegram.enabled;
      if (patch.telegram.mode !== void 0 && ["off", "watch", "answer"].includes(patch.telegram.mode)) telegram.mode = patch.telegram.mode;
      if (patch.telegram.owners !== void 0) telegram.owners = telegramPeers(patch.telegram.owners);
      if (patch.telegram.contacts !== void 0) telegram.contacts = telegramPeers(patch.telegram.contacts);
      if (patch.telegram.groups !== void 0) telegram.groups = telegramPeers(patch.telegram.groups);
      if (patch.telegram.agent !== void 0) telegram.agent = text(patch.telegram.agent);
      stored.telegram = telegram;
    }
    if (patch.providers) {
      const providers = { ...stored.providers ?? {} };
      for (const [key, value] of Object.entries(patch.providers)) {
        if (typeof value === "string") providers[key] = value.trim();
      }
      stored.providers = providers;
    }
    if (patch.sites) {
      const sites = sitesOf(stored.sites);
      for (const [rawSite, rawFields] of Object.entries(patch.sites)) {
        const site = rawSite.trim().toLowerCase();
        if (!SITE_RE.test(site) || !rawFields) continue;
        const fields = { ...sites[site] ?? {} };
        for (const [rawField, rawValue] of Object.entries(rawFields)) {
          const field = rawField.trim().toLowerCase();
          if (!FIELD_RE.test(field) || typeof rawValue !== "string") continue;
          const value = rawValue.trim();
          if (value) fields[field] = value;
          else delete fields[field];
        }
        if (Object.keys(fields).length) sites[site] = fields;
        else delete sites[site];
      }
      stored.sites = sites;
    }
    const payload = JSON.stringify(stored, null, 2);
    if (this.#document) {
      this.#document.write(payload);
    } else if (this.#file) {
      writeFileSync(this.#file, payload, { encoding: "utf8", mode: 384 });
    }
    this.#log.info("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0439 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", { target: this.#label });
    return this.masked();
  }
  setGithubAccount(login) {
    const wanted = text(login);
    const accounts = accountsOf(this.#stored.github?.accounts);
    const account = accounts.find((entry) => entry.login.toLowerCase() === wanted.toLowerCase());
    if (!account) throw new Error(`\u0410\u043A\u043A\u0430\u0443\u043D\u0442 GitHub \xAB${wanted}\xBB \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D`);
    return this.update({ github: { active_login: account.login, owner: account.login, token: account.token } });
  }
};
var PROVIDERS = [
  { id: "openrouter", title: "OpenRouter", env: "OPENROUTER_API_KEY", link: "https://openrouter.ai/keys" },
  { id: "gemini", title: "Gemini", env: "GEMINI_API_KEY", link: "https://aistudio.google.com/apikey" },
  { id: "groq", title: "Groq", env: "GROQ_API_KEY", link: "https://console.groq.com/keys" },
  { id: "cerebras", title: "Cerebras", env: "CEREBRAS_API_KEY", link: "https://cloud.cerebras.ai" },
  { id: "pollinations", title: "Pollinations", env: "POLLINATIONS_TOKEN", link: "https://pollinations.ai" },
  { id: "freebuff", title: "Freebuff", env: "FREEBUFF_API_KEY", link: "https://freebuff.com/account/api" }
];
var PROVIDER_ENV = PROVIDERS.map((p) => [p.id, p.env]);
function cleanStrings(value) {
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (raw === void 0) continue;
    result[key] = typeof raw === "string" ? raw.trim() : raw;
  }
  return result;
}

// src/adapters/secrets/store.ts
var INTEGRATIONS_SECRET_KEY = "integrations";

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

// src/app/entire-service.ts
import { randomUUID } from "node:crypto";
import { statSync } from "node:fs";
import { resolve } from "node:path";

// src/adapters/entire/cli.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
}
function timestamp(value, field, index) {
  const text3 = stringValue(value);
  if (!text3 || Number.isNaN(Date.parse(text3))) {
    throw new UpstreamError(`Entire \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u043F\u043E\u043B\u0435 ${field} \u0443 \u0441\u0435\u0441\u0441\u0438\u0438 #${index + 1}`);
  }
  return new Date(text3).toISOString();
}
function optionalTimestamp(value) {
  const text3 = stringValue(value);
  if (!text3) return null;
  const parsed = Date.parse(text3);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}
function parseSession(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new UpstreamError(`Entire \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0443\u044E \u0441\u0435\u0441\u0441\u0438\u044E #${index + 1}`);
  }
  const value = raw;
  const sessionId = stringValue(value.session_id);
  if (!sessionId) {
    throw new UpstreamError(`Entire \u0432\u0435\u0440\u043D\u0443\u043B \u0441\u0435\u0441\u0441\u0438\u044E #${index + 1} \u0431\u0435\u0437 session_id`);
  }
  const files = Array.isArray(value.files_touched) ? value.files_touched.filter((entry) => typeof entry === "string" && entry.length > 0) : [];
  const tokens = value.tokens && typeof value.tokens === "object" && !Array.isArray(value.tokens) ? numberValue(value.tokens.total) : null;
  return {
    session_id: sessionId,
    agent: stringValue(value.agent) ?? "unknown",
    model: stringValue(value.model),
    status: stringValue(value.status) ?? "unknown",
    kind: stringValue(value.kind),
    read_only: value.read_only === true,
    branch: stringValue(value.branch),
    worktree_id: stringValue(value.worktree_id),
    worktree_path: stringValue(value.worktree_path),
    started_at: timestamp(value.started_at, "started_at", index),
    ended_at: optionalTimestamp(value.ended_at),
    last_active: optionalTimestamp(value.last_active),
    turns: numberValue(value.turns) ?? 0,
    pending_turns: numberValue(value.pending_turns) ?? 0,
    last_checkpoint_id: stringValue(value.last_checkpoint_id),
    last_prompt: stringValue(value.last_prompt),
    tokens_total: tokens,
    files_touched: files.slice(0, 200)
  };
}
var EntireCli = class {
  #cliPath;
  #cwd;
  #timeoutMs;
  #log;
  #runner;
  constructor(options) {
    this.#cliPath = options.cliPath;
    this.#cwd = options.cwd;
    this.#timeoutMs = options.timeoutMs ?? 2e4;
    this.#log = options.log ?? null;
    this.#runner = options.runner ?? (async (command, args, optionsValue) => {
      const result = await execFileAsync(command, args, optionsValue);
      return { stdout: String(result.stdout), stderr: String(result.stderr) };
    });
  }
  async status() {
    const output = await this.#run(["status", "--json"]);
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new UpstreamError("Entire CLI \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 JSON \u0441\u0442\u0430\u0442\u0443\u0441\u0430");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new UpstreamError("Entire CLI \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441");
    }
    const value = parsed;
    return {
      enabled: value.enabled === true,
      error: stringValue(value.error)
    };
  }
  async sessions() {
    const output = await this.#run(["session", "list", "--json"]);
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new UpstreamError("Entire CLI \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 JSON \u0438\u0441\u0442\u043E\u0440\u0438\u0438");
    }
    if (!Array.isArray(parsed)) {
      throw new UpstreamError("Entire CLI \u0432\u0435\u0440\u043D\u0443\u043B \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u043D\u0435 \u0432 \u0432\u0438\u0434\u0435 \u043C\u0430\u0441\u0441\u0438\u0432\u0430");
    }
    return parsed.map((entry, index) => parseSession(entry, index));
  }
  async #run(args) {
    const started = Date.now();
    try {
      const result = await this.#runner(this.#cliPath, args, {
        cwd: this.#cwd,
        timeout: this.#timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        // .cmd/.bat wrappers on Windows need cmd.exe; ordinary binaries do not.
        shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(this.#cliPath)
      });
      const output = result.stdout.trim();
      if (!output) throw new UpstreamError(`Entire CLI \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0434\u0430\u043D\u043D\u044B\u0435 (${args[0]})`);
      this.#log?.debug("Entire CLI \u043E\u0442\u0432\u0435\u0442\u0438\u043B", {
        command: args.join(" "),
        duration_ms: Date.now() - started
      });
      return output;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      const details = error;
      if (details.code === "ENOENT") {
        throw new UpstreamError(`Entire CLI \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${this.#cliPath}`, { cli_path: this.#cliPath });
      }
      if (details.killed || details.signal) {
        throw new UpstreamError(`Entire CLI \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${this.#timeoutMs} \u043C\u0441`, {
          cli_path: this.#cliPath,
          timeout_ms: this.#timeoutMs
        });
      }
      const stderr = (details.stderr ?? "").trim();
      const message = stderr || details.message || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 Entire CLI";
      throw new UpstreamError(`Entire CLI: ${message.slice(0, 500)}`, { cli_path: this.#cliPath });
    }
  }
};

// src/app/entire-service.ts
var EntireUnsupportedError = class extends Error {
};
var SETTINGS_ID = "entire";
var SESSION_LIMIT = 100;
var STALE_SYNC_MESSAGE = "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u0430 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F";
function optionalText(value, field, max = 500) {
  if (value === void 0 || value === null) return "";
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  const text3 = value.trim();
  if (text3.length > max) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${max} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  return text3;
}
function syncFromRow(row) {
  return {
    id: row.id,
    status: row.status,
    phase: row.phase,
    progress: row.progress,
    started_at: row.started_at,
    finished_at: row.finished_at,
    fetched: row.fetched,
    upserted: row.upserted,
    error: row.error
  };
}
function sessionFromRow(row) {
  let files = [];
  try {
    const parsed = JSON.parse(row.files_touched);
    if (Array.isArray(parsed)) {
      files = parsed.filter((entry) => typeof entry === "string");
    }
  } catch {
    files = [];
  }
  return {
    session_id: row.session_id,
    agent: row.agent,
    model: row.model,
    status: row.status,
    kind: row.kind,
    read_only: row.read_only === 1,
    branch: row.branch,
    worktree_id: row.worktree_id,
    worktree_path: row.worktree_path,
    started_at: row.started_at,
    ended_at: row.ended_at,
    last_active: row.last_active,
    turns: row.turns,
    pending_turns: row.pending_turns,
    last_checkpoint_id: row.last_checkpoint_id,
    last_prompt: row.last_prompt,
    tokens_total: row.tokens_total,
    files_touched: files,
    synced_at: row.synced_at
  };
}
var EntireService = class {
  #db;
  #clock;
  #log;
  #defaults;
  #timeoutMs;
  #cliFactory;
  #active = null;
  #lastFailureSignature = null;
  constructor(db, clock, log, options = {}) {
    this.#db = db;
    this.#clock = clock;
    this.#log = log.child({ module: "entire" });
    this.#defaults = {
      repo_path: (options.repoPath ?? "").trim(),
      cli_path: (options.cliPath ?? "entire").trim() || "entire"
    };
    this.#timeoutMs = options.timeoutMs ?? 2e4;
    this.#cliFactory = options.cliFactory ?? ((settings) => new EntireCli({
      cliPath: settings.cli_path,
      cwd: settings.repo_path,
      timeoutMs: this.#timeoutMs,
      log: this.#log
    }));
    this.#recoverInterrupted();
  }
  overview() {
    const settings = this.#settings();
    const last = this.#lastSync();
    const sessions = this.#sessions();
    const total = this.#db.raw.prepare("SELECT COUNT(*) AS count FROM entire_sessions").get();
    const limitation = last?.status === "unsupported" ? last.error : !settings.repo_path ? "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 git-\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 Entire, \u0447\u0442\u043E\u0431\u044B \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0447\u0442\u0435\u043D\u0438\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u0438." : last?.status === "failed" ? last.error : null;
    return {
      configured: Boolean(settings.repo_path),
      settings,
      running: last?.status === "running",
      last_sync: last,
      sessions,
      total_sessions: Number(total.count) || 0,
      limitation
    };
  }
  configure(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new ValidationError("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 Entire \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C");
    }
    const input = raw;
    const current = this.#settings();
    const repoPath = input.repo_path === void 0 ? current.repo_path : optionalText(input.repo_path, "repo_path", 1e3);
    const cliPath = input.cli_path === void 0 ? current.cli_path : optionalText(input.cli_path, "cli_path", 1e3) || "entire";
    let normalizedRepo = "";
    if (repoPath) {
      normalizedRepo = resolve(repoPath);
      let isDirectory = false;
      try {
        isDirectory = statSync(normalizedRepo).isDirectory();
      } catch {
        isDirectory = false;
      }
      if (!isDirectory) {
        throw new ValidationError(`\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F Entire \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${normalizedRepo}`);
      }
    }
    this.#db.raw.prepare(`INSERT INTO entire_settings (id, repo_path, cli_path, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET repo_path = excluded.repo_path,
        cli_path = excluded.cli_path, updated_at = excluded.updated_at`).run(SETTINGS_ID, normalizedRepo, cliPath, this.#clock.now().toISOString());
    this.#lastFailureSignature = null;
    this.#log.info("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 Entire \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", {
      configured: Boolean(normalizedRepo),
      cli_path: cliPath
    });
    return this.overview();
  }
  startSync() {
    if (this.#active) {
      throw new ConflictError("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F Entire \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F", { id: this.#active });
    }
    const settings = this.#settings();
    if (!settings.repo_path) {
      throw new ValidationError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 git-\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 Entire");
    }
    const startedAt = this.#clock.now().toISOString();
    const id = `entire_${randomUUID()}`;
    this.#db.raw.prepare(`INSERT INTO entire_syncs
      (id, status, phase, progress, started_at, finished_at, fetched, upserted, error)
      VALUES (?, 'running', ?, 5, ?, NULL, 0, 0, NULL)`).run(id, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u0438 CLI", startedAt);
    this.#active = id;
    void this.#runSync(id, settings);
    return this.overview();
  }
  async #runSync(id, settings) {
    try {
      this.#progress(id, 15, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 Entire CLI");
      const cli = this.#cliFactory(settings);
      const status = await cli.status();
      if (!status.enabled) {
        throw new EntireUnsupportedError(
          `Entire \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u0432 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0438${status.error ? ` (${status.error})` : ""}. \u0412\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \`entire enable\` \u0432 \u044D\u0442\u043E\u043C \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0438 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E.`
        );
      }
      this.#progress(id, 40, "\u0427\u0442\u0435\u043D\u0438\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0441\u0435\u0441\u0441\u0438\u0439");
      const sessions = await cli.sessions();
      this.#progress(id, 80, "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0432 SQLite");
      const syncedAt = this.#clock.now().toISOString();
      this.#db.transaction(() => {
        this.#db.raw.prepare("DELETE FROM entire_sessions").run();
        const insert = this.#db.raw.prepare(`INSERT INTO entire_sessions
          (session_id, agent, model, status, kind, read_only, branch, worktree_id, worktree_path,
           started_at, ended_at, last_active, turns, pending_turns, last_checkpoint_id,
           last_prompt, tokens_total, files_touched, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const session of sessions) {
          insert.run(
            session.session_id,
            session.agent,
            session.model,
            session.status,
            session.kind,
            session.read_only ? 1 : 0,
            session.branch,
            session.worktree_id,
            session.worktree_path,
            session.started_at,
            session.ended_at,
            session.last_active,
            session.turns,
            session.pending_turns,
            session.last_checkpoint_id,
            session.last_prompt,
            session.tokens_total,
            JSON.stringify(session.files_touched),
            syncedAt
          );
        }
        this.#db.raw.prepare(`UPDATE entire_syncs
          SET status = 'succeeded', phase = ?, progress = 100, finished_at = ?,
            fetched = ?, upserted = ?, error = NULL
          WHERE id = ?`).run("\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u0430", syncedAt, sessions.length, sessions.length, id);
      });
      this.#lastFailureSignature = null;
      this.#log.info("\u0418\u0441\u0442\u043E\u0440\u0438\u044F Entire \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u0430", {
        sessions: sessions.length,
        repo_path: settings.repo_path
      });
    } catch (error) {
      const unsupported = error instanceof EntireUnsupportedError;
      const message = error instanceof Error ? error.message : String(error);
      const finishedAt = this.#clock.now().toISOString();
      try {
        this.#db.raw.prepare(`UPDATE entire_syncs
          SET status = ?, phase = ?, progress = 100, finished_at = ?, error = ?
          WHERE id = ?`).run(
          unsupported ? "unsupported" : "failed",
          unsupported ? "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 Entire" : "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
          finishedAt,
          message.slice(0, 2e3),
          id
        );
      } catch (dbError) {
        this.#log.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0443 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 Entire", {
          sync_id: id,
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
      const signature = `${unsupported ? "unsupported" : "failed"}:${message}`;
      if (signature !== this.#lastFailureSignature) {
        this.#lastFailureSignature = signature;
        const meta = {
          sync_id: id,
          repo_path: settings.repo_path,
          unsupported,
          error: message.slice(0, 500)
        };
        if (unsupported) this.#log.warn("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F Entire \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0430", meta);
        else this.#log.warn("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F Entire \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C", meta);
      } else {
        this.#log.debug("\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 Entire", { sync_id: id, unsupported });
      }
    } finally {
      this.#active = null;
    }
  }
  #progress(id, progress, phase) {
    this.#db.raw.prepare("UPDATE entire_syncs SET progress = ?, phase = ? WHERE id = ?").run(progress, phase, id);
  }
  #settings() {
    const row = this.#db.raw.prepare("SELECT repo_path, cli_path FROM entire_settings WHERE id = ?").get(SETTINGS_ID);
    if (!row) return { ...this.#defaults };
    return {
      repo_path: row.repo_path || "",
      cli_path: row.cli_path || "entire"
    };
  }
  #lastSync() {
    const row = this.#db.raw.prepare(`SELECT id, status, phase, progress, started_at,
      finished_at, fetched, upserted, error FROM entire_syncs
      ORDER BY started_at DESC, rowid DESC LIMIT 1`).get();
    return row ? syncFromRow(row) : null;
  }
  #sessions() {
    const rows = this.#db.raw.prepare(`SELECT session_id, agent, model, status, kind, read_only,
      branch, worktree_id, worktree_path, started_at, ended_at, last_active, turns,
      pending_turns, last_checkpoint_id, last_prompt, tokens_total, files_touched, synced_at
      FROM entire_sessions ORDER BY started_at DESC, session_id ASC LIMIT ?`).all(SESSION_LIMIT);
    return rows.map(sessionFromRow);
  }
  #recoverInterrupted() {
    const finishedAt = this.#clock.now().toISOString();
    const result = this.#db.raw.prepare(`UPDATE entire_syncs
      SET status = 'failed', phase = '\u041F\u0440\u0435\u0440\u0432\u0430\u043D\u043E', progress = 100, finished_at = ?, error = ?
      WHERE status = 'running'`).run(finishedAt, STALE_SYNC_MESSAGE);
    if (Number(result.changes) > 0) {
      this.#log.warn("\u041D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u0430\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F Entire \u043F\u043E\u043C\u0435\u0447\u0435\u043D\u0430 \u043A\u0430\u043A \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u043D\u0430\u044F", {
        count: Number(result.changes)
      });
    }
  }
};

// src/app/toolbox-service.ts
var RESERVE_DEFAULT = { enabled: false, limit: 5 };
var PROVIDER_GUARD_DEFAULT = { enabled: false };
var SPARE_DEFAULT = {
  enabled: false,
  start_hour: 9,
  end_hour: 18,
  daily_limit_minutes: 120,
  override: null
};
var ENTIRE_INSTRUCTIONS = [
  "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 ENTIRE_URL \u2014 URL health/status-\u044D\u043D\u0434\u043F\u043E\u0438\u043D\u0442\u0430 Entire.",
  "\u0415\u0441\u043B\u0438 \u0441\u0435\u0440\u0432\u0438\u0441 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0442\u043E\u043A\u0435\u043D, \u0437\u0430\u0434\u0430\u0439\u0442\u0435 ENTIRE_TOKEN.",
  "\u041F\u043E\u0441\u043B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 Team Platform."
];
var FREEBUFF_INSTRUCTIONS = [
  "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 FREEBUFF_API_KEY \u2014 Developer API key \u0438\u0437 https://freebuff.com/account/api \u2014 \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0410\u0433\u0435\u043D\u0442\u044B \u0438 \u043C\u043E\u0434\u0435\u043B\u0438\xBB. UUID-\u0442\u043E\u043A\u0435\u043D \u0432\u0445\u043E\u0434\u0430 CLI/Desktop \u043D\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442.",
  "FREEBUFF_API_URL \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D: \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F https://freebuff.com/api/v1/paid.",
  "Freebuff Developer API \u2014 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u0442\u043D\u044B\u0439 API-\u0434\u043E\u0441\u0442\u0443\u043F; \u0432\u043D\u0435\u0448\u043D\u0438\u0439 \u043A\u043B\u0438\u0435\u043D\u0442 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 free tier CLI/Desktop."
];
function text2(value, field, min, max) {
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0434\u043B\u0438\u043D\u0430 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return normalized;
}
function integer(value, field, min, max) {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 ${min} \u0434\u043E ${max}`);
  }
  return parsed;
}
function bool(value, field) {
  if (typeof value !== "boolean") throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C boolean`);
  return value;
}
function optionalObject(raw) {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}
function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function safeUrl(raw) {
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return raw;
  }
}
function localDayStart(now) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function minutesOfDay(now) {
  return now.getHours() * 60 + now.getMinutes();
}
function insideWindow(now, start, end) {
  const current = minutesOfDay(now);
  return start < end ? current >= start * 60 && current < end * 60 : current >= start * 60 || current < end * 60;
}
function overlapMinutes(start, end, from, to) {
  const rawStart = Date.parse(start ?? "");
  const rawEnd = end ? Date.parse(end) : to.getTime();
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) return 0;
  const startMs = Math.max(rawStart, from.getTime());
  const endMs = Math.min(rawEnd, to.getTime());
  return endMs > startMs ? Math.floor((endMs - startMs) / 6e4) : 0;
}
var ToolboxService = class {
  #db;
  #tasks;
  #clock;
  #store;
  #log;
  #entire;
  #freebuff;
  #fetch;
  #timeoutMs;
  #externalFailureSignatures = /* @__PURE__ */ new Map();
  #freebuffFailureSignatures = /* @__PURE__ */ new Map();
  constructor(db, tasks, clock, store, log, options) {
    this.#db = db;
    this.#tasks = tasks;
    this.#clock = clock;
    this.#store = store;
    this.#log = log.child({ module: "toolbox" });
    this.#entire = options.entire;
    this.#freebuff = options.freebuff;
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 4e3;
  }
  reserve() {
    const { settings, error: settingsError } = this.#readReserveSettings();
    const rows = this.#db.raw.prepare("SELECT task_id, added_at FROM reserve_items ORDER BY added_at ASC, task_id ASC").all();
    const items = [];
    const stale = [];
    for (const row of rows) {
      try {
        const { task } = this.#tasks.get(row.task_id);
        if (task.status === "done") {
          stale.push(row.task_id);
          continue;
        }
        items.push({
          task_id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          added_at: row.added_at
        });
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error;
        stale.push(row.task_id);
      }
    }
    if (stale.length) {
      const remove = this.#db.raw.prepare("DELETE FROM reserve_items WHERE task_id = ?");
      for (const taskId of stale) remove.run(taskId);
    }
    const reserved = new Set(items.map((item) => item.task_id));
    const candidates = this.#tasks.list({ limit: "200" }).items.filter((task) => (task.status === "open" || task.status === "blocked") && !reserved.has(task.id)).slice(0, 20).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority
    }));
    return {
      ...settings,
      used: items.length,
      available: Math.max(0, settings.limit - items.length),
      items,
      candidates,
      settings_error: settingsError
    };
  }
  configureReserve(raw) {
    const input = optionalObject(raw);
    const current = this.#reserveSettings();
    const next = {
      enabled: input.enabled === void 0 ? current.enabled : bool(input.enabled, "enabled"),
      limit: input.limit === void 0 ? current.limit : integer(input.limit, "limit", 1, 50)
    };
    this.#saveSettings("reserve", next);
    this.#log.info("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", { enabled: next.enabled, limit: next.limit });
    return this.reserve();
  }
  addReserve(rawTaskId) {
    const taskId = text2(rawTaskId, "task_id", 1, 100);
    const { task } = this.#tasks.get(taskId);
    if (task.status !== "open" && task.status !== "blocked") {
      throw new ConflictError("\u0412 \u0440\u0435\u0437\u0435\u0440\u0432 \u043C\u043E\u0436\u043D\u043E \u043A\u043B\u0430\u0441\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0438\u043B\u0438 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438", {
        status: task.status
      });
    }
    const existing = this.#db.raw.prepare("SELECT 1 AS found FROM reserve_items WHERE task_id = ?").get(taskId);
    if (existing) return this.reserve();
    const state = this.reserve();
    if (state.used >= state.limit) {
      throw new ConflictError(`\u041B\u0438\u043C\u0438\u0442 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D: ${state.used} \u0438\u0437 ${state.limit}`, {
        limit: state.limit,
        used: state.used
      });
    }
    this.#db.raw.prepare("INSERT INTO reserve_items (task_id, added_at) VALUES (?, ?)").run(taskId, this.#clock.now().toISOString());
    this.#log.info("\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 \u0440\u0435\u0437\u0435\u0440\u0432", { task_id: taskId });
    return this.reserve();
  }
  removeReserve(taskId) {
    const id = text2(taskId, "task_id", 1, 100);
    this.#db.raw.prepare("DELETE FROM reserve_items WHERE task_id = ?").run(id);
    return this.reserve();
  }
  /**
   * Разрешают ли настройки автоматический захват новых запусков. Выключенный
   * режим означает отсутствие ограничения; включённый — только активное окно
   * с остатком дневного лимита.
   */
  allowsAutoStart() {
    const state = this.spare();
    return !state.enabled || state.active;
  }
  /**
   * Allowlist карточек для автоматического executor. `null` — резерв выключен
   * и фильтра нет; массив (включая пустой) — разрешены только эти карточки.
   * Повреждённые настройки не трактуются как «всё разрешено»: вызывающий
   * executor получает ошибку и безопасно приостанавливает автозапуск.
   */
  autoStartTaskIds() {
    if (!this.#reserveSettingsStrict().enabled) return null;
    const rows = this.#db.raw.prepare("SELECT task_id FROM reserve_items ORDER BY added_at ASC, task_id ASC").all();
    return rows.map((item) => item.task_id);
  }
  /**
   * Проверка ключей провайдеров перед автозапуском. Выключенная проверка
   * ничего не ограничивает; включённая не даёт автоматически стартовать
   * работу, пока не настроен хотя бы один ключ. Ручной claim не затрагивается.
   */
  providerGuard() {
    const { settings, error: settingsError } = this.#readProviderGuardSettings();
    const providers = this.#store.masked().providers;
    const total = Object.keys(providers).length;
    const configured = Object.values(providers).filter(Boolean).length;
    if (settingsError) {
      return {
        enabled: true,
        configured,
        total,
        auto_start_allowed: false,
        reason: "settings_error",
        settings_error: true
      };
    }
    const allowed = !settings.enabled || configured > 0;
    return {
      enabled: settings.enabled,
      configured,
      total,
      auto_start_allowed: allowed,
      reason: !settings.enabled ? "disabled" : allowed ? "allowed" : "no_provider_key",
      settings_error: false
    };
  }
  configureProviderGuard(raw) {
    const input = optionalObject(raw);
    const current = this.#providerGuardSettings();
    const enabled = input.enabled === void 0 ? current.enabled : bool(input.enabled, "enabled");
    this.#saveSettings("providers", { enabled });
    this.#log.info("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430", { enabled });
    return this.providerGuard();
  }
  spare() {
    const settings = this.#spareSettings();
    const now = this.#clock.now();
    const dayStart = localDayStart(now);
    const rows = this.#db.raw.prepare(`SELECT started_at, finished_at FROM runs
        WHERE status != 'queued'
          AND (finished_at IS NULL OR finished_at >= ?)
          AND COALESCE(started_at, finished_at, created_at) < ?`).all(dayStart.toISOString(), now.toISOString());
    const used = rows.reduce((sum, row) => sum + overlapMinutes(row.started_at, row.finished_at, dayStart, now), 0);
    const remaining = Math.max(0, settings.daily_limit_minutes - used);
    const inWindow = insideWindow(now, settings.start_hour, settings.end_hour);
    const active = settings.enabled && remaining > 0 && (settings.override === "open" || settings.override !== "closed" && inWindow);
    const reason = !settings.enabled ? "disabled" : remaining <= 0 ? "daily_limit" : settings.override === "closed" ? "manual_closed" : !inWindow && settings.override !== "open" ? "outside_window" : "active";
    return {
      ...settings,
      active,
      reason,
      in_window: inWindow,
      used_minutes: used,
      remaining_minutes: remaining,
      runs_today: rows.length,
      checked_at: now.toISOString()
    };
  }
  configureSpare(raw) {
    const input = optionalObject(raw);
    const current = this.#spareSettings();
    const start = input.start_hour === void 0 ? current.start_hour : integer(input.start_hour, "start_hour", 0, 23);
    const end = input.end_hour === void 0 ? current.end_hour : integer(input.end_hour, "end_hour", 0, 23);
    if (start === end) throw new ValidationError("\u041D\u0430\u0447\u0430\u043B\u043E \u0438 \u043A\u043E\u043D\u0435\u0446 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u0442\u044C\u0441\u044F");
    let override = current.override;
    if (input.override !== void 0) {
      if (input.override === null || input.override === "auto") override = null;
      else if (input.override === "open" || input.override === "closed") override = input.override;
      else throw new ValidationError("\u041F\u043E\u043B\u0435 \xABoverride\xBB: auto, open, closed \u0438\u043B\u0438 null");
    }
    const next = {
      enabled: input.enabled === void 0 ? current.enabled : bool(input.enabled, "enabled"),
      start_hour: start,
      end_hour: end,
      daily_limit_minutes: input.daily_limit_minutes === void 0 ? current.daily_limit_minutes : integer(input.daily_limit_minutes, "daily_limit_minutes", 1, 1440),
      override
    };
    this.#saveSettings("spare", next);
    this.#log.info("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", {
      enabled: next.enabled,
      start_hour: next.start_hour,
      end_hour: next.end_hour,
      daily_limit_minutes: next.daily_limit_minutes,
      override: next.override
    });
    return this.spare();
  }
  setSpareOverride(raw) {
    const input = optionalObject(raw);
    const value = input.override;
    const override = value === null || value === "auto" ? null : value === "open" || value === "closed" ? value : null;
    if (value !== null && value !== "auto" && value !== "open" && value !== "closed") {
      throw new ValidationError("\u041F\u043E\u043B\u0435 \xABoverride\xBB: auto, open \u0438\u043B\u0438 closed");
    }
    this.#saveSettings("spare", { ...this.#spareSettings(), override });
    return this.spare();
  }
  entireConfigured() {
    return Boolean(this.#entire.url);
  }
  freebuffConfigured() {
    const key = this.#store.get().providers.freebuff ?? "";
    return Boolean(this.#freebuff.url && key && !this.#isSessionToken(key));
  }
  async entireStatus() {
    return this.#probe("entire", this.#entire.url, this.#entire.token);
  }
  async freebuffStatus() {
    const key = this.#store.get().providers.freebuff ?? "";
    if (key && this.#isSessionToken(key)) {
      return {
        configured: true,
        state: "error",
        ok: false,
        url: safeUrl(this.#freebuff.url),
        auth: true,
        http_status: null,
        latency_ms: null,
        checked_at: this.#clock.now().toISOString(),
        error: "UUID \u0441\u0435\u0441\u0441\u0438\u0438 Freebuff CLI/Desktop \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F Developer API key. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043A\u043B\u044E\u0447 \u043D\u0430 freebuff.com/account/api.",
        instructions: FREEBUFF_INSTRUCTIONS
      };
    }
    if (!key) return this.#probe("freebuff", this.#freebuff.url, "");
    let endpoint;
    try {
      endpoint = this.#freebuffEndpoint("models");
    } catch (error) {
      return {
        configured: true,
        state: "error",
        ok: false,
        url: safeUrl(this.#freebuff.url),
        auth: true,
        http_status: null,
        latency_ms: null,
        checked_at: this.#clock.now().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        instructions: FREEBUFF_INSTRUCTIONS
      };
    }
    return this.#probe("freebuff", endpoint, key);
  }
  async freebuffModels() {
    const key = this.#freebuffKey();
    const url = this.#freebuffEndpoint("models");
    const response = await this.#freebuffRequest(url, key, { method: "GET", headers: { accept: "application/json" } }, "models");
    const payload = await this.#jsonPayload(response, "model catalog", "models");
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
      throw this.#freebuffError("Freebuff \u0432\u0435\u0440\u043D\u0443\u043B \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0432 \u043D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u043E\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435", void 0, "models");
    }
    const models = [];
    for (const raw of payload.data) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const model = raw;
      if (typeof model.id !== "string" || !model.id.trim()) continue;
      models.push({
        id: model.id.trim(),
        name: typeof model.name === "string" && model.name.trim() ? model.name.trim() : model.id.trim(),
        owned_by: typeof model.owned_by === "string" && model.owned_by.trim() ? model.owned_by.trim() : null,
        context_length: this.#positiveInteger(model.context_length),
        max_tokens: this.#positiveInteger(model.max_tokens)
      });
    }
    if (!models.length) throw this.#freebuffError("Freebuff \u0432\u0435\u0440\u043D\u0443\u043B \u043F\u0443\u0441\u0442\u043E\u0439 \u0438\u043B\u0438 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u043E\u0434\u0435\u043B\u0435\u0439", void 0, "models");
    this.#freebuffFailureSignatures.delete("models");
    return models;
  }
  async freebuffChat(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new ValidationError("\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B Freebuff \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C");
    }
    const input = raw;
    const modelId = text2(input.model, "model", 1, 200);
    const prompt = text2(input.prompt, "prompt", 1, 6e3);
    const key = this.#freebuffKey();
    const catalog = await this.freebuffModels();
    if (!catalog.some((model) => model.id === modelId)) {
      throw new ValidationError(`\u041C\u043E\u0434\u0435\u043B\u044C \xAB${modelId}\xBB \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 Freebuff; \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u043C\u043E\u0434\u0435\u043B\u0435\u0439`);
    }
    const response = await this.#freebuffRequest(this.#freebuffEndpoint("chat/completions"), key, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        model: modelId,
        stream: false,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }]
      })
    }, "chat", 12e4);
    const payload = await this.#jsonPayload(response, "chat completion", "chat");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw this.#freebuffError("Freebuff \u0432\u0435\u0440\u043D\u0443\u043B \u043E\u0442\u0432\u0435\u0442 \u0432 \u043D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u043E\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435", void 0, "chat");
    }
    const body = payload;
    const first = Array.isArray(body.choices) ? body.choices[0] : null;
    const message = first && typeof first === "object" && !Array.isArray(first) ? first.message : null;
    const contentValue = message && typeof message === "object" && !Array.isArray(message) ? message.content : null;
    const content = typeof contentValue === "string" ? contentValue : Array.isArray(contentValue) ? contentValue.flatMap((part) => part && typeof part === "object" && !Array.isArray(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []).join("") : "";
    if (!content.trim()) throw this.#freebuffError("Freebuff \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441 \u0431\u0435\u0437 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0433\u043E \u043E\u0442\u0432\u0435\u0442\u0430", void 0, "chat");
    const usageValue = body.usage && typeof body.usage === "object" && !Array.isArray(body.usage) ? body.usage : null;
    this.#freebuffFailureSignatures.delete("chat");
    return {
      model: typeof body.model === "string" ? body.model : modelId,
      content: content.slice(0, 2e4),
      usage: usageValue ? {
        prompt_tokens: this.#nonNegativeInteger(usageValue.prompt_tokens),
        completion_tokens: this.#nonNegativeInteger(usageValue.completion_tokens),
        total_tokens: this.#nonNegativeInteger(usageValue.total_tokens)
      } : null,
      created: this.#nonNegativeInteger(body.created),
      request_id: typeof body.id === "string" ? body.id.slice(0, 200) : null
    };
  }
  #freebuffKey() {
    const key = this.#store.get().providers.freebuff ?? "";
    if (!key) {
      throw new ValidationError("\u0414\u043B\u044F Freebuff Developer API \u043D\u0443\u0436\u0435\u043D \u043A\u043B\u044E\u0447 \u0438\u0437 https://freebuff.com/account/api");
    }
    if (this.#isSessionToken(key)) {
      throw new ValidationError("\u042D\u0442\u043E \u043F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u0441\u0435\u0441\u0441\u0438\u043E\u043D\u043D\u044B\u0439 \u0442\u043E\u043A\u0435\u043D Freebuff CLI/Desktop. \u0414\u043B\u044F \u0432\u043D\u0435\u0448\u043D\u0438\u0445 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u043D\u0443\u0436\u0435\u043D Developer API key \u0438\u0437 https://freebuff.com/account/api");
    }
    return key;
  }
  #isSessionToken(key) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  }
  #freebuffEndpoint(suffix) {
    const base = this.#freebuff.url.trim().replace(/\/+$/, "").replace(/\/models$/i, "");
    let parsed;
    try {
      parsed = new URL(base);
    } catch {
      throw new ValidationError("FREEBUFF_API_URL \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u043C URL");
    }
    const host = parsed.hostname.toLowerCase();
    const loopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    if (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
      throw new ValidationError("Freebuff Developer API \u0434\u043E\u043B\u0436\u0435\u043D \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C HTTPS; HTTP \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F localhost");
    }
    if (!loopback && host !== "freebuff.com" && host !== "www.freebuff.com") {
      throw new ValidationError("API-\u043A\u043B\u044E\u0447 Freebuff \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 freebuff.com \u0438\u043B\u0438 localhost");
    }
    return `${base}/${suffix}`;
  }
  async #freebuffRequest(url, key, init, operation, requestedTimeoutMs = 2e4) {
    const controller = new AbortController();
    const timeoutMs = Math.max(this.#timeoutMs, requestedTimeoutMs);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.#fetch(url, {
        ...init,
        headers: {
          ...init.headers ?? {},
          authorization: `Bearer ${key}`,
          "user-agent": "team-platform/0.8.0 freebuff-developer-api"
        },
        redirect: "error",
        signal: controller.signal
      });
      if (!response.ok) {
        const suffix = response.status === 401 ? "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u0447\u0442\u043E \u0437\u0430\u0434\u0430\u043D Developer API key, \u0430 \u043D\u0435 \u0442\u043E\u043A\u0435\u043D \u0432\u0445\u043E\u0434\u0430 \u0432 Freebuff CLI/Desktop." : response.status === 402 ? "Freebuff \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441 \u0438\u0437-\u0437\u0430 \u043B\u0438\u043C\u0438\u0442\u0430 \u0438\u043B\u0438 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u044F \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435." : "";
        throw this.#freebuffError(`Freebuff Developer API \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ${response.status}${suffix ? `. ${suffix}` : ""}`, response.status, operation);
      }
      return response;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UpstreamError) throw error;
      const message = error instanceof Error && error.name === "AbortError" ? `Freebuff \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${timeoutMs} \u043C\u0441` : error instanceof Error && error.message.includes("redirect") ? "Freebuff API \u043F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441; \u043A\u043B\u044E\u0447 \u043D\u0435 \u0431\u044B\u043B \u043F\u0435\u0440\u0435\u0441\u043B\u0430\u043D \u043D\u0430 \u0434\u0440\u0443\u0433\u043E\u0439 \u0430\u0434\u0440\u0435\u0441" : `Freebuff API \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: ${error instanceof Error ? error.message : String(error)}`;
      throw this.#freebuffError(message, void 0, operation);
    } finally {
      clearTimeout(timer);
    }
  }
  async #jsonPayload(response, label, operation) {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("json")) {
      throw this.#freebuffError(`Freebuff ${label}: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F JSON-\u043E\u0442\u0432\u0435\u0442, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${contentType || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0442\u0438\u043F"}`, response.status, operation);
    }
    try {
      return await response.json();
    } catch {
      throw this.#freebuffError(`Freebuff ${label}: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 JSON`, response.status, operation);
    }
  }
  #freebuffError(message, httpStatus, operation = "api") {
    const signature = `${httpStatus ?? "network"}:${message}`;
    if (signature !== this.#freebuffFailureSignatures.get(operation)) {
      this.#freebuffFailureSignatures.set(operation, signature);
      this.#log.warn("Freebuff Developer API \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F", {
        operation,
        http_status: httpStatus ?? null,
        error: message
      });
    }
    return new UpstreamError(message, httpStatus === void 0 ? {} : { http_status: httpStatus });
  }
  #positiveInteger(value) {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
  }
  #nonNegativeInteger(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
  }
  async #probe(kind, rawUrl, token) {
    const url = rawUrl.trim();
    const shownUrl = safeUrl(url);
    const configured = kind === "entire" ? Boolean(url) : Boolean(url && token && !this.#isSessionToken(token));
    const instructions = kind === "entire" ? ENTIRE_INSTRUCTIONS : FREEBUFF_INSTRUCTIONS;
    const checkedAt = this.#clock.now().toISOString();
    if (!configured) {
      return {
        configured: false,
        state: "not_configured",
        ok: null,
        url: shownUrl,
        auth: Boolean(token),
        http_status: null,
        latency_ms: null,
        checked_at: checkedAt,
        error: null,
        instructions
      };
    }
    if (!/^https?:\/\//i.test(url)) {
      return {
        configured: true,
        state: "error",
        ok: false,
        url: shownUrl,
        auth: Boolean(token),
        http_status: null,
        latency_ms: null,
        checked_at: checkedAt,
        error: "URL \u0434\u043E\u043B\u0436\u0435\u043D \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 http:// \u0438\u043B\u0438 https://",
        instructions
      };
    }
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...token ? { authorization: `Bearer ${token}` } : {}
        },
        redirect: kind === "freebuff" ? "error" : "follow",
        signal: controller.signal
      });
      const latency = Date.now() - started;
      if (!response.ok) {
        const signature = `HTTP ${response.status}`;
        if (kind !== "freebuff" || this.#externalFailureSignatures.get(kind) !== signature) {
          this.#externalFailureSignatures.set(kind, signature);
          this.#log.warn("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u043D\u0435\u0448\u043D\u0435\u0433\u043E \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u043E\u0439", {
            tool: kind,
            http_status: response.status
          });
        }
        const error = kind === "freebuff" && response.status === 401 ? "Freebuff \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u043A\u043B\u044E\u0447 (HTTP 401). \u041D\u0443\u0436\u0435\u043D Developer API key \u0441 freebuff.com/account/api, \u0430 \u043D\u0435 \u0442\u043E\u043A\u0435\u043D \u0432\u0445\u043E\u0434\u0430 CLI/Desktop." : kind === "freebuff" && response.status === 402 ? "Freebuff \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP 402: \u043D\u0430 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430 \u0438\u043B\u0438 \u043B\u0438\u043C\u0438\u0442 Developer API." : `\u0421\u0435\u0440\u0432\u0438\u0441 \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ${response.status}`;
        return {
          configured: true,
          state: "error",
          ok: false,
          url: shownUrl,
          auth: Boolean(token),
          http_status: response.status,
          latency_ms: latency,
          checked_at: this.#clock.now().toISOString(),
          error,
          instructions
        };
      }
      if (kind === "freebuff") this.#externalFailureSignatures.delete(kind);
      return {
        configured: true,
        state: "ok",
        ok: true,
        url: shownUrl,
        auth: Boolean(token),
        http_status: response.status,
        latency_ms: latency,
        checked_at: this.#clock.now().toISOString(),
        error: null,
        instructions
      };
    } catch (error) {
      const message = error instanceof Error ? error.name === "AbortError" ? `\u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 (${this.#timeoutMs} \u043C\u0441)` : error.message : String(error);
      if (this.#externalFailureSignatures.get(kind) !== message) {
        this.#externalFailureSignatures.set(kind, message);
        this.#log.warn("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u043D\u0435\u0448\u043D\u0435\u0433\u043E \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C", { tool: kind, error: message });
      }
      return {
        configured: true,
        state: "error",
        ok: false,
        url: shownUrl,
        auth: Boolean(token),
        http_status: null,
        latency_ms: Date.now() - started,
        checked_at: this.#clock.now().toISOString(),
        error: message,
        instructions
      };
    } finally {
      clearTimeout(timer);
    }
  }
  #reserveSettings() {
    return this.#readReserveSettings().settings;
  }
  /** Строгое чтение: повреждённые настройки — ошибка, а не «всё разрешено». */
  #reserveSettingsStrict() {
    const row = this.#db.raw.prepare("SELECT settings FROM tool_settings WHERE id = ?").get("reserve");
    if (!row) return RESERVE_DEFAULT;
    let parsed;
    try {
      parsed = JSON.parse(row.settings);
    } catch (error) {
      throw new Error(`\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442");
    }
    const settings = parsed;
    if (typeof settings.enabled !== "boolean") {
      throw new Error("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 enabled");
    }
    if (settings.limit !== void 0 && (!Number.isInteger(settings.limit) || settings.limit < 1 || settings.limit > 50)) {
      throw new Error("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: \u043D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 limit");
    }
    return {
      enabled: settings.enabled,
      limit: settings.limit ?? RESERVE_DEFAULT.limit
    };
  }
  #readReserveSettings() {
    try {
      return { settings: this.#reserveSettingsStrict(), error: false };
    } catch {
      return { settings: RESERVE_DEFAULT, error: true };
    }
  }
  /** Строгое чтение проверки провайдеров: ошибка не означает «всё разрешено». */
  #providerGuardSettingsStrict() {
    const row = this.#db.raw.prepare("SELECT settings FROM tool_settings WHERE id = ?").get("providers");
    if (!row) return PROVIDER_GUARD_DEFAULT;
    let parsed;
    try {
      parsed = JSON.parse(row.settings);
    } catch (error) {
      throw new Error(`\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442");
    }
    const settings = parsed;
    if (typeof settings.enabled !== "boolean") {
      throw new Error("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B: \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 enabled");
    }
    return { enabled: settings.enabled };
  }
  #readProviderGuardSettings() {
    try {
      return { settings: this.#providerGuardSettingsStrict(), error: false };
    } catch {
      return { settings: PROVIDER_GUARD_DEFAULT, error: true };
    }
  }
  #providerGuardSettings() {
    return this.#readProviderGuardSettings().settings;
  }
  #spareSettings() {
    const row = this.#db.raw.prepare("SELECT settings FROM tool_settings WHERE id = ?").get("spare");
    const parsed = parseJson(row?.settings, {});
    const start = Number.isInteger(parsed.start_hour) && parsed.start_hour >= 0 && parsed.start_hour <= 23 ? parsed.start_hour : SPARE_DEFAULT.start_hour;
    const endRaw = Number.isInteger(parsed.end_hour) && parsed.end_hour >= 0 && parsed.end_hour <= 23 ? parsed.end_hour : SPARE_DEFAULT.end_hour;
    const end = endRaw === start ? SPARE_DEFAULT.end_hour : endRaw;
    const limit = Number.isInteger(parsed.daily_limit_minutes) && parsed.daily_limit_minutes >= 1 && parsed.daily_limit_minutes <= 1440 ? parsed.daily_limit_minutes : SPARE_DEFAULT.daily_limit_minutes;
    return {
      enabled: parsed.enabled === true,
      start_hour: start,
      end_hour: end,
      daily_limit_minutes: limit,
      override: parsed.override === "open" || parsed.override === "closed" ? parsed.override : null
    };
  }
  #saveSettings(id, settings) {
    this.#db.raw.prepare(`INSERT INTO tool_settings (id, settings, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at`).run(id, JSON.stringify(settings), this.#clock.now().toISOString());
  }
};

// src/adapters/integrations/github.ts
var API = "https://api.github.com";
var GitHubAdapter = class {
  #secrets;
  #fetch;
  constructor(secrets, fetchImpl = fetch) {
    this.#secrets = secrets;
    this.#fetch = fetchImpl;
  }
  #token() {
    const token = this.#secrets().token;
    if (!token) throw new UpstreamError("GitHub \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D: \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0442\u043E\u043A\u0435\u043D \u0432 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u0445");
    return token;
  }
  async #request(path, init = {}) {
    const token = this.#token();
    let response;
    try {
      response = await this.#fetch(`${API}${path}`, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(15e3),
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "team-platform",
          ...init.body ? { "content-type": "application/json" } : {},
          ...init.headers
        }
      });
    } catch {
      throw new UpstreamError("GitHub \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0435\u0442\u044C");
    }
    const body = await response.text();
    if (!response.ok) {
      const rateRemaining = response.headers.get("x-ratelimit-remaining");
      const rateReset = Number(response.headers.get("x-ratelimit-reset") ?? 0);
      let reason = `HTTP ${response.status}`;
      if (response.status === 401) {
        reason = "\u0442\u043E\u043A\u0435\u043D \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D (HTTP 401)";
      } else if (response.status === 403 && rateRemaining === "0") {
        reason = rateReset > 0 ? `\u043B\u0438\u043C\u0438\u0442 GitHub \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D \u0434\u043E ${new Date(rateReset * 1e3).toISOString()}` : "\u043B\u0438\u043C\u0438\u0442 GitHub \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D";
      } else if (response.status === 404) {
        reason = "\u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E (HTTP 404)";
      } else if (response.status === 403) {
        reason = "\u0434\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D (HTTP 403)";
      } else {
        try {
          const parsed = JSON.parse(body);
          if (parsed.message) reason += `: ${parsed.message}`;
        } catch {
        }
      }
      throw new UpstreamError(`GitHub: ${reason}`, { status: response.status });
    }
    return body ? JSON.parse(body) : null;
  }
  async status() {
    const checked_at = (/* @__PURE__ */ new Date()).toISOString();
    if (!this.#secrets().token) {
      return { configured: false, ok: null, account: null, error: null, checked_at };
    }
    try {
      const user = await this.#request("/user");
      return { configured: true, ok: true, account: user.login ?? null, error: null, checked_at };
    } catch (error) {
      return {
        configured: true,
        ok: false,
        account: null,
        error: error instanceof Error ? error.message : String(error),
        checked_at
      };
    }
  }
  async repoInfo(repo) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}`);
    return {
      full_name: data.full_name ?? repo,
      default_branch: data.default_branch ?? "main",
      private: Boolean(data.private),
      description: data.description ?? null,
      pushed_at: data.pushed_at ?? null
    };
  }
  /** `null` — репозиторий существует, но пуст (GitHub отвечает 409). */
  async head(repo, ref) {
    assertRepo(repo);
    try {
      const data = await this.#request(`/repos/${repo}/commits/${encodeURIComponent(ref)}`);
      return {
        sha: data.sha,
        message: data.commit?.message ?? "",
        author: data.commit?.author?.name ?? data.commit?.committer?.name ?? "",
        date: data.commit?.author?.date ?? data.commit?.committer?.date ?? ""
      };
    } catch (error) {
      if (error instanceof UpstreamError && error.details.status === 409) return null;
      throw error;
    }
  }
  async tree(repo, sha) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}/git/trees/${encodeURIComponent(sha)}?recursive=1`);
    const files = (data.tree ?? []).filter((entry) => entry.type === "blob").map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size ?? 0,
      mode: entry.mode
    })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    return { files, truncated: data.truncated === true };
  }
  async blob(repo, sha) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}/git/blobs/${encodeURIComponent(sha)}`);
    if (typeof data.content !== "string") {
      throw new UpstreamError("GitHub: \u0431\u043B\u043E\u0431 \u043F\u0440\u0438\u0448\u0451\u043B \u0431\u0435\u0437 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0433\u043E");
    }
    const encoding = data.encoding === "utf-8" ? "utf-8" : "base64";
    const buffer = encoding === "base64" ? Buffer.from(data.content.replace(/\s+/g, ""), "base64") : Buffer.from(data.content, "utf8");
    return { content: buffer, size: data.size ?? buffer.length, encoding };
  }
  async repos(limit = 20) {
    const data = await this.#request(`/user/repos?per_page=${limit}&sort=updated`);
    return data.map((repo) => ({
      full_name: repo.full_name,
      private: repo.private,
      updated_at: repo.updated_at,
      open_issues: repo.open_issues_count ?? 0
    }));
  }
  async issues(repo, limit = 20) {
    assertRepo(repo);
    const data = await this.#request(`/repos/${repo}/issues?state=open&per_page=${limit}`);
    return data.map(toIssue);
  }
  async createIssue(repo, input) {
    assertRepo(repo);
    const title = input.title.trim();
    if (!title) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u0435\u043D \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438");
    const data = await this.#request(`/repos/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body: input.body ?? "" })
    });
    return toIssue(data);
  }
  async pulls(repo, state = "open", limit = 20) {
    assertRepo(repo);
    const data = await this.#request(
      `/repos/${repo}/pulls?state=${state}&per_page=${Math.min(Math.max(limit, 1), 100)}&sort=updated&direction=desc`
    );
    return data.map(toPull);
  }
  async pull(repo, number) {
    assertRepo(repo);
    if (!Number.isInteger(number) || number < 1) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u0435\u043D \u043D\u043E\u043C\u0435\u0440 PR");
    return toPull(await this.#request(`/repos/${repo}/pulls/${number}`));
  }
  async createPull(repo, input) {
    assertRepo(repo);
    const title = input.title.trim();
    const head = input.head.trim();
    const base = input.base.trim();
    if (!title) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u0435\u043D \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A PR");
    if (!head || !base) throw new UpstreamError("GitHub: \u043D\u0443\u0436\u043D\u044B \u0432\u0435\u0442\u043A\u0438 head \u0438 base");
    return toPull(await this.#request(`/repos/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title,
        head,
        base,
        body: input.body ?? "",
        draft: input.draft === true
      })
    }));
  }
};
function toPull(pull) {
  return {
    number: pull.number,
    title: pull.title,
    state: pull.state,
    draft: pull.draft === true,
    url: pull.html_url,
    created_at: pull.created_at,
    updated_at: pull.updated_at,
    author: pull.user?.login ?? "",
    head: pull.head?.ref ?? pull.head?.label ?? "",
    base: pull.base?.ref ?? "",
    mergeable: typeof pull.mergeable === "boolean" ? pull.mergeable : null
  };
}
function assertRepo(repo) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new UpstreamError("GitHub: \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A owner/name");
  }
}
function toIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    created_at: issue.created_at,
    author: issue.user?.login ?? ""
  };
}

// src/adapters/integrations/discord.ts
import { extname } from "node:path";
var API2 = "https://discord.com/api/v10";
var DiscordAdapter = class {
  #secrets;
  #fetch;
  constructor(secrets, fetchImpl = fetch) {
    this.#secrets = secrets;
    this.#fetch = fetchImpl;
  }
  #mode() {
    const secrets = this.#secrets();
    if (secrets.bot_token) return "bot";
    if (secrets.webhook_url) return "webhook";
    return "off";
  }
  async #botRequest(path, init = {}) {
    const token = this.#secrets().bot_token;
    if (!token) throw new UpstreamError("Discord: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D \u0442\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430");
    return this.#json(`${API2}${path}`, {
      ...init,
      headers: {
        authorization: `Bot ${token}`,
        ...init.body ? { "content-type": "application/json" } : {},
        ...init.headers
      }
    });
  }
  async #userRequest(path, init = {}) {
    const token = this.#secrets().user_token;
    if (!token) throw new UpstreamError("Discord: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D \u0442\u043E\u043A\u0435\u043D \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430");
    return this.#json(`${API2}${path}`, {
      ...init,
      headers: {
        authorization: token,
        ...init.body ? { "content-type": "application/json" } : {},
        ...init.headers
      }
    });
  }
  async #json(url, init) {
    let response;
    try {
      response = await this.#fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(15e3) });
    } catch {
      throw new UpstreamError("Discord \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0435\u0442\u044C");
    }
    const body = await response.text();
    if (!response.ok) {
      throw new UpstreamError(`Discord: HTTP ${response.status}`, { status: response.status });
    }
    return body ? JSON.parse(body) : null;
  }
  async status() {
    const checked_at = (/* @__PURE__ */ new Date()).toISOString();
    const secrets = this.#secrets();
    if (!secrets.bot_token && !secrets.webhook_url) {
      return { configured: false, ok: null, account: null, error: null, checked_at };
    }
    try {
      if (this.#mode() === "bot") {
        const me = await this.#botRequest("/users/@me");
        return { configured: true, ok: true, account: me.username ?? me.id ?? null, error: null, checked_at };
      }
      const hook = await this.#json(secrets.webhook_url, { method: "GET" });
      return {
        configured: true,
        ok: true,
        account: hook.name ? `\u0432\u0435\u0431\u0445\u0443\u043A ${hook.name}` : "\u0432\u0435\u0431\u0445\u0443\u043A",
        error: null,
        checked_at
      };
    } catch (error) {
      return {
        configured: true,
        ok: false,
        account: null,
        error: error instanceof Error ? error.message : String(error),
        checked_at
      };
    }
  }
  async guilds() {
    if (this.#mode() !== "bot") throw new UpstreamError("Discord: \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0431\u043E\u0442\u0443");
    const data = await this.#botRequest("/users/@me/guilds");
    return data.map((guild) => ({ id: guild.id, name: guild.name }));
  }
  async channels(guildId) {
    if (!/^\d{5,25}$/.test(guildId)) throw new UpstreamError("Discord: \u043D\u0443\u0436\u0435\u043D \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 id \u0441\u0435\u0440\u0432\u0435\u0440\u0430");
    if (this.#mode() !== "bot") throw new UpstreamError("Discord: \u043A\u0430\u043D\u0430\u043B\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0431\u043E\u0442\u0443");
    const data = await this.#botRequest(`/guilds/${guildId}/channels`);
    return data.filter((channel) => channel.type === 0 || channel.type === 5).map((channel) => ({ id: channel.id, name: channel.name, type: channel.type }));
  }
  async send(content) {
    const secrets = this.#secrets();
    if (this.#mode() === "webhook") return this.#sendWebhook(content);
    if (this.#mode() === "bot") {
      const channel = secrets.channel_id;
      if (!/^\d{5,25}$/.test(channel)) {
        throw new UpstreamError("Discord: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 id \u043A\u0430\u043D\u0430\u043B\u0430 \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043E\u0442 \u0431\u043E\u0442\u0430");
      }
      return this.sendTo(channel, content);
    }
    throw new UpstreamError("Discord \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D: \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0442\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430 \u0438\u043B\u0438 \u0432\u0435\u0431\u0445\u0443\u043A");
  }
  async #sendWebhook(content) {
    const body = content.trim();
    if (!body) throw new UpstreamError("Discord: \u043F\u0443\u0441\u0442\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435");
    if (body.length > 2e3) throw new UpstreamError("Discord: \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    await this.#json(this.#secrets().webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: body })
    });
    return { delivered: true };
  }
  /**
   * Отправка в конкретный канал от бота (для ответов на команды).
   * `replyTo` делает сообщение ответом на исходный вопрос: ответ из очереди
   * приходит в ту же ветку, а не отдельной строкой в канале.
   */
  async sendTo(channelId, content, replyTo) {
    const body = content.trim();
    if (!body) throw new UpstreamError("Discord: \u043F\u0443\u0441\u0442\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435");
    if (body.length > 2e3) throw new UpstreamError("Discord: \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    if (!/^\d{5,25}$/.test(channelId)) throw new UpstreamError("Discord: \u043D\u0443\u0436\u0435\u043D \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 id \u043A\u0430\u043D\u0430\u043B\u0430");
    const reference = replyTo && /^\d{5,25}$/.test(replyTo) ? { message_reference: { message_id: replyTo, fail_if_not_exists: false } } : {};
    await this.#botRequest(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: body, allowed_mentions: { parse: [] }, ...reference })
    });
    return { delivered: true };
  }
  /** Отправить выбранное пользователем вложение; сервер не принимает локальные пути. */
  async sendFile(channelId, name, data, content = "") {
    if (!/^\d{5,25}$/.test(channelId)) throw new UpstreamError("Discord: \u043D\u0443\u0436\u0435\u043D \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 id \u043A\u0430\u043D\u0430\u043B\u0430");
    const safeName = name.trim().replace(/[\\/]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "_").slice(0, 180);
    if (!safeName || safeName === "." || safeName === "..") throw new UpstreamError("Discord: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F \u0444\u0430\u0439\u043B\u0430");
    if (data.byteLength > 25 * 1024 * 1024) throw new UpstreamError("Discord: \u0444\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 25 \u041C\u0411");
    const text3 = content.trim();
    if (text3.length > 1900) throw new UpstreamError("Discord: \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u0434\u043B\u0438\u043D\u043D\u0435\u0435 1900 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    const form = new FormData();
    form.append("payload_json", JSON.stringify({
      content: text3,
      allowed_mentions: { parse: [] },
      attachments: [{ id: 0, filename: safeName }]
    }));
    form.append("files[0]", new Blob([data], { type: mimeType(safeName) }), safeName);
    const token = this.#secrets().bot_token;
    if (!token) throw new UpstreamError("Discord: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D \u0442\u043E\u043A\u0435\u043D \u0431\u043E\u0442\u0430");
    let response;
    try {
      response = await this.#fetch(`${API2}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { authorization: `Bot ${token}` },
        body: form,
        signal: AbortSignal.timeout(6e4)
      });
    } catch {
      throw new UpstreamError("Discord \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0435\u0442\u044C");
    }
    const body = await response.text();
    if (!response.ok) throw new UpstreamError(`Discord: HTTP ${response.status}`, { status: response.status });
    if (body) {
      try {
        JSON.parse(body);
      } catch {
        throw new UpstreamError("Discord: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043D\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443 \u0444\u0430\u0439\u043B\u0430");
      }
    }
    return { delivered: true, name: safeName, bytes: data.byteLength };
  }
  async botIdentity() {
    const me = await this.#botRequest("/users/@me");
    return { id: me.id ?? "", username: me.username ?? "" };
  }
  /** Гильдия канала: команды регистрируются в ней, чтобы появиться сразу. */
  async channelGuild(channelId) {
    if (!/^\d{5,25}$/.test(channelId)) throw new UpstreamError("Discord: \u043D\u0443\u0436\u0435\u043D \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 id \u043A\u0430\u043D\u0430\u043B\u0430");
    const data = await this.#botRequest(`/channels/${channelId}`);
    return String(data?.guild_id ?? "");
  }
  /** PUT-регистрация слэш-команд: в гильдии (сразу) или глобально. */
  async registerCommands(commands, guildId = "") {
    const application = this.#secrets().application_id ?? "";
    if (!/^\d{5,25}$/.test(application)) {
      throw new UpstreamError("Discord: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D Application ID \u0434\u043B\u044F \u0441\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434");
    }
    const endpoint = /^\d{5,25}$/.test(guildId) ? `/applications/${application}/guilds/${guildId}/commands` : `/applications/${application}/commands`;
    const data = await this.#botRequest(endpoint, { method: "PUT", body: JSON.stringify(commands) });
    return Array.isArray(data) ? data : [];
  }
  /** Ответ на интеракцию: 4 — сообщение, 5 — отложенный ответ, 8 — автодополнение. */
  async interactionCallback(interactionId, token, data) {
    if (!/^\d{5,25}$/.test(interactionId) || !token) {
      throw new UpstreamError("Discord: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0446\u0438\u044F");
    }
    await this.#botRequest(`/interactions/${interactionId}/${token}/callback`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
  /** Правка ответа на интеракцию (после отложенного подтверждения). */
  async editInteractionReply(applicationId, token, content) {
    if (!/^\d{5,25}$/.test(applicationId) || !token) {
      throw new UpstreamError("Discord: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D Application ID \u0438\u043B\u0438 \u0442\u043E\u043A\u0435\u043D \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0446\u0438\u0438");
    }
    const body = content.trim();
    if (!body) throw new UpstreamError("Discord: \u043F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442 \u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0443");
    if (body.length > 2e3) throw new UpstreamError("Discord: \u043E\u0442\u0432\u0435\u0442 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    await this.#botRequest(`/webhooks/${applicationId}/${token}/messages/@original`, {
      method: "PATCH",
      body: JSON.stringify({ content: body, allowed_mentions: { parse: [] } })
    });
  }
  /** Сообщения канала для polling-бота; `after` — id последнего обработанного. */
  async botMessages(after, limit = 50) {
    const secrets = this.#secrets();
    if (!/^\d{5,25}$/.test(secrets.channel_id)) {
      throw new UpstreamError("Discord: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 id \u043A\u0430\u043D\u0430\u043B\u0430 \u0434\u043B\u044F \u043A\u043E\u043C\u0430\u043D\u0434 \u0431\u043E\u0442\u0430");
    }
    const tail = after ? `&after=${encodeURIComponent(after)}` : "";
    const data = await this.#botRequest(
      `/channels/${secrets.channel_id}/messages?limit=${Math.min(Math.max(limit, 1), 100)}${tail}`
    );
    return Array.isArray(data) ? data : [];
  }
  /** Личные каналы аккаунта: id + имя собеседника. Токен не покидает адаптер. */
  async personalChannels() {
    const data = await this.#userRequest("/users/@me/channels");
    return (Array.isArray(data) ? data : []).map((channel) => ({
      id: String(channel.id ?? ""),
      recipient: channel.recipients?.[0]?.global_name ?? channel.recipients?.[0]?.username ?? "\u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u043D\u0430\u043B"
    })).filter((channel) => /^\d{5,25}$/.test(channel.id));
  }
  /** Ответ от имени личного аккаунта в существующий личный канал. */
  async sendPersonal(channelId, content) {
    const body = content.trim();
    if (!body) throw new UpstreamError("Discord: \u043F\u0443\u0441\u0442\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435");
    if (body.length > 2e3) throw new UpstreamError("Discord: \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    if (!/^\d{5,25}$/.test(channelId)) throw new UpstreamError("Discord: \u043D\u0443\u0436\u0435\u043D \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 id \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043A\u0430\u043D\u0430\u043B\u0430");
    await this.#userRequest(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: body })
    });
    return { delivered: true };
  }
};
function mimeType(name) {
  switch (extname(name).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    case ".json":
      return "application/json";
    case ".txt":
    case ".log":
    case ".md":
      return "text/plain; charset=utf-8";
    case ".csv":
      return "text/csv; charset=utf-8";
    case ".zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

// src/adapters/integrations/google.ts
var TOKEN_URL = "https://oauth2.googleapis.com/token";
var CALENDAR = "https://www.googleapis.com/calendar/v3";
var GMAIL = "https://gmail.googleapis.com/gmail/v1";
var GoogleAdapter = class {
  #secrets;
  #fetch;
  #token = null;
  constructor(secrets, fetchImpl = fetch) {
    this.#secrets = secrets;
    this.#fetch = fetchImpl;
  }
  async #accessToken() {
    const secrets = this.#secrets();
    if (secrets.access_token) return secrets.access_token;
    if (!secrets.client_id || !secrets.client_secret || !secrets.refresh_token) {
      throw new UpstreamError("Google \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D: \u043D\u0443\u0436\u043D\u044B client_id, client_secret \u0438 refresh_token");
    }
    const key = `${secrets.client_id}:${secrets.refresh_token}`;
    if (this.#token && this.#token.key === key && this.#token.expires_at > Date.now() + 6e4) {
      return this.#token.value;
    }
    let response;
    try {
      response = await this.#fetch(TOKEN_URL, {
        method: "POST",
        signal: AbortSignal.timeout(15e3),
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: secrets.client_id,
          client_secret: secrets.client_secret,
          refresh_token: secrets.refresh_token,
          grant_type: "refresh_token"
        }).toString()
      });
    } catch {
      throw new UpstreamError("Google \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0435\u0442\u044C");
    }
    const body = await response.text() || "{}";
    if (!response.ok) {
      let reason = `HTTP ${response.status}`;
      try {
        const parsed2 = JSON.parse(body);
        if (parsed2.error_description) reason += `: ${parsed2.error_description}`;
        else if (parsed2.error) reason += `: ${parsed2.error}`;
      } catch {
      }
      throw new UpstreamError(`Google: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0442\u043E\u043A\u0435\u043D (${reason})`, { status: response.status });
    }
    const parsed = JSON.parse(body);
    if (!parsed.access_token) throw new UpstreamError("Google: \u043E\u0442\u0432\u0435\u0442 \u0431\u0435\u0437 access_token");
    this.#token = {
      key,
      value: parsed.access_token,
      expires_at: Date.now() + (parsed.expires_in ?? 3600) * 1e3
    };
    return parsed.access_token;
  }
  async #get(url) {
    const token = await this.#accessToken();
    let response;
    try {
      response = await this.#fetch(url, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15e3)
      });
    } catch {
      throw new UpstreamError("Google \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0435\u0442\u044C");
    }
    const body = await response.text();
    if (!response.ok) {
      let reason = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(body);
        if (parsed.error?.message) reason += `: ${parsed.error.message}`;
      } catch {
      }
      if (response.status === 401) reason = "\u0442\u043E\u043A\u0435\u043D \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D (HTTP 401)";
      throw new UpstreamError(`Google: ${reason}`, { status: response.status });
    }
    return body ? JSON.parse(body) : null;
  }
  async status() {
    const checked_at = (/* @__PURE__ */ new Date()).toISOString();
    const secrets = this.#secrets();
    const configured = Boolean(
      secrets.access_token || secrets.client_id && secrets.client_secret && secrets.refresh_token
    );
    if (!configured) return { configured: false, ok: null, account: null, error: null, checked_at };
    try {
      const info = await this.#get("https://www.googleapis.com/oauth2/v3/userinfo");
      return { configured: true, ok: true, account: info.email ?? null, error: null, checked_at };
    } catch (error) {
      return {
        configured: true,
        ok: false,
        account: null,
        error: error instanceof Error ? error.message : String(error),
        checked_at
      };
    }
  }
  async calendar(days = 7) {
    const span = Math.min(Math.max(days, 1), 30);
    const timeMin = (/* @__PURE__ */ new Date()).toISOString();
    const timeMax = new Date(Date.now() + span * 864e5).toISOString();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "20"
    });
    const data = await this.#get(`${CALENDAR}/calendars/primary/events?${params}`);
    return (data.items ?? []).map((event) => ({
      id: event.id,
      summary: event.summary ?? "(\u0431\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F)",
      start: event.start?.dateTime ?? event.start?.date ?? "",
      end: event.end?.dateTime ?? event.end?.date ?? "",
      link: event.htmlLink ?? null
    }));
  }
  async drive(limit = 10) {
    const max = Math.min(Math.max(limit, 1), 20);
    const params = new URLSearchParams({
      pageSize: String(max),
      orderBy: "modifiedTime desc",
      fields: "files(id,name,mimeType,modifiedTime,webViewLink)"
    });
    const data = await this.#get(`https://www.googleapis.com/drive/v3/files?${params}`);
    return (data.files ?? []).map((file) => ({
      id: file.id,
      name: file.name,
      mime_type: file.mimeType ?? "",
      modified_at: file.modifiedTime ?? "",
      link: file.webViewLink ?? null
    }));
  }
  async mail(limit = 10) {
    const max = Math.min(Math.max(limit, 1), 20);
    const list = await this.#get(`${GMAIL}/users/me/messages?maxResults=${max}`);
    const messages = [];
    for (const item of list.messages ?? []) {
      const data = await this.#get(
        `${GMAIL}/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
      );
      const header = (name) => data.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
      messages.push({
        id: data.id,
        subject: header("Subject") || "(\u0431\u0435\u0437 \u0442\u0435\u043C\u044B)",
        from: header("From"),
        date: header("Date"),
        snippet: data.snippet ?? ""
      });
    }
    return messages;
  }
};

// src/adapters/integrations/discord-rpc.ts
import { connect } from "node:net";
import { randomUUID as randomUUID2 } from "node:crypto";
var DEFAULT_PREFIX = process.platform === "win32" ? "\\\\.\\pipe\\discord-ipc-" : "/tmp/discord-ipc-";
function encode(op, value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}
function connectPipe(path, timeoutMs) {
  return new Promise((resolve2, reject) => {
    const socket = connect(path);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`\u043D\u0435\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 ${path}`));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve2(socket);
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
function errorText(frame) {
  const code = Number(frame.data?.code);
  if (code === 4e3) return "\u043D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 Application ID";
  if (code === 4001) return "Discord \u043E\u0442\u043A\u0430\u0437\u0430\u043B \u0432 \u0434\u043E\u0441\u0442\u0443\u043F\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044E";
  if (code === 4002) return "Discord \u043D\u0435 \u043F\u043E\u043D\u044F\u043B \u043A\u043E\u043C\u0430\u043D\u0434\u0443";
  if (code === 4003) return "\u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043D Application ID";
  return frame.data?.message ? String(frame.data.message) : `Discord IPC \u043E\u0448\u0438\u0431\u043A\u0430${code ? ` ${code}` : ""}`;
}
var DiscordRpcClient = class {
  #clientId;
  #prefix;
  #connectTimeoutMs;
  #socket = null;
  #buffer = Buffer.alloc(0);
  #pending = /* @__PURE__ */ new Map();
  #ready = null;
  #readyError = null;
  #pipe = null;
  #lastError = null;
  #activity = null;
  constructor(clientId, options = {}) {
    this.#clientId = clientId;
    this.#prefix = options.pipePrefix ?? DEFAULT_PREFIX;
    this.#connectTimeoutMs = options.connectTimeoutMs ?? 1200;
  }
  status() {
    return {
      connected: Boolean(this.#socket && !this.#socket.destroyed),
      pipe: this.#pipe,
      last_error: this.#lastError,
      activity: this.#activity
    };
  }
  async setActivity(activity) {
    const clientId = this.#clientId().trim();
    if (!/^\d{5,25}$/.test(clientId)) {
      this.#lastError = "Application ID \u043D\u0435 \u0437\u0430\u0434\u0430\u043D \u0438\u043B\u0438 \u043D\u0435\u0432\u0435\u0440\u0435\u043D";
      return this.status();
    }
    try {
      await this.#ensure(clientId);
      await this.#request("SET_ACTIVITY", { pid: process.pid, activity });
      this.#activity = `${activity.details} \xB7 ${activity.state}`;
      this.#lastError = null;
    } catch (error) {
      this.#lastError = error instanceof Error ? error.message : String(error);
      this.close();
    }
    return this.status();
  }
  async clear() {
    if (!this.#socket) {
      this.#activity = null;
      return this.status();
    }
    try {
      await this.#request("SET_ACTIVITY", { pid: process.pid, activity: null });
      this.#activity = null;
      this.#lastError = null;
    } catch (error) {
      this.#lastError = error instanceof Error ? error.message : String(error);
      this.close();
    }
    return this.status();
  }
  close() {
    this.#socket?.destroy();
    this.#socket = null;
    this.#pipe = null;
    this.#buffer = Buffer.alloc(0);
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Discord IPC \u0437\u0430\u043A\u0440\u044B\u0442"));
    }
    this.#pending.clear();
  }
  async #ensure(clientId) {
    if (this.#socket && !this.#socket.destroyed) return;
    let lastError = null;
    for (let index = 0; index < 10; index += 1) {
      const path = `${this.#prefix}${index}`;
      let socket;
      try {
        socket = await connectPipe(path, this.#connectTimeoutMs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
      this.#socket = socket;
      this.#pipe = path;
      this.#buffer = Buffer.alloc(0);
      socket.on("data", (chunk) => this.#onData(chunk));
      socket.on("close", () => {
        this.#socket = null;
        this.#pipe = null;
      });
      socket.on("error", (error) => {
        this.#lastError = error.message;
      });
      const ready = new Promise((resolve2, reject) => {
        const timer = setTimeout(() => {
          this.#ready = null;
          this.#readyError = null;
          reject(new Error("Discord \u043D\u0435 \u043F\u0440\u0438\u0441\u043B\u0430\u043B READY"));
        }, 2e3);
        this.#ready = () => {
          clearTimeout(timer);
          this.#ready = null;
          this.#readyError = null;
          resolve2();
        };
        this.#readyError = (error) => {
          clearTimeout(timer);
          this.#ready = null;
          this.#readyError = null;
          reject(error);
        };
      });
      socket.write(encode(0, { v: 1, client_id: clientId }));
      try {
        await ready;
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.close();
      }
    }
    throw new Error(lastError ? `Discord \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D: ${lastError.message}` : "Discord \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D");
  }
  #request(cmd, args) {
    const socket = this.#socket;
    if (!socket || socket.destroyed) return Promise.reject(new Error("Discord IPC \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D"));
    const nonce = randomUUID2();
    return new Promise((resolve2, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(nonce);
        reject(new Error(`Discord \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 ${cmd}`));
      }, 7e3);
      this.#pending.set(nonce, { resolve: resolve2, reject, timer });
      socket.write(encode(1, { cmd, args, nonce }));
    });
  }
  #onData(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    while (this.#buffer.length >= 8) {
      const length = this.#buffer.readInt32LE(4);
      if (length < 0 || length > 1e6) {
        this.#lastError = "Discord IPC \u043F\u0440\u0438\u0441\u043B\u0430\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u0430\u0434\u0440";
        this.close();
        return;
      }
      if (this.#buffer.length < 8 + length) return;
      const body = this.#buffer.subarray(8, 8 + length).toString("utf8");
      this.#buffer = this.#buffer.subarray(8 + length);
      let frame;
      try {
        frame = JSON.parse(body);
      } catch {
        continue;
      }
      if (frame.evt === "READY") {
        this.#ready?.();
        continue;
      }
      if (frame.evt === "ERROR" || frame.cmd === "ERROR") {
        this.#lastError = errorText(frame);
        this.#readyError?.(new Error(this.#lastError));
        continue;
      }
      const nonce = frame.nonce;
      if (nonce && this.#pending.has(nonce)) {
        const pending = this.#pending.get(nonce);
        clearTimeout(pending.timer);
        this.#pending.delete(nonce);
        if (frame.evt === "ERROR" || Number(frame.data?.code)) pending.reject(new Error(errorText(frame)));
        else pending.resolve(frame.data ?? null);
      }
    }
  }
};

// src/adapters/integrations/discord-gateway.ts
var GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
var GATEWAY_INTENTS = 1 << 9 | 1 << 12;
function errorText2(error) {
  return error instanceof Error ? error.message : String(error);
}
function defaultSocketFactory() {
  const ctor = globalThis.WebSocket;
  if (typeof ctor !== "function") return null;
  return (url) => new ctor(url);
}
var DiscordGateway = class {
  #options;
  #log;
  #minMs;
  #maxMs;
  #socket = null;
  #heartbeat = null;
  #retry = null;
  #state = "off";
  #since = null;
  #error = null;
  #received = 0;
  #sequence = null;
  #attempts = 0;
  #stopped = true;
  #selfId = "";
  constructor(options) {
    this.#options = options;
    this.#log = options.log.child({ module: "discord-gateway" });
    this.#minMs = Math.max(1e3, options.reconnectMinMs ?? 5e3);
    this.#maxMs = Math.max(this.#minMs, options.reconnectMaxMs ?? 6e4);
  }
  /** id бота из READY; по нему распознаются собственные сообщения. */
  get selfId() {
    return this.#selfId;
  }
  status() {
    return {
      state: this.#state,
      since: this.#since,
      error: this.#error,
      received: this.#received
    };
  }
  start() {
    if (!this.#stopped) return;
    this.#stopped = false;
    this.#connect();
  }
  stop() {
    this.#stopped = true;
    this.#clearHeartbeat();
    if (this.#retry) {
      clearTimeout(this.#retry);
      this.#retry = null;
    }
    const socket = this.#socket;
    this.#socket = null;
    if (socket) {
      try {
        socket.close();
      } catch {
      }
    }
    this.#state = "off";
  }
  #connect() {
    if (this.#stopped) return;
    const token = this.#options.token().trim();
    if (!token) {
      this.#state = "off";
      return;
    }
    const create = this.#options.socket ?? defaultSocketFactory();
    if (!create) {
      this.#state = "unsupported";
      this.#error = "\u042D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F Node \u043D\u0435 \u0443\u043C\u0435\u0435\u0442 WebSocket: \u0441\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B, \u043E\u043F\u0440\u043E\u0441 \u043A\u0430\u043D\u0430\u043B\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442.";
      return;
    }
    this.#state = "connecting";
    this.#since = (/* @__PURE__ */ new Date()).toISOString();
    let socket;
    try {
      socket = create(this.#options.url ?? GATEWAY_URL);
    } catch (error) {
      this.#state = "closed";
      this.#error = `Gateway: ${errorText2(error)}`;
      this.#schedule();
      return;
    }
    this.#socket = socket;
    socket.onmessage = (event) => this.#receive(event.data);
    socket.onerror = () => {
      this.#error = "\u0421\u0432\u044F\u0437\u044C \u0441 Gateway Discord \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u0430";
    };
    socket.onclose = () => {
      if (this.#socket !== socket) return;
      this.#socket = null;
      this.#clearHeartbeat();
      this.#state = "closed";
      this.#since = (/* @__PURE__ */ new Date()).toISOString();
      if (!this.#stopped) this.#schedule();
    };
  }
  #schedule() {
    if (this.#stopped || this.#retry) return;
    const wait = Math.min(this.#maxMs, this.#minMs * 2 ** Math.min(this.#attempts, 4));
    this.#attempts += 1;
    this.#retry = setTimeout(() => {
      this.#retry = null;
      this.#connect();
    }, wait);
    this.#retry.unref();
  }
  #clearHeartbeat() {
    if (!this.#heartbeat) return;
    clearInterval(this.#heartbeat);
    this.#heartbeat = null;
  }
  #send(payload) {
    const socket = this.#socket;
    if (!socket) return;
    try {
      socket.send(JSON.stringify(payload));
    } catch (error) {
      this.#error = `Gateway: ${errorText2(error)}`;
    }
  }
  #receive(raw) {
    let payload = null;
    try {
      payload = JSON.parse(typeof raw === "string" ? raw : String(raw));
    } catch {
      return;
    }
    if (payload.s !== null && payload.s !== void 0) this.#sequence = payload.s;
    switch (payload.op) {
      case 10: {
        const hello = payload.d;
        const interval = Math.max(1e3, Number(hello?.heartbeat_interval) || 45e3);
        this.#clearHeartbeat();
        this.#heartbeat = setInterval(() => this.#send({ op: 1, d: this.#sequence }), interval);
        this.#heartbeat.unref();
        this.#send({
          op: 2,
          d: {
            token: this.#options.token(),
            intents: GATEWAY_INTENTS,
            properties: { os: process.platform, browser: "team-platform", device: "team-platform" }
          }
        });
        return;
      }
      case 1:
        this.#send({ op: 1, d: this.#sequence });
        return;
      case 7:
        this.#socket?.close();
        return;
      case 9:
        this.#state = "closed";
        this.#socket?.close();
        return;
      case 11:
        return;
      case 0:
        break;
      default:
        return;
    }
    if (payload.t === "READY") {
      const self = payload.d?.user;
      if (self?.id) this.#selfId = String(self.id);
      this.#state = "ready";
      this.#since = (/* @__PURE__ */ new Date()).toISOString();
      this.#error = null;
      this.#attempts = 0;
      void Promise.resolve(this.#options.onReady?.()).catch((error) => {
        this.#error = `\u041F\u043E\u0441\u043B\u0435 READY: ${errorText2(error)}`;
      });
      return;
    }
    if (payload.t === "INTERACTION_CREATE") {
      this.#received += 1;
      const interaction = payload.d;
      void Promise.resolve(this.#options.onInteraction?.(interaction)).catch((error) => {
        this.#error = `\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0432 Discord: ${errorText2(error)}`;
        this.#log.warn("\u0418\u043D\u0442\u0435\u0440\u0430\u043A\u0446\u0438\u044F Discord \u043D\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430", { error: errorText2(error) });
      });
    }
  }
};

// src/kernel/ids.ts
import { randomUUID as randomUUID3 } from "node:crypto";
function newId(prefix) {
  return `${prefix}_${randomUUID3().replace(/-/g, "").slice(0, 16)}`;
}

// src/app/discord-queue.ts
var MAX_PENDING_QUESTIONS = 50;
var COLUMNS = `id, task_id, agent, kind, text, author_id, author_name, channel_id,
  message_id, run_id, created_at, dispatched_at`;
function toQuestion(row) {
  return {
    id: row.id,
    task_id: row.task_id,
    agent: row.agent,
    kind: row.kind === "task" ? "task" : "ask",
    text: row.text,
    author_id: row.author_id,
    author_name: row.author_name,
    channel_id: row.channel_id,
    message_id: row.message_id,
    run_id: row.run_id,
    created_at: row.created_at,
    dispatched_at: row.dispatched_at
  };
}
var DiscordQuestionQueue = class {
  #db;
  #runs;
  #log;
  #max;
  #chain = Promise.resolve();
  constructor(db, runs, log, options = {}) {
    this.#db = db;
    this.#runs = runs;
    this.#log = log.child({ module: "discord-queue" });
    this.#max = Math.max(1, options.max ?? MAX_PENDING_QUESTIONS);
  }
  get max() {
    return this.#max;
  }
  size() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS count FROM discord_questions WHERE dispatched_at IS NULL").get();
    return Number(row?.count ?? 0);
  }
  /**
   * Счётчик для статуса: база может быть уже закрыта при остановке приложения,
   * и наблюдение за очередью не должно ронять процесс. Лимит проверяет `size()`.
   */
  pendingCount() {
    try {
      return this.size();
    } catch {
      return 0;
    }
  }
  pendingFor(agent) {
    const rows = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM discord_questions
        WHERE dispatched_at IS NULL AND agent = ?
        ORDER BY created_at ASC, rowid ASC`).all(agent);
    return rows.map(toQuestion);
  }
  all() {
    const rows = this.#db.raw.prepare(`SELECT ${COLUMNS} FROM discord_questions
        WHERE dispatched_at IS NULL ORDER BY created_at ASC, rowid ASC`).all();
    return rows.map(toQuestion);
  }
  /** `null` — очередь заполнена; вопрос не потерян молча, вызывающий отвечает человеку. */
  enqueue(input) {
    if (this.size() >= this.#max) return null;
    const position = this.pendingFor(input.agent).length + 1;
    const question = {
      id: newId("question"),
      task_id: input.task_id,
      agent: input.agent,
      kind: input.kind,
      text: input.text.slice(0, 3e4),
      author_id: String(input.author.id ?? "").slice(0, 40),
      author_name: String(input.author.name ?? "").slice(0, 80),
      channel_id: input.channel_id,
      message_id: input.message_id,
      run_id: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      dispatched_at: null
    };
    this.#db.raw.prepare(`INSERT INTO discord_questions (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      question.id,
      question.task_id,
      question.agent,
      question.kind,
      question.text,
      question.author_id,
      question.author_name,
      question.channel_id,
      question.message_id,
      question.run_id,
      question.created_at,
      question.dispatched_at
    );
    this.#log.info("\u0412\u043E\u043F\u0440\u043E\u0441 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 Discord", {
      question_id: question.id,
      agent: question.agent,
      position
    });
    return { question, position };
  }
  /** Немедленный запуск: тот же путь, что у очереди, но без ожидания. */
  start(input) {
    const run = this.#runs.create({ task_id: input.task_id, agent: input.agent, max_attempts: 1 }).run;
    this.#rememberReply(run.id, input.channel_id, input.message_id);
    return run;
  }
  /**
   * Запускает вопросы, чьи участники освободились. Вызовы сериализуются: тик
   * опроса и событие завершения запуска могут прийти одновременно, и один
   * вопрос не должен превратиться в два запуска.
   */
  dispatch(context) {
    this.#chain = this.#chain.then(() => this.#dispatchOnce(context)).catch((error) => {
      this.#log.warn("\u0414\u0438\u0441\u043F\u0435\u0442\u0447\u0435\u0440 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439", {
        error: error instanceof Error ? error.message : String(error)
      });
    });
    return this.#chain;
  }
  pendingReply(runId) {
    const row = this.#db.raw.prepare("SELECT channel_id, message_id, sent_at FROM discord_run_replies WHERE run_id = ?").get(runId);
    if (!row || row.sent_at) return null;
    return { channel_id: row.channel_id, message_id: row.message_id };
  }
  markReplySent(runId) {
    this.#db.raw.prepare("UPDATE discord_run_replies SET sent_at = ? WHERE run_id = ? AND sent_at IS NULL").run((/* @__PURE__ */ new Date()).toISOString(), runId);
  }
  async #dispatchOnce(context) {
    const questions = this.all();
    if (!questions.length) return;
    for (const question of questions) {
      if (context.agents.length && !context.agents.includes(question.agent)) {
        await this.#notify(
          context,
          question,
          `\u26A0\uFE0F ${question.agent} \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u2014 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u0435\u0433\u043E \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0443.`
        );
        this.#forget(question.id);
        continue;
      }
      if (this.#busy(question.agent)) continue;
      let run;
      try {
        run = this.#runs.create({
          task_id: question.task_id,
          agent: question.agent,
          max_attempts: 1
        }).run;
      } catch (error) {
        await this.#notify(
          context,
          question,
          `\u26A0\uFE0F \u0412\u043E\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C: ${error instanceof Error ? error.message : String(error)}`
        );
        this.#forget(question.id);
        continue;
      }
      const claimedRow = this.#db.raw.prepare("UPDATE discord_questions SET run_id = ?, dispatched_at = ? WHERE id = ? AND dispatched_at IS NULL").run(run.id, (/* @__PURE__ */ new Date()).toISOString(), question.id);
      if (Number(claimedRow.changes) !== 1) {
        try {
          this.#runs.cancel(run.id, { actor: "discord-queue" });
        } catch {
        }
        continue;
      }
      this.#rememberReply(run.id, question.channel_id, question.message_id);
      this.#log.info("\u0412\u043E\u043F\u0440\u043E\u0441 \u0438\u0437 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u0437\u0430\u043F\u0443\u0449\u0435\u043D", {
        question_id: question.id,
        agent: question.agent,
        run_id: run.id
      });
    }
  }
  #busy(agent) {
    try {
      return this.#runs.list({ agent, status: "running", limit: "50" }).items.length > 0;
    } catch {
      return false;
    }
  }
  #rememberReply(runId, channelId, messageId) {
    this.#db.raw.prepare(`INSERT INTO discord_run_replies (run_id, channel_id, message_id, created_at, sent_at)
        VALUES (?, ?, ?, ?, NULL)
        ON CONFLICT(run_id) DO UPDATE SET channel_id = excluded.channel_id, message_id = excluded.message_id`).run(runId, channelId, messageId, (/* @__PURE__ */ new Date()).toISOString());
  }
  #forget(questionId) {
    this.#db.raw.prepare("DELETE FROM discord_questions WHERE id = ?").run(questionId);
  }
  async #notify(context, question, text3) {
    try {
      await context.send(question.channel_id, text3, question.message_id ?? void 0);
    } catch (error) {
      this.#log.warn("\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432: \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E", {
        channel_id: question.channel_id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
};

// src/app/discord-bridge.ts
var MAX_SEEN = 500;
var SLASH_COMMANDS = [
  {
    name: "task",
    type: 1,
    description: "\u041F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443 \u0432 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u044B",
    options: [
      { type: 3, name: "agent", description: "\u041A\u0442\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442", required: true, autocomplete: true },
      { type: 3, name: "text", description: "\u0427\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C", required: true, max_length: 1900 }
    ]
  },
  {
    name: "ask",
    type: 1,
    description: "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u044B",
    options: [
      { type: 3, name: "agent", description: "\u041A\u043E\u0433\u043E \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C", required: true, autocomplete: true },
      { type: 3, name: "text", description: "\u0412\u043E\u043F\u0440\u043E\u0441", required: true, max_length: 1900 }
    ]
  },
  { name: "status", type: 1, description: "\u0427\u0442\u043E \u0441\u0435\u0439\u0447\u0430\u0441 \u0434\u0435\u043B\u0430\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0430" },
  { name: "help", type: 1, description: "\u0412\u0441\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0438 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438" }
];
var SLASH_NAMES = SLASH_COMMANDS.map((command) => command.name);
var DISCORD_COMMAND_HELP = [
  "\u0421\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434\u044B (\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0434\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435\u043C):",
  "\u2022 /task agent:dev text:\u043F\u043E\u0447\u0438\u043D\u0438\u0442\u044C \u0442\u0435\u0441\u0442\u044B \u2014 \u0437\u0430\u0434\u0430\u0447\u0430 \u0432 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C;",
  "\u2022 /ask agent:dev text:\u043F\u043E\u0447\u0435\u043C\u0443 \u043F\u0430\u0434\u0430\u0435\u0442 \u0441\u0431\u043E\u0440\u043A\u0430 \u2014 \u0432\u043E\u043F\u0440\u043E\u0441 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0443;",
  "\u2022 /status \u2014 \u0447\u0442\u043E \u0441\u0435\u0439\u0447\u0430\u0441 \u0434\u0435\u043B\u0430\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0430;",
  "\u2022 /help \u2014 \u044D\u0442\u0430 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430.",
  "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u0442\u0430\u043A \u0436\u0435: `!task dev \u043F\u043E\u0447\u0438\u043D\u0438\u0442\u044C \u0442\u0435\u0441\u0442\u044B`, `!ask dev \u043F\u043E\u0447\u0435\u043C\u0443 \u043F\u0430\u0434\u0430\u0435\u0442 \u0441\u0431\u043E\u0440\u043A\u0430`, `!status`, `!help`.",
  "\u0415\u0441\u043B\u0438 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u0437\u0430\u043D\u044F\u0442, \u0432\u043E\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043A\u043B\u043E\u043D\u044F\u0435\u0442\u0441\u044F: \u043E\u043D \u0432\u0441\u0442\u0430\u0451\u0442 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u0438 \u043D\u0430\u0447\u043D\u0451\u0442\u0441\u044F \u0441\u0430\u043C,",
  "\u0430 \u043E\u0442\u0432\u0435\u0442 \u043F\u0440\u0438\u0434\u0451\u0442 \u0432 \u044D\u0442\u043E \u0436\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435. \u0417\u0430\u0434\u0430\u0447\u0430 \u043F\u0440\u0438 \u0437\u0430\u043D\u044F\u0442\u043E\u0441\u0442\u0438 \u0443\u0445\u043E\u0434\u0438\u0442 \u0432 \u043E\u0431\u0449\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432."
].join("\n");
function safeText(value, limit = 1900) {
  return value.length > limit ? `${value.slice(0, limit - 1)}\u2026` : value;
}
function errorText3(error) {
  return error instanceof Error ? error.message : String(error);
}
function interactionAuthor(interaction) {
  const user = interaction.member?.user ?? interaction.user ?? {};
  return {
    id: String(user.id ?? ""),
    name: user.global_name || user.username || "\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A"
  };
}
var DiscordBridge = class {
  #store;
  #adapter;
  #tasks;
  #runs;
  #bus;
  #log;
  #pollMs;
  #rpc;
  #queue;
  #agentSource;
  #defaultAgentSource;
  #availability;
  #gatewayUrl;
  #socketFactory;
  #startedAt = Math.floor(Date.now() / 1e3);
  #timer = null;
  #unsubscribe = null;
  #seen = /* @__PURE__ */ new Set();
  #lastId = "";
  #botId = "";
  #lastPollAt = null;
  #error = null;
  #sending = Promise.resolve();
  #started = false;
  #busy = false;
  #gateway = null;
  #slashRegistered = 0;
  #slashAt = null;
  #slashError = null;
  constructor(store, adapter, tasks, runs, bus, log, options = {}) {
    this.#store = store;
    this.#adapter = adapter;
    this.#tasks = tasks;
    this.#runs = runs;
    this.#bus = bus;
    this.#log = log.child({ module: "discord" });
    this.#pollMs = Math.max(2e3, options.pollMs ?? 15e3);
    this.#rpc = options.rpc ?? new DiscordRpcClient(() => store.get().discord.application_id);
    this.#queue = options.db ? new DiscordQuestionQueue(options.db, runs, log) : null;
    this.#agentSource = options.agents ?? (() => []);
    this.#defaultAgentSource = options.defaultAgent ?? (() => "");
    this.#availability = options.availability ?? null;
    this.#gatewayUrl = options.gatewayUrl;
    this.#socketFactory = options.socket;
  }
  get rpc() {
    return this.#rpc;
  }
  status() {
    const discord = this.#store.get().discord;
    const gateway = this.#gateway?.status();
    return {
      bot: {
        enabled: discord.bot_enabled && Boolean(discord.bot_token && discord.channel_id),
        polling: this.#timer !== null,
        bot_id: this.#botId,
        last_poll_at: this.#lastPollAt,
        error: this.#error
      },
      slash: {
        commands: SLASH_COMMANDS.map((command) => ({
          name: command.name,
          description: command.description,
          options: (command.options ?? []).map((option) => option.name)
        })),
        registered: this.#slashRegistered,
        registered_at: this.#slashAt,
        error: this.#slashError,
        gateway: gateway?.state ?? "off",
        gateway_error: gateway?.error ?? null,
        received: gateway?.received ?? 0
      },
      queue: {
        pending: this.#queue?.pendingCount() ?? 0,
        max: this.#queue?.max ?? MAX_PENDING_QUESTIONS
      },
      rpc: this.#rpc.status()
    };
  }
  start() {
    if (this.#started) return;
    this.#started = true;
    this.#unsubscribe = this.#bus.subscribe((event) => this.#onEvent(event));
    this.#restartBot();
    void this.refreshPresence();
  }
  async stop() {
    this.#started = false;
    this.#stopBot();
    this.#gateway?.stop();
    this.#gateway = null;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    await this.#rpc.clear();
    this.#rpc.close();
    await this.#sending;
  }
  async configureBot(enabled) {
    this.#store.update({ discord: { bot_enabled: enabled === true } });
    this.#restartBot();
    return this.status();
  }
  async reload() {
    this.#restartBot();
    await this.refreshPresence();
    return this.status();
  }
  async setPresence(enabled) {
    this.#store.update({ discord: { presence: enabled === true } });
    if (enabled) await this.refreshPresence();
    else await this.#rpc.clear();
    return this.status();
  }
  async refreshPresence(force = false) {
    const discord = this.#store.get().discord;
    if (!discord.presence || !discord.application_id) {
      if (this.#rpc.status().connected) await this.#rpc.clear();
      return this.status();
    }
    const running = this.#runs.list({ status: "running", limit: "200" }).items;
    const open = this.#tasks.list({ status: "open", limit: "200" }).items;
    const names = [...new Set(running.map((run) => run.agent))].slice(0, 3);
    const pending = this.#queue?.pendingCount() ?? 0;
    const state = running.length ? `${running.length} ${plural(running.length, "\u0437\u0430\u043F\u0443\u0441\u043A", "\u0437\u0430\u043F\u0443\u0441\u043A\u0430", "\u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432")}${names.length ? ` \xB7 ${names.join(", ")}` : ""}` : `\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u0430 \xB7 ${open.length} ${plural(open.length, "\u0437\u0430\u0434\u0430\u0447\u0430", "\u0437\u0430\u0434\u0430\u0447\u0438", "\u0437\u0430\u0434\u0430\u0447")}${pending ? ` \xB7 \u043E\u0447\u0435\u0440\u0435\u0434\u044C ${pending}` : ""}`;
    const status = await this.#rpc.setActivity({
      details: "Team Platform \xB7 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0430\u0433\u0435\u043D\u0442\u043E\u0432",
      state: state.slice(0, 128),
      timestamps: { start: this.#startedAt },
      instance: false
    });
    if (status.last_error && (force || !this.#error)) {
      this.#log.info("Rich Presence \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D", { error: status.last_error });
    }
    return this.status();
  }
  /** Регистрация слэш-команд: в гильдии канала, иначе глобально. */
  async registerSlashCommands() {
    const discord = this.#store.get().discord;
    if (!discord.bot_enabled || !discord.bot_token || !discord.application_id) {
      this.#slashRegistered = 0;
      this.#slashError = null;
      return;
    }
    try {
      let guild = "";
      if (discord.channel_id) {
        guild = await this.#adapter.channelGuild(discord.channel_id).catch(() => "");
      }
      const result = await this.#adapter.registerCommands(SLASH_COMMANDS, guild);
      this.#slashRegistered = result.length || SLASH_COMMANDS.length;
      this.#slashAt = (/* @__PURE__ */ new Date()).toISOString();
      this.#slashError = null;
      this.#log.info("\u0421\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u044B", {
        registered: this.#slashRegistered,
        guild: guild || "global"
      });
    } catch (error) {
      this.#slashRegistered = 0;
      this.#slashError = `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434\u044B: ${errorText3(error)}`;
      this.#log.warn("\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0441\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C", { error: errorText3(error) });
    }
  }
  /**
   * Обработка интеракции Gateway. Публичный метод: тот же путь проверяется
   * тестом без живого сокета.
   */
  async handleInteraction(interaction) {
    if (!interaction || !interaction.id || !interaction.token) return;
    const author = interactionAuthor(interaction);
    const allowed = this.#store.get().discord.bot_allowed_users;
    if (allowed.length && !allowed.includes(author.id)) {
      await this.#callback(interaction, {
        type: 4,
        data: { content: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430: \u044D\u0442\u043E\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u043D\u0435 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.", flags: 64 }
      });
      return;
    }
    if (interaction.type === 4) {
      const options = interaction.data?.options ?? [];
      const focused = options.find((option) => option?.focused) ?? options.find((option) => option && option.type === 3 && "value" in option);
      const query = String(focused?.value ?? "").toLowerCase();
      const choices = this.#agents().filter((id) => id.toLowerCase().includes(query)).slice(0, 25).map((id) => ({ name: id.slice(0, 100), value: id }));
      await this.#callback(interaction, { type: 8, data: { choices } });
      return;
    }
    if (interaction.type !== 2) return;
    const name = String(interaction.data?.name ?? "");
    if (!SLASH_NAMES.includes(name)) {
      await this.#callback(interaction, {
        type: 4,
        data: {
          content: `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B: ${SLASH_NAMES.map((item) => `/${item}`).join(", ")}`,
          flags: 64
        }
      });
      return;
    }
    if (name === "status" || name === "help") {
      const text3 = name === "status" ? this.#statusText() : DISCORD_COMMAND_HELP;
      await this.#callback(interaction, {
        type: 4,
        data: { content: safeText(text3), flags: 64 }
      });
      return;
    }
    const values = {};
    for (const option of interaction.data?.options ?? []) {
      if (option?.name) values[option.name] = String(option.value ?? "");
    }
    await this.#callback(interaction, { type: 5, data: { flags: 64 } });
    let reply;
    try {
      reply = await this.#runCommand({
        command: name === "task" ? "task" : "ask",
        agent: values.agent ?? null,
        text: values.text ?? "",
        author,
        channelId: String(interaction.channel_id ?? ""),
        messageId: null
      });
    } catch (error) {
      reply = `\u26A0\uFE0F ${errorText3(error)}`;
    }
    try {
      await this.#adapter.editInteractionReply(
        this.#store.get().discord.application_id,
        interaction.token,
        safeText(reply)
      );
    } catch (error) {
      this.#slashError = `\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u0441\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D: ${errorText3(error)}`;
      this.#log.warn("\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u0441\u043B\u044D\u0448-\u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D", { error: errorText3(error) });
    }
  }
  async tick() {
    const discord = this.#store.get().discord;
    if (!this.#started || this.#busy || !discord.bot_enabled || !discord.bot_token) return;
    this.#busy = true;
    this.#lastPollAt = (/* @__PURE__ */ new Date()).toISOString();
    try {
      if (discord.channel_id) await this.#pollChannel();
      await this.#dispatchQueue();
      this.#error = null;
    } catch (error) {
      this.#error = errorText3(error);
      this.#log.warn("\u041E\u043F\u0440\u043E\u0441 Discord \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F", { error: this.#error });
    } finally {
      this.#busy = false;
    }
  }
  async #pollChannel() {
    if (!this.#botId) {
      const me = await this.#adapter.botIdentity();
      this.#botId = me.id;
    }
    if (!this.#lastId) {
      const latest = await this.#adapter.botMessages(void 0, 5);
      const newest = latest.map((message) => message.id).sort(compareSnowflakes).at(-1);
      this.#lastId = newest ?? "0";
      return;
    }
    const list = await this.#adapter.botMessages(this.#lastId, 50);
    const ordered = list.slice().sort((left, right) => compareSnowflakes(left.id, right.id));
    for (const message of ordered) {
      if (this.#seen.has(message.id)) continue;
      this.#remember(message.id);
      if (compareSnowflakes(message.id, this.#lastId) > 0) this.#lastId = message.id;
      try {
        await this.#handleMessage(message);
      } catch (error) {
        this.#log.warn("\u041A\u043E\u043C\u0430\u043D\u0434\u0430 Discord \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430", {
          message_id: message.id,
          error: errorText3(error)
        });
      }
    }
  }
  async #handleMessage(message) {
    const content = message.content.trim();
    if (!content) return;
    if (message.author.bot || this.#botId && message.author.id === this.#botId) return;
    const discord = this.#store.get().discord;
    if (discord.bot_allowed_users.length && !discord.bot_allowed_users.includes(message.author.id)) return;
    const [command, ...rest] = content.split(/\s+/);
    const argument = rest.join(" ").trim();
    const reply = (text3) => this.#adapter.sendTo(message.channel_id, safeText(text3), message.id);
    if (command === "!help" || command === "!\u043F\u043E\u043C\u043E\u0449\u044C") {
      await reply(DISCORD_COMMAND_HELP);
      return;
    }
    if (command === "!status" || command === "!\u0441\u0442\u0430\u0442\u0443\u0441") {
      await reply(this.#statusText());
      return;
    }
    if (command !== "!task" && command !== "!\u0437\u0430\u0434\u0430\u0447\u0430" && command !== "!ask" && command !== "!\u0432\u043E\u043F\u0440\u043E\u0441") {
      return;
    }
    const kind = command === "!task" || command === "!\u0437\u0430\u0434\u0430\u0447\u0430" ? "task" : "ask";
    const parsed = this.#splitAgent(argument);
    const author = {
      id: String(message.author.id ?? ""),
      name: message.author.username || "\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A"
    };
    if (!parsed.text) {
      await reply(kind === "task" ? "\u041D\u0443\u0436\u0435\u043D \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0441\u043B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B." : "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u043F\u043E\u0441\u043B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.");
      return;
    }
    await reply(await this.#runCommand({
      command: kind,
      agent: parsed.agent,
      text: parsed.text,
      author,
      channelId: message.channel_id,
      messageId: message.id
    }));
  }
  /** Необязательное имя участника первым словом: `!ask dev вопрос`. */
  #splitAgent(argument) {
    const match = /^([^\s]+)\s+([\s\S]+)$/.exec(argument);
    if (!match) return { agent: null, text: argument };
    const word = (match[1] ?? "").toLowerCase();
    const known = this.#agents().find((id) => id.toLowerCase() === word);
    return known ? { agent: known, text: (match[2] ?? "").trim() } : { agent: null, text: argument };
  }
  async #runCommand(input) {
    const text3 = input.text.trim();
    if (!text3) {
      return input.command === "task" ? "\u041D\u0443\u0436\u0435\u043D \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0441\u043B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B." : "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u043F\u043E\u0441\u043B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.";
    }
    const agents = this.#agents();
    if (input.agent && agents.length && !agents.includes(input.agent)) {
      return `\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A \xAB${input.agent}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B: ${agents.join(", ")}.`;
    }
    const agent = input.agent ?? this.#defaultAgent();
    if (!agent) {
      const paused = this.#agents().map((id) => ({ id, pause: this.#paused(id) })).filter((entry) => entry.pause !== null);
      if (paused.length) {
        return `\u0412\u0441\u0435 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043D\u0430 \u043F\u0430\u0443\u0437\u0435 \u043F\u043E\u0441\u043B\u0435 \u0441\u0431\u043E\u0435\u0432: ${paused.slice(0, 5).map((entry) => `${entry.id} \u2014 ${this.#pauseText(entry.pause)}`).join("; ")}. \u0421\u043D\u0438\u043C\u0438\u0442\u0435 \u043F\u0430\u0443\u0437\u0443, \u043A\u043E\u0433\u0434\u0430 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F.`;
      }
      if (input.command === "ask") {
        return "\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0442 \u0433\u043E\u0442\u043E\u0432\u044B\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432: \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F \u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0430\u0433\u0435\u043D\u0442\u0430 \u0432 \u0444\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432.";
      }
    }
    if (agent) {
      const pause = this.#paused(agent);
      if (pause) {
        return `**${agent}** \u0441\u0435\u0439\u0447\u0430\u0441 ${this.#pauseText(pause)}. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430: /status \u043F\u043E\u043A\u0430\u0436\u0435\u0442, \u043A\u0442\u043E \u0433\u043E\u0442\u043E\u0432.`;
      }
    }
    const task = this.#createTask(input, agent);
    const brief = text3.length > 140 ? `${text3.slice(0, 137)}\u2026` : text3;
    if (input.command === "task") {
      const run2 = agent ? this.#startRun({
        taskId: task.id,
        agent,
        kind: "task",
        text: text3,
        author: input.author,
        channelId: input.channelId,
        messageId: input.messageId
      }) : null;
      return `\u0417\u0430\u0434\u0430\u0447\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430: ${task.title} \xB7 ${task.id}` + (run2 ? ` \xB7 \u0437\u0430\u043F\u0443\u0441\u043A ${run2.id}` : " (\u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D)");
    }
    if (this.#agentBusy(agent)) {
      const queued = this.#queue?.enqueue({
        task_id: task.id,
        agent,
        kind: "ask",
        text: text3,
        author: input.author,
        channel_id: input.channelId,
        message_id: input.messageId
      });
      if (this.#queue && !queued) {
        return `**${agent}** \u0437\u0430\u043D\u044F\u0442, \u0430 \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0443\u0436\u0435 \u043F\u043E\u043B\u043D\u0430 (${MAX_PENDING_QUESTIONS}). \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u043F\u043E\u0437\u0436\u0435 \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0443.`;
      }
      const position = queued?.position ?? this.#pending(agent);
      return `\u23F3 **${agent}** \u0437\u0430\u043D\u044F\u0442 \u2014 \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u043B \u0432\u043E\u043F\u0440\u043E\u0441 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C (${position}-\u0439 \u043D\u0430 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430). \u041E\u0442\u0432\u0435\u0442 \u043F\u0440\u0438\u0434\u0451\u0442 \u0441\u044E\u0434\u0430, \u043A\u043E\u0433\u0434\u0430 \u043E\u043D \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u0438\u0442\u0441\u044F.`;
    }
    const run = this.#startRun({
      taskId: task.id,
      agent,
      kind: "ask",
      text: text3,
      author: input.author,
      channelId: input.channelId,
      messageId: input.messageId
    });
    return `\u041E\u043A\u0435\u0439, \u0441\u043F\u0440\u043E\u0441\u0438\u043B \u0443 **${agent}** \u2014 \xAB${brief}\xBB. \u041E\u0442\u0432\u0435\u0442 \u043F\u0440\u0438\u0448\u043B\u044E \u0441\u044E\u0434\u0430.` + (run ? "" : " \u26A0\uFE0F \u0417\u0430\u043F\u0443\u0441\u043A \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0436\u0443\u0440\u043D\u0430\u043B.");
  }
  #createTask(input, agent) {
    const title = input.text.replace(/\s+/g, " ").trim().slice(0, 200) || (input.command === "task" ? "\u0417\u0430\u0434\u0430\u0447\u0430 \u0438\u0437 Discord" : "\u0412\u043E\u043F\u0440\u043E\u0441 \u0438\u0437 Discord");
    return this.#tasks.create({
      title,
      description: `\u0418\u0437 Discord${input.author.name ? ` (${input.author.name})` : ""}.

${input.text}`,
      type: input.command === "task" ? "work" : "research",
      priority: 2,
      created_by: `discord:${input.author.name || input.author.id || "unknown"}`.slice(0, 100),
      assignee: agent || null,
      tags: ["discord"]
    });
  }
  #startRun(input) {
    try {
      if (this.#queue) {
        return this.#queue.start({
          task_id: input.taskId,
          agent: input.agent,
          kind: input.kind,
          text: input.text,
          author: input.author,
          channel_id: input.channelId,
          message_id: input.messageId
        });
      }
      return this.#runs.create({ task_id: input.taskId, agent: input.agent, max_attempts: 1 }).run;
    } catch (error) {
      this.#log.warn("\u0417\u0430\u043F\u0443\u0441\u043A \u0438\u0437 Discord \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D", { error: errorText3(error), agent: input.agent });
      return null;
    }
  }
  #statusText() {
    const running = this.#runs.list({ status: "running", limit: "200" }).items;
    const busy = [...new Set(running.map((run) => run.agent))];
    const agents = this.#agents();
    const paused = agents.filter((id) => this.#paused(id));
    const free = agents.filter((id) => !busy.includes(id) && !paused.includes(id));
    const pending = this.#queue?.size() ?? 0;
    const parts = [
      running.length ? `\u0421\u0435\u0439\u0447\u0430\u0441 ${running.length} ${plural(running.length, "\u0437\u0430\u043F\u0443\u0441\u043A", "\u0437\u0430\u043F\u0443\u0441\u043A\u0430", "\u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432")}: ${busy.join(", ")}` : "\u0421\u0435\u0439\u0447\u0430\u0441 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u0430."
    ];
    if (free.length) parts.push(`\u0413\u043E\u0442\u043E\u0432\u044B: ${free.slice(0, 8).join(", ")}.`);
    if (paused.length) parts.push(`\u041D\u0430 \u043F\u0430\u0443\u0437\u0435 \u043F\u043E\u0441\u043B\u0435 \u0441\u0431\u043E\u0435\u0432: ${paused.slice(0, 8).join(", ")}.`);
    if (pending) {
      parts.push(`\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438: ${pending} \u2014 \u043D\u0430\u0447\u043D\u0443\u0442\u0441\u044F \u0441\u0430\u043C\u0438, \u043A\u043E\u0433\u0434\u0430 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u044F\u0442\u0441\u044F.`);
    }
    return parts.join("\n");
  }
  #agents() {
    try {
      const list = this.#agentSource().map((id) => String(id ?? "").trim()).filter(Boolean);
      return [...new Set(list)];
    } catch {
      return [];
    }
  }
  #defaultAgent() {
    try {
      const configured = this.#defaultAgentSource().trim();
      if (configured && !this.#paused(configured)) return configured;
    } catch {
    }
    return this.#agents().find((id) => !this.#paused(id)) ?? "";
  }
  #paused(agent) {
    if (!agent || !this.#availability) return null;
    try {
      return this.#availability(agent);
    } catch {
      return null;
    }
  }
  #pauseText(pause) {
    const until = new Date(pause.until);
    const at = Number.isNaN(until.getTime()) ? pause.until : until.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return `\u043D\u0430 \u043F\u0430\u0443\u0437\u0435 \u043F\u043E\u0441\u043B\u0435 \u0441\u0431\u043E\u044F \u0434\u043E ${at}${pause.reason ? ` (${pause.reason})` : ""}`;
  }
  #agentBusy(agent) {
    if (!agent) return false;
    try {
      return this.#runs.list({ agent, status: "running", limit: "50" }).items.length > 0;
    } catch {
      return false;
    }
  }
  #pending(agent) {
    return this.#queue?.pendingFor(agent).length ?? 0;
  }
  async #dispatchQueue() {
    const queue = this.#queue;
    if (!queue) return;
    await queue.dispatch({
      agents: this.#agents(),
      send: (channelId, text3, replyTo) => this.#adapter.sendTo(channelId, safeText(text3), replyTo)
    });
  }
  async #callback(interaction, data) {
    try {
      await this.#adapter.interactionCallback(interaction.id, interaction.token, data);
    } catch (error) {
      this.#slashError = `\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 Discord \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D: ${errorText3(error)}`;
      this.#log.warn("\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 Discord \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D", { error: errorText3(error) });
    }
  }
  #onEvent(event) {
    this.#notify(event);
    if (event.type === "run.succeeded" || event.type === "run.failed" || event.type === "run.cancelled") {
      void this.#replyToRun(event.entity.id).then(() => this.#dispatchQueue());
    }
  }
  /** Ответ на вопрос из Discord: тем же сообщением-реплаем и только один раз. */
  async #replyToRun(runId) {
    const queue = this.#queue;
    if (!queue) return;
    const target = queue.pendingReply(runId);
    if (!target) return;
    let run;
    try {
      run = this.#runs.get(runId).run;
    } catch {
      return;
    }
    const label = run.status === "succeeded" ? "\u0433\u043E\u0442\u043E\u0432\u043E" : run.status === "failed" ? "\u043E\u0448\u0438\u0431\u043A\u0430" : run.status === "cancelled" ? "\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E" : run.status;
    const body = run.status === "succeeded" ? run.result?.trim() || "\u0411\u0435\u0437 \u0442\u0435\u043A\u0441\u0442\u0430 \u043E\u0442\u0432\u0435\u0442\u0430." : run.error_message || run.status;
    try {
      await this.#adapter.sendTo(
        target.channel_id,
        safeText(`**${run.agent}** \xB7 ${label}
${body}`),
        target.message_id ?? void 0
      );
      queue.markReplySent(runId);
    } catch (error) {
      this.#log.warn("\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u0432\u043E\u043F\u0440\u043E\u0441 Discord \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D", {
        run_id: runId,
        error: errorText3(error)
      });
    }
  }
  #notify(event) {
    const discord = this.#store.get().discord;
    if (!discord.bot_enabled || !discord.bot_token || !discord.channel_id) return;
    const notify = discord.notify;
    let text3 = "";
    if (event.type === "task.created" && notify.tasks) {
      if (event.actor.startsWith("discord:")) return;
      text3 = `\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430: ${String(event.data.title ?? event.entity.id)}`;
    } else if (event.type === "run.failed" || event.type === "run.cancelled") {
      if (!notify.errors && !notify.runs) return;
      text3 = this.#runText(event, event.type === "run.failed" ? "\u0417\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u043E\u0432\u0430\u043B\u0435\u043D" : "\u0417\u0430\u043F\u0443\u0441\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D");
    } else if (event.type === "run.succeeded" && notify.runs) {
      text3 = this.#runText(event, "\u0417\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D");
    }
    if (!text3) return;
    const content = safeText(text3, 1900);
    this.#sending = this.#sending.then(() => this.#adapter.sendTo(discord.channel_id, content).then(() => void 0)).catch((error) => {
      this.#error = errorText3(error);
      this.#log.warn("\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 Discord \u043D\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E", { error: this.#error });
    });
    void this.refreshPresence();
  }
  #runText(event, label) {
    let title = "";
    try {
      const run = this.#runs.get(event.entity.id).run;
      if (run.task_id) title = this.#tasks.get(run.task_id).task.title;
      const suffix = run.error_message ? ` \xB7 ${run.error_message}` : run.result ? ` \xB7 ${run.result.slice(0, 300)}` : "";
      return `${label}: ${run.agent}${title ? ` \xB7 ${title}` : ""}${suffix}`;
    } catch {
      return `${label}: ${event.entity.id.slice(-8)}`;
    }
  }
  #restartBot() {
    this.#stopBot();
    this.#gateway?.stop();
    this.#gateway = null;
    const discord = this.#store.get().discord;
    if (!this.#started || !discord.bot_enabled || !discord.bot_token) return;
    this.#lastId = "";
    this.#seen.clear();
    this.#timer = setInterval(() => void this.tick(), this.#pollMs);
    this.#timer.unref();
    if (discord.application_id) {
      this.#gateway = new DiscordGateway({
        token: () => this.#store.get().discord.bot_token,
        url: this.#gatewayUrl,
        socket: this.#socketFactory,
        log: this.#log,
        onReady: () => {
          void this.registerSlashCommands();
        },
        onInteraction: (interaction) => this.handleInteraction(interaction)
      });
      this.#gateway.start();
    }
    void this.tick();
    if (discord.application_id) void this.registerSlashCommands();
  }
  #stopBot() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }
  #remember(id) {
    this.#seen.add(id);
    while (this.#seen.size > MAX_SEEN) {
      const first = this.#seen.values().next().value;
      if (first) this.#seen.delete(first);
    }
  }
};
function compareSnowflakes(left, right) {
  if (left.length !== right.length) return left.length - right.length;
  return left < right ? -1 : left > right ? 1 : 0;
}
function plural(count, one, few, many) {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return many;
  const last = count % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

// src/app/tools-service.ts
var CACHE_MS = 2e4;
var ToolsService = class {
  #store;
  #log;
  #github;
  #discord;
  #google;
  #executor;
  #runs;
  #watchdogIntervalMs;
  #cacheMs;
  #discordBridge;
  #browser;
  #missions;
  #telegram;
  #availability;
  #toolbox;
  #entire;
  #enabled = /* @__PURE__ */ new Set();
  #cache = null;
  constructor(store, log, options = {}) {
    this.#store = store;
    this.#log = log;
    const fetchImpl = options.fetch ?? fetch;
    this.#github = new GitHubAdapter(() => this.#store.get().github, fetchImpl);
    this.#discord = new DiscordAdapter(() => this.#store.get().discord, fetchImpl);
    this.#google = new GoogleAdapter(() => this.#store.get().google, fetchImpl);
    this.#executor = options.executor ?? null;
    this.#runs = options.runs ?? null;
    this.#watchdogIntervalMs = options.watchdogIntervalMs ?? 0;
    this.#cacheMs = options.cacheMs ?? CACHE_MS;
    this.#browser = options.browser ?? null;
    this.#missions = options.missions ?? null;
    this.#telegram = options.telegram ?? null;
    this.#availability = options.availability ?? null;
    this.#toolbox = options.toolbox ?? null;
    this.#entire = options.entire ?? null;
    this.#discordBridge = options.tasks && options.runs && options.bus ? new DiscordBridge(store, this.#discord, options.tasks, options.runs, options.bus, log, {
      pollMs: options.discordPollMs,
      db: options.db,
      agents: () => this.#executor?.list().map((agent) => agent.id) ?? [],
      defaultAgent: () => {
        const agents = this.#agents();
        return agents.find((id) => !this.#availability?.active(id)) ?? "";
      },
      availability: (agent) => this.#availability?.active(agent) ?? null
    }) : null;
  }
  /** Интеграция включает свои пункты каталога и HTTP-маршруты отдельным модулем. */
  enable(feature) {
    this.#enabled.add(feature);
    this.#cache = null;
  }
  isEnabled(feature) {
    return this.#enabled.has(feature);
  }
  /** Telegram-мост создаёт модуль telegram и подключает его сюда. */
  attachTelegram(bridge) {
    this.#telegram = bridge;
    this.#cache = null;
  }
  startDiscord() {
    this.#discordBridge?.start();
  }
  async stopDiscord() {
    await this.#discordBridge?.stop();
  }
  start() {
    this.startDiscord();
  }
  async stop() {
    await this.stopDiscord();
  }
  telegramStatus() {
    return this.#telegram?.status() ?? null;
  }
  async telegramSnapshot() {
    return this.telegramStatus();
  }
  configureTelegram(body) {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    try {
      const status = this.#telegram.configure(body);
      this.#cache = null;
      return status;
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : String(error));
    }
  }
  beginTelegramLogin(phone) {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    return this.#telegram.beginLogin(phone).catch((error) => {
      throw new ValidationError(error instanceof Error ? error.message : String(error));
    });
  }
  submitTelegramCode(code) {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    try {
      return this.#telegram.submitCode(code);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : String(error));
    }
  }
  submitTelegramPassword(password) {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    try {
      return this.#telegram.submitPassword(password);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : String(error));
    }
  }
  cancelTelegramLogin() {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    return this.#telegram.cancelLogin();
  }
  checkTelegram() {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    return this.#telegram.check();
  }
  sendTelegram(chat, text3) {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    return this.#telegram.send(chat, text3).catch((error) => {
      throw new ValidationError(error instanceof Error ? error.message : String(error));
    });
  }
  logoutTelegram() {
    if (!this.#telegram) throw new UpstreamError("Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    return this.#telegram.logout().catch((error) => {
      throw new UpstreamError(error instanceof Error ? error.message : String(error));
    });
  }
  discordStatus() {
    return this.#discordBridge?.status() ?? null;
  }
  async configureDiscordBot(enabled) {
    if (!this.#discordBridge) throw new UpstreamError("Discord-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    return this.#discordBridge.configureBot(enabled);
  }
  async setDiscordPresence(enabled) {
    if (!this.#discordBridge) throw new UpstreamError("Discord-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    return this.#discordBridge.setPresence(enabled);
  }
  async checkDiscordBot() {
    if (!this.#discordBridge) throw new UpstreamError("Discord-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    await this.#discordBridge.tick();
    return this.#discordBridge.status();
  }
  personalChannels() {
    return this.#discord.personalChannels();
  }
  sendPersonal(channelId, content) {
    return this.#discord.sendPersonal(channelId, content);
  }
  settings() {
    return this.#store.masked();
  }
  #agents() {
    return this.#executor?.list().map((agent) => agent.id) ?? [];
  }
  async catalog(force = false) {
    if (!force && this.#cache && Date.now() - this.#cache.at < this.#cacheMs) {
      return this.#cache.value;
    }
    const [github, discord, google, browser] = await Promise.all([
      this.#github.status(),
      this.#discord.status(),
      this.#google.status(),
      this.#browser ? this.#browser().catch(() => null) : Promise.resolve(null)
    ]);
    const settings = this.#store.masked();
    const providerViews = PROVIDERS.map((provider) => ({
      id: provider.id,
      title: provider.title,
      configured: Boolean(settings.providers[provider.id]),
      env: provider.env,
      link: provider.link
    }));
    const configuredProviders = providerViews.filter((p) => p.configured).length;
    const integrations = [
      { feature: "github", status: github },
      { feature: "discord", status: discord },
      { feature: "google", status: google }
    ].filter((item) => this.#enabled.has(item.feature)).map((item) => item.status);
    const connected = integrations.filter((status) => status.ok === true).length;
    const failed = integrations.filter((status) => status.ok === false).length;
    const githubItem = this.#item("github", "GitHub", "services", github, "test");
    if (settings.github.accounts.length > 1) {
      githubItem.summary += ` \xB7 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432: ${settings.github.accounts.length}`;
    }
    const discordItem = this.#item("discord", "Discord", "services", discord, "test");
    if (settings.discord.user) {
      discordItem.summary += ` \xB7 \u043B\u0438\u0447\u043D\u044B\u0439 @${settings.discord.user.username || settings.discord.user.name}`;
    } else if (settings.discord.user_configured) {
      discordItem.summary += " \xB7 \u043B\u0438\u0447\u043D\u044B\u0439 \u0442\u043E\u043A\u0435\u043D \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D";
    }
    if (settings.discord.application_id) discordItem.summary += ` \xB7 RPC ${settings.discord.application_id}`;
    const discordBridge = this.#discordBridge?.status();
    if (discordBridge?.bot.polling) discordItem.summary += " \xB7 \u0431\u043E\u0442 \u043E\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442 \u043A\u0430\u043D\u0430\u043B";
    else if (discordBridge?.bot.enabled) discordItem.summary += " \xB7 \u0431\u043E\u0442 \u0436\u0434\u0451\u0442 \u043E\u0448\u0438\u0431\u043A\u0443";
    if (discordBridge?.rpc.connected) discordItem.summary += " \xB7 presence \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D";
    if (!settings.discord.configured && settings.discord.user_configured) {
      discordItem.state = "ok";
    }
    const telegramStatus = this.#telegram?.status();
    const telegramItem = {
      id: "telegram",
      title: "Telegram",
      group: "services",
      state: telegramStatus?.last_error ? "error" : telegramStatus?.connected ? "ok" : telegramStatus?.logged_in ? "setup" : "setup",
      summary: !telegramStatus?.configured ? "\u043D\u0443\u0436\u043D\u044B api_id \u0438 api_hash \u0441 my.telegram.org" : telegramStatus.connected ? `@${telegramStatus.account?.username || telegramStatus.account?.name || "\u0430\u043A\u043A\u0430\u0443\u043D\u0442"} \xB7 \u0440\u0435\u0436\u0438\u043C ${telegramStatus.mode}` : telegramStatus.last_error ? telegramStatus.last_error : telegramStatus.auth_state === "code_required" ? "\u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043A\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F" : telegramStatus.auth_state === "password_required" ? "\u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u0430\u0440\u043E\u043B\u044C 2FA" : telegramStatus.logged_in ? "\u0441\u0435\u0441\u0441\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430, \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F" : "API \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D; \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0445\u043E\u0434",
      actions: ["login", "send"]
    };
    const siteNames = settings.sites.entries.map((entry) => entry.site);
    const sitesItem = {
      id: "sites",
      title: "\u041F\u0430\u0440\u043E\u043B\u0438 \u0441\u0430\u0439\u0442\u043E\u0432",
      group: "services",
      state: settings.sites.count > 0 ? "ok" : "setup",
      summary: settings.sites.count > 0 ? `${settings.sites.count} \u0441\u0430\u0439\u0442\u043E\u0432: ${siteNames.slice(0, 3).join(", ")}${siteNames.length > 3 ? "\u2026" : ""}` : "\u043D\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0441\u0430\u0439\u0442\u043E\u0432",
      actions: []
    };
    const missionOverview = this.#missions?.() ?? null;
    const missionsItem = {
      id: "missions",
      title: "\u041C\u0438\u0441\u0441\u0438\u0438",
      group: "services",
      state: missionOverview ? "ok" : "off",
      summary: !missionOverview ? "\u0441\u0435\u0440\u0432\u0438\u0441 \u043C\u0438\u0441\u0441\u0438\u0439 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : missionOverview.open > 0 ? `\u043E\u0442\u043A\u0440\u044B\u0442\u043E ${missionOverview.open} \u0438\u0437 ${missionOverview.total}` + (missionOverview.running ? ` \xB7 \u0438\u0434\u0451\u0442 \xAB${missionOverview.running}\xBB` : "") + (missionOverview.paused ? ` \xB7 \u043D\u0430 \u043F\u0430\u0443\u0437\u0435 ${missionOverview.paused}` : "") : "\u043C\u0438\u0441\u0441\u0438\u0439 \u043D\u0435\u0442: \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u043B\u0430\u043D \u0438\u0437 \u044D\u0442\u0430\u043F\u043E\u0432",
      actions: ["list", "create", "start", "submit", "accept", "reject", "pause", "resume", "complete"]
    };
    const browserItem = {
      id: "browser",
      title: "\u0411\u0440\u0430\u0443\u0437\u0435\u0440",
      group: "services",
      state: browser?.error ? "error" : browser?.running ? "ok" : browser?.executable ? "setup" : "off",
      summary: !browser ? "\u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043D\u044B\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" : browser.error ? browser.error : browser.running ? `${browser.tabs.length} \u0432\u043A\u043B\u0430\u0434\u043E\u043A \xB7 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u043E\u0431\u0449\u0438\u0439 \xB7 \u043F\u043E\u0440\u0442 ${browser.port}` : "\u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D; \u043E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043F\u0435\u0440\u0432\u043E\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0435",
      actions: ["status", "open", "text", "click", "fill", "insert", "press", "wait", "screenshot", "show", "hide", "stop"]
    };
    const reserveState = this.#toolbox?.reserve() ?? null;
    const spareState = this.#toolbox?.spare() ?? null;
    let providerGuard = null;
    let providerGuardError = false;
    try {
      providerGuard = this.#toolbox?.providerGuard() ?? null;
    } catch {
      providerGuardError = true;
    }
    const entireConfigured = this.#toolbox?.entireConfigured() ?? false;
    const entireOverview = this.#entire?.overview() ?? null;
    const freebuffConfigured = this.#toolbox?.freebuffConfigured() ?? false;
    const rawItems = [
      githubItem,
      discordItem,
      browserItem,
      telegramItem,
      sitesItem,
      this.#item("google", "Google", "services", google, "test"),
      {
        id: "checks",
        title: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0438",
        group: "services",
        state: failed > 0 ? "error" : connected === integrations.length ? "ok" : "setup",
        summary: failed > 0 ? `\u043E\u0448\u0438\u0431\u043E\u043A: ${failed}, \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E: ${connected} \u0438\u0437 ${integrations.length}` : `\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E: ${connected} \u0438\u0437 ${integrations.length}`,
        actions: []
      },
      {
        id: "providers",
        title: "\u0410\u0433\u0435\u043D\u0442\u044B \u0438 \u043C\u043E\u0434\u0435\u043B\u0438",
        group: "services",
        state: providerGuardError ? "error" : providerGuard?.enabled ? providerGuard.auto_start_allowed ? "ok" : "setup" : configuredProviders > 0 ? "ok" : "setup",
        summary: providerGuardError ? "\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B \xB7 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D" : providerGuard?.enabled ? providerGuard.auto_start_allowed ? `\u043A\u043B\u044E\u0447\u0435\u0439: ${configuredProviders} \u0438\u0437 ${providerViews.length} \xB7 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430` : `\u043A\u043B\u044E\u0447\u0435\u0439: ${configuredProviders} \u0438\u0437 ${providerViews.length} \xB7 \u0437\u0430\u043F\u0443\u0441\u043A\u0438 \u0441 \u043C\u043E\u0434\u0435\u043B\u044C\u044E \u0436\u0434\u0443\u0442 \u043A\u043B\u044E\u0447\u0430 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430` : configuredProviders > 0 ? `\u043A\u043B\u044E\u0447\u0435\u0439: ${configuredProviders} \u0438\u0437 ${providerViews.length} \xB7 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430` : "\u043A\u043B\u044E\u0447\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B",
        actions: []
      },
      {
        id: "executor",
        title: "\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C",
        group: "services",
        state: this.#executor ? "ok" : "off",
        summary: !this.#executor ? "\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D" : this.#executor.running ? `\u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442 ${this.#executor.currentRunId ?? "\u0437\u0430\u043F\u0443\u0441\u043A"}` : "\u0436\u0434\u0451\u0442 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432",
        actions: []
      },
      {
        id: "cycles",
        title: "\u0424\u043E\u043D\u043E\u0432\u044B\u0435 \u0446\u0438\u043A\u043B\u044B",
        group: "services",
        state: this.#watchdogIntervalMs > 0 ? "ok" : "off",
        summary: this.#watchdogIntervalMs > 0 ? `\u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044C \u043A\u0430\u0436\u0434\u044B\u0435 ${Math.round(this.#watchdogIntervalMs / 1e3)} \u0441` : "\u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D",
        actions: []
      },
      {
        id: "messengers",
        title: "\u041C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u044B",
        group: "services",
        state: settings.discord.configured || settings.telegram.configured ? "ok" : "setup",
        summary: [
          settings.discord.configured ? "Discord \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : "",
          settings.telegram.configured ? "Telegram \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : ""
        ].filter(Boolean).join(" \xB7 ") || "Discord \u0438 Telegram \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B",
        actions: []
      },
      {
        id: "github-index",
        title: "Entire",
        group: "services",
        state: entireOverview?.last_sync?.status === "failed" || entireOverview?.last_sync?.status === "unsupported" ? "error" : entireOverview?.configured || entireConfigured ? "configured" : "setup",
        summary: entireOverview?.last_sync?.status === "failed" ? `\u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438: ${entireOverview.last_sync.error ?? "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}` : entireOverview?.last_sync?.status === "unsupported" ? `\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435: ${entireOverview.last_sync.error ?? "Entire \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E"}` : entireOverview?.last_sync?.status === "running" ? `\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F: ${entireOverview.last_sync.phase} (${entireOverview.last_sync.progress}%)` : entireOverview?.configured ? `\u0438\u0441\u0442\u043E\u0440\u0438\u044F: ${entireOverview.total_sessions} \u0441\u0435\u0441\u0441\u0438\u0439 \xB7 pull-\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0447\u0435\u0440\u0435\u0437 CLI` : entireConfigured ? "\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 URL \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0430 \xB7 \u0434\u043B\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 Entire" : "\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 ENTIRE_CWD \u0438\u043B\u0438 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0432 \u043F\u0430\u043D\u0435\u043B\u0438",
        actions: ["status", "sync"]
      },
      {
        id: "memory",
        title: "\u041F\u0430\u043C\u044F\u0442\u044C \u043B\u044E\u0434\u0435\u0439",
        group: "services",
        state: "ok",
        summary: "SQLite-\u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438, \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0438 \u043F\u043E\u043B\u043D\u043E\u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u043F\u043E\u0438\u0441\u043A",
        actions: ["list", "create", "search"]
      },
      missionsItem,
      {
        id: "journal",
        title: "\u0416\u0443\u0440\u043D\u0430\u043B \u0441\u043E\u0431\u044B\u0442\u0438\u0439",
        group: "services",
        state: "ok",
        summary: "\u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u043C\u0430\u044F \u0445\u0440\u043E\u043D\u043E\u043B\u043E\u0433\u0438\u044F \u0437\u0430\u0434\u0430\u0447 \u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u0441 \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u043C \u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430\u043C\u0438",
        actions: ["list", "filter", "paginate"]
      },
      {
        id: "freebuff",
        title: "Freebuff",
        group: "services",
        state: freebuffConfigured ? "configured" : "setup",
        summary: freebuffConfigured ? "Developer API \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D \xB7 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0438 \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432 \u043F\u0430\u043D\u0435\u043B\u0438" : "\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E: \u043D\u0443\u0436\u0435\u043D Developer API key \u0438\u0437 freebuff.com/account/api",
        actions: ["status", "models", "chat"]
      },
      {
        id: "reserve",
        title: "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u0440\u0435\u0437\u0435\u0440\u0432",
        group: "services",
        state: reserveState?.enabled ? "ok" : "setup",
        summary: reserveState ? reserveState.enabled ? `\u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u0435 ${reserveState.used} \u0438\u0437 ${reserveState.limit} \xB7 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u0442\u043E\u043B\u044C\u043A\u043E \u0438\u0437 \u0440\u0435\u0437\u0435\u0440\u0432\u0430` : `\u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u0435 ${reserveState.used} \u0438\u0437 ${reserveState.limit} \xB7 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D \xB7 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A \u043D\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D` : "\u0440\u0435\u0437\u0435\u0440\u0432 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D",
        actions: ["add", "remove", "configure"]
      },
      {
        id: "spare",
        title: "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F",
        group: "services",
        state: spareState?.active ? "ok" : spareState?.enabled ? "setup" : "off",
        summary: spareState ? spareState.enabled ? `${spareState.active ? "\u0441\u0435\u0439\u0447\u0430\u0441 \u043E\u0442\u043A\u0440\u044B\u0442\u043E" : "\u0441\u0435\u0439\u0447\u0430\u0441 \u0437\u0430\u043A\u0440\u044B\u0442\u043E"} \xB7 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043E ${spareState.used_minutes} \u0438\u0437 ${spareState.daily_limit_minutes} \u043C\u0438\u043D` : `\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E \xB7 \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u0443\u0441\u043A\u0438 \u043D\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u044B \xB7 ${spareState.used_minutes} \u0438\u0437 ${spareState.daily_limit_minutes} \u043C\u0438\u043D` : "\u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
        actions: ["configure", "open", "close"]
      }
    ];
    const featureItems = {
      github: ["github"],
      discord: ["discord"],
      google: ["google"],
      telegram: ["telegram"],
      "github-index": ["entire"],
      freebuff: ["freebuff"],
      messengers: ["discord", "telegram"],
      checks: ["github", "discord", "google", "telegram"]
    };
    const items = rawItems.filter((item) => {
      const features = featureItems[item.id];
      return !features || features.some((feature) => this.#enabled.has(feature));
    });
    const value = {
      generated_at: (/* @__PURE__ */ new Date()).toISOString(),
      items,
      providers: providerViews,
      settings,
      discord_bridge: this.#enabled.has("discord") ? this.#discordBridge?.status() ?? null : null,
      telegram_bridge: this.#enabled.has("telegram") ? telegramStatus ?? null : null,
      agents: this.agents()
    };
    this.#cache = { at: Date.now(), value };
    return value;
  }
  #item(id, title, group, status, test) {
    return {
      id,
      title,
      group,
      state: !status.configured ? "setup" : status.ok === false ? "error" : "ok",
      summary: !status.configured ? "\u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E" : status.ok === false ? status.error ?? "\u043E\u0448\u0438\u0431\u043A\u0430" : status.account ?? "\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
      actions: [test]
    };
  }
  configure(id, body) {
    const input = body && typeof body === "object" ? body : {};
    const fields = (keys) => {
      const result = {};
      for (const key of keys) {
        const value = input[key];
        if (value === void 0) continue;
        if (typeof value !== "string") throw new UpstreamError(`\u041F\u043E\u043B\u0435 ${key} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
        result[key] = value;
      }
      return result;
    };
    switch (id) {
      case "github": {
        const github = Object.assign(
          {},
          fields(["token", "owner", "active_login"])
        );
        if (Array.isArray(input.accounts)) github.accounts = input.accounts;
        this.#store.update({ github });
        break;
      }
      case "discord": {
        const discord = Object.assign(
          {},
          fields(["bot_token", "webhook_url", "channel_id", "user_token", "application_id"])
        );
        if (typeof input.presence === "boolean") discord.presence = input.presence;
        if (typeof input.user_enabled === "boolean") discord.user_enabled = input.user_enabled;
        if (typeof input.bot_enabled === "boolean") discord.bot_enabled = input.bot_enabled;
        if (Array.isArray(input.bot_allowed_users)) {
          discord.bot_allowed_users = input.bot_allowed_users;
        }
        if (input.notify && typeof input.notify === "object") {
          const notify = input.notify;
          discord.notify = {
            tasks: notify.tasks === true,
            runs: notify.runs === true,
            errors: notify.errors !== false
          };
        }
        if (typeof input.mode === "string") discord.mode = input.mode;
        this.#store.update({ discord });
        if (this.#discordBridge) void this.#discordBridge.reload();
        break;
      }
      case "google":
        this.#store.update({ google: fields(["client_id", "client_secret", "refresh_token", "access_token"]) });
        break;
      case "telegram":
        this.configureTelegram(body);
        break;
      default:
        throw new UpstreamError(`\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044F \xAB${id}\xBB`);
    }
    this.#cache = null;
    return this.#store.masked();
  }
  setGithubAccount(login) {
    const settings = this.#store.setGithubAccount(login);
    this.#cache = null;
    return settings;
  }
  vault() {
    return this.#store.masked().sites;
  }
  /** Значение поля сайта для подстановки в форму; наружу не отдаётся. */
  siteSecret(ref) {
    const parts = ref.trim().split(".");
    if (parts.length !== 2) throw new UpstreamError("\u0421\u0435\u043A\u0440\u0435\u0442 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A site.field");
    const site = (parts[0] ?? "").trim().toLowerCase();
    const field = (parts[1] ?? "").trim().toLowerCase();
    const value = this.#store.get().sites[site]?.[field];
    if (!value) throw new UpstreamError(`\u0421\u0435\u043A\u0440\u0435\u0442 ${site}.${field} \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D`);
    return value;
  }
  /** Убирает сохранённые секреты из текста страницы и журнала. */
  redactSecrets(text3) {
    let result = text3;
    for (const fields of Object.values(this.#store.get().sites)) {
      for (const value of Object.values(fields)) {
        if (value.length >= 4) result = result.split(value).join("[secret]");
      }
    }
    return result;
  }
  configureProvider(id, key) {
    const provider = PROVIDERS.find((p) => p.id === id);
    if (!provider) throw new UpstreamError(`\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \xAB${id}\xBB`);
    this.#store.update({ providers: { [id]: key.trim() } });
    this.#cache = null;
    return this.#store.masked();
  }
  async test(id) {
    const status = id === "github" ? await this.#github.status() : id === "discord" ? await this.#discord.status() : id === "google" ? await this.#google.status() : null;
    if (!status) throw new UpstreamError(`\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044F \xAB${id}\xBB`);
    this.#cache = null;
    return status;
  }
  repos(limit) {
    return this.#github.repos(Math.min(Math.max(limit ?? 20, 1), 100));
  }
  pulls(repo, state = "open", limit) {
    return this.#github.pulls(repo, state, Math.min(Math.max(limit ?? 20, 1), 100));
  }
  pull(repo, number) {
    return this.#github.pull(repo, number);
  }
  createPull(repo, input) {
    return this.#github.createPull(repo, input);
  }
  agents() {
    const items = this.#executor?.list() ?? [];
    const runs = this.#runs?.list({ limit: "200" }).items ?? [];
    const stats = items.map((agent) => {
      const own = runs.filter((run) => run.agent === agent.id);
      const finished = own.filter((run) => (run.status === "succeeded" || run.status === "failed") && run.started_at && run.finished_at);
      const durations = finished.map((run) => Date.parse(run.finished_at) - Date.parse(run.started_at)).filter((ms) => Number.isFinite(ms) && ms >= 0).sort((left, right) => left - right);
      const succeeded = own.filter((run) => run.status === "succeeded").length;
      const failed = own.filter((run) => run.status === "failed").length;
      const last = own[0] ?? null;
      return {
        agent: agent.id,
        runs: own.length,
        succeeded,
        failed,
        success_rate: succeeded + failed > 0 ? Math.round(succeeded / (succeeded + failed) * 1e3) / 10 : null,
        median_ms: durations.length ? durations[Math.floor(durations.length / 2)] : null,
        last_run_at: last?.finished_at ?? last?.started_at ?? last?.created_at ?? null,
        last_error: own.find((run) => run.error_message)?.error_message ?? null
      };
    });
    return { items, stats };
  }
  configureSite(site, fields) {
    const settings = this.#store.update({ sites: { [site]: fields } });
    this.#cache = null;
    return settings;
  }
  removeSite(site) {
    const existing = this.#store.get().sites[site.trim().toLowerCase()];
    if (!existing) throw new UpstreamError(`\u0421\u0430\u0439\u0442 \xAB${site}\xBB \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D`);
    const cleared = Object.fromEntries(Object.keys(existing).map((field) => [field, ""]));
    const settings = this.#store.update({ sites: { [site]: cleared } });
    this.#cache = null;
    return settings;
  }
  issues(repo, limit) {
    return this.#github.issues(repo, Math.min(Math.max(limit ?? 20, 1), 100));
  }
  createIssue(repo, title, body) {
    return this.#github.createIssue(repo, { title, body });
  }
  guilds() {
    return this.#discord.guilds();
  }
  channels(guildId) {
    return this.#discord.channels(guildId);
  }
  sendDiscord(content) {
    return this.#discord.send(content);
  }
  /** Проверка доставки: короткое сообщение в настроенный канал или вебхук. */
  async sendDiscordTest() {
    const result = await this.#discord.send("Team Platform: \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u0432\u044F\u0437\u0438");
    this.#log.info("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 Discord \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430");
    return result;
  }
  async sendDiscordFile(name, data, text3 = "") {
    const discord = this.#store.get().discord;
    if (!discord.bot_token) throw new UpstreamError("Discord: \u0444\u0430\u0439\u043B\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0431\u043E\u0442");
    if (!/^\d{5,25}$/.test(discord.channel_id)) {
      throw new UpstreamError("Discord: \u0443\u043A\u0430\u0436\u0438\u0442\u0435 id \u043A\u0430\u043D\u0430\u043B\u0430 \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u0444\u0430\u0439\u043B\u043E\u0432");
    }
    const result = await this.#discord.sendFile(discord.channel_id, name, data, text3);
    this.#log.info("\u0424\u0430\u0439\u043B \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u0432 Discord", { name: result.name, bytes: result.bytes });
    return result;
  }
  botMessages(after, limit) {
    return this.#discord.botMessages(after, limit);
  }
  calendar(days) {
    return this.#google.calendar(days ?? 7);
  }
  mail(limit) {
    return this.#google.mail(limit ?? 10);
  }
  drive(limit) {
    return this.#google.drive(limit ?? 10);
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
var toolsMigrations = [
  {
    version: "tools/0001_telegram_run_replies",
    sql: `CREATE TABLE telegram_run_replies (
      run_id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );
    CREATE INDEX telegram_run_replies_pending ON telegram_run_replies (sent_at, created_at);
    CREATE TABLE telegram_incoming (
      message_id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      received_at TEXT NOT NULL
    );
    CREATE TABLE telegram_send_quota (
      kind TEXT NOT NULL CHECK (kind IN ('day', 'hour')),
      window_key TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (kind, window_key)
    );`
  },
  // Очередь вопросов Discord и адреса ответов: вопрос к занятому участнику
  // переживает перезапуск и отвечает в то же сообщение канала.
  {
    version: "tools/0002_discord_questions",
    sql: `CREATE TABLE discord_questions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('task', 'ask')),
      text TEXT NOT NULL,
      author_id TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT '',
      channel_id TEXT NOT NULL,
      message_id TEXT,
      run_id TEXT,
      created_at TEXT NOT NULL,
      dispatched_at TEXT
    );
    CREATE INDEX discord_questions_pending ON discord_questions (dispatched_at, created_at);
    CREATE TABLE discord_run_replies (
      run_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );
    CREATE INDEX discord_run_replies_pending ON discord_run_replies (sent_at, created_at);`
  },
  // Состояние внутренних инструментов: резерв карточек и свободное время.
  // Настройки переживают перезапуск, а очередь резерва ссылается на карточки.
  {
    version: "tools/0003_toolbox_state",
    sql: `CREATE TABLE tool_settings (
      id TEXT PRIMARY KEY CHECK (id IN ('reserve', 'spare')),
      settings TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE reserve_items (
      task_id TEXT PRIMARY KEY,
      added_at TEXT NOT NULL
    );
    CREATE INDEX reserve_items_added ON reserve_items (added_at);`
  },
  // Проверка «Агенты и модели» — третья настройка внутренних инструментов.
  // SQLite не меняет CHECK на месте, поэтому таблица пересобирается один раз.
  {
    version: "tools/0004_provider_guard",
    sql: `CREATE TABLE tool_settings_new (
      id TEXT PRIMARY KEY CHECK (id IN ('reserve', 'spare', 'providers')),
      settings TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO tool_settings_new (id, settings, updated_at)
      SELECT id, settings, updated_at FROM tool_settings;
    DROP TABLE tool_settings;
    ALTER TABLE tool_settings_new RENAME TO tool_settings;`
  },
  // Entire — pull-синхронизация истории через локальный CLI. Настройки и
  // снимок сессий живут отдельно от tool_settings и переживают перезапуск.
  {
    version: "tools/0005_entire_sync",
    sql: `CREATE TABLE entire_settings (
      id TEXT PRIMARY KEY CHECK (id = 'entire'),
      repo_path TEXT NOT NULL,
      cli_path TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE entire_syncs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'unsupported')),
      phase TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      fetched INTEGER NOT NULL DEFAULT 0,
      upserted INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );
    CREATE INDEX entire_syncs_started ON entire_syncs (started_at);
    CREATE TABLE entire_sessions (
      session_id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL,
      kind TEXT,
      read_only INTEGER NOT NULL DEFAULT 0,
      branch TEXT,
      worktree_id TEXT,
      worktree_path TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      last_active TEXT,
      turns INTEGER NOT NULL DEFAULT 0,
      pending_turns INTEGER NOT NULL DEFAULT 0,
      last_checkpoint_id TEXT,
      last_prompt TEXT,
      tokens_total INTEGER,
      files_touched TEXT NOT NULL DEFAULT '[]',
      synced_at TEXT NOT NULL
    );
    CREATE INDEX entire_sessions_started ON entire_sessions (started_at);`
  }
];
var TOOLS_INTEGRATION_PREFIXES = [
  "/api/tools/github",
  "/api/tools/discord",
  "/api/tools/google",
  "/api/tools/telegram",
  "/api/tools/entire",
  "/api/tools/freebuff"
];
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

// modules/tools/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { display: grid; gap: 20px; padding: 24px; max-width: 960px; }
  section { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { display: grid; gap: 2px; border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .title { font-weight: 600; }
  .meta { color: #7f8a9c; font-size: 12px; }
  .state { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: #222a36; }
  .state-ok { background: #1d3a2a; color: #8be0ab; }
  .state-error { background: #3a2426; color: #ff9a9a; }
  .state-setup { background: #3a3320; color: #e8ce8b; }
  .empty { color: #7f8a9c; }
  .error { color: #ff9a9a; font-size: 13px; }
</style>
</head>
<body>
<header>
  <h1>\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
  <a href="/api/tools/vault">\u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 (\u043C\u0430\u0441\u043A\u0430)</a>
</header>
<main>
  <section>
    <h2>\u0421\u0435\u0440\u0432\u0438\u0441\u044B</h2>
    <ul id="tools"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
    <p class="error" id="error"></p>
  </section>
  <section>
    <h2>\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B \u043C\u043E\u0434\u0435\u043B\u0435\u0439</h2>
    <ul id="providers"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
  </section>
</main>
<script>
(function () {
  var toolsList = document.getElementById('tools');
  var providersList = document.getElementById('providers');
  var error = document.getElementById('error');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function stateClass(state) {
    if (state === 'ok' || state === 'configured') return 'state state-ok';
    if (state === 'error') return 'state state-error';
    if (state === 'setup') return 'state state-setup';
    return 'state';
  }

  function load() {
    return fetch('/api/tools').then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error((body.error && body.error.message) || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430');
        return body;
      });
    }).then(function (body) {
      toolsList.textContent = '';
      var items = body.items || [];
      if (!items.length) {
        toolsList.appendChild(el('li', 'empty', '\u041D\u0435\u0442 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432'));
      }
      items.forEach(function (item) {
        var row = el('li');
        var head = el('div', 'row');
        head.appendChild(el('span', 'title', item.title));
        head.appendChild(el('span', stateClass(item.state), item.state));
        row.appendChild(head);
        if (item.summary) row.appendChild(el('div', 'meta', item.summary));
        toolsList.appendChild(row);
      });

      providersList.textContent = '';
      var providers = body.providers || [];
      providers.forEach(function (provider) {
        var row = el('li');
        var head = el('div', 'row');
        head.appendChild(el('span', 'title', provider.title));
        head.appendChild(el('span', provider.configured ? 'state state-ok' : 'state state-setup',
          provider.configured ? '\u043A\u043B\u044E\u0447 \u0435\u0441\u0442\u044C' : '\u043D\u0443\u0436\u0435\u043D \u043A\u043B\u044E\u0447'));
        row.appendChild(head);
        row.appendChild(el('div', 'meta', provider.env));
        providersList.appendChild(row);
      });
      error.textContent = '';
    }).catch(function (failure) {
      error.textContent = failure.message;
    });
  }

  load();
})();
</script>
</body>
</html>
`;

// modules/tools/index.ts
var module = {
  id: "tools",
  apiVersion: 1,
  migrations: [...toolsMigrations],
  register(ctx) {
    const space = ctx.secrets;
    if (!space) throw new UpstreamError("\u041C\u043E\u0434\u0443\u043B\u044E \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u043D\u0443\u0436\u043D\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0441\u0435\u043A\u0440\u0435\u0442\u043E\u0432 \u044F\u0434\u0440\u0430");
    const { tasks } = ctx.require("tasks");
    const runs = ctx.require("runs");
    const store = new IntegrationStore({
      read: () => space.get(INTEGRATIONS_SECRET_KEY),
      write: (text3) => space.set(INTEGRATIONS_SECRET_KEY, text3)
    }, process.env, ctx.log);
    const entire = new EntireService(ctx.storage, systemClock, ctx.log, {
      repoPath: ctx.settings.entire.cwd,
      cliPath: ctx.settings.entire.cli
    });
    const toolbox = new ToolboxService(ctx.storage, tasks, systemClock, store, ctx.log, {
      entire: { url: ctx.settings.entire.url, token: ctx.settings.entire.token },
      freebuff: { url: ctx.settings.freebuff.url }
    });
    const tools = new ToolsService(store, ctx.log, {
      executor: runs.executor,
      watchdogIntervalMs: ctx.settings.watchdogIntervalMs,
      tasks,
      runs: runs.runs,
      bus: ctx.bus,
      db: ctx.storage,
      availability: runs.availability,
      toolbox,
      entire
    });
    ctx.publish({ tools, toolbox, entire, store });
    const core = new ScopedRouter(TOOLS_INTEGRATION_PREFIXES, "deny");
    registerToolsRoutes(core, { tools, toolbox, entire });
    ctx.api.mount("/", core);
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
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
