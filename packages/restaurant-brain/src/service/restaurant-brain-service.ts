import type { RestaurantContext } from "../context/context-types";
import type { DecisionRecord, LearningRecord } from "../domain/types";
import type { BrainEvent } from "../events/brain-event";

/**
 * 所有 Agent 调用入口（冻结）
 * restaurantId V1 可用 projectId（ensure 后对齐 Restaurant.id）
 */
export interface RestaurantBrainService {
  getRestaurantContext(restaurantId: string): Promise<RestaurantContext>;
  updateKnowledge(event: BrainEvent): Promise<void>;
  recordDecision(decision: DecisionRecord): Promise<void>;
  learn(learning: LearningRecord): Promise<void>;
}
