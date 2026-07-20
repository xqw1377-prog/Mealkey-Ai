/**
 * Risk Runtime Score — R1 纯函数入口（与 contracts 对齐）
 */

export {
  assertRiskEvidenceForLevel,
  buildRiskAlert,
  computeRiskScore,
  isRiskType,
  riskLevelFromScore,
} from "../../contracts/risk-runtime";

export type {
  RiskAlert,
  RiskAlertStatus,
  RiskEvent,
  RiskEventType,
  RiskLevel,
  RiskScoreFactors,
  RiskSuggestExpert,
  RiskType,
} from "../../contracts/risk-runtime";
