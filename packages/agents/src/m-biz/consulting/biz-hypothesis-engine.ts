/**
 * M-BIZ 商业模式假设压力测试引擎
 *
 * 对标 M-PNT hypothesis-engine.ts。
 * 对商业模式中的关键假设进行压力测试：
 * - 单位经济假设：如果关键成本上浮？
 * - 规模假设：如果规模不经济？
 * - 收入假设：如果客单价不及预期？
 * - 复制假设：如果第二家店模型不成立？
 */

import type { ModeContract } from "./types";

export interface BizHypothesis {
  id: string;
  domain: "unit_econ" | "scale" | "revenue" | "replication" | "cost";
  assumption: string;
  stressTest: string;
  impact: "critical" | "high" | "medium" | "low";
  probability: "high" | "medium" | "low";
  mitigation: string;
  status: "untested" | "tested" | "mitigated" | "accepted";
}

export interface BizHypothesisReport {
  hypotheses: BizHypothesis[];
  criticalCount: number;
  untestedCount: number;
  score: number;
  summary: string;
}

function createId(): string { return `bh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }

const DEFAULT_BIZ_HYPOTHESES: Array<{
  domain: BizHypothesis["domain"]; assumption: string; stressTest: string;
  impact: BizHypothesis["impact"]; probability: BizHypothesis["probability"]; mitigation: string;
}> = [
  {
    domain: "unit_econ", assumption: "单位经济在稳态下成立",
    stressTest: "如果食材成本上浮 20% 且客单价下降 10%",
    impact: "critical", probability: "medium",
    mitigation: "锁定关键食材供应商长协，预留 5% 成本缓冲",
  },
  {
    domain: "scale", assumption: "规模扩大后利润为正",
    stressTest: "如果开到第 5 家店时管理成本上升导致净利率下降 30%",
    impact: "high", probability: "medium",
    mitigation: "设定每店管理成本上限，建立区域管理模型后再扩张",
  },
  {
    domain: "revenue", assumption: "客单价和翻台率可达到预期",
    stressTest: "如果实际客单价低于预期 15% 或翻台率低于 20%",
    impact: "high", probability: "medium",
    mitigation: "首店运营 3 个月内验证客单价和翻台率，达标后再复制",
  },
  {
    domain: "replication", assumption: "首店模型可复制到第 N 家店",
    stressTest: "如果第 3 家店的 ROI 只有首店的 60%",
    impact: "high", probability: "medium",
    mitigation: "复制前必须完成 SOP 标准化和店长培训体系",
  },
  {
    domain: "cost", assumption: "关键成本项可控",
    stressTest: "如果租金上浮 20% 或人工成本上浮 15%",
    impact: "medium", probability: "high",
    mitigation: "租金占比控制在 15% 以内，人效设定基准线",
  },
];

function inferBizMitigationStatus(contract?: ModeContract | null) {
  if (!contract || contract.status !== "frozen") {
    return DEFAULT_BIZ_HYPOTHESES.map((h) => ({ id: h.domain, status: "untested" as const }));
  }
  return DEFAULT_BIZ_HYPOTHESES.map((h) => {
    const checks = [
      contract.killCriteria.some((k) => new RegExp(h.domain === "unit_econ" ? "单位经济|UE|毛利" : h.domain, "i").test(k)),
      contract.mondayMoves.some((m) => new RegExp(h.domain === "replication" ? "SOP|培训|店长" : h.domain, "i").test(m)),
      contract.whatWeWontDo.some((w) => new RegExp(h.domain, "i").test(w)),
    ].filter(Boolean).length;
    return { id: h.domain, status: (checks >= 2 ? "mitigated" : checks >= 1 ? "tested" : "untested") as BizHypothesis["status"] };
  });
}

export function runBizHypothesisTest(contract?: ModeContract | null): BizHypothesisReport {
  const statuses = inferBizMitigationStatus(contract);
  const hypotheses: BizHypothesis[] = DEFAULT_BIZ_HYPOTHESES.map((h) => ({
    id: createId(), ...h,
    status: statuses.find((s) => s.id === h.domain)?.status || "untested",
  }));
  const criticalCount = hypotheses.filter((h) => h.impact === "critical").length;
  const untestedCount = hypotheses.filter((h) => h.status === "untested").length;
  const score = Math.max(0, 100 - criticalCount * 20 - untestedCount * 10 -
    hypotheses.filter((h) => h.status === "tested" && h.impact === "high").length * 5);
  return {
    hypotheses, criticalCount, untestedCount, score,
    summary: [
      `商业模式假设压力测试: ${hypotheses.length} 项假设`,
      `关键风险: ${criticalCount} 项`,
      `未缓释: ${untestedCount} 项`,
      score >= 70 ? "商业模式抗压能力良好" : "建议优先缓释关键假设风险",
      ...hypotheses.filter((h) => h.impact === "critical" || h.status === "untested").slice(0, 3)
        .map((h) => `  ⚠️ [${h.domain}] ${h.assumption}`),
    ].join("\n"),
  };
}
