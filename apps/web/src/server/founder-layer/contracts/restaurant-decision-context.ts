/**
 * Restaurant Decision Context V1 — Brain 投影给决策链路的只读上下文
 * 权威：Experience Blueprint Phase 0
 *
 * Brain 不判断，只提供事实 / 未知 / 历史。
 * 落点：由 loadRestaurantBrainContext / ensureByProject 组装，不新建表。
 */

import type { DecisionFactV1 } from "./decision-intelligence-data-contract";

export type RestaurantMetricSliceV1 = {
  key: string;
  label: string;
  value: string;
  asOf?: string;
  /** 无可靠数时 false，禁止假精确 */
  reliable: boolean;
};

export type RestaurantHistorySliceV1 = {
  label: string;
  summary: string;
  at?: string;
};

export type RestaurantDecisionMemorySliceV1 = {
  decisionId?: string;
  question: string;
  chosen?: string;
  outcome?: string;
};

export type RestaurantLearningSliceV1 = {
  pattern: string;
  insight: string;
  confidence: number;
};

/**
 * Experience 层「这盘生意真实情况」
 * 可与 AgentRestaurantContext 并存：本类型是决策链路专用瘦投影。
 */
export type RestaurantDecisionContextV1 = {
  schemaVersion: 1;
  restaurantId: string;
  projectId: string;
  identityName: string;
  city?: string;
  storeCount?: number;
  facts: DecisionFactV1[];
  metrics: RestaurantMetricSliceV1[];
  history: RestaurantHistorySliceV1[];
  decisions: RestaurantDecisionMemorySliceV1[];
  learnings: RestaurantLearningSliceV1[];
  unknowns: string[];
  dataCompleteness: number;
  understandingScore: number;
  asOf: string;
};
