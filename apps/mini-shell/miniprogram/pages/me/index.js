const { handlePluginEvent } = require("../../services/plugin-host");

Page({
  data: {
    statusLabel: "访客",
    fuelBalance: 0,
    restaurantName: "未建立",
  },

  onShow() {
    const app = getApp();
    const session = app.globalData.session || {};
    const map = { guest: "访客", bound: "已绑定", member: "会员" };
    this.setData({
      statusLabel: map[session.status] || "访客",
      fuelBalance: app.globalData.fuelBalance || 0,
      restaurantName: (app.globalData.restaurant && app.globalData.restaurant.name) || "未建立",
    });
  },

  onHandoff() {
    handlePluginEvent({ type: "handoff.brain", reason: "upgrade" });
  },

  onBindPhone() {
    wx.navigateTo({ url: "/pages/bind-phone/index" });
  },

  onInvite() {
    wx.showToast({
      title: "有效用户后双边奖励（S3）",
      icon: "none",
    });
  },
});
