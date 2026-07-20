/**
 * DecisionExecution 读模型 — 从 profile 投影
 */

import type {
  DecisionExecutionView,
  DeviationReport,
} from "../../contracts/execution-runtime";
import type { ValidationTask } from "../../contracts/validation";
import { normalizeValidationTask } from "../../validation";

function asTasks(raw: unknown): ValidationTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object" && "id" in item)
    .map((item) => normalizeValidationTask(item as ValidationTask));
}

export function buildDecisionExecutionView(input: {
  projectId: string;
  profile: Record<string, unknown>;
  decisionId?: string;
}): DecisionExecutionView | null {
  const plan = input.profile.lastActionPlan as Record<string, unknown> | undefined;
  if (!plan || !Array.isArray(plan.actions)) return null;

  const decisionId = String(
    input.decisionId ||
      plan.decisionId ||
      input.profile.lastMeetingDecisionId ||
      "",
  );
  if (input.decisionId && decisionId && input.decisionId !== decisionId) {
    // 指定了别的决策且 plan 不匹配时，仍返回 plan（今日主执行）
  }

  const actions = (plan.actions as Array<Record<string, unknown>>)
    .slice(0, 8)
    .map((a, i) => ({
      actionId: String(a.actionId || `act_${i + 1}`),
      title: String(a.title || ""),
      owner: a.owner ? String(a.owner) : undefined,
      status: String(a.status || "planned"),
      dueInDays: typeof a.dueInDays === "number" ? a.dueInDays : undefined,
    }))
    .filter((a) => a.title);

  const tasks = asTasks(input.profile.validationTasks).filter((t) => {
    if (!decisionId) return true;
    return t.decisionId === decisionId || !t.decisionId;
  });

  const doneCount = actions.filter((a) => a.status === "done").length;
  const hasRisk = tasks.some(
    (t) =>
      t.lifecycle === "REVIEW" ||
      t.lifecycle === "FAILED" ||
      t.status === "at_risk" ||
      t.triggers?.some((tr) => tr.fired),
  );
  const validated = tasks.some(
    (t) => t.lifecycle === "PASSED" || t.status === "completed",
  );

  let status: DecisionExecutionView["status"] = "planned";
  if (validated && doneCount >= actions.length && actions.length > 0) {
    status = "validated";
  } else if (hasRisk) {
    status = "at_risk";
  } else if (doneCount > 0 || actions.some((a) => a.status === "doing")) {
    status = "running";
  } else if (doneCount >= actions.length && actions.length > 0) {
    status = "done";
  }

  const lastDeviation = (input.profile.lastDeviationReport || null) as
    | DeviationReport
    | null;
  const snm = input.profile.suggestedNextMeeting as
    | { topic?: string; reason?: string }
    | undefined;

  return {
    id: String(plan.planId || `ap_${input.projectId}`),
    decisionId: decisionId || "unknown",
    projectId: input.projectId,
    objective: String(plan.summary || ""),
    status,
    actions,
    validationTaskIds: tasks.map((t) => t.id || t.taskId).filter(Boolean),
    lastDeviation:
      lastDeviation && lastDeviation.reportId ? lastDeviation : null,
    suggestedNextMeeting:
      snm?.topic && String(snm.topic).trim()
        ? {
            topic: String(snm.topic).trim(),
            reason: String(snm.reason || "建议复会校准"),
          }
        : null,
  };
}
