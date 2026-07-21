/**
 * Organization Intelligence Provider — M-ED → MKInsight[]
 */
import type { MKInsight } from "../../founder-os/mk-insight";
import { expertReportToInsights } from "../../founder-os/mk-insight";
import type { AgentConsultingProject } from "../../consulting-os/types";
import { toMEdExpertReportDeep } from "./expert-report-adapter";

function applyStrength(
  insights: MKInsight[],
  project: AgentConsultingProject,
): MKInsight[] {
  const strength = project.assets.domainStrength;
  const facts = project.assets.primaryFacts || [];
  const extraEvidence = facts.slice(0, 4).map((f, idx) => ({
    id: f.factId || `pf_${idx}`,
    type: "PRIMARY_FACT" as const,
    claim: f.claim.slice(0, 160),
    source: f.sourceRef,
    strength: "medium" as const,
  }));
  if (!strength && extraEvidence.length === 0) return insights;

  const factor = strength
    ? strength.readyForCouncil
      ? 1
      : Math.max(0.42, strength.overall / 100)
    : 0.85;

  return insights.map((insight) => ({
    ...insight,
    confidence: Math.min(
      1,
      Math.round((insight.confidence || 0.6) * factor * 100) / 100,
    ),
    evidence: [...(insight.evidence || []), ...extraEvidence].slice(0, 8),
    reasoning:
      strength && !strength.readyForCouncil
        ? `${insight.reasoning}（领域强度 ${strength.overall}/100，建议先补：${strength.gaps.slice(0, 2).join("、") || "证据"}）`
        : insight.reasoning,
  }));
}

/** 人和利益结构是否支撑战略？→ 统一洞察 */
export function toMEdMkInsights(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): MKInsight[] {
  const report = toMEdExpertReportDeep(project, opts);
  const insights = expertReportToInsights(report).map((insight) => ({
    ...insight,
    feedsRoles: insight.feedsRoles || ["CFO", "COO", "CRO", "CSO"],
  }));
  return applyStrength(insights, project);
}
