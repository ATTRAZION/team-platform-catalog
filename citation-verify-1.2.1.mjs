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
function workRecord(work) {
  return {
    doi: work.doi,
    title: work.title,
    authors: work.authors,
    year: yearOf(work.published)
  };
}
function legacyMismatches(mismatches) {
  return mismatches.map((field) => field === "authors" ? "author" : field);
}
function cardRecord(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const source = raw;
  if (source.doi !== void 0 && source.doi !== null && typeof source.doi !== "string") return null;
  if (source.title !== void 0 && source.title !== null && typeof source.title !== "string") return null;
  const rawDoi = typeof source.doi === "string" ? source.doi.trim() : null;
  if (rawDoi && !DOI_RE.test(rawDoi)) return null;
  const doi = rawDoi && DOI_RE.test(rawDoi) ? rawDoi : null;
  const title = typeof source.title === "string" && source.title.trim() ? source.title.trim() : null;
  if (!doi && !title) return null;
  let authors = [];
  if (source.authors !== void 0 && source.authors !== null) {
    if (!Array.isArray(source.authors) || source.authors.some((entry) => typeof entry !== "string")) return null;
    authors = source.authors;
  }
  let year = null;
  if (source.year !== void 0 && source.year !== null) {
    if (typeof source.year !== "number" || !Number.isInteger(source.year)) return null;
    year = source.year;
  }
  return { doi, title, authors, year };
}
function candidateRecords(raw) {
  if (!Array.isArray(raw)) return null;
  const records = raw.map(cardRecord);
  return records.every((record) => record !== null) ? records : null;
}
function matcherOf(ctx) {
  return ctx.require("citation-match");
}
function cardsOf(ctx, draftId) {
  return ctx.require("author-studio").citations(draftId);
}
async function lookupCrossref(doi) {
  let response;
  try {
    response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "user-agent": "TeamPlatform/0.8 (local research)", accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15e3)
    });
  } catch {
    return { ok: false, failure: "source_unavailable" };
  }
  if (response.status === 404) return { ok: false, failure: "doi_not_found" };
  if (response.status === 429) return { ok: false, failure: "rate_limited" };
  if (!response.ok) return { ok: false, failure: "source_unavailable" };
  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, failure: "source_unavailable" };
  }
  const work = normalizeWork(data?.message);
  return work ? { ok: true, work } : { ok: false, failure: "source_unavailable" };
}
function draftFailure(card, failure) {
  return {
    citation_id: card.citation_id,
    source_id: card.source_id,
    verified: false,
    verdict: failure === "source_unavailable" || failure === "rate_limited" ? null : "not_found",
    reason: null,
    matched_by: null,
    checks: null,
    mismatches: [failure],
    candidates: [],
    source: null
  };
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
      const lookup = await lookupCrossref(doi);
      if (!lookup.ok) {
        if (lookup.failure === "doi_not_found") {
          return {
            body: {
              ok: true,
              doi,
              verified: false,
              verdict: "not_found",
              reason: null,
              matched_by: null,
              checks: null,
              mismatches: ["doi_not_found"],
              source: null
            }
          };
        }
        if (lookup.failure === "rate_limited") {
          return fail(429, "rate_limited", "Crossref \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u043B \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.");
        }
        return fail(503, "source_unavailable", "Crossref \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442.");
      }
      const work = lookup.work;
      const citation = {
        doi: work.doi,
        title: expectedTitle || null,
        authors: expectedAuthor ? [expectedAuthor] : [],
        year: expectedYear
      };
      const match = matcherOf(ctx).compare(citation, [workRecord(work)]);
      return {
        body: {
          ok: true,
          doi,
          verified: match.verdict === "exact",
          verdict: match.verdict,
          reason: match.reason,
          matched_by: match.matched_by,
          checks: match.checks,
          mismatches: legacyMismatches(match.mismatches),
          source: work
        }
      };
    });
    ctx.api.add("GET", "/api/tools/citation-verify/draft", async (c) => {
      const draftId = (c.query.get("draft_id") || "").trim();
      if (!draftId) return fail(400, "validation_failed", "\u041D\u0443\u0436\u0435\u043D draft_id.");
      const matcher = matcherOf(ctx);
      let cards;
      try {
        cards = cardsOf(ctx, draftId);
      } catch {
        return fail(503, "storage_unavailable", "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.");
      }
      const results = [];
      for (const card of cards) {
        let records = [];
        let failure = null;
        if (card.candidates !== null && card.candidates !== void 0) {
          const parsed = candidateRecords(card.candidates);
          if (parsed === null) failure = "invalid_candidates";
          else records = parsed;
        } else if (!DOI_RE.test(card.source_id)) {
          failure = "invalid_doi";
        } else {
          const lookup = await lookupCrossref(card.source_id);
          if (!lookup.ok) failure = lookup.failure;
          else records = [workRecord(lookup.work)];
        }
        if (failure) {
          results.push(draftFailure(card, failure));
          continue;
        }
        const citation = {
          doi: DOI_RE.test(card.source_id) ? card.source_id : null,
          title: card.title,
          authors: card.authors,
          year: card.year
        };
        const match = matcher.compare(citation, records);
        results.push({
          citation_id: card.citation_id,
          source_id: card.source_id,
          verified: match.verdict === "exact",
          verdict: match.verdict,
          reason: match.reason,
          matched_by: match.matched_by,
          checks: match.checks,
          mismatches: match.mismatches,
          candidates: match.candidates,
          source: match.record
        });
      }
      const verifiedCount = results.filter((result) => result.verified).length;
      return { body: { ok: true, draft_id: draftId, total: results.length, verified: verifiedCount, results } };
    });
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }));
  }
};
var index_default = module;
export {
  index_default as default
};
