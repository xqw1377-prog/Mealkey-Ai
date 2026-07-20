import type { FounderAgentName, FounderMission } from "./mission";
import type {
  EvidenceNodeType,
  EvidenceSourceLevel,
} from "./evidence";

export type FounderDecisionStance = "support" | "oppose" | "conditional";

export interface DecisionEvidence {
  /** Evidence Layer 节点 ID；绑定后必填 */
  evidenceId?: string;
  label: string;
  content: string;
  confidence?: number;
  role?: "supports" | "weakens" | "context";
  source?: string;
  sourceLevel?: EvidenceSourceLevel;
  type?: EvidenceNodeType;
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
  /** Evidence Layer：推理说明 */
  reasoning?: string;
  /** Evidence Layer：显式假设 */
  assumptions?: string[];
  /** Evidence Layer：建议验证动作 */
  validation?: string;
  /** 仍缺哪些可核验事实 */
  evidenceGap?: string[];
  /** 是否达到最小硬证据门槛 */
  evidenceSufficient?: boolean;
  metadata?: {
    missionId: string;
    producedAt: string;
    latencyMs?: number;
    insightId?: string;
    /** external = 真实引擎；heuristic = 降级 */
    provider?: "external" | "heuristic" | string;
    memoryPriorApplied?: boolean;
    memoryStanceAdjusted?: boolean;
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
  /** Evidence Layer：整体证据是否足以执行 */
  evidenceStatus?: "sufficient" | "insufficient";
  /** 支撑终局决策的 Evidence IDs */
  evidenceIds?: string[];
  /** Decision Contract V2：企业行动协议 */
  contract?: import("./decision-v2").FounderDecisionContract;
}
