/**
 * M-BIZ 咨询结构化 intake → Restaurant Brain BusinessProfile
 * 不从聊天自由文本抽数字；只解析 intake 约定字段。
 */

import { BrainEventType, type DnaSource } from "@mealkey/restaurant-brain";
import type { PrismaClient } from "@/generated/prisma";
import { createRestaurantBrainService } from "./prisma-service";

export type BusinessFactsInput = {
  projectId: string;
  ownerId: string;
  source: DnaSource;
  confidence: number;
  /** 如「人均 78」 */
  avgTicket?: string | null;
  /** 如「月流水 40 万，毛利约 55%」 */
  unitEconomics?: string | null;
  /** 如「直营 1 家」 */
  storeCount?: string | null;
  /** 模式一句话（可选） */
  businessModel?: string | null;
  brandName?: string | null;
};

export function parseAvgTicket(text: string): number | null {
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n < 10000 ? n : null;
}

export function parseUnitEconomics(text: string): {
  monthlyRevenue?: number;
  grossMargin?: number;
  netMargin?: number;
} {
  const out: {
    monthlyRevenue?: number;
    grossMargin?: number;
    netMargin?: number;
  } = {};
  const wan = text.match(
    /(?:月流水|流水|营收|收入)[^\d]{0,8}(\d+(?:\.\d+)?)\s*万/,
  );
  if (wan) {
    out.monthlyRevenue = Number(wan[1]) * 10000;
  } else {
    const yuan = text.match(/(?:月流水|流水|营收|收入)[^\d]{0,8}(\d{5,})/);
    if (yuan) out.monthlyRevenue = Number(yuan[1]);
  }

  const gm = text.match(/毛利[率]?[^\d%]{0,6}(\d+(?:\.\d+)?)\s*%/);
  if (gm) {
    const v = Number(gm[1]);
    if (v > 0 && v <= 100) out.grossMargin = v / 100;
  }

  const nm = text.match(/净利[率]?[^\d%]{0,6}(\d+(?:\.\d+)?)\s*%/);
  if (nm) {
    const v = Number(nm[1]);
    if (v > -50 && v <= 100) out.netMargin = v / 100;
  }

  return out;
}

export function parseStoreCount(text: string): number | null {
  const m = text.match(/(\d+)\s*家/);
  if (m) {
    const n = Number(m[1]);
    return n >= 1 && n <= 5000 ? n : null;
  }
  const bare = text.match(/^\s*(\d+)\s*$/);
  if (bare) {
    const n = Number(bare[1]);
    return n >= 1 && n <= 5000 ? n : null;
  }
  return null;
}

