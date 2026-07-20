/**
 * M-PNT：策略结构 + 会议体感冒烟
 */
import { describe, expect, it } from "vitest";
import {
  buildAdvisorStrategiesFromResearch,
  openWarRoomDebate,
  applyUserVoteToWarRoom,
  buildPositioningStrategyReportMarkdown,
  buildMarketResearchPack,
  ensureProofPlan,
  createBrandProject,
  writeBrandBrief,
  BrandProjectStage,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("M-PNT strategy structure & meeting", () => {
  function seeded() {
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
    const advisors = buildAdvisorStrategiesFromResearch(project, research);
    return { project, research, advisors };
  }

  it("advisor card looks like a strategy sheet not fluff", () => {
    const { advisors } = seeded();
    expect(advisors.conflictSummary).toContain("不能同时");
    for (const s of advisors.strategies) {
      expect(s.positioningStatement).toMatch(/对于.+当他们需要/);
      expect(s.frameOfReference.length).toBeGreaterThan(2);
      expect(s.jobToBeDone.length).toBeGreaterThan(2);
      expect(s.sacrifice.length).toBeGreaterThan(4);
      expect(ensureProofPlan(s).menu).toBeTruthy();
      expect(s.rationale.length).toBeLessThan(40);
      expect(s.rationale).not.toMatch(/——/);
    }
  });

  it("war room has agenda phases and interrogation", () => {
    const { advisors } = seeded();
    const debated = openWarRoomDebate(advisors);
    let room = debated.room;
    expect(room.currentAgenda).toBe("founder_vote");
    expect(room.debateRoundCompleted).toBe(true);
    expect(room.decisionCard?.options.length).toBe(3);
    expect(room.decisionCard?.markdown).toMatch(/一页纸决策卡/);
    expect(room.turns.some((t) => t.agendaPhase === "call_to_order")).toBe(true);
    expect(room.turns.some((t) => t.agendaPhase === "crossfire")).toBe(true);
    expect(room.turns.some((t) => t.kind === "rebuttal")).toBe(true);
    expect(room.turns.some((t) => t.kind === "revise")).toBe(true);
    expect(room.turns.filter((t) => t.kind === "pitch").length).toBe(3);
    const pitch = room.turns.find((t) => t.kind === "pitch")!;
    expect(pitch.text).toContain("主轴");
    expect(pitch.text).toContain("牺牲");
    expect(pitch.text).not.toMatch(/依据：用户为什么记住你/);

    // 辩论后策略表已写回
    expect(debated.set.status).toBe("debated");
    expect(
      debated.set.strategies.some((s) => /辩论后|辩论修正|辩论收紧/.test(s.sacrifice + s.oneLiner)),
    ).toBe(true);

    room = applyUserVoteToWarRoom(room, debated.set, "ries");
    expect(room.consensusStatement?.whoNeed).toBeTruthy();
    expect(room.turns.some((t) => t.kind === "decision")).toBe(true);
    expect(room.turns.find((t) => t.kind === "decision")!.text).toContain(
      "决议生效",
    );
    expect(room.turns.find((t) => t.kind === "decision")!.text).toMatch(
      /辩论修正|会议辩论/,
    );
  });

  it("async debate can polish rebuttal with LLM adapter", async () => {
    const { advisors } = seeded();
    const sync = openWarRoomDebate(advisors);
    const firstSeat = sync.room.turns.find((t) => t.kind === "rebuttal")
      ?.speaker as "ries" | "trout" | "ye" | undefined;
    expect(firstSeat).toBeTruthy();

    const mockLlm = {
      async chat() {
        return {
          content: JSON.stringify({
            revisions: [
              {
                advisorId: firstSeat,
                rebuttalText:
                  "当场反驳：砍菜我认。主轴不撤，本周菜单先砍到三道，只留可复述的一词。",
                oneLiner: "只做干净可预期第一（辩论收紧）",
                sacrifice: "放弃宽菜单；主推不超过三道",
                doNotDo: "不做更好吃更全更实惠",
                proofPlan: {
                  menu: "主推≤3道证明干净可预期",
                  script: "只讲干净可预期",
                  scene: "门头只出现干净可预期",
                },
                reviseAnnouncement:
                  "修正策略表：主推砍到三道，话术只留一词。",
              },
            ],
          }),
        };
      },
    };
    const { openWarRoomDebateAsync } = await import(
      "../../../packages/agents/src/m-pnt/consulting/strategy-meeting-engine"
    );
    const result = await openWarRoomDebateAsync(advisors, { llm: mockLlm });
    expect(result.room.decisionCard?.options.length).toBe(3);
    expect(result.room.debateRoundCompleted).toBe(true);
    expect(result.set.status).toBe("debated");
    expect(result.room.turns.some((t) => t.text.includes("砍到三道") || t.text.includes("本周菜单先砍"))).toBe(
      true,
    );
    const revised = result.set.strategies.find((s) => s.advisorId === firstSeat);
    expect(revised?.sacrifice).toMatch(/三道|放弃/);
    expect(revised?.proofPlan?.menu).toMatch(/3|三/);
    expect(
      result.room.decisionCard?.options.some((o) =>
        /辩论收紧|干净可预期/.test(o.oneLiner),
      ),
    ).toBe(true);
  });

  it("report contains positioning statement table structure", () => {
    const { research, advisors } = seeded();
    const debated = openWarRoomDebate(advisors);
    let room = debated.room;
    room = applyUserVoteToWarRoom(room, debated.set, "trout");
    const md = buildPositioningStrategyReportMarkdown({
      projectName: "测试店",
      city: "长沙",
      research,
      advisors: debated.set,
      warRoom: room,
    });
    expect(md).toContain("标准定位陈述");
    expect(md).toContain("For（给谁）");
    expect(md).toContain("证明计划");
    expect(md).toContain("必须牺牲");
    expect(md).toContain("顾问原策速览表");
    expect(md).toMatch(/一页纸决策卡/);
  });
});
