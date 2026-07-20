/** Founder OS Decision Council — 运行时类型（与 founder-os/schemas 对齐） */

export type CouncilRoleId = "CSO" | "CMO" | "CBO" | "BMO" | "CFO" | "COO" | "CRO";

export type DecisionTypeId =
  | "new_city_expansion"
  | "new_brand"
  | "fundraising"
  | "store_expansion"
  | "restructuring";

export type CouncilPosition = "support" | "oppose" | "conditional";

export type RecommendedAction = "执行" | "暂缓" | "推翻";

export interface RoleContract {
  role_id: CouncilRoleId;
  role_name: string;
  identity: string;
  mission: string;
  core_question: string;
  objective_function: string[];
  fear_function: string[];
  judgment_model: string[];
  evidence_preference: string[];
  first_scan: string[];
  veto_rules: string[];
  change_mind_if: string[];
}

export interface DecisionTypeConfig {
  decision_type: DecisionTypeId;
  name: string;
  level: 1 | 2 | 3 | 4;
  pass_requirement: string;
  weights: Record<CouncilRoleId, number>;
  veto_roles: CouncilRoleId[];
  default_required_agents: string[];
}

export interface CasePacket {
  caseId: string;
  question: string;
  objective?: string;
  decisionType: DecisionTypeId;
  background?: string[];
  constraints?: string[];
  deadline?: string;
  founderView?: {
    position?: string;
    why?: string[];
    constraints?: string[];
  };
  requiredAgents?: string[];
}

export interface EvidenceItem {
  evidenceId: string;
  sourceAgent: string;
  claim: string;
  strength?: "weak" | "medium" | "strong";
  category?: string;
  refs?: string[];
}

export interface EvidencePacket {
  caseId: string;
  generatedAt?: string;
  items: EvidenceItem[];
  gaps?: string[];
}

export interface CouncilOpinion {
  member: CouncilRoleId;
  position: CouncilPosition;
  confidence: number;
  weight?: number;
  summary: string;
  /** V2.0 冻结发言：【我的判断】 */
  judgment?: string;
  /** 【最大风险】 */
  top_risk?: string;
  /** 【我的建议】 */
  proposal?: string;
  /** 【需要验证】 */
  needs_validation?: string;
  reasoning: string[];
  evidence_used?: string[];
  key_assumptions?: string[];
  risks: string[];
  conditions: string[];
  challenge_to_others?: string[];
  response_to_challenges?: string[];
  veto: boolean;
  veto_reason?: string;
  change_of_view?: boolean;
  change_reason?: string;
  minority_report?: boolean;
  prediction?: {
    best_case?: string;
    base_case?: string;
    worst_case?: string;
    kill_metric?: string;
  };
}

export interface DecisionResolution {
  recommended_action: RecommendedAction;
  weighted_result: {
    support_score: number;
    oppose_score: number;
    conditional_score: number;
  };
  majority_view: string[];
  minority_report: string[];
  unresolved_questions?: string[];
  required_conditions: string[];
  veto_flags?: string[];
  execution_bet?: {
    expected_upside?: string;
    worst_case?: string;
    kill_metric?: string;
    validation_cycle?: string;
  };
}

export interface ConflictAxis {
  id: string;
  label: string;
  sides: string[];
  essence: string;
}

export type ExpertEngineId = "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";

export interface ExpertReportSection {
  id: string;
  title: string;
  content: string;
  evidenceIds?: string[];
}

/** 专业意见（非投票） */
export interface ExpertReport {
  engineId: ExpertEngineId;
  caseId: string;
  headline: string;
  stanceHint?: "favorable" | "cautious" | "unfavorable" | "insufficient_data";
  sections: ExpertReportSection[];
  opportunities?: string[];
  risks?: string[];
  conditions?: string[];
  unknowns?: string[];
}

export interface DecisionBriefConflict {
  axis: string;
  summary: string;
  sides: string[];
  strongestObjection?: string;
}

