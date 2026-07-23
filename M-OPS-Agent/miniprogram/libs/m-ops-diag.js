"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/m-ops-diag/src/miniprogram-entry.ts
var miniprogram_entry_exports = {};
__export(miniprogram_entry_exports, {
  M_OPS_DIAG_AGENT_ID: () => M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME: () => M_OPS_DIAG_PRODUCT_NAME,
  applyEvolvedPatternLibrary: () => applyEvolvedPatternLibrary,
  buildBossBrief: () => buildBossBrief,
  buildEvolutionState: () => buildEvolutionState,
  diagnoseRestaurantSync: () => diagnoseRestaurantSync,
  enrichDishSalesWithMenu: () => enrichDishSalesWithMenu,
  evaluateCategoryAlerts: () => evaluateCategoryAlerts,
  inferSentimentFromClaim: () => inferSentimentFromClaim,
  mockConsumerEvidence: () => mockConsumerEvidence,
  mockDiagnosisRequest: () => mockDiagnosisRequest,
  resolveCategoryThresholds: () => resolveCategoryThresholds,
  stageLabel: () => stageLabel,
  tagEvidenceFromText: () => tagEvidenceFromText
});
module.exports = __toCommonJS(miniprogram_entry_exports);

// packages/m-ops-diag/src/contracts.ts
var M_OPS_DIAG_AGENT_ID = "restaurant-diagnosis";
var M_OPS_DIAG_PRODUCT_NAME = "\u9910\u5385\u7ECF\u8425\u4F53\u68C0\u7CFB\u7EDF";
var M_OPS_DIAG_PRODUCT_NAME_FULL = "\u9910\u542F \xB7 \u9910\u5385\u7ECF\u8425\u4F53\u68C0\u7CFB\u7EDF";

// packages/m-ops-diag/src/lifecycle.ts
function createDiagnosisCase(input) {
  const now = input.createdAt || (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: `diag-case-${Date.now()}`,
    restaurantId: input.restaurantId,
    trigger: input.trigger,
    status: "DISCOVERED",
    observations: input.observations,
    patterns: input.patterns,
    hypothesis: input.hypothesis,
    impactScore: input.impactScore,
    createdAt: now,
    updatedAt: now
  };
}
function buildLearningDraft(input) {
  return {
    diagnosisId: input.diagnosisId,
    hypothesis: input.hypothesis,
    action: input.action,
    expectedOutcome: input.expectedOutcome
  };
}
function buildExternalScanJob(input) {
  return {
    restaurantId: input.restaurantId,
    sources: input.sources,
    frequency: input.frequency || "daily",
    lastRun: (/* @__PURE__ */ new Date()).toISOString(),
    newEvidenceCount: input.newEvidenceCount
  };
}

// packages/m-ops-diag/src/manifest.ts
var mOpsAgentManifestV1 = {
  id: M_OPS_DIAG_AGENT_ID,
  name: M_OPS_DIAG_PRODUCT_NAME_FULL,
  version: "0.1.0",
  provider: "official",
  runtimeMode: "cloud_https",
  stage: "sandbox",
  capabilityIds: [
    "ops.diagnosis.health",
    "ops.diagnosis.signal",
    "ops.diagnosis.gap"
  ],
  ports: ["signal", "insight", "gap"],
  maxInsightLevel: 3,
  permissions: ["read:restaurant", "read:evidence"],
  skillPackageRef: "skill.restaurant-diagnosis.v1",
  schemas: {
    inputRef: "ContextPackageV1",
    outputRef: "IngressBatchV1"
  },
  invokePolicy: {
    requiresDecisionAuth: false,
    requiresBossConfirm: false,
    billable: true
  },
  quality: {
    minEvidenceSteps: 2,
    allowsInferenceOnly: false
  },
  endpointUrl: null,
  category: "ops",
  description: "\u9910\u5385\u7ECF\u8425\u4F53\u68C0\u7CFB\u7EDF\uFF1A\u770B\u89C1\u95EE\u9898 \u2192 \u8BC6\u522B\u5F02\u5E38 \u2192 \u63D0\u4F9B\u8BC1\u636E \u2192 \u751F\u6210\u6D1E\u5BDF\uFF1B\u4E0D\u51B3\u7B56\u3001\u4E0D\u6267\u884C\u3002\u62CD\u677F\u7559\u5728\u9910\u542F OS\u3002"
};
var mOpsDiagManifest = {
  id: M_OPS_DIAG_AGENT_ID,
  name: M_OPS_DIAG_PRODUCT_NAME,
  version: mOpsAgentManifestV1.version,
  kind: "ops",
  stage: "pilot",
  ports: ["signal", "insight", "gap"],
  permissions: [
    "READ_BRAIN_SLICE",
    "READ_RIP",
    "READ_EVIDENCE",
    "EMIT_SIGNAL",
    "EMIT_INSIGHT"
  ],
  inputSchemaRef: "ContextPackageV1",
  outputSchemaRef: "IngressBatchV1",
  invokePolicy: {
    requiresDecisionAuth: false,
    requiresBossConfirm: false,
    billable: true
  },
  description: mOpsAgentManifestV1.description
};

// packages/m-ops-diag/src/reasoning/patterns.ts
var DEFAULT_PATTERN_LIBRARY = [
  {
    id: "wait_service",
    theme: "wait",
    label: "\u7B49\u5F85\u4E0E\u670D\u52A1\u54CD\u5E94",
    regex: /等待|等位|排队|慢|上菜|出餐|服务|态度|服务员|效率|催|换桌|外卖超时|制作时间|杯型慢/,
    dimensions: ["customer", "service", "operation"]
  },
  {
    id: "product_quality",
    theme: "product",
    label: "\u4EA7\u54C1\u4E0E\u53E3\u5473",
    regex: /味道|好吃|难吃|咸|淡|油|油腻|品质|食材|份量|招牌|必点|特色|下饭|回购|锅底|毛肚|肥牛|杨枝甘露|茶底|甜度|冰度|不新鲜/,
    dimensions: ["customer", "product"]
  },
  {
    id: "environment",
    theme: "environment",
    label: "\u73AF\u5883\u4E0E\u6C1B\u56F4",
    regex: /环境|卫生|吵|脏|装修|拍照|氛围|空调|座位挤|店面小|异味/,
    dimensions: ["customer"]
  },
  {
    id: "price_value",
    theme: "price",
    label: "\u4EF7\u683C\u4E0E\u6027\u4EF7\u6BD4",
    regex: /价格|贵|便宜|性价比|不值|值这个价|客单|人均|加价|套餐坑/,
    dimensions: ["customer", "competition"]
  },
  {
    id: "competition",
    theme: "competition",
    label: "\u7ADE\u4E89\u4E0E\u4EF7\u683C",
    regex: /竞品|竞争|附近|新店|活动|降价|优惠|排名|价格贵|隔壁|同类店/,
    dimensions: ["competition"]
  },
  {
    id: "growth",
    theme: "growth",
    label: "\u589E\u957F\u4E0E\u573A\u666F",
    regex: /家庭|聚餐|推荐|打卡|热门|流量|爆款|收藏|约会|年轻人|团购|外卖单多/,
    dimensions: ["growth"]
  }
];
var activeLibrary = DEFAULT_PATTERN_LIBRARY.map((rule) => ({
  ...rule,
  regex: new RegExp(rule.regex.source, rule.regex.flags)
}));
function getPatternLibrary() {
  return activeLibrary;
}
function setPatternLibrary(rules) {
  activeLibrary = rules.map((rule) => ({
    ...rule,
    regex: rule.regex instanceof RegExp ? rule.regex : new RegExp(String(rule.regex))
  }));
}
function matchPatternClaim(claim, theme, patternId) {
  const library = getPatternLibrary();
  if (patternId) {
    return library.find((rule) => rule.id === patternId);
  }
  if (theme) {
    const byTheme = library.filter((rule) => rule.theme === theme).sort((a, b) => (b.weight || 1) - (a.weight || 1));
    const hit = byTheme.find((rule) => rule.regex.test(claim) || theme === rule.theme);
    if (hit) return hit;
  }
  return [...library].sort((a, b) => (b.weight || 1) - (a.weight || 1)).find((rule) => rule.regex.test(claim));
}
function claimMatchesTheme(claim, theme, itemTheme) {
  if (itemTheme === theme) return true;
  const rule = getPatternLibrary().find((item) => item.theme === theme);
  return rule ? rule.regex.test(claim) : false;
}
function getWaitRe() {
  return getPatternLibrary().find((r) => r.id === "wait_service").regex;
}
function getProductRe() {
  return getPatternLibrary().find((r) => r.id === "product_quality").regex;
}
function getEnvRe() {
  return getPatternLibrary().find((r) => r.id === "environment").regex;
}
function getCompetitionRe() {
  return getPatternLibrary().find((r) => r.id === "competition").regex;
}
function getGrowthRe() {
  return getPatternLibrary().find((r) => r.id === "growth").regex;
}
var NEG_RE = /难吃|慢|差|贵|不值|脏|吵|劝退|态度|等了|等位|排队|太久|冷|咸|淡|油腻|失望|一般|凑合|坑|超时|不新鲜|异味|挤/;
var POS_RE = /好吃|很好吃|推荐|回购|不错|满意|下饭|干净|值得|喜欢|赞|必点|惊艳|性价比高|会再来|回购/;
function inferSentimentFromClaim(claim) {
  const text = String(claim || "");
  const neg = NEG_RE.test(text);
  const pos = POS_RE.test(text);
  if (neg && !pos) return "negative";
  if (pos && !neg) return "positive";
  if (neg && pos) return "negative";
  return "neutral";
}
function tagEvidenceFromText(text, source = "manual") {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.replace(/^[\d\.\-\*\s、]+/, "").trim()).filter((l) => l.length >= 4);
  return lines.slice(0, 40).map((claim, i) => {
    const rule = matchPatternClaim(claim);
    return {
      id: `paste_${source}_${i + 1}`,
      source,
      claim,
      sentiment: inferSentimentFromClaim(claim),
      theme: rule == null ? void 0 : rule.theme
    };
  });
}

// packages/m-ops-diag/src/reasoning/evolution.ts
var THEME_KEYWORDS = [
  { theme: "wait", re: /等待|等位|排队|上菜|服务|高峰|效率/ },
  { theme: "product", re: /味道|品质|菜品|食材|出品|招牌|毛利|菜单/ },
  { theme: "price", re: /价格|贵|便宜|性价比|客单|人均|定价/ },
  { theme: "environment", re: /环境|卫生|吵|脏|装修|氛围/ },
  { theme: "competition", re: /竞品|竞争|附近|新店|降价|优惠|排名/ },
  { theme: "growth", re: /流量|获客|复购|打卡|投放|增长|客流/ }
];
function classifyLearningOutcome(learning) {
  const text = `${learning.actualOutcome || ""} ${learning.lesson || ""}`.toLowerCase();
  if (!text.trim()) return "unknown";
  const negative = /(不成立|否定|误判|无效|无关|失败|恶化|未验证|false|rejected|invalid)/.test(text);
  if (negative) return "rejected";
  const positive = /(验证成立|已成立|属实|正确|有效|改善|好转|成功|confirmed|validated|\btrue\b|成立)/.test(
    text
  );
  if (positive) return "confirmed";
  return "mixed";
}
function inferThemesFromText(text) {
  const hits = THEME_KEYWORDS.filter((item) => item.re.test(text)).map((item) => item.theme);
  return hits.length ? [...new Set(hits)] : [];
}
function normalizeKey(statement) {
  return statement.replace(/\s+/g, "").slice(0, 24);
}
function relatedHypothesis(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (a.length > 8 && b.length > 8) {
    if (a.slice(0, 12) === b.slice(0, 12)) return true;
    if (a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8))) return true;
  }
  return false;
}
function stageFromMaturity(score) {
  if (score >= 72) return "mature";
  if (score >= 45) return "adaptive";
  if (score >= 18) return "forming";
  return "seed";
}
function stageLabel(stage) {
  const map = {
    seed: "\u79CD\u5B50\u671F",
    forming: "\u6210\u578B\u671F",
    adaptive: "\u81EA\u9002\u5E94\u671F",
    mature: "\u6210\u719F\u671F"
  };
  return map[stage];
}
function buildEvolutionState(learnings, restaurantId) {
  var _a, _b;
  const list = learnings || [];
  const themeMap = /* @__PURE__ */ new Map();
  const priorMap = /* @__PURE__ */ new Map();
  let confirmedCount = 0;
  let rejectedCount = 0;
  let verifiedCount = 0;
  const lessons = [];
  for (const learning of list) {
    const polarity = learning.polarity || classifyLearningOutcome(learning);
    const themes = ((_a = learning.themes) == null ? void 0 : _a.length) ? learning.themes : inferThemesFromText(learning.hypothesis).length ? inferThemesFromText(learning.hypothesis) : inferThemesFromText(
      `${learning.action || ""} ${learning.actualOutcome || ""}`
    );
    const hasFeedback = Boolean(learning.actualOutcome || learning.lesson);
    if (hasFeedback) verifiedCount += 1;
    if (polarity === "confirmed") confirmedCount += 1;
    if (polarity === "rejected") rejectedCount += 1;
    if ((_b = learning.lesson) == null ? void 0 : _b.trim()) lessons.push(learning.lesson.trim());
    for (const theme of themes.length ? themes : ["general"]) {
      const cur2 = themeMap.get(theme) || {
        theme,
        weight: 1,
        confirmed: 0,
        rejected: 0
      };
      if (polarity === "confirmed") {
        cur2.confirmed += 1;
        cur2.weight = Math.min(1.8, cur2.weight + 0.08);
      } else if (polarity === "rejected") {
        cur2.rejected += 1;
        cur2.weight = Math.max(0.45, cur2.weight - 0.1);
      }
      themeMap.set(theme, cur2);
    }
    if (!hasFeedback) continue;
    const key = normalizeKey(learning.hypothesis);
    const cur = priorMap.get(key) || {
      key,
      statement: learning.hypothesis,
      priorDelta: 0,
      samples: 0,
      lastPolarity: polarity
    };
    cur.samples += 1;
    cur.lastPolarity = polarity;
    if (polarity === "confirmed") cur.priorDelta = Math.min(0.28, cur.priorDelta + 0.12);
    else if (polarity === "rejected") cur.priorDelta = Math.max(-0.32, cur.priorDelta - 0.18);
    else if (polarity === "mixed") cur.priorDelta += 0.02;
    priorMap.set(key, cur);
  }
  const maturityScore = Math.round(
    Math.min(
      100,
      verifiedCount * 12 + confirmedCount * 8 + Math.min(20, lessons.length * 4) + (rejectedCount > 0 ? 6 : 0)
    )
  );
  const stage = stageFromMaturity(maturityScore);
  const themeWeights = [...themeMap.values()].sort((a, b) => b.weight - a.weight);
  const hypothesisPriors = [...priorMap.values()].sort(
    (a, b) => Math.abs(b.priorDelta) - Math.abs(a.priorDelta)
  );
  const topLessons = [...new Set(lessons)].slice(0, 5);
  const hot = themeWeights[0];
  const summary = stage === "seed" ? "\u5C1A\u65E0\u8DB3\u591F\u56DE\u586B\uFF0C\u7CFB\u7EDF\u4ECD\u4EE5\u901A\u7528\u6A21\u5F0F\u8BCA\u65AD" : `\u8FDB\u5316\u9636\u6BB5\u300C${stageLabel(stage)}\u300D\uFF08\u6210\u719F\u5EA6 ${maturityScore}\uFF09\uFF1A\u5DF2\u9A8C\u8BC1 ${verifiedCount} \u6761\uFF0C\u786E\u8BA4 ${confirmedCount} / \u5426\u5B9A ${rejectedCount}${hot ? `\uFF1B\u5F53\u524D\u52A0\u6743\u4E3B\u9898\u300C${hot.theme}\u300D\xD7${hot.weight.toFixed(2)}` : ""}`;
  return {
    restaurantId,
    asOf: (/* @__PURE__ */ new Date()).toISOString(),
    stage,
    maturityScore,
    verifiedCount,
    confirmedCount,
    rejectedCount,
    themeWeights,
    hypothesisPriors,
    topLessons,
    summary
  };
}
function evolutionBiasForHypothesis(statement, evolution) {
  if (!evolution) return 0;
  let bias = 0;
  for (const prior of evolution.hypothesisPriors) {
    if (relatedHypothesis(statement, prior.statement)) {
      bias += prior.priorDelta;
      break;
    }
  }
  const themes = inferThemesFromText(statement);
  for (const theme of themes) {
    const tw = evolution.themeWeights.find((item) => item.theme === theme);
    if (!tw) continue;
    bias += (tw.weight - 1) * 0.1;
  }
  return Math.max(-0.35, Math.min(0.35, bias));
}
function evolvePatternLibraryFromLearnings(learnings, base = getPatternLibrary()) {
  const evolution = buildEvolutionState(learnings);
  const weightByTheme = new Map(
    evolution.themeWeights.map((item) => [item.theme, item.weight])
  );
  return base.map((rule) => {
    var _a, _b, _c;
    const themeWeight = weightByTheme.get(rule.theme);
    const confirmed = ((_a = evolution.themeWeights.find((t) => t.theme === rule.theme)) == null ? void 0 : _a.confirmed) || 0;
    const rejected = ((_b = evolution.themeWeights.find((t) => t.theme === rule.theme)) == null ? void 0 : _b.rejected) || 0;
    const nextWeight = (_c = themeWeight != null ? themeWeight : rule.weight) != null ? _c : 1;
    return {
      ...rule,
      weight: Number(nextWeight.toFixed(3)),
      hits: (rule.hits || 0) + confirmed + rejected,
      source: themeWeight && themeWeight !== 1 ? "evolved" : rule.source || "default",
      regex: new RegExp(rule.regex.source, rule.regex.flags)
    };
  });
}
function applyEvolvedPatternLibrary(learnings) {
  setPatternLibrary(evolvePatternLibraryFromLearnings(learnings, DEFAULT_PATTERN_LIBRARY));
}
function enrichLearning(learning) {
  var _a;
  const polarity = classifyLearningOutcome(learning);
  const themes = ((_a = learning.themes) == null ? void 0 : _a.length) ? learning.themes : inferThemesFromText(
    `${learning.hypothesis} ${learning.action || ""} ${learning.lesson || ""} ${learning.actualOutcome || ""}`
  );
  const hasFeedback = Boolean(learning.actualOutcome || learning.lesson);
  return {
    ...learning,
    polarity: hasFeedback ? polarity : learning.polarity,
    themes: themes.length ? themes : learning.themes,
    verifiedAt: hasFeedback ? learning.verifiedAt || (/* @__PURE__ */ new Date()).toISOString() : learning.verifiedAt
  };
}

// packages/m-ops-diag/src/data-catalog.ts
var DATA_COLLECTION_CATALOG = [
  // —— 身份 ——
  {
    id: "brand",
    group: "identity",
    label: "\u5E97\u540D/\u54C1\u724C",
    required: "hard",
    experts: ["finance", "product", "marketing", "experience"],
    why: "\u4E00\u5207\u7ED3\u8BBA\u5FC5\u987B\u6302\u5728\u5177\u4F53\u95E8\u5E97\u4E0A"
  },
  {
    id: "city_category",
    group: "identity",
    label: "\u57CE\u5E02 + \u54C1\u7C7B",
    required: "hard",
    experts: ["marketing", "experience", "product"],
    why: "\u51B3\u5B9A\u7ADE\u4E89\u5BF9\u7167\u4E0E\u5916\u90E8\u58F0\u97F3\u8303\u56F4"
  },
  {
    id: "price_range",
    group: "identity",
    label: "\u5BA2\u5355\u951A\u70B9",
    required: "strong",
    experts: ["finance", "experience", "marketing"],
    why: "\u5BF9\u7167\u4EF7\u683C\u611F\u77E5\u4E0E\u5B9A\u4F4D",
    factKinds: ["priceRange"]
  },
  // —— 日×餐段经营（财务官硬门槛）——
  {
    id: "daily_date",
    group: "daily_ops",
    label: "\u8425\u4E1A\u65E5\u671F",
    required: "hard",
    experts: ["finance", "marketing"],
    why: "\u6CA1\u6709\u65E5\u671F\u5E8F\u5217\uFF0C\u65E0\u6CD5\u770B\u8D8B\u52BF\u4E0E\u5B63\u8282\u6027",
    factKinds: ["daily_ops_json", "ledger_days"]
  },
  {
    id: "meal_period",
    group: "daily_ops",
    label: "\u9910\u6BB5\uFF08\u5348/\u665A/\u591C\u2026\uFF09",
    required: "hard",
    experts: ["finance", "marketing", "experience"],
    why: "\u9910\u5385\u7ECF\u8425\u4EE5\u9910\u6BB5\u4E3A\u57FA\u672C\u751F\u4EA7\u5355\u4F4D",
    factKinds: ["meal_period_mix", "daily_ops_json"]
  },
  {
    id: "guests",
    group: "daily_ops",
    label: "\u6765\u5BA2\u6570",
    required: "hard",
    experts: ["finance", "marketing", "experience"],
    why: "\u5BA2\u6D41\u662F\u589E\u957F\u4E0E\u4F53\u9A8C\u538B\u529B\u7684\u5171\u540C\u8F93\u5165",
    factKinds: ["daily_ops_json"]
  },
  {
    id: "avg_ticket",
    group: "daily_ops",
    label: "\u4EBA\u5747\u6D88\u8D39",
    required: "hard",
    experts: ["finance", "experience", "product"],
    why: "\u8FDE\u63A5\u5B9A\u4EF7\u3001\u7ED3\u6784\u4E0E\u987E\u5BA2\u4EF7\u683C\u611F\u77E5",
    factKinds: ["daily_ops_json", "priceRange"]
  },
  {
    id: "revenue",
    group: "daily_ops",
    label: "\u8425\u6536",
    required: "hard",
    experts: ["finance"],
    why: "\u7ECF\u8425\u4F53\u68C0\u7684\u6838\u5FC3\u5206\u5B50",
    factKinds: ["daily_ops_json", "ledger_summary"]
  },
  {
    id: "zone",
    group: "daily_ops",
    label: "\u533A\u57DF/\u5385\u533A",
    required: "strong",
    experts: ["finance", "marketing"],
    why: "\u770B\u5927\u5385/\u5305\u53A2/\u5916\u5356\u8C01\u5728\u8D21\u732E\u3001\u8C01\u5728\u62D6\u7D2F",
    factKinds: ["zone_revenue_mix"]
  },
  {
    id: "cost_expense_profit",
    group: "daily_ops",
    label: "\u6210\u672C/\u8D39\u7528/\u5229\u6DA6",
    required: "strong",
    experts: ["finance"],
    why: "\u53EA\u6709\u8425\u6536\u6CA1\u6709\u5229\u6DA6\u7ED3\u6784\uFF0C\u8D22\u52A1\u5B98\u53EA\u80FD\u8C08\u6D41\u6C34",
    factKinds: ["ledger_json", "cost_pressure", "expense_pressure", "profit_pressure"]
  },
  // —— 菜品销售结构（产品官硬门槛）——
  {
    id: "dish_sales",
    group: "dish_sales",
    label: "\u83DC\u54C1\u9500\u552E\u660E\u7EC6\uFF08\u65E5\u671F\xD7\u83DC\u540D\xD7\u9500\u91CF/\u989D\uFF09",
    required: "hard",
    experts: ["product", "finance"],
    why: "\u8D21\u732E\u7387\u3001\u957F\u5C3E\u3001\u83DC\u996E\u7ED3\u6784\u5FC5\u987B\u9760\u9500\u552E\u4E8B\u5B9E",
    factKinds: ["dish_sales_json", "dish_sales_summary"]
  },
  {
    id: "dish_category",
    group: "dish_sales",
    label: "\u83DC\u54C1\u5206\u7C7B",
    required: "strong",
    experts: ["product"],
    why: "\u70ED\u83DC/\u51C9\u83DC/\u996E\u54C1\u7ED3\u6784\u51B3\u5B9A\u6BDB\u5229\u53D9\u4E8B",
    factKinds: ["dish_sales_json"]
  },
  {
    id: "dish_cost",
    group: "dish_sales",
    label: "\u5355\u54C1\u6210\u672C",
    required: "optional",
    experts: ["product", "finance"],
    why: "\u6709\u6210\u672C\u624D\u80FD\u7B97\u5355\u54C1\u6BDB\u5229\uFF0C\u800C\u4E0D\u53EA\u662F\u6D41\u6C34\u8D21\u732E",
    factKinds: ["dish_sales_json"]
  },
  // —— 菜单主数据 ——
  {
    id: "menu_master",
    group: "menu",
    label: "\u83DC\u5355\u4E3B\u6570\u636E\uFF08\u54C1\u9879/\u552E\u4EF7\uFF09",
    required: "hard",
    experts: ["product", "experience"],
    why: "\u9500\u552E\u7ED3\u6784\u8981\u6302\u56DE\u53EF\u7BA1\u7406\u7684\u83DC\u5355",
    factKinds: ["menu_json", "menu_count"]
  },
  // —— 月度财务补充 ——
  {
    id: "monthly_pnl",
    group: "finance_monthly",
    label: "\u6708\u5EA6\u635F\u76CA\u6C47\u603B",
    required: "optional",
    experts: ["finance"],
    why: "\u8865\u65E5\u660E\u7EC6\u7F3A\u5931\u7684\u8D39\u7528\u79D1\u76EE\u53E3\u5F84",
    factKinds: ["ledger_months", "ledger_json"]
  },
  // —— 运营 KPI（体验官/财务交叉）——
  {
    id: "turnover",
    group: "ops_kpi",
    label: "\u7FFB\u53F0\u7387\u4F53\u611F/\u6863\u4F4D",
    required: "strong",
    experts: ["experience", "finance"],
    why: "\u8FDE\u63A5\u5BA2\u6D41\u3001\u9910\u6BB5\u65F6\u957F\u4E0E\u684C\u6548",
    factKinds: ["turnover_band"]
  },
  {
    id: "serve_speed",
    group: "ops_kpi",
    label: "\u4E0A\u83DC\u901F\u5EA6",
    required: "strong",
    experts: ["experience"],
    why: "\u4F53\u9A8C\u65AD\u88C2\u6700\u5E38\u89C1\u7684\u53EF\u64CD\u4F5C\u70B9",
    factKinds: ["serve_speed_sense"]
  },
  {
    id: "labor_table_space",
    group: "ops_kpi",
    label: "\u4EBA\u6548/\u684C\u6548/\u5E73\u6548",
    required: "strong",
    experts: ["finance", "experience"],
    why: "\u4EBA\u6548\u4E0E\u5E73\u6548\u51B3\u5B9A\u8D39\u7528\u538B\u529B\u662F\u5426\u7ED3\u6784\u6027",
    factKinds: ["labor_efficiency", "table_efficiency", "space_efficiency"]
  },
  {
    id: "staff_churn",
    group: "ops_kpi",
    label: "\u5458\u5DE5\u6D41\u5931",
    required: "optional",
    experts: ["experience"],
    why: "\u670D\u52A1\u7A33\u5B9A\u6027\u7684\u9886\u5148\u6307\u6807",
    factKinds: ["staff_churn"]
  },
  // —— 老板感知 ——
  {
    id: "owner_pain_praise",
    group: "owner_voice",
    label: "\u5E38\u5938/\u5E38\u62B1\u6028",
    required: "strong",
    experts: ["experience", "product"],
    why: "\u5916\u90E8\u8BC4\u8BBA\u7684\u5148\u9A8C\uFF0C\u7528\u4E8E\u4EA4\u53C9\u9A8C\u8BC1",
    factKinds: ["owner_pain", "owner_praise"]
  },
  {
    id: "peak_guests",
    group: "owner_voice",
    label: "\u9AD8\u5CF0\u573A\u666F + \u4E3B\u529B\u5BA2\u7FA4",
    required: "strong",
    experts: ["marketing", "experience"],
    why: "\u5BF9\u7167\u5B9E\u9645\u9910\u6BB5\u5BA2\u6D41\u662F\u5426\u5339\u914D\u5B9A\u4F4D",
    factKinds: ["peakScene", "mainGuests"]
  },
  // —— 外部证据 ——
  {
    id: "reviews",
    group: "external",
    label: "\u70B9\u8BC4/\u5185\u5BB9\u8BC4\u4EF7\u6837\u672C",
    required: "strong",
    experts: ["experience", "product", "marketing"],
    why: "\u4F53\u9A8C\u56DB\u8C61\u9650\u4E0E\u4EA7\u54C1\u53E3\u7891\u7684\u5916\u90E8\u951A"
  },
  {
    id: "competition_map",
    group: "external",
    label: "\u5468\u8FB9\u7ADE\u4E89\u5BC6\u5EA6",
    required: "optional",
    experts: ["marketing"],
    why: "\u5BA2\u6D41\u4E0B\u6ED1\u65F6\u5224\u65AD\u662F\u5E02\u573A\u8FD8\u662F\u81EA\u8EAB"
  }
];
function hasFact(facts, kinds) {
  if (!(kinds == null ? void 0 : kinds.length)) return false;
  return kinds.some((kind) => {
    const hit = facts == null ? void 0 : facts.find((f) => f.kind === kind);
    if (!hit) return false;
    const claim = String(hit.claim || "").trim();
    if (!claim || claim === "0" || claim === "[]") return false;
    if (kind === "ledger_days" && Number(claim) < 7) return false;
    if (kind === "dish_sales_rows" && Number(claim) < 8) return false;
    if (kind === "menu_count" && Number(claim) < 1) return false;
    return true;
  });
}
function fieldPresent(field, facts, evidenceCount, context) {
  var _a, _b, _c;
  if (field.id === "brand") {
    return Boolean((_a = context == null ? void 0 : context.brand) == null ? void 0 : _a.trim()) || hasFact(facts, ["brand", "brandName"]);
  }
  if (field.id === "city_category") {
    return Boolean(((_b = context == null ? void 0 : context.city) == null ? void 0 : _b.trim()) && ((_c = context == null ? void 0 : context.category) == null ? void 0 : _c.trim())) || hasFact(facts, ["city", "category"]);
  }
  if (field.id === "reviews") return evidenceCount >= 3;
  if (field.id === "competition_map") {
    return (facts || []).some((f) => /competition|map/i.test(f.kind + f.claim));
  }
  return hasFact(facts, field.factKinds);
}
function assessDataReadiness(input) {
  const facts = input.facts || [];
  const evidenceCount = input.evidenceCount || 0;
  const context = input.context;
  const hardExtraMissing = [];
  if (!hasFact(facts, ["daily_ops_json", "ledger_days"])) {
    const f = DATA_COLLECTION_CATALOG.find((d) => d.id === "daily_date");
    if (f) hardExtraMissing.push(f);
  }
  const hardMissing = DATA_COLLECTION_CATALOG.filter(
    (f) => f.required === "hard" && !fieldPresent(f, facts, evidenceCount, context)
  );
  const hardIds = new Set(hardMissing.map((f) => f.id));
  for (const f of hardExtraMissing) {
    if (!hardIds.has(f.id)) hardMissing.push(f);
  }
  const strongMissing = DATA_COLLECTION_CATALOG.filter(
    (f) => f.required === "strong" && !fieldPresent(f, facts, evidenceCount, context)
  );
  const hardTotal = DATA_COLLECTION_CATALOG.filter((f) => f.required === "hard").length;
  const strongTotal = DATA_COLLECTION_CATALOG.filter((f) => f.required === "strong").length;
  const hardOk = hardTotal - hardMissing.length;
  const strongOk = strongTotal - strongMissing.length;
  const score = Math.round(
    hardOk / Math.max(1, hardTotal) * 70 + strongOk / Math.max(1, strongTotal) * 30
  );
  const roles = ["finance", "product", "marketing", "experience"];
  const byExpert = Object.fromEntries(
    roles.map((role) => {
      const missingHard = hardMissing.filter((f) => f.experts.includes(role)).map((f) => f.label);
      const missingStrong = strongMissing.filter((f) => f.experts.includes(role)).map((f) => f.label);
      return [
        role,
        {
          ready: missingHard.length === 0,
          missingHard,
          missingStrong
        }
      ];
    })
  );
  const hardReady = hardMissing.length === 0;
  return {
    score,
    hardReady,
    hardMissing,
    strongMissing,
    byExpert,
    summary: hardReady ? `\u6570\u636E\u91C7\u96C6\u5C31\u7EEA\u5EA6 ${score}%\uFF1A\u786C\u95E8\u69DB\u5DF2\u9F50\uFF0C\u53EF\u51FA\u5177\u4F1A\u5BA1\u62A5\u544A` : `\u6570\u636E\u91C7\u96C6\u5C31\u7EEA\u5EA6 ${score}%\uFF1A\u786C\u95E8\u69DB\u7F3A\u5931 ${hardMissing.map((f) => f.label).join("\u3001")}\uFF0C\u4E13\u5BB6\u5C06\u90E8\u5206\u62D2\u7B7E`
  };
}

