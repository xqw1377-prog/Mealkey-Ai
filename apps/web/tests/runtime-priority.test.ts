import { describe, expect, it } from "vitest";
import {
  deferOpportunitiesForBlockingRisk,
  isBlockingRisk,
  pickTopOpenRiskAlert,
  pickTopOpportunity,
  sortRiskAlertsBySeverity,
} from "@/server/founder-layer/capability/runtime-priority";
import { buildRiskAlert } from "@/server/founder-layer/contracts/risk-runtime";
import { buildOpportunity } from "@/server/founder-layer/contracts/opportunity-runtime";

describe("runtime-priority Risk > Opportunity", () => {
  it("按严重度取顶风险", () => {
    const low = buildRiskAlert({
      id: "r_low",
      ownerId: "o",
      projectId: "p",
      type: "market",
      title: "低",
      description: "低",
      evidence: ["e"],
      source: "rule",
      factors: { probability: 0.3, impact: 0.3, exposure: 0.3 },
    });
    const high = buildRiskAlert({
      id: "r_high",
      ownerId: "o",
      projectId: "p",
      type: "financial",
      title: "高",
      description: "高",
      evidence: ["e"],
      source: "rule",
      factors: { probability: 0.9, impact: 0.9, exposure: 0.9 },
    });
    const sorted = sortRiskAlertsBySeverity([low, high]);
    expect(sorted[0].id).toBe("r_high");
    expect(pickTopOpenRiskAlert([low, high])?.id).toBe("r_high");
  });

  it("阻断风险时降权机会，Brief 可隐藏", () => {
    const blocking = buildRiskAlert({
      id: "r1",
      ownerId: "o",
      projectId: "p",
      type: "financial",
      title: "现金流断裂风险",
      description: "不足 3 个月",
      evidence: ["cashMonths=1"],
      source: "rule",
      factors: { probability: 0.9, impact: 0.95, exposure: 0.9 },
      suggestCouncil: true,
    });
    expect(isBlockingRisk(blocking)).toBe(true);

    const opp = buildOpportunity({
      id: "o1",
      ownerId: "o",
      title: "扩张窗口",
      description: "开新店",
      type: "channel",
      source: "agent",
      factors: {
        marketAttractive: 0.9,
        companyFit: 0.9,
        executionCapability: 0.9,
        timing: 0.9,
      },
    });
    const deferred = deferOpportunitiesForBlockingRisk([opp], blocking);
    expect(deferred[0].confidence).toBeLessThanOrEqual(0.35);
    expect(deferred[0].description).toMatch(/风险优先/);

    expect(
      pickTopOpportunity(deferred, {
        hideWhenRiskBlocks: true,
        blockingRisk: blocking,
      }),
    ).toBeNull();
  });
});
