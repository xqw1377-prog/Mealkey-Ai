/**
 * 决策级资产门槛 — 反玩具感
 */
import { describe, expect, it } from "vitest";
import {
  buildDecisionArtifact,
  buildDecisionGradeMarkdown,
  enrichResearchForDecision,
  enforceAdvisorTradeoffs,
  injectMondayMovesIntoRoadmap,
} from "../../../packages/agents/src/consulting-os/substance";
import { createId, nowIso } from "../../../packages/agents/src/consulting-os/types";
import { mmktBlueprint } from "../../../packages/agents/src/m-mkt/consulting";

describe("consulting substance bar", () => {
  it("research must answer governing question + so-what", () => {
    const raw = mmktBlueprint.buildResearch(
      {
        city: "长沙核心区",
        category: "家常正餐",
        intent: "判断值不值得进入",
        constraint: "预算有限",
      },
      { city: "长沙", name: "测试店" },
    );
    const pack = enrichResearchForDecision(raw, {
      city: "长沙核心区",
      category: "家常正餐",
      constraint: "预算有限",
    }, "m-mkt");
    expect(pack.sections.some((s) => s.title === "本轮唯一问题")).toBe(true);
    expect(pack.sections.some((s) => s.title === "所以呢（决策含义）")).toBe(true);
    expect(
      pack.sections.find((s) => s.title === "本轮唯一问题")!.body,
    ).toContain("长沙");
  });

  it("advisors must be mutually exclusive", () => {
    const research = enrichResearchForDecision(
      mmktBlueprint.buildResearch(
        {
          city: "长沙",
          category: "湘菜",
          intent: "怎么切",
          constraint: "人手紧",
        },
        {},
      ),
      { city: "长沙", category: "湘菜" },
      "m-mkt",
    );
    const set = enforceAdvisorTradeoffs(
      mmktBlueprint.buildAdvisors(
        { city: "长沙", constraint: "人手紧" },
        research,
      ),
      mmktBlueprint.advisors,
    );
    expect(set.conflictSummary).toContain("不能同时为真");
    for (const s of set.strategies) {
      expect(s.doNotDo.length).toBeGreaterThan(20);
      expect(s.doNotDo).toMatch(/反对|不做/);
    }
    // 每策 doNotDo 应指向另一策主轴
    const joined = set.strategies.map((s) => s.doNotDo).join("|");
    expect(joined).toContain("反对");
  });

  it("decision pack has kill criteria + monday moves + tradeoff", () => {
    const answers = {
      city: "长沙",
      category: "湘菜",
      intent: "能不能进",
      constraint: "预算紧",
    };
    const research = enrichResearchForDecision(
      mmktBlueprint.buildResearch(answers, { city: "长沙" }),
      answers,
      "m-mkt",
    );
    const advisors = enforceAdvisorTradeoffs(
      mmktBlueprint.buildAdvisors(answers, research),
      mmktBlueprint.advisors,
    );
    const warRoom = {
      roomId: createId("war"),
      status: "agreed" as const,
      turns: [],
      userPreference: "strategy",
      consensusOneLiner: advisors.strategies[0]!.oneLiner,
      consensusBullets: ["场景切口", "证明复购"],
      agreedAt: nowIso(),
    };
    const decision = buildDecisionArtifact({
      agentId: "m-mkt",
      answers,
      research,
      advisors,
      warRoom,
      projectName: "测试店",
    });
    expect(decision.governingQuestion).toContain("进入");
    expect(decision.killCriteria.length).toBeGreaterThanOrEqual(2);
    expect(decision.mondayMoves.length).toBeGreaterThanOrEqual(3);
    expect(decision.tradeoffAccepted).toContain("接受");
    expect(decision.evidenceUsed.length).toBeGreaterThan(0);

    const md = buildDecisionGradeMarkdown({
      reportTitle: "市场机会战略报告",
      committeeName: "市场战略委员会",
      projectName: "测试店",
      city: "长沙",
      decision,
      research,
      advisors,
      advisorName: (id) => id,
    });
    expect(md).toContain("否决条件");
    expect(md).toContain("本周动作");
    expect(md).toContain("取舍");
    expect(md).not.toMatch(/待补充|暂不可用|Lorem/);

    const roadmap = injectMondayMovesIntoRoadmap(
      mmktBlueprint.buildRoadmap(decision.recommendation, answers),
      decision,
    );
    expect(roadmap.milestones[0]!.actions[0]).toBe(decision.mondayMoves[0]);
  });
});
