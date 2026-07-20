/**
 * Track Record — 七常委决策质量追踪系统
 *
 * 顶级顾问必须有「战绩」—— 历史预测的准确率。
 * 本系统追踪每位常委的：
 * - 历史决策记录（支持/反对/条件）
 * - 预测准确率（实际结果 vs 常委判断）
 * - 校准偏差（系统性地偏乐观/偏悲观）
 * - 最强/最弱判断维度
 */

import type { CouncilOpinion, CouncilRoleId } from "./types";

export interface CouncilDecisionRecord {
  decisionId: string;
  caseId: string;
  topic: string;
  member: CouncilRoleId;
  position: "support" | "oppose" | "conditional";
  confidence: number;
  judgment: string;
  top_risk: string;
  prediction?: {
    best_case?: string;
    base_case?: string;
    worst_case?: string;
  };
  actualOutcome?: {
    result: "success" | "failure" | "mixed" | "pending";
    whatHappened: string;
    confidenceCalibration: "over_confident" | "under_confident" | "accurate";
  };
  createdAt: string;
  closedAt?: string;
}

export interface CouncilMemberStats {
  member: CouncilRoleId;
  totalDecisions: number;
  supportRate: number;
  opposeRate: number;
  conditionalRate: number;
  avgConfidence: number;
  accuracy: number; // 0-100
  calibrationBias: "over_confident" | "under_confident" | "balanced";
  accuracyByDimension: Record<string, { count: number; correct: number }>;
  topRisksPredicted: string[];
  blindSpots: string[];
}

const MEMORY: Record<string, CouncilDecisionRecord[]> = {};

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

/** 记录一次常委决策 */
export function recordCouncilDecision(
  record: Omit<CouncilDecisionRecord, "decisionId" | "createdAt">,
): CouncilDecisionRecord {
  const full: CouncilDecisionRecord = {
    ...record,
    decisionId: buildId("CDR"),
    createdAt: new Date().toISOString(),
  };
  const key = `${record.member}-${record.caseId}`;
  if (!MEMORY[key]) MEMORY[key] = [];
  MEMORY[key].push(full);
  return full;
}

/** 回写决策结果 */
export function closeCouncilDecision(
  decisionId: string,
  outcome: CouncilDecisionRecord["actualOutcome"],
): CouncilDecisionRecord | undefined {
  for (const records of Object.values(MEMORY)) {
    const found = records.find((r) => r.decisionId === decisionId);
    if (found) {
      found.actualOutcome = outcome;
      found.closedAt = new Date().toISOString();
      return found;
    }
  }
  return undefined;
}

/** 计算某常委的统计 */
export function getMemberStats(member: CouncilRoleId): CouncilMemberStats {
  const all = Object.values(MEMORY)
    .flat()
    .filter((r) => r.member === member);

  if (all.length === 0) {
    return {
      member,
      totalDecisions: 0,
      supportRate: 0,
      opposeRate: 0,
      conditionalRate: 0,
      avgConfidence: 0,
      accuracy: 0,
      calibrationBias: "balanced",
      accuracyByDimension: {},
      topRisksPredicted: [],
      blindSpots: [],
    };
  }

  const supportCount = all.filter((r) => r.position === "support").length;
  const opposeCount = all.filter((r) => r.position === "oppose").length;
  const conditionalCount = all.filter((r) => r.position === "conditional").length;
  const avgConfidence =
    all.reduce((s, r) => s + r.confidence, 0) / all.length;
  const closed = all.filter((r) => r.actualOutcome && r.actualOutcome.result !== "pending");
  const correct = closed.filter(
    (r) =>
      (r.position === "support" && r.actualOutcome!.result === "success") ||
      (r.position === "oppose" && r.actualOutcome!.result === "failure"),
  ).length;

  // 校准偏差
  const overConfident = closed.filter(
    (r) => r.actualOutcome?.confidenceCalibration === "over_confident",
  ).length;
  const underConfident = closed.filter(
    (r) => r.actualOutcome?.confidenceCalibration === "under_confident",
  ).length;
  const calibrationBias: "over_confident" | "under_confident" | "balanced" =
    overConfident > underConfident * 2
      ? "over_confident"
      : underConfident > overConfident * 2
        ? "under_confident"
        : "balanced";

  // 风险预测
  const allRisks = all.flatMap((r) => [r.top_risk].filter(Boolean));
  const topRisksPredicted = [...new Set(allRisks)].slice(0, 5);

  // 盲区
  const wrong = closed.filter(
    (r) =>
      !(
        (r.position === "support" && r.actualOutcome!.result === "success") ||
        (r.position === "oppose" && r.actualOutcome!.result === "failure")
      ),
  );
  const blindSpots = wrong.slice(0, 3).map((r) => r.judgment.slice(0, 80));

  return {
    member,
    totalDecisions: all.length,
    supportRate: Math.round((supportCount / all.length) * 100),
    opposeRate: Math.round((opposeCount / all.length) * 100),
    conditionalRate: Math.round((conditionalCount / all.length) * 100),
    avgConfidence: Math.round(avgConfidence),
    accuracy: closed.length > 0 ? Math.round((correct / closed.length) * 100) : 0,
    calibrationBias,
    accuracyByDimension: {},
    topRisksPredicted,
    blindSpots,
  };
}

