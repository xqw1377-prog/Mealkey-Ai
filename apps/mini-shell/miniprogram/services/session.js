function createGuestSession() {
  const id = `guest_${Date.now().toString(36)}`;
  return {
    userId: id,
    status: "guest",
    wechatOpenId: `ox_dev_${id}`,
    fuelBalance: 500,
    createdAt: new Date().toISOString(),
  };
}

function persistRestaurant(restaurant) {
  const app = getApp();
  app.globalData.restaurant = restaurant;
  wx.setStorageSync("mk_shell_restaurant", restaurant);
}

function bindPhone(phone) {
  const app = getApp();
  const session = {
    ...app.globalData.session,
    status: "bound",
    phone,
  };
  app.globalData.session = session;
  wx.setStorageSync("mk_shell_session", session);
  return session;
}

module.exports = {
  createGuestSession,
  persistRestaurant,
  bindPhone,
};
