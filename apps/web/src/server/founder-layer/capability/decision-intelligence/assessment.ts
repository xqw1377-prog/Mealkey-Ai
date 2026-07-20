import type {
  DecisionAssessmentV1,
  DecisionContextV1,
  DecisionOptionV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Pre-Assessment：扩店决策信心 */
export function computePreAssessment(input: {
  decisionId: string;
  context: DecisionContextV1;
  options: DecisionOptionV1[];
}): DecisionAssessmentV1 {
  const ctx = input.context;
  const completeness = ctx.restaurantState.confidence * 100;
  const evidenceScore = Math.min(
    100,
    ctx.evidences.filter((e) => e.available).length * 18 +
      ctx.facts.length * 8,
  );
  const informationCompleteness = clamp(
    completeness * 0.45 + evidenceScore * 0.55,
  );

  const unknownPenalty = Math.min(40, ctx.unknowns.length * 12);
  const org = ctx.restaurantState.dimensions.organization ?? 40;
  const finance = ctx.restaurantState.dimensions.finance ?? 40;

  const riskScore = clamp(
    35 + unknownPenalty + (org < 55 ? 20 : 0) + (finance < 55 ? 15 : 0),
  );
  const executionScore = clamp((org + finance) / 2);
  const reasoningQuality = clamp(
    55 +
      (ctx.options.length >= 2 || input.options.length >= 2 ? 15 : 0) +
      (ctx.similarMatches.length > 0 ? 10 : 0) -
      unknownPenalty * 0.3,
  );
  const councilAgreement = 50; // 挑战前中性

  const confidenceScore = clamp(
    informationCompleteness * 0.3 +
      (100 - riskScore) * 0.25 +
      executionScore * 0.2 +
      reasoningQuality * 0.15 +
      councilAgreement * 0.1,
  );

  let suggestion: DecisionAssessmentV1["suggestion"] = "proceed_with_conditions";
  if (informationCompleteness < 40 || ctx.unknowns.length >= 3) {
    suggestion = "need_more_evidence";
  } else if (riskScore >= 70 || org < 50) {
    suggestion = "defer";
  } else if (confidenceScore >= 75 && riskScore < 45) {
    suggestion = "proceed";
  }

  const topRisk =
    org < finance
      ? "组织复制 / 店长能力"
      : finance < 55
        ? "现金与利润缓冲"
        : toUserFacingGapLabel(ctx.unknowns[0] || "执行落地强度");

  return {
    id: `assess_pre_${input.decisionId}`,
    decisionId: input.decisionId,
    kind: "pre",
    confidenceScore,
    informationCompleteness,
    riskScore,
    executionScore,
    councilAgreement,
    reasoningQuality,
    topRisk,
    unknownFactors: ctx.unknowns.slice(0, 4).map((u) => toUserFacingGapLabel(u)),
    suggestion,
    rationale: [
      `信息完整度 ${informationCompleteness}`,
      `风险指数 ${riskScore}（主要：${topRisk}）`,
      `执行匹配 ${executionScore}`,
      ctx.openGaps.length
        ? `仍有 ${ctx.openGaps.length} 个关键缺口待补`
        : "关键缺口已收敛",
    ],
    computedAt: new Date().toISOString(),
  };
}

export function computePostAssessment(input: {
  decisionId: string;
  pre: DecisionAssessmentV1;
  actualSummary: string;
  successBand: "success" | "partial" | "fail";
}): DecisionAssessmentV1 {
  const exec =
    input.successBand === "success"
      ? 85
      : input.successBand === "partial"
        ? 60
        : 35;
  const confidenceScore = clamp(
    input.pre.confidenceScore * 0.4 + exec * 0.6,
  );
  return {
    ...input.pre,
    id: `assess_post_${input.decisionId}`,
    kind: "post",
    executionScore: exec,
    confidenceScore,
    rationale: [
      `预测信心 ${input.pre.confidenceScore}`,
      `实际结果：${input.actualSummary}`,
      `事后评分 ${confidenceScore}`,
    ],
    computedAt: new Date().toISOString(),
  };
}
