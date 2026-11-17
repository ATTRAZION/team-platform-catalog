import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/transcript-tasks/index.ts
import { createHash } from "node:crypto";
var MAX_TRANSCRIPT = 10500;
var PART_SIZE = 1e4;
var SIZES = /* @__PURE__ */ new Set([2e3, 5e3, PART_SIZE]);
function splitText(text, size) {
  const parts = [];
  for (let start = 0; start < text.length; ) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const space = Math.max(text.lastIndexOf(" ", end - 1), text.lastIndexOf("\n", end - 1));
      if (space >= start + size / 2) end = space + 1;
      if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
    }
    parts.push({ start, end, text: text.slice(start, end) });
    start = end;
  }
  return parts;
}
var digest = (text) => createHash("sha256").update(text, "utf8").digest("hex");
var module = {
  id: "transcript-tasks",
  apiVersion: 1,
  register(ctx) {
    const transcripts = ctx.require("whisper-local");
    const { tasks } = ctx.require("tasks");
    ctx.api.add("GET", "/api/tools/transcript-tasks/:id/parts", (c) => {
      const transcript = transcripts.getTranscript(c.params.id ?? "");
      if (!transcript) return { status: 404, body: { error: { code: "transcript_not_ready", message: "\u0413\u043E\u0442\u043E\u0432\u0430\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" } } };
      const sizes = c.query.getAll("size");
      const size = sizes.length ? Number(sizes[0]) : PART_SIZE;
      if (sizes.length > 1 || sizes.length && !/^(2000|5000|10000)$/.test(sizes[0]) || !SIZES.has(size)) return { status: 400, body: { error: { code: "invalid_size", message: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0447\u0430\u0441\u0442\u0438: 2000, 5000 \u0438\u043B\u0438 10000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" } } };
      const parts = splitText(transcript.text, size);
      return { body: { ok: true, sha256: digest(transcript.text), length: transcript.text.length, part_size: size, parts: parts.map(({ start, end, text }, index) => ({ index, start, end, preview: text.slice(0, 120) })) } };
    });
    ctx.api.add("POST", "/api/tools/transcript-tasks/:id/task", (c) => {
      const transcript = transcripts.getTranscript(c.params.id ?? "");
      if (!transcript) return { status: 404, body: { error: { code: "transcript_not_ready", message: "\u0413\u043E\u0442\u043E\u0432\u0430\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" } } };
      const raw = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      const instruction = raw.instruction === void 0 ? "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C \u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438 \u0432\u044B\u0434\u0435\u043B\u0438 \u043E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u043C\u044B\u0441\u043B\u0438." : raw.instruction;
      if (typeof instruction !== "string" || !instruction.trim() || instruction.length > 1e3) return { status: 400, body: { error: { code: "validation_failed", message: "\u041F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043E\u0442 1 \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" } } };
      let text = transcript.text, partLabel = "";
      if (raw.part_index !== void 0) {
        if (!Number.isSafeInteger(raw.part_index) || typeof raw.transcript_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(raw.transcript_sha256)) return { status: 400, body: { error: { code: "invalid_part", message: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0447\u0430\u0441\u0442\u0438 \u0438 SHA-256 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0447\u0430\u0441\u0442\u0435\u0439" } } };
        if (digest(transcript.text) !== raw.transcript_sha256) return { status: 409, body: { error: { code: "transcript_changed", message: "\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0430\u0441\u044C; \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u0447\u0430\u0441\u0442\u0435\u0439 \u0437\u0430\u043D\u043E\u0432\u043E" } } };
        const size = raw.part_size === void 0 ? PART_SIZE : raw.part_size;
        if (typeof size !== "number" || !SIZES.has(size)) return { status: 400, body: { error: { code: "invalid_size", message: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0447\u0430\u0441\u0442\u0438: 2000, 5000 \u0438\u043B\u0438 10000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" } } };
        const parts = splitText(transcript.text, size), index = raw.part_index, part = parts[index];
        if (index < 0 || !part) return { status: 400, body: { error: { code: "invalid_part", message: "\u0427\u0430\u0441\u0442\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" } } };
        text = part.text;
        partLabel = `, \u0447\u0430\u0441\u0442\u044C ${index + 1}/${parts.length}, \u0440\u0430\u0437\u043C\u0435\u0440 \u0434\u043E ${size}, \u0441\u0438\u043C\u0432\u043E\u043B\u044B ${part.start}\u2013${part.end} (\u043D\u0430\u0447\u0430\u043B\u043E \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E, \u043A\u043E\u043D\u0435\u0446 \u043D\u0435\u0442), SHA-256 ${raw.transcript_sha256}`;
      } else if (text.length > MAX_TRANSCRIPT) return { status: 413, body: { error: { code: "transcript_too_long", message: "\u0422\u0435\u043A\u0441\u0442 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 10500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432; \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0447\u0430\u0441\u0442\u044C \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438" } } };
      const title = `\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C${partLabel ? " (\u0447\u0430\u0441\u0442\u044C)" : ""}: ${transcript.name || transcript.id}`.slice(0, 200);
      const description = `\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 ${transcript.id}${partLabel}
\u041F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435: ${instruction.trim()}

\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430:
${text}${partLabel ? "\n\n\u041A\u043E\u043D\u0435\u0446 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0430 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438." : ""}`;
      const task = tasks.create({ title, description, type: "research", created_by: "user", tags: ["transcript"] });
      return { status: 201, body: { ok: true, task } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
