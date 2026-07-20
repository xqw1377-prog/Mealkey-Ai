/**
 * M-BIZ 打透厚度门槛
 */
import { describe, expect, it } from "vitest";
import {
  confirmResearchPack,
  enforceAdvisorTradeoffs,
  enrichResearchForDecision,
} from "../../../packages/agents/src/consulting-os";
import {
  mbizBlueprint,
  thickenBusinessScan,
  attachModeSchemes,
  buildMbizExecutionRoadmap,
  buildModeStrategyReport,
} from "../../../packages/agents/src/m-biz/consulting";

describe("m-biz six-step substance", () => {
  const answers = {
    stage: "还在验证单店能不能跑通",
    pain: "单店还行，一复制就走样",
    priority: "先把利润做稳",
    resource: "现金紧",
    northStar: "主推贡献毛利率周环比改善",
    copyBlocker: "第二店冲动扩张",
  };

  it("厚体检：九维评分 + 完整 Markdown", () => {
    let research = mbizBlueprint.buildResearch(answers, { name: "测试店" });
    research = thickenBusinessScan(research, answers, {
      name: "测试店",
      collectionMode: "heuristic",
    });
    research = enrichResearchForDecision(research, answers, "m-biz");

    expect(research.fullMarkdown).toContain("商业模式体检报告");
    expect(research.fullMarkdown).toContain("九维评分");
    expect(research.sections.some((s) => s.title === "九维评分")).toBe(true);
    expect(research.sections.some((s) => s.title === "本轮唯一问题")).toBe(true);
    expect(research.sections.length).toBeGreaterThanOrEqual(5);
  });

  it("四官模式方案包互斥且带记分卡/交火", () => {
    const research = confirmResearchPack(
      mbizBlueprint.buildResearch(answers, { name: "测试店" }),
    );
    let advisors = mbizBlueprint.buildAdvisors(answers, research);
    advisors = attachModeSchemes(advisors, answers, research);
    advisors = enforceAdvisorTradeoffs(advisors, mbizBlueprint.advisors);

    expect(advisors.strategies).toHaveLength(4);
    for (const s of advisors.strategies) {
      expect(s.modeScheme?.title).toBeTruthy();
      expect(s.modeScheme?.proofPlan.length).toBeGreaterThanOrEqual(2);
      expect(s.modeScheme?.killLine).toBeTruthy();
      expect(s.entryScheme?.title).toBeTruthy();
      expect(s.crossFireNote).toBeTruthy();
    }
    const strategy = advisors.strategies.find((s) => s.advisorId === "strategy");
    expect(strategy?.modeScheme?.northStar).toContain("主推贡献毛利率周环比改善");
    expect(strategy?.modeScheme?.operatingMoves.some((m) => /停|砍|暂缓/.test(m))).toBe(
      true,
    );
    expect(advisors.gameSummary).toMatch(/交火/);
    expect(new Set(advisors.strategies.map((s) => s.oneLiner)).size).toBe(4);
  });

  it("会议室含反驳/改策与四席决策卡", () => {
    const research = mbizBlueprint.buildResearch(answers, { name: "测试店" });
    const advisors = mbizBlueprint.buildAdvisors(answers, research);
    const room = mbizBlueprint.buildWarRoom(advisors);

    expect(room.turns.some((t) => t.agendaPhase === "rebuttal")).toBe(true);
    expect(room.turns.some((t) => t.agendaPhase === "revise")).toBe(true);
    expect(room.decisionCard?.options.length).toBe(4);
    expect(room.decisionCard?.options.every((o) => o.ifNot)).toBe(true);
  });

  it("模式战略报告 + 模式作战卡非空", () => {
    const research = thickenBusinessScan(
      mbizBlueprint.buildResearch(answers, { name: "测试店" }),
      answers,
      { name: "测试店" },
    );
    const advisors = mbizBlueprint.buildAdvisors(answers, research);
    let room = mbizBlueprint.buildWarRoom(advisors);
    room = mbizBlueprint.applyVote(room, advisors, "strategy");

    const roadmap = buildMbizExecutionRoadmap({
      oneLiner: room.consensusOneLiner!,
      answers,
      advisors,
      warRoom: room,
    });
    expect(roadmap.modePack?.wallCard).toContain("模式作战卡");
    expect(roadmap.modePack?.wallCard).toContain("主推贡献毛利率周环比改善");
    expect(roadmap.modePack?.wallCard).toMatch(/砍清单|停拉新|暂缓/);
    expect(roadmap.modePack?.cityScene).toContain("主推贡献毛利率周环比改善");
    expect(roadmap.modePack?.killLine).toBeTruthy();

    const report = buildModeStrategyReport({
      projectName: "测试店",
      answers,
      research,
      advisors,
      warRoom: room,
      modePack: roadmap.modePack,
      advisorName: (id) =>
        mbizBlueprint.advisors.find((a) => a.id === id)?.name || id,
    });
    expect(report).toContain("商业模式战略报告");
    expect(report).toContain("四官模式方案对照");
    expect(report).toContain("战略官");
    expect(report).toContain("模式作战卡");
  });
});
