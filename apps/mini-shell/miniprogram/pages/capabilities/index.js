Page({
  data: { items: [] },

  onShow() {
    const app = getApp();
    this.setData({ items: app.globalData.catalog || [] });
  },

  onOpen(e) {
    const path = e.currentTarget.dataset.path;
    if (!path) return;
    wx.navigateTo({ url: path });
  },
});
