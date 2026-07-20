/**
 * 六步路径确认 → 冻结合同 / Brand System / 签字就绪
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  createBrandProject,
  writeBrandBrief,
  writeEvidenceLedger,
  writeJourneyAssets,
  addPrimaryFact,
  evaluateSignOffReadiness,
  finalizeSixStepStrategyDeliverable,
  assertSixStepConfirmEvidence,
  type BrandBrief,
  type WarRoomConsensus,
} from "../../../packages/agents/src/m-pnt/consulting";

const statement = {
  forAudience: "25-40岁城市家庭",
  whoNeed: "干净可预期的家常湘菜",
  ourBrandIs: "城市家庭湘菜生活方式品牌",
  thatValue: "干净可预期的家常体验",
  because: "供应链与现代化表达",
  unlike: "传统湘菜馆",
};

const brief: BrandBrief = {
  briefId: "brief_six",
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

function warAgreed(): WarRoomConsensus {
  return {
    roomId: "wr_1",
    status: "agreed",
    turns: [],
    consensusOneLiner: "家庭场合默认选的干净湘菜",
    consensusStatement: statement,
    agreedAt: new Date().toISOString(),
  };
}

function projectWithEvidence() {
  let p = createBrandProject("proj_six");
  p = writeBrandBrief(p, brief);
  let ledger = addPrimaryFact(undefined, {
    claim: "用户说想吃湘菜但怕油腻踩雷，要干净可预期",
    sourceType: "customer_quote",
    relatedStage: "CONSUMER_INSIGHT",
  });
  ledger = addPrimaryFact(ledger, {
    claim: "品类上家常湘菜增速高于宴请重口馆",
    sourceType: "sales_note",
    relatedStage: "CATEGORY_ANALYSIS",
  });
  ledger = addPrimaryFact(ledger, {
    claim: "竞品主打重口宴请，家庭干净场景空缺",
    sourceType: "competitor_note",
    relatedStage: "COMPETITIVE_MAPPING",
  });
  p = writeEvidenceLedger(p, ledger);
  p = writeJourneyAssets(p, {
    ...p.assets.journey,
    warRoom: warAgreed(),
  });
  return p;
}

describe("six-step finalize bridge", () => {
  it("blocks confirm when primary evidence missing", () => {
    let p = createBrandProject("empty_ev");
    p = writeBrandBrief(p, brief);
    p = writeJourneyAssets(p, { warRoom: warAgreed() });
    expect(() => assertSixStepConfirmEvidence(p)).toThrow(/证据未齐/);
  });

  it("freezes contract, completes brand system, and reaches sign-off ready", () => {
    const p = projectWithEvidence();
    const { project, contract } = finalizeSixStepStrategyDeliverable(
      p,
      warAgreed(),
    );

    expect(contract.status).toBe("frozen");
    expect(contract.rehearsal?.status).toBe("passed");
    expect(project.assets.brandSystem?.status).toBe("complete");
    expect(project.assets.reportOutline?.fullReportMarkdown).toContain("附录 A");
    expect(project.stage).toBe(BrandProjectStage.FINAL_STRATEGY);

    const readiness = evaluateSignOffReadiness(project);
    expect(readiness.ok).toBe(true);
  });
});
