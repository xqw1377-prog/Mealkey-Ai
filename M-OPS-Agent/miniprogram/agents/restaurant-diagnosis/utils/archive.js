/** 本机体检档案（最多保留 10 轮，可重开报告） */
const ARCHIVE_KEY = "mops_exam_archive_v1";
const MAX = 10;

function loadArchive() {
  try {
    return wx.getStorageSync(ARCHIVE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveArchiveList(list) {
  try {
    wx.setStorageSync(ARCHIVE_KEY, list || []);
  } catch (e) {
    console.warn("[m-ops] archive save fail", e);
  }
}

function slimResult(profile, result, meta) {
  const c = result.consultation || {};
  const priorities = c.priorities || [];
  const weekAction =
    priorities.find(function (p) {
      return !/^验证\/处置/.test(p);
    }) ||
    priorities[0] ||
    "";
  return {
    id: "exam_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    at: new Date().toISOString(),
    profile: profile || {},
    examMode: (meta && meta.examMode) || result._examMode || "deep",
    restaurantName: c.restaurantName || (profile && profile.name) || "门店",
    overallVerdict: c.overallVerdict || "",
    overallLevel: c.overallLevel || "",
    bossBrief: c.bossBrief || "",
    weekAction: weekAction,
    readiness: c.dataReadinessScore,
    packTip: (meta && meta.packTip) || result._packTip || "",
    delta: result._deltaBrief || null,
    dna: result._dna || null,
    // 可重开所需正文（不含原始账本大 JSON）
    payload: {
      consultation: c,
      signals: (result.signals || []).slice(0, 12),
      learningDraft: (result.learningDraft || []).slice(0, 8),
      exam: result.exam
        ? { summary: result.exam.summary, axes: (result.exam.axes || []).slice(0, 6) }
        : null,
      health: result.health
        ? { snapshot: result.health.snapshot }
        : null,
      _deltaBrief: result._deltaBrief,
      _dna: result._dna,
      _packTip: result._packTip,
      _examMode: result._examMode,
      _needsDeepUpgrade: result._needsDeepUpgrade,
      _categoryTip: result._categoryTip,
    },
  };
}

function pushArchive(profile, result, meta) {
  const entry = slimResult(profile, result, meta);
  const list = loadArchive();
  list.unshift(entry);
  saveArchiveList(list.slice(0, MAX));
  return entry;
}

function getArchiveEntry(id) {
  const list = loadArchive();
  return list.find(function (e) {
    return e.id === id;
  });
}

function listArchiveMeta() {
  return loadArchive().map(function (e) {
    return {
      id: e.id,
      at: e.at,
      restaurantName: e.restaurantName,
      overallVerdict: e.overallVerdict,
      overallLevel: e.overallLevel,
      bossBrief: e.bossBrief,
      weekAction: e.weekAction,
      examMode: e.examMode,
      readiness: e.readiness,
    };
  });
}

function openArchiveEntry(id) {
  const entry = getArchiveEntry(id);
  if (!entry || !entry.payload) return null;
  const app = getApp();
  const result = Object.assign(
    {
      ok: true,
      consultation: entry.payload.consultation,
      signals: entry.payload.signals,
      learningDraft: entry.payload.learningDraft,
      exam: entry.payload.exam,
      health: entry.payload.health,
    },
    {
      _deltaBrief: entry.payload._deltaBrief,
      _dna: entry.payload._dna,
      _packTip: entry.payload._packTip,
      _examMode: entry.payload._examMode,
      _needsDeepUpgrade: entry.payload._needsDeepUpgrade,
      _categoryTip: entry.payload._categoryTip,
      _fromArchive: true,
      _archiveId: entry.id,
    },
  );
  app.globalData.lastResult = result;
  app.globalData.lastProfile = entry.profile;
  app.globalData.lastPackTip = entry.packTip || "";
  app.globalData.lastDelta = entry.delta || null;
  return entry;
}

module.exports = {
  pushArchive: pushArchive,
  listArchiveMeta: listArchiveMeta,
  getArchiveEntry: getArchiveEntry,
  openArchiveEntry: openArchiveEntry,
  loadArchive: loadArchive,
};
