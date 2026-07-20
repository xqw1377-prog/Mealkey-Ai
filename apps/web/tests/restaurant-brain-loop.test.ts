/**
 * Restaurant Brain V1 闭环：Context 切片 + Decision 关联写回（mock Prisma）
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRestaurantContext,
  createEmptyBrain,
} from "@mealkey/restaurant-brain";
import { toRestaurantBrainContextSlice } from "@/server/restaurant-brain/service";

describe("Restaurant Brain V1 闭环接线", () => {
  it("toRestaurantBrainContextSlice 暴露 profile / capability / history / priorBlock", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "等里长沙",
      category: "湘菜",
      stage: "growth",
      storeCount: 1,
      location: "上海",
    });
    brain.business.netMargin = 0.08;
    brain.capability.confidence = 0.6;
    brain.capability.organizationScore = 55;
    brain.capability.overallScore = 65;
    brain.founder.riskPreference = "激进";
    brain.founder.decisionStyle = "高速增长型";
    brain.recentDecisions = [
      {
        id: "d1",
        restaurantId: "r1",
        type: "EXPANSION",
        question: "是否快速加盟扩张？",
        chosenOption: "开",
        actualOutcome: { result: "半年不及预期" },
        learningGenerated: true,
        status: "validated",
        createdAt: new Date().toISOString(),
      },
    ];
    brain.recentLearnings = [
      {
        id: "l1",
        restaurantId: "r1",
        sourceType: "decision",
        pattern: "Expansion_Risk_Pattern",
        insight: "组织能力不足时禁止扩张",
        confidence: 0.75,
        appliedCount: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    const ctx = buildRestaurantContext(brain);
    const slice = toRestaurantBrainContextSlice(ctx, "r1");

    expect(slice.restaurantId).toBe("r1");
    expect(slice.profile.storeCount).toBe(1);
    expect(slice.profile.category).toBe("湘菜");
    expect(slice.capability.organization).toBe(55);
    expect(slice.recentDecisions[0]?.question).toContain("扩张");
    expect(slice.learnings[0]?.pattern).toBe("Expansion_Risk_Pattern");
    expect(slice.priorBlock).toContain("餐厅经营大脑");
    expect(slice.priorBlock).toContain("组织");
  });

  it("PrismaRestaurantBrainService.recordDecision 写 DecisionRecord + BrainEvent（关联 mkDecisionId）", async () => {
    const decisionCreate = vi.fn().mockResolvedValue({
      id: "dr1",
      mkDecisionId: "mk_dec_1",
    });
    const eventCreate = vi.fn().mockResolvedValue({ id: "ev1" });
    const evoUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue(null);

    const prisma = {
      decisionRecord: {
        findUnique,
        create: decisionCreate,
        update: vi.fn(),
      },
      brainEvent: { create: eventCreate },
      evolutionState: { updateMany: evoUpdate },
    };

    const { PrismaRestaurantBrainService } = await import(
      "@/server/restaurant-brain/prisma-service"
    );
    const svc = new PrismaRestaurantBrainService(prisma as never);

    await svc.recordDecision({
      id: "pending_mk_dec_1",
      restaurantId: "r1",
      mkDecisionId: "mk_dec_1",
      type: "EXPANSION",
      question: "我要不要开第二家店？",
      chosenOption: "不建议立即开店",
      context: { organizationScore: 55 },
      learningGenerated: false,
      status: "open",
      createdAt: new Date().toISOString(),
    });

    expect(decisionCreate).toHaveBeenCalledTimes(1);
    const created = decisionCreate.mock.calls[0][0].data;
    expect(created.mkDecisionId).toBe("mk_dec_1");
    expect(created.question).toContain("第二家店");
    expect(created.aiAssessmentJson).toBeNull();
    expect(eventCreate).toHaveBeenCalledTimes(1);
    expect(eventCreate.mock.calls[0][0].data.type).toBe("DECISION_CREATED");
    expect(evoUpdate).toHaveBeenCalledTimes(1);
  });

  it("linkFromMkDecision 不复制完整决策正文，只挂 mkDecisionId + 事实快照", async () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "店",
      category: "湘菜",
      stage: "growth",
      storeCount: 1,
    });
    brain.restaurant.id = "r1";
    brain.capability.organizationScore = 55;
    brain.business.netMargin = 0.08;

    const ensureSpy = vi.fn().mockResolvedValue(brain);
    const recordSpy = vi.fn().mockResolvedValue(undefined);

    const { PrismaRestaurantBrainService } = await import(
      "@/server/restaurant-brain/prisma-service"
    );
    const svc = new PrismaRestaurantBrainService({} as never);
    svc.ensureByProject = ensureSpy;
    svc.recordDecision = recordSpy;

    await svc.linkFromMkDecision({
      projectId: "p1",
      ownerId: "o1",
      mkDecisionId: "mk_99",
      type: "EXPANSION",
      question: "我要不要开第二家店？",
      judgementSummary: "不建议立即开店。核心原因是组织复制能力。",
    });

    expect(recordSpy).toHaveBeenCalledTimes(1);
    const arg = recordSpy.mock.calls[0][0];
    expect(arg.mkDecisionId).toBe("mk_99");
    expect(arg.context).toMatchObject({
      storeCount: 1,
      organizationScore: 55,
      netMargin: 0.08,
    });
    expect(arg.aiAssessment).toBeUndefined();
    expect(JSON.stringify(arg)).not.toContain("observation");
  });
});

describe("黄金场景 prior 语义", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("第二家店场景 priorBlock 含组织/利润/历史扩张风险信号", () => {
    const brain = createEmptyBrain({
      projectId: "p1",
      ownerId: "o1",
      displayName: "等里",
      category: "湘菜",
      stage: "growth",
      storeCount: 1,
      location: "上海",
    });
    brain.business.netMargin = 0.08;
    brain.capability.confidence = 0.6;
    brain.capability.organizationScore = 55;
    brain.capability.overallScore = 65;
    brain.founder.riskPreference = "激进";
    brain.recentDecisions = [
      {
        id: "d1",
        restaurantId: "r1",
        type: "EXPANSION",
        question: "是否开第二家店？",
        chosenOption: "开",
        actualOutcome: "扩张失败",
        learningGenerated: true,
        status: "validated",
        createdAt: new Date().toISOString(),
      },
    ];

    const prior = buildRestaurantContext(brain).priorBlock;
    expect(prior).toMatch(/门店：1|门店: 1/);
    expect(prior).toContain("组织");
    expect(prior).toMatch(/8%|净利率/);
    expect(prior).toMatch(/扩张|风险/);
  });
});
