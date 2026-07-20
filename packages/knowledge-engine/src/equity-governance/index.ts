/**
 * M-ED 股权治理知识蒸馏入口
 *
 * 知识来源：
 * - 风险投资 Term Sheet 标准条款
 * - 公司法与公司章程实践
 * - 创业公司控制权/股权纠纷案例
 * - 家族企业传承治理研究
 *
 * 三层知识：
 * L1 FACT — 股权治理基准数据
 * L2 RULE — 股权治理决策规则（15条）
 * L3 CASE — 正反股权治理案例（10个）
 */

import { EQUITY_GOVERNANCE_RULES } from "./rules";
import { EQUITY_GOVERNANCE_CASES } from "./cases";

export { EQUITY_GOVERNANCE_RULES };
export { EQUITY_GOVERNANCE_CASES };

export function searchEquityRules(query: string): { id: string; description: string; judgement: string }[] {
  const q = query.toLowerCase();
  return EQUITY_GOVERNANCE_RULES
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

export function matchEquityRules(facts: Record<string, unknown>): typeof EQUITY_GOVERNANCE_RULES {
  return EQUITY_GOVERNANCE_RULES.filter((rule) => {
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

export function findEquityCases(input: {
  category?: string;
  outcome?: "success" | "failure" | "neutral";
}): typeof EQUITY_GOVERNANCE_CASES {
  return EQUITY_GOVERNANCE_CASES.filter((c) => {
    if (input.category && c.category !== input.category) return false;
    if (input.outcome && c.outcome.status !== input.outcome) return false;
    return true;
  });
}
