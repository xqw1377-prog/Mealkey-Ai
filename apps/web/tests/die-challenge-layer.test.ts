import { describe, expect, it } from "vitest";
import { buildChallengeReport } from "@/server/founder-layer/capability/decision-intelligence/challenge-layer";
import { EXPANSION_CHALLENGE_OPINIONS } from "@/server/founder-layer/capability/decision-intelligence/challenge-seed";
import { readinessFromContext } from "@/server/founder-layer/capability/decision-intelligence/readiness";
import type {
  DecisionAssessmentV1,
  DecisionContextV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";

describe("Challenge Layer", () => {
  it("默认输出风险挑战摘要，非常委角色秀", () => {
    const report = buildChallengeReport({
      opinions: EXPANSION_CHALLENGE_OPINIONS,
      decisionId: "dec_1",
      optionName: "条件推进",
    });
    expect(report.challengeCount).toBeGreaterThanOrEqual(2);
    expect(report.headline).toContain("挑战");
    const labels = report.items.map((i) => i.label);
    expect(labels.some((l) => /财务|运营|市场/.test(l))).toBe(true);
    // 摘要项不含「CFO: 我认为」形态
    for (const item of report.items) {
      expect(item.summary).not.toMatch(/^C[A-Z]O[:：]/);
      expect(item.label).not.toMatch(/^CFO$/);
    }
    expect(report.conditions.length).toBeGreaterThan(0);
  });

  it("来源可追溯到 roleId", () => {
    const report = buildChallengeReport({
      opinions: EXPANSION_CHALLENGE_OPINIONS,
    });
    const finance = report.items.find((i) => i.domain === "finance");
    expect(finance?.sourceRoleIds).toContain("cfo");
  });
});

describe("Readiness in Room", () => {
  it("无地理 → need_evidence", () => {
    const assessment = {
      confidenceScore: 62,
      riskScore: 40,
      suggestion: "proceed_with_conditions",
      unknownFactors: ["店长独立能力"],
    } as DecisionAssessmentV1;
    const context = {
      facts: [{ factId: "1", label: "品牌/店名", value: "南门", source: "MEMORY" }],
      evidences: [],
      restaurantState: { dimensions: { finance: 50 }, confidence: 0.5 },
      similarMatches: [],
      openGaps: [],
      unknowns: ["店长独立能力"],
    } as unknown as DecisionContextV1;

    const r = readinessFromContext({
      assessment,
      context,
      hasBrand: true,
      hasGeo: false,
    });
    expect(r.state).toBe("need_evidence");
    expect(r.canClaimExternalIntel).toBe(false);
  });
});
