/**
 * M-ED 打透厚度门槛
 */
import { describe, expect, it } from "vitest";
import {
  confirmResearchPack,
  enforceAdvisorTradeoffs,
  enrichResearchForDecision,
} from "../../../packages/agents/src/consulting-os";
import {
  medBlueprint,
  thickenEquityScan,
  attachGovernanceSchemes,
  buildMedExecutionRoadmap,
  buildEquityStrategyReport,
} from "../../../packages/agents/src/m-ed/consulting";

describe("m-ed six-step substance", () => {
  const answers = {
    stage: "准备融资或已经在谈",
    topic: "融资会不会稀释失控",
    control: "必须保持控股与最终拍板",
    team: "2–3 位创始人主创",
  };

  it("厚扫描：评分 + 落签清单 + 完整 Markdown", () => {
    let research = medBlueprint.buildResearch(answers, { name: "测试公司" });
    research = thickenEquityScan(research, answers, {
      name: "测试公司",
      collectionMode: "heuristic",
    });
    research = enrichResearchForDecision(research, answers, "m-ed");

    expect(research.fullMarkdown).toContain("股权结构扫描报告");
    expect(research.sections.some((s) => s.title === "必须落签清单")).toBe(true);
    expect(research.sections.some((s) => s.title === "本轮唯一问题")).toBe(true);
  });

  it("四方治理方案包互斥且带交火", () => {
    const research = confirmResearchPack(
      medBlueprint.buildResearch(answers, { name: "测试公司" }),
    );
    let advisors = medBlueprint.buildAdvisors(answers, research);
    advisors = attachGovernanceSchemes(advisors, answers, research);
    advisors = enforceAdvisorTradeoffs(advisors, medBlueprint.advisors);

    expect(advisors.strategies).toHaveLength(4);
    for (const s of advisors.strategies) {
      expect(s.governScheme?.title).toBeTruthy();
      expect(s.governScheme?.mustSign.length).toBeGreaterThanOrEqual(2);
      expect(s.entryScheme?.title).toBeTruthy();
      expect(s.crossFireNote).toBeTruthy();
    }
    expect(advisors.gameSummary).toMatch(/交火/);
  });

  it("会议室含反驳/改策与四席决策卡", () => {
    const research = medBlueprint.buildResearch(answers, { name: "测试公司" });
    const advisors = medBlueprint.buildAdvisors(answers, research);
    const room = medBlueprint.buildWarRoom(advisors);

    expect(room.turns.some((t) => t.agendaPhase === "rebuttal")).toBe(true);
    expect(room.turns.some((t) => t.agendaPhase === "revise")).toBe(true);
    expect(room.decisionCard?.options.length).toBe(4);
  });

  it("股权战略报告 + 协议清单包非空", () => {
    const research = thickenEquityScan(
      medBlueprint.buildResearch(answers, { name: "测试公司" }),
      answers,
      { name: "测试公司" },
    );
    const advisors = medBlueprint.buildAdvisors(answers, research);
    let room = medBlueprint.buildWarRoom(advisors);
    room = medBlueprint.applyVote(room, advisors, "founder");

    const roadmap = buildMedExecutionRoadmap({
      oneLiner: room.consensusOneLiner!,
      answers,
      advisors,
      warRoom: room,
    });
    expect(roadmap.governancePack?.wallCard).toContain("协议清单包");
    expect(roadmap.governancePack?.killLine).toBeTruthy();

    const report = buildEquityStrategyReport({
      projectName: "测试公司",
      answers,
      research,
      advisors,
      warRoom: room,
      governancePack: roadmap.governancePack,
      advisorName: (id) =>
        medBlueprint.advisors.find((a) => a.id === id)?.name || id,
    });
    expect(report).toContain("股权战略设计报告");
    expect(report).toContain("控制权底线表");
    expect(report).toContain("创始人视角");
    expect(report).toContain("协议清单包");
  });
});
