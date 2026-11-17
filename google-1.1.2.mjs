import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/adapters/http/router.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var Router = host["Router"];
var ScopedRouter = host["ScopedRouter"];

// modules/google/index.ts
var module = {
  id: "google",
  apiVersion: 1,
  register(ctx) {
    const host2 = ctx.require("tools");
    host2.tools.enable("google");
    const api = new ScopedRouter(["/api/tools/google"]);
    host2.registerRoutes(api);
    ctx.api.mount("/", api);
    ctx.router.add("GET", "/", () => ({
      raw: host2.page(
        "google",
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
