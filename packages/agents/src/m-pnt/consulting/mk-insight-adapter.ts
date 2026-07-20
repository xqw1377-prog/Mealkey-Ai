/**
 * Positioning Intelligence Provider — M-PNT → MKInsight[]
 */
import type { MKInsight } from "../../founder-os/mk-insight";
import { expertReportToInsights } from "../../founder-os/mk-insight";
import type { BrandStrategyProject } from "./types";
import { toMPntExpertReportWithStrength } from "./expert-report-with-strength";

/** 品牌定位判断 → 统一洞察（深化既有 ExpertReport 接入） */
export function toMPntMkInsights(
  project: BrandStrategyProject,
  opts?: { caseId?: string },
): { insights: MKInsight[]; brandStrength?: number } {
  const { report, strength } = toMPntExpertReportWithStrength(project, opts);
  const insights = expertReportToInsights(report).map((insight) => ({
    ...insight,
    feedsRoles: insight.feedsRoles || ["CBO", "CMO", "CSO"],
    confidence: Math.min(
      0.92,
      Math.max(insight.confidence, (strength.overall || 50) / 100),
    ),
  }));
  return { insights, brandStrength: strength.overall };
}
