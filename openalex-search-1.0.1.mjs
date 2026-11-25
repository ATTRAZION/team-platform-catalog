import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/openalex-search/page.ts
var PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenAlex</title></head><body><main><h1>\u041F\u043E\u0438\u0441\u043A \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0439 OpenAlex</h1><p>\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432 OpenAlex. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u2014 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435, \u0430 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0441\u0442\u0430\u0442\u0435\u0439. \u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u044B.</p><p><label>\u0422\u0435\u043C\u0430 <input id="q" maxlength="300"></label></p><p><label>\u0421 <input id="from" type="date"></label> <label>\u041F\u043E <input id="to" type="date"></label> <button id="search">\u041D\u0430\u0439\u0442\u0438</button></p><p id="status" role="status"></p><div id="results"></div></main><script>
document.getElementById('search').onclick=async()=>{const guard=document.getElementById('status');if(!document.getElementById('q').value.trim()){guard.textContent='\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441: \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0441\u043B\u043E\u0432\u043E. \u041F\u043E\u0438\u0441\u043A \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D.';return}const status=document.getElementById('status'),root=document.getElementById('results');root.textContent='';status.textContent='\u041F\u043E\u0438\u0441\u043A\u2026';try{const params=new URLSearchParams({q:document.getElementById('q').value,from:document.getElementById('from').value,to:document.getElementById('to').value});const r=await fetch('/api/tools/openalex-search/search?'+params);const data=await r.json();if(!r.ok)throw Error(data.error.message);for(const work of data.works){const p=document.createElement('p'),a=document.createElement('a'),meta=document.createElement('span');a.href=work.id;a.target='_blank';a.rel='noreferrer';a.textContent=work.title;meta.textContent=' \u2014 '+(work.published||'\u0434\u0430\u0442\u0430 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430')+'; '+(work.authors.join(', ')||'\u0430\u0432\u0442\u043E\u0440\u044B \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B')+(work.open_access===true?'; \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C OpenAlex':'');p.append(a,meta);root.append(p)}status.textContent=data.works.length?'\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B: '+data.works.length:'\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.'}catch(e){status.textContent=e.message}};
</script></body></html>`;

// modules/openalex-search/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
var module = {
  id: "openalex-search",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/openalex-search/search", async (c) => {
      const query = (c.query.get("q") || "").trim(), from = c.query.get("from") || "", to = c.query.get("to") || "";
      if (!query || query.length > 300 || from && !validDate(from) || to && !validDate(to) || from && to && from > to) return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043E 300 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0438 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u0434\u0430\u0442\u044B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0413\u0413\u0413\u0413-\u041C\u041C-\u0414\u0414.");
      const params = new URLSearchParams({ search: query, "per-page": "10", select: "id,display_name,publication_date,authorships,doi,open_access" });
      const filters = [from ? `from_publication_date:${from}` : "", to ? `to_publication_date:${to}` : ""].filter(Boolean);
      if (filters.length) params.set("filter", filters.join(","));
      try {
        const response = await fetch(`https://api.openalex.org/works?${params}`, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(15e3) });
        if (response.status === 429) return fail(429, "rate_limited", "OpenAlex \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u0438\u043B\u0438 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u0431\u044E\u0434\u0436\u0435\u0442. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        if (!response.ok) throw new Error("upstream");
        const data = await response.json();
        if (!Array.isArray(data.results)) throw new Error("invalid_response");
        const works = data.results.slice(0, 10).flatMap((item) => {
          if (typeof item?.id !== "string" || !/^https:\/\/openalex\.org\/W\d+$/.test(item.id) || typeof item.display_name !== "string" || !item.display_name) return [];
          const authors = Array.isArray(item.authorships) ? item.authorships.slice(0, 15).flatMap((a) => typeof a?.author?.display_name === "string" ? [a.author.display_name] : []) : [];
          return [{ id: item.id, title: item.display_name, authors, published: typeof item.publication_date === "string" && validDate(item.publication_date) ? item.publication_date : null, doi: typeof item.doi === "string" && /^https:\/\/doi\.org\/10\.\d{4,9}\/\S{1,200}$/i.test(item.doi) ? item.doi : null, open_access: typeof item.open_access?.is_oa === "boolean" ? item.open_access.is_oa : null }];
        });
        return { body: { ok: true, query, from: from || null, to: to || null, works } };
      } catch {
        return fail(503, "source_unavailable", "OpenAlex \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      }
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
