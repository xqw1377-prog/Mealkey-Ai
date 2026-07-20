/**
 * RIP 确认 → 经营决策习惯种子 + Founder DNA 软投影（R3）
 * 对外文案：「经营决策习惯」；禁止「决策人格」。
 */

import type { PrismaClient } from "@/generated/prisma";
import {
  PROFILE_HABIT_KEY,
  type OperatingDecisionHabitV1,
} from "@/server/founder-layer/contracts/decision-habit";
import type { RestaurantIntelligenceSnapshotV1 } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import { readHabitFromProfile } from "@/server/founder-layer/capability/decision-intelligence/learning";
import { createRestaurantBrainService } from "@/server/restaurant-brain/service";
import { syncBrandFactsToRestaurantBrain } from "@/server/restaurant-brain/sync-brand-facts";

export function buildHabitSeedFromRip(input: {
  projectId: string;
  snapshot: RestaurantIntelligenceSnapshotV1;
  previous?: OperatingDecisionHabitV1 | null;
  confirmedAction: "confirm" | "reject";
}): OperatingDecisionHabitV1 {
  const traits = new Set(input.previous?.traits || []);
  const gap = input.snapshot.cognitionGap;

  if (input.confirmedAction === "confirm") {
    traits.add("愿意建立经营认知");
  }
  if (input.snapshot.status === "revised" || gap?.founderClaim) {
    traits.add("愿意修正系统理解");
  }
  if (gap && !input.snapshot.customer.evidenceInsufficient) {
    traits.add("对照顾客信号看自己");
  }
  if (input.snapshot.basic.stageLabel?.includes("扩张")) {
    traits.add("扩张导向");
  }

  const traitList = [...traits].slice(0, 5);
  const claim = gap?.founderClaim;
  const reminder = claim
    ? `系统逐渐发现你的经营特点：${traitList.join("、") || "仍在观察"}。你自认「${claim}」；${
        input.snapshot.customer.evidenceInsufficient
          ? "顾客侧证据仍不足，先记作种子，不写死结论。"
          : `顾客侧多见「${input.snapshot.customer.positiveKeywords.slice(0, 2).join("、") || "待核实"}」。`
      }`
    : `系统逐渐发现你的经营特点：${traitList.join("、") || "仍在观察"}。第一版经营画像已确认，后续决策会对照这层理解。`;

  return {
    schemaVersion: 1,
    projectId: input.projectId,
    traits: traitList,
    reminder,
    lastLesson: gap?.summaryLine?.slice(0, 160),
    sampleCount: (input.previous?.sampleCount || 0) + 1,
    updatedAt: new Date().toISOString(),
    sourceDecisionIds: [
      ...(input.previous?.sourceDecisionIds || []),
      `rip:${input.snapshot.snapshotId}`,
    ].slice(-8),
  };
}

export function mergeHabitSeedIntoProfile(
  profile: Record<string, unknown>,
  habit: OperatingDecisionHabitV1,
): Record<string, unknown> {
  return {
    ...profile,
    [PROFILE_HABIT_KEY]: habit,
  };
}

/**
 * 确认后安全字段投影：品类/阶段提示 + Founder strength/blindSpot 种子。
 * 失败不抛——不得阻断进驾驶舱。
 */
export async function syncConfirmedRipToBrain(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    snapshot: RestaurantIntelligenceSnapshotV1;
  },
): Promise<{ accepted: number }> {
  let accepted = 0;
  const { snapshot } = input;

  try {
    await syncBrandFactsToRestaurantBrain(prisma, {
      projectId: input.projectId,
      ownerId: input.ownerId,
      source: "onboarding",
      confidence: 0.62,
      brandName: snapshot.basic.brandName,
      category: snapshot.basic.category,
    });
  } catch {
    // ignore
  }

  try {
    const brain = createRestaurantBrainService(prisma);
    await brain.ensureByProject({
      projectId: input.projectId,
      ownerId: input.ownerId,
    });

    const claim = snapshot.cognitionGap?.founderClaim?.trim();
    if (claim) {
      const r = await brain.proposeAndMaybeMergeDna({
        kind: "dna_patch_propose",
        projectId: input.projectId,
        layer: "founder",
        key: "strength",
        value: claim.slice(0, 80),
        confidence: 0.58,
        source: "onboarding",
        at: new Date().toISOString(),
      });
      if (r.accepted) accepted += 1;
    }

    if (
      snapshot.cognitionGap &&
      !snapshot.customer.evidenceInsufficient &&
      snapshot.cognitionGap.summaryLine.includes("不一致")
    ) {
      const blind = `自认「${snapshot.cognitionGap.founderClaim}」与顾客高频信号可能不一致`;
      const r = await brain.proposeAndMaybeMergeDna({
        kind: "dna_patch_propose",
        projectId: input.projectId,
        layer: "founder",
        key: "blindSpot",
        value: blind.slice(0, 120),
        confidence: 0.55,
        source: "onboarding",
        at: new Date().toISOString(),
      });
      if (r.accepted) accepted += 1;
    }
  } catch {
    // ignore
  }

  return { accepted };
}

export { readHabitFromProfile };
