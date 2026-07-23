/**
 * Shell · Restaurant Brain（本机真源 + 云同步队列）
 */
const BRAIN_KEY = "mk_shell_brain";
const cloudSync = require("./cloud-sync.js");

function loadBrain() {
  try {
    return (
      wx.getStorageSync(BRAIN_KEY) || {
        currentRestaurantId: null,
        restaurants: [],
        recentRuns: [],
      }
    );
  } catch (e) {
    return { currentRestaurantId: null, restaurants: [], recentRuns: [] };
  }
}

function saveBrain(brain) {
  try {
    wx.setStorageSync(BRAIN_KEY, brain);
  } catch (e) {
    console.warn("[shell] brain save fail", e);
  }
  try {
    const app = getApp();
    if (app && app.globalData) app.globalData.brain = brain;
  } catch (e) {}
  try {
    cloudSync.enqueue("brain.snapshot", {
      currentRestaurantId: brain.currentRestaurantId,
      restaurants: brain.restaurants,
      recentRuns: (brain.recentRuns || []).slice(0, 10),
    });
  } catch (e) {}
}

function getRestaurant() {
  const brain = loadBrain();
  if (!brain.currentRestaurantId) return null;
  return (
    brain.restaurants.find(function (r) {
      return r.id === brain.currentRestaurantId;
    }) || null
  );
}

function listRestaurants() {
  return loadBrain().restaurants || [];
}

function upsertRestaurant(partial) {
  const brain = loadBrain();
  const name = (partial && partial.name) || "未命名门店";
  let r = null;
  if (partial && partial.id) {
    r = brain.restaurants.find(function (x) {
      return x.id === partial.id;
    });
  }
  if (!r) {
    r = brain.restaurants.find(function (x) {
      return x.name === name && x.city === (partial.city || "");
    });
  }
  if (!r) {
    r = {
      id: "rst_" + Date.now().toString(36),
      name: name,
      city: "",
      category: "",
      stage: "",
      priceRange: "",
      focus: "",
      sourceAgentId: "",
      updatedAt: new Date().toISOString(),
    };
    brain.restaurants.unshift(r);
  }
  ["name", "city", "category", "stage", "priceRange", "focus", "sourceAgentId"].forEach(
    function (k) {
      if (partial && partial[k] != null && partial[k] !== "") r[k] = partial[k];
    },
  );
  r.updatedAt = new Date().toISOString();
  brain.currentRestaurantId = r.id;
  saveBrain(brain);
  return r;
}

function setCurrentRestaurant(id) {
  const brain = loadBrain();
  const hit = brain.restaurants.find(function (r) {
    return r.id === id;
  });
  if (!hit) return null;
  brain.currentRestaurantId = id;
  saveBrain(brain);
  return hit;
}

function publishRun(run) {
  const brain = loadBrain();
  const entry = {
    id: "run_" + Date.now().toString(36),
    agentId: (run && run.agentId) || "",
    restaurantId: brain.currentRestaurantId,
    summary: (run && run.summary) || "",
    overallVerdict: (run && run.overallVerdict) || "",
    at: new Date().toISOString(),
  };
  brain.recentRuns = [entry].concat(brain.recentRuns || []).slice(0, 30);
  saveBrain(brain);
  try {
    const referral = require("./referral.js");
    const rst = getRestaurant();
    referral.onQualifiedDiagnosis({
      agentId: entry.agentId,
      restaurantName: (rst && rst.name) || "",
    });
  } catch (e) {}
  return entry;
}

function recentRuns(limit) {
  const n = typeof limit === "number" ? limit : 8;
  return (loadBrain().recentRuns || []).slice(0, n);
}

/** Agent 进件资料 → Brain */
function syncFromAgentProfile(profile, agentId) {
  if (!profile) return null;
  return upsertRestaurant({
    name: profile.name,
    city: profile.city,
    category: profile.category,
    stage: profile.stage || "",
    priceRange: profile.priceRange,
    focus: profile.focus,
    sourceAgentId: agentId || "restaurant-diagnosis",
  });
}

module.exports = {
  loadBrain: loadBrain,
  getRestaurant: getRestaurant,
  listRestaurants: listRestaurants,
  upsertRestaurant: upsertRestaurant,
  setCurrentRestaurant: setCurrentRestaurant,
  publishRun: publishRun,
  recentRuns: recentRuns,
  syncFromAgentProfile: syncFromAgentProfile,
};
