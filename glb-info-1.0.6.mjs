import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/glb-info/index.ts
import { createHash } from "node:crypto";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// modules/glb-info/parse.ts
var MAGIC = 1179937895;
var CHUNK_JSON = 1313821514;
var CHUNK_BIN = 5130562;
function fail(code, message, details = {}) {
  throw new ValidationError(message, details, { code });
}
function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}
function stringsOf(value) {
  return arrayOf(value).filter((item) => typeof item === "string");
}
function countOf(value) {
  return Array.isArray(value) ? value.length : 0;
}
function readChunks(buffer) {
  let offset = 12;
  let jsonBytes = 0;
  let binBytes = 0;
  let jsonText = null;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      fail("glb_chunk_truncated", "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0447\u0430\u043D\u043A\u0430 \u043E\u0431\u0440\u0435\u0437\u0430\u043D", { offset, bytes: buffer.length });
    }
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    if (length % 4 !== 0) {
      fail("glb_chunk_unaligned", "\u0414\u043B\u0438\u043D\u0430 \u0447\u0430\u043D\u043A\u0430 \u043D\u0435 \u043A\u0440\u0430\u0442\u043D\u0430 4", { offset, length });
    }
    const start = offset + 8;
    if (start + length > buffer.length) {
      fail("glb_chunk_truncated", "\u0427\u0430\u043D\u043A \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0444\u0430\u0439\u043B\u0430", { offset, length, bytes: buffer.length });
    }
    if (type === CHUNK_JSON) {
      if (jsonText !== null) {
        fail("glb_duplicate_json", "\u0412 GLB \u0431\u043E\u043B\u044C\u0448\u0435 \u043E\u0434\u043D\u043E\u0433\u043E JSON-\u0447\u0430\u043D\u043A\u0430", { offset });
      }
      jsonBytes = length;
      jsonText = buffer.toString("utf8", start, start + length);
    } else if (type === CHUNK_BIN) {
      binBytes = length;
    }
    offset = start + length;
  }
  return { jsonBytes, binBytes, jsonText };
}
function parseGlb(buffer) {
  if (buffer.length < 12) {
    fail("glb_input_too_small", "\u0424\u0430\u0439\u043B \u043A\u043E\u0440\u043E\u0447\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 GLB", { bytes: buffer.length });
  }
  if (buffer.readUInt32LE(0) !== MAGIC) {
    fail("glb_magic_invalid", "\u042D\u0442\u043E \u043D\u0435 GLB: \u043D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0438\u0433\u043D\u0430\u0442\u0443\u0440\u0430", {});
  }
  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    fail("glb_version_unsupported", "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E GLB \u0432\u0435\u0440\u0441\u0438\u0438 2", { version });
  }
  const declared = buffer.readUInt32LE(8);
  if (declared !== buffer.length) {
    fail("glb_length_mismatch", "\u0414\u043B\u0438\u043D\u0430 \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0444\u0430\u0439\u043B\u043E\u043C", { declared, bytes: buffer.length });
  }
  const { jsonBytes, binBytes, jsonText } = readChunks(buffer);
  if (jsonText === null) {
    fail("glb_json_missing", "\u0412 GLB \u043D\u0435\u0442 JSON-\u0447\u0430\u043D\u043A\u0430", {});
  }
  let json;
  try {
    json = JSON.parse(jsonText);
  } catch {
    fail("glb_json_invalid", "JSON-\u0447\u0430\u043D\u043A \u043D\u0435 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F", { bytes: jsonBytes });
  }
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    fail("glb_json_invalid", "JSON-\u0447\u0430\u043D\u043A \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { bytes: jsonBytes });
  }
  const document = json;
  const asset = document.asset;
  const assetVersion = typeof asset?.version === "string" ? asset.version : "";
  if (assetVersion !== "2.0") {
    fail("glb_asset_version_invalid", "asset.version \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C 2.0", { version: assetVersion || null });
  }
  const accessors = arrayOf(document.accessors);
  const meshes = arrayOf(document.meshes);
  let primitives = 0;
  let vertices = 0;
  for (const mesh of meshes) {
    for (const primitive of arrayOf(mesh?.primitives)) {
      primitives += 1;
      const position = primitive?.attributes?.POSITION;
      const accessor = Number.isInteger(position) ? accessors[position] : null;
      const count = Number(accessor?.count);
      if (Number.isInteger(count) && count > 0) vertices += count;
    }
  }
  const extensionsUsed = stringsOf(document.extensionsUsed);
  const extensionsRequired = stringsOf(document.extensionsRequired);
  const compressed = extensionsUsed.includes("KHR_draco_mesh_compression") ? "draco" : extensionsUsed.includes("EXT_meshopt_compression") ? "meshopt" : null;
  const animationNames = arrayOf(document.animations).map((animation) => animation?.name).filter((name) => typeof name === "string" && name.length > 0);
  return {
    version,
    bytes: buffer.length,
    json_bytes: jsonBytes,
    bin_bytes: binBytes,
    asset_version: assetVersion,
    generator: typeof asset?.generator === "string" ? asset.generator : null,
    scenes: countOf(document.scenes),
    nodes: countOf(document.nodes),
    meshes: meshes.length,
    primitives,
    vertices,
    accessors: accessors.length,
    buffers: countOf(document.buffers),
    materials: countOf(document.materials),
    textures: countOf(document.textures),
    images: countOf(document.images),
    animations: countOf(document.animations),
    animation_names: animationNames,
    skins: countOf(document.skins),
    extensions_used: extensionsUsed,
    extensions_required: extensionsRequired,
    compressed
  };
}

