import type {
  DiagnosisCase,
  DiagnosisHypothesis,
  DiagnosisLearning,
  DiagnosisObservation,
  DiagnosisPattern,
  ExternalScanJob,
  RestaurantContextRecord,
} from "./knowledge";
import type { RestaurantEvolutionState } from "./reasoning/evolution";

/**
 * m-ops-diag Contract V1 — SSOT
 * 权威：docs/M_OPS_DIAG_AGENT_V1.md
 * 推理：docs/M_OPS_DIAG_DIAGNOSIS_MODEL_V1.md
 * 详细：docs/M_OPS_DIAG_DIAGNOSIS_MODEL_V1_1_DETAIL.md
 *
 * Gateway 对外 agentId 与 MealKey Host 内置注册一致：restaurant-diagnosis
 * 包名仍为 @mealkey/m-ops-diag（引擎实现，非 Host ID）
 */

/** Host / Gateway / Store 使用的官方 Agent ID */
export const M_OPS_DIAG_AGENT_ID = "restaurant-diagnosis" as const;
/** 引擎包/内部标识（勿当作 Gateway X-Agent-Id） */
export const M_OPS_DIAG_PACKAGE_ID = "m-ops-diag" as const;
export const M_OPS_DIAG_PRODUCT_NAME = "餐厅经营体检系统" as const;
export const M_OPS_DIAG_PRODUCT_NAME_FULL = "餐启 · 餐厅经营体检系统" as const;

export type HealthDimension =
  | "customer"
  | "product"
  | "service"
  | "operation"
  | "competition"
  | "growth";

export type HealthLevel =
  | "healthy"
  | "observe"
  | "attention"
  | "risk"
  | "critical";

export type HealthDeltaDirection = "up" | "down" | "flat";

/** focus 映射引擎：service→Operation；product→Product；competition→Competition；其余 overall/聚合 */
export type DiagnosisFocus =
  | "service"
  | "product"
  | "traffic"
  | "competition"
  | "cost"
  | "overall";

export type DiagnosisHorizon = "today" | "7d" | "30d";

/** 只读餐厅上下文（Brain / RIP 投影；Engine 不写回） */
export type RestaurantDiagnosisContext = {
  brandName?: string;
  storeName?: string;
  category?: string;
  city?: string;
  address?: string;
  stage?: string;
  projectId?: string;
};

export type DiagnosisFact = {
  kind: string;
  claim: string;
  sourceRef?: string;
  asOf?: string;
};

export type DiagnosisEvidenceItem = {
  id?: string;
  source: string;
  claim: string;
  /** 来源层：老板/系统/外部/推理 */
  kind?:
    | "owner_fact"
    | "system_fact"
    | "external_evidence"
    | "inferred_fact";
  /** 评论极性等可选标签 */
  sentiment?: "positive" | "neutral" | "negative";
  theme?: string;
  observedAt?: string;
  url?: string;
};

export type HealthMetricDelta = {
  metric: string;
  direction: HealthDeltaDirection;
  magnitude: 0 | 1 | 2 | 3;
  summary: string;
  changed: boolean;
  evidenceIds?: string[];
};

export type HealthDimensionState = {
  dimension: HealthDimension;
  level: HealthLevel;
  previousLevel?: HealthLevel;
  delta: HealthMetricDelta;
  finding: string;
  meaning: string;
  watchHint?: string;
  confidence: number;
  evidenceIds?: string[];
};

export type RestaurantHealthSnapshot = {
  asOf: string;
  summary: string;
  topRiskDimension?: HealthDimension;
  topOpportunityDimension?: HealthDimension;
  dimensions: HealthDimensionState[];
};

export type RestaurantHealthDeltaRecord = {
  dimension: HealthDimension;
  fromLevel: HealthLevel;
  toLevel: HealthLevel;
  direction: HealthDeltaDirection;
  magnitude: 0 | 1 | 2 | 3;
  summary: string;
  evidenceIds?: string[];
};

