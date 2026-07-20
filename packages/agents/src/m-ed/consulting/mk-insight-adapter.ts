/**
 * Organization Intelligence Provider — M-ED → MKInsight[]
 */
import type { MKInsight } from "../../founder-os/mk-insight";
import { expertReportToInsights } from "../../founder-os/mk-insight";
import type { AgentConsultingProject } from "../../consulting-os/types";
import { toMEdExpertReportDeep } from "./expert-report-adapter";

/** 人和利益结构是否支撑战略？→ 统一洞察 */
export function toMEdMkInsights(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): MKInsight[] {
  const report = toMEdExpertReportDeep(project, opts);
  return expertReportToInsights(report).map((insight) => ({
    ...insight,
    feedsRoles: insight.feedsRoles || ["CFO", "COO", "CRO", "CSO"],
  }));
}
