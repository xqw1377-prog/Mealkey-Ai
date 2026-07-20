import { describe, expect, it } from "vitest";
import {
  assembleSubjectBoundEvidence,
  containsRegionalMetricClaim,
  filterEvidenceByAnchorGate,
  hasMintelAnchors,
  queryMintelRegional,
} from "@/server/founder-layer/capability/m-intel";
import { buildExpansionDecisionCase } from "@/server/founder-layer/capability/decision-intelligence/case-factory";
import { buildExpansionContext } from "@/server/founder-layer/capability/decision-intelligence/context-builder";
import type { AgentRestaurantContext } from "@mealkey/restaurant-brain";

describe("M-INTEL 锚点门禁", () => {
  it("无 brand+city → 拒绝区域查询并返回 gap", () => {
    const r = queryMintelRegional({ brandName: "最湘宴", city: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.canClaimRegional).toBe(false);
    expect(r.missingAnchors).toContain("city");
    expect(r.gaps.gaps.some((g) => g.gapId.includes("city"))).toBe(true);
  });

  it("有锚点 → 允许区域查询", () => {
    const r = queryMintelRegional({
      brandName: "最湘宴",
      city: "长沙",
      storeName: "南门店",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.subjectLabel).toContain("长沙");
    expect(r.subjectLabel).toContain("最湘宴");
  });

  it("无锚点时剔除区域百分比伪证据", () => {
    const { kept, rejected } = filterEvidenceByAnchorGate(
      [
        { content: "组织能力评分约 45" },
        { content: "该商圈饱和度已达 78%，竞争密度指数偏高" },
      ],
      false,
    );
    expect(rejected).toHaveLength(1);
    expect(containsRegionalMetricClaim(rejected[0]!.content)).toBe(true);
    expect(kept.every((e) => !containsRegionalMetricClaim(e.content))).toBe(
      true,
    );
  });

  it("Evidence 主体绑定：无锚点不编造", () => {
    const gap = assembleSubjectBoundEvidence({
      brandName: "",
      city: "",
      change: "周边新开两家竞品",
      impactOnStore: "晚餐客流承压",
    });
    expect(gap.canClaimRegional).toBe(false);

    const ok = assembleSubjectBoundEvidence({
      brandName: "最湘宴",
      city: "长沙",
      change: "周边新开两家竞品",
      impactOnStore: "晚餐客流承压",
    });
    expect(ok.canClaimRegional).toBe(true);
    if (!ok.canClaimRegional) return;
    expect(ok.content).toContain("长沙");
    expect(ok.content).toContain("对本店影响");
    expect(ok.content).not.toMatch(/\d{2}%/);
  });

  it("Context 无城市时压低外部市场权重并写入 gap", () => {
    const brain = {
      identity: {
        name: "南门小馆",
        category: "湘菜",
        stage: "增长期",
        storeCount: 1,
        city: "",
      },
      business: {},
      brand: {},
      capability: {
        scores: {
          strategy: 50,
          market: 40,
          product: 50,
          finance: 50,
          operation: 50,
          organization: 40,
          overall: 45,
        },
        confidence: 0.5,
      },
      founder: {},
      history: { recentDecisions: [] },
      learning: { patterns: [] },
      evolution: { understandingScore: 20, dataCompleteness: 15 },
      priorBlock: "",
      unknowns: [],
    } as unknown as AgentRestaurantContext;

    const c = buildExpansionDecisionCase({
      id: "dec_no_geo",
      projectId: "p1",
      ownerId: "o1",
      ownerLabel: "王老板",
    });
    const ctx = buildExpansionContext({ case: c, brain });
    expect(ctx.infoMap.mintelAnchorsReady).toBe(false);
    expect(ctx.infoMap.weights.market_capacity).toBeLessThan(0.3);
    expect(ctx.openGaps.some((g) => /城市|地理|品牌/.test(g.question))).toBe(
      true,
    );
    expect(
      ctx.evidences.every((e) => !containsRegionalMetricClaim(e.content)),
    ).toBe(true);
    expect(hasMintelAnchors({ brandName: "南门", city: "" })).toBe(false);
  });
});
