/**
 * Capability Runtime — 四大能力 Agent 调度入口
 *
 * strategy_meeting：Cognition → Decision → Execution → Growth
 * cognition_only / decision_pressure / execution_track / growth_review：单能力或续跑
 */

import type {
  ActionPlan,
  CapabilityMode,
  CapabilityRequest,
  CapabilityRunResult,
  DecisionPack,
  GrowthDelta,
  InsightPack,
} from "../contracts/capability";
import type {
  EvidencePack,
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
  FounderMemoryWrite,
  FounderMission,
  FounderMissionRequest,
} from "../contracts";
import type { ValidationTask } from "../contracts/validation";
import { buildFounderMission } from "../mission";
import { buildOsKernelContext, capabilityRequestFromMissionRequest } from "./kernel";
import { cognitionAgent } from "./cognition/agent";
import { decisionAgent } from "./decision/agent";
import { executionAgent } from "./execution/agent";
import { growthAgent } from "./growth/agent";

export interface CapabilityCycleResult {
  mode: CapabilityMode;
  mission: FounderMission;
  cognition?: CapabilityRunResult;
  decision?: CapabilityRunResult;
  execution?: CapabilityRunResult;
  growth?: CapabilityRunResult;
  /** 兼容旧 FounderRuntimeResult 字段 */
  decisions: FounderDecision[];
  meeting?: FounderMeeting;
  finalDecision?: FounderFinalDecision;
  evidencePack: EvidencePack;
  insightPack?: InsightPack;
  decisionPack?: DecisionPack;
  actionPlan?: ActionPlan;
  growthDelta?: GrowthDelta;
  validationTask?: ValidationTask;
  memoryWrites: FounderMemoryWrite[];
}

/**
 * 跑能力周期。
 */
export async function runCapabilityCycle(
  request: CapabilityRequest,
): Promise<CapabilityCycleResult> {
  const kernel = buildOsKernelContext(request);
  let cognition: CapabilityRunResult | undefined;
  let decision: CapabilityRunResult | undefined;
  let execution: CapabilityRunResult | undefined;
  let growth: CapabilityRunResult | undefined;
  let memoryWrites: FounderMemoryWrite[] = [];

  const needCognition =
    request.mode === "strategy_meeting" || request.mode === "cognition_only";
  const needDecision =
    request.mode === "strategy_meeting" || request.mode === "decision_pressure";
  const needExecution =
    request.mode === "strategy_meeting" || request.mode === "execution_track";
  const needGrowth =
    request.mode === "strategy_meeting" || request.mode === "growth_review";

  if (needCognition) {
    cognition = await cognitionAgent.run(request, kernel);
    kernel.insightPack = cognition.insightPack;
    kernel.evidencePack = cognition.evidencePack;
    kernel.seatDecisions = cognition.seatDecisions;
    memoryWrites = [...memoryWrites, ...(cognition.memoryWrites ?? [])];
  } else if (
    request.mode === "decision_pressure" ||
    request.mode === "execution_track" ||
    request.mode === "growth_review"
  ) {
    kernel.insightPack = request.priorInsightPack;
    kernel.evidencePack = request.priorEvidencePack;
    kernel.seatDecisions = request.priorSeatDecisions;
    kernel.decisionPack = request.priorDecisionPack;
    kernel.decisionContract = request.priorDecisionContract;
    kernel.actionPlan = request.priorActionPlan;
  }

  if (needDecision) {
    decision = await decisionAgent.run(request, kernel);
    kernel.decisionPack = decision.decisionPack;
    kernel.debateSession = decision.debateSession;
    kernel.decisionContract = decision.decisionContract;
    if (decision.evidencePack) {
      kernel.evidencePack = decision.evidencePack;
    }
    memoryWrites = [...memoryWrites, ...(decision.memoryWrites ?? [])];
  }

  if (needExecution && (kernel.decisionPack || kernel.decisionContract)) {
    execution = await executionAgent.run(request, kernel);
    kernel.actionPlan = execution.actionPlan;
    memoryWrites = [...memoryWrites, ...(execution.memoryWrites ?? [])];
  }

  if (needGrowth) {
    growth = await growthAgent.run(request, kernel);
    kernel.growthDelta = growth.growthDelta;
    memoryWrites = [...memoryWrites, ...(growth.memoryWrites ?? [])];
  }

  return {
    mode: request.mode,
    mission: request.mission,
    cognition,
    decision,
    execution,
    growth,
    decisions: decision?.seatDecisions ?? cognition?.seatDecisions ?? [],
    meeting: decision?.meeting,
    finalDecision: decision?.finalDecision,
    evidencePack:
      decision?.evidencePack ||
      cognition?.evidencePack || { nodes: [], relations: [] },
    insightPack: cognition?.insightPack ?? request.priorInsightPack,
    decisionPack: decision?.decisionPack ?? request.priorDecisionPack,
    actionPlan: execution?.actionPlan ?? request.priorActionPlan,
    growthDelta: growth?.growthDelta,
    validationTask: execution?.validationTask,
    memoryWrites,
  };
}

/** 从旧 MissionRequest 启动（策略会议默认） */
export async function runCapabilityCycleFromMissionRequest(input: {
  request: FounderMissionRequest;
  mode?: CapabilityMode;
  requiredAgents?: FounderMission["requiredAgents"];
  priorCapabilityScores?: CapabilityRequest["priorCapabilityScores"];
}): Promise<CapabilityCycleResult> {
  const mission = buildFounderMission(input.request);
  if (input.requiredAgents?.length) {
    mission.requiredAgents = input.requiredAgents;
  }
  const capabilityRequest = capabilityRequestFromMissionRequest(
    input.request,
    mission,
    input.mode ?? "strategy_meeting",
  );
  if (input.priorCapabilityScores?.length) {
    capabilityRequest.priorCapabilityScores = input.priorCapabilityScores;
  }
  return runCapabilityCycle(capabilityRequest);
}
