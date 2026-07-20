/**
 * @mealkey/agents
 *
 * MealKey Agent 产品矩阵
 *
 * 包含所有标准 Agent 产品定义。
 * 使用方式:
 *
 * ```typescript
 * import { allAgents, LaunchAgent, MPntAgent } from "@mealkey/agents";
 *
 * registry.registerBatch(allAgents);
 * ```
 */

import type { AgentDefinition } from "@mealkey/agent-sdk";
import { LaunchAgent } from "./launch";
import { MPntAgent } from "./m-pnt";

// ─── 所有 Agent 列表 ───

export const allAgents: AgentDefinition[] = [
  LaunchAgent,
  MPntAgent,
  // 后续添加:
  // LocationAgent,
  // MenuAgent,
  // RecruitAgent,
];

// ─── 单独导出 ───

export { LaunchAgent } from "./launch";
export { MPntAgent } from "./m-pnt";
export {
  mPntManifest,
  mPntWorkflow,
  mPntCapabilities,
  getCapability,
  M_PNT_SYSTEM_PROMPT,
  mPntReportTemplate,
  mapFinalJsonToMKDecision,
  fuseStepDecisions,
  detectPositioningIntent,
  mapPositioningProblem,
  mPntKnowledgeSeeds,
  runMPnt,
  listMPntCapabilityIds,
  readStructured,
  createMockLlm,
  setMPntLlmOptions,
  setMPntLlmWithTheory,
  clearMPntLlmOptions,
  withLlm,
  parseLlmToMKDecision,
  // 三理论 Agent 矩阵
  theoryAgents,
  theoryAgentMap,
  getTheoryAgent,
  riesAgent,
  troutAgent,
  yeMaozhongAgent,
  runTheoryMatrix,
  runSingleTheoryAgent,
  buildMatrixInputPackage,
} from "./m-pnt";
export type {
  MPntRunResult,
  MPntRunOptions,
  LLMAdapter,
  MPntLlmMode,
  MPntLlmOptions,
  TheoryAgentId,
  TheoryAgent,
  TheoryLLMAdapter,
  TheoryView,
  TheoryMatrixResult,
  MatrixInputPackage,
  CrossFireResult,
  SynthesisResult,
  PositionCandidate,
  TheoryRecommend,
  DecisionRecommend,
} from "./m-pnt";

// M-PNT V2 P0 咨询项目内核
export {
  BrandProjectStage,
  BRAND_PROJECT_STAGE_ORDER,
  STAGE_CONTRACTS,
  POSITIONING_DESIGN_GATE_CHECKLIST,
  StageGateError,
  ContractGateError,
  createBrandProject,
  getStageContract,
  assertCanEnter,
  canExitCurrentStage,
  nextStage,
  advance,
  listMissingCriteria,
  assertCanDesignPositioning,
  writeDiscoveryNotes,
  writeBrandBrief,
  writeCategoryDiagnosis,
  writeConsumerInsight,
  writeCompetitiveMap,
  writePositioningContract,
  writeReportOutline,
  createBriefInterviewSession,
  getCurrentLayerQuestions,
  answerBriefQuestion,
  tryAdvanceBriefLayer,
  compileBrandBrief,
  BRIEF_QUESTION_BANK,
  BRIEF_LAYER_ORDER,
  emptyStatement,
  formatPositioningStatement,
  looksLikeUnstructuredSlogan,
  draftContractFromProject,
  proposeContract,
  validateContract,
  buildStrategyReport,
  REPORT_CHAPTERS,
  buildCategoryDiagnosis,
  buildConsumerInsight,
  buildCompetitiveMap,
  selectCategoryBattlefield,
  draftContractWithHypotheses,
  selectPositioningHypothesis,
  generatePositioningHypotheses,
  buildBrandSystem,
  confirmBrandSystem,
  evaluateBrandSystemConsistency,
  assertBrandSystemConsistent,
  signStrategyReport,
  markReportInReview,
  writeBrandSystem,
  addPrimaryFact,
  removePrimaryFact,
  primaryEvidenceCoverage,
  primaryFactStrengthBoost,
  summarizePrimaryFactStrength,
  evaluateSignOffReadiness,
  buildSignOffPackageMarkdown,
} from "./m-pnt";
export type {
  StageContract,
  BrandBrief,
  BrandStrategyProject,
  BriefInterviewSession,
  BriefInterviewLayer,
  PositioningStatement,
  PositioningContract,
  PositioningEvidence,
  PositioningHypothesis,
  CategoryDiagnosis,
  CategoryDecision,
  ConsumerInsight,
  CompetitiveMap,
  MapPlotPoint,
  BrandSystem,
  EvidenceLedger,
  PrimaryFact,
  DiscoveryNotes,
  ReportOutline,
} from "./m-pnt";


