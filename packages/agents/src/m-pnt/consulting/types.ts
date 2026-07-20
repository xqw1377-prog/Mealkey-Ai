/**
 * M-PNT V2 P0 — 咨询项目核心类型（权威合同）
 * 文档：docs/M_PNT_V2_P0_IMPLEMENTATION_DESIGN.md
 * 老板主叙事六步：docs/M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md
 */

import type { MpntJourneyAssets } from "./journey-types";

export enum BrandProjectStage {
  DISCOVERY = "DISCOVERY",
  BRAND_BRIEF = "BRAND_BRIEF",
  CATEGORY_ANALYSIS = "CATEGORY_ANALYSIS",
  CONSUMER_INSIGHT = "CONSUMER_INSIGHT",
  COMPETITIVE_MAPPING = "COMPETITIVE_MAPPING",
  POSITIONING_DESIGN = "POSITIONING_DESIGN",
  POSITION_VALIDATION = "POSITION_VALIDATION",
  FINAL_STRATEGY = "FINAL_STRATEGY",
}

export const BRAND_PROJECT_STAGE_ORDER: BrandProjectStage[] = [
  BrandProjectStage.DISCOVERY,
  BrandProjectStage.BRAND_BRIEF,
  BrandProjectStage.CATEGORY_ANALYSIS,
  BrandProjectStage.CONSUMER_INSIGHT,
  BrandProjectStage.COMPETITIVE_MAPPING,
  BrandProjectStage.POSITIONING_DESIGN,
  BrandProjectStage.POSITION_VALIDATION,
  BrandProjectStage.FINAL_STRATEGY,
];

export type StageContract = {
  stage: BrandProjectStage;
  label: string;
  entryCriteria: string[];
  requiredInputs: string[];
  analysisMethod: string;
  outputArtifact: string;
  exitCriteria: string[];
};

/** P0 stub — 门禁字段必须存在，正文可后补 */
export type DiscoveryNotes = {
  artifactId: string;
  status: "draft" | "complete";
  enterpriseStage?: string;
  category?: string;
  productSummary?: string;
  businessGoal?: string;
  notes: string;
};

export type BrandBrief = {
  briefId: string;
  version: number;
  status: "draft" | "complete";
  businessContext: string;
  categoryDefinition: string;
  targetCustomer: string;
  customerNeed: string;
  competitiveSet: string[];
  brandAmbition: string;
  founderBelief: string;
  rawAnswers: Record<string, string>;
  gaps: string[];
  compiledAt: string;
};

export type BrandBasicsFieldKey =
  | "brandName"
  | "storeScale"
  | "annualRevenue"
  | "category"
  | "currentPositioning"
  | "region"
  | "avgTicket"
  | "slogan"
  | "competitors"
  | "advantages"
  | "businessGoal"
  | "mainPain";

export type BrandBasicsValues = Partial<Record<BrandBasicsFieldKey, string>>;

/** Round A：品牌基础档案 */
export type BrandBasicsProfile = {
  artifactId: string;
  status: "draft" | "complete";
  values: BrandBasicsValues;
  missingMust: BrandBasicsFieldKey[];
  missingShould: BrandBasicsFieldKey[];
  updatedAt: string;
  completedAt?: string;
};

export type AdaptiveFollowupPriority = "must" | "should";

export type AdaptiveFollowupQuestion = {
  id: string;
  prompt: string;
  whyNeeded: string;
  priority: AdaptiveFollowupPriority;
  triggeredBy: string[];
  mapsTo?: keyof BrandBrief | "competitiveSetItem" | "occasion" | "switchTrigger";
};

