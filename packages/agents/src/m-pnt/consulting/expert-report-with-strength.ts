/**
 * 增强版：ExpertReport + Brand Strength 摘要
 */
import type { ExpertReport } from "../../founder-os/types";
import { computeBrandStrength, formatBrandStrengthSummary } from "./brand-strength-engine";
import { toMPntExpertReport } from "./expert-report-adapter";
import type { BrandStrategyProject } from "./types";

export function toMPntExpertReportWithStrength(
  project: BrandStrategyProject,
  opts?: { caseId?: string },
): { report: ExpertReport; strength: ReturnType<typeof computeBrandStrength> } {
  const strength = computeBrandStrength(project);
  const report = toMPntExpertReport(project, opts);
  const summary = formatBrandStrengthSummary(strength);
  return {
    strength,
    report: {
      ...report,
      risks: [...(report.risks ?? []), summary, ...strength.gaps.slice(0, 3)],
      conditions: [
        ...(report.conditions ?? []),
        ...(strength.readyForCouncil
          ? []
          : ["品牌强度未达常委会消费门槛，建议先补齐缺口"]),
      ],
      stanceHint: strength.readyForCouncil
        ? report.stanceHint
        : report.stanceHint === "favorable"
          ? "cautious"
          : report.stanceHint,
    },
  };
}
