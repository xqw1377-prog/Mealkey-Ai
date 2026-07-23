/**
 * Runtime · 打开 Agent（resolve → auth → context → charge → navigate）
 */
const registry = require("./registry.js");
const context = require("./context.js");
const auth = require("../shell/auth.js");
const wallet = require("../shell/wallet.js");
const shellNav = require("../shell/nav.js");

function openAgent(agentId, params) {
  params = params || {};
  const manifest = registry.resolve(agentId);
  if (!manifest) {
    wx.showToast({ title: "未找到能力", icon: "none" });
    return { ok: false };
  }

  if (manifest.status === "coming") {
    wx.showModal({
      title: manifest.displayName,
      content:
        (manifest.summary || "该能力即将上架") +
        "\n\n将在同一 MealKey 小程序内以插件形式提供，无需另下小程序。",
      showCancel: false,
    });
    return { ok: false, coming: true };
  }

  const required = (manifest.miniUi && manifest.miniUi.requiredAuth) || "none";
  if (required === "guest" || required === "bound") {
    auth.ensureGuest();
  }
  if (required === "bound" && auth.authLevel() !== "bound") {
    wx.showModal({
      title: "保存经营档案",
      content: "使用该能力前请先绑定手机号以保存餐厅档案（不是注册门槛）。",
      confirmText: "去绑定",
      success: function (res) {
        if (res.confirm) {
          shellNav.goMe();
        }
      },
    });
    return { ok: false, needBind: true };
  }

  const ctx = context.injectContext(
    (manifest.miniUi && manifest.miniUi.contextKeys) || null,
  );
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.agentContext = ctx;
    app.globalData.activeAgentId = agentId;
  }

  const sku =
    (manifest.billing &&
      manifest.billing.skus &&
      manifest.billing.skus[0]) ||
    null;
  const bill = wallet.charge(sku, {
    blockFirstValue: !!(manifest.billing && manifest.billing.blockFirstValue),
  });
  if (app && app.globalData) {
    app.globalData.lastCharge = bill;
  }

  const route =
    (manifest.miniUi && manifest.miniUi.entryRoute) ||
    "/shell/pages/home/home";
  const qs = Object.keys(params)
    .map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    })
    .join("&");
  const url = qs ? route + "?" + qs : route;

  wx.navigateTo({
    url: url,
    fail: function () {
      wx.reLaunch({ url: url });
    },
  });

  return { ok: true, context: ctx, billing: bill, manifest: manifest };
}

module.exports = {
  openAgent: openAgent,
};
