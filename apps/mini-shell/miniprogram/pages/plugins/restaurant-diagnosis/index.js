const { persistRestaurant } = require("../../../services/session");
const { openPlugin, handlePluginEvent } = require("../../../services/plugin-host");

Page({
  data: {
    step: "intake",
    name: "湘味小馆",
    city: "长沙",
    category: "湘菜",
    loading: false,
    restaurantName: "",
    findings: [],
    shellContext: null,
    handoffUrl: "",
  },

  onName(e) {
    this.setData({ name: e.detail.value });
  },
  onCity(e) {
    this.setData({ city: e.detail.value });
  },
  onCategory(e) {
    this.setData({ category: e.detail.value });
  },

  async onRun() {
    const name = (this.data.name || "").trim();
    const city = (this.data.city || "").trim();
    const category = (this.data.category || "").trim();
    if (!name || !city || !category) {
      wx.showToast({ title: "请填齐最少信息", icon: "none" });
      return;
    }

    this.setData({ loading: true });
    const restaurant = {
      localProfileId: `rp_${Date.now().toString(36)}`,
      name,
      city,
      category,
    };
    persistRestaurant(restaurant);

    const opened = await openPlugin("restaurant-diagnosis");
    if (!opened.ok) {
      this.setData({ loading: false });
      wx.showToast({ title: opened.message || "无法打开插件", icon: "none" });
      return;
    }

    handlePluginEvent({ type: "fuel.spend_confirmed", costPoints: 100 });
    handlePluginEvent({
      type: "run.progress",
      message: "正在基于公开线索形成体检摘要…",
    });

    // S2：Shell 内原生首屏价值；完整引擎仍在外置 M-OPS（web-view / Gateway 后续加深）
    const findings = [
      {
        title: "顾客等待相关评价偏多",
        body: "公开评价中与「等待 / 上菜慢」相关表述反复出现，值得作为今日关注项。",
        evidence: "证据：评价主题聚合（预览）· 完整链在经营大脑",
      },
      {
        title: "聚餐场景口碑是优势",
        body: "「适合朋友聚餐 / 气氛」类表述相对稳定，可作为差异化保留项。",
        evidence: "证据：正向主题（预览）",
      },
      {
        title: "区域竞争需持续跟踪",
        body: "同类供给变化会影响客流，单次体检只能给方向，不能替代日扫。",
        evidence: "缺口：需接入日更信号",
      },
    ];

    handlePluginEvent({ type: "run.completed", invokeId: opened.context.invokeId });

    this.setData({
      loading: false,
      step: "report",
      restaurantName: name,
      city,
      category,
      findings,
      shellContext: opened.context,
      handoffUrl: opened.handoffUrl || "http://127.0.0.1:3000/dashboard",
    });
  },

  onHandoff() {
    handlePluginEvent({
      type: "handoff.brain",
      reason: "upgrade",
      url: this.data.handoffUrl,
    });
  },

  onPersist() {
    const app = getApp();
    if (app.globalData.session && app.globalData.session.status === "guest") {
      handlePluginEvent({ type: "auth.bind_phone", reason: "persist_profile" });
      return;
    }
    wx.showToast({ title: "报告已关联档案", icon: "success" });
  },
});
