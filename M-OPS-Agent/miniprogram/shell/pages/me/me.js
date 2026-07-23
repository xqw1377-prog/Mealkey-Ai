const auth = require("../../../shell/auth.js");
const wallet = require("../../../shell/wallet.js");
const mealkey = require("../../../shell/mealkey-cta.js");
const referral = require("../../../shell/referral.js");
const cloudSync = require("../../../shell/cloud-sync.js");
const nav = require("../../../shell/nav.js");

Page({
  data: {
    nickName: "",
    levelLabel: "",
    authMode: "",
    balance: 0,
    phone: "",
    ledger: [],
    inviteCode: "",
    invitedBy: "",
    qualified: false,
    inviteeCount: 0,
    syncPending: 0,
  },

  refresh() {
    const s = auth.ensureGuest();
    const w = wallet.ensureWallet();
    const ref = referral.status();
    this.setData({
      nickName: s.nickName || "微信用户",
      levelLabel: s.level === "bound" ? "已绑定（可存档）" : "Guest / 微信身份",
      authMode: s.authMode || "guest",
      balance: w.balance,
      phone: s.phone && s.phone !== "微信授权手机号" ? s.phone : "",
      ledger: (w.ledger || []).slice(0, 12).map(function (row) {
        return {
          at: String(row.at || "").slice(0, 16).replace("T", " "),
          delta: row.delta > 0 ? "+" + row.delta : String(row.delta),
          note: row.note || row.reason || "",
        };
      }),
      inviteCode: ref.myCode,
      invitedBy: ref.invitedBy,
      qualified: ref.qualified,
      inviteeCount: ref.inviteeCount,
      syncPending: cloudSync.pendingCount(),
    });
  },

  onShow() {
    this.refresh();
  },

  doLogin() {
    const self = this;
    auth.loginWithWechat().then(function (r) {
      self.refresh();
      wx.showToast({
        title: r.mode === "wechat" ? "微信登录成功" : "已取得登录码（待接后端）",
        icon: "none",
      });
    });
  },

  onPhone(e) {
    this.setData({ phone: e.detail.value });
  },

  bindPhone() {
    auth.bindPhone(this.data.phone);
    this.refresh();
    wx.showToast({ title: "档案绑定已保存", icon: "none" });
  },

  onGetPhoneNumber(e) {
    const self = this;
    auth.onGetPhoneNumber(e).then(function (r) {
      self.refresh();
      wx.showToast({
        title: (r && r.message) || (r.ok ? "已授权" : "未授权"),
        icon: "none",
      });
    });
  },

  copyInvite() {
    referral.copyInviteText().then(function () {
      wx.showToast({ title: "邀请文案已复制", icon: "none" });
    });
  },

  settleInvite() {
    const r = referral.settleOutboxAsInviter();
    this.refresh();
    wx.showToast({
      title: r.paid ? "已结算 " + r.paid + " 笔邀请奖" : "暂无待结算",
      icon: "none",
    });
  },

  flushSync() {
    const self = this;
    cloudSync.flush().then(function (r) {
      self.refresh();
      wx.showToast({
        title: "同步 " + r.mode + " · 待推 " + r.pending,
        icon: "none",
      });
    });
  },

  enterBrain() {
    mealkey.promptEnterBrain();
  },

  goHome() {
    nav.goHome();
  },
});
