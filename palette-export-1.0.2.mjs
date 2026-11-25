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

// modules/palette-export/format.ts
import { deflateRawSync } from "node:zlib";
var MAX_COLORS = 256;
var MAX_NAME = 64;
function normalizeHex(value) {
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split("").map((part) => part + part).join("").toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  throw new Error(`hex_invalid:${value}`);
}
function rgbOf(hex) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16)
  };
}
function parseHexList(input) {
  let raw;
  if (typeof input === "string") {
    raw = input.split(/[\s,;]+/).filter((part) => part.length > 0);
  } else if (Array.isArray(input)) {
    raw = input.map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && typeof entry.hex === "string") {
        return entry.hex;
      }
      throw new Error("hex_invalid:entry");
    });
  } else {
    throw new Error("hex_required");
  }
  if (raw.length === 0) throw new Error("hex_required");
  const normalized = [];
  for (const value of raw) {
    const hex = normalizeHex(value);
    if (!normalized.includes(hex)) normalized.push(hex);
  }
  if (normalized.length > MAX_COLORS) throw new Error("colors_too_many");
  return normalized;
}
function paletteName(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw.length === 0) return "Palette";
  if (raw.length > MAX_NAME) throw new Error("name_too_long");
  return raw.replace(/[\r\n\t]+/g, " ").trim() || "Palette";
}
function formatOf(value) {
  const raw = typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : "gpl";
  if (raw === "gpl" || raw === "kpl" || raw === "act" || raw === "css" || raw === "json") return raw;
  throw new Error("format_unsupported");
}
function toGpl(name, hexes) {
  const lines = ["GIMP Palette", `Name: ${name}`, `Columns: ${Math.min(hexes.length, 16)}`, "#"];
  for (const hex of hexes) {
    const { r, g, b } = rgbOf(hex);
    lines.push(`${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}	${hex}`);
  }
  return `${lines.join("\n")}
`;
}
function colorsetXml(name, hexes) {
  const columns = Math.min(hexes.length, 16);
  const rows = Math.ceil(hexes.length / columns);
  const entries = hexes.map((hex, index) => {
    const { r, g, b } = rgbOf(hex);
    const channel = (value) => (value / 255).toFixed(4);
    return [
      `  <ColorSetEntry name="${hex}" id="swatch-${index}" bitdepth="U8" spot="false">`,
      `    <sRGB r="${channel(r)}" g="${channel(g)}" b="${channel(b)}" />`,
      `    <Position row="${Math.floor(index / columns)}" column="${index % columns}" />`,
      "  </ColorSetEntry>"
    ].join("\n");
  });
  const head = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<Colorset name="${escapeXml(name)}" comment="Team Platform" columns="${columns}" rows="${rows}" readonly="false" version="1.0">`
  ];
  return `${[...head, ...entries, "</Colorset>", ""].join("\n")}`;
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();
function crc32(data) {
  let crc = 4294967295;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function toKpl(name, hexes) {
  const files = [
    { name: "mimetype", data: Buffer.from("application/x-krita-palette", "utf8"), store: true },
    { name: "colorset.xml", data: Buffer.from(colorsetXml(name, hexes), "utf8"), store: false },
    { name: "profiles.xml", data: Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<Profiles />\n', "utf8"), store: false }
  ];
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const crc = crc32(file.data);
    const payload = file.store ? file.data : deflateRawSync(file.data);
    const method = file.store ? 0 : 8;
    const nameBytes = Buffer.from(file.name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(67324752, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, payload);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(33639248, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + payload.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(101010256, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, ...centrals, end]);
}
function toAct(hexes) {
  const table = Buffer.alloc(MAX_COLORS * 3);
  hexes.slice(0, MAX_COLORS).forEach((hex, index) => {
    const { r, g, b } = rgbOf(hex);
    table[index * 3] = r;
    table[index * 3 + 1] = g;
    table[index * 3 + 2] = b;
  });
  return table;
}
function toCss(name, hexes) {
  const prefix = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "palette";
  const lines = hexes.map((hex, index) => `  --${prefix}-${index + 1}: ${hex};`);
  return `:root {
${lines.join("\n")}
}
`;
}
function toJson(name, hexes) {
  return `${JSON.stringify({
    name,
    colors: hexes.map((hex) => ({ hex, rgb: rgbOf(hex) }))
  }, null, 2)}
`;
}
function exportPalette(input) {
  const format = formatOf(input.format);
  const name = paletteName(input.name);
  const hexes = parseHexList(input.hex);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "palette";
  switch (format) {
    case "kpl":
      return { format, filename: `${slug}.kpl`, media_type: "application/x-krita-palette", encoding: "base64", content: toKpl(name, hexes).toString("base64"), colors: hexes.length };
    case "gpl":
      return { format, filename: `${slug}.gpl`, media_type: "application/x-gimp-palette", encoding: "utf8", content: toGpl(name, hexes), colors: hexes.length };
    case "act":
      return { format, filename: `${slug}.act`, media_type: "application/octet-stream", encoding: "base64", content: toAct(hexes).toString("base64"), colors: hexes.length };
    case "css":
      return { format, filename: `${slug}.css`, media_type: "text/css; charset=utf-8", encoding: "utf8", content: toCss(name, hexes), colors: hexes.length };
    case "json":
      return { format, filename: `${slug}.json`, media_type: "application/json; charset=utf-8", encoding: "utf8", content: toJson(name, hexes), colors: hexes.length };
  }
}

// modules/palette-export/index.ts
var NO_STORE = { "cache-control": "no-store" };
var FORMATS = ["gpl", "kpl", "act", "css", "json"];
var CODES = {
  hex_required: { code: "palette_export_hex_required", message: "\u041D\u0443\u0436\u0435\u043D \u0441\u043F\u0438\u0441\u043E\u043A \u0446\u0432\u0435\u0442\u043E\u0432 \u0432 hex" },
  hex_invalid: { code: "palette_export_hex_invalid", message: "\u0426\u0432\u0435\u0442 \u043D\u0435 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 #rgb \u0438\u043B\u0438 #rrggbb" },
  colors_too_many: { code: "palette_export_colors_too_many", message: `\u0411\u043E\u043B\u044C\u0448\u0435 ${MAX_COLORS} \u0446\u0432\u0435\u0442\u043E\u0432 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F` },
  name_too_long: { code: "palette_export_name_too_long", message: "\u0418\u043C\u044F \u043F\u0430\u043B\u0438\u0442\u0440\u044B \u0434\u043B\u0438\u043D\u043D\u0435\u0435 64 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" },
  format_unsupported: { code: "palette_export_format_unsupported", message: "\u0424\u043E\u0440\u043C\u0430\u0442 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F" }
};
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u041F\u0430\u043B\u0438\u0442\u0440\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0430\u0445 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u043E\u0432</title></head><body><main>
<h1>\u041F\u0430\u043B\u0438\u0442\u0440\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0430\u0445 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u043E\u0432</h1>
<p>Hex-\u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F \u0432 <code>.gpl</code> (GIMP, Krita, Inkscape),
<code>.kpl</code> (Krita), <code>.act</code> (Photoshop), <code>.css</code> \u0438
<code>.json</code>; \u0446\u0432\u0435\u0442\u0430 \u043C\u043E\u0436\u043D\u043E \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0438\u0437 \u043E\u0442\u0432\u0435\u0442\u0430 \xAB\u041F\u0430\u043B\u0438\u0442\u0440\u044B \u0438\u0437 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F\xBB.</p>
<p><label>\u0418\u043C\u044F \u043F\u0430\u043B\u0438\u0442\u0440\u044B (\u0434\u043E 64 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432) <input id="name" maxlength="64"
placeholder="Palette" /></label>
<label>\u0424\u043E\u0440\u043C\u0430\u0442 <select id="format">
<option value="gpl">.gpl \u2014 GIMP, Krita, Inkscape</option>
<option value="kpl">.kpl \u2014 Krita</option>
<option value="act">.act \u2014 Photoshop, Krita</option>
<option value="css">.css \u2014 \u0432\u0435\u0431, CSS-\u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435</option>
<option value="json">.json \u2014 \u0441\u043A\u0440\u0438\u043F\u0442\u044B \u0438 \u043E\u0431\u043C\u0435\u043D</option>
</select></label></p>
<p><label>Hex-\u0446\u0432\u0435\u0442\u0430, \u0447\u0435\u0440\u0435\u0437 \u043F\u0440\u043E\u0431\u0435\u043B \u0438\u043B\u0438 \u0437\u0430\u043F\u044F\u0442\u0443\u044E<br />
<textarea id="hex" rows="3" cols="80" placeholder="#1f2430 #4cc9f0 #3ddc97"></textarea></label></p>
<p><button id="export">\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0430\u043B\u0438\u0442\u0440\u0443</button>
<button id="summary">\u041A\u0430\u043A\u0438\u0435 \u0444\u043E\u0440\u043C\u0430\u0442\u044B \u0435\u0441\u0442\u044C</button></p>
<p id="status" role="status"></p>
<pre id="result" style="white-space:pre-wrap"></pre>
<label id="content-label" hidden>\u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0444\u0430\u0439\u043B\u0430 \u2014 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0438 \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435<br />
<textarea id="content" rows="12" cols="90" readonly></textarea></label>
</main><script>
'use strict';
var status = document.getElementById('status');
var result = document.getElementById('result');
var contentBox = document.getElementById('content');
var contentLabel = document.getElementById('content-label');
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
document.getElementById('export').addEventListener('click', function () {
  var hexField = document.getElementById('hex');
  var hexText = String(hexField.value || '').trim();
  if (hexText === '') {
    say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 hex-\u0446\u0432\u0435\u0442\u0430: \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u0432\u0440\u043E\u0434\u0435 #1f2430 #4cc9f0 \u0432 \u043F\u043E\u043B\u0435 \xABHex-\u0446\u0432\u0435\u0442\u0430\xBB.');
    return;
  }
  var count = hexText.split(/[\\s,;]+/).filter(function (part) { return part.length > 0; }).length;
  if (count > 256) {
    say('\u0426\u0432\u0435\u0442\u043E\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 256: \u0441\u0435\u0440\u0432\u0435\u0440 \u0438\u0445 \u043D\u0435 \u043F\u0440\u0438\u043C\u0435\u0442, \u0441\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A.');
    return;
  }
  say('\u0421\u043E\u0431\u0438\u0440\u0430\u044E \u0444\u0430\u0439\u043B\u2026');
  postJson('/api/tools/palette-export/export', {
    name: String(document.getElementById('name').value || ''),
    hex: hexText,
    format: document.getElementById('format').value
  }).then(function (reply) {
    if (!reportReply(reply, '\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u043F\u0430\u043B\u0438\u0442\u0440\u0443')) return;
    var data = reply.data;
    var bytes = data.encoding === 'base64' ? Math.round(data.content.length * 3 / 4) : data.content.length;
    result.textContent = '\u0424\u0430\u0439\u043B: ' + data.filename + '\\n'
      + '\u0424\u043E\u0440\u043C\u0430\u0442: ' + data.format + ' (' + data.media_type + ')\\n'
      + '\u0426\u0432\u0435\u0442\u043E\u0432: ' + data.colors + ', \u0440\u0430\u0437\u043C\u0435\u0440: ' + bytes + ' \u0431\u0430\u0439\u0442\\n'
      + (data.encoding === 'base64'
        ? '\u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u043D\u0438\u0436\u0435 \u2014 base64 \u0434\u0432\u043E\u0438\u0447\u043D\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430: \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0435\u0433\u043E \u0438 \u0434\u0435\u043A\u043E\u0434\u0438\u0440\u0443\u0439\u0442\u0435, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 PowerShell cert -decode.'
        : '\u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u043D\u0438\u0436\u0435 \u2014 \u0442\u0435\u043A\u0441\u0442 \u0444\u0430\u0439\u043B\u0430: \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0435\u0433\u043E \u0446\u0435\u043B\u0438\u043A\u043E\u043C.');
    contentBox.value = data.content;
    contentLabel.hidden = false;
    say('\u0413\u043E\u0442\u043E\u0432\u043E: ' + data.filename + ', ' + data.colors + ' \u0446\u0432\u0435\u0442\u043E\u0432.');
  }).catch(function (error) {
    say('\u0421\u0431\u043E\u0439: ' + (error && error.message ? error.message : String(error)));
  });
});
document.getElementById('summary').addEventListener('click', function () {
  say('\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u044E \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432\u2026');
  getJson('/api/tools/palette-export/summary').then(function (reply) {
    if (!reportReply(reply, '\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D')) return;
    var data = reply.data;
    var lines = (data.formats || []).map(function (format) {
      return '  ' + format + ' \u2014 ' + (data.targets[format] || '');
    });
    result.textContent = '\u0424\u043E\u0440\u043C\u0430\u0442\u044B: \\n' + lines.join('\\n')
      + '\\n\u041F\u0440\u0435\u0434\u0435\u043B\u044B: \u0434\u043E ' + data.limits.colors + ' \u0446\u0432\u0435\u0442\u043E\u0432, \u0438\u043C\u044F \u0434\u043E ' + data.limits.name + ' \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.';
    say('\u0413\u043E\u0442\u043E\u0432\u043E: \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E ' + (data.formats || []).length + ' \u0444\u043E\u0440\u043C\u0430\u0442\u0430.');
  }).catch(function (error) {
    say('\u0421\u0431\u043E\u0439: ' + (error && error.message ? error.message : String(error)));
  });
});
</script></body></html>`;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "palette_export_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "palette-export",
  apiVersion: 1,
  register(ctx) {
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/palette-export/summary", async () => ({
      status: 200,
      headers: NO_STORE,
      body: {
        ok: true,
        formats: FORMATS,
        targets: {
          gpl: "GIMP, Krita, Inkscape",
          kpl: "Krita (\u0440\u043E\u0434\u043D\u043E\u0439 \u0444\u043E\u0440\u043C\u0430\u0442: ZIP + colorset.xml)",
          act: "Photoshop, Krita",
          css: "\u0432\u0435\u0431, CSS-\u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435",
          json: "\u0441\u043A\u0440\u0438\u043F\u0442\u044B \u0438 \u043E\u0431\u043C\u0435\u043D"
        },
        limits: { colors: MAX_COLORS, name: 64 },
        needs: { network: false, keys: false, process: false }
      }
    }));
    ctx.api.add("POST", "/api/tools/palette-export/export", async (request) => {
      const body = bodyOf(request.body);
      try {
        const result = exportPalette({ name: body.name, hex: body.hex, format: body.format });
        return {
          status: 200,
          headers: NO_STORE,
          body: { ok: true, ...result }
        };
      } catch (error) {
        const raw = error.message ?? "";
        const [key, detail] = raw.split(":");
        const known = CODES[key ?? ""];
        if (!known) throw error;
        throw new ValidationError(known.message, { reason: key, detail: detail ?? null }, { code: known.code });
      }
    });
  }
};
var index_default = module;
export {
  index_default as default
};
