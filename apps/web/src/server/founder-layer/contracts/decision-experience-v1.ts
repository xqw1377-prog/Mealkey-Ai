/**
 * MealKey Decision Experience V1 — Phase 0 契约 SSOT 出口
 *
 * 权威：
 * - docs/MEALKEY_DECISION_EXPERIENCE_V1.md
 * - docs/MEALKEY_DECISION_EXPERIENCE_ENGINEERING_BLUEPRINT_V1.md
 *
 * 原则：不新建 Prisma 表 / 不新建 Runtime。
 * 持久决策行仍是 Prisma Decision；体验对象投影在 profile JSON + outcome JSON。
 */

// ─── 六核心对象 ───────────────────────────────────────────────

export type {
  BusinessIdentityV1,
  BusinessScopeKind,
  BusinessScopeTypeV1,
  DecisionFocusKind,
  DecisionHorizonV1,
  DecisionReadinessV1,
  DecisionReadinessStateV1,
} from "./business-identity";
export {
  FOCUS_LABEL,
  HORIZON_LABEL,
  READINESS_STATE_LABEL,
  SCOPE_LABEL,
  buildDecisionReadiness,
  deriveReadinessState,
  fromScopeType,
  identityExternalReady,
  parseLocationLine,
  storeCountFromBand,
  toScopeType,
} from "./business-identity";

export type { RestaurantDecisionContextV1 } from "./restaurant-decision-context";

export type {
  DecisionSignalV1,
  DecisionSignalSourceV1,
  DecisionSignalStatusV1,
  DecisionSignalTypeV1,
} from "./decision-signal";
export { toLegacyDieSignalShape } from "./decision-signal";

export type {
  DecisionCandidateV1,
  DecisionCandidateStatusV1,
} from "./decision-candidate";
export {
  PROMOTE_SCORE_THRESHOLD,
  shouldPromoteCandidate,
} from "./decision-candidate";

export type {
  DecisionCaseV1,
  DecisionCaseStatusV1,
  DecisionLearningV1,
  DecisionContextV1,
  DecisionOptionV1,
  DecisionAssessmentV1,
  DecisionTraceV1,
  DecisionPackageV1,
} from "./decision-intelligence-data-contract";

export type { DecisionInboxV1, DecisionInboxItemV1 } from "./decision-inbox";
export { emptyDecisionInbox } from "./decision-inbox";

export type {
  ChallengeReportV1,
  ChallengeItemV1,
  ChallengeDomainV1,
} from "./challenge-report";
export { CHALLENGE_DOMAIN_LABEL } from "./challenge-report";

export type { MKDecision, MKDecisionStatus } from "./mk-decision";

// ─── 与 MKDecision / Prisma 映射（冻结）────────────────────────

/**
 * 铁律：
 * DecisionCaseV1.id ≡ MKDecision.id ≡ Prisma Decision.id
 *
 * 落点：
 * - Case / Context / Options / Assessment / Trace / Learning 指针
 *   → Decision.outcome JSON（见 DIE CASE_OUTCOME_KEY 等）
 * - mkStatus → outcome.mkStatus（Decision Runtime）
 * - BusinessIdentity → project.profile.businessIdentity（无新表）
 * - Signal / Candidate → 可暂存 profile.decisionQueue 或仅内存投影；
 *   升格后才 createDecision
 */

import type { DecisionCaseStatusV1 } from "./decision-intelligence-data-contract";
import type { MKDecisionStatus } from "./mk-decision";

/** Case.status → mkStatus（与 mk-status-map 对齐，契约层复述） */
export const CASE_STATUS_TO_MK: Record<DecisionCaseStatusV1, MKDecisionStatus> =
  {
    DISCOVERED: "DRAFT",
    ANALYZING: "ANALYSIS",
    DELIBERATING: "COUNCIL_REVIEW",
    DECIDED: "APPROVED",
    EXECUTING: "EXECUTING",
    LEARNING: "LEARNED",
  };

export const MK_TO_CASE_STATUS: Partial<
  Record<MKDecisionStatus, DecisionCaseStatusV1>
> = {
  DRAFT: "DISCOVERED",
  ANALYSIS: "ANALYZING",
  COUNCIL_REVIEW: "DELIBERATING",
  APPROVED: "DECIDED",
  EXECUTING: "EXECUTING",
  VALIDATING: "EXECUTING",
  LEARNED: "LEARNING",
  ARCHIVED: "LEARNING",
};

/** profile JSON 键（V1 冻结） */
export const PROFILE_IDENTITY_KEY = "businessIdentity" as const;
export const PROFILE_SIGNAL_QUEUE_KEY = "decisionSignals" as const;
export const PROFILE_CANDIDATE_QUEUE_KEY = "decisionCandidates" as const;

/** Decision.outcome JSON 键 — 复用 DIE */
export {
  CASE_OUTCOME_KEY,
  CONTEXT_OUTCOME_KEY,
  DIE_OUTCOME_KEY,
  SCORES_OUTCOME_KEY,
  TRACE_OUTCOME_KEY,
} from "./decision-intelligence-data-contract";

/**
 * Experience 闭环对象 → 现有模块
 *
 * | Experience        | 现有落点                                      |
 * |-------------------|-----------------------------------------------|
 * | BusinessIdentity  | project.profile.businessIdentity + Brain       |
 * | RIP Snapshot      | project.profile.restaurantIntelligenceProfile |
 * | RestaurantContext | restaurant-brain loadAgentContext 投影        |
 * | DecisionSignal    | 规则引擎产出；暂存 profile 或 Scan 内存       |
 * | DecisionCandidate | candidate-promote；升格前不写 Decision 行     |
 * | DecisionCase      | Prisma Decision + outcome.case                |
 * | DecisionReadiness | assessment + readiness 纯函数                 |
 * | DecisionLearning  | outcome.learning + Brain LearningRecord       |
 * | Challenge         | Council Runtime → expertOpinions / Trace      |
 * | Execution         | M-EXEC createFromDecision                     |
 */
