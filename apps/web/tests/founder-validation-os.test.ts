import { describe, expect, it } from "vitest";
import {
  applyValidationCheckIn,
  assessCheckInRisk,
  createValidationPlanFromDecision,
  createValidationTaskFromDecision,
  completeValidationTask,
  evaluateRedeisionTriggers,
  listActiveValidationTasks,
  normalizeValidationTask,
} from "@/server/founder-layer/validation";

describe("Validation OS V1", () => {
  it("Decision 自动生成 Hypothesis + Metrics + Task", () => {
    const plan = createValidationPlanFromDecision({
      projectId: "proj-1",
      decisionId: "clmkdecision01testid",
      problem: "是否进入高端宴请市场",
      judgement: "先验证商务客户支付意愿",
      hypothesisStatement: "长沙商务客户愿意接受800元/人的湘菜宴请",
      validationPlan: "90天高端宴请验证",
      action: "设计800元套餐并邀请目标客户体验",
      parentEvidenceIds: ["E001", "E002"],
      confidence: 0.72,
    });

    expect(plan.hypothesis.statement).toContain("800");
    expect(plan.hypothesis.committee).toBe("brand");
    expect(plan.task.lifecycle).toBe("RUNNING");
    expect(plan.task.hypothesisId).toBe(plan.hypothesis.hypothesisId);
    expect(plan.metrics.length).toBeGreaterThanOrEqual(3);
    expect(plan.metrics.every((m) => m.status === "pending")).toBe(true);
    expect(plan.task.triggers).toHaveLength(3);
  });

  it("兼容旧 API createValidationTaskFromDecision", () => {
    const task = createValidationTaskFromDecision({
      projectId: "proj-1",
      decisionId: "clmkdecision01testid",
      problem: "是否扩张到 100 家店",
      judgement: "先验证直营复制再扩张",
      validationPlan: "90天验证5店复制模型",
      parentEvidenceIds: ["E-1", "E-2"],
      growthPlan: {
        day30: "完成标准店SOP",
        day60: "第二店开业",
        day90: "人效达标",
      },
    });

    expect(task.id.startsWith("V")).toBe(true);
    expect(task.status).toBe("in_progress");
    expect(task.horizonDays).toBe(90);
    expect(task.hypothesis.statement.length).toBeGreaterThan(5);
    expect(task.metrics.length).toBeGreaterThanOrEqual(3);
    expect(task.parentEvidenceIds).toEqual(["E-1", "E-2"]);
  });

  it("人工录入指标可抬升风险并触发重决策", () => {
    const task = createValidationTaskFromDecision({
      projectId: "proj-1",
      decisionId: "clmkdecision01testid",
      problem: "扩张验证",
      judgement: "先验证复制",
      validationPlan: "90天开店复制验证",
    });
    const aged = {
      ...task,
      startedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const assessment = assessCheckInRisk({
      task: aged,
      reportedProgressRatio: 0.1,
      note: "培训体系延期",
    });
    expect(assessment.deviationDays).toBeGreaterThan(10);
    expect(assessment.riskLevel).toBe("high");

    const margin = aged.metrics.find((m) => m.name.includes("利润") || m.name.includes("坪效")) ||
      aged.metrics[1]!;
    const updated = applyValidationCheckIn({
      task: aged,
      note: "培训体系延期，实际 45 天仍未完成",
      reportedProgressRatio: 0.1,
      metrics: [{ metricId: margin.id, actual: String(Math.max(1, margin.target * 0.5)) }],
    });
    expect(updated.lifecycle === "REVIEW" || updated.status === "at_risk").toBe(true);
    expect(updated.checkIns).toHaveLength(1);
    expect(updated.aiJudgement).toBeTruthy();
    expect(typeof updated.passProbability).toBe("number");

    const fired = evaluateRedeisionTriggers(updated).some((t) => t.fired);
    expect(fired || updated.triggers.some((t) => t.fired)).toBe(true);
  });

  it("完成验证产出 Outcome Evidence + 复盘，并退出活跃列表", () => {
    const task = createValidationTaskFromDecision({
      projectId: "proj-1",
      decisionId: "clmkdecision01testid",
      problem: "市场进入",
      judgement: "可进入",
      validationPlan: "3个月套餐验证",
      hypothesisStatement: "目标客户成交率可达15%",
    });
    const done = completeValidationTask({
      task,
      resultSummary: "800元套餐验证成功，成交率22%",
      resultEvidenceId: `E-VAL-${task.id}`,
      impact: "confirmed",
    });
    expect(done.lifecycle).toBe("PASSED");
    expect(done.status).toBe("completed");
    expect(done.outcome?.impact).toBe("confirmed");
    expect(done.outcome?.evidenceId).toBe(`E-VAL-${task.id}`);
    expect(done.outcome?.retrospective?.newLearning).toBeTruthy();
    expect(listActiveValidationTasks([done])).toHaveLength(0);
  });

  it("normalize 补齐旧任务字段", () => {
    const legacy = normalizeValidationTask({
      id: "VOLD",
      projectId: "p1",
      decisionId: "d1",
      title: "旧任务",
      objective: "验证复制",
      owner: "老板",
      horizonDays: 90,
      startedAt: new Date().toISOString(),
      dueAt: new Date().toISOString(),
      status: "in_progress",
      metrics: [{ id: "m1", label: "成交率", target: "20%" }],
      parentEvidenceIds: [],
      checkIns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);

    expect(legacy.hypothesis.statement).toContain("验证");
    expect(legacy.metrics[0]?.metricId).toBe("m1");
    expect(legacy.triggers.length).toBeGreaterThan(0);
    expect(legacy.lifecycle).toBeTruthy();
  });
});
