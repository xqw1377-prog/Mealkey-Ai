/**
 * Candidate Promote V1 — Signal → Candidate →（是否）升格焦点
 * 禁止在此 createDecision；仅打分与投影。
 */
import {
  buildDecisionReadiness,
  type DecisionHorizonV1,
  type DecisionReadinessV1,
} from "@/server/founder-layer/contracts/business-identity";
import {
  PROMOTE_SCORE_THRESHOLD,
  shouldPromoteCandidate,
  type DecisionCandidateV1,
} from "@/server/founder-layer/contracts/decision-candidate";
import type { DecisionInboxV1 } from "@/server/founder-layer/contracts/decision-inbox";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";
import { decisionEntryPath } from "@/lib/decision-entry";
import { isExpansionSignal } from "./signal-engine";

/**
 * 与 @mealkey/business-signal-engine canPromoteSignalToCase 对齐的 DecisionSignal 门禁
 * （证据/问题/严重度；禁止薄证据进今日焦点）
 */
export function canPromoteDecisionSignal(
  signal: DecisionSignalV1,
  opts?: { forceByUser?: boolean },
): { ok: true } | { ok: false; reason: string } {
  if (
    signal.status === "dismissed" ||
    signal.status === "merged" ||
    signal.status === "opened_case"
  ) {
    return { ok: false, reason: "signal_closed" };
  }
  const question = (signal.suggestedQuestion || signal.title || "").trim();
  if (!question) return { ok: false, reason: "missing_question" };
  const hasEvidence =
    (signal.evidenceIds?.length ?? 0) >= 1 ||
    (signal.description || "").trim().length >= 16;
  if (!hasEvidence) return { ok: false, reason: "evidence_insufficient" };
  const severityOk =
    signal.urgency === "high" ||
    signal.importance >= 0.65 ||
    signal.type === "RISK";
  if (!severityOk && !opts?.forceByUser) {
    return { ok: false, reason: "severity_gate" };
  }
  return { ok: true };
}

function starsFrom01(n: number): 1 | 2 | 3 | 4 | 5 {
  if (n >= 0.9) return 5;
  if (n >= 0.75) return 4;
  if (n >= 0.55) return 3;
  if (n >= 0.35) return 2;
  return 1;
}

function urgencyStars(u: DecisionSignalV1["urgency"]): 1 | 2 | 3 | 4 | 5 {
  if (u === "high") return 5;
  if (u === "medium") return 3;
  return 1;
}

function horizonAligns(
  signal: DecisionSignalV1,
  horizon: DecisionHorizonV1 | null | undefined,
): boolean {
  if (!horizon) return false;
  const expansion = isExpansionSignal(signal);
  if (expansion) return horizon === "mid" || horizon === "long";
  if (signal.type === "RISK" && signal.urgency === "high") {
    return horizon === "short" || horizon === "mid";
  }
  return horizon === "mid";
}

export type PromoteContext = {
  projectId: string;
  dataCompleteness?: number;
  decisionHorizon?: DecisionHorizonV1 | null;
  /** 高/critical 风险阻断 */
  blockingRisk?: boolean;
  brandOk?: boolean;
  geoOk?: boolean;
  known?: string[];
  missing?: string[];
};

/** 议题是否像「可拍板的决策题」（非空话观察） */
export function isDecisionQualityQuestion(text: string): boolean {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length < 8) return false;
  if (/^(怎么办|如何|看看|了解一下|关注一下)/.test(t) && t.length < 18) {
    return false;
  }
  if (/^(今天|生意|经营)(怎么样|如何|好吗)/.test(t)) return false;
  const hasChoice =
    /要不要|是否|该不该|先|还是|暂缓|推进|扩店|关店|停|开店|涨价|降价|换|签|补齐|落地/.test(
      t,
    );
  const hasQuestionMark = /[？?]/.test(t);
  return hasChoice || hasQuestionMark || t.length >= 20;
}

/**
 * promoteScore =
 *   impact*20 + urgency*20
 *   + (阻断风险 ? 25 : 0)
 *   + (与 Horizon 对齐 ? 15 : 0)
 *   - (完整度<15 ? 20 : 0)
 */
