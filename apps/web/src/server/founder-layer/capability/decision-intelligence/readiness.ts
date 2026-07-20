import {
  buildDecisionReadiness,
  type DecisionReadinessV1,
} from "@/server/founder-layer/contracts/business-identity";
import type {
  DecisionAssessmentV1,
  DecisionContextV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";

export function readinessFromContext(input: {
  assessment: DecisionAssessmentV1;
  context: DecisionContextV1;
  hasBrand?: boolean;
  hasGeo?: boolean;
}): DecisionReadinessV1 {
  const known: string[] = [];
  const missing: string[] = [];

  if (input.context.facts.length > 0) known.push("店铺经营状态");
  if (input.context.evidences.some((e) => e.available)) {
    known.push("已收集的决策证据");
  }
  if ((input.context.restaurantState.dimensions.finance ?? 0) > 0) {
    known.push("财务趋势线索");
  }
  if (input.context.similarMatches.length > 0) {
    known.push("相似历史决策");
  }

  for (const u of input.assessment.unknownFactors.slice(0, 3)) {
    missing.push(toUserFacingGapLabel(u));
  }
  for (const g of input.context.openGaps.slice(0, 2)) {
    const q = toUserFacingGapLabel(g.question);
    if (!missing.includes(q)) missing.push(q);
  }
  if (input.hasBrand === false) missing.unshift("品牌信息");
  if (input.hasGeo === false) missing.unshift("地理/地址锚点");

  const canClaim =
    input.hasBrand !== false &&
    input.hasGeo !== false &&
    Boolean(input.context.restaurantState);

  let score = input.assessment.confidenceScore;
  if (input.hasBrand === false) score -= 12;
  if (input.hasGeo === false) score -= 12;

  const highRisk =
    input.assessment.suggestion === "defer" ||
    (input.assessment.riskScore ?? 0) >= 70;

  // 无地理时优先 need_evidence（禁止装懂区域）
  const canClaimExternalIntel = canClaim && input.hasGeo !== false;

  return buildDecisionReadiness({
    score,
    known: known.length ? known : ["开户基础信息"],
    missing,
    canClaimExternalIntel,
    highRisk,
  });
}
