/**
 * 旧枚举 / outcome.status / UI 简写 → MKDecisionStatus
 */

import type {
  MKDecisionStatus,
  MKDecisionStatusShorthand,
} from "../../contracts/mk-decision";

const SHORTHAND: Record<MKDecisionStatusShorthand, MKDecisionStatus> = {
  draft: "DRAFT",
  reviewing: "ANALYSIS",
  approved: "APPROVED",
  executing: "EXECUTING",
  validated: "LEARNED",
  closed: "ARCHIVED",
};

const DIRECT: Record<string, MKDecisionStatus> = {
  DRAFT: "DRAFT",
  ANALYSIS: "ANALYSIS",
  COUNCIL_REVIEW: "COUNCIL_REVIEW",
  APPROVED: "APPROVED",
  EXECUTING: "EXECUTING",
  VALIDATING: "VALIDATING",
  LEARNED: "LEARNED",
  ARCHIVED: "ARCHIVED",
  // decision-v2
  DEBATING: "ANALYSIS",
  READY_FOR_APPROVAL: "ANALYSIS",
  VALIDATION_REQUIRED: "VALIDATING",
  VALIDATED: "LEARNED",
  FAILED: "LEARNED",
  REVISED: "APPROVED",
  SUPERSEDED: "ARCHIVED",
  // FounderFinalDecision
  proposed: "ANALYSIS",
  accepted: "APPROVED",
  executing: "EXECUTING",
  verified: "LEARNED",
  // outcome.status 实践
  hypothesis: "APPROVED",
  validating: "VALIDATING",
  superseded: "ARCHIVED",
};

/**
 * 将任意历史/并存状态字符串映射到 MKDecisionStatus。
 * 无法识别时返回 fallback（默认 DRAFT）。
 */
export function mapToMkDecisionStatus(
  raw: unknown,
  fallback: MKDecisionStatus = "DRAFT",
): MKDecisionStatus {
  if (raw == null) return fallback;
  const s = String(raw).trim();
  if (!s) return fallback;

  const upper = s.toUpperCase();
  if (DIRECT[upper]) return DIRECT[upper];
  if (DIRECT[s]) return DIRECT[s];

  const lower = s.toLowerCase() as MKDecisionStatusShorthand;
  if (SHORTHAND[lower]) return SHORTHAND[lower];

  return fallback;
}

export function mapShorthandToMkStatus(
  shorthand: MKDecisionStatusShorthand,
): MKDecisionStatus {
  return SHORTHAND[shorthand];
}

/** 从 Prisma Decision.outcome JSON 解析 mkStatus（优先 mkStatus 字段） */
export function mkStatusFromOutcome(
  outcome: unknown,
  fallback: MKDecisionStatus = "DRAFT",
): MKDecisionStatus {
  if (!outcome) return fallback;
  let obj: Record<string, unknown> | null = null;
  if (typeof outcome === "string") {
    try {
      obj = JSON.parse(outcome) as Record<string, unknown>;
    } catch {
      return fallback;
    }
  } else if (typeof outcome === "object") {
    obj = outcome as Record<string, unknown>;
  }
  if (!obj) return fallback;
  if (obj.mkStatus != null) return mapToMkDecisionStatus(obj.mkStatus, fallback);
  return mapToMkDecisionStatus(obj.status, fallback);
}
