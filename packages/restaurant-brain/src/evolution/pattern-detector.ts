import type {
  CapabilityProfile,
  DecisionRecord,
  LearningRecord,
} from "../domain/types";

export type DetectedPattern = Omit<
  LearningRecord,
  "id" | "createdAt" | "updatedAt" | "appliedCount"
> & { appliedCount?: number };

export function detectExpansionRiskPattern(input: {
  restaurantId: string;
  decisions: DecisionRecord[];
  capability: CapabilityProfile;
}): DetectedPattern | null {
  const expansion = input.decisions.filter((d) =>
    /扩张|开店|加盟|第[二三四]家|新店/.test(d.question),
  );
  if (expansion.length < 2) return null;

  const failed = expansion.filter((d) => {
    const actual = JSON.stringify(d.actualOutcome ?? "");
    return /亏|失败|不及预期|关店|延期回本/.test(actual);
  });
  if (failed.length < 1) return null;

  const org = input.capability.organizationScore;
  if (input.capability.confidence < 0.25 || org <= 0 || org >= 70) {
    return null;
  }

  const failRate = failed.length / expansion.length;
  return {
    restaurantId: input.restaurantId,
    sourceType: "pattern",
    sourceId: failed[0]?.id,
    pattern: "Expansion_Risk_Pattern",
    insight: `组织能力 ${org} < 70 时扩张类决策易失败（样本 ${failed.length}/${expansion.length}）。建议禁止快速扩张，先补组织复制。`,
    confidence: Math.min(0.9, 0.5 + failRate * 0.4),
    appliedCount: 0,
  };
}
