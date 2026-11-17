import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/wikipedia-search/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u0438</title></head><body><main><h1>\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u0438</h1><p>\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0438 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u0441\u0442\u0430\u0442\u044C\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0432\u043E Wikimedia. \u0414\u0430\u043D\u043D\u044B\u0435 \u0441\u0442\u0430\u0442\u0435\u0439 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043E \u043F\u0435\u0440\u0432\u043E\u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430\u043C.</p><label>\u042F\u0437\u044B\u043A <select id="lang"><option value="ru">\u0420\u0443\u0441\u0441\u043A\u0438\u0439</option><option value="en">English</option><option value="uk">\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430</option><option value="de">Deutsch</option><option value="fr">Fran\xE7ais</option><option value="es">Espa\xF1ol</option></select></label><p><label>\u0417\u0430\u043F\u0440\u043E\u0441 <input id="query" maxlength="300"></label> <button id="search">\u041D\u0430\u0439\u0442\u0438</button></p><p id="status" role="status"></p><div id="results"></div><h2 id="title"></h2><pre id="extract" style="white-space:pre-wrap"></pre><p id="source"></p></main><script>
const status=document.getElementById('status'),results=document.getElementById('results'),lang=document.getElementById('lang');
async function request(path){const r=await fetch('/api/tools/wikipedia-search'+path);const j=await r.json();if(!r.ok)throw Error(j.error.message);return j}
async function openArticle(id,l){status.textContent='\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F\u2026';try{const a=(await request('/article?lang='+encodeURIComponent(l)+'&id='+id)).article;document.getElementById('title').textContent=a.title;document.getElementById('extract').textContent=a.extract;const p=document.getElementById('source');p.textContent='';const link=document.createElement('a');link.href=a.revision_url||a.url;link.textContent=a.revision_url?'\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0434\u0430\u043A\u0446\u0438\u044E \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C API':'\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u0442\u0430\u0442\u044C\u044E';link.target='_blank';link.rel='noreferrer';p.append(link);status.textContent='\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0441\u0442\u0430\u0442\u044C\u0438 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F.'}catch(e){status.textContent=e.message}}
document.getElementById('search').onclick=async()=>{const q=document.getElementById('query').value.trim(),l=lang.value;status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';results.textContent='';try{const d=await request('/search?lang='+encodeURIComponent(l)+'&q='+encodeURIComponent(q));for(const item of d.results){const b=document.createElement('button');b.textContent=item.title;b.onclick=()=>openArticle(item.id,l);results.append(b,document.createElement('br'))}status.textContent=d.results.length?'\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0442\u0430\u0442\u044C\u044E.':'\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.'}catch(e){status.textContent=e.message}};
</script></body></html>`;

// modules/wikipedia-search/index.ts
var LANGUAGES = /* @__PURE__ */ new Set(["ru", "en", "uk", "de", "fr", "es"]);
var USER_AGENT = "TeamPlatform/0.8 (local research tool; https://attrazion.github.io/team-platform-catalog/catalog.json)";
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
async function wikimedia(lang, params) {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...params }).toString();
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(15e3) });
  if (!response.ok) throw new Error(`http_${response.status}`);
  const result = await response.json();
  if (!result || typeof result !== "object" || result.error) throw new Error("invalid_response");
  return result;
}
function language(value) {
  const lang = (value || "ru").toLowerCase();
  return LANGUAGES.has(lang) ? lang : null;
}
function upstreamFailure(error) {
  if (error instanceof Error && error.message === "http_429") return fail(429, "rate_limited", "\u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u044F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B\u0430 \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
  return fail(503, "source_unavailable", "\u0412\u0438\u043A\u0438\u043F\u0435\u0434\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
}
var module = {
  id: "wikipedia-search",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/wikipedia-search/search", async (c) => {
      const lang = language(c.query.get("lang")), query = (c.query.get("q") || "").trim();
      if (!lang || !query || query.length > 300) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u044F\u0437\u044B\u043A \u0438 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043B\u0438\u043D\u043E\u0439 \u043E\u0442 1 \u0434\u043E 300 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
      try {
        const data = await wikimedia(lang, { list: "search", srsearch: query, srlimit: "10", srprop: "timestamp" });
        if (!Array.isArray(data.query?.search)) throw new Error("invalid_response");
        const results = data.query.search.flatMap((item) => {
          if (!Number.isSafeInteger(item.pageid) || item.pageid < 1 || typeof item.title !== "string") return [];
          return [{ id: item.pageid, title: item.title, url: `https://${lang}.wikipedia.org/?curid=${item.pageid}`, modified_at: typeof item.timestamp === "string" ? item.timestamp : null }];
        });
        return { body: { ok: true, lang, query, results } };
      } catch (error) {
        return upstreamFailure(error);
      }
    });
    ctx.api.add("GET", "/api/tools/wikipedia-search/article", async (c) => {
      const lang = language(c.query.get("lang")), raw = c.query.get("id") || "", id = Number(raw);
      if (!lang || !/^[1-9]\d{0,14}$/.test(raw) || !Number.isSafeInteger(id)) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u044F\u0437\u044B\u043A \u0438 \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u0442\u0430\u0442\u044C\u0438.");
      try {
        const data = await wikimedia(lang, { prop: "extracts|info", pageids: raw, inprop: "url", exintro: "1", explaintext: "1", exchars: "1200" });
        if (!Array.isArray(data.query?.pages)) throw new Error("invalid_response");
        const page = data.query.pages[0];
        if (!page || page.missing || page.pageid !== id) return fail(404, "not_found", "\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.");
        if (typeof page.title !== "string" || typeof page.extract !== "string") throw new Error("invalid_response");
        const revision = Number.isSafeInteger(page.lastrevid) && page.lastrevid > 0 ? page.lastrevid : null;
        return { body: { ok: true, article: { id, lang, title: page.title, extract: page.extract, url: `https://${lang}.wikipedia.org/?curid=${id}`, revision, revision_url: revision ? `https://${lang}.wikipedia.org/?oldid=${revision}` : null, attribution: "Wikipedia / Wikimedia contributors; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 \u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u0430\u0432\u0442\u043E\u0440\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u0441\u0442\u0430\u0442\u044C\u0438." } } };
      } catch (error) {
        return upstreamFailure(error);
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
