/**
 * Runtime · Agent 注册表（不硬编码任何 Agent 路径）
 */
const validate = require("./validate-manifest.js");

let REGISTRY = [];

function registerPlugins(manifests) {
  const list = [];
  (manifests || []).forEach(function (m) {
    validate.assertManifest(m);
    if (
      list.some(function (x) {
        return x.agentId === m.agentId;
      })
    ) {
      throw new Error("duplicate agentId: " + m.agentId);
    }
    list.push(m);
  });
  REGISTRY = list;
  return list;
}

function listAgents() {
  const local = REGISTRY.map(function (m) {
    return {
      agentId: m.agentId,
      family: m.family,
      displayName: m.displayName,
      summary: m.summary,
      status: m.status || "live",
      entryRoute: m.miniUi && m.miniUi.entryRoute,
      firstValueSlaSec: m.firstValueSlaSec,
      tokenCost:
        m.billing && m.billing.skus && m.billing.skus[0]
          ? m.billing.skus[0].tokenCost
          : 0,
      remote: false,
    };
  });
  let remote = [];
  try {
    remote = require("./marketplace.js").getRemoteListings();
  } catch (e) {
    remote = [];
  }
  const seen = {};
  local.forEach(function (a) {
    seen[a.agentId] = true;
  });
  remote.forEach(function (a) {
    if (!seen[a.agentId]) local.push(a);
  });
  return local;
}

function resolve(agentId) {
  return (
    REGISTRY.find(function (m) {
      return m.agentId === agentId;
    }) || null
  );
}

function allManifests() {
  return REGISTRY.slice();
}

module.exports = {
  registerPlugins: registerPlugins,
  listAgents: listAgents,
  resolve: resolve,
  allManifests: allManifests,
};
