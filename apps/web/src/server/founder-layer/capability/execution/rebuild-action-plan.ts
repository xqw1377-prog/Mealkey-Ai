/**
 * E5: 同决策边界内重建今日动作 — 不改战略、不换 decisionId、不重开验证假设正文
 */

import { buildTodayActionsFromMeetingConfirm } from "@/lib/meeting-today-actions";
import { assertPrismaDecisionId } from "../decision/registry";

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export type RebuildActionPlanResult = {
  decisionId: string;
  actionPlan: Record<string, unknown>;
  preservedDoneCount: number;
};

/**
 * 仅刷新 ActionPlan.actions（及 summary）；保留已 done 的动作标题。
 * 禁止：改 MKDecision 结论、换 decisionId、重写 hypothesis。
 */
export function rebuildActionPlan(input: {
  profile: Record<string, unknown>;
  decisionId: string;
  /** 新动作标题（可选）；不传则从原 plan / 决策摘要再生 */
  nextActions?: string[];
  judgement?: string;
  action?: string;
  validationPlan?: string;
}): {
  result: RebuildActionPlanResult;
  nextProfile: Record<string, unknown>;
} {
  const decisionId = assertPrismaDecisionId(input.decisionId);
  const plan = (input.profile.lastActionPlan || {}) as Record<string, unknown>;
  const boundId = String(
    plan.decisionId || input.profile.lastMeetingDecisionId || "",
  ).trim();

  if (boundId && boundId !== decisionId) {
    throw new Error(
      `禁止跨决策重建行动：当前绑定 ${boundId}，请求 ${decisionId}`,
    );
  }
  if (!boundId && !plan.planId) {
    throw new Error("尚无执行计划，请先 createFromDecision");
  }

  const prevActions = Array.isArray(plan.actions)
    ? (plan.actions as Array<Record<string, unknown>>)
    : [];
  const doneTitles = prevActions
    .filter((a) => String(a.status || "") === "done")
    .map((a) => String(a.title || "").trim())
    .filter(Boolean);

  const judgement = clip(
    input.judgement || String(plan.summary || ""),
    120,
  );
  const rebuilt = buildTodayActionsFromMeetingConfirm({
    nextActions: input.nextActions,
    action: input.action,
    validationPlan: input.validationPlan,
    judgement,
  });

  // 已完成动作保留在前，其余用新建 planned（去重）
  const actions: Array<Record<string, unknown>> = [];
  for (const title of doneTitles.slice(0, 3)) {
    const prev = prevActions.find((a) => String(a.title) === title);
    actions.push({
      actionId: String(prev?.actionId || `act_done_${actions.length + 1}`),
      title,
      owner: prev?.owner ? String(prev.owner) : "老板",
      status: "done",
      dueInDays:
        typeof prev?.dueInDays === "number" ? prev.dueInDays : 0,
    });
  }
  for (const a of rebuilt) {
    if (actions.some((x) => String(x.title) === a.title)) continue;
    if (actions.length >= 3) break;
    actions.push({
      actionId: a.actionId,
      title: a.title,
      owner: a.owner || "老板",
      status: "planned",
      dueInDays: a.dueInDays,
    });
  }

  const nextPlan = {
    ...plan,
    planId: String(plan.planId || `ap_rebuild_${decisionId}`),
    decisionId,
    summary: clip(judgement || String(plan.summary || "本周执行计划"), 140),
    actions,
    validationTaskId: plan.validationTaskId,
    rebuiltAt: new Date().toISOString(),
  };

  return {
    result: {
      decisionId,
      actionPlan: nextPlan,
      preservedDoneCount: doneTitles.length,
    },
    nextProfile: {
      ...input.profile,
      lastActionPlan: nextPlan,
      lastMeetingDecisionId: decisionId,
    },
  };
}
