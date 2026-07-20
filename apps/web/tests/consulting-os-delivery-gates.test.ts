/**
 * 席位 L5 交付门禁 — 反假完成
 */
import { describe, expect, it } from "vitest";
import {
  assertSeatDecisionReady,
  evaluateReportDeliveryReady,
  evaluateResearchEvidenceStrength,
} from "../../packages/agents/src/consulting-os";

describe("consulting-os delivery gates", () => {
  it("rejects pure heuristic research", () => {
    const r = evaluateResearchEvidenceStrength({
      packId: "p1",
      status: "ready",
      headline: "有结论",
      sections: [],
      risks: [],
      generatedAt: new Date().toISOString(),
      collectionMode: "heuristic",
      sources: ["短"],
    });
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => /启发式/.test(m))).toBe(true);
  });

  it("accepts hybrid research with two sources", () => {
    const r = evaluateResearchEvidenceStrength({
      packId: "p2",
      status: "confirmed",
      headline: "区域客流向写字楼商圈集中",
      sections: [{ title: "扫描", body: "正文足够长的市场扫描说明".repeat(2) }],
      risks: [],
      generatedAt: new Date().toISOString(),
      collectionMode: "hybrid",
      sources: [
        "来源甲 | 摘要足够长 | https://a.example",
        "来源乙 | 摘要足够长 | https://b.example",
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("requires decision substance and report markers", () => {
    expect(() =>
      assertSeatDecisionReady({
        governingQuestion: "q",
        recommendation: "建议",
        tradeoffAccepted: "",
        whyThis: [],
        killCriteria: ["短"],
        mondayMoves: ["短"],
        evidenceUsed: ["一"],
        whatWeWontDo: [],
        builtAt: new Date().toISOString(),
      }),
    ).toThrow(/决策包未齐/);

    expect(
      evaluateReportDeliveryReady("# 报告\n## 建议\n做\n## 取舍\n不做\n"),
    ).toBe(false);
    const readyReport = [
      "# 报告",
      "## 建议",
      "先试点再放量，切口必须可证明复购与原话",
      "## 取舍",
      "接受场景收窄，暂不铺开第二战场",
      "## 否决条件",
      "复购无提升则止损，人效不达门槛停止放量",
      "## 本周动作",
      "写作战卡并选定试点店，收集二十条顾客原话",
      "## 背景",
      "交付正文须含建议、取舍、否决与本周动作，且篇幅足以说明取舍理由与停手线。",
      "补充说明".repeat(40),
    ].join("\n");
    expect(readyReport.length).toBeGreaterThanOrEqual(280);
    expect(evaluateReportDeliveryReady(readyReport)).toBe(true);
  });
});
