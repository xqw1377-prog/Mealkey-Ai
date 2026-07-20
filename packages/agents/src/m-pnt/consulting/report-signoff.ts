/**
 * 战略报告版本与签字
 */
import type { BrandStrategyProject, ReportOutline } from "./types";
import { ContractGateError } from "./types";
import { primaryEvidenceCoverage } from "./evidence-ledger-engine";
import { assertBrandSystemConsistent } from "./brand-system-engine";

export function markReportInReview(outline: ReportOutline): ReportOutline {
  return {
    ...outline,
    signOffStatus: "in_review",
    version: outline.version || 1,
  };
}

export function signStrategyReport(
  outline: ReportOutline,
  input: { signedBy: string; note?: string },
  project?: BrandStrategyProject,
): ReportOutline {
  if (!outline.fullReportMarkdown || outline.chapters.length < 8) {
    throw new ContractGateError("报告未完整，无法签字", [
      "reportOutline.fullReportMarkdown",
      "reportOutline.chapters.length=8",
    ]);
  }
  if (!outline.fullReportMarkdown.includes("附录 A")) {
    throw new ContractGateError("报告缺少一手证据附录，请重新生成后再签字", [
      "reportOutline.appendixA",
    ]);
  }
  if (project) {
    const coverage = primaryEvidenceCoverage(project.assets.evidenceLedger);
    if (!coverage.ok) {
      throw new ContractGateError(
        "一手证据覆盖未通过，禁止签字交付",
        coverage.missing,
      );
    }
    if (project.assets.brandSystem?.status !== "complete") {
      throw new ContractGateError("Brand System 未确认，禁止签字", [
        "brandSystem.status=complete",
      ]);
    }
    assertBrandSystemConsistent(project, project.assets.brandSystem);
  }
  const signedBy = input.signedBy.trim();
  if (!signedBy) {
    throw new ContractGateError("签字人不能为空", ["signedBy"]);
  }
  return {
    ...outline,
    signOffStatus: "signed",
    version: (outline.version || 1) + 1,
    signedAt: new Date().toISOString(),
    signedBy,
    signOffNote: input.note?.trim() || "创始人确认本报告为当前战略交付版本",
  };
}

export function bumpReportVersion(
  outline: ReportOutline,
  nextMarkdown: string,
  chapters: ReportOutline["chapters"],
): ReportOutline {
  return {
    ...outline,
    chapters,
    fullReportMarkdown: nextMarkdown,
    generatedAt: new Date().toISOString(),
    version: (outline.version || 1) + 1,
    signOffStatus: "draft",
    signedAt: undefined,
    signedBy: undefined,
    signOffNote: undefined,
  };
}

export function isReportSigned(outline: ReportOutline | undefined): boolean {
  return outline?.signOffStatus === "signed" && Boolean(outline.signedAt);
}
