import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/kernel/errors.ts
var AppError = class extends Error {
  code;
  status;
  details;
  constructor(code, message, status, details = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
};
var ValidationError = class extends AppError {
  constructor(message, details = {}) {
    super("validation_failed", message, 400, details);
  }
};
var NotFoundError = class extends AppError {
  constructor(message = "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E") {
    super("not_found", message, 404);
  }
};
var ConflictError = class extends AppError {
  constructor(message, details = {}) {
    super("conflict", message, 409, details);
  }
};

// src/kernel/clock.ts
var systemClock = {
  now: () => /* @__PURE__ */ new Date()
};
function nextTimestamp(previous, now) {
  const base = now.getTime();
  const prev = previous ? Date.parse(previous) : Number.NaN;
  return new Date(Number.isFinite(prev) ? Math.max(base, prev + 1) : base).toISOString();
}

// src/kernel/ids.ts
import { randomUUID } from "node:crypto";
function newId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// src/kernel/validate.ts
function record(raw, what) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ValidationError(`${what}: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442`);
  }
  return raw;
}
function text(raw, field, max, required = false) {
  if (raw === void 0 || raw === null) {
    if (required) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E`);
    return "";
  }
  if (typeof raw !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  const value = raw.trim();
  if (required && !value) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E`);
  if (value.length > max) throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${max} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  return value;
}

