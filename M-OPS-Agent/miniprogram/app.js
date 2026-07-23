App({
  onLaunch(options) {
    const auth = require("./shell/auth.js");
    const wallet = require("./shell/wallet.js");
    const brain = require("./shell/brain.js");
    const referral = require("./shell/referral.js");
    const cloudSync = require("./shell/cloud-sync.js");
    const registry = require("./runtime/registry.js");
    const catalog = require("./host/plugin-catalog.js");
    const marketplace = require("./runtime/marketplace.js");

    registry.registerPlugins(catalog.loadPluginManifests());
    // 开发环境：合并本地 Marketplace 样例
    try {
      const sample = require("./host/marketplace.sample.js");
      marketplace.loadLocalMarketplaceJson(sample);
    } catch (e) {}

    const query = (options && options.query) || {};
    referral.captureInviter(query);
    referral.ensureMyCode();
    wallet.ensureWallet();
    this.globalData.session = auth.loadSession();
    this.globalData.wallet = wallet.loadWallet();
    this.globalData.brain = brain.loadBrain();
    this.globalData.referral = referral.status();

    auth.loginWithWechat().then(
      function (r) {
        console.log("[mealkey-shell] auth", r.mode);
      }.bind(this),
    );
    marketplace.fetchMarketplace().then(function (r) {
      console.log("[mealkey-shell] marketplace", r.mode, r.listings.length);
    });
    cloudSync.flush().then(function (r) {
      console.log("[mealkey-shell] brain sync", r.mode, "pending", r.pending);
    });

    console.log(
      "[mealkey-shell] plugins:",
      registry
        .listAgents()
        .map(function (a) {
          return a.agentId;
        })
        .join(", "),
    );
  },
  onShow(options) {
    try {
      const referral = require("./shell/referral.js");
      const query = (options && options.query) || {};
      referral.captureInviter(query);
    } catch (e) {}
  },
  globalData: {
    mealkeyOsUrl: "https://mealkey.app",
    mealkeyAppDownloadUrl: "https://mealkey.app/download",
    /** 配置后启用真换票/云同步；本地可填 http://127.0.0.1:8787 */
    authApiUrl: "",
    brainApiUrl: "",
    /** 空则使用 host/marketplace.sample.js */
    marketplaceUrl: "",
    recheckSubscribeTmplIds: [],
    session: null,
    wallet: null,
    brain: null,
    referral: null,
    agentContext: null,
    activeAgentId: null,
    lastCharge: null,
    lastResult: null,
    lastProfile: null,
    lastPackTip: "",
  },
});
