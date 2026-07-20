/**
 * Decision Runtime — MKDecision 规范契约（V1）
 * 持久 ID ≡ Prisma Decision.id
 */

export type DecisionSourceType = "agent" | "council" | "founder";

/** 主状态机（产品/工程唯一真源） */
export type MKDecisionStatus =
  | "DRAFT"
  | "ANALYSIS"
  | "COUNCIL_REVIEW"
  | "APPROVED"
  | "EXECUTING"
  | "VALIDATING"
  | "LEARNED"
  | "ARCHIVED";

/** UI/早期简写 → 主状态（见 mapShorthandToMkStatus） */
export type MKDecisionStatusShorthand =
  | "draft"
  | "reviewing"
  | "approved"
  | "executing"
  | "validated"
  | "closed";

export type MKEvidenceType =
  | "market"
  | "financial"
  | "user"
  | "experience"
  | "case";

export type MKEvidence = {
  id: string;
  type: MKEvidenceType;
  source: string;
  confidence: number;
  content: string;
};

export type DecisionOpinionExpert = "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";

export type DecisionOpinion = {
  decisionId: string;
  expert: DecisionOpinionExpert;
  position: "support" | "oppose" | "neutral";
  reason: string;
  confidence: number;
  evidenceIds: string[];
};

export type CouncilDecision = {
  voteResult: Array<{
    member: string;
    vote: "yes" | "no";
    comment?: string;
  }>;
  finalDecision: string;
  minorityOpinion: string;
  riskStatement: string;
};

export type MKDecisionSource = {
  type: DecisionSourceType;
  agent?: DecisionOpinionExpert | string;
  meetingId?: string;
  contractId?: string;
  packId?: string;
};

export type MKDecision = {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  description: string;
  hypothesis?: string;
  conclusion: string;
  source: MKDecisionSource;
  evidence: MKEvidence[];
  opinions: DecisionOpinion[];
  risks: Array<{ label: string; severity?: "low" | "medium" | "high" }>;
  confidence: number;
  council?: CouncilDecision;
  status: MKDecisionStatus;
  links: {
    actionPlanId?: string | null;
    validationTaskIds: string[];
    supersededBy?: string | null;
    supersedes?: string | null;
  };
  review?: {
    nextReviewAt?: string;
    lastReviewAt?: string | null;
    reviewQuestion?: string;
  };
  createdAt: string;
  updatedAt: string;
};

/** Decision Runtime 稳定事件名 */
export type DecisionRuntimeEventType =
  | "DecisionCreated"
  | "DecisionAnalyzed"
  | "ExpertOpinionSubmitted"
  | "CouncilStarted"
  | "DecisionApproved"
  | "ExecutionStarted"
  | "ValidationCompleted"
  | "DecisionLearned";
