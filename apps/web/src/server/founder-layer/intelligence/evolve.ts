/**
 * Evolution Engine — 从 BehaviorSignal 更新 decisionStyle / lessons / 常委权重提示
 * 规则优先；尊重 useForPersonalGrowth
 */

import type {
  DecisionStyleProfile,
  HistoricalLesson,
} from "../contracts/intelligence-profile";
import { readMemoryPermissions } from "./permissions";
import { appendBehaviorSignal, listBehaviorSignals } from "./signals";
import type { BehaviorSignal } from "../contracts/intelligence-profile";

const LESSON_LIMIT = 16;

const DEFAULT_STYLE: DecisionStyleProfile = {
  riskPreference: "unknown",
  speedPreference: "unknown",
  detailLevel: "unknown",
  aiStance: "unknown",
};

export function readDecisionStyle(
  profile: Record<string, unknown>,
): DecisionStyleProfile {
  const raw = profile.decisionStyle;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STYLE };
  const o = raw as Record<string, unknown>;
  return {
    riskPreference: pickEnum(
      o.riskPreference,
      ["conservative", "balanced", "aggressive", "unknown"] as const,
      "unknown",
    ),
    speedPreference: pickEnum(
      o.speedPreference,
      ["deliberate", "balanced", "fast", "unknown"] as const,
      "unknown",
    ),
    detailLevel: pickEnum(
      o.detailLevel,
      ["high", "medium", "low", "unknown"] as const,
      "unknown",
    ),
    aiStance: pickEnum(
      o.aiStance,
      ["follow", "negotiate", "override", "unknown"] as const,
      "unknown",
    ),
  };
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function listIntelligenceLessons(
  profile: Record<string, unknown>,
): HistoricalLesson[] {
  if (!Array.isArray(profile.intelligenceLessons)) return [];
  return profile.intelligenceLessons
    .filter(
      (x): x is HistoricalLesson =>
        Boolean(x) &&
        typeof x === "object" &&
        typeof (x as HistoricalLesson).lessonId === "string" &&
        typeof (x as HistoricalLesson).summary === "string",
    )
    .slice(0, LESSON_LIMIT);
}

export type CouncilWeightHints = {
  CFO?: number;
  CRO?: number;
  CSO?: number;
  BMO?: number;
  CDO?: number;
  COO?: number;
  CBO?: number;
  note?: string;
  updatedAt?: string;
};

export function readCouncilWeightHints(
  profile: Record<string, unknown>,
): CouncilWeightHints {
  const raw = profile.councilWeightHints;
  if (!raw || typeof raw !== "object") return {};
  return raw as CouncilWeightHints;
}

/**
 * 根据已记录信号进化画像字段；若 useForPersonalGrowth=false 则只追加信号不改风格
 */
export function evolveIntelligenceProfile(
  profile: Record<string, unknown>,
  now = new Date().toISOString(),
): Record<string, unknown> {
  const permissions = readMemoryPermissions(profile);
  if (!permissions.useForPersonalGrowth) {
    return {
      ...profile,
      intelligenceEvolvedAt: now,
      intelligenceEvolveSkipped: "useForPersonalGrowth=false",
    };
  }

  const signals = listBehaviorSignals(profile);
  const style = evolveDecisionStyle(readDecisionStyle(profile), signals);
  const lessons = mergeLessonsFromSignals(
    listIntelligenceLessons(profile),
    signals,
    now,
  );
  const hints = evolveCouncilWeightHints(
    readCouncilWeightHints(profile),
    signals,
    style,
    now,
  );

  // 从决策 pattern 补 lesson（Growth 已有）
  const patternLessons = lessonsFromDecisionPatterns(profile, now);
  const mergedLessons = dedupeLessons([...lessons, ...patternLessons]).slice(
    0,
    LESSON_LIMIT,
  );

  return {
    ...profile,
    decisionStyle: style,
    intelligenceLessons: mergedLessons,
    councilWeightHints: hints,
    intelligenceEvolvedAt: now,
    intelligenceEvolveSkipped: undefined,
  };
}

