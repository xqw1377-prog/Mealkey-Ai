const brain = require("../../../shell/brain.js");
const runtime = require("../../../runtime/api.js");
const mealkey = require("../../../shell/mealkey-cta.js");
const nav = require("../../../shell/nav.js");

Page({
  data: {
    restaurant: null,
    meta: "",
    runs: [],
  },

  onShow() {
    runtime.injectContext(["name", "city", "category"]);
    const r = brain.getRestaurant();
    this.setData({
      restaurant: r,
      meta: r ? [r.city, r.category, r.stage].filter(Boolean).join(" · ") : "",
      runs: brain.recentRuns(10),
    });
  },

  openDiagnosis() {
    runtime.openAgent("restaurant-diagnosis");
  },

  enterBrain() {
    mealkey.promptEnterBrain();
  },

  goHome() {
    nav.goHome();
  },
});
