/**
 * Risk R3 — Memory 禁区冲突 → strategic HIGH
 */

import type { FounderMemorySnapshot } from "../../contracts";
import { buildRiskAlert } from "../../contracts/risk-runtime";
import type { RiskAlert } from "../../contracts/risk-runtime";
import { buildForbiddenReminders } from "../../memory/reminders";

export function detectStrategicForbiddenConflict(input: {
  ownerId: string;
  projectId: string;
  snapshot: FounderMemorySnapshot | null | undefined;
  draftTopic?: string;
}): RiskAlert | null {
  const reminders = buildForbiddenReminders(
    input.snapshot,
    input.draftTopic,
  );
  if (reminders.length === 0) return null;

  const topic = (input.draftTopic || "").trim();
  const hit = reminders[0];
  const overlapped =
    !topic || reminders.some((r) => overlapLoose(topic, r));

  if (!overlapped) {
    // 有失败禁区但与议题弱相关 → 仍至少 medium，要求复核
    return buildRiskAlert({
      id: `risk_mem_${hashId(hit)}`,
      ownerId: input.ownerId,
      projectId: input.projectId,
      type: "strategic",
      title: "历史禁区需复核",
      description: hit,
      evidence: reminders.slice(0, 3),
      source: "memory",
      factors: { probability: 0.6, impact: 0.75, exposure: 0.55 },
      suggestExpert: "M-PNT",
      suggestCouncil: false,
      suggestedTopic: topic
        ? `复核议题是否触碰禁区：${topic}`.slice(0, 120)
        : "复核是否触碰历史禁区",
    });
  }

  return buildRiskAlert({
    id: `risk_mem_${hashId(hit)}`,
    ownerId: input.ownerId,
    projectId: input.projectId,
    type: "strategic",
    title: "战略禁区冲突",
    description: `当前方向可能触碰历史禁区：${hit}`,
    evidence: reminders.slice(0, 3),
    source: "memory",
    factors: { probability: 0.75, impact: 0.85, exposure: 0.8 },
    suggestExpert: "M-PNT",
    suggestCouncil: true,
    suggestedTopic: topic
      ? `禁区冲突复核：${topic}`.slice(0, 120)
      : "禁区冲突：是否坚持当前方向",
  });
}

/** 中文双字滑动窗口 + 英文 token */
function overlapLoose(a: string, b: string): boolean {
  if (!a || !b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  for (let i = 0; i < a.length - 1; i++) {
    const gram = a.slice(i, i + 2);
    if (/[\u4e00-\u9fa5]{2}/.test(gram) && b.includes(gram)) return true;
  }
  const tokens = a
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  return tokens.some((t) => b.includes(t));
}

function hashId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 8);
}
