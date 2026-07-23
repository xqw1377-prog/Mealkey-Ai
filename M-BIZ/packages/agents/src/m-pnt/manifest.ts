import type { AgentManifestLegacy } from "@mealkey/agent-sdk";

export const mPntManifest: AgentManifestLegacy = {
  id: "m-pnt",
  name: "MealKey 餐饮定位顾问",
  version: "1.0.0",
  description:
    "帮助餐饮创业者完成品牌定位决策：品类/客群/价格/竞争分析，并以三理论 Agent 矩阵（里斯定位 / 特劳特定位 / 叶茂中冲突营销 并行竞争博弈 → Cross-Fire → Synthesis）完成差异化取舍",
  category: "positioning",
  capabilities: [
    "category_analysis",
    "customer_portrait",
    "price_positioning",
    "competitor_analysis",
    "differentiation",
    "brand_tonality",
  ],
  pricing: {
    type: "one_time",
    price: 49900,
    currency: "CNY",
  },
  permissions: {
    knowledge: true,
    project: true,
    memory: true,
  },
};
