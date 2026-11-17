import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/image-stats/index.ts
import { existsSync as existsSync2, mkdirSync } from "node:fs";
import { isAbsolute, join as join2 } from "node:path";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// modules/image-palette/ffmpeg.ts
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
function parseProbeSize(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const stream = parsed.streams?.[0];
    return {
      width: typeof stream?.width === "number" && stream.width > 0 ? stream.width : null,
      height: typeof stream?.height === "number" && stream.height > 0 ? stream.height : null
    };
  } catch {
    return { width: null, height: null };
  }
}
function versionLabel(stdout) {
  const line = stdout.split(/\r?\n/).find((entry) => entry.trim().length > 0);
  return line ? line.trim() : null;
}
var FfmpegRaw = class _FfmpegRaw {
  #cliPath;
  #workDir;
  #timeoutMs;
  constructor(options = {}) {
    this.#cliPath = options.cliPath === void 0 ? _FfmpegRaw.findExecutable() : options.cliPath;
    this.#workDir = options.workDir ?? tmpdir();
    this.#timeoutMs = options.timeoutMs ?? 3e4;
  }
  static findExecutable(env = process.env, platform = process.platform) {
    const explicit = (env.FFMPEG_EXECUTABLE ?? env.TEAM_FFMPEG_EXECUTABLE ?? "").trim();
    if (explicit && existsSync(explicit)) return explicit;
    if (platform === "win32") {
      const roots = [env.LOCALAPPDATA, env.ProgramFiles, env.ProgramData].filter(
        (value) => typeof value === "string" && value.length > 0
      );
      for (const root of roots) {
        const base = join(root, "Microsoft", "WinGet", "Packages");
        let names;
        try {
          names = readdirSync(base);
        } catch {
          continue;
        }
        for (const name of names) {
          if (!/ffmpeg/i.test(name)) continue;
          let builds;
          try {
            builds = readdirSync(join(base, name));
          } catch {
            continue;
          }
          for (const build of builds) {
            const candidate = join(base, name, build, "bin", "ffmpeg.exe");
            if (existsSync(candidate)) return candidate;
          }
        }
      }
      return null;
    }
    for (const candidate of ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"]) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }
  get cliPath() {
    return this.#cliPath;
  }
  get probePath() {
    if (!this.#cliPath) return null;
    const dir = dirname(this.#cliPath);
    for (const name of process.platform === "win32" ? ["ffprobe.exe"] : ["ffprobe"]) {
      if (existsSync(join(dir, name))) return join(dir, name);
    }
    return null;
  }
  async status() {
    if (!this.#cliPath) return { available: false, label: null, cli_path: null, probe_available: false };
    try {
      const result = await this.#collect(this.#cliPath, ["-hide_banner", "-version"], 1e4);
      return {
        available: true,
        label: versionLabel(result.bytes.toString("utf8")),
        cli_path: this.#cliPath,
        probe_available: this.probePath !== null
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        return { available: false, label: null, cli_path: this.#cliPath, probe_available: false };
      }
      throw error;
    }
  }
  /**
   * Размер картинки до уменьшения: без него пропорции пришлось бы угадывать.
   * Битый файл здесь не ошибка — отказ отдаст сам разбор пикселей.
   */
  async sizeOf(file) {
    const probe = this.probePath;
    if (!probe) return { width: null, height: null };
    try {
      const result = await this.#collect(probe, [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        file
      ], 1e4);
      return parseProbeSize(result.bytes.toString("utf8"));
    } catch {
      return { width: null, height: null };
    }
  }
  /**
   * Сырые RGB-байты уменьшенной копии. Небольшая копия нужна и для скорости, и
   * чтобы медианное сечение не зависело от размера исходника.
   */
  async rawPixels(input, options) {
    const cliPath = this.#requirePath();
    const started = Date.now();
    let scratch = null;
    try {
      scratch = mkdtempSync(join(this.#workDir, "image-palette-"));
      const source = join(scratch, "input.bin");
      writeFileSync(source, input);
      const sourceSize = await this.sizeOf(source);
      const sample = options.sample;
      let width = sample;
      let height = sample;
      if (sourceSize.width && sourceSize.height) {
        const largest = Math.max(sourceSize.width, sourceSize.height);
        const ratio = largest > sample ? sample / largest : 1;
        width = Math.max(1, Math.round(sourceSize.width * ratio));
        height = Math.max(1, Math.round(sourceSize.height * ratio));
      }
      const result = await this.#collectDecoding(cliPath, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        source,
        "-frames:v",
        "1",
        "-vf",
        `scale=${width}:${height}`,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1"
      ], options.timeoutMs ?? this.#timeoutMs);
      const expected = width * height * 3;
      if (result.bytes.length < expected) {
        throw new AppError("image_palette_decode_failed", "ffmpeg \u043D\u0435 \u043E\u0442\u0434\u0430\u043B \u043F\u0438\u043A\u0441\u0435\u043B\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F", 400, {
          kind: "image_palette_decode_failed",
          bytes: result.bytes.length,
          expected
        });
      }
      return { bytes: result.bytes.subarray(0, expected), width, height, duration_ms: Date.now() - started };
    } finally {
      if (scratch) rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  }
  /**
   * Ошибку «файл не декодируется» (_binary, а не машины) отдаём клиенту как 400:
   * ffmpeg здесь приходит с невалидным файлом, а не с поломкой движка.
   */
  async #collectDecoding(command, args, timeout) {
    try {
      return await this.#collect(command, args, timeout);
    } catch (error) {
      const failure = error;
      const decodeNoise = /invalid data|moov atom|does not contain any stream|could not find codec|error while decoding/i.test(failure.message ?? "");
      if (failure.details?.kind === "ffmpeg_error" && decodeNoise) {
        throw new AppError("image_palette_decode_failed", `\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043D\u0435 \u0434\u0435\u043A\u043E\u0434\u0438\u0440\u0443\u0435\u0442\u0441\u044F: ${failure.message ?? ""}`.slice(0, 500), 400, {
          kind: "image_palette_decode_failed"
        });
      }
      throw error;
    }
  }
  #requirePath() {
    if (!this.#cliPath) {
      throw new AppError("ffmpeg_missing", "ffmpeg \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 FFMPEG_EXECUTABLE \u0438\u043B\u0438 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 ffmpeg", 503, {
        kind: "ffmpeg_missing",
        cli_path: null
      });
    }
    return this.#cliPath;
  }
  /** Запуск с набором stdout в буфер: нужен и для текста (`-version`, `ffprobe`), и для пикселей. */
  #collect(command, args, timeout) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: this.#workDir, windowsHide: true });
      const chunks = [];
      let stderr = "";
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        reject(new AppError("ffmpeg_timeout", `ffmpeg \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${timeout} \u043C\u0441`, 504, {
          kind: "ffmpeg_timeout",
          timeout_ms: timeout
        }));
      }, timeout);
      child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
        if (stderr.length > 8192) stderr = stderr.slice(-8192);
      });
      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error.code === "ENOENT") {
          reject(new AppError("ffmpeg_missing", `ffmpeg \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${command}`, 503, {
            kind: "ffmpeg_missing",
            cli_path: command
          }));
          return;
        }
        reject(new UpstreamError(`ffmpeg: ${error.message}`, { kind: "ffmpeg_error" }));
      });
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code === 0) {
          resolve({ bytes: Buffer.concat(chunks), stderr });
          return;
        }
        reject(new UpstreamError(`ffmpeg: ${(stderr.trim() || `\u043A\u043E\u0434 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 ${code}`).slice(0, 500)}`, {
          kind: "ffmpeg_error",
          exit_code: code,
          cli_path: command
        }));
      });
    });
  }
};

