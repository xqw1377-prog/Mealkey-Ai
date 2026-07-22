const { createGuestSession } = require("./services/session");

App({
  globalData: {
    apiBase: "", // set in onLaunch from storage /默认本地
    session: null,
    restaurant: null,
    fuelBalance: 500,
    catalog: [],
  },

  onLaunch() {
    const storedBase = wx.getStorageSync("mk_api_base");
    this.globalData.apiBase =
      storedBase || "http://127.0.0.1:3000/api/v1/mini-shell";

    const existing = wx.getStorageSync("mk_shell_session");
    if (existing && existing.userId) {
      this.globalData.session = existing;
      this.globalData.fuelBalance = existing.fuelBalance ?? 500;
      this.globalData.restaurant = wx.getStorageSync("mk_shell_restaurant") || null;
    } else {
      const guest = createGuestSession();
      this.globalData.session = guest;
      this.globalData.fuelBalance = guest.fuelBalance;
      wx.setStorageSync("mk_shell_session", guest);
    }

    this.refreshCatalog();
  },

  async refreshCatalog() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${this.globalData.apiBase}/catalog`,
          method: "GET",
          success: resolve,
          fail: reject,
        });
      });
      if (res.statusCode === 200 && res.data && res.data.items) {
        this.globalData.catalog = res.data.items;
        return;
      }
    } catch (_e) {
      // offline fallback below
    }
    this.globalData.catalog = [
      {
        agentId: "restaurant-diagnosis",
        title: "餐厅经营体检系统",
        subtitle: "看见经营异常与证据，把值得关注的变化推到你眼前",
        category: "ops",
        tags: ["餐启 Agent", "经营体检", "证据优先"],
        costPoints: 100,
        firstValueMinutes: 3,
        featured: true,
        entryPath: "/pages/plugins/restaurant-diagnosis/index",
      },
    ];
  },
});
