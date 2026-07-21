/**
 * Restaurant Brain — web 编排入口（兼容旧函数式 API）
 * 实现见 prisma-service.ts
 */

import type { AgentRestaurantContext, DnaPatchPropose } from "@mealkey/restaurant-brain";
import type { RestaurantBrainContextSlice } from "@mealkey/agent-sdk";
import type { PrismaClient } from "@/generated/prisma";
import {
  createRestaurantBrainService,
  PrismaRestaurantBrainService,
} from "./prisma-service";

export { PrismaRestaurantBrainService, createRestaurantBrainService };

export function toRestaurantBrainContextSlice(
  ctx: AgentRestaurantContext & { restaurantId?: string },
  restaurantId: string,
): RestaurantBrainContextSlice {
  return {
    restaurantId,
    profile: {
      name: ctx.identity.name,
      category: ctx.identity.category,
      stage: ctx.identity.stage,
      storeCount: ctx.identity.storeCount,
      city: ctx.identity.city ?? null,
    },
    capability: {
      overall: ctx.capability.scores.overall,
      organization: ctx.capability.scores.organization,
      finance: ctx.capability.scores.finance,
      confidence: ctx.capability.confidence,
    },
    recentDecisions: ctx.history.recentDecisions.map((d) => ({
      question: d.question,
      chosen: d.chosen,
      actual: d.actual,
    })),
    learnings: ctx.learning.patterns.map((l) => ({
      pattern: l.pattern,
      insight: l.insight,
    })),
    priorBlock: ctx.priorBlock,
  };
}

export async function ensureRestaurantBrain(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string },
) {
  return createRestaurantBrainService(prisma).ensureByProject(input);
}

export async function loadRestaurantBrainContext(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string },
): Promise<AgentRestaurantContext> {
  return createRestaurantBrainService(prisma).loadAgentContext(input);
}

export async function loadRestaurantBrainSlice(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string },
): Promise<RestaurantBrainContextSlice | null> {
  try {
    const brain = createRestaurantBrainService(prisma);
    const snapshot = await brain.ensureByProject(input);
    const ctx = await brain.loadAgentContext(input);
    return toRestaurantBrainContextSlice(ctx, snapshot.restaurant.id);
  } catch (error) {
    console.warn("Restaurant Brain context load failed:", error);
    return null;
  }
}

export async function linkDecisionToRestaurantBrain(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    mkDecisionId: string;
    type: string;
    question: string;
    judgementSummary?: string;
  },
): Promise<void> {
  await createRestaurantBrainService(prisma).linkFromMkDecision(input);
}

export async function proposeAndMaybeMergeDna(
  prisma: PrismaClient,
  patch: DnaPatchPropose,
): Promise<{ accepted: boolean; completenessOverall: number }> {
  return createRestaurantBrainService(prisma).proposeAndMaybeMergeDna(patch);
}

export async function seedExpansionScenarioFacts(
  prisma: PrismaClient,
  input: { projectId: string; ownerId: string },
): Promise<{ restaurantId: string }> {
  const brain = createRestaurantBrainService(prisma);
  const snap = await brain.ensureByProject(input);
  await brain.seedExpansionScenarioFacts(snap.restaurant.id);
  return { restaurantId: snap.restaurant.id };
}

export { syncBrandFactsToRestaurantBrain } from "./sync-brand-facts";
export type { BrandFactsInput } from "./sync-brand-facts";
export {
  syncBusinessFactsToRestaurantBrain,
  syncMarketFactsToRestaurantBrain,
  syncEquityFactsToRestaurantBrain,
  parseAvgTicket,
  parseUnitEconomics,
  parseStoreCount,
} from "./sync-business-facts";
export type {
  BusinessFactsInput,
  MarketFactsInput,
  EquityFactsInput,
} from "./sync-business-facts";