export function computePromoteScore(
  signal: DecisionSignalV1,
  ctx: PromoteContext,
): number {
  const impact = starsFrom01(signal.importance);
  const urgency = urgencyStars(signal.urgency);
  let score = impact * 20 + urgency * 20;
  const isRisk = signal.type === "RISK";
  if (ctx.blockingRisk && isRisk) score += 25;
  else if (signal.urgency === "high" && isRisk) score += 15;
  if (horizonAligns(signal, ctx.decisionHorizon)) score += 15;
  if ((ctx.dataCompleteness ?? 50) < 15) score -= 20;
  // 扩店黄金路径：用户主动提出时抬升
  if (isExpansionSignal(signal) && signal.source === "USER") score += 10;
  // 普通用户困扰默认观察，避免开户一句话就强制开会
  if (
    signal.source === "USER" &&
    !isExpansionSignal(signal) &&
    signal.urgency !== "high"
  ) {
    score -= 30;
  }
  // 弱机会/弱变化默认观察，避免「有信号就开会」
  if (signal.type === "OPPORTUNITY" && signal.importance < 0.72) {
    score -= 50;
  }
  if (signal.type === "CHANGE" && signal.importance < 0.65) {
    score -= 25;
  }
  // M-INTEL 顾客风险变化：抬升，便于进入今日焦点/决策室
  if (
    signal.source === "M_INTEL" &&
    signal.type === "CHANGE" &&
    signal.importance >= 0.72
  ) {
    score += 18;
  }
  // 系统席位/世界变化：有可拍板决策题时抬升；纯观察题降权
  if (signal.source === "SYSTEM") {
    if (isDecisionQualityQuestion(signal.suggestedQuestion || signal.title)) {
      score += 12;
    } else {
      score -= 10;
    }
    if (signal.type === "UNKNOWN") score -= 8;
  }
  // 有证据锚点的信号更值得开会
  if ((signal.evidenceIds || []).length >= 1) {
    score += 8;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function readinessForSignal(
  signal: DecisionSignalV1,
  ctx: PromoteContext,
  promoteScore: number,
): DecisionReadinessV1 {
  const missing = [...(ctx.missing || [])];
  if (isExpansionSignal(signal)) {
    if (!missing.some((m) => /店长/.test(m))) {
      missing.push("店长是否可独立经营");
    }
    if (!missing.some((m) => /现金|利润/.test(m))) {
      missing.push("单店盈利与现金缓冲");
    }
  }
  return buildDecisionReadiness({
    score: promoteScore,
    known: ctx.known?.length ? ctx.known : ["运行时信号"],
    missing,
    canClaimExternalIntel: Boolean(ctx.brandOk && ctx.geoOk),
    highRisk: signal.type === "RISK" && signal.urgency === "high",
  });
}

export function buildCandidateFromSignal(
  signal: DecisionSignalV1,
  ctx: PromoteContext,
): DecisionCandidateV1 {
  const promoteScore = computePromoteScore(signal, ctx);
  const readiness = readinessForSignal(signal, ctx, promoteScore);
  const expansion = isExpansionSignal(signal);
  return {
    candidateId: `cand_${signal.id}`,
    projectId: ctx.projectId,
    signalIds: [signal.id],
    question: signal.suggestedQuestion,
    title: signal.title,
    whyNow: signal.description,
    impactStars: starsFrom01(signal.importance),
    urgencyStars: urgencyStars(signal.urgency),
    horizonFit: ctx.decisionHorizon || signal.relatedScope?.horizon || null,
    promoteScore,
    readiness,
    recommendedAction: expansion
      ? "进入第二家店决策会议室，先补齐关键事实再裁决"
      : readiness.state === "ready"
        ? "进入决策会议室完成判断"
        : "先补关键项，再决定是否开会",
    status: shouldPromoteCandidate({
      promoteScore,
      status: "open",
    })
      ? "open"
      : "watching",
    createdAt: signal.observedAt,
  };
}

export function buildCandidatesFromSignals(
  signals: DecisionSignalV1[],
  ctx: PromoteContext,
): DecisionCandidateV1[] {
  return signals
    .map((s) => {
      const candidate = buildCandidateFromSignal(s, ctx);
      const gate = canPromoteDecisionSignal(s, {
        forceByUser: s.source === "USER",
      });
      // Promote Gate 不过：强制 watching，即使分数达标
      if (!gate.ok && candidate.status === "open") {
        return { ...candidate, status: "watching" as const };
      }
      return candidate;
    })
    .sort((a, b) => b.promoteScore - a.promoteScore);
}

/** 可进入今日焦点的 Candidate（达阈值 + Promote Gate）；扩店优先；决策题质优先于空话 */
export function pickFocusCandidate(
  candidates: DecisionCandidateV1[],
): DecisionCandidateV1 | null {
  const promotable = candidates.filter(
    (c) =>
      c.status !== "watching" &&
      shouldPromoteCandidate({
        promoteScore: c.promoteScore,
        status: c.status === "watching" ? "open" : c.status,
      }),
  );
  if (!promotable.length) return null;
  const expansion = promotable.find((c) =>
    /第二家|扩店|开店|扩张/.test(`${c.question} ${c.title}`),
  );
  if (expansion) return expansion;
  const quality = promotable.filter((c) =>
    isDecisionQualityQuestion(c.question || c.title),
  );
  const pool = quality.length ? quality : promotable;
  return pool[0]!;
}

export function projectInboxFromCandidates(input: {
  candidates: DecisionCandidateV1[];
  focusId?: string | null;
  executingCount?: number;
  reviewingCount?: number;
  projectId: string;
}): DecisionInboxV1 {
  const pending = input.candidates.filter(
    (c) =>
      c.candidateId === input.focusId ||
      shouldPromoteCandidate({
        promoteScore: c.promoteScore,
        status: "open",
      }),
  );
  const watching = input.candidates.filter(
    (c) =>
      c.candidateId !== input.focusId &&
      !shouldPromoteCandidate({
        promoteScore: c.promoteScore,
        status: "open",
      }),
  );
  const decisionHref = (title: string, question: string) =>
    decisionEntryPath(
      input.projectId,
      (question || title || "今日经营决策").trim(),
    );
  const items = [
    ...pending.map((c) => ({
      id: c.candidateId,
      kind: "candidate" as const,
      title: c.title,
      bucket: "pending_decide" as const,
      href: decisionHref(c.title, c.question),
    })),
    ...watching.map((c) => ({
      id: c.candidateId,
      kind: "candidate" as const,
      title: c.title,
      bucket: "watching" as const,
      href: decisionHref(c.title, c.question),
    })),
  ];
  return {
    pendingDecide: pending.length,
    watching: watching.length,
    executing: input.executingCount ?? 0,
    reviewing: input.reviewingCount ?? 0,
    items: items.slice(0, 8),
  };
}

export { PROMOTE_SCORE_THRESHOLD, shouldPromoteCandidate };