function evolveDecisionStyle(
  prev: DecisionStyleProfile,
  signals: BehaviorSignal[],
): DecisionStyleProfile {
  const next = { ...prev };
  const choices = signals.filter((s) => s.kind === "decision_choice");
  const overrides = signals.filter((s) => s.kind === "override_ai");
  const execs = signals.filter((s) => s.kind === "execution_followthrough");

  const overturned = choices.filter((s) => s.vsRecommended === "overturned").length;
  const modified = choices.filter((s) => s.vsRecommended === "modified").length;
  const aligned = choices.filter((s) => s.vsRecommended === "aligned").length;

  if (overturned >= 2 || (overturned >= 1 && overrides.length >= 2)) {
    next.aiStance = "override";
  } else if (modified >= 2) {
    next.aiStance = "negotiate";
  } else if (aligned >= 3 && overturned === 0) {
    next.aiStance = "follow";
  }

  const topicBlob = choices
    .map((s) => s.topic)
    .join(" ")
    .toLowerCase();
  const conservativeHits =
    (topicBlob.match(/验证|稳健|控成本|低成本|暂缓|不扩张|别加盟/g) || [])
      .length +
    choices.filter((s) => /验证|暂缓|不扩/.test(s.choice)).length;
  const aggressiveHits =
    (topicBlob.match(/扩张|加盟|融资|开店|进新城市|快速/g) || []).length +
    choices.filter((s) => s.vsRecommended === "overturned" && /扩|加盟|融资/.test(s.topic))
      .length;

  if (conservativeHits >= 3 && conservativeHits > aggressiveHits) {
    next.riskPreference = "conservative";
  } else if (aggressiveHits >= 3 && aggressiveHits > conservativeHits) {
    next.riskPreference = "aggressive";
  } else if (choices.length >= 2) {
    next.riskPreference =
      next.riskPreference === "unknown" ? "balanced" : next.riskPreference;
  }

  if (execs.length >= 1) {
    const avg =
      execs.reduce((sum, s) => sum + s.completionRate, 0) / execs.length;
    if (avg < 0.4) next.speedPreference = "deliberate";
    else if (avg > 0.75) next.speedPreference = "fast";
    else if (next.speedPreference === "unknown") next.speedPreference = "balanced";
  }

  if (overrides.some((o) => (o.reason || "").length > 40)) {
    next.detailLevel = "high";
  } else if (next.detailLevel === "unknown" && choices.length >= 2) {
    next.detailLevel = "medium";
  }

  return next;
}

function mergeLessonsFromSignals(
  prev: HistoricalLesson[],
  signals: BehaviorSignal[],
  now: string,
): HistoricalLesson[] {
  const added: HistoricalLesson[] = [];
  for (const s of signals.slice(0, 8)) {
    if (s.kind === "override_ai") {
      added.push({
        lessonId: `ovr_${hashShort(`${s.at}_${s.userChoice}`)}`,
        summary: clip(
          `曾${s.userChoice}委员会建议「${s.recommendation}」${
            s.reason ? `：${s.reason}` : ""
          }${s.laterOutcome && s.laterOutcome !== "unknown" ? ` → ${s.laterOutcome}` : ""}`,
          200,
        ),
        source: "override",
        outcome:
          s.laterOutcome === "success"
            ? "confirmed"
            : s.laterOutcome === "fail"
              ? "invalidated"
              : s.laterOutcome === "mixed"
                ? "partial"
                : "unknown",
      });
    }
    if (s.kind === "prediction_error") {
      const err = s.actual - s.predicted;
      added.push({
        lessonId: `pred_${hashShort(`${s.at}_${s.metric}`)}`,
        summary: clip(
          `${s.metric} 预测 ${s.predicted}${s.unit || ""} / 实际 ${s.actual}${s.unit || ""}（偏差 ${err > 0 ? "+" : ""}${err}）`,
          200,
        ),
        source: "validation",
        outcome: Math.abs(err) / (Math.abs(s.predicted) || 1) > 0.25
          ? "invalidated"
          : "partial",
      });
    }
    if (s.kind === "execution_followthrough" && s.completionRate < 0.4) {
      added.push({
        lessonId: `exec_${hashShort(`${s.at}_${s.completionRate}`)}`,
        summary: clip(
          `近 ${s.windowDays} 日行动完成率 ${Math.round(s.completionRate * 100)}%，执行跟进偏弱`,
          200,
        ),
        source: "execution",
        outcome: "partial",
      });
    }
  }
  // stamp created via lessonId uniqueness; keep previous first
  return dedupeLessons([...added, ...prev]);
}

