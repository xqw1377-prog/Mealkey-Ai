/**
 * M-BIZ 商业模式知识蒸馏入口
 *
 * 知识来源：
 * - Osterwalder Business Model Canvas
 * - Slywotzky 22 种利润模式
 * - Porter 价值链分析
 * - 餐饮/零售/互联网 30 年盈利实操经验
 *
 * 三层知识：
 * L1 FACT — 商业模式基准数据
 * L2 RULE — 商业模式决策规则（17条）
 * L3 CASE — 正反商业模式案例（10个）
 */

import { BUSINESS_MODEL_RULES } from "./rules";
import { BUSINESS_MODEL_CASES } from "./cases";

export { BUSINESS_MODEL_RULES };
export { BUSINESS_MODEL_CASES };

export function searchBizRules(query: string): { id: string; description: string; judgement: string }[] {
  const q = query.toLowerCase();
  return BUSINESS_MODEL_RULES
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

export function matchBizRules(facts: Record<string, unknown>): typeof BUSINESS_MODEL_RULES {
  return BUSINESS_MODEL_RULES.filter((rule) => {
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

export function findBizCases(input: {
  category?: string;
  outcome?: "success" | "failure" | "neutral";
}): typeof BUSINESS_MODEL_CASES {
  return BUSINESS_MODEL_CASES.filter((c) => {
    if (input.category && c.category !== input.category) return false;
    if (input.outcome && c.outcome.status !== input.outcome) return false;
    return true;
  });
}
