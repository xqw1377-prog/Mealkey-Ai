/**
 * m-ops-diag Contract V1 — SSOT
 * 权威：docs/M_OPS_DIAG_AGENT_V1.md
 */

export const M_OPS_DIAG_AGENT_ID = "m-ops-diag" as const;
export const M_OPS_DIAG_PRODUCT_NAME = "餐启经营诊断" as const;
export const M_OPS_DIAG_PRODUCT_NAME_FULL = "餐启 · 餐厅经营诊断系统" as const;

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
  /** 评论极性等可选标签 */
  sentiment?: "positive" | "neutral" | "negative";
  theme?: string;
  observedAt?: string;
  url?: string;
};

export type RestaurantDiagnosisRequest = {
  restaurantContext: RestaurantDiagnosisContext;
  facts?: DiagnosisFact[];
  evidence?: DiagnosisEvidenceItem[];
  focus?: DiagnosisFocus;
  horizon?: DiagnosisHorizon;
};

/** Findings = 发现 / 模式 / 含义 — 不是建议、不是战略 */
export type DiagnosisFinding = {
  id: string;
  /** 发现 */
  observation: string;
  /** 模式 */
  pattern: string;
  /** 含义 */
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
  type: "CUSTOMER" | "OPERATION" | "COMPETITION" | "BRAND" | "MARKET";
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

export type RestaurantDiagnosisResult = {
  agentId: typeof M_OPS_DIAG_AGENT_ID;
  ok: boolean;
  productName: typeof M_OPS_DIAG_PRODUCT_NAME;
  horizon: DiagnosisHorizon;
  focus: DiagnosisFocus;
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
