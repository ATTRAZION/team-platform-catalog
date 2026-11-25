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
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E\u0431 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438</title></head><body><main>
<h1>\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E\u0431 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438</h1>
<p>\u0424\u043E\u0440\u043C\u0430\u0442, \u0440\u0430\u0437\u043C\u0435\u0440\u044B \u0438 \u0432\u0435\u0441 PNG, JPEG, GIF \u0438\u043B\u0438 WebP \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0443 \u0444\u0430\u0439\u043B\u0430
\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E, \u0431\u0435\u0437 \u0432\u043D\u0435\u0448\u043D\u0438\u0445 \u0434\u0435\u043A\u043E\u0434\u0435\u0440\u043E\u0432 \u0438 \u0431\u0435\u0437 \u0441\u0435\u0442\u0438.</p>
<p><label>\u0424\u0430\u0439\u043B \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F <input id="file" type="file"
accept="image/png,image/jpeg,image/gif,image/webp" /></label></p>
<p><button id="inspect">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E</button>
<button id="summary">\u041A\u0430\u043A\u0438\u0435 \u0444\u043E\u0440\u043C\u0430\u0442\u044B \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F</button></p>
<p id="status" role="status"></p>
<pre id="result" style="white-space:pre-wrap"></pre>
</main><script>
'use strict';
var status = document.getElementById('status');
var result = document.getElementById('result');
function say(text) { status.textContent = text; }
function errorText(data, fallback) {
  return data && data.error && data.error.message ? data.error.message : fallback;
}
function unwrap(response) {
  return response.text().then(function (text) {
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (parseError) { data = null; }
    return { status: response.status, data: data };
  });
}
function getJson(path) { return fetch(path).then(unwrap); }
function postJson(path, payload) {
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(unwrap);
}
function reportReply(reply, fallback) {
  if (reply.status >= 400 || !reply.data || reply.data.ok !== true) {
    say(errorText(reply.data, fallback + ', \u043A\u043E\u0434 \u043E\u0442\u0432\u0435\u0442\u0430 ' + reply.status));
    return false;
  }
  return true;
}
function readBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || '');
      var comma = text.indexOf(',');
      resolve(comma >= 0 ? text.slice(comma + 1) : text);
    };
    reader.onerror = function () { reject(new Error('\u0444\u0430\u0439\u043B \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F')); };
    reader.readAsDataURL(file);
  });
}
document.getElementById('inspect').addEventListener('click', function () {
  var input = document.getElementById('file');
  var file = input.files && input.files[0];
  if (!file) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u043F\u043E\u043B\u0435 \xAB\u0424\u0430\u0439\u043B \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F\xBB.'); return; }
  if (file.size === 0) { say('\u0424\u0430\u0439\u043B \u043F\u0443\u0441\u0442: \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u044B\u043C.'); return; }
  say('\u0427\u0438\u0442\u0430\u044E \u0444\u0430\u0439\u043B \u0438 \u0437\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E\u2026');
  readBase64(file).then(function (content) {
    if (!content) { say('\u0418\u0437 \u0444\u0430\u0439\u043B\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C base64: \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u0444\u0430\u0439\u043B.'); return; }
    return postJson('/api/tools/image-info/inspect', { content_base64: content }).then(function (reply) {
      if (!reportReply(reply, '\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u0444\u0430\u0439\u043B')) return;
      var image = reply.data.image;
      result.textContent = '\u0424\u0430\u0439\u043B: ' + file.name + '\\n'
        + '\u0424\u043E\u0440\u043C\u0430\u0442: ' + image.format + '\\n'
        + '\u0420\u0430\u0437\u043C\u0435\u0440\u044B: ' + image.width + ' \u043D\u0430 ' + image.height + ' \u043F\u0438\u043A\u0441\u0435\u043B\u0435\u0439\\n'
        + '\u0420\u0430\u0437\u043C\u0435\u0440: ' + image.bytes + ' \u0431\u0430\u0439\u0442';
      say('\u0413\u043E\u0442\u043E\u0432\u043E: ' + image.format + ', ' + image.width + ' \u043D\u0430 ' + image.height
        + ', ' + image.bytes + ' \u0431\u0430\u0439\u0442.');
    });
  }).catch(function (error) {
    say('\u0421\u0431\u043E\u0439: ' + (error && error.message ? error.message : String(error)));
  });
});
document.getElementById('summary').addEventListener('click', function () {
  say('\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432\u2026');
  getJson('/api/tools/image-info/summary').then(function (reply) {
    if (!reportReply(reply, '\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D')) return;
    var supported = reply.data.supported || [];
    result.textContent = '\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435 \u0444\u043E\u0440\u043C\u0430\u0442\u044B: ' + supported.join(', ');
    say('\u0413\u043E\u0442\u043E\u0432\u043E: \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F ' + supported.length + ' \u0444\u043E\u0440\u043C\u0430\u0442\u0430.');
  }).catch(function (error) {
    say('\u0421\u0431\u043E\u0439: ' + (error && error.message ? error.message : String(error)));
  });
});
</script></body></html>`;
var module = {
  id: "image-info",
  apiVersion: 1,
  register(ctx) {
    ctx.publish({ version: "1.1.0", inspectImage: (bytes) => inspect(bytes) });
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
