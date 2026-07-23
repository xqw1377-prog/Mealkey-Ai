import {
  MAX_EVOLUTION_EVENTS,
  MAX_RECENT_LESSONS,
  PROFILE_EVOLUTION_LOOP_KEY,
  type EvolutionEventV1,
  type EvolutionLoopAggregateV1,
  type EvolutionLoopStoreV1,
  type RolePerspectiveV1,
} from "./types";

function emptyAggregate(now = new Date().toISOString()): EvolutionLoopAggregateV1 {
  return {
    totalEvents: 0,
    skillDrillCount: 0,
    compileCount: 0,
    byRole: {},
    recentLessons: [],
    updatedAt: now,
  };
}

export function emptyEvolutionLoop(): EvolutionLoopStoreV1 {
  return {
    version: "v1",
    events: [],
    aggregate: emptyAggregate(),
  };
}

function isEvent(value: unknown): value is EvolutionEventV1 {
  if (!value || typeof value !== "object") return false;
  const e = value as EvolutionEventV1;
  return (
    typeof e.eventId === "string" &&
    typeof e.at === "string" &&
    typeof e.source === "string" &&
    typeof e.dispatchLane === "string"
  );
}

export function readEvolutionLoop(
  profile: Record<string, unknown>,
): EvolutionLoopStoreV1 {
  const raw = profile[PROFILE_EVOLUTION_LOOP_KEY];
  if (!raw || typeof raw !== "object") return emptyEvolutionLoop();
  const s = raw as Partial<EvolutionLoopStoreV1>;
  const events = Array.isArray(s.events) ? s.events.filter(isEvent) : [];
  return {
    version: "v1",
    events,
    aggregate:
      s.aggregate && typeof s.aggregate === "object"
        ? {
            totalEvents: Number(s.aggregate.totalEvents || events.length),
            skillDrillCount: Number(s.aggregate.skillDrillCount || 0),
            compileCount: Number(s.aggregate.compileCount || 0),
            byRole:
              s.aggregate.byRole && typeof s.aggregate.byRole === "object"
                ? s.aggregate.byRole
                : {},
            recentLessons: Array.isArray(s.aggregate.recentLessons)
              ? s.aggregate.recentLessons.filter((x) => typeof x === "string")
              : [],
            lastDispatchLane: s.aggregate.lastDispatchLane,
            updatedAt:
              typeof s.aggregate.updatedAt === "string"
                ? s.aggregate.updatedAt
                : new Date().toISOString(),
          }
        : recomputeAggregate(events),
  };
}

export function recomputeAggregate(
  events: EvolutionEventV1[],
): EvolutionLoopAggregateV1 {
  const byRole: Partial<Record<RolePerspectiveV1, number>> = {};
  let skillDrillCount = 0;
  let compileCount = 0;
  const lessons: string[] = [];
  for (const e of events) {
    byRole[e.rolePerspective] = (byRole[e.rolePerspective] ?? 0) + 1;
    if (e.source === "skill_drill") skillDrillCount += 1;
    if (e.source === "goal_compile") compileCount += 1;
    if (e.lesson) lessons.push(e.lesson);
  }
  return {
    totalEvents: events.length,
    skillDrillCount,
    compileCount,
    byRole,
    recentLessons: lessons.slice(-MAX_RECENT_LESSONS).reverse(),
    lastDispatchLane: events[events.length - 1]?.dispatchLane,
    updatedAt: new Date().toISOString(),
  };
}

export function appendEvolutionEvent(
  store: EvolutionLoopStoreV1,
  event: EvolutionEventV1,
): EvolutionLoopStoreV1 {
  if (!event.permissionOk) {
    return store;
  }
  const events = [...store.events, event].slice(-MAX_EVOLUTION_EVENTS);
  return {
    version: "v1",
    events,
    aggregate: recomputeAggregate(events),
  };
}

export function writeEvolutionLoopIntoProfile(
  profile: Record<string, unknown>,
  store: EvolutionLoopStoreV1,
): Record<string, unknown> {
  return {
    ...profile,
    [PROFILE_EVOLUTION_LOOP_KEY]: store,
  };
}
