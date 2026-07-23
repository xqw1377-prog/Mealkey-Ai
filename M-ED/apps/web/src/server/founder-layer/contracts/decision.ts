import type { FounderAgentName, FounderMission } from "./mission";

export type FounderDecisionStance = "support" | "oppose" | "conditional";

export interface DecisionEvidence {
  label: string;
  content: string;
  confidence?: number;
}

export interface FounderDecision {
  decisionId: string;
  sourceAgent: FounderAgentName;
  question: string;
  judgement: string;
  confidence: number;
  evidence: DecisionEvidence[];
  risks: string[];
  nextSteps: string[];
  stance?: FounderDecisionStance;
  metadata?: {
    missionId: string;
    producedAt: string;
    latencyMs?: number;
  };
}

export interface AdapterBuildInput {
  mission: FounderMission;
  companyContext: import("./mission").CompanyContext;
  memory?: import("./mission").FounderMemorySnapshot;
  /** 用户本轮选中的资料摘要，供各席判断优先引用 */
  assetContextBlock?: string;
}

export interface AdapterRequest {
  agent: FounderAgentName;
  endpoint: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
}

export interface AdapterRawResponse {
  agent: FounderAgentName;
  status: "success" | "failed" | "partial";
  raw: unknown;
  latencyMs?: number;
}

export interface AdapterNormalizeContext {
  question: string;
  mission: FounderMission;
}

export interface FounderAgentAdapter {
  agent: FounderAgentName;
  supports(mission: FounderMission): boolean;
  buildRequest(input: AdapterBuildInput): AdapterRequest;
  invoke(request: AdapterRequest): Promise<AdapterRawResponse>;
  normalize(
    response: AdapterRawResponse,
    context: AdapterNormalizeContext,
  ): FounderDecision;
}

export interface DecisionOption {
  label: string;
  summary?: string;
  supportedBy?: FounderAgentName[];
}

export interface FounderFinalDecision {
  finalDecisionId: string;
  missionId: string;
  problem: string;
  options: DecisionOption[];
  chosen: string;
  reason: string[];
  validationPlan: string[];
  status: "proposed" | "accepted" | "executing" | "verified";
  createdAt: string;
}
