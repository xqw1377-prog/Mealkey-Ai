/**
 * Founder OS V2 — 四大能力 Agent 契约
 * Cognition / Decision / Execution / Growth
 * 专业引擎（M-*）降级为 Capability Plugin。
 */

import type { FounderAgentName, FounderMemorySnapshot, FounderMission } from "./mission";
import type { FounderDecision } from "./decision";
import type { EvidencePack } from "./evidence";
import type { FounderDecisionContract } from "./decision-v2";
import type { DebateSession } from "./debate-session";
import type { FounderMemoryWrite } from "./memory";
import type { CompanyContext } from "./mission";

/** 四大能力 Agent */
export type CapabilityAgentId =
  | "cognition"
  | "decision"
  | "execution"
  | "growth";

export const CAPABILITY_AGENT_LABEL: Record<CapabilityAgentId, string> = {
  cognition: "认知",
  decision: "决策",
  execution: "推动",
  growth: "成长",
};

/** 能力插件（领域引擎） */
export type CapabilityPluginId =
  | "market" // M-MKT
  | "brand" // M-PNT
  | "business" // M-BIZ
  | "capital" // M-ED → Decision
  | "world"
  | "self"
  | "strategy"
  | "risk"
  | "simulation"
  | "evidence"
  | "goal"
  | "action"
  | "alignment"
  | "communication"
  | "reflection"
  | "capability_assessment"
  | "learning";

export const PLUGIN_TO_LEGACY_AGENT: Partial<
  Record<CapabilityPluginId, FounderAgentName>
> = {
  market: "M-MKT",
  brand: "M-PNT",
  business: "M-BIZ",
  capital: "M-ED",
};

export const LEGACY_AGENT_TO_PLUGIN: Record<FounderAgentName, CapabilityPluginId> = {
  "M-MKT": "market",
  "M-PNT": "brand",
  "M-BIZ": "business",
  "M-ED": "capital",
};

export type CapabilityMode =
  | "strategy_meeting"
  | "cognition_only"
  | "decision_pressure"
  | "execution_track"
  | "growth_review";

/** 单条认知洞察 */
export interface CognitionInsight {
  insightId: string;
  plugin: CapabilityPluginId;
  title: string;
  statement: string;
  why?: string;
  risks?: string[];
  conditions?: string[];
  confidence: number;
  evidenceRefs?: string[];
  /** 席位判断原文（兼容四席） */
  seatDecision?: FounderDecision;
  provider?: "external" | "heuristic" | string;
}

/** Cognition Agent 产物 */
export interface InsightPack {
  packId: string;
  missionId: string;
  agentId: "cognition";
  insights: CognitionInsight[];
  /** 按插件索引 */
  byPlugin: Partial<Record<CapabilityPluginId, CognitionInsight>>;
  summary: string;
  createdAt: string;
}

/** 风险推演条目 */
export interface RiskBriefItem {
  riskId: string;
  title: string;
  impact: string;
  mitigation?: string;
  source: "capital" | "debate" | "scenario" | "seat";
}

/** 情景模拟条目 */
export interface SimulationBriefItem {
  scenarioId: string;
  scenario: string;
  trigger: string;
  impact: string;
  mitigation: string;
}

/** Decision Agent 产物 */
export interface DecisionPack {
  packId: string;
  missionId: string;
  agentId: "decision";
  /** 战略收口（提案文案） */
  strategyDecision: string;
  chosen: string;
  capitalBrief?: string;
  risks: RiskBriefItem[];
  simulations: SimulationBriefItem[];
  evidenceStatus: "sufficient" | "insufficient";
  debateSession?: DebateSession;
  decisionContract?: FounderDecisionContract;
  summary: string;
  createdAt: string;
}

