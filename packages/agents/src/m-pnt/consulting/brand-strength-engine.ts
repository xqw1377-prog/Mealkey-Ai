/**
 * Brand Strength Index — Interbrand 启发的简化品牌力度量
 * 用于签字门禁、常委条件支持与 Validation 回写（非完整财务估值）。
 */

import type { BrandStrategyProject } from "./types";

export type BrandStrengthDimensionId =
  | "clarity"
  | "differentiation"
  | "consistency"
  | "relevance"
  | "evidence";

export interface BrandStrengthDimension {
  id: BrandStrengthDimensionId;
  label: string;
  score: number; // 0–100
  note: string;
}

export interface BrandStrengthIndex {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: BrandStrengthDimension[];
  gaps: string[];
  readyForCouncil: boolean;
  computedAt: string;
}

function gradeOf(score: number): BrandStrengthIndex["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * 从咨询项目资产计算品牌强度（启发式，可被后期调研校准）
 */
export function computeBrandStrength(
  project: BrandStrategyProject,
): BrandStrengthIndex {
  const brief = project.assets.brandBrief;
  const contract = project.assets.positioningContract;
  const system = project.assets.brandSystem;
  const consumer = project.assets.consumerInsight;
  const ledger = project.assets.evidenceLedger;
  const stmt = contract?.statement;

  const gaps: string[] = [];

  // Clarity
  let clarity = 20;
  if (stmt?.forAudience && stmt?.thatValue && stmt?.because) clarity = 70;
  if (stmt?.unlike) clarity += 15;
  if (contract?.status === "frozen") clarity += 15;
  else if (contract?.status === "validated") clarity += 10;
  else gaps.push("定位合同未冻结，清晰度受限");
  if (contract?.rehearsal?.status === "passed") clarity = Math.min(100, clarity + 10);
  else if (contract?.rehearsal) {
    gaps.push("复述测试未通过");
  }
  clarity = Math.min(100, clarity);

  // Differentiation
  let differentiation = 25;
  if (stmt?.unlike && stmt.unlike.length > 4) differentiation = 65;
  if (stmt?.thatValue && !/好吃|实惠|便宜|服务好/.test(stmt.thatValue)) {
    differentiation += 15;
  } else if (stmt?.thatValue) {
    gaps.push("差异表述偏通用，需收紧到可占位差异");
  }
  const rejected = contract?.rejectedAlternatives?.length || 0;
  if (rejected > 0) differentiation += 10;
  differentiation = Math.min(100, differentiation);

  // Consistency
  let consistency = 30;
  if (system?.valueProposition) consistency = 55;
  if (system?.communicationLine) consistency += 15;
  if (system?.consistencyCheck?.ok) consistency += 25;
  else if (system?.consistencyCheck && !system.consistencyCheck.ok) {
    gaps.push("Brand System 与定位存在不一致");
    consistency = Math.min(consistency, 45);
  } else {
    gaps.push("Brand System 未确认");
  }
  consistency = Math.min(100, consistency);

  // Relevance
  let relevance = 25;
  if (brief?.targetCustomer && brief?.customerNeed) relevance = 55;
  if (consumer?.insightStatement || (consumer?.jobsToBeDone?.length ?? 0) > 0)
    relevance += 25;
  else gaps.push("缺少消费者洞察锚点");
  if (brief?.status === "complete") relevance += 10;
  relevance = Math.min(100, relevance);

  // Evidence
  const facts = ledger?.facts || [];
  const accepted = facts.filter((f) => f.strength !== "weak");
  let evidence = Math.min(90, 15 + accepted.length * 12);
  const contractEv = contract?.supportingEvidence || [];
  const strongEv = contractEv.filter((e) => e.strength === "strong").length;
  evidence = Math.min(100, evidence + strongEv * 10);
  if (accepted.length < 3) gaps.push("一手证据不足（建议 ≥3 条非弱证据事实）");
  if (contractEv.length < 2) gaps.push("定位支撑证据不足");

  const dimensions: BrandStrengthDimension[] = [
    {
      id: "clarity",
      label: "清晰度",
      score: clarity,
      note: "定位一句话可复述、合同冻结与复述测试",
    },
    {
      id: "differentiation",
      label: "差异度",
      score: differentiation,
      note: "Unlike + 非通用价值主张",
    },
    {
      id: "consistency",
      label: "一致性",
      score: consistency,
      note: "Brand System 与定位合同对齐",
    },
    {
      id: "relevance",
      label: "相关性",
      score: relevance,
      note: "目标用户与需求洞察匹配",
    },
    {
      id: "evidence",
      label: "证据强度",
      score: evidence,
      note: "证据账本与合同支撑证据",
    },
  ];

  const overall = avg(dimensions.map((d) => d.score));
  const readyForCouncil =
    overall >= 55 &&
    Boolean(contract) &&
    (contract!.status === "proposed" ||
      contract!.status === "validated" ||
      contract!.status === "frozen");

  return {
    overall,
    grade: gradeOf(overall),
    dimensions,
    gaps,
    readyForCouncil,
    computedAt: new Date().toISOString(),
  };
}

/** 将强度摘要并入 ExpertReport risks/conditions 的辅助文本 */
export function formatBrandStrengthSummary(index: BrandStrengthIndex): string {
  const dims = index.dimensions
    .map((d) => `${d.label}${d.score}`)
    .join(" / ");
  return `Brand Strength ${index.overall}（${index.grade}）：${dims}`;
}
