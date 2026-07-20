/**
 * Brain → DecisionContextV1（扩店议题）
 */
import type { AgentRestaurantContext } from "@mealkey/restaurant-brain";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";
import type { RestaurantStateV1 } from "@/server/founder-layer/contracts/decision-intel-data";
import type {
  DecisionCaseV1,
  DecisionContextV1,
  DecisionEvidenceV1,
  DecisionFactV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import {
  EVIDENCE_SOURCE_TO_TRUST_BAND,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import { computeEvidenceWeight } from "@/server/founder-layer/capability/decision-center/evidence-weight";
import {
  filterEvidenceByAnchorGate,
  hasMintelAnchors,
  queryMintelRegional,
} from "@/server/founder-layer/capability/m-intel";

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function restaurantStateFromBrain(
  ctx: AgentRestaurantContext,
): RestaurantStateV1 {
  const s = ctx.capability.scores;
  const risk = (ctx.founder.riskPreference || "").toLowerCase();
  return {
    asOf: new Date().toISOString(),
    confidence: Math.max(0.2, Math.min(1, ctx.capability.confidence || 0.5)),
    dimensions: {
      growth: s.strategy ?? null,
      profitability: s.finance ?? null,
      customer: s.market ?? null,
      product: s.product ?? null,
      organization: s.organization ?? null,
      finance: s.finance ?? null,
      ownerCapability: s.overall ?? null,
    },
    trends: {},
    flags: [
      ...(ctx.founder.blindSpots || []),
      risk.includes("高") || risk.includes("high") ? "high_risk_appetite" : "",
      ctx.identity.storeCount <= 1 ? "single_store" : "",
    ].filter(Boolean),
    sourceMix: ["brain"],
    businessStage:
      ctx.identity.stage?.includes("扩")
        ? "expansion"
        : ctx.identity.stage?.includes("创")
          ? "startup"
          : "growth",
  };
}

function makeEvidence(input: {
  id: string;
  decisionId: string;
  source: DecisionEvidenceV1["source"];
  content: string;
  impact: DecisionEvidenceV1["impact"];
  confidence: number;
  relatedFactors: string[];
  relevance: number;
}): DecisionEvidenceV1 {
  const band = EVIDENCE_SOURCE_TO_TRUST_BAND[input.source];
  const createdAt = new Date().toISOString();
  const weight = computeEvidenceWeight({
    sourceTrustBand: band,
    timestamp: createdAt,
    relevance: input.relevance,
    confidence: input.confidence,
  });
  return {
    id: input.id,
    decisionId: input.decisionId,
    source: input.source,
    content: input.content,
    impact: input.impact,
    confidence: input.confidence,
    freshness: 1,
    weight,
    relatedFactors: input.relatedFactors,
    createdAt,
    available: true,
    sourceTrustBand: band,
  };
}

export function buildExpansionContext(input: {
  case: DecisionCaseV1;
  brain: AgentRestaurantContext;
}): DecisionContextV1 {
  const c = input.case;
  const b = input.brain;
  const state = restaurantStateFromBrain(b);
  const org = b.capability.scores.organization ?? 0;
  const finance = b.capability.scores.finance ?? 0;
  const completeness = b.evolution.dataCompleteness ?? 0;

  const facts: DecisionFactV1[] = [
    {
      factId: "f_brand",
      label: "品牌/店名",
      value: b.identity.name || "未命名",
      source: "MEMORY",
    },
    {
      factId: "f_city",
      label: "城市/区域",
      value: b.identity.city?.trim() || "未采集",
      source: "MEMORY",
    },
    {
      factId: "f_stores",
      label: "门店数",
      value: String(b.identity.storeCount ?? "未知"),
      source: "MEMORY",
    },
    {
      factId: "f_category",
      label: "品类",
      value: b.identity.category || "未标注",
      source: "MEMORY",
    },
  ];
  if (b.business.revenue != null) {
    facts.push({
      factId: "f_revenue",
      label: "营业额信号",
      value: String(b.business.revenue),
      source: "MEMORY",
    });
  }
  if (b.business.margin != null) {
    facts.push({
      factId: "f_margin",
      label: "利润率信号",
      value: `${b.business.margin}`,
      source: "MEMORY",
    });
  }

  const evidences: DecisionEvidenceV1[] = [];
  let ei = 0;
  const pushEv = (
    source: DecisionEvidenceV1["source"],
    content: string,
    impact: DecisionEvidenceV1["impact"],
    confidence: number,
    factors: string[],
    relevance: number,
  ) => {
    evidences.push(
      makeEvidence({
        id: `ev_${c.id}_${++ei}`,
        decisionId: c.id,
        source,
        content,
        impact,
        confidence,
        relatedFactors: factors,
        relevance,
      }),
    );
  };

  pushEv(
    "MEMORY",
    `当前门店数 ${b.identity.storeCount}；阶段「${b.identity.stage || "未知"}」`,
    b.identity.storeCount >= 2 ? "POSITIVE" : "NEUTRAL",
    0.85,
    ["组织", "扩张"],
    1,
  );

  if (org > 0) {
    pushEv(
      "MEMORY",
      `组织能力评分约 ${Math.round(org)}（复制/店长体系相关）`,
      org >= 70 ? "POSITIVE" : "NEGATIVE",
      b.capability.confidence || 0.6,
      ["组织", "店长"],
      1,
    );
  }

  if (finance > 0) {
    pushEv(
      "MEMORY",
      `财务能力评分约 ${Math.round(finance)}`,
      finance >= 65 ? "POSITIVE" : "NEGATIVE",
      b.capability.confidence || 0.6,
      ["现金", "财务"],
      0.9,
    );
  }

  for (const d of b.history.recentDecisions.slice(0, 3)) {
    pushEv(
      "CASE",
      `历史决策：${clip(d.question, 48)}${d.chosen ? ` → ${clip(d.chosen, 24)}` : ""}`,
      "NEUTRAL",
      0.7,
      ["历史"],
      0.75,
    );
  }

  for (const p of b.learning.patterns.slice(0, 2)) {
    pushEv(
      "MEMORY",
      `经营规律：${clip(p.pattern, 64)}`,
      "NEUTRAL",
      p.confidence > 1 ? p.confidence / 100 : p.confidence,
      ["学习"],
      0.7,
    );
  }

  const brandName = b.identity.name?.trim() || "";
  const city = b.identity.city?.trim() || "";
  const mintelGate = queryMintelRegional({
    brandName,
    city,
    storeName: brandName,
    topic: "扩店区域证据",
  });
  const canClaimRegional = mintelGate.ok;

  // 无锚点禁止写入带区域量化的伪证据
  const gated = filterEvidenceByAnchorGate(evidences, canClaimRegional);
  const safeEvidences = gated.kept;

  const unknowns: string[] = [...(b.unknowns || [])];
  if (org < 55 || org === 0) {
    unknowns.push("店长是否具备独立经营能力（复制门槛未验证）");
  }
  if (finance < 55 || b.business.margin == null) {
    unknowns.push("现金缓冲与单店利润模型是否支撑扩张");
  }
  if (completeness < 25) {
    unknowns.push("餐厅经营事实完整度偏低，重大扩张判断依据不足");
  }
  if (!b.brand.positioning) {
    unknowns.push("品牌定位是否足够清晰以支持第二店心智复制");
  }
  if (!canClaimRegional) {
    unknowns.push("缺少品牌/城市锚点，暂无可靠区域市场竞争结论");
  }
  const uniqUnknowns = Array.from(
    new Set(unknowns.map((item) => toUserFacingGapLabel(item))),
  ).slice(0, 6);

  const openGaps: DecisionContextV1["openGaps"] = [];
  if (!canClaimRegional) {
    for (const g of mintelGate.gaps.gaps) {
      openGaps.push({
        gapId: g.gapId,
        question: g.question,
        reason: g.reason,
        bandOptions: g.bandOptions,
      });
    }
  }
  if (org < 55) {
    openGaps.push({
      gapId: "gap_manager",
      question: "现任店长能否在你不在场时独立撑起门店？",
      reason: "组织复制是扩店第一门槛",
      bandOptions: ["可以", "勉强", "不可以", "不确定"],
    });
  }
  if (finance < 55 || b.business.margin == null) {
    openGaps.push({
      gapId: "gap_cash",
      question: "现金储备大约能撑几个月扩张期（含装修/人力）？",
      reason: "需评估财务承受力",
      bandOptions: ["<3个月", "3–6个月", "6个月以上", "不清楚"],
    });
  }
  if (completeness < 20) {
    openGaps.push({
      gapId: "gap_model",
      question: "单店最近一季是盈利、打平还是亏损？",
      reason: "模型未验证前扩张风险高",
      bandOptions: ["盈利", "打平", "亏损", "不清楚"],
    });
  }

  const similarMatches = b.history.recentDecisions
    .filter((d) => /店|扩张|第二|开店/.test(d.question))
    .slice(0, 3)
    .map((d, i) => ({
      matchedCaseId: `hist_${i}`,
      similarity: 0.7,
      question: d.question,
      outcome: d.actual ? ("partial" as const) : ("unknown" as const),
      lesson: d.learningHint
        ? "该历史决策含可学习信号，扩店前请复盘"
        : "有相关历史议题，建议对照当时条件",
      effectivenessBand: "unknown" as const,
    }));

  const assumptions = canClaimRegional
    ? [
        `第二店与第一店同品类，优先考虑 ${city} 同城或邻近商圈`,
        "老板仍深度参与管理（除非组织评分已高）",
      ]
    : [
        "区域选址假设暂不可验证——请先补品牌与城市锚点",
        "老板仍深度参与管理（除非组织评分已高）",
      ];

  return {
    contextId: `ctx_${c.id}`,
    schemaVersion: 1,
    decisionId: c.id,
    projectId: c.projectId,
    updatedAt: new Date().toISOString(),
    facts,
    evidences: safeEvidences,
    restaurantState: state,
    historicalDecisions: b.history.recentDecisions.slice(0, 5).map((d) => ({
      label: clip(d.question, 32),
      summary: d.chosen ? clip(d.chosen, 48) : "尚无结论摘要",
      outcome: d.actual != null ? String(d.actual) : undefined,
      sourceLabel: "Brain Decision Memory",
    })),
    similarMatches,
    constraints: [
      "资金与现金流可承受",
      "组织/店长可复制",
      "单店模型基本成立",
      ...(canClaimRegional
        ? []
        : ["无品牌+城市锚点时不采信区域市场结论"]),
    ],
    assumptions,
    unknowns: uniqUnknowns,
    options: [],
    simulations: [],
    expertOpinions: [],
    risks: [],
    infoMap: {
      topicFamily: "expansion",
      weights: {
        cash: 0.9,
        organization: 0.95,
        // 无锚点时压低外部市场权重，避免装懂
        market_capacity: canClaimRegional ? 0.7 : 0.15,
        competition: canClaimRegional ? 0.65 : 0.15,
        site: canClaimRegional ? 0.7 : 0.2,
      },
      elevatedByAsk: true,
      mintelAnchorsReady: hasMintelAnchors({ brandName, city }),
    },
    openGaps: openGaps.slice(0, 4),
    councilInput: {
      decisionQuestion: c.question,
      originalQuestion: c.question,
      restaurantSnapshot: {
        stage: b.identity.stage || "未知",
        revenueTrend: b.business.revenue != null ? "有信号" : "未知",
        profitTrend: b.business.margin != null ? "有信号" : "未知",
        organizationHealth: org > 0 ? String(Math.round(org)) : "未知",
        ownerRisk: b.founder.riskPreference || "未知",
      },
      keyEvidence: safeEvidences.slice(0, 6).map((e) => ({
        label: e.source,
        claim: e.content,
      })),
      keyEvents: [],
      constraints: [
        "现金安全",
        "组织可复制",
        "单店盈利可解释",
        ...(canClaimRegional ? [] : ["禁止无锚点区域百分比结论"]),
      ],
      successLooksLike: ["第二店 6 个月内不拖垮单店利润", "店长可独立值班"],
      lessonLine: similarMatches[0]?.lesson,
    },
  };
}
