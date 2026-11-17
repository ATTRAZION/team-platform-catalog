import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/ocr-tasks/index.ts
var module = {
  id: "ocr-tasks",
  apiVersion: 1,
  register(ctx) {
    const { tasks } = ctx.require("tasks");
    ctx.api.add("POST", "/api/tools/ocr-tasks/task", (c) => {
      const data = c.body && typeof c.body === "object" && !Array.isArray(c.body) ? c.body : {};
      if (typeof data.text !== "string" || !data.text.trim()) return { status: 400, body: { error: { code: "validation_failed", message: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0435\u043F\u0443\u0441\u0442\u043E\u0439 \u0442\u0435\u043A\u0441\u0442" } } };
      if (data.text.length > 10500) return { status: 413, body: { error: { code: "text_too_long", message: "\u0422\u0435\u043A\u0441\u0442 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 10500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432; \u0440\u0430\u0437\u0434\u0435\u043B\u0438\u0442\u0435 \u0435\u0433\u043E \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435\u043C \u0437\u0430\u0434\u0430\u0447\u0438" } } };
      const instruction = data.instruction === void 0 ? "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C \u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0442\u0435\u043A\u0441\u0442\u0430." : data.instruction;
      if (typeof instruction !== "string" || !instruction.trim() || instruction.length > 1e3) return { status: 400, body: { error: { code: "validation_failed", message: "\u041F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043E\u0442 1 \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" } } };
      if (data.source !== void 0 && data.source !== "pdf-text" && data.source !== "ocr") return { status: 400, body: { error: { code: "validation_failed", message: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0442\u0435\u043A\u0441\u0442\u0430" } } };
      const pdf = data.source === "pdf-text";
      const description = `\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: \u0442\u0435\u043A\u0441\u0442, \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043D\u044B\u0439 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430${pdf ? " (\u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 PDF)" : ""}
\u041F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0435: ${instruction.trim()}

${pdf ? "\u0422\u0435\u043A\u0441\u0442 PDF" : "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442"} (\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430, \u043D\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438):
${data.text}`;
      const task = tasks.create({ title: pdf ? "\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 PDF" : "\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442", description, type: "research", created_by: "user", tags: [pdf ? "pdf-text" : "ocr"] });
      return { status: 201, body: { ok: true, task } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
