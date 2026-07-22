/**
 * PluginHost — open plugin with ShellContext from BFF (or local fallback)
 */

async function openPlugin(agentId) {
  const app = getApp();
  const session = app.globalData.session;
  const restaurant = app.globalData.restaurant;

  if (!restaurant || !restaurant.name) {
    return {
      ok: false,
      needProfile: true,
      message: "请先建立经营档案",
    };
  }

  const body = {
    agentId,
    session,
    restaurant,
    fuelBalance: app.globalData.fuelBalance,
  };

  try {
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/shell-context`,
        method: "POST",
        data: body,
        header: { "content-type": "application/json" },
        success: resolve,
        fail: reject,
      });
    });
    if (res.statusCode === 200 && res.data && res.data.context) {
      return { ok: true, context: res.data.context, handoffUrl: res.data.handoffUrl };
    }
  } catch (_e) {
    // local fallback
  }

  const invokeId = `inv_${Date.now().toString(36)}`;
  return {
    ok: true,
    context: {
      schemaVersion: "1.0",
      session: {
        userId: session.userId,
        status: session.status,
        wechatOpenId: session.wechatOpenId,
      },
      restaurant: {
        localProfileId: restaurant.localProfileId || "local_1",
        mealkeyRestaurantId: restaurant.mealkeyRestaurantId,
        name: restaurant.name,
        city: restaurant.city,
        category: restaurant.category,
      },
      entitlements: {
        agentId,
        installed: true,
        scopesGranted: ["basic", "facts", "review"],
      },
      fuel: {
        balancePoints: app.globalData.fuelBalance,
        estimatedCostPoints: 100,
      },
      userAccessToken: `shell_dev_${session.userId}`,
      invokeId,
      locale: "zh-CN",
    },
    handoffUrl: "http://127.0.0.1:3000/dashboard",
  };
}

function handlePluginEvent(event) {
  if (!event || !event.type) return { handled: false };
  const allowed = [
    "fuel.quote",
    "fuel.spend_confirmed",
    "run.progress",
    "run.completed",
    "ingress.submitted",
    "handoff.brain",
    "auth.bind_phone",
    "error",
  ];
  if (allowed.indexOf(event.type) === -1) {
    return { handled: false, dropped: true };
  }

  const app = getApp();
  if (event.type === "auth.bind_phone") {
    wx.navigateTo({ url: "/pages/bind-phone/index" });
    return { handled: true };
  }
  if (event.type === "handoff.brain") {
    const url = event.url || "http://127.0.0.1:3000/dashboard";
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: "经营大脑链接已复制", icon: "none" });
      },
    });
    return { handled: true };
  }
  if (event.type === "fuel.spend_confirmed" && typeof event.costPoints === "number") {
    app.globalData.fuelBalance = Math.max(0, app.globalData.fuelBalance - event.costPoints);
    const session = { ...app.globalData.session, fuelBalance: app.globalData.fuelBalance };
    app.globalData.session = session;
    wx.setStorageSync("mk_shell_session", session);
    return { handled: true };
  }
  return { handled: true };
}

module.exports = {
  openPlugin,
  handlePluginEvent,
};
