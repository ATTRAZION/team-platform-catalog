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

// modules/citation-match/math.ts
var MAX_RECORDS = 10;
var MAX_AUTHORS = 50;
var MAX_TITLE_LENGTH = 500;
var DOI_RE = /^10\.\d{4,9}\/\S+$/;
var DOI_PREFIX = /^(?:(?:https?:\/\/)?(?:dx\.|www\.)?doi\.org\/|doi:\s*)/i;
var DOI_TRAILING_PUNCTUATION = /[.,;:]+$/;
var FIELDS = ["doi", "title", "authors", "year"];
function normalizeDoi(raw) {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  if (!value) return null;
  value = value.replace(DOI_PREFIX, "").replace(DOI_TRAILING_PUNCTUATION, "").trim().toLowerCase();
  return DOI_RE.test(value) ? value : null;
}
function normalizeText(raw) {
  return raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
function titleTokens(raw) {
  return raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, " ").trim().split(/\s+/).filter(Boolean);
}
var SURNAME_PARTICLES = /* @__PURE__ */ new Set([
  "van",
  "von",
  "der",
  "den",
  "de",
  "del",
  "della",
  "di",
  "da",
  "du",
  "la",
  "le",
  "les",
  "ter",
  "ten",
  "te",
  "bin",
  "ibn",
  "al",
  "el",
  "ap",
  "af",
  "av",
  "zu",
  "zum",
  "zur",
  "of",
  "the"
]);
function isParticleWord(word) {
  return SURNAME_PARTICLES.has(normalizeText(word));
}
function isSurnameParticle(parts, index) {
  const token = parts[index];
  if (!token || !isParticleWord(token.word)) return false;
  if (token.raw === token.raw.toLowerCase()) return true;
  if (index > 0) return true;
  return parts.length >= 3 && Boolean(parts[1] && isParticleWord(parts[1].word));
}
function surnameOf(raw) {
  const text = raw.trim();
  if (!text) return "";
  const comma = text.search(/[,;]/);
  if (comma > 0) return normalizeText(text.slice(0, comma));
  const parts = text.split(/\s+/).filter(Boolean).map((token) => ({ raw: token, word: normalizeText(token) })).filter((token) => Boolean(token.word));
  if (!parts.length) return "";
  let end = parts.length;
  if (parts[end - 1].word.length <= 2 && end >= 2) end -= 1;
  let start = end - 1;
  while (start > 0 && isSurnameParticle(parts, start - 1)) start -= 1;
  return parts.slice(start, end).map((token) => token.word).join(" ");
}
function isStrictPrefix(short, long) {
  if (short.length >= long.length) return false;
  return short.every((token, index) => long[index] === token);
}
function compareTitle(citation, record) {
  if (!citation.title) return "not_compared";
  if (!record.title) return "mismatch";
  const left = titleTokens(citation.title);
  const right = titleTokens(record.title);
  if (!left.length) return "not_compared";
  if (!right.length) return "mismatch";
  if (left.join(" ") === right.join(" ")) return "match";
  return isStrictPrefix(left, right) ? "match" : "mismatch";
}
function compareAuthors(citation, record) {
  const cited = citation.authors ?? [];
  const recorded = record.authors ?? [];
  if (!cited.length) return "not_compared";
  if (cited.length > recorded.length) return "mismatch";
  const need = cited.map(surnameOf);
  const have = recorded.map(surnameOf);
  if (!need.some(Boolean)) return "not_compared";
  return need.every((surname, index) => Boolean(surname) && have[index] === surname) ? "match" : "mismatch";
}
function comparePair(citation, record) {
  const checks = {
    doi: citation.doi ? record.doi && citation.doi.toLowerCase() === record.doi.toLowerCase() ? "match" : "mismatch" : "not_compared",
    title: compareTitle(citation, record),
    authors: compareAuthors(citation, record),
    year: citation.year === null ? "not_compared" : record.year === citation.year ? "match" : "mismatch"
  };
  const mismatches = FIELDS.filter((field) => checks[field] === "mismatch");
  const matched = FIELDS.filter((field) => checks[field] === "match").length;
  return { record, checks, mismatches, matched };
}
function matchedBy(checks) {
  if (checks.doi === "match") return "doi";
  if (checks.title === "match") return "title";
  return null;
}
function fullMatch(citation, pair) {
  const identifying = citation.doi !== null && pair.checks.doi === "match" || citation.title !== null && pair.checks.title === "match";
  return identifying && pair.mismatches.length === 0;
}
function compareCitation(citation, records) {
  const normalized = {
    ...citation,
    doi: normalizeDoi(citation.doi)
  };
  const pairs = records.map((record) => comparePair(normalized, { ...record, doi: normalizeDoi(record.doi) }));
  const empty = {
    verdict: "not_found",
    reason: null,
    record: null,
    matched_by: null,
    checks: null,
    mismatches: [],
    candidates: []
  };
  if (!pairs.length) return empty;
  if (normalized.doi === null && !normalized.title) {
    return {
      verdict: "ambiguous",
      reason: "insufficient_fields",
      record: null,
      matched_by: null,
      checks: null,
      mismatches: [],
      candidates: pairs
    };
  }
  const full = pairs.filter((pair) => fullMatch(normalized, pair));
  if (full.length === 1) {
    const only2 = full[0];
    return {
      verdict: "exact",
      reason: null,
      record: only2.record,
      matched_by: matchedBy(only2.checks),
      checks: only2.checks,
      mismatches: [],
      candidates: full
    };
  }
  if (full.length > 1) {
    return {
      verdict: "ambiguous",
      reason: "multiple_candidates",
      record: null,
      matched_by: null,
      checks: null,
      mismatches: [],
      candidates: full
    };
  }
  const best = Math.max(...pairs.map((pair) => pair.matched));
  const top = pairs.filter((pair) => pair.matched === best);
  if (top.length > 1) {
    return {
      verdict: "ambiguous",
      reason: "multiple_candidates",
      record: null,
      matched_by: null,
      checks: null,
      mismatches: [],
      candidates: top
    };
  }
  const only = top[0];
  return {
    verdict: "metadata_mismatch",
    reason: null,
    record: only.record,
    matched_by: matchedBy(only.checks),
    checks: only.checks,
    mismatches: only.mismatches,
    candidates: top
  };
}

