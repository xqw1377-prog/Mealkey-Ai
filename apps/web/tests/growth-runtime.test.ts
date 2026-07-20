import { describe, expect, it } from "vitest";
import { detectCognitiveGap } from "@/server/founder-layer/capability/growth/cognitive-gap";
import {
  buildDecisionPattern,
  buildGrowthPath,
  prependDecisionPatternHistory,
} from "@/server/founder-layer/capability/growth/decision-pattern";
import { buildGrowthRuntimeSnapshot } from "@/server/founder-layer/capability/growth/snapshot";
import type { CapabilityScore } from "@/server/founder-layer/contracts/capability";
import { mapFourToEight } from "@/server/founder-layer/capability/growth/eight-dim";
import {
  aggregateDecisionQuality,
  scoreDecisionQuality,
} from "@/server/founder-layer/capability/growth/decision-quality";
import { buildGrowthTasksFromGap } from "@/server/founder-layer/capability/growth/tasks";

describe("growth cognitive-gap", () => {
  it("验证通过时不报认知差距", () => {
    expect(
      detectCognitiveGap({
        result: "aligned",
        hypothesis: "加投放能涨客流",
        summary: "客流上升",
      }),
    ).toBeNull();
  });

  it("流量假设证伪时指向定位问题", () => {
    const gap = detectCognitiveGap({
      result: "off",
      hypothesis: "加投放能解决流量不足",
      summary: "投放后客群仍不匹配定位",
    });
    expect(gap).not.toBeNull();
    expect(gap!.kind).toBe("traffic_vs_positioning");
    expect(gap!.believedCause).toMatch(/流量|获客/);
    expect(gap!.suggestCommittee).toBe("brand");
  });

  it("验证未过且无明确关键词时仍给 ops_vs_strategy", () => {
    const gap = detectCognitiveGap({
      result: "off",
      hypothesis: "这个方案一定能成",
      summary: "指标全面未达",
    });
    expect(gap?.kind).toBe("ops_vs_strategy");
  });
});

describe("growth decision-pattern", () => {
  it("从 impact 映射 outcome 与 lesson", () => {
    const pattern = buildDecisionPattern({
      hypothesis: "午市套餐抬翻台",
      summary: "翻台持平，客单下降",
      impact: "invalidated",
      learning: "套餐伤客单，不宜再放大",
    });
    expect(pattern.outcome).toBe("invalidated");
    expect(pattern.lesson).toContain("客单");
    expect(pattern.hypothesis).toContain("午市");
  });

  it("prepend 保留最近模式", () => {
    const next = buildDecisionPattern({
      summary: "第二次",
      impact: "partial",
    });
    const list = prependDecisionPatternHistory(
      {
        decisionPatterns: [
          buildDecisionPattern({ summary: "第一次", impact: "confirmed" }),
        ],
      },
      next,
      2,
    );
    expect(list).toHaveLength(2);
    expect(list[0].actualSummary).toContain("第二次");
  });

  it("成长路径优先补短板", () => {
    const scores: CapabilityScore[] = [
      {
        id: "cognition",
        label: "认知",
        score: 40,
        note: "市场事实不足",
        trend: "down",
      },
      {
        id: "execution",
        label: "推动",
        score: 70,
        note: "ok",
        trend: "up",
      },
    ];
    const path = buildGrowthPath({
      scores,
      stage: "early",
      lastOutcome: "invalidated",
    });
    expect(path[0].title).toMatch(/证伪|复会/);
    expect(path.some((p) => p.title.includes("认知"))).toBe(true);
  });
});

describe("growth runtime snapshot", () => {
  it("从 profile 投影认知差距与路径", () => {
    const snap = buildGrowthRuntimeSnapshot({
      lastCognitiveGap: {
        gapId: "cg_1",
        kind: "price_vs_model",
        believedCause: "降价就能涨",
        likelyRootCause: "伤利润结构",
        summary: "认知偏差：用价格动作掩盖模式问题",
        createdAt: new Date().toISOString(),
      },
      lastDecisionPattern: {
        patternId: "dp_1",
        hypothesis: "降价促销",
        thenJudgement: "降价促销",
        actualSummary: "毛利下滑",
        outcome: "invalidated",
        lesson: "先看模型再动价格",
        createdAt: new Date().toISOString(),
      },
      lastCapabilityScores: [
        { id: "growth", label: "成长", score: 35, note: "缺回写", trend: "flat" },
        { id: "decision", label: "决策", score: 60, note: "", trend: "flat" },
      ],
      stage: "扩张期",
    });
    expect(snap.cognitiveGap?.kind).toBe("price_vs_model");
    expect(snap.lastDecisionPattern?.lesson).toContain("模型");
    expect(snap.growthPath.length).toBeGreaterThan(0);
    expect(snap.weakestLabel).toBe("成长");
    expect(snap.eightDim?.length).toBe(8);
  });
});

describe("Growth G1/G2/G4", () => {
  it("四维映射八维", () => {
    const eight = mapFourToEight([
      { id: "cognition", label: "认知", score: 60, note: "", trend: "flat" },
      { id: "decision", label: "决策", score: 50, note: "", trend: "flat" },
      { id: "execution", label: "推动", score: 70, note: "", trend: "up" },
      { id: "growth", label: "成长", score: 40, note: "", trend: "down" },
    ]);
    expect(eight).toHaveLength(8);
    expect(eight.find((d) => d.dim === "strategy")?.score).toBeGreaterThan(0);
  });

  it("Decision Quality 30/30/40", () => {
    const q = scoreDecisionQuality({
      judgement: 100,
      execution: 100,
      result: 0,
    });
    expect(q.total).toBe(60);
    const agg = aggregateDecisionQuality([
      {
        patternId: "1",
        hypothesis: "h",
        thenJudgement: "j",
        actualSummary: "a",
        outcome: "confirmed",
        lesson: "ok",
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(agg?.total).toBeGreaterThan(70);
  });

  it("Gap → GrowthTask 开会建议", () => {
    const tasks = buildGrowthTasksFromGap({
      gap: {
        gapId: "g1",
        kind: "traffic_vs_positioning",
        believedCause: "流量",
        likelyRootCause: "定位",
        summary: "流量问题其实是定位",
        suggestCommittee: "brand",
        createdAt: new Date().toISOString(),
      },
      scores: [
        { id: "cognition", label: "认知", score: 35, note: "", trend: "down" },
      ],
    });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].suggestedTopic).toBeTruthy();
    expect(tasks[0].suggestExpert).toBe("M-PNT");
  });
});
