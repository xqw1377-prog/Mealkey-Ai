import { describe, expect, it } from "vitest";
import { generateDebateRound } from "@/server/founder-layer/meeting/debate";
import type { ExpertStatement } from "@/lib/meeting";

const runtime = {
  meeting: {
    recommendation: "可以谨慎推进，但必须先验证单元经济。",
    conflicts: [
      {
        conflictId: "c1",
        summary: "扩张节奏存在分歧",
        sideA: "M-MKT：市场窗口仍在",
        sideB: "M-BIZ：模型尚未跑通",
        dimension: "扩张节奏",
        agents: ["M-MKT", "M-BIZ"],
      },
    ],
    rounds: [
      { round: 1, title: "独立判断", items: [{ agent: "M-MKT", summary: "窗口还在" }] },
      { round: 2, title: "冲突", items: [{ agent: "M-BIZ", summary: "先验证回本" }] },
      { round: 3, title: "收口", items: [{ agent: "M-BIZ", summary: "带条件推进" }] },
    ],
  },
  decisions: [
    {
      decisionId: "d1",
      sourceAgent: "M-MKT",
      judgement: "市场窗口仍在，可以进入",
      stance: "support",
      risks: ["竞争加剧"],
      nextSteps: ["先验证获客成本"],
    },
    {
      decisionId: "d2",
      sourceAgent: "M-BIZ",
      judgement: "单元经济未跑通，不建议直接扩张",
      stance: "oppose",
      risks: ["现金流承压"],
      nextSteps: ["先算清单店回本"],
    },
  ],
  finalDecision: {
    chosen: "带条件推进",
    problem: "是否扩张到 100 家",
    reason: ["市场有窗口", "模型仍需验证"],
    validationPlan: ["验证单店回本", "锁定获客成本上限"],
  },
};

const previous: ExpertStatement[] = [
  {
    id: "d1",
    roleId: "founder.M-MKT",
    displayName: "市场顾问",
    round: 1,
    stance: "support",
    claim: "市场窗口仍在，可以进入",
    reasons: ["窗口还在"],
  },
  {
    id: "d2",
    roleId: "founder.M-BIZ",
    displayName: "商业顾问",
    round: 1,
    stance: "oppose",
    claim: "单元经济未跑通，不建议直接扩张",
    reasons: ["回本不明"],
  },
];

describe("generateDebateRound", () => {
  it("无 Key 时 Round2 投影降级", async () => {
    process.env.HEURISTIC_ONLY = "true";
    const result = await generateDebateRound({
      round: 2,
      topic: "要不要扩张到 100 家",
      previous,
      runtime,
    });
    expect(result.source).toBe("projection");
    expect(result.round).toBe(2);
    expect(result.statements.some((s) => s.round === 2)).toBe(true);
    expect(result.statements.filter((s) => s.round === 1)).toHaveLength(2);
  });

  it("无 Key 时 Round3 产出共识", async () => {
    process.env.HEURISTIC_ONLY = "true";
    const result = await generateDebateRound({
      round: 3,
      topic: "要不要扩张到 100 家",
      focusChoice: "先验证回本",
      previous,
      runtime,
    });
    expect(result.source).toBe("projection");
    expect(result.round).toBe(3);
    expect(result.consensus).not.toBeNull();
    expect(result.consensus?.coreReasons.some((r) => r.includes("先验证回本"))).toBe(true);
  });
});
