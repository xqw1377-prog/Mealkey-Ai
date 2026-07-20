/**
 * M-PNT — 定位假设四维压力测试
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
  writeEvidenceLedger,
  addPrimaryFact,
  buildCategoryDiagnosis,
  buildConsumerInsight,
  buildCompetitiveMap,
  selectCategoryBattlefield,
  sealInsightForTests,
  acceptAllMapEvidence,
  draftContractWithHypotheses,
  selectPositioningHypothesis,
  assertHypothesesPressureReady,
  proposeContract,
  reviewEvidenceItems,
  type BrandBrief,
} from "../../../packages/agents/src/m-pnt/consulting";

const brief: BrandBrief = {
  briefId: "brief_1",
  version: 1,
  status: "complete",
  businessContext: "做城市家庭可依赖的湘菜",
  categoryDefinition: "家常湘菜 / 城市家庭聚餐",
  targetCustomer: "25-40岁城市家庭",
  customerNeed: "快速吃上干净可预期的家常湘菜",
  competitiveSet: ["某湘", "社区家常菜"],
  brandAmbition: "成为家庭场合的默认湘菜选择",
  founderBelief: "湖南传统菜系现代化表达与供应链稳定",
  rawAnswers: {},
  gaps: [],
  compiledAt: new Date().toISOString(),
};

function projectForHypotheses() {
  let p = createBrandProject("proj");
  p = writeBrandBrief(p, brief);
  const draft = buildCategoryDiagnosis({ brief, city: "长沙", brandName: "测" });
  const optionId = draft.decision!.options.find((o) => o.recommended)!.optionId;
  const decided = selectCategoryBattlefield(draft, optionId, {
    decisionReason: "选定场景心智战场，因为资源与用户证据更匹配家庭场合",
  });
  p = writeCategoryDiagnosis(p, { ...decided, status: "complete" });
  p = writeConsumerInsight(p, {
    ...sealInsightForTests(buildConsumerInsight({ brief })),
    status: "complete",
  });
  p = writeCompetitiveMap(p, {
    ...acceptAllMapEvidence(buildCompetitiveMap({ brief, city: "长沙" })),
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
  return p;
}

describe("hypothesis pressure scores", () => {
  it("generates three scored hypotheses with a clear leader", () => {
    const p = projectForHypotheses();
    const contract = draftContractWithHypotheses(p);
    expect(contract.hypotheses).toHaveLength(3);
    expect(contract.hypotheses!.every((h) => h.scores && h.scores.total > 0)).toBe(
      true,
    );
    const totals = contract.hypotheses!.map((h) => h.scores!.total);
    expect(Math.max(...totals)).toBe(contract.hypotheses![0]!.scores!.total);
  });

  it("blocks pressure gate without selected hypothesis", () => {
    const p = projectForHypotheses();
    const contract = draftContractWithHypotheses(p);
    expect(() => assertHypothesesPressureReady(contract)).toThrow(ContractGateError);
  });

  it("selects hypothesis and allows propose with scored rejects", () => {
    const p = projectForHypotheses();
    let contract = draftContractWithHypotheses(p);
    contract = reviewEvidenceItems(
      contract,
      contract.supportingEvidence.map((e) => ({
        evidenceId: e.evidenceId,
        reviewStatus: "accepted" as const,
      })),
    );
    const pick = contract.hypotheses![0]!.hypothesisId;
    contract = selectPositioningHypothesis(contract, pick);
    expect(() => assertHypothesesPressureReady(contract)).not.toThrow();
    expect(contract.rejectedAlternatives.length).toBeGreaterThanOrEqual(2);
    expect(contract.strategicChoice).toContain("总分");
    expect(contract.hypothesisOverride?.overrideRecommended).toBe(false);
    contract = proposeContract(p, contract);
    expect(contract.status).toBe("proposed");
  });

  it("requires override reason when covering the top-scoring hypothesis", () => {
    const p = projectForHypotheses();
    let contract = draftContractWithHypotheses(p);
    const ranked = contract
      .hypotheses!.slice()
      .sort((a, b) => (b.scores?.total ?? 0) - (a.scores?.total ?? 0));
    const top = ranked[0]!;
    const challenger = ranked.find(
      (h) =>
        h.hypothesisId !== top.hypothesisId && (h.scores?.total ?? 0) >= 40,
    );
    expect(challenger).toBeTruthy();
    expect(challenger!.scores!.total).toBeLessThan(top.scores!.total);

    expect(() =>
      selectPositioningHypothesis(contract, challenger!.hypothesisId),
    ).toThrow(ContractGateError);

    contract = selectPositioningHypothesis(contract, challenger!.hypothesisId, {
      overrideReason: "短期先验证价格带供给，再切回场景心智主航道",
    });
    expect(contract.hypothesisOverride?.overrideRecommended).toBe(true);
    expect(contract.hypothesisOverride?.overrideReason?.length).toBeGreaterThanOrEqual(
      20,
    );
    expect(() => assertHypothesesPressureReady(contract)).not.toThrow();
  });

  it("raises evidenceFit when primary facts are strong vs weak", () => {
    const base = projectForHypotheses();
    const makeLedger = (strength: "strong" | "weak") => {
      let ledger = addPrimaryFact(undefined, {
        claim: "家庭周末堂食占比过半，品类仍缺品牌心智",
        sourceType: "sales_note",
        relatedStage: "CATEGORY_ANALYSIS",
        strength,
      });
      ledger = addPrimaryFact(ledger, {
        claim: "用户说想吃湘菜但又怕太油腻踩雷",
        sourceType: "customer_quote",
        relatedStage: "CONSUMER_INSIGHT",
        strength,
      });
      ledger = addPrimaryFact(ledger, {
        claim: "竞品主打重口宴请，家庭干净场景空缺",
        sourceType: "competitor_note",
        relatedStage: "COMPETITIVE_MAPPING",
        strength,
      });
      return ledger;
    };
    const weakP = writeEvidenceLedger(base, makeLedger("weak"));
    const strongP = writeEvidenceLedger(base, makeLedger("strong"));
    const weakFit = draftContractWithHypotheses(weakP).hypotheses![0]!.scores!
      .evidenceFit;
    const strongFit = draftContractWithHypotheses(strongP).hypotheses![0]!
      .scores!.evidenceFit;
    expect(strongFit).toBeGreaterThan(weakFit);
    expect(
      draftContractWithHypotheses(strongP).hypotheses![0]!.pressureNotes?.join(
        "",
      ),
    ).toContain("强度+");
  });
});
