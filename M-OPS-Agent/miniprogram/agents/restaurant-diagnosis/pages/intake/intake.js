const routes = require("../../routes.js");
const diagnose = require("../../utils/diagnose.js");

Page({
  data: {
    name: "",
    city: "",
    category: "",
    priceRange: "",
    focus: "why_down",
    focusOptions: [
      { id: "why_down", label: "为什么生意下降？" },
      { id: "peak", label: "高峰体验哪里出问题？" },
      { id: "menu", label: "菜单/毛利哪里不健康？" },
      { id: "overall", label: "先给我一份整体体检" },
    ],
    busy: false,
  },

  onLoad() {
    const app = getApp();
    const ctx = (app && app.globalData && app.globalData.agentContext) || {};
    const saved = diagnose.loadExamProfile() || {};
    this.setData({
      name: saved.name || ctx.name || "",
      city: saved.city || ctx.city || "",
      category: saved.category || ctx.category || "",
      priceRange: saved.priceRange || ctx.priceRange || "",
      focus: saved.focus || ctx.focus || "why_down",
    });
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
  onPrice(e) {
    this.setData({ priceRange: e.detail.value });
  },
  onFocus(e) {
    this.setData({ focus: e.detail.value });
  },

  profile() {
    return {
      name: this.data.name.trim() || "未命名门店",
      city: this.data.city.trim() || "本地",
      category: this.data.category.trim() || "餐饮",
      priceRange: this.data.priceRange.trim() || "人均待补充",
      focus: this.data.focus,
    };
  },

  nextImport() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: "请先填写店名", icon: "none" });
      return;
    }
    const profile = this.profile();
    diagnose.saveExamProfile(profile);
    routes.go("import");
  },

  runQuick() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    wx.showLoading({ title: "浅检中…", mask: true });
    try {
      const profile = this.profile();
      diagnose.saveExamProfile(profile);
      const out = diagnose.runDiagnosis(profile, "quick");
      diagnose.saveLast(out.profile || profile, out.result, { delta: out.delta });
      wx.hideLoading();
      this.setData({ busy: false });
      routes.go("report");
    } catch (e) {
      wx.hideLoading();
      this.setData({ busy: false });
      wx.showModal({
        title: "浅检失败",
        content: (e && e.message) || String(e),
        showCancel: false,
      });
    }
  },
});
