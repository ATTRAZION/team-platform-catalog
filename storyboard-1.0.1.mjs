import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/storyboard/index.ts
import { existsSync as existsSync2, mkdirSync, mkdtempSync as mkdtempSync2, readFileSync as readFileSync2, rmSync as rmSync2, writeFileSync as writeFileSync2 } from "node:fs";
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

// modules/video-frame/ffmpeg.ts
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
function versionLabel(stdout) {
  const line = stdout.split(/\r?\n/).find((entry) => entry.trim().length > 0);
  return line ? line.trim() : null;
}
function parseDuration(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const value = Number(parsed.format?.duration);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}
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
var FfmpegBridge = class _FfmpegBridge {
  #cliPath;
  #workDir;
  #timeoutMs;
  #runner;
  constructor(options = {}) {
    this.#cliPath = options.cliPath === void 0 ? _FfmpegBridge.findExecutable() : options.cliPath;
    this.#workDir = options.workDir ?? tmpdir();
    this.#timeoutMs = options.timeoutMs ?? 45e3;
    this.#runner = options.runner ?? (async (command, args, optionsValue) => {
      const result = await execFileAsync(command, args, optionsValue);
      return { stdout: String(result.stdout), stderr: String(result.stderr) };
    });
  }
  /** Поиск: явная переменная окружения, затем установка WinGet, затем стандартные пути. */
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
        label: versionLabel(result.stdout),
        cli_path: this.#cliPath,
        probe_available: this.probePath !== null
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        return { available: false, label: null, cli_path: this.#cliPath, probe_available: false };
      }
      throw new UpstreamError("ffmpeg \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0437\u0430\u043F\u0440\u043E\u0441 \u0432\u0435\u0440\u0441\u0438\u0438", { kind: "ffmpeg_error" });
    }
  }
  /** Длительность контейнера; без `ffprobe` — null, а не исключение. */
  async durationOf(file) {
    const probe = this.probePath;
    if (!probe) return null;
    const result = await this.#runner(probe, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      file
    ], { cwd: this.#workDir, timeout: 15e3, maxBuffer: 1024 * 1024, windowsHide: true });
    return parseDuration(result.stdout);
  }
  /**
   * Кадр на заданной секунде. `-ss` идёт после `-i`, чтобы попадание было точным,
   * а не приблизительным: у художника референс-кадр должен быть тем самым кадром.
   */
  async frame(input, options) {
    const cliPath = this.#requirePath();
    const started = Date.now();
    const extension = options.format === "jpeg" ? "jpg" : "png";
    let scratch = null;
    try {
      scratch = mkdtempSync(join(this.#workDir, "video-frame-"));
      const source = join(scratch, "input.bin");
      const target = join(scratch, `frame.${extension}`);
      writeFileSync(source, input);
      const args = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        source,
        "-ss",
        options.atSeconds.toFixed(3),
        "-frames:v",
        "1"
      ];
      if (options.maxSide) args.push("-vf", `scale='min(iw,${options.maxSide})':'min(ih,${options.maxSide})':force_original_aspect_ratio=decrease`);
      args.push(target);
      await this.#run(cliPath, args, options.timeoutMs ?? this.#timeoutMs);
      if (!existsSync(target)) {
        throw new AppError("video_frame_unavailable", "ffmpeg \u043D\u0435 \u043E\u0442\u0434\u0430\u043B \u043A\u0430\u0434\u0440 \u043D\u0430 \u044D\u0442\u043E\u0439 \u0441\u0435\u043A\u0443\u043D\u0434\u0435", 400, {
          kind: "video_frame_unavailable",
          at_seconds: options.atSeconds
        });
      }
      const content = readFileSync(target);
      const probe = this.probePath;
      let size = { width: null, height: null };
      if (probe) {
        const result = await this.#runner(probe, [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=width,height",
          "-of",
          "json",
          target
        ], { cwd: this.#workDir, timeout: 1e4, maxBuffer: 1024 * 1024, windowsHide: true });
        size = parseProbeSize(result.stdout);
      }
      return { content, ...size, duration_ms: Date.now() - started };
    } finally {
      if (scratch) rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  }
  /** Прямой запуск для тестовых фикстур (генерация образца видео). */
  async run(args, timeoutMs = this.#timeoutMs) {
    return this.#run(this.#requirePath(), args, timeoutMs);
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
      throw new UpstreamError(`ffmpeg: ${(stderr || details.message || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430").slice(0, 500)}`, {
        kind: "ffmpeg_error",
        cli_path: command
      });
    }
  }
};

