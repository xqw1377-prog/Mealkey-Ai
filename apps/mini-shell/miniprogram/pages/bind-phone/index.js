const { bindPhone } = require("../../services/session");

Page({
  data: { phone: "" },

  onPhone(e) {
    this.setData({ phone: e.detail.value });
  },

  onSave() {
    const phone = (this.data.phone || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: "请输入有效手机号", icon: "none" });
      return;
    }
    bindPhone(phone);
    wx.showToast({ title: "档案已可保存", icon: "success" });
    setTimeout(() => wx.navigateBack({ delta: 1 }), 500);
  },
});
