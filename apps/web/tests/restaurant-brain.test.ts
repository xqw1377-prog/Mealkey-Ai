import { describe, expect, it } from "vitest";
import {
  applyLearning,
  buildRestaurantContext,
  computeDataCompleteness,
  createEmptyBrain,
  detectExpansionRiskPattern,
  mergeDnaPatch,
  recomputeEvolution,
  thinStartBrand,
} from "@mealkey/restaurant-brain";

describe("Restaurant Brain V1 规范化契约", () => {
  it("空脑：unknowns 非空，Fact 与 Decision 分离", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "等里长沙",
      category: "湘菜",
      stage: "growth",
      storeCount: 3,
      location: "上海",
    });
    expect(brain.restaurant.name).toBe("等里长沙");
    expect(brain.profile.storeCount).toBe(3);
    expect(brain.recentDecisions).toEqual([]);
    const ctx = buildRestaurantContext(brain);
    expect(ctx.identity.category).toBe("湘菜");
    expect(ctx.unknowns.length).toBeGreaterThan(0);
    // 用户可见 unknowns 不得露出内部字段键
    for (const u of ctx.unknowns) {
      expect(u).not.toMatch(/^(profile|brand|business|founder)\./);
      expect(u).not.toBe("capability");
    }
    expect(ctx.unknowns).toEqual(
      expect.arrayContaining(["月营收", "组织与经营能力画像", "老板决策风格"]),
    );
    expect(ctx.priorBlock).toContain("不得编造");
    expect(ctx.priorBlock).toContain("月营收");
    expect(ctx.priorBlock).not.toContain("business.monthlyRevenue");
  });

  it("薄启动提升完整度", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "店",
    });
    const thin = thinStartBrand({
      category: "湘菜",
      positioning: "年轻人的高性价比湘菜",
      targetCustomer: "25-35白领",
      priceRange: "60-100",
    });
    brain.profile = { ...brain.profile, ...thin.profile, stage: "growth" };
    brain.brand = { ...brain.brand, ...thin.brand };
    expect(computeDataCompleteness(brain)).toBeGreaterThan(10);
  });

  it("mergeDnaPatch 写入 Brand 事实而非答案", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "店",
    });
    const result = mergeDnaPatch(brain, {
      kind: "dna_patch_propose",
      projectId: "p1",
      layer: "brand",
      key: "positioning",
      value: "年轻人的高性价比湘菜",
      confidence: 0.7,
      source: "consulting",
      at: new Date().toISOString(),
    });
    expect(result.accepted).toBe(true);
    expect(result.snapshot.brand.positioning).toContain("湘菜");
  });

  it("验证失败写入 founder.blindSpots", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "店",
    });
    const result = applyLearning(brain, {
      kind: "decision_memory_validated",
      decisionMemoryId: "d1",
      projectId: "p1",
      actualOutcome: { result: "亏损" },
      learning: "组织能力不足时禁止扩张",
      outcome: "invalidated",
      at: new Date().toISOString(),
    });
    expect(result.snapshot.founder.blindSpots).toContain(
      "组织能力不足时禁止扩张",
    );
  });

  it("Context 含 capability / history / learning 协议字段", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "等里",
      category: "湘菜",
      stage: "growth",
      storeCount: 3,
    });
    brain.capability.confidence = 0.5;
    brain.capability.organizationScore = 55;
    brain.capability.overallScore = 65;
    const ctx = buildRestaurantContext(brain);
    expect(ctx.capability.scores.organization).toBe(55);
    expect(Array.isArray(ctx.unknowns)).toBe(true);
    expect(ctx.history.recentDecisions).toEqual([]);
    expect(ctx.learning.patterns).toEqual([]);
  });

  it("Expansion_Risk_Pattern", () => {
    const pattern = detectExpansionRiskPattern({
      restaurantId: "p1",
      capability: {
        restaurantId: "p1",
        strategyScore: 70,
        marketScore: 70,
        productScore: 80,
        financeScore: 60,
        operationScore: 60,
        organizationScore: 55,
        overallScore: 65,
        confidence: 0.6,
      },
      decisions: [
        {
          id: "d1",
          restaurantId: "p1",
          type: "EXPANSION",
          question: "是否开第二家店？",
          chosenOption: "开",
          actualOutcome: "半年亏损",
          learningGenerated: false,
          status: "validated",
          createdAt: new Date().toISOString(),
        },
        {
          id: "d2",
          restaurantId: "p1",
          type: "EXPANSION",
          question: "是否加盟扩张？",
          chosenOption: "开",
          actualOutcome: "不及预期",
          learningGenerated: false,
          status: "validated",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(pattern?.pattern).toBe("Expansion_Risk_Pattern");
  });

  it("recomputeEvolution 随经营事实上升", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "店",
      category: "湘菜",
      stage: "growth",
    });
    brain.business.monthlyRevenue = 800000;
    brain.business.netMargin = 0.08;
    brain.capability.confidence = 0.5;
    const evo = recomputeEvolution(brain);
    expect(evo.understandingScore).toBeGreaterThan(0);
  });
});
