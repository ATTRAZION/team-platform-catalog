import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// modules/team-room/index.ts
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { availableParallelism, freemem, totalmem } from "node:os";

// team-host-api:src/kernel/errors.ts
var host = globalThis["__teamPlatformHostApi"] ?? {};
var AppError = host["AppError"];
var ConflictError = host["ConflictError"];
var ForbiddenError = host["ForbiddenError"];
var NotFoundError = host["NotFoundError"];
var UpstreamError = host["UpstreamError"];
var ValidationError = host["ValidationError"];
var isAppError = host["isAppError"];

// team-host-api:src/domain/team-room/protocol.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var ID = host2["ID"];
var IMAGE_MODULE = host2["IMAGE_MODULE"];
var IMAGE_OPERATION = host2["IMAGE_OPERATION"];
var MAX_IMAGE_BYTES = host2["MAX_IMAGE_BYTES"];
var OPERATIONS = host2["OPERATIONS"];
var REPORT_MODULE = host2["REPORT_MODULE"];
var REPORT_OPERATION = host2["REPORT_OPERATION"];
var TEXT_MODULE = host2["TEXT_MODULE"];
var TEXT_OPERATION = host2["TEXT_OPERATION"];
var TOKEN = host2["TOKEN"];
var UUID = host2["UUID"];
var defaultParticipation = host2["defaultParticipation"];
var imageInput = host2["imageInput"];
var imageResult = host2["imageResult"];
var localModel = host2["localModel"];
var object = host2["object"];
var participation = host2["participation"];
var reportResult = host2["reportResult"];
var requirements = host2["requirements"];
var textField = host2["textField"];
var textInput = host2["textInput"];
var textResult = host2["textResult"];
var withinHours = host2["withinHours"];

// modules/team-room/page.ts
var PAGE = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>\u041E\u0431\u0449\u0430\u044F \u043A\u043E\u043C\u043D\u0430\u0442\u0430</title>
<style>
  main { max-width: 880px; margin: 0 auto; padding: 20px; }
  section { padding: 16px; margin-block: 12px; border: 1px solid var(--line); border-radius: 12px; }
  label { display: block; margin: 8px 0; }
  input:not([type=checkbox]) { display: block; width: min(100%, 440px); }
  #policy { display: inline; width: auto; }
  #cards { list-style: none; padding: 0; }
  #cards li { padding: 12px 0; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }
  .compare { display: grid; grid-template-columns: repeat(auto-fit,minmax(215px,1fr)); gap: 8px; }
  .meta { color: var(--muted); }
