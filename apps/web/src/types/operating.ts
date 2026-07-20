// ─── 导航（Founder OS V2）───

export type NavSection =
  | "today"
  | "capability"
  | "meeting"
  | "action"
  | "growth"
  /** @deprecated → capability */
  | "world"
  /** @deprecated → action */
  | "decision"
  /** @deprecated → growth */
  | "brain";

// ─── 项目数据（从 DB 读取的 ProjectResponse 派生） ───

export interface ProjectProfile {
  ownerName?: string;
  brandName?: string;
  ownerExperience?: string;
  locationHypothesis?: string;
  stageProgress?: number;
  nextStage?: string;
  score?: number;
  confidence?: number;
  evidenceRules?: number;
  evidenceCases?: number;
  scoreLabel?: string;
  scoreAdvice?: string;
  scoreBreakdown?: ScoreBreakdown;
  biggestRisk?: string;
  suggestedAction?: string;
  strategicSummary?: string;
  strengths?: string[];
  weaknesses?: string[];
  tasks?: ProjectTask[];
  ownerAbilities?: OwnerAbility[];
  indicators?: IndicatorMetric[];
  stages?: ProjectStageItem[];
  consultantSummary?: string;
  consultantJudgements?: string[];
  consultantUnknown?: string;
  consultantOptions?: string[];
  reportRiskTitle?: string;
  reportPositioning?: string;
  reportConclusion?: string;
  reportChain?: string[];
  reportCounterArgument?: string;
  reportValidationAction?: string;
  [key: string]: unknown;
}

export interface ScoreBreakdown {
  market: number;
  capability: number;
  capital: number;
  risk: number;
}

export interface IndicatorMetric {
  label: string;
  value: number;
  tone: "positive" | "warning" | "neutral";
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "高优先级" | "中优先级" | "观察";
}

export interface OwnerAbility {
  label: string;
  stars: number;
}

export interface ProjectStageItem {
  key: string;
  label: string;
  summary: string;
}

export interface ProjectReport {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  status: string;
  createdAt: Date;
}

export interface ProjectItem {
  id: string;
  name: string;
  status: string;
  stage: string | null;
  city: string | null;
  district: string | null;
  category: string | null;
  target: string | null;
  budget: number | null;
  profile: ProjectProfile | null;
  healthScore: number | null;
  confidence: number | null;
  ownerName: string | null;
  reports: ProjectReport[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── 知识条目 ───

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  categoryName: string | null;
  tags: string[];
  source: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  parentId: string | null;
  children: KnowledgeCategory[];
  sortOrder: number;
}

// ─── Owner 画像 ───

export interface OwnerPortrait {
  name: string;
  dimensions: Array<{
    label: string;
    value: number;
  }>;
  strengths: string[];
  opportunities: string[];
  judgement: string;
}

// ─── Agent 流式事件 ───

export type AgentStreamEvent =
  | { event: "thinking"; data: string }
  | { event: "knowledge"; data: string }
  | { event: "decision"; data: string }
  | { event: "complete"; data: string };

export type AgentMessage = {
  id: string;
  role: "advisor" | "user" | "system";
  content: string;
};

export type AgentRequest = {
  projectId: string;
  message: string;
};
