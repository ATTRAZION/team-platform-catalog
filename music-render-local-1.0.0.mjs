import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/music-render-local/index.ts
import { createHash as createHash2 } from "node:crypto";
import { existsSync as existsSync2, mkdirSync, readFileSync, readdirSync as readdirSync2, rmSync, statSync, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// modules/music-render-local/synth.ts
import { createHash } from "node:crypto";
var MAX_NOTES = 512;
var MAX_TOTAL_MS = 12e4;
var MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
var MAX_EVENT_SAMPLES = 2e7;
var MIN_HZ = 20;
var MAX_HZ = 12e3;
var MAX_NOTE_MS = 6e4;
var SAMPLE_RATES = [8e3, 11025, 16e3, 22050, 32e3, 44100, 48e3];
var DEFAULT_SAMPLE_RATE = 44100;
var TAIL_MS = 600;
var ATTACK_MS = 5;
var RELEASE_MS = 40;
var NOTE_PATTERN = /^[A-G][b#]?[0-7]$/;
var NOTE_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToHz(note) {
  const match = /^([A-G])([b#]?)([0-7])$/.exec(note);
  if (!match) throw new ValidationError(`\u041D\u043E\u0442\u0430 \xAB${note}\xBB: \u0444\u043E\u0440\u043C\u0430\u0442 \u0432\u0438\u0434\u0430 C4, F#3, Bb5`);
  const letter = NOTE_SEMITONES[match[1]];
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const octave = Number(match[3]);
  const midi = (octave + 1) * 12 + letter + accidental;
  return Math.round(440 * 2 ** ((midi - 69) / 12) * 100) / 100;
}
function positiveInteger(value, field, max) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 0 \u0434\u043E ${max}`);
  }
  return value;
}
function parseNote(raw, index) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`sequence[${index}]: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442 \u043D\u043E\u0442\u044B`);
  }
  const input = raw;
  const at = positiveInteger(input.at, `sequence[${index}].at`, MAX_TOTAL_MS);
  const ms = positiveInteger(input.ms, `sequence[${index}].ms`, MAX_NOTE_MS);
  if (ms < 1) throw new ValidationError(`sequence[${index}].ms: \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043D\u043E\u0442\u044B \u043E\u0442 1 \u043C\u0441`);
  let hz;
  if (typeof input.note === "string" && NOTE_PATTERN.test(input.note.trim())) {
    hz = noteToHz(input.note.trim());
  } else if (typeof input.hz === "number" && Number.isFinite(input.hz)) {
    hz = Math.round(input.hz * 100) / 100;
    if (hz < MIN_HZ || hz > MAX_HZ) {
      throw new ValidationError(`sequence[${index}].hz: \u0447\u0430\u0441\u0442\u043E\u0442\u0430 \u043E\u0442 ${MIN_HZ} \u0434\u043E ${MAX_HZ} \u0413\u0446`);
    }
  } else {
    throw new ValidationError(`sequence[${index}]: \u043D\u0443\u0436\u043D\u0430 \u043D\u043E\u0442\u0430 (\xABnote\xBB: \xABA4\xBB) \u0438\u043B\u0438 \u0447\u0430\u0441\u0442\u043E\u0442\u0430 (\xABhz\xBB)`);
  }
  let gain = 0.75;
  if (input.gain !== void 0) {
    if (typeof input.gain !== "number" || !Number.isFinite(input.gain) || input.gain < 0 || input.gain > 1) {
      throw new ValidationError(`sequence[${index}].gain: \u0447\u0438\u0441\u043B\u043E \u043E\u0442 0 \u0434\u043E 1`);
    }
    gain = input.gain;
  }
  return { at, ms, hz, gain };
}
function parseRenderInput(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442 \u0441 \u043F\u043E\u043B\u0435\u043C \xABsequence\xBB");
  }
  const input = raw;
  const sampleRate = input.sample_rate === void 0 ? DEFAULT_SAMPLE_RATE : input.sample_rate;
  if (typeof sampleRate !== "number" || !SAMPLE_RATES.includes(sampleRate)) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 \xABsample_rate\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B ${SAMPLE_RATES.join(", ")}`);
  }
  const sequence = input.sequence;
  if (!Array.isArray(sequence)) {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABsequence\xBB: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u0441\u043F\u0438\u0441\u043E\u043A \u043D\u043E\u0442 (\u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C)");
  }
  if (sequence.length > MAX_NOTES) {
    throw new AppError(
      "audio_sequence_too_long",
      `\u041F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u0430\u044F: ${sequence.length} \u043D\u043E\u0442 \u043F\u0440\u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u0435 ${MAX_NOTES}`,
      413,
      { kind: "limits", notes: sequence.length, limit_notes: MAX_NOTES, limit_total_ms: MAX_TOTAL_MS }
    );
  }
  const notes = sequence.map(parseNote).sort(
    (left, right) => left.at - right.at || left.hz - right.hz || left.ms - right.ms || left.gain - right.gain
  );
  let totalEnd = 0;
  let eventSamples = 0;
  for (const note of notes) {
    totalEnd = Math.max(totalEnd, note.at + note.ms);
    if (note.at + note.ms > MAX_TOTAL_MS) {
      throw new AppError(
        "audio_sequence_too_long",
        `\u041F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u0430\u044F: \u043D\u043E\u0442\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043D\u0430 ${note.at + note.ms} \u043C\u0441 \u043F\u0440\u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u0435 ${MAX_TOTAL_MS} \u043C\u0441`,
        413,
        { kind: "limits", total_ms: note.at + note.ms, limit_notes: MAX_NOTES, limit_total_ms: MAX_TOTAL_MS }
      );
    }
    eventSamples += Math.ceil(note.ms * sampleRate / 1e3);
  }
  if (eventSamples > MAX_EVENT_SAMPLES) {
    throw new AppError(
      "audio_sequence_too_long",
      `\u041F\u0430\u0440\u0442\u0438\u044F \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0440\u0430\u0431\u043E\u0442\u044B \u0441\u0438\u043D\u0442\u0435\u0437\u0430\u0442\u043E\u0440\u0430: ${eventSamples} \u0441\u044D\u043C\u043F\u043B\u043E\u0432 \u043F\u0440\u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u0435 ${MAX_EVENT_SAMPLES}`,
      413,
      { kind: "limits", event_samples: eventSamples, limit_event_samples: MAX_EVENT_SAMPLES }
    );
  }
  const totalMs = totalEnd + TAIL_MS;
  const dataBytes = Math.ceil(totalMs * sampleRate / 1e3) * 2;
  if (44 + dataBytes > MAX_OUTPUT_BYTES) {
    throw new AppError(
      "audio_output_too_large",
      `\u0412\u044B\u0445\u043E\u0434 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439: ${44 + dataBytes} \u0411 \u043F\u0440\u0438 \u043F\u0440\u0435\u0434\u0435\u043B\u0435 ${MAX_OUTPUT_BYTES} \u0411 \u2014 \u0441\u043D\u0438\u0437\u044C\u0442\u0435 \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438\u043B\u0438 \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0434\u0438\u0441\u043A\u0440\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u0438`,
      413,
      { kind: "limits", bytes: 44 + dataBytes, limit_bytes: MAX_OUTPUT_BYTES, sample_rate: sampleRate }
    );
  }
  return { sample_rate: sampleRate, notes, total_ms: totalMs };
}
function canonicalParams(params) {
  const notes = params.notes.map((note) => `${note.at}|${note.ms}|${note.hz}|${note.gain}`).join(";");
  return `v1;sr=${params.sample_rate};total=${params.total_ms};notes=${notes}`;
}
function paramsDigest(params) {
  return createHash("sha256").update(canonicalParams(params), "utf8").digest("hex");
}
function sampleAt(cycle, shape) {
  const raw = Math.sin(2 * Math.PI * cycle) + 0.5 * Math.sin(2 * Math.PI * 2 * cycle) + 0.25 * Math.sin(2 * Math.PI * 3 * cycle);
  return raw / 1.75 * shape.gain;
}
function renderWav(params) {
  const rate = params.sample_rate;
  const samples = Math.ceil(params.total_ms * rate / 1e3);
  const mix = new Float64Array(samples);
  const attackSamples = Math.max(1, Math.round(ATTACK_MS * rate / 1e3));
  const releaseSamples = Math.max(1, Math.round(RELEASE_MS * rate / 1e3));
  for (const note of params.notes) {
    const start = Math.round(note.at * rate / 1e3);
    const length = Math.max(1, Math.round(note.ms * rate / 1e3));
    const attack = Math.min(attackSamples, length);
    const release = Math.min(releaseSamples, Math.max(1, length - attack));
    const shape = { hz: note.hz, gain: note.gain };
    let phase = 0;
    for (let i = 0; i < length; i += 1) {
      const target = start + i;
      if (target >= samples) break;
      let envelope = 1;
      if (i < attack) envelope = i / attack;
      else if (i >= length - release) envelope = Math.max(0, (length - i) / release);
      mix[target] = (mix[target] ?? 0) + sampleAt(phase, shape) * envelope;
      phase += note.hz / rate;
      if (phase >= 1) phase -= Math.floor(phase);
    }
  }
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0, "latin1");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "latin1");
  buffer.write("fmt ", 12, "latin1");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "latin1");
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples; i += 1) {
    const clamped = Math.max(-1, Math.min(1, mix[i] ?? 0));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return {
    bytes: buffer,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    samples,
    duration_ms: Math.round(samples / rate * 1e3),
    data_bytes: dataBytes
  };
}
function inspectWav(bytes) {
  const fail = (why) => {
    throw new ValidationError(`\u0421\u043E\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0432\u043E\u043B\u043D\u0430 \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F: ${why}`);
  };
  if (bytes.length < 44) fail("\u0444\u0430\u0439\u043B \u043A\u043E\u0440\u043E\u0447\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430");
  if (bytes.toString("latin1", 0, 4) !== "RIFF") fail("\u043D\u0435\u0442 \u0441\u0438\u0433\u043D\u0430\u0442\u0443\u0440\u044B RIFF");
  if (bytes.toString("latin1", 8, 12) !== "WAVE") fail("\u043D\u0435\u0442 \u0441\u0438\u0433\u043D\u0430\u0442\u0443\u0440\u044B WAVE");
  if (bytes.toString("latin1", 12, 16) !== "fmt ") fail("\u043D\u0435\u0442 \u0447\u0430\u043D\u043A\u0430 fmt");
  const audioFormat = bytes.readUInt16LE(20);
  if (audioFormat !== 1) fail(`\u0447\u0430\u043D\u043A fmt: \u043D\u0435 PCM (${audioFormat})`);
  const channels = bytes.readUInt16LE(22);
  const sampleRate = bytes.readUInt32LE(24);
  const bits = bytes.readUInt16LE(34);
  if (bits !== 16) fail(`\u0447\u0430\u043D\u043A fmt: \u043D\u0435 16 \u0431\u0438\u0442 (${bits})`);
  if (bytes.toString("latin1", 36, 40) !== "data") fail("\u043D\u0435\u0442 \u0447\u0430\u043D\u043A\u0430 data");
  const declared = bytes.readUInt32LE(40);
  const actual = bytes.length - 44;
  if (declared !== actual) fail(`\u0447\u0430\u043D\u043A data \u043E\u0431\u044A\u044F\u0432\u043B\u044F\u0435\u0442 ${declared} \u0411, \u0444\u0430\u0439\u043B \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 ${actual} \u0411`);
  if (channels < 1 || sampleRate < 1 || actual % (channels * (bits / 8)) !== 0) fail("\u043D\u0435\u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442");
  return {
    format: "pcm",
    sample_rate: sampleRate,
    channels,
    bits,
    data_bytes: actual,
    duration_ms: Math.round(actual / (channels * (bits / 8)) / sampleRate * 1e3)
  };
}

