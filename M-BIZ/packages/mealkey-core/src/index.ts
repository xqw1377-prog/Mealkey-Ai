/**
 * @mealkey/core
 *
 * MealKey Core — 餐饮经营智能层
 *
 * 职责边界：
 * - 餐饮认知模型、经营判断体系、项目理解、老板画像、行业知识、决策模型
 * - 不包含 Agent 通用基础设施（那是 agent-runtime 的职责）
 *
 * 6 Protocol Freeze（定义在 @mealkey/agent-sdk）:
 * - Protocol 1: Context (KernelContext)
 * - Protocol 2: Decision (MKDecision)
 * - Protocol 3: Memory (MemoryStore)
 * - Protocol 4: Agent Manifest (AgentManifest)
 * - Protocol 5: Capability (CapabilityDefinition)
 * - Protocol 6: Mission (MissionRequest/MissionResult)
 */

// ─── Chief Agent (Kernel Agent) ───

export { ChiefAgent } from "./agent/chief-agent";
export type {
  AgentInput,
  AgentResult,
  Assessment,
  AgentMetadata,
  MemoryUpdate,
  AgentChunk,
  ChiefAgentDeps,
} from "./agent/chief-agent";

// ─── Intent Detector ───

export {
  detectLaunchIntent,
  shouldUseLaunchAgent,
  detectPositioningIntent,
  shouldUseMPntAgent,
} from "./agent/intent-detector";
export type { IntentDetectionResult, LaunchIntentType } from "./agent/intent-detector";

// ─── Chief Agent 子模块 ───

export { ProblemUnderstandingEngine } from "./agent/problem-understanding";
export type { ProblemAnalysis } from "./agent/problem-understanding";

export { ChiefToolRegistry } from "./agent/tool-registry";

export { AgentRunTracker, PrismaAgentRunStorage } from "./agent/agent-run-tracker";
export type { AgentRunStorage, AgentRunCreateInput, AgentRunUpdateInput } from "./agent/agent-run-tracker";

// ─── Knowledge Engine（行业知识）───

export { KnowledgeEngine, PrismaKnowledgeStorage } from "./knowledge";
export { DECISION_RULES, matchRules } from "./knowledge";
export { CASE_STUDIES, findSimilarCases, findAllSimilarCases, ALL_CASES } from "./knowledge";
export { MASTER_EXPERIENCES, queryMasterWisdom } from "./knowledge";
export { BUSINESS_MODELS, findModelsByScenario, findModelById } from "./knowledge";
export { CATEGORY_PROFILES, getCategoryProfile, getCategoryBenchmarks } from "./knowledge";
export type {
  KnowledgeCard,
  KnowledgeType,
  DecisionRule,
  CaseStudy,
  BusinessModel,
  MasterExperience,
} from "./knowledge";

// ─── Memory Engine（记忆引擎）───

export { MemoryEngine } from "./memory";
export { DefaultMemoryExtractor, DefaultMemoryRetriever } from "./memory";
export type {
  MemoryItem,
  MemoryLayer,
  MemoryContext,
  MemoryExtractor,
  MemoryRetriever,
  MemoryStorage,
  MemoryFilter,
  Conversation,
  UserProfile,
  MemoryScore,
} from "./memory";

// Protocol 3 re-export
export type { MemoryStore, MemoryInput } from "@mealkey/agent-sdk";

// ─── Project OS（项目生命周期）───

export { ProjectService, LifecycleManager, ProjectContextBuilder } from "./project";
export { STAGES, TRANSITIONS } from "./project";
export type {
  Project,
  ProjectStage,
  ProjectStatus,
  ProjectProfile,
  ProjectContext,
  CreateProjectInput,
  UpdateProjectInput,
  Decision,
  DecisionType,
  DecisionContent,
  DecisionOutcome,
  ProjectMemory as ProjectMemoryEntry,
  Report,
  ReportType as ProjectReportType,
  TimelineEvent,
  EventType,
  ProjectStorage,
  StageTransition,
} from "./project";

// ─── Cognition Engine（认知引擎）───

export { CognitionEngine } from "./cognition/engine";
export type { LLMAdapter as CognitionLLMAdapter } from "./cognition/engine";

// ─── Risk Analyzer ───

export { DefaultRiskAnalyzer } from "./cognition/risk-analyzer";

// ─── 判断模型 ───

export {
  getFramework,
  getAllFrameworks,
  getFrameworksByCategory,
  recommendFramework,
  RESTAURANT_SUCCESS_FRAMEWORK,
  FEASIBILITY_FRAMEWORK,
  BRAND_POSITIONING_FRAMEWORK,
} from "./cognition/models";

// ─── Decision Engine（决策引擎 — 领域智能）───
// 注意：ChallengeEngine 同时被 cognition/chain.ts (DefaultJudgmentChain) 间接使用

export { ChallengeEngine } from "./runtime/decision/challenge-engine";
export type { ChallengeResult, Challenge } from "./runtime/decision/challenge-engine";

// ❌ 已废弃（ChiefAgent 合并后不再使用）：
//   DecisionModelEngine, ActionPlanner, ContextBuilder, 
//   AgentOrchestrator, ReasoningEngine

// ─── Intelligence Layer（经营智能层）───

export { LearningEngine } from "./intelligence";
export type { LearningOutcome, LearningInsight, LearningEngineDeps } from "./intelligence";

export { AutoKnowledgeExtractor, globalAutoExtractor } from "./intelligence";
export type { KnowledgeFragment } from "./intelligence";

// ─── LLM 工具 ───

export { LLMCache, globalLLMCache } from "./llm";

// ─── Business Capability Model（经营能力模型）───

export {
  BUSINESS_CAPABILITY_GROWTH_LOOP_V1,
  BUSINESS_CAPABILITY_MODEL_V1,
  buildBusinessCapabilityScorecard,
  createDefaultBusinessCapabilityScorecard,
  getBusinessCapabilityDefinition,
  getBusinessCapabilityModelV1,
  normalizeBusinessCapabilityId,
} from "./capability-model/v1";
export type {
  BusinessCapabilityDefinition,
  BusinessCapabilityId,
  BusinessCapabilityScoreSource,
  BusinessCapabilityScorecardItem,
  BusinessSubCapability,
  RawBusinessCapabilityInput,
} from "./capability-model/types";

// ❌ 已废弃的导出（保留编译兼容，但不建议使用）：
// DecisionModelEngine, ActionPlanner, ContextBuilder, 
// AgentOrchestrator, ReasoningEngine — 这些类型已从主导出路径移除。
// 如需使用，请直接 import from "./runtime/..."
