/**
 * BehaviorSignal ingress — 追加到 profile.behaviorSignals
 */

import type { BehaviorSignal } from "../contracts/intelligence-profile";

const SIGNAL_LIMIT = 40;

export function listBehaviorSignals(
  profile: Record<string, unknown>,
): BehaviorSignal[] {
  if (!Array.isArray(profile.behaviorSignals)) return [];
  return profile.behaviorSignals.filter(isBehaviorSignal).slice(0, SIGNAL_LIMIT);
}

function isBehaviorSignal(value: unknown): value is BehaviorSignal {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === "decision_choice" ||
    kind === "override_ai" ||
    kind === "execution_followthrough" ||
    kind === "prediction_error"
  );
}

export function appendBehaviorSignal(
  profile: Record<string, unknown>,
  signal: BehaviorSignal,
  limit = SIGNAL_LIMIT,
): Record<string, unknown> {
  const prev = listBehaviorSignals(profile);
  const next = [signal, ...prev].slice(0, limit);
  return {
    ...profile,
    behaviorSignals: next,
    lastBehaviorSignalAt: signal.at,
  };
}

export function buildCouncilDecisionSignals(input: {
  topic: string;
  choice: "接受委员会" | "修改方案" | "推翻委员会";
  recommendedAction?: string;
  note?: string;
  caseId?: string;
  sessionId?: string;
  at?: string;
}): BehaviorSignal[] {
  const at = input.at ?? new Date().toISOString();
  const vsRecommended =
    input.choice === "接受委员会"
      ? "aligned"
      : input.choice === "修改方案"
        ? "modified"
        : "overturned";

  const choiceSignal: BehaviorSignal = {
    kind: "decision_choice",
    caseId: input.caseId,
    decisionId: input.sessionId,
    topic: input.topic,
    optionsShown: ["接受委员会", "修改方案", "推翻委员会"],
    choice: input.choice,
    vsRecommended,
    at,
  };

  if (vsRecommended === "aligned") {
    return [choiceSignal];
  }

  const override: BehaviorSignal = {
    kind: "override_ai",
    recommendation: input.recommendedAction || "委员会建议",
    userChoice: input.choice,
    reason: input.note,
    laterOutcome: "unknown",
    at,
  };
  return [choiceSignal, override];
}

export function buildExecutionFollowthroughSignal(input: {
  planId?: string;
  completionRate: number;
  windowDays?: number;
  at?: string;
}): BehaviorSignal {
  return {
    kind: "execution_followthrough",
    planId: input.planId,
    completionRate: Math.max(0, Math.min(1, input.completionRate)),
    windowDays: input.windowDays ?? 30,
    at: input.at ?? new Date().toISOString(),
  };
}

export function buildPredictionErrorSignal(input: {
  metric: string;
  predicted: number;
  actual: number;
  unit?: string;
  at?: string;
}): BehaviorSignal {
  return {
    kind: "prediction_error",
    metric: input.metric,
    predicted: input.predicted,
    actual: input.actual,
    unit: input.unit,
    at: input.at ?? new Date().toISOString(),
  };
}

/**
 * 从验证摘要解析「预测 X / 实际 Y」类偏差（可选燃料）
 * 例：营业额预测100万实际80万 · 客流预计200实际150
 */
export function parsePredictionFromSummary(
  summary: string,
): { metric: string; predicted: number; actual: number; unit?: string } | null {
  const text = (summary || "").replace(/\s+/g, "");
  const patterns = [
    /([\u4e00-\u9fa5A-Za-z]{2,12})(?:预测|预计|目标)(\d+(?:\.\d+)?)(万|元|%|人|桌|单)?(?:[,，/]|实际|达成)(?:实际|达成)?(\d+(?:\.\d+)?)(万|元|%|人|桌|单)?/,
    /预测(\d+(?:\.\d+)?)(万|元|%)?[/／]实际(\d+(?:\.\d+)?)(万|元|%)?/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    if (m.length >= 5 && m[1] && !/^\d/.test(m[1])) {
      return {
        metric: m[1],
        predicted: Number(m[2]),
        actual: Number(m[4]),
        unit: m[5] || m[3] || undefined,
      };
    }
    if (m.length >= 4) {
      return {
        metric: "指标",
        predicted: Number(m[1]),
        actual: Number(m[3]),
        unit: m[4] || m[2] || undefined,
      };
    }
  }
  return null;
}

/** 从 lastActionPlan 估算完成率 */
export function estimateActionPlanCompletion(
  profile: Record<string, unknown>,
): number | null {
  const plan = profile.lastActionPlan;
  if (!plan || typeof plan !== "object") return null;
  const actions = (plan as { actions?: unknown }).actions;
  if (!Array.isArray(actions) || actions.length === 0) return null;
  let done = 0;
  for (const a of actions) {
    if (!a || typeof a !== "object") continue;
    const status = String((a as { status?: unknown }).status || "");
    if (status === "done" || status === "completed" || status === "done_today") {
      done += 1;
    }
  }
  return done / actions.length;
}
