import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/hn-search/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u041F\u043E\u0438\u0441\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439 Hacker News</title></head><body><main><h1>\u041F\u043E\u0438\u0441\u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439 Hacker News</h1><p>\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432 Algolia. \u0414\u0430\u0442\u0430 \u2014 \u0432\u0440\u0435\u043C\u044F \u0440\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u044F \u043D\u0430 Hacker News, \u0430 \u043D\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0434\u0430\u0442\u0430 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u0430. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043F\u043E\u043B\u043D\u044B\u043C \u043E\u0431\u0437\u043E\u0440\u043E\u043C \u043D\u043E\u0432\u043E\u0441\u0442\u0435\u0439.</p><p><label>\u0422\u0435\u043C\u0430 <input id="q" maxlength="200"></label> <label>\u0414\u043D\u0435\u0439 <input id="days" type="number" min="1" max="90" value="14"></label> <button id="search">\u041D\u0430\u0439\u0442\u0438</button></p><p id="status" role="status"></p><div id="results"></div></main><script>
document.getElementById('search').onclick=async()=>{const guard=document.getElementById('status');if(!document.getElementById('q').value.trim()){guard.textContent='\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441: \u043E \u0447\u0451\u043C \u0438\u0441\u043A\u0430\u0442\u044C \u043D\u0430 Hacker News. \u041F\u043E\u0438\u0441\u043A \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D.';return}const status=document.getElementById('status'),root=document.getElementById('results');root.textContent='';status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';try{const p=new URLSearchParams({q:document.getElementById('q').value,days:document.getElementById('days').value});const r=await fetch('/api/tools/hn-search/search?'+p);const d=await r.json();if(!r.ok)throw Error(d.error.message);for(const s of d.stories){const p=document.createElement('p'),a=document.createElement('a'),discussion=document.createElement('a'),meta=document.createElement('span');a.href=s.source_url||s.discussion_url;a.textContent=s.title;a.target='_blank';a.rel='noreferrer';discussion.href=s.discussion_url;discussion.textContent='\u041E\u0431\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u0435';discussion.target='_blank';discussion.rel='noreferrer';meta.textContent=' \u2014 '+s.submitted_at+'; \u0431\u0430\u043B\u043B\u044B: '+(s.points??'\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445')+'; ';p.append(a,meta,discussion);root.append(p)}status.textContent=d.stories.length?'\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B: '+d.stories.length:'\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.'}catch(e){status.textContent=e.message}};
</script></body></html>`;

// modules/hn-search/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function sourceUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
var module = {
  id: "hn-search",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/hn-search/search", async (c) => {
      const query = (c.query.get("q") || "").trim(), daysRaw = c.query.get("days") || "14";
      const days = Number(daysRaw);
      if (!query || query.length > 200 || !/^[1-9]\d?$/.test(daysRaw) || !Number.isInteger(days) || days > 90) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043E 200 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0438 \u043F\u0435\u0440\u0438\u043E\u0434 \u043E\u0442 1 \u0434\u043E 90 \u0434\u043D\u0435\u0439.");
      const now = Math.floor(Date.now() / 1e3), since = now - days * 86400;
      const params = new URLSearchParams({ query, tags: "story", hitsPerPage: "20", numericFilters: `created_at_i>=${since},created_at_i<=${now}` });
      try {
        const response = await fetch(`https://hn.algolia.com/api/v1/search_by_date?${params}`, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(15e3) });
        if (response.status === 429) return fail(429, "rate_limited", "\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0441\u0435\u0440\u0432\u0438\u0441 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441\u044B. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        if (!response.ok) throw new Error("upstream");
        const data = await response.json();
        if (!Array.isArray(data.hits)) throw new Error("invalid_response");
        const seen = /* @__PURE__ */ new Set();
        const stories = data.hits.slice(0, 20).flatMap((item) => {
          if (!item || typeof item.objectID !== "string" || !/^[1-9]\d{0,15}$/.test(item.objectID) || typeof item.title !== "string" || !item.title.trim() || !Number.isSafeInteger(item.created_at_i) || item.created_at_i < since || item.created_at_i > now) return [];
          const url = sourceUrl(item.url);
          if (url && seen.has(url)) return [];
          if (url) seen.add(url);
          return [{ id: item.objectID, title: item.title, submitted_at: new Date(item.created_at_i * 1e3).toISOString(), source_url: url, discussion_url: `https://news.ycombinator.com/item?id=${item.objectID}`, points: Number.isSafeInteger(item.points) && item.points >= 0 ? item.points : null, comments: Number.isSafeInteger(item.num_comments) && item.num_comments >= 0 ? item.num_comments : null }];
        });
        return { body: { ok: true, query, days, since: new Date(since * 1e3).toISOString(), until: new Date(now * 1e3).toISOString(), stories } };
      } catch {
        return fail(503, "source_unavailable", "\u041F\u043E\u0438\u0441\u043A Hacker News \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
