/**
 * 微信小程序壳专用导出：只暴露独立体检所需 API。
 * 构建产物：miniprogram/libs/m-ops-diag.js
 */
export {
  diagnoseRestaurantSync,
  mockDiagnosisRequest,
  mockConsumerEvidence,
  buildEvolutionState,
  applyEvolvedPatternLibrary,
  buildBossBrief,
  stageLabel,
  enrichDishSalesWithMenu,
  tagEvidenceFromText,
  inferSentimentFromClaim,
  resolveCategoryThresholds,
  evaluateCategoryAlerts,
  M_OPS_DIAG_PRODUCT_NAME,
  M_OPS_DIAG_AGENT_ID,
} from "./index";

export type {
  RestaurantDiagnosisRequest,
  RestaurantDiagnosisResult,
  DiagnosisFact,
  DiagnosisEvidenceItem,
  DiagnosisLearning,
  ConsultationReport,
  DailyOpsRow,
  DishSalesRow,
  MenuItemCost,
} from "./index";
