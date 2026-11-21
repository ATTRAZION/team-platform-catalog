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

// src/domain/team-room/protocol.ts
var IMAGE_MODULE = { id: "image-info", version: "1.1.0" };
var IMAGE_OPERATION = "image.metadata@1";
var REPORT_MODULE = { id: "image-report", version: "1.0.0" };
var REPORT_OPERATION = "image.report@1";
var TEXT_MODULE = { id: "ollama-local", version: "1.13.0" };
var TEXT_OPERATION = "text.summary@1";
var operationModules = { [IMAGE_OPERATION]: IMAGE_MODULE, [REPORT_OPERATION]: REPORT_MODULE, [TEXT_OPERATION]: TEXT_MODULE };
var MAX_IMAGE_BYTES = 256 * 1024;
function reportResult(raw) {
  const info = object(raw, ["count", "landscape", "portrait", "square", "bytes"]);
  if (!Object.values(info).every((n) => Number.isSafeInteger(n) && Number(n) >= 0) || Number(info.count) < 1 || Number(info.count) > 4 || Number(info.bytes) < 1 || Number(info.bytes) > MAX_IMAGE_BYTES || Number(info.landscape) + Number(info.portrait) + Number(info.square) !== info.count) {
    throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439.");
  }
  return info;
}
function object(raw, keys) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).length !== keys.length || !keys.every((key) => Object.hasOwn(raw, key))) {
    throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u043F\u043E\u043B\u044F \u0441\u0435\u0442\u0435\u0432\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430.");
  }
  return raw;
}
function imageResult(raw) {
  const info = object(raw, ["format", "width", "height", "bytes"]);
  if (typeof info.format !== "string" || !["png", "jpeg", "gif", "webp"].includes(info.format) || ![info.width, info.height, info.bytes].every((n) => Number.isSafeInteger(n) && Number(n) > 0) || Number(info.bytes) > MAX_IMAGE_BYTES) throw new ValidationError("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438.");
  return info;
}

// modules/image-report/index.ts
var module = {
  id: REPORT_MODULE.id,
  apiVersion: 1,
  register(ctx) {
    ctx.publish({
      version: REPORT_MODULE.version,
      summarize(rows) {
        const summary = { count: rows.length, landscape: 0, portrait: 0, square: 0, bytes: 0 };
        for (const raw of rows) {
          const row = imageResult(raw);
          summary.bytes += row.bytes;
          if (row.width > row.height) summary.landscape++;
          else if (row.height > row.width) summary.portrait++;
          else summary.square++;
        }
        return reportResult(summary);
      }
    });
  }
};
var index_default = module;
export {
  index_default as default
};
