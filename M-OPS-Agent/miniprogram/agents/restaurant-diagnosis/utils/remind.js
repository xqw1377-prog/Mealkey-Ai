/**
 * 复检提醒：本机到期提示 + 微信订阅消息占位（需配置 tmplId）
 */
const REMIND_KEY = "mops_recheck_remind";

function loadRemind() {
  try {
    return wx.getStorageSync(REMIND_KEY) || null;
  } catch (e) {
    return null;
  }
}

function saveRemind(data) {
  try {
    wx.setStorageSync(REMIND_KEY, data);
  } catch (e) {
    console.warn("[m-ops] remind save fail", e);
  }
}

function clearRemind() {
  try {
    wx.removeStorageSync(REMIND_KEY);
  } catch (e) {}
}

/** 默认 7 天后复检 */
function scheduleRecheck(days) {
  const d = typeof days === "number" ? days : 7;
  const due = Date.now() + d * 24 * 60 * 60 * 1000;
  const data = {
    enabled: true,
    days: d,
    dueAt: new Date(due).toISOString(),
    createdAt: new Date().toISOString(),
  };
  saveRemind(data);
  return data;
}

function remindStatus() {
  const r = loadRemind();
  if (!r || !r.enabled || !r.dueAt) {
    return { enabled: false, due: false, label: "未设置复检提醒" };
  }
  const dueMs = new Date(r.dueAt).getTime();
  const due = Date.now() >= dueMs;
  const dateLabel = String(r.dueAt).slice(0, 10);
  return {
    enabled: true,
    due: due,
    dueAt: r.dueAt,
    days: r.days,
    label: due
      ? "已到复检日（" + dateLabel + "），建议导入新数据再诊"
      : "下次复检：" + dateLabel + "（约 " + r.days + " 天周期）",
  };
}

/**
 * 申请订阅消息（需在微信后台配置模板；未配置则仅本机提醒）
 * globalData.recheckSubscribeTmplIds = ['xxx']
 */
function requestSubscribeRecheck() {
  return new Promise(function (resolve) {
    const app = getApp();
    const tmplIds =
      (app && app.globalData && app.globalData.recheckSubscribeTmplIds) || [];
    if (!tmplIds.length || !wx.requestSubscribeMessage) {
      resolve({
        ok: true,
        mode: "local",
        message: "已设置本机复检提醒（未配置订阅模板时不走微信推送）",
      });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success: function (res) {
        resolve({ ok: true, mode: "subscribe", res: res });
      },
      fail: function () {
        resolve({
          ok: true,
          mode: "local",
          message: "订阅未授权，已保留本机复检提醒",
        });
      },
    });
  });
}

module.exports = {
  scheduleRecheck: scheduleRecheck,
  remindStatus: remindStatus,
  clearRemind: clearRemind,
  requestSubscribeRecheck: requestSubscribeRecheck,
  loadRemind: loadRemind,
};
