/**
 * Host · 插件目录（唯一允许「点名 Agent」的地方）
 *
 * Shell / runtime 不得直接 require agents/*。
 * 抽离 Mini Shell 仓后：本文件留在「宿主组装仓」，Shell 仓只收 registerPlugins()。
 */
const restaurantDiagnosis = require("../agents/restaurant-diagnosis/manifest.js");
const mPntBrand = require("../agents/m-pnt-brand/manifest.js");

/** @returns {object[]} */
function loadPluginManifests() {
  return [restaurantDiagnosis, mPntBrand];
}

module.exports = {
  loadPluginManifests: loadPluginManifests,
};
