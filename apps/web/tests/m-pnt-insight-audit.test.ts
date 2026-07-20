/**
 * M-PNT — Consumer Insight 可审计层（证据 + 创始人判断）
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  ContractGateError,
  buildConsumerInsight,
  reviewInsightEvidenceItems,
  confirmInsightJudgment,
  assertInsightAuditable,
  acceptAllInsightEvidence,
  sealInsightForTests,
  createBrandProject,
  writeBrandBrief,
  writeConsumerInsight,
  advance,
  writeEvidenceLedger,
  addPrimaryFact,
  composeInsightStatement,
  insightGuideComplete,
  type BrandBrief,
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

describe("insight audit engine", () => {
  it("builds insight with pending evidence and unconfirmed judgment", () => {
    const cus = buildConsumerInsight({ brief });
    expect(cus.insightStatement).toBeTruthy();
    expect(cus.judgmentConfirmedAt).toBeUndefined();
    expect(cus.insightEvidence?.every((e) => e.reviewStatus === "pending")).toBe(
      true,
    );
    expect(() => assertInsightAuditable(cus)).toThrow(ContractGateError);
  });

  it("requires founder judgment confirmation even after evidence accepted", () => {
    let cus = acceptAllInsightEvidence(buildConsumerInsight({ brief }));
    expect(() => assertInsightAuditable(cus)).toThrow(ContractGateError);
    cus = confirmInsightJudgment(cus, {
      insightStatement:
        "当城市家庭周末聚餐时，要的是干净可预期的家常体验，而现有湘菜馆往往给不了这种确定感",
      primaryUnmetNeed: "干净可预期的家常湘菜",
    });
    expect(cus.judgmentConfirmedAt).toBeTruthy();
    expect(() => assertInsightAuditable(cus)).not.toThrow();
  });

  it("rejects too-short insight statement", () => {
    const cus = buildConsumerInsight({ brief });
    expect(() =>
      confirmInsightJudgment(cus, { insightStatement: "太短了不够" }),
    ).toThrow(ContractGateError);
  });

  it("composeInsightStatement from four picks is long enough to confirm", () => {
    const composed = composeInsightStatement({
      who: "带娃的城市家庭",
      occasion: "周末堂食聚餐时",
      job: "想吃得放心、不用赌运气",
      gap: "但现有湘菜馆常让人怕油腻踩雷",
    });
    expect(composed.length).toBeGreaterThanOrEqual(40);
    expect(insightGuideComplete({
      who: "a",
      occasion: "b",
      job: "c",
      gap: "d",
    })).toBe(true);
    let cus = acceptAllInsightEvidence(buildConsumerInsight({ brief }));
    cus = confirmInsightJudgment(cus, { insightStatement: composed });
    expect(cus.judgmentConfirmedAt).toBeTruthy();
  });

  it("reviews individual insight evidence", () => {
    let cus = buildConsumerInsight({ brief });
    const first = cus.insightEvidence![0]!;
    cus = reviewInsightEvidenceItems(cus, [
      { evidenceId: first.evidenceId, reviewStatus: "accepted" },
    ]);
    expect(
      cus.insightEvidence!.find((e) => e.evidenceId === first.evidenceId)
        ?.reviewStatus,
    ).toBe("accepted");
  });

  it("blocks advance without sealed insight", () => {
    let p = createBrandProject("proj");
    p = writeBrandBrief(p, brief);
    p = {
      ...p,
      stage: BrandProjectStage.CONSUMER_INSIGHT,
      assets: {
        ...p.assets,
        brandBrief: brief,
        categoryDiagnosis: {
          artifactId: "c1",
          status: "complete",
          categoryName: brief.categoryDefinition,
          battlefield: "家庭场景",
          opportunity: "o",
          risks: ["r"],
        },
      },
    };
    p = writeEvidenceLedger(
      p,
      addPrimaryFact(undefined, {
        claim: "用户说想吃湘菜但又怕太油腻踩雷",
        sourceType: "customer_quote",
        relatedStage: "CONSUMER_INSIGHT",
      }),
    );
    const draft = buildConsumerInsight({ brief });
    p = writeConsumerInsight(p, { ...draft, status: "complete" });
    const blocked = advance(p, "no_insight_audit");
    expect(blocked.stageStatus).toBe("blocked");

    p = writeConsumerInsight(p, {
      ...sealInsightForTests(draft),
      status: "complete",
    });
    const next = advance(p, "insight_ok");
    expect(next.stage).toBe(BrandProjectStage.COMPETITIVE_MAPPING);
    expect(next.stageStatus).toBe("active");
  });
});
