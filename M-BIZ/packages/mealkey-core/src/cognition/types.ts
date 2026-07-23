/**
 * Cognition Engine 类型定义
 */

// ─── 判断框架 ───

export interface JudgmentFramework {
  id: string;
  name: string;                    // "餐饮成功五变量"
  description: string;
  category: "startup" | "operation" | "growth";
  variables: JudgmentVariable[];
  relationships: Relationship[];
  decisionTree: DecisionNode[];
}

export interface JudgmentVariable {
  id: string;
  name: string;                    // "客群"
  description: string;
  weight: number;                  // 权重 0-100
  indicators: Indicator[];
}

export interface Indicator {
  id: string;
  name: string;                    // "目标客群清晰度"
  question: string;                // 评估问题
  scoring: {
    low: ScoreRange;
    mid: ScoreRange;
    high: ScoreRange;
  };
}

export interface ScoreRange {
  range: [number, number];
  description: string;
  signal: string;                  // "高风险" | "需验证" | "健康"
}

export interface Relationship {
  from: string;                    // 变量ID
  to: string;
  type: "enables" | "constrains" | "amplifies";
  description: string;
}

export interface DecisionNode {
  id: string;
  question: string;
  conditions: {
    if: string;
    then: string;
    else: string;
  }[];
}

// ─── 评估输入 ───

export interface AssessInput {
  framework: string;               // 框架ID
  project: ProjectInfo;
  owner: OwnerInfo;
}

export interface ProjectInfo {
  city?: string;
  district?: string;
  category?: string;
  area?: number;
  investment?: number;
  seats?: number;
  [key: string]: unknown;
}

export interface OwnerInfo {
  experience_level?: "beginner" | "intermediate" | "expert";
  strengths?: string[];
  blindspots?: string[];
  [key: string]: unknown;
}

// ─── 评估结果 ───

export interface CognitionResult {
  assessment: Assessment;
  reflection: Reflection | null;
  knowledgeRefs: KnowledgeRef[];
}

export interface Assessment {
  framework: string;
  frameworkName: string;
  scores: VariableScore[];
  overall: number;                 // 综合分 0-100
  biggestRisk: string;
  recommendation: string;
  confidence: number;              // 置信度 0-100
}

export interface VariableScore {
  variable: string;                // 变量ID
  name: string;                    // 变量名称
  score: number;                   // 0-100
  weight: number;
  reasoning: string;
  risks: string[];
  suggestions: string[];
}

export interface KnowledgeRef {
  id: string;
  title: string;
  type: string;
  relevance: number;
}

// ─── 反思结果 ───

export interface Reflection {
  originalThinking: string;
  hiddenAssumptions: Assumption[];
  challenge: string;
  alternativeFramework: string;
  guidingQuestion: string;
  cases: CaseReference[];
}

export interface Assumption {
  assumption: string;
  risk: "high" | "medium" | "low";
  challenge: string;
}

export interface CaseReference {
  title: string;
  situation: string;
  outcome: string;
  lesson: string;
}

// ─── 反思输入 ───

export interface ReflectInput {
  statement: string;
  owner: OwnerInfo;
}

// ─── 判断链 ───

export interface JudgmentChain {
  input: JudgmentInput;
  steps: JudgmentStep[];
  output: JudgmentResult;
}

export interface JudgmentInput {
  project: ProjectInfo;
  owner: OwnerInfo;
  memory?: MemoryContext;
  knowledge?: KnowledgeContext;
}

export interface JudgmentStep {
  name: string;
  type: "observation" | "diagnosis" | "evaluation" | "strategy" | "action";
  execute: (context: StepContext) => Promise<StepResult>;
}

export interface StepContext {
  input: JudgmentInput;
  previousResults: Map<string, StepResult>;
}

export interface StepResult {
  stepName: string;
  data: Record<string, unknown>;
  confidence: number;
  risks?: Risk[];
}

export interface JudgmentResult {
  observation: Observation;
  diagnosis: Diagnosis;
  evaluation: Evaluation;
  strategy: Strategy;
  action: Action;
  overallConfidence: number;
}

// ─── 观察 ───

export interface Observation {
  facts: string[];
  entities: Record<string, unknown>;
  context: string;
}

// ─── 诊断 ───

export interface Diagnosis {
  problem: string;
  rootCause: string;
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
}

// ─── 评估 ───

export interface Evaluation {
  framework: string;
  scores: Record<string, number>;
  overall: number;
  strengths: string[];
  weaknesses: string[];
}

// ─── 策略 ───

export interface Strategy {
  recommendation: string;
  alternatives: string[];
  reasoning: string;
  timeframe: string;
}

// ─── 行动 ───

export interface Action {
  nextSteps: string[];
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
}

// ─── 风险分析 ───

export interface Risk {
  type: "market" | "financial" | "operational" | "brand" | "team";
  description: string;
  level: "low" | "medium" | "high" | "critical";
  probability: number;  // 0-1
  impact: number;       // 0-1
  mitigation?: Mitigation;
}

export interface Mitigation {
  strategy: string;
  actions: string[];
  cost: string;
  effectiveness: number;  // 0-1
}

export interface RiskAnalyzer {
  identifyRisks(project: ProjectInfo, owner: OwnerInfo): Risk[];
  assessRiskLevel(risk: Risk): RiskLevel;
  generateMitigation(risk: Risk): Mitigation;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

// ─── 决策生成 ───

export interface Decision {
  summary: string;
  reasoning: string[];
  confidence: number;
  risks: Risk[];
  actions: Action[];
  alternatives: string[];
}

export interface DecisionGenerator {
  generate(context: DecisionContext): Decision;
  assessConfidence(decision: Decision): number;
  generateActions(decision: Decision): Action[];
}

export interface DecisionContext {
  project: ProjectInfo;
  owner: OwnerInfo;
  risks: Risk[];
  evaluation: Evaluation;
}

// ─── 记忆和知识上下文（简化） ───

export interface MemoryContext {
  recentDecisions: Array<{
    question: string;
    recommendation: string;
    outcome?: string;
  }>;
  userPreferences: Record<string, unknown>;
  projectHistory: string[];
}

export interface KnowledgeContext {
  rules: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  cases: Array<{
    id: string;
    title: string;
    outcome: string;
  }>;
  models: Array<{
    id: string;
    name: string;
    formula: string;
  }>;
}
