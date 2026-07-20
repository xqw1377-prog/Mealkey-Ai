/**
 * BrainEvent — 进化事件流（冻结）
 * 权威：docs/MEALKEY_RESTAURANT_BRAIN_IMPLEMENTATION_BOUNDARY_V1.md
 */

export const BrainEventType = {
  DECISION_CREATED: "DECISION_CREATED",
  DECISION_COMPLETED: "DECISION_COMPLETED",
  ACTION_COMPLETED: "ACTION_COMPLETED",
  BUSINESS_CHANGED: "BUSINESS_CHANGED",
  CAPABILITY_CHANGED: "CAPABILITY_CHANGED",
  USER_INSIGHT: "USER_INSIGHT",
  AI_DISCOVERY: "AI_DISCOVERY",
  AI_INSIGHT_CREATED: "AI_INSIGHT_CREATED",
  LEARNING_CREATED: "LEARNING_CREATED",
  DNA_PATCH: "DNA_PATCH",
} as const;

export type BrainEventType =
  (typeof BrainEventType)[keyof typeof BrainEventType];

export type BrainEvent = {
  id?: string;
  restaurantId: string;
  type: BrainEventType;
  payload: Record<string, unknown>;
  /** meeting | exec | manual | agent | consulting | system */
  source: string;
  at: string;
};
