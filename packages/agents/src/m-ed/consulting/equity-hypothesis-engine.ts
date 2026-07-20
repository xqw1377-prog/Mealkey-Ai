/**
 * M-ED 股权假设压力测试引擎
 *
 * 对标 M-PNT hypothesis-engine.ts。
 * 对股权方案中的关键假设进行压力测试：
 * - 控制权假设：如果投资人要求一票否决？
 * - 估值假设：如果估值低于预期？
 * - 团队假设：如果核心成员离职？
 * - 合规假设：如果监管政策变化？
 */

import type { GovernanceContract } from "./types";

export interface EquityHypothesis {
  id: string;
  domain: "control" | "valuation" | "team" | "compliance" | "exit";
  assumption: string;
  stressTest: string;
  impact: "critical" | "high" | "medium" | "low";
  probability: "high" | "medium" | "low";
  mitigation: string;
  status: "untested" | "tested" | "mitigated" | "accepted";
}

export interface EquityHypothesisReport {
  hypotheses: EquityHypothesis[];
  criticalCount: number;
  untestedCount: number;
  score: number; // 0-100
  summary: string;
}

function createId(): string {
  return `eh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_HYPOTHESES: Array<{
  domain: EquityHypothesis["domain"];
  assumption: string;
  stressTest: string;
  impact: EquityHypothesis["impact"];
  probability: EquityHypothesis["probability"];
  mitigation: string;
}> = [
  {
    domain: "control",
    assumption: "创始人可以长期保持控制权",
    stressTest: "如果下一轮融资要求投资人拥有董事会席位或一票否决权",
    impact: "critical",
    probability: "medium",
    mitigation: "在章程中预设优先权条款、设立创始人特别股",
  },
  {
    domain: "valuation",
    assumption: "当前估值假设合理可达成",
    stressTest: "如果市场下行导致估值下降 40%",
    impact: "high",
    probability: "medium",
    mitigation: "设定估值下限条款、采用 Earn-out 机制",
  },
  {
    domain: "team",
    assumption: "核心团队在锁定期内保持稳定",
    stressTest: "如果联合创始人或 CTO 在 vesting 期内离开",
    impact: "high",
    probability: "medium",
    mitigation: "分期 vesting 4年、1年 cliff、回购条款",
  },
  {
    domain: "compliance",
    assumption: "当前股权结构合规",
    stressTest: "如果监管政策变化导致 VIE/员工持股计划不合规",
    impact: "high",
    probability: "low",
    mitigation: "定期法务审查、预留合规调整空间",
  },
  {
    domain: "exit",
    assumption: "退出路径清晰可预期",
    stressTest: "如果 5 年内无法实现退出",
    impact: "medium",
    probability: "high",
    mitigation: "明确回购条款、拖动权、优先清算权",
  },
];

function inferMitigationStatus(
  contract?: GovernanceContract | null,
): Array<{ id: string; status: EquityHypothesis["status"] }> {
  if (!contract || contract.status !== "frozen") {
    return DEFAULT_HYPOTHESES.map((h) => ({
      id: h.domain,
      status: "untested" as const,
    }));
  }

  return DEFAULT_HYPOTHESES.map((h) => {
    const killHit = contract.killCriteria.some((k) =>
      new RegExp(h.domain, "i").test(k),
    );
    const moveHit = contract.mondayMoves.some((m) =>
      new RegExp(h.domain === "control" ? "控制|董事|投票" : h.domain, "i").test(m),
    );
    const wontDoHit = contract.whatWeWontDo.some((w) =>
      new RegExp(h.domain, "i").test(w),
    );

    const checks = [killHit, moveHit, wontDoHit].filter(Boolean).length;
    const status: EquityHypothesis["status"] =
      checks >= 2 ? "mitigated" : checks >= 1 ? "tested" : "untested";

    return { id: h.domain, status };
  });
}

export function runEquityHypothesisTest(
  contract?: GovernanceContract | null,
): EquityHypothesisReport {
  const statuses = inferMitigationStatus(contract);

  const hypotheses: EquityHypothesis[] = DEFAULT_HYPOTHESES.map((h, i) => {
    const status = statuses.find((s) => s.id === h.domain)?.status || "untested";
    return {
      id: createId(),
      ...h,
      status,
    };
  });

  const criticalCount = hypotheses.filter((h) => h.impact === "critical").length;
  const untestedCount = hypotheses.filter((h) => h.status === "untested").length;

  const score = Math.max(0, 100 -
    criticalCount * 20 -
    untestedCount * 10 -
    hypotheses.filter((h) => h.status === "tested" && h.impact === "high").length * 5
  );

  const summary = [
    `股权假设压力测试: ${hypotheses.length} 项假设`,
    `关键风险: ${criticalCount} 项`,
    `未缓释: ${untestedCount} 项`,
    score >= 70 ? "股权方案抗压能力良好" : "建议优先缓释关键假设风险",
    ...hypotheses
      .filter((h) => h.impact === "critical" || h.status === "untested")
      .slice(0, 3)
      .map((h) => `  ⚠️ [${h.domain}] ${h.assumption}`),
  ].join("\n");

  return { hypotheses, criticalCount, untestedCount, score, summary };
}

export function formatEquityHypothesisSummary(report: EquityHypothesisReport): string {
  const lines = [
    `# 股权假设压力测试`,
    `综合评分: ${report.score}/100`,
    `关键风险: ${report.criticalCount} | 未缓释: ${report.untestedCount}`,
    "",
  ];

  for (const h of report.hypotheses) {
    const tag =
      h.status === "mitigated" ? "✅" :
      h.status === "tested" ? "📌" : "⚠️";
    lines.push(`${tag} [${h.domain}] ${h.assumption}`);
    lines.push(`  压力: ${h.stressTest}`);
    if (h.status !== "mitigated") {
      lines.push(`  缓释: ${h.mitigation}`);
    }
  }

  lines.push("", report.summary);
  return lines.join("\n");
}
