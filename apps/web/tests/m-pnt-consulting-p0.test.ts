/**
 * M-PNT V2 P0 — 状态机 / Brief / 定位合同门禁单测
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  StageGateError,
  ContractGateError,
  createBrandProject,
  writeDiscoveryNotes,
  writeBrandBasics,
  upsertBrandBasics,
  writeBrandBrief,
  writeCategoryDiagnosis,
  writeConsumerInsight,
  writeCompetitiveMap,
  writePositioningContract,
  advance,
  writeEvidenceLedger,
  addPrimaryFact,
  assertCanDesignPositioning,
  createBriefInterviewSession,
  answerBriefQuestion,
  tryAdvanceBriefLayer,
  compileBrandBrief,
  BRIEF_LAYER_ORDER,
  BRIEF_QUESTION_BANK,
  draftContractFromProject,
  draftContractWithHypotheses,
  selectPositioningHypothesis,
  proposeContract,
  freezeContract,
  reviewEvidenceItems,
  evaluatePositionRehearsal,
  applyRehearsalToContract,
  looksLikeUnstructuredSlogan,
  formatPositioningStatement,
} from "../../../packages/agents/src/m-pnt/consulting";

function completeBriefViaInterview() {
  let session = createBriefInterviewSession("bp_test");
  for (const layer of BRIEF_LAYER_ORDER) {
    session = { ...session, layer };
    for (const q of BRIEF_QUESTION_BANK[layer]) {
      session = answerBriefQuestion(session, q.id, `答：${q.id} 有效内容`);
    }
    session = tryAdvanceBriefLayer(session);
  }
  return compileBrandBrief(session);
}

function projectReadyForPositioning() {
  let p = createBrandProject("proj_1");
  const basics = upsertBrandBasics(undefined, {
    brandName: "测湘馆",
    storeScale: "直营2家",
    annualRevenue: "单店月均40万",
    category: "湘菜",
    currentPositioning: "适合家庭的干净湘菜",
    region: "成都高新区",
    avgTicket: "人均90",
    slogan: "暂无",
    competitors: "某湘,隔壁家常菜",
    advantages: "少油配方+翻台节奏稳定",
    businessGoal: "先把心智说清楚",
    mainPain: "客人说好吃但记不住",
  });
  p = writeBrandBasics(p, basics);
  p = writeDiscoveryNotes(p, {
    status: "complete",
    notes: "诊断完成",
    category: "湘菜",
  });
  p = advance(p);
  const brief = completeBriefViaInterview();
  expect(brief.status).toBe("complete");
  p = writeBrandBrief(p, brief);
  p = advance(p);
  p = writeCategoryDiagnosis(p, {
    artifactId: "cat_1",
    status: "complete",
    categoryName: "湘菜",
    battlefield: "城市家庭湘菜",
    opportunity: "现代化家常",
    risks: ["同质化"],
    decision: {
      options: [
        {
          optionId: "bf_1",
          label: "城市家庭湘菜",
          rationale: "场景切口",
          risk: "场景过窄",
          recommended: true,
        },
      ],
      selectedOptionId: "bf_1",
      decisionReason: "测试选定城市家庭湘菜战场，因场景更可防御",
      decidedAt: new Date().toISOString(),
    },
  });
  let ledger = addPrimaryFact(undefined, {
    claim: "同城家庭客群周末堂食占比超过一半",
    sourceType: "sales_note",
    relatedStage: "CATEGORY_ANALYSIS",
    strength: "strong",
  });
  ledger = addPrimaryFact(ledger, {
    claim: "用户原话：想吃湘菜但不想太油腻不确定",
    sourceType: "customer_quote",
    relatedStage: "CONSUMER_INSIGHT",
    strength: "strong",
  });
  ledger = addPrimaryFact(ledger, {
    claim: "头部竞品心智停在重口与宴请，家庭干净场景空着",
    sourceType: "competitor_note",
    relatedStage: "COMPETITIVE_MAPPING",
    strength: "moderate",
  });
  p = writeEvidenceLedger(p, ledger);
  p = advance(p);
  p = writeConsumerInsight(p, {
    artifactId: "cus_1",
    status: "complete",
    targetCustomer: "城市家庭",
    jobsToBeDone: ["快速吃好"],
    barriers: ["油腻印象"],
    unmetNeeds: ["干净家常湘菜"],
    insightStatement:
      "当城市家庭处于周末聚餐时，真正要完成的是干净可预期的家常体验，而现有选项给不了这种确定感",
    judgmentConfirmedAt: new Date().toISOString(),
    insightEvidence: [
      {
        evidenceId: "ie1",
        claim: "干净家常湘菜",
        source: "BrandBrief.customerNeed",
        strength: "strong",
        reviewStatus: "accepted",
      },
      {
        evidenceId: "ie2",
        claim: "主人格：城市家庭",
        source: "BrandBrief.targetCustomer",
        strength: "strong",
        reviewStatus: "accepted",
      },
    ],
  });
  p = advance(p);
  p = writeCompetitiveMap(p, {
    artifactId: "map_1",
    status: "complete",
    competitors: [{ name: "某湘", mentalSlot: "重口", weakness: "环境", x: 70, y: 50 }],
    whitespace: "家庭场景的干净湘菜",
    whitespaceRegion: { x: 30, y: 70, label: "家庭干净空位", halfW: 12, halfH: 10 },
    plotPoints: [
      { id: "p1", label: "某湘", kind: "competitor", x: 70, y: 50 },
      { id: "p2", label: "空位", kind: "whitespace", x: 30, y: 70 },
      { id: "p3", label: "我方", kind: "our_brand", x: 35, y: 72 },
    ],
    mapEvidence: [
      {
        evidenceId: "me1",
        claim: "家庭场景的干净湘菜空位",
        sourceArtifact: "CompetitiveMap.whitespace",
        strength: "strong",
        reviewStatus: "accepted",
      },
      {
        evidenceId: "me2",
        claim: "竞品心智停在重口宴请",
        sourceArtifact: "BrandBrief.competitiveSet",
        strength: "moderate",
        reviewStatus: "accepted",
      },
    ],
  });
  p = advance(p);
  return p;
}

describe("BrandProjectStateMachine", () => {
  it("blocks positioning design without prior artifacts", () => {
    const p = createBrandProject("proj_x");
    expect(() => assertCanDesignPositioning(p)).toThrow(StageGateError);
  });

  it("advances through gates when artifacts complete", () => {
    const p = projectReadyForPositioning();
    expect(p.stage).toBe(BrandProjectStage.POSITIONING_DESIGN);
    expect(p.stageStatus).toBe("active");
  });
});

describe("BrandBriefInterviewEngine", () => {
  it("compiles complete BrandBrief after five layers", () => {
    const brief = completeBriefViaInterview();
    expect(brief.status).toBe("complete");
    expect(brief.gaps).toEqual([]);
    expect(brief.targetCustomer.length).toBeGreaterThan(0);
    expect(brief.competitiveSet.length).toBeGreaterThan(0);
  });

  it("keeps draft when answers missing", () => {
    const session = createBriefInterviewSession("bp");
    const brief = compileBrandBrief(session);
    expect(brief.status).toBe("draft");
    expect(brief.gaps.length).toBeGreaterThan(0);
  });
});

describe("PositioningContractEngine", () => {
  it("rejects unstructured slogans", () => {
    expect(looksLikeUnstructuredSlogan("建议定位为年轻人的高品质湘菜品牌")).toBe(
      true,
    );
  });

  it("proposes contract only with statement + accepted evidence", () => {
    const p = projectReadyForPositioning();
    const statement = {
      forAudience: "25-40岁城市家庭",
      whoNeed: "快速享受高品质家常湘菜",
      ourBrandIs: "城市家庭湘菜生活方式品牌",
      thatValue: "干净、可复制的家常体验",
      because: "湖南传统菜系现代化表达",
      unlike: "传统湘菜馆和快餐品牌",
    };
    expect(formatPositioningStatement(statement)).toContain("For:");
    let contract = draftContractWithHypotheses(p, statement);
    expect(contract.supportingEvidence.every((e) => e.reviewStatus === "pending")).toBe(
      true,
    );
    expect(() => proposeContract(p, contract)).toThrow(ContractGateError);

    contract = selectPositioningHypothesis(contract, contract.hypotheses![0]!.hypothesisId);
    contract = reviewEvidenceItems(
      contract,
      contract.supportingEvidence.map((e) => ({
        evidenceId: e.evidenceId,
        reviewStatus: "accepted" as const,
      })),
    );
    contract = proposeContract(p, contract);
    expect(contract.status).toBe("proposed");
    expect(contract.supportingEvidence.length).toBeGreaterThanOrEqual(3);

    expect(() => freezeContract(contract)).toThrow(ContractGateError);

    const retell = [
      `我们服务${contract.statement.forAudience}，他们需要${contract.statement.whoNeed}。`,
      `我们的品牌是${contract.statement.ourBrandIs}，核心价值是${contract.statement.thatValue}，`,
      `因为${contract.statement.because}，不同于${contract.statement.unlike}。`,
    ].join("");
    contract = applyRehearsalToContract(
      contract,
      evaluatePositionRehearsal({
        statement: contract.statement,
        founderRetell: retell,
        checklist: {
          canSayInOneBreath: true,
          staffCanRepeat: true,
          productProvesBecause: true,
          unlikeIsClear: true,
        },
      }),
    );
    expect(contract.rehearsal?.status).toBe("passed");

    const frozen = freezeContract(contract);
    expect(frozen.status).toBe("frozen");
    p.assets.positioningContract = frozen;
  });

  it("allows rejecting weak evidence before propose", () => {
    const p = projectReadyForPositioning();
    let contract = draftContractWithHypotheses(p, {
      forAudience: "25-40岁城市家庭",
      whoNeed: "快速享受高品质家常湘菜",
      ourBrandIs: "城市家庭湘菜生活方式品牌",
      thatValue: "干净、可复制的家常体验",
      because: "湖南传统菜系现代化表达",
      unlike: "传统湘菜馆和快餐品牌",
    });
    contract = selectPositioningHypothesis(contract, contract.hypotheses![0]!.hypothesisId);
    const weak = contract.supportingEvidence[contract.supportingEvidence.length - 1]!;
    contract = reviewEvidenceItems(contract, [
      ...contract.supportingEvidence.slice(0, -1).map((e) => ({
        evidenceId: e.evidenceId,
        reviewStatus: "accepted" as const,
      })),
      {
        evidenceId: weak.evidenceId,
        reviewStatus: "rejected",
        rejectReason: "与战略选择无关",
      },
    ]);
    // 若驳回后仍有 >=3 条 accepted 且覆盖足够，可 propose
    if (
      contract.supportingEvidence.filter((e) => e.reviewStatus === "accepted").length >= 3
    ) {
      contract = proposeContract(p, contract);
      expect(contract.status).toBe("proposed");
      expect(
        contract.supportingEvidence.some((e) => e.reviewStatus === "rejected"),
      ).toBe(true);
    } else {
      expect(() => proposeContract(p, contract)).toThrow(ContractGateError);
    }
  });

  it("blocks propose without selected hypothesis", () => {
    const p = projectReadyForPositioning();
    let contract = draftContractWithHypotheses(p, {
      forAudience: "25-40岁城市家庭",
      whoNeed: "快速享受高品质家常湘菜",
      ourBrandIs: "城市家庭湘菜生活方式品牌",
      thatValue: "干净、可复制的家常体验",
      because: "湖南传统菜系现代化表达",
      unlike: "传统湘菜馆和快餐品牌",
    });
    contract = reviewEvidenceItems(
      contract,
      contract.supportingEvidence.map((e) => ({
        evidenceId: e.evidenceId,
        reviewStatus: "accepted" as const,
      })),
    );
    expect(() => proposeContract(p, contract)).toThrow(ContractGateError);
  });

  it("throws ContractGateError when statement incomplete", () => {
    const p = projectReadyForPositioning();
    const bad = draftContractFromProject(p, {
      forAudience: "家庭",
      whoNeed: "",
      ourBrandIs: "",
      thatValue: "",
      because: "",
      unlike: "",
    });
    expect(() => proposeContract(p, bad)).toThrow(ContractGateError);
  });

  it("accepts PrimaryFact source types as category/customer/competition coverage", () => {
    const p = projectReadyForPositioning();
    let contract = draftContractWithHypotheses(p, {
      forAudience: "25-40岁城市家庭",
      whoNeed: "快速享受高品质家常湘菜",
      ourBrandIs: "城市家庭湘菜生活方式品牌",
      thatValue: "干净、可复制的家常体验",
      because: "湖南传统菜系现代化表达",
      unlike: "传统湘菜馆和快餐品牌",
    });
    contract = selectPositioningHypothesis(
      contract,
      contract.hypotheses![0]!.hypothesisId,
    );
    const primaryOnly = contract.supportingEvidence.filter((e) =>
      e.sourceArtifact.startsWith("PrimaryFact."),
    );
    expect(primaryOnly.length).toBeGreaterThanOrEqual(3);
    contract = { ...contract, supportingEvidence: primaryOnly };
    contract = reviewEvidenceItems(
      contract,
      contract.supportingEvidence.map((e) => ({
        evidenceId: e.evidenceId,
        reviewStatus: "accepted" as const,
      })),
    );
    const proposed = proposeContract(p, contract);
    expect(proposed.status).toBe("proposed");
  });
});
