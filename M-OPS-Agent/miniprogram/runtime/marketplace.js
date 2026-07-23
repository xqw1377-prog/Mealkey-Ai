/**
 * Runtime · 远程能力市场（失败则仅本地 catalog）
 */
const config = require("../shell/config.js");
const validate = require("./validate-manifest.js");

let REMOTE_LISTINGS = [];

function setRemoteListings(list) {
  REMOTE_LISTINGS = (list || []).filter(Boolean);
  return REMOTE_LISTINGS;
}

function getRemoteListings() {
  return REMOTE_LISTINGS.slice();
}

function normalizeListing(raw) {
  return {
    agentId: raw.agentId,
    family: raw.family || "third-party",
    displayName: raw.displayName || raw.agentId,
    summary: raw.summary || "",
    status: raw.status || "coming",
    tokenCost: (raw.billing && raw.billing.skus && raw.billing.skus[0]
      ? raw.billing.skus[0].tokenCost
      : raw.tokenCost) || 0,
    entryRoute: (raw.miniUi && raw.miniUi.entryRoute) || "",
    remote: true,
  };
}

function fetchMarketplace() {
  const url = config.cfg().marketplaceUrl;
  if (!url || typeof wx === "undefined" || !wx.request) {
    return Promise.resolve({ ok: false, mode: "skip", listings: [] });
  }
  return new Promise(function (resolve) {
    wx.request({
      url: url,
      method: "GET",
      timeout: 8000,
      success: function (res) {
        const body = (res && res.data) || {};
        const agents = body.agents || body.listings || [];
        const listings = agents.map(normalizeListing);
        setRemoteListings(listings);
        resolve({ ok: true, mode: "remote", listings: listings });
      },
      fail: function () {
        resolve({ ok: false, mode: "fail", listings: [] });
      },
    });
  });
}

/** Node / 校验：从本地 JSON 合并 */
function loadLocalMarketplaceJson(json) {
  const agents = (json && (json.agents || json.listings)) || [];
  const listings = agents.map(normalizeListing);
  setRemoteListings(listings);
  return listings;
}

/** 完整 manifest 远程包（可选上架 live） */
function tryRegisterRemoteManifests(registry, manifests) {
  const ok = [];
  (manifests || []).forEach(function (m) {
    const v = validate.validateManifest(m);
    if (v.ok) ok.push(m);
  });
  if (ok.length && registry && registry.registerPlugins) {
    // 不覆盖本地：由 host 合并
  }
  return ok;
}

module.exports = {
  fetchMarketplace: fetchMarketplace,
  loadLocalMarketplaceJson: loadLocalMarketplaceJson,
  getRemoteListings: getRemoteListings,
  setRemoteListings: setRemoteListings,
  normalizeListing: normalizeListing,
  tryRegisterRemoteManifests: tryRegisterRemoteManifests,
};
