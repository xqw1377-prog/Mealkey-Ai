/**
 * DeepCode 审计复核后的高杠杆提质：证据账本进事实包 + 七席决策卡
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  applyUserVoteToWarRoom,
  buildAdvisorStrategiesFromResearch,
  buildMarketResearchPack,
  createBrandProject,
  openWarRoomDebate,
  writeBrandBrief,
  writeEvidenceLedger,
  createEmptyEvidenceLedger,
  addPrimaryFact,
} from "../../../packages/agents/src/m-pnt/consulting";
import {
  buildThinkingFactPack,
  evidenceBackedProof,
} from "../../../packages/agents/src/m-pnt/matrix/thinking";

describe("M-PNT audit uplift：证据账本约束造策", () => {
  it("buildThinkingFactPack 注入 verified PrimaryFact", () => {
    let project = createBrandProject("p_audit", "b_audit");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "brief_a",
      version: 1,
      status: "complete",
      businessContext: "家庭聚餐",
      categoryDefinition: "湘菜",
      targetCustomer: "带娃家庭",
      customerNeed: "干净可预期",
      competitiveSet: ["周边馆"],
      brandAmbition: "家庭首选",
      founderBelief: "一线稳出品",
      rawAnswers: {},
      gaps: [],
      compiledAt: new Date().toISOString(),
    });
    let ledger = createEmptyEvidenceLedger();
    ledger = addPrimaryFact(ledger, {
      claim: "店访观察：周边馆宽菜单、桌面油腻、客人抱怨赌运气",
      sourceType: "store_observation",
      relatedStage: "COMPETITIVE_MAPPING",
      strength: "strong",
      verificationStatus: "verified",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "顾客原话：带娃出来就怕不干净、上菜慢",
      sourceType: "customer_quote",
      relatedStage: "CONSUMER_INSIGHT",
      strength: "strong",
      verificationStatus: "verified",
    });
    project = writeEvidenceLedger(project, ledger);

    const research = buildMarketResearchPack({
      brief: project.assets.brandBrief,
      city: "长沙",
    });
    const fact = buildThinkingFactPack(project, research, "长沙");
    expect(fact.primaryFacts?.length).toBeGreaterThanOrEqual(2);
    expect(fact.evidenceSnippets?.some((s) => /账本/.test(s))).toBe(true);
    const proof = evidenceBackedProof(fact, "clash");
    expect(proof).toMatch(/一手|顾客|店访|干净/);
    expect(proof).not.toBe("一线能把出品做稳");
  });

  it("会议室决策卡与亮策覆盖 set 内全部席位", () => {
    let project = createBrandProject("p_audit2", "b_audit2");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "brief_b",
      version: 1,
      status: "complete",
      businessContext: "家庭聚餐",
      categoryDefinition: "湘菜",
      targetCustomer: "带娃家庭",
      customerNeed: "干净可预期",
      competitiveSet: ["周边馆", "连锁快餐"],
      brandAmbition: "家庭首选",
      founderBelief: "一线稳出品",
      rawAnswers: {},
      gaps: [],
      compiledAt: new Date().toISOString(),
    });
    const research = buildMarketResearchPack({
      brief: project.assets.brandBrief,
      city: "长沙",
    });
    const advisors = buildAdvisorStrategiesFromResearch(project, research);
    const debated = openWarRoomDebate(advisors);
    expect(debated.room.decisionCard?.options.length).toBe(
      advisors.strategies.length,
    );
    expect(
      debated.room.turns.filter((t) => t.kind === "pitch").length,
    ).toBe(advisors.strategies.length);
    const room = applyUserVoteToWarRoom(
      debated.room,
      debated.set,
      "blend",
    );
    expect(room.minorityConstraints?.length).toBeGreaterThanOrEqual(3);
  });
});