// modules/image-palette/quantize.ts
function pixelsFromRgb24(raw) {
  const pixels = [];
  for (let offset = 0; offset + 2 < raw.length; offset += 3) {
    pixels.push({ r: raw[offset], g: raw[offset + 1], b: raw[offset + 2] });
  }
  return pixels;
}

// modules/image-stats/stats.ts
var HISTOGRAM_BINS = 32;
var HISTOGRAM_STEP = 256 / HISTOGRAM_BINS;
var CLIP_SHADOW = 2;
var CLIP_HIGHLIGHT = 98;
function luminanceOf(pixel) {
  return 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;
}
function saturationOf(pixel) {
  const max = Math.max(pixel.r, pixel.g, pixel.b);
  const min = Math.min(pixel.r, pixel.g, pixel.b);
  const lightness = (max + min) / 2;
  if (max === min) return 0;
  const delta = max - min;
  return lightness > 127.5 ? delta / (510 - max - min) : delta / (max + min);
}
function round4(value) {
  return Math.round(value * 1e4) / 1e4;
}
function medianOf(sorted) {
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}
function analyze(pixels) {
  const empty = {
    pixels: 0,
    luminance: { min: 0, max: 0, mean: 0, median: 0, contrast: 0 },
    saturation: { mean: 0 },
    clipping: { shadow_share: 0, highlight_share: 0 },
    histogram: Array.from({ length: HISTOGRAM_BINS }, (_, index) => ({
      from: index * HISTOGRAM_STEP,
      to: index * HISTOGRAM_STEP + HISTOGRAM_STEP - 1,
      share: 0
    }))
  };
  if (pixels.length === 0) return empty;
  const luminances = new Array(pixels.length);
  const counts = new Array(HISTOGRAM_BINS).fill(0);
  let sum = 0;
  let saturationSum = 0;
  let shadows = 0;
  let highlights = 0;
  pixels.forEach((pixel, index) => {
    const luminance = luminanceOf(pixel);
    luminances[index] = luminance;
    sum += luminance;
    saturationSum += saturationOf(pixel);
    if (luminance <= CLIP_SHADOW / 100 * 255) shadows += 1;
    if (luminance >= CLIP_HIGHLIGHT / 100 * 255) highlights += 1;
    const bin = Math.min(HISTOGRAM_BINS - 1, Math.max(0, Math.floor(luminance / HISTOGRAM_STEP)));
    counts[bin] = counts[bin] + 1;
  });
  const mean = sum / pixels.length;
  const variance = luminances.reduce((total2, value) => total2 + (value - mean) ** 2, 0) / pixels.length;
  const sorted = [...luminances].sort((left, right) => left - right);
  const total = pixels.length;
  return {
    pixels: total,
    luminance: {
      min: Math.round(sorted[0]),
      max: Math.round(sorted[sorted.length - 1]),
      mean: round4(mean),
      median: Math.round(medianOf(sorted)),
      contrast: round4(Math.sqrt(variance))
    },
    saturation: { mean: round4(saturationSum / total) },
    clipping: {
      shadow_share: round4(shadows / total),
      highlight_share: round4(highlights / total)
    },
    histogram: counts.map((count, index) => ({
      from: index * HISTOGRAM_STEP,
      to: index * HISTOGRAM_STEP + HISTOGRAM_STEP - 1,
      share: round4(count / total)
    }))
  };
}

