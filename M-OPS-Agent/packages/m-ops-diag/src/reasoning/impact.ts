import { calcImpactScore } from "./helpers";
import type { EngineAnalysis } from "../engines/types";

/**
 * Impact 评分：优先用经营真指标，评论条数仅作弱补充。
 */
export function assessImpact(analysis: EngineAnalysis): number {
  const severity =
    analysis.level === "critical"
      ? 9
      : analysis.level === "risk"
        ? 8
        : analysis.level === "attention"
          ? 6
          : analysis.level === "observe"
            ? 4
            : 3;

  const biz = analysis.businessImpact;
  let affectedUsers = 4;
  let trendVelocity = 4;

  if (biz) {
    const revAbs = Math.abs(biz.revenueDeltaPct || 0);
    const trafAbs = Math.abs(biz.trafficDeltaPct || 0);
    // 营收/客流变动幅度 → 影响面（3–10）
    affectedUsers = Math.max(
      3,
      Math.min(10, Math.round(3 + Math.max(revAbs, trafAbs) / 4)),
    );
    // 下行更快加分
    const downPressure =
      (biz.revenueDeltaPct || 0) < 0 || (biz.trafficDeltaPct || 0) < 0;
    trendVelocity = Math.max(
      3,
      Math.min(9, Math.round(3 + Math.max(revAbs, trafAbs) / 5) + (downPressure ? 2 : 0)),
    );
    if (biz.marginPct !== undefined && biz.marginPct < 8) {
      trendVelocity = Math.min(9, trendVelocity + 1);
    }
    if (biz.peakSharePct !== undefined && biz.peakSharePct >= 55) {
      affectedUsers = Math.min(10, affectedUsers + 1);
    }
  } else {
    // 无经营指标时：专家源略强于纯评论计数
    if (analysis.source === "expert" || analysis.source === "merged") {
      affectedUsers = Math.max(5, Math.min(9, (analysis.metricIds?.length || 1) + 4));
      trendVelocity = analysis.level === "risk" || analysis.level === "critical" ? 7 : 5;
    } else {
      affectedUsers = Math.max(3, Math.min(7, analysis.evidenceIds.length + 2));
      trendVelocity = analysis.level === "risk" ? 6 : analysis.level === "attention" ? 5 : 3;
    }
  }

  const solveCost =
    analysis.dimension === "operation" || analysis.dimension === "service" ? 5 : 4;

  return calcImpactScore({
    severity,
    affectedUsers,
    trendVelocity,
    confidence: analysis.confidence,
    solveCost,
  });
}