// modules/glb-info/page.ts
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><title>\u0420\u0430\u0437\u0431\u043E\u0440 GLB</title></head>
<body><main>
<h1>\u0420\u0430\u0437\u0431\u043E\u0440 GLB</h1>
<p>\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0433\u043E\u0442\u043E\u0432\u043E\u0439 GLB-\u043C\u043E\u0434\u0435\u043B\u0438 \u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u0447\u0430\u043D\u043A\u0430\u043C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E, \u0431\u0435\u0437 Blender \u0438 \u0441\u0435\u0442\u0438: \u0432\u0435\u0440\u0441\u0438\u044F, \u043C\u0435\u0448\u0438, \u043F\u0440\u0438\u043C\u0438\u0442\u0438\u0432\u044B, \u0432\u0435\u0440\u0448\u0438\u043D\u044B, \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B, \u0442\u0435\u043A\u0441\u0442\u0443\u0440\u044B, \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u0438, \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F \u0438 \u0441\u0436\u0430\u0442\u0438\u0435. \u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u0438\u0449\u0435\u0442\u0441\u044F \u0432 asset-license \u043F\u043E sha256 \u0444\u0430\u0439\u043B\u0430. .gltf \u0441 \u0432\u043D\u0435\u0448\u043D\u0438\u043C .bin \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F: \u044D\u0442\u043E \u043D\u0435 \u0441\u0430\u043C\u043E\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440.</p>
<section>
  <label>\u0424\u0430\u0439\u043B \u043C\u043E\u0434\u0435\u043B\u0438 (.glb) <input type="file" id="file" accept=".glb,model/gltf-binary" /></label>
  <p><button id="inspect-btn">\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C</button> <button id="summary-btn">\u0421\u0432\u043E\u0434\u043A\u0430 \u043C\u043E\u0434\u0443\u043B\u044F</button></p>
  <p id="status" role="status"></p>
</section>
<section>
  <pre id="result">\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438, sha256 \u0438 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F.</pre>
