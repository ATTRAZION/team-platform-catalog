import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/kernel/errors.ts
var AppError = class extends Error {
  code;
  status;
  details;
  constructor(code, message, status, details = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
};
var ValidationError = class extends AppError {
  constructor(message, details = {}, options = {}) {
    super(options.code ?? "validation_failed", message, options.status ?? 400, details);
  }
};
var UpstreamError = class extends AppError {
  constructor(message, details = {}) {
    super("upstream_error", message, 502, details);
  }
};

// modules/image-convert/index.ts
import { isAbsolute, join as join2 } from "node:path";
import { existsSync as existsSync2, mkdirSync } from "node:fs";

// modules/image-convert/ffmpeg.ts
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
var SUPPORTED_FORMATS = ["png", "jpeg", "webp", "tiff", "bmp"];
var execFileAsync = promisify(execFile);
function parseVersionLabel(stdout) {
  const line = stdout.split(/\r?\n/).find((entry) => entry.trim().length > 0);
  return line ? line.trim() : null;
}
function parseProbeSize(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const stream = parsed.streams?.[0];
    const width = typeof stream?.width === "number" && stream.width > 0 ? stream.width : null;
    const height = typeof stream?.height === "number" && stream.height > 0 ? stream.height : null;
    return { width, height };
  } catch {
    return { width: null, height: null };
  }
}
function fitSide(width, height, maxSide) {
  const largest = Math.max(width, height);
  if (largest <= maxSide) return { width, height };
  const ratio = maxSide / largest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}
