/**
 * 动作生命周期 — planned → doing → done / blocked
 * 兼容今日页 planned ↔ done 快捷切换。
 */

import type { ActionLifecycleStatus } from "../../contracts/execution-runtime";

const ALLOWED: Record<ActionLifecycleStatus, ActionLifecycleStatus[]> = {
  planned: ["doing", "done", "blocked"],
  doing: ["done", "blocked", "planned"],
  blocked: ["doing", "done", "planned"],
  done: ["planned", "doing"],
};

export function normalizeActionStatus(raw: string | undefined): ActionLifecycleStatus {
  const s = (raw || "planned").toLowerCase();
  if (s === "done" || s === "completed") return "done";
  if (s === "doing" || s === "running" || s === "in_progress") return "doing";
  if (s === "blocked" || s === "skipped") return "blocked";
  return "planned";
}

export function canTransitionAction(
  from: string | undefined,
  to: string | undefined,
): boolean {
  const a = normalizeActionStatus(from);
  const b = normalizeActionStatus(to);
  if (a === b) return true;
  return ALLOWED[a].includes(b);
}

/** 今日勾选：planned/doing ↔ done；blocked → doing */
export function nextToggleActionStatus(
  current: string | undefined,
): ActionLifecycleStatus {
  const s = normalizeActionStatus(current);
  if (s === "done") return "planned";
  if (s === "blocked") return "doing";
  return "done";
}

export function assertActionTransition(
  from: string | undefined,
  to: string | undefined,
): ActionLifecycleStatus {
  const next = normalizeActionStatus(to);
  if (!canTransitionAction(from, next)) {
    throw new Error(
      `动作状态不可从 ${normalizeActionStatus(from)} 变为 ${next}`,
    );
  }
  return next;
}

/** 把 ActionPlan.actions 收成恰好 3 条可执行标题（Brief 用） */
export function pickBriefActions<
  T extends {
    actionId: string;
    title: string;
    owner?: string;
    status: string;
    dueInDays?: number;
  },
>(
  actions: T[],
  options?: { judgement?: string },
): T[] {
  const judgement = (options?.judgement || "").replace(/\s+/g, " ").trim();
  const filtered = actions.filter((a) => {
    const t = (a.title || "").trim();
    if (!t) return false;
    if (judgement && t === judgement) return false;
    if (
      judgement &&
      t.length > 40 &&
      (judgement.includes(t) || t.includes(judgement))
    ) {
      return false;
    }
    return true;
  });
  const uniq: T[] = [];
  for (const a of filtered) {
    if (uniq.some((u) => u.title === a.title)) continue;
    uniq.push(a);
    if (uniq.length >= 3) break;
  }
  return uniq.slice(0, 3);
}