// packages/m-ops-diag/src/engines/diagnosis-math.ts
function enrichDishSalesWithMenu(sales, menu) {
  if (!menu.length) {
    return {
      rows: sales,
      matched: 0,
      missingCost: sales.filter((r) => !(r.cost && r.cost > 0)).length
    };
  }
  const byName = new Map(
    menu.map((m) => [m.name.trim().toLowerCase(), m])
  );
  let matched = 0;
  let missingCost = 0;
  const rows = sales.map((row) => {
    if (row.cost && row.cost > 0) return row;
    const hit = byName.get(row.dishName.trim().toLowerCase());
    if (!hit) {
      missingCost += 1;
      return row;
    }
    matched += 1;
    const unitCost = hit.cost !== void 0 && hit.cost >= 0 ? hit.cost : void 0;
    if (unitCost === void 0) {
      missingCost += 1;
      return {
        ...row,
        category: row.category || hit.category || row.category
      };
    }
    const qty = Math.max(1, row.qty || 1);
    return {
      ...row,
      category: row.category || hit.category || row.category,
      cost: unitCost * qty
    };
  });
  return { rows, matched, missingCost };
}
function sum(nums) {
  return nums.reduce((s, n) => s + n, 0);
}
function pct(part, total) {
  return total <= 0 ? 0 : part / total * 100;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function aggregateByMonth(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const cur = map.get(month) || { revenue: 0, guests: 0, days: /* @__PURE__ */ new Set() };
    cur.revenue += row.revenue;
    cur.guests += row.guests;
    cur.days.add(row.date);
    map.set(month, cur);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({
    month,
    revenue: v.revenue,
    guests: v.guests,
    days: v.days.size,
    avgTicket: v.revenue / Math.max(1, v.guests)
  }));
}
function decomposeRevenueChange(input) {
  const dTicket = input.ticket1 - input.ticket0;
  const dGuests = input.guests1 - input.guests0;
  const dRev = input.revenue1 - input.revenue0;
  const ticketEffect = input.guests0 * dTicket;
  const guestEffect = input.ticket0 * dGuests;
  const interaction = dTicket * dGuests;
  const explained = ticketEffect + guestEffect + interaction;
  const absExplained = Math.abs(ticketEffect) + Math.abs(guestEffect) + Math.abs(interaction) || 1;
  let driver = "flat";
  if (Math.abs(dRev) / Math.max(1, Math.abs(input.revenue0)) < 0.02) {
    driver = "flat";
  } else if (Math.abs(ticketEffect) > Math.abs(guestEffect) * 1.25) {
    driver = "ticket";
  } else if (Math.abs(guestEffect) > Math.abs(ticketEffect) * 1.25) {
    driver = "traffic";
  } else {
    driver = "mixed";
  }
  return {
    dRev,
    dRevPct: pct(dRev, input.revenue0),
    ticketEffect,
    guestEffect,
    interaction,
    ticketShare: pct(Math.abs(ticketEffect), absExplained),
    guestShare: pct(Math.abs(guestEffect), absExplained),
    driver,
    explained
  };
}
function mealContributionIndex(rows) {
  const totalRev = sum(rows.map((r) => r.revenue));
  const totalGuests = sum(rows.map((r) => r.guests));
  const storeTicket = totalRev / Math.max(1, totalGuests);
  const byMeal = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const cur = byMeal.get(row.mealPeriod) || { revenue: 0, guests: 0 };
    cur.revenue += row.revenue;
    cur.guests += row.guests;
    byMeal.set(row.mealPeriod, cur);
  }
  return [...byMeal.entries()].map(([mealPeriod, v]) => {
    const avgTicket = v.revenue / Math.max(1, v.guests);
    const revenueShare = pct(v.revenue, totalRev) / 100;
    const ticketIndex = avgTicket / Math.max(1e-6, storeTicket);
    return {
      mealPeriod,
      revenue: v.revenue,
      guests: v.guests,
      avgTicket,
      revenueShare: revenueShare * 100,
      ticketIndex,
      mci: revenueShare * ticketIndex
    };
  }).sort((a, b) => b.mci - a.mci);
}
function zoneContribution(rows) {
  const totalRev = sum(rows.map((r) => r.revenue));
  const byZone = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const zone = row.zone || "\u672A\u5206\u533A";
    const cur = byZone.get(zone) || { revenue: 0, guests: 0 };
    cur.revenue += row.revenue;
    cur.guests += row.guests;
    byZone.set(zone, cur);
  }
  return [...byZone.entries()].map(([zone, v]) => ({
    zone,
    revenue: v.revenue,
    guests: v.guests,
    avgTicket: v.revenue / Math.max(1, v.guests),
    revenueShare: pct(v.revenue, totalRev)
  })).sort((a, b) => b.revenueShare - a.revenueShare);
}
function computePnL(rows) {
  const revenue = sum(rows.map((r) => r.revenue));
  const withCost = rows.filter((r) => r.cost !== void 0);
  const withExpense = rows.filter((r) => r.expense !== void 0);
  const cost = sum(withCost.map((r) => r.cost || 0));
  const expense = sum(withExpense.map((r) => r.expense || 0));
  const profit = sum(
    rows.map(
      (r) => r.profit !== void 0 ? r.profit : r.revenue - (r.cost || 0) - (r.expense || 0)
    )
  );
  return {
    revenue,
    cost,
    expense,
    profit,
    marginPct: pct(profit, revenue),
    costRatioPct: pct(cost, revenue),
    expenseRatioPct: pct(expense, revenue),
    hasCost: withCost.length > 0,
    hasExpense: withExpense.length > 0,
    costCoverage: withCost.length / Math.max(1, rows.length)
  };
}
function computeDishAbc(rows) {
  const byDish = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const cur = byDish.get(row.dishName) || {
      amount: 0,
      qty: 0,
      category: row.category || "\u672A\u5206\u7C7B",
      cost: 0
    };
    cur.amount += row.amount;
    cur.qty += row.qty;
    cur.cost += row.cost || 0;
    byDish.set(row.dishName, cur);
  }
  const total = sum([...byDish.values()].map((v) => v.amount)) || 1;
  let cum = 0;
  const ranked = [...byDish.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount).map((item) => {
    cum += item.amount;
    const sharePct = pct(item.amount, total);
    const cumSharePct = pct(cum, total);
    const abc = cumSharePct <= 80 || (cum - item.amount) / total < 0.8 ? cumSharePct <= 80 ? "A" : cumSharePct <= 95 ? "B" : "C" : cumSharePct <= 95 ? "B" : "C";
    let cls = "C";
    if (cumSharePct <= 80) cls = "A";
    else if (cumSharePct <= 95) cls = "B";
    else cls = "C";
    const prevCum = cumSharePct - sharePct;
    if (prevCum < 80) cls = "A";
    else if (prevCum < 95) cls = "B";
    else cls = "C";
    const hasCost = item.cost > 0;
    const marginPct = hasCost ? pct(item.amount - item.cost, item.amount) : null;
    let quadrant = "unknown";
    if (marginPct !== null) {
      const highRev = sharePct >= 5 || cls === "A";
      const highMargin = marginPct >= 55;
      if (highRev && highMargin) quadrant = "star";
      else if (highRev && !highMargin) quadrant = "cash_cow";
      else if (!highRev && highMargin) quadrant = "question";
      else quadrant = "dog";
    }
    return {
      name: item.name,
      category: item.category,
      amount: item.amount,
      qty: item.qty,
      cost: item.cost,
      sharePct,
      cumSharePct,
      abc: cls,
      marginPct,
      quadrant
    };
  });
  let running = 0;
  for (const row of ranked) {
    const prev = running;
    running += row.amount;
    if (prev / total < 0.8) row.abc = "A";
    else if (prev / total < 0.95) row.abc = "B";
    else row.abc = "C";
    row.cumSharePct = pct(running, total);
  }
  const aCount = ranked.filter((r) => r.abc === "A").length;
  const bCount = ranked.filter((r) => r.abc === "B").length;
  const cCount = ranked.filter((r) => r.abc === "C").length;
  const topN = Math.max(1, Math.ceil(ranked.length * 0.2));
  const top20SharePct = pct(sum(ranked.slice(0, topN).map((r) => r.amount)), total);
  const drinkAmount = sum(
    ranked.filter((r) => /饮|酒|茶|咖|饮料/.test(r.category) || /汤|茶|汁|酒/.test(r.name)).map((r) => r.amount)
  );
  const longTailCount = ranked.filter((r) => r.sharePct < 1).length;
  const hasMargin = ranked.some((r) => r.marginPct !== null);
  return {
    ranked,
    aCount,
    bCount,
    cCount,
    top20SharePct,
    drinkSharePct: pct(drinkAmount, total),
    longTailCount,
    hasMargin
  };
}
function professionalConfidence(input) {
  var _a, _b;
  if (input.refused) return 0.12;
  const daysScore = clamp(input.days / 60, 0, 1) * 0.35;
  const skuScore = clamp(((_b = (_a = input.skuCount) != null ? _a : input.dishCount) != null ? _b : 0) / 40, 0, 1) * 0.2;
  const evidenceScore = clamp((input.evidenceCount || 0) / 12, 0, 1) * 0.2;
  const costScore = clamp(input.costCoverage || 0, 0, 1) * 0.15;
  const monthScore = clamp((input.comparableMonths || 0) / 3, 0, 1) * 0.1;
  return clamp(0.2 + daysScore + skuScore + evidenceScore + costScore + monthScore, 0.15, 0.95);
}
function uniqueDates(rows) {
  return new Set(rows.map((r) => r.date)).size;
}
function formatMoney(n) {
  return Math.round(n).toLocaleString("zh-CN");
}
function formatPct(n, digits = 1) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
function driverLabel(driver) {
  if (driver === "ticket") return "\u5BA2\u5355\u4E3B\u5BFC";
  if (driver === "traffic") return "\u5BA2\u6D41\u4E3B\u5BFC";
  if (driver === "mixed") return "\u5BA2\u5355\u4E0E\u5BA2\u6D41\u5171\u540C\u4F5C\u7528";
  return "\u57FA\u672C\u6301\u5E73";
}

// packages/m-ops-diag/src/engines/category-thresholds.ts
var CATEGORY_THRESHOLDS = {
  xiangcai: {
    id: "xiangcai",
    label: "\u6E58\u83DC/\u6B63\u9910",
    peakShareWarn: 45,
    top20ShareWarn: 55,
    guestDropWarn: -5,
    guestDropRisk: -12,
    tip: "\u6E58\u83DC\u5173\u6CE8\u665A\u5E02\u9AD8\u5CF0\u7B49\u5F85\u4E0E\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\u62DB\u724C\u3002"
  },
  hotpot: {
    id: "hotpot",
    label: "\u706B\u9505",
    peakShareWarn: 50,
    top20ShareWarn: 50,
    guestDropWarn: -8,
    guestDropRisk: -15,
    tip: "\u706B\u9505\u5173\u6CE8\u7FFB\u53F0/\u591C\u5BB5\u6CE2\u52A8\u4E0E\u9505\u5E95\u53CA\u6DAE\u54C1\u6BDB\u5229\u7ED3\u6784\u3002"
  },
  tea: {
    id: "tea",
    label: "\u8336\u996E",
    peakShareWarn: 40,
    top20ShareWarn: 60,
    guestDropWarn: -6,
    guestDropRisk: -14,
    tip: "\u8336\u996E\u5173\u6CE8\u7206\u54C1\u96C6\u4E2D\u5EA6\u4E0E\u5348\u665A\u5CF0\u6392\u961F\u529D\u9000\u3002"
  },
  default: {
    id: "default",
    label: "\u901A\u7528\u9910\u996E",
    peakShareWarn: 48,
    top20ShareWarn: 55,
    guestDropWarn: -5,
    guestDropRisk: -12,
    tip: "\u6309\u901A\u7528\u9910\u996E\u9608\u503C\u76D1\u63A7\u9AD8\u5CF0\u96C6\u4E2D\u4E0E\u5BA2\u6D41\u6CE2\u52A8\u3002"
  }
};
function resolveCategoryThresholds(category) {
  const c = String(category || "");
  if (/火锅|串串|冒菜|麻辣烫/.test(c)) return CATEGORY_THRESHOLDS.hotpot;
  if (/茶|咖啡|饮品|奶茶|果汁/.test(c)) return CATEGORY_THRESHOLDS.tea;
  if (/湘|川|粤|菜|餐|烧烤|烤肉|面|粉/.test(c)) return CATEGORY_THRESHOLDS.xiangcai;
  return CATEGORY_THRESHOLDS.default;
}
function evaluateCategoryAlerts(input) {
  const thresholds = resolveCategoryThresholds(input.category);
  const alerts = [];
  if (input.peakSharePct != null && input.peakSharePct >= thresholds.peakShareWarn) {
    alerts.push({
      id: "cat_peak_share",
      level: "attention",
      statement: `${thresholds.label}\uFF1A\u6700\u65FA\u9910\u6BB5\u4EFD\u989D ${input.peakSharePct.toFixed(0)}% \u2265 ${thresholds.peakShareWarn}% \u544A\u8B66\u7EBF\uFF0C\u9700\u76EF\u51FA\u83DC\u4E0E\u7B49\u4F4D`
    });
  }
  if (input.top20SharePct != null && input.top20SharePct >= thresholds.top20ShareWarn) {
    alerts.push({
      id: "cat_top20",
      level: "attention",
      statement: `${thresholds.label}\uFF1ATOP20% \u8D21\u732E ${input.top20SharePct.toFixed(0)}% \u2265 ${thresholds.top20ShareWarn}% \uFF0C\u7206\u54C1/\u62DB\u724C\u96C6\u4E2D\u98CE\u9669`
    });
  }
  if (input.guestChangePct != null) {
    if (input.guestChangePct <= thresholds.guestDropRisk) {
      alerts.push({
        id: "cat_guest_risk",
        level: "risk",
        statement: `${thresholds.label}\uFF1A\u5BA2\u6D41 ${input.guestChangePct.toFixed(1)}% \u2264 \u98CE\u9669\u7EBF ${thresholds.guestDropRisk}%`
      });
    } else if (input.guestChangePct <= thresholds.guestDropWarn) {
      alerts.push({
        id: "cat_guest_warn",
        level: "attention",
        statement: `${thresholds.label}\uFF1A\u5BA2\u6D41 ${input.guestChangePct.toFixed(1)}% \u2264 \u544A\u8B66\u7EBF ${thresholds.guestDropWarn}%`
      });
    }
  }
  return { thresholds, alerts };
}

