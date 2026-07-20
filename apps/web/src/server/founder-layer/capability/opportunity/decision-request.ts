/**
 * Opportunity O5 — → Decision Request CTA（不代扣开会）
 */

import type { Opportunity } from "../../contracts/opportunity-runtime";

export type OpportunityDecisionRequestCta = {
  topic: string;
  reason: string;
  suggestExpert?: Opportunity["suggestExpert"];
  opportunityId: string;
  score: number;
};

export function toOpportunityDecisionRequestCta(
  opportunity: Opportunity,
): OpportunityDecisionRequestCta {
  return {
    topic:
      opportunity.suggestedTopic ||
      `机会研究：${opportunity.title}`.slice(0, 120),
    reason: opportunity.description || opportunity.title,
    suggestExpert: opportunity.suggestExpert,
    opportunityId: opportunity.id,
    score: opportunity.score,
  };
}
