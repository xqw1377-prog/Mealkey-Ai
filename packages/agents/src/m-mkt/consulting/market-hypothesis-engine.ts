/**
 * M-MKT 市场假设压力测试引擎
 *
 * 对标 M-PNT hypothesis-engine.ts。
 * 对市场进入方案中的关键假设进行压力测试：
 * - 需求假设：用户真的需要吗？
 * - 竞争假设：如果竞品提前行动？
 * - 进入时机假设：现在是不是对的时间？
 * - 规模假设：如果打样结果不达预期？
 */

import type { EntryContract } from "./types";

export interface MarketHypothesis {
  id: string;
  domain: "demand" | "competition" | "timing" | "scale" | "channel";
  assumption: string;
  stressTest: string;
  impact: "critical" | "high" | "medium" | "low";
  probability: "high" | "medium" | "low";
  mitigation: string;
  status: "untested" | "tested" | "mitigated" | "accepted";
}

export interface MarketHypothesisReport {
  hypotheses: MarketHypothesis[];
  criticalCount: number;
  untestedCount: number;
  score: number;
  summary: string;
}

function createId(): string {
  return `mh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_MARKET_HYPOTHESES: Array<{
  domain: MarketHypothesis["domain"];
  assumption: string;
  stressTest: string;
  impact: MarketHypothesis["impact"];
  probability: MarketHypothesis["probability"];
  mitigation: string;
}> = [
  {
    domain: "demand",
    assumption: "目标客群存在且需求真实",
    stressTest: "如果前 3 个月日均客流低于预期的 60%",
    impact: "critical",
    probability: "medium",
    mitigation: "先做最小化需求验证（快闪/试营业）再决定 full launch",
  },
  {
    domain: "competition",
    assumption: "进入时竞争格局不变",
    stressTest: "如果竞品在进入前 3 个月提前升级或降价",
    impact: "high",
    probability: "medium",
    mitigation: "设计差异化锚点不可被价格战击穿，预留竞争响应预算",
  },
  {
    domain: "timing",
    assumption: "现在是最佳进入窗口",
    stressTest: "如果推迟 6 个月进入，市场位置是否还一样？",
    impact: "high",
    probability: "low",
    mitigation: "确认窗口不是叙事窗口，而是有真实需求驱动的窗口",
  },
  {
    domain: "scale",
    assumption: "试点成功后可复制",
    stressTest: "如果首店模型跑通但第二家店 ROI 下降 40%",
    impact: "high",
    probability: "medium",
    mitigation: "首店验证期间必须同步跑通供应链和人才复制路径",
  },
  {
    domain: "channel",
    assumption: "目标客群可达且获客成本可控",
    stressTest: "如果获客成本是预期的 2 倍",
    impact: "medium",
    probability: "medium",
    mitigation: "设定获客成本上限，测试至少 3 种获客渠道",
  },
];

function inferMarketMitigationStatus(
  contract?: EntryContract | null,
): Array<{ id: string; status: MarketHypothesis["status"] }> {
  if (!contract || contract.status !== "frozen") {
    return DEFAULT_MARKET_HYPOTHESES.map((h) => ({ id: h.domain, status: "untested" as const }));
  }

  return DEFAULT_MARKET_HYPOTHESES.map((h) => {
    const checks = [
      contract.killCriteria.some((k) => new RegExp(h.domain, "i").test(k)),
      contract.mondayMoves.some((m) => new RegExp(h.domain === "demand" ? "客流|验证|试营业" : h.domain, "i").test(m)),
      contract.whatWeWontDo.some((w) => new RegExp(h.domain, "i").test(w)),
    ].filter(Boolean).length;
    const status: MarketHypothesis["status"] = checks >= 2 ? "mitigated" : checks >= 1 ? "tested" : "untested";
    return { id: h.domain, status };
  });
}

export function runMarketHypothesisTest(
  contract?: EntryContract | null,
): MarketHypothesisReport {
  const statuses = inferMarketMitigationStatus(contract);
  const hypotheses: MarketHypothesis[] = DEFAULT_MARKET_HYPOTHESES.map((h) => {
    const status = statuses.find((s) => s.id === h.domain)?.status || "untested";
    return { id: createId(), ...h, status };
  });

  const criticalCount = hypotheses.filter((h) => h.impact === "critical").length;
  const untestedCount = hypotheses.filter((h) => h.status === "untested").length;
  const score = Math.max(0, 100 - criticalCount * 20 - untestedCount * 10 -
    hypotheses.filter((h) => h.status === "tested" && h.impact === "high").length * 5);

  const summary = [
    `市场假设压力测试: ${hypotheses.length} 项假设`,
    `关键风险: ${criticalCount} 项`,
    `未缓释: ${untestedCount} 项`,
    score >= 70 ? "进入方案抗压能力良好" : "建议优先缓释关键假设风险",
    ...hypotheses.filter((h) => h.impact === "critical" || h.status === "untested").slice(0, 3)
      .map((h) => `  ⚠️ [${h.domain}] ${h.assumption}`),
  ].join("\n");

  return { hypotheses, criticalCount, untestedCount, score, summary };
}