// ─── Founder OS Decision Council（七常委约束函数 / Prompt 合约）───

export {
  COUNCIL_CONSTITUTION,
  DEBATE_PROTOCOL,
  RESOLUTION_RULES,
  CONFLICT_AXES,
  ROLE_CONTRACTS,
  DECISION_TYPES,
  COUNCIL_ROLE_IDS,
  EXPERT_ENGINES,
  EXPERT_TO_COUNCIL_LENS,
  CDO_CONTRACT,
  getRoleContract,
  getDecisionType,
  getExpertEngine,
  listExpertEngines,
  getPersonaV2,
  listPersonaV2,
  renderPersonaV2Block,
  PERSONA_V2,
  COUNCIL_SPEECH_FORMAT,
  NATURAL_BIAS,
  buildCouncilRuntimePrompt,
  classifyDecisionType,
  resolveCouncilDecision,
  resolveDualTrack,
  attachWeights,
  buildDecisionBrief,
  applyFounderOverride,
  detectCouncilConflicts,
  weightsToPercent,
  assembleCouncilOutcome,
  buildBlindRoundPrompts,
  suggestCasePacket,
  PIPELINE_STAGES,
  buildAgendaBrief,
  classifyIssueLevel,
  selectCouncilRoster,
  agendaToCasePacket,
  advanceMeetingStage,
  createDecisionMemory,
  memoryFromBrief,
  closeDecisionMemory,
  conveneCouncilMeeting,
  prepareRound1,
  prepareRound2,
  closeCouncilMeeting,
  runCouncilMeetingSync,
  describeMeetingPlan,
  buildChallengeFromPersona,
  classifyDecisionIssue,
  classifyIssueDomain,
  buildStanceMatrix,
  buildConflictMap,
  buildDecisionBoard,
  extractMinorityReport,
  submitRound1Opinions,
  renderStanceMatrixText,
  getKnowledgeBase,
  listKnowledgeBases,
  renderKnowledgeBlock,
  recallKnowledgeForIssue,
  applyExpertLearning,
  draftLearningFromCalibration,
  getLearningAdjustments,
  KNOWLEDGE_BASES,
  classifyOperatingScenario,
  getScenario,
  listScenarios,
  planScenarioRun,
  openScenarioSession,
  buildTodayDecision,
  buildWeeklyAgenda,
  buildMonthlyReviewAxes,
  OPERATING_SCENARIOS,
  CHIEF_OF_STAFF_CONTRACT,
} from "./founder-os";
export type {
  CouncilRoleId,
  DecisionTypeId,
  CouncilPosition,
  RecommendedAction,
  RoleContract,
  DecisionTypeConfig,
  CasePacket,
  EvidenceItem,
  EvidencePacket,
  CouncilOpinion,
  DecisionResolution,
  ConflictAxis,
  DebateRound,
  PromptRound,
  BuildCouncilPromptInput,
  ResolveCouncilInput,
  ResolveCouncilResult,
  ExpertEngineId,
  ExpertReport,
  ExpertReportSection,
  MKInsight,
  MKEvidence,
  MKEvidenceType,
  DecisionTrace,
  DecisionBrief,
  DecisionBriefConflict,
  FounderDecisionNote,
  ValidationPlan,
  CouncilPipelineResult,
  PipelineStage,
  ExpertEngineContract,
  IssueLevel,
  MeetingStageId,
  AgendaBrief,
  DualTrackVoteResult,
  DecisionMemory,
  FiveSegmentDeliberation,
  PersonaV2,
  JudgmentStep,
  VetoProtocol,
  ExpertKnowledgeBase,
  LearningAdjustment,
  FailurePattern,
  LearningEvent,
  OperatingScenarioId,
  OperatingScenario,
  ScenarioPlan,
  ScenarioSession,
  TodayDecisionCard,
  ChiefOfStaffDutyId,
} from "./founder-os";

// ─── 按分类查询 ───

export function getAgentsByCategory(category: string): AgentDefinition[] {
  return allAgents.filter((agent) => agent.manifest.category === category);
}

// ─── 按 ID 查询 ───

export function getAgentById(id: string): AgentDefinition | undefined {
  return allAgents.find((agent) => agent.manifest.id === id);
}

// ─── Agent ID 列表 ───

export const agentIds = allAgents.map((agent) => agent.manifest.id);
