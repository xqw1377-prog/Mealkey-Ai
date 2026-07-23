const runtime = require("../../../runtime/api.js");

Page({
  data: { agents: [] },
  onShow() {
    this.setData({ agents: runtime.listAgents() });
  },
  openAgent(e) {
    runtime.openAgent(e.currentTarget.dataset.id);
  },
});
