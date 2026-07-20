/**
 * Risk R2 — 验证证伪 / Deviation → Alert 投影
 */

import type { DeviationReport } from "../../contracts/execution-runtime";
import { buildRiskAlert } from "../../contracts/risk-runtime";
import type { RiskAlert, RiskSuggestExpert } from "../../contracts/risk-runtime";

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function expertFromCommittee(
  committee?: string | null,
): RiskSuggestExpert | undefined {
  if (committee === "brand") return "M-PNT";
  if (committee === "market") return "M-MKT";
  if (committee === "business") return "M-BIZ";
  if (committee === "capital") return "M-ED";
  return undefined;
}

export function projectRisksFromValidation(input: {
  ownerId: string;
  projectId: string;
  result: "aligned" | "partial" | "off";
  impact: "confirmed" | "partial" | "invalidated";
  summary: string;
  hypothesis?: string;
  committee?: string;
  validationTaskId?: string;
  decisionId?: string;
}): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  if (input.result !== "off" && input.impact !== "invalidated") {
    return alerts;
  }

  const evidence = [
    input.summary,
    input.hypothesis ? `假设：${input.hypothesis}` : "",
  ].filter(Boolean);

  alerts.push(
    buildRiskAlert({
      id: buildId("risk_val"),
      ownerId: input.ownerId,
      projectId: input.projectId,
      type: input.impact === "invalidated" ? "business" : "execution",
      title:
        input.impact === "invalidated"
          ? "经营假设被证伪"
          : "验证偏离目标",
      description: input.summary.slice(0, 240),
      evidence,
      source: "validation",
      factors: {
        probability: input.impact === "invalidated" ? 0.85 : 0.7,
        impact: 0.8,
        exposure: 0.75,
      },
      suggestExpert: expertFromCommittee(input.committee) || "M-BIZ",
      suggestCouncil: input.impact === "invalidated",
      suggestedTopic: `验证复核：${(input.hypothesis || input.summary).slice(0, 60)}`,
    }),
  );
  return alerts;
}

export function projectRisksFromDeviation(input: {
  ownerId: string;
  projectId: string;
  report: DeviationReport;
}): RiskAlert[] {
  const { report } = input;
  if (report.severity === "low") return [];

  const severityFactor =
    report.severity === "high" ? 0.85 : report.severity === "medium" ? 0.65 : 0.4;

  return [
    buildRiskAlert({
      id: `risk_dev_${report.reportId}`,
      ownerId: input.ownerId,
      projectId: input.projectId,
      type: "execution",
      title: `执行偏航：${report.kind}`,
      description: report.summary,
      evidence: [report.summary, report.suggestedCouncilTopic].filter(Boolean),
      source: "deviation",
      factors: {
        probability: severityFactor,
        impact: report.severity === "high" ? 0.85 : 0.65,
        exposure: 0.8,
      },
      suggestExpert: expertFromCommittee(report.suggestCommittee),
      suggestCouncil: report.severity === "high",
      suggestedTopic: report.suggestedCouncilTopic,
    }),
  ];
}

/** 轻量财务规则：现金月数 < 3 → financial */
export function projectFinancialCashRunwayRisk(input: {
  ownerId: string;
  projectId: string;
  cashMonths?: number | null;
}): RiskAlert | null {
  if (
    input.cashMonths === undefined ||
    input.cashMonths === null ||
    !Number.isFinite(input.cashMonths)
  ) {
    return null;
  }
  if (input.cashMonths >= 3) return null;
  return buildRiskAlert({
    id: `risk_cash_${input.projectId.slice(0, 8)}`,
    ownerId: input.ownerId,
    projectId: input.projectId,
    type: "financial",
    title: "现金流储备不足 3 个月",
    description: `当前现金储备约 ${input.cashMonths.toFixed(1)} 个月固定成本，存在断裂风险。`,
    evidence: [`cashMonths=${input.cashMonths}`],
    source: "rule",
    factors: {
      probability: input.cashMonths < 1.5 ? 0.9 : 0.7,
      impact: 0.95,
      exposure: 0.9,
    },
    suggestExpert: "M-BIZ",
    suggestCouncil: input.cashMonths < 1.5,
    suggestedTopic: "财务风险：现金流与扩张节奏复核",
  });
}
