import {
  CASE_OUTCOME_KEY,
  CONTEXT_OUTCOME_KEY,
  DIE_OUTCOME_KEY,
  SCORES_OUTCOME_KEY,
  TRACE_OUTCOME_KEY,
  type DecisionAssessmentV1,
  type DecisionCaseV1,
  type DecisionContextV1,
  type DecisionIntelligenceRunV1,
  type DecisionTraceV1,
  type MkDecisionOutcomeDieBundleV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import type { MKDecisionStatus } from "@/server/founder-layer/contracts/mk-decision";

export function parseDecisionOutcome(
  raw: string | null | undefined,
): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : { result: raw };
  } catch {
    return { result: raw };
  }
}

export function mergeDecisionOutcome(
  previous: string | null | undefined,
  patch: Record<string, unknown>,
): string {
  const prev = parseDecisionOutcome(previous);
  return JSON.stringify({
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export function readDieBundle(
  outcomeRaw: string | null | undefined,
): MkDecisionOutcomeDieBundleV1 {
  const o = parseDecisionOutcome(outcomeRaw);
  return {
    case: o[CASE_OUTCOME_KEY] as DecisionCaseV1 | undefined,
    die: o[DIE_OUTCOME_KEY] as DecisionIntelligenceRunV1 | undefined,
    contextSnapshot: o[CONTEXT_OUTCOME_KEY] as DecisionContextV1 | undefined,
    scores: o[SCORES_OUTCOME_KEY] as
      | { pre?: DecisionAssessmentV1; post?: DecisionAssessmentV1 }
      | undefined,
    trace: o[TRACE_OUTCOME_KEY] as DecisionTraceV1 | undefined,
  };
}

export function withMkStatus(
  previous: string | null | undefined,
  mkStatus: MKDecisionStatus,
  patch: Record<string, unknown> = {},
): string {
  return mergeDecisionOutcome(previous, {
    ...patch,
    mkStatus,
    status: mkStatus.toLowerCase(),
  });
}
