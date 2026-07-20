/**
 * M-PNT P2 — Brand System + 报告签字
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  buildBrandSystem,
  confirmBrandSystem,
  buildStrategyReport,
  signStrategyReport,
  markReportInReview,
  createBrandProject,
  writeBrandBrief,
  writeCategoryDiagnosis,
  writeConsumerInsight,
  writeCompetitiveMap,
  writePositioningContract,
  writeBrandSystem,
  writeReportOutline,
  writeEvidenceLedger,
  addPrimaryFact,
  buildCategoryDiagnosis,
  buildConsumerInsight,
  buildCompetitiveMap,
  type BrandBrief,
  type PositioningContract,
} from "../../../packages/agents/src/m-pnt/consulting";

const brief: BrandBrief = {
  briefId: "brief_1",
  version: 1,
  status: "complete",
  businessContext: "做城市家庭可依赖的湘菜",
  categoryDefinition: "家常湘菜",
  targetCustomer: "25-40岁城市家庭",
  customerNeed: "干净可预期的家常湘菜",
  competitiveSet: ["某湘"],
  brandAmbition: "家庭场合默认选择",
  founderBelief: "供应链与现代化表达",
  rawAnswers: {},
  gaps: [],
  compiledAt: new Date().toISOString(),
};

function projectWithFrozenContract() {
  let p = createBrandProject("proj");
  p = writeBrandBrief(p, brief);
  p = writeCategoryDiagnosis(p, {
    ...buildCategoryDiagnosis({ brief, city: "长沙" }),
    status: "complete",
    decision: {
      options: [
        {
          optionId: "bf1",
          label: "家庭场景",
          rationale: "r",
          risk: "risk",
          recommended: true,
        },
      ],
      selectedOptionId: "bf1",
    },
  });
  p = writeConsumerInsight(p, {
    ...buildConsumerInsight({ brief }),
    status: "complete",
  });
  p = writeCompetitiveMap(p, {
    ...buildCompetitiveMap({ brief, city: "长沙" }),
    status: "complete",
  });
  const contract: PositioningContract = {
    contractId: "pc1",
    version: 1,
    status: "frozen",
    statement: {
      forAudience: "25-40岁城市家庭",
      whoNeed: "干净可预期的家常湘菜",
      ourBrandIs: "城市家庭湘菜生活方式品牌",
      thatValue: "干净可预期的家常体验",
      because: "供应链与现代化表达",
      unlike: "传统湘菜馆",
    },
    supportingEvidence: [
      {
        evidenceId: "e1",
        claim: "need",
        sourceArtifact: "BrandBrief.customerNeed",
        strength: "strong",
        reviewStatus: "accepted",
      },
      {
        evidenceId: "e2",
        claim: "cat",
        sourceArtifact: "CategoryDiagnosis.battlefield",
        strength: "strong",
        reviewStatus: "accepted",
      },
      {
        evidenceId: "e3",
        claim: "map",
        sourceArtifact: "CompetitiveMap.whitespace",
        strength: "strong",
        reviewStatus: "accepted",
      },
    ],
    strategicChoice: "切家庭场合",
    rejectedAlternatives: [{ statementSummary: "泛高品质", rejectReason: "无空位" }],
    prerequisites: {
      brandBriefId: brief.briefId,
      categoryDone: true,
      consumerDone: true,
      competitiveDone: true,
    },
    frozenAt: new Date().toISOString(),
  };
  p = writePositioningContract(p, contract);
  p = { ...p, stage: BrandProjectStage.FINAL_STRATEGY };
  return p;
}

describe("M-PNT P2 Brand System + sign-off", () => {
  it("builds and confirms brand system", () => {
    const p = projectWithFrozenContract();
    const draft = buildBrandSystem(p);
    expect(draft.status).toBe("draft");
    expect(draft.valueProposition.length).toBeGreaterThan(0);
    expect(draft.forbiddenPhrases.length).toBeGreaterThan(0);
    expect(draft.productMappings.length).toBeGreaterThanOrEqual(2);
    const confirmed = confirmBrandSystem(draft, p, {
      valueProposition: "干净可预期的家常体验",
    });
    expect(confirmed.status).toBe("complete");
    expect(confirmed.confirmedAt).toBeTruthy();
    expect(confirmed.consistencyCheck?.ok).toBe(true);
  });

  it("auto-aligns drifted brand system on confirm for owners", () => {
    const p = projectWithFrozenContract();
    const draft = buildBrandSystem(p);
    const confirmed = confirmBrandSystem(draft, p, {
      valueProposition: "与合同无关的空泛口号",
    });
    expect(confirmed.status).toBe("complete");
    expect(confirmed.valueProposition).toBe(
      p.assets.positioningContract!.statement.thatValue,
    );
    expect(confirmed.consistencyCheck?.ok).toBe(true);
  });

  it("signs report only after brand system and full chapters", () => {
    let p = projectWithFrozenContract();
    let ledger = addPrimaryFact(undefined, {
      claim: "周末家庭堂食占比过半，品类缺品牌心智",
      sourceType: "sales_note",
      relatedStage: "CATEGORY_ANALYSIS",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "用户说想吃湘菜但怕油腻踩雷",
      sourceType: "customer_quote",
      relatedStage: "CONSUMER_INSIGHT",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "竞品主打重口宴请，家庭干净场景空缺",
      sourceType: "competitor_note",
      relatedStage: "COMPETITIVE_MAPPING",
    });
    p = writeEvidenceLedger(p, ledger);
    const system = confirmBrandSystem(buildBrandSystem(p), p);
    p = writeBrandSystem(p, system);
    let outline = buildStrategyReport(p);
    expect(outline.chapters).toHaveLength(8);
    expect(outline.fullReportMarkdown).toContain("Brand System");
    expect(outline.fullReportMarkdown).toContain("附录 A");
    expect(outline.fullReportMarkdown).toContain("本章引用的一手证据");
    outline = markReportInReview(outline);
    const signed = signStrategyReport(
      outline,
      {
        signedBy: "张三",
        note: "确认交付",
      },
      p,
    );
    expect(signed.signOffStatus).toBe("signed");
    expect(signed.signedBy).toBe("张三");
    p = writeReportOutline(p, signed);
    expect(p.assets.reportOutline?.signOffStatus).toBe("signed");
  });
});
