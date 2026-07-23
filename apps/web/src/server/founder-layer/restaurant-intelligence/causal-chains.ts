/**
 * Restaurant Knowledge Graph · Causal Chain 最小 SSOT
 * 真源：docs/MEALKEY_RESTAURANT_KNOWLEDGE_GRAPH_V1.md · MEALKEY_RESTAURANT_INTELLIGENCE_MODEL_V1.md
 * 服务推理；禁止散落 Prompt 私编因果。
 */

export type CausalNodeV1 = {
  id: string;
  label: string;
};

export type CausalChainV1 = {
  id: string;
  title: string;
  /** 从因到果的节点顺序 */
  nodes: CausalNodeV1[];
  /** 一句话公式（可选） */
  formula?: string;
  /** 常见下一步动作提示（非终局） */
  nextHints: string[];
};

/** V1 必具备用链 */
export const CAUSAL_CHAINS_V1: Record<string, CausalChainV1> = {
  revenue_decompose: {
    id: "revenue_decompose",
    title: "营业额变量拆解",
    formula: "营业额 ≈ 客流 × 转化率 × 客单价 × 复购效应",
    nodes: [
      { id: "traffic", label: "客流" },
      { id: "conversion", label: "转化率" },
      { id: "ticket", label: "客单价" },
      { id: "repurchase", label: "复购" },
      { id: "revenue", label: "营业额" },
    ],
    nextHints: [
      "先确认哪一个变量在变：客流、转化、客单还是复购",
      "再看是否分时段/渠道/SKU 结构变化",
      "未确认变量前，禁止直接甩营销清单",
    ],
  },
  profit_decompose: {
    id: "profit_decompose",
    title: "利润变量拆解",
    formula: "利润 ≈ 营业额 − 食材 − 人工 − 房租 − 损耗 − 营销 − 其他",
    nodes: [
      { id: "revenue", label: "营业额" },
      { id: "food_cost", label: "食材成本" },
      { id: "labor", label: "人工成本" },
      { id: "rent", label: "房租" },
      { id: "waste", label: "损耗" },
      { id: "marketing", label: "营销费用" },
      { id: "profit", label: "利润" },
    ],
    nextHints: [
      "同营业额可赚钱可亏钱——拆成本结构",
      "人工/营收、租金/营收是优先核对的占比",
    ],
  },
  price_cut_shock: {
    id: "price_cut_shock",
    title: "降价冲击链",
    nodes: [
      { id: "price_down", label: "降低价格" },
      { id: "ticket_down", label: "客单下降" },
      { id: "orders_up_need", label: "需要更多订单" },
      { id: "kitchen_pressure", label: "厨房压力增加" },
      { id: "labor_risk", label: "人效下降风险" },
      { id: "profit_risk", label: "利润可能下降" },
    ],
    nextHints: ["降价前先算：订单增量能否覆盖客单损失与厨房压力"],
  },
  sku_bloat: {
    id: "sku_bloat",
    title: "SKU 膨胀链",
    nodes: [
      { id: "sku_up", label: "菜品数量增加" },
      { id: "prep_up", label: "备料增加" },
      { id: "waste_up", label: "损耗增加" },
      { id: "kitchen_complexity", label: "厨房复杂度增加" },
      { id: "quality_down", label: "出品下降" },
      { id: "repurchase_down", label: "复购下降" },
    ],
    nextHints: ["SKU 过多且厨房面积有限时，优先减 SKU 而非继续加品"],
  },
  server_upsell: {
    id: "server_upsell",
    title: "服务员推荐 → 营业额",
    nodes: [
      { id: "recommend_skill", label: "推荐能力" },
      { id: "upsell_rate", label: "加菜率" },
      { id: "ticket", label: "客单价" },
      { id: "revenue", label: "营业额" },
    ],
    nextHints: ["推荐能力需挂 Skill Engine 场景陪练，非背菜单"],
  },
};

export function renderCausalChainMarkdown(chain: CausalChainV1): string {
  const arrow = chain.nodes.map((n) => n.label).join(" → ");
  const lines = [
    `### ${chain.title}`,
    chain.formula ? `\`${chain.formula}\`` : "",
    "",
    arrow,
    "",
    "**影响提示**",
    ...chain.nextHints.map((h) => `- ${h}`),
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}