function lessonsFromDecisionPatterns(
  profile: Record<string, unknown>,
  _now: string,
): HistoricalLesson[] {
  const patterns = Array.isArray(profile.decisionPatterns)
    ? profile.decisionPatterns
    : profile.lastDecisionPattern
      ? [profile.lastDecisionPattern]
      : [];
  const out: HistoricalLesson[] = [];
  for (const p of patterns.slice(0, 6)) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const lesson = String(o.lesson || "").trim();
    if (!lesson) continue;
    out.push({
      lessonId: String(o.patternId || `pat_${hashShort(lesson)}`),
      summary: clip(lesson, 200),
      source: "decision",
      outcome: pickEnum(
        o.outcome,
        ["confirmed", "partial", "invalidated", "unknown"] as const,
        "unknown",
      ),
    });
  }
  return out;
}

function evolveCouncilWeightHints(
  prev: CouncilWeightHints,
  signals: BehaviorSignal[],
  style: DecisionStyleProfile,
  now: string,
): CouncilWeightHints {
  const next: CouncilWeightHints = { ...prev, updatedAt: now };
  const notes: string[] = [];

  if (style.riskPreference === "aggressive" || style.aiStance === "override") {
    next.CFO = Math.max(next.CFO ?? 1, 1.25);
    next.CRO = Math.max(next.CRO ?? 1, 1.2);
    notes.push("风险偏好偏进取或常推翻建议 → 加强财务/风控提醒");
  }
  if (style.riskPreference === "conservative") {
    next.CSO = Math.max(next.CSO ?? 1, 1.1);
    notes.push("稳健偏好 → 战略席保留窗口提醒");
  }

  const execs = signals.filter((s) => s.kind === "execution_followthrough");
  if (execs.some((e) => e.completionRate < 0.4)) {
    next.COO = Math.max(next.COO ?? 1, 1.2);
    notes.push("执行完成率偏低 → 加强运营跟进");
  }

  const cashTopics = signals.filter(
    (s) =>
      s.kind === "decision_choice" &&
      /现金|融资|成本|加盟费|回本/.test(s.topic),
  );
  if (cashTopics.length >= 2) {
    next.CFO = Math.max(next.CFO ?? 1, 1.35);
    notes.push("多次触及现金/融资议题 → CFO 权重提高");
  }

  if (notes.length) next.note = notes[0];
  return next;
}

function dedupeLessons(items: HistoricalLesson[]): HistoricalLesson[] {
  const seen = new Set<string>();
  const out: HistoricalLesson[] = [];
  for (const item of items) {
    const key = item.lessonId || item.summary;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function hashShort(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).slice(0, 8);
}

/**
 * 将信号写入并进化（权限闸：saveExperience 控制是否记信号；growth 控制是否进化）
 */
export function ingestSignalsAndEvolve(
  profile: Record<string, unknown>,
  signals: BehaviorSignal[],
  now = new Date().toISOString(),
): Record<string, unknown> {
  const permissions = readMemoryPermissions(profile);
  let next = { ...profile };
  if (permissions.saveExperience) {
    for (const signal of [...signals].reverse()) {
      next = appendBehaviorSignal(next, signal);
    }
  }
  if (permissions.useForPersonalGrowth) {
    next = evolveIntelligenceProfile(next, now);
  } else {
    next = {
      ...next,
      intelligenceEvolvedAt: now,
      intelligenceEvolveSkipped: "useForPersonalGrowth=false",
    };
  }
  return next;
}
