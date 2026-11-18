import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/three-d-studio/index.ts
import { readFileSync as readFileSync2 } from "node:fs";

// src/app/game-builder.ts
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// team-host-api:src/domain/three-d/game-level.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var GAME_LEVEL_FORMAT = host2["GAME_LEVEL_FORMAT"];
var parseGameLevel = host2["parseGameLevel"];

// team-host-api:src/domain/three-d/game-html.ts
var host3 = globalThis["__teamPlatformHostApi"] ?? {};
var GAME_STYLE = host3["GAME_STYLE"];
var renderGameHtml = host3["renderGameHtml"];
var renderGameScript = host3["renderGameScript"];

// team-host-api:src/domain/three-d/glb.ts
var host4 = globalThis["__teamPlatformHostApi"] ?? {};
var parseGlb = host4["parseGlb"];

// team-host-api:src/domain/three-d/scene-script.ts
var host5 = globalThis["__teamPlatformHostApi"] ?? {};
var buildSceneScript = host5["buildSceneScript"];
var verifySceneScript = host5["verifySceneScript"];

// src/app/game-builder.ts
var ID_PATTERN = /^game-[a-z0-9][a-z0-9-]{3,63}$/;
var BUILD_TIMEOUT_MS = 18e4;
var VERIFY_TIMEOUT_MS = 6e4;
function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function artifact(root, path) {
  const stats = statSync(path);
  if (!stats.isFile() || stats.size === 0) {
    throw new UpstreamError(`\u0424\u0430\u0439\u043B \u0438\u0433\u0440\u044B \u043F\u0443\u0441\u0442 \u0438\u043B\u0438 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0444\u0430\u0439\u043B\u043E\u043C: ${path}`, { path });
  }
  return {
    path,
    relative_path: relative(root, path).split("\\").join("/"),
    bytes: stats.size,
    sha256: sha256File(path)
  };
}
function markerObject(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new UpstreamError("Blender \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u043A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u044E \u0441\u0431\u043E\u0440\u043A\u0438 \u0438\u0433\u0440\u044B", { kind: "blender_contract" });
  }
  return raw;
}
function count(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}
function reason(stdout, stderr) {
  const lines = `${stderr}
${stdout}`.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return (lines.at(-1) ?? "Blender \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439 \u0431\u0435\u0437 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u044F").slice(0, 500);
}
var ThreeDGameBuilder = class {
  #root;
  #blender;
  #now;
  #idFactory;
  constructor(options) {
    this.#root = resolve(options.root);
    this.#blender = options.blender;
    this.#now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.#idFactory = options.idFactory ?? (() => `game-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`);
  }
  /** Собирает игру по карточке; возвращает запись только после проверки сцены. */
  async build(input) {
    const taskId = typeof input.task_id === "string" ? input.task_id.trim() : "";
    if (!taskId) throw new ValidationError("\u0421\u0431\u043E\u0440\u043A\u0430 \u0438\u0433\u0440\u044B \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0443 \u0441 \u0434\u043E\u0441\u043A\u0438", { reason: "task_id_missing" });
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) throw new ValidationError("\u0423 \u0437\u0430\u0434\u0430\u0447\u0438 \u043D\u0435\u0442 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F: \u0438\u0433\u0440\u0443 \u043D\u0435 \u0438\u0437 \u0447\u0435\u0433\u043E \u0441\u0442\u0440\u043E\u0438\u0442\u044C", { reason: "title_missing" });
    const id = this.#idFactory();
    if (!ID_PATTERN.test(id)) {
      throw new ValidationError(`\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 id \u0441\u0431\u043E\u0440\u043A\u0438 \xAB${id}\xBB`);
    }
    const dir = this.#gameDir(id);
    mkdirSync(dir, { recursive: true });
    const created = await this.#blender.runPython(
      buildSceneScript({ title, outDir: dir }),
      { timeoutMs: BUILD_TIMEOUT_MS }
    );
    if (!created.ok) {
      throw new UpstreamError(`Blender \u043D\u0435 \u0441\u043E\u0431\u0440\u0430\u043B \u0438\u0433\u0440\u0443: ${reason(created.stdout, created.stderr)}`, {
        kind: "blender_failed",
        game_id: id,
        stderr_tail: created.stderr.slice(-1200)
      });
    }
    const receipt = markerObject(created.data);
    if (receipt.ok !== true) {
      throw new UpstreamError("Blender \u0432\u0435\u0440\u043D\u0443\u043B \u043A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u044E \u0431\u0435\u0437 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0439 \u0441\u0446\u0435\u043D\u044B", {
        kind: "blender_failed",
        game_id: id
      });
    }
    const levelPath = join(dir, "level.json");
    const blendPath = join(dir, "scene.blend");
    const meshPath = join(dir, "scene.glb");
    const previewPath = join(dir, "preview.png");
    let level;
    try {
      level = parseGameLevel(JSON.parse(readFileSync(levelPath, "utf8")));
    } catch (error) {
      if (error instanceof UpstreamError || error instanceof ValidationError) throw error;
      throw new UpstreamError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D: ${String(error)}`, {
        kind: "level_invalid",
        game_id: id
      });
    }
    if (!existsSync(blendPath)) {
      throw new UpstreamError("Blender \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B \u0441\u0446\u0435\u043D\u0443 `.blend`", { kind: "artifact_missing", game_id: id });
    }
    if (!existsSync(previewPath) || statSync(previewPath).size === 0) {
      throw new UpstreamError("Blender \u043D\u0435 \u043E\u0442\u0440\u0435\u043D\u0434\u0435\u0440\u0438\u043B \u043F\u0440\u0435\u0432\u044C\u044E \u0443\u0440\u043E\u0432\u043D\u044F", {
        kind: "preview_missing",
        preview_error: String(receipt.preview_error ?? ""),
        game_id: id
      });
    }
    if (level.coins.length !== count(receipt.coins)) {
      throw new UpstreamError("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u0441\u0446\u0435\u043D\u0430 Blender \u0440\u0430\u0441\u0445\u043E\u0434\u044F\u0442\u0441\u044F \u043F\u043E \u0447\u0438\u0441\u043B\u0443 \u043C\u043E\u043D\u0435\u0442", {
        kind: "level_invalid",
        level_coins: level.coins.length,
        scene_coins: count(receipt.coins),
        game_id: id
      });
    }
    const mesh = this.#readMesh(meshPath, level, id);
    const evidence = await this.#verifyScene(blendPath, level, id, mesh);
    const gamePath = join(dir, "game.html");
    const scriptPath = join(dir, "game.js");
    const stylePath = join(dir, "game.css");
    const gameLevel = { ...level, title };
    writeFileSync(gamePath, renderGameHtml(gameLevel), "utf8");
    writeFileSync(scriptPath, renderGameScript(), "utf8");
    writeFileSync(stylePath, GAME_STYLE, "utf8");
    const record = {
      id,
      task_id: taskId,
      title,
      built_at: this.#now().toISOString(),
      level,
      artifacts: {
        blend: artifact(this.#root, blendPath),
        mesh: artifact(this.#root, meshPath),
        level: artifact(this.#root, levelPath),
        preview: artifact(this.#root, previewPath),
        game: artifact(this.#root, gamePath),
        script: artifact(this.#root, scriptPath),
        style: artifact(this.#root, stylePath)
      },
      evidence
    };
    writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(record, null, 2)}
`, "utf8");
    return record;
  }
  /** Повторная проверка уже собранного `.blend`: сцена и её сетка должны быть на месте. */
  async verify(id) {
    const record = this.get(id);
    const mesh = this.#readMesh(record.artifacts.mesh.path, record.level, id);
    return this.#verifyScene(record.artifacts.blend.path, record.level, id, mesh);
  }
  /**
   * Сетка — то, что рисует игра, поэтому проверяется до записи игры: настоящий
   * GLB и в нём каждый узел, который называет уровень.
   */
  #readMesh(path, level, id) {
    if (!existsSync(path)) {
      throw new UpstreamError("Blender \u043D\u0435 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0441\u0435\u0442\u043A\u0443 \u0443\u0440\u043E\u0432\u043D\u044F `scene.glb`", {
        kind: "artifact_missing",
        game_id: id
      });
    }
    let scene;
    try {
      scene = parseGlb(new Uint8Array(readFileSync(path)));
    } catch (error) {
      throw new UpstreamError(
        `\u0421\u0435\u0442\u043A\u0430 \u0438\u0433\u0440\u044B \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u0430: ${error instanceof Error ? error.message : String(error)}`,
        { kind: "mesh_invalid", game_id: id }
      );
    }
    const meshed = new Set(scene.nodes.filter((node) => node.has_mesh).map((node) => node.name));
    const missing = [.../* @__PURE__ */ new Set([...level.coins.map((coin) => coin.node), level.goal.node])].filter((name) => !meshed.has(name));
    if (missing.length) {
      throw new UpstreamError(`\u0412 \u0441\u0435\u0442\u043A\u0435 Blender \u043D\u0435\u0442 \u0443\u0437\u043B\u043E\u0432 \u0443\u0440\u043E\u0432\u043D\u044F: ${missing.join(", ")}`, {
        kind: "mesh_invalid",
        game_id: id,
        missing
      });
    }
    return scene;
  }
  get(id) {
    if (!ID_PATTERN.test(id)) throw new ValidationError(`\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 id \u0441\u0431\u043E\u0440\u043A\u0438 \xAB${id}\xBB`);
    const file = join(this.#gameDir(id), "manifest.json");
    if (!existsSync(file)) throw new NotFoundError(`\u0421\u0431\u043E\u0440\u043A\u0430 \u0438\u0433\u0440\u044B \xAB${id}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    try {
      return JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      throw new UpstreamError(`\u041C\u0430\u043D\u0438\u0444\u0435\u0441\u0442 \u0438\u0433\u0440\u044B \xAB${id}\xBB \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D: ${String(error)}`, { game_id: id });
    }
  }
  list() {
    const gamesRoot = join(this.#root, "games");
    if (!existsSync(gamesRoot)) return [];
    const records = [];
    for (const entry of readdirSync(gamesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !ID_PATTERN.test(entry.name)) continue;
      const file = join(gamesRoot, entry.name, "manifest.json");
      if (!existsSync(file)) continue;
      try {
        records.push(JSON.parse(readFileSync(file, "utf8")));
      } catch {
      }
    }
    return records.sort((left, right) => right.built_at.localeCompare(left.built_at));
  }
  async #verifyScene(blendPath, level, id, mesh) {
    const reopened = await this.#blender.runPython(verifySceneScript(), {
      openFile: blendPath,
      timeoutMs: VERIFY_TIMEOUT_MS
    });
    if (!reopened.ok) {
      throw new UpstreamError(`\u0421\u0446\u0435\u043D\u0430 \u0438\u0433\u0440\u044B \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u043B\u0430\u0441\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E: ${reason(reopened.stdout, reopened.stderr)}`, {
        kind: "game_verification_failed",
        game_id: id
      });
    }
    const data = markerObject(reopened.data);
    const kinds = data.kinds ?? {};
    const coins = count(kinds.coin);
    const goal = count(kinds.goal) > 0;
    const spawn = count(kinds.spawn) > 0;
    const floor = count(kinds.floor) > 0;
    const walls = count(kinds.wall);
    const checks = [];
    if (coins !== level.coins.length) {
      throw new UpstreamError(
        `\u0412 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0439 \u0441\u0446\u0435\u043D\u0435 ${coins} \u043C\u043E\u043D\u0435\u0442, \u0430 \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u043E\u0431\u0435\u0449\u0430\u0435\u0442 ${level.coins.length}`,
        { kind: "game_verification_failed", game_id: id, coins, level_coins: level.coins.length }
      );
    }
    checks.push(`\u043C\u043E\u043D\u0435\u0442\u044B: ${coins}`);
    if (!goal) {
      throw new UpstreamError("\u0412 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0439 \u0441\u0446\u0435\u043D\u0435 \u043D\u0435\u0442 \u0446\u0435\u043B\u0438", { kind: "game_verification_failed", game_id: id });
    }
    checks.push("\u0446\u0435\u043B\u044C \u043D\u0430 \u043C\u0435\u0441\u0442\u0435");
    if (!spawn) {
      throw new UpstreamError("\u0412 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0439 \u0441\u0446\u0435\u043D\u0435 \u043D\u0435\u0442 \u0442\u043E\u0447\u043A\u0438 \u0441\u0442\u0430\u0440\u0442\u0430 \u0438\u0433\u0440\u043E\u043A\u0430", {
        kind: "game_verification_failed",
        game_id: id
      });
    }
    checks.push("\u0441\u0442\u0430\u0440\u0442 \u0438\u0433\u0440\u043E\u043A\u0430 \u043D\u0430 \u043C\u0435\u0441\u0442\u0435");
    if (!floor || !walls) {
      throw new UpstreamError("\u0412 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0439 \u0441\u0446\u0435\u043D\u0435 \u043D\u0435\u0442 \u043F\u043E\u043B\u0430 \u0438\u043B\u0438 \u0433\u0440\u0430\u043D\u0438\u0446 \u0430\u0440\u0435\u043D\u044B", {
        kind: "game_verification_failed",
        game_id: id
      });
    }
    checks.push(`\u0441\u0442\u0435\u043D\u044B: ${walls}`);
    const version = String(data.version ?? "").trim();
    if (!version.startsWith(level.engine.version.split(" ")[0] ?? "")) {
      throw new UpstreamError("\u0421\u0446\u0435\u043D\u0443 \u043E\u0442\u043A\u0440\u044B\u043B \u0434\u0440\u0443\u0433\u043E\u0439 Blender, \u0447\u0435\u043C \u0442\u043E\u0442, \u0447\u0442\u043E \u0435\u0451 \u0441\u043E\u0431\u0440\u0430\u043B", {
        kind: "game_verification_failed",
        built_with: level.engine.version,
        reopened_with: version || null,
        game_id: id
      });
    }
    checks.push(`\u0434\u0432\u0438\u0436\u043E\u043A: ${version}`);
    checks.push(`\u0441\u0435\u0442\u043A\u0430: ${mesh.triangles} \u0442\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u043E\u0432, ${mesh.nodes.length} \u0443\u0437\u043B\u043E\u0432`);
    return {
      engine: `${level.engine.name} ${version}`,
      objects: count(data.objects),
      coins,
      player_spawn: spawn,
      goal,
      reopened: true,
      mesh_triangles: mesh.triangles,
      checks
    };
  }
  #gameDir(id) {
    return join(this.#root, "games", id);
  }
};

// src/adapters/blender/cli.ts
import { execFile } from "node:child_process";
import { existsSync as existsSync2, readdirSync as readdirSync2 } from "node:fs";
import { join as join2 } from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var RESULT_MARKER = "TEAM_PLATFORM_RESULT:";
var VENDOR_DIR = "Blender Foundation";
function versionKey(name) {
  const match = /^Blender\s+(\d+)\.(\d+)/i.exec(name.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}
function newestUnder(base) {
  let names;
  try {
    names = readdirSync2(base);
  } catch {
    return null;
  }
  const ranked = names.map((name) => ({ name, key: versionKey(name) })).filter((entry) => entry.key !== null).sort((a, b) => b.key.major - a.key.major || b.key.minor - a.key.minor);
  for (const entry of ranked) {
    const candidate = join2(base, entry.name, "blender.exe");
    if (existsSync2(candidate)) return candidate;
  }
  return null;
}
function parseBlenderVersion(output) {
  const match = /Blender\s+(\d+)\.(\d+)(?:\.(\d+))?\s*(.*)/i.exec(output);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = match[3] === void 0 ? 0 : Number(match[3]);
  const label = `${major}.${minor}.${patch}${match[4] ? ` ${match[4].trim()}` : ""}`.trim();
  return { major, minor, patch, label, raw: output.split(/\r?\n/)[0]?.trim() ?? "" };
}
function extractResult(stdout) {
  const lines = stdout.split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index] ?? "";
    const at = line.indexOf(RESULT_MARKER);
    if (at < 0) continue;
    const payload = line.slice(at + RESULT_MARKER.length).trim();
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return null;
}
var BlenderCli = class _BlenderCli {
  #cliPath;
  #cwd;
  #timeoutMs;
  #log;
  #runner;
  constructor(options = {}) {
    this.#cliPath = options.cliPath === void 0 ? _BlenderCli.findExecutable() : options.cliPath;
    this.#cwd = options.cwd ?? process.cwd();
    this.#timeoutMs = options.timeoutMs ?? 12e4;
    this.#log = options.log ?? null;
    this.#runner = options.runner ?? (async (command, args, optionsValue) => {
      const result = await execFileAsync(command, args, optionsValue);
      return { stdout: String(result.stdout), stderr: String(result.stderr) };
    });
  }
  /**
   * Порядок поиска: явная переменная окружения, вендорный каталог (Windows),
   * стандартные пути (macOS/Linux). Дальше — null, и вызывающий решает, что делать.
   */
  static findExecutable(env = process.env, platform = process.platform) {
    const explicit = (env.BLENDER_EXECUTABLE ?? env.TEAM_BLENDER_EXECUTABLE ?? "").trim();
    if (explicit && existsSync2(explicit)) return explicit;
    if (platform === "win32") {
      const programFiles = env.ProgramFiles ?? env["ProgramFiles(x86)"];
      const bases = [
        programFiles ? join2(programFiles, VENDOR_DIR) : null,
        `C:\\Program Files\\${VENDOR_DIR}`,
        `C:\\Program Files (x86)\\${VENDOR_DIR}`
      ].filter((value) => typeof value === "string");
      for (const base of bases) {
        const found = newestUnder(base);
        if (found) return found;
      }
      return null;
    }
    const candidates = [
      "/usr/bin/blender",
      "/usr/local/bin/blender",
      "/Applications/Blender.app/Contents/MacOS/Blender"
    ];
    for (const candidate of candidates) {
      if (existsSync2(candidate)) return candidate;
    }
    return null;
  }
  get cliPath() {
    return this.#cliPath;
  }
  /** Версия из `blender --version`. Ошибки пути и таймаута — UpstreamError. */
  async version(timeoutMs = 3e4) {
    const output = await this.#run(["--version"], timeoutMs);
    const parsed = parseBlenderVersion(output);
    if (!parsed) {
      throw new UpstreamError("Blender \u0432\u0435\u0440\u043D\u0443\u043B \u0432\u0435\u0440\u0441\u0438\u044E \u0432 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435", { cli_path: this.#cliPath });
    }
    return parsed;
  }
  /**
   * Headless-запуск Python: `--background --factory-startup --python-expr`.
   * С открытым файлом (`openFile`) вместо `--factory-startup` передаётся файл:
   * так проверяется уже сохранённая сцена, а не пустой стартовый профиль.
   * Скрипт передаётся одним аргументом, поэтому кавычки не нужны.
   * Ненулевой код возврата — данные (`ok: false`), а не исключение: упавший
   * рендер должен быть виден в очереди, а не падать стеком.
   */
  async runPython(script, options = {}) {
    if (!script.trim()) throw new UpstreamError("\u041F\u0443\u0441\u0442\u043E\u0439 \u0441\u043A\u0440\u0438\u043F\u0442 Blender \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F");
    const cliPath = this.#requirePath();
    const started = Date.now();
    let stdout;
    let stderr = "";
    let ok = true;
    try {
      const result = await this.#runner(
        cliPath,
        options.openFile ? ["--background", options.openFile, "--python-expr", script] : ["--background", "--factory-startup", "--python-expr", script],
        {
          cwd: this.#cwd,
          timeout: options.timeoutMs ?? this.#timeoutMs,
          maxBuffer: 16 * 1024 * 1024,
          windowsHide: true
        }
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      const details = error;
      if (details.code === "ENOENT") {
        throw new UpstreamError(`Blender \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${this.#cliPath ?? "\u043F\u0443\u0442\u044C \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D"}`, {
          cli_path: this.#cliPath,
          kind: "blender_missing"
        });
      }
      if (details.killed || details.signal) {
        throw new UpstreamError(`Blender \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 \u043E\u0442\u0432\u0435\u0434\u0451\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F`, {
          cli_path: this.#cliPath,
          timeout_ms: options.timeoutMs ?? this.#timeoutMs,
          kind: "blender_timeout"
        });
      }
      stdout = String(details.stdout ?? "");
      stderr = String(details.stderr ?? "");
      ok = false;
    }
    const durationMs = Date.now() - started;
    this.#log?.debug("Blender \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0441\u043A\u0440\u0438\u043F\u0442", { ok, duration_ms: durationMs });
    return { ok, stdout, stderr, durationMs, data: extractResult(stdout) };
  }
  #requirePath() {
    if (!this.#cliPath) {
      throw new UpstreamError("Blender \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 BLENDER_EXECUTABLE \u0438\u043B\u0438 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 Blender", {
        cli_path: null,
        kind: "blender_missing"
      });
    }
    return this.#cliPath;
  }
  async #run(args, timeoutMs) {
    const cliPath = this.#requirePath();
    try {
      const result = await this.#runner(cliPath, args, {
        cwd: this.#cwd,
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true
      });
      return `${result.stdout}
${result.stderr}`.trim();
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      const details = error;
      if (details.code === "ENOENT") {
        throw new UpstreamError(`Blender \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${cliPath}`, { cli_path: cliPath, kind: "blender_missing" });
      }
      if (details.killed || details.signal) {
        throw new UpstreamError(`Blender \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${timeoutMs} \u043C\u0441`, {
          cli_path: cliPath,
          timeout_ms: timeoutMs,
          kind: "blender_timeout"
        });
      }
      const stderr = (details.stderr ?? "").trim();
      throw new UpstreamError(`Blender: ${(stderr || details.message || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430").slice(0, 500)}`, {
        cli_path: cliPath
      });
    }
  }
};

