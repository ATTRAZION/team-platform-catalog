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

// modules/palette-diff/math.ts
var MAX_COLORS = 256;
var FORMULA = {
  name: "CIEDE2000",
  space: "CIELAB D65",
  standard: "CIE 2001",
  source: "Sharma, Wu, Dalal 2005 (DOI 10.1002/col.20070)",
  weights: { kL: 1, kC: 1, kH: 1 }
};
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
function linear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
var XN = 0.95047;
var YN = 1;
var ZN = 1.08883;
function f(t) {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta ** 2) + 4 / 29;
}
function labOf(hex) {
  const { r, g, b } = rgbOf(normalizeHex(hex));
  const lr = linear(r);
  const lg = linear(g);
  const lb = linear(b);
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
  const z = 0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb;
  const fx = f(x / XN);
  const fy = f(y / YN);
  const fz = f(z / ZN);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}
var DEG = 180 / Math.PI;
var RAD = Math.PI / 180;
function hueDeg(b, a) {
  if (a === 0 && b === 0) return 0;
  const angle = Math.atan2(b, a) * DEG;
  return angle < 0 ? angle + 360 : angle;
}
function deltaE2000(first, second, weights = {}) {
  const kL = weights.kL ?? 1;
  const kC = weights.kC ?? 1;
  const kH = weights.kH ?? 1;
  const c1 = Math.hypot(first.a, first.b);
  const c2 = Math.hypot(second.a, second.b);
  const cBar = (c1 + c2) / 2;
  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));
  const a1p = (1 + g) * first.a;
  const a2p = (1 + g) * second.a;
  const c1p = Math.hypot(a1p, first.b);
  const c2p = Math.hypot(a2p, second.b);
  const h1p = c1p === 0 ? 0 : hueDeg(first.b, a1p);
  const h2p = c2p === 0 ? 0 : hueDeg(second.b, a2p);
  const dLp = second.l - first.l;
  const dCp = c2p - c1p;
  let dhp = 0;
  if (c1p * c2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(dhp / 2 * RAD);
  const lBar = (first.l + second.l) / 2;
  const cBarP = (c1p + c2p) / 2;
  let hBarP;
  if (c1p * c2p === 0) {
    hBarP = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hBarP = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hBarP = (h1p + h2p + 360) / 2;
  } else {
    hBarP = (h1p + h2p - 360) / 2;
  }
  const t = 1 - 0.17 * Math.cos((hBarP - 30) * RAD) + 0.24 * Math.cos(2 * hBarP * RAD) + 0.32 * Math.cos((3 * hBarP + 6) * RAD) - 0.2 * Math.cos((4 * hBarP - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const cBarP7 = cBarP ** 7;
  const rc = 2 * Math.sqrt(cBarP7 / (cBarP7 + 25 ** 7));
  const sl = 1 + 0.015 * (lBar - 50) ** 2 / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const rt = -Math.sin(2 * dTheta * RAD) * rc;
  const termL = dLp / (kL * sl);
  const termC = dCp / (kC * sc);
  const termH = dHp / (kH * sh);
  return Math.sqrt(termL ** 2 + termC ** 2 + termH ** 2 + rt * termC * termH);
}
function deltaHex(first, second) {
  return deltaE2000(labOf(first), labOf(second));
}
function round4(value) {
  return Math.round(value * 1e4) / 1e4;
}
function parsePalette(input, side) {
  if (input === void 0 || input === null) throw new Error(`colors_required:${side}`);
  let raw;
  if (typeof input === "string") {
    raw = input.split(/[\s,;]+/).filter((part) => part.length > 0);
  } else if (Array.isArray(input)) {
    raw = input.map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && typeof entry.hex === "string") {
        return entry.hex;
      }
      throw new Error(`colors_invalid:${side}`);
    });
  } else {
    throw new Error(`colors_invalid:${side}`);
  }
  if (raw.length === 0) throw new Error(`colors_required:${side}`);
  const colors = [];
  for (const value of raw) {
    let hex;
    try {
      hex = normalizeHex(value);
    } catch {
      throw new Error(`color_invalid:${side}:${value}`);
    }
    if (!colors.includes(hex)) colors.push(hex);
  }
  if (colors.length > MAX_COLORS) throw new Error(`colors_too_many:${side}`);
  return { colors, duplicates: raw.length - colors.length };
}
function nearest(hex, pool) {
  let best = null;
  for (const candidate of pool) {
    const delta = deltaHex(hex, candidate);
    if (!best || delta < best.delta) best = { hex: candidate, delta };
  }
  const found = best;
  return { hex: found.hex, delta: round4(found.delta) };
}
function uniqueDeltas(removed, added) {
  const seen = /* @__PURE__ */ new Set();
  const deltas = [];
  for (const entry of removed) {
    const key = `${entry.hex}>${entry.nearest.hex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deltas.push(entry.nearest.delta);
  }
  for (const entry of added) {
    const key = `${entry.nearest.hex}>${entry.hex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deltas.push(entry.nearest.delta);
  }
  return deltas;
}
function comparePalettes(fromInput, toInput) {
  const from = parsePalette(fromInput, "from");
  const to = parsePalette(toInput, "to");
  const intersection = from.colors.filter((hex) => to.colors.includes(hex));
  const removed = from.colors.filter((hex) => !to.colors.includes(hex)).map((hex) => ({ hex, nearest: nearest(hex, to.colors) }));
  const added = to.colors.filter((hex) => !from.colors.includes(hex)).map((hex) => ({ hex, nearest: nearest(hex, from.colors) }));
  const deltas = uniqueDeltas(removed, added);
  const maxDelta = deltas.length === 0 ? 0 : Math.max(...deltas);
  const meanDelta = deltas.length === 0 ? 0 : deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  return {
    palettes: { from: from.colors, to: to.colors },
    counts: {
      from: from.colors.length,
      to: to.colors.length,
      intersection: intersection.length,
      added: added.length,
      removed: removed.length
    },
    duplicates: { from: from.duplicates, to: to.duplicates },
    identical: removed.length === 0 && added.length === 0,
    intersection,
    added,
    removed,
    max_delta: round4(maxDelta),
    mean_delta: round4(meanDelta),
    formula: FORMULA
  };
}

// modules/palette-diff/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043F\u0430\u043B\u0438\u0442\u0440</title></head><body><main>
<h1>\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043F\u0430\u043B\u0438\u0442\u0440</h1>
<p>\u0414\u0432\u0435 \u043F\u0430\u043B\u0438\u0442\u0440\u044B \u0441\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u0435\u0440\u0446\u0435\u043F\u0442\u0438\u0432\u043D\u043E: \u043F\u0435\u0440\u0435\u0441\u0435\u0447\u0435\u043D\u0438\u0435 \u043F\u043E \u0442\u043E\u0447\u043D\u043E\u043C\u0443 \u0446\u0432\u0435\u0442\u0443,
\u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0438 \u0443\u0448\u0435\u0434\u0448\u0438\u0435 \u0446\u0432\u0435\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0430\u044E\u0442 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0433\u043E \u0441\u043E\u0441\u0435\u0434\u0430 \u0432 \u0434\u0440\u0443\u0433\u043E\u0439 \u043F\u0430\u043B\u0438\u0442\u0440\u0435 \u0438
\u0440\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u0435 CIEDE2000 (CIE 2001, \u0432\u0435\u0441\u0430 kL = kC = kH = 1). \u041C\u0435\u0442\u0440\u0438\u043A\u0430 \u0438 \u0440\u0430\u0437\u0431\u043E\u0440 \u0446\u0432\u0435\u0442\u043E\u0432
\u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0434\u043D\u043E\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u0435\u0439, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043E\u0442\u0432\u0435\u0442 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0432\u0438\u0434\u044F\u0442 \u043E\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E.</p>
<p>\u0424\u043E\u0440\u043C\u0443\u043B\u0430: Sharma, Wu, Dalal, Color Research and Application 30(1), 21\u201330,
2005, DOI 10.1002/col.20070. \u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0444\u043B\u0430\u0439\u043D, \u0431\u0435\u0437 \u043A\u043B\u044E\u0447\u0435\u0439 \u0438 \u0431\u0435\u0437 \u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u0445
\u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A.</p>
<p><label>\u0421\u0442\u0430\u0440\u0430\u044F \u043F\u0430\u043B\u0438\u0442\u0440\u0430 \u2014 hex \u0447\u0435\u0440\u0435\u0437 \u043F\u0440\u043E\u0431\u0435\u043B \u0438\u043B\u0438 \u0437\u0430\u043F\u044F\u0442\u0443\u044E<br>
<textarea id="from" rows="3" cols="72" placeholder="#112233 #223344 #ffcc00"></textarea></label></p>
<p><label>\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043B\u0438\u0442\u0440\u0430<br>
<textarea id="to" rows="3" cols="72" placeholder="#112233 #334455 #ffcc00 #ffffff"></textarea></label></p>
<p><button id="compare">\u0421\u0440\u0430\u0432\u043D\u0438\u0442\u044C \u043F\u0430\u043B\u0438\u0442\u0440\u044B</button>
<button id="summary">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0444\u043E\u0440\u043C\u0443\u043B\u0443 \u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u044B</button></p>
<p id="status" role="status"></p>
<h2>\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442</h2>
<pre id="result"></pre>
</main><script>
function say(message) { document.getElementById('status').textContent = message; }
function colorsOf(id) { return document.getElementById(id).value.trim().split(/[\\s,;]+/).filter(function (part) { return part.length > 0; }); }
function badHex(colors) {
  return colors.filter(function (value) { return !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value); });
}
async function call(method, path, payload) {
  const init = { method: method, headers: { 'content-type': 'application/json' } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  const response = await fetch('/api/tools/palette-diff/' + path, init);
  const data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data && data.error && data.error.message ? data.error.message : '\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043A\u043E\u0434\u043E\u043C ' + response.status + '.');
  return data;
}
function describe(list) {
  return list.map(function (entry) { return entry.hex + ' \u2192 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0439 ' + entry.nearest.hex + ' (\u0394E ' + entry.nearest.delta + ')'; }).join('\\n');
}
function showResult(data) {
  const lines = [
    '\u0426\u0432\u0435\u0442\u043E\u0432: \u0431\u044B\u043B\u043E ' + data.counts.from + ', \u0441\u0442\u0430\u043B\u043E ' + data.counts.to + '.',
    '\u041F\u0435\u0440\u0435\u0441\u0435\u0447\u0435\u043D\u0438\u0435: ' + data.counts.intersection + (data.intersection.length ? ' \u2014 ' + data.intersection.join(' ') : ''),
    '\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E: ' + data.counts.added + (data.counts.added ? '\\n' + describe(data.added) : ''),
    '\u0423\u0431\u0440\u0430\u043D\u043E: ' + data.counts.removed + (data.counts.removed ? '\\n' + describe(data.removed) : ''),
    '\u0394E: \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C ' + data.max_delta + ', \u0441\u0440\u0435\u0434\u043D\u0435\u0435 ' + data.mean_delta + '.',
  ];
  if (data.duplicates.from || data.duplicates.to) lines.push('\u0414\u0443\u0431\u043B\u0438\u043A\u0430\u0442\u043E\u0432 \u0443\u0431\u0440\u0430\u043D\u043E: \u0432 \u0441\u0442\u0430\u0440\u043E\u0439 ' + data.duplicates.from + ', \u0432 \u043D\u043E\u0432\u043E\u0439 ' + data.duplicates.to + '.');
  document.getElementById('result').textContent = lines.join('\\n');
}
document.getElementById('compare').onclick = async function () {
  const from = colorsOf('from'), to = colorsOf('to');
  if (!from.length) { say('\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0442\u0430\u0440\u0443\u044E \u043F\u0430\u043B\u0438\u0442\u0440\u0443: hex-\u0446\u0432\u0435\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 \u043F\u0440\u043E\u0431\u0435\u043B \u0438\u043B\u0438 \u0437\u0430\u043F\u044F\u0442\u0443\u044E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 #112233 #ffcc00.'); return; }
  if (!to.length) { say('\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u043F\u0430\u043B\u0438\u0442\u0440\u0443: \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u0438\u043D \u0446\u0432\u0435\u0442 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 #rgb \u0438\u043B\u0438 #rrggbb.'); return; }
  const wrongFrom = badHex(from), wrongTo = badHex(to);
  if (wrongFrom.length) { say('\u0412 \u0441\u0442\u0430\u0440\u043E\u0439 \u043F\u0430\u043B\u0438\u0442\u0440\u0435 \u043D\u0435 \u0446\u0432\u0435\u0442: ' + wrongFrom.slice(0, 3).join(', ') + '. \u041D\u0443\u0436\u0435\u043D \u0444\u043E\u0440\u043C\u0430\u0442 #rgb \u0438\u043B\u0438 #rrggbb.'); return; }
  if (wrongTo.length) { say('\u0412 \u043D\u043E\u0432\u043E\u0439 \u043F\u0430\u043B\u0438\u0442\u0440\u0435 \u043D\u0435 \u0446\u0432\u0435\u0442: ' + wrongTo.slice(0, 3).join(', ') + '. \u041D\u0443\u0436\u0435\u043D \u0444\u043E\u0440\u043C\u0430\u0442 #rgb \u0438\u043B\u0438 #rrggbb.'); return; }
  say('\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E ' + from.length + ' \u0438 ' + to.length + ' \u0446\u0432\u0435\u0442\u043E\u0432\u2026');
  try {
    const data = await call('POST', 'compare', { from: from, to: to });
    showResult(data);
    say(data.identical ? '\u041F\u0430\u043B\u0438\u0442\u0440\u044B \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442: \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0445 \u0438 \u0443\u0448\u0435\u0434\u0448\u0438\u0445 \u0446\u0432\u0435\u0442\u043E\u0432 \u043D\u0435\u0442.' : '\u0413\u043E\u0442\u043E\u0432\u043E: \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E ' + data.counts.added + ', \u0443\u0431\u0440\u0430\u043D\u043E ' + data.counts.removed + ', \u0441\u0440\u0435\u0434\u043D\u0438\u0439 \u0394E ' + data.mean_delta + '.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
document.getElementById('summary').onclick = async function () {
  say('\u0427\u0438\u0442\u0430\u044E \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0444\u043E\u0440\u043C\u0443\u043B\u044B\u2026');
  try {
    const data = await call('GET', 'summary');
    document.getElementById('result').textContent = [
      '\u0424\u043E\u0440\u043C\u0443\u043B\u0430: ' + data.formula.name + ' \u0432 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u0435 ' + data.formula.space + ' (' + data.formula.standard + ').',
      '\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: ' + data.formula.source + '; \u0432\u0435\u0441\u0430 kL=' + data.formula.weights.kL + ', kC=' + data.formula.weights.kC + ', kH=' + data.formula.weights.kH + '.',
      '\u041F\u0440\u0435\u0434\u0435\u043B: \u0434\u043E ' + data.limits.colors + ' \u0446\u0432\u0435\u0442\u043E\u0432 \u0432 \u043F\u0430\u043B\u0438\u0442\u0440\u0435; \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0434\u0432\u0443\u0445 \u043F\u0430\u043B\u0438\u0442\u0440.',
      '\u041E\u0442\u0432\u0435\u0442\u044B: ' + data.answers.join(', ') + '.',
    ].join('\\n');
    say('\u0424\u043E\u0440\u043C\u0443\u043B\u0430 \u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
</script></body></html>`;

// modules/palette-diff/index.ts
var NO_STORE = { "cache-control": "no-store" };
var CODES = {
  colors_required: { code: "palette_diff_colors_required", message: "\u041D\u0443\u0436\u043D\u044B \u043E\u0431\u0435 \u043F\u0430\u043B\u0438\u0442\u0440\u044B: from \u0438 to" },
  colors_invalid: { code: "palette_diff_colors_invalid", message: "\u041F\u0430\u043B\u0438\u0442\u0440\u0430 \u2014 \u0441\u0442\u0440\u043E\u043A\u0430, \u043C\u0430\u0441\u0441\u0438\u0432 hex \u0438\u043B\u0438 \u043C\u0430\u0441\u0441\u0438\u0432 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432 { hex }" },
  color_invalid: { code: "palette_diff_color_invalid", message: "\u0426\u0432\u0435\u0442 \u043D\u0435 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 #rgb \u0438\u043B\u0438 #rrggbb" },
  colors_too_many: { code: "palette_diff_colors_too_many", message: `\u0411\u043E\u043B\u044C\u0448\u0435 ${MAX_COLORS} \u0446\u0432\u0435\u0442\u043E\u0432 \u0432 \u043F\u0430\u043B\u0438\u0442\u0440\u0435 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F` }
};
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "palette_diff_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "palette-diff",
  apiVersion: 1,
  register(ctx) {
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/palette-diff/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: {
        ok: true,
        formula: FORMULA,
        limits: { colors: MAX_COLORS, sides: 2 },
        answers: ["intersection", "added", "removed", "nearest", "max_delta", "mean_delta"],
        needs: { network: false, keys: false, process: false }
      }
    }));
    ctx.api.add("POST", "/api/tools/palette-diff/compare", (request) => {
      const body = bodyOf(request.body);
      try {
        const result = comparePalettes(body.from, body.to);
        return { status: 200, headers: NO_STORE, body: { ok: true, ...result } };
      } catch (error) {
        const raw = error.message ?? "";
        const [key, ...rest] = raw.split(":");
        const known = CODES[key ?? ""];
        if (!known) throw error;
        throw new ValidationError(known.message, { reason: key, detail: rest.join(":") || null }, { code: known.code });
      }
    });
  }
};
var index_default = module;
export {
  index_default as default
};
