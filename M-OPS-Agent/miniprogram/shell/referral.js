/**
 * Shell · 经营合伙人（有效邀请才发奖）
 * 有效 = Guest/授权 + 建档 + 完成首次诊断
 */
const REF_KEY = "mk_shell_referral";
const wallet = require("./wallet.js");
const auth = require("./auth.js");

const REWARD_L1 = 100;
const REWARD_L2 = 20;

function loadRef() {
  try {
    return (
      wx.getStorageSync(REF_KEY) || {
        myCode: "",
        invitedBy: "",
        invitedByL2: "",
        qualified: false,
        rewardedAsInvitee: false,
        invitees: [],
      }
    );
  } catch (e) {
    return {
      myCode: "",
      invitedBy: "",
      invitedByL2: "",
      qualified: false,
      rewardedAsInvitee: false,
      invitees: [],
    };
  }
}

function saveRef(r) {
  try {
    wx.setStorageSync(REF_KEY, r);
  } catch (e) {}
  try {
    const app = getApp();
    if (app && app.globalData) app.globalData.referral = r;
  } catch (e) {}
}

function ensureMyCode() {
  const r = loadRef();
  if (r.myCode) return r;
  const s = auth.ensureGuest();
  r.myCode = "MK" + String(s.userId || "").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  if (r.myCode.length < 4) r.myCode = "MK" + Date.now().toString(36).toUpperCase();
  saveRef(r);
  return r;
}

/** 启动参数 ?inviter=CODE */
function captureInviter(query) {
  const code = (query && (query.inviter || query.ref)) || "";
  if (!code) return loadRef();
  const r = ensureMyCode();
  if (r.myCode && String(code).toUpperCase() === r.myCode) return r;
  if (!r.invitedBy) {
    r.invitedBy = String(code).toUpperCase();
    r.capturedAt = new Date().toISOString();
    saveRef(r);
  }
  return r;
}

function status() {
  const r = ensureMyCode();
  return {
    myCode: r.myCode,
    invitedBy: r.invitedBy || "",
    qualified: !!r.qualified,
    inviteeCount: (r.invitees || []).length,
    rewardL1: REWARD_L1,
    rewardL2: REWARD_L2,
    sharePath:
      "/shell/pages/home/home?inviter=" + encodeURIComponent(r.myCode),
  };
}

/**
 * 首次有效诊断后调用（由 Agent publishRun 触发）
 */
function onQualifiedDiagnosis(meta) {
  meta = meta || {};
  const r = ensureMyCode();
  if (r.qualified) {
    return { ok: true, already: true };
  }
  r.qualified = true;
  r.qualifiedAt = new Date().toISOString();
  r.qualifiedAgentId = meta.agentId || "restaurant-diagnosis";
  r.restaurantName = meta.restaurantName || "";

  const grants = [];
  // 被邀请人奖励（有效完诊）
  if (r.invitedBy && !r.rewardedAsInvitee) {
    wallet.credit(REWARD_L1, {
      reason: "referral_invitee",
      note: "有效完诊奖励（被邀请）",
    });
    r.rewardedAsInvitee = true;
    grants.push({ who: "invitee", amount: REWARD_L1 });
  }

  // 记录本地「我邀请的人」——邀请人端需在其设备结算；此处写 pendingOutbox 供同步
  if (r.invitedBy) {
    r.pendingInviterReward = {
      inviterCode: r.invitedBy,
      amount: REWARD_L1,
      at: r.qualifiedAt,
    };
  }
  saveRef(r);

  // 本机若用同一码模拟邀请人账本（开发自测）：写入 outbox
  try {
    const outboxKey = "mk_shell_referral_outbox";
    const box = wx.getStorageSync(outboxKey) || [];
    if (r.pendingInviterReward) {
      box.unshift(r.pendingInviterReward);
      wx.setStorageSync(outboxKey, box.slice(0, 50));
    }
  } catch (e) {}

  return { ok: true, qualified: true, grants: grants, referral: r };
}

/** 开发/同机：结算 outbox 给当前用户（若 code 匹配） */
function settleOutboxAsInviter() {
  const r = ensureMyCode();
  let box = [];
  try {
    box = wx.getStorageSync("mk_shell_referral_outbox") || [];
  } catch (e) {
    box = [];
  }
  let paid = 0;
  const remain = [];
  box.forEach(function (item) {
    if (item.inviterCode === r.myCode && !item.paid) {
      wallet.credit(item.amount || REWARD_L1, {
        reason: "referral_inviter",
        note: "有效邀请奖励",
      });
      paid += 1;
      r.invitees = r.invitees || [];
      r.invitees.unshift({
        at: item.at,
        amount: item.amount || REWARD_L1,
      });
    } else {
      remain.push(item);
    }
  });
  try {
    wx.setStorageSync("mk_shell_referral_outbox", remain);
  } catch (e) {}
  saveRef(r);
  return { paid: paid, balance: wallet.getBalance() };
}

function copyInviteText() {
  const st = status();
  const text =
    "帮你免费测一次餐厅经营（MealKey）\n邀请码：" +
    st.myCode +
    "\n有效完诊双方各得 Token 奖励。";
  return new Promise(function (resolve, reject) {
    wx.setClipboardData({
      data: text,
      success: function () {
        resolve(text);
      },
      fail: reject,
    });
  });
}

module.exports = {
  REWARD_L1: REWARD_L1,
  REWARD_L2: REWARD_L2,
  ensureMyCode: ensureMyCode,
  captureInviter: captureInviter,
  status: status,
  onQualifiedDiagnosis: onQualifiedDiagnosis,
  settleOutboxAsInviter: settleOutboxAsInviter,
  copyInviteText: copyInviteText,
  loadRef: loadRef,
};
