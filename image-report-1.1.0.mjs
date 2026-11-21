import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// team-host-api:src/domain/team-room/protocol.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var ID = host["ID"];
var IMAGE_MODULE = host["IMAGE_MODULE"];
var IMAGE_OPERATION = host["IMAGE_OPERATION"];
var MAX_IMAGE_BYTES = host["MAX_IMAGE_BYTES"];
var OPERATIONS = host["OPERATIONS"];
var REPORT_MODULE = host["REPORT_MODULE"];
var REPORT_OPERATION = host["REPORT_OPERATION"];
var TEXT_MODULE = host["TEXT_MODULE"];
var TEXT_OPERATION = host["TEXT_OPERATION"];
var TOKEN = host["TOKEN"];
var UUID = host["UUID"];
var defaultParticipation = host["defaultParticipation"];
var imageInput = host["imageInput"];
var imageResult = host["imageResult"];
var localModel = host["localModel"];
var object = host["object"];
var participation = host["participation"];
var reportResult = host["reportResult"];
var requirements = host["requirements"];
var textField = host["textField"];
var textInput = host["textInput"];
var textResult = host["textResult"];
var withinHours = host["withinHours"];

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
