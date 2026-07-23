const runtime = require("../../../runtime/api.js");
const brain = require("../../../shell/brain.js");
const auth = require("../../../shell/auth.js");
const wallet = require("../../../shell/wallet.js");
const nav = require("../../../shell/nav.js");

Page({
  data: {
    agents: [],
    liveAgents: [],
    restaurantName: "",
    restaurantMeta: "",
    balance: 0,
    hasRestaurant: false,
  },

  onShow() {
    auth.ensureGuest();
    wallet.ensureWallet();
    runtime.injectContext(["name", "city", "category"]);
    const r = brain.getRestaurant();
    const agents = runtime.listAgents();
    this.setData({
      agents: agents,
      liveAgents: agents.filter(function (a) {
        return a.status === "live";
      }),
      restaurantName: (r && r.name) || "",
      restaurantMeta: r
        ? [r.city, r.category].filter(Boolean).join(" · ")
        : "",
      hasRestaurant: !!(r && r.name),
      balance: wallet.getBalance(),
    });
  },

  openDiagnosis() {
    runtime.openAgent("restaurant-diagnosis");
  },

  openAgent(e) {
    runtime.openAgent(e.currentTarget.dataset.id);
  },

  goCapabilities() {
    nav.goCapabilities();
  },

  goBrain() {
    nav.goBrain();
  },

  goMe() {
    nav.goMe();
  },
});