function jpegQscale(quality) {
  return Math.max(2, Math.min(31, Math.round(31 - quality / 100 * 29)));
}
var FfmpegCli = class _FfmpegCli {
  #cliPath;
  #workDir;
  #timeoutMs;
  #runner;
  constructor(options = {}) {
    this.#cliPath = options.cliPath === void 0 ? _FfmpegCli.findExecutable() : options.cliPath;
    this.#workDir = options.workDir ?? tmpdir();
    this.#timeoutMs = options.timeoutMs ?? 3e4;
    this.#runner = options.runner ?? (async (command, args, optionsValue) => {
      const result = await execFileAsync(command, args, optionsValue);
      return { stdout: String(result.stdout), stderr: String(result.stderr) };
    });
  }
  /**
   * Порядок поиска: явная переменная окружения, затем имя в PATH (Windows:
   * `where`, остальные — фиксированные каталоги). Отсутствие — null, а не
   * исключение: модуль сам решает, что показать пользователю.
   */
  static findExecutable(env = process.env, platform = process.platform) {
    const explicit = (env.FFMPEG_EXECUTABLE ?? env.TEAM_FFMPEG_EXECUTABLE ?? "").trim();
    if (explicit && existsSync(explicit)) return explicit;
    if (platform === "win32") {
      const roots = [env.LOCALAPPDATA, env.ProgramFiles, env.ProgramData].filter(
        (value) => typeof value === "string" && value.length > 0
      );
      for (const root of roots) {
        const base = join(root, "Microsoft", "WinGet", "Packages");
        const found = _FfmpegCli.#searchWinget(base);
        if (found) return found;
      }
      return null;
    }
    for (const candidate of ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"]) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }
  static #searchWinget(base) {
    let names;
    try {
      names = readdirSync(base);
    } catch {
      return null;
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
    return null;
  }
  get cliPath() {
    return this.#cliPath;
  }
  /** ffprobe ищется рядом с найденным ffmpeg: в сборках они лежат в одном каталоге. */
  get probePath() {
    if (!this.#cliPath) return null;
    const dir = dirname(this.#cliPath);
    const names = process.platform === "win32" ? ["ffprobe.exe"] : ["ffprobe"];
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }
  async status() {
    if (!this.#cliPath) {
      return { available: false, label: null, cli_path: null, probe_available: false };
    }
    try {
      const result = await this.#runner(this.#cliPath, ["-hide_banner", "-version"], {
        cwd: this.#workDir,
        timeout: 1e4,
        maxBuffer: 1024 * 1024,
        windowsHide: true
      });
      return {
        available: true,
        label: parseVersionLabel(result.stdout),
        cli_path: this.#cliPath,
        probe_available: this.probePath !== null
      };
    } catch (error) {
      const details = error;
      if (details.code === "ENOENT") {
        return { available: false, label: null, cli_path: this.#cliPath, probe_available: false };
      }
      throw new UpstreamError("ffmpeg \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0437\u0430\u043F\u0440\u043E\u0441 \u0432\u0435\u0440\u0441\u0438\u0438", {
        cli_path: this.#cliPath,
        kind: "ffmpeg_error"
      });
    }
  }
  /** Размеры картинки через ffprobe; без ffprobe — null-поля, а не исключение. */
  async sizeOf(file) {
    const probe = this.probePath;
    if (!probe) return { width: null, height: null };
    const result = await this.#runner(
      probe,
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", file],
      { cwd: this.#workDir, timeout: 1e4, maxBuffer: 1024 * 1024, windowsHide: true }
    );
    return parseProbeSize(result.stdout);
  }
  /**
   * Перекодирование одного изображения. Временные файлы живут в отдельном
   * каталоге и удаляются всегда — и при ошибке тоже.
   */
  async convert(input, options) {
    const cliPath = this.#requirePath();
    const started = Date.now();
    let scratch = null;
    try {
      scratch = mkdtempSync(join(this.#workDir, "image-convert-"));
      const source = join(scratch, "input.bin");
      const target = join(scratch, `output.${options.format === "jpeg" ? "jpg" : options.format}`);
      writeFileSync(source, input);
      const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", source];
      const sourceSize = await this.sizeOf(source);
      const limit = options.maxSide ?? null;
      if (limit && sourceSize.width && sourceSize.height) {
        const fitted = fitSide(sourceSize.width, sourceSize.height, limit);
        args.push("-vf", `scale=${fitted.width}:${fitted.height}`);
      }
      const quality = options.quality ?? null;
      if (quality !== null && options.format === "jpeg") args.push("-q:v", String(jpegQscale(quality)));
      if (quality !== null && options.format === "webp") args.push("-quality", String(quality));
      if (options.format === "webp") args.push("-c:v", "libwebp");
      args.push("-frames:v", "1", target);
      await this.#run(cliPath, args, options.timeoutMs ?? this.#timeoutMs);
      const content = readFileSync(target);
      const size = await this.sizeOf(target);
      return {
        format: options.format,
        bytes: content.length,
        width: size.width,
        height: size.height,
        content,
        duration_ms: Date.now() - started
      };
    } finally {
      if (scratch) rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
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
  async #run(command, args, timeout) {
    try {
      return await this.#runner(command, args, {
        cwd: this.#workDir,
        timeout,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      const details = error;
      if (details.code === "ENOENT") {
        throw new AppError("ffmpeg_missing", `ffmpeg \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${command}`, 503, {
          kind: "ffmpeg_missing",
          cli_path: command
        });
      }
      if (details.killed || details.signal) {
        throw new AppError("ffmpeg_timeout", `ffmpeg \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${timeout} \u043C\u0441`, 504, {
          kind: "ffmpeg_timeout",
          timeout_ms: timeout
        });
      }
      const stderr = (details.stderr ?? "").trim();
      throw new UpstreamError(
        `ffmpeg: ${(stderr || details.message || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430").slice(0, 500)}`,
        { kind: "ffmpeg_error", cli_path: command }
      );
    }
  }
};

// modules/image-convert/index.ts
var NO_STORE = { "cache-control": "no-store" };
var MAX_INPUT_BYTES = 8 * 1024 * 1024;
var MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
var MIN_SIDE = 16;
var MAX_SIDE = 4096;
var MIN_QUALITY = 1;
var MAX_QUALITY = 100;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "image_convert_body_invalid"
    });
  }
  return raw;
}
function integer(value, name, min, max, code) {
  if (value === void 0 || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new ValidationError(`${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C`, { received: value }, { code });
  }
  if (parsed < min || parsed > max) {
    throw new ValidationError(`${name} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0442 ${min} \u0434\u043E ${max}`, { received: parsed }, { code });
  }
  return parsed;
}
function formatOf(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u0446\u0435\u043B\u0435\u0432\u043E\u0439 \u0444\u043E\u0440\u043C\u0430\u0442", { supported: [...SUPPORTED_FORMATS] }, {
      code: "image_convert_format_required"
    });
  }
  const normalized = raw === "jpg" ? "jpeg" : raw === "tif" ? "tiff" : raw;
  if (!SUPPORTED_FORMATS.includes(normalized)) {
    throw new ValidationError(`\u0424\u043E\u0440\u043C\u0430\u0442 \xAB${raw}\xBB \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F`, {
      supported: [...SUPPORTED_FORMATS]
    }, { code: "image_convert_format_unsupported" });
  }
  return normalized;
}
function contentOf(body) {
  const raw = String(body.content_base64 ?? "").trim();
  if (!raw) {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D content_base64", { reason: "image_content_required" }, {
      code: "image_content_required"
    });
  }
  let buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 base64", { reason: "image_base64_invalid" }, {
      code: "image_base64_invalid"
    });
  }
  if (buffer.length === 0) {
    throw new ValidationError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B", { reason: "image_empty" }, { code: "image_empty" });
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new ValidationError("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", {
      bytes: buffer.length,
      limit: MAX_INPUT_BYTES
    }, { code: "image_convert_input_too_large" });
  }
  return buffer;
}
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u041A\u043E\u043D\u0432\u0435\u0440\u0442\u0435\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439</title></head><body><h1>\u041A\u043E\u043D\u0432\u0435\u0440\u0442\u0435\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439</h1>
<p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 ffmpeg: PNG, JPEG, WebP, TIFF, BMP. \u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u2014 base64, \u043E\u0442\u0432\u0435\u0442 \u2014 base64.</p>
<p><code>POST /api/tools/image-convert/convert</code> \u0441 <code>{ content_base64, format, quality, max_side }</code>.</p>
</body></html>`;
var module = {
  id: "image-convert",
  apiVersion: 1,
  register(ctx) {
    const dataDir = ctx.paths.data && isAbsolute(ctx.paths.data) ? ctx.paths.data : join2(process.cwd(), ".tmp-image-convert");
    if (!existsSync2(dataDir)) mkdirSync(dataDir, { recursive: true });
    const ffmpeg = new FfmpegCli({ workDir: dataDir });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/image-convert/summary", async () => {
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
          formats: [...SUPPORTED_FORMATS],
          limits: {
            max_input_bytes: MAX_INPUT_BYTES,
            max_output_bytes: MAX_OUTPUT_BYTES,
            max_side: { min: MIN_SIDE, max: MAX_SIDE },
            quality: { min: MIN_QUALITY, max: MAX_QUALITY }
          }
        }
      };
    });
    ctx.api.add("POST", "/api/tools/image-convert/convert", async (request) => {
      const body = bodyOf(request.body);
      const format = formatOf(body.format);
      const content = contentOf(body);
      const quality = integer(body.quality, "quality", MIN_QUALITY, MAX_QUALITY, "image_convert_quality_invalid");
      const maxSide = integer(body.max_side, "max_side", MIN_SIDE, MAX_SIDE, "image_convert_max_side_invalid");
      const converted = await ffmpeg.convert(content, { format, quality, maxSide });
      if (converted.bytes > MAX_OUTPUT_BYTES) {
        throw new ValidationError("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", {
          bytes: converted.bytes,
          limit: MAX_OUTPUT_BYTES,
          reason: "image_convert_output_too_large"
        }, { code: "image_convert_output_too_large" });
      }
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          image: {
            format: converted.format,
            bytes: converted.bytes,
            width: converted.width,
            height: converted.height,
            content_base64: converted.content.toString("base64")
          },
          duration_ms: converted.duration_ms
        }
      };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
