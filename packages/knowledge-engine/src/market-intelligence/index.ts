/**
 * M-MKT 市场情报知识蒸馏入口
 *
 * 知识来源：
 * - BCG / McKinsey / Porter 经典框架
 * - Christensen JTBD 理论
 * - 餐饮行业 30 年进入退出案例
 * - 国际品牌进入中国市场实录
 *
 * 三层知识：
 * L1 FACT — 市场基准数据
 * L2 RULE — 进入决策规则（60+）
 * L3 CASE — 正反进入案例（12+）
 */

import { MARKET_INTELLIGENCE_RULES } from "./rules";
import { MARKET_ENTRY_CASES } from "./cases";

export { MARKET_INTELLIGENCE_RULES };
export { MARKET_ENTRY_CASES };

export function searchMarketRules(query: string): { id: string; description: string; judgement: string }[] {
  const q = query.toLowerCase();
  return MARKET_INTELLIGENCE_RULES
    .filter((r) =>
      r.description.toLowerCase().includes(q) ||
      r.scenario.toLowerCase().includes(q) ||
      r.judgement.toLowerCase().includes(q)
    )
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      description: r.description,
      judgement: r.judgement,
    }));
}

export function matchMarketRules(facts: Record<string, unknown>): typeof MARKET_INTELLIGENCE_RULES {
  return MARKET_INTELLIGENCE_RULES.filter((rule) => {
    return rule.conditions.every((cond) => {
      const val = facts[cond.field];
      if (val === undefined) return false;
      if (cond.operator === "<") return Number(val) < Number(cond.value);
      if (cond.operator === ">") return Number(val) > Number(cond.value);
      if (cond.operator === "=") return val === cond.value;
      if (cond.operator === "!=") return val !== cond.value;
      if (cond.operator === "in") return (cond.value as unknown[]).includes(val);
      return false;
    });
  });
}

export function findMarketCases(input: {
  category?: string;
  city?: string;
  outcome?: "success" | "failure" | "mixed";
}): typeof MARKET_ENTRY_CASES {
  return MARKET_ENTRY_CASES.filter((c) => {
    if (input.category && c.category !== input.category) return false;
    if (input.city && !c.basics?.city?.includes(input.city)) return false;
    if (input.outcome && c.outcome.status !== input.outcome) return false;
    return true;
  });
}
