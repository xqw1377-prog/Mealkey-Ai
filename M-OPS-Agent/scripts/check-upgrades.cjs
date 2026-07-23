const fs = require("fs");
const r = (f) => fs.readFileSync(f, "utf8");
const o = {
  bridge: fs.existsSync("packages/m-ops-diag/src/engines/expert-bridge.ts"),
  fusion: r("packages/m-ops-diag/src/reasoning/orchestrator.ts").includes("mergeAnalyses"),
  impactBiz: r("packages/m-ops-diag/src/reasoning/impact.ts").includes("revenueDeltaPct"),
  menuJoin: r("packages/m-ops-diag/src/engines/expert-capabilities.ts").includes("enrichDishSalesWithMenu"),
  menuRefuse: r("packages/m-ops-diag/src/engines/expert-capabilities.ts").includes("菜单硬门槛"),
  catalogCtx: r("packages/m-ops-diag/src/data-catalog.ts").includes("context"),
  causal: r("packages/m-ops-diag/src/engines/council-report.ts").includes("虚火"),
  patternStore: r("src/diagnosis-persistence.ts").includes("applyRestaurantPatternLibrary"),
  casesHyp: /假设|hypothes/i.test(r("web/src/views.tsx")),
  learnBtn: r("web/src/views.tsx").includes("验证成立"),
  rescan: r("web/src/App.tsx").includes("onRescan"),
  examDepth: r("web/src/intake.ts").includes("examDepth"),
  autoDeep: r("web/src/IntakeBrief.tsx").includes("examDepth") || r("web/src/IntakeBrief.tsx").includes("深检"),
  truncateWarn: r("web/src/imports/DataImportPanel.tsx").includes("400") || r("web/src/imports/DataImportPanel.tsx").includes("截断"),
  enrichMath: r("packages/m-ops-diag/src/engines/diagnosis-math.ts").includes("enrichDishSalesWithMenu"),
};
console.log(JSON.stringify(o, null, 2));
