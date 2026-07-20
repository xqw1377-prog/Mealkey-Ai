/**
 * Challenge Report V1 — 七常委退后、判断前置
 * 权威：MEALKEY_DECISION_EXPERIENCE_V1 Challenge Layer
 */

export type ChallengeDomainV1 =
  | "finance"
  | "operations"
  | "market"
  | "strategy"
  | "organization"
  | "other";

export type ChallengeItemV1 = {
  domain: ChallengeDomainV1;
  /** 老板可见短标签，如「财务风险」 */
  label: string;
  /** 一句话挑战 */
  summary: string;
  severity: "low" | "medium" | "high";
  sourceRoleIds: string[];
  sourceClaims: string[];
};

export type ChallengeReportV1 = {
  schemaVersion: 1;
  decisionId?: string;
  optionId?: string;
  optionName?: string;
  challengeCount: number;
  items: ChallengeItemV1[];
  missingEvidence: string[];
  conditions: string[];
  /** 一句总述 */
  headline: string;
};

export const CHALLENGE_DOMAIN_LABEL: Record<ChallengeDomainV1, string> = {
  finance: "财务风险",
  operations: "运营风险",
  market: "市场风险",
  strategy: "战略风险",
  organization: "组织风险",
  other: "其他挑战",
};
