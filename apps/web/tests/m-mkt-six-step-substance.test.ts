/**
 * M-MKT 打透厚度门槛 — 对标 M-PNT 过程资产（非样式）
 */
import { describe, expect, it } from "vitest";
import {
  confirmResearchPack,
  enforceAdvisorTradeoffs,
  enrichResearchForDecision,
} from "../../../packages/agents/src/consulting-os";
import {
  mmktBlueprint,
  thickenMarketScan,
  attachEntrySchemes,
  buildMmktExecutionRoadmap,
  buildOpportunityStrategyReport,
  type EntryDeliveryPack,
} from "../../../packages/agents/src/m-mkt/consulting";

describe("m-mkt six-step substance", () => {
  const answers = {
    city: "长沙主城",
    category: "家常正餐 / 堂食为主",
    intent: "判断从哪个客群/场景切入更稳",
    constraint: "预算有限，必须小步试点",
    scene: "白领下班小聚",
    targetCustomer: "附近写字楼白领",
    ticketBand: "人均 45-60",
    rivals: "某湘、本地家常馆",
    killLine: "8 周复购人数无提升 → 换切口",
  };

  it("厚调研：范围卡 + 竞对三联 + 完整 Markdown", () => {
    let research = mmktBlueprint.buildResearch(answers, {
      city: "长沙",
      name: "测试馆",
    });
    research = thickenMarketScan(research, answers, {
      city: "长沙",
      name: "测试馆",
      collectionMode: "heuristic",
    });
    research = enrichResearchForDecision(research, answers, "m-mkt");

    expect(research.scope?.city).toBeTruthy();
    expect(research.competitorBriefs?.length).toBeGreaterThanOrEqual(3);
    expect(research.fullMarkdown).toContain("市场机会扫描报告");
    expect(research.fullMarkdown).toContain("扫描范围卡");
    expect(research.sections.length).toBeGreaterThanOrEqual(5);
    expect(research.sections.some((s) => s.title === "本轮唯一问题")).toBe(true);
  });

  it("三席进入方案包互斥且带记分卡/交火", () => {
    const research = confirmResearchPack(
      mmktBlueprint.buildResearch(answers, { city: "长沙", name: "测试馆" }),
    );
    let advisors = mmktBlueprint.buildAdvisors(answers, research);
    advisors = attachEntrySchemes(advisors, answers, research);
    advisors = enforceAdvisorTradeoffs(advisors, mmktBlueprint.advisors);

    expect(advisors.strategies).toHaveLength(3);
    for (const s of advisors.strategies) {
      expect(s.entryScheme?.title).toBeTruthy();
      expect(s.entryScheme?.menuPilot.length).toBeGreaterThanOrEqual(2);
      expect(s.entryScheme?.killLine).toBeTruthy();
      expect(s.entryScheme?.scorecard.length).toBeGreaterThanOrEqual(2);
      expect(s.crossFireNote || s.entryScheme?.crossFireAmmo).toBeTruthy();
      expect(s.entryScheme?.sceneCut).toMatch(/白领下班小聚/);
      expect(s.entryScheme?.menuPilot.join("；")).not.toMatch(/场合主推 [ABC]/);
    }
    expect(advisors.gameSummary || advisors.conflictSummary).toMatch(/交火|互斥/);
    const lines = new Set(advisors.strategies.map((s) => s.oneLiner));
    expect(lines.size).toBe(3);
  });

  it("会议室含反驳/改策相位与决策卡 ifNot", () => {
    const research = mmktBlueprint.buildResearch(answers, {
      city: "长沙",
      name: "测试馆",
    });
    const advisors = mmktBlueprint.buildAdvisors(answers, research);
    const room = mmktBlueprint.buildWarRoom(advisors);

    expect(room.turns.some((t) => t.agendaPhase === "rebuttal")).toBe(true);
    expect(room.turns.some((t) => t.agendaPhase === "revise")).toBe(true);
    expect(room.decisionCard?.options.length).toBe(3);
    expect(room.decisionCard?.options.every((o) => o.ifNot)).toBe(true);
  });

  it("机会战略报告 + 进入作战卡非空", () => {
    const research = thickenMarketScan(
      mmktBlueprint.buildResearch(answers, { city: "长沙", name: "测试馆" }),
      answers,
      { name: "测试馆" },
    );
    const advisors = mmktBlueprint.buildAdvisors(answers, research);
    let room = mmktBlueprint.buildWarRoom(advisors);
    room = mmktBlueprint.applyVote(room, advisors, "strategy");

    const roadmap = buildMmktExecutionRoadmap({
      oneLiner: room.consensusOneLiner!,
      answers,
      advisors,
      warRoom: room,
    });
    const entryPack = roadmap.entryPack as EntryDeliveryPack | undefined;
    expect(roadmap.entryPack?.wallCard).toContain("进入作战卡");
    expect(roadmap.entryPack?.wallCard).toContain("白领下班小聚");
    expect(roadmap.entryPack?.wallCard).not.toMatch(/场合主推 [ABC]/);
    expect(roadmap.entryPack?.menuPilot).not.toMatch(/场合主推 [ABC]/);
    expect(roadmap.entryPack?.killLine).toBeTruthy();

    const report = buildOpportunityStrategyReport({
      projectName: "测试馆",
      city: "长沙",
      answers,
      research,
      advisors,
      warRoom: room,
      entryPack,
      advisorName: (id) =>
        mmktBlueprint.advisors.find((a) => a.id === id)?.name || id,
    });
    expect(report).toContain("市场机会战略报告");
    expect(report).toContain("三席进入方案对照");
    expect(report).toContain("市场战略专家");
    expect(report).toContain("进入作战卡");
  });
});
