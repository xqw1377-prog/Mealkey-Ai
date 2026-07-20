/**
 * Decision Intelligence 编排服务 — 第二家店闭环
 */
import type { PrismaClient } from "@/generated/prisma";
import { createDecision } from "@/server/services/agent-os.service";
import { loadRestaurantBrainContext } from "@/server/restaurant-brain/service";
import { createExecutionFromDecision } from "@/server/founder-layer/capability/execution/create-from-decision";
import { validateProfile } from "@/lib/profile-schema";
import type {
  DecisionAssessmentV1,
  DecisionCaseV1,
  DecisionContextV1,
  DecisionPackageV1,
  DecisionTraceV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import {
  CASE_OUTCOME_KEY,
  CONTEXT_OUTCOME_KEY,
  DIE_OUTCOME_KEY,
  SCORES_OUTCOME_KEY,
  TRACE_OUTCOME_KEY,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import { buildExpansionDecisionCase } from "./case-factory";
import { buildExpansionContext } from "./context-builder";
import { buildExpansionOptions } from "./options-expansion";
import { computePostAssessment, computePreAssessment } from "./assessment";
import {
  buildExpansionLearning,
  buildOperatingHabitFromLearning,
  habitReminderFromBrainPatterns,
  persistHabitToProfile,
  persistLearningToBrain,
  readHabitFromProfile,
} from "./learning";
import { caseStatusToMkStatus } from "./mk-status-map";
import { EXPANSION_CHALLENGE_OPINIONS } from "./challenge-seed";
import { buildExpansionTrace } from "./trace";
import {
  mergeDecisionOutcome,
  parseDecisionOutcome,
  readDieBundle,
  withMkStatus,
} from "./outcome-io";
import type { OperatingDecisionHabitV1 } from "@/server/founder-layer/contracts/decision-habit";
import type { DecisionLearningV1 } from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import { parseJsonField } from "@/lib/prisma";

export type DieCaseBundle = {
  case: DecisionCaseV1;
  context: DecisionContextV1;
  assessment: DecisionAssessmentV1;
  packagePreview?: DecisionPackageV1;
  trace?: DecisionTraceV1;
  learning?: DecisionLearningV1;
  /** 经营决策习惯（对外名；非决策人格） */
  habitReminder?: OperatingDecisionHabitV1 | null;
  decisionHref: string;
};

function roomHref(projectId: string, caseId: string) {
  return `/projects/${projectId}/decision-case?id=${encodeURIComponent(caseId)}`;
}

async function loadOwnerLabel(
  prisma: PrismaClient,
  ownerId: string,
): Promise<string> {
  const owner = await prisma.owner.findUnique({
    where: { id: ownerId },
    select: { name: true },
  });
  return owner?.name?.trim() || "老板";
}

export async function findOpenExpansionCase(
  prisma: PrismaClient,
  projectId: string,
  ownerId: string,
): Promise<DecisionCaseV1 | null> {
  const rows = await prisma.decision.findMany({
    where: { projectId, ownerId, type: "expansion" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  for (const row of rows) {
    const bundle = readDieBundle(row.outcome);
    const c = bundle.case;
    if (!c) continue;
    if (
      c.decisionType === "GROWTH" &&
      ["DISCOVERED", "ANALYZING", "DELIBERATING", "DECIDED", "EXECUTING"].includes(
        c.status,
      )
    ) {
      return c;
    }
  }
  return null;
}

export async function getExpansionCaseBundle(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string; decisionId: string },
): Promise<DieCaseBundle | null> {
  const row = await prisma.decision.findFirst({
    where: {
      id: input.decisionId,
      projectId: input.projectId,
      ownerId: input.ownerId,
    },
  });
  if (!row) return null;
  const bundle = readDieBundle(row.outcome);
  if (!bundle.case || !bundle.contextSnapshot || !bundle.scores?.pre) {
    return null;
  }

  let habitReminder: OperatingDecisionHabitV1 | null = null;
  try {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ownerId: input.ownerId },
      select: { profile: true },
    });
    habitReminder = readHabitFromProfile(
      parseJsonField(project?.profile),
    );
    if (!habitReminder) {
      const brain = await loadRestaurantBrainContext(prisma, {
        projectId: input.projectId,
        ownerId: input.ownerId,
      });
      habitReminder = habitReminderFromBrainPatterns(
        brain.learning.patterns,
        input.projectId,
      );
    }
  } catch {
    habitReminder = null;
  }

  const outcomeObj = parseDecisionOutcome(row.outcome);
  const learningFromOutcome = outcomeObj.learning as
    | DecisionLearningV1
    | undefined;
  const learningFromRow =
    typeof row.learning === "string"
      ? (parseJsonField(row.learning) as DecisionLearningV1 | null)
      : null;

  return {
    case: bundle.case,
    context: bundle.contextSnapshot,
    assessment: bundle.scores.pre,
    packagePreview: bundle.die?.packagePreview,
    trace: bundle.trace,
    learning: learningFromOutcome || learningFromRow || undefined,
    habitReminder,
    decisionHref: roomHref(input.projectId, bundle.case.id),
  };
}

async function rebuildAndPersist(
  prisma: PrismaClient,
  row: { id: string; outcome: string | null },
  decisionCase: DecisionCaseV1,
  ownerId: string,
) {
  const brain = await loadRestaurantBrainContext(prisma, {
    projectId: decisionCase.projectId,
    ownerId,
  });
  let context = buildExpansionContext({ case: decisionCase, brain });
  const { options, simulations } = buildExpansionOptions({
    decisionCase,
    context,
  });
  context = {
    ...context,
    options,
    simulations,
    expertOpinions:
      context.expertOpinions.length > 0
        ? context.expertOpinions
        : EXPANSION_CHALLENGE_OPINIONS,
    assessment: undefined,
  };
  const assessment = computePreAssessment({
    decisionId: decisionCase.id,
    context,
    options,
  });
  context = { ...context, assessment };

  const recommended = options.find((o) => o.isRecommended) || options[1]!;
  const dieRun = {
    decisionId: decisionCase.id,
    projectId: decisionCase.projectId,
    frame: {
      originalQuestion: decisionCase.question,
      reframedQuestion:
        "当前单店模型与组织能力，是否已支撑第二增长曲线？",
      notTheQuestion: "不是「市场热不热」的抽象问答",
      subQuestions: [
        "产品与 SOP 是否可复制？",
        "店长能否独立经营？",
        "现金能否扛住筹备期？",
        "单店利润是否稳定？",
      ],
      framingConfidence: Math.min(0.85, 0.4 + brain.evolution.dataCompleteness / 200),
      evidenceRefs: context.evidences.map((e) => e.id).slice(0, 6),
    },
    options,
    simulations,
    assessment,
    recommendationLine: `建议：${recommended.name}。${assessment.rationale[0] || ""}`,
  };

  const mk = caseStatusToMkStatus(decisionCase.status);
  const outcome = withMkStatus(row.outcome, mk, {
    [CASE_OUTCOME_KEY]: { ...decisionCase, assessmentId: assessment.id },
    [CONTEXT_OUTCOME_KEY]: context,
    [DIE_OUTCOME_KEY]: dieRun,
    [SCORES_OUTCOME_KEY]: { pre: assessment },
  });

  await prisma.decision.update({
    where: { id: row.id },
    data: {
      outcome,
      confidence: assessment.confidenceScore / 100,
      judgement: dieRun.recommendationLine,
      strategy: recommended.name,
      diagnosis: context.unknowns[0] || "扩店条件审视中",
      updatedAt: new Date(),
    },
  });

  return {
    case: { ...decisionCase, assessmentId: assessment.id },
    context,
    assessment,
    decisionHref: roomHref(decisionCase.projectId, decisionCase.id),
  };
}

/** 打开或复用扩店 Decision Case，并组装 Context/Options/Assessment */
export async function openExpansionCase(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string; forceNew?: boolean },
): Promise<DieCaseBundle> {
  if (!input.forceNew) {
    const existing = await findOpenExpansionCase(
      prisma,
      input.projectId,
      input.ownerId,
    );
    if (existing) {
      const bundle = await getExpansionCaseBundle(prisma, {
        projectId: input.projectId,
        ownerId: input.ownerId,
        decisionId: existing.id,
      });
      if (bundle) return bundle;
    }
  }

  const ownerLabel = await loadOwnerLabel(prisma, input.ownerId);
  const draft = buildExpansionDecisionCase({
    id: "pending",
    projectId: input.projectId,
    ownerId: input.ownerId,
    ownerLabel,
  });

  const record = await createDecision(prisma, {
    ownerId: input.ownerId,
    projectId: input.projectId,
    type: "expansion",
    problem: draft.question,
    observation: "第二家店扩张议题已建立 Decision Case",
    diagnosis: "待组装 Context 与 Unknowns",
    judgement: "分析中",
    strategy: "待生成方案",
    action: "进入决策室完成裁决",
    confidence: 0.4,
  });

  const decisionCase: DecisionCaseV1 = {
    ...draft,
    id: record.id,
    status: "ANALYZING",
  };

  const seeded = await rebuildAndPersist(
    prisma,
    record,
    decisionCase,
    input.ownerId,
  );
  return seeded;
}

