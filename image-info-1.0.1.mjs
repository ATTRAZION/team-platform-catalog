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

// modules/image-info/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "image_info_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
function parsePng(buf) {
  if (buf.length < 24) return null;
  if (!(buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71)) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { format: "png", width, height, bytes: buf.length };
}
function parseGif(buf) {
  if (buf.length < 10) return null;
  const sig = buf.toString("ascii", 0, 6);
  if (sig !== "GIF87a" && sig !== "GIF89a") return null;
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  return { format: "gif", width, height, bytes: buf.length };
}
function parseJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 255 || buf[1] !== 216) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 255) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 217 || marker === 218) break;
    if (marker === 192 || marker === 194 || marker === 193 || marker === 195) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { format: "jpeg", width, height, bytes: buf.length };
    }
    const segLen = buf.readUInt16BE(i + 2);
    i += 2 + segLen;
  }
  return null;
}
function parseWebp(buf) {
  if (buf.length < 12) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  if (buf.toString("ascii", 12, 16) === "VP8 ") {
    if (buf.length < 30) return null;
    const width = buf.readUInt16LE(26) & 16383;
    const height = buf.readUInt16LE(28) & 16383;
    return { format: "webp", width, height, bytes: buf.length };
  }
  if (buf.toString("ascii", 12, 16) === "VP8L") {
    if (buf.length < 25) return null;
    const b0 = buf[21] ?? 0, b1 = buf[22] ?? 0, b2 = buf[23] ?? 0, b3 = buf[24] ?? 0;
    const width = 1 + ((b1 & 63) << 8 | b0);
    const height = 1 + ((b3 & 15) << 10 | b2 << 2 | (b1 & 192) >> 6);
    return { format: "webp", width, height, bytes: buf.length };
  }
  if (buf.toString("ascii", 12, 16) === "VP8X") {
    if (buf.length < 30) return null;
    const width = 1 + ((buf[24] ?? 0) | (buf[25] ?? 0) << 8 | (buf[26] ?? 0) << 16);
    const height = 1 + ((buf[27] ?? 0) | (buf[28] ?? 0) << 8 | (buf[29] ?? 0) << 16);
    return { format: "webp", width, height, bytes: buf.length };
  }
  return null;
}
function inspect(buf) {
  return parsePng(buf) || parseJpeg(buf) || parseGif(buf) || parseWebp(buf) || (() => {
    throw new ValidationError("\u041D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u0438\u043B\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F", { reason: "image_format_unsupported" });
  })();
}
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E\u0431 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438</title></head><body><h1>\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E\u0431 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438</h1><p>\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0438 \u0444\u043E\u0440\u043C\u0430\u0442 PNG/JPEG/GIF/WebP \u043F\u043E base64.</p></body></html>`;
var module = {
  id: "image-info",
  apiVersion: 1,
  register(ctx) {
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("POST", "/api/tools/image-info/inspect", (request) => {
      const body = bodyOf(request.body);
      const b64 = String(body.content_base64 ?? "").trim();
      if (!b64) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D content_base64", { reason: "image_content_required" });
      let buf;
      try {
        buf = Buffer.from(b64, "base64");
      } catch {
        throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 base64", { reason: "image_base64_invalid" });
      }
      if (buf.length === 0) throw new ValidationError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B", { reason: "image_empty" });
      const info = inspect(buf);
      return { status: 200, headers: NO_STORE, body: { ok: true, image: info } };
    });
    ctx.api.add("GET", "/api/tools/image-info/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, supported: ["png", "jpeg", "gif", "webp"] }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
