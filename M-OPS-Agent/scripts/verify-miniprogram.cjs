const path = require("path");
const diag = require(path.join(__dirname, "../miniprogram/libs/m-ops-diag.js"));
const paste = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils/paste-import.js",
));
const templates = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils/templates.js",
));
const readiness = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils/readiness.js",
));
const actionCard = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils/action-card.js",
));
const registry = require(path.join(
  __dirname,
  "../miniprogram/runtime/registry.js",
));
const validate = require(path.join(
  __dirname,
  "../miniprogram/runtime/validate-manifest.js",
));
const catalog = require(path.join(
  __dirname,
  "../miniprogram/host/plugin-catalog.js",
));
const mopsManifest = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/manifest.js",
));

registry.registerPlugins(catalog.loadPluginManifests());

const daily = paste.parseDailyText(templates.DAILY_TEMPLATE);
const dish = paste.parseDishText(templates.DISH_TEMPLATE);
const menu = paste.parseMenuText(templates.MENU_TEMPLATE);
const evidence = diag.tagEvidenceFromText("周末等位太久\n红烧肉很好吃", "manual");
const bundle = {
  daily: daily.rows,
  sales: dish.rows,
  menu: menu.rows,
  evidence: evidence,
};
const gauge = readiness.buildReadinessGauge(bundle);
if (gauge.overallPct < 50) {
  console.error("FAIL gauge", gauge);
  process.exit(1);
}
console.log("readiness", gauge.overallPct + "%", gauge.summary);

const tea = diag.resolveCategoryThresholds("茶饮");
const hot = diag.resolveCategoryThresholds("火锅");
if (tea.top20ShareWarn === hot.top20ShareWarn && tea.peakShareWarn === hot.peakShareWarn) {
  console.error("FAIL category thresholds not differentiated");
  process.exit(1);
}
console.log("thresholds tea/hot top20", tea.top20ShareWarn, hot.top20ShareWarn);

const card = actionCard.buildActionCard(
  { name: "测试店" },
  {
    consultation: {
      restaurantName: "测试店",
      bossBrief: "主因测试",
      priorities: ["先治晚高峰出菜"],
    },
    learningDraft: [{ expectedOutcome: "看等位是否下降" }],
  },
);
if (!card.shareText.includes("本周只做这一件")) {
  console.error("FAIL action card");
  process.exit(1);
}
console.log("action card ok");

const packs = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils/category-packs.js",
));
const teaReq = packs.buildPackRequest("tea").request;
const hotReq = packs.buildPackRequest("hotpot").request;
const teaR = diag.diagnoseRestaurantSync(teaReq);
const hotR = diag.diagnoseRestaurantSync(hotReq);
console.log("tea verdict", teaR.consultation.overallVerdict);
console.log("hotpot verdict", hotR.consultation.overallVerdict);

const handoff = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils/handoff.js",
));
const externalPaste = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/utils/external-paste.js",
));
const pack = handoff.buildHandoffPackage(
  { name: "测试店", city: "本地", category: "湘菜" },
  {
    consultation: {
      restaurantName: "测试店",
      overallVerdict: "观察",
      bossBrief: "主因测试",
      priorities: ["先治晚高峰"],
      experts: [{ role: "finance", title: "财务官", level: "观察", verdict: "ok" }],
    },
    signals: [{ title: "高峰", observation: "晚高峰忙", severity: "warn" }],
  },
);
if (pack.schema !== "mealkey.m-ops-diag.handoff.v1") {
  console.error("FAIL handoff schema", pack.schema);
  process.exit(1);
}
console.log("handoff ok", pack.exam.bossBrief);

const ext = externalPaste.parseExternalBlock(externalPaste.EXTERNAL_SAMPLE);
if (!ext.evidence.length || ext.meta.platform !== "dianping") {
  console.error("FAIL external paste", ext);
  process.exit(1);
}
console.log("external paste", ext.evidence.length, ext.meta.platform);

const hotWords = diag.tagEvidenceFromText(
  "毛肚不新鲜\n外卖超时\n杨枝甘露太甜",
  "manual",
);
if (!hotWords.length) {
  console.error("FAIL dict expand empty");
  process.exit(1);
}
console.log(
  "dict themes",
  hotWords
    .map(function (e) {
      return e.theme;
    })
    .join(","),
);

// Shell · N Agent registry + manifest gate
const agents = registry.listAgents();
if (agents.length < 2) {
  console.error("FAIL registry need >=2 agents", agents);
  process.exit(1);
}
const live = registry.resolve("restaurant-diagnosis");
if (!live || live.agentId !== mopsManifest.agentId) {
  console.error("FAIL resolve restaurant-diagnosis");
  process.exit(1);
}
if (
  !live.miniUi ||
  live.miniUi.entryRoute.indexOf("/agents/restaurant-diagnosis/") < 0
) {
  console.error("FAIL entryRoute", live.miniUi);
  process.exit(1);
}
const coming = registry.resolve("m-pnt-brand");
if (!coming || coming.status !== "coming") {
  console.error("FAIL placeholder agent");
  process.exit(1);
}
const bad = Object.assign({}, mopsManifest, {
  billing: Object.assign({}, mopsManifest.billing, { blockFirstValue: true }),
});
const badCheck = validate.validateManifest(bad);
if (badCheck.ok) {
  console.error("FAIL validator should reject blockFirstValue");
  process.exit(1);
}
console.log(
  "shell registry",
  agents
    .map(function (a) {
      return a.agentId + ":" + a.status;
    })
    .join(" | "),
);
console.log("manifest validator ok");

const shellNav = require(path.join(__dirname, "../miniprogram/shell/nav.js"));
const agentRoutes = require(path.join(
  __dirname,
  "../miniprogram/agents/restaurant-diagnosis/routes.js",
));
if (shellNav.PATHS.home !== "/shell/pages/home/home") {
  console.error("FAIL shell nav home");
  process.exit(1);
}
if (
  agentRoutes.PATHS.report.indexOf("/agents/restaurant-diagnosis/pages/report") <
  0
) {
  console.error("FAIL agent routes");
  process.exit(1);
}
if (agentRoutes.shellHome !== shellNav.PATHS.home) {
  console.error("FAIL agent↔shell home path mismatch");
  process.exit(1);
}
console.log("shell↔agent paths ok");

require("./verify-shell-full.cjs");
