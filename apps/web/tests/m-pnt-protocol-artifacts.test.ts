/**
 * M-PNT Protocol V1 — P0 Challenge / P3 Human Truth / P5 Options
 */
import { describe, expect, it } from "vitest";
import {
  attachStrategyOptions,
  assertHumanTruthReady,
  buildBrandChallengeBrief,
  buildHumanTruthFromInsight,
  buildStrategyOptionsFromAdvisors,
  enrichConsumerInsightWithHumanTruth,
  type AdvisorStrategySet,
  type ConsumerInsight,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("m-pnt protocol artifacts", () => {
  it("builds Brand Challenge Brief from basics goal", () => {
    const brief = buildBrandChallengeBrief({
      basics: {
        artifactId: "b1",
        status: "complete",
        values: {
          brandName: "味本源",
          category: "鲜椒烤鱼",
          region: "成都",
          businessGoal: "先把心智钉死再开第三家连锁",
          mainPain: "如何避免进入传统湘菜红海",
        },
        missingMust: [],
        missingShould: [],
        updatedAt: new Date().toISOString(),
      },
      projectName: "味本源",
      city: "成都",
    });
    expect(brief.goalKind).toBe("scale");
    expect(brief.coreChallenge).toMatch(/红海|烤鱼/);
    expect(brief.projectLabel).toContain("味本源");
  });

  it("builds and validates Human Truth four segments", () => {
    const insight: ConsumerInsight = {
      artifactId: "c1",
      status: "complete",
      targetCustomer: "白领下班客人",
      jobsToBeDone: ["确定感"],
      barriers: ["喜欢地方味道，却拒绝老式不确定体验"],
      unmetNeeds: ["可预期的年轻地方文化表达"],
      primaryPersona: "25-35白领",
      occasions: ["下班小聚"],
      emotionalJob: "社交不踩雷",
      functionalJob: "吃顿靠谱的地方菜",
      insightStatement: "行为与体验存在矛盾",
    };
    const truth = buildHumanTruthFromInsight(insight);
    expect(() => assertHumanTruthReady(truth)).not.toThrow();
    expect(truth.behavior).toMatch(/白领|场合/);
    expect(truth.strategicOpportunity.length).toBeGreaterThan(8);
  });

  it("does not let short unmetNeed block Human Truth draft for research", () => {
    const insight: ConsumerInsight = {
      artifactId: "c2",
      status: "draft",
      targetCustomer: "周边居民",
      jobsToBeDone: ["方便"],
      barriers: ["怕踩雷"],
      unmetNeeds: ["确定感"],
      primaryPersona: "家庭客",
      occasions: ["周末"],
      emotionalJob: "安心",
      functionalJob: "吃顿饭",
      insightStatement: "短",
    };
    const enriched = enrichConsumerInsightWithHumanTruth(insight);
    expect(enriched.humanTruth?.unmetNeed.length).toBeGreaterThanOrEqual(8);
    expect(() => assertHumanTruthReady(enriched.humanTruth)).not.toThrow();
  });

  it("maps three advisors to Option A/B/C", () => {
    const set: AdvisorStrategySet = {
      setId: "s1",
      status: "ready",
      generatedAt: new Date().toISOString(),
      conflictSummary: "三策互斥",
      strategies: [
        {
          advisorId: "ries",
          oneLiner: "心智占位：鲜椒据点",
          positioningStatement: "陈述A",
          frameOfReference: "烤鱼",
          forWhom: "白领",
          jobToBeDone: "确定感",
          battlefield: "高新",
          pointOfDifference: "可复述",
          differentiation: "可复述",
          proof: "出餐",
          sacrifice: "不做全菜单",
          doNotDo: "不做网红堆料",
          risk: "教育成本",
          rationale: "占位",
        },
        {
          advisorId: "trout",
          oneLiner: "空位：家庭干净烤鱼",
          positioningStatement: "陈述B",
          frameOfReference: "烤鱼",
          forWhom: "家庭",
          jobToBeDone: "干净",
          battlefield: "家庭",
          pointOfDifference: "不像重口馆",
          differentiation: "不像重口馆",
          proof: "供应链",
          sacrifice: "不做宴请",
          doNotDo: "不做重口",
          risk: "客单",
          rationale: "空位",
        },
        {
          advisorId: "ye",
          oneLiner: "冲突：反油腻确定感",
          positioningStatement: "陈述C",
          frameOfReference: "烤鱼",
          forWhom: "年轻人",
          jobToBeDone: "情绪",
          battlefield: "社交",
          pointOfDifference: "反油腻",
          differentiation: "反油腻",
          proof: "场景",
          sacrifice: "不做传统装修",
          doNotDo: "不做老店感",
          risk: "老客流失",
          rationale: "冲突",
        },
      ],
    };
    const opts = buildStrategyOptionsFromAdvisors(set);
    expect(opts.options).toHaveLength(3);
    expect(opts.options.map((o) => o.optionId)).toEqual(["A", "B", "C"]);
    const attached = attachStrategyOptions(set);
    expect(attached.strategyOptions?.options[0]?.claim).toContain("心智");
  });
});