// modules/storyboard/tile.ts
var MIN_EVERY = 0.1;
var MAX_EVERY = 600;
var MIN_COLUMNS = 1;
var MAX_COLUMNS = 8;
var MIN_ROWS = 1;
var MAX_ROWS = 8;
var MAX_FRAMES = 64;
var MIN_TILE = 32;
var MAX_TILE = 512;
function buildSheetFilter(plan) {
  const fps = 1 / plan.everySeconds;
  const step = Number(fps.toFixed(6));
  return `fps=${step},scale=${plan.tileSide}:-2,tile=${plan.columns}x${plan.rows}`;
}
function parseJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 255 || buffer[1] !== 216) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 255) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 216 || marker === 1 || marker >= 208 && marker <= 215) {
      offset += 2;
      continue;
    }
    if (marker === 217 || marker === 218) return null;
    const length = buffer.readUInt16BE(offset + 2);
    const isFrameHeader = marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204;
    if (isFrameHeader) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}
function planSheet(input) {
  return {
    ...input,
    frames: input.columns * input.rows
  };
}

// modules/storyboard/index.ts
var NO_STORE = { "cache-control": "no-store" };
var MAX_INPUT_BYTES = 64 * 1024 * 1024;
var MAX_OUTPUT_BYTES = 24 * 1024 * 1024;
var TIMEOUT_MS = 9e4;
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u0420\u0430\u0441\u043A\u0430\u0434\u0440\u043E\u0432\u043A\u0430 \u0438\u0437 \u0432\u0438\u0434\u0435\u043E</title></head><body><h1>\u0420\u0430\u0441\u043A\u0430\u0434\u0440\u043E\u0432\u043A\u0430 \u0438\u0437 \u0432\u0438\u0434\u0435\u043E</h1>
<p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 ffmpeg \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442 \u0441\u0435\u0442\u043A\u0443 \u043A\u0430\u0434\u0440\u043E\u0432 \u0441 \u0437\u0430\u0434\u0430\u043D\u043D\u044B\u043C \u0448\u0430\u0433\u043E\u043C \u2014 \u0447\u0442\u043E\u0431\u044B \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C
\u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u0438 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044E \u043F\u043E \u043A\u043B\u0438\u043F\u0443.</p>
<p><code>POST /api/tools/storyboard/sheet</code> \u0441
<code>{ content_base64, every_seconds, columns, rows, tile_side, format }</code>;
\u043E\u0442\u0432\u0435\u0442 \u2014 PNG/JPEG \u0432 base64 \u0441 \u0440\u0430\u0437\u043C\u0435\u0440\u0430\u043C\u0438 \u0438 \u0447\u0438\u0441\u043B\u043E\u043C \u043A\u0430\u0434\u0440\u043E\u0432 \u0441\u0435\u0442\u043A\u0438.</p>
</body></html>`;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "storyboard_body_invalid"
    });
  }
  return raw;
}
function contentOf(body) {
  const raw = String(body.content_base64 ?? "").trim();
  if (!raw) {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D content_base64", { reason: "video_content_required" }, {
      code: "video_content_required"
    });
  }
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) {
    throw new ValidationError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B", { reason: "video_empty" }, { code: "video_empty" });
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new ValidationError("\u0412\u0438\u0434\u0435\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", { bytes: buffer.length, limit: MAX_INPUT_BYTES }, {
      code: "storyboard_input_too_large"
    });
  }
  return buffer;
}
function numberField(value, field, min, max, fallback, code, integer) {
  if (value === void 0 || value === null || value === "") return fallback;
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max && (!integer || Number.isInteger(parsed));
  if (!valid) {
    throw new ValidationError(`${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C ${integer ? "\u0446\u0435\u043B\u044B\u043C " : ""}\u043E\u0442 ${min} \u0434\u043E ${max}`, {
      received: value,
      field
    }, { code });
  }
  return parsed;
}
function formatOf(value) {
  const raw = value === void 0 || value === null || value === "" ? "png" : String(value).trim().toLowerCase();
  const normalized = raw === "jpg" ? "jpeg" : raw;
  if (normalized !== "png" && normalized !== "jpeg") {
    throw new ValidationError(`\u0424\u043E\u0440\u043C\u0430\u0442 \xAB${raw}\xBB \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F`, { supported: ["png", "jpeg"] }, {
      code: "storyboard_format_unsupported"
    });
  }
  return normalized;
}
var module = {
  id: "storyboard",
  apiVersion: 1,
  register(ctx) {
    const dataDir = ctx.paths.data && isAbsolute(ctx.paths.data) ? ctx.paths.data : join2(process.cwd(), ".tmp-storyboard");
    if (!existsSync2(dataDir)) mkdirSync(dataDir, { recursive: true });
    const ffmpeg = new FfmpegBridge({ workDir: dataDir, timeoutMs: TIMEOUT_MS });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/storyboard/summary", async () => {
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
          formats: ["png", "jpeg"],
          limits: {
            max_input_bytes: MAX_INPUT_BYTES,
            max_output_bytes: MAX_OUTPUT_BYTES,
            every_seconds: { min: MIN_EVERY, max: MAX_EVERY },
            columns: { min: MIN_COLUMNS, max: MAX_COLUMNS },
            rows: { min: MIN_ROWS, max: MAX_ROWS },
            frames: { max: MAX_FRAMES },
            tile_side: { min: MIN_TILE, max: MAX_TILE },
            timeout_ms: TIMEOUT_MS
          }
        }
      };
    });
    ctx.api.add("POST", "/api/tools/storyboard/sheet", async (request) => {
      const body = bodyOf(request.body);
      const content = contentOf(body);
      const everySeconds = numberField(body.every_seconds, "every_seconds", MIN_EVERY, MAX_EVERY, 2, "storyboard_every_invalid", false);
      const columns = numberField(body.columns, "columns", MIN_COLUMNS, MAX_COLUMNS, 4, "storyboard_columns_invalid", true);
      const rows = numberField(body.rows, "rows", MIN_ROWS, MAX_ROWS, 3, "storyboard_rows_invalid", true);
      const tileSide = numberField(body.tile_side, "tile_side", MIN_TILE, MAX_TILE, 160, "storyboard_tile_invalid", true);
      const format = formatOf(body.format);
      const plan = planSheet({ everySeconds, columns, rows, tileSide });
      const scratch = mkdtempSync2(join2(dataDir, "storyboard-"));
      let sheet;
      let durationMs = 0;
      try {
        const started = Date.now();
        const source = join2(scratch, "input.bin");
        const target = join2(scratch, `sheet.${format === "jpeg" ? "jpg" : "png"}`);
        writeFileSync2(source, content);
        await ffmpeg.run([
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          source,
          "-vf",
          buildSheetFilter(plan),
          "-frames:v",
          "1",
          target
        ], TIMEOUT_MS);
        if (!existsSync2(target)) {
          throw new AppError("storyboard_unavailable", "ffmpeg \u043D\u0435 \u043E\u0442\u0434\u0430\u043B \u0440\u0430\u0441\u043A\u0430\u0434\u0440\u043E\u0432\u043A\u0443: \u0432 \u043A\u043B\u0438\u043F\u0435 \u043D\u0435\u0442 \u043A\u0430\u0434\u0440\u043E\u0432", 400, {
            kind: "storyboard_unavailable"
          });
        }
        const result = readFileSync2(target);
        durationMs = Date.now() - started;
        let width = null;
        let height = null;
        if (format === "png" && result.length > 24 && result.toString("latin1", 12, 16) === "IHDR") {
          width = result.readUInt32BE(16);
          height = result.readUInt32BE(20);
        } else if (format === "jpeg") {
          const size = parseJpegSize(result);
          width = size?.width ?? null;
          height = size?.height ?? null;
        }
        sheet = { content: result, width, height };
      } finally {
        rmSync2(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
      if (sheet.content.length > MAX_OUTPUT_BYTES) {
        throw new ValidationError("\u0420\u0430\u0441\u043A\u0430\u0434\u0440\u043E\u0432\u043A\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430", {
          bytes: sheet.content.length,
          limit: MAX_OUTPUT_BYTES
        }, { code: "storyboard_output_too_large" });
      }
      return {
        status: 200,
        headers: NO_STORE,
        body: {
          ok: true,
          sheet: {
            format,
            bytes: sheet.content.length,
            width: sheet.width,
            height: sheet.height,
            frames: plan.frames,
            every_seconds: everySeconds,
            content_base64: sheet.content.toString("base64")
          },
          duration_ms: durationMs
        }
      };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