// packages/m-ops-diag/src/engines/expert-capabilities.ts
var MIN_DAYS = 7;
var MIN_DISH_ROWS = 8;
function parseJsonFact(facts, kind) {
  var _a;
  const raw = (_a = facts == null ? void 0 : facts.find((f) => f.kind === kind)) == null ? void 0 : _a.claim;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function factClaim(facts, kind) {
  var _a;
  return (_a = facts == null ? void 0 : facts.find((f) => f.kind === kind)) == null ? void 0 : _a.claim;
}
function worse(a, b) {
  const rank = {
    healthy: 0,
    observe: 1,
    attention: 2,
    risk: 3,
    critical: 4
  };
  return rank[a] >= rank[b] ? a : b;
}
function trendLevel(changePct, warn = -5, risk = -15) {
  if (changePct <= risk) return "risk";
  if (changePct <= warn) return "attention";
  if (changePct >= 8) return "healthy";
  return "observe";
}
function professionalVerdict(input) {
  const tone = input.level === "critical" ? "\u62D2\u7B7E" : input.level === "risk" ? "\u5224\u5B9A\u98CE\u9669" : input.level === "attention" ? "\u63D0\u793A\u5173\u6CE8" : input.level === "healthy" ? "\u5224\u5B9A\u7A33\u5B9A" : "\u7EF4\u6301\u89C2\u5BDF";
  return `${input.title}${tone}\uFF1A${input.headline}\uFF08\u4F9D\u636E\uFF1A${input.evidence}\uFF09`;
}
function runFinanceOfficer(input) {
  var _a, _b, _c;
  const capabilities = [
    "\u8425\u6536\u53D8\u52A8 = \u5BA2\u5355\u6548\u5E94 \xD7 \u5BA2\u6D41\u6548\u5E94 \u5206\u89E3",
    "\u9910\u6BB5\u8D21\u732E\u6307\u6570 MCI",
    "\u533A\u57DF\u8D21\u732E\u4E0E\u96C6\u4E2D\u5EA6",
    "\u6210\u672C\u7387 / \u8D39\u7528\u7387 / \u5229\u6DA6\u7387\uFF08\u6709\u79D1\u76EE\u65F6\uFF09",
    "\u786C\u95E8\u69DB\u62D2\u7B7E\uFF1A\u8425\u4E1A\u65E5 < 7"
  ];
  const daily = parseJsonFact(input.facts, "daily_ops_json") || [];
  const days = uniqueDates(daily);
  if (days < MIN_DAYS) {
    return {
      role: "finance",
      title: "\u8D22\u52A1\u5B98",
      seat: "CFO \u5E2D",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "\u8D22\u52A1\u5B98",
        level: "critical",
        headline: "\u65E5\xD7\u9910\u6BB5\u6837\u672C\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u51FA\u5177\u6D41\u6C34\u4E0E\u635F\u76CA\u8BCA\u65AD",
        evidence: `\u6709\u6548\u8425\u4E1A\u65E5 ${days}\uFF08\u9608\u503C \u2265${MIN_DAYS}\uFF09`
      }),
      analyses: [],
      observations: [`\u6709\u6548\u8425\u4E1A\u65E5\u4EC5 ${days} \u5929\uFF0C\u672A\u8FBE\u8D22\u52A1\u786C\u95E8\u69DB`],
      risks: ["\u5728\u8865\u9F50\u65E5\u660E\u7EC6\u524D\uFF0C\u8425\u6536/\u5229\u6DA6\u76F8\u5173\u7ED3\u8BBA\u4E00\u5F8B\u4E0D\u53EF\u91C7\u4FE1"],
      counsel: [
        `\u5BFC\u5165\u4E0D\u5C11\u4E8E ${MIN_DAYS} \u4E2A\u8425\u4E1A\u65E5\u7684\u65E5\xD7\u9910\u6BB5\u660E\u7EC6\uFF08\u5EFA\u8BAE\u8986\u76D6 3 \u4E2A\u6708\uFF09`,
        "\u5B57\u6BB5\u81F3\u5C11\u542B\uFF1A\u65E5\u671F\u3001\u9910\u6BB5\u3001\u533A\u57DF\u3001\u6765\u5BA2\u6570\u3001\u4EBA\u5747\u6216\u8425\u6536\uFF1B\u5C3D\u91CF\u542B\u6210\u672C/\u8D39\u7528"
      ],
      confidence: professionalConfidence({ days, refused: true }),
      refused: true,
      refuseReason: `\u8425\u4E1A\u65E5 ${days} < ${MIN_DAYS}`,
      signals: [
        {
          id: "finance_data_gap",
          severity: "critical",
          statement: "\u8D22\u52A1\u786C\u6570\u636E\u4E0D\u8DB3"
        }
      ]
    };
  }
  const months = aggregateByMonth(daily);
  const pnl = computePnL(daily);
  const meals = mealContributionIndex(daily);
  const zones = zoneContribution(daily);
  const topMeal = meals[0];
  const topZone = zones[0];
  let decomp = null;
  if (months.length >= 2) {
    const first = months[0];
    const last = months[months.length - 1];
    decomp = decomposeRevenueChange({
      revenue0: first.revenue,
      guests0: first.guests,
      ticket0: first.avgTicket,
      revenue1: last.revenue,
      guests1: last.guests,
      ticket1: last.avgTicket
    });
  }
  let level = "observe";
  if (decomp) level = worse(level, trendLevel(decomp.dRevPct));
  if (pnl.hasCost || pnl.hasExpense) {
    if (pnl.marginPct < 0) level = worse(level, "risk");
    else if (pnl.marginPct < 8) level = worse(level, "attention");
    if (pnl.costRatioPct > 40) level = worse(level, "attention");
    if (pnl.expenseRatioPct > 35) level = worse(level, "attention");
  }
  if (topMeal && topMeal.revenueShare >= 65) level = worse(level, "attention");
  if (topZone && topZone.revenueShare >= 70) level = worse(level, "attention");
  const analyses = [
    {
      label: "\u6837\u672C\u7A97",
      value: `${((_a = months[0]) == null ? void 0 : _a.month) || "?"}~${((_b = months[months.length - 1]) == null ? void 0 : _b.month) || "?"} \xB7 ${days} \u4E2A\u8425\u4E1A\u65E5 \xB7 ${daily.length} \u6761\u9910\u6BB5`,
      metricId: "sample_window"
    },
    {
      label: "\u603B\u8425\u6536 / \u6765\u5BA2 / \u4EBA\u5747",
      value: `${formatMoney(pnl.revenue)} / ${sum(daily.map((r) => r.guests))} / ${formatMoney(pnl.revenue / Math.max(1, sum(daily.map((r) => r.guests))))}`,
      metricId: "rev_guests_ticket"
    }
  ];
  if (decomp) {
    analyses.push({
      label: "\u8425\u6536\u53D8\u52A8\u5206\u89E3",
      value: `\u0394\u8425\u6536 ${formatPct(decomp.dRevPct)}\uFF5C\u5BA2\u5355\u6548\u5E94\u5360 ${decomp.ticketShare.toFixed(0)}%\uFF5C\u5BA2\u6D41\u6548\u5E94\u5360 ${decomp.guestShare.toFixed(0)}%\uFF5C\u4E3B\u56E0\uFF1A${driverLabel(decomp.driver)}`,
      note: decomp.driver === "ticket" ? "\u5E94\u4F18\u5148\u67E5\u83DC\u5355\u7ED3\u6784\u4E0E\u5B9A\u4EF7\uFF0C\u800C\u975E\u76F2\u76EE\u62C9\u65B0" : decomp.driver === "traffic" ? "\u5E94\u4F18\u5148\u67E5\u83B7\u5BA2/\u590D\u8D2D\u4E0E\u9AD8\u5CF0\u4F53\u9A8C\uFF0C\u800C\u975E\u5148\u8C03\u4EF7" : void 0,
      metricId: "rev_decomposition"
    });
  }
  analyses.push({
    label: "\u9910\u6BB5 MCI\uFF08\u8D21\u732E\u6307\u6570\uFF09",
    value: meals.slice(0, 4).map((m) => `${m.mealPeriod} MCI=${m.mci.toFixed(2)}\uFF08\u4EFD\u989D${m.revenueShare.toFixed(0)}%\xB7\u4EBA\u5747\u6307\u6570${m.ticketIndex.toFixed(2)}\uFF09`).join("\uFF1B"),
    note: topMeal && topMeal.revenueShare >= 65 ? `\u8FC7\u5EA6\u4F9D\u8D56\u300C${topMeal.mealPeriod}\u300D` : void 0,
    metricId: "meal_mci"
  });
  analyses.push({
    label: "\u533A\u57DF\u8D21\u732E",
    value: zones.slice(0, 4).map((z) => `${z.zone} ${z.revenueShare.toFixed(0)}%\xB7\u4EBA\u5747${formatMoney(z.avgTicket)}`).join("\uFF1B"),
    note: topZone && topZone.revenueShare >= 70 ? `\u533A\u57DF\u96C6\u4E2D\u5EA6\u8FC7\u9AD8\uFF1A${topZone.zone}` : void 0,
    metricId: "zone_mix"
  });
  analyses.push({
    label: "\u635F\u76CA\u7ED3\u6784",
    value: pnl.hasCost || pnl.hasExpense ? `\u5229\u6DA6\u7387 ${pnl.marginPct.toFixed(1)}% \xB7 \u6210\u672C\u7387 ${pnl.costRatioPct.toFixed(1)}% \xB7 \u8D39\u7528\u7387 ${pnl.expenseRatioPct.toFixed(1)}%\uFF08\u6210\u672C\u8986\u76D6 ${(pnl.costCoverage * 100).toFixed(0)}%\uFF09` : "\u65E5\u660E\u7EC6\u672A\u542B\u6210\u672C/\u8D39\u7528\uFF0C\u53EA\u80FD\u8BCA\u65AD\u6D41\u6C34\u4E0E\u5BA2\u6D41\uFF0C\u4E0D\u80FD\u56DE\u7B54\u300C\u8D5A\u4E0D\u8D5A\u94B1\u300D",
    metricId: "pnl"
  });
  const risks = [];
  const signals = [];
  if (decomp && decomp.dRevPct <= -5) {
    risks.push(
      `\u8FD1\u7A97\u8425\u6536 ${formatPct(decomp.dRevPct)}\uFF0C\u4E3B\u56E0\u5C5E${driverLabel(decomp.driver)}`
    );
    signals.push({
      id: "rev_down",
      severity: trendLevel(decomp.dRevPct),
      statement: `\u8425\u6536\u4E0B\u884C\u4E14\u4E3B\u56E0=${decomp.driver}`
    });
  }
  if (topMeal && topMeal.revenueShare >= 65) {
    risks.push(`\u9910\u6BB5\u4F9D\u8D56\uFF1A${topMeal.mealPeriod} \u5360\u8425\u6536 ${topMeal.revenueShare.toFixed(0)}%`);
    signals.push({
      id: "meal_concentration",
      severity: "attention",
      statement: `\u9910\u6BB5\u96C6\u4E2D ${topMeal.mealPeriod}`
    });
  }
  if (topZone && topZone.revenueShare >= 70) {
    risks.push(`\u533A\u57DF\u4F9D\u8D56\uFF1A${topZone.zone} \u5360\u8425\u6536 ${topZone.revenueShare.toFixed(0)}%`);
  }
  if ((pnl.hasCost || pnl.hasExpense) && pnl.marginPct < 8) {
    risks.push(`\u5229\u6DA6\u7387 ${pnl.marginPct.toFixed(1)}% \u504F\u7D27\uFF0C\u9700\u5BF9\u7167\u83DC\u54C1\u6BDB\u5229\u4E0E\u8D39\u7528\u521A\u6027`);
    signals.push({
      id: "thin_margin",
      severity: pnl.marginPct < 0 ? "risk" : "attention",
      statement: `\u5229\u6DA6\u7387 ${pnl.marginPct.toFixed(1)}%`
    });
  }
  if (!pnl.hasCost && !pnl.hasExpense) {
    risks.push("\u7F3A\u6210\u672C\u8D39\u7528\u79D1\u76EE\uFF1A\u8D22\u52A1\u8BCA\u65AD\u505C\u7559\u5728\u6D41\u6C34\u5C42");
  }
  if (!risks.length) risks.push("\u8D22\u52A1\u7EA2\u706F\u672A\u4EAE\uFF1B\u7EE7\u7EED\u6309\u5468\u76D1\u63A7\u9910\u6BB5 MCI \u4E0E\u533A\u57DF\u96C6\u4E2D\u5EA6");
  const headline = decomp ? `\u8FD1\u7A97\u8425\u6536 ${formatPct(decomp.dRevPct)}\uFF0C\u53D8\u52A8\u4E3B\u56E0${driverLabel(decomp.driver)}` : `\u5DF2\u5EFA\u7ACB ${days} \u65E5\u7ECF\u8425\u622A\u9762\uFF0C\u8D8B\u52BF\u7A97\u4ECD\u77ED`;
  return {
    role: "finance",
    title: "\u8D22\u52A1\u5B98",
    seat: "CFO \u5E2D",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "\u8D22\u52A1\u5B98",
      level,
      headline,
      evidence: ((_c = analyses.find((a) => a.metricId === "rev_decomposition")) == null ? void 0 : _c.value) || analyses[0].value
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}\uFF1A${a.value}`),
    risks,
    counsel: [
      (decomp == null ? void 0 : decomp.driver) === "ticket" ? "\u5BA2\u5355\u4E3B\u5BFC\u4E0B\u884C/\u6CE2\u52A8\uFF1A\u5148\u590D\u76D8\u5934\u90E8\u83DC\u5B9A\u4EF7\u4E0E\u7ED3\u6784\uFF0C\u518D\u8C08\u6295\u653E" : (decomp == null ? void 0 : decomp.driver) === "traffic" ? "\u5BA2\u6D41\u4E3B\u5BFC\uFF1A\u5148\u67E5\u9AD8\u5CF0\u4F53\u9A8C\u4E0E\u590D\u8D2D\uFF0C\u518D\u8003\u8651\u8C03\u4EF7" : "\u7EF4\u6301\u5BA2\u5355\xD7\u5BA2\u6D41\u53CC\u5468\u770B\u677F\uFF0C\u907F\u514D\u53EA\u770B\u603B\u8425\u6536",
      topMeal ? `\u63D0\u5347\u975E\u300C${topMeal.mealPeriod}\u300D\u9910\u6BB5\u7684\u6765\u5BA2\u6216\u4EBA\u5747\uFF0C\u964D\u4F4E\u5355\u9910\u6BB5\u4F9D\u8D56` : "\u8865\u9F50\u9910\u6BB5\u6807\u6CE8\u540E\u518D\u505A\u9020\u8840\u8BCA\u65AD",
      pnl.hasCost || pnl.hasExpense ? "\u6309\u6708\u62C6\u6210\u672C\u7387/\u8D39\u7528\u7387\uFF0C\u8BC6\u522B\u521A\u6027\u8D39\u7528\u4E0E\u53EF\u6D6E\u52A8\u8D39\u7528" : "\u4E0B\u4E00\u6B65\u5FC5\u987B\u8865\u6210\u672C/\u8D39\u7528\uFF0C\u5426\u5219\u65E0\u6CD5\u95ED\u73AF\u300C\u8D5A\u94B1\u80FD\u529B\u300D"
    ],
    confidence: professionalConfidence({
      days,
      costCoverage: pnl.costCoverage,
      comparableMonths: months.length
    }),
    refused: false,
    signals
  };
}
function runProductOfficer(input) {
  var _a;
  const capabilities = [
    "Pareto ABC\uFF08A\u226480% / B\u226495% / C \u4F59\u4E0B\uFF09",
    "\u83DC\u5355\u6210\u672C JOIN \u83DC\u9500 \u2192 \u6D41\u6C34\xD7\u6BDB\u5229\u56DB\u8C61\u9650",
    "\u83DC\u996E\u7ED3\u6784\u4E0E\u957F\u5C3E\u7A00\u91CA",
    "\u5BF9\u7167\u5916\u90E8\u4EA7\u54C1\u8D1F\u8BC4",
    "\u786C\u95E8\u69DB\u62D2\u7B7E\uFF1A\u9500\u552E\u884C < 8 \u6216\u83DC\u5355\u7F3A\u5931"
  ];
  const salesRaw = parseJsonFact(input.facts, "dish_sales_json") || [];
  const menu = parseJsonFact(input.facts, "menu_json") || [];
  const menuCount = Number(factClaim(input.facts, "menu_count") || menu.length || 0);
  if (salesRaw.length < MIN_DISH_ROWS) {
    return {
      role: "product",
      title: "\u4EA7\u54C1\u5B98",
      seat: "CPO \u5E2D",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "\u4EA7\u54C1\u5B98",
        level: "critical",
        headline: "\u83DC\u54C1\u9500\u552E\u7ED3\u6784\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u8BA1\u7B97\u8D21\u732E\u4E0E\u6BDB\u5229\u77E9\u9635",
        evidence: `\u9500\u552E\u884C ${salesRaw.length}\uFF08\u9608\u503C \u2265${MIN_DISH_ROWS}\uFF09`
      }),
      analyses: [],
      observations: [`\u83DC\u54C1\u9500\u552E\u4EC5 ${salesRaw.length} \u884C`],
      risks: ["\u65E0\u9500\u552E\u7ED3\u6784\u5219\u83DC\u5355\u4F18\u5316\u4E0E\u62DB\u724C\u51B3\u7B56\u6CA1\u6709\u4F9D\u636E"],
      counsel: ["\u5BFC\u5165\u83DC\u54C1\u9500\u552E\uFF1A\u65E5\u671F\u3001\u9910\u6BB5\u3001\u83DC\u540D\u3001\u9500\u91CF\u3001\u9500\u552E\u989D\uFF08\u6700\u597D\u542B\u5206\u7C7B\u4E0E\u6210\u672C\uFF09"],
      confidence: professionalConfidence({ days: 0, dishCount: 0, refused: true }),
      refused: true,
      refuseReason: `\u9500\u552E\u884C ${salesRaw.length} < ${MIN_DISH_ROWS}`,
      signals: [
        {
          id: "product_data_gap",
          severity: "critical",
          statement: "\u4EA7\u54C1\u9500\u552E\u7ED3\u6784\u7F3A\u5931"
        }
      ]
    };
  }
  if (menuCount < 1) {
    return {
      role: "product",
      title: "\u4EA7\u54C1\u5B98",
      seat: "CPO \u5E2D",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "\u4EA7\u54C1\u5B98",
        level: "critical",
        headline: "\u83DC\u5355\u4E3B\u6570\u636E\u7F3A\u5931\uFF0C\u65E0\u6CD5\u5BF9\u9F50\u552E\u4EF7/\u6210\u672C\u505A\u7ED3\u6784\u4F1A\u5BA1",
        evidence: "menu_count = 0"
      }),
      analyses: [],
      observations: ["\u672A\u5BFC\u5165\u83DC\u5355\u4E3B\u6570\u636E"],
      risks: ["\u65E0\u83DC\u5355\u5219\u65E0\u6CD5\u6821\u9A8C\u5B9A\u4EF7\u3001\u6210\u672C\u4E0E\u62DB\u724C\u7ED3\u6784"],
      counsel: ["\u5BFC\u5165\u83DC\u5355\uFF08\u83DC\u540D\u3001\u552E\u4EF7\uFF0C\u5EFA\u8BAE\u542B\u6210\u672C\u4E0E\u5206\u7C7B\uFF09"],
      confidence: professionalConfidence({
        days: 0,
        dishCount: salesRaw.length,
        refused: true
      }),
      refused: true,
      refuseReason: "\u83DC\u5355\u786C\u95E8\u69DB\u7F3A\u5931",
      signals: [
        {
          id: "product_data_gap",
          severity: "critical",
          statement: "\u83DC\u5355\u4E3B\u6570\u636E\u7F3A\u5931\uFF0C\u4EA7\u54C1\u5B98\u62D2\u7B7E"
        }
      ]
    };
  }
  const enriched = enrichDishSalesWithMenu(salesRaw, menu);
  const sales = enriched.rows;
  const abc = computeDishAbc(sales);
  const productNeg = ((_a = input.evidence) == null ? void 0 : _a.filter(
    (e) => e.sentiment === "negative" && (claimMatchesTheme(e.claim, "product", e.theme) || e.theme === "product")
  ).length) || 0;
  const cashCows = abc.ranked.filter((r) => r.quadrant === "cash_cow");
  const stars = abc.ranked.filter((r) => r.quadrant === "star");
  const dogs = abc.ranked.filter((r) => r.quadrant === "dog");
  const cat = resolveCategoryThresholds(input.category);
  let level = "observe";
  if (abc.aCount <= 3) level = worse(level, "attention");
  if (abc.top20SharePct >= cat.top20ShareWarn) level = worse(level, "attention");
  if (abc.longTailCount > abc.ranked.length * 0.5) level = worse(level, "attention");
  if (cashCows.length >= 2) level = worse(level, "attention");
  if (productNeg >= 2) level = worse(level, "attention");
  if (!menuCount) level = worse(level, "attention");
  const analyses = [
    {
      label: "ABC \u7ED3\u6784",
      value: `A ${abc.aCount} / B ${abc.bCount} / C ${abc.cCount}\uFF08\u5171 ${abc.ranked.length} SKU\uFF09`,
      note: abc.aCount <= 3 ? "A \u7C7B\u8FC7\u7A84\uFF0C\u65AD\u8D27\u4E0E\u51FA\u54C1\u98CE\u9669\u96C6\u4E2D" : void 0,
      metricId: "abc"
    },
    {
      label: "TOP20% \u6D41\u6C34\u8D21\u732E",
      value: `${abc.top20SharePct.toFixed(0)}%`,
      note: abc.top20SharePct >= cat.top20ShareWarn ? `${cat.label}\u544A\u8B66\u7EBF ${cat.top20ShareWarn}%` : `${cat.label}\u544A\u8B66\u7EBF ${cat.top20ShareWarn}%\uFF08\u672A\u89E6\u8FBE\uFF09`,
      metricId: "top20_share"
    },
    {
      label: "\u83DC\u996E\u7ED3\u6784",
      value: `\u996E\u54C1\u76F8\u5173 ${abc.drinkSharePct.toFixed(0)}% \xB7 \u5176\u4F59 ${(100 - abc.drinkSharePct).toFixed(0)}%`,
      metricId: "drink_share"
    },
    {
      label: "\u83DC\u5355\u6210\u672C\u5BF9\u9F50",
      value: abc.hasMargin ? `\u5DF2\u5339\u914D\u6210\u672C\uFF0C\u53EF\u51FA\u56DB\u8C61\u9650\uFF08JOIN ${enriched.matched} \u9879\uFF09` : `\u7ED3\u6784\u53EF\u8BFB\u3001\u6BDB\u5229\u4E0D\u53EF\u8BFB\uFF08\u7F3A\u6210\u672C ${enriched.missingCost} \u9879\uFF09`,
      note: abc.hasMargin ? void 0 : "\u8BF7\u5728\u83DC\u5355\u6216\u9500\u552E\u4E2D\u8865\u6210\u672C\u5217",
      metricId: "menu_cost_join"
    },
    {
      label: "A \u7C7B\u4EE3\u8868",
      value: abc.ranked.filter((r) => r.abc === "A").slice(0, 5).map((t) => `${t.name}(${t.sharePct.toFixed(1)}%)`).join("\u3001"),
      metricId: "a_class"
    },
    {
      label: "\u957F\u5C3E",
      value: `${abc.longTailCount} \u4E2A\u5355\u54C1\u8D21\u732E <1%`,
      note: abc.longTailCount > abc.ranked.length * 0.5 ? "\u83DC\u5355\u53EF\u80FD\u8FC7\u957F\uFF0C\u7A00\u91CA\u53A8\u623F\u4EA7\u80FD" : void 0,
      metricId: "long_tail"
    }
  ];
  if (abc.hasMargin) {
    analyses.push({
      label: "\u6D41\u6C34\xD7\u6BDB\u5229\u56DB\u8C61\u9650",
      value: `\u660E\u661F ${stars.length} \xB7 \u73B0\u91D1\u6D41\uFF08\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\uFF09 ${cashCows.length} \xB7 \u95EE\u9898 ${abc.ranked.filter((r) => r.quadrant === "question").length} \xB7 \u7626\u72D7 ${dogs.length}`,
      note: cashCows[0] ? `\u8B66\u60D5\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\uFF1A${cashCows.slice(0, 3).map((c) => c.name).join("\u3001")}` : void 0,
      metricId: "margin_matrix"
    });
  } else {
    analyses.push({
      label: "\u6D41\u6C34\xD7\u6BDB\u5229\u56DB\u8C61\u9650",
      value: "\u9500\u552E\u672A\u542B\u5355\u54C1\u6210\u672C\uFF0C\u65E0\u6CD5\u8BC6\u522B\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\u9677\u9631",
      metricId: "margin_matrix"
    });
  }
  const risks = [];
  const signals = [];
  if (abc.aCount <= 3) {
    risks.push(`A \u7C7B\u4EC5 ${abc.aCount} \u4E2A\u54C1\u9879\u6491\u8D77\u7EA6 80% \u6D41\u6C34\uFF0C\u7ED3\u6784\u8106\u5F31`);
    signals.push({
      id: "narrow_a",
      severity: "attention",
      statement: "A\u7C7B\u8FC7\u7A84"
    });
  }
  if (cashCows.length) {
    risks.push(
      `\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\uFF1A${cashCows.slice(0, 3).map((c) => c.name).join("\u3001")}`
    );
    signals.push({
      id: "low_margin_hero",
      severity: "attention",
      statement: "\u5B58\u5728\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\u83DC"
    });
  }
  if (abc.longTailCount > abc.ranked.length * 0.5) {
    risks.push("\u957F\u5C3E\u8FC7\u957F\uFF0C\u53EF\u80FD\u62D6\u7D2F\u51FA\u83DC\u901F\u5EA6\u4E0E\u5E93\u5B58\u5468\u8F6C");
  }
  if (productNeg >= 2) risks.push("\u5916\u90E8\u4EA7\u54C1\u8D1F\u8BC4\u62AC\u5934\uFF0C\u9700\u6838\u5BF9\u662F\u5426\u843D\u5728 A \u7C7B\u83DC");
  if (!menuCount) risks.push("\u7F3A\u83DC\u5355\u4E3B\u6570\u636E\uFF0C\u9500\u552E\u7ED3\u6784\u65E0\u6CD5\u56DE\u5199\u5230\u53EF\u7BA1\u7406\u83DC\u5355");
  const catAlerts = evaluateCategoryAlerts({
    category: input.category,
    top20SharePct: abc.top20SharePct
  }).alerts;
  for (const alert of catAlerts) {
    risks.push(alert.statement);
    signals.push({
      id: alert.id,
      severity: alert.level,
      statement: alert.statement
    });
  }
  if (!risks.length) risks.push("\u4EA7\u54C1\u7ED3\u6784\u7EA2\u706F\u672A\u4EAE\uFF1B\u7EF4\u6301\u6708\u5EA6 ABC \u590D\u7B97");
  return {
    role: "product",
    title: "\u4EA7\u54C1\u5B98",
    seat: "CPO \u5E2D",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "\u4EA7\u54C1\u5B98",
      level,
      headline: `ABC \u5DF2\u5B9A\u4F4D\uFF08A${abc.aCount}/B${abc.bCount}/C${abc.cCount}\uFF09\uFF0CTOP20% \u8D21\u732E ${abc.top20SharePct.toFixed(0)}%`,
      evidence: analyses[0].value
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}\uFF1A${a.value}`),
    risks,
    counsel: [
      `\u4FDD\u62A4 A \u7C7B\u7A33\u5B9A\u6027\uFF1A${abc.ranked.filter((r) => r.abc === "A").slice(0, 3).map((t) => t.name).join("\u3001")}`,
      cashCows.length ? "\u5BF9\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\u83DC\u505A\u914D\u65B9/\u4EFD\u91CF/\u642D\u552E\u6539\u9020\uFF0C\u907F\u514D\u8D8A\u5356\u8D8A\u4E8F" : abc.hasMargin ? "\u7EF4\u6301\u6BDB\u5229\u77E9\u9635\u6708\u62A5" : "\u8865\u5355\u54C1\u6210\u672C\u540E\u91CD\u8DD1\u56DB\u8C61\u9650",
      abc.longTailCount > abc.ranked.length * 0.4 ? "\u5BF9 C \u7C7B\u957F\u5C3E\u505A\u9000\u5E02/\u5408\u5E76\u8BD5\u9A8C\uFF0C\u91CA\u653E\u51FA\u83DC\u4EA7\u80FD" : "\u89C2\u5BDF\u65B0\u54C1\u662F\u5426\u7A00\u91CA A \u7C7B"
    ],
    confidence: professionalConfidence({
      days: uniqueDates(
        sales.map((s) => ({
          date: s.date,
          mealPeriod: s.mealPeriod,
          zone: s.zone,
          guests: 0,
          avgTicket: 0,
          revenue: s.amount
        }))
      ),
      skuCount: abc.ranked.length,
      costCoverage: abc.hasMargin ? 0.7 : 0,
      evidenceCount: productNeg
    }),
    refused: false,
    signals
  };
}
function runMarketingOfficer(input) {
  var _a, _b, _c, _d, _e;
  const capabilities = [
    "\u5BA2\u6D41\u8D8B\u52BF\u4E0E\u9910\u6BB5\u65FA\u5B63",
    "\u5B9A\u4F4D\u53D9\u4E8B vs \u771F\u5B9E\u6700\u65FA\u9910\u6BB5\u5339\u914D",
    "\u5185\u5BB9\u58F0\u91CF vs \u5230\u5E97\u5BA2\u6D41\u4EA4\u53C9",
    "\u65E0\u5BA2\u6D41\u5E8F\u5217\u65F6\u62D2\u7B7E\u5F3A\u589E\u957F\u7ED3\u8BBA"
  ];
  const daily = parseJsonFact(input.facts, "daily_ops_json") || [];
  const days = uniqueDates(daily);
  const peak = factClaim(input.facts, "peakScene") || "";
  const guestsLabel = factClaim(input.facts, "mainGuests") || "";
  if (days < MIN_DAYS) {
    return {
      role: "marketing",
      title: "\u8425\u9500\u5B98",
      seat: "CMO \u5E2D",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "\u8425\u9500\u5B98",
        level: "critical",
        headline: "\u65E0\u5408\u683C\u6765\u5BA2\u5E8F\u5217\uFF0C\u62D2\u7EDD\u51FA\u5177\u589E\u957F\u7ED3\u8BBA",
        evidence: `\u8425\u4E1A\u65E5 ${days} < ${MIN_DAYS}`
      }),
      analyses: [],
      observations: ["\u7F3A\u65E5\xD7\u9910\u6BB5\u6765\u5BA2\uFF0C\u65E0\u6CD5\u9A8C\u8BC1\u589E\u957F\u662F\u771F\u5230\u5E97\u8FD8\u662F\u865A\u58F0\u91CF"],
      risks: ["\u4EFB\u4F55\u6295\u653E\u5EFA\u8BAE\u5728\u5BA2\u6D41\u95ED\u73AF\u5EFA\u7ACB\u524D\u90FD\u5C5E\u4E8E\u8D4C\u535A"],
      counsel: ["\u5148\u8865\u65E5\u660E\u7EC6\u6765\u5BA2\u6570\uFF0C\u518D\u8C08\u589E\u957F\u52A8\u4F5C"],
      confidence: professionalConfidence({ days, refused: true }),
      refused: true,
      refuseReason: `\u8425\u4E1A\u65E5 ${days} < ${MIN_DAYS}`,
      signals: [
        {
          id: "marketing_data_gap",
          severity: "critical",
          statement: "\u5BA2\u6D41\u5E8F\u5217\u7F3A\u5931"
        }
      ]
    };
  }
  const cat = resolveCategoryThresholds(input.category);
  const months = aggregateByMonth(daily);
  const meals = mealContributionIndex(daily);
  const topMeal = ((_a = meals[0]) == null ? void 0 : _a.mealPeriod) || "";
  const peakShare = (_c = (_b = meals[0]) == null ? void 0 : _b.revenueShare) != null ? _c : 0;
  let guestChange = 0;
  if (months.length >= 2) {
    const a = months[0].guests || 1;
    const b = months[months.length - 1].guests;
    guestChange = pct(b - a, a);
  }
  const peakMismatch = /晚|聚餐|夜/.test(peak) && !/晚|夜/.test(topMeal) || /午|上班/.test(peak) && !/午/.test(topMeal);
  const growthEv = ((_d = input.evidence) == null ? void 0 : _d.filter((e) => claimMatchesTheme(e.claim, "growth", e.theme)).length) || 0;
  const compEv = ((_e = input.evidence) == null ? void 0 : _e.filter(
    (e) => claimMatchesTheme(e.claim, "competition", e.theme)
  ).length) || 0;
  let level = trendLevel(
    guestChange,
    cat.guestDropWarn,
    cat.guestDropRisk
  );
  if (peakMismatch) level = worse(level, "attention");
  if (compEv >= 2 && guestChange < 0) level = worse(level, "attention");
  if (growthEv >= 2 && guestChange <= cat.guestDropWarn) level = worse(level, "attention");
  if (peakShare >= cat.peakShareWarn) level = worse(level, "attention");
  const catEval = evaluateCategoryAlerts({
    category: input.category,
    peakSharePct: peakShare,
    guestChangePct: months.length >= 2 ? guestChange : void 0
  });
  const analyses = [
    {
      label: "\u5BA2\u6D41\u53D8\u5316",
      value: months.length >= 2 ? `${formatPct(guestChange)}\uFF08${months[0].month}\u2192${months[months.length - 1].month}\uFF09` : "\u6708\u4EFD\u4E0D\u8DB3\uFF0C\u4EC5\u6709\u622A\u9762",
      note: `${cat.label}\u544A\u8B66 ${cat.guestDropWarn}% / \u98CE\u9669 ${cat.guestDropRisk}%`,
      metricId: "guest_trend"
    },
    {
      label: "\u5B9E\u9645\u6700\u65FA\u9910\u6BB5\uFF08\u6309 MCI\uFF09",
      value: meals.slice(0, 3).map((m) => `${m.mealPeriod} ${m.guests}\u4EBA/\u4EFD\u989D${m.revenueShare.toFixed(0)}%`).join(" \xB7 "),
      note: peakShare >= cat.peakShareWarn ? `${cat.label}\u9AD8\u5CF0\u4EFD\u989D\u544A\u8B66\u7EBF ${cat.peakShareWarn}%\uFF08\u5DF2\u89E6\u8FBE\uFF09` : `${cat.label}\u9AD8\u5CF0\u4EFD\u989D\u544A\u8B66\u7EBF ${cat.peakShareWarn}%`,
      metricId: "peak_actual"
    },
    {
      label: "\u5B9A\u4F4D\u5339\u914D",
      value: `\u81EA\u62A5\u9AD8\u5CF0\u300C${peak || "\u672A\u586B"}\u300D/ \u5BA2\u7FA4\u300C${guestsLabel || "\u672A\u586B"}\u300D vs \u5B9E\u9645\u6700\u65FA\u300C${topMeal}\u300D`,
      note: peakMismatch ? "\u53D9\u4E8B\u9AD8\u5CF0\u4E0E\u771F\u5B9E\u5BA2\u6D41\u9AD8\u5CF0\u4E0D\u4E00\u81F4" : "\u57FA\u672C\u4E00\u81F4",
      metricId: "positioning_fit"
    },
    {
      label: "\u58F0\u91CF vs \u5230\u5E97",
      value: `\u589E\u957F\u4E3B\u9898\u8BC1\u636E ${growthEv} \xB7 \u7ADE\u4E89\u4E3B\u9898 ${compEv} \xB7 \u5BA2\u6D41 ${formatPct(guestChange)}`,
      note: growthEv >= 2 && guestChange < -5 ? "\u5185\u5BB9\u6709\u58F0\u91CF\u4F46\u5BA2\u6D41\u4E0B\u884C \u2192 \u865A\u706B\u98CE\u9669" : void 0,
      metricId: "buzz_vs_traffic"
    }
  ];
  const risks = [];
  const signals = [];
  for (const alert of catEval.alerts) {
    risks.push(alert.statement);
    signals.push({
      id: alert.id,
      severity: alert.level,
      statement: alert.statement
    });
  }
  if (guestChange <= cat.guestDropWarn) {
    risks.push(`\u5BA2\u6D41 ${formatPct(guestChange)}\uFF0C\u9700\u5206\u6E05\u7ADE\u4E89\u5206\u6D41 vs \u4F53\u9A8C\u529D\u9000`);
    signals.push({
      id: "traffic_down",
      severity: trendLevel(guestChange, cat.guestDropWarn, cat.guestDropRisk),
      statement: `\u5BA2\u6D41 ${formatPct(guestChange)}`
    });
  }
  if (peakMismatch) {
    risks.push("\u8425\u9500\u53D9\u4E8B\u4E0E\u771F\u5B9E\u6700\u65FA\u9910\u6BB5\u9519\u914D\uFF0C\u6295\u653E\u53EF\u80FD\u6253\u9519\u573A");
    signals.push({
      id: "positioning_mismatch",
      severity: "attention",
      statement: "\u5B9A\u4F4D\u9519\u914D"
    });
  }
  if (growthEv >= 2 && guestChange <= cat.guestDropWarn) {
    risks.push("\u865A\u706B\uFF1A\u5185\u5BB9\u70ED\u5EA6\u672A\u8F6C\u5316\u4E3A\u5230\u5E97\u5BA2\u6D41");
  }
  if (!risks.length) risks.push("\u589E\u957F\u9762\u7EA2\u706F\u672A\u4EAE\uFF1B\u6BCF\u6B21\u5185\u5BB9\u52A8\u4F5C\u9700\u7ED1\u5B9A\u6765\u5BA2\u56DE\u770B");
  return {
    role: "marketing",
    title: "\u8425\u9500\u5B98",
    seat: "CMO \u5E2D",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "\u8425\u9500\u5B98",
      level,
      headline: `\u5BA2\u6D41 ${formatPct(guestChange)}\uFF0C\u6700\u65FA\u9910\u6BB5\u4E3A\u300C${topMeal}\u300D`,
      evidence: analyses[0].value
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}\uFF1A${a.value}`),
    risks,
    counsel: [
      peakMismatch ? "\u5148\u6539\u5BF9\u5916\u53D9\u4E8B\u4E0E\u573A\u6B21\u8FD0\u8425\uFF0C\u4F7F\u5BA3\u4F20\u9AD8\u5CF0\u5BF9\u9F50\u771F\u5B9E\u6700\u65FA\u9910\u6BB5" : `\u5728\u300C${topMeal}\u300D\u505A\u53EF\u8FFD\u8E2A\u5230\u5E97\u52A8\u4F5C\uFF0C\u518D\u590D\u5236\u5230\u5F31\u9910\u6BB5`,
      guestChange < 0 ? "\u5BA2\u6D41\u4E0B\u884C\u671F\u6682\u505C\u6269\u6295\u653E\uFF0C\u5148\u505A\u8001\u5BA2\u5524\u9192\u4E0E\u5DEE\u8BC4\u6B62\u8840" : "\u7528\u6700\u65FA\u9910\u6BB5\u505A\u6837\u677F\u573A\uFF0C\u6D4B\u91CF\u5185\u5BB9\u2192\u5230\u5E97\u8F6C\u5316",
      "\u5EFA\u7ACB\u300C\u5185\u5BB9\u66DD\u5149 \u2192 \u5230\u5E97\u6765\u5BA2\u300D\u5468\u95ED\u73AF\uFF0C\u5173\u95ED\u865A\u706B"
    ],
    confidence: professionalConfidence({
      days,
      evidenceCount: growthEv + compEv,
      comparableMonths: months.length
    }),
    refused: false,
    signals
  };
}
function runExperienceOfficer(input) {
  var _a;
  const capabilities = [
    "\u4EF7\u683C/\u670D\u52A1/\u83DC\u54C1/\u73AF\u5883\u56DB\u8C61\u9650\u91CF\u5316",
    "\u7B49\u5F85\u8D1F\u8BC4\u5BC6\u5EA6 \xD7 \u9AD8\u5CF0\u9910\u6BB5\u6765\u5BA2\u4EA4\u53C9",
    "\u4E0A\u83DC/\u7FFB\u53F0/\u4EBA\u6548\u6863\u4F4D\u8054\u8BFB",
    "\u8001\u677F\u611F\u77E5\u4E0E\u5916\u90E8\u58F0\u97F3\u5BF9\u7167"
  ];
  const evidence = input.evidence || [];
  const daily = parseJsonFact(input.facts, "daily_ops_json") || [];
  const days = uniqueDates(daily);
  const bucket = (theme) => {
    const all = evidence.filter(
      (e) => claimMatchesTheme(e.claim, theme, e.theme) || e.theme === theme
    );
    return {
      all,
      neg: all.filter((e) => e.sentiment === "negative"),
      pos: all.filter((e) => e.sentiment === "positive")
    };
  };
  const price = bucket("price");
  const wait = bucket("wait");
  const product = bucket("product");
  const env = bucket("environment");
  const dinnerGuests = sum(
    daily.filter((r) => /晚|夜/.test(r.mealPeriod)).map((r) => r.guests)
  );
  const allGuests = sum(daily.map((r) => r.guests)) || 1;
  const dinnerShare = pct(dinnerGuests, allGuests);
  const waitDensity = wait.neg.length / Math.max(1, evidence.length || wait.neg.length);
  const waitHeavyOnDinner = wait.neg.length >= 2 && dinnerShare >= 45;
  const serve = factClaim(input.facts, "serve_speed_sense") || "";
  const turnover = factClaim(input.facts, "turnover_band") || "";
  const labor = factClaim(input.facts, "labor_efficiency") || "";
  const pain = factClaim(input.facts, "owner_pain") || "";
  const praise = factClaim(input.facts, "owner_praise") || "";
  if (!evidence.length && !pain && !serve && days < MIN_DAYS) {
    return {
      role: "experience",
      title: "\u4F53\u9A8C\u5B98",
      seat: "CXO \u5E2D",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "\u4F53\u9A8C\u5B98",
        level: "critical",
        headline: "\u5916\u90E8\u8BC4\u4EF7\u4E0E\u8FD0\u8425\u4F53\u611F\u53CC\u7F3A\uFF0C\u65E0\u6CD5\u505A\u4F53\u9A8C\u5F3A\u7ED3\u8BBA",
        evidence: "\u65E0\u70B9\u8BC4\u6837\u672C\u4E14\u65E0\u4E0A\u83DC/\u75DB\u70B9\u8F93\u5165"
      }),
      analyses: [],
      observations: ["\u4F53\u9A8C\u8BC1\u636E\u4E0D\u8DB3"],
      risks: ["\u4F53\u9A8C\u76F2\u533A\u4F1A\u8BEF\u5BFC\u8D22\u52A1\u4E0E\u8425\u9500\u5F52\u56E0"],
      counsel: ["\u79EF\u7D2F\u70B9\u8BC4/\u5185\u5BB9\u6837\u672C\uFF0C\u5E76\u8865\u4E0A\u83DC\u4E0E\u7FFB\u53F0\u6863\u4F4D"],
      confidence: professionalConfidence({ days, evidenceCount: 0, refused: true }),
      refused: true,
      refuseReason: "\u4F53\u9A8C\u8BC1\u636E\u4E0E\u8FD0\u8425\u4F53\u611F\u5747\u4E0D\u8DB3",
      signals: [
        {
          id: "experience_data_gap",
          severity: "critical",
          statement: "\u4F53\u9A8C\u6570\u636E\u7F3A\u53E3"
        }
      ]
    };
  }
  let level = "observe";
  if (wait.neg.length >= 3 || price.neg.length >= 2) level = "attention";
  if (wait.neg.length >= 4 || waitDensity >= 0.35) level = "risk";
  if (waitHeavyOnDinner) level = worse(level, "attention");
  if (/slow|慢/.test(serve)) level = worse(level, "attention");
  const analyses = [
    {
      label: "\u4EF7\u683C\u4F53\u9A8C",
      value: `\u6B63 ${price.pos.length} / \u8D1F ${price.neg.length} / \u6837\u672C ${price.all.length}`,
      metricId: "exp_price"
    },
    {
      label: "\u670D\u52A1\u7B49\u5F85",
      value: `\u7B49\u5F85\u8D1F\u8BC4 ${wait.neg.length} \xB7 \u8D1F\u8BC4\u5BC6\u5EA6 ${(waitDensity * 100).toFixed(0)}%`,
      metricId: "exp_wait"
    },
    {
      label: "\u83DC\u54C1/\u73AF\u5883",
      value: `\u83DC\u54C1 \u6B63${product.pos.length}/\u8D1F${product.neg.length} \xB7 \u73AF\u5883 \u6B63${env.pos.length}/\u8D1F${env.neg.length}`,
      metricId: "exp_product_env"
    },
    {
      label: "\u9AD8\u5CF0\xD7\u7B49\u5F85\u4EA4\u53C9",
      value: `\u665A/\u591C\u6765\u5BA2\u5360\u6BD4 ${dinnerShare.toFixed(0)}% \xD7 \u7B49\u5F85\u8D1F\u8BC4 ${wait.neg.length}`,
      note: waitHeavyOnDinner ? "\u9AD8\u5CF0\u5BA2\u6D41\u9AD8\u4E14\u7B49\u5F85\u8D1F\u8BC4\u96C6\u4E2D \u2192 \u6700\u8D5A\u94B1\u573A\u6B21\u6B63\u5728\u53D7\u4F24" : "\u4EA4\u53C9\u538B\u529B\u4E0D\u663E\u8457",
      metricId: "wait_peak_cross"
    },
    {
      label: "\u8FD0\u8425\u6863\u4F4D",
      value: `\u4E0A\u83DC ${serve || "\u2014"} \xB7 \u7FFB\u53F0 ${turnover || "\u2014"} \xB7 \u4EBA\u6548 ${labor || "\u2014"}`,
      metricId: "ops_bands"
    }
  ];
  if (pain) analyses.push({ label: "\u8001\u677F\u75DB\u70B9", value: pain, metricId: "owner_pain" });
  if (praise) analyses.push({ label: "\u8001\u677F\u4EAE\u70B9", value: praise, metricId: "owner_praise" });
  const risks = [];
  const signals = [];
  if (waitHeavyOnDinner) {
    risks.push("\u9AD8\u5CF0\u7B49\u5F85\u635F\u4F24\u4E3B\u529B\u573A\u6B21\u4F53\u9A8C\u4E0E\u6F5C\u5728\u590D\u8D2D");
    signals.push({
      id: "peak_wait_injury",
      severity: "attention",
      statement: "\u9AD8\u5CF0\u7B49\u5F85\u4F24\u5BA2"
    });
  }
  if (price.neg.length >= 2) {
    risks.push("\u4EF7\u683C\u4E0D\u503C\u611F\u4E0A\u5347\uFF0C\u9700\u5BF9\u7167\u771F\u5B9E\u4EBA\u5747\u4E0E\u83DC\u7ED3\u6784");
    signals.push({
      id: "price_value_gap",
      severity: "attention",
      statement: "\u4EF7\u683C\u611F\u77E5\u6076\u5316"
    });
  }
  if (/slow|慢/.test(serve) || wait.neg.length >= 2) {
    risks.push("\u4E0A\u83DC/\u7B49\u5F85\u95EE\u9898\u53EF\u80FD\u4F20\u5BFC\u81F3\u7FFB\u53F0\u4E0E\u5DEE\u8BC4\u6269\u6563");
  }
  if (!risks.length) risks.push("\u4F53\u9A8C\u7EA2\u706F\u672A\u4EAE\uFF1B\u7EE7\u7EED\u6269\u6837\u5E76\u5468\u590D\u76D8\u4E0A\u83DC\u4E0E\u7FFB\u53F0");
  return {
    role: "experience",
    title: "\u4F53\u9A8C\u5B98",
    seat: "CXO \u5E2D",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "\u4F53\u9A8C\u5B98",
      level,
      headline: waitHeavyOnDinner ? "\u9AD8\u5CF0\u7B49\u5F85\u5DF2\u6210\u4E3A\u53EF\u8BC1\u5B9E\u7684\u4F53\u9A8C\u65AD\u88C2\u70B9" : `\u56DB\u8C61\u9650\u53EF\u8BCA\u65AD\uFF0C\u7B49\u5F85\u8D1F\u8BC4 ${wait.neg.length} \u6761`,
      evidence: ((_a = analyses.find((a) => a.metricId === "wait_peak_cross")) == null ? void 0 : _a.value) || "\u4F53\u9A8C\u6837\u672C"
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}\uFF1A${a.value}`),
    risks,
    counsel: [
      waitHeavyOnDinner ? "\u5148\u6CBB\u665A\u9AD8\u5CF0\u51FA\u83DC\u4E0E\u7B49\u4F4D\u544A\u77E5\uFF0C\u518D\u8C08\u62C9\u65B0\u6295\u653E" : "\u7EF4\u6301\u9AD8\u5CF0\u5DE1\u573A\uFF0C\u9632\u6B62\u7B49\u5F85\u4ECE\u4E2A\u6848\u53D8\u6210\u7ED3\u6784",
      price.neg.length ? "\u4EF7\u683C\u62B1\u6028\u5BF9\u7167\u4EBA\u5747\u4E0E A \u7C7B\u83DC\uFF0C\u51B3\u5B9A\u8C03\u7ED3\u6784\u8FD8\u662F\u8C03\u9884\u671F" : "\u7528\u6B63\u5411\u573A\u666F\u8BCD\u5DE9\u56FA\u4F53\u9A8C\u8BB0\u5FC6\u70B9",
      "\u4E0A\u83DC\u901F\u5EA6\u4E0E\u7FFB\u53F0\u6863\u4F4D\u7EB3\u5165\u5468\u4F1A\uFF0C\u5F62\u6210\u4F53\u9A8C-\u8FD0\u8425\u95ED\u73AF"
    ],
    confidence: professionalConfidence({
      days: Math.max(days, evidence.length ? 7 : 0),
      evidenceCount: evidence.length
    }),
    refused: false,
    signals
  };
}

