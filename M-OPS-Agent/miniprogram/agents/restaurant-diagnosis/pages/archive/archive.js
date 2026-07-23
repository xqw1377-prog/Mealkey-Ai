const routes = require("../../routes.js");
const diagnose = require("../../utils/diagnose.js");

Page({
  data: { items: [] },

  onShow() {
    const items = diagnose.listArchiveMeta().map(function (e) {
      const modeMap = { quick: "浅检", deep: "深检", demo: "演示" };
      return Object.assign({}, e, {
        examModeLabel: modeMap[e.examMode] || e.examMode || "体检",
        atLabel: String(e.at || "").replace("T", " ").slice(0, 16),
        weekAction: (e.weekAction || "").replace(/（盯 #[^）]+）/g, "").slice(0, 40),
        bossBrief: (e.bossBrief || "").slice(0, 72),
      });
    });
    this.setData({ items: items });
  },

  openItem(e) {
    const id = e.currentTarget.dataset.id;
    const entry = diagnose.openArchiveEntry(id);
    if (!entry) {
      wx.showToast({ title: "档案无法打开", icon: "none" });
      return;
    }
    routes.go("report");
  },

  goExam() {
    routes.go("intake", { mode: "exam" });
  },
});
