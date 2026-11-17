import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

// modules/entire/index.ts
var module = {
  id: "entire",
  apiVersion: 1,
  register(ctx) {
    const host2 = ctx.require("tools");
    host2.tools.enable("entire");
    const api = new ScopedRouter(["/api/tools/entire"]);
    host2.registerRoutes(api);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: host2.page(
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
