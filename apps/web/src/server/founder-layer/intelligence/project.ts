/**
 * Intelligence Profile 投影组装（读模型）
 */

import { buildGrowthRuntimeSnapshot } from "../capability/growth/snapshot";
import {
  emptyIntelligenceProfile,
  type FounderIntelligenceProfile,
  type IntelligenceCapabilityScore,
} from "../contracts/intelligence-profile";
import {
  listIntelligenceLessons,
  readCouncilWeightHints,
  readDecisionStyle,
} from "./evolve";
import { readMemoryPermissions } from "./permissions";
import {
  estimateActionPlanCompletion,
  listBehaviorSignals,
} from "./signals";

const STYLE_SUMMARY: Record<string, string> = {
  conservative: "稳健偏好",
  balanced: "平衡偏好",
  aggressive: "进取偏好",
  unknown: "风格待观察",
};

const STANCE_SUMMARY: Record<string, string> = {
  follow: "常采纳委员会建议",
  negotiate: "倾向修改方案",
  override: "常坚持己见",
  unknown: "与 AI 协作姿态待观察",
};

export function buildFounderIntelligenceProfile(input: {
  ownerId: string;
  projectId?: string;
  profile: Record<string, unknown>;
  now?: string;
}): FounderIntelligenceProfile {
  const now = input.now ?? new Date().toISOString();
  const base = emptyIntelligenceProfile({
    ownerId: input.ownerId,
    projectId: input.projectId,
    now,
  });
  const growth = buildGrowthRuntimeSnapshot(input.profile);
  const style = readDecisionStyle(input.profile);
  const permissions = readMemoryPermissions(input.profile);
  const signals = listBehaviorSignals(input.profile);
  const lessons = listIntelligenceLessons(input.profile);
  const completion =
    estimateActionPlanCompletion(input.profile) ??
    (() => {
      const exec = signals.find((s) => s.kind === "execution_followthrough");
      return exec && exec.kind === "execution_followthrough"
        ? exec.completionRate
        : null;
    })();

  const businessCapability: IntelligenceCapabilityScore[] = (
    growth.eightDim ?? []
  ).map((d) => ({
    dim: d.dim,
    score: d.score,
    confidence: d.confidence,
    note: d.note,
  }));

  const traits: string[] = [];
  if (style.riskPreference !== "unknown") {
    traits.push(STYLE_SUMMARY[style.riskPreference] || style.riskPreference);
  }
  if (style.aiStance !== "unknown") {
    traits.push(STANCE_SUMMARY[style.aiStance] || style.aiStance);
  }
  if (growth.weakestLabel) {
    traits.push(`短板：${growth.weakestLabel}`);
  }
  const pref = input.profile.founderPreference;
  if (typeof pref === "string" && pref.trim()) {
    traits.push(`焦点：${pref}`);
  }

  const summaryParts = [
    STYLE_SUMMARY[style.riskPreference],
    STANCE_SUMMARY[style.aiStance],
    growth.cognitiveGap?.summary
      ? clip(growth.cognitiveGap.summary, 48)
      : null,
  ].filter(Boolean);

  const signalConfidence = Math.min(0.92, signals.length * 0.08);
  const capConfidence =
    businessCapability.length > 0
      ? businessCapability.reduce((s, c) => s + c.confidence, 0) /
        businessCapability.length
      : 0;
  const confidence = Math.min(
    0.95,
    Math.max(signalConfidence, capConfidence * 0.7, lessons.length ? 0.25 : 0),
  );

  let followThrough: FounderIntelligenceProfile["executionAbility"]["followThrough"] =
    "unknown";
  if (completion != null) {
    if (completion < 0.4) followThrough = "weak";
    else if (completion < 0.7) followThrough = "mixed";
    else followThrough = "strong";
  }

  const hints = readCouncilWeightHints(input.profile);
  if (hints.note) traits.push(clip(hints.note, 36));

  // pattern lessons fallback into historicalLessons
  const historicalLessons =
    lessons.length > 0
      ? lessons
      : (growth.recentPatterns || [])
          .filter((p) => p.lesson)
          .slice(0, 6)
          .map((p) => ({
            lessonId: p.patternId,
            summary: p.lesson,
            source: "decision" as const,
            outcome: p.outcome,
          }));

  return {
    ...base,
    updatedAt:
      typeof input.profile.intelligenceEvolvedAt === "string"
        ? input.profile.intelligenceEvolvedAt
        : now,
    confidence: Number(confidence.toFixed(2)),
    personality: {
      summary: summaryParts.join(" · ") || "经营镜像尚未形成，继续决策与验证后会变清晰",
      traits: traits.slice(0, 8),
    },
    decisionStyle: style,
    businessCapability,
    knowledgeLevel: {
      categoryFamiliarity:
        signals.length >= 6 || businessCapability.length >= 6
          ? "medium"
          : signals.length >= 2
            ? "low"
            : "unknown",
      notes: growth.lastDecisionPattern?.lesson
        ? [clip(growth.lastDecisionPattern.lesson, 80)]
        : [],
    },
    executionAbility: {
      recentCompletionRate: completion,
      followThrough,
    },
    historicalLessons: historicalLessons.slice(0, 12),
    permissions,
  };
}

/** 简报用短摘要 */
export function buildIntelligenceBriefSummary(
  profile: FounderIntelligenceProfile,
): {
  headline: string;
  styleLine: string;
  weakestDim?: string;
  permissionNote?: string;
  hrefHint: "growth" | "profile";
} {
  const weakest = [...profile.businessCapability].sort(
    (a, b) => a.score - b.score,
  )[0];
  return {
    headline: profile.personality.summary,
    styleLine: [
      profile.decisionStyle.riskPreference !== "unknown"
        ? STYLE_SUMMARY[profile.decisionStyle.riskPreference]
        : null,
      profile.decisionStyle.aiStance !== "unknown"
        ? STANCE_SUMMARY[profile.decisionStyle.aiStance]
        : null,
      typeof profile.executionAbility.recentCompletionRate === "number"
        ? `执行完成率 ${Math.round(profile.executionAbility.recentCompletionRate * 100)}%`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    weakestDim: weakest ? `${weakest.dim}:${weakest.score}` : undefined,
    permissionNote: !profile.permissions.contributeToIndustryModel
      ? "行业模型贡献已关闭"
      : undefined,
    hrefHint: "growth",
  };
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
