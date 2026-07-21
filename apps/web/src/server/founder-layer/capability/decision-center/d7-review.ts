/**
 * D+7 复盘仪式 — 决策签字后第 7 天到期提醒
 * 权威：docs/MEALKEY_MVP_90DAY_ROADMAP_V1.md Phase B
 */

export type D7ReviewItemV1 = {
  id: string;
  decisionId: string;
  title: string;
  dueAt: string;
  daysOverdue: number;
  href: string;
  /** 复盘三问 */
  questions: [string, string, string];
};

export const D7_REVIEW_QUESTIONS: [string, string, string] = [
  "当时判断对不对？",
  "执行做了没有？",
  "生意有没有按预期变化？",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function parseIso(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** 从 profile.validationTasks / lastActionPlan / Prisma Decision 投影到期复盘 */
export function collectD7ReviewItems(input: {
  projectId: string;
  profile?: Record<string, unknown> | null;
  /** Prisma Decision 行（outcome 含 d7ReviewDueAt / confirmedAt） */
  decisions?: Array<{
    id: string;
    problem?: string | null;
    judgement?: string | null;
    outcome?: string | null;
  }> | null;
  now?: Date;
}): D7ReviewItemV1[] {
  const now = (input.now || new Date()).getTime();
  const profile = input.profile || {};
  const tasks = Array.isArray(profile.validationTasks)
    ? (profile.validationTasks as Array<Record<string, unknown>>)
    : [];

  const items: D7ReviewItemV1[] = [];
  const seen = new Set<string>();

  for (const task of tasks) {
    const decisionId = String(task.decisionId || "");
    if (!decisionId || seen.has(decisionId)) continue;

    const reviewDone =
      task.d7ReviewStatus === "done" ||
      task.lifecycle === "CLOSED" ||
      task.status === "passed" ||
      task.status === "failed";
    if (reviewDone) continue;

    const started =
      parseIso(task.d7ReviewDueAt) ||
      (() => {
        const start = parseIso(task.startedAt) || parseIso(task.createdAt);
        return start != null ? start + 7 * DAY_MS : null;
      })();
    if (started == null || started > now) continue;

    const daysOverdue = Math.max(0, Math.floor((now - started) / DAY_MS));
    const title = clip(
      String(
        (task.hypothesis as { statement?: string } | undefined)?.statement ||
          task.title ||
          task.objective ||
          "经营决策复盘",
      ),
      48,
    );
    const topic = `复盘：${title}`;
    seen.add(decisionId);
    items.push({
      id: `d7_${decisionId}`,
      decisionId,
      title: `第7天复盘到了 · ${title}`,
      dueAt: new Date(started).toISOString(),
      daysOverdue,
      href: `/projects/${input.projectId}/decision-room?intake=ready&topic=${encodeURIComponent(topic)}&why=${encodeURIComponent("决策满7天，该对照结果复盘了")}`,
      questions: D7_REVIEW_QUESTIONS,
    });
  }

  // Prisma Decision：profile 未同步时仍能到期提醒
  for (const row of input.decisions || []) {
    if (!row.id || seen.has(row.id)) continue;
    let outcome: Record<string, unknown> = {};
    try {
      outcome = row.outcome ? (JSON.parse(row.outcome) as Record<string, unknown>) : {};
    } catch {
      outcome = {};
    }
    if (outcome.d7ReviewStatus === "done" || outcome.councilDraft) continue;
    const due =
      parseIso(outcome.d7ReviewDueAt) ||
      (() => {
        const start =
          parseIso(outcome.executionStartedAt) ||
          parseIso(outcome.confirmedAt);
        return start != null ? start + 7 * DAY_MS : null;
      })();
    if (due == null || due > now) continue;
    const title = clip(
      String(row.judgement || row.problem || "经营决策复盘"),
      48,
    );
    seen.add(row.id);
    items.push({
      id: `d7_${row.id}`,
      decisionId: row.id,
      title: `第7天复盘到了 · ${title}`,
      dueAt: new Date(due).toISOString(),
      daysOverdue: Math.max(0, Math.floor((now - due) / DAY_MS)),
      href: `/projects/${input.projectId}/decision-room?intake=ready&topic=${encodeURIComponent(`复盘：${title}`)}&why=${encodeURIComponent("决策满7天，该对照结果复盘了")}`,
      questions: D7_REVIEW_QUESTIONS,
    });
  }

  // lastActionPlan 兜底（无 validationTasks 时）
  if (!items.length && profile.lastActionPlan && typeof profile.lastActionPlan === "object") {
    const plan = profile.lastActionPlan as Record<string, unknown>;
    const decisionId = String(plan.decisionId || profile.lastMeetingDecisionId || "");
    const due =
      parseIso(plan.d7ReviewDueAt) ||
      (() => {
        const start = parseIso(plan.createdAt) || parseIso(profile.lastMeetingAt);
        return start != null ? start + 7 * DAY_MS : null;
      })();
    if (
      decisionId &&
      due != null &&
      due <= now &&
      plan.d7ReviewStatus !== "done"
    ) {
      const title = clip(String(plan.summary || "上周决策"), 40);
      items.push({
        id: `d7_${decisionId}`,
        decisionId,
        title: `第7天复盘到了 · ${title}`,
        dueAt: new Date(due).toISOString(),
        daysOverdue: Math.max(0, Math.floor((now - due) / DAY_MS)),
        href: `/projects/${input.projectId}/decision-room?intake=ready&topic=${encodeURIComponent(`复盘：${title}`)}&why=${encodeURIComponent("决策满7天，该对照结果复盘了")}`,
        questions: D7_REVIEW_QUESTIONS,
      });
    }
  }

  return items.slice(0, 3);
}

/** 签字/开执行时写入 D+7 到期点 */
export function computeD7ReviewDueAt(from: Date = new Date()): string {
  return new Date(from.getTime() + 7 * DAY_MS).toISOString();
}
