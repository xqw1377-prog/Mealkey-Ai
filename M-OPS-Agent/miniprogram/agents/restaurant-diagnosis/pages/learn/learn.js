const routes = require("../../routes.js");
const diagnose = require("../../utils/diagnose.js");
const mealkey = require("../../../../shell/mealkey-cta.js");

Page({
  data: {
    ready: false,
    items: [],
    evoSummary: "",
    weights: [],
    busy: false,
  },

  refreshDna() {
    const profile = getApp().globalData.lastProfile || {};
    const dna = diagnose.evolutionForUi(profile.name);
    const weights = (dna.weights || []).map(function (w) {
      return {
        theme: w.theme,
        label: w.label,
        pct: Math.min(100, Math.round((Number(w.weight) || 1) * 50)),
      };
    });
    this.setData({
      evoSummary: dna.summary || "",
      weights: weights,
    });
  },

  onShow() {
    const app = getApp();
    const result = app.globalData.lastResult;
    if (!result || !(result.learningDraft || []).length) {
      this.setData({ ready: false });
      return;
    }
    const saved = diagnose.loadLearnings();
    const byHyp = {};
    for (let i = 0; i < saved.length; i++) {
      byHyp[saved[i].hypothesis] = saved[i];
    }
    const items = (result.learningDraft || []).slice(0, 6).map(function (d, idx) {
      const prev = byHyp[d.hypothesis];
      return {
        id: String(idx),
        diagnosisId: d.diagnosisId || "mp-" + idx,
        hypothesis: d.hypothesis,
        action: d.action,
        expectedOutcome: d.expectedOutcome,
        themes: d.themes,
        polarity: (prev && prev.polarity) || "unknown",
      };
    });
    this.setData({ ready: true, items: items });
    this.refreshDna();
  },

  setPolarity(e) {
    const id = e.currentTarget.dataset.id;
    const polarity = e.currentTarget.dataset.polarity;
    const items = this.data.items.map(function (item) {
      if (item.id === id) return Object.assign({}, item, { polarity: polarity });
      return item;
    });
    this.setData({ items: items });
  },

  commit() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      const learnings = this.data.items.map(function (item) {
        const polarity = item.polarity || "unknown";
        return {
          diagnosisId: item.diagnosisId,
          hypothesis: item.hypothesis,
          action: item.action,
          expectedOutcome: item.expectedOutcome,
          themes: item.themes,
          polarity: polarity,
          actualOutcome:
            polarity === "confirmed"
              ? "验证成立"
              : polarity === "rejected"
                ? "不成立"
                : "尚不确定",
          lesson:
            polarity === "confirmed"
              ? "老板确认该假设成立，后续优先加权"
              : polarity === "rejected"
                ? "老板否定该假设，后续降权"
                : "",
          verifiedAt: new Date().toISOString(),
        };
      });
      diagnose.applyLearningFeedback(learnings);
      const profile = getApp().globalData.lastProfile || {
        name: "未命名门店",
        city: "本地",
        category: "餐饮",
      };
      const out = diagnose.runDiagnosis(profile, "deep", {
        previousLearnings: learnings,
        // 有导入用真数；无导入（演示路径）允许按品类包复扫
        allowSynthetic: !diagnose.loadImportBundle(),
      });
      out.result._dna = diagnose.evolutionForUi(profile.name);
      diagnose.saveLast(out.profile || profile, out.result, { delta: out.delta });
      this.setData({ busy: false });
      this.refreshDna();
      wx.showToast({ title: "已加权并复扫", icon: "success" });
      setTimeout(function () {
        routes.go("report");
      }, 400);
    } catch (e) {
      this.setData({ busy: false });
      wx.showModal({
        title: "回填失败",
        content: (e && e.message) || String(e),
        showCancel: false,
      });
    }
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

  downloadApp() {
    mealkey.promptEnterBrain();
  },
});
