/**
 * M-PNT 深化分析 + 战略报告单测
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  buildCategoryDiagnosis,
  buildConsumerInsight,
  buildCompetitiveMap,
  buildStrategyReport,
  createBrandProject,
  writeBrandBrief,
  writeCategoryDiagnosis,
  writeConsumerInsight,
  writeCompetitiveMap,
  writePositioningContract,
  advance,
  selectCategoryBattlefield,
  draftContractWithHypotheses,
  selectPositioningHypothesis,
  writeEvidenceLedger,
  addPrimaryFact,
  type BrandBrief,
  type PositioningContract,
} from "../../../packages/agents/src/m-pnt/consulting";

const brief: BrandBrief = {
  briefId: "brief_1",
  version: 1,
  status: "complete",
  businessContext: "做城市家庭可依赖的湘菜",
  categoryDefinition: "家常湘菜 / 城市家庭聚餐",
  targetCustomer: "25-40岁城市家庭",
  customerNeed: "快速吃上干净可预期的家常湘菜",
  competitiveSet: ["某湘", "社区家常菜", "平台外卖湘菜"],
  brandAmbition: "成为家庭场合的默认湘菜选择",
  founderBelief: "湖南传统菜系现代化表达与供应链稳定",
  rawAnswers: {},
  gaps: [],
  compiledAt: new Date().toISOString(),
};

describe("M-PNT deep analysis engine", () => {
  it("builds rich category diagnosis as draft", () => {
    const cat = buildCategoryDiagnosis({
      brief,
      city: "长沙",
      brandName: "测品牌",
    });
    expect(cat.status).toBe("draft");
    expect(cat.analysisNarrative).toContain("品类诊断");
    expect(cat.rejectedBattlefields?.length).toBeGreaterThan(0);
    expect(cat.battlefield.length).toBeGreaterThan(10);
  });

  it("builds consumer insight with jobs as draft", () => {
    const cus = buildConsumerInsight({ brief, city: "长沙" });
    expect(cus.status).toBe("draft");
    expect(cus.unmetNeeds.length).toBeGreaterThan(0);
    expect(cus.emotionalJob).toBeTruthy();
    expect(cus.insightNarrative).toContain("用户洞察");
    expect(cus.insightEvidence?.every((e) => e.reviewStatus === "pending")).toBe(
      true,
    );
  });

  it("builds competitive map with whitespace as draft", () => {
    const map = buildCompetitiveMap({ brief, city: "长沙" });
    expect(map.status).toBe("draft");
    expect(map.competitors.length).toBeGreaterThan(0);
    expect(map.whitespace).toBeTruthy();
    expect(map.axes?.x).toBe("心智清晰度");
    expect(map.whitespaceRegion).toBeTruthy();
    expect(map.mapEvidence?.every((e) => e.reviewStatus === "pending")).toBe(true);
  });

  it("requires category decision and primary facts before advance", () => {
    let p = createBrandProject("proj");
    p = writeBrandBrief(p, brief);
    p = { ...p, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    const draft = buildCategoryDiagnosis({ brief, city: "长沙", brandName: "测" });
    p = writeCategoryDiagnosis(p, draft);
    expect(p.assets.categoryDiagnosis?.status).toBe("draft");
    expect(p.assets.categoryDiagnosis?.decision?.options.length).toBeGreaterThan(1);
    const blocked = advance(p, "too_early");
    expect(blocked.stageStatus).toBe("blocked");

    const optionId = draft.decision!.options.find((o) => o.recommended)!.optionId;
    const decided = selectCategoryBattlefield(draft, optionId, {
      decisionReason: "测试选定推荐战场，因为场景心智更可防御且资源匹配",
    });
    p = writeCategoryDiagnosis(p, { ...decided, status: "complete" });
    // 仍缺一手证据
    const stillBlocked = advance(p, "no_facts");
    expect(stillBlocked.stageStatus).toBe("blocked");

    p = writeEvidenceLedger(
      p,
      addPrimaryFact(undefined, {
        claim: "周末家庭客群占比过半，品类教育空间明确",
        sourceType: "sales_note",
        relatedStage: "CATEGORY_ANALYSIS",
      }),
    );
    p = advance(p, "category_confirmed");
    expect(p.stage).toBe(BrandProjectStage.CONSUMER_INSIGHT);
  });

  it("builds positioning map with plot points", () => {
    const map = buildCompetitiveMap({ brief, city: "长沙" });
    expect(map.plotPoints?.length).toBeGreaterThanOrEqual(3);
    expect(map.whitespaceRegion?.x).toBeDefined();
    expect(map.mapEvidence?.length).toBeGreaterThan(0);
  });

  it("generates and selects positioning hypotheses", () => {
    let p = createBrandProject("proj");
    p = writeBrandBrief(p, brief);
    p = writeCategoryDiagnosis(p, {
      ...buildCategoryDiagnosis({ brief, city: "长沙", brandName: "测" }),
      status: "complete",
      decision: {
        options: [
          {
            optionId: "bf_x",
            label: "家庭场景",
            rationale: "r",
            risk: "risk",
            recommended: true,
          },
        ],
        selectedOptionId: "bf_x",
        decisionReason: "测试选定推荐战场，因为场景心智更可防御",
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
    let ledger = addPrimaryFact(undefined, {
      claim: "家庭周末堂食占比过半，品类仍缺品牌心智",
      sourceType: "sales_note",
      relatedStage: "CATEGORY_ANALYSIS",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "用户说想吃湘菜但又怕太油腻踩雷",
      sourceType: "customer_quote",
      relatedStage: "CONSUMER_INSIGHT",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "竞品主打重口宴请，家庭干净场景空缺",
      sourceType: "competitor_note",
      relatedStage: "COMPETITIVE_MAPPING",
    });
    p = writeEvidenceLedger(p, ledger);
    p = { ...p, stage: BrandProjectStage.POSITIONING_DESIGN };
    let contract = draftContractWithHypotheses(p);
    expect(contract.hypotheses?.length).toBe(3);
    const pick = contract.hypotheses![0]!.hypothesisId;
    contract = selectPositioningHypothesis(contract, pick);
    expect(contract.hypotheses?.filter((h) => h.status === "selected")).toHaveLength(1);
    expect(contract.hypotheses?.filter((h) => h.status === "rejected").length).toBe(2);
    expect(contract.rejectedAlternatives.length).toBeGreaterThanOrEqual(2);
  });

  it("builds full strategy report markdown", () => {
    let p = createBrandProject("proj");
    p = writeBrandBrief(p, brief);
    p = writeCategoryDiagnosis(p, {
      ...buildCategoryDiagnosis({ brief, city: "长沙", brandName: "测" }),
      status: "complete",
      decision: {
        options: [
          {
            optionId: "bf_1",
            label: "家庭场景",
            rationale: "r",
            risk: "risk",
            recommended: true,
          },
        ],
        selectedOptionId: "bf_1",
        decisionReason: "测试选定家庭场景战场作为战略切口",
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
      contractId: "pc_1",
      version: 1,
      status: "frozen",
      statement: {
        forAudience: "25-40岁城市家庭",
        whoNeed: "快速享受高品质家常湘菜",
        ourBrandIs: "城市家庭湘菜生活方式品牌",
        thatValue: "干净可预期的家常体验",
        because: "湖南传统菜系现代化表达",
        unlike: "传统湘菜馆和快餐品牌",
      },
      supportingEvidence: [
        {
          evidenceId: "e1",
          claim: brief.customerNeed,
          sourceArtifact: "BrandBrief.customerNeed",
          strength: "strong",
          reviewStatus: "accepted",
        },
        {
          evidenceId: "e2",
          claim: "战场",
          sourceArtifact: "CategoryDiagnosis.battlefield",
          strength: "moderate",
          reviewStatus: "accepted",
        },
        {
          evidenceId: "e3",
          claim: "空位",
          sourceArtifact: "CompetitiveMap.whitespace",
          strength: "strong",
          reviewStatus: "accepted",
        },
      ],
      strategicChoice: "切家庭场合空位",
      rejectedAlternatives: [
        { statementSummary: "泛高品质", rejectReason: "无空位" },
      ],
      prerequisites: {
        brandBriefId: brief.briefId,
        categoryDone: true,
        consumerDone: true,
        competitiveDone: true,
      },
      frozenAt: new Date().toISOString(),
    };
    p = writePositioningContract(p, contract);
    const report = buildStrategyReport(p);
    expect(report.chapters).toHaveLength(8);
    expect(report.fullReportMarkdown).toContain("# 品牌定位战略报告");
    expect(report.fullReportMarkdown).toContain("## 06 Positioning Contract");
    expect(report.fullReportMarkdown).toContain("For:");
  });
});
