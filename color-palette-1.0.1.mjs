import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// team-host-api:src/kernel/ids.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var newId = host2["newId"];

// team-host-api:src/kernel/validate.ts
var host3 = globalThis["__teamPlatformHostApi"] ?? {};
var integer = host3["integer"];
var oneOf = host3["oneOf"];
var optionalInteger = host3["optionalInteger"];
var optionalName = host3["optionalName"];
var record = host3["record"];
var requiredOneOf = host3["requiredOneOf"];
var text = host3["text"];

// modules/color-palette/service.ts
var MAX_PALETTES = 500;
var MAX_COLORS = 64;
var MAX_NAME = 120;
var MAX_META = 4e3;
function parseColors(raw) {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map((x) => String(x));
  } catch {
  }
  return [];
}
function parseMetadata(raw) {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
  }
  return {};
}
function toPalette(row) {
  return {
    id: row.id,
    name: row.name,
    colors: parseColors(row.colors),
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at
  };
}
function normalizeHex(input) {
  let v = input.trim().replace(/^#/, "");
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(v)) {
    throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 hex-\u0446\u0432\u0435\u0442", { reason: "color_invalid", value: input });
  }
  return "#" + v.toLowerCase();
}
function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}
function generateHarmony(base, kind) {
  const hex = normalizeHex(base);
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  switch (kind) {
    case "complementary":
      return [hex, hslToHex(h + 180, s, l)];
    case "analogous":
      return [hslToHex(h - 30, s, l), hex, hslToHex(h + 30, s, l)];
    case "triadic":
      return [hex, hslToHex(h + 120, s, l), hslToHex(h + 240, s, l)];
    case "split-complementary":
      return [hex, hslToHex(h + 150, s, l), hslToHex(h + 210, s, l)];
    case "tetradic":
      return [hex, hslToHex(h + 90, s, l), hslToHex(h + 180, s, l), hslToHex(h + 270, s, l)];
    case "monochromatic":
      return [hslToHex(h, s, Math.max(10, l - 30)), hslToHex(h, s, Math.max(10, l - 15)), hex, hslToHex(h, s, Math.min(90, l + 15)), hslToHex(h, s, Math.min(90, l + 30))];
    default:
      return [hex];
  }
}
var ColorPaletteService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM color_palettes").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM color_palettes ORDER BY created_at DESC LIMIT ?").all(safe);
    return rows.map(toPalette);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM color_palettes WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u041F\u0430\u043B\u0438\u0442\u0440\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return toPalette(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043F\u0430\u043B\u0438\u0442\u0440\u044B");
    const name = text(input.name, "name", MAX_NAME, true);
    const colorsRaw = input.colors;
    if (!Array.isArray(colorsRaw) || colorsRaw.length === 0) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043D\u0435\u043F\u0443\u0441\u0442\u043E\u0439 \u043C\u0430\u0441\u0441\u0438\u0432 colors", { reason: "palette_colors_required" });
    }
    if (colorsRaw.length > MAX_COLORS) {
      throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0446\u0432\u0435\u0442\u043E\u0432", { reason: "palette_too_many_colors", limit: MAX_COLORS });
    }
    const colors = colorsRaw.map((c) => normalizeHex(String(c)));
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) {
      throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "palette_metadata_too_long" });
    }
    if (this.#count() >= MAX_PALETTES) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u043F\u0430\u043B\u0438\u0442\u0440 (500)", { reason: "palette_count_limit" });
    }
    const id = newId("palette");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO color_palettes (id, name, colors, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, JSON.stringify(colors), metaStr, now);
    return { id, name, colors, metadata, created_at: now };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM color_palettes WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u041F\u0430\u043B\u0438\u0442\u0440\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    this.#db.raw.prepare("DELETE FROM color_palettes WHERE id = ?").run(id);
    return { removed: true, id };
  }
  exportCss(palette) {
    return ":root {\n" + palette.colors.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n") + "\n}\n";
  }
  exportSvg(palette) {
    const w = 40, h = 40;
    const rects = palette.colors.map((c, i) => `  <rect x="${i * w}" y="0" width="${w}" height="${h}" fill="${c}"/>`).join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${palette.colors.length * w}" height="${h}">
${rects}
</svg>
`;
  }
  summary() {
    return { palettes: this.#count(), limit: MAX_PALETTES };
  }
};

// modules/color-palette/schema.ts
var colorPaletteMigrations = [
  {
    version: "color-palette/1_palettes",
    sql: `
      CREATE TABLE color_palettes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        colors TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_color_palettes_created ON color_palettes (created_at);
      CREATE INDEX idx_color_palettes_name ON color_palettes (name);
    `
  }
];

// modules/color-palette/page.ts
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><title>\u041F\u0430\u043B\u0438\u0442\u0440\u044B \u0446\u0432\u0435\u0442\u043E\u0432</title></head>
<body><h1>\u041F\u0430\u043B\u0438\u0442\u0440\u044B \u0446\u0432\u0435\u0442\u043E\u0432</h1><p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0430\u043B\u0438\u0442\u0440, \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0439, \u044D\u043A\u0441\u043F\u043E\u0440\u0442 CSS/JSON/SVG.</p></body>
</html>`;

// modules/color-palette/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "color_palette_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var HARMONIES = ["complementary", "analogous", "triadic", "split-complementary", "tetradic", "monochromatic"];
var module = {
  id: "color-palette",
  apiVersion: 1,
  migrations: colorPaletteMigrations,
  register(ctx) {
    const svc = new ColorPaletteService({ db: ctx.storage });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/color-palette/palettes", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/color-palette/palettes/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, palette: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/color-palette/palettes", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, palette: result } };
    });
    ctx.api.add("DELETE", "/api/tools/color-palette/palettes/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/color-palette/harmony", (request) => {
      const body = bodyOf(request.body);
      const base = String(body.base ?? "");
      const kind = String(body.kind ?? "complementary");
      if (!HARMONIES.includes(kind)) {
        throw new ValidationError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0442\u0438\u043F \u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0438", { reason: "harmony_unknown", kind, allowed: HARMONIES });
      }
      const colors = generateHarmony(base, kind);
      return { status: 200, headers: NO_STORE, body: { ok: true, base, kind, colors } };
    });
    ctx.api.add("GET", "/api/tools/color-palette/palettes/:id/export", (request) => {
      const palette = svc.get(request.params.id);
      const format = (request.query.get("format") ?? "json").toLowerCase();
      if (format === "css") return { status: 200, headers: { ...NO_STORE, "content-type": "text/css; charset=utf-8" }, raw: svc.exportCss(palette) };
      if (format === "svg") return { status: 200, headers: { ...NO_STORE, "content-type": "image/svg+xml; charset=utf-8" }, raw: svc.exportSvg(palette) };
      return { headers: NO_STORE, body: { ok: true, palette, format: "json" } };
    });
    ctx.api.add("GET", "/api/tools/color-palette/summary", () => ({
      headers: NO_STORE,
      body: { ok: true, summary: svc.summary() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
