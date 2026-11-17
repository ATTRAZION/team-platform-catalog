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

// modules/canvas-board/render.ts
import { crc32, deflateSync } from "node:zlib";
var BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion"
];
var MAX_GUIDE_LINES = 512;
var FRAME_ASPECTS = ["16:9", "9:16", "4:3", "3:4", "1:1", "3:2", "2:3", "21:9"];
function parseColor(input, field = "color") {
  const raw = String(input ?? "").trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(raw);
  if (!match) {
    throw new ValidationError(`${field}: \u043D\u0443\u0436\u0435\u043D hex-\u0446\u0432\u0435\u0442 \u0432\u0438\u0434\u0430 #rrggbb`, {
      reason: "canvas_color_invalid",
      value: raw.slice(0, 40),
      field
    }, { code: "canvas_color_invalid" });
  }
  const hex = match[1] ?? "";
  if (hex.length === 3) {
    const [r, g, b] = hex.split("").map((digit) => parseInt(`${digit}${digit}`, 16));
    return { r, g, b, a: 1 };
  }
  const bytes = hex.match(/../g)?.map((pair) => parseInt(pair, 16)) ?? [];
  return {
    r: bytes[0],
    g: bytes[1],
    b: bytes[2],
    a: hex.length === 8 ? bytes[3] / 255 : 1
  };
}
function toHex(color) {
  const part = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${part(color.r)}${part(color.g)}${part(color.b)}`;
}
function blendChannel(backdrop, source, mode) {
  switch (mode) {
    case "normal":
      return source;
    case "multiply":
      return backdrop * source;
    case "screen":
      return backdrop + source - backdrop * source;
    case "overlay":
      return backdrop <= 0.5 ? 2 * backdrop * source : 1 - 2 * (1 - backdrop) * (1 - source);
    case "darken":
      return Math.min(backdrop, source);
    case "lighten":
      return Math.max(backdrop, source);
    case "color-dodge":
      if (backdrop === 0) return 0;
      if (source === 1) return 1;
      return Math.min(1, backdrop / (1 - source));
    case "color-burn":
      if (backdrop === 1) return 1;
      if (source === 0) return 0;
      return 1 - Math.min(1, (1 - backdrop) / source);
    case "hard-light":
      return source <= 0.5 ? 2 * backdrop * source : 1 - 2 * (1 - backdrop) * (1 - source);
    case "soft-light": {
      if (source <= 0.5) return backdrop - (1 - 2 * source) * backdrop * (1 - backdrop);
      const d = backdrop <= 0.25 ? ((16 * backdrop - 12) * backdrop + 4) * backdrop : Math.sqrt(backdrop);
      return backdrop + (2 * source - 1) * (d - backdrop);
    }
    case "difference":
      return Math.abs(backdrop - source);
    case "exclusion":
      return backdrop + source - 2 * backdrop * source;
    default:
      return source;
  }
}
function clipRect(rect, width, height) {
  const x = Math.max(0, Math.min(width, rect.x));
  const y = Math.max(0, Math.min(height, rect.y));
  const right = Math.max(0, Math.min(width, rect.x + rect.width));
  const bottom = Math.max(0, Math.min(height, rect.y + rect.height));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}
function guideRects(width, height, spec) {
  const rects = [];
  const seen = /* @__PURE__ */ new Set();
  const thickness = Math.max(1, Math.min(8, Math.round(spec.width)));
  const add = (rect) => {
    const key = `${rect.x}:${rect.y}:${rect.width}:${rect.height}`;
    if (seen.has(key)) return;
    seen.add(key);
    rects.push(rect);
  };
  if (spec.gridStep > 0) {
    for (let x = spec.gridStep; x < width; x += spec.gridStep) {
      add({ x, y: 0, width: Math.min(thickness, width - x), height });
    }
    for (let y = spec.gridStep; y < height; y += spec.gridStep) {
      add({ x: 0, y, width, height: Math.min(thickness, height - y) });
    }
  }
  if (spec.thirds) {
    for (const fraction of [1 / 3, 2 / 3]) {
      const x = Math.round(width * fraction);
      if (x > 0 && x < width) add({ x, y: 0, width: Math.min(thickness, width - x), height });
    }
    for (const fraction of [1 / 3, 2 / 3]) {
      const y = Math.round(height * fraction);
      if (y > 0 && y < height) add({ x: 0, y, width, height: Math.min(thickness, height - y) });
    }
  }
  return rects;
}
function parseAspect(input) {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(input);
  if (!match) throw new Error(`aspect: ${input}`);
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || height < 1) throw new Error(`aspect: ${input}`);
  return { width, height };
}
function borderRects(rect, thickness, out) {
  const t = Math.max(1, Math.round(thickness));
  const horizontal = Math.min(t, rect.height);
  const vertical = Math.min(t, rect.width);
  out.push({ x: rect.x, y: rect.y, width: rect.width, height: horizontal });
  if (rect.height > horizontal) {
    out.push({ x: rect.x, y: rect.y + rect.height - horizontal, width: rect.width, height: horizontal });
  }
  out.push({ x: rect.x, y: rect.y, width: vertical, height: rect.height });
  if (rect.width > vertical) {
    out.push({ x: rect.x + rect.width - vertical, y: rect.y, width: vertical, height: rect.height });
  }
}
function frameGeometry(width, height, spec) {
  const ratio2 = parseAspect(spec.aspect);
  const byHeight = Math.round(height * ratio2.width / ratio2.height);
  const byWidth = Math.round(width * ratio2.height / ratio2.width);
  const frame = byHeight <= width ? { x: Math.floor((width - byHeight) / 2), y: 0, width: byHeight, height } : { x: 0, y: Math.floor((height - byWidth) / 2), width, height: byWidth };
  if (frame.width < 1 || frame.height < 1) return null;
  const padding = Math.round(Math.min(frame.width, frame.height) * spec.inset / 100);
  const safe = {
    x: frame.x + padding,
    y: frame.y + padding,
    width: frame.width - padding * 2,
    height: frame.height - padding * 2
  };
  if (safe.width < 1 || safe.height < 1) return null;
  const rects = [];
  borderRects(frame, spec.width, rects);
  if (padding > 0) borderRects(safe, spec.width, rects);
  return { frame, safe, rects };
}
function paintRect(pixels, canvasWidth, rect, color, alpha, blend) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * canvasWidth + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const backdrop = pixels[offset + channel] / 255;
        const source = channel === 0 ? color.r : channel === 1 ? color.g : color.b;
        const blended = blendChannel(backdrop, source / 255, blend);
        const mixed = backdrop * (1 - alpha) + blended * alpha;
        pixels[offset + channel] = Math.max(0, Math.min(255, Math.round(mixed * 255)));
      }
      const backdropAlpha = pixels[offset + 3] / 255;
      pixels[offset + 3] = Math.max(0, Math.min(255, Math.round((backdropAlpha + alpha * (1 - backdropAlpha)) * 255)));
    }
  }
}
function composite(scene, guides, frame) {
  const { width, height } = scene;
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = Math.round(scene.background.r);
    pixels[index * 4 + 1] = Math.round(scene.background.g);
    pixels[index * 4 + 2] = Math.round(scene.background.b);
    pixels[index * 4 + 3] = Math.round(scene.background.a * 255);
  }
  let painted = 0;
  for (const layer of scene.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    const rect = clipRect(layer.rect, width, height);
    if (!rect) continue;
    painted += 1;
    const alpha = Math.max(0, Math.min(1, layer.opacity * layer.color.a));
    paintRect(pixels, width, rect, layer.color, alpha, layer.blend);
  }
  if (guides && guides.opacity > 0) {
    const alpha = Math.max(0, Math.min(1, guides.opacity * guides.color.a));
    for (const rect of guideRects(width, height, guides)) {
      const clipped = clipRect(rect, width, height);
      if (clipped) paintRect(pixels, width, clipped, guides.color, alpha, "normal");
    }
  }
  if (frame && frame.opacity > 0) {
    const geometry = frameGeometry(width, height, frame);
    if (geometry) {
      const alpha = Math.max(0, Math.min(1, frame.opacity * frame.color.a));
      const seen = /* @__PURE__ */ new Set();
      for (const rect of geometry.rects) {
        const key = `${rect.x}:${rect.y}:${rect.width}:${rect.height}`;
        if (seen.has(key)) continue;
        seen.add(key);
        paintRect(pixels, width, rect, frame.color, alpha, "normal");
      }
    }
  }
  return { pixels, painted };
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([length, body, sum]);
}
function encodePng(pixels, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rows[y * (stride + 1)] = 0;
    pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderSvg(scene, guides, frame) {
  const defs = [];
  const body = [];
  scene.layers.forEach((layer, index) => {
    if (!layer.visible) return;
    const rect = clipRect(layer.rect, scene.width, scene.height);
    if (!rect) return;
    const id = `layer-${index}`;
    const shape = `<rect id="${id}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${toHex(layer.color)}"${layer.opacity === 1 ? "" : ` opacity="${Number(layer.opacity.toFixed(4))}"`}${layer.blend === "normal" ? "" : ` style="mix-blend-mode:${layer.blend}"`}><title>${escapeXml(layer.name ?? `\u0421\u043B\u043E\u0439 ${index + 1}`)}</title></rect>`;
    body.push(shape);
    void defs;
  });
  const background = `<rect id="background" x="0" y="0" width="${scene.width}" height="${scene.height}" fill="${toHex(scene.background)}"/>`;
  const guideRectsList = guides && guides.opacity > 0 ? guideRects(scene.width, scene.height, guides) : [];
  const guideBlock = guideRectsList.length === 0 ? "" : `<g id="guides" fill="${toHex(guides.color)}"${guides.opacity === 1 ? "" : ` opacity="${Number(guides.opacity.toFixed(4))}"`}>
${guideRectsList.map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}"/>`).join("")}</g>
`;
  const frameGeometryValue = frame && frame.opacity > 0 ? frameGeometry(scene.width, scene.height, frame) : null;
  const frameBlock = frameGeometryValue ? `<g id="frame" fill="${toHex(frame.color)}"${frame.opacity === 1 ? "" : ` opacity="${Number(frame.opacity.toFixed(4))}"`}>
${frameGeometryValue.rects.map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}"/>`).join("")}</g>
` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">
${background}
${body.join("\n")}${body.length ? "\n" : ""}${guideBlock}${frameBlock}</svg>
`;
}

