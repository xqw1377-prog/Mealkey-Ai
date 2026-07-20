/**
 * Decision Memory — 企业 Decision Intelligence Database 单元
 */

import type {
  DecisionBrief,
  DecisionMemory,
  DecisionResolution,
} from "./types";

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

export function createDecisionMemory(input: {
  caseId: string;
  briefId?: string;
  resolution: DecisionResolution;
  majorityView?: string[];
  minorityReport?: string[];
  founderOverride?: DecisionBrief["founderOverride"];
}): DecisionMemory {
  const finalAction =
    input.founderOverride?.finalAction ?? input.resolution.recommended_action;

  return {
    memoryId: buildId("DM"),
    caseId: input.caseId,
    briefId: input.briefId,
    decision: finalAction,
    rationale: [
      ...(input.majorityView ?? input.resolution.majority_view),
      ...(input.resolution.required_conditions || []).map((c) => `条件：${c}`),
    ],
    objections: [
      ...(input.minorityReport ?? input.resolution.minority_report),
      ...(input.resolution.veto_flags || []).map((v) => `红线：${v}`),
    ],
    resolutionSnapshot: input.resolution,
    founderOverride: input.founderOverride,
    outcome: {
      whoWasRight: "unknown",
    },
    createdAt: new Date().toISOString(),
  };
}

export function memoryFromBrief(brief: DecisionBrief): DecisionMemory {
  return createDecisionMemory({
    caseId: brief.casePacket.caseId,
    briefId: brief.briefId,
    resolution: brief.resolution,
    founderOverride: brief.founderOverride,
  });
}

export function closeDecisionMemory(
  memory: DecisionMemory,
  outcome: NonNullable<DecisionMemory["outcome"]>,
): DecisionMemory {
  return {
    ...memory,
    outcome: { ...memory.outcome, ...outcome },
    closedAt: new Date().toISOString(),
  };
}
