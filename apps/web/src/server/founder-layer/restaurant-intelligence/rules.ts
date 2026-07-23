/**
 * Restaurant Knowledge Graph · Rule 最小 SSOT
 * 真源：docs/MEALKEY_RESTAURANT_KNOWLEDGE_GRAPH_V1.md
 */

export type RestaurantRuleV1 = {
  id: string;
  domain: "launch" | "menu" | "labor" | "revenue" | "general";
  /** 人话条件 */
  ifText: string;
  /** 判断/提示（非终局答案） */
  thenText: string;
  severity: "info" | "warn" | "critical";
};

export const RESTAURANT_RULES_V1: RestaurantRuleV1[] = [
  {
    id: "rent_ratio_15",
    domain: "launch",
    ifText: "租金 / 预计营业额 > 15%",
    thenText: "租金占比过高，开店/续约风险上升",
    severity: "warn",
  },
  {
    id: "sku_kitchen_complexity",
    domain: "menu",
    ifText: "SKU > 80 且 厨房面积 < 30㎡",
    thenText: "效率与出品风险升高，优先控 SKU",
    severity: "warn",
  },
  {
    id: "labor_ratio_30",
    domain: "labor",
    ifText: "人工成本 / 营收 > 30%",
    thenText: "提示人员结构或排班问题，需核对人效",
    severity: "warn",
  },
];

export function renderRulesMarkdown(rules: RestaurantRuleV1[]): string {
  if (!rules.length) return "";
  return [
    "## 判断依据（规则）",
    ...rules.map(
      (r) =>
        `- **${r.id}**：若 ${r.ifText} → ${r.thenText}`,
    ),
  ].join("\n");
}
