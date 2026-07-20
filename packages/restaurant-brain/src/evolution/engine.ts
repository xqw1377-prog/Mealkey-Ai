import type { RestaurantBrainSnapshot } from "../domain/types";
import type { DecisionMemoryValidated } from "../events/decision-event";
import type { DnaPatchPropose } from "../events/memory-event";

export type MergeResult = {
  snapshot: RestaurantBrainSnapshot;
  accepted: boolean;
  reason?: string;
};

/**
 * V1：DNA patch 映射到 Brand/Business 事实字段（非存答案）。
 */
export function mergeDnaPatch(
  snapshot: RestaurantBrainSnapshot,
  patch: DnaPatchPropose,
): MergeResult {
  if (patch.confidence < 0.45) {
    return { snapshot, accepted: false, reason: "low confidence" };
  }

  const next = JSON.parse(JSON.stringify(snapshot)) as RestaurantBrainSnapshot;
  const value = String(patch.value ?? "");

  if (patch.layer === "brand") {
    const map: Record<string, keyof typeof next.brand> = {
      positioning: "positioning",
      targetCustomer: "targetCustomer",
      consumptionScenario: "consumptionScene",
      brandPromise: "brandPromise",
      differentiation: "competitiveAdvantage",
      brandRisk: "brandRisk",
    };
    const field = map[patch.key];
    if (field) {
      (next.brand as Record<string, unknown>)[field] = value;
      next.brand.confidence = Math.max(next.brand.confidence, patch.confidence);
      return { snapshot: next, accepted: true };
    }
  }

  if (patch.layer === "business" && patch.key === "grossMargin") {
    const n = Number(patch.value);
    if (!Number.isNaN(n)) {
      next.business.grossMargin = n;
      return { snapshot: next, accepted: true };
    }
  }

  if (patch.layer === "founder") {
    if (patch.key === "decisionStyle") {
      next.founder.decisionStyle = value;
      return { snapshot: next, accepted: true };
    }
    if (patch.key === "riskPreference") {
      next.founder.riskPreference = value;
      return { snapshot: next, accepted: true };
    }
    if (patch.key === "strength" && value) {
      const strengths = [...(next.founder.strengths ?? [])];
      if (!strengths.includes(value)) strengths.push(value);
      next.founder.strengths = strengths.slice(-8);
      return { snapshot: next, accepted: true };
    }
    if (patch.key === "blindSpot" && value) {
      const spots = [...(next.founder.blindSpots ?? [])];
      if (!spots.includes(value)) spots.push(value);
      next.founder.blindSpots = spots.slice(-8);
      return { snapshot: next, accepted: true };
    }
  }

  return { snapshot, accepted: false, reason: "unmapped key" };
}

export function applyLearning(
  snapshot: RestaurantBrainSnapshot,
  validated: DecisionMemoryValidated,
): MergeResult {
  const next = JSON.parse(JSON.stringify(snapshot)) as RestaurantBrainSnapshot;
  if (validated.outcome === "invalidated") {
    const spots = [...(next.founder.blindSpots ?? [])];
    if (!spots.includes(validated.learning)) {
      spots.push(validated.learning);
    }
    next.founder.blindSpots = spots.slice(-8);
  }
  return { snapshot: next, accepted: true };
}