/** 获取所有常委的统计对比 */
export function getAllMembersStats(): CouncilMemberStats[] {
  const roles: CouncilRoleId[] = ["CSO", "CMO", "CBO", "BMO", "CFO", "COO", "CRO"];
  return roles.map(getMemberStats);
}

/** 渲染常委战绩文本（注入 prompt 用） */
export function renderTrackRecordBlock(member: CouncilRoleId): string {
  const stats = getMemberStats(member);

  if (stats.totalDecisions === 0) {
    return `# Track Record — ${member}\n尚无决策记录。首个决策将在本轮产生。`;
  }

  const biasLabel =
    stats.calibrationBias === "over_confident"
      ? "⚠️ 偏乐观（建议降低置信度 10-15 分）"
      : stats.calibrationBias === "under_confident"
        ? "⚠️ 偏保守（建议提高置信度 10-15 分）"
        : "✅ 校准良好";

  const lines = [
    `# Track Record — ${member}`,
    `总决策: ${stats.totalDecisions} 次`,
    `支持率: ${stats.supportRate}% / 反对率: ${stats.opposeRate}% / 条件率: ${stats.conditionalRate}%`,
    `平均置信度: ${stats.avgConfidence}%`,
    `决策准确率: ${stats.accuracy}%`,
    `校准偏差: ${biasLabel}`,
  ];

  if (stats.topRisksPredicted.length > 0) {
    lines.push("", "## 历史风险关注");
    for (const r of stats.topRisksPredicted) {
      lines.push(`- ${r}`);
    }
  }

  if (stats.blindSpots.length > 0) {
    lines.push("", "## 盲区提示（历史判断偏差）");
    for (const b of stats.blindSpots) {
      lines.push(`- ${b}`);
    }
  }

  return lines.join("\n");
}

/** 生成常委自我校准提示（用于 Round3 自我修正） */
export function buildCalibrationHint(member: CouncilRoleId): string {
  const stats = getMemberStats(member);
  if (stats.totalDecisions < 3) {
    return "决策样本不足，暂不进行校准调整。";
  }

  const hints: string[] = [];

  if (stats.calibrationBias === "over_confident") {
    hints.push(`本席历史准确率 ${stats.accuracy}%，但平均置信度 ${stats.avgConfidence}%。建议本轮降低置信度 5-10 分。`);
  } else if (stats.calibrationBias === "under_confident") {
    hints.push(`本席历史准确率 ${stats.accuracy}%，高于平均置信度 ${stats.avgConfidence}%。建议更相信自己的判断。`);
  }

  if (stats.supportRate > 70 && stats.accuracy < 60) {
    hints.push("本席历史支持率偏高但准确率不足，建议在支持前提高证据门槛。");
  }
  if (stats.opposeRate > 50 && stats.accuracy < 60) {
    hints.push("本席历史反对率偏高但并非每次都正确，建议区分真正风险与惯性反对。");
  }

  return hints.length > 0 ? hints.join(" ") : "校准良好，请继续保持当前判断风格。";
}
