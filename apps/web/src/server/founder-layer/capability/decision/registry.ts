/**
 * Decision Runtime Registry — 登记 / 批准收口 / 投影 MKDecision
 */

import type { PrismaClient } from "@/generated/prisma";
import type {
  MKDecision,
  MKDecisionStatus,
  MKEvidence,
  DecisionOpinion,
} from "../../contracts/mk-decision";
import type { FounderMemoryWrite } from "../../contracts/memory";
import { stampMemoryLayer } from "../../contracts/memory-runtime";
import { emitDecisionRuntimeEvent } from "./events";
import { mapToMkDecisionStatus, mkStatusFromOutcome } from "./status-map";

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function defaultReviewAt(from = new Date(), days = 90): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** 合并 outcome：写入 mkStatus + review，保留原字段 */
export function mergeMkStatusIntoOutcome(
  previousOutcome: unknown,
  mkStatus: MKDecisionStatus,
  extras?: Record<string, unknown>,
): string {
  const prev = asRecord(previousOutcome);
  const review =
    prev.review && typeof prev.review === "object"
      ? (prev.review as Record<string, unknown>)
      : {};
  return JSON.stringify({
    ...prev,
    ...extras,
    status: prev.status ?? mkStatus.toLowerCase(),
    mkStatus,
    review: {
      nextReviewAt: review.nextReviewAt || defaultReviewAt(),
      lastReviewAt: review.lastReviewAt ?? null,
      reviewQuestion:
        review.reviewQuestion ||
        "三个月前这个战略假设，现在成立吗？",
      ...review,
    },
  });
}

export type PrismaDecisionRow = {
  id: string;
  ownerId: string;
  projectId: string | null;
  problem: string;
  observation: string;
  diagnosis: string;
  judgement: string;
  strategy: string;
  action: string;
  confidence: number;
  evidence: string;
  outcome: string | null;
  learning: string | null;
  agentId: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
};

