/**
 * M-PNT — Category Decision 评分卡与决策门禁
 */
import { describe, expect, it } from "vitest";
import {
  ContractGateError,
  buildCategoryDiagnosis,
  selectCategoryBattlefield,
  assertCategoryDecisionReady,
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

describe("category decision rigor", () => {
  it("builds scored battlefield options with a clear recommended winner", () => {
    const cat = buildCategoryDiagnosis({ brief, city: "长沙", brandName: "测" });
    const options = cat.decision!.options;
    expect(options.every((o) => o.scores && o.scores.total > 0)).toBe(true);
    const recommended = options.filter((o) => o.recommended);
    expect(recommended).toHaveLength(1);
    const max = Math.max(...options.map((o) => o.scores!.total));
    expect(recommended[0]!.scores!.total).toBe(max);
  });

  it("rejects select without founder decision reason", () => {
    const draft = buildCategoryDiagnosis({ brief, city: "长沙" });
    const optionId = draft.decision!.options.find((o) => o.recommended)!.optionId;
    expect(() =>
      selectCategoryBattlefield(draft, optionId, { decisionReason: "太短" }),
    ).toThrow(ContractGateError);
  });

  it("requires override reason when covering recommendation", () => {
    const draft = buildCategoryDiagnosis({ brief, city: "长沙" });
    const nonRec = draft.decision!.options.find((o) => !o.recommended)!;
    const longReason = "我想优先打价格带验证供给与复购，再回头切心智";
    expect(longReason.length).toBeGreaterThanOrEqual(20);
    expect(() =>
      selectCategoryBattlefield(draft, nonRec.optionId, {
        decisionReason: longReason,
      }),
    ).toThrow(ContractGateError);

    const decided = selectCategoryBattlefield(draft, nonRec.optionId, {
      decisionReason: longReason,
      overrideReason: "短期要现金流，先用价格验证供给后再切心智定位",
    });
    expect(decided.decision?.overrideRecommended).toBe(true);
    expect(decided.decision?.overrideReason?.length).toBeGreaterThanOrEqual(20);
    expect(() => assertCategoryDecisionReady(decided)).not.toThrow();
  });

  it("accepts recommended pick with sufficient reason", () => {
    const draft = buildCategoryDiagnosis({ brief, city: "长沙" });
    const optionId = draft.decision!.options.find((o) => o.recommended)!.optionId;
    const decided = selectCategoryBattlefield(draft, optionId, {
      decisionReason: "选择场景心智位，因为资源与用户证据都更匹配家庭场合",
    });
    expect(decided.decision?.overrideRecommended).toBe(false);
    expect(decided.battlefield).toContain("场景");
    expect(() => assertCategoryDecisionReady(decided)).not.toThrow();
  });

  it("raises evidenceStrength when primary facts are strong vs weak", () => {
    const weakFacts = [1, 2, 3].map((i) => ({
      factId: `w${i}`,
      claim: `弱观察素材编号${i}：仅听闻家庭周末堂食偏多`,
      sourceType: "other" as const,
      relatedStage: "CATEGORY_ANALYSIS" as const,
      strength: "weak" as const,
      capturedAt: new Date().toISOString(),
    }));
    const strongFacts = weakFacts.map((f, i) => ({
      ...f,
      factId: `s${i}`,
      strength: "strong" as const,
      claim: `强证据编号${i}：门店POS显示家庭周末堂食占比过半`,
    }));
    const weakCat = buildCategoryDiagnosis({
      brief,
      city: "长沙",
      primaryFacts: weakFacts,
    });
    const strongCat = buildCategoryDiagnosis({
      brief,
      city: "长沙",
      primaryFacts: strongFacts,
    });
    const weakEv = weakCat.decision!.options.find((o) => o.recommended)!
      .scores!.evidenceStrength;
    const strongEv = strongCat.decision!.options.find((o) => o.recommended)!
      .scores!.evidenceStrength;
    expect(strongEv).toBeGreaterThan(weakEv);
    expect(
      strongCat.decision!.options.find((o) => o.recommended)!.evidenceHints?.join(
        "",
      ),
    ).toContain("强度+");
  });
});
