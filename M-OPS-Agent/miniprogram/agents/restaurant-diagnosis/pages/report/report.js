const routes = require("../../routes.js");
const mealkey = require("../../../../shell/mealkey-cta.js");
const diagnose = require("../../utils/diagnose.js");
const handoff = require("../../utils/handoff.js");
const remind = require("../../utils/remind.js");

Page({
  data: {
    ready: false,
    showDetail: false,
    restaurantName: "",
    overallVerdict: "",
    bossBrief: "",
    weekAction: "",
    packTip: "",
    consensus: "",
    priorities: [],
    modules: [],
    experts: [],
    deltaLines: [],
    dnaHas: false,
    dnaSummary: "",
    dnaWeights: [],
    needsDeepUpgrade: false,
    categoryTip: "",
    remindLabel: "",
    remindDue: false,
  },

  onShow() {
    const app = getApp();
    const result = app.globalData.lastResult;
    const profile = app.globalData.lastProfile;
    if (!result || !result.consultation) {
      this.setData({ ready: false });
      return;
    }
    const remindInfo = remind.remindStatus();
    const c = result.consultation;
    const priorities = c.priorities || [];
    const weekAction =
      priorities.find(function (p) {
        return !/^验证\/处置/.test(p);
      }) ||
      priorities[0] ||
      "先补齐日×餐段账本，再做下一轮体检";

    const delta = result._deltaBrief || app.globalData.lastDelta;
    const dna =
      result._dna ||
      diagnose.evolutionForUi(profile && profile.name);

    const weights = (dna.weights || []).map(function (w) {
      const pct = Math.min(100, Math.round((Number(w.weight) || 1) * 50));
      return {
        theme: w.theme,
        label: w.label,
        pct: pct,
      };
    });

    this.setData({
      ready: true,
      showDetail: false,
      restaurantName: c.restaurantName || (profile && profile.name) || "门店",
      overallVerdict: c.overallVerdict || "",
      bossBrief: c.bossBrief || (c.executiveSummary && c.executiveSummary[0]) || "",
      weekAction: weekAction.replace(/（盯 #[^）]+）/g, ""),
      packTip: app.globalData.lastPackTip || "",
      consensus: c.consensus || "",
      priorities: priorities,
      modules: (c.modules || []).map((m) => ({
        id: m.id,
        no: m.no,
        title: m.title,
        summary: m.summary,
        bullets: (m.bullets || []).slice(0, 8),
      })),
      experts: (c.experts || []).map((e) => ({
        role: e.role,
        title: e.title,
        level: e.level,
        verdict: e.refused
          ? "拒签：" + (e.refuseReason || "数据不足")
          : e.verdict,
      })),
      deltaLines: (delta && delta.lines) || [],
      dnaHas: !!(dna && dna.has),
      dnaSummary: (dna && dna.summary) || "",
      dnaWeights: weights,
      needsDeepUpgrade: !!result._needsDeepUpgrade,
      categoryTip: result._categoryTip || "",
      remindLabel: remindInfo.label,
      remindDue: !!remindInfo.due,
    });
  },

  toggleDetail() {
    this.setData({ showDetail: !this.data.showDetail });
  },

  goLearn() {
    routes.go("learn");
  },

  goAction() {
    routes.go("action");
  },

  goArchive() {
    routes.go("archive");
  },

  goDeepImport() {
    routes.go("import");
  },

  goEnhance() {
    routes.go("enhance");
  },

  exportHandoff() {
    const app = getApp();
    const result = app.globalData.lastResult;
    const profile = app.globalData.lastProfile;
    if (!result) {
      wx.showToast({ title: "暂无报告", icon: "none" });
      return;
    }
    handoff
      .copyHandoffPackage(profile, result)
      .then(function () {
        wx.showToast({ title: "交接包已复制", icon: "none" });
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
      self.setData({
        remindLabel: status.label,
        remindDue: !!status.due,
      });
      wx.showToast({
        title: (r && r.message) || "已设置 7 天复检",
        icon: "none",
      });
    });
  },

  downloadApp() {
    mealkey.promptEnterBrain();
  },

  goHome() {
    routes.goShellHome();
  },
});
