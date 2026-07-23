const routes = require("../../routes.js");
const paste = require("../../utils/paste-import.js");
const diagnose = require("../../utils/diagnose.js");
const templates = require("../../utils/templates.js");
const fileImport = require("../../utils/file-import.js");
const readiness = require("../../utils/readiness.js");
const externalPaste = require("../../utils/external-paste.js");

const SAMPLE_COMMENTS =
  "周末等位太久，上菜慢\n红烧肉很下饭会回购\n高峰排队劝退\n有点贵不太值\n环境有点吵";

Page({
  data: {
    name: "",
    city: "",
    category: "",
    dailyText: "",
    dishText: "",
    menuText: "",
    commentText: "",
    externalText: "",
    externalMetaLabel: "",
    externalWarnings: [],
    tagRows: [],
    dailyHelp: templates.DAILY_HELP,
    dishHelp: templates.DISH_HELP,
    menuHelp: templates.MENU_HELP,
    externalHelp: externalPaste.EXTERNAL_HELP,
    qcSummary: "",
    qcOk: [],
    qcHard: [],
    qcSoft: [],
    hardItems: [],
    softItems: [],
    hardPct: 0,
    softPct: 0,
    overallPct: 0,
    busy: false,
    error: "",
  },

  onShow() {
    const p = diagnose.loadExamProfile() || {};
    this.setData({
      name: p.name || this.data.name || "",
      city: p.city || "",
      category: p.category || "",
    });
  },

  onName(e) {
    this.setData({ name: e.detail.value });
  },
  onCategory(e) {
    this.setData({ category: e.detail.value });
  },
  onDaily(e) {
    this.setData({ dailyText: e.detail.value });
  },
  onDish(e) {
    this.setData({ dishText: e.detail.value });
  },
  onMenu(e) {
    this.setData({ menuText: e.detail.value });
  },
  onComment(e) {
    const commentText = e.detail.value;
    this.setData({ commentText: commentText });
    this._refreshTagPreview();
  },

  onExternal(e) {
    this.setData({ externalText: e.detail.value });
    this._refreshTagPreview();
  },

  _mergeEvidence() {
    const fromComments = diagnose.tagComments(this.data.commentText);
    const ext = externalPaste.parseExternalBlock(this.data.externalText);
    const fromExternal = ext.evidence || [];
    const seen = {};
    const merged = [];
    fromComments.concat(fromExternal).forEach(function (e) {
      const key = String((e && e.claim) || "").trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      merged.push(e);
    });
    return { evidence: merged, external: ext };
  },

  _refreshTagPreview() {
    const m = this._mergeEvidence();
    const meta = m.external.meta || {};
    const bits = [];
    if (meta.platform) bits.push("平台 " + meta.platform);
    if (meta.rating != null) bits.push("星级 " + meta.rating);
    if (meta.reviewCount != null) bits.push("评论数 " + meta.reviewCount);
    if (meta.storeName) bits.push(meta.storeName);
    this.setData({
      tagRows: m.evidence.slice(0, 12),
      externalMetaLabel: bits.join(" · "),
      externalWarnings: (m.external.warnings || []).filter(function (w) {
        return !/^未粘贴/.test(w);
      }),
    });
  },

  copyDailyTpl() {
    templates.copyText(templates.DAILY_TEMPLATE, "日明细模板已复制");
  },
  copyDishTpl() {
    templates.copyText(templates.DISH_TEMPLATE, "菜销模板已复制");
  },
  copyMenuTpl() {
    templates.copyText(templates.MENU_TEMPLATE, "菜单模板已复制");
  },

  fillDailySample() {
    this.setData({ dailyText: templates.DAILY_TEMPLATE });
  },
  fillDishSample() {
    this.setData({ dishText: templates.DISH_TEMPLATE });
  },
  fillMenuSample() {
    this.setData({ menuText: templates.MENU_TEMPLATE });
  },
  fillCommentSample() {
    this.setData({ commentText: SAMPLE_COMMENTS });
    this._refreshTagPreview();
  },

  fillExternalSample() {
    this.setData({ externalText: externalPaste.EXTERNAL_SAMPLE });
    this._refreshTagPreview();
  },

  pickDaily() {
    this._pick("daily");
  },
  pickDish() {
    this._pick("dish");
  },
  pickMenu() {
    this._pick("menu");
  },

  _pick(kind) {
    const self = this;
    fileImport
      .pickTextFile(kind)
      .then(function (text) {
        if (kind === "daily") self.setData({ dailyText: text });
        if (kind === "dish") self.setData({ dishText: text });
        if (kind === "menu") self.setData({ menuText: text });
        wx.showToast({ title: "已读入文件", icon: "none" });
      })
      .catch(function (err) {
        if (err && err.message === "cancel") return;
        wx.showToast({
          title: (err && err.message) || "选文件失败，请粘贴",
          icon: "none",
        });
      });
  },

  buildBundle() {
    const dailyText = this.data.dailyText;
    if (!String(dailyText || "").trim()) {
      throw new Error("请先导入或粘贴日×餐段明细");
    }
    const daily = paste.parseDailyText(dailyText);
    let sales = { rows: [] };
    let menu = { rows: [] };
    if (String(this.data.dishText || "").trim()) {
      sales = paste.parseDishText(this.data.dishText);
    }
    if (String(this.data.menuText || "").trim()) {
      menu = paste.parseMenuText(this.data.menuText);
    }
    const merged = this._mergeEvidence();
    const evidence = merged.evidence;
    const extWarn = (merged.external.warnings || []).filter(function (w) {
      return !/^未粘贴/.test(w) && !/^未填星级/.test(w);
    });
    return {
      daily: daily.rows,
      sales: sales.rows,
      menu: menu.rows,
      evidence: evidence,
      externalMeta: merged.external.meta || null,
      useDemoEvidence: evidence.length === 0,
      parseWarnings: (daily.warnings || []).concat(extWarn),
    };
  },

  refreshQc() {
    try {
      this.setData({ error: "" });
      const bundle = this.buildBundle();
      const gauge = readiness.buildReadinessGauge(bundle);
      this.setData({
        tagRows: (bundle.evidence || []).slice(0, 12),
        qcSummary: gauge.summary,
        qcOk: gauge.qc.okHints,
        qcHard: gauge.qc.hard,
        qcSoft: gauge.qc.soft.concat(bundle.parseWarnings || []),
        hardItems: gauge.hardItems,
        softItems: gauge.softItems,
        hardPct: gauge.hardPct,
        softPct: gauge.softPct,
        overallPct: gauge.overallPct,
      });
    } catch (e) {
      this.setData({
        error: (e && e.message) || String(e),
        qcSummary: "",
        qcOk: [],
        qcHard: [],
        qcSoft: [],
        hardItems: [],
        softItems: [],
        hardPct: 0,
        softPct: 0,
        overallPct: 0,
      });
    }
  },

  clearImport() {
    diagnose.saveImportBundle(null);
    wx.showToast({ title: "已清除", icon: "none" });
  },

  runImport() {
    if (this.data.busy) return;
    this.setData({ busy: true, error: "" });
    try {
      const bundle = this.buildBundle();
      const gauge = readiness.buildReadinessGauge(bundle);
      const qc = gauge.qc;
      this.setData({
        tagRows: (bundle.evidence || []).slice(0, 12),
        qcSummary: gauge.summary,
        qcOk: qc.okHints,
        qcHard: qc.hard,
        qcSoft: qc.soft,
        hardItems: gauge.hardItems,
        softItems: gauge.softItems,
        hardPct: gauge.hardPct,
        softPct: gauge.softPct,
        overallPct: gauge.overallPct,
      });

      if (!qc.canDeepFinance) {
        this.setData({ busy: false });
        wx.showModal({
          title: "硬门槛未齐",
          content: qc.hard[0] || "日明细不足，财务官将拒签。仍要继续吗？",
          confirmText: "仍要出报告",
          cancelText: "去补数",
          success: (res) => {
            if (res.confirm) this._diagnose(bundle);
          },
        });
        return;
      }

      this._diagnose(bundle);
    } catch (e) {
      this.setData({
        busy: false,
        error: (e && e.message) || String(e),
      });
    }
  },

  _diagnose(bundle) {
    try {
      diagnose.saveImportBundle(bundle);
      const profile = {
        name: this.data.name.trim() || "未命名门店",
        city: (diagnose.loadExamProfile() || {}).city || "本地",
        category: this.data.category.trim() || "餐饮",
        priceRange: (diagnose.loadExamProfile() || {}).priceRange || "导入账本",
        focus: (diagnose.loadExamProfile() || {}).focus,
      };
      diagnose.saveExamProfile(profile);
      const out = diagnose.runDiagnosis(profile, "deep", {
        importBundle: bundle,
      });
      diagnose.saveLast(out.profile || profile, out.result, { delta: out.delta });
      this.setData({ busy: false });
      routes.go("report");
    } catch (e) {
      this.setData({
        busy: false,
        error: (e && e.message) || String(e),
      });
    }
  },
});
