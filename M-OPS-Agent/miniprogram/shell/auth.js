/**
 * Shell · 微信身份（wx.login 可接线；无后端时 code_only / guest 降级）
 */
const SESSION_KEY = "mk_shell_session";
const config = require("./config.js");

function loadSession() {
  try {
    return wx.getStorageSync(SESSION_KEY) || null;
  } catch (e) {
    return null;
  }
}

function saveSession(session) {
  try {
    wx.setStorageSync(SESSION_KEY, session);
  } catch (e) {
    console.warn("[shell] session save fail", e);
  }
  try {
    const app = getApp();
    if (app && app.globalData) app.globalData.session = session;
  } catch (e) {}
}

function ensureGuest() {
  let s = loadSession();
  if (s && s.userId) return s;
  s = {
    level: "guest",
    userId: "guest_" + Date.now().toString(36),
    nickName: "微信用户",
    avatarUrl: "",
    openid: "",
    unionid: "",
    phone: "",
    wxCode: "",
    authMode: "guest",
    createdAt: new Date().toISOString(),
  };
  saveSession(s);
  return s;
}

function authLevel() {
  const s = loadSession();
  if (!s) return "none";
  return s.level || "guest";
}

function exchangeCode(code) {
  const api = config.cfg().authApiUrl;
  if (!api || !code || !wx.request) {
    return Promise.resolve(null);
  }
  return new Promise(function (resolve) {
    wx.request({
      url: String(api).replace(/\/?$/, "") + "/wechat/session",
      method: "POST",
      data: { code: code },
      timeout: 8000,
      success: function (res) {
        resolve((res && res.data) || null);
      },
      fail: function () {
        resolve(null);
      },
    });
  });
}

/** 启动时调用：wx.login → 可选换票 */
function loginWithWechat() {
  return new Promise(function (resolve) {
    const base = ensureGuest();
    if (typeof wx === "undefined" || !wx.login) {
      base.authMode = "guest";
      saveSession(base);
      resolve({ ok: true, mode: "guest", session: base });
      return;
    }
    wx.login({
      success: function (res) {
        const code = (res && res.code) || "";
        base.wxCode = code;
        base.loginAt = new Date().toISOString();
        exchangeCode(code).then(function (data) {
          if (data && (data.openid || data.userId)) {
            base.openid = data.openid || base.openid;
            base.unionid = data.unionid || base.unionid;
            if (data.userId) base.userId = data.userId;
            if (data.nickName) base.nickName = data.nickName;
            base.authMode = "wechat";
            if (base.level === "guest") base.level = "guest";
          } else {
            base.authMode = code ? "code_only" : "guest";
          }
          saveSession(base);
          resolve({ ok: true, mode: base.authMode, session: base });
        });
      },
      fail: function () {
        base.authMode = "guest";
        saveSession(base);
        resolve({ ok: true, mode: "guest", session: base });
      },
    });
  });
}

function updateProfile(partial) {
  const s = ensureGuest();
  if (partial.nickName) s.nickName = partial.nickName;
  if (partial.avatarUrl) s.avatarUrl = partial.avatarUrl;
  saveSession(s);
  return s;
}

function bindPhone(phone, meta) {
  meta = meta || {};
  const s = ensureGuest();
  s.level = "bound";
  s.phone = String(phone || "").trim() || s.phone || "已授权";
  s.boundAt = new Date().toISOString();
  if (meta.cloudId) s.phoneCloudId = meta.cloudId;
  saveSession(s);
  return s;
}

/** 兼容旧名 */
function bindPhoneStub(phone) {
  return bindPhone(phone);
}

function onGetPhoneNumber(e) {
  const detail = (e && e.detail) || {};
  if (detail.errMsg && detail.errMsg.indexOf("ok") < 0) {
    return Promise.resolve({ ok: false, message: "未授权手机号" });
  }
  // 无云解密时：标记已授权，引导手填（心理：保存档案）
  if (detail.cloudID || detail.encryptedData) {
    const s = bindPhone("微信授权手机号", {
      cloudId: detail.cloudID || "",
    });
    return Promise.resolve({
      ok: true,
      session: s,
      message: "已记录授权；可补全号码以便同步档案",
      needManualPhone: !s.phone || s.phone === "微信授权手机号",
    });
  }
  return Promise.resolve({ ok: false, message: "未取得手机号凭证" });
}

module.exports = {
  loadSession: loadSession,
  ensureGuest: ensureGuest,
  authLevel: authLevel,
  loginWithWechat: loginWithWechat,
  updateProfile: updateProfile,
  bindPhone: bindPhone,
  bindPhoneStub: bindPhoneStub,
  onGetPhoneNumber: onGetPhoneNumber,
};
