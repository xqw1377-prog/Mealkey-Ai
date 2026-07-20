/**
 * 三席蒸馏知识库冒烟
 */
import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_STATS,
  getRules,
  getCases,
  matchRulesToText,
  getTheoryKnowledge,
} from "../../../packages/agents/src/m-pnt/matrix/knowledge";
import {
  buildAdvisorStrategiesWithMatrix,
  buildMarketResearchPack,
  createBrandProject,
  writeBrandBrief,
  BrandProjectStage,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("distilled knowledge for three seats", () => {
  it("has expanded rule and case counts", () => {
    expect(KNOWLEDGE_STATS.riesRules).toBeGreaterThanOrEqual(25);
    expect(KNOWLEDGE_STATS.troutRules).toBeGreaterThanOrEqual(22);
    expect(KNOWLEDGE_STATS.yeRules).toBeGreaterThanOrEqual(22);
    expect(KNOWLEDGE_STATS.totalCases).toBeGreaterThanOrEqual(16);
    expect(getCases("ye_maozhong").some((c) => c.brand_name.includes("柒牌"))).toBe(
      true,
    );
    expect(getCases("ye_maozhong").some((c) => c.brand_name.includes("安慕希"))).toBe(
      true,
    );
  });

  it("knowledge text has no celebrity names", () => {
    const blob = [
      getTheoryKnowledge("ries"),
      getTheoryKnowledge("trout"),
      getTheoryKnowledge("ye_maozhong"),
    ].join("\n");
    for (const name of ["里斯", "特劳特", "叶茂中", "Al Ries", "Jack Trout"]) {
      expect(blob.includes(name)).toBe(false);
    }
    expect(blob).toContain("心智官");
    expect(blob).toContain("空位官");
    expect(blob).toContain("冲突官");
  });

  it("engines surface distilled checks in dossier", async () => {
    let project = createBrandProject("p1", "b1");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "b",
      version: 1,
      status: "complete",
      businessContext: "单店",
      categoryDefinition: "湘菜",
      targetCustomer: "家庭",
      customerNeed: "干净可预期",
      competitiveSet: ["周边馆"],
      brandAmbition: "首选",
      founderBelief: "稳出品",
      rawAnswers: {},
      gaps: [],
      compiledAt: new Date().toISOString(),
    });
    const research = buildMarketResearchPack({
      brief: project.assets.brandBrief,
      city: "长沙",
    });
    const set = await buildAdvisorStrategiesWithMatrix(project, research, "长沙");
    for (const s of set.strategies) {
      expect(s.theoryDossier?.coreLogic).toMatch(/蒸馏|案例|商规/);
      const distilled = s.theoryDossier?.dimensionBreakdown?.some((d) =>
        d.name.includes("蒸馏"),
      );
      expect(distilled).toBe(true);
    }
    expect(matchRulesToText("ries", "只做第一聚焦牺牲", 3).length).toBeGreaterThan(0);
    expect(getRules("trout").length).toBe(KNOWLEDGE_STATS.troutRules);
  });
});
