import { readMemoryPermissions } from "../intelligence/permissions";
import { resolveDispatchLane } from "./dispatch";
import {
  appendEvolutionEvent,
  readEvolutionLoop,
  writeEvolutionLoopIntoProfile,
} from "./persist";
import type {
  DispatchLaneV1,
  EvolutionEventV1,
  OutcomeHintV1,
  RolePerspectiveV1,
} from "./types";

function newEventId() {
  return `evo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function permissionOk(profile: Record<string, unknown>): boolean {
  const p = readMemoryPermissions(profile);
  return Boolean(p.saveExperience || p.useForPersonalGrowth);
}

export function recordSkillEvolution(
  profile: Record<string, unknown>,
  input: {
    role: RolePerspectiveV1;
    drillId: string;
    skillKey?: string;
    score: number;
    lesson: string;
    scenarioKey?: string;
  },
): Record<string, unknown> {
  const ok = permissionOk(profile);
  const event: EvolutionEventV1 = {
    eventId: newEventId(),
    at: new Date().toISOString(),
    source: "skill_drill",
    rolePerspective: input.role,
    scenarioKey: input.scenarioKey ?? "skill_drill",
    dispatchLane: "skill",
    outcomeHint:
      input.score >= 70 ? "improved" : input.score >= 45 ? "neutral" : "worsened",
    skillRef: input.skillKey ?? input.drillId,
    score: input.score,
    lesson: input.lesson.slice(0, 160),
    permissionOk: ok,
  };
  const next = appendEvolutionEvent(readEvolutionLoop(profile), event);
  return writeEvolutionLoopIntoProfile(profile, next);
}

export function recordCompileEvolution(
  profile: Record<string, unknown>,
  input: {
    utterance: string;
    dispatchLane?: DispatchLaneV1;
    rolePerspective?: RolePerspectiveV1;
    scenarioKey?: string;
    goalTitle?: string;
    assetCount?: number;
  },
): Record<string, unknown> {
  const ok = permissionOk(profile);
  const decided = resolveDispatchLane({ utterance: input.utterance });
  const lane = input.dispatchLane ?? decided.lane;
  const role = input.rolePerspective ?? decided.rolePerspective;
  const scenario = input.scenarioKey ?? decided.scenarioKey;

  const lesson = input.goalTitle
    ? `编译目标：${input.goalTitle.slice(0, 80)}`
    : `经营编译 · ${lane}`;

  const event: EvolutionEventV1 = {
    eventId: newEventId(),
    at: new Date().toISOString(),
    source: "goal_compile",
    rolePerspective: role,
    scenarioKey: scenario,
    dispatchLane: lane,
    outcomeHint:
      (input.assetCount ?? 0) > 0 ? ("improved" as OutcomeHintV1) : "unknown",
    lesson,
    permissionOk: ok,
  };
  const next = appendEvolutionEvent(readEvolutionLoop(profile), event);
  return writeEvolutionLoopIntoProfile(profile, next);
}
