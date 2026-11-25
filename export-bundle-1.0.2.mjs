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

// modules/export-bundle/service.ts
import { createHash } from "node:crypto";

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

// modules/export-bundle/service.ts
var MAX_BUNDLES = 500;
var MAX_NAME = 120;
var MAX_META = 4e3;
var MAX_ITEMS = 200;
var MAX_PAYLOAD = 5e5;
function parseItems(raw) {
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
function canonical(items) {
  return JSON.stringify(items, Object.keys(items).sort());
}
function checksumOf(items) {
  return createHash("sha256").update(canonical(items)).digest("hex");
}
function normalizeItem(raw, index) {
  const input = record(raw, `\u044D\u043B\u0435\u043C\u0435\u043D\u0442 ${index + 1}`);
  const kind = text(input.kind, "kind", 60, true);
  const id = input.id === void 0 || input.id === null || input.id === "" ? void 0 : text(input.id, "id", 120, true);
  if (input.data === void 0) {
    throw new ValidationError("\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u043B\u0435 data", { reason: "bundle_item_data_required", index });
  }
  return { kind, id, data: input.data };
}
var ExportBundleService = class {
  #db;
  constructor(options) {
    this.#db = options.db;
  }
  #count() {
    const row = this.#db.raw.prepare("SELECT COUNT(*) AS c FROM export_bundles").get();
    return Number(row?.c ?? 0);
  }
  list(limit = 100) {
    const safe = Math.min(Math.max(limit, 1), 500);
    const rows = this.#db.raw.prepare("SELECT * FROM export_bundles ORDER BY created_at DESC LIMIT ?").all(safe);
    return rows.map((r) => this.#toBundle(r));
  }
  #toBundle(row) {
    const items = parseItems(row.items);
    const kinds = [...new Set(items.map((i) => i.kind))];
    return {
      id: row.id,
      name: row.name,
      items,
      checksum: row.checksum,
      metadata: parseMetadata(row.metadata),
      created_at: row.created_at,
      manifest: { version: "1.0.0", item_count: items.length, kinds, created_at: row.created_at }
    };
  }
  get(id) {
    const row = this.#db.raw.prepare("SELECT * FROM export_bundles WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0411\u0430\u043D\u0434\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return this.#toBundle(row);
  }
  create(raw) {
    const input = record(raw, "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0431\u0430\u043D\u0434\u043B\u0430");
    const name = text(input.name, "name", MAX_NAME, true);
    if (!Array.isArray(input.items)) {
      throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043C\u0430\u0441\u0441\u0438\u0432 items", { reason: "bundle_items_required" });
    }
    if (input.items.length === 0) {
      throw new ValidationError("\u0411\u0430\u043D\u0434\u043B \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C", { reason: "bundle_empty" });
    }
    if (input.items.length > MAX_ITEMS) {
      throw new ValidationError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432", { reason: "bundle_too_many_items", limit: MAX_ITEMS });
    }
    const items = input.items.map((it, i) => normalizeItem(it, i));
    const payloadStr = JSON.stringify(items);
    if (payloadStr.length > MAX_PAYLOAD) {
      throw new ValidationError("\u0411\u0430\u043D\u0434\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439", { reason: "bundle_too_large", limit: MAX_PAYLOAD });
    }
    const metadata = input.metadata === void 0 || input.metadata === null ? {} : record(input.metadata, "metadata");
    const metaStr = JSON.stringify(metadata);
    if (metaStr.length > MAX_META) throw new ValidationError("\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", { reason: "bundle_metadata_too_long" });
    if (this.#count() >= MAX_BUNDLES) {
      throw new ConflictError("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0431\u0430\u043D\u0434\u043B\u043E\u0432 (500)", { reason: "bundle_count_limit" });
    }
    const checksum = checksumOf(items);
    const id = newId("bundle");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.raw.prepare(`
      INSERT INTO export_bundles (id, name, items, checksum, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, payloadStr, checksum, metaStr, now);
    return this.get(id);
  }
  verify(id) {
    const bundle = this.get(id);
    const computed = checksumOf(bundle.items);
    return { ok: computed === bundle.checksum, stored: bundle.checksum, computed };
  }
  remove(id) {
    const row = this.#db.raw.prepare("SELECT id FROM export_bundles WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("\u0411\u0430\u043D\u0434\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    this.#db.raw.prepare("DELETE FROM export_bundles WHERE id = ?").run(id);
    return { removed: true, id };
  }
  summary() {
    return { bundles: this.#count(), limit: MAX_BUNDLES };
  }
};

// modules/export-bundle/schema.ts
var exportBundleMigrations = [
  {
    version: "export-bundle/1_bundles",
    sql: `
      CREATE TABLE export_bundles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        items TEXT NOT NULL,
        checksum TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_export_bundle_created ON export_bundles (created_at);
      CREATE INDEX idx_export_bundle_name ON export_bundles (name);
    `
  }
];

// modules/export-bundle/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>\u042D\u043A\u0441\u043F\u043E\u0440\u0442-\u0441\u0431\u043E\u0440\u043A\u0438</title></head><body><main>
<h1>\u042D\u043A\u0441\u043F\u043E\u0440\u0442-\u0441\u0431\u043E\u0440\u043A\u0438</h1>
<p>\u0421\u0431\u043E\u0440\u043A\u0430 \u2014 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043D\u0430\u0431\u043E\u0440 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: \u0441\u043B\u043E\u0439, \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441, \u043F\u0430\u043B\u0438\u0442\u0440\u0430, \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u0446\u0435\u043D\u044B.
\u041C\u043E\u0434\u0443\u043B\u044C \u0445\u0440\u0430\u043D\u0438\u0442 \u0434\u043E 500 \u0441\u0431\u043E\u0440\u043E\u043A, \u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u043F\u043E \u043D\u0438\u043C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u0438 \u043E\u0442\u0434\u0430\u0451\u0442
\u043C\u0430\u043D\u0438\u0444\u0435\u0441\u0442; \u0447\u0443\u0436\u0443\u044E \u0441\u0431\u043E\u0440\u043A\u0443 \u043C\u043E\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u0438 \u0443\u0431\u0435\u0434\u0438\u0442\u044C\u0441\u044F, \u0447\u0442\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u043D\u0435
\u043C\u0435\u043D\u044F\u043B\u043E\u0441\u044C.</p>
<section>
<h2>\u0421\u0432\u043E\u0434\u043A\u0430</h2>
<p id="summary" role="status">\u0421\u0432\u043E\u0434\u043A\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u0430.</p>
</section>
<section>
<h2>\u041D\u043E\u0432\u0430\u044F \u0441\u0431\u043E\u0440\u043A\u0430</h2>
<p><label for="bundle-name">\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u0431\u043E\u0440\u043A\u0438</label>
<input id="bundle-name" size="30" maxlength="120" placeholder="scena-01-itog"></p>
<p><label for="bundle-items">\u042D\u043B\u0435\u043C\u0435\u043D\u0442\u044B: \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u2014 \u0442\u0438\u043F, \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440, \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435</label>
<textarea id="bundle-items" rows="4" cols="60" placeholder="layer, layer-14, fond
palette, palette-3, #2f4858"></textarea></p>
</section>
<section>
<h2>\u0413\u043E\u0442\u043E\u0432\u0430\u044F \u0441\u0431\u043E\u0440\u043A\u0430</h2>
<p><label for="bundle-id">\u0418\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0431\u043E\u0440\u043A\u0438</label>
<input id="bundle-id" size="36" maxlength="120"></p>
</section>
<p><button id="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button>
<button id="create" data-required="bundle-name,bundle-items">\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0431\u0430\u043D\u0434\u043B</button>
<button id="verify" data-required="bundle-id">\u041F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443</button></p>
<p id="status" role="status"></p>
<section>
<h2>\u041E\u0442\u0432\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438</h2>
<div id="verify-out"><p class="hint">\u041F\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u0430 \u0435\u0449\u0451 \u043D\u0435 \u0431\u044B\u043B\u043E: \u0432\u043E\u0437\u044C\u043C\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0431\u043E\u0440\u043A\u0438 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u043D\u0438\u0436\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443\xBB.</p></div>
</section>
<section>
<h2>\u0421\u0431\u043E\u0440\u043A\u0438</h2>
<ul id="items"><li class="hint">\u0421\u043F\u0438\u0441\u043E\u043A \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D.</li></ul>
</section>
</main><script>
function say(message) { document.getElementById('status').textContent = message; }
function valueOf(id) { return document.getElementById(id).value.trim(); }
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}
function reset(id) {
  var box = document.getElementById(id);
  while (box.firstChild) box.removeChild(box.firstChild);
  return box;
}
async function api(method, path, payload) {
  var init = { method: method, headers: { 'content-type': 'application/json' } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  var response = await fetch('/api/tools/export-bundle/' + path, init);
  var data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data && data.error && data.error.message ? data.error.message : '\u041C\u043E\u0434\u0443\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043A\u043E\u0434\u043E\u043C ' + response.status + '.');
  return data;
}
function parseItems(raw) {
  var items = [];
  raw.split('\\n').forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    var parts = trimmed.split(',');
    var kind = (parts[0] || '').trim();
    if (!kind) return;
    var item = { kind: kind, data: parts.length > 2 ? parts.slice(2).join(',').trim() : '' };
    var id = parts.length > 1 ? (parts[1] || '').trim() : '';
    if (id) item.id = id;
    items.push(item);
  });
  return items;
}
function showBundles(items) {
  var list = reset('items');
  if (!items.length) {
    list.appendChild(el('li', 'hint', '\u0421\u0431\u043E\u0440\u043E\u043A \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B \u0432\u044B\u0448\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0431\u0430\u043D\u0434\u043B\xBB: \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u043E\u0439 \u0438 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u043E\u043C.'));
    return;
  }
  items.forEach(function (bundle) {
    var line = el('li');
    line.appendChild(el('strong', null, String(bundle.name)));
    line.appendChild(el('span', 'hint', ' \xB7 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: ' + bundle.manifest.item_count + ' \xB7 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 ' + String(bundle.created_at).replace('T', ' ').slice(0, 16) + ' \xB7 ' + bundle.id));
    line.appendChild(el('div', 'hint', '\u0422\u0438\u043F\u044B: ' + (bundle.manifest.kinds.join(', ') || '\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B') + ' \xB7 \u0441\u0443\u043C\u043C\u0430 ' + String(bundle.checksum).slice(0, 24)));
    list.appendChild(line);
  });
}
async function load() {
  say('\u0427\u0438\u0442\u0430\u044E \u0441\u0432\u043E\u0434\u043A\u0443 \u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0431\u043E\u0440\u043E\u043A\u2026');
  try {
    var report = await api('GET', 'summary');
    var page = await api('GET', 'bundles');
    document.getElementById('summary').textContent = '\u0421\u0431\u043E\u0440\u043E\u043A \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435: ' + report.summary.bundles + ' \u0438\u0437 ' + report.summary.limit + ' \xB7 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0445: ' + page.items.length + '.';
    showBundles(page.items);
    say('\u0421\u043F\u0438\u0441\u043E\u043A \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D: \u0441\u0431\u043E\u0440\u043E\u043A ' + report.summary.bundles + '.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
}
document.getElementById('refresh').onclick = load;
document.getElementById('create').onclick = async function () {
  var items = parseItems(document.getElementById('bundle-items').value);
  if (!items.length) { say('\u0418\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0445 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0448\u043B\u043E: \u043D\u0443\u0436\u043D\u0430 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430 \u0432\u0438\u0434\u0430 \u0442\u0438\u043F, \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440, \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.'); return; }
  say('\u0421\u043E\u0431\u0438\u0440\u0430\u044E \u0431\u0430\u043D\u0434\u043B\u2026');
  try {
    var data = await api('POST', 'bundles', { name: valueOf('bundle-name'), items: items });
    say('\u0421\u0431\u043E\u0440\u043A\u0430 \xAB' + data.bundle.name + '\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430: \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 ' + data.bundle.manifest.item_count + ', \u0441\u0443\u043C\u043C\u0430 ' + String(data.bundle.checksum).slice(0, 12) + '.');
    await load();
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
document.getElementById('verify').onclick = async function () {
  var id = valueOf('bundle-id');
  say('\u041F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u044E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443\u2026');
  var target = 'bundles/' + encodeURIComponent(id) + '/verify';
  try {
    var data = await api('GET', target);
    var box = reset('verify-out');
    box.appendChild(el('p', null, data.verification.ok ? '\u0421\u0443\u043C\u043C\u0430 \u0441\u043E\u0432\u043F\u0430\u043B\u0430: \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0441\u0431\u043E\u0440\u043A\u0438 \u043D\u0435 \u043C\u0435\u043D\u044F\u043B\u043E\u0441\u044C.' : '\u0421\u0443\u043C\u043C\u0430 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u043B\u0430: \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0438 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043D\u043D\u043E\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F.'));
    box.appendChild(el('p', 'hint', '\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: ' + data.verification.stored));
    box.appendChild(el('p', 'hint', '\u041F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043D\u043E: ' + data.verification.computed));
    say(data.verification.ok ? '\u0421\u0431\u043E\u0440\u043A\u0430 \xAB' + id + '\xBB \u0446\u0435\u043B\u0430.' : '\u0421\u0431\u043E\u0440\u043A\u0430 \xAB' + id + '\xBB \u043D\u0435 \u0441\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u043F\u043E \u0441\u0443\u043C\u043C\u0435.');
  } catch (error) { say(error && error.message ? error.message : '\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F.'); }
};
load();
</script></body></html>`;

// modules/export-bundle/index.ts
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, { code: "export_bundle_body_invalid" });
  }
  return raw;
}
var NO_STORE = { "cache-control": "no-store" };
var module = {
  id: "export-bundle",
  apiVersion: 1,
  migrations: exportBundleMigrations,
  register(ctx) {
    const svc = new ExportBundleService({ db: ctx.storage });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
    ctx.api.add("GET", "/api/tools/export-bundle/bundles", (request) => ({
      headers: NO_STORE,
      body: { ok: true, items: svc.list(Number(request.query.get("limit") ?? 100)) }
    }));
    ctx.api.add("GET", "/api/tools/export-bundle/bundles/:id", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, bundle: svc.get(request.params.id) }
    }));
    ctx.api.add("POST", "/api/tools/export-bundle/bundles", (request) => {
      const result = svc.create(bodyOf(request.body));
      return { status: 201, headers: NO_STORE, body: { ok: true, bundle: result } };
    });
    ctx.api.add("DELETE", "/api/tools/export-bundle/bundles/:id", (request) => ({
      headers: NO_STORE,
      body: { ok: true, ...svc.remove(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/export-bundle/bundles/:id/verify", (request) => ({
      status: 200,
      headers: NO_STORE,
      body: { ok: true, verification: svc.verify(request.params.id) }
    }));
    ctx.api.add("GET", "/api/tools/export-bundle/summary", () => ({
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
