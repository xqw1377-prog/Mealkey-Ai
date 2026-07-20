/**
 * 一手证据账本单测
 */
import { describe, expect, it } from "vitest";
import {
  addPrimaryFact,
  primaryEvidenceCoverage,
  primaryFactsToPositioningEvidence,
  getConsultingCoverageChecklist,
  primaryFactStrengthBoost,
  summarizePrimaryFactStrength,
  buildCategoryDiagnosis,
  type BrandBrief,
  type PrimaryFact,
} from "../../../packages/agents/src/m-pnt/consulting";

const brief: BrandBrief = {
  briefId: "b1",
  version: 1,
  status: "complete",
  businessContext: "湘菜",
  categoryDefinition: "家常湘菜",
  targetCustomer: "城市家庭",
  customerNeed: "干净可预期",
  competitiveSet: ["某湘"],
  brandAmbition: "家庭默认",
  founderBelief: "供应链",
  rawAnswers: {},
  gaps: [],
  compiledAt: new Date().toISOString(),
};

describe("Primary evidence ledger", () => {
  it("rejects too-short claims", () => {
    expect(() =>
      addPrimaryFact(undefined, {
        claim: "太短",
        sourceType: "other",
        relatedStage: "DISCOVERY",
      }),
    ).toThrow(/至少 8/);
  });

  it("tracks coverage across stages", () => {
    let ledger = addPrimaryFact(undefined, {
      claim: "周末家庭客群堂食占比过半",
      sourceType: "sales_note",
      relatedStage: "CATEGORY_ANALYSIS",
    });
    expect(primaryEvidenceCoverage(ledger).ok).toBe(false);
    ledger = addPrimaryFact(ledger, {
      claim: "用户说想吃湘菜但怕油腻踩雷",
      sourceType: "customer_quote",
      relatedStage: "CONSUMER_INSIGHT",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "竞品停在重口宴请心智",
      sourceType: "competitor_note",
      relatedStage: "COMPETITIVE_MAPPING",
    });
    expect(primaryEvidenceCoverage(ledger).ok).toBe(true);
    expect(primaryFactsToPositioningEvidence(ledger).length).toBe(3);
  });

  it("injects facts into category narrative", () => {
    const ledger = addPrimaryFact(undefined, {
      claim: "同城家庭周末堂食稳定高于工作日",
      sourceType: "sales_note",
      relatedStage: "CATEGORY_ANALYSIS",
    });
    const cat = buildCategoryDiagnosis({
      brief,
      city: "长沙",
      primaryFacts: ledger.facts,
    });
    expect(cat.analysisNarrative).toContain("一手证据引用");
    expect(cat.analysisNarrative).toContain("同城家庭周末堂食");
  });

  it("builds coverage checklist for workspace", () => {
    let ledger = addPrimaryFact(undefined, {
      claim: "周末家庭客群堂食占比过半",
      sourceType: "sales_note",
      relatedStage: "CATEGORY_ANALYSIS",
    });
    const list = getConsultingCoverageChecklist({ ledger });
    expect(list.find((i) => i.id === "fact_category")?.ok).toBe(true);
    expect(list.find((i) => i.id === "fact_coverage")?.ok).toBe(false);
    ledger = addPrimaryFact(ledger, {
      claim: "用户说想吃湘菜但怕油腻踩雷",
      sourceType: "customer_quote",
      relatedStage: "CONSUMER_INSIGHT",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "竞品停在重口宴请心智",
      sourceType: "competitor_note",
      relatedStage: "COMPETITIVE_MAPPING",
    });
    const okList = getConsultingCoverageChecklist({
      ledger,
      categorySelected: true,
      brandSystemComplete: true,
      reportSigned: false,
    });
    expect(okList.find((i) => i.id === "fact_coverage")?.ok).toBe(true);
    expect(okList.filter((i) => i.ok).length).toBeGreaterThanOrEqual(5);
  });

  it("scores primary fact strength boost with cap", () => {
    expect(primaryFactStrengthBoost([])).toBe(0);
    const oneModerate: PrimaryFact[] = [
      {
        factId: "f1",
        claim: "周末家庭堂食占比过半，品类缺心智",
        sourceType: "sales_note",
        relatedStage: "CATEGORY_ANALYSIS",
        strength: "moderate",
        capturedAt: new Date().toISOString(),
      },
    ];
    // moderate×4 + length×2 = 6
    expect(primaryFactStrengthBoost(oneModerate)).toBe(6);
    const threeStrong = [1, 2, 3].map((i) => ({
      ...oneModerate[0]!,
      factId: `s${i}`,
      strength: "strong" as const,
    }));
    // strong×8×3 + length×2 = 24+6 → cap 20
    expect(primaryFactStrengthBoost(threeStrong)).toBe(20);
    expect(summarizePrimaryFactStrength(threeStrong)).toContain("强度+20");
  });
});