/** Round B：基于基础档案生成的自适应追问 */
export type AdaptiveFollowupSession = {
  sessionId: string;
  brandProjectId: string;
  status: "in_progress" | "ready_to_compile" | "compiled";
  questions: AdaptiveFollowupQuestion[];
  answers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type CategoryBattlefieldOption = {
  optionId: string;
  label: string;
  rationale: string;
  risk: string;
  recommended: boolean;
  /** 四维评分卡（0–100） */
  scores?: {
    opportunity: number;
    defensibility: number;
    resourceFit: number;
    evidenceStrength: number;
    total: number;
  };
  /** 支撑该选项的证据提示 */
  evidenceHints?: string[];
};

export type CategoryDecision = {
  /** 候选战场（含推荐与否决项） */
  options: CategoryBattlefieldOption[];
  selectedOptionId?: string;
  decisionReason?: string;
  decidedAt?: string;
  /** 覆盖系统推荐 */
  overrideRecommended?: boolean;
  overrideReason?: string;
};

export type CategoryDiagnosis = {
  artifactId: string;
  status: "draft" | "complete";
  categoryName: string;
  battlefield: string;
  opportunity: string;
  risks: string[];
  /** 深化字段 */
  lifecycle?: string;
  consumerPerceptionGap?: string;
  strategicQuestion?: string;
  recommendedBattlefield?: string;
  rejectedBattlefields?: string[];
  analysisNarrative?: string;
  /** P1：独立 Category Decision 交付 */
  decision?: CategoryDecision;
};

export type InsightEvidence = {
  evidenceId: string;
  claim: string;
  source: string;
  strength: "strong" | "moderate" | "weak";
  /** 洞察证据审阅：缺省 pending（新生成） */
  reviewStatus?: "pending" | "accepted" | "rejected";
  rejectReason?: string;
};

export type ConsumerInsight = {
  artifactId: string;
  status: "draft" | "complete";
  targetCustomer: string;
  jobsToBeDone: string[];
  barriers: string[];
  unmetNeeds: string[];
  /** 深化字段 */
  primaryPersona?: string;
  occasions?: string[];
  emotionalJob?: string;
  functionalJob?: string;
  switchTriggers?: string[];
  insightNarrative?: string;
  /** P1：可审计洞察证据 */
  insightEvidence?: InsightEvidence[];
  insightStatement?: string;
  /** 创始人确认过洞察判断（编辑/确认陈述） */
  judgmentConfirmedAt?: string;
  /** Protocol P3：Human Truth 四段 */
  humanTruth?: {
    truthId: string;
    behavior: string;
    contradiction: string;
    unmetNeed: string;
    strategicOpportunity: string;
    bannedAlone?: string[];
    compiledAt: string;
  };
};

/** Positioning Map 坐标点（0–100） */
export type MapPlotPoint = {
  id: string;
  label: string;
  kind: "competitor" | "whitespace" | "our_brand" | "no_go";
  x: number;
  y: number;
  mentalSlot?: string;
  note?: string;
  /** 创始人纠偏过 */
  adjusted?: boolean;
  adjustedAt?: string;
};

export type MapEvidence = {
  evidenceId: string;
  claim: string;
  sourceArtifact: string;
  strength: "strong" | "moderate" | "weak";
  /** 地图证据审阅：缺省 pending（新生成） */
  reviewStatus?: "pending" | "accepted" | "rejected";
  rejectReason?: string;
};

export type WhitespaceRegion = {
  x: number;
  y: number;
  label: string;
  /** 半宽/半高，用于可视化机会区块（默认约 12×10） */
  halfW?: number;
  halfH?: number;
};

export type CompetitiveMap = {
  artifactId: string;
  status: "draft" | "complete";
  competitors: Array<{
    name: string;
    mentalSlot: string;
    weakness: string;
    priceBand?: string;
    attackAngle?: string;
    /** 0–100 坐标 */
    x?: number;
    y?: number;
  }>;
  whitespace: string;
  axes?: { x: string; y: string };
  /** 深化字段 */
  mapNarrative?: string;
  noGoZones?: string[];
  attackHypothesis?: string;
  /** P1：可审计 Positioning Map */
  plotPoints?: MapPlotPoint[];
  whitespaceRegion?: WhitespaceRegion;
  mapEvidence?: MapEvidence[];
};

export type HypothesisScorecard = {
  /** 空位契合 */
  whitespaceFit: number;
  /** 证据支撑 */
  evidenceFit: number;
  /** 资源可兑现 */
  resourceFit: number;
  /** 品类/战场契合 */
  categoryFit: number;
  total: number;
};

export type PositioningHypothesis = {
  hypothesisId: string;
  summary: string;
  statement: PositioningStatement;
  attractiveness: "high" | "medium" | "low";
  defensibility: "high" | "medium" | "low";
  /** 四维压力测试评分卡 */
  scores?: HypothesisScorecard;
  /** 压力测试要点 */
  pressureNotes?: string[];
  rejectReason?: string;
  status: "candidate" | "selected" | "rejected";
};

export type PositioningStatement = {
  forAudience: string;
  whoNeed: string;
  ourBrandIs: string;
  thatValue: string;
  because: string;
  unlike: string;
};

export type PositioningEvidence = {
  evidenceId: string;
  claim: string;
  sourceArtifact: string;
  strength: "strong" | "moderate" | "weak";
  /** 人工审阅：缺省视为 accepted（兼容旧数据） */
  reviewStatus?: "pending" | "accepted" | "rejected";
  rejectReason?: string;
};

export type PositioningContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "validated" | "frozen";
  statement: PositioningStatement;
  supportingEvidence: PositioningEvidence[];
  strategicChoice: string;
  rejectedAlternatives: Array<{
    statementSummary: string;
    rejectReason: string;
  }>;
  /** P1：多假设压力测试 */
  hypotheses?: PositioningHypothesis[];
  /** 覆盖最高分假设时的创始人理由 */
  hypothesisOverride?: {
    overrideRecommended: boolean;
    overrideReason?: string;
  };
  /** 验证阶段可复述测试 */
  rehearsal?: PositionRehearsal;
  prerequisites: {
    brandBriefId?: string;
    categoryDone: boolean;
    consumerDone: boolean;
    competitiveDone: boolean;
  };
  frozenAt?: string;
};

export type PositionRehearsalChecklist = {
  canSayInOneBreath: boolean;
  staffCanRepeat: boolean;
  productProvesBecause: boolean;
  unlikeIsClear: boolean;
};

