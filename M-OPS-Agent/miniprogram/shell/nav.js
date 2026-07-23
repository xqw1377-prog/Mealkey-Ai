/**
 * Shell 路由真源（Tab 页必须 switchTab）
 */
const PATHS = {
  home: "/shell/pages/home/home",
  capabilities: "/shell/pages/capabilities/capabilities",
  brain: "/shell/pages/brain/brain",
  me: "/shell/pages/me/me",
};

function switchTab(name) {
  const url = PATHS[name] || PATHS.home;
  return new Promise(function (resolve, reject) {
    wx.switchTab({
      url: url,
      success: resolve,
      fail: function () {
        wx.reLaunch({
          url: url,
          success: resolve,
          fail: reject,
        });
      },
    });
  });
}

function goHome() {
  return switchTab("home");
}

function goCapabilities() {
  return switchTab("capabilities");
}

function goBrain() {
  return switchTab("brain");
}

function goMe() {
  return switchTab("me");
}

module.exports = {
  PATHS: PATHS,
  switchTab: switchTab,
  goHome: goHome,
  goCapabilities: goCapabilities,
  goBrain: goBrain,
  goMe: goMe,
};
