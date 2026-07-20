/**
 * Memory Runtime M2 — recallForDecision（开会用摘要块）
 */

import type { PrismaClient } from "@/generated/prisma";
import type { MemoryRecallBlock } from "../contracts/memory-runtime";
import {
  formatMemoryPriorBlock,
  loadFounderMemorySnapshot,
} from "./engine";
import { buildForbiddenReminders } from "./reminders";
import {
  formatIndustryPriorBlock,
  recallIndustryInsights,
} from "../intelligence/industry-contribute";

export async function recallForDecision(
  prisma: PrismaClient,
  input: {
    ownerId: string;
    projectId: string;
    topic?: string;
    profile?: Record<string, unknown> | null;
    category?: string | null;
    limit?: number;
  },
): Promise<MemoryRecallBlock> {
  const topic = (input.topic || "").trim();
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 12);
  const snapshot = await loadFounderMemorySnapshot(
    prisma,
    input.ownerId,
    input.projectId,
    input.profile,
  );

  const decisions = snapshot.decisions.slice(0, limit).map((d) => ({
    summary: d.summary,
    decisionId: d.decisionId,
    createdAt: d.createdAt,
  }));
  // 失败教训优先，再补 success/partial
  const rankedPatterns = [...snapshot.patterns].sort((a, b) => {
    const rank = (k: string) =>
      k === "failure" ? 0 : k === "partial" ? 1 : 2;
    return rank(a.kind) - rank(b.kind);
  });
  const lessons = rankedPatterns.slice(0, limit).map((p) => ({
    summary: p.summary,
    kind: p.kind,
    createdAt: p.createdAt,
  }));
  const preferences = snapshot.preferences.slice(0, 4).map((p) => ({
    label: p.label,
    value: p.value,
  }));
  const forbiddenReminders = buildForbiddenReminders(snapshot, topic);

  const category =
    input.category ||
    (typeof input.profile?.category === "string"
      ? input.profile.category
      : null);
  let industryBlock = "";
  try {
    const industry = await recallIndustryInsights(prisma, {
      category,
      topic,
      limit: 4,
    });
    industryBlock = formatIndustryPriorBlock(industry);
  } catch {
    // 行业池不可用时不影响本企业记忆召回
  }

  const priorParts = [
    formatMemoryPriorBlock(snapshot),
    industryBlock,
    forbiddenReminders.length
      ? `禁区提醒：${forbiddenReminders.join("；")}`
      : "",
    topic ? `当前议题：${topic}` : "",
  ].filter(Boolean);

  return {
    priorBlock: priorParts.join("\n"),
    decisions,
    lessons,
    preferences,
    forbiddenReminders,
    topic,
  };
}
