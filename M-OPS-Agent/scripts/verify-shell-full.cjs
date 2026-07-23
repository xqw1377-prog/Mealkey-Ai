/**
 * Node 下模拟 wx，验收 Shell 全量模块（auth/wallet/referral/marketplace/brain sync queue）
 */
const path = require("path");

const store = Object.create(null);

global.wx = {
  getStorageSync(key) {
    return store[key];
  },
  setStorageSync(key, val) {
    store[key] = val;
  },
  removeStorageSync(key) {
    delete store[key];
  },
  login(opts) {
    opts.success && opts.success({ code: "mock_code_abc" });
  },
  request(opts) {
    if (opts.fail) opts.fail({ errMsg: "offline" });
  },
  setClipboardData(opts) {
    opts.success && opts.success({});
  },
};

global.getApp = function () {
  return {
    globalData: {
      authApiUrl: "",
      brainApiUrl: "",
      marketplaceUrl: "",
    },
  };
};

const auth = require(path.join(__dirname, "../miniprogram/shell/auth.js"));
const wallet = require(path.join(__dirname, "../miniprogram/shell/wallet.js"));
const referral = require(path.join(__dirname, "../miniprogram/shell/referral.js"));
const marketplace = require(path.join(
  __dirname,
  "../miniprogram/runtime/marketplace.js",
));
const cloudSync = require(path.join(
  __dirname,
  "../miniprogram/shell/cloud-sync.js",
));
const brain = require(path.join(__dirname, "../miniprogram/shell/brain.js"));
const sample = require(path.join(
  __dirname,
  "../miniprogram/host/marketplace.sample.js",
));

auth.ensureGuest();
wallet.ensureWallet();
if (wallet.getBalance() !== 500) {
  console.error("FAIL welcome grant", wallet.getBalance());
  process.exit(1);
}

referral.captureInviter({ inviter: "MKTESTINV" });
const st = referral.status();
if (!st.myCode || st.invitedBy !== "MKTESTINV") {
  console.error("FAIL referral capture", st);
  process.exit(1);
}

brain.syncFromAgentProfile(
  { name: "湘味馆", city: "长沙", category: "湘菜" },
  "restaurant-diagnosis",
);
brain.publishRun({
  agentId: "restaurant-diagnosis",
  overallVerdict: "观察",
  summary: "测试",
});
const after = referral.status();
if (!after.qualified) {
  console.error("FAIL referral qualify");
  process.exit(1);
}
if (wallet.getBalance() < 600) {
  console.error("FAIL invitee reward missing", wallet.getBalance());
  process.exit(1);
}

marketplace.loadLocalMarketplaceJson(sample);
const listings = marketplace.getRemoteListings();
if (listings.length < 2) {
  console.error("FAIL marketplace sample");
  process.exit(1);
}

cloudSync.enqueue("test", { ok: true });
if (cloudSync.pendingCount() < 1) {
  console.error("FAIL sync queue");
  process.exit(1);
}

auth.loginWithWechat().then(function (r) {
  if (!r.ok) {
    console.error("FAIL login", r);
    process.exit(1);
  }
  console.log("shell full modules ok", {
    auth: r.mode,
    balance: wallet.getBalance(),
    invite: after.myCode,
    market: listings.length,
    pendingSync: cloudSync.pendingCount(),
  });
});
