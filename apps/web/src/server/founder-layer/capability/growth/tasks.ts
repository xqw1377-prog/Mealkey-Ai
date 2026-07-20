/**
 * Growth G4 — GrowthTask（可点开会建议，不强制上课）
 */

import type { CapabilityScore } from "../../contracts/capability";
import type {
  CognitiveGap,
  GrowthTask,
} from "../../contracts/growth-runtime";

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

export function buildGrowthTasksFromGap(input: {
  gap: CognitiveGap | null;
  scores: CapabilityScore[];
  learningNext?: string[];
}): GrowthTask[] {
  const tasks: GrowthTask[] = [];
  const now = new Date().toISOString();
  const weakest = [...input.scores].sort((a, b) => a.score - b.score)[0];

  if (input.gap) {
    const committee = input.gap.suggestCommittee;
    const expert =
      committee === "brand"
        ? "M-PNT"
        : committee === "market"
          ? "M-MKT"
          : committee === "business"
            ? "M-BIZ"
            : committee === "capital"
              ? "M-ED"
              : undefined;
    tasks.push({
      taskId: buildId("gt"),
      capability: weakest?.id || "decision",
      goal: `校准认知：${input.gap.likelyRootCause}`.slice(0, 120),
      status: "open",
      suggestedTopic: `成长议题：${input.gap.summary}`.slice(0, 120),
      suggestExpert: expert as GrowthTask["suggestExpert"],
      validation: "下次验证后复盘是否仍归因错误",
      createdAt: now,
    });
  }

  if (weakest && weakest.score < 60) {
    tasks.push({
      taskId: buildId("gt"),
      capability: weakest.id,
      goal: `提升「${weakest.label}」：用一次真实决策验证`.slice(0, 120),
      status: "open",
      suggestedTopic: `能力补强：${weakest.label}`.slice(0, 120),
      validation: "用一次小步验证证明能力分回升",
      createdAt: now,
    });
  }

  for (const line of (input.learningNext || []).slice(0, 2)) {
    tasks.push({
      taskId: buildId("gt"),
      capability: weakest?.id || "growth",
      goal: line.slice(0, 120),
      status: "open",
      suggestedTopic: line.slice(0, 120),
      createdAt: now,
    });
  }

  return tasks.slice(0, 5);
}

export function listGrowthTasks(
  profile: Record<string, unknown>,
): GrowthTask[] {
  const raw = profile.growthTasks;
  if (!Array.isArray(raw)) return [];
  return (raw as GrowthTask[]).filter((t) => t && t.status !== "done");
}

/** 合并新任务：同 goal/topic 去重，保留未完成旧任务 */
export function mergeGrowthTasks(
  profile: Record<string, unknown>,
  incoming: GrowthTask[],
  limit = 8,
): GrowthTask[] {
  const existing = listGrowthTasks(profile);
  const keyOf = (t: GrowthTask) =>
    `${t.goal}|${t.suggestedTopic || ""}`.slice(0, 160);
  const seen = new Set(incoming.map(keyOf));
  const kept = existing.filter((t) => !seen.has(keyOf(t)));
  return [...incoming, ...kept].slice(0, limit);
}
