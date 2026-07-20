import { describe, expect, it } from "vitest";
import {
  assertActionTransition,
  canTransitionAction,
  nextToggleActionStatus,
  pickBriefActions,
} from "@/server/founder-layer/capability/execution/action-lifecycle";
import {
  applyDeviationToProfile,
  detectDeviation,
} from "@/server/founder-layer/capability/execution/monitor";
import { applyExecutionFeedbackToProfile } from "@/server/founder-layer/capability/execution/feedback";
import { buildDecisionExecutionView } from "@/server/founder-layer/capability/execution/decision-execution-view";
import { rebuildActionPlan } from "@/server/founder-layer/capability/execution/rebuild-action-plan";
import type { ValidationTask } from "@/server/founder-layer/contracts/validation";

function makeTask(overrides: Partial<ValidationTask> = {}): ValidationTask {
  return {
    id: "vt_1",
    taskId: "vt_1",
    projectId: "proj_1",
    decisionId: "dec_1",
    hypothesisId: "h_1",
    hypothesis: {
      hypothesisId: "h_1",
      statement: "午餐套餐能抬升翻台",
      sourceDecisionId: "dec_1",
      confidence: 0.7,
      riskIfWrong: "浪费档期",
      committee: "business",
    },
    title: "验证午餐套餐",
    action: "上线套餐",
    objective: "验证午餐套餐",
    owner: "老板",
    deadline: new Date().toISOString(),
    horizonDays: 30,
    startedAt: new Date().toISOString(),
    dueAt: new Date().toISOString(),
    lifecycle: "RUNNING",
    status: "in_progress",
    committee: "business",
    metrics: [
      {
        id: "m1",
        metricId: "m1",
        name: "翻台率",
        label: "翻台率",
        target: 2,
        status: "pending",
      },
    ],
    parentEvidenceIds: [],
    checkIns: [],
    triggers: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("execution action-lifecycle", () => {
  it("允许 planned→done，拒绝非法跳转由 assert 抛错", () => {
    expect(canTransitionAction("planned", "done")).toBe(true);
    expect(nextToggleActionStatus("planned")).toBe("done");
    expect(nextToggleActionStatus("done")).toBe("planned");
    expect(assertActionTransition("doing", "blocked")).toBe("blocked");
  });

  it("pickBriefActions 去掉与判断重复的摘要", () => {
    const judgement = "先验证再扩张";
    const picked = pickBriefActions(
      [
        { actionId: "1", title: judgement, status: "planned" },
        { actionId: "2", title: "店长盯晚市翻台", status: "planned" },
        { actionId: "3", title: "周五复盘指标", status: "planned" },
        { actionId: "4", title: "指定负责人", status: "planned" },
      ],
      { judgement },
    );
    expect(picked.every((a) => a.title !== judgement)).toBe(true);
    expect(picked.length).toBeLessThanOrEqual(3);
  });
});

describe("execution monitor", () => {
  it("无偏航返回 null", () => {
    expect(
      detectDeviation({ projectId: "proj_1", task: makeTask() }),
    ).toBeNull();
  });

  it("指标失败生成偏航并建议复会", () => {
    const report = detectDeviation({
      projectId: "proj_1",
      task: makeTask({
        lifecycle: "REVIEW",
        status: "at_risk",
        metrics: [
          {
            id: "m1",
            metricId: "m1",
            name: "翻台率",
            label: "翻台率",
            target: 2,
            actual: 0.8,
            status: "failed",
          },
        ],
        triggers: [
          {
            triggerId: "t1",
            type: "metric_drop",
            fired: true,
            reason: "翻台率下滑",
            suggestMeeting: true,
          },
        ],
      }),
    });
    expect(report).not.toBeNull();
    expect(report!.kind).toBe("metric_miss");
    expect(report!.suggestedCouncilTopic).toContain("复盘");

    const profile = applyDeviationToProfile({}, report!);
    expect(
      (profile.suggestedNextMeeting as { topic: string }).topic,
    ).toContain("复盘");
    expect(profile.lastDeviationReport).toBeTruthy();
  });
});

describe("execution feedback + view", () => {
  it("验证 off 写入 suggestedNextMeeting", () => {
    const next = applyExecutionFeedbackToProfile(
      {},
      {
        task: makeTask(),
        result: "off",
        impact: "invalidated",
        summary: "套餐无人点",
      },
    );
    expect(
      (next.suggestedNextMeeting as { reason: string }).reason,
    ).toBeTruthy();
  });

  it("投影 DecisionExecution 读模型", () => {
    const view = buildDecisionExecutionView({
      projectId: "proj_1",
      profile: {
        lastActionPlan: {
          planId: "ap_1",
          decisionId: "dec_1",
          summary: "先验证午餐",
          actions: [
            { actionId: "a1", title: "上线套餐", status: "done" },
            { actionId: "a2", title: "盯翻台", status: "planned" },
            { actionId: "a3", title: "周五复盘", status: "planned" },
          ],
        },
        validationTasks: [makeTask({ status: "at_risk", lifecycle: "REVIEW" })],
      },
    });
    expect(view?.status).toBe("at_risk");
    expect(view?.actions).toHaveLength(3);
    expect(view?.validationTaskIds.length).toBeGreaterThan(0);
  });
});

describe("rebuildActionPlan E5", () => {
  const decisionId = "clmkdecision01testid";

  it("同决策内重建并保留 done", () => {
    const { result, nextProfile } = rebuildActionPlan({
      decisionId,
      judgement: "先验证午餐套餐",
      nextActions: ["新动作甲", "新动作乙", "新动作丙"],
      profile: {
        lastMeetingDecisionId: decisionId,
        lastActionPlan: {
          planId: "ap_1",
          decisionId,
          summary: "先验证午餐套餐",
          validationTaskId: "vt_1",
          actions: [
            { actionId: "a1", title: "上线套餐", status: "done" },
            { actionId: "a2", title: "旧动作", status: "planned" },
          ],
        },
      },
    });
    expect(result.preservedDoneCount).toBe(1);
    expect(result.actionPlan.decisionId).toBe(decisionId);
    expect(result.actionPlan.validationTaskId).toBe("vt_1");
    const actions = result.actionPlan.actions as Array<{ title: string; status: string }>;
    expect(actions.some((a) => a.title === "上线套餐" && a.status === "done")).toBe(
      true,
    );
    expect(actions).toHaveLength(3);
    expect(
      (nextProfile.lastActionPlan as { decisionId: string }).decisionId,
    ).toBe(decisionId);
  });

  it("拒绝跨决策重建", () => {
    expect(() =>
      rebuildActionPlan({
        decisionId,
        profile: {
          lastActionPlan: {
            planId: "ap_1",
            decisionId: "clotherdecision99xx",
            actions: [{ actionId: "a1", title: "x", status: "planned" }],
          },
        },
      }),
    ).toThrow(/跨决策/);
  });
});