</style></head>
<body><main>
  <h1>\u041E\u0431\u0449\u0430\u044F \u043A\u043E\u043C\u043D\u0430\u0442\u0430</h1>
  <p id="notice" role="status"></p>
  <section id="join">
    <h2>\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435</h2>
    <form id="connect" autocomplete="off">
      <label>\u0410\u0434\u0440\u0435\u0441 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440\u0430 <input name="origin" type="url" placeholder="https://room.example" maxlength="250" required></label>
      <label>\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430 <input name="member_token" type="password" maxlength="64" required></label>
      <label>\u041A\u043B\u044E\u0447 \u044D\u0442\u043E\u0433\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 \u0434\u043B\u044F \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0437\u0430\u0434\u0430\u0447 <input name="device_token" type="password" maxlength="64"></label>
      <button type="submit">\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F</button>
    </form>
    <form id="redeem" autocomplete="off">
      <label>\u041E\u0434\u043D\u043E\u0440\u0430\u0437\u043E\u0432\u044B\u0439 \u043A\u043E\u0434 <input name="code" type="password" maxlength="64" required></label>
      <button type="submit">\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u0434</button>
    </form>
  </section>
  <div id="connected" hidden>
    <section>
      <p id="identity"></p>
      <label id="policy-label" hidden><input id="policy" type="checkbox"> \u0420\u0430\u0437\u0440\u0435\u0448\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u043D\u0430 \u044D\u0442\u043E\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435</label>
      <p id="device-state" class="meta"></p>
      <button id="disconnect" type="button">\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043E\u0442 \u043A\u043E\u043C\u043D\u0430\u0442\u044B</button>
      <details id="team-admin">
        <summary>\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u0438 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430</summary>
        <ul id="team-members"></ul>
        <ul id="team-devices"></ul>
        <ul id="pending-invites"></ul>
        <form id="invite-member" hidden>
          <h3>\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430</h3>
          <label>ID <input name="id" maxlength="40" required></label>
          <label>\u0418\u043C\u044F <input name="display_name" maxlength="80" required></label>
          <label>\u0420\u043E\u043B\u044C <select name="role"><option value="member">\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A</option><option value="reviewer">\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0449\u0438\u0439</option><option value="admin">\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440</option></select></label>
          <label>\u0421\u0440\u043E\u043A \u043A\u043E\u0434\u0430, \u043C\u0438\u043D\u0443\u0442 <input name="minutes" type="number" min="1" max="1440" value="30" required></label>
          <button type="submit">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435</button>
        </form>
        <form id="invite-device">
          <h3>\u0412\u044B\u0434\u0430\u0442\u044C \u043A\u043E\u0434 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430</h3>
          <label>ID \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 <input name="id" maxlength="40" required></label>
          <label>ID \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430 <input name="owner_id" maxlength="40" required></label>
          <label>\u0421\u0440\u043E\u043A \u043A\u043E\u0434\u0430, \u043C\u0438\u043D\u0443\u0442 <input name="minutes" type="number" min="1" max="1440" value="30" required></label>
          <button type="submit">\u0412\u044B\u0434\u0430\u0442\u044C \u043A\u043E\u0434</button>
        </form>
        <label id="invite-output" hidden>\u041E\u0434\u043D\u043E\u0440\u0430\u0437\u043E\u0432\u044B\u0439 \u043A\u043E\u0434 \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 <input id="invite-code" readonly></label>
        <form id="attach-device" autocomplete="off">
          <label>\u041A\u043E\u0434 \u044D\u0442\u043E\u0433\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 <input name="code" type="password" maxlength="64" required></label>
          <button type="submit">\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E</button>
        </form>
      </details>
      <details id="policy-details" hidden>
        <summary>\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0443\u0447\u0430\u0441\u0442\u0438\u044F \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430</summary>
        <form id="advanced">
          <label>\u041A\u043E\u043C\u0443 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0438 <input name="trusted" placeholder="ID \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E"></label>
          <p class="meta">\u041F\u0443\u0441\u0442\u043E\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0440\u0438 \u0432\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u043E\u043C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0438 \u0434\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0432\u0441\u0435\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u044B.</p>
          <label><input type="checkbox" name="inspect"> \u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439</label>
          <label><input type="checkbox" name="report"> \u0421\u0432\u043E\u0434\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439</label>
          <label><input type="checkbox" name="summarize"> \u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0435 \u0441\u0432\u043E\u0434\u043A\u0438 \u0447\u0435\u0440\u0435\u0437 Ollama</label>
          <label>\u0421 \u043A\u0430\u043A\u043E\u0433\u043E \u0447\u0430\u0441\u0430 <input type="number" name="start" min="0" max="23" required></label>
          <label>\u0414\u043E \u043A\u0430\u043A\u043E\u0433\u043E \u0447\u0430\u0441\u0430 <input type="number" name="end" min="0" max="23" required></label>
          <p class="meta">\u0427\u0430\u0441\u044B \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435. \u041E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u043E\u0435 \u043D\u0430\u0447\u0430\u043B\u043E \u0438 \u043A\u043E\u043D\u0435\u0446 \u043E\u0437\u043D\u0430\u0447\u0430\u044E\u0442 \u043A\u0440\u0443\u0433\u043B\u043E\u0441\u0443\u0442\u043E\u0447\u043D\u0443\u044E \u0440\u0430\u0431\u043E\u0442\u0443.</p>
          <label>\u041E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u044D\u0442\u0430\u043F\u043E\u0432 <input type="number" name="slots" min="1" max="4" required></label>
          <label><input type="checkbox" name="own_first"> \u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u0437\u0430\u0434\u0430\u0447 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430</label>
          <label>\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 <input name="models" placeholder="\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E"></label>
          <p class="meta">\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0442\u043E\u0447\u043D\u044B\u0435 \u0438\u043C\u0435\u043D\u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0435\u043B\u0435\u0439. \u041A\u043E\u043C\u043D\u0430\u0442\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u043E\u0434\u0435\u043B\u0438 \u0438\u0437 \u044D\u0442\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u043A\u0430, \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u0432 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 Ollama.</p>
          <button type="submit">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u0430</button>
        </form>
      </details>
    </section>
    <section id="mission-create-panel">
      <h2>\u041D\u043E\u0432\u0430\u044F \u043C\u0438\u0441\u0441\u0438\u044F</h2>
      <form id="mission-create">
        <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 <input name="title" maxlength="160" required></label>
        <label>\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F <input name="images" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple required></label>
        <p class="meta">\u041E\u0442 \u043E\u0434\u043D\u043E\u0433\u043E \u0434\u043E \u0447\u0435\u0442\u044B\u0440\u0451\u0445 \u0444\u0430\u0439\u043B\u043E\u0432, \u0441\u0443\u043C\u043C\u0430\u0440\u043D\u043E \u0434\u043E 256 \u041A\u0411. \u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u043E \u0438 \u0441\u043E\u0431\u0435\u0440\u0451\u0442 \u0441\u0432\u043E\u0434\u043A\u0443.</p>
        <details id="custom-plan">
          <summary>\u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u043E\u0440 \u044D\u0442\u0430\u043F\u043E\u0432 \u0438 \u0431\u044E\u0434\u0436\u0435\u0442</summary>
          <label><input type="checkbox" id="use-plan"> \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0432\u043E\u0439 \u043F\u043B\u0430\u043D</label>
          <label>\u0428\u0430\u0431\u043B\u043E\u043D \u043A\u043E\u043C\u0430\u043D\u0434\u044B <select id="templates"><option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0448\u0430\u0431\u043B\u043E\u043D</option></select></label>
          <button id="load-template" type="button">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D</button>
          <div id="plan-steps"></div>
          <label>\u0422\u0438\u043F \u043D\u043E\u0432\u043E\u0433\u043E \u044D\u0442\u0430\u043F\u0430 <select id="new-kind">
            <option value="image.metadata@1">\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435</option><option value="image.report@1">\u0421\u0432\u043E\u0434\u043A\u0430</option>
            <option value="review">\u041F\u0440\u0438\u0451\u043C\u043A\u0430 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u043E\u043C</option><option value="choice">\u0412\u044B\u0431\u043E\u0440 \u0438\u0437 \u0434\u0432\u0443\u0445 \u0441\u0432\u043E\u0434\u043E\u043A</option>
          </select></label>
          <button type="button" id="add-step">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u044D\u0442\u0430\u043F</button>
          <button type="button" id="add-comparison">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0434\u0432\u0435 \u0441\u0432\u043E\u0434\u043A\u0438 \u0438 \u0432\u044B\u0431\u043E\u0440</button>
          <label>\u041F\u0440\u0435\u0434\u0435\u043B \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432, \u0446\u0435\u043D\u0442\u043E\u0432 <input type="number" id="cost-cap" min="0" max="100000" value="0"></label>
          <label>\u0412\u0440\u0435\u043C\u044F \u043D\u0430 \u043C\u0438\u0441\u0441\u0438\u044E, \u043C\u0438\u043D\u0443\u0442 <input type="number" id="time-cap" min="1" max="1440" value="30"></label>
          <label>\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u044D\u0442\u0430\u043F\u043E\u0432 <input type="number" id="parallel-cap" min="1" max="4" value="2"></label>
          <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0448\u0430\u0431\u043B\u043E\u043D\u0430 <input id="template-label" maxlength="80"></label>
          <button type="button" id="save-template">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D</button>
          <button type="button" id="preview">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0434\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430</button>
          <div id="preflight" role="status"></div>
        </details>
        <button type="submit">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043C\u0438\u0441\u0441\u0438\u044E</button>
      </form>
    </section>
    <section id="text-create-panel">
      <h2>\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430</h2>
      <form id="text-create">
        <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 <input name="title" maxlength="160" required></label>
        <label>\u041C\u043E\u0434\u0435\u043B\u044C Ollama <input name="model" list="room-models" maxlength="80" placeholder="\u0418\u043C\u044F \u043C\u043E\u0434\u0435\u043B\u0438 \u0441 \u0442\u0435\u0433\u043E\u043C" required></label>
        <datalist id="room-models"></datalist>
        <label>\u0417\u0430\u043C\u0435\u0442\u043A\u0438 <textarea name="notes" rows="5" maxlength="4000" required></textarea></label>
        <p class="meta">\u0417\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0443\u0432\u0438\u0434\u044F\u0442 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043A\u043E\u043C\u043D\u0430\u0442\u044B.</p>
        <button type="submit">\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443 \u0441 \u043F\u0440\u0438\u0451\u043C\u043A\u043E\u0439</button>
      </form>
    </section>
    <section id="advice" hidden><h2>\u0427\u0442\u043E \u0434\u0430\u043B\u044C\u0448\u0435</h2><ul id="suggestions"></ul></section>
    <section><h2>\u041C\u0438\u0441\u0441\u0438\u0438</h2><p id="mission-info" class="meta"></p><div id="missions"></div></section>
    <section id="device-list">
      <h2>\u041F\u0430\u0441\u043F\u043E\u0440\u0442 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432</h2>
      <label>\u041D\u0430\u0439\u0442\u0438 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E, GPU, \u043C\u043E\u0434\u0443\u043B\u044C \u0438\u043B\u0438 \u043C\u043E\u0434\u0435\u043B\u044C <input id="device-search" type="search"></label>
      <ul id="devices"></ul>
    </section>
    <section>
      <h2>\u041E\u0434\u0438\u043D\u043E\u0447\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430</h2>
    </section>
    <section>
      <form id="create">
        <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 <input name="title" type="text" maxlength="160" required></label>
        <label>\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0434\u043E 256 \u041A\u0411 <input name="image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" required></label>
        <p class="meta">\u0417\u0430\u0434\u0430\u0447\u0430 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442 \u0444\u043E\u0440\u043C\u0430\u0442 \u0438 \u0440\u0430\u0437\u043C\u0435\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F. \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0443\u0432\u0438\u0434\u044F\u0442 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043A\u043E\u043C\u043D\u0430\u0442\u044B. \u0424\u0430\u0439\u043B \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E, \u043A\u043E\u0442\u043E\u0440\u043E\u043C\u0443 \u0432\u044B\u0434\u0430\u043D \u0437\u0430\u043F\u0443\u0441\u043A.</p>
        <button type="submit">\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0443</button>
      </form>
    </section>
    <section><h2>\u0414\u043E\u0441\u043A\u0430 \u043A\u043E\u043C\u043D\u0430\u0442\u044B</h2><p id="empty">\u041A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.</p><ul id="cards"></ul></section>
  </div>
