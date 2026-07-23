const handoff = require("../../utils/handoff.js");
const remind = require("../../utils/remind.js");
const mealkey = require("../../../../shell/mealkey-cta.js");

Page({
  data: {
    mpItems: [],
    mkItems: [],
    hasResult: false,
    remindLabel: "",
  },

  onShow() {
    const matrix = handoff.boundaryMatrix();
    const status = remind.remindStatus();
    const app = getApp();
    this.setData({
      mpItems: matrix.miniprogram,
      mkItems: matrix.mealkeyOnly,
      hasResult: !!(app.globalData.lastResult && app.globalData.lastResult.consultation),
      remindLabel: status.label,
    });
  },

  exportHandoff() {
    const app = getApp();
    const result = app.globalData.lastResult;
    const profile = app.globalData.lastProfile;
    if (!result) {
      wx.showToast({ title: "请先完成一次体检", icon: "none" });
      return;
    }
    handoff
      .copyHandoffPackage(profile, result)
      .then(function () {
        wx.showModal({
          title: "已复制交接证据包",
          content:
            "可在 Mealkey App 粘贴以增强档案。小程序体检本身已完整，此步可选。",
          showCancel: false,
        });
      })
      .catch(function () {
        wx.showToast({ title: "复制失败", icon: "none" });
      });
  },

  setRemind7() {
    const self = this;
    remind.scheduleRecheck(7);
    remind.requestSubscribeRecheck().then(function (r) {
      const status = remind.remindStatus();
      self.setData({ remindLabel: status.label });
      wx.showToast({
        title: (r && r.message) || "已设置 7 天复检",
        icon: "none",
      });
    });
  },

  clearRemind() {
    remind.clearRemind();
    this.setData({ remindLabel: remind.remindStatus().label });
    wx.showToast({ title: "已清除", icon: "none" });
  },

  downloadApp() {
    mealkey.promptEnterBrain();
  },
});
