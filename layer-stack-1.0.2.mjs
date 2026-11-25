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

// team-host-api:src/kernel/ids.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var newId = host2["newId"];

// team-host-api:src/kernel/validate.ts
var host3 = globalThis["__teamPlatformHostApi"] ?? {};
var integer = host3["integer"];
var oneOf = host3["oneOf"];
var optionalInteger = host3["optionalInteger"];
var optionalName = host3["optionalName"];
var record = host3["record"];
var requiredOneOf = host3["requiredOneOf"];
var text = host3["text"];

// modules/layer-stack/service.ts
var MAX_STACKS = 500;
var MAX_LAYERS = 64;
var MAX_NAME = 120;
var MAX_META = 4e3;
var BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"];
function parseLayers(raw) {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v;
  } catch {
  }
  return [];
}
function parseMetadata(raw) {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
  }
  return {};
}
function toStack(row) {
  return {
    id: row.id,
    name: row.name,
    layers: parseLayers(row.layers),
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function normalizeLayer(raw, index) {
  const input = record(raw, `\u0441\u043B\u043E\u0439 ${index + 1}`);
  const name = text(input.name ?? `\u0421\u043B\u043E\u0439 ${index + 1}`, "name", 120, true);
  const assetId = input.asset_id === void 0 || input.asset_id === null || input.asset_id === "" ? null : text(input.asset_id, "asset_id", 120, true);
  const opacityRaw = input.opacity === void 0 ? 1 : Number(input.opacity);
  if (!Number.isFinite(opacityRaw) || opacityRaw < 0 || opacityRaw > 1) {
    throw new ValidationError("opacity \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0442 0 \u0434\u043E 1", { reason: "layer_opacity_invalid", index });
  }
  const blendRaw = input.blend === void 0 ? "normal" : String(input.blend);
  if (!BLEND_MODES.includes(blendRaw)) {
    throw new ValidationError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u043D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u044F", { reason: "layer_blend_unknown", index, allowed: BLEND_MODES });
  }
  return {
    id: String(input.id ?? newId("layer")),
    name,
    asset_id: assetId,
    opacity: opacityRaw,
    blend: blendRaw,
    visible: input.visible === void 0 ? true : Boolean(input.visible),
    locked: input.locked === void 0 ? false : Boolean(input.locked)
  };
}
var LayerStackService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM layer_stacks").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM layer_stacks ORDER BY updated_at DESC LIMIT ?").all(safe);
    return rows.map(toStack);
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM layer_stacks WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0421\u0442\u0435\u043A \u0441\u043B\u043E\u0451\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return toStack(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u0430 \u0441\u043B\u043E\u0451\u0432");
    const name = text(input.name, "name", MAX_NAME, true);
    const layersRaw = input.layers;
    if (!Array.isArray(layersRaw)) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043C\u0430\u0441\u0441\u0438\u0432 layers", { reason: "stack_layers_required" });
    }
    if (layersRaw.length > MAX_LAYERS) {
      throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0441\u043B\u043E\u0451\u0432", { reason: "stack_too_many_layers", limit: MAX_LAYERS });
    }
    const layers = layersRaw.map((l, i) => normalizeLayer(l, i));
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) {
      throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "stack_metadata_too_long" });
    }
    if (this.#count() >= MAX_STACKS) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0441\u0442\u0435\u043A\u043E\u0432 (500)", { reason: "stack_count_limit" });
    }
    const id = newId("stack");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO layer_stacks (id, name, layers, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, JSON.stringify(layers), metaStr, now, now);
    return { id, name, layers, metadata, created_at: now, updated_at: now };
  }
  update(id, raw) {
    const existing = this.get(id);
    const input = record(raw, "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u0430 \u0441\u043B\u043E\u0451\u0432");
    const name = input.name === void 0 ? existing.name : text(input.name, "name", MAX_NAME, true);
    let layers = existing.layers;
    if (input.layers !== void 0) {
      if (!Array.isArray(input.layers)) {
        throw new ValidationError("layers \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C", { reason: "stack_layers_invalid" });
      }
      if (input.layers.length > MAX_LAYERS) {
        throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0441\u043B\u043E\u0451\u0432", { reason: "stack_too_many_layers", limit: MAX_LAYERS });
      }
      layers = input.layers.map((l, i) => normalizeLayer(l, i));
    }
    const metadata = input.metadata === void 0 ? existing.metadata : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) {
      throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "stack_metadata_too_long" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      UPDATE layer_stacks SET name = ?, layers = ?, metadata = ?, updated_at = ? WHERE id = ?
    `).run(name, JSON.stringify(layers), metaStr, now, id);
    return { id, name, layers, metadata, created_at: existing.created_at, updated_at: now };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM layer_stacks WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0421\u0442\u0435\u043A \u0441\u043B\u043E\u0451\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    this.#db.raw.prepare("DELETE FROM layer_stacks WHERE id = ?").run(id);
    return { removed: true, id };
  }
  exportJson(stack) {
    return JSON.stringify(stack, null, 2);
  }
  summary() {
    return { stacks: this.#count(), limit: MAX_STACKS, blend_modes: [...BLEND_MODES] };
  }
};

// modules/layer-stack/schema.ts
var layerStackMigrations = [
  {
    version: "layer-stack/1_stacks",
    sql: `
      CREATE TABLE layer_stacks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        layers TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_layer_stacks_created ON layer_stacks (created_at);
      CREATE INDEX idx_layer_stacks_name ON layer_stacks (name);
    `
  }
];

// modules/layer-stack/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "layer_stack_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" /><title>\u0421\u0442\u0435\u043A\u0438 \u0441\u043B\u043E\u0451\u0432</title></head><body><main>
<h1>\u0421\u0442\u0435\u043A\u0438 \u0441\u043B\u043E\u0451\u0432</h1>
<p>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u043E\u0432 \u0441\u043B\u043E\u0451\u0432: \u0434\u043E 500 \u0441\u0442\u0435\u043A\u043E\u0432, \u0434\u043E 64 \u0441\u043B\u043E\u0451\u0432, \u0440\u0435\u0436\u0438\u043C\u044B \u043D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u044F, \u043D\u0435\u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u043E\u0441\u0442\u044C, \u0432\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u044C \u0438 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430. \u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0432 JSON. \u0411\u0435\u0437 \u0441\u0435\u0442\u0438 \u0438 \u043A\u043B\u044E\u0447\u0435\u0439.</p>
<p>\u0421\u043B\u043E\u0438 \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F JSON-\u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 <code>[{"name":"Base"},{"name":"Top","blend":"multiply","opacity":0.5}]</code>. \u0420\u0435\u0436\u0438\u043C\u044B \u043D\u0430\u043B\u043E\u0436\u0435\u043D\u0438\u044F: normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion. \u041D\u0435\u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u043E\u0441\u0442\u044C \u2014 \u043E\u0442 0 \u0434\u043E 1.</p>
<section>
<h2>\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0442\u0435\u043A</h2>
<label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u0430<br><input id="name" maxlength="120" /></label>
<label>\u0421\u043B\u043E\u0438 (JSON-\u043C\u0430\u0441\u0441\u0438\u0432, \u043C\u043E\u0436\u043D\u043E \u043F\u0443\u0441\u0442\u043E)<br><textarea id="layers" rows="6" cols="60"></textarea></label>
<p><button id="create" type="button">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0442\u0435\u043A</button> <button id="list" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button> <button id="summary" type="button">\u0421\u0432\u043E\u0434\u043A\u0430</button></p>
</section>
<section>
<h2>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043F\u043E \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0443 \u0441\u0442\u0435\u043A\u0430</h2>
<label>\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0442\u0435\u043A\u0430<br><input id="id" maxlength="120" /></label>
<p><button id="load" type="button">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0442\u0435\u043A</button> <button id="export" type="button">\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C JSON</button> <button id="delete" type="button">\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0442\u0435\u043A</button></p>
</section>
<p id="status" role="status"></p>
<pre id="result"></pre>
<script>
(function () {
  'use strict';
  var NL = String.fromCharCode(10);
  var nameEl = document.getElementById('name');
  var layersEl = document.getElementById('layers');
  var idEl = document.getElementById('id');
  var statusEl = document.getElementById('status');
  var resultEl = document.getElementById('result');
  function say(text) { statusEl.textContent = text || ''; }
  function show(value) { resultEl.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
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
  function parseLayers() {
    var raw = layersEl.value.trim();
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('\xAB\u0421\u043B\u043E\u0438\xBB \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C JSON-\u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C.');
    return parsed;
  }
  document.getElementById('create').addEventListener('click', function () {
    if (!nameEl.value.trim()) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u0430.'); return; }
    var layers;
    try { layers = parseLayers(); } catch (err) { say('\u0421\u043B\u043E\u0438 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D\u044B \u043D\u0435\u0432\u0435\u0440\u043D\u043E: ' + err.message); return; }
    say('\u0421\u043E\u0437\u0434\u0430\u044E \u0441\u0442\u0435\u043A\u2026');
    request('/api/tools/layer-stack/stacks', { method: 'POST', body: JSON.stringify({ name: nameEl.value.trim(), layers: layers }) })
      .then(function (body) { say('\u0421\u0442\u0435\u043A \u0441\u043E\u0437\u0434\u0430\u043D. \u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440: ' + body.stack.id); show(body.stack); })
      .catch(function (err) { say('\u0421\u0442\u0435\u043A \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D: ' + err.message); });
  });
  document.getElementById('list').addEventListener('click', function () {
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0442\u0435\u043A\u043E\u0432\u2026');
    request('/api/tools/layer-stack/stacks')
      .then(function (body) {
        var items = body.items || [];
        if (!items.length) { say('\u0421\u0442\u0435\u043A\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.'); show(''); return; }
        show(items.map(function (s) { return s.id + ' \xB7 ' + s.name + ' \xB7 \u0441\u043B\u043E\u0451\u0432: ' + s.layers.length; }).join(NL));
        say('\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u0442\u0435\u043A\u043E\u0432: ' + items.length);
      })
      .catch(function (err) { say('\u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ' + err.message); });
  });
  document.getElementById('summary').addEventListener('click', function () {
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u0432\u043E\u0434\u043A\u0443\u2026');
    request('/api/tools/layer-stack/summary')
      .then(function (body) { say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430.'); show(body.summary); })
      .catch(function (err) { say('\u0421\u0432\u043E\u0434\u043A\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430: ' + err.message); });
  });
  function requireId(action) {
    if (!idEl.value.trim()) { say('\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0442\u0435\u043A\u0430 \u0434\u043B\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \xAB' + action + '\xBB.'); return ''; }
    return idEl.value.trim();
  }
  document.getElementById('load').addEventListener('click', function () {
    var id = requireId('\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0442\u0435\u043A');
    if (!id) return;
    say('\u0427\u0438\u0442\u0430\u044E \u0441\u0442\u0435\u043A\u2026');
    request('/api/tools/layer-stack/stacks/' + encodeURIComponent(id))
      .then(function (body) { say('\u0421\u0442\u0435\u043A \u043F\u043E\u043A\u0430\u0437\u0430\u043D.'); show(body.stack); })
      .catch(function (err) { say('\u0421\u0442\u0435\u043A \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D: ' + err.message); });
  });
  document.getElementById('export').addEventListener('click', function () {
    var id = requireId('\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C JSON');
    if (!id) return;
    say('\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u044E \u0441\u0442\u0435\u043A\u2026');
    request('/api/tools/layer-stack/stacks/' + encodeURIComponent(id) + '/export')
      .then(function (body) { say('\u0421\u0442\u0435\u043A \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D.'); show(body); })
      .catch(function (err) { say('\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D: ' + err.message); });
  });
  document.getElementById('delete').addEventListener('click', function () {
    var id = requireId('\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0442\u0435\u043A');
    if (!id) return;
    say('\u0423\u0434\u0430\u043B\u044F\u044E \u0441\u0442\u0435\u043A\u2026');
    request('/api/tools/layer-stack/stacks/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function () { say('\u0421\u0442\u0435\u043A \u0443\u0434\u0430\u043B\u0451\u043D: ' + id); show(''); })
      .catch(function (err) { say('\u0421\u0442\u0435\u043A \u043D\u0435 \u0443\u0434\u0430\u043B\u0451\u043D: ' + err.message); });
  });
})();
</script>
</main></body></html>`;
var module = {
  id: "layer-stack",
  apiVersion: 1,
  migrations: layerStackMigrations,
  register(ctx) {
    const svc = new LayerStackService({ db: ctx.storage });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/layer-stack/stacks", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/layer-stack/stacks/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, stack: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/layer-stack/stacks", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, stack: result } };
    });
    ctx.api.add("PATCH", "/api/tools/layer-stack/stacks/:id", (request) => {
      const result = svc.update(request.params.id, bodyOf(request.body));
      return { status: 200, headers: NO_STORE, body: { ok: true, stack: result } };
    });
    ctx.api.add("DELETE", "/api/tools/layer-stack/stacks/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/layer-stack/stacks/:id/export", (request) => {
      const stack = svc.get(request.params.id);
      const format = (request.query.get("format") ?? "json").toLowerCase();
      if (format === "json") {
        return { status: 200, headers: { ...NO_STORE, "content-type": "application/json; charset=utf-8" }, raw: svc.exportJson(stack) };
      }
      return { status: 200, headers: NO_STORE, body: { ok: true, stack, format } };
    });
    ctx.api.add("GET", "/api/tools/layer-stack/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, summary: svc.summary() }
    }));
  }
};
var index_default = module;
export {
  index_default as default
};
