import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

// modules/telegram/index.ts
var module = {
  id: "telegram",
  apiVersion: 1,
  permissions: ["storage", "events", "network", "secrets"],
  requiresKernel: [{ name: "telegram-bridge", contractVersion: 1, optional: true }],
  register(ctx) {
    const host2 = ctx.require("tools");
    const telegram = ctx.kernelServices.optional("telegram-bridge");
    if (telegram) {
      host2.tools.attachTelegram(telegram);
      host2.tools.enable("telegram");
    } else {
      const absent = new Proxy({}, {
        get: () => () => ({
          ok: false,
          configured: false,
          enabled: false,
          mode: "off",
          reason: "Telegram-\u043C\u043E\u0441\u0442 \u043D\u0435 \u043F\u043E\u0434\u043D\u044F\u0442: \u044F\u0434\u0440\u043E \u043D\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B\u043E telegram-bridge"
        })
      });
      host2.tools.attachTelegram(absent);
      host2.tools.enable("telegram");
    }
    const api = new ScopedRouter(["/api/tools/telegram"]);
    host2.registerRoutes(api);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: host2.page(
        "telegram",
        "Telegram",
        "\u0412\u0445\u043E\u0434 \u043F\u043E \u043D\u043E\u043C\u0435\u0440\u0443, \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0430 \u0441 \u0430\u0433\u0435\u043D\u0442\u043E\u043C \u0438 \u043E\u0442\u0432\u0435\u0442\u044B \u0432 \u0447\u0430\u0442\u044B \u0447\u0435\u0440\u0435\u0437 teleproto."
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
