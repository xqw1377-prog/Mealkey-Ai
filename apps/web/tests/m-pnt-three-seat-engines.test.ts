/**
 * 三席思维引擎冒烟：造策 + 记分 + 交火 + 去真名
 */
import { describe, expect, it } from "vitest";
import {
  buildAdvisorStrategiesWithMatrix,
  openWarRoom,
  buildMarketResearchPack,
  createBrandProject,
  writeBrandBrief,
  BrandProjectStage,
  ADVISOR_META,
} from "../../../packages/agents/src/m-pnt/consulting";

const FORBIDDEN_NAMES = [
  "里斯",
  "特劳特",
  "叶茂中",
  "Al Ries",
  "Jack Trout",
  "Ries",
  "Trout",
];

describe("three-seat thinking engines", () => {
  async function seeded() {
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
    return { advisors };
  }

  it("invents per-seat strategies with scorecards and no celebrity names", async () => {
    const { advisors } = await seeded();
    expect(advisors.theoryMode).not.toBe("template_fallback");
    expect(ADVISOR_META.ries.name).toBe("心智官");
    expect(ADVISOR_META.trout.name).toBe("空位官");
    expect(ADVISOR_META.ye.name).toBe("冲突官");

    const blob = JSON.stringify(advisors);
    const hits = FORBIDDEN_NAMES.filter((name) => blob.includes(name));
    expect(hits, `forbidden names in output: ${hits.join(",")}`).toEqual([]);

    for (const s of advisors.strategies) {
      expect(s.theoryDossier?.totalScore).toBeGreaterThan(40);
      expect(s.theoryDossier?.dimensionBreakdown.length).toBeGreaterThan(5);
      expect(s.theoryDossier?.coreLogic).toMatch(/1\.|思维|法则|诊断|造/);
      expect(s.positioningStatement).toMatch(/对于.+当他们需要/);
      expect(s.proofPlan?.menu).toBeTruthy();
      // 不是空洞模板感想
      expect(s.oneLiner.length).toBeGreaterThan(6);
    }

    expect(advisors.crossFire?.challenges.length).toBeGreaterThan(2);
    expect(advisors.conflictSummary).toMatch(/不能同时|不能并行|主航道/);

    const room = openWarRoom(advisors);
    const roomBlob = JSON.stringify(room);
    for (const name of FORBIDDEN_NAMES) {
      expect(roomBlob.includes(name)).toBe(false);
    }
    expect(room.turns.some((t) => t.text.includes("心智官"))).toBe(true);
    expect(room.turns.some((t) => t.kind === "challenge")).toBe(true);
    expect(room.turns.some((t) => t.kind === "rebuttal")).toBe(true);
    expect(room.turns.some((t) => t.kind === "revise")).toBe(true);
    expect(room.debateRoundCompleted).toBe(true);
  });

  it("LLM invent hybrid: uses adapter directions then scores", async () => {
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

    const mockLlm = {
      async chat() {
        return {
          content: JSON.stringify({
            directions: [
              {
                name: "心智第一·干净可预期",
                oneLiner: "只做干净可预期第一，不做大而全",
                type: "心智占位",
                focus: "第一/聚焦",
                inventReason: "mock invent A",
              },
              {
                name: "子品类·放心湘菜",
                oneLiner: "开创放心湘菜子品类第一",
                type: "品类分化",
                focus: "新品类",
                inventReason: "mock invent B",
              },
              {
                name: "更好陷阱",
                oneLiner: "比周边馆更好吃更全更实惠",
                type: "对照否决",
                focus: "更好",
                inventReason: "mock veto",
              },
            ],
          }),
        };
      },
    };

    const advisors = await buildAdvisorStrategiesWithMatrix(
      project,
      research,
      "长沙",
      { llm: mockLlm },
    );

    expect(advisors.theoryMode).toBe("llm_hybrid");
    const blob = JSON.stringify(advisors);
    expect(blob).toMatch(/LLM invent|干净可预期|放心湘菜/);
    const hits = FORBIDDEN_NAMES.filter((name) => blob.includes(name));
    expect(hits).toEqual([]);
    for (const s of advisors.strategies) {
      // 后四席暂无独立蒸馏规则，分数可能低于核心三席；核心三席须 >40
      if (["ries", "trout", "ye"].includes(s.advisorId)) {
        expect(s.theoryDossier?.totalScore).toBeGreaterThan(40);
      } else {
        expect(s.theoryDossier?.totalScore).toBeGreaterThan(25);
      }
      expect(s.oneLiner.length).toBeGreaterThan(6);
    }
  });
});
