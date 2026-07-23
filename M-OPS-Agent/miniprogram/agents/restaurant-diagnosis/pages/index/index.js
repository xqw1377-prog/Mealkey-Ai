const diagnose = require("../../utils/diagnose.js");
const mealkey = require("../../../../shell/mealkey-cta.js");
const remind = require("../../utils/remind.js");
const routes = require("../../routes.js");

Page({
  data: {
    showDemo: false,
    packId: "xiangcai",
    packTip: "",
    hasArchive: false,
    lastVerdict: "",
    lastAt: "",
    remindDue: false,
    remindLabel: "",
    restaurantHint: "",
  },

  onShow() {
    const list = diagnose.listPacks();
    const tip = (list.find((p) => p.id === "xiangcai") || {}).tip || "";
    const snap = diagnose.loadSnapshot();
    const remindInfo = remind.remindStatus();
    const app = getApp();
    const ctx = (app && app.globalData && app.globalData.agentContext) || {};
    this.setData({
      packTip: tip,
      hasArchive: !!(snap && snap.overallVerdict),
      lastVerdict: (snap && snap.overallVerdict) || "",
      lastAt: snap && snap.at ? String(snap.at).slice(0, 10) : "",
      remindDue: !!remindInfo.due,
      remindLabel: remindInfo.label,
      restaurantHint: ctx.name
        ? ctx.name + (ctx.city ? " · " + ctx.city : "")
        : "",
    });
  },

  toggleDemo() {
    this.setData({ showDemo: !this.data.showDemo });
  },

  pickPack(e) {
    const id = e.currentTarget.dataset.id;
    const list = diagnose.listPacks();
    const tip = (list.find((p) => p.id === id) || {}).tip || "";
    this.setData({ packId: id, packTip: tip });
  },

  goMyExam() {
    routes.go("intake", { mode: "exam" });
  },

  goImport() {
    routes.go("import");
  },

  goArchive() {
    routes.go("archive");
  },

  goEnhance() {
    routes.go("enhance");
  },

  goDemo() {
    wx.showLoading({ title: "演示体检中…", mask: true });
    try {
      const out = diagnose.runDiagnosis(null, "deep", {
        packId: this.data.packId,
        allowSynthetic: true,
      });
      diagnose.saveLast(out.profile, out.result, {
        packTip: out.packTip,
        delta: out.delta,
      });
      wx.hideLoading();
      routes.go("report");
    } catch (e) {
      wx.hideLoading();
      wx.showModal({
        title: "体检失败",
        content: (e && e.message) || String(e),
        showCancel: false,
      });
    }
  },

  downloadApp() {
    mealkey.promptEnterBrain();
  },

  goShell() {
    routes.goShellHome();
  },
});
