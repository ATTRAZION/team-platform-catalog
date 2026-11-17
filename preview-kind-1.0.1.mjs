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

// team-host-api:src/kernel/validate.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var integer = host2["integer"];
var oneOf = host2["oneOf"];
var optionalInteger = host2["optionalInteger"];
var optionalName = host2["optionalName"];
var record = host2["record"];
var requiredOneOf = host2["requiredOneOf"];
var text = host2["text"];

// modules/preview-kind/service.ts
var IMAGE_EXT = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif", "avif"]);
var TEXT_EXT = /* @__PURE__ */ new Set(["txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml", "toml", "ini", "log", "rtf"]);
var CODE_EXT = /* @__PURE__ */ new Set(["js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "c", "cpp", "h", "hpp", "cs", "java", "kt", "swift", "php", "html", "css", "scss", "less", "sh", "bash", "sql", "vue", "svelte"]);
var AUDIO_EXT = /* @__PURE__ */ new Set(["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"]);
var VIDEO_EXT = /* @__PURE__ */ new Set(["mp4", "webm", "avi", "mov", "mkv", "flv", "wmv"]);
var PDF_EXT = /* @__PURE__ */ new Set(["pdf"]);
var MIME_TO_KIND = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "image/avif": "image",
  "text/plain": "text",
  "text/markdown": "text",
  "text/csv": "text",
  "text/html": "code",
  "application/json": "text",
  "application/xml": "text",
  "text/xml": "text",
  "application/javascript": "code",
  "text/javascript": "code",
  "text/css": "code",
  "application/pdf": "pdf",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/flac": "audio",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video"
};
function extOf(filename) {
  if (!filename) return null;
  const idx = filename.lastIndexOf(".");
  if (idx < 0 || idx === filename.length - 1) return null;
  return filename.slice(idx + 1).toLowerCase();
}
function detectKind(ext, mime) {
  if (mime && MIME_TO_KIND[mime.toLowerCase()]) return MIME_TO_KIND[mime.toLowerCase()];
  if (ext) {
    if (IMAGE_EXT.has(ext)) return "image";
    if (CODE_EXT.has(ext)) return "code";
    if (TEXT_EXT.has(ext)) return "text";
    if (AUDIO_EXT.has(ext)) return "audio";
    if (VIDEO_EXT.has(ext)) return "video";
    if (PDF_EXT.has(ext)) return "pdf";
  }
  return "binary";
}
function parsePngDims(buf) {
  if (buf.length < 24) return null;
  if (buf[0] !== 137 || buf[1] !== 80 || buf[2] !== 78 || buf[3] !== 71) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function parseGifDims(buf) {
  if (buf.length < 10) return null;
  const sig = buf.toString("ascii", 0, 6);
  if (sig !== "GIF87a" && sig !== "GIF89a") return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}
function parseJpegDims(buf) {
  if (buf.length < 4 || buf[0] !== 255 || buf[1] !== 216) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 255) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 192 || marker === 194) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    if (marker === 217 || marker === 218) break;
    const segLen = buf.readUInt16BE(i + 2);
    if (segLen < 2) break;
    i += 2 + segLen;
  }
  return null;
}
function dimsFor(kind, buf) {
  if (kind !== "image" || !buf) return null;
  return parsePngDims(buf) ?? parseGifDims(buf) ?? parseJpegDims(buf);
}
var PreviewKindService = class {
  inspect(raw) {
    const input = record(raw, "\u041F\u0440\u0435\u0432\u044C\u044E");
    const filename = input.filename === void 0 || input.filename === null || input.filename === "" ? null : text(input.filename, "filename", 500, true);
    const mime = input.mime === void 0 || input.mime === null || input.mime === "" ? null : text(input.mime, "mime", 120, true);
    const b64 = input.content_base64 === void 0 || input.content_base64 === null || input.content_base64 === "" ? null : String(input.content_base64);
    let buf = null;
    if (b64) {
      try {
        buf = Buffer.from(b64, "base64");
      } catch {
        throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 base64", { reason: "preview_base64_invalid" });
      }
    }
    const ext = extOf(filename);
    const kind = detectKind(ext, mime);
    const size = buf ? buf.length : typeof input.size_bytes === "number" ? Number(input.size_bytes) : 0;
    const dims = dimsFor(kind, buf);
    const inline = kind === "image" || kind === "text" || kind === "code" || kind === "pdf";
    const hint = kind === "image" ? "img" : kind === "code" ? "code" : kind === "text" ? "text" : kind === "pdf" ? "pdf" : kind === "audio" ? "audio" : kind === "video" ? "video" : "download";
    return {
      kind,
      extension: ext,
      mime,
      size_bytes: size,
      can_preview_inline: inline,
      renderer_hint: hint,
      dimensions: dims
    };
  }
  summary() {
    return {
      supported_kinds: ["image", "text", "code", "audio", "video", "pdf", "binary"],
      supported_extensions: IMAGE_EXT.size + TEXT_EXT.size + CODE_EXT.size + AUDIO_EXT.size + VIDEO_EXT.size + PDF_EXT.size
    };
  }
};

// modules/preview-kind/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "preview_kind_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0422\u0438\u043F \u043F\u0440\u0435\u0432\u044C\u044E</title></head><body><h1>\u0422\u0438\u043F \u043F\u0440\u0435\u0432\u044C\u044E</h1><p>\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0442\u0438\u043F\u0430 \u043F\u0440\u0435\u0432\u044C\u044E \u0430\u0441\u0441\u0435\u0442\u0430.</p></body></html>`;
var module = {
  id: "preview-kind",
  apiVersion: 1,
  register(ctx) {
    const svc = new PreviewKindService();
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("POST", "/api/tools/preview-kind/inspect", (request) => {
      const result = svc.inspect(bodyOf(request.body));
      return { status: 200, headers: NO_STORE, body: { ok: true, preview: result } };
    });
    ctx.api.add("GET", "/api/tools/preview-kind/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, summary: svc.summary() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