// modules/music-render-local/ffmpeg.ts
import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var FfmpegAudio = class _FfmpegAudio {
  #cliPath;
  #workDir;
  #timeoutMs;
  #runner;
  constructor(options = {}) {
    this.#cliPath = options.cliPath === void 0 ? _FfmpegAudio.findExecutable() : options.cliPath;
    this.#workDir = options.workDir ?? process.cwd();
    this.#timeoutMs = options.timeoutMs ?? 3e4;
    this.#runner = options.runner ?? (async (command, args, execOptions) => {
      const result = await execFileAsync(command, args, execOptions);
      return { stdout: String(result.stdout), stderr: String(result.stderr) };
    });
  }
  /** Поиск как у соседних ffmpeg-модулей: окружение, WinGet, типовые пути. */
  static findExecutable(env = process.env, platform = process.platform) {
    const explicit = (env.FFMPEG_EXECUTABLE ?? env.TEAM_FFMPEG_EXECUTABLE ?? "").trim();
    if (explicit && existsSync(explicit)) return explicit;
    if (platform === "win32") {
      const roots = [env.LOCALAPPDATA, env.ProgramFiles, env.ProgramData].filter(
        (value) => typeof value === "string" && value.length > 0
      );
      for (const root of roots) {
        const found = _FfmpegAudio.#searchWinget(join(root, "Microsoft", "WinGet", "Packages"));
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
  status() {
    return { available: this.#cliPath !== null, cli_path: this.#cliPath };
  }
  /**
   * WAV → MP3 (libmp3lame, среднее качество). Временных файлов нет: ffmpeg
   * пишет прямо в целевой путь внутри каталога данных модуля.
   */
  async convertMp3(inputPath, outputPath, timeoutMs) {
    const cliPath = this.#cliPath;
    if (!cliPath) {
      throw new AppError("ffmpeg_missing", "ffmpeg \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: MP3 \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u043C ffmpeg, WAV \u2014 \u0431\u0435\u0437 \u043D\u0435\u0433\u043E", 503, {
        kind: "ffmpeg_missing",
        cli_path: null
      });
    }
    try {
      await this.#runner(cliPath, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        inputPath,
        "-codec:a",
        "libmp3lame",
        "-qscale:a",
        "4",
        outputPath
      ], {
        cwd: this.#workDir,
        timeout: timeoutMs ?? this.#timeoutMs,
        maxBuffer: 1024 * 1024,
        windowsHide: true
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      const details = error;
      if (details.code === "ENOENT") {
        throw new AppError("ffmpeg_missing", `ffmpeg \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${cliPath}`, 503, {
          kind: "ffmpeg_missing",
          cli_path: cliPath
        });
      }
      if (details.killed || details.signal) {
        throw new AppError("ffmpeg_timeout", `ffmpeg \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${timeoutMs ?? this.#timeoutMs} \u043C\u0441`, 504, {
          kind: "ffmpeg_timeout",
          timeout_ms: timeoutMs ?? this.#timeoutMs
        });
      }
      const stderr = (details.stderr ?? "").trim();
      throw new UpstreamError(
        `ffmpeg: ${(stderr || details.message || "\u043A\u043E\u043D\u0432\u0435\u0440\u0442\u0430\u0446\u0438\u044F \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C").slice(0, 500)}`,
        { kind: "ffmpeg_error", cli_path: cliPath }
      );
    }
  }
};

// modules/music-render-local/page.ts
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u043D\u0434\u0435\u0440 \u043C\u0443\u0437\u044B\u043A\u0438</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #15181e; }
    button { padding: .45rem .8rem; margin-right: .4rem; }
    table { border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #c9ced6; padding: .35rem .6rem; font-size: .9rem; }
    code { background: #eef1f5; padding: 0 .25rem; }
    #status { margin-top: .8rem; }
    .hint { color: #5b6472; }
  </style>
</head>
<body>
  <h1>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u043D\u0434\u0435\u0440 \u043C\u0443\u0437\u044B\u043A\u0438</h1>
  <p>\u041F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043D\u043E\u0442 \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u0432 \u0433\u043E\u0442\u043E\u0432\u044B\u0439 WAV \u043F\u0440\u044F\u043C\u043E \u043D\u0430 \u044D\u0442\u043E\u0439 \u043C\u0430\u0448\u0438\u043D\u0435:
     \u0431\u0435\u0437 \u043E\u0431\u043B\u0430\u043A\u0430, \u0431\u0435\u0437 \u043A\u043B\u044E\u0447\u0435\u0439 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u0438 \u0431\u0435\u0437 \u0432\u0435\u0441\u043E\u0432. MP3 \u2014 \u043F\u043E \u0436\u0435\u043B\u0430\u043D\u0438\u044E, \u0447\u0435\u0440\u0435\u0437
     \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 ffmpeg.</p>

  <p>
    <button data-action="render-demo">\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0434\u0435\u043C\u043E-\u043F\u0430\u0440\u0442\u0438\u044E</button>
    <button data-action="refresh-jobs">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button>
  </p>
  <p id="status" class="hint">\u0413\u043E\u0442\u043E\u0432\u044B\u0435 \u0444\u0430\u0439\u043B\u044B \u043B\u0435\u0436\u0430\u0442 \u0432 <code>/api/tools/music-render/jobs</code>.</p>

  <table>
    <thead><tr><th>id</th><th>\u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C</th><th>\u0440\u0430\u0437\u043C\u0435\u0440 WAV</th><th>sha256</th><th>\u0437\u0430\u0434\u0430\u0447\u0430</th><th>MP3</th></tr></thead>
    <tbody id="jobs"><tr><td colspan="6">\u0441\u043F\u0438\u0441\u043E\u043A \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D</td></tr></tbody>
  </table>

<script>
const base = '/api/tools/music-render';
const demo = { sequence: [
  { at: 0, ms: 300, note: 'A2' },
  { at: 300, ms: 300, note: 'C3' },
  { at: 600, ms: 300, note: 'E3' },
  { at: 900, ms: 900, note: 'A3' }
] };

function say(message) {
  document.getElementById('status').textContent = message;
}

async function refreshJobs() {
  const response = await fetch(base + '/jobs');
  const data = await response.json();
  const rows = (data.jobs || []).map((job) =>
    '<tr><td><code>' + job.id + '</code></td><td>' + (job.duration_ms / 1000).toFixed(1) + ' \u0441</td><td>' +
    job.wav.bytes + ' \u0411</td><td><code>' + job.wav.sha256.slice(0, 16) + '\u2026</code></td><td>' +
    (job.run_id || '\u2014') + '</td><td>' + (job.mp3
      ? '<button data-action="open-mp3" data-job="' + job.id + '">MP3</button>'
      : '<button data-action="make-mp3" data-job="' + job.id + '">\u0441\u043E\u0431\u0440\u0430\u0442\u044C MP3</button>') +
    '</td></tr>');
  document.getElementById('jobs').innerHTML = rows.join('') ||
    '<tr><td colspan="6">\u0440\u0435\u043D\u0434\u0435\u0440\u043E\u0432 \u0435\u0449\u0451 \u043D\u0435\u0442</td></tr>';
}

const handlers = {
  'render-demo': async () => {
    say('\u0421\u043E\u0431\u0438\u0440\u0430\u044E \u0434\u0435\u043C\u043E-\u043F\u0430\u0440\u0442\u0438\u044E \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u2026');
    const response = await fetch(base + '/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(demo)
    });
    const data = await response.json();
    if (!response.ok) {
      say('\u041E\u0442\u043A\u0430\u0437: ' + (data.error && data.error.message || 'HTTP ' + response.status) +
        (data.error && data.error.instruction ? ' \u0427\u0442\u043E \u0434\u0435\u043B\u0430\u0442\u044C: ' + data.error.instruction : ''));
      return;
    }
    say('WAV \u0441\u043E\u0431\u0440\u0430\u043D: ' + data.job.wav.bytes + ' \u0411, ' + data.job.duration_ms + ' \u043C\u0441, sha256 ' +
      data.job.wav.sha256.slice(0, 16) + '\u2026');
    await refreshJobs();
  },
  'refresh-jobs': () => refreshJobs(),
  'make-mp3': async (element) => {
    const response = await fetch(base + '/jobs/' + element.dataset.job + '/mp3', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      say('MP3 \u043D\u0435 \u0441\u043E\u0431\u0440\u0430\u043D: ' + (data.error && data.error.message || 'HTTP ' + response.status) +
        (data.error && data.error.instruction ? ' \u0427\u0442\u043E \u0434\u0435\u043B\u0430\u0442\u044C: ' + data.error.instruction : ''));
      return;
    }
    say('MP3 \u0433\u043E\u0442\u043E\u0432: ' + data.job.mp3.bytes + ' \u0411');
    await refreshJobs();
  },
  'open-mp3': (element) => {
    window.location.href = base + '/jobs/' + element.dataset.job + '/mp3';
  }
};

document.addEventListener('click', (event) => {
  const element = event.target.closest('[data-action]');
  if (!element) return;
  const handler = handlers[element.dataset.action];
  if (handler) handler(element);
});

document.addEventListener('DOMContentLoaded', () => { refreshJobs(); });
</script>
</body>
</html>`;

// modules/music-render-local/index.ts
var BASE = "/api/tools/music-render";
var RENDER_AGENT = "music-render-local";
var LEASE_MS = 6e4;
var JOB_ID_PATTERN = /^[0-9a-f]{20}$/;
var MAX_JOBS_LIST = 100;
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C");
  }
  return raw;
}
function assertJobId(raw) {
  if (!JOB_ID_PATTERN.test(raw)) {
    throw new ValidationError("\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u0434\u0430\u0447\u0438 \u0440\u0435\u043D\u0434\u0435\u0440\u0430: 20 \u0448\u0435\u0441\u0442\u043D\u0430\u0434\u0446\u0430\u0442\u0435\u0440\u0438\u0447\u043D\u044B\u0445 \u0437\u043D\u0430\u043A\u043E\u0432");
  }
  return raw;
}
var module = {
  id: "music-render-local",
  apiVersion: 1,
  permissions: ["storage", "process"],
  requiresKernel: [{ name: "idempotency", contractVersion: 1 }],
  register(ctx) {
    const jobsDir = () => join2(ctx.paths.data, "jobs");
    const ffmpeg = new FfmpegAudio({ workDir: ctx.paths.data });
    const readJob = (id) => {
      const path = join2(jobsDir(), `${id}.json`);
      try {
        const parsed = JSON.parse(readFileSync(path, "utf8"));
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("manifest");
        }
        return parsed;
      } catch {
        throw new NotFoundError(`\u0417\u0430\u0434\u0430\u0447\u0430 \u0440\u0435\u043D\u0434\u0435\u0440\u0430 \xAB${id}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
      }
    };
    const writeJobFile = (path, content) => {
      try {
        writeFileSync(path, content, { flag: "wx" });
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const existing = readFileSync(path);
        if (!existing.equals(content)) {
          throw new ConflictError("\u0424\u0430\u0439\u043B \u0440\u0435\u043D\u0434\u0435\u0440\u0430 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0441 \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u0431\u0430\u0439\u0442\u0430\u043C\u0438");
        }
      }
    };
    const renderSequence = (params, taskId) => {
      const digest = paramsDigest(params);
      const jobId = digest.slice(0, 20);
      if (taskId) ctx.require("tasks").tasks.get(taskId);
      let claimed = null;
      let created = null;
      const runs = taskId ? ctx.require("runs").runs : null;
      if (runs && taskId) {
        const queued = runs.list({ status: "queued", limit: 200 });
        if (queued.items.length > 0) {
          throw new ConflictError(
            "\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u0437\u0430\u043D\u044F\u0442\u0430: \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u043D\u0434\u0435\u0440 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u0438 \u043D\u0435 \u043F\u0435\u0440\u0435\u0445\u0432\u0430\u0442\u044B\u0432\u0430\u0435\u0442 \u0447\u0443\u0436\u0438\u0435",
            { queued: queued.items.length }
          );
        }
        created = runs.create({ task_id: taskId, agent: RENDER_AGENT, max_attempts: 1 }).run;
        claimed = runs.claimNext({ owner: RENDER_AGENT, lease_ms: LEASE_MS });
        if (!claimed || claimed.id !== created.id) {
          if (claimed) {
            try {
              runs.release(claimed.id, { owner: RENDER_AGENT, epoch: claimed.lease_epoch });
            } catch {
            }
          }
          try {
            runs.cancel(created.id, { actor: RENDER_AGENT });
          } catch {
          }
          throw new ConflictError(
            "\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u043D\u0435 \u043E\u0442\u0434\u0430\u043B\u0430 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u0440\u0435\u043D\u0434\u0435\u0440\u0430: \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u043D\u0434\u0435\u0440 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442 \u0447\u0443\u0436\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438"
          );
        }
      }
      const started = process.hrtime.bigint();
      const wav = renderWav(params);
      const renderMs = Number((process.hrtime.bigint() - started) / 1000000n);
      const header = inspectWav(wav.bytes);
      if (header.sample_rate !== params.sample_rate || header.channels !== 1 || header.bits !== 16) {
        throw new ConflictError("\u0421\u043E\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0432\u043E\u043B\u043D\u0430 \u043D\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430\u043C \u0440\u0435\u043D\u0434\u0435\u0440\u0430");
      }
      mkdirSync(jobsDir(), { recursive: true });
      const wavPath = join2(jobsDir(), `${jobId}.wav`);
      writeJobFile(wavPath, wav.bytes);
      const job = {
        kind: "music-render-job",
        id: jobId,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        task_id: taskId,
        run_id: claimed?.id ?? null,
        agent: RENDER_AGENT,
        format: "wav",
        sample_rate: params.sample_rate,
        channels: 1,
        bits: 16,
        duration_ms: wav.duration_ms,
        notes: params.notes.length,
        params_sha256: digest,
        render_ms: renderMs,
        wav: { file: `${jobId}.wav`, bytes: wav.bytes.length, sha256: wav.sha256 },
        mp3: null
      };
      writeFileSync(join2(jobsDir(), `${jobId}.json`), JSON.stringify(job, null, 2));
      if (runs && claimed) {
        runs.complete(claimed.id, {
          owner: RENDER_AGENT,
          epoch: claimed.lease_epoch,
          outcome: "succeeded",
          exit_code: 0,
          result: JSON.stringify({
            format: "wav",
            file: job.wav.file,
            sha256: job.wav.sha256,
            bytes: job.wav.bytes,
            duration_ms: job.duration_ms,
            sample_rate: job.sample_rate,
            notes: job.notes
          })
        });
      }
      ctx.log.info("\u041F\u0430\u0440\u0442\u0438\u044F \u0441\u043E\u0431\u0440\u0430\u043D\u0430 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E: WAV \u0431\u0435\u0437 \u043A\u043B\u044E\u0447\u0435\u0439 \u0438 \u0441\u0435\u0442\u0438", {
        job: job.id,
        bytes: job.wav.bytes,
        duration_ms: job.duration_ms,
        notes: job.notes,
        run: job.run_id ?? ""
      });
      return job;
    };
    const idempotency = () => ctx.kernelServices.require("idempotency");
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", BASE, () => ({
      headers: { "cache-control": "no-store" },
      body: {
        ok: true,
        agent: RENDER_AGENT,
        formats: ["wav"],
        optional_formats: ["mp3"],
        limits: {
          max_notes: MAX_NOTES,
          max_total_ms: MAX_TOTAL_MS,
          max_output_bytes: MAX_OUTPUT_BYTES,
          max_event_samples: MAX_EVENT_SAMPLES,
          tail_ms: TAIL_MS,
          sample_rates: [...SAMPLE_RATES]
        },
        needs: { network: false, provider_key: false, weights: false, ffmpeg: "optional (mp3 only)" },
        ffmpeg: ffmpeg.status()
      }
    }));
    ctx.api.add("POST", `${BASE}/render`, async (request) => {
      const body = bodyOf(request.body);
      const params = parseRenderInput(body);
      const rawTask = typeof body.task_id === "string" ? body.task_id.trim() : "";
      const taskId = rawTask || null;
      if (taskId && !/^[A-Za-z0-9_-]{1,100}$/.test(taskId)) {
        throw new ValidationError("\u041F\u043E\u043B\u0435 \xABtask_id\xBB: \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u0434\u0430\u0447\u0438");
      }
      const digest = paramsDigest(params);
      const execute = () => ({ status: 201, body: { ok: true, job: renderSequence(params, taskId) } });
      const key = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
      if (!key) return execute();
      if (!/^[A-Za-z0-9_-]{1,200}$/.test(key)) {
        throw new ValidationError("\u041F\u043E\u043B\u0435 \xABidempotency_key\xBB: \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B, \u0434\u0435\u0444\u0438\u0441 \u0438 \u043F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u043D\u0438\u0435, \u0434\u043E 200 \u0437\u043D\u0430\u043A\u043E\u0432");
      }
      const cached = await idempotency().execute({
        method: "POST",
        path: `${BASE}/render`,
        key,
        fingerprint: createHash2("sha256").update(`${digest}\0${taskId ?? ""}`, "utf8").digest("hex"),
        handler: execute
      });
      return { status: cached.status, body: cached.body };
    });
    ctx.api.add("GET", `${BASE}/jobs`, () => {
      let records = [];
      try {
        for (const entry of readdirSync2(jobsDir(), { withFileTypes: true })) {
          if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
          const id = entry.name.slice(0, -".json".length);
          if (!JOB_ID_PATTERN.test(id)) continue;
          try {
            const parsed = JSON.parse(readFileSync(join2(jobsDir(), entry.name), "utf8"));
            if (parsed && parsed.kind === "music-render-job" && parsed.id === id) records.push(parsed);
          } catch {
          }
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      records.sort((left, right) => right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id));
      return {
        headers: { "cache-control": "no-store" },
        body: { ok: true, jobs: records.slice(0, MAX_JOBS_LIST), truncated: records.length > MAX_JOBS_LIST }
      };
    });
    ctx.api.add("GET", `${BASE}/jobs/:id`, (request) => ({
      headers: { "cache-control": "no-store" },
      body: { ok: true, job: readJob(assertJobId(request.params.id ?? "")) }
    }));
    ctx.api.add("GET", `${BASE}/jobs/:id/wav`, (request) => {
      const id = assertJobId(request.params.id ?? "");
      readJob(id);
      const path = join2(jobsDir(), `${id}.wav`);
      try {
        const info = statSync(path);
        if (!info.isFile() || info.size < 44) throw new Error("size");
        return {
          raw: readFileSync(path),
          headers: {
            "content-type": "audio/wav",
            "content-disposition": `inline; filename="${id}.wav"`,
            "cache-control": "no-store",
            "x-content-type-options": "nosniff"
          }
        };
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
        throw new NotFoundError(`\u0424\u0430\u0439\u043B \u0440\u0435\u043D\u0434\u0435\u0440\u0430 \xAB${id}.wav\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
      }
    });
    ctx.api.add("GET", `${BASE}/jobs/:id/mp3`, (request) => {
      const id = assertJobId(request.params.id ?? "");
      const job = readJob(id);
      if (!job.mp3) throw new NotFoundError(`\u0423 \u0437\u0430\u0434\u0430\u0447\u0438 \u0440\u0435\u043D\u0434\u0435\u0440\u0430 \xAB${id}\xBB \u043D\u0435\u0442 MP3: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0431\u0435\u0440\u0438\u0442\u0435 \u0435\u0433\u043E`);
      const path = join2(jobsDir(), job.mp3.file);
      try {
        const info = statSync(path);
        if (!info.isFile() || info.size === 0) throw new Error("size");
        return {
          raw: readFileSync(path),
          headers: {
            "content-type": "audio/mpeg",
            "content-disposition": `inline; filename="${id}.mp3"`,
            "cache-control": "no-store",
            "x-content-type-options": "nosniff"
          }
        };
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
        throw new NotFoundError(`\u0424\u0430\u0439\u043B \u0440\u0435\u043D\u0434\u0435\u0440\u0430 \xAB${id}.mp3\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
      }
    });
    ctx.api.add("POST", `${BASE}/jobs/:id/mp3`, async (request) => {
      const id = assertJobId(request.params.id ?? "");
      const job = readJob(id);
      if (job.mp3 && existsSync2(join2(jobsDir(), job.mp3.file))) {
        return { headers: { "cache-control": "no-store" }, body: { ok: true, job, replayed: true } };
      }
      const wavPath = join2(jobsDir(), `${id}.wav`);
      const mp3Path = join2(jobsDir(), `${id}.mp3`);
      await ffmpeg.convertMp3(wavPath, mp3Path);
      let mp3;
      try {
        const info = statSync(mp3Path);
        if (!info.isFile() || info.size === 0 || info.size > MAX_OUTPUT_BYTES) {
          throw new ConflictError("ffmpeg \u0432\u0435\u0440\u043D\u0443\u043B \u043F\u0443\u0441\u0442\u043E\u0439 \u0438\u043B\u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 MP3");
        }
        mp3 = readFileSync(mp3Path);
      } catch (error) {
        try {
          rmSync(mp3Path, { force: true });
        } catch {
        }
        if (error instanceof ValidationError || error instanceof ConflictError) {
          throw new ConflictError("MP3 \u043D\u0435 \u0441\u043E\u0431\u0440\u0430\u043D: ffmpeg \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043F\u0440\u0438\u0433\u043E\u0434\u043D\u044B\u0439 \u0444\u0430\u0439\u043B");
        }
        throw error;
      }
      job.mp3 = { file: `${id}.mp3`, bytes: mp3.length, sha256: createHash2("sha256").update(mp3).digest("hex") };
      writeFileSync(join2(jobsDir(), `${id}.json`), JSON.stringify(job, null, 2));
      ctx.log.info("MP3 \u0441\u043E\u0431\u0440\u0430\u043D \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u043C ffmpeg", { job: id, bytes: job.mp3.bytes });
      return { headers: { "cache-control": "no-store" }, body: { ok: true, job } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
