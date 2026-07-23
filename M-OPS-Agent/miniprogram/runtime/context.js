/**
 * Runtime · Context 注入（Brain → Agent）
 * 若 Brain 尚空，回退 globalData.lastProfile（不 require 任何 Agent 包）
 */
const brain = require("../shell/brain.js");

function hydrateBrainFromGlobal() {
  if (brain.getRestaurant()) return;
  try {
    const app = getApp();
    const p =
      (app && app.globalData && app.globalData.lastProfile) ||
      (app && app.globalData && app.globalData.examProfile) ||
      null;
    if (p && p.name) {
      brain.syncFromAgentProfile(p, "hydrate");
    }
  } catch (e) {}
}

function injectContext(contextKeys) {
  hydrateBrainFromGlobal();
  const keys = contextKeys || [
    "restaurant_id",
    "name",
    "city",
    "category",
    "stage",
  ];
  const r = brain.getRestaurant();
  const ctx = {
    restaurant_id: r && r.id,
    name: (r && r.name) || "",
    city: (r && r.city) || "",
    category: (r && r.category) || "",
    stage: (r && r.stage) || "",
    priceRange: (r && r.priceRange) || "",
    focus: (r && r.focus) || "",
    recent_runs: brain.recentRuns(5),
  };
  const out = {};
  keys.forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(ctx, k)) out[k] = ctx[k];
  });
  return Object.assign({}, ctx, out);
}

module.exports = {
  injectContext: injectContext,
  hydrateBrainFromGlobal: hydrateBrainFromGlobal,
};