// modules/image-stats/index.ts
var NO_STORE = { "cache-control": "no-store" };
var MAX_INPUT_BYTES = 8 * 1024 * 1024;
var MIN_SAMPLE = 16;
var MAX_SAMPLE = 256;
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u0410\u043D\u0430\u043B\u0438\u0437 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430</title></head><body><h1>\u0410\u043D\u0430\u043B\u0438\u0437 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430</h1>
<p>\u042F\u0440\u043A\u043E\u0441\u0442\u044C, \u043A\u043E\u043D\u0442\u0440\u0430\u0441\u0442, \u0433\u0438\u0441\u0442\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0438 \u0437\u0430\u0436\u0430\u0442\u044B\u0435 \u0442\u043E\u043D\u0430 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u043F\u043E \u043F\u0438\u043A\u0441\u0435\u043B\u044F\u043C
\u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u043D\u043E\u0439 \u043A\u043E\u043F\u0438\u0438 \u2014 \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0447\u0438\u0442\u0430\u0435\u043C\u043E\u0441\u0442\u044C \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430 \u0434\u043E \u0440\u0430\u0431\u043E\u0442\u044B.</p>
<p><code>POST /api/tools/image-stats/analyze</code> \u0441
<code>{ content_base64, sample }</code>; \u043E\u0442\u0432\u0435\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442
<code>luminance</code>, <code>saturation</code>, <code>clipping</code> \u0438
32 \u0431\u0438\u043D\u0430 <code>histogram</code>.</p>
</body></html>`;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "image_stats_body_invalid"
    });
  }
  return raw;
}
function contentOf(body) {
  const raw = String(body.content_base64 ?? "").trim();
  if (!raw) {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D content_base64", { reason: "image_content_required" }, {
      code: "image_content_required"
    });
  }
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) {
    throw new ValidationError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B", { reason: "image_empty" }, { code: "image_empty" });
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", { bytes: buffer.length, limit: MAX_INPUT_BYTES }, {
      code: "image_stats_input_too_large"
    });
  }
  return buffer;
}
function sampleOf(value) {
  if (value === void 0 || value === null || value === "") return 128;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_SAMPLE || parsed > MAX_SAMPLE) {
    throw new ValidationError(`sample \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u043E\u0442 ${MIN_SAMPLE} \u0434\u043E ${MAX_SAMPLE}`, {
      received: value
    }, { code: "image_stats_sample_invalid" });
  }
  return parsed;
}
var module = {
  id: "image-stats",
  apiVersion: 1,
  register(ctx) {
    const dataDir = ctx.paths.data && isAbsolute(ctx.paths.data) ? ctx.paths.data : join2(process.cwd(), ".tmp-image-stats");
    if (!existsSync2(dataDir)) mkdirSync(dataDir, { recursive: true });
    const ffmpeg = new FfmpegRaw({ workDir: dataDir });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/image-stats/summary", async () => {
      const status = await ffmpeg.status();
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          engine: "ffmpeg",
          available: status.available,
          version: status.label,
          measures: ["luminance", "saturation", "clipping", "histogram"],
          luminance_model: "rec709-srgb",
          histogram_bins: 32,
          limits: {
            max_input_bytes: MAX_INPUT_BYTES,
            sample: { min: MIN_SAMPLE, max: MAX_SAMPLE },
            timeout_ms: 3e4
          }
        }
      };
    });
    ctx.api.add("POST", "/api/tools/image-stats/analyze", async (request) => {
      const body = bodyOf(request.body);
      const content = contentOf(body);
      const sample = sampleOf(body.sample);
      const raw = await ffmpeg.rawPixels(content, { sample });
      const pixels = pixelsFromRgb24(raw.bytes);
      const stats = analyze(pixels);
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          sampled: { width: raw.width, height: raw.height, pixels: pixels.length },
          luminance_model: "rec709-srgb",
          ...stats,
          duration_ms: raw.duration_ms
        }
      };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
