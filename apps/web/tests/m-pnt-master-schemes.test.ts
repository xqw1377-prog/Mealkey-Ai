/**
 * 三席大师方案包：各用各的框架 + 话术 + 辩论后重算
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  buildAdvisorStrategiesFromResearch,
  buildMarketResearchPack,
  buildPositioningStrategyReportMarkdown,
  createBrandProject,
  openWarRoomDebate,
  writeBrandBrief,
  attachMasterSchemesToSet,
  masterSchemeContextFromInputs,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("master schemes per advisor", () => {
  function setup() {
    let project = createBrandProject("p1", "b1");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "brief_1",
      version: 1,
      status: "complete",
      businessContext: "长沙单店",
      categoryDefinition: "湘菜",
      targetCustomer: "带娃家庭",
      customerNeed: "干净可预期",
      competitiveSet: ["费大厨", "炊烟"],
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
    const set = buildAdvisorStrategiesFromResearch(project, research);
    return { project, research, set };
  }

  it("attaches distinct ries/trout/ye schemes with scripts", () => {
    const { research, set } = setup();
    expect(set.strategies).toHaveLength(3);
    expect(set.schemeContext?.brandName).toBeTruthy();

    const ries = set.strategies.find((s) => s.advisorId === "ries")!;
    const trout = set.strategies.find((s) => s.advisorId === "trout")!;
    const ye = set.strategies.find((s) => s.advisorId === "ye")!;

    expect(ries.masterScheme?.school).toBe("ries");
    expect(trout.masterScheme?.school).toBe("trout");
    expect(ye.masterScheme?.school).toBe("ye");

    if (ries.masterScheme?.school === "ries") {
      expect(ries.masterScheme.mentalWord.length).toBeGreaterThan(1);
      expect(ries.masterScheme.brandNameAssessment.score).toBeGreaterThan(0);
      expect(ries.masterScheme.scripts.greeting.length).toBeGreaterThan(6);
      expect(ries.masterScheme.marketingMoves.length).toBeGreaterThan(0);
    }
    if (trout.masterScheme?.school === "trout") {
      expect(trout.masterScheme.warTypeLabel).toMatch(/战/);
      expect(trout.masterScheme.scripts.greeting).toMatch(/费大厨|空位|差不多/);
      expect(trout.masterScheme.scripts.storefront).toMatch(/不像|空位/);
    }
    if (ye.masterScheme?.school === "ye") {
      expect(ye.masterScheme.verbalNail.length).toBeGreaterThan(0);
      expect(ye.masterScheme.visualHammer).toMatch(/视觉|门头|符号/);
      expect(ye.masterScheme.scripts.shortVideo.length).toBeGreaterThan(4);
    }

    const { room, set: debated } = openWarRoomDebate(set);
    expect(debated.strategies.every((s) => s.masterScheme)).toBe(true);
    const md = buildPositioningStrategyReportMarkdown({
      projectName: "测试品牌",
      city: "长沙",
      research,
      advisors: debated,
      warRoom: room,
    });
    expect(md).toMatch(/三席各出方案/);
    expect(md).toMatch(/品牌名评估|战法|语言钉/);
    expect(md).toMatch(/传播话术/);
    expect(md).toMatch(/店员交付包/);
  });

  it("rebuilds master scheme after card battlefield changes", () => {
    const { set } = setup();
    const ries = set.strategies.find((s) => s.advisorId === "ries")!;
    const oldWord =
      ries.masterScheme?.school === "ries"
        ? ries.masterScheme.mentalWord
        : "";
    const mutated = {
      ...ries,
      battlefield: "带娃放心湘菜",
      oneLiner: "客人脑中只记一个词：「带娃放心湘菜」",
    };
    const ctx =
      set.schemeContext ||
      masterSchemeContextFromInputs({ brandName: "测试馆" });
    const [next] = attachMasterSchemesToSet([mutated], ctx);
    expect(next!.masterScheme?.school).toBe("ries");
    if (next!.masterScheme?.school === "ries") {
      expect(next!.masterScheme.mentalWord).toMatch(/带娃放心/);
      expect(next!.masterScheme.mentalWord).not.toBe(oldWord);
      expect(next!.masterScheme.scripts.storefront).toMatch(/带娃放心/);
    }
  });
});
