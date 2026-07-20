/**
 * M-PNT — 可复述测试 + 签字包导出
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  ContractGateError,
  createBrandProject,
  writeBrandBrief,
  writeCategoryDiagnosis,
  writeConsumerInsight,
  writeCompetitiveMap,
  writePositioningContract,
  writeBrandSystem,
  writeReportOutline,
  writeEvidenceLedger,
  writeJourneyAssets,
  addPrimaryFact,
  buildCategoryDiagnosis,
  buildConsumerInsight,
  buildCompetitiveMap,
  buildBrandSystem,
  confirmBrandSystem,
  buildStrategyReport,
  markReportInReview,
  signStrategyReport,
  evaluatePositionRehearsal,
  applyRehearsalToContract,
  assertRehearsalPassed,
  buildSignOffPackageMarkdown,
  signOffPackageFilename,
  evaluateSignOffReadiness,
  buildBrandChallengeBrief,
  buildBusinessRealityMap,
  buildHumanTruthFromInsight,
  buildRehearsalGuide,
  composeRetellFromGuideAnswers,
  allGuideAnswersSelected,
  DEFAULT_REHEARSAL_CHECKLIST,
  fieldMatched,
  type BrandBrief,
  type PositioningContract,
  type PositioningStatement,
} from "../../../packages/agents/src/m-pnt/consulting";

const statement: PositioningStatement = {
  forAudience: "25-40岁城市家庭",
  whoNeed: "干净可预期的家常湘菜",
  ourBrandIs: "城市家庭湘菜生活方式品牌",
  thatValue: "干净可预期的家常体验",
  because: "供应链与现代化表达",
  unlike: "传统湘菜馆",
};

const brief: BrandBrief = {
  briefId: "brief_1",
  version: 1,
  status: "complete",
  businessContext: "做城市家庭可依赖的湘菜",
  categoryDefinition: "家常湘菜",
  targetCustomer: statement.forAudience,
  customerNeed: statement.whoNeed,
  competitiveSet: ["某湘"],
  brandAmbition: "家庭场合默认选择",
  founderBelief: "供应链与现代化表达",
  rawAnswers: {},
  gaps: [],
  compiledAt: new Date().toISOString(),
};

function proposedContract(): PositioningContract {
  return {
    contractId: "pc1",
    version: 1,
    status: "proposed",
    statement,
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
  };
}

function passingRetell() {
  return [
    `我们服务${statement.forAudience}，他们需要${statement.whoNeed}。`,
    `我们是${statement.ourBrandIs}，价值是${statement.thatValue}，`,
    `因为${statement.because}，不同于${statement.unlike}。`,
  ].join("");
}

const allChecklist = {
  canSayInOneBreath: true,
  staffCanRepeat: true,
  productProvesBecause: true,
  unlikeIsClear: true,
};

describe("position rehearsal", () => {
  it("fails when retell misses fields or checklist", () => {
    const r = evaluatePositionRehearsal({
      statement,
      founderRetell: "我们很好吃很好看",
      checklist: {
        canSayInOneBreath: false,
        staffCanRepeat: false,
        productProvesBecause: false,
        unlikeIsClear: false,
      },
    });
    expect(r.status).toBe("failed");
    expect(r.missingFields.length).toBeGreaterThan(0);
  });

  it("passes with complete retell + checklist", () => {
    const r = evaluatePositionRehearsal({
      statement,
      founderRetell: passingRetell(),
      checklist: allChecklist,
    });
    expect(r.status).toBe("passed");
    expect(r.matchedFields.length).toBeGreaterThanOrEqual(4);
  });

  it("accepts Chinese paraphrase without exact contract copy", () => {
    expect(fieldMatched("25-40岁城市家庭", "服务城市家庭客人")).toBe(true);
    expect(fieldMatched("传统湘菜馆", "跟传统湘菜馆不一样")).toBe(true);
    const r = evaluatePositionRehearsal({
      statement,
      founderRetell:
        "我们服务城市家庭，解决干净可预期的家常湘菜需求，我们是城市家庭湘菜生活方式品牌，价值是干净可预期，因为供应链与现代化表达，不同于传统湘菜馆。",
      checklist: allChecklist,
    });
    expect(r.status).toBe("passed");
  });

  it("builds six-question guide and composed retell that passes", () => {
    const guide = buildRehearsalGuide(statement);
    expect(guide).toHaveLength(6);
    const answers = Object.fromEntries(
      guide.map((g) => [g.field, g.correct.text]),
    ) as PositioningStatement;
    expect(allGuideAnswersSelected(answers)).toBe(true);
    const retell = composeRetellFromGuideAnswers(statement, answers);
    const r = evaluatePositionRehearsal({
      statement,
      founderRetell: retell,
      checklist: DEFAULT_REHEARSAL_CHECKLIST,
    });
    expect(r.status).toBe("passed");
    expect(r.matchedFields.length).toBe(6);
  });

  it("blocks assert without passed rehearsal", () => {
    const c = proposedContract();
    expect(() => assertRehearsalPassed(c)).toThrow(ContractGateError);
    const withR = applyRehearsalToContract(
      c,
      evaluatePositionRehearsal({
        statement,
        founderRetell: passingRetell(),
        checklist: allChecklist,
      }),
    );
    expect(withR.rehearsal?.status).toBe("passed");
    expect(() => assertRehearsalPassed(withR)).not.toThrow();
  });
});

describe("sign-off package", () => {
  it("builds markdown package with contract + rehearsal + report", () => {
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

    let contract = applyRehearsalToContract(
      proposedContract(),
      evaluatePositionRehearsal({
        statement,
        founderRetell: passingRetell(),
        checklist: allChecklist,
      }),
    );
    contract = { ...contract, status: "frozen", frozenAt: new Date().toISOString() };
    p = writePositioningContract(p, contract);
    p = { ...p, stage: BrandProjectStage.FINAL_STRATEGY };

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

    const insight = p.assets.consumerInsight!;
    p = writeJourneyAssets(p, {
      challengeBrief: buildBrandChallengeBrief({ brief }),
      realityMap: buildBusinessRealityMap({ brief }),
      humanTruth: buildHumanTruthFromInsight(insight),
      advisorStrategies: {
        setId: "s_test",
        status: "ready",
        generatedAt: new Date().toISOString(),
        conflictSummary: "三策互斥",
        strategies: [],
        strategyOptions: {
          setId: "opt_test",
          options: [
            {
              optionId: "A",
              advisorId: "ries",
              seatName: "里斯",
              title: "Option A",
              claim: "心智占位",
              advantage: "易懂",
              risk: "红海",
              sacrifice: "不做全品类",
            },
            {
              optionId: "B",
              advisorId: "trout",
              seatName: "特劳特",
              title: "Option B",
              claim: "空位切入",
              advantage: "差异",
              risk: "教育",
              sacrifice: "不做跟风",
            },
          ],
          mutualExclusionNote: "互斥",
          compiledAt: new Date().toISOString(),
        },
      },
    });

    const system = confirmBrandSystem(buildBrandSystem(p), p, {
      valueProposition: "干净可预期的家常体验",
      communicationLine:
        "为25-40岁城市家庭，在需要干净可预期的家常湘菜时，选择城市家庭湘菜生活方式品牌，因为供应链与现代化表达。",
    });
    p = writeBrandSystem(p, system);

    let outline = buildStrategyReport(p);
    outline = markReportInReview(outline);
    outline = signStrategyReport(
      outline,
      { signedBy: "创始人甲", note: "确认交付" },
      p,
    );
    p = writeReportOutline(p, outline);

    const md = buildSignOffPackageMarkdown(p);
    expect(md).toContain("签字交付包");
    expect(md).toContain("交付就绪清单");
    expect(md).toContain("Category Decision");
    expect(md).toContain("可复述测试");
    expect(md).toContain("店员交付包（可贴店）");
    expect(md).toContain(statement.forAudience);
    expect(md).toContain("创始人甲");
    expect(signOffPackageFilename(p)).toMatch(/\.md$/);
    expect(signOffPackageFilename(p, { preview: true })).toContain("草稿");

    const readiness = evaluateSignOffReadiness(p);
    expect(readiness.ok).toBe(true);
    expect(readiness.checks.every((c) => c.ok)).toBe(true);

    const draftMd = buildSignOffPackageMarkdown(
      { ...p, assets: { ...p.assets, reportOutline: { ...p.assets.reportOutline!, signOffStatus: "in_review" } } },
      { preview: true },
    );
    expect(draftMd).toContain("草稿预览");
  });
});
