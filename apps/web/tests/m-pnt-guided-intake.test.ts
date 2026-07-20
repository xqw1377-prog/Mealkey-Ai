/**
 * 引导录入题库：覆盖检测与缺口人话
 */
import { describe, expect, it } from "vitest";
import {
  PRIMARY_FACT_GUIDE,
  guidedFactCoverage,
  humanizeConsultingGap,
  plainBattlefieldChoice,
  BATTLEFIELD_REASON_PRESETS,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("guided intake", () => {
  it("has three primary fact guide questions covering stages", () => {
    expect(PRIMARY_FACT_GUIDE).toHaveLength(3);
    const stages = PRIMARY_FACT_GUIDE.map((q) => q.relatedStage);
    expect(stages).toContain("CATEGORY_ANALYSIS");
    expect(stages).toContain("CONSUMER_INSIGHT");
    expect(stages).toContain("COMPETITIVE_MAPPING");
  });

  it("reports missing questions until each stage has a fact", () => {
    expect(guidedFactCoverage([]).ok).toBe(false);
    expect(guidedFactCoverage([]).missing).toHaveLength(3);

    const partial = guidedFactCoverage([
      {
        relatedStage: "CATEGORY_ANALYSIS",
        claim: "周末家庭堂食明显多于工作日，家庭客是主场",
      },
    ]);
    expect(partial.answeredIds).toHaveLength(1);
    expect(partial.missing).toHaveLength(2);

    const full = guidedFactCoverage([
      {
        relatedStage: "CATEGORY_ANALYSIS",
        claim: "周末家庭堂食明显多于工作日，家庭客是主场",
      },
      {
        relatedStage: "CONSUMER_INSIGHT",
        claim: "用户说想吃湘菜但又怕太油腻踩雷，不确定感强",
      },
      {
        relatedStage: "COMPETITIVE_MAPPING",
        claim: "竞品主打重口宴请心智，家庭干净可预期场景仍空缺",
      },
    ]);
    expect(full.ok).toBe(true);
    expect(full.missing).toHaveLength(0);
  });

  it("humanizes gaps into actionable owner language", () => {
    const cat = humanizeConsultingGap("品类阶段至少录入 1 条一手事实");
    expect(cat.title).toContain("周末");
    expect(cat.anchor).toBe("facts");

    const hyp = humanizeConsultingGap("尚未确认选定假设");
    expect(hyp.anchor).toBe("hypothesis");

    const ev = humanizeConsultingGap("仍有 5 条证据待审");
    expect(ev.how).toContain("一键采纳");

    const bf = humanizeConsultingGap("战场决策理由不足 20 字");
    expect(bf.how).toContain("两问");
  });

  it("maps battlefield options to plain owner language", () => {
    const rec = plainBattlefieldChoice({
      label: "长沙 · 城市家庭场景心智位",
      recommended: true,
    });
    expect(rec.tone).toBe("recommend");
    expect(rec.title).toContain("场景");
    expect(BATTLEFIELD_REASON_PRESETS.every((p) => p.text.length >= 20)).toBe(
      true,
    );
  });
});