</section>
<script>
var status = document.getElementById('status');
function say(text) { status.textContent = text; }
function apiError(data, response) {
  return (data && data.error && data.error.message) ? data.error.message : '\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ' + response.status;
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
document.getElementById('summary-btn').onclick = async function () {
  var button = this;
  button.disabled = true;
  say('\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u043C \u0441\u0432\u043E\u0434\u043A\u0443\u2026');
  try {
    var r = await fetch('/api/tools/glb-info/summary');
    var d = await r.json();
    if (!r.ok) throw Error(apiError(d, r));
    document.getElementById('result').textContent = '\u0424\u043E\u0440\u043C\u0430\u0442\u044B: ' + d.formats.join(', ') + '; \u0432\u0435\u0440\u0441\u0438\u044F glTF: ' + d.version + '.\\n\u041C\u0435\u0442\u0440\u0438\u043A\u0438: ' + d.measures.join(', ') + '.\\n\u041F\u0440\u0435\u0434\u0435\u043B \u0432\u0445\u043E\u0434\u0430: ' + d.limits.max_input_bytes + ' \u0431\u0430\u0439\u0442; \u0441\u0435\u0442\u044C, \u043A\u043B\u044E\u0447\u0438 \u0438 \u0432\u043D\u0435\u0448\u043D\u0438\u0435 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u044B \u043D\u0435 \u043D\u0443\u0436\u043D\u044B.';
    say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430: \u043C\u043E\u0434\u0443\u043B\u044C \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0431\u0435\u0437 \u0441\u0435\u0442\u0438 \u0438 Blender.');
  } catch (error) { say(error.message); } finally { button.disabled = false; }
};
document.getElementById('inspect-btn').onclick = async function () {
  var button = this;
  var file = document.getElementById('file').files[0];
  if (!file) { say('\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u043C\u043E\u0434\u0435\u043B\u0438 (.glb) \u2014 \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  if (file.size > 64 * 1024 * 1024) { say('\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 64 \u041C\u0438\u0411 \u2014 \u043F\u0440\u0435\u0434\u0435\u043B\u0430 \u043C\u043E\u0434\u0443\u043B\u044F. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u043C\u0435\u043D\u044C\u0448\u0435\u0433\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u0430, \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D.'); return; }
  button.disabled = true;
  say('\u0420\u0430\u0437\u0431\u0438\u0440\u0430\u0435\u043C \u0447\u0430\u043D\u043A\u0438 \u043C\u043E\u0434\u0435\u043B\u0438\u2026');
  try {
    var r = await fetch('/api/tools/glb-info/inspect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content_base64: await readBase64(file) }) });
    var d = await r.json();
    if (!r.ok) throw Error(apiError(d, r));
    var g = d.glb;
    var licenseNote = d.license_ambiguous
      ? '\u0432 asset-license \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E sha256 (' + d.licenses.length + ')'
      : d.license
        ? 'asset-license: ' + JSON.stringify(d.license)
        : '\u0432 asset-license \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 sha256 \u043D\u0435\u0442';
    document.getElementById('result').textContent = [
      '\u0424\u0430\u0439\u043B: ' + file.name + ' (' + g.bytes + ' \u0431\u0430\u0439\u0442; JSON-\u0447\u0430\u043D\u043A ' + g.json_bytes + ', BIN-\u0447\u0430\u043D\u043A ' + g.bin_bytes + ')',
      'glTF: \u0432\u0435\u0440\u0441\u0438\u044F ' + g.version + ', asset.version ' + g.asset_version + '; \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440: ' + (g.generator || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D'),
      '\u041C\u0435\u0448\u0438: ' + g.meshes + '; \u043F\u0440\u0438\u043C\u0438\u0442\u0438\u0432\u044B: ' + g.primitives + '; \u0432\u0435\u0440\u0448\u0438\u043D\u044B: ' + g.vertices + '; accessors: ' + g.accessors,
      '\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B: ' + g.materials + '; \u0442\u0435\u043A\u0441\u0442\u0443\u0440\u044B: ' + g.textures + '; \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F: ' + g.images,
      '\u0423\u0437\u043B\u044B: ' + g.nodes + '; \u0441\u0446\u0435\u043D\u044B: ' + g.scenes + '; \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u0438: ' + g.animations + (g.animation_names && g.animation_names.length ? ' (' + g.animation_names.join(', ') + ')' : '') + '; skins: ' + g.skins,
      '\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F: ' + (g.extensions_used && g.extensions_used.length ? g.extensions_used.join(', ') : '\u043D\u0435\u0442') + '; \u0441\u0436\u0430\u0442\u0438\u0435: ' + (g.compressed || '\u043D\u0435\u0442'),
      'sha256: ' + d.sha256,
      '\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F: ' + licenseNote
    ].join('\\n');
    say('\u0413\u043E\u0442\u043E\u0432\u043E: \u043C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D\u0430 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E, \u0444\u0430\u0439\u043B \u043D\u0438\u043A\u0443\u0434\u0430 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u043B\u0441\u044F.');
  } catch (error) { say(error.message); } finally { button.disabled = false; }
};
</script>
</main></body>
</html>`;

// modules/glb-info/index.ts
var NO_STORE = { "cache-control": "no-store" };
var MAX_INPUT_BYTES = 64 * 1024 * 1024;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "glb_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "glb-info",
  apiVersion: 1,
  register(ctx) {
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/glb-info/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: {
        ok: true,
        formats: ["glb"],
        version: 2,
        measures: [
          "meshes",
          "primitives",
          "vertices",
          "materials",
          "textures",
          "images",
          "animations",
          "skins",
          "extensions",
          "compressed"
        ],
        limits: { max_input_bytes: MAX_INPUT_BYTES },
        needs: { network: false, keys: false, process: false }
      }
    }));
    ctx.publish?.({
      parse: (buffer) => parseGlb(buffer),
      parseGlb: (buffer) => parseGlb(buffer),
      inspectBuffer: (buffer) => parseGlb(buffer)
    });
    ctx.api.add("POST", "/api/tools/glb-info/inspect", (request) => {
      const body = bodyOf(request.body);
      const raw = String(body.content_base64 ?? "").trim();
      if (!raw) {
        throw new ValidationError("\u041D\u0443\u0436\u0435\u043D content_base64", {}, { code: "glb_content_required" });
      }
      if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
        throw new ValidationError("content_base64 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043F\u043E\u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B", {}, {
          code: "glb_content_invalid"
        });
      }
      const buffer = Buffer.from(raw, "base64");
      if (buffer.length === 0) {
        throw new ValidationError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B", {}, { code: "glb_content_required" });
      }
      if (buffer.length > MAX_INPUT_BYTES) {
        throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", { bytes: buffer.length, limit: MAX_INPUT_BYTES }, {
          code: "glb_input_too_large"
        });
      }
      const glb = parseGlb(buffer);
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      const found = ctx.require("asset-license").findBySha256(sha256);
      const licenses = Array.isArray(found) ? found : found ? [found] : [];
      const license = licenses.length === 1 ? licenses[0] : null;
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          glb,
          sha256,
          license,
          licenses,
          license_ambiguous: licenses.length > 1
        }
      };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
