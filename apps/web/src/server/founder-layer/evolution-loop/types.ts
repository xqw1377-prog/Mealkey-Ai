/**
 * Learning & Evolution Loop V1 — 契约
 * 权威：docs/MEALKEY_LEARNING_EVOLUTION_LOOP_V1.md
 */

export const PROFILE_EVOLUTION_LOOP_KEY = "evolutionLoop" as const;

export type EvolutionSourceV1 =
  | "skill_drill"
  | "goal_compile"
  | "decision_feedback"
  | "execution_outcome";

export type RolePerspectiveV1 =
  | "owner"
  | "manager"
  | "server"
  | "chef"
  | "unknown";

/** Goal Compiler 薄调度车道 */
export type DispatchLaneV1 =
  | "skill"
  | "business_capability"
  | "council"
  | "tool_agent"
  | "reflect";

export type OutcomeHintV1 =
  | "improved"
  | "neutral"
  | "worsened"
  | "unknown";

export type EvolutionEventV1 = {
  eventId: string;
  at: string;
  source: EvolutionSourceV1;
  rolePerspective: RolePerspectiveV1;
  scenarioKey: string;
  dispatchLane: DispatchLaneV1;
  outcomeHint: OutcomeHintV1;
  skillRef?: string;
  score?: number;
  lesson?: string;
  permissionOk: boolean;
};

export type EvolutionLoopAggregateV1 = {
  totalEvents: number;
  skillDrillCount: number;
  compileCount: number;
  byRole: Partial<Record<RolePerspectiveV1, number>>;
  recentLessons: string[];
  lastDispatchLane?: DispatchLaneV1;
  updatedAt: string;
};

export type EvolutionLoopStoreV1 = {
  version: "v1";
  events: EvolutionEventV1[];
  aggregate: EvolutionLoopAggregateV1;
};

export const MAX_EVOLUTION_EVENTS = 80;
export const MAX_RECENT_LESSONS = 8;