// modules/three-d-studio/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>3D-\u0441\u0442\u0443\u0434\u0438\u044F</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font: 14px/1.45 system-ui, "Segoe UI", sans-serif; color: #e8eef8; background: #0d1117; }
  h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: 0.2px; }
  h2 { margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 1.1px; color: #94a3b8; }
  p { margin: 0; }
  .sub { color: #94a3b8; max-width: 760px; }
  .note { margin-top: 12px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(242, 181, 68, 0.35); background: rgba(242, 181, 68, 0.08); color: #ffd591; max-width: 820px; }
  .bar { display: flex; align-items: center; gap: 10px; margin: 20px 0 10px; }
  .bar h2 { margin: 0; }
  .spacer { flex: 1; }
  button, .button { font: inherit; font-weight: 600; padding: 7px 13px; border-radius: 9px; border: 1px solid #2b3a4d; background: #16202b; color: #e8eef8; cursor: pointer; text-decoration: none; display: inline-block; }
  button:hover, .button:hover { border-color: #3f8cff; }
  button:disabled { opacity: 0.55; cursor: progress; }
  .button.play { border-color: #2f8f6d; background: #1b5e47; color: #eafff6; }
  .list { display: grid; gap: 8px; }
  .task, .game { border: 1px solid #223041; border-radius: 12px; background: #121a24; padding: 12px 14px; }
  .task { display: flex; align-items: center; gap: 12px; }
  .task .title { flex: 1; min-width: 0; }
  .task .title strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { color: #8493a8; font-size: 12px; }
  .game { display: grid; grid-template-columns: 150px 1fr; gap: 14px; }
  .game img { width: 150px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid #223041; background: #0b0e14; }
  .game .body { min-width: 0; display: grid; gap: 6px; }
  .game .title { font-size: 16px; font-weight: 650; }
  .checks { color: #7ee2b8; font-size: 12px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
  .empty { color: #8493a8; padding: 14px; border: 1px dashed #2b3a4d; border-radius: 12px; }
  #status { min-height: 22px; margin-top: 14px; color: #9fb0c6; }
  #status.error { color: #ff9b9b; }
  #status.ok { color: #7ee2b8; }
  .engine { color: #6f7c90; font-size: 12px; }
</style>
</head>
<body>
  <h1>3D-\u0441\u0442\u0443\u0434\u0438\u044F</h1>
  <p class="sub">\u0412\u043E\u0437\u044C\u043C\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0441 \u0434\u043E\u0441\u043A\u0438 \u2014 Blender \u0441\u043E\u0431\u0435\u0440\u0451\u0442 \u0441\u0446\u0435\u043D\u0443, \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442 <code>.blend</code>, \u0430 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u043E\u0435\u0442 \u0435\u0451 \u0438 \u043E\u0442\u0434\u0430\u0441\u0442 \u0433\u043E\u0442\u043E\u0432\u0443\u044E \u0438\u0433\u0440\u0443. \u0423\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A <code>demo</code> \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0434\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442: \u043E\u043D \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0444\u0430\u0439\u043B\u043E\u0432.</p>
  <div class="note">\u0418\u0433\u0440\u0430 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0433\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u0441\u0446\u0435\u043D\u044B: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u043C\u043E\u043D\u0435\u0442\u044B, \u0446\u0435\u043B\u044C \u0438 \u0442\u043E\u0447\u043A\u0430 \u0441\u0442\u0430\u0440\u0442\u0430. \u0415\u0441\u043B\u0438 Blender \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0438\u043B\u0438 \u0441\u0446\u0435\u043D\u0430 \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u043B\u0430\u0441\u044C, \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043D\u0435 \u0431\u0443\u0434\u0435\u0442 \u2014 \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u0438\u0447\u0438\u043D\u0430.</div>

  <div class="bar">
    <h2>\u0417\u0430\u0434\u0430\u0447\u0438 \u043D\u0430 \u0434\u043E\u0441\u043A\u0435</h2>
    <span class="spacer"></span>
    <button type="button" id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button>
  </div>
  <div class="list" id="tasks"><div class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0437\u0430\u0434\u0430\u0447\u2026</div></div>

  <div class="bar">
    <h2>\u0421\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u044B</h2>
    <span class="spacer"></span>
  </div>
  <div class="list" id="games"><div class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0431\u043E\u0440\u043E\u043A\u2026</div></div>

  <div id="status" role="status" aria-live="polite"></div>

<script>
(function () {
  'use strict';

  var tasksNode = document.getElementById('tasks');
  var gamesNode = document.getElementById('games');
  var statusNode = document.getElementById('status');
  var refresh = document.getElementById('refresh');
  var busy = false;

  function el(name, className, text) {
    var node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function say(text, kind) {
    statusNode.textContent = text || '';
    statusNode.className = kind || '';
  }

  function request(path, init) {
    return fetch(path, {
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      ...(init || {})
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          var message = body && body.error && body.error.message ? body.error.message : 'HTTP ' + response.status;
          throw new Error(message);
        }
        return body;
      });
    });
  }

  function renderTasks(items) {
    tasksNode.textContent = '';
    var open = items.filter(function (task) {
      return task.status !== 'done' && task.status !== 'cancelled';
    });
    if (!open.length) {
      tasksNode.appendChild(el('div', 'empty', '\u041D\u0430 \u0434\u043E\u0441\u043A\u0435 \u043D\u0435\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u2014 \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u0418\u0433\u0440\u0430: \u0441\u043E\u0431\u0435\u0440\u0438 \u0442\u0440\u0438 \u043C\u043E\u043D\u0435\u0442\u044B\xBB.'));
      return;
    }
    open.slice(0, 12).forEach(function (task) {
      var row = el('div', 'task');
      var title = el('div', 'title');
      title.appendChild(el('strong', '', task.title));
      title.appendChild(el('span', 'meta', '\u0421\u0442\u0430\u0442\u0443\u0441: ' + task.status + (task.assignee ? ' \xB7 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C: ' + task.assignee : '')));
      var build = el('button', '', '\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0438\u0433\u0440\u0443');
      build.type = 'button';
      build.addEventListener('click', function () { buildGame(task, build); });
      row.appendChild(title);
      row.appendChild(build);
      tasksNode.appendChild(row);
    });
  }

  function renderGames(games) {
    gamesNode.textContent = '';
    if (!games.length) {
      gamesNode.appendChild(el('div', 'empty', '\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u0438\u0433\u0440\u044B. \u0421\u043E\u0431\u0435\u0440\u0438\u0442\u0435 \u0435\u0451 \u0438\u0437 \u0437\u0430\u0434\u0430\u0447\u0438 \u0432\u044B\u0448\u0435 \u2014 \u044D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434.'));
      return;
    }
    games.forEach(function (game) {
      var card = el('div', 'game');
      var image = document.createElement('img');
      image.src = game.preview_url;
      image.alt = '\u041F\u0440\u0435\u0432\u044C\u044E \u0443\u0440\u043E\u0432\u043D\u044F \xAB' + game.title + '\xBB';
      image.loading = 'lazy';
      var body = el('div', 'body');
      body.appendChild(el('div', 'title', game.title));
      body.appendChild(el('div', 'meta', '\u0417\u0430\u0434\u0430\u0447\u0430 ' + game.task_id + ' \xB7 ' + game.evidence.coins + ' \u043C\u043E\u043D\u0435\u0442 \xB7 ' + game.evidence.objects + ' \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432'));
      body.appendChild(el('div', 'checks', '\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E: ' + game.evidence.checks.join(' \xB7 ')));
      body.appendChild(el('div', 'engine', '\u0414\u0432\u0438\u0436\u043E\u043A: ' + game.evidence.engine + ' \xB7 sha256 ' + game.artifacts.blend.sha256.slice(0, 16) + '\u2026'));
      var actions = el('div', 'actions');
      var play = el('a', 'button play', '\u0418\u0433\u0440\u0430\u0442\u044C');
      play.href = game.play_url;
      play.target = '_blank';
      play.rel = 'noopener';
      var verify = el('button', '', '\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043D\u043E\u0432\u0430');
      verify.type = 'button';
      verify.addEventListener('click', function () { verifyGame(game, verify); });
      actions.appendChild(play);
      actions.appendChild(verify);
      body.appendChild(actions);
      card.appendChild(image);
      card.appendChild(body);
      gamesNode.appendChild(card);
    });
  }

  function load() {
    if (busy) return;
    say('\u0427\u0438\u0442\u0430\u044E \u0434\u043E\u0441\u043A\u0443 \u0438 \u0441\u0431\u043E\u0440\u043A\u0438\u2026');
    Promise.all([request('/api/tasks?limit=40'), request('/api/tools/three-d/games')])
      .then(function (values) {
        renderTasks(values[0].items || []);
        renderGames(values[1].games || []);
        say('');
      })
      .catch(function (error) { say(error.message, 'error'); });
  }

  function buildGame(task, button) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    say('Blender \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442 \u0441\u0446\u0435\u043D\u0443 \u043F\u043E \u0437\u0430\u0434\u0430\u0447\u0435 \xAB' + task.title + '\xBB\u2026');
    request('/api/tools/three-d/games', { method: 'POST', body: JSON.stringify({ task_id: task.id }) })
      .then(function (body) {
        say('\u0418\u0433\u0440\u0430 \u0441\u043E\u0431\u0440\u0430\u043D\u0430 \u0438 \u0441\u0446\u0435\u043D\u0430 \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u0430: ' + body.game.evidence.checks.join(', ') + '.', 'ok');
        return true;
      })
      .catch(function (error) {
        say('\u0418\u0433\u0440\u0430 \u043D\u0435 \u0441\u043E\u0431\u0440\u0430\u043D\u0430: ' + error.message, 'error');
        return false;
      })
      .then(function (built) {
        busy = false;
        button.disabled = false;
        if (built) load();
      });
  }

  function verifyGame(game, button) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    say('\u041F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E \u0441\u0446\u0435\u043D\u0443 \xAB' + game.title + '\xBB \u0432 Blender\u2026');
    request('/api/tools/three-d/games/' + encodeURIComponent(game.id) + '/verify', { method: 'POST', body: '{}' })
      .then(function (body) {
        say('\u0421\u0446\u0435\u043D\u0430 \u043E\u0442\u043A\u0440\u044B\u043B\u0430\u0441\u044C \u0441\u043D\u043E\u0432\u0430: ' + body.evidence.checks.join(' \xB7 ') + '.', 'ok');
      })
      .catch(function (error) { say('\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430: ' + error.message, 'error'); })
      .then(function () { busy = false; button.disabled = false; });
  }

  refresh.addEventListener('click', load);
  load();
})();
</script>
</body>
</html>
`;

// modules/three-d-studio/index.ts
var BASE = "/api/tools/three-d/games";
function bodyOf(raw) {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
}
var module = {
  id: "three-d-studio",
  apiVersion: 1,
  register(ctx) {
    const { tasks } = ctx.require("tasks");
    const builder = new ThreeDGameBuilder({
      root: ctx.paths.data,
      blender: new BlenderCli({ cwd: ctx.paths.data })
    });
    const view = (game) => ({
      ...game,
      play_url: `${BASE}/${game.id}/play`,
      preview_url: `${BASE}/${game.id}/preview`
    });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", BASE, () => ({
      headers: { "cache-control": "no-store" },
      body: { games: builder.list().map(view) }
    }));
    ctx.api.add("POST", BASE, async (request) => {
      const body = bodyOf(request.body);
      const taskId = typeof body.task_id === "string" ? body.task_id.trim() : "";
      if (!taskId) {
        throw new ValidationError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0441 \u0434\u043E\u0441\u043A\u0438: \u0438\u0433\u0440\u0430 \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u043F\u043E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435", {
          reason: "task_id_missing",
          field: "task_id"
        });
      }
      const task = tasks.get(taskId).task;
      const game = await builder.build({ task_id: task.id, title: task.title });
      ctx.log.info("\u0418\u0433\u0440\u0430 \u0441\u043E\u0431\u0440\u0430\u043D\u0430 \u0438\u0437 \u0437\u0430\u0434\u0430\u0447\u0438", {
        game: game.id,
        task: task.id,
        blend_sha256: game.artifacts.blend.sha256.slice(0, 12),
        engine: game.evidence.engine
      });
      return { status: 201, body: { game: view(game) } };
    });
    ctx.api.add("GET", `${BASE}/:id`, (request) => ({
      headers: { "cache-control": "no-store" },
      body: { game: view(builder.get(request.params.id ?? "")) }
    }));
    ctx.api.add("POST", `${BASE}/:id/verify`, async (request) => {
      const id = request.params.id ?? "";
      builder.get(id);
      const evidence = await builder.verify(id);
      return {
        headers: { "cache-control": "no-store" },
        body: { game_id: id, evidence }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/play`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync2(game.artifacts.game.path),
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/game.js`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync2(game.artifacts.script.path),
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/game.css`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync2(game.artifacts.style.path),
        headers: {
          "content-type": "text/css; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/mesh.glb`, (request) => {
      const game = builder.get(request.params.id ?? "");
      const mesh = game.artifacts.mesh;
      if (!mesh) throw new NotFoundError(`\u0423 \u0441\u0431\u043E\u0440\u043A\u0438 \xAB${game.id}\xBB \u043D\u0435\u0442 \u0441\u0435\u0442\u043A\u0438`);
      return {
        raw: readFileSync2(mesh.path),
        headers: {
          "content-type": "model/gltf-binary",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
    ctx.api.add("GET", `${BASE}/:id/preview`, (request) => {
      const game = builder.get(request.params.id ?? "");
      return {
        raw: readFileSync2(game.artifacts.preview.path),
        headers: {
          "content-type": "image/png",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
