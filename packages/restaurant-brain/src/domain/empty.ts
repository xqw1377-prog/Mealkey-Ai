import { computeDataCompleteness } from "./completeness";
import type {
  BrandProfile,
  BusinessProfile,
  CapabilityProfile,
  EvolutionState,
  FounderProfile,
  Restaurant,
  RestaurantBrainSnapshot,
  RestaurantProfile,
  RestaurantStage,
} from "./types";

export function emptyProfile(
  restaurantId: string,
  partial?: Partial<RestaurantProfile>,
): RestaurantProfile {
  return {
    restaurantId,
    category: partial?.category ?? "",
    stage: partial?.stage ?? "unknown",
    city: partial?.city,
    storeCount: partial?.storeCount ?? 1,
    priceRange: partial?.priceRange,
    description: partial?.description,
  };
}

export function emptyBrand(restaurantId: string): BrandProfile {
  return { restaurantId, confidence: 0.5 };
}

export function emptyBusiness(restaurantId: string): BusinessProfile {
  return { restaurantId };
}

export function emptyCapability(restaurantId: string): CapabilityProfile {
  return {
    restaurantId,
    strategyScore: 0,
    marketScore: 0,
    productScore: 0,
    financeScore: 0,
    operationScore: 0,
    organizationScore: 0,
    overallScore: 0,
    confidence: 0,
  };
}

export function emptyFounder(restaurantId: string): FounderProfile {
  return { restaurantId };
}

export function emptyEvolution(restaurantId: string): EvolutionState {
  return {
    restaurantId,
    understandingScore: 0,
    dataCompleteness: 0,
    decisionCount: 0,
    learningCount: 0,
    actionCount: 0,
  };
}

export function createEmptyBrain(input: {
  projectId: string;
  ownerId: string;
  displayName: string;
  brandName?: string;
  category?: string;
  stage?: RestaurantStage;
  location?: string;
  storeCount?: number;
  restaurantId?: string;
  now?: string;
}): RestaurantBrainSnapshot {
  const now = input.now ?? new Date().toISOString();
  const restaurantId = input.restaurantId ?? input.projectId;
  const restaurant: Restaurant = {
    id: restaurantId,
    projectId: input.projectId,
    ownerId: input.ownerId,
    name: input.displayName,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const snapshot: RestaurantBrainSnapshot = {
    restaurant,
    profile: emptyProfile(restaurantId, {
      category: input.category ?? "",
      stage: input.stage ?? "unknown",
      city: input.location,
      storeCount: input.storeCount ?? 1,
    }),
    brand: emptyBrand(restaurantId),
    business: emptyBusiness(restaurantId),
    capability: emptyCapability(restaurantId),
    founder: emptyFounder(restaurantId),
    recentDecisions: [],
    recentActions: [],
    recentLearnings: [],
    evolution: emptyEvolution(restaurantId),
  };

  const completeness = computeDataCompleteness(snapshot);
  snapshot.evolution = {
    ...snapshot.evolution,
    dataCompleteness: completeness,
    understandingScore: completeness,
  };
  return snapshot;
}

/** 薄启动：只填身份壳 */
export function thinStartBrand(input: {
  brandName?: string;
  category?: string;
  positioning?: string;
  targetCustomer?: string;
  priceRange?: string;
}): { profile: Partial<RestaurantProfile>; brand: Partial<BrandProfile> } {
  return {
    profile: {
      category: input.category ?? "",
      priceRange: input.priceRange,
    },
    brand: {
      positioning: input.positioning,
      targetCustomer: input.targetCustomer,
      confidence: 0.55,
    },
  };
}

/** @deprecated */
export function emptyDna() {
  return { version: "v1" as const, brand: {}, business: {}, market: {}, organization: {}, founder: {}, completeness: { overall: 0, byLayer: { brand: 0, business: 0, market: 0, organization: 0, founder: 0 }, deltaToday: 0, updatedAt: new Date().toISOString() } };
}
export function emptyBusinessContext(restaurantId: string) {
  return emptyBusiness(restaurantId);
}
export function emptyCapabilityProfile(restaurantId: string) {
  return emptyCapability(restaurantId);
}
export function emptyEvolutionState(restaurantId: string) {
  return emptyEvolution(restaurantId);
}
