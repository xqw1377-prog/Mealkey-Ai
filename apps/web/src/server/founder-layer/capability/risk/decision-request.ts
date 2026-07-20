/**
 * Risk R6 — → Decision Request CTA（不代扣开会）
 */

import type { RiskAlert } from "../../contracts/risk-runtime";

export type RiskDecisionRequestCta = {
  topic: string;
  reason: string;
  suggestExpert?: RiskAlert["suggestExpert"];
  suggestCouncil: boolean;
  riskId: string;
  level: RiskAlert["level"];
};

export function toDecisionRequestCta(
  alert: RiskAlert,
): RiskDecisionRequestCta {
  return {
    topic:
      alert.suggestedTopic ||
      `风险复核：${alert.title}`.slice(0, 120),
    reason: alert.description || alert.title,
    suggestExpert: alert.suggestExpert,
    suggestCouncil: Boolean(alert.suggestCouncil) || alert.level === "critical",
    riskId: alert.id,
    level: alert.level,
  };
}
