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

// team-host-api:src/kernel/clock.ts
var host2 = globalThis["__teamPlatformHostApi"] ?? {};
var fixedClock = host2["fixedClock"];
var nextTimestamp = host2["nextTimestamp"];
var systemClock = host2["systemClock"];

// team-host-api:src/kernel/ids.ts
var host3 = globalThis["__teamPlatformHostApi"] ?? {};
var newId = host3["newId"];

// team-host-api:src/kernel/validate.ts
var host4 = globalThis["__teamPlatformHostApi"] ?? {};
var integer = host4["integer"];
var oneOf = host4["oneOf"];
var optionalInteger = host4["optionalInteger"];
var optionalName = host4["optionalName"];
var record = host4["record"];
var requiredOneOf = host4["requiredOneOf"];
var text = host4["text"];

// modules/missions/mission.ts
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
function normalizeArtifactPath(raw, label) {
  const value = text(raw, label, 500, true).replaceAll("\\", "/");
  if (value.startsWith("/") || value.startsWith("//") || /^[a-zA-Z]:/.test(value)) {
    throw new ValidationError(`${label}: \u043F\u0443\u0442\u044C \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C`);
  }
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new ValidationError(`${label}: \u043F\u0443\u0442\u044C \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u0445 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u043E\u0432, \xAB.\xBB \u0438\u043B\u0438 \xAB..\xBB`);
  }
  return value;
}
function artifactPaths(raw, label) {
  if (raw === void 0 || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError(`${label}: artifacts \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u043F\u0443\u0442\u0435\u0439`);
  if (raw.length > 20) throw new ValidationError(`${label}: \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 20 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432 \u043D\u0430 \u044D\u0442\u0430\u043F`);
  const result = [];
  for (const item of raw) {
    const value = normalizeArtifactPath(item, `${label}.artifacts`);
    if (!result.includes(value)) result.push(value);
  }
  return result;
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
      artifacts: artifactPaths(draft.artifacts, label),
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
    artifacts: artifactPaths(input.artifacts, "\u042D\u0442\u0430\u043F"),
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
    artifacts: draft.artifacts,
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
function assertStageStartable(mission, stages, stage) {
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
}
function startStage(mission, stages, stage, actor, now, execution) {
  assertStageStartable(mission, stages, stage);
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
function cancelStage(mission, stages, stage, reason, actor, now) {
  if (stage.status !== "running") {
    throw new ConflictError(`\u041E\u0442\u043C\u0435\u043D\u0430 \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0449\u0435\u043C\u0443\u0441\u044F \u044D\u0442\u0430\u043F\u0443; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
  const at = now.toISOString();
  stage.status = "cancelled";
  stage.error = reason.trim().slice(0, 2e3) || "\u0417\u0430\u043F\u0443\u0441\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D";
  stage.finished_at = at;
  stage.revision += 1;
  mission.current_stage_id = null;
  if (mission.status !== "paused") mission.status = "ready";
  mission.revision += 1;
  mission.updated_at = nextTimestamp(mission.updated_at, now);
  return {
    mission,
    stages,
    event: event(mission.id, "mission.stage.cancelled", actor, {
      stage: stage.key,
      run_id: stage.run_id,
      task_id: stage.task_id,
      reason: stage.error
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
function assertStageReview(stage) {
  if (stage.status !== "review") {
    throw new ConflictError(`\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u0430\u043F \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
}
function assertAcceptable(mission, stage) {
  assertNotPaused(mission);
  assertStageReview(stage);
}
function acceptStage(mission, stages, stage, actor, now) {
  assertOpen(mission);
  assertAcceptable(mission, stage);
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
function assertStageReviewable(stage) {
  if (stage.status !== "review") {
    throw new ConflictError(`\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u0430\u043F \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
      status: stage.status
    });
  }
}
function assertRejectable(mission, stage) {
  assertNotPaused(mission);
  assertStageReviewable(stage);
}
function rejectStage(mission, stages, stage, reason, actor, now) {
  assertOpen(mission);
  assertRejectable(mission, stage);
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
    artifacts: draft.artifacts,
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

// modules/missions/gate.ts
import { createHash } from "node:crypto";
function normalizeGateDecision(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u0432\u043E\u0440\u043E\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442");
  }
  const input = raw;
  const decision = input.decision;
  if (decision !== "approved" && decision !== "rework") {
    throw new ValidationError("\u041F\u043E\u043B\u0435 \xABdecision\xBB: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E approved \u0438\u043B\u0438 rework");
  }
  const actor = text(input.actor, "actor", 100, true);
  const reason = text(input.reason, "reason", 2e3);
  if (decision === "rework" && !reason) {
    throw new ValidationError("\u0414\u043B\u044F \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u043D\u0443\u0436\u043D\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0440\u0435\u0448\u0435\u043D\u0438\u044F");
  }
  return { decision, actor, reason };
}
var DIFF_LIST_LIMIT = 200;
var DIFF_CELL_LIMIT = 25e4;
function gateDigest(result) {
  return createHash("sha256").update(result, "utf8").digest("hex");
}
function diffGateRounds(baseline, current) {
  const before = baseline.result.split("\n");
  const after = current.result.split("\n");
  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) head += 1;
  let tail = 0;
  while (tail < before.length - head && tail < after.length - head && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail += 1;
  const beforeMiddle = before.slice(head, before.length - tail);
  const afterMiddle = after.slice(head, after.length - tail);
  const removed = [];
  const added = [];
  let removedLines = 0;
  let addedLines = 0;
  let unchanged = head + tail;
  let truncated = false;
  const remember = (list, line) => {
    if (list.length < DIFF_LIST_LIMIT) list.push(line);
    else truncated = true;
  };
  const remove = (line) => {
    removedLines += 1;
    remember(removed, line);
  };
  const add = (line) => {
    addedLines += 1;
    remember(added, line);
  };
  if (beforeMiddle.length * afterMiddle.length > DIFF_CELL_LIMIT) {
    truncated = true;
    for (const line of beforeMiddle) remove(line);
    for (const line of afterMiddle) add(line);
  } else {
    const width = afterMiddle.length + 1;
    const table = new Uint32Array((beforeMiddle.length + 1) * width);
    for (let i2 = beforeMiddle.length - 1; i2 >= 0; i2 -= 1) {
      for (let j2 = afterMiddle.length - 1; j2 >= 0; j2 -= 1) {
        table[i2 * width + j2] = beforeMiddle[i2] === afterMiddle[j2] ? (table[(i2 + 1) * width + j2 + 1] ?? 0) + 1 : Math.max(table[(i2 + 1) * width + j2] ?? 0, table[i2 * width + j2 + 1] ?? 0);
      }
    }
    let i = 0;
    let j = 0;
    while (i < beforeMiddle.length && j < afterMiddle.length) {
      if (beforeMiddle[i] === afterMiddle[j]) {
        unchanged += 1;
        i += 1;
        j += 1;
      } else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) {
        remove(beforeMiddle[i]);
        i += 1;
      } else {
        add(afterMiddle[j]);
        j += 1;
      }
    }
    while (i < beforeMiddle.length) {
      remove(beforeMiddle[i]);
      i += 1;
    }
    while (j < afterMiddle.length) {
      add(afterMiddle[j]);
      j += 1;
    }
  }
  return {
    baseline_gate_id: baseline.id,
    baseline_round: baseline.round,
    baseline_sha256: gateDigest(baseline.result),
    result_sha256: gateDigest(current.result),
    added,
    removed,
    added_lines: addedLines,
    removed_lines: removedLines,
    unchanged_lines: unchanged,
    identical: baseline.result === current.result,
    truncated
  };
}

// modules/missions/service.ts
import { join as join2, resolve as resolve3 } from "node:path";

// modules/missions/artifact-store.ts
import { createHash as createHash3 } from "node:crypto";
import {
  existsSync as existsSync2,
  lstatSync as lstatSync2,
  mkdirSync,
  readFileSync as readFileSync2,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute as isAbsolute2, join, relative as relative2, resolve as resolve2, sep } from "node:path";

// modules/missions/artifact-receipts.ts
import { createHash as createHash2 } from "node:crypto";
import { accessSync, constants, existsSync, lstatSync, readFileSync, realpathSync, statSync, unlinkSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

// modules/missions/receipt-ttl.ts
var DEFAULT_RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function receiptExpiresAt(receipt, ttlMs = DEFAULT_RECEIPT_TTL_MS) {
  const created = Date.parse(receipt.created_at);
  if (!Number.isFinite(created)) return null;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return null;
  return new Date(created + ttlMs).toISOString();
}
function receiptState(receipt, now, ttlMs = DEFAULT_RECEIPT_TTL_MS) {
  const expires = receiptExpiresAt(receipt, ttlMs);
  if (!expires) return "unknown";
  return now.getTime() >= Date.parse(expires) ? "expired" : "fresh";
}

// modules/missions/artifact-receipts.ts
var MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
function normalizeWorkspaceRoot(raw) {
  const value = raw.trim();
  if (!value) throw new ValidationError("\u041F\u0443\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0435\u0439 \u043F\u0430\u043F\u043A\u0438 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C");
  if (value.length > 1e3) throw new ValidationError("\u041F\u0443\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0435\u0439 \u043F\u0430\u043F\u043A\u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439");
  if (!isAbsolute(value)) throw new ValidationError("\u041F\u0443\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0435\u0439 \u043F\u0430\u043F\u043A\u0438 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C");
  let stats;
  try {
    stats = statSync(value);
  } catch {
    throw new ValidationError(`\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \xAB${value}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
  }
  if (!stats.isDirectory()) throw new ValidationError(`\u041F\u0443\u0442\u044C \xAB${value}\xBB \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u0430\u043F\u043A\u043E\u0439`);
  try {
    accessSync(value, constants.R_OK | constants.X_OK);
  } catch {
    throw new ValidationError(`\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \xAB${value}\xBB \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F`);
  }
  return realpathSync.native(value);
}
function fingerprintArtifact(root, rawPath) {
  const path = normalizeArtifactPath(rawPath, "path");
  const base = realpathSync(resolve(root));
  const target = resolve(base, path);
  const rel = relative(base, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new ValidationError("\u041F\u0443\u0442\u044C \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B workspace");
  }
  let stats;
  try {
    stats = lstatSync(target);
  } catch {
    throw new NotFoundError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
  }
  if (stats.isSymbolicLink()) {
    throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u0438\u043C\u043B\u0438\u043D\u043A\u043E\u043C`);
  }
  if (!stats.isFile()) {
    throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u043C`);
  }
  if (stats.size > MAX_ARTIFACT_BYTES) {
    throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_ARTIFACT_BYTES} \u0431\u0430\u0439\u0442`);
  }
  const bytes = readFileSync(target);
  return {
    sha256: createHash2("sha256").update(bytes).digest("hex"),
    size: bytes.byteLength
  };
}
function assertReceiptMatches(root, path, receipt, options = {}) {
  if (!receipt) {
    throw new ConflictError(`\u041D\u0435\u0442 \u043A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u0438 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \xAB${path}\xBB: \u043F\u0440\u0438\u0451\u043C\u043A\u0430 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430`, {
      artifact: path,
      reason: "missing_receipt"
    });
  }
  if (receipt.created_at) {
    const now = options.now ?? /* @__PURE__ */ new Date();
    if (receiptState(receipt, now, options.ttlMs) === "expired") {
      throw new ConflictError(`\u041A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u044F \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \xAB${path}\xBB \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u0430: \u043D\u0443\u0436\u0435\u043D \u043D\u043E\u0432\u044B\u0439 \u0441\u043D\u0438\u043C\u043E\u043A \u0444\u0430\u0439\u043B\u0430`, {
        artifact: path,
        reason: "expired_receipt",
        created_at: receipt.created_at,
        expires_at: receiptExpiresAt(receipt, options.ttlMs),
        checked_at: now.toISOString()
      });
    }
  }
  let current;
  try {
    current = fingerprintArtifact(root, path);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new ConflictError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u0438\u0441\u0447\u0435\u0437 \u043F\u043E\u0441\u043B\u0435 \u043A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u0438`, {
        artifact: path,
        reason: "missing_artifact"
      });
    }
    throw error;
  }
  if (current.sha256 !== receipt.sha256 || current.size !== receipt.size) {
    throw new ConflictError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u0438`, {
      artifact: path,
      reason: "changed_after_receipt",
      expected: { sha256: receipt.sha256, size: receipt.size },
      actual: current
    });
  }
}
function targetInsideRoot(root, path) {
  const normalized = normalizeArtifactPath(path, "path");
  const base = realpathSync(resolve(root));
  const target = resolve(base, normalized);
  const rel = relative(base, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new ValidationError("\u041F\u0443\u0442\u044C \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B workspace");
  }
  return target;
}
function sweepExpiredArtifacts(root, receipts, options = {}) {
  const now = options.now ?? /* @__PURE__ */ new Date();
  const latest = /* @__PURE__ */ new Map();
  for (const receipt of receipts) latest.set(receipt.path, receipt);
  const result = {
    removed: [],
    already_gone: [],
    kept: 0,
    expired: 0,
    failed: []
  };
  for (const [path, receipt] of latest) {
    const state = receipt.created_at ? receiptState(receipt, now, options.ttlMs) : "unknown";
    if (state !== "expired") {
      result.kept += 1;
      continue;
    }
    result.expired += 1;
    let target;
    try {
      target = targetInsideRoot(root, path);
    } catch (error) {
      result.failed.push({ path, message: error instanceof Error ? error.message : String(error) });
      continue;
    }
    if (!existsSync(target)) {
      result.already_gone.push(path);
      continue;
    }
    if (options.dryRun) {
      result.removed.push(path);
      continue;
    }
    try {
      unlinkSync(target);
      result.removed.push(path);
    } catch (error) {
      result.failed.push({ path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

// modules/missions/artifact-store.ts
var SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
function segment(raw, label) {
  if (typeof raw !== "string" || !SEGMENT.test(raw)) {
    throw new ValidationError(`${label}: \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B, \xAB.\xBB, \xAB_\xBB \u0438 \xAB-\xBB`, { value: raw });
  }
  return raw;
}
function attemptNumber(raw) {
  if (!Number.isInteger(raw) || raw < 1 || raw > 1e6) {
    throw new ValidationError("attempt: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 1 \u0434\u043E 1000000", { value: raw });
  }
  return raw;
}
function artifactObjectKey(stage, attempt, name) {
  return `${segment(stage, "stage")}/${attemptNumber(attempt)}/${normalizeArtifactPath(name, "name")}`;
}
function parseArtifactObjectKey(objectKey) {
  if (typeof objectKey !== "string" || !objectKey) {
    throw new ValidationError("object_key: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u043D\u0435\u043F\u0443\u0441\u0442\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430");
  }
  const parts = objectKey.split("/");
  if (parts.length < 3) {
    throw new ValidationError("object_key: \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \xAB\u044D\u0442\u0430\u043F/\u043F\u043E\u043F\u044B\u0442\u043A\u0430/\u0438\u043C\u044F\xBB", { object_key: objectKey });
  }
  const stage = parts[0];
  const attempt = Number(parts[1]);
  const name = normalizeArtifactPath(parts.slice(2).join("/"), "name");
  return { stage: segment(stage, "stage"), attempt: attemptNumber(attempt), name };
}
function safePath(base, key) {
  const target = resolve2(base, key);
  const rel = relative2(base, target);
  if (!rel || rel.startsWith("..") || isAbsolute2(rel)) {
    throw new ValidationError("\u041F\u0443\u0442\u044C \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430");
  }
  return target;
}
function isEexist(error) {
  return typeof error === "object" && error !== null && error.code === "EEXIST";
}
var ImmutableArtifactStore = class {
  #root;
  #now;
  constructor(options) {
    const root = options.root?.trim();
    if (!root || !isAbsolute2(root)) {
      throw new ValidationError("\u041A\u043E\u0440\u0435\u043D\u044C \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u044B\u043C \u043F\u0443\u0442\u0451\u043C");
    }
    this.#root = resolve2(root);
    this.#now = options.now ?? (() => /* @__PURE__ */ new Date());
  }
  get root() {
    return this.#root;
  }
  /**
   * Записать новый объект. Существующий объект или метаданные — конфликт:
   * байты не перезаписываются даже теми же самыми. Новый attempt получает
   * новый ключ и не трогает старый.
   */
  publish(input) {
    const missionId = segment(input.mission_id, "mission_id");
    const stage = segment(input.stage, "stage");
    const attempt = attemptNumber(input.attempt);
    const name = normalizeArtifactPath(input.name, "name");
    const key = artifactObjectKey(stage, attempt, name);
    const source = resolve2(input.source_path);
    let stats;
    try {
      stats = lstatSync2(source);
    } catch {
      throw new NotFoundError(`\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${name}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    }
    if (stats.isSymbolicLink()) {
      throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${name}\xBB \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u0438\u043C\u043B\u0438\u043D\u043A\u043E\u043C`);
    }
    if (!stats.isFile()) {
      throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${name}\xBB \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u043C`);
    }
    if (stats.size > MAX_ARTIFACT_BYTES) {
      throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${name}\xBB \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_ARTIFACT_BYTES} \u0431\u0430\u0439\u0442`);
    }
    const bytes = readFileSync2(source);
    const sha256 = createHash3("sha256").update(bytes).digest("hex");
    if (input.expected_sha256 && input.expected_sha256 !== sha256) {
      throw new ConflictError("\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438: \u0437\u0430\u043F\u0438\u0441\u0430\u043D \u043D\u0435 \u0442\u043E\u0442 \u0444\u0430\u0439\u043B", {
        reason: "artifact_changed_during_publish",
        name,
        expected_sha256: input.expected_sha256,
        actual_sha256: sha256
      });
    }
    if (input.expected_size !== void 0 && input.expected_size !== bytes.byteLength) {
      throw new ConflictError("\u0420\u0430\u0437\u043C\u0435\u0440 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438", {
        reason: "artifact_changed_during_publish",
        name,
        expected_size: input.expected_size,
        actual_size: bytes.byteLength
      });
    }
    const target = this.#objectPath(missionId, key);
    const metaTarget = this.#metadataPath(missionId, key);
    if (existsSync2(target) || existsSync2(metaTarget)) {
      throw this.#alreadyPublished(missionId, key);
    }
    mkdirSync(dirname(target), { recursive: true });
    mkdirSync(dirname(metaTarget), { recursive: true });
    try {
      writeFileSync(target, bytes, { flag: "wx" });
    } catch (error) {
      if (isEexist(error)) throw this.#alreadyPublished(missionId, key);
      throw error;
    }
    const metadata = {
      artifact_id: newId("art"),
      mission_id: missionId,
      stage,
      attempt,
      name,
      object_key: key,
      sha256,
      size: bytes.byteLength,
      source_path: name,
      created_at: this.#now().toISOString()
    };
    try {
      writeFileSync(metaTarget, `${JSON.stringify(metadata, null, 2)}
`, { flag: "wx" });
    } catch (error) {
      rmSync(target, { force: true });
      if (isEexist(error)) throw this.#alreadyPublished(missionId, key);
      throw error;
    }
    return metadata;
  }
  /** Метаданные опубликованного объекта; ключ сверяется с содержимым sidecar. */
  metadata(missionId, objectKey) {
    const mission = segment(missionId, "mission_id");
    const key = this.#normalizeKey(objectKey);
    const path = this.#metadataPath(mission, key);
    let raw;
    try {
      raw = readFileSync2(path, "utf8");
    } catch {
      throw new NotFoundError(`\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \xAB${key}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B`);
    }
    let metadata;
    try {
      metadata = JSON.parse(raw);
    } catch {
      throw new ConflictError(`\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \xAB${key}\xBB \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B`, {
        reason: "artifact_metadata_corrupt",
        object_key: key
      });
    }
    if (metadata.object_key !== key || metadata.sha256.length !== 64) {
      throw new ConflictError(`\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \xAB${key}\xBB \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442 \u0441 \u043A\u043B\u044E\u0447\u043E\u043C`, {
        reason: "artifact_metadata_corrupt",
        object_key: key
      });
    }
    return metadata;
  }
  /** Все опубликованные объекты в хранилище: источник для retention/GC. */
  list() {
    if (!existsSync2(this.#root)) return [];
    const items = [];
    for (const mission of readdirSync(this.#root, { withFileTypes: true })) {
      if (!mission.isDirectory() || !SEGMENT.test(mission.name)) continue;
      const metadataRoot = join(this.#root, mission.name, "metadata");
      if (!existsSync2(metadataRoot)) continue;
      for (const file of this.#files(metadataRoot)) {
        if (!file.endsWith(".json")) continue;
        const key = relative2(metadataRoot, file).split(sep).join("/").slice(0, -".json".length);
        try {
          items.push(this.metadata(mission.name, key));
        } catch {
        }
      }
    }
    return items.sort((left, right) => left.mission_id.localeCompare(right.mission_id) || left.object_key.localeCompare(right.object_key));
  }
  /**
   * Удалить объект и его sidecar. Путь вычисляется только внутри root; объект
   * вне хранилища или с невалидным ключом удалить нельзя.
   */
  remove(missionId, objectKey) {
    const mission = segment(missionId, "mission_id");
    const key = this.#normalizeKey(objectKey);
    const target = this.#objectPath(mission, key);
    const metadataTarget = this.#metadataPath(mission, key);
    if (!existsSync2(target) && !existsSync2(metadataTarget)) {
      throw new NotFoundError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${key}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    }
    rmSync(target, { force: true });
    rmSync(metadataTarget, { force: true });
  }
  /** Прочитать байты и проверить их по метаданным: подмена не проходит молча. */
  read(missionId, objectKey) {
    const mission = segment(missionId, "mission_id");
    const key = this.#normalizeKey(objectKey);
    const metadata = this.metadata(mission, key);
    const path = this.#objectPath(mission, key);
    let bytes;
    try {
      bytes = readFileSync2(path);
    } catch {
      throw new NotFoundError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${key}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    }
    const sha256 = createHash3("sha256").update(bytes).digest("hex");
    if (sha256 !== metadata.sha256 || bytes.byteLength !== metadata.size) {
      throw new ConflictError(`\u0411\u0430\u0439\u0442\u044B \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \xAB${key}\xBB \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442 \u0441 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u043C\u0438`, {
        reason: "artifact_corrupt",
        object_key: key,
        expected: { sha256: metadata.sha256, size: metadata.size },
        actual: { sha256, size: bytes.byteLength }
      });
    }
    return bytes;
  }
  #files(root) {
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile()) files.push(path);
      }
    };
    walk(root);
    return files;
  }
  #normalizeKey(raw) {
    const parsed = parseArtifactObjectKey(raw);
    return artifactObjectKey(parsed.stage, parsed.attempt, parsed.name);
  }
  #objectPath(missionId, key) {
    const base = safePath(this.#root, missionId);
    return safePath(resolve2(base, "objects"), key);
  }
  #metadataPath(missionId, key) {
    const base = safePath(this.#root, missionId);
    return safePath(resolve2(base, "metadata"), `${key}.json`);
  }
  #alreadyPublished(missionId, key) {
    return new ConflictError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${key}\xBB \u0443\u0436\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D: \u0431\u0430\u0439\u0442\u044B \u043D\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E\u0442\u0441\u044F`, {
      reason: "artifact_already_published",
      mission_id: missionId,
      object_key: key,
      stage: key.split("/")[0],
      attempt: Number(key.split("/")[1])
    });
  }
};

