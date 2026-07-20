/**
 * Opportunity O6 — 失败机会降权
 */

import type { Opportunity } from "../../contracts/opportunity-runtime";
import { computeOpportunityScore } from "../../contracts/opportunity-runtime";

export function applyOpportunityFailureDownweight(
  opportunity: Opportunity,
  lessons: string[],
): Opportunity {
  if (!lessons.length) return opportunity;
  const title = `${opportunity.title} ${opportunity.description}`;
  const hit = lessons.some((l) => overlapLoose(title, l) || overlapLoose(l, title));
  if (!hit) return opportunity;

  const factors = {
    ...opportunity.factors,
    companyFit: Math.max(0, opportunity.factors.companyFit * 0.4),
    timing: Math.max(0, opportunity.factors.timing * 0.7),
  };
  const score = computeOpportunityScore(factors);
  return {
    ...opportunity,
    factors,
    score,
    confidence: Math.max(0.2, opportunity.confidence * 0.7),
    status: score >= 60 ? "exploring" : "detected",
    description: `${opportunity.description}（历史类似机会曾失败，已降权）`.slice(
      0,
      240,
    ),
  };
}

function overlapLoose(a: string, b: string): boolean {
  const tokens = a
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  if (tokens.length === 0) return false;
  return tokens.some((t) => b.includes(t));
}
