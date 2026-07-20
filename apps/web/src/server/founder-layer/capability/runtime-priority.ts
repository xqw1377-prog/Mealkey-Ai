/**
 * Runtime 冲突裁决 — Risk 优先于 Opportunity（Brief / merge 共用）
 */

import type { RiskAlert, RiskLevel } from "../contracts/risk-runtime";
import type { Opportunity } from "../contracts/opportunity-runtime";

const LEVEL_RANK: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function riskLevelRank(level: string | undefined | null): number {
  if (!level) return 0;
  return LEVEL_RANK[level as RiskLevel] || 0;
}

/** 未关闭风险按严重度排序（critical 优先） */
export function sortRiskAlertsBySeverity(alerts: RiskAlert[]): RiskAlert[] {
  return [...alerts].sort((a, b) => {
    const d = riskLevelRank(b.level) - riskLevelRank(a.level);
    if (d !== 0) return d;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

export function pickTopOpenRiskAlert(
  alerts: RiskAlert[] | unknown,
): RiskAlert | null {
  if (!Array.isArray(alerts)) return null;
  const open = (alerts as RiskAlert[]).filter(
    (a) => a && a.id && a.status !== "resolved",
  );
  if (!open.length) return null;
  return sortRiskAlertsBySeverity(open)[0] || null;
}

export function isBlockingRisk(alert: RiskAlert | null | undefined): boolean {
  if (!alert || alert.status === "resolved") return false;
  return (
    alert.level === "critical" ||
    alert.level === "high" ||
    Boolean(alert.suggestCouncil) ||
    alert.type === "financial"
  );
}

/**
 * 存在阻断级风险时：机会降权 / 标记 deferredByRisk，不删除记录。
 */
export function deferOpportunitiesForBlockingRisk(
  opportunities: Opportunity[],
  blocking: RiskAlert | null | undefined,
): Opportunity[] {
  if (!blocking || !isBlockingRisk(blocking)) return opportunities;
  return opportunities.map((opp) => ({
    ...opp,
    confidence: Math.min(opp.confidence, 0.35),
    status: opp.status === "exploring" ? "detected" : opp.status,
    description: opp.description.includes("风险优先")
      ? opp.description
      : `${opp.description}（风险优先：先处理「${blocking.title}」）`.slice(
          0,
          240,
        ),
    // 扩展字段，Brief 可识别
    ...( {
      deferredByRisk: true,
      deferredByRiskId: blocking.id,
    } as unknown as Partial<Opportunity>),
  }));
}

export function pickTopOpportunity(
  opportunities: Opportunity[] | unknown,
  opts?: { hideWhenRiskBlocks?: boolean; blockingRisk?: RiskAlert | null },
): Opportunity | null {
  if (!Array.isArray(opportunities)) return null;
  if (opts?.hideWhenRiskBlocks && isBlockingRisk(opts.blockingRisk)) {
    return null;
  }
  const open = (opportunities as Opportunity[]).filter(
    (o) =>
      o &&
      o.id &&
      o.status !== "rejected" &&
      o.status !== "approved" &&
      !(o as Opportunity & { deferredByRisk?: boolean }).deferredByRisk,
  );
  if (!open.length) return null;
  return [...open].sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;
}
