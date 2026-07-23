/**
 * Agent 路由真源 · restaurant-diagnosis
 * 禁止写死散落路径；回 Shell 用 shell/nav
 */
const shellNav = require("../../shell/nav.js");

const BASE = "/agents/restaurant-diagnosis/pages";

const PATHS = {
  index: BASE + "/index/index",
  intake: BASE + "/intake/intake",
  import: BASE + "/import/import",
  report: BASE + "/report/report",
  learn: BASE + "/learn/learn",
  archive: BASE + "/archive/archive",
  action: BASE + "/action/action",
  enhance: BASE + "/enhance/enhance",
};

function go(name, query) {
  let url = PATHS[name];
  if (!url) {
    console.warn("[agent] unknown route", name);
    return;
  }
  if (query && typeof query === "object") {
    const qs = Object.keys(query)
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(query[k]);
      })
      .join("&");
    if (qs) url += "?" + qs;
  }
  wx.navigateTo({
    url: url,
    fail: function () {
      wx.redirectTo({ url: url });
    },
  });
}

function goShellHome() {
  return shellNav.goHome();
}

module.exports = {
  BASE: BASE,
  PATHS: PATHS,
  go: go,
  goShellHome: goShellHome,
  shellHome: shellNav.PATHS.home,
  index: PATHS.index,
  intake: PATHS.intake,
  import: PATHS.import,
  report: PATHS.report,
  learn: PATHS.learn,
  archive: PATHS.archive,
  action: PATHS.action,
  enhance: PATHS.enhance,
};
