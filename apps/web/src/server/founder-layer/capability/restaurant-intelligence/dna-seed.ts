/**
 * RIP 确认 → 经营决策习惯种子 + Founder DNA + 经营事实包厚写（R3）
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

type DnaProposal = {
  layer: "brand" | "business" | "market" | "organization" | "founder";
  key: string;
  value: string;
  confidence: number;
};

export function buildRipFactProposals(
  snapshot: RestaurantIntelligenceSnapshotV1,
): DnaProposal[] {
  const proposals: DnaProposal[] = [];
  const basic = snapshot.basic;
  const customer = snapshot.customer;
  const gap = snapshot.cognitionGap;

  if (basic.stageLabel?.trim()) {
    proposals.push({
      layer: "business",
      key: "stage",
      value: basic.stageLabel.trim().slice(0, 80),
      confidence: 0.7,
    });
  }

  const loc = [basic.city, basic.districtOrArea].filter(Boolean).join(" · ");
  if (loc) {
    proposals.push({
      layer: "business",
      key: "location",
      value: loc.slice(0, 80),
      confidence: 0.75,
    });
  }

  if (basic.competitionHint && !/未知/.test(basic.competitionHint)) {
    proposals.push({
      layer: "market",
      key: "competitionHint",
      value: basic.competitionHint.slice(0, 120),
      confidence: 0.55,
    });
  }

  if (!customer.evidenceInsufficient) {
    if (customer.positiveKeywords.length > 0) {
      proposals.push({
        layer: "market",
        key: "customerPraise",
        value: customer.positiveKeywords.slice(0, 5).join("、").slice(0, 120),
        confidence: 0.6,
      });
    }
    if (customer.watchouts.length > 0) {
      proposals.push({
        layer: "market",
        key: "customerWatchout",
        value: customer.watchouts.slice(0, 5).join("、").slice(0, 120),
        confidence: 0.6,
      });
    }
  } else {
    proposals.push({
      layer: "market",
      key: "evidenceGap",
      value: "顾客侧外部证据不足，决策须先补一手事实",
      confidence: 0.65,
    });
  }

  if (gap?.founderClaim?.trim()) {
    proposals.push({
      layer: "founder",
      key: "strength",
      value: gap.founderClaim.trim().slice(0, 80),
      confidence: 0.58,
    });
  }

  if (
    gap &&
    !customer.evidenceInsufficient &&
    gap.summaryLine.includes("不一致")
  ) {
    proposals.push({
      layer: "founder",
      key: "blindSpot",
      value: `自认「${gap.founderClaim}」与顾客高频信号可能不一致`.slice(0, 120),
      confidence: 0.55,
    });
  }

  const topAlert = snapshot.alerts[0]?.line?.trim();
  if (topAlert) {
    proposals.push({
      layer: "business",
      key: "primaryAlert",
      value: topAlert.slice(0, 140),
      confidence: 0.58,
    });
  }

  // 显式未知项 → Brain 知道「不知道什么」
  const unknowns: string[] = [];
  if (!basic.avgTicketHint || basic.avgTicketHint === "未知") {
    unknowns.push("真实客单");
  }
  if (customer.evidenceInsufficient) unknowns.push("顾客复购结构");
  if (/扩张|复制|第二/.test(basic.stageLabel || "")) {
    unknowns.push("店长复制能力");
    unknowns.push("单店盈利模型");
  }
  if (unknowns.length > 0) {
    proposals.push({
      layer: "business",
      key: "knownUnknowns",
      value: unknowns.slice(0, 5).join("、"),
      confidence: 0.72,
    });
  }

  return proposals.slice(0, 12);
}

/**
 * 确认后经营事实包投影：品类/阶段/区位/顾客信号/未知项 + Founder 种子。
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
      targetCustomers: snapshot.customer.evidenceInsufficient
        ? undefined
        : snapshot.customer.positiveKeywords.slice(0, 3).join("、") || undefined,
      differentiation: snapshot.cognitionGap?.founderClaim,
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

    const at = new Date().toISOString();
    for (const p of buildRipFactProposals(snapshot)) {
      const r = await brain.proposeAndMaybeMergeDna({
        kind: "dna_patch_propose",
        projectId: input.projectId,
        layer: p.layer,
        key: p.key,
        value: p.value,
        confidence: p.confidence,
        source: "onboarding",
        at,
      });
      if (r.accepted) accepted += 1;
    }
  } catch {
    // ignore
  }

  return { accepted };
}

export { readHabitFromProfile };