export type RestaurantHealthModelResult = {
  snapshot: RestaurantHealthSnapshot;
  previousSnapshot?: RestaurantHealthSnapshot;
  deltas: RestaurantHealthDeltaRecord[];
};

export type RestaurantDiagnosisRequest = {
  restaurantContext: RestaurantDiagnosisContext;
  facts?: DiagnosisFact[];
  evidence?: DiagnosisEvidenceItem[];
  focus?: DiagnosisFocus;
  horizon?: DiagnosisHorizon;
  asOf?: string;
  previousSnapshot?: RestaurantHealthSnapshot;
  /** 历史学习记录，用于假设排序闭环 */
  previousLearnings?: DiagnosisLearning[];
};

/** Findings = 发现 / 模式 / 诊断 — 不是建议、不是战略 */
export type DiagnosisFinding = {
  id: string;
  /** Finding：看见了什么 */
  observation: string;
  /** Pattern：像什么问题 */
  pattern: string;
  /** Diagnosis：根因方向 / 经营判断（非战略方案） */
  meaning: string;
  confidence: number;
  focus: DiagnosisFocus;
  evidenceIds?: string[];
};

export type DiagnosisSignalSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * 第一出口：对齐 BusinessSignal 语义，供 Host 映射为 BusinessSignalV1。
 * Engine 不直接依赖 signal-engine 包，避免循环与过重耦合。
 */
export type DiagnosisSignal = {
  id: string;
  type:
    | "CUSTOMER"
    | "PRODUCT"
    | "SERVICE"
    | "OPERATION"
    | "COMPETITION"
    | "BRAND"
    | "GROWTH"
    | "MARKET";
  severity: DiagnosisSignalSeverity;
  title: string;
  observation: string;
  pattern: string;
  meaning: string;
  impact: string;
  /** 感知器可给「关注建议」，禁止战略终局句 */
  watchHint?: string;
  confidence: number;
  evidence: Array<{ source: string; fact: string }>;
  decisionTopic?: string;
  category?: string;
  impactScore?: number;
  urgency?: DiagnosisSignalSeverity;
  hypotheses?: DiagnosisHypothesis[];
  recommendedValidation?: string[];
};

/** 第二出口：供 VerticalInsightSource / 决策室 */
export type DiagnosisInsight = {
  domain: "operations" | "service" | "product" | "competition" | string;
  question: string;
  finding: string;
  reasoning: string;
  impact: string;
  confidence: number;
  evidence: Array<{ claim: string; source?: string }>;
  unknowns?: string[];
};

export type DiagnosisGap = {
  field: string;
  reason: string;
  severity: "low" | "medium" | "high";
};

/**
 * 产品三轴体检（叠加在六维 Health 之上，不替换）：
 * - business：经营（营收/利润/成本/客单/客流/利用率/贡献）
 * - experience：消费体验（价格/服务/菜品/环境）
 * - operations：运营效率（翻台/上菜/人效/桌效/平效/流失）
 */
export type ExamAxisId = "business" | "experience" | "operations";

export type ExamMetricSource =
  | "owner_reported"
  | "external_evidence"
  | "proxy"
  | "derived"
  | "missing";

export type ExamMetric = {
  id: string;
  label: string;
  /** 可读结论，如「客流偏下行」「上菜偏慢」 */
  reading: string;
  /** 档位原值，便于回放 */
  band?: string;
  source: ExamMetricSource;
  confidence: number;
  evidenceIds?: string[];
};

export type ExamAxisResult = {
  axis: ExamAxisId;
  title: string;
  level: HealthLevel;
  summary: string;
  confidence: number;
  metrics: ExamMetric[];
  gaps: DiagnosisGap[];
};

export type RestaurantExamReport = {
  asOf: string;
  summary: string;
  axes: ExamAxisResult[];
};

