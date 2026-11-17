import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/three-d-studio/index.ts
import { readFileSync as readFileSync2 } from "node:fs";

// src/app/game-builder.ts
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

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
var NotFoundError = class extends AppError {
  /** Детали необязательны: старые вызовы без них продолжают работать. */
  constructor(message = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", details = {}) {
    super("not_found", message, 404, details);
  }
};
var UpstreamError = class extends AppError {
  constructor(message, details = {}) {
    super("upstream_error", message, 502, details);
  }
};

// src/domain/three-d/game-level.ts
var GAME_LEVEL_FORMAT = "team-platform-3d-game/2";
function finite(raw, field) {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new ValidationError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0447\u0438\u0441\u043B\u043E\u043C`, { field });
  }
  return raw;
}
function text(raw, field) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043D\u0435\u043F\u0443\u0441\u0442\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u043E\u0439`, { field });
  }
  return raw.trim();
}
function point(raw, field) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0442\u043E\u0447\u043A\u043E\u0439`, { field });
  }
  const input = raw;
  return { x: finite(input.x, `${field}.x`), z: finite(input.z, `${field}.z`) };
}
function list(raw, field, map) {
  if (!Array.isArray(raw)) {
    throw new ValidationError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C`, { field });
  }
  return raw.map(map);
}
function record(raw, field) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043D\u0435\u0442 \u043F\u043E\u043B\u044F \xAB${field}\xBB`, { field });
  }
  return raw;
}
function parseGameLevel(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442");
  }
  const input = raw;
  if (text(input.format, "format") !== GAME_LEVEL_FORMAT) {
    throw new ValidationError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043D\u0443\u0436\u0435\u043D \u0444\u043E\u0440\u043C\u0430\u0442 ${GAME_LEVEL_FORMAT}`, {
      format: input.format ?? null
    });
  }
  const engine = record(input.engine, "engine");
  const goalRaw = record(input.goal, "goal");
  const goal = point(goalRaw, "goal");
  const goalRadius = finite(goalRaw.radius, "goal.radius");
  if (goalRadius <= 0) throw new ValidationError("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u0440\u0430\u0434\u0438\u0443\u0441 \u0446\u0435\u043B\u0438 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0443\u043B\u044F");
  const coins = list(input.coins, "coins", (item, index) => ({
    ...point(item, `coins[${index}]`),
    node: text(item.node, `coins[${index}].node`)
  }));
  if (!coins.length) throw new ValidationError("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043C\u043E\u043D\u0435\u0442\u044B", { field: "coins" });
  const walls = list(input.walls, "walls", (item, index) => {
    const wall = point(item, `walls[${index}]`);
    const record2 = item;
    const w = finite(record2.w, `walls[${index}].w`);
    const d = finite(record2.d, `walls[${index}].d`);
    if (w <= 0 || d <= 0) {
      throw new ValidationError(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u0441\u0442\u0435\u043D\u0430 ${index + 1} \u0431\u0435\u0437 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u0432`, { index });
    }
    return { ...wall, w, d };
  });
  if (!walls.length) throw new ValidationError("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B: \u043D\u0435\u0442 \u0433\u0440\u0430\u043D\u0438\u0446 \u0430\u0440\u0435\u043D\u044B", { field: "walls" });
  return {
    format: GAME_LEVEL_FORMAT,
    title: text(input.title, "title"),
    engine: {
      name: text(engine.name, "engine.name"),
      version: text(engine.version, "engine.version")
    },
    spawn: point(input.spawn, "spawn"),
    goal: { ...goal, radius: goalRadius, node: text(goalRaw.node, "goal.node") },
    coins,
    walls,
    built_at: text(input.built_at, "built_at")
  };
}

// src/domain/three-d/game-html.ts
var GAME_STYLE = `:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; background: #0b0e14; }
body { font: 14px/1.4 system-ui, "Segoe UI", sans-serif; color: #e8eef8; }
#view { display: block; width: 100vw; height: 100vh; touch-action: none; }
.hud { position: fixed; top: 18px; left: 18px; display: grid; gap: 6px; max-width: min(460px, 70vw); pointer-events: none; }
.hud h1 { margin: 0; font-size: 18px; font-weight: 650; letter-spacing: 0.2px; }
.hud .coins { font-size: 22px; font-weight: 700; color: #ffd166; }
.hud .hint { color: #9aa7bb; font-size: 13px; }
.hud .status { color: #7ee2b8; font-weight: 600; min-height: 20px; }
.engine { position: fixed; left: 18px; bottom: 16px; color: #6f7c90; font-size: 12px; }
.crosshair { position: fixed; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: rgba(232, 238, 248, 0.55); box-shadow: 0 0 0 1px rgba(0,0,0,0.4); }
.win { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(6, 10, 16, 0.72); backdrop-filter: blur(3px); }
.win[hidden] { display: none; }
.win-card { width: min(420px, 86vw); padding: 26px 24px; border-radius: 18px; border: 1px solid rgba(126, 226, 184, 0.35); background: #121a24; text-align: center; box-shadow: 0 26px 70px rgba(0,0,0,0.5); }
.win-card h2 { margin: 0 0 8px; font-size: 26px; color: #7ee2b8; }
.win-card p { margin: 0 0 18px; color: #b9c5d6; }
.win-card button { font: inherit; font-weight: 650; padding: 10px 18px; border-radius: 10px; border: 1px solid #2f8f6d; background: #1e6f54; color: #eafff6; cursor: pointer; }
.win-card button:hover { background: #248264; }
`;
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderGameHtml(level) {
  const levelJson = JSON.stringify(level).replace(/</g, "\\u003c");
  const title = escapeHtml(level.title);
  const engine = escapeHtml(`${level.engine.name} ${level.engine.version}`);
  const builtAt = escapeHtml(level.built_at);
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="game.css">
</head>
<body>
<canvas id="view" aria-label="\u0418\u0433\u0440\u043E\u0432\u043E\u0435 \u043F\u043E\u043B\u0435"></canvas>
<div class="hud">
  <h1>${title}</h1>
  <div class="coins" id="coins">\u041C\u043E\u043D\u0435\u0442\u044B: 0 / ${level.coins.length}</div>
  <div class="hint">WASD \u2014 \u0438\u0434\u0442\u0438, \u2190/\u2192 \u2014 \u043F\u043E\u0432\u043E\u0440\u043E\u0442. \u0421\u043E\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0441\u0435 \u043C\u043E\u043D\u0435\u0442\u044B \u0438 \u0434\u043E\u0439\u0434\u0438\u0442\u0435 \u0434\u043E \u0437\u0435\u043B\u0451\u043D\u043E\u0439 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0438.</div>
  <div class="status" id="status"></div>
</div>
<div class="crosshair"></div>
<div class="engine">\u0421\u0446\u0435\u043D\u0430: ${engine} \xB7 ${builtAt}</div>
<div class="win" id="win" hidden>
  <div class="win-card">
    <h2>\u041F\u043E\u0431\u0435\u0434\u0430</h2>
    <p id="win-text">\u0412\u0441\u0435 \u043C\u043E\u043D\u0435\u0442\u044B \u0441\u043E\u0431\u0440\u0430\u043D\u044B, \u0446\u0435\u043B\u044C \u0434\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442\u0430.</p>
    <button type="button" id="again">\u0418\u0433\u0440\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430</button>
  </div>
</div>
<script type="application/json" id="level">${levelJson}</script>
<script src="game.js" defer></script>
</body>
</html>
`;
}
function renderGameScript() {
  return `(function () {
  'use strict';

  var level = JSON.parse(document.getElementById('level').textContent);
  var canvas = document.getElementById('view');
  var coinsNode = document.getElementById('coins');
  var statusNode = document.getElementById('status');
  var winNode = document.getElementById('win');
  var winTextNode = document.getElementById('win-text');

  var keys = Object.create(null);
  var state = { x: level.spawn.x, z: level.spawn.z, yaw: 0, taken: [], won: false };
  for (var i = 0; i < level.coins.length; i += 1) state.taken.push(false);

  var gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
  var game = {
    level: level,
    error: null,
    ready: false,
    mesh: null,
    get state() {
      var taken = 0;
      for (var j = 0; j < state.taken.length; j += 1) if (state.taken[j]) taken += 1;
      return {
        x: Math.round(state.x * 1000) / 1000,
        z: Math.round(state.z * 1000) / 1000,
        yaw: Math.round(state.yaw * 1000) / 1000,
        coins: taken,
        total: state.taken.length,
        goal_active: taken === state.taken.length,
        won: state.won,
        keys: Object.keys(keys)
      };
    },
    press: function (code, down) {
      if (down) keys[code] = true; else delete keys[code];
    },
    reset: reset
  };
  window.__threeDGame = game;

  if (!gl) {
    game.error = 'webgl_unavailable';
    statusNode.textContent = '\u041D\u0443\u0436\u0435\u043D WebGL: \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u0434\u0430\u043B 3D-\u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442.';
    return;
  }

  var vertexSource = [
    'attribute vec3 a_pos;',
    'attribute vec3 a_normal;',
    'uniform mat4 u_vp;',
    'uniform mat4 u_model;',
    'varying vec3 v_normal;',
    'void main() {',
    '  v_normal = mat3(u_model) * a_normal;',
    '  gl_Position = u_vp * u_model * vec4(a_pos, 1.0);',
    '}'
  ].join('\\n');
  var fragmentSource = [
    'precision mediump float;',
    'varying vec3 v_normal;',
    'uniform vec3 u_color;',
    'uniform float u_glow;',
    'void main() {',
    '  vec3 n = normalize(v_normal);',
    '  float d = max(dot(n, normalize(vec3(0.42, 0.82, 0.38))), 0.0);',
    '  vec3 lit = u_color * (0.42 + 0.58 * d) + u_color * u_glow;',
    '  gl_FragColor = vec4(lit, 1.0);',
    '}'
  ].join('\\n');

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  var program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    game.error = 'shader_link_failed';
    statusNode.textContent = '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0431\u0440\u0430\u0442\u044C 3D-\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443: ' + gl.getProgramInfoLog(program);
    return;
  }
  gl.useProgram(program);
  var aPos = gl.getAttribLocation(program, 'a_pos');
  var aNormal = gl.getAttribLocation(program, 'a_normal');
  var uVp = gl.getUniformLocation(program, 'u_vp');
  var uModel = gl.getUniformLocation(program, 'u_model');
  var uColor = gl.getUniformLocation(program, 'u_color');
  var uGlow = gl.getUniformLocation(program, 'u_glow');

  // \u0413\u0435\u043E\u043C\u0435\u0442\u0440\u0438\u044F \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u0438\u0437 scene.glb \u2014 \u0442\u043E\u0439 \u0441\u0435\u0442\u043A\u0438, \u0447\u0442\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043B Blender.
  // \u0418\u0433\u0440\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0434\u043E\u0440\u0438\u0441\u043E\u0432\u044B\u0432\u0430\u0435\u0442 \u043E\u0442 \u0441\u0435\u0431\u044F: \u0443\u0437\u043B\u044B, \u0438\u0445 \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435, \u0432\u0435\u0440\u0448\u0438\u043D\u044B \u0438 \u0446\u0432\u0435\u0442\u0430
  // \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0438\u0437 \u0444\u0430\u0439\u043B\u0430 \u0434\u0432\u0438\u0436\u043A\u0430.
  var COMPONENT_BYTES = { 5126: 4, 5125: 4, 5123: 2 };
  var TYPE_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

  function readAccessor(view, json, binStart, index) {
    var accessor = json.accessors[index];
    var bufferView = json.bufferViews[accessor.bufferView];
    var base = binStart + (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    var size = TYPE_SIZES[accessor.type] || 1;
    var code = accessor.componentType;
    var bytes = COMPONENT_BYTES[code];
    if (!bytes) throw new Error('glb_component_' + code);
    var stride = bufferView.byteStride || bytes * size;
    var out = code === 5126
      ? new Float32Array(accessor.count * size)
      : code === 5125
        ? new Uint32Array(accessor.count * size)
        : new Uint16Array(accessor.count * size);
    for (var item = 0; item < accessor.count; item += 1) {
      for (var part = 0; part < size; part += 1) {
        var at = base + item * stride + part * bytes;
        out[item * size + part] = code === 5126
          ? view.getFloat32(at, true)
          : code === 5125
            ? view.getUint32(at, true)
            : view.getUint16(at, true);
      }
    }
    return out;
  }

  function sequential(count) {
    var out = new Uint16Array(count);
    for (var index = 0; index < count; index += 1) out[index] = index;
    return out;
  }

  function flatNormals(count) {
    var out = new Float32Array(count);
    for (var index = 1; index < count; index += 3) out[index] = 1;
    return out;
  }

  function upload(positions, normals, indices) {
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals || flatNormals(positions.length), gl.STATIC_DRAW);
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    return {
      position: positionBuffer,
      normal: normalBuffer,
      index: indexBuffer,
      count: indices.length,
      type: indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
    };
  }

  function nodeMatrix(node) {
    var translation = node.translation || [0, 0, 0];
    var rotation = node.rotation || [0, 0, 0, 1];
    var scale = node.scale || [1, 1, 1];
    var x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
    var x2 = x + x, y2 = y + y, z2 = z + z;
    var xx = x * x2, xy = x * y2, xz = x * z2;
    var yy = y * y2, yz = y * z2, zz = z * z2;
    var wx = w * x2, wy = w * y2, wz = w * z2;
    return new Float32Array([
      (1 - (yy + zz)) * scale[0], (xy + wz) * scale[0], (xz - wy) * scale[0], 0,
      (xy - wz) * scale[1], (1 - (xx + zz)) * scale[1], (yz + wx) * scale[1], 0,
      (xz + wy) * scale[2], (yz - wx) * scale[2], (1 - (xx + yy)) * scale[2], 0,
      translation[0], translation[1], translation[2], 1
    ]);
  }

  function parseGlb(buffer) {
    var view = new DataView(buffer);
    if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('glb_magic');
    if (view.getUint32(4, true) !== 2) throw new Error('glb_version');
    var json = null;
    var binStart = -1;
    var end = Math.min(buffer.byteLength, view.getUint32(8, true));
    for (var offset = 12; offset + 8 <= end;) {
      var length = view.getUint32(offset, true);
      var kind = view.getUint32(offset + 4, true);
      var start = offset + 8;
      if (start + length > buffer.byteLength) throw new Error('glb_chunk');
      if (kind === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, length)).replace(/\\0+$/, ''));
      } else if (kind === 0x004e4942) {
        binStart = start;
      }
      offset = start + length;
    }
    if (!json || binStart < 0) throw new Error('glb_chunk');

    var materials = json.materials || [];
    var nodes = [];
    var triangles = 0;

    function buildNode(source, matrix) {
      var primitives = [];
      var color = [1, 1, 1];
      var glow = 0;
      var mesh = json.meshes[source.mesh];
      for (var p = 0; p < mesh.primitives.length; p += 1) {
        var primitive = mesh.primitives[p];
        if ((primitive.mode === undefined ? 4 : primitive.mode) !== 4) continue;
        var positions = readAccessor(view, json, binStart, primitive.attributes.POSITION);
        var normals = primitive.attributes.NORMAL === undefined
          ? null
          : readAccessor(view, json, binStart, primitive.attributes.NORMAL);
        var indices = primitive.indices === undefined
          ? sequential(positions.length / 3)
          : readAccessor(view, json, binStart, primitive.indices);
        primitives.push(upload(positions, normals, indices));
        triangles += indices.length / 3;
        var material = primitive.material === undefined ? null : materials[primitive.material];
        if (material) {
          var base = (material.pbrMetallicRoughness || {}).baseColorFactor;
          if (base) color = [base[0], base[1], base[2]];
          var emissive = material.emissiveFactor;
          if (emissive) glow = Math.max(emissive[0], emissive[1], emissive[2]);
        }
      }
      return {
        name: source.name || '',
        matrix: matrix,
        primitives: primitives,
        color: color,
        glow: Math.min(1.2, glow)
      };
    }

    function visit(index, parent) {
      var source = json.nodes[index];
      var matrix = multiply(parent, nodeMatrix(source));
      if (source.mesh !== undefined) nodes.push(buildNode(source, matrix));
      var children = source.children || [];
      for (var child = 0; child < children.length; child += 1) visit(children[child], matrix);
    }

    var scene = (json.scenes || [])[json.scene || 0] || { nodes: [] };
    var roots = scene.nodes || [];
    for (var root = 0; root < roots.length; root += 1) visit(roots[root], identity());
    if (!nodes.length || !triangles) throw new Error('glb_no_mesh');
    return { nodes: nodes, triangles: triangles };
  }

  function identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  function translateY(distance) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, distance, 0, 1]);
  }

  function rotateY(angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  }

  function draw(primitive, model, color, glow) {
    gl.uniformMatrix4fv(uModel, false, model);
    gl.uniform3fv(uColor, color);
    gl.uniform1f(uGlow, glow || 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, primitive.position);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, primitive.normal);
    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.index);
    gl.drawElements(gl.TRIANGLES, primitive.count, primitive.type, 0);
  }

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function normalize(a) {
    var length = Math.sqrt(dot(a, a)) || 1;
    return [a[0] / length, a[1] / length, a[2] / length];
  }
  function perspective(fov, aspect, near, far) {
    var f = 1 / Math.tan(fov / 2);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, 2 * far * near / (near - far), 0
    ]);
  }
  function multiply(a, b) {
    var out = new Float32Array(16);
    for (var col = 0; col < 4; col += 1) {
      for (var row = 0; row < 4; row += 1) {
        out[col * 4 + row] =
          a[row] * b[col * 4] +
          a[4 + row] * b[col * 4 + 1] +
          a[8 + row] * b[col * 4 + 2] +
          a[12 + row] * b[col * 4 + 3];
      }
    }
    return out;
  }
  function viewMatrix(eye, yaw) {
    var forward = [Math.sin(yaw), 0, -Math.cos(yaw)];
    var center = [eye[0] + forward[0], eye[1] + forward[1], eye[2] + forward[2]];
    var z = normalize(sub(eye, center));
    var x = normalize(cross([0, 1, 0], z));
    var y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ]);
  }

  var PLAYER_RADIUS = 0.36;
  var SPEED = 4.0;
  var TURN = 2.4;
  var EYE_HEIGHT = 1.55;

  var mesh = { nodes: [], triangles: 0 };
  var coinByNode = Object.create(null);
  for (var coinIndex = 0; coinIndex < level.coins.length; coinIndex += 1) {
    coinByNode[level.coins[coinIndex].node] = coinIndex;
  }

  function blocked(x, z) {
    for (var index = 0; index < level.walls.length; index += 1) {
      var wall = level.walls[index];
      if (Math.abs(x - wall.x) < wall.w / 2 + PLAYER_RADIUS && Math.abs(z - wall.z) < wall.d / 2 + PLAYER_RADIUS) {
        return true;
      }
    }
    return false;
  }

  function reset() {
    state.x = level.spawn.x;
    state.z = level.spawn.z;
    state.yaw = 0;
    state.won = false;
    for (var index = 0; index < state.taken.length; index += 1) state.taken[index] = false;
    winNode.hidden = true;
    statusNode.textContent = '';
    updateHud();
  }

  function updateHud() {
    var taken = 0;
    for (var index = 0; index < state.taken.length; index += 1) if (state.taken[index]) taken += 1;
    coinsNode.textContent = '\u041C\u043E\u043D\u0435\u0442\u044B: ' + taken + ' / ' + state.taken.length;
  }

  function step(dt) {
    if (state.won) return;
    if (keys.ArrowLeft) state.yaw -= TURN * dt;
    if (keys.ArrowRight) state.yaw += TURN * dt;
    var forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    var strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    if (forward || strafe) {
      var length = Math.sqrt(forward * forward + strafe * strafe);
      var stepX = (Math.sin(state.yaw) * forward + Math.cos(state.yaw) * strafe) / length * SPEED * dt;
      var stepZ = (-Math.cos(state.yaw) * forward + Math.sin(state.yaw) * strafe) / length * SPEED * dt;
      if (!blocked(state.x + stepX, state.z)) state.x += stepX;
      if (!blocked(state.x, state.z + stepZ)) state.z += stepZ;
    }

    var collected = 0;
    for (var index = 0; index < level.coins.length; index += 1) {
      if (state.taken[index]) { collected += 1; continue; }
      var coin = level.coins[index];
      var dx = coin.x - state.x;
      var dz = coin.z - state.z;
      if (dx * dx + dz * dz < 0.9) {
        state.taken[index] = true;
        collected += 1;
        statusNode.textContent = collected === state.taken.length
          ? '\u0412\u0441\u0435 \u043C\u043E\u043D\u0435\u0442\u044B \u0441\u043E\u0431\u0440\u0430\u043D\u044B. \u0418\u0434\u0438\u0442\u0435 \u043A \u0437\u0435\u043B\u0451\u043D\u043E\u0439 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0435.'
          : '\u041C\u043E\u043D\u0435\u0442\u0430 ' + collected + ' \u0438\u0437 ' + state.taken.length + '.';
      }
    }
    if (collected === state.taken.length) {
      var gx = level.goal.x - state.x;
      var gz = level.goal.z - state.z;
      if (Math.sqrt(gx * gx + gz * gz) < level.goal.radius + 0.45) {
        state.won = true;
        winTextNode.textContent = '\u0412\u0441\u0435 ' + state.taken.length + ' \u043C\u043E\u043D\u0435\u0442\u044B \u0441\u043E\u0431\u0440\u0430\u043D\u044B, \u0446\u0435\u043B\u044C \u0434\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442\u0430.';
        winNode.hidden = false;
      }
    }
    updateHud();
  }

  function drawFrame(time) {
    var aspect = canvas.width / Math.max(1, canvas.height);
    var projection = perspective(Math.PI / 3, aspect, 0.1, 80);
    var view = viewMatrix([state.x, EYE_HEIGHT, state.z], state.yaw);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uVp, false, multiply(projection, view));

    var taken = 0;
    for (var index = 0; index < state.taken.length; index += 1) if (state.taken[index]) taken += 1;
    var allTaken = taken === state.taken.length;

    for (var nodeIndex = 0; nodeIndex < mesh.nodes.length; nodeIndex += 1) {
      var node = mesh.nodes[nodeIndex];
      var coin = coinByNode[node.name];
      var model = node.matrix;
      var glow = node.glow;
      if (coin !== undefined) {
        if (state.taken[coin]) continue;
        model = multiply(
          translateY(0.18 + Math.sin(time / 420 + coin) * 0.12),
          multiply(node.matrix, rotateY(time / 900 + coin))
        );
        glow = Math.min(1.2, glow + 0.15);
      } else if (node.name === level.goal.node && allTaken) {
        glow = 0.9;
      }
      for (var primitive = 0; primitive < node.primitives.length; primitive += 1) {
        draw(node.primitives[primitive], model, node.color, glow);
      }
    }
    game.ready = true;
  }

  var last = 0;
  function frame(time) {
    var dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    step(dt);
    drawFrame(time);
    requestAnimationFrame(frame);
  }

  function resize() {
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(window.innerWidth * ratio));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * ratio));
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('keydown', function (event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD') {
      keys[event.code] = true;
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', function (event) {
    delete keys[event.code];
  });
  window.addEventListener('blur', function () {
    for (var code in keys) delete keys[code];
  });
  document.getElementById('again').addEventListener('click', reset);

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.043, 0.055, 0.078, 1);
  updateHud();

  // \u0418\u0433\u0440\u0430 \u0440\u0438\u0441\u0443\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u043E, \u0447\u0442\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043B Blender: \u0431\u0435\u0437 \u0441\u0435\u0442\u043A\u0438 \u043A\u0430\u0434\u0440\u0430 \u043D\u0435\u0442.
  fetch(location.pathname.replace(/play$/, 'mesh.glb'))
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.arrayBuffer();
    })
    .then(function (buffer) {
      mesh = parseGlb(buffer);
      game.mesh = { nodes: mesh.nodes.length, triangles: mesh.triangles };
      requestAnimationFrame(frame);
    })
    .catch(function (error) {
      game.error = 'mesh_unavailable';
      statusNode.textContent = '\u0421\u0435\u0442\u043A\u0430 Blender \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C: ' + (error && error.message ? error.message : error);
    });
})();
`;
}

// src/domain/three-d/glb.ts
var GLB_MAGIC = 1179937895;
var GLB_VERSION = 2;
var CHUNK_JSON = 1313821514;
var CHUNK_BIN = 5130562;
var MODE_TRIANGLES = 4;
function fail(reason2, message, details = {}) {
  throw new ValidationError(message, { reason: reason2, ...details });
}
function chunkOf(bytes, kind) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = Math.min(bytes.byteLength, view.getUint32(8, true));
  for (let offset = 12; offset + 8 <= end; ) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + length > bytes.byteLength) return null;
    if (type === kind) return { start, length };
    offset = start + length;
  }
  return null;
}
function parseGlb(bytes) {
  if (bytes.byteLength < 20) fail("glb_truncated", "\u0421\u0435\u0442\u043A\u0430 Blender \u043F\u0443\u0441\u0442\u0430 \u0438\u043B\u0438 \u043E\u0431\u0440\u0435\u0437\u0430\u043D\u0430");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    fail("glb_magic", "\u0424\u0430\u0439\u043B \u0441\u0435\u0442\u043A\u0438 \u2014 \u043D\u0435 glTF (GLB): \u043D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u044C", { magic: view.getUint32(0, true) });
  }
  if (view.getUint32(4, true) !== GLB_VERSION) {
    fail("glb_version", "\u0421\u0435\u0442\u043A\u0430 Blender \u043D\u0435 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 glTF 2.0", { version: view.getUint32(4, true) });
  }
  const jsonChunk = chunkOf(bytes, CHUNK_JSON);
  if (!jsonChunk) fail("glb_chunk", "\u0412 \u0441\u0435\u0442\u043A\u0435 Blender \u043D\u0435\u0442 JSON-\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0441\u0446\u0435\u043D\u044B");
  if (!chunkOf(bytes, CHUNK_BIN)) fail("glb_chunk", "\u0412 \u0441\u0435\u0442\u043A\u0435 Blender \u043D\u0435\u0442 \u0431\u0443\u0444\u0435\u0440\u0430 \u0432\u0435\u0440\u0448\u0438\u043D");
  let document;
  const raw = new Uint8Array(bytes.buffer, bytes.byteOffset + jsonChunk.start, jsonChunk.length);
  try {
    document = JSON.parse(new TextDecoder().decode(raw).replace(/\0+$/, ""));
  } catch {
    fail("glb_json", "JSON-\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0441\u0435\u0442\u043A\u0438 Blender \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F");
  }
  const meshes = Array.isArray(document.meshes) ? document.meshes : [];
  const accessors = Array.isArray(document.accessors) ? document.accessors : [];
  const nodes = Array.isArray(document.nodes) ? document.nodes : [];
  if (!meshes.length) fail("glb_no_mesh", "\u0421\u0435\u0442\u043A\u0430 Blender \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u043C\u0435\u0448\u0430");
  let triangles = 0;
  for (const mesh of meshes) {
    const primitives = Array.isArray(mesh.primitives) ? mesh.primitives : [];
    for (const primitive of primitives) {
      if ((primitive.mode ?? MODE_TRIANGLES) !== MODE_TRIANGLES) continue;
      const attributes = primitive.attributes;
      if (!attributes || typeof attributes.POSITION !== "number") {
        fail("glb_no_positions", "\u041C\u0435\u0448 \u0441\u0435\u0442\u043A\u0438 Blender \u0431\u0435\u0437 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442 \u0432\u0435\u0440\u0448\u0438\u043D");
      }
      const counted = typeof primitive.indices === "number" ? accessors[primitive.indices]?.count : accessors[attributes.POSITION]?.count;
      if (typeof counted !== "number" || counted < 3) {
        fail("glb_no_triangles", "\u041C\u0435\u0448 \u0441\u0435\u0442\u043A\u0438 Blender \u0431\u0435\u0437 \u0442\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u043E\u0432");
      }
      triangles += Math.floor(counted / 3);
    }
  }
  if (!triangles) fail("glb_no_triangles", "\u0421\u0435\u0442\u043A\u0430 Blender \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0442\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u043E\u0432");
  return {
    nodes: nodes.map((node) => ({
      name: typeof node.name === "string" ? node.name : "",
      has_mesh: typeof node.mesh === "number"
    })),
    meshes: meshes.length,
    triangles
  };
}

// src/domain/three-d/scene-script.ts
function buildSceneScript(input) {
  const title = JSON.stringify(input.title);
  const outDir = JSON.stringify(input.outDir);
  const format = JSON.stringify(GAME_LEVEL_FORMAT);
  return `import bpy
import hashlib
import json
import os
import random
import time

OUT = ${outDir}
TITLE = ${title}
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 8
scene.cycles.device = "CPU"
scene.render.resolution_x = 320
scene.render.resolution_y = 180
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(OUT, "preview.png")
scene.render.film_transparent = False

seed = int(hashlib.sha256(TITLE.encode("utf-8")).hexdigest()[:8], 16)
rng = random.Random(seed)


def material(name, rgb, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    bsdf.inputs["Roughness"].default_value = 0.55
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def box(name, x, z, w, d, h, rgb, kind, emission=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, h / 2))
    ob = bpy.context.object
    ob.name = name
    ob.scale = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material(name + "-mat", rgb, emission))
    ob["kind"] = kind
    return ob


FLOOR = [0.16, 0.18, 0.22]
WALL = [0.30, 0.34, 0.42]
COIN = [1.0, 0.78, 0.25]
GOAL = [0.22, 0.85, 0.55]
ARENA = 16.0
HALF = ARENA / 2

box("Floor", 0, 0, ARENA, ARENA, 0.2, FLOOR, "floor")
box("WallNorth", 0, -HALF + 0.2, ARENA, 0.4, 1.2, WALL, "wall")
box("WallSouth", 0, HALF - 0.2, ARENA, 0.4, 1.2, WALL, "wall")
box("WallEast", HALF - 0.2, 0, 0.4, ARENA, 1.2, WALL, "wall")
box("WallWest", -HALF + 0.2, 0, 0.4, ARENA, 1.2, WALL, "wall")

goal_x, goal_z = 5.4, -6.0
box("Goal", goal_x, goal_z, 1.6, 1.6, 0.25, GOAL, "goal", emission=2.0)

coin_slots = [(-3.2, 1.5), (0.4, -2.4), (3.4, 2.6)]
coins = []
for index, (cx, cz) in enumerate(coin_slots, start=1):
    x = cx + rng.uniform(-0.5, 0.5)
    z = cz + rng.uniform(-0.5, 0.5)
    box("Coin" + str(index), x, z, 0.5, 0.5, 0.5, COIN, "coin", emission=1.0)
    coins.append({"x": round(x, 3), "z": round(z, 3), "node": "Coin" + str(index)})

bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, -5.2, 0))
spawn = bpy.context.object
spawn.name = "PlayerSpawn"
spawn["kind"] = "spawn"

bpy.ops.object.camera_add(location=(9.5, 9.5, 12.0))
camera = bpy.context.object
camera.name = "PreviewCamera"
camera.data.lens = 32
track = camera.constraints.new(type="TRACK_TO")
target = bpy.data.objects.new("PreviewTarget", None)
scene.collection.objects.link(target)
target.location = (0, 0, 0)
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"
scene.camera = camera

bpy.ops.object.light_add(type="SUN", location=(4, 6, 10))
sun = bpy.context.object
sun.data.energy = 3.0
bpy.ops.object.light_add(type="AREA", location=(-6, -2, 7))
area = bpy.context.object
area.data.energy = 300
area.data.size = 8

level = {
    "format": ${format},
    "title": TITLE,
    "engine": {"name": "Blender", "version": bpy.app.version_string},
    "spawn": {"x": 0.0, "z": 5.2},
    "goal": {"x": goal_x, "z": goal_z, "radius": 1.1, "node": "Goal"},
    "coins": coins,
    "walls": [
        {"x": 0, "z": -HALF + 0.2, "w": ARENA, "d": 0.4},
        {"x": 0, "z": HALF - 0.2, "w": ARENA, "d": 0.4},
        {"x": HALF - 0.2, "z": 0, "w": 0.4, "d": ARENA},
        {"x": -HALF + 0.2, "z": 0, "w": 0.4, "d": ARENA},
    ],
    "built_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}

with open(os.path.join(OUT, "level.json"), "w", encoding="utf-8") as handle:
    json.dump(level, handle, ensure_ascii=False, indent=2)

# \u0422\u0430 \u0436\u0435 \u0441\u0446\u0435\u043D\u0430, \u043D\u043E \u043A\u0430\u043A \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0430\u044F \u0441\u0435\u0442\u043A\u0430 glTF: \u0438\u0433\u0440\u0443 \u0440\u0438\u0441\u0443\u0435\u0442 \u043E\u043D\u0430, \u0430 \u043D\u0435 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B.
mesh_path = os.path.join(OUT, "scene.glb")
bpy.ops.export_scene.gltf(
    filepath=mesh_path,
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_animations=False,
    export_yup=True,
)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "scene.blend"), check_existing=False)

try:
    bpy.ops.render.render(write_still=True)
    preview_ok = os.path.exists(scene.render.filepath) and os.path.getsize(scene.render.filepath) > 0
    preview_error = ""
except Exception as error:
    preview_ok = False
    preview_error = str(error)

result = {
    "ok": True,
    "engine": {"name": "Blender", "version": bpy.app.version_string},
    "objects": len(bpy.data.objects),
    "coins": len(coins),
    "player_spawn": "PlayerSpawn" in bpy.data.objects,
    "goal": "Goal" in bpy.data.objects,
    "preview_ok": preview_ok,
    "preview_error": preview_error,
    "blend_bytes": os.path.getsize(os.path.join(OUT, "scene.blend")),
    "mesh_bytes": os.path.getsize(mesh_path) if os.path.exists(mesh_path) else 0,
}
print("TEAM_PLATFORM_RESULT:" + json.dumps(result, ensure_ascii=False))
`;
}
function verifySceneScript() {
  return `import bpy
import json

kinds = {}
for obj in bpy.data.objects:
    kind = obj.get("kind")
    if kind:
        kinds[kind] = kinds.get(kind, 0) + 1
result = {
    "version": bpy.app.version_string,
    "objects": len(bpy.data.objects),
    "kinds": kinds,
    "names": sorted(obj.name for obj in bpy.data.objects),
}
print("TEAM_PLATFORM_RESULT:" + json.dumps(result, ensure_ascii=False))
`;
}

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
    const record2 = {
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
    writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(record2, null, 2)}
`, "utf8");
    return record2;
  }
  /** Повторная проверка уже собранного `.blend`: сцена и её сетка должны быть на месте. */
  async verify(id) {
    const record2 = this.get(id);
    const mesh = this.#readMesh(record2.artifacts.mesh.path, record2.level, id);
    return this.#verifyScene(record2.artifacts.blend.path, record2.level, id, mesh);
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
