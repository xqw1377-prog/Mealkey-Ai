import type { AgentManifestLegacy } from "@mealkey/agent-sdk";

export const mPntManifest: AgentManifestLegacy = {
  id: "m-pnt",
  name: "MealKey 餐饮定位顾问",
  version: "1.0.0",
  description:
    "帮助餐饮创业者完成品牌定位决策：品类分析、客群定义、价格带定位、竞争区隔、三理论矩阵校验与差异化策略",
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
