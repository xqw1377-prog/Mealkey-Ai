/**
 * Cognition Engine 模块导出
 */

export { CognitionEngine } from "./engine";
export { DefaultRiskAnalyzer } from "./risk-analyzer";
export { DefaultDecisionGenerator } from "./decision-gen";
export { DefaultJudgmentChain } from "./chain";

export type {
  JudgmentFramework,
  JudgmentVariable,
  Indicator,
  ScoreRange,
  Relationship,
  DecisionNode,
  AssessInput,
  ProjectInfo,
  OwnerInfo,
  CognitionResult,
  Assessment,
  VariableScore,
  KnowledgeRef,
  Reflection,
  Assumption,
  CaseReference,
  ReflectInput,
  JudgmentChain,
  JudgmentInput,
  JudgmentStep,
  StepContext,
  StepResult,
  JudgmentResult,
  Observation,
  Diagnosis,
  Evaluation,
  Strategy,
  Action,
  Risk,
  RiskLevel,
  Mitigation,
  RiskAnalyzer,
  Decision,
  DecisionContext,
  DecisionGenerator,
  MemoryContext,
  KnowledgeContext,
} from "./types";
