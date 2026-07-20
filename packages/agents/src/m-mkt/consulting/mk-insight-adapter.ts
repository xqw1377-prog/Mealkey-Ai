/**
 * Market Intelligence Provider — M-MKT → MKInsight[]
 */
import type { MKInsight } from "../../founder-os/mk-insight";
import { expertReportToInsights } from "../../founder-os/mk-insight";
import type { AgentConsultingProject } from "../../consulting-os/types";
import { toMMktExpertReportDeep } from "./expert-report-adapter";

/** 市场有没有机会？→ 统一洞察 */
export function toMMktMkInsights(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): MKInsight[] {
  const report = toMMktExpertReportDeep(project, opts);
  return expertReportToInsights(report).map((insight) => ({
    ...insight,
    feedsRoles: insight.feedsRoles || ["CMO", "CSO", "BMO", "CBO"],
  }));
}