/** Execution Agent 产物 */
export interface ActionPlan {
  planId: string;
  missionId: string;
  agentId: "execution";
  decisionId?: string;
  /** 目标拆解：战略 → 季度/月 */
  goals: Array<{
    goalId: string;
    title: string;
    horizonDays?: number;
    parentGoalId?: string;
  }>;
  /** 可执行任务 */
  actions: Array<{
    actionId: string;
    title: string;
    owner?: string;
    dueInDays?: number;
    status: "planned" | "doing" | "done" | "blocked";
    goalId?: string;
  }>;
  /** 对齐提示（老板/合伙/团队） */
  alignmentNotes: string[];
  /** 沟通草稿（会议/谈判一句话） */
  communicationDrafts: string[];
  /** 已生成的验证任务（Validation OS） */
  validationTaskId?: string;
  validationHypothesis?: string;
  summary: string;
  createdAt: string;
}

/** 四大能力评分（0–100） */
export type CapabilityScoreId = CapabilityAgentId;

export interface CapabilityScore {
  id: CapabilityScoreId;
  label: string;
  score: number;
  /** up / flat / down */
  trend: "up" | "flat" | "down";
  note: string;
}

/** Growth Agent 产物：复盘 + 能力评估 + 学习路径 */
export interface GrowthDelta {
  deltaId: string;
  missionId?: string;
  agentId: "growth";
  reflections: string[];
  capabilityNotes: string[];
  learningNext: string[];
  /** 四大能力当前分 */
  scores: CapabilityScore[];
  summary: string;
  memoryWrites: FounderMemoryWrite[];
  createdAt: string;
}

/** Kernel 共享上下文（只读快照 + 本轮可变引用） */
export interface OsKernelContext {
  mission: FounderMission;
  companyContext: CompanyContext;
  memory: FounderMemorySnapshot | null;
  evidencePack?: EvidencePack;
  insightPack?: InsightPack;
  decisionPack?: DecisionPack;
  debateSession?: DebateSession;
  decisionContract?: FounderDecisionContract;
  actionPlan?: ActionPlan;
  growthDelta?: GrowthDelta;
  /** 认知席位判断（供 Decision 消费） */
  seatDecisions?: FounderDecision[];
}

export interface CapabilityRequest {
  requestId: string;
  projectId: string;
  userId: string;
  mode: CapabilityMode;
  mission: FounderMission;
  companyContext: CompanyContext;
  memory?: FounderMemorySnapshot | null;
  /** 可选：限制启用的插件 */
  plugins?: CapabilityPluginId[];
  assetContextBlock?: string;
  /** decision_pressure / execution_track：可注入先验 */
  priorInsightPack?: InsightPack;
  priorSeatDecisions?: FounderDecision[];
  priorEvidencePack?: EvidencePack;
  priorDecisionPack?: DecisionPack;
  priorDecisionContract?: FounderDecisionContract;
  priorActionPlan?: ActionPlan;
  /** growth_review：对比趋势用的上一轮评分 */
  priorCapabilityScores?: CapabilityScore[];
}

export interface CapabilityRunResult {
  agentId: CapabilityAgentId;
  insightPack?: InsightPack;
  decisionPack?: DecisionPack;
  decisionContract?: FounderDecisionContract;
  debateSession?: DebateSession;
  actionPlan?: ActionPlan;
  growthDelta?: GrowthDelta;
  evidencePack?: EvidencePack;
  memoryWrites: FounderMemoryWrite[];
  /** 建议下一能力（催办） */
  nextSuggestedAgent?: CapabilityAgentId;
  /** 兼容：席位判断列表 */
  seatDecisions?: FounderDecision[];
  /** Decision 侧：会议对象（兼容投影） */
  meeting?: import("./meeting").FounderMeeting;
  finalDecision?: import("./decision").FounderFinalDecision;
  /** Execution 侧：Validation 任务（供 profile 落库） */
  validationTask?: import("./validation").ValidationTask;
}

/** 能力 Agent 统一接口 */
export interface CapabilityAgent {
  id: CapabilityAgentId;
  supports(mode: CapabilityMode): boolean;
  run(
    request: CapabilityRequest,
    kernel: OsKernelContext,
  ): Promise<CapabilityRunResult>;
}