// modules/missions/service.ts
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
function gateActor(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError("\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u0432\u043E\u0440\u043E\u0442 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0430\u0432\u0442\u043E\u0440\u0430");
  }
  const value = raw.actor;
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u0432\u043E\u0440\u043E\u0442 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0430\u0432\u0442\u043E\u0440\u0430");
  }
  return value.trim().slice(0, 100);
}
function withGateDiffs(gates) {
  const byId = new Map(gates.map((gate) => [gate.id, gate]));
  return gates.map((gate) => {
    const baseline = gate.previous_gate_id ? byId.get(gate.previous_gate_id) ?? null : null;
    return { ...gate, diff: baseline ? diffGateRounds(baseline, gate) : null };
  });
}
var MissionService = class {
  #repo;
  #bus;
  #clock;
  #log;
  #execution;
  #maxAttempts;
  #artifacts;
  #workspaceRoot;
  constructor(repo, bus, clock, log, options = {}) {
    this.#repo = repo;
    this.#bus = bus;
    this.#clock = clock;
    this.#log = log.child({ module: "missions" });
    this.#execution = options.execution ?? null;
    const configured = options.maxAttempts ?? 3;
    this.#maxAttempts = Number.isFinite(configured) ? Math.max(1, Math.trunc(configured)) : 3;
    this.#workspaceRoot = options.workspaceRoot ?? process.cwd();
    this.#artifacts = new ImmutableArtifactStore({
      root: options.artifactRoot ?? join2(this.#workspaceRoot, ".team-platform-artifacts"),
      now: () => this.#clock.now()
    });
  }
  /** Текущий корень артефактов: его показывает настройка рабочей папки. */
  get workspaceRoot() {
    return this.#workspaceRoot;
  }
  /**
   * Смена корня не переписывает старые квитанции: они привязаны к путям, а
   * проверка при приёмке всегда идёт от актуального корня.
   */
  setWorkspaceRoot(path) {
    const root = normalizeWorkspaceRoot(path);
    this.#workspaceRoot = root;
    this.#log.info("\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0430", { workspace_root: root });
    return root;
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
    const actor = actorOf(raw);
    const transition = submitStage(mission, stages, stage, result, actor, this.#clock.now());
    this.#save(transition, stage.key);
    this.#openGate(stage, actor);
    return this.#detail(id);
  }
  gates(id, ref = "") {
    this.#load(id);
    if (!ref.trim()) return withGateDiffs(this.#repo.gates(id));
    const stage = findStage(this.#repo.stages(id), ref);
    return withGateDiffs(this.#repo.gates(id, stage.id));
  }
  /** Записать квитанцию объявленного артефакта; путь проверяется по workspace. */
  receipt(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    if (stage.status !== "review") {
      throw new ConflictError(`\u041A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u044F \u043D\u0443\u0436\u043D\u0430 \u044D\u0442\u0430\u043F\u0443 \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435; ${stage.key} \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 ${stage.status}`, {
        status: stage.status
      });
    }
    const path = normalizeArtifactPath(bodyText(raw, "path"), "path");
    if (!stage.artifacts.includes(path)) {
      throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u043D\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D \u0432 \u044D\u0442\u0430\u043F\u0435 ${stage.key}`);
    }
    const fingerprint = fingerprintArtifact(this.#workspaceRoot, path);
    const at = this.#clock.now().toISOString();
    const receipt = {
      id: newId("rcp"),
      mission_id: mission.id,
      stage_id: stage.id,
      path,
      sha256: fingerprint.sha256,
      size: fingerprint.size,
      created_at: at
    };
    const event2 = {
      mission_id: mission.id,
      type: "mission.stage.receipt",
      actor: actorOf(raw),
      payload: { stage: stage.key, path, sha256: fingerprint.sha256, size: fingerprint.size },
      created_at: at
    };
    this.#repo.addReceipt(receipt, event2);
    this.#publish(event2);
    this.#log.info("\u041A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u044F \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0430", {
      mission_id: id,
      stage: stage.key,
      path,
      size: fingerprint.size
    });
    return this.#detail(id);
  }
  /**
   * Опубликовать артефакт в неизменяемом хранилище (S46/CAP-0032). Ключ
   * собирается из этапа, текущей попытки и объявленного имени; повторная
   * публикация того же ключа — явный конфликт, а не перезапись.
   */
  publishArtifact(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    const path = normalizeArtifactPath(bodyText(raw, "path"), "path");
    if (!stage.artifacts.includes(path)) {
      throw new ValidationError(`\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \xAB${path}\xBB \u043D\u0435 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D \u0432 \u044D\u0442\u0430\u043F\u0435 ${stage.key}`);
    }
    if (!stage.started_at) {
      throw new ConflictError("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u044D\u0442\u0430\u043F: \u0443 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u0435\u0449\u0451 \u043D\u0435\u0442 \u043F\u043E\u043F\u044B\u0442\u043A\u0438", {
        reason: "stage_not_started",
        stage: stage.key
      });
    }
    const attempt = Math.max(1, stage.dispatch_attempt);
    const fingerprint = fingerprintArtifact(this.#workspaceRoot, path);
    const artifact = this.#artifacts.publish({
      mission_id: mission.id,
      stage: stage.key,
      attempt,
      name: path,
      source_path: resolve3(this.#workspaceRoot, path),
      expected_sha256: fingerprint.sha256,
      expected_size: fingerprint.size
    });
    this.#log.info("\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D \u043D\u0435\u0438\u0437\u043C\u0435\u043D\u044F\u0435\u043C\u043E", {
      mission_id: id,
      stage: stage.key,
      attempt: artifact.attempt,
      object_key: artifact.object_key,
      sha256: artifact.sha256
    });
    return artifact;
  }
  /** Метаданные опубликованного артефакта: ключ восстанавливается из stage/attempt/name. */
  artifactMetadata(id, objectKey) {
    const { mission } = this.#load(id);
    return this.#artifacts.metadata(mission.id, objectKey);
  }
  /** Прочитать опубликованные байты; hash сверяется с метаданными. */
  readArtifact(id, objectKey) {
    const { mission } = this.#load(id);
    return this.#artifacts.read(mission.id, objectKey);
  }
  /**
   * Пути, на которые ссылаются миссии: объявленные артефакты этапов и все
   * квитанции. Вход уборки осиротевших вложений — модуль не сканирует чужие
   * базы и не решает сам, что «упомянуто».
   */
  attachmentReferences() {
    return this.#repo.attachmentReferences();
  }
  /** Все квитанции профиля: вход политики хранения (срок от последней). */
  artifactReceipts() {
    return this.#repo.allReceipts().map((receipt) => ({
      path: receipt.path,
      created_at: receipt.created_at
    }));
  }
  /**
   * Явная чистка просроченных артефактов миссии (CAP-0032). Удаляются только
   * файлы, чья последняя квитанция истекла; принимать решения за пользователя
   * здесь нельзя, поэтому метод вызывается отдельно, а не в переходе этапа.
   */
  sweepArtifacts(id) {
    const { mission } = this.#load(id);
    const summary = sweepExpiredArtifacts(this.#workspaceRoot, this.#repo.receipts(mission.id), {
      now: this.#clock.now()
    });
    this.#log.info("\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B \u0432\u044B\u0447\u0438\u0449\u0435\u043D\u044B", {
      mission_id: mission.id,
      removed: summary.removed.length,
      already_gone: summary.already_gone.length,
      kept: summary.kept
    });
    return summary;
  }
  accept(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    assertAcceptable(mission, stage);
    const receipts = this.#repo.receipts(id).filter((item) => item.stage_id === stage.id);
    for (const path of stage.artifacts) {
      const latest = receipts.filter((item) => item.path === path).at(-1);
      assertReceiptMatches(this.#workspaceRoot, path, latest, { now: this.#clock.now() });
    }
    const actor = gateActor(raw);
    const gate = this.#pendingGate(stage, actor);
    this.#repo.decideGate(
      gate.id,
      "approved",
      actor,
      bodyText(raw, "reason").trim().slice(0, 2e3),
      this.#clock.now().toISOString()
    );
    const transition = acceptStage(mission, stages, stage, actor, this.#clock.now());
    this.#save(transition, stage.key);
    this.#moveCard(stage.task_id, "done", "mission");
    return this.#detail(id);
  }
  reject(id, ref, raw) {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    assertRejectable(mission, stage);
    const reason = bodyText(raw, "reason");
    if (!reason.trim()) throw new ValidationError("\u041D\u0443\u0436\u043D\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 \u044D\u0442\u0430\u043F\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E");
    const actor = gateActor(raw);
    const decision = normalizeGateDecision({
      decision: "rework",
      actor,
      reason
    });
    const gate = this.#pendingGate(stage, actor);
    this.#repo.decideGate(
      gate.id,
      decision.decision,
      decision.actor,
      decision.reason,
      this.#clock.now().toISOString()
    );
    const transition = rejectStage(mission, stages, stage, reason, actor, this.#clock.now());
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
  assertExternalRunStart(id, ref) {
    const { mission, stages } = this.#load(id);
    assertStageStartable(mission, stages, findStage(stages, ref));
    if (!this.#execution?.runs) throw new ConflictError("\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u0434\u043B\u044F \u043C\u0438\u0441\u0441\u0438\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
  }
  /**
   * Привязывает уже созданный арендованный запуск (G21, внешнее исполнение) к
   * этапу миссии: этап переходит в running с run_id, при наличии исполнителя
   * создаётся карточка задачи. Возвращает MissionDetail.
   */
  bindExternalRun(id, ref, runId, actor = "system") {
    const { mission, stages } = this.#load(id);
    const stage = findStage(stages, ref);
    if (stage.status === "running" && stage.run_id === runId) {
      return this.#detail(id);
    }
    const transition = startStage(mission, stages, stage, actor, this.#clock.now());
    const execution = this.#execution;
    if (!execution?.runs) throw new ConflictError("\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u0434\u043B\u044F \u043C\u0438\u0441\u0441\u0438\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
    execution.runs.get(runId);
    stage.run_id = runId;
    let cardId = stage.task_id ?? null;
    if (!cardId && execution) {
      const card = execution.tasks.create({
        title: `\u041C\u0438\u0441\u0441\u0438\u044F \xAB${mission.title}\xBB: ${stage.key}. ${stage.title}`.slice(0, 200),
        description: `\u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u0430\u0440\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A ${runId}`,
        type: "work",
        priority: 2,
        created_by: "mission",
        assignee: null,
        tags: ["mission", mission.id, stage.key]
      });
      cardId = card.id;
      stage.task_id = card.id;
    }
    transition.event.payload = { stage: stage.key, title: stage.title, run_id: runId, task_id: cardId, external: true };
    this.#save(transition, stage.key);
    this.#log.info("\u042D\u0442\u0430\u043F \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0432\u043D\u0435\u0448\u043D\u0435\u043C\u0443 \u0437\u0430\u043F\u0443\u0441\u043A\u0443", {
      mission_id: mission.id,
      stage: stage.key,
      run_id: runId,
      task_id: cardId
    });
    return this.#detail(id);
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
          this.#openGate(stage, "mission");
          this.#moveCard(stage.task_id, "done", "mission");
          this.#log.info("\u041E\u0442\u0447\u0451\u0442 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u043F\u0440\u0438\u043C\u0435\u043D\u0451\u043D \u043A \u044D\u0442\u0430\u043F\u0443", {
            mission_id: mission.id,
            stage: stage.key,
            run_id: run.id
          });
        } else if (run.status === "cancelled") {
          const detail = run.error_message || "\u0417\u0430\u043F\u0443\u0441\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D";
          const reason = run.error_class ? `${detail} (${run.error_class})` : detail;
          this.#applyCancel(mission, stages, stage, reason);
        } else {
          const detail = run.error_message || `\u0417\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u043C ${run.status}`;
          const reason = run.error_class ? `${detail} (${run.error_class})` : detail;
          this.#applyFailure(mission, stages, stage, reason);
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
        this.#openGate(stage, "mission");
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
  /** Отмена запуска закрывает этап как cancelled: без повтора и без blocked. */
  #applyCancel(mission, stages, stage, reason) {
    const transition = cancelStage(mission, stages, stage, reason, "mission", this.#clock.now());
    this.#repo.update(transition.mission, transition.stages, transition.event);
    this.#publish(transition.event);
    this.#moveCard(stage.task_id, "cancelled", "mission", stage.error || reason);
    this.#log.info("\u042D\u0442\u0430\u043F \u0437\u0430\u043A\u0440\u044B\u0442 \u043E\u0442\u043C\u0435\u043D\u043E\u0439 \u0437\u0430\u043F\u0443\u0441\u043A\u0430", {
      mission_id: mission.id,
      stage: stage.key,
      reason: stage.error
    });
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
        reason: to === "blocked" ? reason || "\u0421\u0431\u043E\u0439 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0430\u0433\u0435\u043D\u0442\u0430" : to === "cancelled" ? reason || "\u0417\u0430\u043F\u0443\u0441\u043A \u043E\u0442\u043C\u0435\u043D\u0451\u043D" : null,
        assignee: to === "claimed" ? assignee : void 0,
        expected: { status: card.status, revision: card.revision, updated_at: card.updated_at }
      }, { system: actor === "mission" || actor === "system" });
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
  /** Квитанции с вычисленным сроком: истёкшая не выглядит свежей в API. */
  #agedReceipts(id) {
    const now = this.#clock.now();
    return this.#repo.receipts(id).map((receipt) => ({
      ...receipt,
      expires_at: receiptExpiresAt(receipt),
      state: receiptState(receipt, now)
    }));
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
      gates: withGateDiffs(this.#repo.gates(id)),
      receipts: this.#agedReceipts(id),
      max_attempts: this.#maxAttempts
    };
  }
  #openGate(stage, actor) {
    const existing = this.#repo.gates(stage.mission_id, stage.id).find((gate) => gate.status === "pending");
    if (existing) return existing;
    const history = this.#repo.gates(stage.mission_id, stage.id);
    const previous = history.at(-1) ?? null;
    return this.#repo.openGate({
      id: newId("gate"),
      mission_id: stage.mission_id,
      stage_id: stage.id,
      round: previous ? previous.round + 1 : 1,
      status: "pending",
      result: stage.result ?? "",
      opened_at: this.#clock.now().toISOString(),
      decided_at: null,
      decided_by: null,
      reason: null,
      previous_gate_id: previous?.id ?? null
    });
  }
  #pendingGate(stage, actor) {
    const existing = this.#repo.gates(stage.mission_id, stage.id).find((gate) => gate.status === "pending");
    return existing ?? this.#openGate(stage, actor);
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

// modules/missions/runner.ts
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

// modules/missions/repository.ts
var MISSION_COLUMNS = "id, title, goal, status, current_stage_id, revision, summary, agent, created_at, updated_at";
var STAGE_COLUMNS = `id, mission_id, key, position, title, acceptance, artifacts, depends_on, status,
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
    artifacts: JSON.parse(row.artifacts),
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
function toReceipt(row) {
  return {
    id: row.id,
    mission_id: row.mission_id,
    stage_id: row.stage_id,
    path: row.path,
    sha256: row.sha256,
    size: row.size,
    created_at: row.created_at
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
function toGate(row) {
  return {
    id: row.id,
    mission_id: row.mission_id,
    stage_id: row.stage_id,
    round: row.round,
    status: row.status,
    result: row.result,
    opened_at: row.opened_at,
    decided_at: row.decided_at,
    decided_by: row.decided_by,
    reason: row.reason,
    previous_gate_id: row.previous_gate_id
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
        const result = this.#db.raw.prepare(`UPDATE mission_stages SET title = ?, acceptance = ?, artifacts = ?, depends_on = ?, status = ?,
              result = ?, task_id = ?, run_id = ?, error = ?, agent = ?, dispatch_attempt = ?,
              started_at = ?, submitted_at = ?, finished_at = ?, revision = ?
            WHERE id = ? AND mission_id = ?`).run(
          stage.title,
          stage.acceptance,
          JSON.stringify(stage.artifacts),
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
  receipts(missionId) {
    const rows = this.#db.raw.prepare(`SELECT id, mission_id, stage_id, path, sha256, size, created_at
        FROM mission_artifacts WHERE mission_id = ? ORDER BY rowid`).all(missionId);
    return rows.map(toReceipt);
  }
  allReceipts() {
    const rows = this.#db.raw.prepare(`SELECT id, mission_id, stage_id, path, sha256, size, created_at
        FROM mission_artifacts ORDER BY rowid`).all();
    return rows.map(toReceipt);
  }
  attachmentReferences() {
    const rows = this.#db.raw.prepare("SELECT path FROM mission_artifacts UNION SELECT artifacts FROM mission_stages").all();
    const references = /* @__PURE__ */ new Set();
    for (const row of rows) {
      const value = row.path ?? "";
      if (!value.startsWith("[")) {
        if (value) references.add(value);
        continue;
      }
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error("\u0421\u043F\u0438\u0441\u043E\u043A \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432 \u044D\u0442\u0430\u043F\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D: \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F JSON-\u043C\u0430\u0441\u0441\u0438\u0432");
      }
      for (const item of parsed) {
        if (typeof item === "string" && item) references.add(item);
      }
    }
    return [...references];
  }
  addReceipt(receipt, event2) {
    this.#db.transaction(() => {
      this.#db.raw.prepare(`INSERT INTO mission_artifacts
          (id, mission_id, stage_id, path, sha256, size, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        receipt.id,
        receipt.mission_id,
        receipt.stage_id,
        receipt.path,
        receipt.sha256,
        receipt.size,
        receipt.created_at
      );
      this.#appendEvent(event2);
    });
  }
  gates(missionId, stageId) {
    const rows = stageId ? this.#db.raw.prepare(`SELECT * FROM mission_gates
          WHERE mission_id = ? AND stage_id = ? ORDER BY round`).all(missionId, stageId) : this.#db.raw.prepare("SELECT * FROM mission_gates WHERE mission_id = ? ORDER BY round, stage_id").all(missionId);
    return rows.map(toGate);
  }
  openGate(gate) {
    this.#db.raw.prepare(`INSERT INTO mission_gates
      (id, mission_id, stage_id, round, status, result, opened_at, decided_at,
       decided_by, reason, previous_gate_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      gate.id,
      gate.mission_id,
      gate.stage_id,
      gate.round,
      gate.status,
      gate.result,
      gate.opened_at,
      gate.decided_at,
      gate.decided_by,
      gate.reason,
      gate.previous_gate_id
    );
    return { ...gate };
  }
  decideGate(id, status, actor, reason, at) {
    const result = this.#db.raw.prepare(`UPDATE mission_gates
      SET status = ?, decided_at = ?, decided_by = ?, reason = ?
      WHERE id = ? AND status = 'pending'`).run(status, at, actor, reason || null, id);
    const row = this.#db.raw.prepare("SELECT * FROM mission_gates WHERE id = ?").get(id);
    if (!row) throw new NotFoundError(`\u0412\u043E\u0440\u043E\u0442\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B`);
    if (Number(result.changes) !== 1) {
      throw new ConflictError("\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u043F\u043E \u0432\u043E\u0440\u043E\u0442\u0430\u043C \u0443\u0436\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E", { gate_id: id, status: row.status });
    }
    return toGate(row);
  }
  #insertStage(stage) {
    this.#db.raw.prepare(`INSERT INTO mission_stages (${STAGE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      stage.id,
      stage.mission_id,
      stage.key,
      stage.position,
      stage.title,
      stage.acceptance,
      JSON.stringify(stage.artifacts),
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

// modules/missions/schema.ts
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
  },
  {
    // Артефакты этапа и квитанции: путь + sha256 + размер. Квитанция —
    // снимок, а не копия содержимого; при приёмке файл проверяется заново.
    version: "missions/0003_artifacts",
    sql: `
      ALTER TABLE mission_stages ADD COLUMN artifacts TEXT NOT NULL DEFAULT '[]';

      CREATE TABLE mission_artifacts (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
        stage_id TEXT NOT NULL REFERENCES mission_stages (id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX mission_artifacts_stage ON mission_artifacts (stage_id, path, created_at);
    `
  },
  {
    // Ворота решения: один раунд проверки = одна запись. Предыдущий раунд
    // остаётся в таблице, поэтому история доработок не перезаписывается.
    version: "missions/0004_human_gates",
    sql: `
      CREATE TABLE mission_gates (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
        stage_id TEXT NOT NULL REFERENCES mission_stages (id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        status TEXT NOT NULL,
        result TEXT NOT NULL DEFAULT '',
        opened_at TEXT NOT NULL,
        decided_at TEXT,
        decided_by TEXT,
        reason TEXT,
        previous_gate_id TEXT REFERENCES mission_gates (id),
        UNIQUE (mission_id, stage_id, round)
      );
      CREATE INDEX mission_gates_stage ON mission_gates (stage_id, round);
      CREATE INDEX mission_gates_open ON mission_gates (mission_id, status);
    `
  }
];

// team-host-api:src/modules/idempotency-http.ts
var host5 = globalThis["__teamPlatformHostApi"] ?? {};
var idempotencyFingerprint = host5["idempotencyFingerprint"];
var idempotencyKeyOf = host5["idempotencyKeyOf"];
var idempotentReply = host5["idempotentReply"];
var requestPathname = host5["requestPathname"];

// modules/missions/routes.ts
function registerMissionsRoutes(router, deps) {
  const missions = deps.missions;
  const idem = (request, handler) => idempotentReply(
    request,
    deps.idempotency,
    "/api/missions",
    handler
  );
  router.add("POST", "/api/missions", (c) => idem(c, () => ({
    status: 201,
    body: { ok: true, ...missions.create(c.body) }
  })));
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
  router.add("GET", "/api/missions/:id/gates", (c) => {
    const items = missions.gates(c.params.id ?? "", c.query.get("stage") ?? "");
    return { body: { ok: true, items, count: items.length } };
  });
  router.add("POST", "/api/missions/:id/stages", (c) => idem(c, () => ({
    status: 201,
    body: { ok: true, ...missions.addStage(c.params.id ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/stages/:stage/start", (c) => idem(c, () => ({
    body: { ok: true, ...missions.start(c.params.id ?? "", c.params.stage ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/stages/:stage/submit", (c) => idem(c, () => ({
    body: { ok: true, ...missions.submit(c.params.id ?? "", c.params.stage ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/stages/:stage/receipts", (c) => idem(c, () => ({
    status: 201,
    body: { ok: true, ...missions.receipt(c.params.id ?? "", c.params.stage ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/stages/:stage/artifacts", (c) => idem(c, () => ({
    status: 201,
    body: {
      ok: true,
      artifact: missions.publishArtifact(c.params.id ?? "", c.params.stage ?? "", c.body)
    }
  })));
  router.add("GET", "/api/missions/:id/artifacts/metadata", (c) => ({
    body: {
      ok: true,
      artifact: missions.artifactMetadata(c.params.id ?? "", c.query.get("key") ?? "")
    }
  }));
  router.add("GET", "/api/missions/:id/artifacts", (c) => {
    const key = c.query.get("key") ?? "";
    const artifact = missions.artifactMetadata(c.params.id ?? "", key);
    return {
      raw: missions.readArtifact(c.params.id ?? "", key),
      headers: {
        "content-type": "application/octet-stream",
        "cache-control": "no-store",
        "x-artifact-sha256": artifact.sha256,
        "x-artifact-object-key": artifact.object_key
      }
    };
  });
  router.add("POST", "/api/missions/:id/stages/:stage/accept", (c) => idem(c, () => ({
    body: { ok: true, ...missions.accept(c.params.id ?? "", c.params.stage ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/stages/:stage/reject", (c) => idem(c, () => ({
    body: { ok: true, ...missions.reject(c.params.id ?? "", c.params.stage ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/pause", (c) => idem(c, () => ({
    body: { ok: true, ...missions.pause(c.params.id ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/resume", (c) => idem(c, () => ({
    body: { ok: true, ...missions.resume(c.params.id ?? "", c.body) }
  })));
  router.add("POST", "/api/missions/:id/complete", (c) => idem(c, () => ({
    body: { ok: true, ...missions.complete(c.params.id ?? "", c.body) }
  })));
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
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { display: flex; gap: 12px; align-items: baseline; padding: 20px 24px; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 19px; }
  header a { color: var(--accent); font-size: 13px; }
  main { display: grid; gap: 20px; grid-template-columns: minmax(280px, 340px) 1fr; padding: 24px; align-items: start; }
  @media (max-width: 860px) { main { grid-template-columns: 1fr; } }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  h2 { margin: 0 0 12px; font-size: 15px; color: var(--muted); font-weight: 600; }
  label { display: grid; gap: 4px; font-size: 13px; color: var(--muted); margin-bottom: 10px; }
  input, textarea, button { font: inherit; }
  input, textarea { background: var(--bg); color: inherit; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
  textarea { min-height: 70px; resize: vertical; }
  button { background: var(--accent); color: var(--on-accent); border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  li { border: 1px solid var(--line); border-radius: 10px; padding: 12px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .title { font-weight: 600; }
  .meta { color: var(--muted); font-size: 12px; }
  .status { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: var(--panel-soft); }
  .status-active { background: rgba(76, 201, 240, 0.14); color: var(--accent); }
  .status-done { background: #1d3a2a; color: #8be0ab; }
  .status-failed { background: #3a2426; color: #ff9a9a; }
  .error { color: #ff9a9a; font-size: 13px; min-height: 18px; }
  .empty { color: var(--muted); }
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
    <form id="create" data-required="title">
      <label>\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435<input name="title" maxlength="200" required></label>
      <label>\u0426\u0435\u043B\u044C<textarea name="goal" maxlength="4000"></textarea></label>
      <label>\u042D\u0442\u0430\u043F\u044B (\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435)<textarea name="stages" placeholder="\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435&#10;\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442"></textarea></label>
      <button type="submit">\u0421\u043E\u0437\u0434\u0430\u0442\u044C</button>
      <p class="error" id="create-error"></p>
    </form>
  <p id="status" role="status" class="note"></p>
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
