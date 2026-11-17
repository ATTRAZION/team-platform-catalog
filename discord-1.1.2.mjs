import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

// modules/discord/index.ts
var module = {
  id: "discord",
  apiVersion: 1,
  register(ctx) {
    const host2 = ctx.require("tools");
    host2.tools.enable("discord");
    host2.tools.startDiscord();
    const api = new ScopedRouter(["/api/tools/discord"]);
    host2.registerRoutes(api);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: host2.page(
        "discord",
        "Discord",
        "\u0411\u043E\u0442, presence, \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0437\u0430\u0434\u0430\u0447\u0430\u0445 \u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0445, \u043B\u0438\u0447\u043D\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F."
      ),
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    ctx.onShutdown(async () => {
      await host2.tools.stopDiscord();
    });
  }
};
var index_default = module;
export {
  index_default as default
};
