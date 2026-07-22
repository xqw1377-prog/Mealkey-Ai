Page({
  data: {
    featured: null,
  },

  onShow() {
    const app = getApp();
    const catalog = app.globalData.catalog || [];
    const featured = catalog.find((x) => x.featured) || catalog[0] || null;
    this.setData({ featured });
  },

  onStartFeatured() {
    const featured = this.data.featured;
    if (!featured) return;
    wx.navigateTo({
      url: featured.entryPath || "/pages/plugins/restaurant-diagnosis/index",
    });
  },

  goCapabilities() {
    wx.switchTab({ url: "/pages/capabilities/index" });
  },
});