export async function syncBusinessFactsToRestaurantBrain(
  prisma: PrismaClient,
  input: BusinessFactsInput,
): Promise<{
  restaurantId: string;
  wrote: string[];
  dnaAccepted: boolean;
}> {
  const confidence = Math.max(
    0,
    Math.min(1, Number.isFinite(input.confidence) ? input.confidence : 0.5),
  );
  const brain = createRestaurantBrainService(prisma);
  const snapshot = await brain.ensureByProject({
    projectId: input.projectId,
    ownerId: input.ownerId,
  });
  const restaurantId = snapshot.restaurant.id;
  const wrote: string[] = [];

  const ticket = input.avgTicket ? parseAvgTicket(input.avgTicket) : null;
  const econ = input.unitEconomics
    ? parseUnitEconomics(input.unitEconomics)
    : {};
  const stores = input.storeCount ? parseStoreCount(input.storeCount) : null;
  const model =
    typeof input.businessModel === "string" && input.businessModel.trim()
      ? input.businessModel.trim().slice(0, 200)
      : null;
  const brandName =
    typeof input.brandName === "string" && input.brandName.trim()
      ? input.brandName.trim().slice(0, 80)
      : null;

  const bizData: {
    averageTicket?: number;
    monthlyRevenue?: number;
    grossMargin?: number;
    netMargin?: number;
    businessModel?: string;
  } = {};
  if (ticket != null) {
    bizData.averageTicket = ticket;
    wrote.push("averageTicket");
  }
  if (econ.monthlyRevenue != null) {
    bizData.monthlyRevenue = econ.monthlyRevenue;
    wrote.push("monthlyRevenue");
  }
  if (econ.grossMargin != null) {
    bizData.grossMargin = econ.grossMargin;
    wrote.push("grossMargin");
  }
  if (econ.netMargin != null) {
    bizData.netMargin = econ.netMargin;
    wrote.push("netMargin");
  }
  if (model) {
    bizData.businessModel = model;
    wrote.push("businessModel");
  }

  if (Object.keys(bizData).length > 0) {
    await prisma.businessProfile.update({
      where: { restaurantId },
      data: bizData,
    });
  }

  if (stores != null) {
    await prisma.restaurantProfile.update({
      where: { restaurantId },
      data: { storeCount: stores },
    });
    wrote.push("storeCount");
  }

  if (brandName) {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { name: brandName },
    });
    wrote.push("name");
  }

  let dnaAccepted = false;
  if (econ.grossMargin != null && confidence >= 0.45) {
    const result = await brain.proposeAndMaybeMergeDna({
      kind: "dna_patch_propose",
      projectId: input.projectId,
      layer: "business",
      key: "grossMargin",
      value: econ.grossMargin,
      confidence,
      source: input.source,
      at: new Date().toISOString(),
    });
    dnaAccepted = result.accepted;
  }

  if (wrote.length > 0) {
    await brain.recordEvent({
      restaurantId,
      type: BrainEventType.BUSINESS_CHANGED,
      payload: {
        wrote,
        avgTicket: input.avgTicket ?? null,
        unitEconomics: input.unitEconomics ?? null,
      },
      source: input.source,
      at: new Date().toISOString(),
    });
  }

  return { restaurantId, wrote, dnaAccepted };
}

/** M-MKT 咨询：薄写城市/品类/价格带/品牌风险 */
export type MarketFactsInput = {
  projectId: string;
  ownerId: string;
  source: DnaSource;
  confidence: number;
  city?: string | null;
  category?: string | null;
  ticketBand?: string | null;
  targetCustomer?: string | null;
  brandRisk?: string | null;
  sceneCut?: string | null;
  entryMode?: string | null;
};

export async function syncMarketFactsToRestaurantBrain(
  prisma: PrismaClient,
  input: MarketFactsInput,
): Promise<{ restaurantId: string; wrote: string[]; dnaAccepted: boolean }> {
  const confidence = Math.max(
    0,
    Math.min(1, Number.isFinite(input.confidence) ? input.confidence : 0.5),
  );
  const brain = createRestaurantBrainService(prisma);
  const snapshot = await brain.ensureByProject({
    projectId: input.projectId,
    ownerId: input.ownerId,
  });
  const restaurantId = snapshot.restaurant.id;
  const wrote: string[] = [];

  const city = input.city?.trim() || null;
  const category = input.category?.trim() || null;
  const priceRange = input.ticketBand?.trim() || null;

  const profileData: {
    city?: string;
    category?: string;
    priceRange?: string;
  } = {};
  if (city) {
    profileData.city = city.slice(0, 40);
    wrote.push("city");
  }
  if (category) {
    profileData.category = category.slice(0, 40);
    wrote.push("category");
  }
  if (priceRange) {
    profileData.priceRange = priceRange.slice(0, 40);
    wrote.push("priceRange");
  }

  if (Object.keys(profileData).length > 0) {
    await prisma.restaurantProfile.update({
      where: { restaurantId },
      data: profileData,
    });
  }

  let dnaAccepted = false;
  const at = new Date().toISOString();
  if (input.targetCustomer?.trim() && confidence >= 0.45) {
    const r = await brain.proposeAndMaybeMergeDna({
      kind: "dna_patch_propose",
      projectId: input.projectId,
      layer: "brand",
      key: "targetCustomer",
      value: input.targetCustomer.trim(),
      confidence,
      source: input.source,
      at,
    });
    if (r.accepted) {
      dnaAccepted = true;
      wrote.push("targetCustomer");
    }
  }
  if (input.brandRisk?.trim() && confidence >= 0.45) {
    const r = await brain.proposeAndMaybeMergeDna({
      kind: "dna_patch_propose",
      projectId: input.projectId,
      layer: "brand",
      key: "brandRisk",
      value: input.brandRisk.trim().slice(0, 200),
      confidence,
      source: input.source,
      at,
    });
    if (r.accepted) {
      dnaAccepted = true;
      wrote.push("brandRisk");
    }
  }
  if (input.sceneCut?.trim() && confidence >= 0.45) {
    const r = await brain.proposeAndMaybeMergeDna({
      kind: "dna_patch_propose",
      projectId: input.projectId,
      layer: "market",
      key: "sceneCut",
      value: input.sceneCut.trim().slice(0, 120),
      confidence,
      source: input.source,
      at,
    });
    if (r.accepted) {
      dnaAccepted = true;
      wrote.push("sceneCut");
    }
  }
  if (input.entryMode?.trim() && confidence >= 0.45) {
    const r = await brain.proposeAndMaybeMergeDna({
      kind: "dna_patch_propose",
      projectId: input.projectId,
      layer: "market",
      key: "entryMode",
      value: input.entryMode.trim().slice(0, 140),
      confidence,
      source: input.source,
      at,
    });
    if (r.accepted) {
      dnaAccepted = true;
      wrote.push("entryMode");
    }
  }

  return { restaurantId, wrote, dnaAccepted };
}

