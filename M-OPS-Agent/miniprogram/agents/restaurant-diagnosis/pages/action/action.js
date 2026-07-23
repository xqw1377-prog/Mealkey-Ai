const routes = require("../../routes.js");
const actionCard = require("../../utils/action-card.js");

Page({
  data: {
    ready: false,
    restaurantName: "",
    bossBrief: "",
    weekAction: "",
    validations: [],
    shareText: "",
  },

  onShow() {
    const app = getApp();
    const result = app.globalData.lastResult;
    const profile = app.globalData.lastProfile;
    if (!result || !result.consultation) {
      this.setData({ ready: false });
      return;
    }
    const card = actionCard.buildActionCard(profile, result);
    this.setData({
      ready: true,
      restaurantName: card.restaurantName,
      bossBrief: card.bossBrief,
      weekAction: card.weekAction,
      validations: card.validations,
      shareText: card.shareText,
    });
  },

  copyShare() {
    wx.setClipboardData({
      data: this.data.shareText,
      success: function () {
        wx.showToast({ title: "已复制，可发到群/备忘", icon: "none" });
      },
    });
  },

  backReport() {
    wx.navigateBack({
      fail: function () {
        routes.go("report");
      },
    });
  },

  goHome() {
    routes.goShellHome();
  },
});
