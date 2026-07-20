import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  computeBrandStrength,
  toMPntExpertReport,
  toMPntExpertReportWithStrength,
  type BrandStrategyProject,
} from "../../../packages/agents/src/m-pnt/consulting";
import { prepareRound1, conveneCouncilMeeting } from "../../../packages/agents/src/founder-os";

function thinProject(overrides?: Partial<BrandStrategyProject>): BrandStrategyProject {
  const base: BrandStrategyProject = {
    projectId: "bp-1",
    brandProjectId: "bp-1",
    stage: BrandProjectStage.POSITIONING_DESIGN,
    stageStatus: "active",
    blockedReasons: [],
    assets: {
      brandBrief: {
        briefId: "bb1",
        version: 1,
        status: "complete",
        businessContext: "湖南小吃",
        categoryDefinition: "湖南风味快餐",
        targetCustomer: "25-40城市年轻人",
        customerNeed: "低成本社交仪式+地方味道",
        competitiveSet: ["普通湘菜馆", "快餐"],
        brandAmbition: "年轻人的湖南味道体验品牌",
        founderBelief: "正宗但不老气",
        rawAnswers: {},
        gaps: [],
        compiledAt: new Date().toISOString(),
      },
      categoryDiagnosis: {
        artifactId: "cd1",
        status: "complete",
        categoryName: "湖南风味快餐",
        battlefield: "年轻人口味体验",
        opportunity: "地方特色+高性价比窗口",
        risks: ["同质化"],
        recommendedBattlefield: "年轻人口味体验",
        rejectedBattlefields: ["高端宴请"],
        strategicQuestion: "如何占住年轻人湖南味道？",
      },
      consumerInsight: {
        artifactId: "ci1",
        status: "complete",
        targetCustomer: "25-40城市年轻人",
        jobsToBeDone: ["找一个能聚餐又不贵的地方"],
        barriers: ["怕不正宗"],
        unmetNeeds: ["既地道又轻松"],
        insightStatement: "年轻消费者需要低成本社交仪式",
      },
      competitiveMap: {
        artifactId: "cm1",
        status: "complete",
        competitors: [
          { name: "老湘菜", mentalSlot: "正宗宴请", weakness: "不轻松" },
        ],
        whitespace: "轻松地道的日常湖南味",
      },
      positioningContract: {
        contractId: "pc1",
        version: 1,
        status: "validated",
        statement: {
          forAudience: "城市年轻人",
          whoNeed: "要社交又不想大吃大喝",
          ourBrandIs: "湖南味道体验品牌",
          thatValue: "轻松地道的湖南聚餐",
          because: "招牌小炒+社交桌型",
          unlike: "不像酒楼正装也不像无灵魂快餐",
        },
        supportingEvidence: [
          {
            evidenceId: "E1",
            claim: "目标客群访谈认可社交场景",
            sourceArtifact: "insight",
            strength: "moderate",
          },
          {
            evidenceId: "E2",
            claim: "竞品酒楼场合过重",
            sourceArtifact: "map",
            strength: "strong",
          },
        ],
        strategicChoice: "占住轻松地道湖南聚餐",
        rejectedAlternatives: [
          { statementSummary: "高端湘菜", rejectReason: "资源不匹配" },
        ],
        prerequisites: {
          categoryDone: true,
          consumerDone: true,
          competitiveDone: true,
        },
      },
      brandSystem: {
        artifactId: "bs1",
        status: "complete",
        version: 1,
        valueProposition: "轻松地道的湖南聚餐",
        forbiddenPhrases: ["最正宗"],
        communicationLine: "年轻人的湖南味道",
        productMappings: [
          { productOrLine: "招牌小炒", provesBecause: "地道口味" },
        ],
        consistencyCheck: {
          ok: true,
          checkedAt: new Date().toISOString(),
          issues: [],
        },
      },
      evidenceLedger: {
        ledgerId: "el1",
        facts: [
          {
            factId: "f1",
            claim: "访谈确认社交需求",
            sourceType: "founder_interview",
            relatedStage: "CONSUMER_INSIGHT",
            strength: "moderate",
            capturedAt: new Date().toISOString(),
          },
          {
            factId: "f2",
            claim: "竞品酒楼过重",
            sourceType: "competitor_note",
            relatedStage: "COMPETITIVE_MAPPING",
            strength: "strong",
            capturedAt: new Date().toISOString(),
          },
          {
            factId: "f3",
            claim: "客单承受区间",
            sourceType: "customer_quote",
            relatedStage: "CONSUMER_INSIGHT",
            strength: "moderate",
            capturedAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    },
    history: [],
    updatedAt: new Date().toISOString(),
  };
  return { ...base, ...overrides, assets: { ...base.assets, ...overrides?.assets } };
}

describe("M-PNT V2 → Founder OS", () => {
  it("toMPntExpertReport 产出四段专业意见", () => {
    const report = toMPntExpertReport(thinProject(), { caseId: "D-pnt" });
    expect(report.engineId).toBe("M-PNT");
    expect(report.sections.map((s) => s.id)).toEqual([
      "category",
      "mindset",
      "positioning",
      "brand_strategy",
    ]);
    expect(report.sections.find((s) => s.id === "positioning")?.content).toContain(
      "For Who",
    );
    expect(report.stanceHint).toBe("favorable");
  });

  it("Brand Strength 可计算且可喂常委", () => {
    const { report, strength } = toMPntExpertReportWithStrength(thinProject());
    expect(strength.overall).toBeGreaterThan(50);
    expect(strength.readyForCouncil).toBe(true);
    expect(report.risks?.some((r) => r.includes("Brand Strength"))).toBe(true);

    let session = conveneCouncilMeeting({
      topic: "品牌怎么定位",
      caseId: "D-pnt",
    });
    session = prepareRound1(session, [report]);
    expect(session.round1Prompts.CBO).toContain("Expert Reports");
    expect(session.round1Prompts.CBO).toContain("轻松地道");
  });

  it("薄弱项目 strength 较低", () => {
    const weak = thinProject({
      assets: {
        positioningContract: undefined,
        brandSystem: undefined,
        evidenceLedger: { ledgerId: "x", facts: [], updatedAt: "" },
      },
    });
    const s = computeBrandStrength(weak);
    expect(s.overall).toBeLessThan(55);
    expect(s.readyForCouncil).toBe(false);
    expect(s.gaps.length).toBeGreaterThan(0);
  });
});
