/**
 * 会议确认 → Decision Runtime：写入 Opinion / Evidence（产品闭环）
 */

import type { PrismaClient } from "@/generated/prisma";
import type {
  DecisionOpinionExpert,
  DecisionOpinion,
} from "../../contracts/mk-decision";
import {
  appendDecisionEvidence,
  appendDecisionOpinion,
} from "./opinions";

export type MeetingExpertOpinionInput = {
  expert: DecisionOpinionExpert;
  position: DecisionOpinion["position"];
  reason: string;
  confidence?: number;
};

const EXPERT_CYCLE: DecisionOpinionExpert[] = [
  "M-PNT",
  "M-MKT",
  "M-BIZ",
  "M-ED",
];

/**
 * 从会议共识声明与可选专家意见，种子化 MKDecision 意见/证据。
 * 失败不抛到主流程（调用方 catch）。
 */
export async function seedDecisionArtifactsFromMeeting(
  prisma: PrismaClient,
  input: {
    decisionId: string;
    projectId: string;
    supportClaims?: string[];
    opposeClaims?: string[];
    expertOpinions?: MeetingExpertOpinionInput[];
  },
): Promise<{ opinionCount: number; evidenceCount: number }> {
  let opinionCount = 0;
  let evidenceCount = 0;

  const experts = input.expertOpinions?.length
    ? input.expertOpinions
    : buildFallbackOpinions(input.supportClaims || [], input.opposeClaims || []);

  for (const op of experts.slice(0, 8)) {
    const reason = (op.reason || "").trim();
    if (!reason) continue;
    await appendDecisionOpinion(prisma, {
      decisionId: input.decisionId,
      projectId: input.projectId,
      expert: op.expert,
      position: op.position,
      reason,
      confidence: op.confidence,
    });
    opinionCount += 1;
  }

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
    await appendDecisionEvidence(prisma, {
      decisionId: input.decisionId,
      projectId: input.projectId,
      type: "experience",
      source: `meeting:${claim.stance}`,
      content,
      confidence: claim.stance === "support" ? 0.75 : 0.7,
    });
    evidenceCount += 1;
  }

  return { opinionCount, evidenceCount };
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
