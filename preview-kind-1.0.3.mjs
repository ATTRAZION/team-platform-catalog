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

// modules/preview-kind/service.ts
import { createHash } from "node:crypto";

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
  #audioInfo;
  #licenseInfo;
  constructor(options = {}) {
    this.#audioInfo = options.audioInfo ?? null;
    this.#licenseInfo = options.licenseInfo ?? null;
  }
  #resolveLicense(sha256) {
    if (!sha256) return null;
    const service = this.#licenseInfo;
    if (!service) return null;
    const fn = typeof service === "function" ? service : service.findBySha256 ?? null;
    if (typeof fn !== "function") return null;
    try {
      const found = fn(sha256);
      const records = Array.isArray(found) ? found : found ? [found] : [];
      if (records.length === 1) return records[0];
      if (records.length > 1) return { ambiguous: true, candidates: records };
      return null;
    } catch {
      return null;
    }
  }
  #parseAudio(buffer) {
    const service = this.#audioInfo;
    if (!service) return null;
    const fn = typeof service === "function" ? service : service.parse ?? service.parseAudio ?? service.inspect ?? service.inspectBuffer ?? service.read ?? null;
    if (typeof fn !== "function") return null;
    try {
      const result = fn(buffer);
      if (result && typeof result === "object" && "audio" in result) {
        return result.audio ?? null;
      }
      return result ?? null;
    } catch {
      return null;
    }
  }
  inspect(raw) {
    const input = record(raw, "\u041F\u0440\u0435\u0432\u044C\u044E");
    const filename = input.filename === void 0 || input.filename === null || input.filename === "" ? null : text(input.filename, "filename", 500, true);
    const mime = input.mime === void 0 || input.mime === null || input.mime === "" ? null : text(input.mime, "mime", 120, true);
    const b64 = input.content_base64 === void 0 || input.content_base64 === null || input.content_base64 === "" ? null : String(input.content_base64);
    const shaInput = input.sha256 === void 0 || input.sha256 === null || input.sha256 === "" ? null : String(input.sha256);
    const licenseInput = input.license === void 0 ? void 0 : input.license;
    let buf = null;
    if (b64) {
      try {
        buf = Buffer.from(b64, "base64");
      } catch {
        throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 base64", { reason: "preview_base64_invalid" });
      }
    }
    const sha256 = shaInput ?? (buf ? createHash("sha256").update(buf).digest("hex") : null);
    const ext = extOf(filename);
    const kind = detectKind(ext, mime);
    const audio = kind === "audio" && buf ? this.#parseAudio(buf) : null;
    const license = licenseInput !== void 0 ? licenseInput : this.#resolveLicense(sha256);
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
      dimensions: dims,
      audio,
      license
    };
  }
  /**
   * Что модуль умеет и что ему подключено. Поля `audio_info_connected` и
   * `license_info_connected` появились для страницы: без них экран молча
   * показывал `audio: null` и `license: null`, а человек читал это как «файл
   * плохой». Теперь понятно: соседний модуль просто не подключён.
   */
  summary() {
    return {
      supported_kinds: ["image", "text", "code", "audio", "video", "pdf", "binary"],
      supported_extensions: IMAGE_EXT.size + TEXT_EXT.size + CODE_EXT.size + AUDIO_EXT.size + VIDEO_EXT.size + PDF_EXT.size,
      audio_info_connected: this.#audioInfo !== null && this.#audioInfo !== void 0,
      license_info_connected: this.#licenseInfo !== null && this.#licenseInfo !== void 0
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
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>\u0422\u0438\u043F \u043F\u0440\u0435\u0432\u044C\u044E</title></head>
<body><main>
<h1>\u0422\u0438\u043F \u043F\u0440\u0435\u0432\u044C\u044E</h1>
<p>\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \u0432\u043E\u043F\u0440\u043E\u0441 \xAB\u043A\u0430\u043A \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0444\u0430\u0439\u043B\xBB: image, text, code, audio, video, pdf \u0438\u043B\u0438 binary. \u0422\u0438\u043F \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u043F\u043E \u0438\u043C\u0435\u043D\u0438, MIME \u0438 \u0431\u0430\u0439\u0442\u0430\u043C; \u0434\u043B\u044F PNG, JPEG \u0438 GIF \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0440\u0430\u0437\u043C\u0435\u0440\u044B. \u0424\u0430\u0439\u043B \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435, \u0441\u0435\u0442\u044C \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F.</p>
<p id="setup" role="status">\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C, \u043A\u0430\u043A\u0438\u0435 \u0441\u043E\u0441\u0435\u0434\u043D\u0438\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B\u2026</p>
<section>
  <p><label>\u0424\u0430\u0439\u043B <input type="file" id="file" /></label></p>
  <p><label>\u0418\u043C\u044F \u0444\u0430\u0439\u043B\u0430 <input id="filename" maxlength="500" size="40" placeholder="tone.mp3" /></label> <label>MIME, \u0435\u0441\u043B\u0438 \u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D <input id="mime" maxlength="120" placeholder="audio/mpeg" /></label></p>
  <p><label>\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F \u0441\u0443\u043C\u043C\u0430 sha256, \u0435\u0441\u043B\u0438 \u0443\u0436\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430 <input id="sha256" maxlength="64" size="40" /></label> <label>\u0420\u0430\u0437\u043C\u0435\u0440 \u0432 \u0431\u0430\u0439\u0442\u0430\u0445, \u0435\u0441\u043B\u0438 \u0444\u0430\u0439\u043B\u0430 \u043D\u0435\u0442 <input type="number" id="size" min="0" step="1" /></label></p>
  <p><button id="inspect-btn">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0442\u0438\u043F</button> <button id="summary-btn">\u0427\u0442\u043E \u0443\u043C\u0435\u0435\u0442 \u043C\u043E\u0434\u0443\u043B\u044C</button></p>
</section>
<p id="status" role="status"></p>
<section>
  <h2>\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442</h2>
  <p id="result-note" role="status">\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0442\u0438\u043F \u0444\u0430\u0439\u043B\u0430, \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435, \u0440\u0430\u0437\u043C\u0435\u0440 \u0438 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430, \u043A\u0430\u043A \u0435\u0433\u043E \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C.</p>
  <pre id="result" style="white-space:pre-wrap"></pre>
</section>
<script>
var statusLine = document.getElementById('status');
var setupLine = document.getElementById('setup');
var note = document.getElementById('result-note');
var out = document.getElementById('result');
function say(text) { statusLine.textContent = text; }
function field(id) { return document.getElementById(id).value.trim(); }
async function api(method, path, body) {
  var r = await fetch(path, { method: method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  var data = await r.json().catch(function () { return null; });
  if (!r.ok) { throw Error(data && data.error && data.error.message ? data.error.message : '\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ' + r.status); }
  return data;
}
function readBase64(file) {
  return file.arrayBuffer().then(function (buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes.subarray(i, i + 8192)));
    }
    return btoa(binary);
  });
}
function render(preview) {
  var lines = [];
  lines.push('\u0422\u0438\u043F: ' + preview.kind + '; \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C: ' + preview.renderer_hint
    + (preview.can_preview_inline ? ' (\u043C\u043E\u0436\u043D\u043E \u043F\u0440\u044F\u043C\u043E \u0432 \u043E\u043A\u043D\u0435)' : ' (\u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C)') + '.');
  lines.push('\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435: ' + (preview.extension || '\u043D\u0435\u0442') + '; MIME: ' + (preview.mime || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D')
    + '; \u0440\u0430\u0437\u043C\u0435\u0440: ' + preview.size_bytes + ' \u0431\u0430\u0439\u0442.');
  if (preview.dimensions) {
    lines.push('\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438: ' + preview.dimensions.width + '\xD7' + preview.dimensions.height + ' \u043F\u0438\u043A\u0441.');
  }
  if (preview.kind === 'audio') {
    lines.push(preview.audio
      ? '\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u0443\u0434\u0438\u043E: ' + JSON.stringify(preview.audio)
      : '\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u0443\u0434\u0438\u043E \u043D\u0435\u0442: \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E\u0431 \u0430\u0443\u0434\u0438\u043E\xBB \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D \u043B\u0438\u0431\u043E \u0444\u0430\u0439\u043B \u043D\u0435 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D.');
  }
  if (preview.license && typeof preview.license === 'object' && preview.license.ambiguous) {
    lines.push('\u041F\u043E \u044D\u0442\u043E\u0439 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439: \u043D\u0443\u0436\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430.');
  } else if (preview.license) {
    lines.push('\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F: ' + JSON.stringify(preview.license));
  } else {
    lines.push('\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u0430\u0441\u0441\u0435\u0442\u043E\u0432\xBB \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D, \u043B\u0438\u0431\u043E \u0444\u0430\u0439\u043B \u0435\u0449\u0451 \u043D\u0435 \u043E\u043F\u0438\u0441\u0430\u043D.');
  }
  out.textContent = lines.join('\\n');
  note.textContent = '\u041C\u043E\u0434\u0443\u043B\u044C \u0441\u043E\u0432\u0435\u0442\u0443\u0435\u0442 \u0440\u0438\u0441\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u043E \u043F\u0440\u0435\u0432\u044C\u044E \u0447\u0435\u0440\u0435\u0437 \xAB' + preview.renderer_hint + '\xBB; \u0441\u043E\u0432\u0435\u0442 \u043D\u0430\u0434\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043D\u0430 \u0441\u0432\u043E\u0451\u043C \u0444\u0430\u0439\u043B\u0435.';
}
async function checkSetup() {
  var data = await api('GET', '/api/tools/preview-kind/summary');
  var missing = [];
  if (!data.summary.audio_info_connected) missing.push('\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E\u0431 \u0430\u0443\u0434\u0438\u043E\xBB \u2014 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u0443\u0434\u0438\u043E \u043D\u0435 \u0431\u0443\u0434\u0435\u0442');
  if (!data.summary.license_info_connected) missing.push('\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D \u043C\u043E\u0434\u0443\u043B\u044C \xAB\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u0430\u0441\u0441\u0435\u0442\u043E\u0432\xBB \u2014 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044E \u043F\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u0435 \u0438\u0441\u043A\u0430\u0442\u044C \u043D\u0435\u0433\u0434\u0435');
  setupLine.textContent = (missing.length ? '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043D\u0435 \u0432\u0441\u0451: ' + missing.join('; ') : '\u0421\u043E\u0441\u0435\u0434\u043D\u0438\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B: \u0430\u0443\u0434\u0438\u043E \u0438 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F')
    + '. \u0422\u0438\u043F\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u0435\u0442 \u043C\u043E\u0434\u0443\u043B\u044C: ' + data.summary.supported_kinds.join(', ') + '; \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0439: ' + data.summary.supported_extensions + '.';
  return data;
}
document.getElementById('file').onchange = function () {
  var file = this.files && this.files.length ? this.files[0] : null;
  if (!file) return;
  if (!field('filename')) document.getElementById('filename').value = file.name;
  if (!field('mime') && file.type) document.getElementById('mime').value = file.type;
  say('\u0424\u0430\u0439\u043B \xAB' + file.name + '\xBB \u0432\u044B\u0431\u0440\u0430\u043D, ' + file.size + ' \u0431\u0430\u0439\u0442. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0442\u0438\u043F\xBB.');
};
document.getElementById('summary-btn').onclick = async function () {
  this.disabled = true;
  say('\u0427\u0438\u0442\u0430\u0435\u043C \u0441\u0432\u043E\u0434\u043A\u0443 \u043C\u043E\u0434\u0443\u043B\u044F\u2026');
  try {
    await checkSetup();
    say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u043D\u0430\u0434 \u0444\u043E\u0440\u043C\u043E\u0439.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
document.getElementById('inspect-btn').onclick = async function () {
  var picker = document.getElementById('file');
  var file = picker.files && picker.files.length ? picker.files[0] : null;
  var name = field('filename');
  if (!file && !name) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u043C\u044F \u0444\u0430\u0439\u043B\u0430 \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0430\u043C \u0444\u0430\u0439\u043B \u2014 \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  var sizeRaw = field('size');
  if (sizeRaw && (!Number.isFinite(Number(sizeRaw)) || Number(sizeRaw) < 0)) {
    say('\u0420\u0430\u0437\u043C\u0435\u0440 \u0432 \u0431\u0430\u0439\u0442\u0430\u0445 \u2014 \u0447\u0438\u0441\u043B\u043E \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u043D\u0443\u043B\u044F. \u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.');
    return;
  }
  this.disabled = true;
  say('\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0442\u0438\u043F\u2026');
  try {
    var body = {};
    if (name) body.filename = name;
    if (field('mime')) body.mime = field('mime');
    if (field('sha256')) body.sha256 = field('sha256');
    if (sizeRaw) body.size_bytes = Number(sizeRaw);
    if (file) body.content_base64 = await readBase64(file);
    var data = await api('POST', '/api/tools/preview-kind/inspect', body);
    render(data.preview);
    say('\u0422\u0438\u043F \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D: ' + data.preview.kind + '.');
  } catch (error) { say(error.message); } finally { this.disabled = false; }
};
checkSetup().catch(function (error) {
  setupLine.textContent = '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0435 \u043C\u043E\u0434\u0443\u043B\u0438: ' + error.message;
});
</script>
</main></body>
</html>`;
var module = {
  id: "preview-kind",
  apiVersion: 1,
  register(ctx) {
    let audioInfo = null;
    try {
      audioInfo = ctx.require("audio-info");
    } catch {
      audioInfo = null;
    }
    let licenseInfo = null;
    try {
      licenseInfo = ctx.require("asset-license");
    } catch {
      licenseInfo = null;
    }
    const svc = new PreviewKindService({ audioInfo, licenseInfo });
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
  PAGE,
  index_default as default
};
