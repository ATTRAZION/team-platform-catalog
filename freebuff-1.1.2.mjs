import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

// modules/freebuff/index.ts
var module = {
  id: "freebuff",
  apiVersion: 1,
  register(ctx) {
    const host2 = ctx.require("tools");
    host2.tools.enable("freebuff");
    const api = new ScopedRouter(["/api/tools/freebuff"]);
    host2.registerRoutes(api);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: host2.page(
        "freebuff",
        "Freebuff",
        "Developer API, \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0438 \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u043A \u0447\u0430\u0442\u0443 Freebuff."
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