export async function refreshExpansionContext(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string; decisionId: string },
): Promise<DieCaseBundle> {
  const row = await prisma.decision.findFirst({
    where: {
      id: input.decisionId,
      projectId: input.projectId,
      ownerId: input.ownerId,
    },
  });
  if (!row) throw new Error("决策不存在");
  const bundle = readDieBundle(row.outcome);
  if (!bundle.case) throw new Error("缺少 DecisionCase");
  return rebuildAndPersist(prisma, row, bundle.case, input.ownerId);
}

export async function markDeliberating(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string; decisionId: string },
): Promise<DieCaseBundle> {
  const row = await prisma.decision.findFirst({
    where: {
      id: input.decisionId,
      projectId: input.projectId,
      ownerId: input.ownerId,
    },
  });
  if (!row) throw new Error("决策不存在");
  const bundle = readDieBundle(row.outcome);
  if (!bundle.case) throw new Error("缺少 DecisionCase");
  const nextCase: DecisionCaseV1 = {
    ...bundle.case,
    status: "DELIBERATING",
    updatedAt: new Date().toISOString(),
  };
  return rebuildAndPersist(prisma, row, nextCase, input.ownerId);
}

function buildPackage(
  decisionCase: DecisionCaseV1,
  optionName: string,
  _optionId: string,
): DecisionPackageV1 {
  return {
    packageId: `pkg_${decisionCase.id}`,
    caseId: decisionCase.id,
    decision: optionName,
    objective: decisionCase.objective,
    actions: [
      { title: `确认方案：${optionName}（7 天内对齐团队）`, dueInDays: 7 },
      { title: "30 天：完成店长独立经营观察清单", dueInDays: 30 },
      { title: "60 天：复核单店利润与现金缓冲", dueInDays: 60 },
      { title: "90 天：复盘是否具备开第二家条件", dueInDays: 90 },
    ],
    metrics: [
      { name: "单店净利润率", target: "不因筹备显著恶化" },
      { name: "店长独立值班天数", target: "连续 ≥14 天" },
      { name: "开店准备完成度", target: "90 天节点可验收" },
    ],
    deadline: decisionCase.deadline || "90天",
  };
}

