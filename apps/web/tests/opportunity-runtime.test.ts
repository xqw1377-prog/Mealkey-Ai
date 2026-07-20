import { describe, expect, it } from "vitest";
import {
  buildOpportunity,
  computeOpportunityScore,
  suggestOpportunityStatusFromScore,
} from "@/server/founder-layer/contracts/opportunity-runtime";
import { scoreCompanyFit } from "@/server/founder-layer/capability/opportunity/fit";
import { projectOpportunitiesFromSignals } from "@/server/founder-layer/capability/opportunity/signals";
import { applyOpportunityFailureDownweight } from "@/server/founder-layer/capability/opportunity/memory-weight";

describe("computeOpportunityScore", () => {
  it("四因子相乘 ×100", () => {
    const score = computeOpportunityScore({
      marketAttractive: 0.8,
      companyFit: 0.9,
      executionCapability: 0.7,
      timing: 1,
    });
    // 0.8*0.9*0.7*1 = 0.504 → 50.4
    expect(score).toBe(50.4);
    expect(suggestOpportunityStatusFromScore(score)).toBe("detected");
  });

  it("Company Fit=0 → 总分 0（不是你的机会）", () => {
    expect(
      computeOpportunityScore({
        marketAttractive: 1,
        companyFit: 0,
        executionCapability: 1,
        timing: 1,
      }),
    ).toBe(0);
  });

  it("score≥60 → exploring 候选", () => {
    const score = computeOpportunityScore({
      marketAttractive: 0.9,
      companyFit: 0.9,
      executionCapability: 0.9,
      timing: 0.9,
    });
    // 0.9^4 = 0.6561 → 65.6
    expect(score).toBe(65.6);
    expect(suggestOpportunityStatusFromScore(score)).toBe("exploring");
  });
});

describe("buildOpportunity", () => {
  it("构造实体并默认 status", () => {
    const opp = buildOpportunity({
      id: "opp_1",
      ownerId: "owner_1",
      projectId: "proj_1",
      title: "健康湘菜窗口",
      description: "年轻消费者减油腻",
      type: "category",
      source: "agent",
      factors: {
        marketAttractive: 0.85,
        companyFit: 0.8,
        executionCapability: 0.75,
        timing: 0.9,
      },
      suggestExpert: "M-PNT",
      suggestedTopic: "是否做年轻化健康湘菜定位",
    });
    expect(opp.score).toBeGreaterThan(40);
    expect(opp.factors.companyFit).toBe(0.8);
    expect(opp.suggestExpert).toBe("M-PNT");
    expect(["detected", "exploring"]).toContain(opp.status);
  });

  it("禁区 Fit 压低后不进 exploring", () => {
    const opp = buildOpportunity({
      id: "opp_2",
      ownerId: "o",
      title: "预制菜机会",
      description: "市场有窗口但无供应链",
      type: "product",
      source: "memory",
      factors: {
        marketAttractive: 0.95,
        companyFit: 0.2,
        executionCapability: 0.5,
        timing: 0.9,
      },
    });
    expect(opp.score).toBeLessThan(60);
    expect(opp.status).toBe("detected");
  });
});

describe("Opportunity O2/O3/O6", () => {
  it("禁区大幅降低 Company Fit", () => {
    const fit = scoreCompanyFit({
      baseFit: 0.9,
      topic: "进商场",
      memory: {
        facts: [],
        decisions: [],
        preferences: [],
        patterns: [
          {
            patternId: "p1",
            kind: "failure",
            summary: "不要进高租金商场",
            createdAt: new Date().toISOString(),
          },
        ],
        priorBlock: "",
      },
    });
    expect(fit).toBeLessThan(0.4);
  });

  it("验证超预期投影机会候选", () => {
    const opps = projectOpportunitiesFromSignals({
      ownerId: "o",
      projectId: "p",
      validationSurprise: {
        result: "aligned",
        summary: "客流增长超预期，复购上升",
        hypothesis: "社区店模型",
      },
    });
    expect(opps.length).toBeGreaterThan(0);
    expect(opps[0].type).toBe("market");
  });

  it("失败 lesson 降权同类机会", () => {
    const base = buildOpportunity({
      id: "opp_x",
      ownerId: "o",
      title: "预制菜扩张",
      description: "做预制菜供应链",
      type: "product",
      source: "agent",
      factors: {
        marketAttractive: 0.9,
        companyFit: 0.8,
        executionCapability: 0.8,
        timing: 0.9,
      },
    });
    const down = applyOpportunityFailureDownweight(base, [
      "预制菜扩张曾失败，供应链跟不上",
    ]);
    expect(down.score).toBeLessThan(base.score);
  });
});
