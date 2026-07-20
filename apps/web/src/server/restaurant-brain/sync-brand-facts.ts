/**
 * 已结构化的定位/咨询事实 → Restaurant Brain DNA
 * 不从聊天现抽；只吃 finalize 后的字段。
 */

import type { DnaSource } from "@mealkey/restaurant-brain";
import type { PrismaClient } from "@/generated/prisma";
import { createRestaurantBrainService } from "./prisma-service";

export type BrandFactsInput = {
  projectId: string;
  ownerId: string;
  source: DnaSource;
  confidence: number;
  brandName?: string | null;
  category?: string | null;
  positioning?: string | null;
  targetCustomers?: string | null;
  priceRange?: string | null;
  differentiation?: string | null;
};

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * 将品牌事实批量提议写入 Brain（confidence 门禁由 proposeAndMaybeMergeDna 处理）
 */
export async function syncBrandFactsToRestaurantBrain(
  prisma: PrismaClient,
  input: BrandFactsInput,
): Promise<{
  patches: number;
  accepted: number;
  restaurantId: string;
}> {
  const confidence = Math.max(
    0,
    Math.min(1, Number.isFinite(input.confidence) ? input.confidence : 0.5),
  );
  const at = new Date().toISOString();
  const brain = createRestaurantBrainService(prisma);
  const snapshot = await brain.ensureByProject({
    projectId: input.projectId,
    ownerId: input.ownerId,
  });
  const restaurantId = snapshot.restaurant.id;

  const positioning = asText(input.positioning);
  const targetCustomer = asText(input.targetCustomers);
  const differentiation = asText(input.differentiation);
  const category = asText(input.category);
  const priceRange = asText(input.priceRange);
  const brandName = asText(input.brandName);

  const profilePatch: {
    category?: string;
    priceRange?: string;
  } = {};
  if (category) profilePatch.category = category.slice(0, 40);
  if (priceRange) profilePatch.priceRange = priceRange.slice(0, 40);

  if (Object.keys(profilePatch).length > 0 || brandName) {
    await prisma.$transaction([
      ...(Object.keys(profilePatch).length > 0
        ? [
            prisma.restaurantProfile.update({
              where: { restaurantId },
              data: profilePatch,
            }),
          ]
        : []),
      ...(brandName
        ? [
            prisma.restaurant.update({
              where: { id: restaurantId },
              data: { name: brandName.slice(0, 80) },
            }),
          ]
        : []),
    ]);
  }

  const proposals: Array<{ key: string; value: string }> = [];
  if (positioning) proposals.push({ key: "positioning", value: positioning });
  if (targetCustomer)
    proposals.push({ key: "targetCustomer", value: targetCustomer });
  if (differentiation)
    proposals.push({ key: "differentiation", value: differentiation });

  let accepted = 0;
  for (const p of proposals) {
    const result = await brain.proposeAndMaybeMergeDna({
      kind: "dna_patch_propose",
      projectId: input.projectId,
      layer: "brand",
      key: p.key,
      value: p.value,
      confidence,
      source: input.source,
      at,
    });
    if (result.accepted) accepted += 1;
  }

  return { patches: proposals.length, accepted, restaurantId };
}
