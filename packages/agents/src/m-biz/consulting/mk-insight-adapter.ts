/**
 * Business Intelligence Provider — M-BIZ → MKInsight[]
 */
import type { MKInsight } from "../../founder-os/mk-insight";
import { expertReportToInsights } from "../../founder-os/mk-insight";
import type { AgentConsultingProject } from "../../consulting-os/types";
import { toMBizExpertReportDeep } from "./expert-report-adapter";

/** 商业模式是否成立？→ 统一洞察 */
export function toMBizMkInsights(
  project: AgentConsultingProject,
  opts?: { caseId?: string },
): MKInsight[] {
  const report = toMBizExpertReportDeep(project, opts);
  return expertReportToInsights(report).map((insight) => ({
    ...insight,
    feedsRoles: insight.feedsRoles || ["BMO", "CFO", "COO", "CSO"],
  }));
}
