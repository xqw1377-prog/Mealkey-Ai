/**
 * Growth Runtime 读模型 — 从 profile 投影快照（非顾问席）
 */

import type {
  CognitiveGap,
  DecisionPattern,
  DecisionQualityScore,
  FounderCapabilityScore,
  GrowthEvent,
  GrowthPathItem,
  GrowthRuntimeSnapshot,
  GrowthTask,
} from "../../contracts/growth-runtime";
import type { CapabilityScore } from "../../contracts/capability";
import { buildGrowthPath } from "./decision-pattern";
import { mapFourToEight } from "./eight-dim";
import { listGrowthEvents } from "./events";
import { listGrowthTasks } from "./tasks";

export function buildGrowthRuntimeSnapshot(
  profile: Record<string, unknown>,
): GrowthRuntimeSnapshot {
  const cognitiveGap =
    profile.lastCognitiveGap && typeof profile.lastCognitiveGap === "object"
      ? (profile.lastCognitiveGap as CognitiveGap)
      : null;

  const lastDecisionPattern =
    profile.lastDecisionPattern && typeof profile.lastDecisionPattern === "object"
      ? (profile.lastDecisionPattern as DecisionPattern)
      : null;

  const recentPatterns = Array.isArray(profile.decisionPatterns)
    ? (profile.decisionPatterns as DecisionPattern[]).slice(0, 8)
    : lastDecisionPattern
      ? [lastDecisionPattern]
      : [];

  const scores = Array.isArray(profile.lastCapabilityScores)
    ? (profile.lastCapabilityScores as CapabilityScore[])
    : [];
  const weakest = scores.length
    ? [...scores].sort((a, b) => a.score - b.score)[0]
    : null;

  let growthPath = Array.isArray(profile.lastGrowthPath)
    ? (profile.lastGrowthPath as GrowthPathItem[])
    : [];
  if (!growthPath.length && scores.length) {
    growthPath = buildGrowthPath({
      scores,
      stage: String(profile.stageLabel || profile.stage || ""),
      lastOutcome: lastDecisionPattern?.outcome,
    });
  }

  const eightDim = Array.isArray(profile.lastFounderCapabilities)
    ? (profile.lastFounderCapabilities as FounderCapabilityScore[])
    : scores.length
      ? mapFourToEight(scores)
      : [];

  const decisionQuality =
    profile.lastDecisionQuality &&
    typeof profile.lastDecisionQuality === "object"
      ? (profile.lastDecisionQuality as DecisionQualityScore)
      : null;

  return {
    cognitiveGap,
    lastDecisionPattern,
    recentPatterns,
    growthPath: growthPath.slice(0, 4),
    weakestLabel: weakest?.label,
    weakestScore: weakest?.score,
    eightDim,
    decisionQuality,
    growthEvents: listGrowthEvents(profile).slice(0, 12) as GrowthEvent[],
    growthTasks: listGrowthTasks(profile).slice(0, 8) as GrowthTask[],
  };
}
