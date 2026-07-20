import { computeDataCompleteness } from "../domain/completeness";
import type {
  EvolutionState,
  RestaurantBrainSnapshot,
} from "../domain/types";

export function recomputeEvolution(
  snapshot: RestaurantBrainSnapshot,
  now = new Date().toISOString(),
): EvolutionState {
  const completeness = computeDataCompleteness(snapshot);
  const decisionBoost = Math.min(20, snapshot.evolution.decisionCount * 2);
  const learningBoost = Math.min(15, snapshot.evolution.learningCount * 3);
  const bizBoost = snapshot.business.monthlyRevenue != null ? 5 : 0;
  const capBoost = snapshot.capability.confidence >= 0.3 ? 5 : 0;

  const understanding = Math.min(
    100,
    Math.round(
      completeness * 0.7 + decisionBoost + learningBoost + bizBoost + capBoost,
    ),
  );

  return {
    id: snapshot.evolution.id,
    restaurantId: snapshot.restaurant.id,
    understandingScore: understanding,
    dataCompleteness: completeness,
    decisionCount: snapshot.evolution.decisionCount,
    learningCount: snapshot.evolution.learningCount,
    actionCount: snapshot.evolution.actionCount,
    lastEvolutionAt: now,
    updatedAt: now,
  };
}
