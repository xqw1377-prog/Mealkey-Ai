import { describe, expect, it } from "vitest";
import {
  buildMonthlyReviewAxes,
  buildTodayDecision,
  buildWeeklyAgenda,
  classifyOperatingScenario,
  listScenarios,
  openScenarioSession,
  planScenarioRun,
} from "../../../packages/agents/src/founder-os";

describe("经营场景矩阵 V1", () => {
  it("六大场景齐全", () => {
    expect(listScenarios()).toHaveLength(6);
  });

  it("创业立项：四大引擎 + 常委会", () => {
    const hit = classifyOperatingScenario({
      question: "我想做一个湖南小吃品牌，投资300万，目标3年100店",
    });
    expect(hit.scenarioId).toBe("startup_launch");
    const plan = planScenarioRun(hit.scenarioId);
    expect(plan.engines).toEqual(["M-MKT", "M-PNT", "M-BIZ", "M-ED"]);
    expect(plan.conveneCouncil).toBe(true);
    expect(plan.level).toBe("L3");
  });

  it("扩张：Expansion Council", () => {
    const hit = classifyOperatingScenario({
      question: "第一家店成功了，要不要复制开第二家？",
    });
    expect(hit.scenarioId).toBe("expansion");
    const plan = planScenarioRun("expansion");
    expect(plan.councilName).toBe("Expansion Council");
    expect(plan.scenario.resolution_hint).toContain("开5家");
  });

  it("新品：Product Investment Committee 小常委会", () => {
    const plan = planScenarioRun("new_product");
    expect(plan.conveneCouncil).toBe(true);
    expect(plan.roster).toEqual(["CMO", "CBO", "BMO", "COO"]);
    expect(plan.level).toBe("L1");
  });

  it("品牌升级默认不强制全委会，可 escalate", () => {
    const base = planScenarioRun("brand_upgrade");
    expect(base.conveneCouncil).toBe(false);
    const escalated = planScenarioRun("brand_upgrade", {
      escalateCouncil: true,
    });
    expect(escalated.conveneCouncil).toBe(true);
  });

  it("融资：L4 + Founder", () => {
    const hit = classifyOperatingScenario({
      question: "投资人给500万，占20%，可以吗？",
    });
    expect(hit.scenarioId).toBe("fundraising_equity");
    const plan = planScenarioRun(hit.scenarioId);
    expect(plan.level).toBe("L4");
    expect(plan.founderRequired).toBe(true);
    expect(plan.engines[0]).toBe("M-ED");
  });

  it("经营异常 → Today Decision + openSession", () => {
    const today = buildTodayDecision({
      store: "2号店",
      metric: "毛利",
      changePct: -8,
    });
    expect(today.suggestedScenario).toBe("ops_anomaly");
    expect(today.cta).toContain("经营诊断");

    const session = openScenarioSession({
      question: "营业额下降15%，复购也在掉",
      signals: ["营业额下降", "复购下降"],
    });
    expect(session.scenarioId).toBe("ops_anomaly");
    expect(session.plan.engines).toContain("M-BIZ");
    expect(session.meeting?.roster.length).toBeGreaterThan(0);
    expect(session.intakeTemplate.signal).toBeTruthy();
    expect(session.nextSteps.some((s) => s.includes("Expert"))).toBe(true);
  });

  it("周会/月复盘形态", () => {
    const week = buildWeeklyAgenda([
      "新品是否继续",
      "上海店是否投资",
      "人员结构是否调整",
    ]);
    expect(week.items).toHaveLength(3);
    expect(buildMonthlyReviewAxes()).toContain("品牌");
  });
});
