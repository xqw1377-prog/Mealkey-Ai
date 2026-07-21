/**
 * 会议确认 → Decision Runtime：写入 Opinion / Evidence（产品闭环）
 */

import type { PrismaClient } from "@/generated/prisma";
import type {
  DecisionOpinionExpert,
  DecisionOpinion,
  MKEvidence,
} from "../../contracts/mk-decision";
import { assertPrismaDecisionId } from "./registry";
import { emitDecisionRuntimeEvent } from "./events";

export type MeetingExpertOpinionInput = {
  expert: DecisionOpinionExpert;
  position: DecisionOpinion["position"];
  reason: string;
  confidence?: number;
};

export type MeetingDecisionRow = {
  id: string;
  projectId: string | null;
  outcome?: string | null;
  evidence?: string | null;
  problem?: string;
  judgement?: string;
  action?: string | null;
  confidence?: number | null;
};

const EXPERT_CYCLE: DecisionOpinionExpert[] = [
  "M-PNT",
  "M-MKT",
  "M-BIZ",
  "M-ED",
];

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

function parseEvidenceArray(raw: unknown): MKEvidence[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as MKEvidence[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? (raw as MKEvidence[]) : [];
}

/**
 * 解析会议刚创建/更新的 Decision 行：优先用调用方快照，避免二次 findFirst 丢关联。
 * 若仅有 id 命中但 projectId 为空，则回写绑定到本项目。
 */
async function resolveMeetingDecisionRow(
  prisma: PrismaClient,
  input: {
    decisionId: string;
    projectId: string;
    decisionRow?: MeetingDecisionRow;
  },
): Promise<MeetingDecisionRow> {
  const decisionId = assertPrismaDecisionId(input.decisionId);

  if (input.decisionRow?.id === decisionId) {
    let row = input.decisionRow;
    if (!row.projectId) {
      row = {
        ...row,
        ...(await prisma.decision.update({
          where: { id: decisionId },
          data: { projectId: input.projectId },
          select: {
            id: true,
            projectId: true,
            outcome: true,
            evidence: true,
            problem: true,
            judgement: true,
            action: true,
            confidence: true,
          },
        })),
      };
    } else if (row.projectId !== input.projectId) {
      throw new Error("决策不存在或不属于本项目");
    }
    return { ...row, projectId: row.projectId || input.projectId };
  }

  let row = await prisma.decision.findFirst({
    where: { id: decisionId, projectId: input.projectId },
    select: {
      id: true,
      projectId: true,
      outcome: true,
      evidence: true,
      problem: true,
      judgement: true,
      action: true,
      confidence: true,
    },
  });

  if (!row) {
    const orphan = await prisma.decision.findFirst({
      where: { id: decisionId },
      select: {
        id: true,
        projectId: true,
        outcome: true,
        evidence: true,
        problem: true,
        judgement: true,
        action: true,
        confidence: true,
      },
    });
    if (!orphan) throw new Error("决策不存在或不属于本项目");
    if (orphan.projectId && orphan.projectId !== input.projectId) {
      throw new Error("决策不存在或不属于本项目");
    }
    row = orphan.projectId
      ? orphan
      : await prisma.decision.update({
          where: { id: decisionId },
          data: { projectId: input.projectId },
          select: {
            id: true,
            projectId: true,
            outcome: true,
            evidence: true,
            problem: true,
            judgement: true,
            action: true,
            confidence: true,
          },
        });
  }

  return row;
}

/**
 * 从会议共识声明与可选专家意见，种子化 MKDecision 意见/证据。
 * 失败不抛到主流程（调用方 catch）。
 */
export async function seedDecisionArtifactsFromMeeting(
  prisma: PrismaClient,
  input: {
    decisionId: string;
    projectId: string;
    /** 会议刚写入的 Decision 快照，避免二次查询找不到刚创建的行 */
    decisionRow?: MeetingDecisionRow;
    supportClaims?: string[];
    opposeClaims?: string[];
    expertOpinions?: MeetingExpertOpinionInput[];
  },
): Promise<{
  opinionCount: number;
  evidenceCount: number;
  outcome: string;
}> {
  let opinionCount = 0;
  let evidenceCount = 0;

  const row = await resolveMeetingDecisionRow(prisma, {
    decisionId: input.decisionId,
    projectId: input.projectId,
    decisionRow: input.decisionRow,
  });
  const decisionId = row.id;
  const outcome = asRecord(row.outcome);

  const experts = input.expertOpinions?.length
    ? input.expertOpinions
    : buildFallbackOpinions(input.supportClaims || [], input.opposeClaims || []);

  const opinions = Array.isArray(outcome.opinions)
    ? ([...outcome.opinions] as DecisionOpinion[])
    : [];

  for (const op of experts.slice(0, 8)) {
    const reason = (op.reason || "").trim();
    if (!reason) continue;
    const opinion: DecisionOpinion = {
      decisionId,
      expert: op.expert,
      position: op.position,
      reason: reason.slice(0, 400),
      confidence: typeof op.confidence === "number" ? op.confidence : 0.7,
      evidenceIds: [],
    };
    opinions.push(opinion);
    opinionCount += 1;
    await emitDecisionRuntimeEvent(prisma, {
      decisionId,
      eventType: "ExpertOpinionSubmitted",
      sourceEventId: `ExpertOpinionSubmitted:${decisionId}:${opinion.expert}:${opinions.length}`,
      payload: { expert: opinion.expert, position: opinion.position },
    }).catch(() => undefined);
  }
  outcome.opinions = opinions.slice(-20);

  const evidence = parseEvidenceArray(row.evidence);
  const claimPairs: Array<{ content: string; stance: "support" | "oppose" }> = [
    ...(input.supportClaims || []).map((content) => ({
      content,
      stance: "support" as const,
    })),
    ...(input.opposeClaims || []).map((content) => ({
      content,
      stance: "oppose" as const,
    })),
  ];

  for (const claim of claimPairs.slice(0, 12)) {
    const content = claim.content.trim();
    if (!content) continue;
    const item: MKEvidence = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `ev_${crypto.randomUUID().slice(0, 8)}`
          : `ev_${Date.now().toString(36)}_${evidenceCount}`,
      type: "experience",
      source: `meeting:${claim.stance}`,
      content: content.slice(0, 400),
      confidence: claim.stance === "support" ? 0.75 : 0.7,
    };
    evidence.push(item);
    evidenceCount += 1;
    await emitDecisionRuntimeEvent(prisma, {
      decisionId,
      eventType: "DecisionAnalyzed",
      sourceEventId: `EvidenceAppended:${decisionId}:${item.id}`,
      payload: { evidenceId: item.id, type: item.type },
    }).catch(() => undefined);
  }

  const outcomeJson = JSON.stringify(outcome);
  await prisma.decision.update({
    where: { id: decisionId },
    data: {
      projectId: input.projectId,
      outcome: outcomeJson,
      evidence: JSON.stringify(evidence.slice(-40)),
    },
  });

  return { opinionCount, evidenceCount, outcome: outcomeJson };
}

function buildFallbackOpinions(
  support: string[],
  oppose: string[],
): MeetingExpertOpinionInput[] {
  const out: MeetingExpertOpinionInput[] = [];
  support.slice(0, 4).forEach((reason, i) => {
    out.push({
      expert: EXPERT_CYCLE[i % EXPERT_CYCLE.length],
      position: "support",
      reason,
      confidence: 0.72,
    });
  });
  oppose.slice(0, 4).forEach((reason, i) => {
    out.push({
      expert: EXPERT_CYCLE[(i + 2) % EXPERT_CYCLE.length],
      position: "oppose",
      reason,
      confidence: 0.7,
    });
  });
  // 无声明时仍留一条中性存档，保证 Decision 有意见轨
  if (!out.length) {
    out.push({
      expert: "M-PNT",
      position: "neutral",
      reason: "会议确认决策，专家意见摘要待补全",
      confidence: 0.5,
    });
  }
  return out;
}