// packages/m-ops-diag/src/engines/council-report.ts
var LEVEL_RANK = {
  healthy: 0,
  observe: 1,
  attention: 2,
  risk: 3,
  critical: 4
};
function worse2(a, b) {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}
function levelLabel(level) {
  const map = {
    healthy: "\u7A33\u5B9A",
    observe: "\u89C2\u5BDF",
    attention: "\u5173\u6CE8",
    risk: "\u98CE\u9669",
    critical: "\u5371\u6025"
  };
  return map[level];
}
function buildBossBrief(input) {
  const rawCause = (input.causalLines || []).find((l) => l.startsWith("\u4E3B\u56E0\u94FE")) || (input.consensus.includes("\u4E3B\u56E0\u94FE") ? input.consensus.replace(/^汇总结论[^：]*：\s*/, "") : input.consensus);
  let causeShort = rawCause.replace(/^主因链：/, "").replace(/（[^）]*）/g, "").split(/。|；/)[0] || rawCause;
  causeShort = causeShort.replace(/\s+/g, "").slice(0, 56);
  const causeKey = causeShort.replace(/[←→\s]/g, "").slice(0, 10);
  const nextCandidate = input.priorities.find((p) => {
    const compact = p.replace(/[←→\s]/g, "");
    return !compact.includes(causeKey) && !p.startsWith("\u9A8C\u8BC1/\u5904\u7F6E");
  }) || input.priorities.find((p) => !p.startsWith("\u9A8C\u8BC1/\u5904\u7F6E")) || "\u6309\u884C\u52A8\u6E05\u5355\u9010\u9879\u9A8C\u8BC1\u5E76\u56DE\u586B\u5B66\u4E60";
  const next = nextCandidate.replace(/^DNA 加权（[^）]*）：/, "").replace(/（盯 #[^）]+）/g, "").slice(0, 42);
  return `${input.restaurantName}\u672C\u8F6E\u5224\u5B9A\u300C${levelLabel(input.overallLevel)}\u300D\u3002\u4E3B\u56E0\uFF1A${causeShort}\u3002\u5EFA\u8BAE\u5148\u505A\uFF1A${next}\u3002`;
}
function toOpinion(result) {
  return {
    role: result.role,
    title: result.title,
    seat: result.seat,
    level: result.level,
    capabilities: result.capabilities,
    verdict: result.verdict,
    analyses: result.analyses,
    observations: result.observations,
    risks: result.risks,
    counsel: result.counsel,
    confidence: result.confidence,
    refused: result.refused,
    refuseReason: result.refuseReason,
    signals: result.signals
  };
}
function ownerForAxis(axis) {
  if (axis === "business") return "finance";
  if (axis === "experience" || axis === "operations") return "experience";
  return "marketing";
}
function hasSignal(experts, id) {
  return experts.some((e) => {
    var _a;
    return (_a = e.signals) == null ? void 0 : _a.some((s) => s.id === id);
  });
}
function signalStatement(experts, id) {
  var _a;
  for (const e of experts) {
    const hit = (_a = e.signals) == null ? void 0 : _a.find((s) => s.id === id);
    if (hit) return hit.statement;
  }
  return "";
}
function synthesizeCausalFindings(experts, signals) {
  var _a, _b;
  const chains = [];
  const finance = experts.find((e) => e.role === "finance");
  const marketing = experts.find((e) => e.role === "marketing");
  if (hasSignal(experts, "rev_down") && hasSignal(experts, "traffic_down")) {
    if (hasSignal(experts, "peak_wait_injury")) {
      chains.push(
        `\u4E3B\u56E0\u94FE\uFF1A\u8425\u6536\u627F\u538B \u2190 \u5BA2\u6D41\u4E0B\u884C \u2190 \u9AD8\u5CF0\u7B49\u5F85\u4F24\u5BA2\uFF08${signalStatement(experts, "peak_wait_injury")}\uFF09\u3002\u4F18\u5148\u6B62\u8840\u4F53\u9A8C\uFF0C\u518D\u8C08\u6295\u653E\u3002`
      );
    } else if (hasSignal(experts, "positioning_mismatch")) {
      chains.push(
        "\u4E3B\u56E0\u94FE\uFF1A\u8425\u6536/\u5BA2\u6D41\u627F\u538B \u2190 \u5B9A\u4F4D\u53D9\u4E8B\u4E0E\u771F\u5B9E\u6700\u65FA\u9910\u6BB5\u9519\u914D\u3002\u5148\u5BF9\u9F50\u573A\u6B21\u4E0E\u8BDD\u672F\uFF0C\u518D\u6269\u6295\u653E\u3002"
      );
    } else {
      chains.push(
        `\u4E3B\u56E0\u94FE\uFF1A\u8425\u6536\u627F\u538B\u4E0E\u5BA2\u6D41\u4E0B\u884C\u540C\u5411\uFF08${signalStatement(experts, "rev_down")}\uFF09\u3002\u9700\u7528\u8425\u6536\u5206\u89E3\u786E\u8BA4\u662F\u5426\u5BA2\u6D41\u4E3B\u5BFC\u3002`
      );
    }
  } else if (hasSignal(experts, "rev_down")) {
    const decomp = finance == null ? void 0 : finance.analyses.find((a) => a.metricId === "rev_decomposition");
    if (decomp == null ? void 0 : decomp.value.includes("\u5BA2\u5355\u4E3B\u5BFC")) {
      chains.push(
        `\u4E3B\u56E0\u94FE\uFF1A\u8425\u6536\u53D8\u52A8\u504F\u5BA2\u5355\u4E3B\u5BFC${hasSignal(experts, "low_margin_hero") ? "\uFF0C\u4E14\u5B58\u5728\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\u83DC" : ""}\u3002\u4F18\u5148\u590D\u76D8\u83DC\u5355\u7ED3\u6784/\u5B9A\u4EF7\uFF0C\u800C\u975E\u76F2\u76EE\u62C9\u65B0\u3002`
      );
    } else if (decomp == null ? void 0 : decomp.value.includes("\u5BA2\u6D41\u4E3B\u5BFC")) {
      chains.push("\u4E3B\u56E0\u94FE\uFF1A\u8425\u6536\u53D8\u52A8\u504F\u5BA2\u6D41\u4E3B\u5BFC\u3002\u4F18\u5148\u67E5\u83B7\u5BA2\u3001\u590D\u8D2D\u4E0E\u9AD8\u5CF0\u4F53\u9A8C\u3002");
    } else {
      chains.push(`\u6307\u6807\u2192\u56E0\u679C\uFF1A\u8425\u6536\u627F\u538B\uFF08${signalStatement(experts, "rev_down")}\uFF09\uFF0C\u9A71\u52A8\u5C1A\u672A\u6536\u655B\uFF0C\u4E0B\u4E00\u6B65\u8865\u8DB3\u5206\u89E3\u6837\u672C\u3002`);
    }
  }
  if (hasSignal(experts, "low_margin_hero") && hasSignal(experts, "thin_margin")) {
    chains.push(
      "\u4E3B\u56E0\u94FE\uFF1A\u5229\u6DA6\u504F\u7D27 \u2190 \u5934\u90E8\u83DC\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229\u3002\u6539\u9020 A \u7C7B\u73B0\u91D1\u6D41\u83DC\u7684\u914D\u65B9/\u4EFD\u91CF/\u642D\u552E\u3002"
    );
  }
  if (hasSignal(experts, "price_value_gap") && hasSignal(experts, "rev_down")) {
    const ticketLed = (_a = finance == null ? void 0 : finance.analyses.find((a) => a.metricId === "rev_decomposition")) == null ? void 0 : _a.value.includes("\u5BA2\u5355\u4E3B\u5BFC");
    if (ticketLed) {
      chains.push("\u4E3B\u56E0\u94FE\uFF1A\u5BA2\u5355\u627F\u538B\u4E0E\u4EF7\u683C\u4E0D\u503C\u611F\u540C\u73B0\uFF0C\u8C03\u4EF7\u9700\u8C28\u614E\uFF0C\u4F18\u5148\u8C03\u7ED3\u6784\u4E0E\u9884\u671F\u7BA1\u7406\u3002");
    }
  }
  if (hasSignal(experts, "narrow_a")) {
    chains.push(
      `\u7ED3\u6784\u98CE\u9669\uFF1A${signalStatement(experts, "narrow_a")} \u2014 A \u7C7B\u8FC7\u7A84\u4F1A\u653E\u5927\u65AD\u8D27\u4E0E\u51FA\u54C1\u6CE2\u52A8\u5BF9\u8425\u6536\u7684\u51B2\u51FB\u3002`
    );
  }
  const financeOk = finance && !finance.refused && (finance.level === "healthy" || finance.level === "observe");
  const experience = experts.find((e) => e.role === "experience");
  if (financeOk && experience && !experience.refused && (experience.level === "risk" || experience.level === "critical")) {
    chains.push(
      "\u4E89\u8BAE\uFF1A\u8D22\u52A1\u8BFB\u6570\u5C1A\u53EF\uFF0C\u4F46\u4F53\u9A8C\u4FA7\u5DF2\u504F\u98CE\u9669\u2014\u2014\u77ED\u671F\u8D26\u597D\u770B\u53EF\u80FD\u63A9\u76D6\u5BA2\u8BC9/\u7B49\u5F85\u5BF9\u590D\u8D2D\u7684\u6EDE\u540E\u635F\u4F24\uFF0C\u9700\u5BF9\u7167\u9AD8\u5CF0\u65E5\u660E\u7EC6\u9A8C\u8BC1\u3002"
    );
  }
  if (hasSignal(experts, "traffic_down") && !hasSignal(experts, "rev_down")) {
    chains.push(
      "\u4E89\u8BAE\uFF1A\u5BA2\u6D41\u4E0B\u884C\u4F46\u8425\u6536\u672A\u540C\u5411\u627F\u538B\u2014\u2014\u53EF\u80FD\u9760\u5BA2\u5355\u6491\u76D8\uFF1B\u9700\u9A8C\u8BC1\u662F\u5426\u53EF\u6301\u7EED\uFF0C\u907F\u514D\u865A\u5047\u5B89\u5168\u611F\u3002"
    );
  }
  if (hasSignal(experts, "meal_concentration")) {
    chains.push(
      `\u7ED3\u6784\u98CE\u9669\uFF1A${signalStatement(experts, "meal_concentration")} \u2014 \u5355\u9910\u6BB5\u625B\u4E3B\u8425\u6536\uFF0C\u4E00\u65E6\u8BE5\u573A\u6B21\u5BA2\u6D41\u6216\u4F53\u9A8C\u6CE2\u52A8\uFF0C\u6574\u4F53\u8425\u6536\u4F1A\u88AB\u653E\u5927\u51B2\u51FB\u3002\u5EFA\u8BAE\u4F18\u5148\u6276\u6301\u7B2C\u4E8C\u9910\u6BB5\u3002`
    );
  }
  const buzzVsTraffic = marketing == null ? void 0 : marketing.analyses.find((a) => a.metricId === "buzz_vs_traffic");
  if ((_b = buzzVsTraffic == null ? void 0 : buzzVsTraffic.note) == null ? void 0 : _b.includes("\u865A\u706B")) {
    chains.push(
      `\u4E3B\u56E0\u94FE\uFF1A\u8425\u9500\u300C\u865A\u706B\u300D\u2014\u2014${buzzVsTraffic.value}\u3002\u5185\u5BB9\u58F0\u91CF\u672A\u8F6C\u5316\u4E3A\u5230\u5E97\u5BA2\u6D41\uFF0C\u6269\u6295\u653E\u524D\u9700\u5148\u8865\u5230\u5E97\u8F6C\u5316\u95ED\u73AF\u3002`
    );
  }
  const financeGap = hasSignal(experts, "finance_data_gap");
  const productGap = hasSignal(experts, "product_data_gap");
  if (financeGap || productGap) {
    const gapWhich = [financeGap ? "\u8D22\u52A1" : null, productGap ? "\u4EA7\u54C1" : null].filter(Boolean).join("\u4E0E");
    chains.push(
      `\u6570\u636E\u7EA7\u8054\uFF1A${gapWhich}\u786C\u95E8\u69DB\u7F3A\u5931\u4F1A\u8FDE\u5E26\u524A\u5F31\u8425\u9500/\u4F53\u9A8C\u5224\u65AD\u7684\u7ECF\u8425\u951A\u70B9\uFF08\u65E0\u6CD5\u5BF9\u7167\u771F\u5B9E\u8425\u6536/\u7ED3\u6784\uFF09\u3002\u5EFA\u8BAE\u5148\u8865\u9F50\u65E5\xD7\u9910\u6BB5\u4E0E\u83DC\u54C1\u9500\u552E\uFF0C\u518D\u590D\u6838\u5176\u4F59\u5E2D\u4F4D\u7ED3\u8BBA\u3002`
    );
  }
  const competitionSignal = signals == null ? void 0 : signals.find(
    (s) => s.category === "competition" || s.type === "COMPETITION"
  );
  if (competitionSignal && hasSignal(experts, "traffic_down")) {
    chains.push(
      `\u4E3B\u56E0\u94FE\uFF1A\u5BA2\u6D41\u4E0B\u884C\u4E0E\u7ADE\u4E89\u4FE1\u53F7\u5E76\u73B0\uFF08${competitionSignal.title}\uFF09\u2014\u2014\u9700\u8981\u5206\u6E05\u662F\u5E02\u573A\u5206\u6D41\u8FD8\u662F\u81EA\u8EAB\u4F53\u9A8C/\u5B9A\u4F4D\u95EE\u9898\uFF0C\u907F\u514D\u8BEF\u5224\u4E3A\u81EA\u8EAB\u72EC\u6709\u95EE\u9898\u3002`
    );
  }
  if (!chains.length) {
    const active = experts.filter((e) => !e.refused);
    if (active.every((e) => e.level === "healthy" || e.level === "observe")) {
      chains.push("\u4EA4\u53C9\u9A8C\u8BC1\uFF1A\u8D22\u52A1/\u4EA7\u54C1/\u8425\u9500/\u4F53\u9A8C\u6682\u672A\u5F62\u6210\u540C\u5411\u98CE\u9669\u94FE\uFF1B\u7EF4\u6301\u6708\u5EA6\u6307\u6807\u590D\u68C0\u3002");
    } else {
      chains.push("\u4EA4\u53C9\u9A8C\u8BC1\uFF1A\u5404\u5E2D\u6709\u5C40\u90E8\u8B66\u793A\uFF0C\u4F46\u5C1A\u672A\u6536\u655B\u4E3A\u5355\u4E00\u4E3B\u56E0\uFF1B\u6309\u884C\u52A8\u4F18\u5148\u7EA7\u5E76\u884C\u9A8C\u8BC1\u3002");
    }
  }
  const lowConf = experts.filter((e) => !e.refused && e.confidence < 0.45);
  if (lowConf.length) {
    chains.push(
      `\u7F6E\u4FE1\u63D0\u793A\uFF1A${lowConf.map((e) => `${e.title} ${(e.confidence * 100).toFixed(0)}%`).join("\u3001")} \u6837\u672C\u504F\u5F31\uFF0C\u7ED3\u8BBA\u5B9C\u964D\u6743\u3002`
    );
  }
  return chains;
}
function buildUnifiedFindings(experts, signals) {
  const refused = experts.filter((e) => e.refused);
  const causal = synthesizeCausalFindings(experts, signals);
  const active = experts.filter((e) => !e.refused);
  const keyMetrics = [];
  for (const expert of active) {
    for (const cell of expert.analyses.filter((a) => a.metricId).slice(0, 2)) {
      keyMetrics.push(
        `[${expert.title}] ${cell.label}\uFF1A${cell.value}${cell.metricId ? `\uFF08#${cell.metricId}\uFF09` : ""}`
      );
    }
  }
  return {
    summary: causal[0] || "\u7EFC\u5408\u4F53\u68C0\u5DF2\u5B8C\u6210\u4EA4\u53C9\u9A8C\u8BC1\u3002",
    bullets: [
      ...causal,
      ...keyMetrics.slice(0, 6),
      ...refused.length ? refused.map((e) => `${e.title}\u62D2\u7B7E\uFF1A${e.refuseReason || "\u6570\u636E\u4E0D\u8DB3"}`) : []
    ]
  };
}
function buildUnifiedConclusion(input) {
  const causal = synthesizeCausalFindings(input.experts, input.signals);
  const counsel = Array.from(
    new Set(
      input.experts.filter((e) => !e.refused).sort((a, b) => b.confidence - a.confidence).flatMap((e) => e.counsel.slice(0, 1))
    )
  ).slice(0, 4);
  const avgConf = input.experts.filter((e) => !e.refused).reduce((s, e) => s + e.confidence, 0) / Math.max(1, input.experts.filter((e) => !e.refused).length);
  const summary = input.alertExperts.length ? `\u6C47\u603B\u7ED3\u8BBA\uFF08${levelLabel(input.overallLevel)} / \u7F6E\u4FE1\u7EA6 ${(avgConf * 100).toFixed(0)}%\uFF09\uFF1A${causal[0]}` : `\u6C47\u603B\u7ED3\u8BBA\uFF08${levelLabel(input.overallLevel)} / \u7F6E\u4FE1\u7EA6 ${(avgConf * 100).toFixed(0)}%\uFF09\uFF1A\u672A\u5F62\u6210\u540C\u5411\u98CE\u9669\u94FE\uFF0C\u7EF4\u6301\u590D\u68C0\u8282\u594F`;
  return {
    summary,
    bullets: [
      `\u7EFC\u5408\u5224\u5B9A\uFF1A${levelLabel(input.overallLevel)}`,
      input.refused.length ? `\u6570\u636E\u9650\u5236\uFF1A${input.refused.map((e) => e.title).join("\u3001")} \u672A\u5B8C\u6574\u53C2\u5BA1` : "\u56DB\u5E2D\u6570\u636E\u6761\u4EF6\u6EE1\u8DB3\u6216\u4EC5\u90E8\u5206\u964D\u6743",
      ...causal.slice(0, 2),
      input.customerRisk ? `\u987E\u5BA2\u98CE\u9669\u5BF9\u7167\uFF1A${input.customerRisk}` : "\u987E\u5BA2\u98CE\u9669\u5BF9\u7167\uFF1A\u6837\u672C\u6709\u9650",
      ...counsel.map((c) => `\u4E0B\u4E00\u6B65\uFF1A${c}`)
    ]
  };
}
function buildConsultationReport(input) {
  var _a, _b, _c, _d, _e, _f, _g;
  const facts = input.request.facts;
  const evidence = input.request.evidence || [];
  const readiness = assessDataReadiness({
    facts,
    evidenceCount: evidence.length,
    context: {
      brand: ((_a = input.restaurantContext) == null ? void 0 : _a.brand) || input.request.restaurantContext.brandName,
      city: input.request.restaurantContext.city,
      category: input.request.restaurantContext.category
    }
  });
  const evolution = input.evolution;
  const evolutionNote = evolution && evolution.verifiedCount > 0 ? `${evolution.summary}${evolution.topLessons[0] ? `\uFF1B\u8FD1\u671F\u6559\u8BAD\uFF1A${evolution.topLessons[0]}` : ""}` : "\u5C1A\u65E0\u8DB3\u591F\u56DE\u586B\uFF0C\u672C\u8F6E\u6309\u901A\u7528\u6A21\u5F0F\u4F1A\u5BA1\uFF1B\u56DE\u586B\u7ED3\u679C\u540E\u5C06\u5F62\u6210\u95E8\u5E97 DNA\u3002";
  const category = input.request.restaurantContext.category;
  const experts = [
    toOpinion(runFinanceOfficer({ facts })),
    toOpinion(runProductOfficer({ facts, evidence, category })),
    toOpinion(
      runMarketingOfficer({
        facts,
        evidence,
        signals: input.signals,
        category
      })
    ),
    toOpinion(runExperienceOfficer({ facts, evidence }))
  ];
  const overallLevel = experts.reduce(
    (acc, expert) => worse2(acc, expert.level),
    "healthy"
  );
  const restaurantName = ((_b = input.restaurantContext) == null ? void 0 : _b.brand) || input.request.restaurantContext.brandName || input.request.restaurantContext.storeName || "\u672A\u547D\u540D\u95E8\u5E97";
  const scorecard = [];
  for (const axis of ((_c = input.exam) == null ? void 0 : _c.axes) || []) {
    for (const metric2 of axis.metrics.filter((m) => m.source !== "missing").slice(0, 4)) {
      scorecard.push({
        domain: axis.title,
        item: metric2.label,
        reading: metric2.reading,
        level: axis.level,
        owner: ownerForAxis(axis.axis)
      });
    }
  }
  scorecard.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);
  const refused = experts.filter((e) => e.refused);
  const alertExperts = experts.filter(
    (e) => e.level === "risk" || e.level === "attention" || e.level === "critical"
  );
  const unified = buildUnifiedFindings(experts, input.signals);
  const conclusion = buildUnifiedConclusion({
    overallLevel,
    experts,
    alertExperts,
    refused,
    customerRisk: (_d = input.customerLens) == null ? void 0 : _d.biggestRisk,
    signals: input.signals
  });
  const causalForAction = synthesizeCausalFindings(experts, input.signals).filter(
    (line) => line.startsWith("\u4E3B\u56E0\u94FE") || line.startsWith("\u7ED3\u6784\u98CE\u9669")
  );
  const dnaPriorities = (evolution == null ? void 0 : evolution.themeWeights.filter((t) => t.weight >= 1.08 || t.confirmed >= 1).slice(0, 2).map((t) => {
    const lesson = evolution.topLessons.find(
      (l) => new RegExp(t.theme === "wait" ? "\u7B49|\u670D\u52A1|\u9AD8\u5CF0" : t.theme, "i").test(l)
    );
    return `DNA \u52A0\u6743\uFF08${t.theme}\xD7${t.weight.toFixed(2)}\uFF09\uFF1A${lesson || `\u6301\u7EED\u9A8C\u8BC1\u300C${t.theme}\u300D\u4E3B\u9898\u5047\u8BBE`}`;
  })) || [];
  const priorities = Array.from(
    /* @__PURE__ */ new Set([
      ...dnaPriorities,
      ...causalForAction.map((line) => `\u9A8C\u8BC1/\u5904\u7F6E\uFF1A${line.replace(/^主因链：|^结构风险：/, "")}`),
      ...experts.filter((e) => !e.refused).sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.confidence - a.confidence).flatMap((e) => {
        var _a2;
        const metricHint = (_a2 = e.analyses.find((a) => a.metricId)) == null ? void 0 : _a2.metricId;
        return e.counsel.slice(0, 1).map((c) => metricHint ? `${c}\uFF08\u76EF #${metricHint}\uFF09` : c);
      })
    ])
  ).slice(0, 6);
  const openQuestions = [
    ...readiness.hardMissing.map((f) => `\u786C\u95E8\u69DB\u7F3A\u5931 \xB7 ${f.label}\uFF1A${f.why}`),
    ...input.gaps.filter((g) => g.severity !== "low").slice(0, 6).map((g) => `${g.field}\uFF1A${g.reason}`),
    ...readiness.strongMissing.slice(0, 4).map((f) => `\u5EFA\u8BAE\u8865\u9F50 \xB7 ${f.label}\uFF1A${f.why}`)
  ].slice(0, 10);
  const modules = [
    {
      id: "cover",
      no: "01",
      title: "\u62A5\u544A\u5C01\u9762",
      level: overallLevel,
      summary: `${restaurantName} \xB7 \u7EFC\u5408\u5224\u5B9A\u300C${levelLabel(overallLevel)}\u300D`,
      bullets: [
        `\u51FA\u5177\u65F6\u95F4\uFF1A${new Date(input.asOf || Date.now()).toLocaleString()}`,
        "\u4F1A\u5BA1\u673A\u5236\uFF1A\u8D22\u52A1\u5B98 / \u4EA7\u54C1\u5B98 / \u8425\u9500\u5B98 / \u4F53\u9A8C\u5B98 \u8BA8\u8BBA\u540E\u6C47\u603B\u6210\u4E00\u4EFD\u7ED3\u8BBA",
        readiness.summary,
        evolution && evolution.verifiedCount > 0 ? `\u95E8\u5E97 DNA\uFF1A${stageLabel(evolution.stage)} \xB7 \u6210\u719F\u5EA6 ${evolution.maturityScore}` : "\u95E8\u5E97 DNA\uFF1A\u79CD\u5B50\u671F\uFF08\u7B49\u5F85\u5B66\u4E60\u56DE\u586B\uFF09"
      ]
    },
    {
      id: "evolution",
      no: "01b",
      title: "\u5B66\u4E60\u8FDB\u5316\u5F71\u54CD",
      level: evolution && evolution.stage !== "seed" ? "observe" : "healthy",
      summary: evolutionNote,
      bullets: evolution && evolution.verifiedCount > 0 ? [
        `\u5DF2\u9A8C\u8BC1 ${evolution.verifiedCount} \u6761 \xB7 \u786E\u8BA4 ${evolution.confirmedCount} / \u5426\u5B9A ${evolution.rejectedCount}`,
        ...evolution.themeWeights.slice(0, 3).map(
          (t) => `\u4E3B\u9898\u300C${t.theme}\u300D\u6743\u91CD \xD7${t.weight.toFixed(2)}\uFF08\u786E\u8BA4 ${t.confirmed} / \u5426\u5B9A ${t.rejected}\uFF09`
        ),
        ...evolution.hypothesisPriors.slice(0, 2).map(
          (p) => `\u5148\u9A8C\u300C${p.statement.slice(0, 28)}${p.statement.length > 28 ? "\u2026" : ""}\u300D\u0394${p.priorDelta >= 0 ? "+" : ""}${p.priorDelta.toFixed(2)}`
        )
      ] : ["\u56DE\u586B\u300C\u6210\u7ACB/\u4E0D\u6210\u7ACB\u300D\u540E\uFF0C\u4E0B\u4E00\u8F6E\u5047\u8BBE\u6392\u5E8F\u4E0E\u884C\u52A8\u4F18\u5148\u7EA7\u5C06\u81EA\u52A8\u52A0\u6743"]
    },
    {
      id: "data_readiness",
      no: "02",
      title: "\u6570\u636E\u91C7\u96C6\u4E0E\u5C31\u7EEA\u5EA6",
      level: readiness.hardReady ? "observe" : "critical",
      summary: readiness.summary,
      bullets: [
        `\u5C31\u7EEA\u5206\uFF1A${readiness.score}%`,
        readiness.hardMissing.length ? `\u786C\u95E8\u69DB\u7F3A\u5931\uFF1A${readiness.hardMissing.map((f) => f.label).join("\u3001")}` : "\u786C\u95E8\u69DB\u5DF2\u9F50\uFF1A\u65E5\xD7\u9910\u6BB5\u3001\u83DC\u54C1\u9500\u552E\u3001\u83DC\u5355\u7B49\u53EF\u652F\u6491\u4F1A\u5BA1",
        readiness.strongMissing.length ? `\u5F3A\u5EFA\u8BAE\u8865\u9F50\uFF1A${readiness.strongMissing.slice(0, 6).map((f) => f.label).join("\u3001")}` : "\u5F3A\u5EFA\u8BAE\u9879\u8F83\u5B8C\u6574\uFF0C\u5206\u6790\u6DF1\u5EA6\u53EF\u7528"
      ]
    },
    {
      id: "findings",
      no: "03",
      title: "\u7EFC\u5408\u53D1\u73B0",
      level: overallLevel,
      summary: unified.summary,
      bullets: unified.bullets.slice(0, 10)
    },
    {
      id: "scorecard",
      no: "04",
      title: "\u4F53\u68C0\u7ED3\u679C\u8868",
      summary: ((_e = input.exam) == null ? void 0 : _e.summary) || "\u7ECF\u8425 / \u4F53\u9A8C / \u8FD0\u8425 \u5173\u952E\u6307\u6807\u5BF9\u7167",
      bullets: scorecard.slice(0, 8).map(
        (row) => `${row.domain} \xB7 ${row.item}\uFF1A${row.reading}\uFF08${levelLabel(row.level)}\uFF09`
      ),
      tables: [
        {
          headers: ["\u57DF", "\u6307\u6807", "\u8BFB\u6570", "\u7B49\u7EA7"],
          rows: scorecard.slice(0, 12).map((row) => [row.domain, row.item, row.reading, levelLabel(row.level)])
        }
      ]
    },
    {
      id: "conclusion",
      no: "05",
      title: "\u6C47\u603B\u7ED3\u8BBA",
      level: overallLevel,
      summary: conclusion.summary,
      bullets: conclusion.bullets
    },
    {
      id: "action_plan",
      no: "06",
      title: "\u884C\u52A8\u4F18\u5148\u7EA7",
      summary: "\u7531\u4F1A\u5BA1\u8BA8\u8BBA\u6536\u655B\u540E\u7684\u7EDF\u4E00\u4E0B\u4E00\u6B65",
      bullets: priorities.length ? priorities : ["\u7EF4\u6301\u6708\u5EA6\u590D\u68C0\uFF1A\u65E5\u660E\u7EC6\u3001\u83DC\u54C1\u9500\u552E\u4E0E\u4F53\u9A8C\u6837\u672C"]
    },
    {
      id: "open_issues",
      no: "07",
      title: "\u5F85\u8865\u6570\u636E\u4E0E\u672A\u51B3\u95EE\u9898",
      summary: openQuestions.length ? "\u4E0B\u5217\u95EE\u9898\u4E0D\u8865\u9F50\uFF0C\u4F1A\u6301\u7EED\u524A\u5F31\u62A5\u544A\u53EF\u4FE1\u5EA6" : "\u6682\u65E0\u9AD8\u4F18\u5148\u7EA7\u7F3A\u53E3",
      bullets: openQuestions.length ? openQuestions : ["\u5EFA\u8BAE\u4E0B\u4E2A\u5468\u671F\u7EE7\u7EED\u8FFD\u52A0\u65E5\u660E\u7EC6\u4E0E\u83DC\u54C1\u9500\u552E\u884C\u6570"]
    },
    {
      id: "discussion",
      no: "\u9644",
      title: "\u4F1A\u5BA1\u8BA8\u8BBA\u8BB0\u5F55\uFF08\u5404\u65B9\u89C2\u70B9\uFF09",
      summary: "\u4EE5\u4E0B\u4E0D\u4F5C\u4E3A\u5206\u62A5\u544A\uFF0C\u4EC5\u4FDD\u7559\u4F1A\u8BAE\u4E2D\u5404\u65B9\u7ACB\u573A\uFF0C\u4F9B\u8FFD\u6EAF",
      bullets: experts.map((e) => {
        const stance = e.refused ? `\u62D2\u7B7E\uFF1A${e.refuseReason || "\u6570\u636E\u4E0D\u8DB3"}` : e.verdict;
        const risk = e.risks[0] ? `\uFF1B\u5173\u5207\uFF1A${e.risks[0]}` : "";
        return `${e.title}\uFF08${e.seat}\uFF09\uFF1A${stance}${risk}`;
      })
    }
  ];
  const finalPriorities = priorities.length ? priorities : ["\u7EF4\u6301\u6708\u5EA6\u590D\u68C0\uFF1A\u65E5\u660E\u7EC6\u3001\u83DC\u54C1\u9500\u552E\u4E0E\u4F53\u9A8C\u6837\u672C"];
  const bossBrief = buildBossBrief({
    restaurantName,
    overallLevel,
    consensus: conclusion.summary,
    priorities: finalPriorities,
    causalLines: causalForAction
  });
  return {
    title: "\u9910\u5385\u7ECF\u8425\u4F53\u68C0 \xB7 \u4F1A\u5BA1\u54A8\u8BE2\u62A5\u544A",
    subtitle: "\u4E00\u4EFD\u6C47\u603B\u7ED3\u8BBA \xB7 \u56DB\u5B98\u8BA8\u8BBA\u7EAA\u8981\u9644\u540E",
    asOf: input.asOf || (/* @__PURE__ */ new Date()).toISOString(),
    restaurantName,
    overallLevel,
    overallVerdict: `\u7EFC\u5408\u5224\u5B9A\uFF1A${levelLabel(overallLevel)}`,
    dataReadinessScore: readiness.score,
    executiveSummary: [
      bossBrief,
      `${restaurantName} \u5B8C\u6210\u672C\u6B21\u7ECF\u8425\u4F53\u68C0\uFF0C\u7EFC\u5408\u5224\u5B9A\u4E3A\u300C${levelLabel(overallLevel)}\u300D\u3002`,
      readiness.summary,
      evolutionNote,
      conclusion.summary,
      ((_f = input.exam) == null ? void 0 : _f.summary) || ((_g = input.health) == null ? void 0 : _g.snapshot.summary) || "\u5DF2\u5F62\u6210\u7EDF\u4E00\u4F1A\u5BA1\u7ED3\u8BBA\u3002"
    ],
    modules,
    scorecard: scorecard.slice(0, 12),
    experts,
    consensus: conclusion.summary,
    priorities: finalPriorities,
    openQuestions: openQuestions.length ? openQuestions : ["\u6682\u65E0\u9AD8\u4F18\u5148\u7EA7\u7F3A\u53E3\uFF1B\u5EFA\u8BAE\u4E0B\u6708\u7EE7\u7EED\u5BFC\u5165\u65E5\u660E\u7EC6\u4E0E\u9500\u552E\u7ED3\u6784\u3002"],
    disclaimer: "\u672C\u62A5\u544A\u6B63\u6587\u4E3A\u56DB\u5B98\u4F1A\u5BA1\u540E\u7684\u6C47\u603B\u7ED3\u8BBA\uFF1B\u5404\u65B9\u89C2\u70B9\u4EC5\u89C1\u4E8E\u300C\u4F1A\u5BA1\u8BA8\u8BBA\u8BB0\u5F55\u300D\u3002\u6570\u636E\u8D8A\u7EC6\u7ED3\u8BBA\u8D8A\u7A33\uFF1B\u7F3A\u786C\u95E8\u69DB\u65F6\u76F8\u5173\u5E2D\u4F4D\u62D2\u7B7E\u5E76\u5199\u5165\u8BA8\u8BBA\u7EAA\u8981\u3002\u5C5E\u7ECF\u8425\u54A8\u8BE2\u610F\u89C1\uFF0C\u4E0D\u6784\u6210\u8D22\u52A1\u5BA1\u8BA1\u6216\u6295\u8D44\u5EFA\u8BAE\u3002\u5B66\u4E60\u56DE\u586B\u4F1A\u6C89\u6DC0\u4E3A\u95E8\u5E97 DNA \u5E76\u53CD\u54FA\u4E0B\u4E00\u8F6E\u3002",
    evolutionNote,
    bossBrief
  };
}

