/**
 * Decision Candidate V1 — Signal 升格层（非 Prisma 表）
 * 权威：MEALKEY_DECISION_EXPERIENCE_V1.md · Engineering Blueprint Phase 0
 *
 * Signal → Candidate → DecisionCase
 * 不是所有 Signal 都进入决策室。
 */

import type { DecisionHorizonV1 } from "./business-identity";
import type { DecisionReadinessV1 } from "./business-identity";

export type DecisionCandidateStatusV1 =
  | "open"
  | "promoted"
  | "dismissed"
  | "watching";

export type DecisionCandidateV1 = {
  candidateId: string;
  projectId: string;
  signalIds: string[];
  /** 建议老板判断的问题（进 Case.question） */
  question: string;
  /** 卡片标题（可与 question 同或更短） */
  title: string;
  whyNow: string;
  impactStars: 1 | 2 | 3 | 4 | 5;
  urgencyStars: 1 | 2 | 3 | 4 | 5;
  horizonFit: DecisionHorizonV1 | null;
  /** 0–100；≥ PROMOTE_SCORE_THRESHOLD 建议升格 */
  promoteScore: number;
  readiness?: DecisionReadinessV1;
  recommendedAction?: string;
  status: DecisionCandidateStatusV1;
  /** 升格后 ≡ Prisma Decision.id ≡ MKDecision.id */
  caseId?: string;
  createdAt: string;
};

export const PROMOTE_SCORE_THRESHOLD = 55;

export function shouldPromoteCandidate(
  c: Pick<DecisionCandidateV1, "promoteScore" | "status">,
): boolean {
  return c.status === "open" && c.promoteScore >= PROMOTE_SCORE_THRESHOLD;
}
