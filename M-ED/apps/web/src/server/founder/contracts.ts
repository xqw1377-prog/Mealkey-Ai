/**
 * Founder Layer — 统一合同
 * 不动 M-PNT / M-MKT / M-BIZ / M-ED 内核；会议与决策只消费本合同。
 */

export type FounderAgentId = "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED" | "CHIEF";

export type ForceAgentCode = "m-pnt" | "m-mkt" | "m-biz" | "m-ed" | "chief";

export type CompanyContext = {
  brandName: string;
  industry: string;
  storeCount?: string;
  city?: string;
  stageLabel?: string;
  currentChallenge?: string;
  yearlyGoal?: string;
  strategicSummary?: string;
};

export type MeetingMission = {
  missionId: string;
  companyId: string;
  question: string;
  goal: string;
  topic: string;
  requiredAgents: FounderAgentId[];
  companyContext: CompanyContext;
};

export type ExpertOpinion = {
  opinionId: string;
  meetingId: string;
  agentId: FounderAgentId;
  seatLabel: string;
  stance: "support" | "oppose" | "conditional" | "neutral";
  claim: string;
  reasons: string[];
  risks: string[];
  confidence: number;
  degraded?: boolean;
  rawRef?: {
    snapshotType?: "positioning" | "market" | "business" | "equity";
    conversationId?: string;
    agentRunId?: string;
  };
  createdAt: string;
};

export type DecisionCardContract = {
  problem: string;
  judgement: string;
  reasons: string[];
  validationPlan: string;
  status: "validating" | "validated" | "adjusted" | "revisiting";
  opinions: ExpertOpinion[];
};

export type GatewayEvent =
  | { type: "EXPERT_THINKING"; seatLabel: string; agentId: FounderAgentId; content?: string }
  | { type: "EXPERT_OPINION"; opinion: ExpertOpinion }
  | { type: "EXPERT_ERROR"; seatLabel: string; agentId: FounderAgentId; message: string; degraded: true }
  | { type: "DONE"; agentId: FounderAgentId };

export const AGENT_SEAT: Record<
  FounderAgentId,
  { seatLabel: string; forceAgent: ForceAgentCode; duty: string }
> = {
  "M-MKT": { seatLabel: "市场顾问", forceAgent: "m-mkt", duty: "分析行业空间" },
  "M-PNT": { seatLabel: "品牌顾问", forceAgent: "m-pnt", duty: "分析品牌定位" },
  "M-BIZ": { seatLabel: "商业顾问", forceAgent: "m-biz", duty: "分析扩张模型" },
  "M-ED": { seatLabel: "组织顾问", forceAgent: "m-ed", duty: "分析管理能力" },
  CHIEF: { seatLabel: "主持人", forceAgent: "chief", duty: "综合收口" },
};

export function toForceAgent(agentId: FounderAgentId): ForceAgentCode {
  return AGENT_SEAT[agentId].forceAgent;
}

export function toFounderAgentId(force: string): FounderAgentId {
  if (force === "m-pnt") return "M-PNT";
  if (force === "m-mkt") return "M-MKT";
  if (force === "m-biz") return "M-BIZ";
  if (force === "m-ed") return "M-ED";
  return "CHIEF";
}

export const EXPANSION_AGENTS: FounderAgentId[] = ["M-MKT", "M-PNT", "M-BIZ", "M-ED"];
