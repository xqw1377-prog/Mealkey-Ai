/**
 * 交接证据包：小程序 → Mealkey 的可选增强输入（非假同步、非 LLM）
 * 老板可复制 JSON，在 App/母体粘贴完成更详尽档案。
 */
function buildHandoffPackage(profile, result) {
  const c = (result && result.consultation) || {};
  const priorities = c.priorities || [];
  const weekAction =
    priorities.find(function (p) {
      return !/^验证\/处置/.test(p);
    }) ||
    priorities[0] ||
    "";

  return {
    schema: "mealkey.m-ops-diag.handoff.v1",
    agentId: "restaurant-diagnosis",
    exportedAt: new Date().toISOString(),
    source: "wechat-miniprogram",
    restaurant: {
      brandName: (profile && profile.name) || c.restaurantName || "",
      city: (profile && profile.city) || "",
      category: (profile && profile.category) || "",
      priceRange: (profile && profile.priceRange) || "",
      focus: (profile && profile.focus) || "",
    },
    exam: {
      mode: (result && result._examMode) || "deep",
      overallLevel: c.overallLevel,
      overallVerdict: c.overallVerdict,
      bossBrief: c.bossBrief,
      weekAction: weekAction,
      consensus: c.consensus,
      dataReadinessScore: c.dataReadinessScore,
      priorities: priorities.slice(0, 6),
      openQuestions: (c.openQuestions || []).slice(0, 8),
    },
    signals: ((result && result.signals) || []).slice(0, 12).map(function (s) {
      return {
        title: s.title,
        observation: s.observation,
        meaning: s.meaning,
        severity: s.severity || s.level,
        confidence: s.confidence,
      };
    }),
    experts: ((c.experts || []) || []).map(function (e) {
      return {
        role: e.role,
        title: e.title,
        level: e.level,
        refused: !!e.refused,
        refuseReason: e.refuseReason || "",
        verdict: e.verdict,
      };
    }),
    dna: result && result._dna ? {
      summary: result._dna.summary,
      weights: result._dna.weights || [],
    } : null,
    delta: result && result._deltaBrief ? result._deltaBrief : null,
    mealkeyEnhance: {
      note: "以下能力需在 Mealkey App/母体完成，小程序已独立完成体检",
      capabilities: [
        "云端多店档案与今日雷达",
        "大模型解读会审与追问",
        "决策室拍板与跨 Agent 协同",
        "合规外采 live（若已安装）",
      ],
    },
  };
}

function copyHandoffPackage(profile, result) {
  const pack = buildHandoffPackage(profile, result);
  const text = JSON.stringify(pack, null, 2);
  return new Promise(function (resolve, reject) {
    wx.setClipboardData({
      data: text,
      success: function () {
        resolve(pack);
      },
      fail: reject,
    });
  });
}

/** Mealkey 更详尽能力对照（冻结文案） */
function boundaryMatrix() {
  return {
    miniprogram: [
      { title: "完整规则体检", desc: "进件→导入→四官会审→学习回填，全免独立完成" },
      { title: "真数与质检", desc: "日明细/菜销/菜单/评论打标与就绪度仪表" },
      { title: "经营节奏", desc: "复检 Δ、本周动作卡、本机档案" },
      { title: "交接证据包", desc: "导出 JSON，供 Mealkey 粘贴增强（可选）" },
    ],
    mealkeyOnly: [
      { title: "云端多店与今日", desc: "跨店档案、今日雷达持续观察" },
      { title: "大模型解读", desc: "会审追问、自然语言解读（Host 统一调用）" },
      { title: "决策回流", desc: "拍板进决策室，不在体检页给战略" },
      { title: "合规外采 live", desc: "点评等正式接口；小程序禁止假爬虫" },
    ],
  };
}

module.exports = {
  buildHandoffPackage: buildHandoffPackage,
  copyHandoffPackage: copyHandoffPackage,
  boundaryMatrix: boundaryMatrix,
};