/** 专家会审席位 */
export type ExpertRole = "finance" | "product" | "marketing" | "experience";

export type ExpertAnalysisCell = {
  label: string;
  value: string;
  note?: string;
  metricId?: string;
};

export type ExpertOpinion = {
  role: ExpertRole;
  title: string;
  seat: string;
  level: HealthLevel;
  /** 该专家被赋予的能力 */
  capabilities: string[];
  verdict: string;
  /** 量化分析单元格 */
  analyses: ExpertAnalysisCell[];
  observations: string[];
  risks: string[];
  counsel: string[];
  confidence: number;
  refused?: boolean;
  refuseReason?: string;
  /** 供汇总结论做跨官因果合成 */
  signals?: Array<{ id: string; severity: HealthLevel; statement: string }>;
};

export type ExamScorecardRow = {
  domain: string;
  item: string;
  reading: string;
  level: HealthLevel;
  owner: ExpertRole;
};

export type ReportModuleId =
  | "cover"
  | "evolution"
  | "data_readiness"
  | "findings"
  | "scorecard"
  | "conclusion"
  | "action_plan"
  | "open_issues"
  | "discussion";

export type ReportModuleTable = {
  headers: string[];
  rows: string[][];
};

/** 体检报告细分模块 */
export type ReportModule = {
  id: ReportModuleId;
  no: string;
  title: string;
  level?: HealthLevel;
  summary: string;
  bullets: string[];
  tables?: ReportModuleTable[];
  owner?: ExpertRole;
};

/** 四官会审后的正式咨询报告（体检结果表） */
export type ConsultationReport = {
  title: string;
  subtitle: string;
  asOf: string;
  restaurantName: string;
  overallLevel: HealthLevel;
  overallVerdict: string;
  dataReadinessScore: number;
  executiveSummary: string[];
  /** 细分模块：按顺序阅读即完整报告 */
  modules: ReportModule[];
  scorecard: ExamScorecardRow[];
  experts: ExpertOpinion[];
  consensus: string;
  priorities: string[];
  openQuestions: string[];
  disclaimer: string;
  /** 本店学习 DNA 对本次会审的影响摘要 */
  evolutionNote?: string;
  /**
   * 老板可读的一句话主因（规则模板，非 LLM）。
   * 独立壳（小程序）优先展示此字段。
   */
  bossBrief?: string;
};

export type RestaurantDiagnosisResult = {
  agentId: typeof M_OPS_DIAG_AGENT_ID;
  ok: boolean;
  productName: typeof M_OPS_DIAG_PRODUCT_NAME;
  horizon: DiagnosisHorizon;
  focus: DiagnosisFocus;
  asOf?: string;
  /** Delta-Driven Health Model：新增但兼容旧出口 */
  health?: RestaurantHealthModelResult;
  /** 三轴经营体检（经营 / 消费体验 / 运营） */
  exam?: RestaurantExamReport;
  /** 财务官/产品官/营销官/体验官 会审咨询报告 */
  consultation?: ConsultationReport;
  restaurantContext?: RestaurantContextRecord;
  evidenceLedger?: DiagnosisObservation[];
  patterns?: DiagnosisPattern[];
  caseRecord?: DiagnosisCase;
  learningDraft?: DiagnosisLearning[];
  /** 由历史 Learning 形成的门店进化状态 */
  evolution?: RestaurantEvolutionState;
  externalScan?: ExternalScanJob;
  findings: DiagnosisFinding[];
  /** P0 第一出口 */
  signals: DiagnosisSignal[];
  /** P1 第二出口 */
  insights: DiagnosisInsight[];
  gaps: DiagnosisGap[];
  /** 顾客眼中的餐厅（MVP 竖切摘要） */
  customerLens?: {
    theyThink: string[];
    biggestOpportunity?: string;
    biggestRisk?: string;
  };
  errorMessage?: string;
};
