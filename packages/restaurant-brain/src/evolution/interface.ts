import type {
  EvolutionState,
  LearningRecord,
  RestaurantBrainSnapshot,
} from "../domain/types";
import type { DecisionMemoryValidated } from "../events/decision-event";
import type { DnaPatchPropose } from "../events/memory-event";
import type { MergeResult } from "./engine";

export type EvolutionTickResult = {
  snapshot: RestaurantBrainSnapshot;
  changed: boolean;
  newLearnings: LearningRecord[];
  evolution: EvolutionState;
};

export interface EvolutionEngine {
  mergePatch(
    snapshot: RestaurantBrainSnapshot,
    patch: DnaPatchPropose,
  ): MergeResult;

  applyValidatedDecision(
    snapshot: RestaurantBrainSnapshot,
    validated: DecisionMemoryValidated,
  ): EvolutionTickResult;

  recomputeEvolution(snapshot: RestaurantBrainSnapshot): EvolutionState;
}
