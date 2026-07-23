import { describe, expect, it } from "vitest";
import {
  buildPositioningSnapshot,
  diffPositioningSnapshots,
  snapshotFromMPntBlob,
  snapshotFromProjectProfile,
} from "../src/lib/positioning";

describe("positioning lib", () => {
  it("builds snapshot from structured decision payload", () => {
    const snap = buildPositioningSnapshot({
      judgement: "周末家庭局首选湘菜",
      problem: "品牌定位策略",
      observation: "成熟品类",
      diagnosis: "客群需收敛",
      strategy: "场景钉死",
      action: "30天验证",
      confidence: 82,
      structured: {
        decision_recommend: "primary",
        brandPositioning: {
          category: "湘菜",
          targetCustomers: "家庭聚餐",
          priceRange: "80-100",
          differentiation: "场景第一",
          brandTonality: "实在",
          mentalPosition: "周末家庭局首选湘菜",
        },
        risks: [{ risk: "同质化", level: "medium", mitigation: "强化场景" }],
        nextSteps: [{ step: "菜单减法", priority: "high", timeline: "2周" }],
      },
    });

    expect(snap.oneLiner).toContain("家庭");
    expect(snap.confidence).toBeCloseTo(0.82);
    expect(snap.brandPositioning?.category).toBe("湘菜");
    expect(snap.decision_recommend).toBe("primary");
    expect(snap.risks?.[0]?.risk).toBe("同质化");
    expect(snap.nextSteps?.[0]?.step).toBe("菜单减法");
  });

  it("reads snapshot from project profile.mPnt", () => {
    const snap = snapshotFromProjectProfile(
      {
        positioning: "旧文案",
        mPnt: {
          oneLiner: "长沙夜经济烧烤第一联想",
          confidence: 0.77,
          strategy: "锅底+场景",
          brandPositioning: {
            category: "烧烤",
            mentalPosition: "长沙夜经济烧烤第一联想",
          },
          updatedAt: "2026-07-09T00:00:00.000Z",
        },
      },
      null,
    );
    expect(snap).not.toBeNull();
    expect(snap!.oneLiner).toContain("烧烤");
    expect(snap!.source).toBe("profile");
    expect(snap!.confidence).toBeCloseTo(0.77);
  });

  it("falls back to project target", () => {
    const snap = snapshotFromProjectProfile({}, "社区简餐首选");
    expect(snap?.oneLiner).toBe("社区简餐首选");
  });

  it("diffs old vs new positioning and flags core changes", () => {
    const before = buildPositioningSnapshot({
      judgement: "年轻人社交火锅",
      confidence: 0.7,
      strategy: "大而全菜单",
      structured: {
        brandPositioning: {
          category: "火锅",
          targetCustomers: "年轻人",
          priceRange: "80-120",
          mentalPosition: "年轻人社交火锅",
        },
      },
    });
    const after = buildPositioningSnapshot({
      judgement: "周末家庭局首选湘菜",
      confidence: 0.85,
      strategy: "场景钉死+菜单减法",
      structured: {
        brandPositioning: {
          category: "湘菜",
          targetCustomers: "家庭聚餐",
          priceRange: "80-100",
          mentalPosition: "周末家庭局首选湘菜",
          differentiation: "场景第一",
        },
      },
    });
    const diff = diffPositioningSnapshots(before, after);
    expect(diff).not.toBeNull();
    expect(diff!.hasChanges).toBe(true);
    expect(diff!.changedCount).toBeGreaterThan(0);
    expect(diff!.confidenceDelta).toBeCloseTo(0.15);
    expect(diff!.fields.some((f) => f.field === "oneLiner" && f.changed)).toBe(
      true,
    );
    expect(diff!.summary).toMatch(/定位|调整|更新/);
  });

  it("treats first snapshot as initial formation", () => {
    const after = buildPositioningSnapshot({
      judgement: "首个定位",
      confidence: 0.8,
    });
    const diff = diffPositioningSnapshots(null, after);
    expect(diff?.summary).toContain("首次");
  });

  it("rebuilds snapshot from mPnt blob", () => {
    const snap = snapshotFromMPntBlob({
      oneLiner: "测试blob定位",
      confidence: 0.66,
      strategy: "s",
      brandPositioning: { category: "茶饮" },
    });
    expect(snap?.oneLiner).toBe("测试blob定位");
    expect(snap?.brandPositioning?.category).toBe("茶饮");
  });
});
