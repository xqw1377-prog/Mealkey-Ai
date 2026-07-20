/**
 * Restaurant Intelligence Profile V1 — 经营认知画像（理解层 Snapshot）
 * 权威：docs/MEALKEY_RESTAURANT_INTELLIGENCE_PROFILE_V1.md
 *
 * 事实层 = Restaurant Brain；本文件只描述 AI 当前理解，确认前不得当事实写死。
 */

export type RipSentimentV1 = "positive" | "neutral" | "negative";

export type RestaurantEvidenceV1 = {
  schemaVersion: 1;
  id: string;
  source: string;
  content: string;
  sentiment: RipSentimentV1;
  keyword?: string;
  aspect?: string;
  signal?: string;
  confidence: number;
  observedAt?: string;
  relatedAspect?: string;
};

export type RipConfirmStatusV1 =
  | "draft"
  | "pending_confirm"
  | "confirmed"
  | "revised"
  | "rejected";

export type RipAspectScoreV1 = {
  aspect: string;
  label: string;
  /** 0–100；无证据则省略 */
  score?: number;
  evidenceIds: string[];
};

export type RipCognitionGapV1 = {
  founderClaim: string;
  customerPerception: string;
  summaryLine: string;
  evidenceIds: string[];
};

export type RipBasicIdentityV1 = {
  brandName: string;
  category?: string;
  city: string;
  districtOrArea?: string;
  stageLabel?: string;
  avgTicketHint?: string;
  competitionHint?: string;
};

export type RipCustomerPerceptionV1 = {
  aspectScores: RipAspectScoreV1[];
  positiveKeywords: string[];
  watchouts: string[];
  /** 无可靠外部证据时为 true */
  evidenceInsufficient: boolean;
};

export type RestaurantIntelligenceSnapshotV1 = {
  schemaVersion: 1;
  snapshotId: string;
  projectId: string;
  versionLabel: string;
  status: RipConfirmStatusV1;
  createdAt: string;
  confirmedAt?: string;
  basic: RipBasicIdentityV1;
  customer: RipCustomerPerceptionV1;
  cognitionGap?: RipCognitionGapV1 | null;
  /** 最多 3 条弱提醒，须可追溯 */
  alerts: Array<{ line: string; evidenceIds: string[] }>;
  evidence: RestaurantEvidenceV1[];
  source: "rip_intake_v1";
  /** 采集步骤是否诚实完成（禁止假勾） */
  collection: {
    identityReady: boolean;
    reviewIntelReady: boolean;
    feedbackIntelReady: boolean;
    marketScanReady: boolean;
    degradedNotes: string[];
  };
};

/** profile JSON 键（V1 冻结） */
export const PROFILE_RIP_KEY = "restaurantIntelligenceProfile" as const;

export type RestaurantIntelligenceProfileStoreV1 = {
  schemaVersion: 1;
  currentSnapshotId: string | null;
  snapshots: RestaurantIntelligenceSnapshotV1[];
};
