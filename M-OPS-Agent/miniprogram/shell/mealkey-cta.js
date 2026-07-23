/**
 * 小程序可独立完成首份体检；主 CTA = 进入经营大脑（非「下载 App」）
 * 见 docs/MEALKEY_AGENT_MINIPROGRAM_PLATFORM_V1.md §4
 */
function getBrainUrl() {
  const app = getApp();
  return (
    (app && app.globalData && app.globalData.mealkeyOsUrl) ||
    (app && app.globalData && app.globalData.mealkeyAppDownloadUrl) ||
    "https://mealkey.app"
  );
}

/** @deprecated 使用 getBrainUrl */
function getDownloadUrl() {
  return getBrainUrl();
}

function enhanceBullets() {
  return [
    "每日经营扫描与云端门店档案",
    "菜品利润 / 客群与竞争变化",
    "大模型经营顾问与会审追问",
    "拍板进入决策流，不只停在体检页",
  ];
}

/**
 * 主升级路径：进入经营大脑（复制链；下载仅为端分发，不当地主文案）
 */
function promptEnterBrain(options) {
  options = options || {};
  const url = getBrainUrl();
  const title = options.title || "进入 MealKey 经营大脑";
  const content =
    options.content ||
    "首份体检已在小程序完成。经营大脑提供每日扫描、利润深析、客群/竞争变化与 AI 顾问——是长期经营沉淀，不是「没 App 体检不完整」。";

  wx.setClipboardData({
    data: url,
    success: function () {
      wx.showModal({
        title: title,
        content: content + "\n\n入口链接已复制，可在浏览器打开。",
        confirmText: "知道了",
        showCancel: false,
      });
    },
    fail: function () {
      wx.showModal({
        title: title,
        content: content + "\n\n请访问：" + url,
        confirmText: "知道了",
        showCancel: false,
      });
    },
  });
}

/** 兼容旧调用名 → 经营大脑 */
function promptDownloadApp(options) {
  return promptEnterBrain(options);
}

module.exports = {
  getBrainUrl: getBrainUrl,
  getDownloadUrl: getDownloadUrl,
  enhanceBullets: enhanceBullets,
  promptEnterBrain: promptEnterBrain,
  promptDownloadApp: promptDownloadApp,
};
