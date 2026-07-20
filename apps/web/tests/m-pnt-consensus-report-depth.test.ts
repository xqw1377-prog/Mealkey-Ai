/**
 * M-PNT：共识合成 + 策略报告骨架 + RTB 证据
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  applyUserVoteToWarRoom,
  buildAdvisorStrategiesFromResearch,
  buildMarketResearchPack,
  buildPositioningStrategyReportMarkdown,
  createBrandProject,
  openWarRoomDebate,
  writeBrandBrief,
} from "../../../packages/agents/src/m-pnt/consulting";
import {
  evidenceBackedProof,
  buildThinkingFactPack,
} from "../../../packages/agents/src/m-pnt/matrix/thinking";

describe("M-PNT consensus & strategy report depth", () => {
  function seeded() {
    let project = createBrandProject("p_depth", "b_depth");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "brief_d",
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
    const research = {
      ...buildMarketResearchPack({
        brief: project.assets.brandBrief,
        city: "长沙",
      }),
      competitorBriefs: [
        {
          name: "周边馆",
          mentalPosition: "宽菜单习惯位",
          evidenceSentence: "点评高频提到『什么都有』",
          threatToWhitespace: "挤占场景心智",
          summary: "同质宽菜单",
          dataQuality: "ok",
        },
      ],
      sources: [
        {
          title: "区域点评",
          url: "https://example.com/r",
          snippet: "带娃家庭抱怨聚餐要赌运气、卫生不确定",
          source: "web",
        },
      ],
    };
    const advisors = buildAdvisorStrategiesFromResearch(project, research);
    return { project, research, advisors };
  }

  it("blend 拍板合成三席共识，不再只拷贝 strategies[0]", () => {
    const { advisors } = seeded();
    const debated = openWarRoomDebate(advisors);
    const room = applyUserVoteToWarRoom(
      debated.room,
      debated.set,
      "blend",
      "心智为主，场景落地",
    );
    expect(room.status).toBe("agreed");
    expect(room.ownedWord).toBeTruthy();
    expect(room.minorityConstraints?.length).toBeGreaterThanOrEqual(2);
    expect(room.consensusStatement?.because).toBeTruthy();
    expect(room.consensusStatement?.unlike).toMatch(/不像|不跟|对照|vs|对/);
    expect(room.turns.find((t) => t.kind === "decision")!.text).toContain(
      "词权",
    );
    expect(room.turns.find((t) => t.kind === "decision")!.text).toContain(
      "落选席约束",
    );
    // blendNote 是取舍说明，不应覆盖一句话定位
    expect(room.consensusOneLiner).not.toBe("心智为主，场景落地");
  });

  it("策略报告含词权/品类/竞争/RTB 骨架", () => {
    const { research, advisors } = seeded();
    const debated = openWarRoomDebate(advisors);
    const room = applyUserVoteToWarRoom(debated.room, debated.set, "blend");
    const md = buildPositioningStrategyReportMarkdown({
      projectName: "深度店",
      city: "长沙",
      research,
      advisors: debated.set,
      warRoom: room,
    });
    expect(md).toContain("词权");
    expect(md).toContain("战略诊断骨架");
    expect(md).toContain("品类定义");
    expect(md).toContain("竞争框架");
    expect(md).toContain("Reason-to-Believe");
    expect(md).toContain("为何不选其他席");
    expect(md).toContain("三席并入终稿的强制约束");
  });

  it("事实包 RTB 优先用调研证据而非空喊信念", () => {
    const { project, research } = seeded();
    const fact = buildThinkingFactPack(project, research, "长沙");
    expect(fact.competitorBriefs?.length).toBeGreaterThan(0);
    expect(fact.evidenceSnippets?.length).toBeGreaterThan(0);
    const proof = evidenceBackedProof(fact, "rival");
    expect(proof).toMatch(/周边馆|宽菜单|证据/);
    expect(proof).not.toMatch(/^一线能把出品做稳$/);
  });
});