export async function founderDecideExpansion(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    decisionId: string;
    optionId: string;
    mode: "accept" | "modify" | "insist";
    founderReason?: string;
  },
): Promise<DieCaseBundle & { package: DecisionPackageV1 }> {
  const row = await prisma.decision.findFirst({
    where: {
      id: input.decisionId,
      projectId: input.projectId,
      ownerId: input.ownerId,
    },
  });
  if (!row) throw new Error("决策不存在");
  const bundle = readDieBundle(row.outcome);
  if (!bundle.case || !bundle.contextSnapshot || !bundle.die) {
    throw new Error("决策资产不完整，请先刷新 Context");
  }

  const option =
    bundle.die.options.find((o) => o.id === input.optionId) ||
    bundle.contextSnapshot.options.find((o) => o.id === input.optionId);
  if (!option) throw new Error("方案不存在");

  if (input.mode === "insist" && !input.founderReason?.trim()) {
    throw new Error("坚持原方案须填写理由（将写入决策记忆）");
  }

  const pkg = buildPackage(bundle.case, option.name, option.id);
  const nextCase: DecisionCaseV1 = {
    ...bundle.case,
    status: "DECIDED",
    selectedOptionId: option.id,
    packageId: pkg.packageId,
    updatedAt: new Date().toISOString(),
  };

  const trace = buildExpansionTrace({
    decisionId: nextCase.id,
    context: bundle.contextSnapshot,
    chosen: option,
    allOptions: bundle.die.options,
    mode: input.mode,
    founderReason: input.founderReason,
  });

  const dieRun = {
    ...bundle.die,
    packagePreview: pkg,
    recommendationLine: `老板裁决：${option.name}`,
    trace,
  };

  const outcome = withMkStatus(row.outcome, "APPROVED", {
    [CASE_OUTCOME_KEY]: nextCase,
    [CONTEXT_OUTCOME_KEY]: bundle.contextSnapshot,
    [DIE_OUTCOME_KEY]: dieRun,
    [SCORES_OUTCOME_KEY]: bundle.scores,
    [TRACE_OUTCOME_KEY]: trace,
  });

  await prisma.decision.update({
    where: { id: row.id },
    data: {
      outcome,
      judgement: `老板选择：${option.name}`,
      strategy: option.name,
      action: pkg.actions.map((a) => a.title).join("；"),
      confidence: (bundle.scores?.pre?.confidenceScore ?? 60) / 100,
    },
  });

  const refreshed = await getExpansionCaseBundle(prisma, input);
  if (!refreshed) throw new Error("裁决后读取失败");
  return { ...refreshed, package: pkg };
}

