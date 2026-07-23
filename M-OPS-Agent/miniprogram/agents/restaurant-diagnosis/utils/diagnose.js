const diag = require("../../../libs/m-ops-diag.js");
const synthetic = require("./synthetic.js");
const packs = require("./category-packs.js");
const archive = require("./archive.js");

const LEARN_KEY = "mops_learnings";
const IMPORT_KEY = "mops_import_bundle";
const SNAPSHOT_KEY = "mops_exam_snapshot";
const PROFILE_KEY = "mops_exam_profile";

function loadLearnings() {
  try {
    return wx.getStorageSync(LEARN_KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveLearnings(list) {
  try {
    wx.setStorageSync(LEARN_KEY, list || []);
  } catch (e) {
    console.warn("[m-ops] learnings save fail", e);
  }
  getApp().globalData.learnings = list || [];
}

function loadImportBundle() {
  try {
    return wx.getStorageSync(IMPORT_KEY) || null;
  } catch (e) {
    return null;
  }
}

function saveImportBundle(bundle) {
  try {
    if (bundle) wx.setStorageSync(IMPORT_KEY, bundle);
    else wx.removeStorageSync(IMPORT_KEY);
  } catch (e) {
    console.warn("[m-ops] import save fail", e);
  }
  getApp().globalData.importBundle = bundle || null;
}

function loadExamProfile() {
  try {
    return wx.getStorageSync(PROFILE_KEY) || null;
  } catch (e) {
    return null;
  }
}

function saveExamProfile(profile) {
  try {
    wx.setStorageSync(PROFILE_KEY, profile || {});
  } catch (e) {}
  getApp().globalData.examProfile = profile || null;
  try {
    const shell = require("../../../shell/api.js");
    shell.brain.syncFromAgentProfile(profile, "restaurant-diagnosis");
  } catch (e) {
    console.warn("[m-ops] brain sync skip", e);
  }
}

function loadSnapshot() {
  try {
    return wx.getStorageSync(SNAPSHOT_KEY) || null;
  } catch (e) {
    return null;
  }
}

function buildExamSnapshot(profile, result) {
  const c = result.consultation || {};
  const priorities = c.priorities || [];
  const weekAction =
    priorities.find(function (p) {
      return !/^验证\/处置/.test(p);
    }) ||
    priorities[0] ||
    "";
  return {
    at: new Date().toISOString(),
    restaurantName: (profile && profile.name) || c.restaurantName || "",
    overallLevel: c.overallLevel,
    overallVerdict: c.overallVerdict,
    bossBrief: c.bossBrief,
    consensus: c.consensus,
    weekAction: weekAction,
    signalTitles: (result.signals || [])
      .slice(0, 5)
      .map(function (s) {
        return s.title || s.observation || "";
      }),
    healthSnapshot: result.health && result.health.snapshot,
    readiness: c.dataReadinessScore,
  };
}

function saveSnapshot(snapshot) {
  try {
    wx.setStorageSync(SNAPSHOT_KEY, snapshot);
  } catch (e) {
    console.warn("[m-ops] snapshot save fail", e);
  }
  getApp().globalData.examSnapshot = snapshot;
}

/** 壳层 Δ 文案（不依赖 LLM） */
function buildDeltaBrief(prev, curr) {
  if (!prev || !curr) return null;
  const lines = [];
  if (prev.overallLevel && curr.overallLevel && prev.overallLevel !== curr.overallLevel) {
    lines.push(
      "综合判定：上次「" +
        (prev.overallVerdict || prev.overallLevel) +
        "」→ 本次「" +
        (curr.overallVerdict || curr.overallLevel) +
        "」",
    );
  } else if (prev.overallVerdict && curr.overallVerdict) {
    lines.push("综合判定较上次未变档（" + curr.overallVerdict + "）");
  }
  if (prev.bossBrief && curr.bossBrief && prev.bossBrief !== curr.bossBrief) {
    lines.push("主因已更新（较上次有变化，请对照本周动作）");
  } else if (prev.bossBrief && curr.bossBrief) {
    lines.push("主因与上次相近，优先验证是否执行到位");
  }
  const prevSignals = prev.signalTitles || [];
  const currSignals = curr.signalTitles || [];
  const still = currSignals.filter(function (t) {
    return prevSignals.indexOf(t) >= 0;
  });
  if (still.length) {
    lines.push("仍在的信号：" + still.slice(0, 2).join("；"));
  }
  const fresh = currSignals.filter(function (t) {
    return prevSignals.indexOf(t) < 0;
  });
  if (fresh.length) {
    lines.push("新出现信号：" + fresh.slice(0, 2).join("；"));
  }
  if (prev.at) {
    lines.push("对比基准：" + String(prev.at).slice(0, 10) + " 那次体检");
  }
  return {
    hasPrev: true,
    lines: lines,
    summary: lines[0] || "已与上次体检对比",
  };
}

function evolutionForUi(restaurantId) {
  const learnings = loadLearnings();
  if (!learnings.length) {
    return { has: false, summary: "尚无学习回填", weights: [] };
  }
  const evo = diag.buildEvolutionState(learnings, restaurantId || "mp-store");
  return {
    has: true,
    summary: evo.summary,
    stage: evo.stage,
    stageLabel: diag.stageLabel(evo.stage),
    maturityScore: evo.maturityScore,
    weights: (evo.themeWeights || []).slice(0, 5).map(function (t) {
      return {
        theme: t.theme,
        weight: t.weight,
        label: t.theme + " ×" + Number(t.weight).toFixed(2),
        confirmed: t.confirmed,
        rejected: t.rejected,
      };
    }),
  };
}

function guessPackId(category) {
  const c = String(category || "");
  if (/火锅|串串|冒菜/.test(c)) return "hotpot";
  if (/茶|咖啡|饮/.test(c)) return "tea";
  if (/湘|菜|餐/.test(c)) return "xiangcai";
  return "xiangcai";
}

function runDiagnosis(profile, mode, options) {
  options = options || {};
  const learnings =
    options.previousLearnings !== undefined
      ? options.previousLearnings
      : loadLearnings();
  const importBundle =
    options.importBundle !== undefined
      ? options.importBundle
      : loadImportBundle();

  let request;
  let packTip = "";
  const prevSnap = loadSnapshot();
  profile = profile || loadExamProfile() || {};

  if (options.packId) {
    const built = packs.buildPackRequest(options.packId);
    request = built.request;
    // 保留演示包数据，门店名可用当前 profile 覆盖展示
    if (profile.name) {
      request.restaurantContext = Object.assign({}, request.restaurantContext, {
        brandName: profile.name,
        category: profile.category || request.restaurantContext.category,
        city: profile.city || request.restaurantContext.city,
      });
      built.profile = Object.assign({}, built.profile, profile);
    }
    profile = built.profile;
    packTip = built.tip;
  } else if (mode === "quick") {
    request = synthetic.buildQuickRequest(profile);
  } else if (importBundle && importBundle.daily && importBundle.daily.length) {
    request = synthetic.buildFromImport(profile, importBundle);
  } else if (mode === "deep" && !options.allowSynthetic) {
    throw new Error("请先导入日×餐段明细，再进行真店深检（示例店请用「演示」入口）");
  } else if (options.allowSynthetic) {
    const pid = options.rescanPackId || guessPackId(profile.category);
    const built = packs.buildPackRequest(pid);
    request = built.request;
    request.restaurantContext = Object.assign({}, request.restaurantContext, {
      brandName: profile.name || request.restaurantContext.brandName,
      category: profile.category || request.restaurantContext.category,
      city: profile.city || request.restaurantContext.city,
    });
    packTip = built.tip;
  } else {
    request = synthetic.buildDeepRequest(profile);
  }

  if (options.extraEvidence && options.extraEvidence.length) {
    request.evidence = (request.evidence || []).concat(options.extraEvidence);
  }

  if (learnings && learnings.length) {
    request.previousLearnings = learnings;
  }

  if (prevSnap && prevSnap.healthSnapshot) {
    request.previousSnapshot = prevSnap.healthSnapshot;
  }

  const result = diag.diagnoseRestaurantSync(request);
  if (packTip) result._packTip = packTip;

  let examMode = "deep";
  if (mode === "quick") examMode = "quick";
  else if (options.packId) examMode = "demo";
  else if (importBundle && importBundle.daily && importBundle.daily.length) examMode = "deep";
  else if (options.allowSynthetic) examMode = "demo";
  result._examMode = examMode;

  const financeRefused = ((result.consultation && result.consultation.experts) || []).some(
    function (e) {
      return e.role === "finance" && e.refused;
    },
  );
  result._needsDeepUpgrade = examMode === "quick" || financeRefused;

  try {
    const th = diag.resolveCategoryThresholds(profile.category);
    result._categoryTip = th.tip;
    result._categoryLabel = th.label;
  } catch (e) {}

  const currSnap = buildExamSnapshot(profile, result);
  const delta = buildDeltaBrief(prevSnap, currSnap);
  result._deltaBrief = delta;
  result._dna = evolutionForUi(profile && profile.name);

  return {
    result: result,
    profile: profile,
    packTip: packTip,
    delta: delta,
    previousSnapshotMeta: prevSnap,
  };
}

function saveLast(profile, result, meta) {
  meta = meta || {};
  const app = getApp();
  app.globalData.lastProfile = profile;
  app.globalData.lastResult = result;
  app.globalData.lastPackTip = meta.packTip || result._packTip || "";
  app.globalData.lastDelta = result._deltaBrief || meta.delta || null;

  const snap = buildExamSnapshot(profile, result);
  saveSnapshot(snap);
  saveExamProfile(profile);

  try {
    const entry = archive.pushArchive(profile, result, {
      examMode: result._examMode || meta.examMode,
      packTip: app.globalData.lastPackTip,
    });
    app.globalData.lastArchiveId = entry.id;
  } catch (e) {
    console.warn("[m-ops] archive push fail", e);
  }

  try {
    wx.setStorageSync("mops_last_profile", profile);
    wx.setStorageSync("mops_last_summary", {
      overallVerdict: result.consultation && result.consultation.overallVerdict,
      consensus: result.consultation && result.consultation.consensus,
      bossBrief: result.consultation && result.consultation.bossBrief,
      signalCount: (result.signals || []).length,
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[m-ops] storage skip", e);
  }

  try {
    const shell = require("../../../shell/api.js");
    shell.brain.syncFromAgentProfile(profile, "restaurant-diagnosis");
    const c = result.consultation || {};
    shell.brain.publishRun({
      agentId: "restaurant-diagnosis",
      summary: c.bossBrief || c.overallVerdict || "",
      overallVerdict: c.overallVerdict || "",
    });
  } catch (e) {
    console.warn("[m-ops] brain publish skip", e);
  }
}

function applyLearningFeedback(items) {
  const enriched = (items || []).map(function (item) {
    return {
      diagnosisId: item.diagnosisId || "mp-learn",
      hypothesis: item.hypothesis,
      action: item.action,
      expectedOutcome: item.expectedOutcome,
      actualOutcome: item.actualOutcome,
      lesson: item.lesson,
      polarity: item.polarity,
      themes: item.themes,
      verifiedAt: item.verifiedAt || new Date().toISOString(),
    };
  });
  saveLearnings(enriched);
  try {
    diag.applyEvolvedPatternLibrary(enriched);
  } catch (e) {
    console.warn("[m-ops] pattern evolve skip", e);
  }
  return diag.buildEvolutionState(
    enriched,
    (getApp().globalData.lastProfile && getApp().globalData.lastProfile.name) ||
      "mp-store",
  );
}

function tagComments(text) {
  return diag.tagEvidenceFromText(text, "manual");
}

module.exports = {
  runDiagnosis: runDiagnosis,
  saveLast: saveLast,
  loadLearnings: loadLearnings,
  saveLearnings: saveLearnings,
  loadImportBundle: loadImportBundle,
  saveImportBundle: saveImportBundle,
  loadExamProfile: loadExamProfile,
  saveExamProfile: saveExamProfile,
  loadSnapshot: loadSnapshot,
  buildDeltaBrief: buildDeltaBrief,
  evolutionForUi: evolutionForUi,
  applyLearningFeedback: applyLearningFeedback,
  tagComments: tagComments,
  listPacks: packs.listPacks,
  listArchiveMeta: archive.listArchiveMeta,
  openArchiveEntry: archive.openArchiveEntry,
  productName: diag.M_OPS_DIAG_PRODUCT_NAME,
  stageLabel: diag.stageLabel,
  resolveCategoryThresholds: diag.resolveCategoryThresholds,
};
