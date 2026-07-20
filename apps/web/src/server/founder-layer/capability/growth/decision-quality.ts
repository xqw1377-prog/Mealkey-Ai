/**
 * Growth G2 — Decision Quality = 判断30 + 执行30 + 结果40
 */

import type { DecisionPattern } from "../../contracts/growth-runtime";
import type { DecisionQualityScore } from "../../contracts/growth-runtime";

export function scoreDecisionQuality(input: {
  /** 0–100 判断质量 */
  judgement: number;
  /** 0–100 执行纪律 */
  execution: number;
  /** 0–100 结果兑现 */
  result: number;
}): DecisionQualityScore {
  const judgement = clamp(input.judgement);
  const execution = clamp(input.execution);
  const result = clamp(input.result);
  const total = Math.round(judgement * 0.3 + execution * 0.3 + result * 0.4);
  return {
    judgement,
    execution,
    result,
    total,
    weights: { judgement: 30, execution: 30, result: 40 },
    updatedAt: new Date().toISOString(),
  };
}

export function qualityFromPatternOutcome(
  outcome: DecisionPattern["outcome"],
): { judgement: number; execution: number; result: number } {
  if (outcome === "confirmed") {
    return { judgement: 80, execution: 75, result: 85 };
  }
  if (outcome === "partial") {
    return { judgement: 60, execution: 55, result: 50 };
  }
  return { judgement: 45, execution: 50, result: 25 };
}

/** 最近 N 条 Pattern 聚合 */
export function aggregateDecisionQuality(
  patterns: DecisionPattern[],
  window = 10,
): DecisionQualityScore | null {
  const slice = patterns.slice(0, window);
  if (slice.length === 0) return null;
  let j = 0;
  let e = 0;
  let r = 0;
  for (const p of slice) {
    const q = qualityFromPatternOutcome(p.outcome);
    j += q.judgement;
    e += q.execution;
    r += q.result;
  }
  const n = slice.length;
  return scoreDecisionQuality({
    judgement: j / n,
    execution: e / n,
    result: r / n,
  });
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
