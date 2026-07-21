import { describe, expect, it } from "vitest";
import {
  analyzeSignals,
  canPromoteSignalToCase,
  hasFiveLayers,
  hasMinimumEvidenceChain,
  rankBusinessSignals,
  selectRadarSlice,
  toDecisionCaseDraft,
} from "@mealkey/business-signal-engine";

describe("@mealkey/business-signal-engine · 数据契约", () => {
  it("五层齐全 + 口碑风险排序高于弱竞争", () => {
    const signals = analyzeSignals({
      projectId: "p1",
      restaurantContext: { peakDaypart: "晚市", brandName: "南门小馆" },
      worldHints: [
        {
          id: "comp",
          title: "附近新开一家店",
          detail: "3公里内新增餐厅",
          kind: "competition",
        },
        {
          id: "svc",
          title: "服务体验风险上升",
          detail: "过去7天服务慢相关评价增加",
          kind: "alert",
        },
      ],
    });
    expect(signals).toHaveLength(2);
    for (const s of signals) {
      expect(hasMinimumEvidenceChain(s.evidence)).toBe(true);
      expect(hasFiveLayers(s)).toBe(true);
      expect(s.scores.confidence).toBeGreaterThanOrEqual(1);
      expect(s.scores.rankScore).toBe(
        s.scores.impact *
          s.scores.urgency *
          s.scores.confidence *
          s.scores.relevance,
      );
    }
    const ranked = rankBusinessSignals(signals);
    expect(ranked[0]!.type).toBe("CUSTOMER");
    expect(["HIGH", "CRITICAL"]).toContain(ranked[0]!.severity);
  });

  it("Promote Gate：证据不足 / 无问题不可升格；合格可出 Case 草稿", () => {
    const [svc] = analyzeSignals({
      projectId: "p1",
      worldHints: [
        {
          id: "svc",
          title: "服务体验风险上升",
          detail: "等待时间差评增多",
          kind: "alert",
        },
      ],
    });
    expect(svc).toBeTruthy();
    expect(canPromoteSignalToCase(svc!).ok).toBe(true);
    const draft = toDecisionCaseDraft(svc!, { projectId: "p1" });
    expect(draft).toBeTruthy();
    expect(draft!.question).toMatch(/服务|晚市/);
    expect(draft!.status).toBe("DISCOVERED");
    expect(draft!.signalId).toBe(svc!.id);
    expect(draft!.evidenceSummary.length).toBeGreaterThanOrEqual(1);

    const thin = {
      ...svc!,
      evidence: [{ source: "x", fact: "只有推理", kind: "inference" as const }],
    };
    expect(canPromoteSignalToCase(thin).ok).toBe(false);
  });

  it("首页切片：1 primary + ≤3 others", () => {
    const signals = analyzeSignals({
      projectId: "p1",
      worldHints: [
        {
          id: "1",
          title: "服务体验风险上升",
          detail: "等待时间差评增多",
          kind: "alert",
        },
        {
          id: "2",
          title: "附近新增湘菜馆",
          detail: "同价位客单90-120",
          kind: "competition",
        },
        {
          id: "3",
          title: "用户认可增强",
          detail: "炭火关键词正向增长",
          kind: "customer",
        },
      ],
    });
    const slice = selectRadarSlice(signals);
    expect(slice.primary).toBeTruthy();
    expect(hasFiveLayers(slice.primary!)).toBe(true);
    expect(slice.others.length).toBeLessThanOrEqual(3);
  });
});
