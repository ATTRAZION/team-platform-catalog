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

// modules/audio-info/parse.ts
function fail(message, code, details = {}) {
  throw new ValidationError(message, details, { code });
}
function truncated(what) {
  fail(`\u0424\u0430\u0439\u043B \u043E\u0431\u0440\u0435\u0437\u0430\u043D: ${what}`, "audio_truncated", { part: what });
}
function unsupported() {
  fail("\u041D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u043D\u043D\u044B\u0439 \u0438\u043B\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D\u043D\u044B\u0439 \u0430\u0443\u0434\u0438\u043E\u0444\u043E\u0440\u043C\u0430\u0442", "audio_format_unsupported");
}
function pcmCodec(tag, bits) {
  if (tag === 3) return `pcm_f${bits}le`;
  if (tag === 1) {
    if (bits === 8) return "pcm_u8";
    if (bits === 16 || bits === 24 || bits === 32) return `pcm_s${bits}le`;
  }
  return "pcm";
}
function parseWav(buf) {
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    unsupported();
  }
  let pos = 12;
  let fmt = null;
  let dataSize = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const start = pos + 8;
    if (start + size > buf.length) truncated(`\u0447\u0430\u043D\u043A ${id}`);
    if (id === "fmt ") {
      if (size < 16) truncated("fmt");
      fmt = {
        tag: buf.readUInt16LE(start),
        channels: buf.readUInt16LE(start + 2),
        rate: buf.readUInt32LE(start + 4),
        byteRate: buf.readUInt32LE(start + 8),
        bits: buf.readUInt16LE(start + 14)
      };
    } else if (id === "data") {
      dataSize = size;
    }
    pos = start + size + (size & 1);
  }
  if (!fmt || dataSize === null || !fmt.channels || !fmt.rate || !fmt.byteRate) truncated("fmt/data");
  const duration = dataSize / fmt.byteRate;
  if (!Number.isFinite(duration) || duration <= 0) fail("\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C WAV \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0430", "audio_duration_unknown");
  return {
    format: "wav",
    codec: pcmCodec(fmt.tag, fmt.bits),
    duration_seconds: duration,
    sample_rate: fmt.rate,
    channels: fmt.channels,
    bitrate: fmt.byteRate * 8,
    bitrate_estimated: false,
    bytes: buf.length
  };
}
function parseFlac(buf) {
  if (buf.length < 8) truncated("fLaC");
  const size = buf.readUIntBE(5, 3);
  const start = 8;
  if (start + size > buf.length) truncated("STREAMINFO");
  if (((buf[4] ?? 0) & 127) !== 0 || size < 34) fail("FLAC \u0431\u0435\u0437 STREAMINFO", "audio_format_unsupported");
  const p = buf.subarray(start, start + 34);
  const p10 = p[10] ?? 0, p11 = p[11] ?? 0, p12 = p[12] ?? 0, p13 = p[13] ?? 0;
  const sampleRate = p10 << 12 | p11 << 4 | p12 >> 4;
  const channels = (p12 >> 1 & 7) + 1;
  const totalSamples = (p13 & 15) * 2 ** 32 + p.readUInt32BE(14);
  if (!sampleRate || !totalSamples) fail("FLAC \u043D\u0435 \u0441\u043E\u043E\u0431\u0449\u0430\u0435\u0442 \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", "audio_duration_unknown");
  const duration = totalSamples / sampleRate;
  return {
    format: "flac",
    codec: "flac",
    duration_seconds: duration,
    sample_rate: sampleRate,
    channels,
    bitrate: Math.round(buf.length * 8 / duration),
    bitrate_estimated: true,
    bytes: buf.length
  };
}
function parseOgg(buf) {
  if (buf.length < 27) truncated("OggS");
  let pos = 0;
  let codec = "";
  let sampleRate = 0;
  let channels = 0;
  let maxGranule = 0n;
  while (pos < buf.length) {
    if (pos + 27 > buf.length) truncated("\u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 OGG");
    if (buf.toString("ascii", pos, pos + 4) !== "OggS") truncated("\u043C\u0430\u0440\u043A\u0435\u0440 OGG");
    const granule = buf.readBigUInt64LE(pos + 6);
    if (granule !== 0xffffffffffffffffn && granule > maxGranule) maxGranule = granule;
    const segments = buf[pos + 26] ?? 0;
    const table = pos + 27;
    if (table + segments > buf.length) truncated("\u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u043E\u0432 OGG");
    let bodyLength = 0;
    for (let i = 0; i < segments; i++) bodyLength += buf[table + i] ?? 0;
    const body = table + segments;
    if (body + bodyLength > buf.length) truncated("\u043F\u0430\u043A\u0435\u0442 OGG");
    if (!codec && bodyLength >= 16) {
      if (buf[body] === 1 && buf.toString("ascii", body + 1, body + 7) === "vorbis") {
        codec = "vorbis";
        channels = buf[body + 11] ?? 0;
        sampleRate = buf.readUInt32LE(body + 12);
      } else if (buf.toString("ascii", body, body + 8) === "OpusHead") {
        codec = "opus";
        channels = buf[body + 9] ?? 0;
        sampleRate = 48e3;
      }
    }
    pos = body + bodyLength;
    if (codec && maxGranule > 0n && pos >= buf.length) break;
  }
  if (!codec || !sampleRate || !channels) unsupported();
  if (maxGranule === 0n) fail("OGG \u043D\u0435 \u0441\u043E\u043E\u0431\u0449\u0430\u0435\u0442 \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", "audio_duration_unknown");
  const duration = Number(maxGranule) / sampleRate;
  return {
    format: "ogg",
    codec,
    duration_seconds: duration,
    sample_rate: sampleRate,
    channels,
    bitrate: Math.round(buf.length * 8 / duration),
    bitrate_estimated: true,
    bytes: buf.length
  };
}
function mp3Frame(buf, offset) {
  if (offset + 4 > buf.length) return null;
  const b1 = buf[offset + 1] ?? 0;
  const b2 = buf[offset + 2] ?? 0;
  const b3 = buf[offset + 3] ?? 0;
  if (buf[offset] !== 255 || (b1 & 224) !== 224) return null;
  const versionBits = b1 >> 3 & 3;
  const layerBits = b1 >> 1 & 3;
  const bitrateIndex = b2 >> 4 & 15;
  const rateIndex = b2 >> 2 & 3;
  const padding = b2 >> 1 & 1;
  if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5;
  const layer = 4 - layerBits;
  const tables = {
    "1-1": [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    "1-2": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    "1-3": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    "2-1": [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    "2-2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    "2-3": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
  };
  const bitrate = (tables[`${version === 1 ? 1 : 2}-${layer}`] ?? [])[bitrateIndex] ?? 0;
  const rates = version === 1 ? [44100, 48e3, 32e3] : version === 2 ? [22050, 24e3, 16e3] : [11025, 12e3, 8e3];
  const sampleRate = rates[rateIndex] ?? 0;
  if (!bitrate || !sampleRate) return null;
  const samples = layer === 1 ? 384 : layer === 2 ? 1152 : version === 1 ? 1152 : 576;
  const frameLength = layer === 1 ? Math.floor((12 * bitrate * 1e3 / sampleRate + padding) * 4) : Math.floor((layer === 3 && version !== 1 ? 72 : 144) * bitrate * 1e3 / sampleRate + padding);
  if (!frameLength) return null;
  return { frameLength, samples, sampleRate, channels: (b3 >> 6 & 3) === 3 ? 1 : 2 };
}
function parseMp3(buf) {
  let start = 0;
  if (buf.length >= 10 && buf.toString("ascii", 0, 3) === "ID3") {
    const tagSize = ((buf[6] ?? 0) & 127) * 2 ** 21 + ((buf[7] ?? 0) & 127) * 2 ** 14 + ((buf[8] ?? 0) & 127) * 2 ** 7 + ((buf[9] ?? 0) & 127);
    start = 10 + tagSize + ((buf[5] ?? 0) & 16 ? 10 : 0);
  }
  if (start >= buf.length) truncated("ID3");
  let first = -1;
  for (let i = start; i + 4 <= buf.length; i++) {
    if (mp3Frame(buf, i)) {
      first = i;
      break;
    }
  }
  if (first < 0) unsupported();
  const head = mp3Frame(buf, first);
  if (!head) unsupported();
  if (first + head.frameLength > buf.length) truncated("\u043F\u0435\u0440\u0432\u044B\u0439 \u043A\u0430\u0434\u0440 MP3");
  let pos = first;
  let samples = 0;
  let frames = 0;
  let sampleRate = 0;
  let channels = 0;
  while (pos + 4 <= buf.length) {
    if (buf.toString("ascii", pos, pos + 3) === "TAG") break;
    const frame = mp3Frame(buf, pos);
    if (!frame || pos + frame.frameLength > buf.length) break;
    frames++;
    samples += frame.samples;
    sampleRate ||= frame.sampleRate;
    channels ||= frame.channels;
    pos += frame.frameLength;
  }
  if (!frames || !sampleRate || !channels) truncated("\u043A\u0430\u0434\u0440\u044B MP3");
  const duration = samples / sampleRate;
  return {
    format: "mp3",
    codec: "mp3",
    duration_seconds: duration,
    sample_rate: sampleRate,
    channels,
    bitrate: Math.round((pos - first) * 8 / duration),
    bitrate_estimated: true,
    bytes: buf.length
  };
}
function inspectAudio(buf) {
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "RIFF") {
    return parseWav(buf);
  }
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "fLaC") {
    return parseFlac(buf);
  }
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "OggS") {
    return parseOgg(buf);
  }
  if (buf.length >= 3 && buf.toString("ascii", 0, 3) === "ID3" || buf.length >= 2 && buf[0] === 255 && ((buf[1] ?? 0) & 224) === 224) {
    return parseMp3(buf);
  }
  return unsupported();
}

