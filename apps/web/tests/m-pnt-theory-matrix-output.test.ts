/**
 * M-PNT：专家理论矩阵产出冒烟（分数 / 交火 / 策略陈述）
 */
import { describe, expect, it } from "vitest";
import {
  buildAdvisorStrategiesWithMatrix,
  openWarRoom,
  buildMarketResearchPack,
  ensureProofPlan,
  createBrandProject,
  writeBrandBrief,
  BrandProjectStage,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("M-PNT theory matrix capability output", () => {
  async function seededMatrix() {
    let project = createBrandProject("p1", "b1");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "brief_1",
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
    const advisors = await buildAdvisorStrategiesWithMatrix(
      project,
      research,
      "长沙",
    );
    return { project, research, advisors };
  }

  it("outputs scorecards, cross-fire, and positioning statements", async () => {
    const { advisors } = await seededMatrix();

    expect(advisors.theoryMode).toBe("heuristic");
    expect(advisors.theoryMode).not.toBe("template_fallback");
    expect(advisors.crossFire).toBeTruthy();
    expect(advisors.crossFire!.challenges.length).toBeGreaterThan(0);
    expect(advisors.conflictSummary).toMatch(/不能同时/);

    for (const s of advisors.strategies) {
      expect(s.positioningStatement).toMatch(/对于.+当他们需要/);
      expect(s.theoryDossier).toBeTruthy();
      expect(s.theoryDossier!.totalScore).toBeGreaterThan(0);
      expect(s.theoryDossier!.dimensionBreakdown.length).toBeGreaterThan(3);
      expect(s.sacrifice.length).toBeGreaterThan(4);
      expect(ensureProofPlan(s).menu).toBeTruthy();
    }

    const room = openWarRoom(advisors);
    const challenges = room.turns.filter((t) => t.kind === "challenge");
    expect(challenges.length).toBeGreaterThan(0);
    expect(challenges.some((t) => /开火|质询|目标方向/.test(t.text))).toBe(
      true,
    );
    expect(room.turns.some((t) => t.text.includes("主轴"))).toBe(true);
  });
});
