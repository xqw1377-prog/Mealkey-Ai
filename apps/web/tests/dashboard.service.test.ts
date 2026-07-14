import { describe, expect, it } from "vitest";
import {
  buildAdvisorWorkspace,
  buildDashboardHome,
  buildOwnerPortrait,
  buildProjectKnowledge,
  buildProjectOverview,
  buildReportSnapshot,
  buildScorecard,
} from "@/server/services/dashboard.service";
import { makeBundle } from "./fixtures/project-bundle";

describe("dashboard.service builders", () => {
  it("buildDashboardHome 在有决策时进入 active 模式", () => {
    const home = buildDashboardHome(makeBundle());
    expect(home.homeMode).toBe("active");
    expect(home.ownerName).toBe("张三");
    expect(home.projectHealth).toBeGreaterThan(0);
    expect(home.abilityMap).toHaveLength(5);
    expect(home.decisionTimeline.length).toBeGreaterThan(0);
    expect(home.secondaryCta.href).toContain("/advisor");
  });

  it("buildDashboardHome 无决策时进入 forming 模式", () => {
    const home = buildDashboardHome(makeBundle({ decisions: [], latestReport: null }));
    expect(home.homeMode).toBe("forming");
    expect(home.todayStatus).toContain("形成");
  });

  it("buildProjectOverview 输出阶段/风险/资产结构", () => {
    const overview = buildProjectOverview(makeBundle());
    expect(overview.score).toBeGreaterThan(0);
    expect(overview.stageTrack.length).toBeGreaterThan(0);
    expect(overview.riskMap.length).toBeGreaterThan(0);
    expect(overview.worldAssets.decisions).toBe(1);
    expect(overview.nextPush.meetingHref).toContain("/advisor");
    expect(overview.nextPush.actions.length).toBeGreaterThan(0);
  });

  it("buildScorecard 指标含 stars/width", () => {
    const scorecard = buildScorecard(makeBundle());
    expect(scorecard.score).toBeGreaterThan(0);
    expect(scorecard.metrics[0]?.stars).toMatch(/\d\/5/);
    expect(scorecard.metrics[0]?.width).toMatch(/%$/);
  });

  it("buildReportSnapshot 从决策/报告生成档案", () => {
    const report = buildReportSnapshot(makeBundle());
    expect(report.latestReport).not.toBeNull();
    expect(report.conclusion).toBeTruthy();
    expect(report.metrics[0]?.stars).toBeTruthy();
  });

  it("buildAdvisorWorkspace 提供会议上下文", () => {
    const workspace = buildAdvisorWorkspace(makeBundle());
    expect(workspace.currentProblem).toContain("差异化");
    expect(workspace.actionPrompts[0]).toMatchObject({
      label: expect.any(String),
      prompt: expect.any(String),
    });
    expect(workspace.stageFlow[0]).toMatchObject({
      key: expect.any(String),
      title: expect.any(String),
    });
    expect(Array.isArray(workspace.evidenceItems)).toBe(true);
  });

  it("buildProjectKnowledge 关联知识节点", () => {
    const insight = buildProjectKnowledge(makeBundle(), [
      {
        id: "k1",
        title: "选址原则",
        content: "先人流后人设",
        type: "rule",
        tags: ["选址"],
      },
    ]);
    expect(insight.title).toBe("选址原则");
    expect(insight.related[0]?.source).toBe("rule");
  });

  it("buildOwnerPortrait 输出成长教练与能力洞察", () => {
    const portrait = buildOwnerPortrait(
      makeBundle(),
      { name: "张三", preferences: { role: "餐饮创业者" } },
      { projectCount: 1, decisionCount: 3, memoryCount: 2 },
    );
    expect(portrait.roleLabel).toBe("餐饮创业者");
    expect(portrait.abilityMap[0]?.strength).toBeTruthy();
    expect(portrait.growthCoach.actionHref).toContain("/advisor");
    expect(portrait.decisionEvolution.past).toBeTruthy();
    expect(portrait.brainState).toBeTruthy();
  });

  it("能力图优先使用 owner.capabilities", () => {
    const home = buildDashboardHome(makeBundle());
    const product = home.abilityMap.find((a) => a.label === "产品能力");
    const growth = home.abilityMap.find((a) => a.label === "增长能力");
    expect(product?.value).toBe(78);
    expect(growth?.value).toBe(48);
    expect(home.weakestAbility).toBe("增长能力");
    expect(home.strongestAbility).toBe("产品能力");
  });
});
