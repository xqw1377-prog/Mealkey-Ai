/**
 * Founder OS Debate Contract V1
 * Debate Engine = 决策压力测试：发现冲突、放大风险、推动共识。
 * 不生成观点，只组织冲突与收口。
 */

import type { FounderAgentName } from "./mission";
import type { ConflictMatrix } from "./debate";

export type DebateCommitteeId = "market" | "brand" | "business" | "capital";

export type DebateSessionStatus = "opening" | "challenging" | "synthesis" | "closed";

export type DebateRoundKind = "independent" | "challenge" | "synthesis";

export type ChallengeType = "evidence" | "logic" | "assumption" | "risk";

export type ConflictSeverity = "low" | "medium" | "high";

export interface DebateRoundItem {
  agent: FounderAgentName;
  committee: DebateCommitteeId;
  claimId?: string;
  claim: string;
  position: "support" | "oppose" | "conditional" | "neutral";
  confidence: number;
  evidenceRefs: string[];
  summary: string;
}

export interface DebateChallenge {
  challengeId: string;
  fromCommittee: DebateCommitteeId;
  fromAgent: FounderAgentName;
  targetCommittee: DebateCommitteeId;
  targetAgent: FounderAgentName;
  targetClaimId?: string;
  /** Round2 强制：点名对方证据 ID */
  targetEvidenceId?: string;
  challengeType: ChallengeType;
  statement: string;
  evidenceRefs?: string[];
}

export interface DebateConflict {
  conflictId: string;
  topic: string;
  severity: ConflictSeverity;
  committees: DebateCommitteeId[];
  evidenceRefs: string[];
  summary: string;
}

export interface DebateRound {
  round: 1 | 2 | 3;
  kind: DebateRoundKind;
  title: string;
  items: DebateRoundItem[];
  challenges?: DebateChallenge[];
  conflicts?: DebateConflict[];
}

export interface DecisionProposal {
  decision: string;
  whyNow: string;
  tradeoffs: string[];
  conditions: string[];
  risksAccepted: string[];
  validationPlan: string;
}

export interface ScenarioTest {
  scenarioId: string;
  scenario: string;
  trigger: string;
  impact: string;
  mitigation: string;
}

export interface DebateSession {
  debateId: string;
  missionId: string;
  decisionId?: string;
  status: DebateSessionStatus;
  rounds: DebateRound[];
  conflictMatrix?: ConflictMatrix;
  conflicts: DebateConflict[];
  challenges: DebateChallenge[];
  proposal?: DecisionProposal;
  scenarioTests: ScenarioTest[];
  createdAt: string;
  updatedAt: string;
}

/** 专业挑战路由：谁优先质疑谁 */
export const DEBATE_CHALLENGE_ROUTES: Record<DebateCommitteeId, DebateCommitteeId[]> = {
  market: ["business", "capital"],
  brand: ["market"],
  business: ["market", "capital"],
  capital: ["business"],
};

export const COMMITTEE_FROM_AGENT: Record<FounderAgentName, DebateCommitteeId> = {
  "M-MKT": "market",
  "M-PNT": "brand",
  "M-BIZ": "business",
  "M-ED": "capital",
};

export const AGENT_FROM_COMMITTEE: Record<DebateCommitteeId, FounderAgentName> = {
  market: "M-MKT",
  brand: "M-PNT",
  business: "M-BIZ",
  capital: "M-ED",
};

export const CHALLENGE_TYPE_LABEL: Record<ChallengeType, string> = {
  evidence: "证据挑战",
  logic: "逻辑挑战",
  assumption: "假设挑战",
  risk: "风险挑战",
};
