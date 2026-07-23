/**
 * Agent Plugin Manifest · restaurant-diagnosis（首个合规样板）
 */
module.exports = {
  agentId: "restaurant-diagnosis",
  family: "m-ops",
  displayName: "餐厅经营体检",
  summary: "账本 + 评论 → 四官会审 · 可拒签 · 本周动作",
  status: "live",
  maxInsightLevel: 3,
  firstValueSlaSec: 180,
  sharesBrain: true,
  allowsStandaloneMp: false,
  refusePolicy: "缺数拒签，不编故事",
  inputs: ["restaurant profile", "daily ledger", "comments"],
  outputs: ["consultation", "signals", "handoff"],
  miniUi: {
    entryRoute: "/agents/restaurant-diagnosis/pages/index/index",
    pages: [
      "agents/restaurant-diagnosis/pages/index/index",
      "agents/restaurant-diagnosis/pages/intake/intake",
      "agents/restaurant-diagnosis/pages/import/import",
      "agents/restaurant-diagnosis/pages/report/report",
      "agents/restaurant-diagnosis/pages/learn/learn",
      "agents/restaurant-diagnosis/pages/archive/archive",
      "agents/restaurant-diagnosis/pages/action/action",
      "agents/restaurant-diagnosis/pages/enhance/enhance",
    ],
    requiredAuth: "none",
    contextKeys: [
      "restaurant_id",
      "name",
      "city",
      "category",
      "stage",
      "priceRange",
      "focus",
    ],
    deepLinks: ["exam", "import"],
  },
  billing: {
    skus: [
      { sku: "diag.rule.v1", title: "经营诊断（规则会审）", tokenCost: 100 },
    ],
    welcomeEligible: true,
    blockFirstValue: false,
    demoAllowed: true,
  },
};