// src/domain/missions/mission.ts
var MISSION_STATUSES = ["ready", "running", "review", "paused", "complete"];
var ACTIVE_STAGE_STATUSES = ["running", "review"];
function stageKey(position) {
  return `SW${String(position).padStart(3, "0")}`;
}
function isActiveStage(stage) {
  return ACTIVE_STAGE_STATUSES.includes(stage.status);
}
function stageView(stage) {
  return {
    id: stage.id,
    key: stage.key,
    position: stage.position,
    title: stage.title,
    status: stage.status
  };
}
function dependencyKeys(raw, label, known) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError(`${label}: depends_on \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u043A\u043B\u044E\u0447\u0435\u0439 \u044D\u0442\u0430\u043F\u043E\u0432`);
  const keys = [...new Set(raw.map((item) => text(item, `${label}.depends_on`, 20, true).toUpperCase()))];
  for (const key of keys) {
    if (!/^SW\d{3}$/.test(key)) throw new ValidationError(`${label}: \u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0441\u0442\u044C \xAB${key}\xBB \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043A\u043B\u044E\u0447\u043E\u043C SW001`);
    if (!known.includes(key)) {
      throw new ValidationError(`${label}: \u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0441\u0442\u044C ${key} \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u0441\u044B\u043B\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0431\u043E\u043B\u0435\u0435 \u0440\u0430\u043D\u043D\u0438\u0439 \u044D\u0442\u0430\u043F \u044D\u0442\u043E\u0439 \u043C\u0438\u0441\u0441\u0438\u0438 (${known.join(", ") || "\u043D\u0435\u0442"})`);
    }
  }
  return keys;
}
function normalizeNewMission(raw) {
  const input = record(raw, "\u041C\u0438\u0441\u0441\u0438\u044F");
  const stagesRaw = input.stages ?? [];
  if (!Array.isArray(stagesRaw)) throw new ValidationError("\u041F\u043E\u043B\u0435 \xABstages\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u044D\u0442\u0430\u043F\u043E\u0432");
  if (stagesRaw.length > 100) throw new ValidationError("\u0412 \u043C\u0438\u0441\u0441\u0438\u0438 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 100 \u044D\u0442\u0430\u043F\u043E\u0432 \u043D\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435");
  const stages = [];
  for (const [index, item] of stagesRaw.entries()) {
    const label = `\u042D\u0442\u0430\u043F ${index + 1}`;
    const draft = record(item, label);
    const known = stages.map((_, at) => stageKey(at + 1));
    stages.push({
      title: text(draft.title, `${label}.title`, 200, true),
      acceptance: text(draft.acceptance, `${label}.acceptance`, 2e3),
      depends_on: dependencyKeys(draft.depends_on, label, known)
    });
  }
  return {
    title: text(input.title, "title", 200, true),
    goal: text(input.goal, "goal", 4e3),
    actor: text(input.actor, "actor", 100) || "human",
    agent: text(input.agent, "agent", 100) || null,
    stages
  };
}
function normalizeStageDraft(raw, known) {
  const input = record(raw, "\u042D\u0442\u0430\u043F");
  return {
    title: text(input.title, "title", 200, true),
    acceptance: text(input.acceptance, "acceptance", 2e3),
    depends_on: dependencyKeys(input.depends_on, "\u042D\u0442\u0430\u043F", known)
  };
}
function buildMission(input, now) {
  const at = now.toISOString();
  const mission = {
    id: newId("mis"),
    title: input.title,
    goal: input.goal,
    status: "ready",
    current_stage_id: null,
    revision: 1,
    summary: null,
    agent: input.agent,
    created_at: at,
    updated_at: at
  };
  const stages = input.stages.map((draft, index) => ({
    id: newId("stg"),
    mission_id: mission.id,
    key: stageKey(index + 1),
    position: index + 1,
    title: draft.title,
    acceptance: draft.acceptance,
    depends_on: draft.depends_on,
    status: draft.depends_on.length ? "pending" : "ready",
    result: null,
    task_id: null,
    run_id: null,
    error: null,
    agent: null,
    dispatch_attempt: 0,
    started_at: null,
    submitted_at: null,
    finished_at: null,
    revision: 1
  }));
  return {
    mission,
    stages,
    event: {
      mission_id: mission.id,
      type: "mission.created",
      actor: input.actor,
      payload: { title: mission.title, stages: stages.length },
      created_at: at
    }
  };
}
function findStage(stages, ref) {
  const value = String(ref || "").trim();
  const stage = stages.find((item) => item.id === value) ?? stages.find((item) => item.key === value.toUpperCase()) ?? stages.find((item) => String(item.position) === value);
  if (!stage) throw new NotFoundError(`\u042D\u0442\u0430\u043F \xAB${ref}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u043C\u0438\u0441\u0441\u0438\u0438`);
  return stage;
}
function byKey(stages) {
  return new Map(stages.map((stage) => [stage.key, stage]));
}
function activeStage(stages) {
  return stages.find(isActiveStage) ?? null;
}
function refreshReadiness(stages) {
  const done = new Set(stages.filter((stage) => stage.status === "done").map((stage) => stage.key));
  for (const stage of stages) {
    if (stage.status !== "ready" && stage.status !== "pending") continue;
    const clear = stage.depends_on.every((key) => done.has(key));
    stage.status = clear ? "ready" : "pending";
  }
}
function missionProgress(mission, stages) {
  const known = byKey(stages);
  const count = (status) => stages.filter((stage) => stage.status === status).length;
  const done = count("done");
  const cancelled = count("cancelled");
  const total = stages.length;
  const next = stages.find((stage) => stage.status === "ready") ?? null;
  const current = mission.current_stage_id ? stages.find((stage) => stage.id === mission.current_stage_id) ?? null : null;
  const blocked = stages.filter((stage) => stage.status === "pending").map((stage) => ({
    key: stage.key,
    title: stage.title,
    missing: stage.depends_on.filter((key) => known.get(key)?.status !== "done")
  })).filter((item) => item.missing.length > 0);
  const blockers = [];
  if (!total) blockers.push("\u0443 \u043C\u0438\u0441\u0441\u0438\u0438 \u043D\u0435\u0442 \u044D\u0442\u0430\u043F\u043E\u0432: \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0442\u044C \u043D\u0435\u0447\u0435\u0433\u043E");
  for (const stage of stages) {
    if (stage.status === "done" || stage.status === "cancelled") continue;
    blockers.push(`\u044D\u0442\u0430\u043F ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}: ${stage.title}`);
  }
  return {
    total,
    done,
    cancelled,
    running: count("running"),
    review: count("review"),
    ready: count("ready"),
    pending: count("pending"),
    failed: count("failed"),
    closed: done + cancelled,
    percent: total ? Math.round(done / total * 100) : 0,
    current_stage: current ? stageView(current) : null,
    next_stage: next ? stageView(next) : null,
    blocked,
    blockers
  };
}
function missionSummary(mission, stages) {
  const progress = missionProgress(mission, stages);
  return {
    ...mission,
    total: progress.total,
    done: progress.done,
    cancelled: progress.cancelled,
    percent: progress.percent,
    current_stage: progress.current_stage,
    next_stage: progress.next_stage
  };
}
function assertOpen(mission) {
  if (mission.status === "complete") throw new ConflictError("\u041C\u0438\u0441\u0441\u0438\u044F \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430", { status: mission.status });
}
function assertNotPaused(mission) {
  if (mission.status === "paused") {
    throw new ConflictError("\u041C\u0438\u0441\u0441\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043D\u0438\u043C\u0438\u0442\u0435 \u043F\u0430\u0443\u0437\u0443", { status: mission.status });
  }
}
function event(missionId, type, actor, payload, at) {
  return { mission_id: missionId, type, actor, payload, created_at: at };
}
function startStage(mission, stages, stage, actor, now, execution) {
  assertOpen(mission);
  assertNotPaused(mission);
  if (stage.status === "pending") {
    const known = byKey(stages);
    const missing = stage.depends_on.filter((key) => known.get(key)?.status !== "done");
    const next = stages.find((item) => item.status === "ready");
    throw new ConflictError(
      `\u042D\u0442\u0430\u043F ${stage.key} \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F: \u043D\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u044B ${missing.join(", ") || "\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0441\u0442\u0438"}`,
      { missing, next_stage: next ? stageView(next) : null, status: stage.status }
    );
  }
  if (stage.status === "done" || stage.status === "cancelled") {
    throw new ConflictError(`\u042D\u0442\u0430\u043F ${stage.key} \u0443\u0436\u0435 \u0437\u0430\u043A\u0440\u044B\u0442: ${stage.status}`, { status: stage.status });
  }
  const active = activeStage(stages);
  if (active && active.id !== stage.id) {
    throw new ConflictError(
      `\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u044D\u0442\u0430\u043F ${active.key} (${active.status}): \u043C\u0438\u0441\u0441\u0438\u044F \u0432\u0435\u0434\u0451\u0442 \u043E\u0434\u0438\u043D \u044D\u0442\u0430\u043F \u0437\u0430 \u0440\u0430\u0437`,
      { active: stageView(active) }
    );
  }
  if (stage.status === "review") {
    throw new ConflictError(`\u042D\u0442\u0430\u043F ${stage.key} \u0443\u0436\u0435 \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435`, { status: stage.status });
  }
  if (stage.status === "running") {
    throw new ConflictError(`\u042D\u0442\u0430\u043F ${stage.key} \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F`, { status: stage.status });
  }
  if (stage.status !== "ready" && stage.status !== "failed") {
    throw new ConflictError(`\u042D\u0442\u0430\u043F ${stage.key} \u043D\u0435\u043B\u044C\u0437\u044F \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0438\u0437 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 ${stage.status}`, { status: stage.status });
  }
  const at = now.toISOString();
  stage.status = "running";
  stage.started_at = at;
  stage.result = null;
  stage.error = null;
  stage.run_id = null;
  stage.revision += 1;
  if (execution) {
    attachExecution(stage, execution);
    if (!mission.agent) mission.agent = execution.agent;
  }
  mission.status = "running";
  mission.current_stage_id = stage.id;
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages,
    event: event(mission.id, "mission.stage.started", actor, {
      stage: stage.key,
      title: stage.title,
      ...execution ? { task_id: execution.task_id, run_id: execution.run_id, agent: execution.agent } : { mode: "manual" }
    }, at)
  };
}
function attachExecution(stage, execution) {
  stage.task_id = execution.task_id;
  stage.run_id = execution.run_id;
  stage.agent = execution.agent;
  stage.dispatch_attempt += 1;
}
function attachTask(stage, taskId) {
  stage.task_id = taskId;
  stage.dispatch_attempt += 1;
}
function recordRunReport(mission, stages, stage, report, actor, now, source = "run") {
  if (stage.status !== "running") {
    throw new ConflictError(`\u041E\u0442\u0447\u0451\u0442 \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0449\u0435\u043C\u0443\u0441\u044F \u044D\u0442\u0430\u043F\u0443; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
  const at = now.toISOString();
  stage.status = "review";
  stage.result = report.trim();
  stage.error = null;
  stage.submitted_at = at;
  stage.revision += 1;
  mission.current_stage_id = stage.id;
  if (mission.status !== "paused") mission.status = "review";
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages,
    event: event(mission.id, "mission.stage.submitted", actor, {
      stage: stage.key,
      run_id: stage.run_id,
      task_id: stage.task_id,
      source
    }, at)
  };
}
function failStage(mission, stages, stage, reason, actor, now) {
  if (stage.status !== "running") {
    throw new ConflictError(`\u0421\u0431\u043E\u0439 \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0449\u0435\u043C\u0443\u0441\u044F \u044D\u0442\u0430\u043F\u0443; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
  const at = now.toISOString();
  stage.status = "failed";
  stage.error = reason.trim().slice(0, 2e3) || "\u0417\u0430\u043F\u0443\u0441\u043A \u0430\u0433\u0435\u043D\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043D\u0435\u0443\u0434\u0430\u0447\u043D\u043E";
  stage.finished_at = at;
  stage.revision += 1;
  mission.current_stage_id = null;
  if (mission.status !== "paused") mission.status = "ready";
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages,
    event: event(mission.id, "mission.stage.failed", actor, {
      stage: stage.key,
      run_id: stage.run_id,
      task_id: stage.task_id,
      error: stage.error
    }, at)
  };
}
function submitStage(mission, stages, stage, result, actor, now) {
  assertOpen(mission);
  assertNotPaused(mission);
  if (stage.status !== "running") {
    throw new ConflictError(`\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0449\u0438\u0439\u0441\u044F \u044D\u0442\u0430\u043F; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
  if (!result.trim()) throw new ValidationError("\u041D\u0443\u0436\u0435\u043D \u043E\u0442\u0447\u0451\u0442 \u043E \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0435 \u044D\u0442\u0430\u043F\u0430");
  const at = now.toISOString();
  stage.status = "review";
  stage.result = result.trim();
  stage.submitted_at = at;
  stage.revision += 1;
  mission.status = "review";
  mission.current_stage_id = stage.id;
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages,
    event: event(mission.id, "mission.stage.submitted", actor, {
      stage: stage.key,
      result_bytes: result.trim().length
    }, at)
  };
}
function acceptStage(mission, stages, stage, actor, now) {
  assertOpen(mission);
  assertNotPaused(mission);
  if (stage.status !== "review") {
    throw new ConflictError(`\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u0430\u043F \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
  const at = now.toISOString();
  stage.status = "done";
  stage.finished_at = at;
  stage.revision += 1;
  refreshReadiness(stages);
  const open = stages.filter((item) => item.status !== "done");
  if (!open.length) {
    mission.status = "complete";
    mission.current_stage_id = null;
    mission.summary = `\u0412\u0441\u0435 \u044D\u0442\u0430\u043F\u044B \u0437\u0430\u043A\u0440\u044B\u0442\u044B: ${stages.length} \u0438\u0437 ${stages.length}`;
  } else {
    const next = stages.find((item) => item.status === "ready") ?? null;
    mission.status = "ready";
    mission.current_stage_id = null;
    mission.summary = null;
    if (!next) {
      mission.current_stage_id = null;
    }
  }
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages,
    event: event(mission.id, "mission.stage.accepted", actor, {
      stage: stage.key,
      mission_status: mission.status
    }, at)
  };
}
function rejectStage(mission, stages, stage, reason, actor, now) {
  assertOpen(mission);
  assertNotPaused(mission);
  if (stage.status !== "review") {
    throw new ConflictError(`\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u0430\u043F \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
  const at = now.toISOString();
  stage.status = "running";
  stage.finished_at = null;
  stage.revision += 1;
  mission.status = "running";
  mission.current_stage_id = stage.id;
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages,
    event: event(mission.id, "mission.stage.rejected", actor, {
      stage: stage.key,
      reason: reason.trim().slice(0, 500)
    }, at)
  };
}
function addStage(mission, stages, draft, actor, now) {
  const position = stages.reduce((max, stage2) => Math.max(max, stage2.position), 0) + 1;
  const at = now.toISOString();
  const stage = {
    id: newId("stg"),
    mission_id: mission.id,
    key: stageKey(position),
    position,
    title: draft.title,
    acceptance: draft.acceptance,
    depends_on: draft.depends_on,
    status: "pending",
    result: null,
    task_id: null,
    run_id: null,
    error: null,
    agent: null,
    dispatch_attempt: 0,
    started_at: null,
    submitted_at: null,
    finished_at: null,
    revision: 1
  };
  stages.push(stage);
  refreshReadiness(stages);
  if (mission.status === "complete") {
    mission.status = "ready";
    mission.summary = null;
  }
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    stage,
    event: event(mission.id, "mission.stage.added", actor, {
      stage: stage.key,
      title: stage.title,
      depends_on: stage.depends_on
    }, at)
  };
}
function pauseMission(mission, actor, now) {
  if (mission.status === "complete") throw new ConflictError("\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u0443\u044E \u043C\u0438\u0441\u0441\u0438\u044E \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u043F\u0430\u0443\u0437\u0443");
  const at = now.toISOString();
  const changed = mission.status !== "paused";
  mission.status = "paused";
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages: [],
    event: event(mission.id, "mission.paused", actor, { changed }, at)
  };
}
function resumeMission(mission, stages, actor, now) {
  if (mission.status !== "paused") {
    throw new ConflictError("\u041C\u0438\u0441\u0441\u0438\u044F \u043D\u0435 \u043D\u0430 \u043F\u0430\u0443\u0437\u0435", { status: mission.status });
  }
  const active = activeStage(stages);
  const at = now.toISOString();
  mission.status = active ? active.status === "review" ? "review" : "running" : "ready";
  mission.current_stage_id = active ? active.id : null;
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages: [],
    event: event(mission.id, "mission.resumed", actor, { status: mission.status }, at)
  };
}
function completeMission(mission, stages, summary, actor, now) {
  const progress = missionProgress(mission, stages);
  if (progress.blockers.length) {
    throw new ConflictError(`\u041C\u0438\u0441\u0441\u0438\u044F \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u0442\u0441\u044F: ${progress.blockers.join("; ")}`, {
      blockers: progress.blockers,
      progress
    });
  }
  if (mission.status === "complete") return null;
  const at = now.toISOString();
  mission.status = "complete";
  mission.current_stage_id = null;
  mission.summary = summary.trim() || `\u041F\u043B\u0430\u043D \u0437\u0430\u043A\u0440\u044B\u0442 ${progress.done}/${progress.total}: \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u044D\u0442\u0430\u043F\u043E\u0432 \u043D\u0435\u0442`;
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages: [],
    event: event(mission.id, "mission.completed", actor, {
      summary: mission.summary,
      done: progress.done,
      total: progress.total,
      cancelled: progress.cancelled
    }, at)
  };
}

// src/app/mission-service.ts
function actorOf(raw) {
  if (!raw || typeof raw !== "object") return "human";
  const value = raw.actor;
  if (value === void 0 || value === null) return "human";
  if (typeof value !== "string") throw new ValidationError("\u041F\u043E\u043B\u0435 \xABactor\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439");
  return value.trim().slice(0, 100) || "human";
}
function bodyText(raw, field) {
  if (!raw || typeof raw !== "object") return "";
  const value = raw[field];
  if (value === void 0 || value === null) return "";
  if (typeof value !== "string") throw new ValidationError(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439`);
  return value;
}
var MissionService = class {
  #repo;
  #bus;
  #clock;
  #log;
  #execution;
  #maxAttempts;
  constructor(repo, bus, clock, log, options = {}) {
    this.#repo = repo;
    this.#bus = bus;
    this.#clock = clock;
    this.#log = log.child({ module: "missions" });
    this.#execution = options.execution ?? null;
    const configured = options.maxAttempts ?? 3;
    this.#maxAttempts = Number.isFinite(configured) ? Math.max(1, Math.trunc(configured)) : 3;
  }
  create(raw) {
    const input = normalizeNewMission(raw);
    const { mission, stages, event: event2 } = buildMission(input, this.#clock.now());
    this.#repo.insert(mission, stages, event2);
    this.#publish(event2);
    this.#log.info("\u041C\u0438\u0441\u0441\u0438\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0430", { mission_id: mission.id, stages: stages.length });
    return this.#detail(mission.id);
  }
  list(raw) {
    const limit = raw.limit === void 0 || raw.limit === "" ? 50 : Number(raw.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new ValidationError("\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \xABlimit\xBB: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 1 \u0434\u043E 200");
    }
    const status = raw.status?.trim() || void 0;
    if (status && !MISSION_STATUSES.includes(status)) {
      throw new ValidationError(`\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \xABstatus\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E ${MISSION_STATUSES.join(", ")}`, { value: status });
    }
    const query = raw.q?.trim().toLowerCase() || void 0;
    const items = this.#repo.listMissions(200).filter((mission) => !status || mission.status === status).filter((mission) => !query || `${mission.title}
${mission.goal}`.toLowerCase().includes(query)).map((mission) => missionSummary(mission, this.#repo.stages(mission.id)));
    return { items: items.slice(0, limit), total: items.length };
  }
  get(id) {
    return this.#detail(id);
  }
  addStage(id, raw) {
    const { mission, stages } = this.#load(id);
    const known = stages.map((stage) => stage.key);
    const draft = normalizeStageDraft(raw, known);
    const { event: event2 } = addStage(mission, stages, draft, actorOf(raw), this.#clock.now());
    this.#repo.update(mission, stages, event2);
    this.#publish(event2);
    this.#log.info("\u042D\u0442\u0430\u043F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D", { mission_id: id, stage: event2.payload.stage });
    return this.#detail(id);
  }
  /**
   * Запуск этапа всегда связан с карточкой: можно привязать существующую
   * (`task_id`) или сервис создаст её. С исполнителем создаётся ещё и запуск
   * в общей очереди; без исполнителя этап остаётся ручным, но карточка живёт
   * на доске и её закрытие завершает этап.
   */
  start(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    const actor = actorOf(raw);
    const requested = bodyText(raw, "agent").trim() || mission.agent;
    const requestedTask = bodyText(raw, "task_id").trim();
    const execution = this.#execution;
    let agent = null;
    if (requested) {
      if (!execution?.runs) {
        throw new ConflictError("\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D: \u044D\u0442\u0430\u043F \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0443", {
          agent: requested,
          mode: "manual"
        });
      }
      agent = this.#resolveAgent(requested);
    } else if (execution?.runs) {
      agent = this.#resolveAgent(null);
    }
    let card = null;
    if (requestedTask) {
      if (!execution) {
        throw new ConflictError("\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u0437\u0430\u0434\u0430\u0447 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B: \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D", {
          task_id: requestedTask
        });
      }
      card = this.#taskById(requestedTask);
      if (!card) throw new NotFoundError(`\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 ${requestedTask} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
      if (card.status === "done") {
        throw new ConflictError(`\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 ${card.id} \u0443\u0436\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u0430: \u0435\u0451 \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u043A \u044D\u0442\u0430\u043F\u0443`, {
          task_id: card.id,
          status: card.status
        });
      }
    } else if (stage.task_id) {
      const previous = this.#taskById(stage.task_id);
      if (previous && previous.status !== "done") card = previous;
    }
    const now = this.#clock.now();
    const transition = startStage(mission, stages, stage, actor, now);
    let cardId = null;
    try {
      if (!card && execution) {
        card = execution.tasks.create({
          title: `\u041C\u0438\u0441\u0441\u0438\u044F \xAB${mission.title}\xBB: ${stage.key}. ${stage.title}`.slice(0, 200),
          description: this.#cardDescription(mission, stage, agent ?? "\u0440\u0443\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C"),
          type: "work",
          priority: 2,
          created_by: "mission",
          assignee: agent,
          tags: ["mission", mission.id, stage.key]
        });
      }
      cardId = card?.id ?? null;
      if (card) stage.task_id = card.id;
      if (card && agent && execution?.runs) {
        this.#moveCard(card.id, "claimed", agent, "", agent);
        const { run } = execution.runs.create({
          agent,
          task_id: card.id,
          max_attempts: 3,
          idempotency_key: `mission:${mission.id}:${stage.id}:${stage.dispatch_attempt + 1}`
        });
        attachExecution(stage, { task_id: card.id, run_id: run.id, agent });
        if (!mission.agent) mission.agent = agent;
        transition.event.payload = {
          stage: stage.key,
          title: stage.title,
          task_id: card.id,
          run_id: run.id,
          agent
        };
      } else if (card) {
        attachTask(stage, card.id);
        transition.event.payload = {
          stage: stage.key,
          title: stage.title,
          task_id: card.id,
          mode: "manual"
        };
      }
      this.#save(transition, stage.key);
      this.#log.info(cardId ? "\u042D\u0442\u0430\u043F \u0441\u0432\u044F\u0437\u0430\u043D \u0441 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u043E\u0439" : "\u042D\u0442\u0430\u043F \u0437\u0430\u043F\u0443\u0449\u0435\u043D \u0432\u0440\u0443\u0447\u043D\u0443\u044E", {
        mission_id: id,
        stage: stage.key,
        task_id: cardId,
        agent,
        run_id: stage.run_id
      });
      return this.#detail(id);
    } catch (error) {
      const reason = `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u044D\u0442\u0430\u043F \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E: ${error instanceof Error ? error.message : String(error)}`;
      const failed = failStage(mission, stages, stage, reason, actor, this.#clock.now());
      this.#repo.update(failed.mission, failed.stages, failed.event);
      this.#publish(failed.event);
      if (cardId) this.#moveCard(cardId, "blocked", "mission", reason);
      this.#log.warn("\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u044D\u0442\u0430\u043F\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C", { mission_id: id, stage: stage.key, error: reason });
      throw new ConflictError(reason, { mission_id: id, stage: stage.key, task_id: cardId });
    }
  }
  submit(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    const result = bodyText(raw, "result");
    if (stage.run_id) this.#cancelRun(stage.run_id);
    const transition = submitStage(mission, stages, stage, result, actorOf(raw), this.#clock.now());
    this.#save(transition, stage.key);
    return this.#detail(id);
  }
  accept(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    const transition = acceptStage(mission, stages, stage, actorOf(raw), this.#clock.now());
    this.#save(transition, stage.key);
    this.#moveCard(stage.task_id, "done", "mission");
    return this.#detail(id);
  }
  reject(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    const reason = bodyText(raw, "reason");
    if (!reason.trim()) throw new ValidationError("\u041D\u0443\u0436\u043D\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 \u044D\u0442\u0430\u043F\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E");
    const transition = rejectStage(mission, stages, stage, reason, actorOf(raw), this.#clock.now());
    this.#save(transition, stage.key);
    return this.#detail(id);
  }
  pause(id, raw) {
    const { mission } = this.#load(id);
    const transition = pauseMission(mission, actorOf(raw), this.#clock.now());
    this.#repo.update(mission, [], transition.event);
    this.#publish(transition.event);
    this.#log.info("\u041C\u0438\u0441\u0441\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435", { mission_id: id });
    return this.#detail(id);
  }
  resume(id, raw) {
    const { mission, stages } = this.#load(id);
    const transition = resumeMission(mission, stages, actorOf(raw), this.#clock.now());
    this.#repo.update(mission, [], transition.event);
    this.#publish(transition.event);
    this.#log.info("\u041C\u0438\u0441\u0441\u0438\u044F \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430", { mission_id: id, status: mission.status });
    return this.#detail(id);
  }
  complete(id, raw) {
    const { mission, stages } = this.#load(id);
    const transition = completeMission(
      mission,
      stages,
      bodyText(raw, "summary"),
      actorOf(raw),
      this.#clock.now()
    );
    if (!transition) return { ...this.#detail(id), transitioned: false };
    this.#repo.update(mission, [], transition.event);
    this.#publish(transition.event);
    this.#log.info("\u041C\u0438\u0441\u0441\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430", { mission_id: id });
    return { ...this.#detail(id), transitioned: true };
  }
  /**
   * Сверяет выполняющиеся этапы с их запусками. Вызывается по событиям run.*
   * и по таймеру, поэтому переживает перезапуск и пропущенное событие.
   */
  reconcileRuns() {
    const execution = this.#execution;
    const runs = execution?.runs ?? null;
    const result = { checked: 0, updated: 0 };
    if (!execution || !runs) return result;
    for (const reference of this.#repo.missionsWithRunningStages()) {
      const mission = this.#repo.get(reference.id);
      if (!mission) continue;
      const stages = this.#repo.stages(mission.id);
      for (const stage of stages.filter((item) => item.status === "running")) {
        result.checked += 1;
        if (!stage.run_id) {
          this.#applyFailure(
            mission,
            stages,
            stage,
            "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u044D\u0442\u0430\u043F\u0430 \u043F\u0440\u0435\u0440\u0432\u0430\u043B\u0430\u0441\u044C \u0434\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0437\u0430\u043F\u0443\u0441\u043A\u0430: \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0441\u0442\u0430\u0440\u0442"
          );
          result.updated += 1;
          continue;
        }
        let run;
        try {
          run = runs.get(stage.run_id).run;
        } catch {
          this.#applyFailure(mission, stages, stage, `\u0417\u0430\u043F\u0443\u0441\u043A ${stage.run_id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438`);
          result.updated += 1;
          continue;
        }
        if (run.status === "queued" || run.status === "running") continue;
        if (run.status === "succeeded") {
          const report = String(run.result || "").trim() || `\u0417\u0430\u043F\u0443\u0441\u043A ${run.id} \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D \u0443\u0441\u043F\u0435\u0448\u043D\u043E, \u043D\u043E \u0430\u0433\u0435\u043D\u0442 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u043E\u0442\u0447\u0451\u0442`;
          const transition = recordRunReport(mission, stages, stage, report, "mission", this.#clock.now());
          this.#repo.update(transition.mission, transition.stages, transition.event);
          this.#publish(transition.event);
          this.#moveCard(stage.task_id, "done", "mission");
          this.#log.info("\u041E\u0442\u0447\u0451\u0442 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u043F\u0440\u0438\u043C\u0435\u043D\u0451\u043D \u043A \u044D\u0442\u0430\u043F\u0443", {
            mission_id: mission.id,
            stage: stage.key,
            run_id: run.id
          });
        } else {
          const detail = run.error_message || (run.status === "cancelled" ? "\u0417\u0430\u043F\u0443\u0441\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D" : `\u0417\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u043C ${run.status}`);
          const reason = run.error_class ? `${detail} (${run.error_class})` : detail;
          this.#applyFailure(mission, stages, stage, reason, run.status !== "cancelled");
        }
        result.updated += 1;
      }
    }
    return result;
  }
  /**
   * Сверяет выполняющиеся этапы с их карточками: закрытая человеком карточка
   * отправляет этап на проверку с отчётом о ней. Идемпотентно, поэтому
   * вызывается и по событию task.status_changed, и по таймеру.
   */
  reconcileTasks() {
    const execution = this.#execution;
    const result = { checked: 0, updated: 0 };
    if (!execution) return result;
    for (const reference of this.#repo.missionsWithRunningStages()) {
      const mission = this.#repo.get(reference.id);
      if (!mission) continue;
      const stages = this.#repo.stages(mission.id);
      for (const stage of stages.filter((item) => item.status === "running" && item.task_id)) {
        result.checked += 1;
        const card = this.#taskById(stage.task_id);
        if (!card || card.status !== "done") continue;
        const report = `\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \xAB${card.title}\xBB (${card.id}) \u0437\u0430\u043A\u0440\u044B\u0442\u0430 \u2014 \u044D\u0442\u0430\u043F \u0433\u043E\u0442\u043E\u0432 \u043A \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435.`;
        const transition = recordRunReport(
          mission,
          stages,
          stage,
          report,
          "mission",
          this.#clock.now(),
          "task"
        );
        const runId = stage.run_id;
        this.#repo.update(transition.mission, transition.stages, transition.event);
        this.#publish(transition.event);
        if (runId) this.#cancelRun(runId);
        this.#log.info("\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u044D\u0442\u0430\u043F\u0430 \u0437\u0430\u043A\u0440\u044B\u0442\u0430: \u044D\u0442\u0430\u043F \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435", {
          mission_id: mission.id,
          stage: stage.key,
          task_id: card.id,
          run_id: runId
        });
        result.updated += 1;
      }
    }
    return result;
  }
  /** Снимок для каталога инструментов: сколько миссий открыто и что идёт сейчас. */
  overview() {
    const missions = this.#repo.listMissions(200);
    const running = missions.find((mission) => mission.status === "running" || mission.status === "review");
    return {
      total: missions.length,
      open: missions.filter((mission) => mission.status !== "complete").length,
      running: running ? running.title : null,
      paused: missions.filter((mission) => mission.status === "paused").length
    };
  }
  #applyFailure(mission, stages, stage, reason, allowAutoRetry = true) {
    const transition = failStage(mission, stages, stage, reason, "mission", this.#clock.now());
    transition.event.payload = {
      ...transition.event.payload,
      attempt: stage.dispatch_attempt,
      max_attempts: this.#maxAttempts
    };
    this.#repo.update(transition.mission, transition.stages, transition.event);
    this.#publish(transition.event);
    this.#moveCard(stage.task_id, "blocked", "mission", stage.error || reason);
    this.#log.warn("\u042D\u0442\u0430\u043F \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u0441\u0431\u043E\u0435\u043C \u0430\u0433\u0435\u043D\u0442\u0430", {
      mission_id: mission.id,
      stage: stage.key,
      error: stage.error,
      attempt: stage.dispatch_attempt,
      max_attempts: this.#maxAttempts
    });
    if (allowAutoRetry) this.#autoRetry(mission, stages, stage);
  }
  /**
   * Ограниченный автоповтор упавшего этапа: пока попыток меньше лимита,
   * этап снова уходит тому же агенту с той же карточкой. Пауза и
   * отменённый запуск повтор не запускают, исчерпанный лимит оставляет
   * этап в failed для ручного решения.
   */
  #autoRetry(mission, stages, stage) {
    const execution = this.#execution;
    if (!execution?.runs) return false;
    if (mission.status === "paused") return false;
    if (stage.dispatch_attempt >= this.#maxAttempts) return false;
    const available = execution.agents();
    const agent = [stage.agent, mission.agent, execution.defaultAgent].find((id) => Boolean(id && available.includes(id))) ?? available[0];
    if (!agent) return false;
    try {
      let card = stage.task_id ? this.#taskById(stage.task_id) : null;
      const transition = startStage(mission, stages, stage, "mission", this.#clock.now());
      if (!card || card.status === "done") {
        card = execution.tasks.create({
          title: `\u041C\u0438\u0441\u0441\u0438\u044F \xAB${mission.title}\xBB: ${stage.key}. ${stage.title}`.slice(0, 200),
          description: this.#cardDescription(mission, stage, agent),
          type: "work",
          priority: 2,
          created_by: "mission",
          assignee: agent,
          tags: ["mission", mission.id, stage.key]
        });
      }
      this.#moveCard(card.id, "claimed", "mission", "", agent);
      const { run } = execution.runs.create({
        agent,
        task_id: card.id,
        max_attempts: 3,
        idempotency_key: `mission:${mission.id}:${stage.id}:${stage.dispatch_attempt + 1}`
      });
      attachExecution(stage, { task_id: card.id, run_id: run.id, agent });
      if (!mission.agent) mission.agent = agent;
      transition.event.payload = {
        stage: stage.key,
        title: stage.title,
        task_id: card.id,
        run_id: run.id,
        agent,
        auto_retry: true,
        attempt: stage.dispatch_attempt,
        max_attempts: this.#maxAttempts
      };
      this.#save(transition, stage.key);
      this.#log.info("\u042D\u0442\u0430\u043F \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0449\u0435\u043D \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438", {
        mission_id: mission.id,
        stage: stage.key,
        task_id: card.id,
        run_id: run.id,
        attempt: stage.dispatch_attempt,
        max_attempts: this.#maxAttempts
      });
      return true;
    } catch (error) {
      this.#log.warn("\u0410\u0432\u0442\u043E\u043F\u043E\u0432\u0442\u043E\u0440 \u044D\u0442\u0430\u043F\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F", {
        mission_id: mission.id,
        stage: stage.key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  #taskById(taskId) {
    try {
      return this.#execution?.tasks.get(taskId).task ?? null;
    } catch {
      return null;
    }
  }
  #resolveAgent(requested) {
    const execution = this.#execution;
    if (!execution) throw new ConflictError("\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D: \u044D\u0442\u0430\u043F \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0430\u0433\u0435\u043D\u0442\u0443");
    const available = execution.agents();
    if (!available.length) {
      throw new ConflictError("\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u043D\u0435 \u043E\u0431\u044A\u044F\u0432\u0438\u043B \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u0430\u0433\u0435\u043D\u0442\u0430: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0444\u0430\u0439\u043B \u0430\u0433\u0435\u043D\u0442\u043E\u0432");
    }
    if (requested) {
      if (!available.includes(requested)) {
        throw new ConflictError(`\u0410\u0433\u0435\u043D\u0442 \xAB${requested}\xBB \u043D\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D \u0432 \u0444\u0430\u0439\u043B\u0435 \u0430\u0433\u0435\u043D\u0442\u043E\u0432`, {
          agent: requested,
          available
        });
      }
      return requested;
    }
    if (execution.defaultAgent && available.includes(execution.defaultAgent)) return execution.defaultAgent;
    return available[0];
  }
  #cardDescription(mission, stage, agent) {
    const lines = [
      `[mission:${mission.id}:${stage.id}]`,
      `\u041C\u0438\u0441\u0441\u0438\u044F: ${mission.title}`,
      ...mission.goal ? [`\u0426\u0435\u043B\u044C: ${mission.goal}`] : [],
      `\u042D\u0442\u0430\u043F ${stage.key}: ${stage.title}`,
      ...stage.acceptance ? [`\u041F\u0440\u0438\u0451\u043C\u043A\u0430: ${stage.acceptance}`] : [],
      ...stage.depends_on.length ? [`\u0417\u0430\u043A\u0440\u044B\u0442\u044B\u0435 \u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0441\u0442\u0438: ${stage.depends_on.join(", ")}`] : [],
      `\u0410\u0433\u0435\u043D\u0442: ${agent}`,
      "\u041E\u0442\u0447\u0451\u0442: \u0432\u044B\u0432\u043E\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0441\u0442\u0430\u043D\u0435\u0442 \u043E\u0442\u0447\u0451\u0442\u043E\u043C \u044D\u0442\u0430\u043F\u0430 \u0438 \u0443\u0439\u0434\u0451\u0442 \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443."
    ];
    return lines.join("\n").slice(0, 2e4);
  }
  #moveCard(taskId, to, actor, reason = "", assignee) {
    const execution = this.#execution;
    if (!execution || !taskId) return;
    try {
      const card = execution.tasks.get(taskId).task;
      if (card.status === to) return;
      if (to === "claimed" && card.status === "done") return;
      execution.tasks.changeStatus(taskId, {
        to,
        agent: actor,
        reason: to === "blocked" ? reason || "\u0421\u0431\u043E\u0439 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0430\u0433\u0435\u043D\u0442\u0430" : null,
        assignee: to === "claimed" ? assignee : void 0,
        expected: { status: card.status, revision: card.revision, updated_at: card.updated_at }
      });
    } catch (error) {
      this.#log.warn("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u044D\u0442\u0430\u043F\u0430", {
        task_id: taskId,
        to,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  #cancelRun(runId) {
    const runs = this.#execution?.runs ?? null;
    if (!runs) return;
    try {
      runs.cancel(runId, { actor: "human" });
    } catch (error) {
      this.#log.warn("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0443\u0441\u043A \u044D\u0442\u0430\u043F\u0430", {
        run_id: runId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  #load(id) {
    const mission = this.#repo.get(id);
    if (!mission) throw new NotFoundError(`\u041C\u0438\u0441\u0441\u0438\u044F ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    return { mission, stages: this.#repo.stages(id) };
  }
  #detail(id) {
    const { mission, stages } = this.#load(id);
    return {
      mission,
      stages,
      progress: missionProgress(mission, stages),
      events: this.#repo.events(id, 100),
      max_attempts: this.#maxAttempts
    };
  }
  #save(transition, key) {
    this.#repo.update(transition.mission, transition.stages, transition.event);
    this.#publish(transition.event);
    this.#log.info("\u041F\u0435\u0440\u0435\u0445\u043E\u0434 \u044D\u0442\u0430\u043F\u0430", {
      mission_id: transition.mission.id,
      stage: key,
      type: transition.event.type,
      mission_status: transition.mission.status
    });
  }
  #publish(event2) {
    this.#bus.publish({
      type: event2.type,
      entity: { kind: "mission", id: event2.mission_id },
      actor: event2.actor,
      at: event2.created_at,
      data: event2.payload
    });
  }
};

// src/app/mission-runner.ts
var RUN_EVENTS = /* @__PURE__ */ new Set(["run.succeeded", "run.failed", "run.cancelled"]);
var MissionRunner = class {
  #service;
  #bus;
  #log;
  #intervalMs;
  #timer = null;
  #unsubscribe = null;
  constructor(service, bus, log, intervalMs) {
    this.#service = service;
    this.#bus = bus;
    this.#log = log.child({ module: "mission-runner" });
    this.#intervalMs = intervalMs;
  }
  start() {
    if (this.#timer || this.#unsubscribe) return;
    this.#unsubscribe = this.#bus.subscribe((event2) => {
      const runChanged = event2.entity.kind === "run" && RUN_EVENTS.has(event2.type);
      const cardClosed = event2.entity.kind === "task" && event2.type === "task.status_changed" && event2.data.to === "done";
      if (runChanged || cardClosed) this.tick();
    });
    if (this.#intervalMs > 0) {
      this.#timer = setInterval(() => this.tick(), this.#intervalMs);
      this.#timer.unref();
    }
    this.tick();
    this.#log.info("\u0421\u0432\u0435\u0440\u043A\u0430 \u043C\u0438\u0441\u0441\u0438\u0439 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430", { interval_ms: this.#intervalMs });
  }
  stop() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
  tick() {
    try {
      const runs = this.#service.reconcileRuns();
      const tasks = this.#service.reconcileTasks();
      const result = {
        checked: runs.checked + tasks.checked,
        updated: runs.updated + tasks.updated
      };
      if (result.updated > 0) {
        this.#log.info("\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043C\u0438\u0441\u0441\u0438\u0439 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u043F\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u043C \u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u043C", { ...result });
      }
      return result;
    } catch (error) {
      this.#log.warn("\u0421\u0432\u0435\u0440\u043A\u0430 \u043C\u0438\u0441\u0441\u0438\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0430\u0441\u044C \u043E\u0448\u0438\u0431\u043A\u043E\u0439", {
        error: error instanceof Error ? error.stack : String(error)
      });
      return { checked: 0, updated: 0 };
    }
  }
};

// src/adapters/storage/sqlite-missions.ts
var MISSION_COLUMNS = "id, title, goal, status, current_stage_id, revision, summary, agent, created_at, updated_at";
var STAGE_COLUMNS = `id, mission_id, key, position, title, acceptance, depends_on, status,
  result, task_id, run_id, error, agent, dispatch_attempt, started_at, submitted_at, finished_at, revision`;
function toMission(row) {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    status: row.status,
    current_stage_id: row.current_stage_id,
    revision: row.revision,
    summary: row.summary,
    agent: row.agent,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function toStage(row) {
  return {
    id: row.id,
    mission_id: row.mission_id,
    key: row.key,
    position: row.position,
    title: row.title,
    acceptance: row.acceptance,
    depends_on: JSON.parse(row.depends_on),
    status: row.status,
    result: row.result,
    task_id: row.task_id,
    run_id: row.run_id,
    error: row.error,
    agent: row.agent,
    dispatch_attempt: row.dispatch_attempt,
    started_at: row.started_at,
    submitted_at: row.submitted_at,
    finished_at: row.finished_at,
    revision: row.revision
  };
}
function toEvent(row) {
  return {
    mission_id: row.mission_id,
    type: row.type,
    actor: row.actor,
    payload: JSON.parse(row.payload),
    created_at: row.created_at
  };
}
var SqliteMissionRepository = class {
  #db;
  constructor(db) {
    this.#db = db;
  }
  insert(mission, stages, event2) {
    this.#db.transaction(() => {
      this.#db.raw.prepare(`INSERT INTO missions (${MISSION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        mission.id,
        mission.title,
        mission.goal,
        mission.status,
        mission.current_stage_id,
        mission.revision,
        mission.summary,
        mission.agent,
        mission.created_at,
        mission.updated_at
      );
      for (const stage of stages) this.#insertStage(stage);
      this.#appendEvent(event2);
    });
  }
  get(id) {
    const row = this.#db.raw.prepare(`SELECT ${MISSION_COLUMNS} FROM missions WHERE id = ?`).get(id);
    return row ? toMission(row) : null;
  }
  listMissions(limit) {
    const rows = this.#db.raw.prepare(`SELECT ${MISSION_COLUMNS} FROM missions ORDER BY updated_at DESC, id DESC LIMIT ?`).all(Math.min(Math.max(limit, 1), 200));
    return rows.map(toMission);
  }
  missionsWithRunningStages() {
    const rows = this.#db.raw.prepare(`SELECT DISTINCT ${MISSION_COLUMNS.split(", ").map((column) => `m.${column}`).join(", ")}
        FROM missions m JOIN mission_stages s ON s.mission_id = m.id
        WHERE s.status = 'running'
        ORDER BY m.updated_at DESC`).all();
    return rows.map(toMission);
  }
  stages(missionId) {
    const rows = this.#db.raw.prepare(`SELECT ${STAGE_COLUMNS} FROM mission_stages WHERE mission_id = ? ORDER BY position`).all(missionId);
    return rows.map(toStage);
  }
  update(mission, stages, event2) {
    this.#db.transaction(() => {
      this.#db.raw.prepare(`UPDATE missions SET status = ?, current_stage_id = ?, revision = ?, summary = ?,
            agent = ?, updated_at = ?
          WHERE id = ?`).run(
        mission.status,
        mission.current_stage_id,
        mission.revision,
        mission.summary,
        mission.agent,
        mission.updated_at,
        mission.id
      );
      for (const stage of stages) {
        const result = this.#db.raw.prepare(`UPDATE mission_stages SET title = ?, acceptance = ?, depends_on = ?, status = ?,
              result = ?, task_id = ?, run_id = ?, error = ?, agent = ?, dispatch_attempt = ?,
              started_at = ?, submitted_at = ?, finished_at = ?, revision = ?
            WHERE id = ? AND mission_id = ?`).run(
          stage.title,
          stage.acceptance,
          JSON.stringify(stage.depends_on),
          stage.status,
          stage.result,
          stage.task_id,
          stage.run_id,
          stage.error,
          stage.agent,
          stage.dispatch_attempt,
          stage.started_at,
          stage.submitted_at,
          stage.finished_at,
          stage.revision,
          stage.id,
          mission.id
        );
        if (Number(result.changes) === 0) this.#insertStage(stage);
      }
      this.#appendEvent(event2);
    });
  }
  events(missionId, limit) {
    const rows = this.#db.raw.prepare(`SELECT mission_id, type, actor, payload, created_at FROM mission_events
        WHERE mission_id = ? ORDER BY seq DESC LIMIT ?`).all(missionId, Math.min(Math.max(limit, 1), 200));
    return rows.reverse().map(toEvent);
  }
  #insertStage(stage) {
    this.#db.raw.prepare(`INSERT INTO mission_stages (${STAGE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      stage.id,
      stage.mission_id,
      stage.key,
      stage.position,
      stage.title,
      stage.acceptance,
      JSON.stringify(stage.depends_on),
      stage.status,
      stage.result,
      stage.task_id,
      stage.run_id,
      stage.error,
      stage.agent,
      stage.dispatch_attempt,
      stage.started_at,
      stage.submitted_at,
      stage.finished_at,
      stage.revision
    );
  }
  #appendEvent(event2) {
    this.#db.raw.prepare("INSERT INTO mission_events (mission_id, type, actor, payload, created_at) VALUES (?, ?, ?, ?, ?)").run(event2.mission_id, event2.type, event2.actor, JSON.stringify(event2.payload), event2.created_at);
  }
};

// src/modules/missions/schema.ts
var missionsMigrations = [
  {
    version: "missions/0001_missions_stages",
    sql: `
      CREATE TABLE missions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        goal TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        current_stage_id TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX missions_status_updated ON missions (status, updated_at);

      CREATE TABLE mission_stages (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        position INTEGER NOT NULL,
        title TEXT NOT NULL,
        acceptance TEXT NOT NULL DEFAULT '',
        depends_on TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL,
        result TEXT,
        started_at TEXT,
        submitted_at TEXT,
        finished_at TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        UNIQUE (mission_id, key)
      );
      CREATE INDEX mission_stages_mission ON mission_stages (mission_id, position);

      CREATE TABLE mission_events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_id TEXT NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX mission_events_mission ON mission_events (mission_id, seq);
    `
  },
  {
    version: "missions/0002_dispatch",
    sql: `
      ALTER TABLE missions ADD COLUMN agent TEXT;
      ALTER TABLE mission_stages ADD COLUMN task_id TEXT;
      ALTER TABLE mission_stages ADD COLUMN run_id TEXT;
      ALTER TABLE mission_stages ADD COLUMN error TEXT;
      ALTER TABLE mission_stages ADD COLUMN agent TEXT;
      ALTER TABLE mission_stages ADD COLUMN dispatch_attempt INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX mission_stages_run ON mission_stages (run_id);
      CREATE INDEX mission_stages_task ON mission_stages (task_id);
    `
  }
];

// src/modules/missions/missions.module.ts
function registerMissionsRoutes(router, deps) {
  const missions = deps.missions;
  router.add("POST", "/api/missions", (c) => ({
    status: 201,
    body: { ok: true, ...missions.create(c.body) }
  }));
  router.add("GET", "/api/missions", (c) => ({
    body: {
      ok: true,
      ...missions.list(Object.fromEntries(c.query.entries()))
    }
  }));
  router.add("GET", "/api/missions/:id", (c) => ({
    body: { ok: true, ...missions.get(c.params.id ?? "") }
  }));
  router.add("GET", "/api/missions/:id/events", (c) => ({
    body: {
      ok: true,
      mission_id: c.params.id ?? "",
      events: missions.get(c.params.id ?? "").events
    }
  }));
  router.add("POST", "/api/missions/:id/stages", (c) => ({
    status: 201,
    body: { ok: true, ...missions.addStage(c.params.id ?? "", c.body) }
  }));
  router.add("POST", "/api/missions/:id/stages/:stage/start", (c) => ({
    body: { ok: true, ...missions.start(c.params.id ?? "", c.params.stage ?? "", c.body) }
  }));
  router.add("POST", "/api/missions/:id/stages/:stage/submit", (c) => ({
    body: { ok: true, ...missions.submit(c.params.id ?? "", c.params.stage ?? "", c.body) }
  }));
  router.add("POST", "/api/missions/:id/stages/:stage/accept", (c) => ({
    body: { ok: true, ...missions.accept(c.params.id ?? "", c.params.stage ?? "", c.body) }
  }));
  router.add("POST", "/api/missions/:id/stages/:stage/reject", (c) => ({
    body: { ok: true, ...missions.reject(c.params.id ?? "", c.params.stage ?? "", c.body) }
  }));
  router.add("POST", "/api/missions/:id/pause", (c) => ({
    body: { ok: true, ...missions.pause(c.params.id ?? "", c.body) }
  }));
  router.add("POST", "/api/missions/:id/resume", (c) => ({
    body: { ok: true, ...missions.resume(c.params.id ?? "", c.body) }
  }));
  router.add("POST", "/api/missions/:id/complete", (c) => ({
    body: { ok: true, ...missions.complete(c.params.id ?? "", c.body) }
  }));
}

// modules/missions/page.ts
var PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>\u041C\u0438\u0441\u0441\u0438\u0438 \u2014 \u043C\u043E\u0434\u0443\u043B\u044C</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #0f1216; color: #e6e9ef; }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid #232833; }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: #8fb4ff; font-size: 13px; }
  main { display: grid; gap: 20px; grid-template-columns: minmax(280px, 340px) 1fr; padding: 24px; align-items: start; }
  @media (max-width: 860px) { main { grid-template-columns: 1fr; } }
  section { background: #151a21; border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: #aab4c5; font-weight: 600; }
  label { display: grid; gap: 4px; font-size: 13px; color: #aab4c5; margin-bottom: 10px; }
  input, textarea, button { font: inherit; }
  input, textarea { background: #0f1216; color: inherit; border: 1px solid #2b3240; border-radius: 8px; padding: 8px 10px; }
  textarea { min-height: 70px; resize: vertical; }
  button { background: #2d5bff; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  li { border: 1px solid #232833; border-radius: 10px; padding: 12px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .title { font-weight: 600; }
  .meta { color: #7f8a9c; font-size: 12px; }
  .status { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: #222a36; }
  .status-active { background: #24304a; color: #a8c5ff; }
  .status-done { background: #1d3a2a; color: #8be0ab; }
  .status-failed { background: #3a2426; color: #ff9a9a; }
  .error { color: #ff9a9a; font-size: 13px; min-height: 18px; }
  .empty { color: #7f8a9c; }
</style>
</head>
<body>
<header>
  <h1>\u041C\u0438\u0441\u0441\u0438\u0438</h1>
  <a href="/">\u2190 \u043A \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0435</a>
</header>
<main>
  <section>
    <h2>\u041D\u043E\u0432\u0430\u044F \u043C\u0438\u0441\u0441\u0438\u044F</h2>
    <form id="create">
      <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435<input name="title" maxlength="200" required></label>
      <label>\u0426\u0435\u043B\u044C<textarea name="goal" maxlength="4000"></textarea></label>
      <label>\u042D\u0442\u0430\u043F\u044B (\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435)<textarea name="stages" placeholder="\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435&#10;\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442"></textarea></label>
      <button type="submit">\u0421\u043E\u0437\u0434\u0430\u0442\u044C</button>
      <p class="error" id="create-error"></p>
    </form>
  </section>
  <section>
    <h2>\u0421\u043F\u0438\u0441\u043E\u043A</h2>
    <ul id="list"><li class="empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026</li></ul>
  </section>
</main>
<script>
(function () {
  var list = document.getElementById('list');
  var error = document.getElementById('create-error');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function request(path, options) {
    return fetch(path, options).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error((body.error && body.error.message) || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430');
        return body;
      });
    });
  }

  function load() {
    return request('/api/missions?limit=50').then(function (body) {
      list.textContent = '';
      var items = body.items || [];
      if (!items.length) {
        list.appendChild(el('li', 'empty', '\u041C\u0438\u0441\u0441\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442'));
        return;
      }
      items.forEach(function (mission) {
        var row = el('li');
        var head = el('div', 'row');
        head.appendChild(el('span', 'title', mission.title));
        head.appendChild(el('span', 'status status-' + mission.status, mission.status));
        row.appendChild(head);
        if (mission.goal) row.appendChild(el('div', 'meta', mission.goal));
        row.appendChild(el('div', 'meta', '\u044D\u0442\u0430\u043F\u043E\u0432: ' + (mission.total ?? 0) + ' \xB7 \u0433\u043E\u0442\u043E\u0432\u043E: ' + (mission.done ?? 0) + ' \xB7 ' + (mission.percent ?? 0) + '%'));
        list.appendChild(row);
      });
    }).catch(function (failure) {
      list.textContent = '';
      list.appendChild(el('li', 'empty', failure.message));
    });
  }

  document.getElementById('create').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    var data = new FormData(form);
    var stages = String(data.get('stages') || '').split('\\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (title) { return { title: title }; });
    error.textContent = '';
    request('/api/missions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: data.get('title'),
        goal: data.get('goal') || '',
        stages: stages
      })
    }).then(function () {
      form.reset();
      return load();
    }).catch(function (failure) {
      error.textContent = failure.message;
    });
  });

  load();
})();
</script>
</body>
</html>
`;

// modules/missions/index.ts
var module = {
  id: "missions",
  apiVersion: 1,
  migrations: missionsMigrations,
  register(ctx) {
    const { tasks } = ctx.require("tasks");
    const runs = ctx.require("runs");
    const missions = new MissionService(new SqliteMissionRepository(ctx.storage), ctx.bus, systemClock, ctx.log, {
      // Карточки доступны всегда: этап живёт и без исполнителя. Запускать
      // агента можно только при включённом исполнителе.
      execution: {
        tasks,
        runs: runs.executor ? runs.runs : null,
        agents: () => runs.executor?.list().map((agent) => agent.id) ?? [],
        defaultAgent: ctx.settings.mission.agent
      },
      maxAttempts: ctx.settings.mission.maxAttempts
    });
    ctx.publish({ missions });
    registerMissionsRoutes(ctx.api, { missions });
    ctx.router.add("GET", "/", () => ({
      raw: PAGE,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    }));
    const runner = new MissionRunner(missions, ctx.bus, ctx.log, ctx.settings.mission.reconcileIntervalMs);
    runner.start();
    ctx.onShutdown(() => runner.stop());
  }
};
var index_default = module;
export {
  index_default as default
};
