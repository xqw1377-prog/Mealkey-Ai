/**
 * E1: 从已批准 MKDecision 创建执行（ActionPlan + Validation + ExecutionStarted）
 */

import type { PrismaClient } from "@/generated/prisma";
import { buildTodayActionsFromMeetingConfirm } from "@/lib/meeting-today-actions";
import {
  assertPrismaDecisionId,
  mergeMkStatusIntoOutcome,
  mkStatusFromOutcome,
} from "../decision/registry";
import { emitDecisionRuntimeEvent } from "../decision/events";
import {
  createValidationPlanFromDecision,
  upsertValidationTask,
} from "../../validation";
import type { ValidationTask } from "../../contracts/validation";
import type { ActionPlan } from "../../contracts/capability";
import type { MKDecisionStatus } from "../../contracts/mk-decision";
import { computeD7ReviewDueAt } from "../decision-center/d7-review";

function asTasks(raw: unknown): ValidationTask[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item) => item && typeof item === "object" && "id" in item,
  ) as ValidationTask[];
}

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const ALLOWED: MKDecisionStatus[] = [
  "APPROVED",
  "EXECUTING",
  "VALIDATING",
];

export type CreateExecutionFromDecisionResult = {
  decisionId: string;
  mkStatus: MKDecisionStatus;
  actionPlan: ActionPlan;
  validationTask: ValidationTask;
  sourceEventId: string;
};

/**
 * 硬门禁：仅 APPROVED / EXECUTING / VALIDATING 可创建或刷新执行计划。
 */
export async function createExecutionFromDecision(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    decisionId: string;
    profile: Record<string, unknown>;
    /** 覆盖今日动作标题 */
    nextActions?: string[];
    /** 会议刚写入的 Decision 快照，避免二次 findFirst 丢关联 */
    decisionRow?: {
      id: string;
      projectId?: string | null;
      problem: string;
      judgement: string;
      action?: string | null;
      outcome?: string | null;
      confidence?: number | null;
    };
  },
): Promise<{
  result: CreateExecutionFromDecisionResult;
  nextProfile: Record<string, unknown>;
}> {
  const decisionId = assertPrismaDecisionId(input.decisionId);

  let row = input.decisionRow?.id === decisionId
    ? {
        id: input.decisionRow.id,
        projectId: input.decisionRow.projectId ?? input.projectId,
        problem: input.decisionRow.problem,
        judgement: input.decisionRow.judgement,
        action: input.decisionRow.action ?? null,
        outcome: input.decisionRow.outcome ?? null,
        confidence: input.decisionRow.confidence ?? null,
      }
    : await prisma.decision.findFirst({
        where: { id: decisionId, projectId: input.projectId },
      });

  if (!row) {
    const orphan = await prisma.decision.findFirst({
      where: { id: decisionId },
    });
    if (!orphan) {
      throw new Error("决策不存在或不属于本项目");
    }
    if (orphan.projectId && orphan.projectId !== input.projectId) {
      throw new Error("决策不存在或不属于本项目");
    }
    row = orphan.projectId
      ? orphan
      : await prisma.decision.update({
          where: { id: decisionId },
          data: { projectId: input.projectId },
        });
  }

  if (!row.projectId) {
    row = await prisma.decision.update({
      where: { id: decisionId },
      data: { projectId: input.projectId },
    });
  } else if (row.projectId !== input.projectId) {
    throw new Error("决策不存在或不属于本项目");
  }

  const mkStatus = mkStatusFromOutcome(row.outcome, "DRAFT");
  if (!ALLOWED.includes(mkStatus)) {
    throw new Error(
      `仅已批准决策可进入执行（当前 mkStatus=${mkStatus}）`,
    );
  }

  const d7ReviewDueAt = computeD7ReviewDueAt();

  const planBundle = createValidationPlanFromDecision({
    projectId: input.projectId,
    decisionId,
    problem: row.problem,
    judgement: row.judgement,
    action: row.action ?? undefined,
    validationPlan: row.action ?? undefined,
    hypothesisStatement: (() => {
      try {
        const o = row.outcome ? JSON.parse(row.outcome) : {};
        return (
          (o as { hypothesis?: string }).hypothesis ||
          (o as { validationHypothesis?: { statement?: string } })
            .validationHypothesis?.statement ||
          row.judgement
        );
      } catch {
        return row.judgement;
      }
    })(),
    confidence: row.confidence || 0.7,
    owner: "老板",
    horizonDays: 90,
  });

  // MVP：验证仍可 90 天，但强制挂 D+7 复盘到期点
  planBundle.task = {
    ...planBundle.task,
    d7ReviewDueAt,
    d7ReviewStatus: "pending",
  };

  const todayActions = buildTodayActionsFromMeetingConfirm({
    nextActions: input.nextActions,
    action: row.action ?? undefined,
    validationPlan: planBundle.hypothesis.statement,
    judgement: row.judgement,
  });

  const actionPlan: ActionPlan = {
    planId: `ap_exec_${decisionId}`,
    missionId: `mission_${decisionId}`,
    agentId: "execution",
    decisionId,
    goals: [
      {
        goalId: `g_exec_${decisionId}`,
        title: clip(row.judgement, 80),
        horizonDays: 7,
      },
    ],
    actions: todayActions.map((a) => ({
      actionId: a.actionId,
      title: a.title,
      owner: a.owner,
      status: a.status === "done" ? "done" : "planned",
      dueInDays: a.dueInDays,
    })),
    alignmentNotes: [],
    communicationDrafts: [],
    validationTaskId: planBundle.task.id,
    validationHypothesis: planBundle.hypothesis.statement,
    summary: clip(
      `执行：${row.judgement} · ${todayActions.length} 项行动 · 验证已挂接`,
      120,
    ),
    createdAt: new Date().toISOString(),
  };

  const nextMk: MKDecisionStatus =
    mkStatus === "APPROVED" ? "EXECUTING" : mkStatus;

  const nextOutcome = mergeMkStatusIntoOutcome(row.outcome, nextMk, {
    actionPlanId: actionPlan.planId,
    validationTask: planBundle.task,
    executionStartedAt: new Date().toISOString(),
    d7ReviewDueAt,
    d7ReviewStatus: "pending",
  });

  await prisma.decision.update({
    where: { id: decisionId },
    data: { outcome: nextOutcome },
  });

  const { sourceEventId } = await emitDecisionRuntimeEvent(prisma, {
    decisionId,
    eventType: "ExecutionStarted",
    sourceEventId: `ExecutionStarted:${decisionId}:${actionPlan.planId}`,
    payload: {
      mkStatus: nextMk,
      actionPlanId: actionPlan.planId,
      validationTaskId: planBundle.task.id,
      projectId: input.projectId,
    },
  });

  const existingTasks = asTasks(input.profile.validationTasks);
  const nextProfile: Record<string, unknown> = {
    ...input.profile,
    lastMeetingDecisionId: decisionId,
    lastActionPlan: {
      planId: actionPlan.planId,
      decisionId,
      summary: actionPlan.summary,
      goals: actionPlan.goals,
      actions: actionPlan.actions,
      alignmentNotes: [],
      validationTaskId: planBundle.task.id,
      d7ReviewDueAt,
      d7ReviewStatus: "pending",
      createdAt: actionPlan.createdAt,
    },
    validationTasks: upsertValidationTask(existingTasks, planBundle.task),
    activeValidationTaskId: planBundle.task.id,
  };

  return {
    result: {
      decisionId,
      mkStatus: nextMk,
      actionPlan,
      validationTask: planBundle.task,
      sourceEventId,
    },
    nextProfile,
  };
}