// modules/canvas-board/index.ts
var NO_STORE = { "cache-control": "no-store" };
var MIN_SIDE = 8;
var MAX_SIDE = 2048;
var MAX_SVG_PIXELS = 4096 * 4096;
var MAX_RASTER_PIXELS = 262144;
var MAX_LAYERS = 64;
var MAX_PALETTE_COLORS = 64;
var MAX_CELL = 256;
var MAX_GAP = 32;
var MAX_COLUMNS = 12;
var MIN_GRID_STEP = 4;
var MAX_GRID_STEP = 1024;
var MIN_GUIDE_WIDTH = 1;
var MAX_GUIDE_WIDTH = 8;
var DEFAULT_GRID_STEP = 64;
var DEFAULT_GUIDE_COLOR = "#00d1ff";
var DEFAULT_GUIDE_OPACITY = 0.9;
var MIN_FRAME_INSET = 0;
var MAX_FRAME_INSET = 45;
var MIN_FRAME_WIDTH = 1;
var MAX_FRAME_WIDTH = 8;
var DEFAULT_FRAME_INSET = 10;
var DEFAULT_FRAME_COLOR = "#ffcc00";
var DEFAULT_FRAME_OPACITY = 1;
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u041A\u0430\u043D\u0432\u0430\u0441-\u0434\u043E\u0441\u043A\u0430</title></head><body><h1>\u041A\u0430\u043D\u0432\u0430\u0441-\u0434\u043E\u0441\u043A\u0430</h1>
<p>\u0421\u0446\u0435\u043D\u0430 \u0438\u0437 \u043F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u044B\u0445 \u0441\u043B\u043E\u0451\u0432 \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F \u0432 \u0432\u0435\u043A\u0442\u043E\u0440 \u0438 \u0440\u0430\u0441\u0442\u0440 \u0431\u0435\u0437 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u0438 \u0441\u0435\u0442\u0438.</p>
<p><code>POST /api/tools/canvas-board/render</code> \u2014 \u0441\u0446\u0435\u043D\u0430 \u0441\u043E \u0441\u043B\u043E\u044F\u043C\u0438
(<code>color</code>, <code>rect</code>, <code>opacity</code>, <code>blend</code>, <code>visible</code>),
<code>format</code>: <code>svg</code>, <code>png</code> \u0438\u043B\u0438 <code>both</code>.</p>
<p><code>POST /api/tools/canvas-board/palette-board</code> \u2014 \u0441\u0435\u0442\u043A\u0430 \u0446\u0432\u0435\u0442\u043E\u0432 \u043F\u0430\u043B\u0438\u0442\u0440\u044B
(<code>colors</code>, <code>columns</code>, <code>cell</code>, <code>gap</code>).</p>
<p>\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0435 \u2014 \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0431\u043B\u043E\u043A <code>guides</code> (<code>grid.step</code>,
<code>thirds</code>, <code>color</code>, <code>width</code>, <code>opacity</code>):
\u0441\u0435\u0442\u043A\u0430 \u0438 \u0442\u0440\u0435\u0442\u0438 \u0440\u0438\u0441\u0443\u044E\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u043C \u0441\u043B\u043E\u0435\u043C \u043F\u043E\u0432\u0435\u0440\u0445 \u0441\u0446\u0435\u043D\u044B \u0438 \u0432\u0438\u0434\u043D\u044B \u0438 \u0432 SVG, \u0438 \u0432 PNG.</p>
<p>\u041A\u0430\u0434\u0440 \u2014 \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0431\u043B\u043E\u043A <code>frame</code> (<code>aspect</code>, <code>inset</code>,
<code>color</code>, <code>width</code>, <code>opacity</code>): \u0430\u0441\u043F\u0435\u043A\u0442-\u0440\u0430\u043C\u043A\u0430 (16:9, 4:3,
1:1 \u0438 \u0434\u0440\u0443\u0433\u0438\u0435) \u0438 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u0430\u044F \u0437\u043E\u043D\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C \u0432 \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u0430\u0445, \u0442\u043E\u0436\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u043C \u0441\u043B\u043E\u0435\u043C.</p>
<p>\u0420\u0435\u0436\u0438\u043C\u044B \u043D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0438 \u0438\u0445 \u0438\u043C\u0435\u043D\u0430 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442 \u0441 <code>layer-stack</code>, \u0446\u0432\u0435\u0442\u0430 \u2014
hex, \u043A\u0430\u043A \u0432 <code>color-palette</code>.</p>
</body></html>`;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "canvas_body_invalid"
    });
  }
  return raw;
}
function side(value, field, fallback) {
  if (value === void 0 || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C`, { received: value, field }, {
      code: "canvas_size_invalid"
    });
  }
  if (parsed < MIN_SIDE || parsed > MAX_SIDE) {
    throw new ValidationError(`${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0442 ${MIN_SIDE} \u0434\u043E ${MAX_SIDE}`, {
      received: parsed,
      field
    }, { code: "canvas_size_invalid" });
  }
  return parsed;
}
function ratio(value, field) {
  const parsed = value === void 0 || value === null || value === "" ? 1 : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new ValidationError(`${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0442 0 \u0434\u043E 1`, { received: value, field }, {
      code: "canvas_opacity_invalid"
    });
  }
  return parsed;
}
function integer(value, field, min, max, fallback) {
  if (value === void 0 || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u043E\u0442 ${min} \u0434\u043E ${max}`, {
      received: value,
      field
    }, { code: "canvas_number_invalid" });
  }
  return parsed;
}
function blendOf(value) {
  const raw = value === void 0 || value === null || value === "" ? "normal" : String(value).trim();
  if (!BLEND_MODES.includes(raw)) {
    throw new ValidationError(`\u0420\u0435\u0436\u0438\u043C \u043D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u044F \xAB${raw}\xBB \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D`, {
      reason: "canvas_blend_unknown",
      allowed: [...BLEND_MODES]
    }, { code: "canvas_blend_unknown" });
  }
  return raw;
}
function rectOf(value, width, height) {
  if (value === void 0 || value === null) return { x: 0, y: 0, width, height };
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("rect \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof value }, {
      code: "canvas_rect_invalid"
    });
  }
  const rect = value;
  const numbers = ["x", "y", "width", "height"].map((key) => {
    const parsed = Number(rect[key]);
    if (!Number.isFinite(parsed)) {
      throw new ValidationError(`rect.${key} \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0447\u0438\u0441\u043B\u043E\u043C`, { received: rect[key] }, {
        code: "canvas_rect_invalid"
      });
    }
    return parsed;
  });
  const [x, y, w, h] = numbers;
  if (w <= 0 || h <= 0) {
    throw new ValidationError("rect.width \u0438 rect.height \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F", { rect }, {
      code: "canvas_rect_invalid"
    });
  }
  return { x, y, width: w, height: h };
}
function sceneOf(body) {
  const width = side(body.width, "width", 320);
  const height = side(body.height, "height", 240);
  const background = body.background === void 0 ? parseColor("#0e1015") : parseColor(body.background, "background");
  const rawLayers = body.layers;
  if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043D\u0435\u043F\u0443\u0441\u0442\u043E\u0439 \u043C\u0430\u0441\u0441\u0438\u0432 layers", { reason: "canvas_layers_required" }, {
      code: "canvas_layers_required"
    });
  }
  if (rawLayers.length > MAX_LAYERS) {
    throw new ValidationError(`\u0421\u043B\u043E\u0451\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430 ${MAX_LAYERS}`, { received: rawLayers.length }, {
      code: "canvas_layers_too_many"
    });
  }
  const layers = rawLayers.map((rawLayer, index) => {
    if (typeof rawLayer !== "object" || rawLayer === null || Array.isArray(rawLayer)) {
      throw new ValidationError(`layers[${index}] \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C`, { index }, {
        code: "canvas_layer_invalid"
      });
    }
    const layer = rawLayer;
    const name = layer.name === void 0 || layer.name === null ? null : String(layer.name).slice(0, 120);
    return {
      name,
      color: parseColor(layer.color, `layers[${index}].color`),
      opacity: ratio(layer.opacity, `layers[${index}].opacity`),
      blend: blendOf(layer.blend),
      visible: layer.visible === void 0 ? true : Boolean(layer.visible),
      rect: rectOf(layer.rect, width, height)
    };
  });
  return { width, height, background, layers };
}
function formatOf(body) {
  const raw = body.format === void 0 || body.format === null ? "svg" : String(body.format).trim();
  if (raw !== "svg" && raw !== "png" && raw !== "both") {
    throw new ValidationError("format: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F svg, png \u0438\u043B\u0438 both", { received: raw }, {
      code: "canvas_format_invalid"
    });
  }
  return raw;
}
function guidesOf(body, width, height) {
  const raw = body.guides;
  if (raw === void 0 || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("guides \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "canvas_guides_invalid"
    });
  }
  const guides = raw;
  let gridStep = 0;
  if (guides.grid !== void 0 && guides.grid !== null && guides.grid !== false) {
    if (typeof guides.grid !== "object" || Array.isArray(guides.grid)) {
      throw new ValidationError("guides.grid \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C { step }", {
        received: typeof guides.grid
      }, { code: "canvas_grid_step_invalid" });
    }
    const rawStep = guides.grid.step;
    if (rawStep === void 0 || rawStep === null || rawStep === "") {
      gridStep = DEFAULT_GRID_STEP;
    } else {
      const parsed = Number(rawStep);
      if (!Number.isInteger(parsed) || parsed < MIN_GRID_STEP || parsed > MAX_GRID_STEP) {
        throw new ValidationError(
          `guides.grid.step \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u043E\u0442 ${MIN_GRID_STEP} \u0434\u043E ${MAX_GRID_STEP}`,
          { received: rawStep, field: "guides.grid.step" },
          { code: "canvas_grid_step_invalid" }
        );
      }
      gridStep = parsed;
    }
  }
  const thirds = guides.thirds === void 0 ? false : Boolean(guides.thirds);
  if (gridStep === 0 && !thirds) {
    throw new ValidationError("guides: \u043D\u0443\u0436\u043D\u0430 \u0441\u0435\u0442\u043A\u0430 (grid.step) \u0438\u043B\u0438 \u0442\u0440\u0435\u0442\u0438 (thirds)", { guides }, {
      code: "canvas_guides_empty"
    });
  }
  const rawWidth = guides.width;
  const guideWidth = rawWidth === void 0 || rawWidth === null || rawWidth === "" ? 1 : Number(rawWidth);
  if (!Number.isInteger(guideWidth) || guideWidth < MIN_GUIDE_WIDTH || guideWidth > MAX_GUIDE_WIDTH) {
    throw new ValidationError(
      `guides.width \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u043E\u0442 ${MIN_GUIDE_WIDTH} \u0434\u043E ${MAX_GUIDE_WIDTH}`,
      { received: rawWidth, field: "guides.width" },
      { code: "canvas_guide_width_invalid" }
    );
  }
  const spec = {
    gridStep,
    thirds,
    width: guideWidth,
    color: guides.color === void 0 ? parseColor(DEFAULT_GUIDE_COLOR, "guides.color") : parseColor(guides.color, "guides.color"),
    opacity: guides.opacity === void 0 || guides.opacity === null || guides.opacity === "" ? DEFAULT_GUIDE_OPACITY : ratio(guides.opacity, "guides.opacity")
  };
  const lines = guideRects(width, height, spec).length;
  if (lines === 0) {
    throw new ValidationError("guides: \u0448\u0430\u0433 \u0441\u0435\u0442\u043A\u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u0445\u043E\u043B\u0441\u0442\u0430, \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043B\u0438\u043D\u0438\u0438", {
      grid_step: gridStep,
      width,
      height
    }, { code: "canvas_guides_empty" });
  }
  if (lines > MAX_GUIDE_LINES) {
    throw new ValidationError(`\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0445 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430 ${MAX_GUIDE_LINES}: \u0443\u0432\u0435\u043B\u0438\u0447\u044C\u0442\u0435 \u0448\u0430\u0433 \u0441\u0435\u0442\u043A\u0438`, {
      lines,
      limit: MAX_GUIDE_LINES
    }, { code: "canvas_guides_too_many" });
  }
  return spec;
}
function frameOf(body, width, height) {
  const raw = body.frame;
  if (raw === void 0 || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("frame \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "canvas_frame_invalid"
    });
  }
  const frame = raw;
  const aspect = String(frame.aspect ?? "").trim();
  if (!FRAME_ASPECTS.includes(aspect)) {
    throw new ValidationError("frame.aspect: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0438\u0437 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0445 \u0430\u0441\u043F\u0435\u043A\u0442\u043E\u0432", {
      received: aspect,
      allowed: [...FRAME_ASPECTS]
    }, { code: "canvas_frame_aspect_invalid" });
  }
  const rawInset = frame.inset;
  const inset = rawInset === void 0 || rawInset === null || rawInset === "" ? DEFAULT_FRAME_INSET : Number(rawInset);
  if (!Number.isFinite(inset) || inset < MIN_FRAME_INSET || inset > MAX_FRAME_INSET) {
    throw new ValidationError(
      `frame.inset \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0447\u0438\u0441\u043B\u043E\u043C \u043E\u0442 ${MIN_FRAME_INSET} \u0434\u043E ${MAX_FRAME_INSET} \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u043E\u0432`,
      { received: rawInset, field: "frame.inset" },
      { code: "canvas_frame_inset_invalid" }
    );
  }
  const rawWidth = frame.width;
  const lineWidth = rawWidth === void 0 || rawWidth === null || rawWidth === "" ? 1 : Number(rawWidth);
  if (!Number.isInteger(lineWidth) || lineWidth < MIN_FRAME_WIDTH || lineWidth > MAX_FRAME_WIDTH) {
    throw new ValidationError(
      `frame.width \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u043E\u0442 ${MIN_FRAME_WIDTH} \u0434\u043E ${MAX_FRAME_WIDTH}`,
      { received: rawWidth, field: "frame.width" },
      { code: "canvas_frame_width_invalid" }
    );
  }
  const spec = {
    aspect,
    inset,
    width: lineWidth,
    color: frame.color === void 0 ? parseColor(DEFAULT_FRAME_COLOR, "frame.color") : parseColor(frame.color, "frame.color"),
    opacity: frame.opacity === void 0 || frame.opacity === null || frame.opacity === "" ? DEFAULT_FRAME_OPACITY : ratio(frame.opacity, "frame.opacity")
  };
  if (!frameGeometry(width, height, spec)) {
    throw new ValidationError("frame: \u043F\u0440\u0438 \u0442\u0430\u043A\u043E\u043C \u0430\u0441\u043F\u0435\u043A\u0442\u0435 \u0438 \u043E\u0442\u0441\u0442\u0443\u043F\u0435 \u043E\u0442 \u043A\u0430\u0434\u0440\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F", {
      aspect,
      inset,
      width,
      height
    }, { code: "canvas_frame_empty" });
  }
  return spec;
}
function renderReply(scene, format, extra, guides = null, frame = null) {
  if (scene.width * scene.height > MAX_SVG_PIXELS) {
    throw new ValidationError("\u0425\u043E\u043B\u0441\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u0432\u0435\u043A\u0442\u043E\u0440\u0430-\u043F\u0440\u0435\u0434\u0435\u043B\u0430", {
      pixels: scene.width * scene.height,
      limit: MAX_SVG_PIXELS
    }, { code: "canvas_too_large" });
  }
  const wantPng = format === "png" || format === "both";
  if (wantPng && scene.width * scene.height > MAX_RASTER_PIXELS) {
    throw new ValidationError("\u0425\u043E\u043B\u0441\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u0440\u0430\u0441\u0442\u0440\u043E\u0432\u043E\u0433\u043E \u043F\u0440\u0435\u0434\u0435\u043B\u0430: \u0431\u0435\u0440\u0438\u0442\u0435 format=svg", {
      pixels: scene.width * scene.height,
      limit: MAX_RASTER_PIXELS
    }, { code: "canvas_raster_too_large" });
  }
  const svg = format === "svg" || format === "both" ? renderSvg(scene, guides, frame) : null;
  let png = null;
  let painted = 0;
  if (wantPng) {
    const result = composite(scene, guides, frame);
    painted = result.painted;
    png = encodePng(result.pixels, scene.width, scene.height).toString("base64");
  }
  const guideLines = guides ? guideRects(scene.width, scene.height, guides).length : 0;
  const frameValue = frame ? frameGeometry(scene.width, scene.height, frame) : null;
  return {
    status: 200,
    headers: NO_STORE,
    body: {
      ok: true,
      ...extra,
      canvas: { width: scene.width, height: scene.height, background: scene.background },
      layers: scene.layers.map((layer, index) => ({
        index,
        name: layer.name,
        color: layer.color,
        opacity: layer.opacity,
        blend: layer.blend,
        visible: layer.visible,
        rect: layer.rect
      })),
      painted,
      guides: guides ? {
        grid_step: guides.gridStep,
        thirds: guides.thirds,
        color: guides.color,
        width: guides.width,
        opacity: guides.opacity,
        lines: guideLines
      } : null,
      frame: frame && frameValue ? {
        aspect: frame.aspect,
        inset: frame.inset,
        color: frame.color,
        width: frame.width,
        opacity: frame.opacity,
        frame: frameValue.frame,
        safe: frameValue.safe,
        lines: frameValue.rects.length
      } : null,
      svg,
      png_base64: png
    }
  };
}
function paletteScene(body) {
  const rawColors = body.colors;
  if (!Array.isArray(rawColors) || rawColors.length === 0) {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043D\u0435\u043F\u0443\u0441\u0442\u043E\u0439 \u043C\u0430\u0441\u0441\u0438\u0432 colors", { reason: "canvas_colors_required" }, {
      code: "canvas_colors_required"
    });
  }
  if (rawColors.length > MAX_PALETTE_COLORS) {
    throw new ValidationError(`\u0426\u0432\u0435\u0442\u043E\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430 ${MAX_PALETTE_COLORS}`, { received: rawColors.length }, {
      code: "canvas_colors_too_many"
    });
  }
  const colors = rawColors.map((color, index) => parseColor(color, `colors[${index}]`));
  const columns = Math.min(colors.length, integer(body.columns, "columns", 1, MAX_COLUMNS, Math.min(colors.length, 5)));
  const cell = integer(body.cell, "cell", 8, MAX_CELL, 64);
  const gap = integer(body.gap, "gap", 0, MAX_GAP, 4);
  const rows = Math.ceil(colors.length / columns);
  const width = Math.min(MAX_SIDE, columns * cell + Math.max(0, columns - 1) * gap);
  const height = Math.min(MAX_SIDE, rows * cell + Math.max(0, rows - 1) * gap);
  const background = body.background === void 0 ? parseColor("#0e1015") : parseColor(body.background, "background");
  const layers = colors.map((color, index) => ({
    name: `\u0426\u0432\u0435\u0442 ${index + 1}`,
    color,
    opacity: 1,
    blend: "normal",
    visible: true,
    rect: {
      x: index % columns * (cell + gap),
      y: Math.floor(index / columns) * (cell + gap),
      width: cell,
      height: cell
    }
  }));
  return { width, height, background, layers };
}
var module = {
  id: "canvas-board",
  apiVersion: 1,
  register(ctx) {
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/canvas-board/summary", async () => ({
      status: 200,
      headers: NO_STORE,
      body: {
        ok: true,
        blend_modes: [...BLEND_MODES],
        formats: ["svg", "png"],
        limits: {
          side: { min: MIN_SIDE, max: MAX_SIDE },
          layers: MAX_LAYERS,
          raster_pixels: MAX_RASTER_PIXELS,
          palette_colors: MAX_PALETTE_COLORS,
          cell: { min: 8, max: MAX_CELL },
          columns: MAX_COLUMNS,
          guides: {
            grid_step: { min: MIN_GRID_STEP, max: MAX_GRID_STEP },
            width: { min: MIN_GUIDE_WIDTH, max: MAX_GUIDE_WIDTH },
            max_lines: MAX_GUIDE_LINES
          },
          frame: {
            aspects: [...FRAME_ASPECTS],
            inset: { min: MIN_FRAME_INSET, max: MAX_FRAME_INSET },
            width: { min: MIN_FRAME_WIDTH, max: MAX_FRAME_WIDTH }
          }
        },
        guides: {
          grid_step: DEFAULT_GRID_STEP,
          color: DEFAULT_GUIDE_COLOR,
          width: 1,
          opacity: DEFAULT_GUIDE_OPACITY
        },
        frame: {
          aspect: "16:9",
          inset: DEFAULT_FRAME_INSET,
          color: DEFAULT_FRAME_COLOR,
          width: 1,
          opacity: DEFAULT_FRAME_OPACITY
        },
        integrates: { layers: "layer-stack", colors: "color-palette", export: "export-bundle" }
      }
    }));
    ctx.api.add("POST", "/api/tools/canvas-board/render", async (request) => {
      const body = bodyOf(request.body);
      const scene = sceneOf(body);
      return renderReply(
        scene,
        formatOf(body),
        {},
        guidesOf(body, scene.width, scene.height),
        frameOf(body, scene.width, scene.height)
      );
    });
    ctx.api.add("POST", "/api/tools/canvas-board/palette-board", async (request) => {
      const body = bodyOf(request.body);
      const scene = paletteScene(body);
      return renderReply(
        scene,
        formatOf(body),
        { source: "palette", colors: scene.layers.length },
        guidesOf(body, scene.width, scene.height),
        frameOf(body, scene.width, scene.height)
      );
    });
  }
};
var index_default = module;
export {
  index_default as default
};
