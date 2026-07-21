/**
 * Host 侧薄映射 — 不进 Engine 内核。
 * Insight → VerticalInsightSource 形状（由 packages/agents 的 toVerticalMkInsights 消费）。
 */

import {
  M_OPS_DIAG_AGENT_ID,
  type DiagnosisInsight,
  type RestaurantDiagnosisResult,
} from "./contracts";

export type VerticalInsightSourceDraft = {
  agentId: typeof M_OPS_DIAG_AGENT_ID;
  kind: "ops";
  caseId: string;
  findings: Array<{
    domain: string;
    finding: string;
    reasoning: string;
    impact: string;
    confidence: number;
    evidence: Array<{ claim: string; source?: string }>;
  }>;
};

export function toVerticalInsightSource(
  result: RestaurantDiagnosisResult,
  caseId: string,
): VerticalInsightSourceDraft | null {
  if (!result.insights.length) return null;
  return {
    agentId: M_OPS_DIAG_AGENT_ID,
    kind: "ops",
    caseId,
    findings: result.insights.map((i: DiagnosisInsight) => ({
      domain: i.domain,
      finding: i.finding,
      reasoning: i.reasoning,
      impact: i.impact,
      confidence: i.confidence,
      evidence: i.evidence,
    })),
  };
}
