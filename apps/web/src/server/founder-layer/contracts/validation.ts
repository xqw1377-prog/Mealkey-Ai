/**
 * Founder OS Validation OS V1 — 商业假设验证系统
 * 回答：决定什么 → 基于什么假设 → 如何证明 → 何时重判 → 如何改变未来决策
 */

export type ValidationCommitteeId = "market" | "brand" | "business" | "capital";

/** 生命周期（主状态） */
export type ValidationLifecycle =
  | "CREATED"
  | "RUNNING"
  | "OBSERVING"
  | "PASSED"
  | "FAILED"
  | "REVIEW";

/** 兼容旧任务状态 */
export type ValidationTaskStatus =
  | "planned"
  | "in_progress"
  | "at_risk"
  | "completed"
  | "abandoned";

export type ValidationRiskLevel = "low" | "medium" | "high";

export type ValidationMetricStatus = "pending" | "passed" | "failed";

export type ValidationImpact = "confirmed" | "invalidated" | "partial";

export type RedeisionTriggerType = "metric_drop" | "time_delay" | "confidence_change";

export interface ValidationHypothesis {
  hypothesisId: string;
  statement: string;
  sourceDecisionId: string;
  confidence: number;
  riskIfWrong: string;
  committee: ValidationCommitteeId;
}

export interface ValidationMetric {
  /** 兼容旧字段 */
  id: string;
  metricId: string;
  name: string;
  label: string;
  /** 数值目标（可解析时） */
  target: number;
  targetLabel?: string;
  actual?: number;
  actualLabel?: string;
  unit?: string;
  status: ValidationMetricStatus;
}

export interface ValidationCheckIn {
  at: string;
  note: string;
  metrics?: Array<{ metricId: string; actual: string }>;
  deviationDays?: number;
  riskLevel?: ValidationRiskLevel;
  passProbability?: number;
}

export interface ValidationOutcome {
  outcomeId: string;
  taskId: string;
  result: string;
  evidenceId: string;
  impact: ValidationImpact;
  retrospective?: {
    originalConfidence: number;
    judgedCorrectRatio: number;
    whatWasWrong: string;
    newLearning: string;
  };
}

export interface RedeisionTrigger {
  triggerId: string;
  type: RedeisionTriggerType;
  fired: boolean;
  reason: string;
  suggestMeeting: boolean;
  firedAt?: string;
}

/**
 * Validation Task — 假设转行动；存储主对象（含假设/指标/结果）
 */
export interface ValidationTask {
  id: string;
  taskId: string;
  projectId: string;
  decisionId: string;
  hypothesisId: string;
  hypothesis: ValidationHypothesis;
  title: string;
  /** 行动描述 */
  action: string;
  objective: string;
  owner: string;
  deadline: string;
  horizonDays: number;
  startedAt: string;
  dueAt: string;
  lifecycle: ValidationLifecycle;
  /** 兼容旧 UI / listActive */
  status: ValidationTaskStatus;
  committee: ValidationCommitteeId;
  metrics: ValidationMetric[];
  parentEvidenceIds: string[];
  checkIns: ValidationCheckIn[];
  triggers: RedeisionTrigger[];
  outcome?: ValidationOutcome;
  resultEvidenceId?: string;
  resultSummary?: string;
  /** AI 监督判断文案 */
  aiJudgement?: string;
  passProbability?: number;
  /** MVP：签字后第 7 天复盘到期（与 90 天验证并行） */
  d7ReviewDueAt?: string;
  d7ReviewStatus?: "pending" | "done" | "skipped";
  createdAt: string;
  updatedAt: string;
}

/** Decision 自动生成的验证计划包 */
export interface ValidationPlanBundle {
  period: string;
  horizonDays: number;
  hypothesis: ValidationHypothesis;
  task: ValidationTask;
  metrics: ValidationMetric[];
}

export interface CreateValidationTaskInput {
  projectId: string;
  decisionId: string;
  problem: string;
  judgement: string;
  validationPlan?: string;
  /** Decision Contract 中的假设语句 */
  hypothesisStatement?: string;
  action?: string;
  parentEvidenceIds?: string[];
  owner?: string;
  horizonDays?: number;
  confidence?: number;
  committee?: ValidationCommitteeId;
  metricNames?: string[];
  growthPlan?: {
    day30?: string;
    day60?: string;
    day90?: string;
  } | null;
  /**
   * Capability 环路草稿：允许非 Prisma Decision.id（如合约 D-xxx）。
   * 写入 DB / 外键挂接时必须为 false（默认）。
   */
  allowRuntimeDecisionId?: boolean;
}

export const LIFECYCLE_LABEL: Record<ValidationLifecycle, string> = {
  CREATED: "已创建",
  RUNNING: "进行中",
  OBSERVING: "观察中",
  PASSED: "已通过",
  FAILED: "未通过",
  REVIEW: "待复盘",
};

export const COMMITTEE_LABEL: Record<ValidationCommitteeId, string> = {
  market: "市场委员会",
  brand: "品牌委员会",
  business: "商业委员会",
  capital: "资本委员会",
};

export const IMPACT_LABEL: Record<ValidationImpact, string> = {
  confirmed: "假设成立",
  invalidated: "假设证伪",
  partial: "部分成立",
};
