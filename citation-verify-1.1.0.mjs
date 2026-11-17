import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/citation-verify/page.ts
var PAGE = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0446\u0438\u0442\u0430\u0442</title>
</head>
<body>
<h1>\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0446\u0438\u0442\u0430\u0442 \u043F\u043E Crossref</h1>
<p>\u0412\u0432\u0435\u0434\u0438\u0442\u0435 DOI, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u0438 \u0441\u0440\u0430\u0432\u043D\u0438\u0442\u044C \u0438\u0445 \u0441 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u043C\u0438 \u0430\u0432\u0442\u043E\u0440\u043E\u043C/\u0433\u043E\u0434\u043E\u043C/\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C.</p>
</body>
</html>`;

// modules/citation-verify/index.ts
function fail(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } };
}
var DOI_RE = /^10\.\d{4,9}\/\S{1,200}$/i;
function normalizeWork(item) {
  const doi = typeof item?.DOI === "string" ? item.DOI : "";
  if (!DOI_RE.test(doi)) return null;
  const title = Array.isArray(item.title) && typeof item.title[0] === "string" ? item.title[0] : "";
  if (!title) return null;
  const authors = Array.isArray(item.author) ? item.author.flatMap((a) => {
    if (!a || typeof a !== "object") return [];
    const full = [a.given, a.family].filter((x) => typeof x === "string").join(" ").trim();
    if (full) return [full];
    return typeof a.name === "string" ? [a.name] : [];
  }) : [];
  let published = null;
  const parts = Array.isArray(item.published?.["date-parts"]) ? item.published["date-parts"][0] : null;
  if (Array.isArray(parts) && parts.length >= 1 && parts.every((n) => Number.isInteger(n))) {
    published = parts.map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-").slice(0, parts.length === 1 ? 4 : parts.length === 2 ? 7 : 10);
  }
  return {
    doi,
    title,
    authors,
    published,
    type: typeof item.type === "string" ? item.type : null,
    publisher: typeof item.publisher === "string" ? item.publisher : null,
    url: `https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, "/")}`
  };
}
function yearOf(published) {
  if (!published) return null;
  const m = published.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}
var module = {
  id: "citation-verify",
  apiVersion: 1,
  register(ctx) {
    ctx.api.add("GET", "/api/tools/citation-verify/verify", async (c) => {
      const doi = (c.query.get("doi") || "").trim();
      if (!doi || !DOI_RE.test(doi)) {
        return fail(400, "validation_failed", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 DOI (\u0444\u043E\u0440\u043C\u0430\u0442 10.xxxx/...).");
      }
      const expectedAuthor = (c.query.get("author") || "").trim();
      const expectedYearRaw = (c.query.get("year") || "").trim();
      const expectedTitle = (c.query.get("title") || "").trim();
      const expectedYear = expectedYearRaw ? Number(expectedYearRaw) : null;
      if (expectedYearRaw && !Number.isInteger(expectedYear)) {
        return fail(400, "validation_failed", "\u0413\u043E\u0434 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C.");
      }
      let response;
      try {
        response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          headers: { "user-agent": "TeamPlatform/0.8 (local research)", accept: "application/json" },
          redirect: "error",
          signal: AbortSignal.timeout(15e3)
        });
      } catch {
        return fail(503, "source_unavailable", "Crossref \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      }
      if (response.status === 404) {
        return { body: { ok: true, doi, verified: false, source: null, mismatches: ["doi_not_found"] } };
      }
      if (response.status === 429) {
        return fail(429, "rate_limited", "Crossref \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
      }
      if (!response.ok) {
        return fail(503, "source_unavailable", "Crossref \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      }
      let data;
      try {
        data = await response.json();
      } catch {
        return fail(503, "source_unavailable", "Crossref \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 JSON.");
      }
      const work = normalizeWork(data?.message);
      if (!work) {
        return fail(503, "source_unavailable", "Crossref \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435.");
      }
      const mismatches = [];
      if (expectedAuthor) {
        const hay = work.authors.join(" ").toLowerCase();
        if (!hay.includes(expectedAuthor.toLowerCase())) mismatches.push("author");
      }
      if (expectedYear !== null) {
        const y = yearOf(work.published);
        if (y !== expectedYear) mismatches.push("year");
      }
      if (expectedTitle) {
        if (!work.title.toLowerCase().includes(expectedTitle.toLowerCase())) mismatches.push("title");
      }
      return {
        body: {
          ok: true,
          doi,
          verified: mismatches.length === 0,
          source: work,
          mismatches
        }
      };
    });
    ctx.api.add("GET", "/api/tools/citation-verify/draft", async (c) => {
      const draftId = (c.query.get("draft_id") || "").trim();
      if (!draftId) return fail(400, "validation_failed", "\u041D\u0443\u0436\u0435\u043D draft_id.");
      let rows = [];
      try {
        rows = ctx.storage.raw.prepare("SELECT * FROM author_studio_items WHERE kind = 'citation'").all();
      } catch {
        return fail(503, "storage_unavailable", "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.");
      }
      const citations = rows.map((row) => {
        try {
          return { row, meta: JSON.parse(row.metadata || "{}") };
        } catch {
          return null;
        }
      }).filter((x) => !!x && x.meta?.draft_id === draftId).map((x) => ({
        citation_id: String(x.row.id),
        source_id: String(x.meta.source_id || "").trim(),
        author: String(x.meta.author || "").trim(),
        year: Number(x.meta.year),
        locator: String(x.meta.locator || "").trim()
      }));
      const results = [];
      for (const cit of citations) {
        const doi = cit.source_id;
        if (!DOI_RE.test(doi)) {
          results.push({ citation_id: cit.citation_id, source_id: doi, verified: false, mismatches: ["invalid_doi"], source: null });
          continue;
        }
        let work = null;
        let mismatches = [];
        let failed = false;
        try {
          const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
            headers: { "user-agent": "TeamPlatform/0.8 (local research)", accept: "application/json" },
            redirect: "error",
            signal: AbortSignal.timeout(15e3)
          });
          if (response.status === 404) {
            mismatches = ["doi_not_found"];
          } else if (!response.ok) {
            failed = true;
          } else {
            let data;
            try {
              data = await response.json();
            } catch {
              failed = true;
              data = null;
            }
            if (!failed) {
              work = normalizeWork(data?.message);
              if (!work) {
                failed = true;
              } else {
                if (cit.author && !work.authors.join(" ").toLowerCase().includes(cit.author.toLowerCase())) mismatches.push("author");
                if (Number.isFinite(cit.year)) {
                  const y = yearOf(work.published);
                  if (y !== cit.year) mismatches.push("year");
                }
              }
            }
          }
        } catch {
          failed = true;
        }
        if (failed) {
          results.push({ citation_id: cit.citation_id, source_id: doi, verified: false, mismatches: ["source_unavailable"], source: null });
        } else {
          results.push({ citation_id: cit.citation_id, source_id: doi, verified: mismatches.length === 0, mismatches, source: work });
        }
      }
      const verifiedCount = results.filter((r) => r.verified).length;
      return { body: { ok: true, draft_id: draftId, total: results.length, verified: verifiedCount, results } };
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
