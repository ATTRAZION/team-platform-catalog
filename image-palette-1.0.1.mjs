import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/image-palette/index.ts
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
function channelOf(pixel, channel) {
  return channel === 0 ? pixel.r : channel === 1 ? pixel.g : pixel.b;
}
function rangeOf(box) {
  let best = { channel: 0, spread: -1 };
  for (const channel of [0, 1, 2]) {
    let min = 255;
    let max = 0;
    for (const pixel of box.pixels) {
      const value = channelOf(pixel, channel);
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const spread = max - min;
    if (spread > best.spread) best = { channel, spread };
  }
  return best;
}
function averageOf(box) {
  let r = 0, g = 0, b = 0;
  for (const pixel of box.pixels) {
    r += pixel.r;
    g += pixel.g;
    b += pixel.b;
  }
  const count = box.pixels.length || 1;
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}
function bestCut(sorted, channel) {
  const count = sorted.length;
  const sums = new Array(count + 1).fill(0);
  const squares = new Array(count + 1).fill(0);
  for (let index = 0; index < count; index += 1) {
    const value = channelOf(sorted[index], channel);
    sums[index + 1] = sums[index] + value;
    squares[index + 1] = squares[index] + value * value;
  }
  const totalSum = sums[count];
  const totalSquares = squares[count];
  let bestIndex = Math.floor(count / 2);
  let bestCost = Number.POSITIVE_INFINITY;
  for (let cut = 1; cut < count; cut += 1) {
    const leftSum = sums[cut];
    const leftSquares = squares[cut];
    const rightSum = totalSum - leftSum;
    const rightSquares = totalSquares - leftSquares;
    const leftCost = leftSquares - leftSum * leftSum / cut;
    const rightCost = rightSquares - rightSum * rightSum / (count - cut);
    const cost = leftCost + rightCost;
    if (cost < bestCost) {
      bestCost = cost;
      bestIndex = cut;
    }
  }
  return Math.min(Math.max(bestIndex, 1), count - 1);
}
function toHex(color) {
  const part = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${part(color.r)}${part(color.g)}${part(color.b)}`;
}
function quantize(pixels, count) {
  if (pixels.length === 0 || count <= 0) return [];
  let boxes = [{ pixels: [...pixels] }];
  while (boxes.length < count) {
    let targetIndex = -1;
    let targetSpread = 0;
    boxes.forEach((box2, index) => {
      if (box2.pixels.length < 2) return;
      const { spread } = rangeOf(box2);
      if (spread > targetSpread) {
        targetSpread = spread;
        targetIndex = index;
      }
    });
    if (targetIndex < 0) break;
    const box = boxes[targetIndex];
    const { channel } = rangeOf(box);
    const sorted = [...box.pixels].sort((left, right) => {
      const diff = channelOf(left, channel) - channelOf(right, channel);
      if (diff !== 0) return diff;
      return left.r - right.r || left.g - right.g || left.b - right.b;
    });
    const cut = bestCut(sorted, channel);
    boxes = [
      ...boxes.slice(0, targetIndex),
      { pixels: sorted.slice(0, cut) },
      { pixels: sorted.slice(cut) },
      ...boxes.slice(targetIndex + 1)
    ];
  }
  const total = pixels.length;
  return boxes.filter((box) => box.pixels.length > 0).map((box) => {
    const color = averageOf(box);
    return {
      ...color,
      hex: toHex(color),
      share: Math.round(box.pixels.length / total * 1e4) / 1e4,
      pixels: box.pixels.length
    };
  }).sort((left, right) => right.pixels - left.pixels || left.hex.localeCompare(right.hex));
}
function pixelsFromRgb24(raw) {
  const pixels = [];
  for (let offset = 0; offset + 2 < raw.length; offset += 3) {
    pixels.push({ r: raw[offset], g: raw[offset + 1], b: raw[offset + 2] });
  }
  return pixels;
}

// modules/image-palette/index.ts
var NO_STORE = { "cache-control": "no-store" };
var MAX_INPUT_BYTES = 8 * 1024 * 1024;
var MIN_COLORS = 2;
var MAX_COLORS = 32;
var MIN_SAMPLE = 8;
var MAX_SAMPLE = 256;
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u041F\u0430\u043B\u0438\u0442\u0440\u0430 \u0438\u0437 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F</title></head><body><h1>\u041F\u0430\u043B\u0438\u0442\u0440\u0430 \u0438\u0437 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F</h1>
<p>\u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0446\u0432\u0435\u0442\u0430 \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441\u0430 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E: ffmpeg \u043E\u0442\u0434\u0430\u0451\u0442 \u043F\u0438\u043A\u0441\u0435\u043B\u0438,
\u043C\u0435\u0434\u0438\u0430\u043D\u043D\u043E\u0435 \u0441\u0435\u0447\u0435\u043D\u0438\u0435 \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442 \u043F\u0430\u043B\u0438\u0442\u0440\u0443.</p>
<p><code>POST /api/tools/image-palette/extract</code> \u0441
<code>{ content_base64, colors, sample }</code>; \u043E\u0442\u0432\u0435\u0442 \u2014 hex-\u0441\u043F\u0438\u0441\u043E\u043A \u0441 \u0434\u043E\u043B\u044F\u043C\u0438,
\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 \u0441 <code>color-palette</code>.</p>
</body></html>`;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "image_palette_body_invalid"
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
    throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", {
      bytes: buffer.length,
      limit: MAX_INPUT_BYTES
    }, { code: "image_palette_input_too_large" });
  }
  return buffer;
}
function integer(value, field, min, max, fallback, code) {
  if (value === void 0 || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u043E\u0442 ${min} \u0434\u043E ${max}`, {
      received: value,
      field
    }, { code });
  }
  return parsed;
}
var module = {
  id: "image-palette",
  apiVersion: 1,
  register(ctx) {
    const dataDir = ctx.paths.data && isAbsolute(ctx.paths.data) ? ctx.paths.data : join2(process.cwd(), ".tmp-image-palette");
    if (!existsSync2(dataDir)) mkdirSync(dataDir, { recursive: true });
    const ffmpeg = new FfmpegRaw({ workDir: dataDir });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/image-palette/summary", async () => {
      const status = await ffmpeg.status();
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          engine: "ffmpeg",
          available: status.available,
          version: status.label,
          probe_available: status.probe_available,
          method: "median-cut",
          compatible_with: "color-palette",
          limits: {
            max_input_bytes: MAX_INPUT_BYTES,
            colors: { min: MIN_COLORS, max: MAX_COLORS },
            sample: { min: MIN_SAMPLE, max: MAX_SAMPLE },
            timeout_ms: 3e4
          }
        }
      };
    });
    ctx.api.add("POST", "/api/tools/image-palette/extract", async (request) => {
      const body = bodyOf(request.body);
      const content = contentOf(body);
      const colors = integer(body.colors, "colors", MIN_COLORS, MAX_COLORS, 8, "image_palette_colors_invalid");
      const sample = integer(body.sample, "sample", MIN_SAMPLE, MAX_SAMPLE, 64, "image_palette_sample_invalid");
      const raw = await ffmpeg.rawPixels(content, { sample });
      const pixels = pixelsFromRgb24(raw.bytes);
      const palette = quantize(pixels, colors);
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          method: "median-cut",
          sampled: { width: raw.width, height: raw.height, pixels: pixels.length },
          colors: palette.length,
          palette: palette.map((color) => ({
            hex: color.hex,
            rgb: { r: color.r, g: color.g, b: color.b },
            share: color.share
          })),
          hex: palette.map((color) => color.hex),
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