export type EquityFactsInput = {
  projectId: string;
  ownerId: string;
  source: DnaSource;
  confidence: number;
  controlFloor?: string | null;
  optionPool?: string | null;
  mustSign?: string | null;
  lockFirst?: string | null;
  oneLiner?: string | null;
};

/**
 * M-ED 股权治理确认 → Restaurant Brain 组织/经营层 DNA
 */
export async function syncEquityFactsToRestaurantBrain(
  prisma: PrismaClient,
  input: EquityFactsInput,
): Promise<{ restaurantId: string; wrote: string[]; accepted: number }> {
  const confidence = Math.max(
    0,
    Math.min(1, Number.isFinite(input.confidence) ? input.confidence : 0.5),
  );
  const brain = createRestaurantBrainService(prisma);
  const snapshot = await brain.ensureByProject({
    projectId: input.projectId,
    ownerId: input.ownerId,
  });
  const restaurantId = snapshot.restaurant.id;
  const wrote: string[] = [];
  let accepted = 0;
  const at = new Date().toISOString();

  const proposals: Array<{
    layer: "organization" | "founder" | "business";
    key: string;
    value: string;
  }> = [];

  if (input.controlFloor?.trim()) {
    proposals.push({
      layer: "organization",
      key: "controlFloor",
      value: input.controlFloor.trim().slice(0, 120),
    });
  }
  if (input.optionPool?.trim()) {
    proposals.push({
      layer: "organization",
      key: "optionPool",
      value: input.optionPool.trim().slice(0, 80),
    });
  }
  if (input.mustSign?.trim()) {
    proposals.push({
      layer: "organization",
      key: "mustSignDocs",
      value: input.mustSign.trim().slice(0, 160),
    });
  }
  if (input.lockFirst?.trim()) {
    proposals.push({
      layer: "organization",
      key: "governancePriority",
      value: input.lockFirst.trim().slice(0, 120),
    });
  }
  if (input.oneLiner?.trim()) {
    proposals.push({
      layer: "business",
      key: "equityDecision",
      value: input.oneLiner.trim().slice(0, 140),
    });
  }

  for (const p of proposals) {
    if (confidence < 0.45) continue;
    const r = await brain.proposeAndMaybeMergeDna({
      kind: "dna_patch_propose",
      projectId: input.projectId,
      layer: p.layer,
      key: p.key,
      value: p.value,
      confidence,
      source: input.source,
      at,
    });
    if (r.accepted) {
      accepted += 1;
      wrote.push(p.key);
    }
  }

  return { restaurantId, wrote, accepted };
}
