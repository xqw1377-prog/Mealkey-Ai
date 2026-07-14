/**
 * Launch Agent - 开店战略顾问
 * 
 * 身份证: App Store 信息
 */

import type { AgentManifestLegacy } from "@mealkey/agent-sdk";

export const launchManifest: AgentManifestLegacy = {
  id: "launch",
  name: "MealKey 开店顾问",
  version: "1.0.0",
  description: "帮助餐饮创业者从0到1完成开店决策，包括市场分析、定位策略、投资评估",
  category: "startup",
  capabilities: [
    "business_diagnosis",
    "market_analysis",
    "positioning",
    "finance_analysis",
  ],
  pricing: {
    type: "one_time",
    price: 99900,
    currency: "CNY",
  },
  permissions: {
    knowledge: true,
    project: true,
    memory: true,
  },
};
