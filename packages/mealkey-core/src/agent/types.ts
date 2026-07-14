/**
 * Chief Agent Runtime 类型定义
 */

// ─── Agent 上下文 ───

export interface MealKeyContext {
  owner: OwnerContext;
  knowledge: KnowledgeContext;
  memory: MemoryContext;
  project?: ProjectContext;
}

export interface OwnerContext {
  id: string;
  userId: string;
  experienceYears: number;
  overallScore: number;
  strengths: string[];
  blindspots: string[];
  riskTolerance: string;
  capabilities: CapabilitySnapshot[];
  recentAssessments: AssessmentSnapshot[];
}

export interface CapabilitySnapshot {
  name: string;
  score: number;
  category: string;
}

export interface AssessmentSnapshot {
  topic: string;
  date: string;
  summary: string;
}

export interface KnowledgeContext {
  relevantNodes: KnowledgeNodeSnapshot[];
  recentInteractions: string[];
}

export interface KnowledgeNodeSnapshot {
  id: string;
  type: string;
  title: string;
  summary: string;
  category: string;
  confidence: number;
}

export interface MemoryContext {
  ownerMemories: MemorySnapshot[];
  projectMemories: MemorySnapshot[];
  decisionHistory: DecisionSnapshot[];
}

export interface MemorySnapshot {
  type: string;
  content: string;
  importance: number;
  date: string;
}

export interface DecisionSnapshot {
  topic: string;
  decision: string;
  outcome?: string;
  date: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  city?: string;
  category?: string;
  stage: string;
  profile?: Record<string, unknown>;
}

// ─── 意图理解 ───

export interface Intent {
  type: IntentType;
  entities: Record<string, unknown>;
  confidence: number;
  reasoning: string;
}

export type IntentType =
  | "new_project"         // 新项目评估
  | "feasibility"         // 可行性分析
  | "knowledge_question"  // 知识问题
  | "cognition_challenge" // 认知挑战
  | "strategy_design"     // 战略设计
  | "general_advice"      // 一般建议
  | "greeting";           // 打招呼

// ─── Agent 响应 ───

export interface AgentResponse {
  message: string;
  assessment?: AssessmentResult;
  cognition?: CognitionUpgrade;
  knowledge?: KnowledgeReference[];
  nextSteps?: string[];
  metadata: ResponseMetadata;
}

export interface AssessmentResult {
  framework: string;
  scores: Record<string, number>;
  overall: number;
  biggestRisk: string;
  recommendation: string;
}

export interface CognitionUpgrade {
  originalThinking: string;
  hiddenAssumptions: string[];
  upgradedThinking: string;
  guidingQuestion: string;
}

export interface KnowledgeReference {
  id: string;
  title: string;
  type: string;
  relevance: number;
}

export interface ResponseMetadata {
  intent: IntentType;
  enginesUsed: string[];
  confidence: number;
  processingTime: number;
}

// ─── 流式输出 ───

export type AgentStreamChunk =
  | { type: "thinking"; content: string }
  | { type: "intent"; data: Intent }
  | { type: "context"; data: { owner: OwnerContext } }
  | { type: "assessment"; data: AssessmentResult }
  | { type: "cognition"; data: CognitionUpgrade }
  | { type: "knowledge"; data: KnowledgeReference[] }
  | { type: "message"; content: string }
  | { type: "done"; data: AgentResponse }
  | { type: "error"; message: string };