export interface FounderDecisionNote {
  caseId: string;
  councilRecommendation: RecommendedAction;
  founderAction: RecommendedAction;
  overrode: boolean;
  whyDisagree: string[];
  /** 我的核心判断 */
  coreJudgment?: string;
  acceptedRisks?: string[];
  /** 验证方式 */
  validationMethod?: string;
  personalThesis?: string;
  timestamp?: string;
}

export interface ValidationPlan {
  cycle: string;
  killMetric: string;
  successMetrics?: string[];
  owners?: string[];
}

/** 企业决策数据库单元 */
export interface DecisionBrief {
  briefId: string;
  createdAt?: string;
  casePacket: CasePacket;
  evidencePacket?: EvidencePacket;
  expertReports: ExpertReport[];
  councilOpinions: CouncilOpinion[];
  conflicts: DecisionBriefConflict[];
  resolution: DecisionResolution;
  founderOverride?: {
    overrode: boolean;
    finalAction: RecommendedAction;
    note: FounderDecisionNote;
  };
  validationPlan: ValidationPlan;
  learningHook?: {
    outcomeStatus?:
      | "pending"
      | "validated"
      | "killed"
      | "overridden_success"
      | "overridden_fail";
    whoWasRight?: "founder" | "council" | "mixed" | "unknown";
    lesson?: string;
  };
}

export interface CouncilPipelineResult {
  stage: string;
  missingEngines: string[];
  resolution: DecisionResolution;
  brief: DecisionBrief;
}

/** @deprecated 使用 PromptRound */
export type DebateRound = 1 | 2 | 3;

/** 议题级别 */
export type IssueLevel = "L1" | "L2" | "L3" | "L4";

/** 会议五阶段 */
export type MeetingStageId =
  | "agenda"
  | "expert_input"
  | "deliberation"
  | "cross_examination"
  | "resolution";

/** CDO Stage 1 产出 */
export interface AgendaBrief {
  briefId: string;
  topic: string;
  whyNow?: string;
  objective: string;
  constraints: string[];
  questionsToAnswer: string[];
  deadline?: string;
  level: IssueLevel;
  decisionType: DecisionTypeId;
  roster: CouncilRoleId[];
  requiredEngines: string[];
  conveneCouncil: boolean;
  founderRequired: boolean;
}

/** 常委五段审议结构 */
export interface FiveSegmentDeliberation {
  judgment: string;
  pros: string[];
  cons: string[];
  top_risk: string;
  proposal: string;
}

export interface DualTrackVoteResult {
  track_a: {
    support: number;
    oppose: number;
    conditional: number;
    majority_side: "support" | "oppose" | "conditional" | "tie";
  };
  track_b: {
    red_flags: Array<{
      role: CouncilRoleId;
      reason: string;
      alternative?: string;
    }>;
    blocked: boolean;
  };
  recommended_action: RecommendedAction;
}

export interface DecisionMemory {
  memoryId: string;
  caseId: string;
  briefId?: string;
  decision: string;
  rationale: string[];
  objections: string[];
  resolutionSnapshot: DecisionResolution;
  founderOverride?: DecisionBrief["founderOverride"];
  outcome?: {
    whatHappened?: string;
    deviation?: string;
    whoWasRight?: "founder" | "council" | "mixed" | "unknown";
    lesson?: string;
  };
  createdAt: string;
  closedAt?: string;
}
/** 跨角色质询条目 */
export interface CrossExaminationItem {
  from: CouncilRoleId;
  to: CouncilRoleId;
  question: string;
  targetEvidenceId?: string;
  conflictAxis: string;
  severity: "high" | "medium" | "low";
}

/** 情景分析假设 */
export interface ScenarioAssumption {
  variable: string;
  baseValue: string;
  stressValue: string;
  probability: "high" | "medium" | "low";
}

/** 情景分析结果 */
export interface ScenarioResult {
  scenarioId: string;
  title: string;
  assumptions: ScenarioAssumption[];
  bestCase: string;
  baseCase: string;
  worstCase: string;
  killSignal: string;
  decisionImpact: "still_support" | "shift_to_conditional" | "shift_to_oppose";
}
