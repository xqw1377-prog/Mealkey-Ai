import type {
  AdapterBuildInput,
  FounderAgentAdapter,
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
  FounderMemoryWrite,
  FounderMission,
  FounderMissionRequest,
} from "../contracts";
import {
  mBizFounderAdapter,
  mEdFounderAdapter,
  mMktFounderAdapter,
  mPntFounderAdapter,
} from "../adapters";
import { buildFounderFinalDecision } from "../decision";
import { buildFounderMeeting } from "../meeting";
import { buildFounderMemoryWrites } from "../memory";
import { buildFounderMission } from "../mission";

const DEFAULT_ADAPTERS: FounderAgentAdapter[] = [
  mMktFounderAdapter,
  mPntFounderAdapter,
  mBizFounderAdapter,
  mEdFounderAdapter,
];

export interface FounderRuntimeResult {
  mission: FounderMission;
  decisions: FounderDecision[];
  meeting: FounderMeeting;
  finalDecision: FounderFinalDecision;
  memoryWrites: FounderMemoryWrite[];
}

export interface RunFounderLoopInput {
  request: FounderMissionRequest;
  /** 可注入自定义 adapter；默认用四席样板 */
  adapters?: FounderAgentAdapter[];
  /** 覆盖 mission 选席；不传则用 mission engine 推断 */
  requiredAgents?: FounderMission["requiredAgents"];
}

async function runAdapterSafely(
  adapter: FounderAgentAdapter,
  buildInput: AdapterBuildInput,
): Promise<FounderDecision> {
  const request = adapter.buildRequest(buildInput);
  try {
    const raw = await adapter.invoke(request);
    return adapter.normalize(raw, {
      question: buildInput.mission.question,
      mission: buildInput.mission,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "adapter_failed";
    return {
      decisionId:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `founder-decision-degraded-${Date.now()}`,
      sourceAgent: adapter.agent,
      question: buildInput.mission.question,
      judgement: `本席暂时降级：${message}。先保留会议结构，后续用真实顾问结果替换。`,
      confidence: 0.4,
      evidence: [],
      risks: ["顾问调用失败，判断可信度下降"],
      nextSteps: ["稍后重试本席顾问", "先用其他席位意见推进会议"],
      stance: "conditional",
      metadata: {
        missionId: buildInput.mission.missionId,
        producedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Founder Layer 最小闭环：
 * Mission → 并行 Adapter → Meeting Engine → Decision Engine → Memory Writes
 *
 * 不落库、不改四 Agent 内核；只产出契约对象，供 Gateway / tRPC 再投影。
 */
export async function runFounderLoop(
  input: RunFounderLoopInput,
): Promise<FounderRuntimeResult> {
  const mission = buildFounderMission(input.request);
  if (input.requiredAgents?.length) {
    mission.requiredAgents = input.requiredAgents;
  }

  const adapters = (input.adapters ?? DEFAULT_ADAPTERS).filter((adapter) =>
    adapter.supports(mission),
  );

  const buildInput: AdapterBuildInput = {
    mission,
    companyContext: input.request.companyContext,
    memory: input.request.currentMemory,
  };

  const decisions = await Promise.all(
    adapters.map((adapter) => runAdapterSafely(adapter, buildInput)),
  );

  const meeting = buildFounderMeeting({ mission, decisions });
  const finalDecision = buildFounderFinalDecision({ mission, meeting, decisions });
  const memoryWrites = buildFounderMemoryWrites({
    projectId: input.request.projectId,
    mission,
    decisions,
    meeting,
    finalDecision,
  });

  return {
    mission,
    decisions,
    meeting,
    finalDecision,
    memoryWrites,
  };
}