export type PositionRehearsal = {
  status: "pending" | "passed" | "failed";
  founderRetell: string;
  checklist: PositionRehearsalChecklist;
  matchedFields: Array<keyof PositioningStatement>;
  missingFields: Array<keyof PositioningStatement>;
  score: number;
  feedback: string;
  testedAt?: string;
};

export type BrandSystem = {
  artifactId: string;
  status: "draft" | "complete";
  version: number;
  /** 价值主张 */
  valueProposition: string;
  /** 禁用语 */
  forbiddenPhrases: string[];
  /** 传播主线 */
  communicationLine: string;
  /** 产品映射：产品/菜单 → 定位证明点 */
  productMappings: Array<{
    productOrLine: string;
    provesBecause: string;
    occasion?: string;
  }>;
  /** 品牌语气要点 */
  toneNotes?: string[];
  /** 体验红线 */
  experienceNonNegotiables?: string[];
  /** 与定位合同一致性校验快照 */
  consistencyCheck?: {
    ok: boolean;
    checkedAt: string;
    issues: Array<{ code: string; message: string; severity: "error" | "warn" }>;
    coveredFields?: string[];
  };
  compiledAt?: string;
  confirmedAt?: string;
};

export type ReportOutline = {
  artifactId: string;
  chapters: Array<{
    no: string;
    title: string;
    boundArtifactId?: string;
    body?: string;
  }>;
  /** 完整《品牌定位战略报告》Markdown */
  fullReportMarkdown?: string;
  generatedAt?: string;
  /** P2：版本与签字 */
  version?: number;
  signOffStatus?: "draft" | "in_review" | "signed";
  signedAt?: string;
  signedBy?: string;
  signOffNote?: string;
};

export type PrimaryFactSourceType =
  | "founder_interview"
  | "customer_quote"
  | "store_observation"
  | "sales_note"
  | "competitor_note"
  | "other";

export type PrimaryFactRelatedStage =
  | "DISCOVERY"
  | "BRAND_BRIEF"
  | "CATEGORY_ANALYSIS"
  | "CONSUMER_INSIGHT"
  | "COMPETITIVE_MAPPING"
  | "POSITIONING_DESIGN";

/** 一手事实（可引用、可审计） */
export type PrimaryFact = {
  factId: string;
  claim: string;
  sourceType: PrimaryFactSourceType;
  relatedStage: PrimaryFactRelatedStage;
  strength: "strong" | "moderate" | "weak";
  capturedAt: string;
  capturedBy?: string;
  tags?: string[];
  /** unverified=待核实（含 Brief 种子）；verified=可进门禁 */
  verificationStatus?: "unverified" | "verified";
};

export type EvidenceLedger = {
  ledgerId: string;
  facts: PrimaryFact[];
  updatedAt: string;
};

export type BrandStrategyProject = {
  projectId: string;
  brandProjectId: string;
  /** 绑定的品牌 ID；切换品牌后须重建咨询项目 */
  boundBrandId?: string;
  stage: BrandProjectStage;
  stageStatus: "active" | "blocked" | "complete";
  blockedReasons: string[];
  assets: {
    discoveryNotes?: DiscoveryNotes;
    /** Round A：详尽基础信息（定位/调研的前置条件） */
    brandBasics?: BrandBasicsProfile;
    /** Round B：基于基础信息生成的自适应追问 */
    adaptiveFollowups?: AdaptiveFollowupSession;
    brandBrief?: BrandBrief;
    categoryDiagnosis?: CategoryDiagnosis;
    consumerInsight?: ConsumerInsight;
    competitiveMap?: CompetitiveMap;
    positioningContract?: PositioningContract;
    brandSystem?: BrandSystem;
    reportOutline?: ReportOutline;
    /** 一手证据账本 */
    evidenceLedger?: EvidenceLedger;
    /**
     * 六步价值路径资产（老板主叙事）
     * 见 docs/M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md
     */
    journey?: MpntJourneyAssets;
  };
  history: Array<{
    at: string;
    from: BrandProjectStage;
    to: BrandProjectStage;
    reason: string;
  }>;
  updatedAt: string;
};

export type BriefInterviewLayer =
  | "enterprise"
  | "category"
  | "customer"
  | "competition"
  | "founder";

export type BriefInterviewSession = {
  brandProjectId: string;
  layer: BriefInterviewLayer;
  answers: Record<string, string>;
  openQuestions: string[];
  completeness: number;
  status: "in_progress" | "ready_to_compile" | "compiled";
};

export class StageGateError extends Error {
  readonly code = "STAGE_GATE";
  constructor(
    message: string,
    public readonly missing: string[],
  ) {
    super(message);
    this.name = "StageGateError";
  }
}

export class ContractGateError extends Error {
  readonly code = "CONTRACT_GATE";
  constructor(
    message: string,
    public readonly missing: string[],
  ) {
    super(message);
    this.name = "ContractGateError";
  }
}
