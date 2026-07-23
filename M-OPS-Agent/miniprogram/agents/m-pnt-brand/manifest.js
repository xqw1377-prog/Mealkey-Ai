/**
 * Agent Plugin Manifest · m-pnt-brand（占位：证明 N Agent）
 */
module.exports = {
  agentId: "m-pnt-brand",
  family: "m-pnt",
  displayName: "品牌定位助手",
  summary: "即将上架：同一 Shell 内的定位能力，共享餐厅档案",
  status: "coming",
  maxInsightLevel: 3,
  firstValueSlaSec: 180,
  sharesBrain: true,
  allowsStandaloneMp: false,
  miniUi: {
    entryRoute: "/agents/m-pnt-brand/pages/home/home",
    pages: ["agents/m-pnt-brand/pages/home/home"],
    requiredAuth: "guest",
    contextKeys: ["name", "city", "category"],
  },
  billing: {
    skus: [{ sku: "pnt.v1", title: "品牌定位", tokenCost: 200 }],
    welcomeEligible: true,
    blockFirstValue: false,
    demoAllowed: false,
  },
};
