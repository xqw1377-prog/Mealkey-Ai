/**
 * Validation OS V1 Engine
 * Decision → Hypothesis → Task/Metrics → Check-in/Triggers → Outcome Evidence → Memory
 */

import type {
  CreateValidationTaskInput,
  RedeisionTrigger,
  ValidationCheckIn,
  ValidationCommitteeId,
  ValidationHypothesis,
  ValidationImpact,
  ValidationLifecycle,
  ValidationMetric,
  ValidationOutcome,
  ValidationPlanBundle,
  ValidationRiskLevel,
  ValidationTask,
  ValidationTaskStatus,
} from "../contracts/validation";
import { assertPrismaDecisionId } from "../capability/decision/registry";

function buildId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 6).toUpperCase()
      : Date.now().toString(36).toUpperCase();
  return `${prefix}${rand}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function clip(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function parseNumberish(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;
  return Number(m[0]);
}

export function inferCommittee(input: {
  problem: string;
  judgement: string;
  validationPlan?: string;
  action?: string;
}): ValidationCommitteeId {
  const text = `${input.problem} ${input.judgement} ${input.validationPlan || ""} ${input.action || ""}`;
  if (/股权|融资|控制权|激励|现金流|资本/.test(text)) return "capital";
  if (/定位|品牌|心智|认知|宴请|客单价|形象/.test(text)) return "brand";
  if (/模型|复制|坪效|利润|加盟|直营|开店|回本/.test(text)) return "business";
  return "market";
}

export function lifecycleToStatus(lifecycle: ValidationLifecycle): ValidationTaskStatus {
  switch (lifecycle) {
    case "CREATED":
      return "planned";
    case "RUNNING":
    case "OBSERVING":
      return "in_progress";
    case "REVIEW":
      return "at_risk";
    case "PASSED":
    case "FAILED":
      return "completed";
    default:
      return "in_progress";
  }
}

export function statusToLifecycle(
  status: ValidationTaskStatus,
  opts?: { observing?: boolean },
): ValidationLifecycle {
  switch (status) {
    case "planned":
      return "CREATED";
    case "at_risk":
      return "REVIEW";
    case "completed":
      return "PASSED";
    case "abandoned":
      return "FAILED";
    case "in_progress":
    default:
      return opts?.observing ? "OBSERVING" : "RUNNING";
  }
}

function buildHypothesis(input: CreateValidationTaskInput): ValidationHypothesis {
  const committee = input.committee || inferCommittee(input);
  const statement =
    clip(
      input.hypothesisStatement ||
        input.validationPlan ||
        `假设：${input.judgement} 在现实中可被验证成立`,
      160,
    ) || "关键经营假设待验证";

  const riskByCommittee: Record<ValidationCommitteeId, string> = {
    market: "需求判断错误将导致获客成本上升与库存/租金压力",
    brand: "认知判断错误将导致心智稀释与客单承压",
    business: "模型判断错误将导致复制失败与单店亏损放大",
    capital: "资本判断错误将导致稀释失控或现金断裂",
  };

  return {
    hypothesisId: buildId("H"),
    statement: statement.startsWith("假设") ? statement : `假设：${statement}`,
    sourceDecisionId: input.decisionId,
    confidence: Math.max(0.35, Math.min(0.95, input.confidence ?? 0.7)),
    riskIfWrong: riskByCommittee[committee],
    committee,
  };
}

function metricDefsFor(input: CreateValidationTaskInput): Array<{
  name: string;
  target: number;
  unit: string;
  targetLabel: string;
}> {
  if (input.metricNames && input.metricNames.length > 0) {
    return input.metricNames.slice(0, 4).map((name, i) => ({
      name,
      target: i === 0 ? 20 : i === 1 ? 15 : 30,
      unit: "%",
      targetLabel: `≥${i === 0 ? 20 : i === 1 ? 15 : 30}%`,
    }));
  }

  const plan = `${input.validationPlan || ""} ${input.action || ""} ${input.problem}`;
  if (/扩张|开店|复制|加盟|直营/.test(plan)) {
    return [
      { name: "开店周期", target: 45, unit: "天", targetLabel: "≤45天" },
      { name: "坪效", target: 500, unit: "元/㎡", targetLabel: "≥500" },
      { name: "利润率", target: 15, unit: "%", targetLabel: "≥15%" },
    ];
  }
  if (/定位|品牌|心智|宴请|客单/.test(plan)) {
    return [
      { name: "目标客户预约率", target: 20, unit: "%", targetLabel: "≥20%" },
      { name: "成交率", target: 15, unit: "%", targetLabel: "≥15%" },
      { name: "复购率", target: 30, unit: "%", targetLabel: "≥30%" },
    ];
  }
  if (/股权|融资|控制权|激励/.test(plan)) {
    return [
      { name: "控制权边界确认", target: 1, unit: "", targetLabel: "书面确认=1" },
      { name: "稀释上限", target: 20, unit: "%", targetLabel: "≤20%" },
      { name: "协议签署完成度", target: 100, unit: "%", targetLabel: "100%" },
    ];
  }
  return [
    { name: "关键指标达成率", target: 70, unit: "%", targetLabel: "≥70%" },
    { name: "风险触发次数", target: 0, unit: "次", targetLabel: "=0" },
    { name: "验证样本完成度", target: 100, unit: "%", targetLabel: "100%" },
  ];
}

export function buildValidationMetrics(input: CreateValidationTaskInput): ValidationMetric[] {
  return metricDefsFor(input).map((def, index) => {
    const id = `m-${index + 1}`;
    let targetLabel = def.targetLabel;
    if (index === 0 && input.growthPlan?.day30) {
      targetLabel = clip(input.growthPlan.day30, 40);
    }
    return {
      id,
      metricId: id,
      name: def.name,
      label: def.name,
      target: def.target,
      targetLabel,
      unit: def.unit,
      status: "pending" as const,
    };
  });
}

function defaultTriggers(): RedeisionTrigger[] {
  return [
    {
      triggerId: "tr-metric",
      type: "metric_drop",
      fired: false,
      reason: "关键指标较目标下滑超过 20%",
      suggestMeeting: true,
    },
    {
      triggerId: "tr-time",
      type: "time_delay",
      fired: false,
      reason: "超过截止日期仍未完成关键验证",
      suggestMeeting: true,
    },
    {
      triggerId: "tr-conf",
      type: "confidence_change",
      fired: false,
      reason: "验证置信度相对初始下降超过 20 个百分点",
      suggestMeeting: true,
    },
  ];
}

export function estimatePassProbability(task: ValidationTask): number {
  if (task.lifecycle === "PASSED") return 0.92;
  if (task.lifecycle === "FAILED") return 0.12;
  if (task.metrics.length === 0) return task.hypothesis.confidence;

  const scored = task.metrics.map((m) => {
    if (m.status === "passed") return 1;
    if (m.status === "failed") return 0;
    if (typeof m.actual === "number" && m.target > 0) {
      // 开店周期类：越低越好（targetLabel 含 ≤）
      const lowerBetter = (m.targetLabel || "").includes("≤");
      const ratio = lowerBetter
        ? Math.min(1, m.target / Math.max(m.actual, 0.01))
        : Math.min(1.2, m.actual / m.target);
      return Math.max(0, Math.min(1, ratio));
    }
    return 0.45;
  });
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  const riskPenalty = task.lifecycle === "REVIEW" ? 0.15 : 0;
  return Math.max(0.08, Math.min(0.95, avg * 0.7 + task.hypothesis.confidence * 0.3 - riskPenalty));
}

export function buildAiJudgement(task: ValidationTask): string {
  const fired = task.triggers.filter((t) => t.fired);
  if (fired.length > 0) {
    return `当前验证路径偏离：${fired[0]!.reason}。建议重新召开${task.committee === "business" ? "商业" : task.committee === "market" ? "市场" : task.committee === "brand" ? "品牌" : "资本"}委员会。`;
  }
  if (task.lifecycle === "PASSED") {
    return "假设已被结果证据支持，可进入下一轮决策。";
  }
  if (task.lifecycle === "FAILED") {
    return "假设被证伪，需复盘原判断并更新 Memory。";
  }
  const p = task.passProbability ?? estimatePassProbability(task);
  if (p >= 0.7) return "验证通过概率上升，可继续观察关键指标。";
  if (p >= 0.45) return "验证仍在进行，关键假设尚未被充分证明。";
  return "验证通过概率偏低，请检查假设是否仍成立。";
}

/** Decision → ValidationPlan（假设 + 任务 + 指标） */
export function createValidationPlanFromDecision(
  input: CreateValidationTaskInput,
): ValidationPlanBundle {
  const rawDecisionId = String(input.decisionId || "").trim();
  const decisionId = input.allowRuntimeDecisionId
    ? rawDecisionId || buildId("RT")
    : assertPrismaDecisionId(input.decisionId);
  const now = new Date().toISOString();
  const horizonDays = input.horizonDays ?? 90;
  const hypothesis = buildHypothesis({ ...input, decisionId });
  const metrics = buildValidationMetrics(input);
  const action =
    clip(input.action || input.validationPlan || `验证：${input.judgement}`, 140) ||
    "完成关键经营假设验证";
  const taskId = buildId("V");
  const dueAt = addDays(now, horizonDays);

  const task: ValidationTask = {
    id: taskId,
    taskId,
    projectId: input.projectId,
    decisionId,
    hypothesisId: hypothesis.hypothesisId,
    hypothesis,
    title: clip(action, 48) || "90天验证任务",
    action,
    objective: clip(hypothesis.statement, 120),
    owner: input.owner || "老板",
    deadline: dueAt,
    horizonDays,
    startedAt: now,
    dueAt,
    lifecycle: "RUNNING",
    status: "in_progress",
    committee: hypothesis.committee,
    metrics,
    parentEvidenceIds: (input.parentEvidenceIds ?? []).slice(0, 12),
    checkIns: [],
    triggers: defaultTriggers(),
    passProbability: hypothesis.confidence,
    aiJudgement: "决策已进入验证：系统将监督关键假设，而非仅跟踪待办。",
    createdAt: now,
    updatedAt: now,
  };

  task.passProbability = estimatePassProbability(task);
  task.aiJudgement = buildAiJudgement(task);

  return {
    period: `${horizonDays}天`,
    horizonDays,
    hypothesis,
    task,
    metrics,
  };
}

/** 兼容旧调用：从决策生成验证任务 */
export function createValidationTaskFromDecision(
  input: CreateValidationTaskInput,
): ValidationTask {
  return createValidationPlanFromDecision(input).task;
}

export function daysElapsed(startedAt: string, now = Date.now()): number {
  return Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / (24 * 60 * 60 * 1000)),
  );
}

export function daysRemaining(dueAt: string, now = Date.now()): number {
  return Math.max(
    0,
    Math.ceil((new Date(dueAt).getTime() - now) / (24 * 60 * 60 * 1000)),
  );
}

export function expectedProgressRatio(task: ValidationTask, now = Date.now()): number {
  const total = Math.max(1, task.horizonDays);
  return Math.min(1, daysElapsed(task.startedAt, now) / total);
}

export function assessCheckInRisk(input: {
  task: ValidationTask;
  reportedProgressRatio?: number;
  note?: string;
}): { deviationDays: number; riskLevel: ValidationRiskLevel; nextStatus: ValidationTaskStatus } {
  const expected = expectedProgressRatio(input.task);
  const reported =
    typeof input.reportedProgressRatio === "number"
      ? Math.max(0, Math.min(1, input.reportedProgressRatio))
      : expected;
  const lagRatio = expected - reported;
  const deviationDays = Math.round(lagRatio * input.task.horizonDays);
  const noteRisk = /延期|未完成|风险|落后|卡住|失败/.test(input.note || "");

  let riskLevel: ValidationRiskLevel = "low";
  if (deviationDays >= 21 || noteRisk) riskLevel = "high";
  else if (deviationDays >= 10) riskLevel = "medium";

  const nextStatus: ValidationTaskStatus =
    riskLevel === "high"
      ? "at_risk"
      : input.task.status === "planned"
        ? "in_progress"
        : input.task.status;

  return { deviationDays, riskLevel, nextStatus };
}

function evaluateMetric(
  metric: ValidationMetric,
  actualRaw: string,
): ValidationMetric {
  const actual = parseNumberish(actualRaw);
  const actualLabel = clip(actualRaw, 40);
  if (actual === undefined) {
    return { ...metric, actualLabel, status: "pending" };
  }

  const lowerBetter = (metric.targetLabel || "").includes("≤") || metric.name.includes("周期");
  const passed = lowerBetter ? actual <= metric.target : actual >= metric.target;
  // metric_drop: 相对目标差 20%+
  const drop =
    metric.target === 0
      ? false
      : lowerBetter
        ? actual > metric.target * 1.2
        : actual < metric.target * 0.8;

  return {
    ...metric,
    actual,
    actualLabel,
    status: passed ? "passed" : drop ? "failed" : "pending",
  };
}

/** 重新决策触发器评估 */
export function evaluateRedeisionTriggers(task: ValidationTask, now = Date.now()): RedeisionTrigger[] {
  const nowIso = new Date(now).toISOString();
  return task.triggers.map((tr) => {
    if (tr.fired) return tr;

    if (tr.type === "metric_drop") {
      const failed = task.metrics.some((m) => m.status === "failed");
      if (failed) {
        return {
          ...tr,
          fired: true,
          firedAt: nowIso,
          reason: `关键指标偏离目标：${task.metrics
            .filter((m) => m.status === "failed")
            .map((m) => m.name)
            .join("、")}`,
        };
      }
    }

    if (tr.type === "time_delay") {
      const overdue =
        now > new Date(task.dueAt).getTime() + 30 * 24 * 60 * 60 * 1000 &&
        task.lifecycle !== "PASSED" &&
        task.lifecycle !== "FAILED";
      if (overdue) {
        return {
          ...tr,
          fired: true,
          firedAt: nowIso,
          reason: "已超过截止日期 30 天，关键验证仍未收口",
        };
      }
    }

    if (tr.type === "confidence_change") {
      const p = task.passProbability ?? estimatePassProbability(task);
      if (task.hypothesis.confidence - p >= 0.2) {
        return {
          ...tr,
          fired: true,
          firedAt: nowIso,
          reason: `验证置信度从 ${Math.round(task.hypothesis.confidence * 100)}% 降至 ${Math.round(p * 100)}%`,
        };
      }
    }

    return tr;
  });
}

export function applyValidationCheckIn(input: {
  task: ValidationTask;
  note: string;
  metrics?: Array<{ metricId: string; actual: string }>;
  reportedProgressRatio?: number;
}): ValidationTask {
  const assessment = assessCheckInRisk({
    task: input.task,
    reportedProgressRatio: input.reportedProgressRatio,
    note: input.note,
  });

  const metrics = input.task.metrics.map((metric) => {
    const hit = input.metrics?.find(
      (item) => item.metricId === metric.metricId || item.metricId === metric.id,
    );
    return hit ? evaluateMetric(metric, hit.actual) : metric;
  });

  let next: ValidationTask = {
    ...input.task,
    metrics,
    checkIns: [
      ...input.task.checkIns,
      {
        at: new Date().toISOString(),
        note: clip(input.note, 300),
        metrics: input.metrics,
        deviationDays: assessment.deviationDays,
        riskLevel: assessment.riskLevel,
      } satisfies ValidationCheckIn,
    ].slice(-20),
    status: assessment.nextStatus === "completed" ? input.task.status : assessment.nextStatus,
    lifecycle:
      assessment.nextStatus === "at_risk"
        ? "REVIEW"
        : metrics.some((m) => m.actual !== undefined)
          ? "OBSERVING"
          : "RUNNING",
    updatedAt: new Date().toISOString(),
  };

  next.passProbability = estimatePassProbability(next);
  next.triggers = evaluateRedeisionTriggers(next);
  if (next.triggers.some((t) => t.fired)) {
    next.lifecycle = "REVIEW";
    next.status = "at_risk";
  }
  next.aiJudgement = buildAiJudgement(next);
  next.checkIns = next.checkIns.map((c, i, arr) =>
    i === arr.length - 1 ? { ...c, passProbability: next.passProbability } : c,
  );

  return next;
}

export function buildValidationOutcome(input: {
  task: ValidationTask;
  resultSummary: string;
  impact: ValidationImpact;
  resultEvidenceId: string;
}): ValidationOutcome {
  const judgedCorrectRatio =
    input.impact === "confirmed" ? 0.85 : input.impact === "partial" ? 0.55 : 0.25;
  const whatWasWrong =
    input.impact === "confirmed"
      ? "关键假设基本成立"
      : input.impact === "partial"
        ? "部分假设成立，执行细节或样本边界需修正"
        : "原判断低估了关键约束（能力/现金流/认知等）";
  const newLearning =
    input.impact === "confirmed"
      ? `${input.task.hypothesis.statement} 已被结果支持，可作为后续同类决策先验。`
      : `新认知：在放大动作前，必须先验证「${clip(input.task.hypothesis.statement.replace(/^假设：/, ""), 40)}」。`;

  return {
    outcomeId: buildId("O"),
    taskId: input.task.taskId || input.task.id,
    result: clip(input.resultSummary, 240),
    evidenceId: input.resultEvidenceId,
    impact: input.impact,
    retrospective: {
      originalConfidence: input.task.hypothesis.confidence,
      judgedCorrectRatio,
      whatWasWrong,
      newLearning,
    },
  };
}

export function completeValidationTask(input: {
  task: ValidationTask;
  resultSummary: string;
  resultEvidenceId?: string;
  aligned?: boolean;
  impact?: ValidationImpact;
}): ValidationTask {
  const impact: ValidationImpact =
    input.impact ||
    (input.aligned === true
      ? "confirmed"
      : input.aligned === false
        ? "invalidated"
        : "partial");
  const resultEvidenceId = input.resultEvidenceId || `E-VAL-${input.task.id}`;
  const outcome = buildValidationOutcome({
    task: input.task,
    resultSummary: input.resultSummary,
    impact,
    resultEvidenceId,
  });
  const lifecycle: ValidationLifecycle =
    impact === "confirmed" ? "PASSED" : impact === "invalidated" ? "FAILED" : "REVIEW";

  const next: ValidationTask = {
    ...input.task,
    lifecycle,
    status: lifecycleToStatus(lifecycle),
    resultSummary: clip(input.resultSummary, 240),
    resultEvidenceId,
    outcome,
    passProbability: impact === "confirmed" ? 0.92 : impact === "partial" ? 0.55 : 0.15,
    updatedAt: new Date().toISOString(),
  };
  next.aiJudgement = buildAiJudgement(next);
  return next;
}

export function upsertValidationTask(
  tasks: ValidationTask[],
  task: ValidationTask,
): ValidationTask[] {
  const idx = tasks.findIndex((item) => item.id === task.id || item.taskId === task.taskId);
  if (idx < 0) return [task, ...tasks].slice(0, 40);
  const next = [...tasks];
  next[idx] = task;
  return next;
}

export function listActiveValidationTasks(tasks: ValidationTask[]): ValidationTask[] {
  return tasks.filter((task) => {
    const life = task.lifecycle || statusToLifecycle(task.status);
    return (
      life === "CREATED" ||
      life === "RUNNING" ||
      life === "OBSERVING" ||
      life === "REVIEW" ||
      task.status === "planned" ||
      task.status === "in_progress" ||
      task.status === "at_risk"
    );
  });
}

/** 规范化旧任务（缺字段时补齐） */
export function normalizeValidationTask(raw: ValidationTask): ValidationTask {
  const hypothesis: ValidationHypothesis =
    raw.hypothesis ||
    ({
      hypothesisId: raw.hypothesisId || `H-${raw.id}`,
      statement: raw.objective || raw.title || "假设待补全",
      sourceDecisionId: raw.decisionId,
      confidence: 0.65,
      riskIfWrong: "假设错误将导致错误放大",
      committee: raw.committee || "business",
    } satisfies ValidationHypothesis);

  const metrics = (raw.metrics || []).map((m, i) => {
    const id = m.id || m.metricId || `m-${i + 1}`;
    const rawTarget = (m as { target?: number | string }).target;
    const target =
      typeof rawTarget === "number" ? rawTarget : parseNumberish(String(rawTarget ?? "")) ?? 0;
    const rawActual = (m as { actual?: number | string }).actual;
    return {
      id,
      metricId: m.metricId || id,
      name: m.name || m.label || `指标${i + 1}`,
      label: m.label || m.name || `指标${i + 1}`,
      target,
      targetLabel:
        m.targetLabel ||
        (typeof rawTarget === "string" ? rawTarget : target ? String(target) : undefined),
      actual:
        typeof rawActual === "number" ? rawActual : parseNumberish(String(rawActual ?? "")),
      actualLabel:
        m.actualLabel || (rawActual !== undefined && rawActual !== null ? String(rawActual) : undefined),
      unit: m.unit,
      status: m.status || "pending",
    } satisfies ValidationMetric;
  });

  const lifecycle =
    raw.lifecycle ||
    statusToLifecycle(raw.status || "in_progress", {
      observing: (raw.checkIns?.length ?? 0) > 0,
    });

  const task: ValidationTask = {
    ...raw,
    taskId: raw.taskId || raw.id,
    hypothesisId: hypothesis.hypothesisId,
    hypothesis,
    action: raw.action || raw.objective || raw.title,
    deadline: raw.deadline || raw.dueAt,
    committee: raw.committee || hypothesis.committee,
    metrics,
    triggers: raw.triggers?.length ? raw.triggers : defaultTriggers(),
    lifecycle,
    status: raw.status || lifecycleToStatus(lifecycle),
    checkIns: raw.checkIns || [],
    parentEvidenceIds: raw.parentEvidenceIds || [],
  };
  task.passProbability = raw.passProbability ?? estimatePassProbability(task);
  task.aiJudgement = raw.aiJudgement || buildAiJudgement(task);
  return task;
}
