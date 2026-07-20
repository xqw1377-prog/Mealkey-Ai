import { listUnknowns } from "../domain/completeness";
import type {
  AgentRestaurantContext,
  RestaurantBrainSnapshot,
} from "../domain/types";

export function deriveActiveRisks(snapshot: RestaurantBrainSnapshot): string[] {
  const risks: string[] = [];
  const org = snapshot.capability.organizationScore;
  if (snapshot.capability.confidence >= 0.3 && org > 0 && org < 70) {
    risks.push("组织能力偏弱，扩张复制风险高");
  }
  const rev = snapshot.business.monthlyRevenue;
  const net = snapshot.business.netMargin;
  if (rev != null && net != null && net < 0.08) {
    risks.push("净利率偏低，现金缓冲可能不足");
  }
  const failed = snapshot.recentDecisions.filter((d) => {
    const actual = JSON.stringify(d.actualOutcome ?? "");
    return (
      /扩张|开店|加盟|第二|第.家/.test(d.question) &&
      /亏|失败|不及|延期/.test(actual)
    );
  });
  if (failed.length > 0) {
    risks.push("存在扩张类决策负面结果");
  }
  if (snapshot.evolution.dataCompleteness < 40) {
    risks.push("餐厅认知完整度偏低，重大决策宜降置信");
  }
  return risks.slice(0, 5);
}

export function deriveGrowthOpportunities(
  snapshot: RestaurantBrainSnapshot,
): string[] {
  const ops: string[] = [];
  if (
    snapshot.capability.confidence >= 0.3 &&
    snapshot.capability.productScore >= 70 &&
    snapshot.capability.organizationScore < 65
  ) {
    ops.push("产品能力较强：优先标准化与店长培养，再谈扩张");
  }
  return ops.slice(0, 5);
}

export function buildPriorBlock(snapshot: RestaurantBrainSnapshot): string {
  const { restaurant, profile, brand, business, capability, founder } =
    snapshot;
  const lines = [
    `【餐厅经营大脑 · ${restaurant.name}】`,
    `理解度 ${snapshot.evolution.understandingScore}% · 完整度 ${snapshot.evolution.dataCompleteness}%`,
    `品类：${profile.category || "未知"} · 阶段：${profile.stage} · 门店：${profile.storeCount}` +
      (profile.city ? ` · ${profile.city}` : ""),
    "",
    "品牌：",
    `- 定位：${brand.positioning || "未知"}`,
    `- 客群：${brand.targetCustomer || "未知"}`,
    `- 风险：${brand.brandRisk || "未知"}`,
    "",
    "经营：",
    `- 月营收：${business.monthlyRevenue ?? "未知"}`,
    `- 毛利率：${business.grossMargin != null ? Math.round(business.grossMargin * 100) + "%" : "未知"}`,
    `- 净利率：${business.netMargin != null ? Math.round(business.netMargin * 100) + "%" : "未知"}`,
    "",
    "能力：",
    capability.confidence < 0.2
      ? "- （能力画像置信不足）"
      : `- 综合 ${capability.overallScore} · 组织 ${capability.organizationScore} · 财务 ${capability.financeScore}`,
    "",
    "老板：",
    `- 风格：${founder.decisionStyle || "未知"} · 风险偏好：${founder.riskPreference || "未知"}`,
  ];

  const risks = deriveActiveRisks(snapshot);
  if (risks.length) {
    lines.push("", "当前风险：", ...risks.map((r) => `- ${r}`));
  }

  const unknowns = listUnknowns(snapshot);
  lines.push("", "未知（不得编造）：");
  if (unknowns.length === 0) lines.push("- 关键字段已有初步覆盖");
  else unknowns.forEach((u) => lines.push(`- ${u}`));

  if (snapshot.recentDecisions.length) {
    lines.push("", "决策历史：");
    snapshot.recentDecisions.slice(0, 5).forEach((d) => {
      lines.push(
        `- ${d.question} → ${d.chosenOption ?? "未选"}；结果：${d.actualOutcome != null ? JSON.stringify(d.actualOutcome) : "进行中"}`,
      );
    });
  }

  if (snapshot.recentLearnings.length) {
    lines.push("", "学习模式：");
    snapshot.recentLearnings.slice(0, 3).forEach((l) => {
      lines.push(`- ${l.pattern}：${l.insight}`);
    });
  }

  lines.push(
    "",
    "铁律：建议必须基于以上事实与历史；未知处先提问；禁止通用空谈。",
  );
  return lines.join("\n");
}

/** Context Builder — Agent 唯一推荐入口 */
export function buildRestaurantContext(
  snapshot: RestaurantBrainSnapshot,
): AgentRestaurantContext {
  return {
    identity: {
      name: snapshot.restaurant.name,
      category: snapshot.profile.category,
      stage: snapshot.profile.stage,
      storeCount: snapshot.profile.storeCount,
      city: snapshot.profile.city,
    },
    business: {
      revenue: snapshot.business.monthlyRevenue,
      margin: snapshot.business.netMargin ?? snapshot.business.grossMargin,
      averageTicket: snapshot.business.averageTicket,
    },
    brand: {
      positioning: snapshot.brand.positioning,
      risk: snapshot.brand.brandRisk,
      targetCustomer: snapshot.brand.targetCustomer,
    },
    capability: {
      scores: {
        strategy: snapshot.capability.strategyScore,
        market: snapshot.capability.marketScore,
        product: snapshot.capability.productScore,
        finance: snapshot.capability.financeScore,
        operation: snapshot.capability.operationScore,
        organization: snapshot.capability.organizationScore,
        overall: snapshot.capability.overallScore,
      },
      confidence: snapshot.capability.confidence,
    },
    founder: {
      style: snapshot.founder.decisionStyle,
      riskPreference: snapshot.founder.riskPreference,
      blindSpots: snapshot.founder.blindSpots ?? [],
    },
    history: {
      recentDecisions: snapshot.recentDecisions.slice(0, 5).map((d) => ({
        question: d.question,
        chosen: d.chosenOption,
        actual: d.actualOutcome,
        learningHint: d.learningGenerated,
      })),
    },
    learning: {
      patterns: snapshot.recentLearnings.slice(0, 5).map((l) => ({
        pattern: l.pattern,
        insight: l.insight,
        confidence: l.confidence,
      })),
    },
    evolution: {
      understandingScore: snapshot.evolution.understandingScore,
      dataCompleteness: snapshot.evolution.dataCompleteness,
    },
    priorBlock: buildPriorBlock(snapshot),
    unknowns: listUnknowns(snapshot),
  };
}

/** @deprecated 旧名 */
export function toBrainContext(snapshot: RestaurantBrainSnapshot) {
  const ctx = buildRestaurantContext(snapshot);
  return {
    version: "v1" as const,
    restaurantId: snapshot.restaurant.id,
    displayName: snapshot.restaurant.name,
    completeness: {
      overall: snapshot.evolution.dataCompleteness,
      byLayer: {
        brand: 0,
        business: 0,
        market: 0,
        organization: 0,
        founder: 0,
      },
      deltaToday: 0,
      updatedAt: new Date().toISOString(),
    },
    understandingScore: snapshot.evolution.understandingScore,
    priorBlock: ctx.priorBlock,
    dna: { version: "v1" as const, brand: {}, business: {}, market: {}, organization: {}, founder: {}, completeness: { overall: 0, byLayer: { brand: 0, business: 0, market: 0, organization: 0, founder: 0 }, deltaToday: 0, updatedAt: new Date().toISOString() } },
    recentDecisions: snapshot.recentDecisions,
    unknowns: ctx.unknowns,
  };
}