/** 从 Prisma Decision 行投影 MKDecision（读模型） */
export function projectMkDecision(row: PrismaDecisionRow): MKDecision {
  const outcome = asRecord(row.outcome);
  const status = mkStatusFromOutcome(row.outcome, "DRAFT");

  let evidence: MKEvidence[] = [];
  try {
    const raw = JSON.parse(row.evidence || "[]") as Array<Record<string, unknown>>;
    if (Array.isArray(raw)) {
      evidence = raw.map((e, i) => ({
        id: String(e.id || `ev_${i}`),
        type: (["market", "financial", "user", "experience", "case"].includes(
          String(e.type || ""),
        )
          ? String(e.type)
          : "experience") as MKEvidence["type"],
        source: String(e.source || "unknown"),
        confidence:
          typeof e.confidence === "number"
            ? e.confidence
            : typeof e.relevance === "number"
              ? e.relevance
              : 0.5,
        content: String(e.content || e.label || ""),
      }));
    }
  } catch {
    evidence = [];
  }

  const opinions = Array.isArray(outcome.opinions)
    ? (outcome.opinions as DecisionOpinion[])
    : [];

  const validationTask = outcome.validationTask as
    | { id?: string; taskId?: string }
    | undefined;
  const validationTaskIds: string[] = [];
  if (validationTask?.id) validationTaskIds.push(String(validationTask.id));
  else if (validationTask?.taskId) {
    validationTaskIds.push(String(validationTask.taskId));
  }

  const sourceType =
    row.type === "meeting"
      ? "founder"
      : outcome.council
        ? "council"
        : "agent";

  return {
    id: row.id,
    projectId: row.projectId || "",
    ownerId: row.ownerId,
    title: clip(row.problem, 120) || "未命名决策",
    description: clip(row.observation || row.diagnosis || "", 500),
    hypothesis: outcome.validationHypothesis
      ? String(
          (outcome.validationHypothesis as { statement?: string }).statement ||
            "",
        ) || undefined
      : typeof outcome.hypothesis === "string"
        ? outcome.hypothesis
        : undefined,
    conclusion: clip(row.judgement || row.strategy || "", 500),
    source: {
      type: sourceType,
      agent: row.agentId || undefined,
      meetingId:
        typeof outcome.meetingTitle === "string" ? undefined : undefined,
      contractId:
        outcome.decisionContract &&
        typeof outcome.decisionContract === "object"
          ? String(
              (outcome.decisionContract as { decisionId?: string }).decisionId ||
                "",
            ) || undefined
          : undefined,
      packId:
        typeof outcome.packId === "string" ? outcome.packId : undefined,
    },
    evidence,
    opinions,
    risks: Array.isArray(outcome.risks)
      ? (outcome.risks as MKDecision["risks"])
      : [],
    confidence: row.confidence,
    council:
      outcome.council && typeof outcome.council === "object"
        ? (outcome.council as MKDecision["council"])
        : undefined,
    status,
    links: {
      actionPlanId:
        typeof outcome.actionPlanId === "string"
          ? outcome.actionPlanId
          : null,
      validationTaskIds,
      supersededBy:
        typeof outcome.supersededBy === "string"
          ? outcome.supersededBy
          : null,
      supersedes:
        typeof outcome.supersedes === "string" ? outcome.supersedes : null,
    },
    review:
      outcome.review && typeof outcome.review === "object"
        ? (outcome.review as MKDecision["review"])
        : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * 会议确认批准：写 mkStatus + DecisionApproved 事件。
 * 不替代 createDecision；在 confirmFromMeeting 末尾调用。
 */
export async function recordDecisionApproved(
  prisma: PrismaClient,
  input: {
    decisionId: string;
    /** 当前 outcome JSON 字符串或对象 */
    previousOutcome?: unknown;
    hypothesis?: string;
    confirmMode?: "formal" | "hypothesis";
    sourceEventId?: string;
  },
): Promise<{ mkStatus: MKDecisionStatus; sourceEventId: string }> {
  const mkStatus: MKDecisionStatus = "APPROVED";

  const nextOutcome = mergeMkStatusIntoOutcome(
    input.previousOutcome,
    mkStatus,
    {
      hypothesis: input.hypothesis,
      confirmMode: input.confirmMode,
      approvedAt: new Date().toISOString(),
    },
  );

  await prisma.decision.update({
    where: { id: input.decisionId },
    data: { outcome: nextOutcome },
  });

  const { sourceEventId } = await emitDecisionRuntimeEvent(prisma, {
    decisionId: input.decisionId,
    eventType: "DecisionApproved",
    sourceEventId:
      input.sourceEventId || `DecisionApproved:${input.decisionId}`,
    payload: {
      mkStatus,
      confirmMode: input.confirmMode ?? null,
      hypothesis: input.hypothesis ?? null,
    },
  });

  return { mkStatus, sourceEventId };
}

/**
 * 校验外键：必须是持久 Decision.id（Prisma cuid 等）。
 * 拒绝 packId / 合约临时 id / capability buildId 短码。
 */
export function assertPrismaDecisionId(decisionId: string): string {
  const id = String(decisionId || "").trim();
  if (!id) throw new Error("decisionId 不能为空");
  if (/^(dp-|D-|pack_|ap_)/i.test(id)) {
    throw new Error(
      `decisionId 必须是 Prisma Decision.id，禁止使用 packId/合约临时 id：${id}`,
    );
  }
  // capability buildId("dec"|"dp"|"ap") → dec_xxxxxxxx
  if (/^(dec|dp|ap)_[a-f0-9]{6,12}$/i.test(id)) {
    throw new Error(
      `decisionId 必须是 Prisma Decision.id，禁止使用运行时临时 id：${id}`,
    );
  }
  if (id.length < 8) {
    throw new Error(`decisionId 无效：${id}`);
  }
  return id;
}

/** 不抛错版本：合法返回 id，否则 null */
export function tryPrismaDecisionId(decisionId: unknown): string | null {
  try {
    return assertPrismaDecisionId(String(decisionId || ""));
  } catch {
    return null;
  }
}

export function resolveMkStatusLabel(status: MKDecisionStatus): string {
  const labels: Record<MKDecisionStatus, string> = {
    DRAFT: "草案",
    ANALYSIS: "分析中",
    COUNCIL_REVIEW: "常委审议",
    APPROVED: "已批准",
    EXECUTING: "执行中",
    VALIDATING: "验证中",
    LEARNED: "已沉淀",
    ARCHIVED: "已归档",
  };
  return labels[status] || status;
}

/**
 * E3：验证收口 → LEARNED + DecisionLearned / ValidationCompleted 事件
 */
export async function markDecisionLearned(
  prisma: PrismaClient,
  input: {
    decisionId: string;
    projectId: string;
    result: "aligned" | "partial" | "off";
    impact: "confirmed" | "partial" | "invalidated";
    summary: string;
    learning?: string;
    validationTaskId?: string;
    resultEvidenceId?: string;
    /** 覆盖写入 learning 列的 JSON */
    learningRecord?: Record<string, unknown>;
  },
): Promise<{
  mkStatus: MKDecisionStatus;
  sourceEventIds: string[];
  memoryWrite: FounderMemoryWrite;
}> {
  const decisionId = assertPrismaDecisionId(input.decisionId);
  const row = await prisma.decision.findFirst({
    where: { id: decisionId, projectId: input.projectId },
  });
  if (!row) {
    throw new Error("决策不存在或不属于本项目");
  }

  const mkStatus: MKDecisionStatus = "LEARNED";
  const legacyStatus =
    input.impact === "confirmed"
      ? "validated"
      : input.impact === "partial"
        ? "adjusted"
        : "revisiting";

  const nextOutcome = mergeMkStatusIntoOutcome(row.outcome, mkStatus, {
    status: legacyStatus,
    result: input.result,
    impact: input.impact,
    resultEvidenceId: input.resultEvidenceId,
    feedbackAt: new Date().toISOString(),
    learnedAt: new Date().toISOString(),
    lesson: input.learning || input.summary,
  });

  const learningJson = JSON.stringify({
    type: "decision_learned",
    summary: input.summary,
    result: input.result,
    impact: input.impact,
    taskId: input.validationTaskId,
    resultEvidenceId: input.resultEvidenceId,
    lesson: input.learning || input.summary,
    mkStatus,
    ...(input.learningRecord || {}),
  });

  await prisma.decision.update({
    where: { id: decisionId },
    data: {
      outcome: nextOutcome,
      learning: learningJson,
    },
  });

  const sourceEventIds: string[] = [];
  const validationEvent = await emitDecisionRuntimeEvent(prisma, {
    decisionId,
    eventType: "ValidationCompleted",
    sourceEventId: `ValidationCompleted:${decisionId}:${input.validationTaskId || "na"}`,
    payload: {
      result: input.result,
      impact: input.impact,
      summary: input.summary,
      projectId: input.projectId,
    },
  });
  sourceEventIds.push(validationEvent.sourceEventId);

  const learnedEvent = await emitDecisionRuntimeEvent(prisma, {
    decisionId,
    eventType: "DecisionLearned",
    sourceEventId: `DecisionLearned:${decisionId}`,
    payload: {
      mkStatus,
      impact: input.impact,
      lesson: input.learning || input.summary,
      projectId: input.projectId,
    },
  });
  sourceEventIds.push(learnedEvent.sourceEventId);

  const createdAt = new Date().toISOString();
  const writeId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `mw_${crypto.randomUUID().slice(0, 8)}`
      : `mw_${Date.now().toString(36)}`;

  return {
    mkStatus,
    sourceEventIds,
    memoryWrite: stampMemoryLayer({
      writeId,
      projectId: input.projectId,
      type: "learning",
      domain: "mixed",
      summary: clip(
        `决策已沉淀：${input.learning || input.summary}`,
        140,
      ),
      payload: {
        decisionId,
        mkStatus,
        result: input.result,
        impact: input.impact,
        validationTaskId: input.validationTaskId,
        resultEvidenceId: input.resultEvidenceId,
      },
      source: "decision_engine",
      createdAt,
    }),
  };
}

export { mapToMkDecisionStatus, mkStatusFromOutcome };
export { emitDecisionRuntimeEvent } from "./events";