// packages/m-ops-diag/src/reasoning/helpers.ts
var WAIT_RE = getWaitRe();
var PRODUCT_RE = getProductRe();
var ENV_RE = getEnvRe();
var COMPETITION_RE = getCompetitionRe();
var GROWTH_RE = getGrowthRe();
function clip(s, n) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}\u2026`;
}
function levelScore(level) {
  switch (level) {
    case "healthy":
      return 0;
    case "observe":
      return 1;
    case "attention":
      return 2;
    case "risk":
      return 3;
    case "critical":
      return 4;
  }
}
function compareHealthLevels(previous, current) {
  if (!previous) return "flat";
  const diff = levelScore(current) - levelScore(previous);
  return diff > 0 ? "down" : diff < 0 ? "up" : "flat";
}
function severityFromState(level, magnitude) {
  if (level === "critical") return "CRITICAL";
  if (level === "risk" || magnitude >= 2) return "HIGH";
  if (level === "attention" || magnitude >= 1) return "MEDIUM";
  return "LOW";
}
function focusFromDimension(dimension) {
  switch (dimension) {
    case "product":
      return "product";
    case "competition":
      return "competition";
    case "growth":
      return "traffic";
    case "operation":
      return "cost";
    case "service":
    case "customer":
    default:
      return "service";
  }
}
function signalTypeFromDimension(dimension) {
  switch (dimension) {
    case "product":
      return "PRODUCT";
    case "service":
      return "SERVICE";
    case "operation":
      return "OPERATION";
    case "competition":
      return "COMPETITION";
    case "growth":
      return "GROWTH";
    case "customer":
    default:
      return "CUSTOMER";
  }
}
function titleFromDimension(dimension, direction) {
  const directionText = direction === "down" ? "\u4E0B\u964D" : direction === "up" ? "\u6539\u5584" : "\u6CE2\u52A8";
  switch (dimension) {
    case "customer":
      return `\u987E\u5BA2\u5065\u5EB7${directionText}`;
    case "product":
      return `\u4EA7\u54C1\u5065\u5EB7${directionText}`;
    case "service":
      return `\u670D\u52A1\u4F53\u9A8C${directionText}`;
    case "operation":
      return `\u8FD0\u8425\u6548\u7387${directionText}`;
    case "competition":
      return "\u7ADE\u4E89\u538B\u529B\u53D8\u5316";
    case "growth":
      return direction === "up" ? "\u589E\u957F\u673A\u4F1A\u589E\u5F3A" : "\u589E\u957F\u673A\u4F1A\u6CE2\u52A8";
  }
}
function decisionTopicFromDimension(dimension) {
  switch (dimension) {
    case "customer":
      return "\u987E\u5BA2\u8BA4\u77E5\u53D8\u5316\u662F\u5426\u9700\u8981\u5904\u7406";
    case "product":
      return "\u662F\u5426\u9700\u8981\u8C03\u6574\u4EA7\u54C1\u7ED3\u6784";
    case "service":
      return "\u662F\u5426\u4F18\u5316\u670D\u52A1\u6D41\u7A0B";
    case "operation":
      return "\u662F\u5426\u68C0\u67E5\u9AD8\u5CF0\u627F\u8F7D\u80FD\u529B";
    case "competition":
      return "\u662F\u5426\u91CD\u65B0\u5224\u65AD\u7ADE\u4E89\u4F4D\u7F6E";
    case "growth":
      return "\u662F\u5426\u6293\u4F4F\u65B0\u7684\u589E\u957F\u673A\u4F1A";
  }
}
function impactFromDimension(dimension) {
  switch (dimension) {
    case "customer":
      return "\u53EF\u80FD\u5F71\u54CD\u590D\u8D2D\u4E0E\u987E\u5BA2\u53E3\u7891";
    case "product":
      return "\u53EF\u80FD\u524A\u5F31\u62DB\u724C\u8BB0\u5FC6\u4E0E\u83DC\u5355\u5438\u5F15\u529B";
    case "service":
      return "\u53EF\u80FD\u6269\u5927\u5DEE\u8BC4\u5E76\u5F71\u54CD\u665A\u9910\u9AD8\u5CF0\u8F6C\u5316";
    case "operation":
      return "\u53EF\u80FD\u9650\u5236\u9AD8\u5CF0\u4EA7\u80FD\u4E0E\u8425\u4E1A\u989D\u627F\u63A5";
    case "competition":
      return "\u53EF\u80FD\u524A\u5F31\u4EF7\u683C\u5E26\u4E0E\u5468\u8FB9\u7ADE\u4E89\u4F4D\u7F6E";
    case "growth":
      return "\u53EF\u80FD\u5F71\u54CD\u5185\u5BB9\u4F20\u64AD\u4E0E\u65B0\u5BA2\u589E\u957F\u627F\u63A5";
  }
}
function findPrevLevel(snapshot, dimension) {
  var _a;
  return (_a = snapshot == null ? void 0 : snapshot.dimensions.find((item) => item.dimension === dimension)) == null ? void 0 : _a.level;
}
function makeDeltaSummary(args) {
  if (!args.previousLevel) {
    return `\u9996\u6B21\u5EFA\u6863\uFF1A${args.observed}`;
  }
  if (args.previousLevel === args.currentLevel) {
    return `${args.metric}\u7EF4\u6301${args.currentLevel}\uFF0C${args.observed}`;
  }
  return `${args.metric}\u7531 ${args.previousLevel} \u53D8\u4E3A ${args.currentLevel}\uFF0C${args.observed}`;
}
function sourceTypeFromEvidence(source) {
  const normalized = source.toLowerCase();
  if (normalized.includes("dianping") || source.includes("\u5927\u4F17\u70B9\u8BC4")) return "DIANPING";
  if (normalized.includes("xiaohongshu") || source.includes("\u5C0F\u7EA2\u4E66")) return "XHS";
  if (normalized.includes("douyin") || source.includes("\u6296\u97F3")) return "DOUYIN";
  if (normalized.includes("map") || source.includes("\u5730\u56FE")) return "MAP";
  if (normalized.includes("pos")) return "POS";
  return "REVIEW";
}
function calcImpactScore(input) {
  return Math.round(
    input.severity * input.affectedUsers * input.trendVelocity * Math.max(1, Math.round(input.confidence * 10)) / Math.max(1, input.solveCost)
  );
}

// packages/m-ops-diag/src/engines/competition-engine.ts
function analyzeCompetitionIntelligence({
  evidence
}) {
  const market = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "competition", item.theme) || item.theme === "competition"
  );
  const level = market.length >= 3 ? "attention" : market.length >= 1 ? "observe" : "healthy";
  return {
    dimension: "competition",
    level,
    finding: market.length > 0 ? "\u5468\u8FB9\u7ADE\u4E89\u73AF\u5883\u51FA\u73B0\u65B0\u7EBF\u7D22" : "\u5F53\u524D\u6CA1\u6709\u8DB3\u591F\u8BC1\u636E\u8BC1\u660E\u7ADE\u4E89\u4F4D\u7F6E\u6B63\u5728\u53D8\u5316",
    meaning: market.length > 0 ? "\u4EF7\u683C\u5E26\u4E0E\u533A\u57DF\u9009\u62E9\u6743\u53EF\u80FD\u6B63\u5728\u91CD\u6392" : "\u7ADE\u4E89\u7EF4\u5EA6\u5F53\u524D\u66F4\u591A\u662F\u5F85\u91C7\u96C6\u533A\uFF0C\u800C\u975E\u660E\u786E\u95EE\u9898",
    observed: market.length > 0 ? `\u53D1\u73B0 ${market.length} \u6761\u5468\u8FB9\u7ADE\u4E89\u6216\u6D3B\u52A8\u7EBF\u7D22` : "\u6682\u672A\u91C7\u5230\u660E\u786E\u7ADE\u54C1\u53D8\u5316\u8BC1\u636E",
    confidence: market.length > 0 ? Math.min(0.72, 0.3 + market.length * 0.15) : 0.28,
    evidenceIds: market.map((item, index) => item.id || `competition-${index}`),
    watchHint: "\u5730\u56FE\u4E0E\u7ADE\u54C1\u6293\u53D6\u5B8C\u6210\u540E\u518D\u5347\u7EA7\u7ADE\u4E89\u5224\u65AD",
    hypotheses: [
      {
        statement: "\u540C\u4EF7\u683C\u5E26\u7ADE\u4E89\u6B63\u5728\u52A0\u5267\uFF0C\u987E\u5BA2\u4EF7\u683C\u8BA4\u77E5\u53EF\u80FD\u88AB\u91CD\u5199",
        probability: market.length >= 2 ? 0.56 : 0.31,
        supportingEvidence: market.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["\u5BF9\u6BD4\u5468\u8FB9\u65B0\u5E97\u7684\u4EF7\u683C\u3001\u8BC4\u5206\u4E0E\u4E3B\u6253\u573A\u666F\u53D8\u5316"]
      }
    ],
    rawEvidence: market.slice(0, 6)
  };
}

// packages/m-ops-diag/src/engines/customer-engine.ts
function analyzeCustomerIntelligence({
  evidence
}) {
  const negative = evidence.filter((item) => item.sentiment === "negative");
  const positive = evidence.filter((item) => item.sentiment === "positive");
  const neutral = evidence.filter((item) => item.sentiment === "neutral");
  const wait = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "wait", item.theme) || item.theme === "wait"
  );
  const product = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "product", item.theme) || item.theme === "product"
  );
  const env = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "environment", item.theme) || item.theme === "environment"
  );
  const negativeRate = evidence.length ? Math.round(negative.length / evidence.length * 100) : 0;
  const level = negativeRate >= 45 ? "risk" : negativeRate >= 25 ? "attention" : positive.length > 0 ? "healthy" : "observe";
  const observed = negativeRate >= 25 ? `\u987E\u5BA2\u8D1F\u9762\u53CD\u9988\u5360\u6BD4\u7EA6 ${negativeRate}%\uFF0C\u5176\u4E2D\u7B49\u5F85\u4E0E\u670D\u52A1\u7C7B\u62B1\u6028\u6700\u660E\u663E` : `\u987E\u5BA2\u6B63\u5411\u4E0E\u4E2D\u6027\u53CD\u9988\u5360\u4E3B\u5BFC\uFF0C\u5F53\u524D\u6574\u4F53\u8BC4\u4EF7\u4ECD\u7136\u7A33\u5B9A`;
  return {
    dimension: "customer",
    level,
    finding: level === "risk" || level === "attention" ? "\u987E\u5BA2\u8BA4\u53EF\u4EA7\u54C1\uFF0C\u4F46\u670D\u52A1\u4F53\u9A8C\u6B63\u5728\u524A\u5F31\u6574\u4F53\u6EE1\u610F\u5EA6" : "\u987E\u5BA2\u5BF9\u95E8\u5E97\u7684\u57FA\u7840\u5370\u8C61\u4ECD\u7136\u7A33\u5B9A",
    meaning: level === "risk" || level === "attention" ? "\u5982\u679C\u7B49\u5F85\u548C\u670D\u52A1\u62B1\u6028\u7EE7\u7EED\u4E0A\u5347\uFF0C\u590D\u8D2D\u4E0E\u53E3\u7891\u4F1A\u5148\u53D7\u635F" : "\u987E\u5BA2\u8BA4\u77E5\u4FA7\u6682\u672A\u51FA\u73B0\u660E\u663E\u5931\u63A7\u53D8\u5316",
    observed,
    confidence: Math.min(0.9, 0.42 + evidence.length * 0.05),
    evidenceIds: evidence.map((item, index) => item.id || `customer-${index}`).slice(0, 6),
    watchHint: "\u5148\u770B\u987E\u5BA2\u58F0\u97F3\u5899\uFF0C\u518D\u51B3\u5B9A\u662F\u5426\u8FDB\u5165\u670D\u52A1\u8BCA\u65AD",
    hypotheses: [
      {
        statement: "\u987E\u5BA2\u671F\u5F85\u4E0E\u9AD8\u5CF0\u670D\u52A1\u4F53\u9A8C\u4E4B\u95F4\u51FA\u73B0\u843D\u5DEE",
        probability: 0.68,
        supportingEvidence: wait.map((item) => item.id || item.claim).slice(0, 4),
        contradictEvidence: env.concat(product).map((item) => item.id || item.claim).slice(0, 2),
        validationPlan: ["\u590D\u6838\u8FD17\u5929\u8D1F\u5411\u8BC4\u8BBA\u4E2D\u7684\u7B49\u5F85\u4E0E\u670D\u52A1\u573A\u666F\u5360\u6BD4"]
      },
      {
        statement: "\u54C1\u724C\u627F\u8BFA\u504F\u9AD8\uFF0C\u4F53\u9A8C\u843D\u5DEE\u88AB\u653E\u5927",
        probability: 0.24,
        supportingEvidence: env.map((item) => item.id || item.claim).slice(0, 2),
        validationPlan: ["\u5BF9\u6BD4\u5BA3\u4F20\u5173\u952E\u8BCD\u4E0E\u987E\u5BA2\u5B9E\u9645\u8BC4\u4EF7\u5173\u952E\u8BCD\u662F\u5426\u4E00\u81F4"]
      }
    ],
    rawEvidence: negative.concat(positive, neutral).slice(0, 6)
  };
}
function buildCustomerRealityMap(evidence) {
  const likes = evidence.filter((item) => item.sentiment === "positive").slice(0, 3).map((item) => clip(item.claim, 36));
  const hesitates = evidence.filter((item) => item.sentiment === "neutral").slice(0, 3).map((item) => clip(item.claim, 36));
  const leaves = evidence.filter((item) => item.sentiment === "negative").slice(0, 3).map((item) => clip(item.claim, 36));
  return { likes, hesitates, leaves };
}

// packages/m-ops-diag/src/engines/exam-axes.ts
function parseJsonFact2(facts, kind) {
  var _a;
  const raw = (_a = facts == null ? void 0 : facts.find((f) => f.kind === kind)) == null ? void 0 : _a.claim;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function factBand(facts, kind) {
  var _a;
  const claim = (_a = facts == null ? void 0 : facts.find((item) => item.kind === kind)) == null ? void 0 : _a.claim;
  if (!claim) return void 0;
  const parts = claim.split("\uFF1A");
  return (parts[1] || parts[0] || "").trim() || void 0;
}
function trendBand(pctChange) {
  if (pctChange > 3) return "up";
  if (pctChange < -3) return "down";
  return "flat";
}
function profitBand(marginPct) {
  if (marginPct === void 0 || Number.isNaN(marginPct)) return void 0;
  if (marginPct < 0) return "loss";
  if (marginPct < 8) return "tight";
  return "comfortable";
}
function pressureBand(ratioPct) {
  if (ratioPct === void 0 || Number.isNaN(ratioPct)) return void 0;
  if (ratioPct >= 40) return "high";
  if (ratioPct >= 28) return "medium";
  return "low";
}
function bandLevel(band, map, fallback = "observe") {
  if (!band) return fallback;
  return map[band] || fallback;
}
function worstLevel(levels) {
  const rank = {
    healthy: 0,
    observe: 1,
    attention: 2,
    risk: 3,
    critical: 4
  };
  return levels.reduce((worst, item) => rank[item] > rank[worst] ? item : worst, "healthy");
}
function metric(partial) {
  var _a;
  return {
    ...partial,
    confidence: (_a = partial.confidence) != null ? _a : partial.source === "missing" ? 0 : 0.55
  };
}
function themeBucket(evidence, theme) {
  const all = evidence.filter(
    (item) => claimMatchesTheme(item.claim, theme, item.theme) || item.theme === theme
  );
  return {
    all,
    neg: all.filter((item) => item.sentiment === "negative"),
    pos: all.filter((item) => item.sentiment === "positive")
  };
}
function experienceLevel(neg, pos, total) {
  if (total === 0) return "observe";
  if (neg >= 3 || neg >= 2 && neg > pos) return "risk";
  if (neg >= 1) return "attention";
  if (pos >= 2 && neg === 0) return "healthy";
  return "observe";
}
function buildBusinessAxis(facts) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const gaps = [];
  const metrics = [];
  const levels = [];
  const ledgerMonths = Number(((_a = facts == null ? void 0 : facts.find((f) => f.kind === "ledger_months")) == null ? void 0 : _a.claim) || 0);
  const ledgerDays = Number(((_b = facts == null ? void 0 : facts.find((f) => f.kind === "ledger_days")) == null ? void 0 : _b.claim) || 0);
  const ledgerSummary = ((_c = facts == null ? void 0 : facts.find((f) => f.kind === "daily_ops_summary")) == null ? void 0 : _c.claim) || ((_d = facts == null ? void 0 : facts.find((f) => f.kind === "ledger_summary")) == null ? void 0 : _d.claim);
  const dishSalesRows = Number(((_e = facts == null ? void 0 : facts.find((f) => f.kind === "dish_sales_rows")) == null ? void 0 : _e.claim) || 0);
  const dishSalesSummary = (_f = facts == null ? void 0 : facts.find((f) => f.kind === "dish_sales_summary")) == null ? void 0 : _f.claim;
  const menuCount = Number(((_g = facts == null ? void 0 : facts.find((f) => f.kind === "menu_count")) == null ? void 0 : _g.claim) || 0);
  const zoneMix = (_h = facts == null ? void 0 : facts.find((f) => f.kind === "zone_revenue_mix")) == null ? void 0 : _h.claim;
  const mealMix = (_i = facts == null ? void 0 : facts.find((f) => f.kind === "meal_period_mix")) == null ? void 0 : _i.claim;
  if (!ledgerDays || ledgerDays < 7) {
    gaps.push({
      field: "daily_ops",
      reason: "\u7F3A\u5C11\u65E5\xD7\u9910\u6BB5\u660E\u7EC6\uFF08\u65E5\u671F/\u9910\u6BB5/\u6765\u5BA2\u6570/\u4EBA\u5747\u6216\u8425\u6536\uFF09\u3002\u4EC5\u6709\u6708\u6C47\u603B\u65F6\u7ECF\u8425\u5206\u6790\u6CA1\u6709\u4EF7\u503C",
      severity: "high"
    });
    metrics.push(
      metric({
        id: "ledger",
        label: "\u65E5\xD7\u9910\u6BB5\u8D26\u672C",
        reading: "\u672A\u5BFC\u5165\u5408\u683C\u65E5\u660E\u7EC6",
        source: "missing",
        confidence: 0
      })
    );
    return {
      axis: "business",
      title: "\u7ECF\u8425\u4F53\u68C0",
      level: "critical",
      summary: "\u6CA1\u6709\u6BCF\u65E5\xD7\u9910\u6BB5\u7684\u6765\u5BA2\u3001\u4EBA\u5747\u3001\u8425\u6536\uFF08\u53CA\u533A\u57DF\uFF09\u660E\u7EC6\uFF0C\u7ECF\u8425\u5206\u6790\u6CA1\u6709\u4EF7\u503C",
      confidence: 0.05,
      metrics,
      gaps
    };
  }
  metrics.push(
    metric({
      id: "ledger",
      label: "\u65E5\xD7\u9910\u6BB5\u8D26\u672C",
      reading: ledgerSummary || `\u5DF2\u5BFC\u5165 ${ledgerDays} \u4E2A\u8425\u4E1A\u65E5\u660E\u7EC6`,
      band: String(ledgerDays),
      source: "owner_reported",
      confidence: 0.93
    })
  );
  if (mealMix) {
    metrics.push(
      metric({
        id: "meal_periods",
        label: "\u9910\u6BB5\u8986\u76D6",
        reading: mealMix,
        source: "owner_reported",
        confidence: 0.9
      })
    );
  }
  if (zoneMix) {
    metrics.push(
      metric({
        id: "zone_mix",
        label: "\u533A\u57DF\u8D21\u732E",
        reading: zoneMix,
        source: "owner_reported",
        confidence: 0.86
      })
    );
  }
  if (dishSalesRows > 0) {
    metrics.push(
      metric({
        id: "dish_sales",
        label: "\u83DC\u54C1\u9500\u552E\u7ED3\u6784",
        reading: dishSalesSummary || `\u5DF2\u5BFC\u5165 ${dishSalesRows} \u884C\u9500\u552E`,
        band: String(dishSalesRows),
        source: "owner_reported",
        confidence: 0.9
      })
    );
  } else {
    gaps.push({
      field: "dish_sales",
      reason: "\u7F3A\u5C11\u83DC\u54C1\u9500\u552E\u7ED3\u6784\uFF0C\u65E0\u6CD5\u5224\u65AD\u8D21\u732E\u7387\u4E0E\u83DC\u996E\u5360\u6BD4",
      severity: "high"
    });
  }
  if (menuCount > 0) {
    metrics.push(
      metric({
        id: "menu",
        label: "\u83DC\u5355\u4E3B\u6570\u636E",
        reading: `\u5DF2\u5BFC\u5165 ${menuCount} \u4E2A\u54C1\u9879`,
        band: String(menuCount),
        source: "owner_reported",
        confidence: 0.85
      })
    );
  } else {
    gaps.push({
      field: "menu",
      reason: "\u7F3A\u5C11\u83DC\u5355\u4E3B\u6570\u636E",
      severity: "medium"
    });
  }
  if (ledgerMonths > 0) {
    metrics.push(
      metric({
        id: "monthly_rollups",
        label: "\u6708\u5EA6\u6C47\u603B",
        reading: `\u8986\u76D6 ${ledgerMonths} \u4E2A\u6708`,
        band: String(ledgerMonths),
        source: "owner_reported",
        confidence: 0.88
      })
    );
  }
  const daily = parseJsonFact2(facts, "daily_ops_json") || [];
  const dishes = parseJsonFact2(facts, "dish_sales_json") || [];
  const months = daily.length ? aggregateByMonth(daily) : [];
  const pnl = daily.length ? computePnL(daily) : null;
  const meals = daily.length ? mealContributionIndex(daily) : [];
  const zones = daily.length ? zoneContribution(daily) : [];
  const abc = dishes.length >= 8 ? computeDishAbc(dishes) : null;
  const seatsClaim = (_j = facts == null ? void 0 : facts.find((f) => f.kind === "seats")) == null ? void 0 : _j.claim;
  const seatsCount = seatsClaim ? Number(seatsClaim.replace(/[^\d.]/g, "")) : 0;
  let derivedSeatUtilBand;
  if (seatsCount > 0 && daily.length) {
    const days = uniqueDates(daily);
    const avgGuestsPerDay = sumGuests(daily) / Math.max(1, days);
    const capacityPerDay = seatsCount * 2;
    const utilRatio = avgGuestsPerDay / Math.max(1, capacityPerDay);
    derivedSeatUtilBand = utilRatio >= 0.75 ? "high" : utilRatio <= 0.4 ? "low" : "medium";
  }
  let derivedRevBand;
  let derivedTrafficBand;
  let decompReading;
  if (months.length >= 2) {
    const prev = months[months.length - 2];
    const curr = months[months.length - 1];
    const decomp = decomposeRevenueChange({
      revenue0: prev.revenue,
      guests0: prev.guests,
      ticket0: prev.avgTicket,
      revenue1: curr.revenue,
      guests1: curr.guests,
      ticket1: curr.avgTicket
    });
    derivedRevBand = trendBand(decomp.dRevPct);
    derivedTrafficBand = trendBand(
      prev.guests <= 0 ? 0 : (curr.guests - prev.guests) / prev.guests * 100
    );
    decompReading = `${prev.month}\u2192${curr.month} \u8425\u6536 ${formatPct(decomp.dRevPct)}\uFF0C\u9A71\u52A8\uFF1A${driverLabel(decomp.driver)}\uFF08\u5BA2\u5355\u6548\u5E94 ${formatMoney(decomp.ticketEffect)} / \u5BA2\u6D41\u6548\u5E94 ${formatMoney(decomp.guestEffect)}\uFF09`;
    metrics.push(
      metric({
        id: "rev_decomposition",
        label: "\u8425\u6536\u53D8\u52A8\u5206\u89E3",
        reading: decompReading,
        band: decomp.driver,
        source: "derived",
        confidence: 0.9
      })
    );
    levels.push(
      bandLevel(derivedRevBand, { up: "healthy", flat: "observe", down: "attention" })
    );
  }
  if (meals[0]) {
    const top = meals[0];
    const mciLevel = top.revenueShare >= 55 ? "attention" : top.revenueShare >= 40 ? "observe" : "healthy";
    levels.push(mciLevel);
    metrics.push(
      metric({
        id: "meal_mci",
        label: "\u9910\u6BB5\u8D21\u732E\u6307\u6570",
        reading: `\u6700\u5F3A\u573A\u6B21\u300C${top.mealPeriod}\u300D\u4EFD\u989D ${top.revenueShare.toFixed(1)}%\uFF0CMCI ${top.mci.toFixed(2)}`,
        band: top.mealPeriod,
        source: "derived",
        confidence: 0.88
      })
    );
  }
  if (zones[0] && zones[0].zone !== "\u672A\u5206\u533A") {
    metrics.push(
      metric({
        id: "zone_top",
        label: "\u533A\u57DF\u8D21\u732E\u9996\u4F4D",
        reading: `${zones[0].zone} \u5360\u8425\u6536 ${zones[0].revenueShare.toFixed(1)}%\uFF0C\u4EBA\u5747 ${formatMoney(zones[0].avgTicket)}`,
        band: zones[0].zone,
        source: "derived",
        confidence: 0.84
      })
    );
  }
  if (abc) {
    const aAmount = abc.ranked.filter((r) => r.abc === "A").reduce((s, r) => s + r.amount, 0);
    const totalAmount = abc.ranked.reduce((s, r) => s + r.amount, 0) || 1;
    const aShare = aAmount / totalAmount * 100;
    const lowMarginHeroes = abc.ranked.filter(
      (r) => r.abc === "A" && r.quadrant === "cash_cow"
    );
    const contribBand = aShare >= 70 ? "high" : aShare >= 45 ? "medium" : "low";
    const contribLevel = bandLevel(contribBand, {
      high: "healthy",
      medium: "observe",
      low: "attention"
    });
    levels.push(contribLevel);
    if (lowMarginHeroes.length) levels.push("attention");
    metrics.push(
      metric({
        id: "dish_abc",
        label: "\u83DC\u54C1 ABC / \u6BDB\u5229\u8C61\u9650",
        reading: `A \u7C7B\u4EFD\u989D ${aShare.toFixed(1)}%\uFF1B\u9AD8\u6D41\u6C34\u4F4E\u6BDB\u5229 ${lowMarginHeroes.length} \u4E2A`,
        band: contribBand,
        source: "derived",
        confidence: 0.9
      })
    );
  }
  if (pnl) {
    metrics.push(
      metric({
        id: "avg_ticket_derived",
        label: "\u5BA2\u5355\u4EF7\uFF08\u8D26\u672C\uFF09",
        reading: `\u6837\u672C\u4EBA\u5747 ${formatMoney(pnl.revenue / Math.max(1, sumGuests(daily)))} \xB7 \u6BDB\u5229\u7387 ${pnl.hasCost ? formatPct(pnl.marginPct) : "\u6210\u672C\u672A\u9F50"}`,
        band: String(Math.round(pnl.revenue / Math.max(1, sumGuests(daily)))),
        source: "derived",
        confidence: pnl.hasCost ? 0.9 : 0.75
      })
    );
  }
  const derivedProfit = (pnl == null ? void 0 : pnl.hasCost) ? profitBand(pnl.marginPct) : void 0;
  const derivedCost = (pnl == null ? void 0 : pnl.hasCost) ? pressureBand(pnl.costRatioPct) : void 0;
  const derivedExpense = (pnl == null ? void 0 : pnl.hasExpense) ? pressureBand(pnl.expenseRatioPct) : void 0;
  const specs = [
    {
      id: "revenue_trend",
      kind: "revenue_trend",
      label: "\u8425\u6536\u8D8B\u52BF",
      map: { up: "healthy", flat: "observe", down: "attention" },
      reading: (b) => b === "up" ? "\u8425\u6536\u504F\u4E0A\u884C" : b === "down" ? "\u8425\u6536\u504F\u4E0B\u884C" : "\u8425\u6536\u5927\u81F4\u6301\u5E73",
      required: true,
      derived: derivedRevBand
    },
    {
      id: "profit_pressure",
      kind: "profit_pressure",
      label: "\u5229\u6DA6\u538B\u529B",
      map: { comfortable: "healthy", tight: "attention", loss: "risk" },
      reading: (b) => b === "comfortable" ? "\u5229\u6DA6\u5C1A\u53EF" : b === "loss" ? "\u5229\u6DA6\u627F\u538B\u504F\u4E8F" : "\u5229\u6DA6\u504F\u7D27",
      required: true,
      derived: derivedProfit
    },
    {
      id: "cost_pressure",
      kind: "cost_pressure",
      label: "\u6210\u672C\u538B\u529B",
      map: { low: "healthy", medium: "observe", high: "attention" },
      reading: (b) => b === "high" ? "\u6210\u672C\u538B\u529B\u504F\u9AD8" : b === "low" ? "\u6210\u672C\u538B\u529B\u53EF\u63A7" : "\u6210\u672C\u538B\u529B\u4E2D\u7B49",
      required: true,
      derived: derivedCost
    },
    {
      id: "expense_pressure",
      kind: "expense_pressure",
      label: "\u8D39\u7528\u538B\u529B",
      map: { low: "healthy", medium: "observe", high: "attention" },
      reading: (b) => b === "high" ? "\u8D39\u7528\u5F00\u652F\u504F\u91CD" : b === "low" ? "\u8D39\u7528\u76F8\u5BF9\u53EF\u63A7" : "\u8D39\u7528\u538B\u529B\u4E2D\u7B49",
      required: true,
      derived: derivedExpense
    },
    {
      id: "traffic_trend",
      kind: "traffic_trend",
      label: "\u5BA2\u6D41\u589E\u957F",
      map: { up: "healthy", flat: "observe", down: "attention" },
      reading: (b) => b === "up" ? "\u5BA2\u6D41\u504F\u589E\u957F" : b === "down" ? "\u5BA2\u6D41\u504F\u4E0B\u6ED1" : "\u5BA2\u6D41\u5927\u81F4\u6301\u5E73",
      derived: derivedTrafficBand
    },
    {
      id: "seat_utilization",
      kind: "seat_utilization",
      label: "\u9910\u4F4D\u5229\u7528\u7387",
      map: { high: "healthy", medium: "observe", low: "attention" },
      reading: (b) => b === "high" ? "\u9910\u4F4D\u5229\u7528\u7387\u504F\u9AD8" : b === "low" ? "\u9910\u4F4D\u5229\u7528\u7387\u504F\u4F4E" : "\u9910\u4F4D\u5229\u7528\u7387\u4E2D\u7B49",
      derived: derivedSeatUtilBand
    },
    {
      id: "dish_drink_mix",
      kind: "dish_drink_mix",
      label: "\u83DC\u54C1/\u996E\u54C1\u8D21\u732E",
      map: { food_heavy: "observe", balanced: "healthy", drink_heavy: "observe" },
      reading: (b) => b === "food_heavy" ? "\u8D21\u732E\u66F4\u504F\u83DC\u54C1" : b === "drink_heavy" ? "\u8D21\u732E\u66F4\u504F\u996E\u54C1" : "\u83DC\u996E\u8D21\u732E\u76F8\u5BF9\u5747\u8861",
      derived: abc ? abc.drinkSharePct >= 60 ? "drink_heavy" : abc.drinkSharePct <= 20 ? "food_heavy" : "balanced" : void 0
    },
    {
      id: "contribution_sense",
      kind: "contribution_sense",
      label: "\u7ED3\u6784\u8D21\u732E\u611F",
      map: { high: "healthy", medium: "observe", low: "attention" },
      reading: (b) => b === "high" ? "\u4E3B\u529B\u54C1\u8D21\u732E\u6E05\u6670" : b === "low" ? "\u8D21\u732E\u7ED3\u6784\u504F\u6563" : "\u8D21\u732E\u7ED3\u6784\u4E00\u822C",
      derived: abc ? (() => {
        const aAmount = abc.ranked.filter((r) => r.abc === "A").reduce((s, r) => s + r.amount, 0);
        const totalAmount = abc.ranked.reduce((s, r) => s + r.amount, 0) || 1;
        const aShare = aAmount / totalAmount * 100;
        return aShare >= 70 ? "high" : aShare >= 45 ? "medium" : "low";
      })() : void 0
    }
  ];
  for (const spec of specs) {
    const band = factBand(facts, spec.kind) || spec.derived;
    if (!band) {
      metrics.push(
        metric({
          id: spec.id,
          label: spec.label,
          reading: "\u7F3A\u5C11\u5BF9\u5E94\u6307\u6807",
          source: "missing",
          confidence: 0
        })
      );
      if (spec.required && !spec.derived) {
        gaps.push({
          field: spec.kind,
          reason: `\u8D26\u672C\u5DF2\u5BFC\u5165\u4F46\u4ECD\u7F3A\u300C${spec.label}\u300D\u63A8\u7B97\u7ED3\u679C\uFF08\u53EF\u8865\u6210\u672C/\u8D39\u7528\u5217\u6216\u6708\u5EA6\u5BF9\u7167\uFF09`,
          severity: "medium"
        });
      }
      continue;
    }
    const level2 = bandLevel(band, spec.map);
    levels.push(level2);
    const fromDerived = !factBand(facts, spec.kind) && Boolean(spec.derived);
    metrics.push(
      metric({
        id: spec.id,
        label: spec.label,
        reading: fromDerived ? `${spec.reading(band)}\uFF08\u7531\u65E5\u660E\u7EC6\u6D3E\u751F\uFF09` : spec.reading(band),
        band,
        source: fromDerived ? "derived" : "owner_reported",
        confidence: fromDerived ? 0.86 : 0.88
      })
    );
  }
  const price = (_k = facts == null ? void 0 : facts.find((item) => item.kind === "priceRange")) == null ? void 0 : _k.claim;
  if (price && !metrics.some((m) => m.id === "avg_ticket_derived")) {
    metrics.push(
      metric({
        id: "avg_ticket",
        label: "\u5BA2\u5355\u4EF7",
        reading: price.includes("\u4EBA\u5747") ? price : `\u4EBA\u5747\u7EA6 ${price}`,
        band: price,
        source: "owner_reported",
        confidence: 0.8
      })
    );
  }
  const level = levels.length ? worstLevel(levels) : "observe";
  const dayCount = daily.length ? uniqueDates(daily) : ledgerDays;
  return {
    axis: "business",
    title: "\u7ECF\u8425\u4F53\u68C0",
    level,
    summary: decompReading || (level === "risk" || level === "attention" || level === "critical" ? `\u57FA\u4E8E ${dayCount} \u4E2A\u8425\u4E1A\u65E5\xD7\u9910\u6BB5\u660E\u7EC6\uFF1A\u7ECF\u8425\u4FA7\u5DF2\u51FA\u73B0\u627F\u538B\u4FE1\u53F7` : `\u57FA\u4E8E ${dayCount} \u4E2A\u8425\u4E1A\u65E5\xD7\u9910\u6BB5 + \u83DC\u54C1\u9500\u552E\u7ED3\u6784\u7684\u7ECF\u8425\u9AA8\u67B6\u5DF2\u5EFA\u7ACB`),
    confidence: Math.min(0.95, 0.55 + Math.min(dayCount, 60) * 5e-3 + (daily.length ? 0.08 : 0)),
    metrics,
    gaps
  };
}
function sumGuests(rows) {
  return rows.reduce((s, r) => s + (r.guests || 0), 0);
}
function buildExperienceAxis(evidence) {
  const gaps = [];
  const metrics = [];
  const levels = [];
  const specs = [
    { theme: "price", id: "price", label: "\u4EF7\u683C\u4F53\u9A8C" },
    { theme: "service", id: "service", label: "\u670D\u52A1\u4F53\u9A8C" },
    { theme: "product", id: "product", label: "\u83DC\u54C1\u4F53\u9A8C" },
    { theme: "environment", id: "environment", label: "\u73AF\u5883\u4F53\u9A8C" }
  ];
  for (const spec of specs) {
    const theme = spec.theme === "service" ? "wait" : spec.theme;
    const bucket = spec.theme === "service" ? (() => {
      const wait = themeBucket(evidence, "wait");
      const svc = evidence.filter((item) => item.theme === "service");
      const all = [...wait.all, ...svc];
      return {
        all,
        neg: all.filter((item) => item.sentiment === "negative"),
        pos: all.filter((item) => item.sentiment === "positive")
      };
    })() : themeBucket(evidence, theme);
    if (!bucket.all.length) {
      metrics.push(
        metric({
          id: spec.id,
          label: spec.label,
          reading: "\u5916\u90E8\u58F0\u97F3\u6837\u672C\u4E0D\u8DB3",
          source: "missing",
          confidence: 0.1
        })
      );
      gaps.push({
        field: `experience_${spec.id}`,
        reason: `\u7F3A\u5C11\u300C${spec.label}\u300D\u76F8\u5173\u8BC4\u4EF7\uFF0C\u4F53\u9A8C\u8F74\u4E0D\u5B8C\u6574`,
        severity: spec.id === "product" || spec.id === "service" ? "high" : "medium"
      });
      continue;
    }
    const level2 = experienceLevel(bucket.neg.length, bucket.pos.length, bucket.all.length);
    levels.push(level2);
    metrics.push(
      metric({
        id: spec.id,
        label: spec.label,
        reading: bucket.neg.length > bucket.pos.length ? `${spec.label}\u8D1F\u53CD\u9988\u504F\u591A\uFF08${bucket.neg.length}/${bucket.all.length}\uFF09` : bucket.pos.length > bucket.neg.length ? `${spec.label}\u6B63\u5411\u58F0\u97F3\u66F4\u5F3A` : `${spec.label}\u8912\u8D2C\u4EA4\u7EC7`,
        band: level2,
        source: "external_evidence",
        confidence: Math.min(0.88, 0.4 + bucket.all.length * 0.1),
        evidenceIds: bucket.all.slice(0, 4).map((item, i) => item.id || `${spec.id}-${i}`)
      })
    );
  }
  const level = levels.length ? worstLevel(levels) : "observe";
  return {
    axis: "experience",
    title: "\u6D88\u8D39\u4F53\u9A8C\u4F53\u68C0",
    level,
    summary: levels.length === 0 ? "\u7F3A\u5C11\u8BC4\u8BBA\u6837\u672C\uFF0C\u65E0\u6CD5\u5EFA\u7ACB\u4EF7\u683C/\u670D\u52A1/\u83DC\u54C1/\u73AF\u5883\u4F53\u9A8C" : level === "risk" || level === "attention" ? "\u4F53\u9A8C\u4FA7\u5DF2\u51FA\u73B0\u53EF\u611F\u77E5\u65AD\u88C2\uFF0C\u4F18\u5148\u770B\u670D\u52A1\u4E0E\u83DC\u54C1" : "\u4F53\u9A8C\u56DB\u8C61\u9650\u6682\u672A\u51FA\u73B0\u5F3A\u98CE\u9669\uFF0C\u53EF\u7EE7\u7EED\u6269\u6837",
    confidence: levels.length ? Math.min(0.86, 0.4 + levels.length * 0.1) : 0.2,
    metrics,
    gaps
  };
}
function buildOperationsAxis(facts, evidence) {
  const gaps = [];
  const metrics = [];
  const levels = [];
  const daily = parseJsonFact2(facts, "daily_ops_json") || [];
  if (daily.length) {
    const meals = mealContributionIndex(daily);
    const topMeal = meals[0];
    if (topMeal) {
      const concentrationLevel = topMeal.revenueShare >= 65 ? "attention" : topMeal.revenueShare >= 50 ? "observe" : "healthy";
      levels.push(concentrationLevel);
      metrics.push(
        metric({
          id: "peak_concentration",
          label: "\u9AD8\u5CF0\u96C6\u4E2D\u5EA6\uFF08MCI\uFF09",
          reading: `\u6700\u5F3A\u573A\u6B21\u300C${topMeal.mealPeriod}\u300D\u4EFD\u989D ${topMeal.revenueShare.toFixed(1)}%\uFF0CMCI ${topMeal.mci.toFixed(2)}${topMeal.revenueShare >= 65 ? "\uFF0C\u8FD0\u8425\u627F\u63A5\u538B\u529B\u96C6\u4E2D\u4E8E\u8BE5\u573A\u6B21" : ""}`,
          band: topMeal.mealPeriod,
          source: "derived",
          confidence: 0.85
        })
      );
    }
  }
  const specs = [
    {
      id: "turnover",
      kind: "turnover_band",
      label: "\u7FFB\u53F0\u7387",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => b === "high" ? "\u7FFB\u53F0\u504F\u5FEB" : b === "low" ? "\u7FFB\u53F0\u504F\u6162" : "\u7FFB\u53F0\u4E2D\u7B49",
      required: true
    },
    {
      id: "labor_efficiency",
      kind: "labor_efficiency",
      label: "\u4EBA\u6548",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => b === "high" ? "\u4EBA\u6548\u504F\u5F3A" : b === "low" ? "\u4EBA\u6548\u504F\u5F31" : "\u4EBA\u6548\u4E00\u822C",
      required: true
    },
    {
      id: "table_efficiency",
      kind: "table_efficiency",
      label: "\u684C\u6548",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => b === "high" ? "\u684C\u6548\u504F\u5F3A" : b === "low" ? "\u684C\u6548\u504F\u5F31" : "\u684C\u6548\u4E00\u822C"
    },
    {
      id: "space_efficiency",
      kind: "space_efficiency",
      label: "\u5E73\u6548",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => b === "high" ? "\u5E73\u6548\u504F\u5F3A" : b === "low" ? "\u5E73\u6548\u504F\u5F31" : "\u5E73\u6548\u4E00\u822C"
    },
    {
      id: "staff_churn",
      kind: "staff_churn",
      label: "\u5458\u5DE5\u6D41\u5931\u7387",
      map: { low: "healthy", medium: "observe", high: "attention" },
      reading: (b) => b === "high" ? "\u4EBA\u5458\u6D41\u5931\u504F\u9AD8" : b === "low" ? "\u4EBA\u5458\u76F8\u5BF9\u7A33\u5B9A" : "\u4EBA\u5458\u6D41\u5931\u4E2D\u7B49"
    }
  ];
  for (const spec of specs) {
    const band = factBand(facts, spec.kind);
    if (!band) {
      metrics.push(
        metric({
          id: spec.id,
          label: spec.label,
          reading: "\u7F3A\u5C11\u8FD0\u8425\u81EA\u62A5\u6863\u4F4D",
          source: "missing",
          confidence: 0
        })
      );
      gaps.push({
        field: spec.kind,
        reason: `\u7F3A\u5C11\u300C${spec.label}\u300D\uFF1B\u8BC4\u8BBA\u65E0\u6CD5\u76F4\u63A5\u7B97\u51FA\u8BE5 KPI`,
        severity: spec.required ? "high" : "medium"
      });
      continue;
    }
    const level2 = bandLevel(band, spec.map);
    levels.push(level2);
    metrics.push(
      metric({
        id: spec.id,
        label: spec.label,
        reading: spec.reading(band),
        band,
        source: "owner_reported",
        confidence: 0.7
      })
    );
  }
  const wait = themeBucket(evidence, "wait");
  const serveBand = factBand(facts, "serve_speed_sense");
  if (serveBand || wait.all.length) {
    const proxyLevel = serveBand ? bandLevel(serveBand, { fast: "healthy", ok: "observe", slow: "attention" }) : wait.neg.length >= 3 ? "risk" : wait.neg.length >= 1 || wait.all.length >= 2 ? "attention" : "observe";
    levels.push(proxyLevel);
    metrics.push(
      metric({
        id: "serve_speed",
        label: "\u4E0A\u83DC\u901F\u5EA6",
        reading: serveBand ? serveBand === "slow" ? "\u8001\u677F\u81EA\u62A5\u4E0A\u83DC\u504F\u6162" : serveBand === "fast" ? "\u8001\u677F\u81EA\u62A5\u4E0A\u83DC\u504F\u5FEB" : "\u8001\u677F\u81EA\u62A5\u4E0A\u83DC\u6B63\u5E38" : wait.all.length ? `\u8BC4\u8BBA\u4FA7\u7B49\u5F85/\u4E0A\u83DC\u63D0\u53CA ${wait.all.length} \u6B21\uFF08\u4EE3\u7406\u4FE1\u53F7\uFF09` : "\u4E0A\u83DC\u901F\u5EA6\u6682\u65E0\u4FE1\u53F7",
        band: serveBand || proxyLevel,
        source: serveBand ? "owner_reported" : wait.all.length ? "proxy" : "missing",
        confidence: serveBand ? 0.68 : wait.all.length ? 0.55 : 0.1,
        evidenceIds: wait.all.slice(0, 4).map((item, i) => item.id || `serve-${i}`)
      })
    );
  } else {
    gaps.push({
      field: "serve_speed_sense",
      reason: "\u7F3A\u5C11\u4E0A\u83DC\u901F\u5EA6\u81EA\u62A5\uFF0C\u4E14\u8BC4\u8BBA\u65E0\u7B49\u5F85\u8BC1\u636E",
      severity: "medium"
    });
  }
  const level = levels.length ? worstLevel(levels) : "observe";
  const filled = metrics.filter((item) => item.source !== "missing").length;
  return {
    axis: "operations",
    title: "\u8FD0\u8425\u4F53\u68C0",
    level,
    summary: filled === 0 ? "\u8FD0\u8425 KPI \u51E0\u4E4E\u7A7A\u767D\uFF1B\u4EC5\u9760\u70B9\u8BC4\u53EA\u80FD\u770B\u5230\u7B49\u5F85\u4EE3\u7406\uFF0C\u770B\u4E0D\u5230\u4EBA\u6548/\u684C\u6548/\u5E73\u6548" : level === "risk" || level === "attention" ? "\u8FD0\u8425\u6548\u7387\u4FA7\u5DF2\u6709\u627F\u538B\u9879\uFF0C\u5EFA\u8BAE\u4E0E\u9AD8\u5CF0\u573A\u666F\u4EA4\u53C9\u6838\u5BF9" : "\u8FD0\u8425\u81EA\u62A5\u6574\u4F53\u5C1A\u53EF\uFF0C\u7CBE\u786E\u4EBA\u6548/\u5E73\u6548\u4ECD\u9700\u5E97\u5185\u6570\u636E\u6821\u51C6",
    confidence: filled === 0 ? 0.18 : Math.min(0.8, 0.35 + filled * 0.07),
    metrics,
    gaps
  };
}
function buildRestaurantExamReport(input) {
  const evidence = input.evidence || [];
  const business = buildBusinessAxis(input.facts);
  const experience = buildExperienceAxis(evidence);
  const operations = buildOperationsAxis(input.facts, evidence);
  const axes = [business, experience, operations];
  const weak = axes.filter(
    (axis) => axis.level === "risk" || axis.level === "attention" || axis.confidence < 0.35
  );
  return {
    asOf: input.asOf || (/* @__PURE__ */ new Date()).toISOString(),
    summary: weak.length === 0 ? "\u4E09\u8F74\u4F53\u68C0\u5DF2\u5EFA\u7ACB\u521D\u7A3F\uFF1A\u7ECF\u8425\u81EA\u62A5 + \u4F53\u9A8C\u8BC4\u8BBA + \u8FD0\u8425\u6548\u7387" : `\u4F18\u5148\u5173\u6CE8\uFF1A${weak.map((item) => item.title).join("\u3001")}`,
    axes
  };
}
function examGaps(report) {
  return report.axes.flatMap(
    (axis) => axis.gaps.map((gap) => ({
      ...gap,
      field: `${axis.axis}.${gap.field}`
    }))
  );
}

// packages/m-ops-diag/src/engines/growth-engine.ts
function analyzeGrowthIntelligence({
  evidence
}) {
  const growth = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "growth", item.theme) || item.theme === "growth" || item.source.toLowerCase().includes("xiaohongshu") || item.source.includes("\u5C0F\u7EA2\u4E66") || item.source.toLowerCase().includes("douyin") || item.source.includes("\u6296\u97F3")
  );
  const positive = growth.filter((item) => item.sentiment === "positive");
  const level = growth.length >= 2 && positive.length > 0 ? "healthy" : growth.length >= 1 ? "observe" : "observe";
  return {
    dimension: "growth",
    level,
    finding: growth.length > 0 ? "\u5916\u90E8\u5185\u5BB9\u573A\u666F\u4E2D\u51FA\u73B0\u53EF\u5173\u6CE8\u7684\u589E\u957F\u7EBF\u7D22" : "\u6682\u672A\u5F62\u6210\u5F3A\u589E\u957F\u673A\u4F1A\u8BC1\u636E",
    meaning: growth.length > 0 ? "\u53EF\u7EE7\u7EED\u89C2\u5BDF\u805A\u9910\u3001\u63A8\u8350\u4E0E\u6253\u5361\u573A\u666F\uFF0C\u5224\u65AD\u662F\u5426\u503C\u5F97\u653E\u5927" : "\u589E\u957F\u7EF4\u5EA6\u5F53\u524D\u4EE5\u89C2\u5BDF\u4E3A\u4E3B\uFF0C\u4E0D\u5B9C\u5F3A\u884C\u7ED9\u673A\u4F1A\u5224\u65AD",
    observed: growth.length > 0 ? `\u53D1\u73B0 ${growth.length} \u6761\u4F20\u64AD\u6216\u805A\u9910\u573A\u666F\u7EBF\u7D22` : "\u589E\u957F\u673A\u4F1A\u4FE1\u53F7\u5C1A\u5F31",
    confidence: growth.length > 0 ? Math.min(0.72, 0.32 + growth.length * 0.14) : 0.3,
    evidenceIds: growth.map((item, index) => item.id || `growth-${index}`).slice(0, 6),
    watchHint: "\u7EE7\u7EED\u8DDF\u8E2A\u5C0F\u7EA2\u4E66/\u6296\u97F3\u573A\u666F\u8BCD\u53D8\u5316",
    hypotheses: [
      {
        statement: "\u987E\u5BA2\u6B63\u5728\u628A\u95E8\u5E97\u653E\u8FDB\u65B0\u7684\u805A\u9910\u6216\u6253\u5361\u573A\u666F\u4E2D",
        probability: positive.length > 0 ? 0.58 : 0.34,
        supportingEvidence: growth.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["\u5BF9\u6BD4\u8FD130\u5929\u5185\u5BB9\u5173\u952E\u8BCD\uFF0C\u770B\u662F\u5426\u5F62\u6210\u7A33\u5B9A\u65B0\u573A\u666F"]
      }
    ],
    opportunity: growth.length > 0,
    rawEvidence: growth.slice(0, 6)
  };
}

// packages/m-ops-diag/src/engines/operation-engine.ts
function analyzeOperationIntelligence({
  evidence
}) {
  const wait = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "wait", item.theme) || item.theme === "wait"
  );
  const service = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "wait", item.theme) || item.theme === "service" || item.theme === "wait"
  );
  const level = wait.length >= 3 ? "risk" : wait.length >= 2 ? "attention" : wait.length >= 1 ? "observe" : "healthy";
  const observed = wait.length >= 2 ? `\u7B49\u5F85\u76F8\u5173\u8868\u8FF0\u51FA\u73B0 ${wait.length} \u6B21\uFF0C\u5E76\u660E\u663E\u96C6\u4E2D\u5728\u9AD8\u5CF0\u573A\u666F` : wait.length === 1 ? "\u51FA\u73B0\u8F7B\u5FAE\u7B49\u5F85\u4E0E\u4EA4\u4ED8\u6CE2\u52A8" : "\u6682\u672A\u53D1\u73B0\u9AD8\u5CF0\u627F\u8F7D\u5F02\u5E38\u7684\u5F3A\u4FE1\u53F7";
  return {
    dimension: "operation",
    level,
    finding: level === "risk" ? "\u9AD8\u5CF0\u627F\u8F7D\u80FD\u529B\u4E0D\u8DB3\u6B63\u5728\u6F14\u53D8\u4E3A\u7ECF\u8425\u74F6\u9888" : level === "attention" ? "\u7ECF\u8425\u8282\u594F\u5F00\u59CB\u627F\u538B\uFF0C\u9700\u5173\u6CE8\u9AD8\u5CF0\u4EA4\u4ED8" : "\u7ECF\u8425\u6548\u7387\u6682\u65F6\u7EF4\u6301\u7A33\u5B9A",
    meaning: level === "risk" ? "\u95EE\u9898\u66F4\u50CF\u5CF0\u503C\u627F\u8F7D\u95EE\u9898\uFF0C\u800C\u4E0D\u662F\u5168\u5929\u5019\u80FD\u529B\u4E0D\u8DB3" : level === "attention" ? "\u82E5\u4E0D\u5904\u7406\u9AD8\u5CF0\u8282\u594F\uFF0C\u5DEE\u8BC4\u4F1A\u8FDB\u4E00\u6B65\u6269\u6563\u5230\u590D\u8D2D\u5C42" : "\u8FD0\u8425\u4FA7\u4ECD\u9700\u66F4\u591A\u5185\u90E8\u4E8B\u5B9E\u652F\u6491\u66F4\u6DF1\u8BCA\u65AD",
    observed,
    confidence: Math.min(0.86, 0.36 + wait.length * 0.16),
    evidenceIds: wait.map((item, index) => item.id || `operation-${index}`),
    watchHint: "\u4F18\u5148\u6838\u67E5\u5468\u672B\u665A\u9910\u9AD8\u5CF0\u7684\u6392\u961F\u3001\u70B9\u5355\u4E0E\u51FA\u83DC\u8282\u70B9",
    hypotheses: [
      {
        statement: "\u9AD8\u5CF0\u4EA7\u80FD\u4E0D\u8DB3\u6B63\u5728\u653E\u5927\u7B49\u5F85\u95EE\u9898",
        probability: 0.65,
        supportingEvidence: wait.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["\u5BF9\u6BD4\u5DE5\u4F5C\u65E5\u4E0E\u5468\u672B\u665A\u9910\u7684\u51FA\u83DC\u8282\u594F\u548C\u6392\u961F\u957F\u5EA6"]
      },
      {
        statement: "\u524D\u5385\u6392\u961F\u7BA1\u7406\u4E0D\u8DB3\u5BFC\u81F4\u987E\u5BA2\u4F53\u611F\u6076\u5316",
        probability: 0.25,
        supportingEvidence: service.map((item) => item.id || item.claim).slice(0, 3),
        validationPlan: ["\u590D\u6838\u7B49\u4F4D\u9636\u6BB5\u662F\u5426\u7F3A\u5C11\u4E3B\u52A8\u544A\u77E5\u4E0E\u5206\u6D41\u52A8\u4F5C"]
      }
    ],
    rawEvidence: wait.slice(0, 6)
  };
}
function analyzeServiceIntelligence({
  evidence
}) {
  const wait = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "wait", item.theme) || item.theme === "wait"
  );
  const level = wait.length >= 3 ? "risk" : wait.length >= 2 ? "attention" : wait.length >= 1 ? "observe" : "healthy";
  return {
    dimension: "service",
    level,
    finding: wait.length >= 2 ? "\u987E\u5BA2\u4F53\u9A8C\u7684\u4E3B\u8981\u65AD\u88C2\u70B9\u96C6\u4E2D\u5728\u7B49\u5F85\u4E0E\u54CD\u5E94" : wait.length === 1 ? "\u670D\u52A1\u4FA7\u51FA\u73B0\u8F7B\u5FAE\u6CE2\u52A8\uFF0C\u503C\u5F97\u7EE7\u7EED\u89C2\u5BDF" : "\u5F53\u524D\u672A\u89C1\u660E\u663E\u670D\u52A1\u4F53\u9A8C\u65AD\u88C2",
    meaning: wait.length >= 2 ? "\u670D\u52A1\u4F53\u9A8C\u6B63\u5728\u6210\u4E3A\u8D1F\u9762\u8BC4\u4EF7\u7684\u4E3B\u8981\u6765\u6E90" : "\u670D\u52A1\u4FA7\u6682\u672A\u5F62\u6210\u5F3A\u98CE\u9669\uFF0C\u4F46\u9700\u4FDD\u6301\u76D1\u6D4B",
    observed: wait.length > 0 ? `\u7B49\u5F85/\u670D\u52A1\u76F8\u5173\u8868\u8FF0\u51FA\u73B0 ${wait.length} \u6B21` : "\u672A\u89C1\u660E\u663E\u670D\u52A1\u7C7B\u8D1F\u5411\u805A\u96C6",
    confidence: Math.min(0.9, 0.4 + wait.length * 0.15),
    evidenceIds: wait.map((item, index) => item.id || `service-${index}`),
    watchHint: "\u5EFA\u8BAE\u4F18\u5148\u6392\u67E5\u665A\u9AD8\u5CF0\u7B49\u4F4D\u4E0E\u4E0A\u83DC\u8282\u594F",
    hypotheses: [
      {
        statement: "\u670D\u52A1\u7B49\u5F85\u6B63\u5728\u7834\u574F\u7528\u9910\u4F53\u9A8C",
        probability: 0.71,
        supportingEvidence: wait.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["\u590D\u6838\u7B49\u4F4D\u3001\u70B9\u5355\u3001\u4E0A\u83DC\u4E09\u4E2A\u8282\u70B9\u7684\u5B9E\u9645\u7B49\u5F85\u65F6\u957F"]
      }
    ],
    rawEvidence: wait.slice(0, 6)
  };
}

// packages/m-ops-diag/src/engines/product-engine.ts
function analyzeProductIntelligence({
  evidence
}) {
  const productPositive = evidence.filter(
    (item) => (claimMatchesTheme(item.claim, "product", item.theme) || item.theme === "product") && item.sentiment === "positive"
  );
  const productNegative = evidence.filter(
    (item) => (claimMatchesTheme(item.claim, "product", item.theme) || item.theme === "product") && item.sentiment === "negative"
  );
  const mentions = productPositive.length + productNegative.length;
  const level = productNegative.length >= 2 ? "attention" : productPositive.length >= 2 ? "healthy" : mentions > 0 ? "observe" : "observe";
  return {
    dimension: "product",
    level,
    finding: productNegative.length > productPositive.length ? "\u4EA7\u54C1\u7A33\u5B9A\u6027\u5F00\u59CB\u51FA\u73B0\u6CE2\u52A8" : productPositive.length > 0 ? "\u62DB\u724C\u4EA7\u54C1\u4ECD\u5728\u5F62\u6210\u6B63\u5411\u8BB0\u5FC6\u70B9" : "\u5F53\u524D\u6837\u672C\u4E0D\u8DB3\u4EE5\u5224\u65AD\u4EA7\u54C1\u7ADE\u4E89\u529B",
    meaning: productNegative.length > productPositive.length ? "\u5982\u679C\u8D1F\u5411\u7EE7\u7EED\u589E\u52A0\uFF0C\u83DC\u5355\u5438\u5F15\u529B\u548C\u62DB\u724C\u8BB0\u5FC6\u4F1A\u88AB\u524A\u5F31" : productPositive.length > 0 ? "\u4EA7\u54C1\u5F53\u524D\u4E0D\u662F\u4E3B\u8981\u62D6\u7D2F\u9879\uFF0C\u4F46\u4ECD\u9700\u89C2\u5BDF\u65B0\u54C1\u4E0E\u7B2C\u4E8C\u589E\u957F\u70B9" : "\u4EA7\u54C1\u7EF4\u5EA6\u4ECD\u7F3A\u5C11\u8DB3\u591F\u6837\u672C\u652F\u6491\u6DF1\u5165\u8BCA\u65AD",
    observed: mentions > 0 ? `\u4EA7\u54C1\u76F8\u5173\u6B63\u5411 ${productPositive.length} \u6761\uFF0C\u8D1F\u5411 ${productNegative.length} \u6761` : "\u5F53\u524D\u6837\u672C\u4E2D\u4EA7\u54C1\u8BA8\u8BBA\u8F83\u5C11",
    confidence: Math.min(0.82, 0.35 + mentions * 0.12),
    evidenceIds: productPositive.concat(productNegative).map((item, index) => item.id || `product-${index}`).slice(0, 6),
    watchHint: "\u7ED3\u5408\u83DC\u5355\u9500\u91CF\u4E0E\u8BC4\u8BBA\u9AD8\u9891\u83DC\u540D\uFF0C\u5224\u65AD\u662F\u5426\u5B58\u5728\u7206\u54C1\u8870\u51CF",
    hypotheses: [
      {
        statement: "\u62DB\u724C\u4EA7\u54C1\u4ECD\u662F\u5F53\u524D\u95E8\u5E97\u7684\u4E3B\u8981\u8BB0\u5FC6\u8D44\u4EA7",
        probability: productPositive.length >= productNegative.length ? 0.62 : 0.28,
        supportingEvidence: productPositive.map((item) => item.id || item.claim).slice(0, 4),
        contradictEvidence: productNegative.map((item) => item.id || item.claim).slice(0, 2),
        validationPlan: ["\u6BD4\u5BF9\u62DB\u724C\u83DC\u63D0\u53CA\u9891\u7387\u4E0E\u95E8\u5E97\u4E3B\u63A8\u83DC\u662F\u5426\u4E00\u81F4"]
      },
      {
        statement: "\u65B0\u54C1\u6216\u975E\u62DB\u724C\u4EA7\u54C1\u5C1A\u672A\u5F62\u6210\u7B2C\u4E8C\u589E\u957F\u70B9",
        probability: 0.46,
        supportingEvidence: productNegative.map((item) => item.id || item.claim).slice(0, 2),
        validationPlan: ["\u68C0\u67E5\u8BC4\u8BBA\u4E2D\u662F\u5426\u53CD\u590D\u53EA\u63D0\u53CA\u5C11\u6570\u62DB\u724C\u83DC"]
      }
    ],
    rawEvidence: productPositive.concat(productNegative).slice(0, 6)
  };
}

// packages/m-ops-diag/src/engines/expert-bridge.ts
var ROLE_DIMENSION = {
  finance: "operation",
  product: "product",
  marketing: "growth",
  experience: "service"
};
function levelFromExpert(result) {
  if (result.refused) return "critical";
  return result.level;
}
function expertResultToAnalysis(result) {
  var _a, _b;
  const dimension = ROLE_DIMENSION[result.role];
  const topSignals = (result.signals || []).filter((s) => s.severity !== "healthy");
  const finding = ((_a = topSignals[0]) == null ? void 0 : _a.statement) || result.risks[0] || result.verdict.slice(0, 80) || `${result.title}\u89C2\u5BDF`;
  const meaning = result.analyses.filter((a) => a.metricId).slice(0, 2).map((a) => `${a.label}\uFF1A${a.value}`).join("\uFF1B") || result.verdict;
  const observed = result.observations.slice(0, 2).join("\uFF1B") || ((_b = result.analyses[0]) == null ? void 0 : _b.value) || result.verdict;
  const rawEvidence = (result.analyses.length ? result.analyses : [{ label: result.title, value: result.verdict, metricId: void 0 }]).slice(0, 6).map((cell, index) => ({
    id: `${result.role}-${cell.metricId || index}`,
    source: `${result.title}\xB7\u53EF\u590D\u6838\u6307\u6807`,
    claim: `${cell.label}\uFF1A${cell.value}`,
    kind: "system_fact",
    theme: result.role,
    observedAt: (/* @__PURE__ */ new Date()).toISOString()
  }));
  const hypotheses = [
    {
      statement: finding,
      probability: result.refused ? 0.35 : Math.min(0.92, 0.45 + result.confidence * 0.4),
      supportingEvidence: result.analyses.filter((a) => a.metricId).slice(0, 3).map((a) => a.metricId),
      validationPlan: result.counsel.slice(0, 2)
    },
    ...result.risks.slice(0, 2).map((risk) => ({
      statement: risk,
      probability: Math.min(0.85, 0.4 + result.confidence * 0.3),
      supportingEvidence: [`${result.role}-risk`],
      validationPlan: result.counsel.slice(0, 1)
    }))
  ];
  return {
    dimension,
    level: levelFromExpert(result),
    finding,
    meaning,
    observed,
    confidence: result.confidence,
    evidenceIds: result.analyses.map((a) => a.metricId).filter(Boolean).slice(0, 6),
    watchHint: result.counsel[0],
    hypotheses,
    opportunity: result.level === "healthy" || result.level === "observe",
    rawEvidence,
    source: "expert",
    expertRole: result.role,
    metricIds: result.analyses.map((a) => a.metricId).filter(Boolean)
  };
}
function mergeAnalyses(review, expert) {
  const byDim = /* @__PURE__ */ new Map();
  for (const item of [...review, ...expert]) {
    const prev = byDim.get(item.dimension);
    if (!prev) {
      byDim.set(item.dimension, item);
      continue;
    }
    const rank = {
      healthy: 0,
      observe: 1,
      attention: 2,
      risk: 3,
      critical: 4
    };
    const worse3 = rank[item.level] >= rank[prev.level] ? item : prev;
    const betterConf = item.confidence >= prev.confidence ? item : prev;
    byDim.set(item.dimension, {
      ...worse3,
      confidence: Math.max(prev.confidence, item.confidence),
      hypotheses: [...prev.hypotheses, ...item.hypotheses].sort((a, b) => b.probability - a.probability).slice(0, 4),
      evidenceIds: [.../* @__PURE__ */ new Set([...prev.evidenceIds, ...item.evidenceIds])].slice(0, 8),
      meaning: [prev.meaning, item.meaning].filter(Boolean).join("\uFF5C").slice(0, 220),
      watchHint: worse3.watchHint || betterConf.watchHint,
      source: prev.source === "expert" || item.source === "expert" ? "merged" : worse3.source
    });
  }
  return [...byDim.values()];
}

// packages/m-ops-diag/src/reasoning/impact.ts
function assessImpact(analysis) {
  var _a;
  const severity = analysis.level === "critical" ? 9 : analysis.level === "risk" ? 8 : analysis.level === "attention" ? 6 : analysis.level === "observe" ? 4 : 3;
  const biz = analysis.businessImpact;
  let affectedUsers = 4;
  let trendVelocity = 4;
  if (biz) {
    const revAbs = Math.abs(biz.revenueDeltaPct || 0);
    const trafAbs = Math.abs(biz.trafficDeltaPct || 0);
    affectedUsers = Math.max(
      3,
      Math.min(10, Math.round(3 + Math.max(revAbs, trafAbs) / 4))
    );
    const downPressure = (biz.revenueDeltaPct || 0) < 0 || (biz.trafficDeltaPct || 0) < 0;
    trendVelocity = Math.max(
      3,
      Math.min(9, Math.round(3 + Math.max(revAbs, trafAbs) / 5) + (downPressure ? 2 : 0))
    );
    if (biz.marginPct !== void 0 && biz.marginPct < 8) {
      trendVelocity = Math.min(9, trendVelocity + 1);
    }
    if (biz.peakSharePct !== void 0 && biz.peakSharePct >= 55) {
      affectedUsers = Math.min(10, affectedUsers + 1);
    }
  } else {
    if (analysis.source === "expert" || analysis.source === "merged") {
      affectedUsers = Math.max(5, Math.min(9, (((_a = analysis.metricIds) == null ? void 0 : _a.length) || 1) + 4));
      trendVelocity = analysis.level === "risk" || analysis.level === "critical" ? 7 : 5;
    } else {
      affectedUsers = Math.max(3, Math.min(7, analysis.evidenceIds.length + 2));
      trendVelocity = analysis.level === "risk" ? 6 : analysis.level === "attention" ? 5 : 3;
    }
  }
  const solveCost = analysis.dimension === "operation" || analysis.dimension === "service" ? 5 : 4;
  return calcImpactScore({
    severity,
    affectedUsers,
    trendVelocity,
    confidence: analysis.confidence,
    solveCost
  });
}

// packages/m-ops-diag/src/reasoning/hypothesis.ts
function learningBias(statement, learnings) {
  if (!(learnings == null ? void 0 : learnings.length)) return 0;
  let bias = 0;
  for (const learning of learnings) {
    const related = statement.includes(learning.hypothesis) || learning.hypothesis.includes(statement) || statement.length > 8 && learning.hypothesis.length > 8 && (statement.slice(0, 12) === learning.hypothesis.slice(0, 12) || learning.hypothesis.includes(statement.slice(0, 8)));
    if (!related) continue;
    const polarity = learning.polarity || classifyLearningOutcome(learning);
    if (polarity === "confirmed") bias += 0.12;
    else if (polarity === "rejected") bias -= 0.18;
    else if (polarity === "mixed") bias += 0.03;
  }
  return bias;
}
function rankHypotheses(analyses, previousLearnings) {
  const evolution = (previousLearnings == null ? void 0 : previousLearnings.length) ? buildEvolutionState(previousLearnings) : void 0;
  return analyses.flatMap((analysis) => analysis.hypotheses).map((hypothesis) => {
    const direct = learningBias(hypothesis.statement, previousLearnings);
    const evolved = evolutionBiasForHypothesis(hypothesis.statement, evolution);
    const bias = direct + evolved * 0.65;
    const probability = Math.max(
      0.05,
      Math.min(0.98, Number((hypothesis.probability + bias).toFixed(3)))
    );
    return { ...hypothesis, probability };
  }).sort((a, b) => b.probability - a.probability).slice(0, 4);
}

// packages/m-ops-diag/src/reasoning/orchestrator.ts
function parseJsonFact3(facts, kind) {
  var _a;
  const raw = (_a = facts == null ? void 0 : facts.find((f) => f.kind === kind)) == null ? void 0 : _a.claim;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function buildBusinessImpact(facts) {
  var _a;
  const daily = parseJsonFact3(facts, "daily_ops_json") || [];
  if (!daily.length) return void 0;
  const months = aggregateByMonth(daily);
  const pnl = computePnL(daily);
  const meals = mealContributionIndex(daily);
  let revenueDeltaPct;
  let trafficDeltaPct;
  if (months.length >= 2) {
    const prev = months[months.length - 2];
    const curr = months[months.length - 1];
    const decomp = decomposeRevenueChange({
      revenue0: prev.revenue,
      guests0: prev.guests,
      ticket0: prev.avgTicket,
      revenue1: curr.revenue,
      guests1: curr.guests,
      ticket1: curr.avgTicket
    });
    revenueDeltaPct = decomp.dRevPct;
    trafficDeltaPct = prev.guests ? (curr.guests - prev.guests) / prev.guests * 100 : 0;
  }
  return {
    revenueDeltaPct,
    trafficDeltaPct,
    marginPct: pnl.hasCost || pnl.hasExpense ? pnl.marginPct : void 0,
    peakSharePct: (_a = meals[0]) == null ? void 0 : _a.revenueShare
  };
}
function buildRestaurantContext(request) {
  var _a, _b, _c, _d, _e, _f;
  const ctx = request.restaurantContext;
  return {
    restaurantId: ctx.projectId || ctx.storeName || ctx.brandName || "unknown-restaurant",
    brand: ctx.brandName,
    category: ctx.category,
    city: ctx.city,
    location: ctx.address,
    priceRange: (_b = (_a = request.facts) == null ? void 0 : _a.find((fact) => fact.kind === "priceRange")) == null ? void 0 : _b.claim,
    storeStage: ctx.stage,
    businessModel: (_d = (_c = request.facts) == null ? void 0 : _c.find((fact) => fact.kind === "businessModel")) == null ? void 0 : _d.claim,
    operatingModel: (_f = (_e = request.facts) == null ? void 0 : _e.find((fact) => fact.kind === "operatingModel")) == null ? void 0 : _f.claim
  };
}
function buildEvidenceRecords(restaurantId, evidence) {
  return (evidence || []).map((item, index) => ({
    id: item.id || `evidence-${index}`,
    restaurantId,
    source: sourceTypeFromEvidence(item.source),
    type: item.theme || "review",
    content: item.claim,
    capturedAt: item.observedAt || (/* @__PURE__ */ new Date()).toISOString(),
    reliability: item.kind === "owner_fact" ? 1 : item.kind === "system_fact" ? 1 : 0.75,
    scope: item.theme,
    metadata: {
      originalSource: item.source,
      sentiment: item.sentiment,
      url: item.url
    }
  }));
}
function buildDimensionState(analysis, previousSnapshot) {
  const previousLevel = findPrevLevel(previousSnapshot, analysis.dimension);
  const direction = compareHealthLevels(previousLevel, analysis.level);
  const magnitude = previousLevel ? Math.min(3, Math.abs(levelScore(analysis.level) - levelScore(previousLevel))) : 0;
  return {
    dimension: analysis.dimension,
    level: analysis.level,
    previousLevel,
    delta: {
      metric: `${analysis.dimension}_health`,
      direction,
      magnitude,
      summary: makeDeltaSummary({
        metric: analysis.dimension,
        previousLevel,
        currentLevel: analysis.level,
        observed: analysis.observed
      }),
      changed: direction !== "flat",
      evidenceIds: analysis.evidenceIds
    },
    finding: analysis.finding,
    meaning: analysis.meaning,
    watchHint: analysis.watchHint,
    confidence: analysis.confidence,
    evidenceIds: analysis.evidenceIds
  };
}
function runDiagnosisOrchestrator(request) {
  var _a;
  const evidence = request.evidence || [];
  const previousSnapshot = request.previousSnapshot;
  const restaurantContext = buildRestaurantContext(request);
  const evidenceRecords = buildEvidenceRecords(restaurantContext.restaurantId, evidence);
  const gaps = [];
  if (!evidence.length) {
    gaps.push({
      field: "evidence",
      reason: "\u7F3A\u5C11\u6D88\u8D39\u8005\u53CD\u9988\u8BC1\u636E\uFF08\u70B9\u8BC4/\u5185\u5BB9\uFF09\uFF0C\u4F53\u9A8C\u8F74\u65E0\u6CD5\u5EFA\u7ACB",
      severity: "high"
    });
  }
  const exam = buildRestaurantExamReport({
    facts: request.facts,
    evidence,
    asOf: request.asOf
  });
  gaps.push(...examGaps(exam));
  const reviewAnalyses = evidence.length ? [
    analyzeCustomerIntelligence({ evidence }),
    analyzeServiceIntelligence({ evidence }),
    analyzeOperationIntelligence({ evidence }),
    analyzeProductIntelligence({ evidence }),
    analyzeCompetitionIntelligence({ evidence }),
    analyzeGrowthIntelligence({ evidence })
  ] : [];
  const financeExpert = runFinanceOfficer({ facts: request.facts });
  const productExpert = runProductOfficer({ facts: request.facts, evidence });
  const marketingExpert = runMarketingOfficer({
    facts: request.facts,
    evidence,
    signals: []
  });
  const experienceExpert = runExperienceOfficer({ facts: request.facts, evidence });
  const expertAnalyses = [
    financeExpert,
    productExpert,
    marketingExpert,
    experienceExpert
  ].filter((item) => !item.refused || item.signals && item.signals.length).map(expertResultToAnalysis);
  const businessImpact = buildBusinessImpact(request.facts);
  const taggedReview = reviewAnalyses.map((item) => ({
    ...item,
    source: "review",
    businessImpact
  }));
  const taggedExpert = expertAnalyses.map((item) => ({
    ...item,
    businessImpact
  }));
  const analyses = mergeAnalyses(taggedReview, taggedExpert);
  const dimensions = analyses.map(
    (analysis) => buildDimensionState(analysis, previousSnapshot)
  );
  const topRisk = dimensions.filter((item) => levelScore(item.level) >= levelScore("attention")).sort((a, b) => levelScore(b.level) - levelScore(a.level) || b.confidence - a.confidence)[0];
  const topOpportunity = analyses.filter((item) => item.opportunity).sort((a, b) => b.confidence - a.confidence)[0];
  const snapshot = {
    asOf: request.asOf || (/* @__PURE__ */ new Date()).toISOString(),
    summary: topRisk ? `${titleFromDimension(topRisk.dimension, topRisk.delta.direction)}\uFF0C${topRisk.meaning}` : "\u5F53\u524D\u6837\u672C\u672A\u53D1\u73B0\u660E\u663E\u7ECF\u8425\u5F02\u5E38\uFF0C\u5DF2\u5EFA\u7ACB\u9996\u4EFD\u5065\u5EB7\u5FEB\u7167",
    topRiskDimension: topRisk == null ? void 0 : topRisk.dimension,
    topOpportunityDimension: topOpportunity == null ? void 0 : topOpportunity.dimension,
    dimensions
  };
  const deltas = dimensions.map((item) => ({
    dimension: item.dimension,
    fromLevel: item.previousLevel || item.level,
    toLevel: item.level,
    direction: item.delta.direction,
    magnitude: item.delta.magnitude,
    summary: item.delta.summary,
    evidenceIds: item.evidenceIds
  }));
  const evidenceLedger = analyses.map((analysis, index) => ({
    id: `obs-${analysis.dimension}-${index + 1}`,
    evidenceIds: analysis.evidenceIds,
    statement: analysis.observed,
    dimension: analysis.dimension,
    trend: analysis.level === "risk" || analysis.level === "attention" ? "up" : analysis.opportunity ? "up" : "flat",
    confidence: analysis.confidence
  }));
  const patterns = analyses.map((analysis, index) => ({
    id: `pattern-${analysis.dimension}-${index + 1}`,
    name: analysis.finding,
    category: analysis.dimension,
    observationIds: evidenceLedger.filter((item) => item.dimension === analysis.dimension).map((item) => item.id),
    occurrence: analysis.evidenceIds.length,
    trend: analysis.level === "risk" || analysis.level === "attention" ? "up" : analysis.opportunity ? "up" : "flat",
    confidence: analysis.confidence
  }));
  const ranked = analyses.map((analysis) => ({ analysis, impactScore: assessImpact(analysis) })).sort((a, b) => b.impactScore - a.impactScore);
  const primary = ranked[0];
  const caseRecord = createDiagnosisCase({
    restaurantId: restaurantContext.restaurantId,
    trigger: topRisk ? topRisk.finding : "initial_scan",
    observations: evidenceLedger.map((item) => item.id),
    patterns: patterns.map((item) => item.id),
    hypothesis: rankHypotheses(analyses, request.previousLearnings),
    impactScore: primary == null ? void 0 : primary.impactScore,
    createdAt: request.asOf
  });
  const signals = ranked.filter(({ analysis, impactScore }) => {
    var _a2, _b;
    const isExpertSourced = analysis.source === "expert" || analysis.source === "merged";
    const enoughEvidence = analysis.evidenceIds.length >= (isExpertSourced ? 1 : 2) || analysis.source === "expert" || analysis.opportunity;
    const hasPattern = analysis.finding.trim().length > 0 && analysis.observed.trim().length > 0;
    const actionPossible = Boolean(analysis.watchHint || ((_b = (_a2 = analysis.hypotheses[0]) == null ? void 0 : _a2.validationPlan) == null ? void 0 : _b.length));
    const impactThreshold = isExpertSourced ? 80 : 120;
    return enoughEvidence && hasPattern && impactScore >= impactThreshold && actionPossible;
  }).slice(0, 3).map(({ analysis, impactScore }, index) => {
    var _a2, _b, _c, _d, _e, _f;
    return {
      id: `sig-${analysis.dimension}-${index + 1}`,
      type: signalTypeFromDimension(analysis.dimension),
      severity: severityFromState(
        ((_a2 = dimensions.find((item) => item.dimension === analysis.dimension)) == null ? void 0 : _a2.level) || analysis.level,
        ((_b = dimensions.find((item) => item.dimension === analysis.dimension)) == null ? void 0 : _b.delta.magnitude) || 0
      ),
      urgency: severityFromState(
        ((_c = dimensions.find((item) => item.dimension === analysis.dimension)) == null ? void 0 : _c.level) || analysis.level,
        ((_d = dimensions.find((item) => item.dimension === analysis.dimension)) == null ? void 0 : _d.delta.magnitude) || 0
      ),
      title: titleFromDimension(
        analysis.dimension,
        ((_e = dimensions.find((item) => item.dimension === analysis.dimension)) == null ? void 0 : _e.delta.direction) || "flat"
      ),
      category: analysis.dimension,
      observation: analysis.finding,
      pattern: ((_f = dimensions.find((item) => item.dimension === analysis.dimension)) == null ? void 0 : _f.delta.summary) || analysis.observed,
      meaning: analysis.meaning,
      impact: impactFromDimension(analysis.dimension),
      impactScore,
      watchHint: analysis.watchHint,
      confidence: analysis.confidence,
      evidence: analysis.rawEvidence.map((item) => ({
        source: item.source,
        fact: item.claim
      })),
      decisionTopic: decisionTopicFromDimension(analysis.dimension),
      hypotheses: analysis.hypotheses,
      recommendedValidation: analysis.hypotheses.flatMap((item) => item.validationPlan || []).slice(0, 3)
    };
  });
  const findings = ranked.slice(0, 4).map(({ analysis }, index) => {
    var _a2;
    return {
      id: `finding-${analysis.dimension}-${index + 1}`,
      observation: analysis.finding,
      pattern: ((_a2 = dimensions.find((item) => item.dimension === analysis.dimension)) == null ? void 0 : _a2.delta.summary) || analysis.observed,
      meaning: analysis.meaning,
      confidence: analysis.confidence,
      focus: focusFromDimension(analysis.dimension),
      evidenceIds: analysis.evidenceIds
    };
  });
  const insights = signals.slice(0, 2).map((signal) => ({
    domain: signal.category || signal.type.toLowerCase(),
    question: signal.decisionTopic || "\u662F\u5426\u503C\u5F97\u8FDB\u5165\u7ECF\u8425\u5224\u65AD",
    finding: signal.observation,
    reasoning: signal.pattern,
    impact: signal.meaning,
    confidence: signal.confidence,
    evidence: signal.evidence.map((item) => ({
      claim: item.fact,
      source: item.source
    })),
    unknowns: evidence.length < 8 ? ["\u6837\u672C\u91CF\u504F\u5C11\uFF0C\u5EFA\u8BAE\u7EE7\u7EED\u7D2F\u79EF\u66F4\u591A\u5E73\u53F0\u8BC1\u636E"] : void 0
  }));
  const customerMap = buildCustomerRealityMap(evidence);
  const customerLens = {
    theyThink: customerMap.likes.concat(customerMap.hesitates).slice(0, 3),
    biggestOpportunity: topOpportunity == null ? void 0 : topOpportunity.finding,
    biggestRisk: (topRisk == null ? void 0 : topRisk.finding) || ((_a = signals[0]) == null ? void 0 : _a.title)
  };
  const learningDraft = signals.map(
    (signal) => {
      var _a2, _b, _c;
      return enrichLearning(
        buildLearningDraft({
          diagnosisId: caseRecord.id,
          hypothesis: ((_b = (_a2 = signal.hypotheses) == null ? void 0 : _a2[0]) == null ? void 0 : _b.statement) || signal.observation,
          expectedOutcome: (_c = signal.recommendedValidation) == null ? void 0 : _c[0]
        })
      );
    }
  );
  const evolution = buildEvolutionState(
    request.previousLearnings,
    restaurantContext.restaurantId
  );
  const consultation = buildConsultationReport({
    request,
    restaurantContext,
    exam,
    health: {
      snapshot,
      previousSnapshot,
      deltas
    },
    signals,
    gaps,
    customerLens,
    evolution,
    asOf: request.asOf
  });
  return {
    restaurantContext,
    health: {
      snapshot,
      previousSnapshot,
      deltas
    },
    exam,
    consultation,
    evidenceLedger,
    patterns,
    caseRecord,
    learningDraft,
    evolution,
    externalScan: buildExternalScanJob({
      restaurantId: restaurantContext.restaurantId,
      sources: Array.from(new Set(evidenceRecords.map((item) => item.source))),
      newEvidenceCount: evidenceRecords.length,
      frequency: "daily"
    }),
    findings,
    signals,
    insights,
    gaps,
    customerLens
  };
}

// packages/m-ops-diag/src/engine.ts
function diagnoseRestaurantSync(request) {
  const horizon = request.horizon || "7d";
  const focus = request.focus || "overall";
  const asOf = request.asOf || (/* @__PURE__ */ new Date()).toISOString();
  const analyzed = runDiagnosisOrchestrator(request);
  return {
    agentId: M_OPS_DIAG_AGENT_ID,
    ok: analyzed.gaps.every((g) => g.severity !== "high") || analyzed.findings.length > 0,
    productName: M_OPS_DIAG_PRODUCT_NAME,
    horizon,
    focus,
    asOf,
    health: analyzed.health,
    exam: analyzed.exam,
    consultation: analyzed.consultation,
    restaurantContext: analyzed.restaurantContext,
    evidenceLedger: analyzed.evidenceLedger,
    patterns: analyzed.patterns,
    caseRecord: analyzed.caseRecord,
    learningDraft: analyzed.learningDraft,
    evolution: analyzed.evolution,
    externalScan: analyzed.externalScan,
    findings: analyzed.findings,
    signals: analyzed.signals,
    insights: analyzed.insights,
    gaps: analyzed.gaps,
    customerLens: analyzed.customerLens
  };
}

// packages/m-ops-diag/src/mock.ts
function mockConsumerEvidence() {
  return [
    {
      id: "m1",
      source: "dianping",
      claim: "\u83DC\u8FD8\u53EF\u4EE5\uFF0C\u4F46\u662F\u7B49\u4E86\u56DB\u5341\u5206\u949F\uFF0C\u670D\u52A1\u5458\u4E5F\u4E0D\u600E\u4E48\u7406\u4EBA",
      sentiment: "negative",
      theme: "wait",
      observedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "m2",
      source: "dianping",
      claim: "\u4E0A\u83DC\u592A\u6162\u4E86\uFF0C\u5E26\u5C0F\u5B69\u6839\u672C\u7B49\u4E0D\u53CA",
      sentiment: "negative",
      theme: "wait"
    },
    {
      id: "m3",
      source: "xiaohongshu",
      claim: "\u5473\u9053\u4E0D\u9519\uFF0C\u73AF\u5883\u4E5F\u5E72\u51C0\uFF0C\u5C31\u662F\u9AD8\u5CF0\u6392\u961F\u529D\u9000",
      sentiment: "negative",
      theme: "wait"
    },
    {
      id: "m4",
      source: "dianping",
      claim: "\u7EA2\u70E7\u8089\u5F88\u4E0B\u996D\uFF0C\u4F1A\u56DE\u8D2D",
      sentiment: "positive",
      theme: "product"
    },
    {
      id: "m5",
      source: "douyin",
      claim: "\u670D\u52A1\u6001\u5EA6\u4E00\u822C\uFF0C\u558A\u4E86\u4E09\u6B21\u624D\u6765\u52A0\u6C34",
      sentiment: "negative",
      theme: "wait"
    }
  ];
}
function mockDiagnosisRequest(overrides) {
  return {
    restaurantContext: {
      brandName: "\u793A\u4F8B\u5C0F\u9986",
      category: "\u4E2D\u5F0F\u6B63\u9910",
      city: "\u4E0A\u6D77",
      stage: "single_store"
    },
    facts: [
      {
        kind: "channel",
        claim: "\u4E3B\u6E20\u9053\u4E3A\u5927\u4F17\u70B9\u8BC4 + \u5230\u5E97"
      }
    ],
    evidence: mockConsumerEvidence(),
    focus: "overall",
    horizon: "7d",
    ...overrides
  };
}