// modules/citation-match/page.ts
var PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
<title>\u0421\u0432\u0435\u0440\u043A\u0430 \u0446\u0438\u0442\u0430\u0442\u044B \u0441 \u0437\u0430\u043F\u0438\u0441\u044C\u044E</title></head><body>
<h1>\u0421\u0432\u0435\u0440\u043A\u0430 \u0446\u0438\u0442\u0430\u0442\u044B \u0441 \u0437\u0430\u043F\u0438\u0441\u044C\u044E</h1>
<p>\u0426\u0438\u0442\u0430\u0442\u0430 \u0441\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u0441 \u0443\u0436\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u044C\u044E \u043F\u043E DOI, \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E, \u0430\u0432\u0442\u043E\u0440\u0430\u043C \u0438 \u0433\u043E\u0434\u0443.
\u0421\u0435\u0442\u044C \u043D\u0435 \u043D\u0443\u0436\u043D\u0430: \u0437\u0430\u043F\u0438\u0441\u044C \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u0438\u0437 <code>crossref-search</code> \u0438\u043B\u0438
<code>openalex-search</code>.</p>
<p><code>POST /api/tools/citation-match/compare</code> \u0441
<code>{ citation, records }</code> \u0438\u043B\u0438 <code>{ citation, record }</code>.
\u0412\u0435\u0440\u0434\u0438\u043A\u0442\u044B: <code>exact</code>, <code>metadata_mismatch</code>,
<code>not_found</code>, <code>ambiguous</code>. \u041D\u0435\u043E\u0434\u043D\u043E\u0437\u043D\u0430\u0447\u043D\u043E\u0441\u0442\u044C \u043D\u0435
\u0443\u0433\u0430\u0434\u044B\u0432\u0430\u0435\u0442\u0441\u044F: \u043F\u0440\u0438 \u0440\u0430\u0432\u043D\u044B\u0445 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0430\u0445 \u043E\u0442\u0432\u0435\u0442 \u2014 <code>ambiguous</code> \u0441\u043E \u0441\u043F\u0438\u0441\u043A\u043E\u043C
<code>candidates</code>.</p>
<p><code>not_found</code> \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \xAB\u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043E\xBB, \u0430 \u043D\u0435 \xAB\u0432 Crossref
\u043D\u0435\u0442\xBB: \u043C\u043E\u0434\u0443\u043B\u044C \u043D\u0435 \u0434\u0435\u043B\u0430\u0435\u0442 \u0432\u0438\u0434, \u0447\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u043B \u0432\u043D\u0435\u0448\u043D\u0438\u0439 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A.</p>
<p>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0441\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u043D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u043C \u0441\u043B\u043E\u0432\u0430\u043C, \u043D\u043E <code>+</code> \u0438
<code>#</code> \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F: <code>C++</code>, <code>C#</code> \u0438 <code>C</code>
\u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0434\u043D\u0438\u043C \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\u043C.</p>
<p>DOI \u043D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u0443\u0435\u0442\u0441\u044F: <code>doi.org</code>, <code>dx.doi.org</code>,
<code>www.doi.org</code>, <code>doi:</code> \u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u044E\u0449\u0430\u044F \u043F\u0443\u043D\u043A\u0442\u0443\u0430\u0446\u0438\u044F \u043D\u0435 \u043C\u0435\u0448\u0430\u044E\u0442
\u0441\u0432\u0435\u0440\u043A\u0435. \u0414\u0430\u0442\u0430 <code>published</code> \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u043D\u043E, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0432\u0438\u0441\u043E\u043A\u043E\u0441\u043D\u044B\u0435
\u0433\u043E\u0434\u044B, \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u0434\u0430\u0436\u0435 \u043F\u0440\u0438 \u0437\u0430\u0434\u0430\u043D\u043D\u043E\u043C <code>year</code>.</p>
<p>\u0413\u043E\u0434 \u0441\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u0441\u0442\u0440\u043E\u0433\u043E: \u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043D\u0430 \u0433\u043E\u0434 \u2014 \u044D\u0442\u043E
<code>metadata_mismatch</code>, \u0430 \u043D\u0435 <code>exact</code>. \u0410\u0432\u0442\u043E\u0440\u044B \u0441\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E\u0442\u0441\u044F
\u043F\u043E \u0444\u0430\u043C\u0438\u043B\u0438\u0438 \u043A\u0430\u043A \u0443\u043F\u043E\u0440\u044F\u0434\u043E\u0447\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u0435\u0444\u0438\u043A\u0441 \u0437\u0430\u043F\u0438\u0441\u0438: <code>[LeCun, Bengio]</code>
\u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0451\u0442 \u0441 <code>[Bengio, LeCun]</code>, \u0430 <code>[Bengio]</code> \u2014 \u0441 \u0437\u0430\u043F\u0438\u0441\u044C\u044E,
\u0433\u0434\u0435 Bengio \u043D\u0435 \u043F\u0435\u0440\u0432\u044B\u0439. \u0414\u0438\u0430\u043A\u0440\u0438\u0442\u0438\u043A\u0430 \u043D\u043E\u0440\u043C\u0430\u043B\u0438\u0437\u0443\u0435\u0442\u0441\u044F; \u0447\u0430\u0441\u0442\u0438\u0446\u044B \u0444\u0430\u043C\u0438\u043B\u0438\u0439 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F
(<code>van der Waals, J.</code> = <code>Johannes Diderik van der Waals</code>);
\u043E\u0434\u043D\u043E\u0444\u0430\u043C\u0438\u043B\u044C\u0446\u044B \u043F\u043E \u0438\u043C\u0435\u043D\u0438 \u043D\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F.</p>
</body></html>`;

// modules/citation-match/index.ts
var NO_STORE = { "cache-control": "no-store" };
function bodyOf(raw) {
  if (raw === void 0 || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0422\u0435\u043B\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "citation_match_body_invalid"
    });
  }
  return raw;
}
function asText(value, field) {
  if (value === void 0 || value === null) return null;
  if (typeof value !== "string") {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 ${field} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`, { field }, {
      code: "citation_match_field_invalid"
    });
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`\u041F\u043E\u043B\u0435 ${field} \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${MAX_TITLE_LENGTH} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`, { field }, {
      code: "citation_match_field_too_long"
    });
  }
  return trimmed;
}
function authorsOf(value) {
  if (value === void 0 || value === null || value === "") return [];
  const list = typeof value === "string" ? [value] : Array.isArray(value) ? value : null;
  if (!list) {
    throw new ValidationError("\u0410\u0432\u0442\u043E\u0440\u044B \u2014 \u0441\u0442\u0440\u043E\u043A\u0430 \u0438\u043B\u0438 \u043C\u0430\u0441\u0441\u0438\u0432 \u0441\u0442\u0440\u043E\u043A", { field: "authors" }, {
      code: "citation_match_authors_invalid"
    });
  }
  if (list.length > MAX_AUTHORS) {
    throw new ValidationError(`\u0411\u043E\u043B\u044C\u0448\u0435 ${MAX_AUTHORS} \u0430\u0432\u0442\u043E\u0440\u043E\u0432 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F`, { limit: MAX_AUTHORS }, {
      code: "citation_match_authors_too_many"
    });
  }
  const authors = [];
  for (const entry of list) {
    if (typeof entry !== "string") {
      throw new ValidationError("\u0410\u0432\u0442\u043E\u0440\u044B \u2014 \u0441\u0442\u0440\u043E\u043A\u0430 \u0438\u043B\u0438 \u043C\u0430\u0441\u0441\u0438\u0432 \u0441\u0442\u0440\u043E\u043A", { field: "authors" }, {
        code: "citation_match_authors_invalid"
      });
    }
    const trimmed = entry.trim();
    if (trimmed) authors.push(trimmed);
  }
  return authors;
}
function asYear(value) {
  if (value === void 0 || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d{4}$/.test(value.trim()) ? Number(value) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1e3 || parsed > 2999) {
    throw new ValidationError("\u0413\u043E\u0434 \u2014 \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 1000 \u0434\u043E 2999", { received: value }, {
      code: "citation_match_year_invalid"
    });
  }
  return parsed;
}
function daysInMonth(year, month) {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}
function yearFromPublished(value) {
  if (value === void 0 || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ValidationError("\u0414\u0430\u0442\u0430 \u0437\u0430\u043F\u0438\u0441\u0438 \u2014 \u0441\u0442\u0440\u043E\u043A\u0430 \u0413\u0413\u0413\u0413[-\u041C\u041C[-\u0414\u0414]]", { received: typeof value }, {
      code: "citation_match_published_invalid"
    });
  }
  const match = value.trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) {
    throw new ValidationError("\u0414\u0430\u0442\u0430 \u0437\u0430\u043F\u0438\u0441\u0438 \u2014 \u0441\u0442\u0440\u043E\u043A\u0430 \u0413\u0413\u0413\u0413[-\u041C\u041C[-\u0414\u0414]]", { received: value }, {
      code: "citation_match_published_invalid"
    });
  }
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  const maxDay = day !== null && month !== null ? daysInMonth(year, month) : 31;
  if (year < 1e3 || year > 2999 || month !== null && (month < 1 || month > 12) || day !== null && (day < 1 || day > maxDay)) {
    throw new ValidationError("\u0414\u0430\u0442\u0430 \u0437\u0430\u043F\u0438\u0441\u0438 \u0432\u043D\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430", { received: value }, {
      code: "citation_match_published_invalid"
    });
  }
  return year;
}
function doiOf(source) {
  const raw = asText(source.doi, "doi");
  const doi = normalizeDoi(raw);
  if (raw && !doi) {
    throw new ValidationError("DOI \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 10.xxxx/...", { received: raw }, {
      code: "citation_match_doi_invalid"
    });
  }
  return doi;
}
function citationOf(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043E\u0431\u044A\u0435\u043A\u0442 citation", { received: typeof raw }, {
      code: "citation_match_citation_required"
    });
  }
  const source = raw;
  const citation = {
    doi: doiOf(source),
    title: asText(source.title, "title"),
    authors: authorsOf(source.authors ?? source.author),
    year: asYear(source.year)
  };
  if (!citation.doi && !citation.title && !citation.authors.length && citation.year === null) {
    throw new ValidationError("\u0426\u0438\u0442\u0430\u0442\u0430 \u043F\u0443\u0441\u0442\u0430: \u043D\u0443\u0436\u0435\u043D DOI, \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0430\u0432\u0442\u043E\u0440\u044B \u0438\u043B\u0438 \u0433\u043E\u0434", {}, {
      code: "citation_match_citation_empty"
    });
  }
  return citation;
}
function recordOf(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError("\u0417\u0430\u043F\u0438\u0441\u044C \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C", { received: typeof raw }, {
      code: "citation_match_record_invalid"
    });
  }
  const source = raw;
  const explicitYear = source.year === void 0 || source.year === null || source.year === "" ? null : asYear(source.year);
  const publishedYear = yearFromPublished(source.published);
  const record = {
    doi: doiOf(source),
    title: asText(source.title, "title"),
    authors: authorsOf(source.authors ?? source.author),
    year: explicitYear ?? publishedYear
  };
  if (!record.doi && !record.title) {
    throw new ValidationError("\u0423 \u0437\u0430\u043F\u0438\u0441\u0438 \u043D\u0443\u0436\u0435\u043D DOI \u0438\u043B\u0438 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435", {}, {
      code: "citation_match_record_invalid"
    });
  }
  return record;
}
var module = {
  id: "citation-match",
  apiVersion: 1,
  register(ctx) {
    ctx.publish?.({ compare: compareCitation });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    }));
    ctx.api.add("GET", "/api/tools/citation-match/summary", () => ({
      status: 200,
      headers: NO_STORE,
      body: {
        ok: true,
        verdicts: ["exact", "metadata_mismatch", "not_found", "ambiguous"],
        checks: ["doi", "title", "authors", "year"],
        limits: { records: MAX_RECORDS, authors: MAX_AUTHORS, title: MAX_TITLE_LENGTH },
        needs: { network: false, keys: false, process: false }
      }
    }));
    ctx.api.add("POST", "/api/tools/citation-match/compare", (request) => {
      const body = bodyOf(request.body);
      const citation = citationOf(body.citation);
      let records;
      if (body.records !== void 0) {
        if (!Array.isArray(body.records)) {
          throw new ValidationError("records \u2014 \u043C\u0430\u0441\u0441\u0438\u0432 \u0437\u0430\u043F\u0438\u0441\u0435\u0439", { received: typeof body.records }, {
            code: "citation_match_records_invalid"
          });
        }
        if (body.records.length > MAX_RECORDS) {
          throw new ValidationError(`\u0411\u043E\u043B\u044C\u0448\u0435 ${MAX_RECORDS} \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0441\u044F`, { limit: MAX_RECORDS }, {
            code: "citation_match_records_too_many"
          });
        }
        records = body.records.map(recordOf);
      } else if (body.record !== void 0) {
        records = [recordOf(body.record)];
      } else {
        throw new ValidationError("\u041D\u0443\u0436\u0435\u043D record \u0438\u043B\u0438 records (\u043F\u0443\u0441\u0442\u043E\u0439 records \u2014 \u044D\u0442\u043E not_found)", {}, {
          code: "citation_match_records_required"
        });
      }
      const result = compareCitation(citation, records);
      return { status: 200, headers: NO_STORE, body: { ok: true, ...result } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
