export type DiagnosisDimension =
  | "customer"
  | "product"
  | "service"
  | "operation"
  | "competition"
  | "growth";

export type EvidenceSourceType =
  | "OWNER_INPUT"
  | "POS"
  | "REVIEW"
  | "DIANPING"
  | "XHS"
  | "DOUYIN"
  | "MAP"
  | "COMPETITOR"
  | "INDUSTRY_REPORT";

export type RestaurantContextRecord = {
  restaurantId: string;
  brand?: string;
  category?: string;
  city?: string;
  location?: string;
  priceRange?: string;
  storeStage?: string;
  businessModel?: string;
  operatingModel?: string;
};

export type DiagnosisEvidenceRecord = {
  id: string;
  restaurantId: string;
  source: EvidenceSourceType;
  type: string;
  content: string;
  capturedAt: string;
  reliability: number;
  scope?: string;
  metadata?: Record<string, unknown>;
};

export type DiagnosisObservation = {
  id: string;
  evidenceIds: string[];
  statement: string;
  dimension: DiagnosisDimension;
  trend?: "up" | "down" | "flat";
  confidence: number;
};

export type DiagnosisPattern = {
  id: string;
  name: string;
  category: string;
  observationIds: string[];
  occurrence?: number;
  trend?: "up" | "down" | "flat";
  confidence: number;
};

export type DiagnosisHypothesis = {
  statement: string;
  probability: number;
  supportingEvidence: string[];
  contradictEvidence?: string[];
  validationPlan?: string[];
};

export type DiagnosisCaseStatus =
  | "DISCOVERED"
  | "ANALYZING"
  | "VALIDATED"
  | "TRANSFERRED"
  | "LEARNED";

export type DiagnosisCase = {
  id: string;
  restaurantId: string;
  trigger: string;
  status: DiagnosisCaseStatus;
  observations: string[];
  patterns: string[];
  hypothesis: DiagnosisHypothesis[];
  impactScore?: number;
  createdAt: string;
  updatedAt: string;
};

export type DiagnosisLearning = {
  diagnosisId: string;
  hypothesis: string;
  action?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  lesson?: string;
  /** 回填后自动判定：成立 / 否定 / 混合 */
  polarity?: "confirmed" | "rejected" | "mixed" | "unknown";
  /** 推断主题，供进化加权 */
  themes?: string[];
  /** 首次形成有效回填的时间 */
  verifiedAt?: string;
};

export type ExternalScanJob = {
  restaurantId: string;
  sources: string[];
  frequency: "daily" | "weekly" | "monthly";
  lastRun?: string;
  newEvidenceCount?: number;
};