export async function commitExpansionExecution(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    decisionId: string;
    profile: Record<string, unknown>;
  },
) {
  const row = await prisma.decision.findFirst({
    where: {
      id: input.decisionId,
      projectId: input.projectId,
      ownerId: input.ownerId,
    },
  });
  if (!row) throw new Error("决策不存在");
  const bundle = readDieBundle(row.outcome);
  if (!bundle.case) throw new Error("缺少 Case");

  const mk = parseDecisionOutcome(row.outcome).mkStatus;
  if (mk !== "APPROVED" && mk !== "EXECUTING" && mk !== "VALIDATING") {
    // ensure APPROVED
    await prisma.decision.update({
      where: { id: row.id },
      data: {
        outcome: withMkStatus(row.outcome, "APPROVED"),
      },
    });
  }

  const created = await createExecutionFromDecision(prisma, {
    projectId: input.projectId,
    ownerId: input.ownerId,
    decisionId: input.decisionId,
    profile: input.profile,
    nextActions: bundle.die?.packagePreview?.actions.map((a) => a.title),
  });

  const nextCase: DecisionCaseV1 = {
    ...bundle.case,
    status: "EXECUTING",
    updatedAt: new Date().toISOString(),
  };
  await prisma.decision.update({
    where: { id: row.id },
    data: {
      outcome: mergeDecisionOutcome(row.outcome, {
        [CASE_OUTCOME_KEY]: nextCase,
        mkStatus: "EXECUTING",
      }),
    },
  });

  return created;
}

export async function recordExpansionLearning(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    decisionId: string;
    actualResult: string;
    successBand: "success" | "partial" | "fail";
  },
) {
  const row = await prisma.decision.findFirst({
    where: {
      id: input.decisionId,
      projectId: input.projectId,
      ownerId: input.ownerId,
    },
  });
  if (!row) throw new Error("决策不存在");
  const bundle = readDieBundle(row.outcome);
  if (!bundle.case || !bundle.scores?.pre) throw new Error("缺少评分资产");

  const post = computePostAssessment({
    decisionId: input.decisionId,
    pre: bundle.scores.pre,
    actualSummary: input.actualResult,
    successBand: input.successBand,
  });
  const founderOverride = Boolean(bundle.trace?.founderOverrideReason);
  const learning = buildExpansionLearning({
    decisionId: input.decisionId,
    projectId: input.projectId,
    prediction: bundle.die?.recommendationLine || bundle.case.objective,
    actualResult: input.actualResult,
    successBand: input.successBand,
    pre: bundle.scores.pre,
    post,
    founderOverride,
  });
  const brainId = await persistLearningToBrain(prisma, {
    projectId: input.projectId,
    ownerId: input.ownerId,
    learning: { ...learning, brainLearningId: undefined },
  });
  learning.brainLearningId = brainId;

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, ownerId: input.ownerId },
    select: { profile: true },
  });
  const previousHabit = readHabitFromProfile(parseJsonField(project?.profile));
  const habit = buildOperatingHabitFromLearning({
    projectId: input.projectId,
    learning,
    successBand: input.successBand,
    previous: previousHabit,
    founderOverride,
  });
  try {
    await persistHabitToProfile(prisma, {
      projectId: input.projectId,
      ownerId: input.ownerId,
      habit,
    });
  } catch {
    // profile 冲突不阻断学习主路径
  }

  const nextCase: DecisionCaseV1 = {
    ...bundle.case,
    status: "LEARNING",
    updatedAt: new Date().toISOString(),
  };

  await prisma.decision.update({
    where: { id: row.id },
    data: {
      learning: JSON.stringify(learning),
      outcome: withMkStatus(row.outcome, "LEARNED", {
        [CASE_OUTCOME_KEY]: nextCase,
        [SCORES_OUTCOME_KEY]: { pre: bundle.scores.pre, post },
        learning,
        operatingHabit: habit,
      }),
    },
  });

  return { learning, post, habit };
}

export { validateProfile };
