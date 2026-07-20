import { describe, expect, it } from "vitest";
import type { AgentRestaurantContext } from "@mealkey/restaurant-brain";
import { buildExpansionDecisionCase } from "@/server/founder-layer/capability/decision-intelligence/case-factory";
import { buildExpansionContext } from "@/server/founder-layer/capability/decision-intelligence/context-builder";
import { buildExpansionOptions } from "@/server/founder-layer/capability/decision-intelligence/options-expansion";
import { computePreAssessment } from "@/server/founder-layer/capability/decision-intelligence/assessment";

function stubBrain(partial?: Partial<AgentRestaurantContext>): AgentRestaurantContext {
  return {
    identity: {
      name: "南门小馆",
      category: "湘菜",
      stage: "增长期",
      storeCount: 1,
      city: "长沙",
    },
    business: { revenue: 180, margin: 8 },
    brand: { positioning: "正宗湘菜" },
    capability: {
      scores: {
        strategy: 60,
        market: 55,
        product: 70,
        finance: 50,
        operation: 58,
        organization: 45,
        overall: 56,
      },
      confidence: 0.6,
    },
    founder: { riskPreference: "高", blindSpots: ["低估组织"] },
    history: {
      recentDecisions: [
        { question: "是否尝试第二店", chosen: "暂缓", learningHint: true },
      ],
    },
    learning: {
      patterns: [
        {
          pattern: "老板依赖高时扩张易失控",
          insight: "先建店长",
          confidence: 0.8,
        },
      ],
    },
    evolution: { understandingScore: 40, dataCompleteness: 30 },
    priorBlock: "测试",
    unknowns: [],
    ...partial,
  };
}

describe("DIE expansion context + assessment", () => {
  it("组装 Context 含 unknowns 与 ≥2 方案", () => {
    const c = buildExpansionDecisionCase({
      id: "dec_x",
      projectId: "p1",
      ownerId: "o1",
      ownerLabel: "王老板",
    });
    const ctx = buildExpansionContext({ case: c, brain: stubBrain() });
    expect(ctx.unknowns.length).toBeGreaterThan(0);
    expect(ctx.evidences.length).toBeGreaterThan(0);
    expect(ctx.openGaps.length).toBeLessThanOrEqual(3);

    const { options, simulations } = buildExpansionOptions({
      decisionCase: c,
      context: ctx,
    });
    expect(options.length).toBe(3);
    expect(simulations.length).toBe(3);
    expect(options.some((o) => o.isRecommended)).toBe(true);

    const assess = computePreAssessment({
      decisionId: c.id,
      context: { ...ctx, options, simulations },
      options,
    });
    expect(assess.confidenceScore).toBeGreaterThan(0);
    expect(assess.confidenceScore).toBeLessThanOrEqual(100);
    expect(assess.kind).toBe("pre");
    expect(assess.unknownFactors.length).toBeGreaterThan(0);
  });
});
