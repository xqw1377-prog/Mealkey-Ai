/**
 * Growth G3 — GrowthEvent 投影
 */

import type {
  CognitiveGap,
  DecisionPattern,
  GrowthEvent,
} from "../../contracts/growth-runtime";

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

export function projectGrowthEventsFromValidation(input: {
  result: "aligned" | "partial" | "off";
  impact: "confirmed" | "partial" | "invalidated";
  summary: string;
  pattern?: DecisionPattern | null;
  gap?: CognitiveGap | null;
}): GrowthEvent[] {
  const now = new Date().toISOString();
  const events: GrowthEvent[] = [
    {
      eventId: buildId("ge"),
      type: "validation_completed",
      source: "validation_os",
      impact: input.impact,
      summary: input.summary.slice(0, 160),
      createdAt: now,
    },
  ];
  if (input.pattern) {
    events.push({
      eventId: buildId("ge"),
      type: "decision_pattern",
      source: "growth_runtime",
      impact: input.pattern.outcome,
      summary: input.pattern.lesson.slice(0, 160),
      createdAt: now,
    });
  }
  if (input.gap) {
    events.push({
      eventId: buildId("ge"),
      type: "cognitive_gap",
      source: "growth_runtime",
      impact: "partial",
      summary: input.gap.summary.slice(0, 160),
      createdAt: now,
    });
  }
  return events;
}

export function prependGrowthEvents(
  profile: Record<string, unknown>,
  events: GrowthEvent[],
  limit = 30,
): GrowthEvent[] {
  const existing = Array.isArray(profile.growthEvents)
    ? (profile.growthEvents as GrowthEvent[])
    : [];
  return [...events, ...existing].slice(0, limit);
}

export function listGrowthEvents(
  profile: Record<string, unknown>,
): GrowthEvent[] {
  return Array.isArray(profile.growthEvents)
    ? (profile.growthEvents as GrowthEvent[])
    : [];
}
