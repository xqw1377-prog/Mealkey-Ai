/**
 * M-PNT 六步价值路径冒烟
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  createBrandProject,
  writeBrandBrief,
  buildMarketResearchPack,
  confirmMarketResearchPack,
  buildAdvisorStrategiesFromResearch,
  openWarRoomDebate,
  applyUserVoteToWarRoom,
  buildPositioningStrategyReportMarkdown,
  buildExecutionRoadmap,
  acceptExecutionRoadmap,
  resolveMpntJourneyNextStep,
  writeJourneyAssets,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("M-PNT six-step journey", () => {
  it("runs research → advisors → war room → report → roadmap", () => {
    let project = createBrandProject("proj_demo", "brand_demo");
    project = {
      ...project,
      stage: BrandProjectStage.CATEGORY_ANALYSIS,
      // Seed brandBasics so intake checklist allows market research
      assets: {
        ...project.assets,
        brandBasics: {
          status: "complete" as const,
          values: {
            brandName: "测试店",
            region: "长沙",
            category: "湘菜",
            targetCustomer: "带娃家庭",
            currentStage: "已开业",
            storeCount: "1",
          },
          missingMust: [],
          missingNice: [],
          completedAt: new Date().toISOString(),
        },
      },
    };
    project = writeBrandBrief(project, {
      briefId: "brief_1",
      version: 1,
      status: "complete",
      businessContext: "客人要吃得放心",
      categoryDefinition: "湘菜",
      targetCustomer: "带娃家庭",
      customerNeed: "干净可预期",
      competitiveSet: ["周边馆", "连锁快餐"],
      brandAmbition: "家庭聚餐首选",
      founderBelief: "一线稳出品",
      rawAnswers: {},
      gaps: [],
      compiledAt: new Date().toISOString(),
    });

    const research = buildMarketResearchPack({
      brief: project.assets.brandBrief,
      city: "长沙",
    });
    expect(research.headline).toContain("长沙");
    const confirmed = confirmMarketResearchPack(research);

    const advisors = buildAdvisorStrategiesFromResearch(project, confirmed);
    expect(advisors.strategies).toHaveLength(3);
    expect(advisors.conflictSummary.length).toBeGreaterThan(10);

    const debated = openWarRoomDebate(advisors);
    let room = debated.room;
    expect(room.status).toBe("awaiting_user");
    expect(room.debateRoundCompleted).toBe(true);
    expect(debated.set.status).toBe("debated");
    expect(room.decisionCard?.options.length).toBe(3);
    room = applyUserVoteToWarRoom(
      room,
      debated.set,
      "blend",
      "心智为主，场景落地",
    );
    expect(room.status).toBe("agreed");
    expect(room.consensusOneLiner).toBeTruthy();

    const report = buildPositioningStrategyReportMarkdown({
      projectName: "测试店",
      city: "长沙",
      research: confirmed,
      advisors: debated.set,
      warRoom: room,
    });
    expect(report).toContain("品牌定位策略报告");
    expect(report).toContain(room.consensusOneLiner!);
    expect(report).toMatch(/店员交付包|迎客脚本/);

    const primary =
      debated.set.strategies.find((s) => s.advisorId === "ries") ||
      debated.set.strategies[0]!;
    const roadmap = buildExecutionRoadmap({
      positioningOneLiner: room.consensusOneLiner!,
      battlefield: primary.battlefield,
      forWhom: primary.forWhom,
      proofPlan: primary.proofPlan,
      doNotDo: primary.doNotDo,
      sacrifice: primary.sacrifice,
      decisionOption: room.decisionCard?.options.find(
        (o) => o.advisorId === "ries",
      ),
      decisionCard: room.decisionCard,
      primaryStrategy: primary,
    });
    expect(roadmap.milestones.length).toBeGreaterThanOrEqual(3);
    expect(roadmap.staffDelivery?.oneLiner).toBeTruthy();
    expect(roadmap.staffDelivery?.greetScript).toMatch(/迎客/);
    expect(roadmap.staffDelivery?.doNotSay.length).toBeGreaterThan(8);
    expect(roadmap.milestones[0]!.actions.some((a) => /不做|话术|背会/.test(a))).toBe(
      true,
    );
    expect(roadmap.milestones[1]!.title).toMatch(/菜单|证明|30/);
    const accepted = acceptExecutionRoadmap(roadmap);
    expect(accepted.status).toBe("accepted");

    project = writeJourneyAssets(project, {
      marketResearch: confirmed,
      advisorStrategies: debated.set,
      warRoom: room,
      strategyReportMarkdown: report,
      strategyConfirmedAt: new Date().toISOString(),
      executionRoadmap: accepted,
    });
    const next = resolveMpntJourneyNextStep(project, project.assets.journey);
    expect(next.actionId).toBe("staff.pack");
    expect(next.ctaLabel).toMatch(/墙卡|店员/);
  });

  it("asks for intake before brief is complete", () => {
    const project = createBrandProject("proj_x", "brand_x");
    const next = resolveMpntJourneyNextStep(project);
    expect(next.step).toBe("INTAKE");
  });
});
