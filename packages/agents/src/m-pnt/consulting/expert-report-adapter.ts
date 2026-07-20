/**
 * M-PNT → Founder OS ExpertReport 适配器
 * 把咨询六步资产压成常委可消费的专业意见（不投票）。
 */

import type { ExpertReport, ExpertReportSection } from "../../founder-os/types";
import type { BrandStrategyProject, PositioningStatement } from "./types";

function clip(text: string, max = 280): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "（待补）";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function formatPositioning(s?: PositioningStatement): string {
  if (!s) return "定位合同未冻结";
  return [
    `For Who: ${s.forAudience || "—"}`,
    `Need: ${s.whoNeed || "—"}`,
    `Brand: ${s.ourBrandIs || "—"}`,
    `Value: ${s.thatValue || "—"}`,
    `Reason: ${s.because || "—"}`,
    `Unlike: ${s.unlike || "—"}`,
  ].join(" · ");
}

function inferStance(
  project: BrandStrategyProject,
): ExpertReport["stanceHint"] {
  const contract = project.assets.positioningContract;
  if (!contract) return "insufficient_data";
  if (contract.status === "frozen" || contract.status === "validated") {
    const weak = (contract.supportingEvidence || []).filter(
      (e) => e.strength === "weak",
    ).length;
    if (weak >= 2) return "cautious";
    return "favorable";
  }
  if (contract.status === "proposed") return "cautious";
  return "insufficient_data";
}

/**
 * 从 BrandStrategyProject 生成 Founder OS ExpertReport
 */
export function toMPntExpertReport(
  project: BrandStrategyProject,
  opts?: { caseId?: string },
): ExpertReport {
  const brief = project.assets.brandBrief;
  const category = project.assets.categoryDiagnosis;
  const consumer = project.assets.consumerInsight;
  const competitive = project.assets.competitiveMap;
  const contract = project.assets.positioningContract;
  const system = project.assets.brandSystem;
  const journey = project.assets.journey;

  const caseId =
    opts?.caseId ||
    project.projectId ||
    project.brandProjectId ||
    "M-PNT-CASE";

  const sections: ExpertReportSection[] = [
    {
      id: "category",
      title: "品类判断",
      content: clip(
        [
          category?.categoryName || brief?.categoryDefinition,
          category?.recommendedBattlefield || category?.battlefield,
          category?.opportunity,
          category?.strategicQuestion,
        ]
          .filter(Boolean)
          .join("；") || "品类诊断未完成",
      ),
      evidenceIds: (category as { evidenceIds?: string[] } | undefined)
        ?.evidenceIds,
    },
    {
      id: "mindset",
      title: "用户心智",
      content: clip(
        [
          consumer?.insightStatement,
          consumer?.jobsToBeDone?.join("、"),
          consumer?.emotionalJob || consumer?.functionalJob,
          brief?.customerNeed,
          brief?.targetCustomer,
        ]
          .filter(Boolean)
          .join("；") || "消费者洞察未完成",
      ),
    },
    {
      id: "positioning",
      title: "定位",
      content: clip(formatPositioning(contract?.statement)),
      evidenceIds: (contract?.supportingEvidence || [])
        .map((e) => e.evidenceId)
        .slice(0, 6),
    },
    {
      id: "brand_strategy",
      title: "品牌战略",
      content: clip(
        [
          system?.valueProposition,
          system?.communicationLine,
          contract?.strategicChoice,
          journey?.warRoom?.consensusOneLiner,
          brief?.brandAmbition,
        ]
          .filter(Boolean)
          .join("；") || "品牌战略资产未完成",
      ),
    },
  ];

  const opportunities = [
    category?.opportunity,
    competitive?.whitespace,
    competitive?.whitespaceRegion?.label,
  ].filter((x): x is string => Boolean(x?.trim()));

  const risks = [
    ...(category?.rejectedBattlefields || []).slice(0, 2).map((r) => `否决战场：${r}`),
    ...(system?.consistencyCheck?.issues || [])
      .filter((i) => i.severity === "error")
      .map((i) => i.message),
    contract?.status !== "frozen" && contract?.status !== "validated"
      ? "定位合同尚未冻结"
      : "",
  ].filter((x): x is string => Boolean(x?.trim()));

  const conditions = [
    contract?.status === "frozen" || contract?.status === "validated"
      ? ""
      : "完成定位合同冻结与复述测试",
    (contract?.supportingEvidence?.length || 0) < 2
      ? "补齐至少 2 条中等以上强度证据"
      : "",
    system?.consistencyCheck && !system.consistencyCheck.ok
      ? "修复 Brand System 与定位不一致项"
      : "",
  ].filter(Boolean) as string[];

  const unknowns = [
    ...(brief?.gaps || []).slice(0, 3),
    !consumer ? "缺少消费者洞察" : "",
    !competitive ? "缺少竞争地图" : "",
  ].filter(Boolean) as string[];

  const headline =
    contract?.statement?.thatValue ||
    journey?.warRoom?.consensusOneLiner ||
    brief?.brandAmbition ||
    "M-PNT 品牌战略专业意见（进行中）";

  return {
    engineId: "M-PNT",
    caseId,
    headline: clip(headline, 120),
    stanceHint: inferStance(project),
    sections,
    opportunities: opportunities.length ? opportunities : undefined,
    risks: risks.length ? risks : undefined,
    conditions: conditions.length ? conditions : undefined,
    unknowns: unknowns.length ? unknowns : undefined,
  };
}