// modules/audio-info/index.ts
var NO_STORE = { "cache-control": "no-store" };
var MAX_INPUT_BYTES = 32 * 1024 * 1024;
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u0443\u0434\u0438\u043E</title></head><body>
<h1>\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u0443\u0434\u0438\u043E</h1>
<p>WAV, FLAC, OGG/Vorbis \u0438 MP3 \u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0443: \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C, \u0447\u0430\u0441\u0442\u043E\u0442\u0430,
\u043A\u0430\u043D\u0430\u043B\u044B \u0438 \u0431\u0438\u0442\u0440\u0435\u0439\u0442 \u0431\u0435\u0437 ffmpeg, \u0441\u0435\u0442\u0438 \u0438 \u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0441\u0442\u0435\u0439.</p>
<p>\u0414\u043B\u044F FLAC, OGG \u0438 MP3 \u0431\u0438\u0442\u0440\u0435\u0439\u0442 \u2014 \u0441\u0440\u0435\u0434\u043D\u044F\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u043F\u043E \u0440\u0430\u0437\u043C\u0435\u0440\u0443 \u0438 \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438;
\u043F\u043E\u043B\u0435 <code>bitrate_estimated</code> \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u044D\u0442\u043E \u044F\u0432\u043D\u043E. \u041E\u0431\u0440\u0435\u0437\u0430\u043D\u043D\u044B\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A
\u0434\u0430\u0451\u0442 <code>audio_truncated</code>, \u0447\u0443\u0436\u043E\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u2014 <code>audio_format_unsupported</code>.</p>
<p><code>POST /api/tools/audio-info/inspect</code> \u0441
<code>{ content_base64 }</code>; \u043F\u0440\u0435\u0434\u0435\u043B \u0432\u0445\u043E\u0434\u0430 \u2014 32 \u041C\u0438\u0411.</p>
</body></html>`;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "audio_body_invalid"
    });
  }
  return raw;
}
var module = {
  id: "audio-info",
  apiVersion: 1,
  register(ctx) {
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/audio-info/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: {
        ok: true,
        formats: ["wav", "flac", "ogg", "mp3"],
        measures: ["duration_seconds", "sample_rate", "channels", "bitrate"],
        bitrate_note: "\u0414\u043B\u044F FLAC, OGG \u0438 MP3 \u0431\u0438\u0442\u0440\u0435\u0439\u0442 \u2014 \u0441\u0440\u0435\u0434\u043D\u044F\u044F \u043E\u0446\u0435\u043D\u043A\u0430; bitrate_estimated=true.",
        limits: { max_input_bytes: MAX_INPUT_BYTES },
        needs: { network: false, process: false }
      }
    }));
    ctx.api.add("POST", "/api/tools/audio-info/inspect", (request) => {
      const body = bodyOf(request.body);
      const raw = String(body.content_base64 ?? "").trim();
      if (!raw) {
        throw new ValidationError("\u041D\u0443\u0436\u0435\u043D content_base64", {}, { code: "audio_content_required" });
      }
      if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
        throw new ValidationError("content_base64 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043F\u043E\u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B", {}, { code: "audio_base64_invalid" });
      }
      const buffer = Buffer.from(raw, "base64");
      if (buffer.length === 0) {
        throw new ValidationError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B", {}, { code: "audio_content_required" });
      }
      if (buffer.length > MAX_INPUT_BYTES) {
        throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", { bytes: buffer.length, limit: MAX_INPUT_BYTES }, {
          code: "audio_input_too_large"
        });
      }
      return { status: 200, headers: NO_STORE, body: { ok: true, audio: inspectAudio(buffer) } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