</main><script>
const $ = id => document.getElementById(id);
const base = '/m/team-room/api';
let pending = false;
let updating = false;
let boardStamp = '';
let createRequest = null;
let missionRequest = null;
let policyStamp = '';
let missionStamp = '';
let deviceStamp = '';
let adviceStamp = '';
let shownDevices = [];
let draftStages = [];
let templates = [];
let teamStamp = '';
let templateStamp = '';
let previewStamp = '';
let activeConnection = null;
const statusLabels = { queued: '\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438', running: '\u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F', succeeded: '\u0413\u043E\u0442\u043E\u0432\u043E', failed: '\u041E\u0448\u0438\u0431\u043A\u0430' };
async function request(path, body) {
  const response = await fetch(base + path, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || '\u041E\u0448\u0438\u0431\u043A\u0430 \u043A\u043E\u043C\u043D\u0430\u0442\u044B');
  return data;
}
function line(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}
function linkButton(parent, label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.onclick = action;
  parent.append(button);
  return button;
}
const waitLabels = {
  dependency: '\u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0445 \u044D\u0442\u0430\u043F\u043E\u0432', offline: '\u043D\u0435 \u0432 \u0441\u0435\u0442\u0438',
  owner_disabled: '\u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0443', module_missing: '\u043D\u0435\u0442 \u043D\u0443\u0436\u043D\u043E\u0433\u043E \u043C\u043E\u0434\u0443\u043B\u044F \u0438\u043B\u0438 \u0432\u0435\u0440\u0441\u0438\u0438',
  model_missing: '\u043D\u0435\u0442 \u043D\u0443\u0436\u043D\u043E\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438',
  operation_disabled: '\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044F \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0435\u043C', off_hours: '\u0432\u043D\u0435 \u0447\u0430\u0441\u043E\u0432 \u0440\u0430\u0431\u043E\u0442\u044B',
  available: '\u0433\u043E\u0442\u043E\u0432\u044B \u043F\u0440\u0438\u043D\u044F\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443', busy: '\u043D\u0435\u0442 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0441\u043B\u043E\u0442\u0430', recent_decline: '\u043D\u0435\u0434\u0430\u0432\u043D\u043E \u043E\u0442\u043A\u0430\u0437\u0430\u043B\u0438\u0441\u044C \u043E\u0442 \u044D\u0442\u0430\u043F\u0430',
  human_review: '\u0436\u0434\u0451\u0442 \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430', deadline: '\u0441\u0440\u043E\u043A \u043C\u0438\u0441\u0441\u0438\u0438 \u0438\u0441\u0442\u0451\u043A',
  mission_parallel: '\u0434\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u043F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u044B\u0445 \u044D\u0442\u0430\u043F\u043E\u0432', other_variant: '\u044D\u0442\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0443\u0436\u0435 \u0434\u0435\u043B\u0430\u0435\u0442 \u0434\u0440\u0443\u0433\u043E\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442',
};
const names = { 'image.metadata@1': '\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435', 'image.report@1': '\u0421\u0432\u043E\u0434\u043A\u0430', review: '\u041F\u0440\u0438\u0451\u043C\u043A\u0430', choice: '\u0412\u044B\u0431\u043E\u0440 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430' };
const roleName = { admin: '\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440', member: '\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A', reviewer: '\u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0449\u0438\u0439' };
let stepSerial = 0;
function option(select, value, label) {
  const item = document.createElement('option');
  item.value = value;
  item.textContent = label;
  select.append(item);
  return item;
}
function field(parent, text, element) {
  const label = document.createElement('label');
  label.textContent = text + ' ';
  label.append(element);
  parent.append(label);
}
function renderPlan() {
  const root = $('plan-steps');
  root.replaceChildren();
  for (const [index, step] of draftStages.entries()) {
    const box = document.createElement('section');
    line(box, 'strong', (index + 1) + '. ' + names[step.kind]);
    const title = document.createElement('input');
    title.value = step.title;
    title.maxLength = 100;
    title.oninput = () => { step.title = title.value; };
    field(box, '\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435', title);
    if (step.kind === 'image.metadata@1') {
      const image = document.createElement('input');
      image.type = 'number'; image.min = '1'; image.max = '4'; image.value = step.image;
      image.oninput = () => { step.image = Number(image.value); };
      field(box, '\u041D\u043E\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430', image);
    } else {
      const deps = document.createElement('select');
      deps.multiple = true;
      for (const [before, value] of draftStages.slice(0, index).entries()) {
        const entry = option(deps, value.key, (before + 1) + '. ' + value.title);
        entry.selected = step.deps.includes(value.key);
      }
      deps.onchange = () => { step.deps = [...deps.selectedOptions].map(item => item.value); };
      field(box, '\u0412\u0445\u043E\u0434\u044B \u0438\u0437 \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0445 \u044D\u0442\u0430\u043F\u043E\u0432', deps);
    }
    linkButton(box, '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u0430\u043F', () => {
      draftStages = draftStages.filter(row => row !== step);
      for (const row of draftStages) row.deps = row.deps.filter(dep => dep !== step.key);
      renderPlan();
    });
    root.append(box);
  }
}
function appendStep(kind, deps = [], title = names[kind]) {
  const key = 's-' + (++stepSerial);
  draftStages.push({ key, title, kind, deps, image: kind === 'image.metadata@1' ? 1 : null });
  return key;
}
function readDraft() {
  return { steps: draftStages, budget: {
    max_cost_cents: Number($('cost-cap').value), time_minutes: Number($('time-cap').value),
    max_parallel: Number($('parallel-cap').value),
  } };
}
function renderTemplates(items) {
  const stamp = JSON.stringify(items);
  if (stamp === templateStamp) return;
  templateStamp = stamp;
  templates = items;
  const select = $('templates');
  const current = select.value;
  select.replaceChildren();
  option(select, '', '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0448\u0430\u0431\u043B\u043E\u043D');
  for (const item of items) option(select, item.id, item.label + ' \xB7 ' + item.author);
  if (items.some(item => item.id === current)) select.value = current;
}
function renderTeam(team) {
  const stamp = JSON.stringify(team);
  if (stamp === teamStamp) return;
  teamStamp = stamp;
  $('invite-member').hidden = team.me.role !== 'admin';
  $('invite-device').hidden = team.me.role === 'reviewer';
  $('attach-device').hidden = team.me.role === 'reviewer';
  $('mission-create-panel').hidden = team.me.role === 'reviewer';
  $('text-create-panel').hidden = team.me.role === 'reviewer';
  if (!$('invite-device').elements.owner_id.value) $('invite-device').elements.owner_id.value = team.me.id;
  const pending = $('pending-invites');
  pending.replaceChildren();
  for (const item of team.pending || []) {
    const li = document.createElement('li');
    line(li, 'span', '\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F: ' + item.id + ' \xB7 \u0434\u043E ' + new Date(item.expires).toLocaleTimeString());
    const button = linkButton(li, '\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435', () => change(button, () => request('/revoke', { kind: item.kind, id: item.id })));
    pending.append(li);
  }
  for (const [list, rows, kind] of [['team-members', team.members, 'member'], ['team-devices', team.devices, 'device']]) {
    $(list).replaceChildren();
    for (const item of rows) {
      const li = document.createElement('li');
      line(li, 'span', kind === 'member' ? item.name + ' \xB7 ' + item.id + ' \xB7 ' + roleName[item.role || 'member'] :
        item.id + ' \xB7 \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 ' + item.ownerId);
      if (kind === 'member' ? team.me.role === 'admin' && team.me.id !== item.id :
        team.me.role === 'admin' || team.me.id === item.ownerId) {
        const button = linkButton(li, '\u041E\u0442\u043E\u0437\u0432\u0430\u0442\u044C', () => {
          if (confirm('\u041E\u0442\u043E\u0437\u0432\u0430\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F ' + item.id + '?')) void change(button, () => request('/revoke', { kind, id: item.id }));
        });
      }
      $(list).append(li);
    }
  }
}
function renderPolicy(data) {
  $('policy-details').hidden = !data.connection?.device;
  const policy = data.policy;
  const stamp = JSON.stringify(policy);
  if (!policy || stamp === policyStamp) return;
  policyStamp = stamp;
  const fields = $('advanced').elements;
  fields.trusted.value = policy.trusted.join(', ');
  fields.inspect.checked = policy.operations.includes('image.metadata@1');
  fields.report.checked = policy.operations.includes('image.report@1');
  fields.summarize.checked = policy.operations.includes('text.summary@1');
  fields.start.value = policy.start;
  fields.end.value = policy.end;
  fields.slots.value = policy.slots;
  fields.own_first.checked = policy.own_first;
  fields.models.value = policy.models.join(', ');
}
function renderDevices(list) {
  shownDevices = list;
  const query = $('device-search').value.trim().toLowerCase();
  const stamp = JSON.stringify([query, list]);
  if (stamp === deviceStamp) return;
  deviceStamp = stamp;
  $('devices').replaceChildren();
  $('room-models').replaceChildren();
  const modelNames = new Set(list.filter(device => device.online && device.open)
    .flatMap(device => device.available_models || []));
  for (const name of modelNames) option($('room-models'), name, name);
  for (const device of list) {
    if (query && ![device.id, ...device.gpu, ...device.models, ...device.modules.map(item => item.id + ' ' + item.version)]
      .some(value => value.toLowerCase().includes(query))) continue;
    const row = document.createElement('li');
    line(row, 'strong', device.id + (device.online ? ' \xB7 \u0432 \u0441\u0435\u0442\u0438' : ' \xB7 \u043D\u0435 \u0432 \u0441\u0435\u0442\u0438'));
    if (device.cpu) line(row, 'div', device.cpu + ' \u043F\u043E\u0442\u043E\u043A\u043E\u0432 CPU \xB7 ' + device.ram_free_mib + ' \u0438\u0437 ' + device.ram_mib + ' \u041C\u0438\u0411 RAM \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E \xB7 GPU: ' + (device.gpu.join(', ') || '\u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0451\u043D') +
      ' \xB7 \u0437\u0430\u043D\u044F\u0442\u043E ' + device.occupied + ' \u0438\u0437 ' + device.slots + ' \xB7 ' + (device.open ? '\u0432 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F' : '\u0432\u043D\u0435 \u0447\u0430\u0441\u043E\u0432 \u0440\u0430\u0431\u043E\u0442\u044B'), 'meta');
    line(row, 'div', '\u041C\u043E\u0434\u0443\u043B\u0438: ' + (device.modules.map(module => module.id + ' ' + module.version).join(', ') || '\u043D\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u044B'), 'meta');
    line(row, 'div', '\u041C\u043E\u0434\u0435\u043B\u0438 \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430: ' + (device.models.join(', ') || '\u043D\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u044B'), 'meta');
    if (device.available_models?.length) line(row, 'div', '\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432 Ollama: ' + device.available_models.join(', '), 'meta');
    $('devices').append(row);
  }
  if (!$('devices').children.length) line($('devices'), 'li', '\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432 \u043D\u0435\u0442.', 'meta');
}
$('device-search').addEventListener('input', () => renderDevices(shownDevices));
function renderMissions(data) {
  const stamp = JSON.stringify([data.member_id, data.missions]);
  if (stamp === missionStamp) return;
  missionStamp = stamp;
  $('missions').replaceChildren();
  $('mission-info').textContent = data.missions.length ? '' : '\u041C\u0438\u0441\u0441\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.';
  for (const mission of data.missions) {
    const card = document.createElement('article');
    card.id = 'mission-' + mission.id;
    line(card, 'h3', mission.title);
    line(card, 'p', '\u0410\u0432\u0442\u043E\u0440: ' + mission.author_name, 'meta');
    if (mission.budget) line(card, 'p', '\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E: 0 \xB7 \u043F\u0440\u0435\u0434\u0435\u043B ' + mission.budget.max_cost_cents +
      ' \u0446\u0435\u043D\u0442\u043E\u0432 \xB7 \u0434\u043E ' + new Date(mission.budget.deadline).toLocaleString() +
      ' \xB7 \u043F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u043E \u0434\u043E ' + mission.budget.max_parallel + ' \u044D\u0442\u0430\u043F\u043E\u0432', 'meta');
    const versions = new Map(mission.stages.flatMap(stage => stage.versions.map(version => [version.id, stage.title + ' \xB7 v' + version.version])));
    const stageList = document.createElement('ol');
    for (const stage of mission.stages) {
      const row = document.createElement('li');
      row.dataset.stageId = stage.id;
      line(row, 'strong', stage.title + ' \xB7 ' + statusLabels[stage.status] + (stage.worker_id ? ' \xB7 ' + stage.worker_id : ''));
      if (Object.keys(stage.waits).length) line(row, 'div', Object.entries(stage.waits).map(([key, count]) =>
        (key === 'dependency' ? '' : count + ' \xB7 ') + (waitLabels[key] || key)).join('; '), 'meta');
      if (stage.inputs.length) line(row, 'div', '\u0412\u0445\u043E\u0434\u043D\u044B\u0435 \u0432\u0435\u0440\u0441\u0438\u0438: ' + stage.inputs.map(id => versions.get(id) || id).join(', '), 'meta');
      for (const version of stage.versions) {
        const r = version.result;
        const details = !r ? (version.kind === 'text.notes' ? '\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438' : '\u0412\u0445\u043E\u0434\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435') :
          r.summary ? '\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430 \xB7 ' + r.model :
          r.format ? r.format + ' \xB7 ' + r.width + ' \xD7 ' + r.height + ' \xB7 ' + r.bytes + ' \u0411' :
          '\u0424\u0430\u0439\u043B\u043E\u0432: ' + r.count + ' \xB7 \u0430\u043B\u044C\u0431\u043E\u043C\u043D\u044B\u0445: ' + r.landscape + ' \xB7 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043D\u044B\u0445: ' + r.portrait + ' \xB7 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u044B\u0445: ' + r.square + ' \xB7 ' + r.bytes + ' \u0411';
        line(row, 'div', 'v' + version.version + ' \xB7 ' + details + (version.worker_id ? ' \xB7 ' + version.worker_id : ''), 'meta');
        if (r?.summary) line(row, 'p', r.summary).style.whiteSpace = 'pre-wrap';
        if (version.inputs.length) line(row, 'div', '\u0412\u0445\u043E\u0434\u044B v' + version.version + ': ' +
          version.inputs.map(input => versions.get(input.id) || input.id).join(', '), 'meta');
      }
      for (const decision of stage.decisions || []) {
        line(row, 'div', decision.actor + ' \xB7 ' + (decision.choice === 'redo' ? '\u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u043E' : '\u043F\u0440\u0438\u043D\u044F\u0442\u043E') +
          (decision.note ? ' \xB7 ' + decision.note : ''), 'meta');
      }
      if (stage.waits.human_review && (mission.author_id === data.member_id || ['admin','reviewer'].includes(data.role))) {
        const select = document.createElement('select');
        const compare = document.createElement('div');
        compare.className = 'compare';
        for (const dep of mission.stages.filter(value => stage.depends_on.includes(value.id))) {
          const version = dep.versions.find(value => value.result);
          if (!version) continue;
          const caption = dep.title + ' v' + version.version + (version.worker_id ? ' \xB7 ' + version.worker_id : '');
          option(select, version.id, caption);
          if (stage.operation === 'choice') {
            const panel = document.createElement('section');
            line(panel, 'strong', caption);
            const r = version.result;
            line(panel, 'p', '\u0424\u0430\u0439\u043B\u043E\u0432: ' + r.count + ' \xB7 \u0430\u043B\u044C\u0431\u043E\u043C\u043D\u044B\u0445: ' + r.landscape +
              ' \xB7 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043D\u044B\u0445: ' + r.portrait + ' \xB7 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u044B\u0445: ' + r.square);
            linkButton(panel, '\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u0432\u0430\u0440\u0438\u0430\u043D\u0442', () => { select.value = version.id; });
            compare.append(panel);
          }
        }
        if (compare.children.length) row.append(compare);
        const note = document.createElement('input');
        note.maxLength = 400; note.placeholder = '\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043A \u0440\u0435\u0448\u0435\u043D\u0438\u044E';
        field(row, '\u0412\u0435\u0440\u0441\u0438\u044F \u0434\u043B\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u044F', select);
        field(row, '\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439', note);
        const decide = (button, decision) => change(button, () => request('/stages/' + stage.id + '/decide', {
          decision, artifact_id: select.value, note: note.value,
        }));
        const approve = linkButton(row, stage.operation === 'choice' ? '\u041F\u0435\u0440\u0435\u0434\u0430\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442' : '\u041F\u0440\u0438\u043D\u044F\u0442\u044C', () => decide(approve, 'approve'));
        if (stage.operation === 'review') {
          const redo = linkButton(row, '\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u043D\u0430 \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0443', () => decide(redo, 'redo'));
        }
      }
      if (mission.author_id === data.member_id && stage.retryable) {
        const button = linkButton(row, '\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u044D\u0442\u0430\u043F', () => change(button, () => request('/stages/' + stage.id + '/retry', {})));
      }
      stageList.append(row);
    }
    card.append(stageList);
    $('missions').append(card);
  }
}
function renderAdvice(list) {
  const stamp = JSON.stringify(list);
  if (stamp === adviceStamp) return;
  adviceStamp = stamp;
  $('suggestions').replaceChildren();
  $('advice').hidden = !list.length;
  for (const advice of list) {
    const row = document.createElement('li');
    linkButton(row, advice.title, () => $(advice.target === 'devices' ? 'device-list' : 'mission-' + advice.mission_id)?.scrollIntoView());
    line(row, 'span', ' ' + advice.reason);
    $('suggestions').append(row);
  }
}
async function fileData(file) {
  const binary = new Uint8Array(await file.arrayBuffer());
  let text = '';
  for (let i = 0; i < binary.length; i += 8192) text += String.fromCharCode(...binary.subarray(i, i + 8192));
  return btoa(text);
}
function renderCards(items) {
  const stamp = JSON.stringify(items);
  if (stamp === boardStamp) return;
  boardStamp = stamp;
  $('empty').hidden = items.length > 0;
  $('cards').replaceChildren();
  for (const task of items) {
    const item = document.createElement('li');
    item.dataset.taskId = task.id;
    line(item, 'strong', task.title);
    line(item, 'div', task.author_name + ' \xB7 ' + statusLabels[task.status] + (task.worker_id ? ' \xB7 ' + task.worker_id : ''), 'meta');
    if (task.result) line(item, 'div', task.result.format + ' \xB7 ' + task.result.width + ' \xD7 ' + task.result.height + ' \xB7 ' + task.result.bytes + ' \u0411');
    $('cards').append(item);
  }
}
async function refresh() {
  if (updating || pending) return;
  updating = true;
  try {
    const data = await request('/status');
    if (pending) return;
    const session = data.connection;
    activeConnection = session;
    $('join').hidden = Boolean(session);
    $('connected').hidden = !session;
    if (!session) { renderCards([]); return; }
    $('identity').textContent = session.member + ' \xB7 ' + session.origin;
    $('policy-label').hidden = !session.device;
    $('policy').checked = session.accepts_others;
    renderPolicy(data);
    $('device-state').textContent = !session.device ? '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043A\u0430\u043A \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C.' :
      !data.module_ready && !data.report_ready && !data.text_ready ? '\u0414\u043B\u044F \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u043C\u043E\u0434\u0443\u043B\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0438\u043B\u0438 \xAB\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 Ollama\xBB.' :
      data.worker_state === 'unavailable' ? '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u0443 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440\u0430.' : '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E: ' + session.device;
    renderCards((await request('/tasks')).items);
    try {
      const dashboard = await request('/dashboard');
      renderMissions(dashboard);
      $('mission-create-panel').hidden = dashboard.role === 'reviewer';
      $('text-create-panel').hidden = dashboard.role === 'reviewer';
      $('create').hidden = dashboard.role === 'reviewer';
      renderDevices(dashboard.devices);
      renderAdvice(dashboard.suggestions);
      if ($('team-admin').open || $('custom-plan').open) {
        const [team, saved] = await Promise.all([request('/team'), request('/templates')]);
        renderTeam(team); renderTemplates(saved.items);
      }
    } catch (error) {
      $('mission-info').textContent = error.message;
    }
    $('notice').textContent = '';
  } catch (error) { $('notice').textContent = error.message; }
  finally { updating = false; }
}
async function change(button, operation) {
  if (pending) return;
  pending = true;
  button.disabled = true;
  try { await operation(); }
  catch (error) { $('notice').textContent = error.message; return; }
  finally { pending = false; button.disabled = false; }
  await refresh();
}
$('connect').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  void change(form.querySelector('button'), async () => { await request('/connect', data); form.reset(); });
});
$('redeem').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const connection = $('connect').elements;
  void change(form.querySelector('button'), async () => {
    const result = await request('/redeem', { origin: connection.origin.value, code: form.elements.code.value, for_device: false });
    connection[result.kind + '_token'].value = result.token;
    form.reset();
  });
});
$('team-admin').ontoggle = $('custom-plan').ontoggle = () => { if (activeConnection) void refresh(); };
$('invite-member').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = form.elements;
  void change(form.querySelector('button'), async () => {
    const result = await request('/invite', { kind: 'member', id: fields.id.value, name: fields.display_name.value,
      role: fields.role.value, minutes: Number(fields.minutes.value) });
    $('invite-output').hidden = false;
    $('invite-code').value = result.code;
  });
});
$('invite-device').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = form.elements;
  void change(form.querySelector('button'), async () => {
    const result = await request('/invite', { kind: 'device', id: fields.id.value,
      owner_id: fields.owner_id.value, minutes: Number(fields.minutes.value) });
    $('invite-output').hidden = false;
    $('invite-code').value = result.code;
  });
});
$('attach-device').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  void change(form.querySelector('button'), async () => {
    const result = await request('/redeem', { origin: activeConnection.origin, code: form.elements.code.value, for_device: true });
    if (result.kind !== 'device') throw new Error('\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043A\u043E\u0434 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430.');
    await request('/attach', { device_token: result.token });
    form.reset();
  });
});
$('policy').addEventListener('change', event => {
  const input = event.currentTarget;
  const checked = input.checked;
  void change(input, async () => {
    try { await request('/policy', { accepts_others: checked }); }
    catch (error) { input.checked = !checked; throw error; }
  });
});
$('disconnect').onclick = () => change($('disconnect'), async () => {
  await request('/disconnect', {});
  createRequest = missionRequest = null;
  policyStamp = missionStamp = deviceStamp = adviceStamp = '';
  teamStamp = templateStamp = previewStamp = '';
  $('invite-code').value = ''; $('invite-output').hidden = true;
  $('missions').replaceChildren(); $('devices').replaceChildren(); renderAdvice([]);
});
$('advanced').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = form.elements;
  const split = text => text.split(',').map(item => item.trim()).filter(Boolean);
  const operations = [...(fields.inspect.checked ? ['image.metadata@1'] : []), ...(fields.report.checked ? ['image.report@1'] : []),
    ...(fields.summarize.checked ? ['text.summary@1'] : [])];
  void change(form.querySelector('button'), () => request('/policy', {
    accepts_others: $('policy').checked, trusted: split(fields.trusted.value), operations,
    start: Number(fields.start.value), end: Number(fields.end.value), slots: Number(fields.slots.value),
    own_first: fields.own_first.checked, models: split(fields.models.value),
  }));
});
let textRequest = null;
$('text-create').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = { title: form.elements.title.value, model: form.elements.model.value.trim(), notes: form.elements.notes.value };
  if (!textRequest || Object.keys(input).some(key => input[key] !== textRequest[key])) {
    textRequest = { ...input, request_id: crypto.randomUUID() };
  }
  void change(form.querySelector('button'), async () => {
    await request('/text-missions', textRequest);
    textRequest = null;
    form.reset();
  });
});
$('mission-create').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const files = [...form.elements.images.files];
  void change(form.querySelector('button'), async () => {
    if (files.length < 1 || files.length > 4 || files.some(file => !file.size) ||
      files.reduce((sum, file) => sum + file.size, 0) > 256 * 1024) throw new Error('\u041D\u0443\u0436\u043D\u044B 1\u20134 \u0444\u0430\u0439\u043B\u0430 \u0434\u043E 256 \u041A\u0411 \u0441\u0443\u043C\u043C\u0430\u0440\u043D\u043E.');
    const title = form.elements.title.value;
    const images = await Promise.all(files.map(fileData));
    const plan = $('use-plan').checked ? JSON.parse(JSON.stringify(readDraft())) : null;
    if (plan && previewStamp !== JSON.stringify([files.length, plan])) throw new Error('\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u043B\u0430\u043D.');
    if (!missionRequest || missionRequest.title !== title || JSON.stringify(missionRequest.images) !== JSON.stringify(images)
      || JSON.stringify(missionRequest.plan ?? null) !== JSON.stringify(plan)) {
      missionRequest = { title, images, request_id: crypto.randomUUID(), ...(plan ? { plan } : {}) };
    }
    await request(plan ? '/plan' : '/missions', missionRequest);
    missionRequest = null;
    form.reset();
  });
});
$('add-step').onclick = () => {
  if (draftStages.length < 12) { appendStep($('new-kind').value); $('use-plan').checked = true; renderPlan(); }
};
$('add-comparison').onclick = () => {
  const deps = draftStages.filter(step => step.kind === 'image.metadata@1').slice(0, 4).map(step => step.key);
  if (!deps.length || draftStages.length > 9) { $('notice').textContent = '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u044D\u0442\u0430\u043F\u044B \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0445 \u0438 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0440\u0438 \u043C\u0435\u0441\u0442\u0430.'; return; }
  const a = appendStep('image.report@1', deps, '\u0412\u0430\u0440\u0438\u0430\u043D\u0442 \u0410');
  const b = appendStep('image.report@1', deps, '\u0412\u0430\u0440\u0438\u0430\u043D\u0442 \u0411');
  appendStep('choice', [a, b], '\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0441\u0432\u043E\u0434\u043A\u0443');
  $('use-plan').checked = true; renderPlan();
};
$('load-template').onclick = () => {
  const saved = templates.find(item => item.id === $('templates').value);
  if (!saved) return;
  draftStages = JSON.parse(JSON.stringify(saved.plan.steps));
  stepSerial = Math.max(stepSerial, ...draftStages.map(step => Number(step.key.split('-').at(-1)) || 0));
  $('cost-cap').value = saved.plan.budget.max_cost_cents;
  $('time-cap').value = saved.plan.budget.time_minutes;
  $('parallel-cap').value = saved.plan.budget.max_parallel;
  $('use-plan').checked = true; renderPlan();
};
$('save-template').onclick = () => change($('save-template'), () => request('/templates', { label: $('template-label').value, plan: readDraft() }));
$('preview').onclick = () => change($('preview'), async () => {
  const imageCount = $('mission-create').elements.images.files.length;
  const plan = JSON.parse(JSON.stringify(readDraft()));
  previewStamp = '';
  const data = await request('/preview', { plan, image_count: imageCount });
  previewStamp = JSON.stringify([imageCount, plan]);
  const root = $('preflight');
  root.replaceChildren();
  line(root, 'p', '\u041F\u043B\u0430\u0442\u043D\u044B\u0435 \u0432\u044B\u0437\u043E\u0432\u044B: 0. \u041B\u0438\u043C\u0438\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u0438: ' + data.budget.time_minutes + ' \u043C\u0438\u043D. \u041F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C: ' + data.budget.max_parallel + '.');
  for (const step of data.steps) {
    const input = step.image ? '\u0424\u0430\u0439\u043B \u2116' + step.image : '\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B: ' + step.input_keys.join(', ');
    const target = step.mode === 'human' ? '\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430' : step.module.id + ' \xB7 ' +
      (step.candidates.length >= step.distinct_devices_needed ? step.candidates.join(', ') :
        '\u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432 ' + step.candidates.length + ', \u043D\u0443\u0436\u043D\u043E ' + step.distinct_devices_needed);
    line(root, 'p', step.title + ' \xB7 ' + input + ' \u2192 ' + target);
    if (step.waits && Object.keys(step.waits).length) line(root, 'p', Object.entries(step.waits)
      .map(([reason, n]) => n + ' \xB7 ' + (waitLabels[reason] || reason)).join('; '), 'meta');
  }
  line(root, 'p', '\u0424\u0430\u0439\u043B\u044B \u0438 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043F\u043E\u043B\u0443\u0447\u0430\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0438. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432 \u043C\u043E\u0436\u0435\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C\u0441\u044F.');
});
$('create').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  void change(form.querySelector('button'), async () => {
    const file = data.get('image');
    if (!file || !file.size || file.size > 256 * 1024) throw new Error('\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C \u0434\u043E 256 \u041A\u0411.');
    const image = await fileData(file);
    const title = data.get('title');
    if (!createRequest || createRequest.title !== title || createRequest.image_base64 !== image) {
      createRequest = { title, request_id: crypto.randomUUID(), image_base64: image };
    }
    await request('/tasks', createRequest);
    createRequest = null;
    form.reset();
  });
});
setInterval(refresh, 2500);
refresh();
</script></body></html>`;

// team-host-api:src/domain/team-room/plan.ts
var host3 = globalThis["__teamPlatformHostApi"] ?? {};
var isExecutable = host3["isExecutable"];
var readPlan = host3["readPlan"];

// modules/team-room/index.ts
function gpuNames() {
  if (process.platform !== "win32") return Promise.resolve([]);
  return new Promise((resolve) => execFile(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_VideoController).Name"
    ],
    { windowsHide: true, timeout: 4e3, maxBuffer: 16384 },
    (error, stdout) => {
      resolve(error ? [] : [...new Set(stdout.split(/\r?\n/).map((name) => name.trim()).filter((name) => name && !/[\x00-\x1f\x7f]/.test(name)).map((name) => name.slice(0, 100)))].slice(0, 8));
    }
  ));
}
function originOf(raw) {
  const input = textField(raw, 250, "\u0430\u0434\u0440\u0435\u0441 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440\u0430");
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 HTTPS.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new ValidationError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440\u0430 HTTPS \u0431\u0435\u0437 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u043E\u0432.");
  }
  return parsed.origin;
}
function local(ctx, mutation = false) {
  const { req } = ctx;
  const socket = req.socket;
  const host4 = req.headers.host?.toLowerCase();
  const authorities = ["127.0.0.1", "localhost", "[::1]"].map((name) => name + ":" + socket.localPort);
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(socket.remoteAddress ?? "") || !host4 || !authorities.includes(host4) || req.headers.origin !== void 0 && req.headers.origin !== "http://" + host4 || req.headers["sec-fetch-site"] !== void 0 && !["same-origin", "none"].includes(req.headers["sec-fetch-site"])) {
    throw new ForbiddenError("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u043E\u043C\u043D\u0430\u0442\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0438\u0437 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F.");
  }
  if (mutation && req.headers["content-type"]?.split(";")[0]?.trim() !== "application/json") {
    throw new ValidationError("\u0417\u0430\u043F\u0440\u043E\u0441 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C JSON.");
  }
}
var module = {
  id: "team-room",
  apiVersion: 1,
  register(ctx) {
    const lifecycle = new AbortController();
    let room = null;
    let workerState = "idle";
    let polling = false;
    let running = 0;
    let gpu;
    let configVersion = 0;
    try {
      const saved = ctx.secrets?.get("connection");
      if (saved) room = JSON.parse(saved);
    } catch {
      ctx.log.warn("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u043A\u043E\u043C\u043D\u0430\u0442\u044B.");
    }
    function persist(next) {
      if (!ctx.secrets) throw new AppError("room_storage", "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.", 503);
      ctx.secrets.set("connection", JSON.stringify(next));
      room = next;
      configVersion++;
    }
    function adapter() {
      try {
        const service = ctx.require("image-info");
        return service.version === IMAGE_MODULE.version && typeof service.inspectImage === "function" ? service : null;
      } catch {
        return null;
      }
    }
    function reportAdapter() {
      try {
        const service = ctx.require(REPORT_MODULE.id);
        return service.version === REPORT_MODULE.version && typeof service.summarize === "function" ? service : null;
      } catch {
        return null;
      }
    }
    function textAdapter() {
      try {
        const service = ctx.require(TEXT_MODULE.id);
        return service.version === TEXT_MODULE.version && typeof service.roomModels === "function" && typeof service.roomSummary === "function" ? service : null;
      } catch {
        return null;
      }
    }
    let modelCache = { at: 0, names: [] };
    async function availableModels(policy, service) {
      if (!service || !policy.models.length) return [];
      if (Date.now() - modelCache.at >= 5e3) {
        const names = await service.roomModels().catch(() => []);
        modelCache = { at: Date.now(), names };
      }
      return policy.models.filter((name) => modelCache.names.includes(name));
    }
    function policyOf(active) {
      return active.policy ?? defaultParticipation(active.acceptsOthers);
    }
    function connected() {
      if (!room) throw new AppError("room_disconnected", "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u0441\u044C \u043A \u043A\u043E\u043C\u043D\u0430\u0442\u0435.", 409);
      return room;
    }
    function permits(active, task) {
      if (typeof task.author_id !== "string" || lifecycle.signal.aborted || room?.deviceToken !== active.deviceToken || room.origin !== active.origin) return false;
      const policy = policyOf(room);
      const capable = task.operation === TEXT_OPERATION ? Boolean(task.model && policy.models.includes(task.model) && textAdapter()) : Boolean(task.operation === IMAGE_OPERATION ? adapter() : reportAdapter());
      return (task.author_id === room.memberId || policy.accepts_others && (!policy.trusted.length || policy.trusted.includes(task.author_id))) && withinHours(policy, (/* @__PURE__ */ new Date()).getHours()) && running <= policy.slots && policy.operations.includes(task.operation) && capable;
    }
    async function remote(origin, token, path, body) {
      const signal = AbortSignal.any([lifecycle.signal, AbortSignal.timeout(5e3)]);
      let response;
      try {
        response = await fetch(origin + path, {
          method: body === void 0 ? "GET" : "POST",
          signal,
          redirect: "error",
          headers: { ...token ? { authorization: "Bearer " + token } : {}, "content-type": "application/json" },
          body: body === void 0 ? void 0 : JSON.stringify(body)
        });
      } catch {
        throw new AppError("room_unavailable", "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0438\u043B\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442 \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443.", 502);
      }
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new AppError("room_access", "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u043A\u043B\u044E\u0447.", 403);
        if (response.status === 409) throw new AppError("room_conflict", "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u043F\u043E\u0432\u0442\u043E\u0440 \u0438\u043B\u0438 \u0430\u0440\u0435\u043D\u0434\u0443.", 409);
        if (response.status === 400) throw new ValidationError("\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u0434\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438.");
        throw new AppError("room_unavailable", "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441.", 502);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new AppError("room_response", "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440 \u0432\u0435\u0440\u043D\u0443\u043B \u043F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442.", 502);
      const chunks = [];
      let size = 0;
      const limit = path === "/v2/dashboard" ? 4e6 : 5e5;
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) {
            await reader.cancel();
            throw new Error("body_limit");
          }
          chunks.push(Buffer.from(value));
        }
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new AppError("room_response", "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440\u0430.", 502);
      } finally {
        reader.releaseLock();
      }
    }
    function inspectPayload(payload) {
      const bytes = Buffer.from(imageInput(payload.data), "base64");
      if (createHash("sha256").update(bytes).digest("hex") !== payload.sha256) throw new Error("checksum");
      return imageResult(adapter().inspectImage(bytes));
    }
    async function summarizePayload(active, task, payload) {
      const source = payload.inputs?.[0];
      if (payload.inputs?.length !== 1 || source?.kind !== "text.notes" || createHash("sha256").update(JSON.stringify(source.data)).digest("hex") !== source.sha256) throw new Error("checksum");
      const input = textInput(source.data);
      if (input.model !== task.model || !permits(active, task)) return null;
      const service = textAdapter();
      if (!service) return null;
      const controller = new AbortController();
      const renewPath = "/v2/stages/" + task.id + "/renew";
      let renewing = false;
      let leaseLost = false;
      const pulse = async () => {
        if (renewing || controller.signal.aborted) return;
        if (!permits(active, task)) {
          controller.abort();
          return;
        }
        renewing = true;
        try {
          await remote(active.origin, active.deviceToken, renewPath, { lease: task.lease });
        } catch {
          leaseLost = true;
          controller.abort();
        } finally {
          renewing = false;
        }
      };
      await pulse();
      if (controller.signal.aborted) return null;
      const beat = setInterval(() => void pulse(), Math.max(100, Math.min(5e3, Math.floor(task.lease_ms / 3))));
      try {
        const result = await service.roomSummary(input, AbortSignal.any([controller.signal, lifecycle.signal]));
        return !leaseLost && permits(active, task) ? result : null;
      } catch (error) {
        if (controller.signal.aborted || lifecycle.signal.aborted) return null;
        throw error;
      } finally {
        clearInterval(beat);
      }
    }
    async function execute(active, task) {
      running++;
      try {
        let outcome = "declined";
        let result = null;
        const stage = task.scope === "stage";
        const input = stage ? "/v2/stages/" + task.id + "/input" : "/v1/input/" + task.id;
        const finish = stage ? "/v2/stages/" + task.id + "/finish" : "/v1/finish/" + task.id;
        if (permits(active, task)) {
          const payload = await remote(active.origin, active.deviceToken, input, { lease: task.lease });
          if (permits(active, task)) {
            try {
              if (!stage) result = inspectPayload({ data: payload.image_base64, sha256: payload.sha256 });
              else if (task.operation === IMAGE_OPERATION) {
                if (payload.inputs?.length !== 1 || payload.inputs[0].kind !== "image") throw new Error("image");
                result = inspectPayload(payload.inputs[0]);
              } else if (task.operation === TEXT_OPERATION) result = await summarizePayload(active, task, payload);
              else {
                if (!Array.isArray(payload.inputs) || payload.inputs.length < 1 || payload.inputs.length > 4) throw new Error("report");
                const rows = payload.inputs.map((item) => {
                  if (item.kind !== IMAGE_OPERATION || createHash("sha256").update(JSON.stringify(item.data)).digest("hex") !== item.sha256) {
                    throw new Error("checksum");
                  }
                  return imageResult(item.data);
                });
                result = reportResult(reportAdapter().summarize(rows));
              }
              if (result) outcome = "succeeded";
            } catch {
              outcome = "failed";
            }
          }
        }
        await remote(active.origin, active.deviceToken, finish, { lease: task.lease, outcome, result });
      } catch {
        workerState = "unavailable";
      } finally {
        running--;
      }
    }
    async function tick() {
      const active = room;
      if (!active?.deviceToken || polling || lifecycle.signal.aborted) return;
      polling = true;
      try {
        const graphics = await (gpu ??= gpuNames());
        if (room !== active || lifecycle.signal.aborted) return;
        const policy = policyOf(active);
        const image = adapter();
        const summary = reportAdapter();
        const textEnabled = policy.operations.includes(TEXT_OPERATION);
        const text = textEnabled ? textAdapter() : null;
        const discovered = textEnabled ? await availableModels(policy, text) : [];
        if (room !== active || lifecycle.signal.aborted) return;
        const modules = [
          ...image ? [{ id: IMAGE_MODULE.id, version: image.version }] : [],
          ...summary ? [{ id: REPORT_MODULE.id, version: summary.version }] : [],
          ...text ? [TEXT_MODULE] : []
        ];
        const { task } = await remote(active.origin, active.deviceToken, "/v2/work", {
          policy,
          open: withinHours(policy, (/* @__PURE__ */ new Date()).getHours()),
          claim: running < policy.slots,
          cpu: availableParallelism(),
          ram_mib: Math.floor(totalmem() / 1048576),
          ram_free_mib: Math.floor(freemem() / 1048576),
          gpu: graphics,
          modules,
          ...textEnabled ? { available_models: discovered } : {}
        });
        workerState = modules.length ? "ready" : "module_missing";
        if (task && typeof task.id === "string" && typeof task.lease === "string" && UUID.test(task.id) && UUID.test(task.lease) && OPERATIONS.includes(task.operation) && (task.scope === "stage" || task.scope === "legacy") && (task.operation !== TEXT_OPERATION || task.scope === "stage" && localModel(task.model) && Number.isSafeInteger(task.lease_ms) && task.lease_ms >= 100)) void execute(active, task);
      } catch {
        workerState = "unavailable";
      } finally {
        polling = false;
      }
    }
    const timer = setInterval(() => void tick(), 1e3);
    timer.unref();
    ctx.onShutdown(() => {
      clearInterval(timer);
      lifecycle.abort();
    });
    const noStore = { "cache-control": "no-store" };
    ctx.router.add("GET", "/", () => ({ raw: PAGE, headers: { "content-type": "text/html; charset=utf-8", ...noStore } }));
    ctx.router.add("GET", "/api/status", (c) => {
      local(c);
      return { headers: noStore, body: {
        connection: room && {
          origin: room.origin,
          member: room.memberName,
          device: room.deviceId,
          accepts_others: policyOf(room).accepts_others
        },
        policy: room && policyOf(room),
        module_ready: Boolean(adapter()),
        report_ready: Boolean(reportAdapter()),
        text_ready: Boolean(textAdapter()),
        worker_state: workerState
      } };
    });
    ctx.router.add("POST", "/api/connect", async (c) => {
      local(c, true);
      const snapshot = configVersion;
      const input = object(c.body, ["origin", "member_token", "device_token"]);
      const origin = originOf(input.origin);
      const memberToken = textField(input.member_token, 64, "\u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435");
      const deviceToken = input.device_token === "" ? "" : textField(input.device_token, 64, "\u043A\u043B\u044E\u0447 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430");
      if (!TOKEN.test(memberToken) || deviceToken && !TOKEN.test(deviceToken)) throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043A\u043B\u044E\u0447\u0430.");
      const { member } = await remote(origin, memberToken, "/v1/session");
      if (!member || typeof member.id !== "string" || typeof member.name !== "string") throw new ForbiddenError("\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430.");
      let deviceId = null;
      if (deviceToken) {
        const { device } = await remote(origin, deviceToken, "/v1/session");
        if (!device || device.owner_id !== member.id || typeof device.id !== "string") throw new ForbiddenError("\u041A\u043B\u044E\u0447 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 \u043F\u0440\u0438\u043D\u0430\u0434\u043B\u0435\u0436\u0438\u0442 \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0443.");
        deviceId = device.id;
      }
      if (snapshot !== configVersion) throw new AppError("room_conflict", "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u043E\u043C\u043D\u0430\u0442\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435.", 409);
      persist({ origin, memberToken, deviceToken, memberId: member.id, memberName: member.name, deviceId, acceptsOthers: false });
      workerState = "idle";
      return { body: { ok: true } };
    });
    ctx.router.add("POST", "/api/policy", (c) => {
      local(c, true);
      const active = connected();
      if (!active.deviceId) throw new ValidationError("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043A\u043B\u044E\u0447 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430.");
      const short = c.body && typeof c.body === "object" && Object.keys(c.body).length === 1 ? object(c.body, ["accepts_others"]) : null;
      const policy = participation(short ? { ...policyOf(active), accepts_others: short.accepts_others } : c.body);
      persist({ ...active, acceptsOthers: policy.accepts_others, policy });
      return { body: { ok: true } };
    });
    ctx.router.add("POST", "/api/disconnect", (c) => {
      local(c, true);
      persist(null);
      workerState = "idle";
      return { body: { ok: true } };
    });
    ctx.router.add("GET", "/api/tasks", async (c) => {
      local(c);
      const active = connected();
      return { headers: noStore, body: await remote(active.origin, active.memberToken, "/v1/tasks") };
    });
    ctx.router.add("POST", "/api/text-missions", async (c) => {
      local(c, true);
      const active = connected();
      const row = object(c.body, ["title", "request_id", "model", "notes"]);
      if (typeof row.request_id !== "string" || !UUID.test(row.request_id)) throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430.");
      return { status: 201, body: await remote(active.origin, active.memberToken, "/v3/text-missions", {
        title: textField(row.title, 160, "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435"),
        request_id: row.request_id,
        ...textInput({ model: row.model, notes: row.notes })
      }) };
    });
    ctx.router.add("POST", "/api/tasks", async (c) => {
      local(c, true);
      const active = connected();
      const input = object(c.body, ["title", "request_id", "image_base64"]);
      const title = textField(input.title, 160, "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435");
      const requestId = textField(input.request_id, 36, "\u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440");
      if (!UUID.test(requestId)) throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430.");
      return { status: 201, headers: noStore, body: await remote(
        active.origin,
        active.memberToken,
        "/v1/tasks",
        { title, request_id: requestId, image_base64: imageInput(input.image_base64) }
      ) };
    });
    ctx.router.add("GET", "/api/dashboard", async (c) => {
      local(c);
      const active = connected();
      const data = await remote(active.origin, active.memberToken, "/v2/dashboard");
      let suggestions = [];
      try {
        suggestions = ctx.require("activity-predictions").suggestRoom(data);
      } catch {
      }
      return { headers: noStore, body: { ...data, suggestions } };
    });
    ctx.router.add("POST", "/api/missions", async (c) => {
      local(c, true);
      const active = connected();
      const data = object(c.body, ["title", "request_id", "images"]);
      if (typeof data.request_id !== "string" || !UUID.test(data.request_id) || !Array.isArray(data.images) || data.images.length < 1 || data.images.length > 4) throw new ValidationError("\u041D\u0443\u0436\u043D\u044B \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0430.");
      return { status: 201, headers: noStore, body: await remote(
        active.origin,
        active.memberToken,
        "/v2/missions",
        { title: textField(data.title, 160, "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435"), request_id: data.request_id, images: data.images.map(imageInput) }
      ) };
    });
    ctx.router.add("POST", "/api/stages/:id/retry", async (c) => {
      local(c, true);
      const active = connected();
      object(c.body, []);
      const id = c.params.id ?? "";
      if (!UUID.test(id)) throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u044D\u0442\u0430\u043F.");
      return { headers: noStore, body: await remote(active.origin, active.memberToken, "/v2/stages/" + id + "/retry", {}) };
    });
    ctx.router.add("POST", "/api/stages/:id/decide", async (c) => {
      local(c, true);
      const active = connected();
      const id = c.params.id ?? "";
      if (!UUID.test(id)) throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u044D\u0442\u0430\u043F.");
      const input = object(c.body, ["decision", "artifact_id", "note"]);
      return { headers: noStore, body: await remote(active.origin, active.memberToken, "/v2/stages/" + id + "/decide", input) };
    });
    ctx.router.add("POST", "/api/preview", async (c) => {
      local(c, true);
      const active = connected();
      const input = object(c.body, ["plan", "image_count"]);
      if (!Number.isInteger(input.image_count) || Number(input.image_count) < 1 || Number(input.image_count) > 4) {
        throw new ValidationError("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 1\u20134 \u0444\u0430\u0439\u043B\u0430 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043B\u0430\u043D\u0430.");
      }
      const plan = readPlan(input.plan, Number(input.image_count));
      return { headers: noStore, body: await remote(active.origin, active.memberToken, "/v3/preview", { plan, image_count: input.image_count }) };
    });
    ctx.router.add("POST", "/api/plan", async (c) => {
      local(c, true);
      const active = connected();
      const data = object(c.body, ["title", "request_id", "images", "plan"]);
      if (typeof data.request_id !== "string" || !UUID.test(data.request_id) || !Array.isArray(data.images) || data.images.length < 1 || data.images.length > 4) throw new ValidationError("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F.");
      return { status: 201, headers: noStore, body: await remote(active.origin, active.memberToken, "/v3/missions", {
        title: textField(data.title, 160, "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435"),
        request_id: data.request_id,
        images: data.images.map(imageInput),
        plan: readPlan(data.plan, data.images.length)
      }) };
    });
    for (const [localPath, remotePath] of [["/api/team", "/v3/team"], ["/api/templates", "/v3/templates"]]) {
      ctx.router.add("GET", localPath, async (c) => {
        local(c);
        const active = connected();
        return { headers: noStore, body: await remote(active.origin, active.memberToken, remotePath) };
      });
    }
    for (const [localPath, remotePath] of [["/api/invite", "/v3/invite"], ["/api/revoke", "/v3/revoke"], ["/api/templates", "/v3/templates"]]) {
      ctx.router.add("POST", localPath, async (c) => {
        local(c, true);
        const active = connected();
        return { headers: noStore, body: await remote(active.origin, active.memberToken, remotePath, c.body ?? {}) };
      });
    }
    ctx.router.add("POST", "/api/redeem", async (c) => {
      local(c, true);
      const input = object(c.body, ["origin", "code", "for_device"]);
      const origin = originOf(input.origin);
      const code = textField(input.code, 64, "\u043A\u043E\u0434");
      if (!TOKEN.test(code) || typeof input.for_device !== "boolean") throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043E\u0434.");
      const active = input.for_device ? connected() : null;
      if (active && active.origin !== origin) throw new ForbiddenError("\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u043F\u0440\u0438\u043D\u0430\u0434\u043B\u0435\u0436\u0430\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u043A\u043E\u043C\u043D\u0430\u0442\u0435.");
      const data = await remote(origin, "", "/v3/join", { code, device_for: active?.memberId ?? null });
      if (typeof data.token !== "string" || !TOKEN.test(data.token) || !["device", "member"].includes(data.kind)) {
        throw new AppError("room_response", "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u043E\u0440 \u0432\u0435\u0440\u043D\u0443\u043B \u043E\u0448\u0438\u0431\u043E\u0447\u043D\u044B\u0439 \u043A\u043B\u044E\u0447.", 502);
      }
      return { headers: noStore, body: { kind: data.kind, token: data.token } };
    });
    ctx.router.add("POST", "/api/attach", async (c) => {
      local(c, true);
      const active = connected();
      const input = object(c.body, ["device_token"]);
      const token = textField(input.device_token, 64, "\u043A\u043B\u044E\u0447 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430");
      if (!TOKEN.test(token)) throw new ValidationError("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430.");
      const { device } = await remote(active.origin, token, "/v1/session");
      if (!device || device.owner_id !== active.memberId || typeof device.id !== "string") throw new ForbiddenError("\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430.");
      if (room !== active) throw new AppError("room_conflict", "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0443\u0436\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C.", 409);
      persist({ ...active, deviceId: device.id, deviceToken: token, acceptsOthers: false, policy: defaultParticipation() });
      return { body: { ok: true } };
    });
  }
};
var index_default = module;
export {
  index_default as default
};
