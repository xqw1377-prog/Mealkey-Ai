import type {
  AdapterBuildInput,
  EvidencePack,
  FounderAgentAdapter,
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
  FounderMemoryWrite,
  FounderMission,
  FounderMissionRequest,
} from "../contracts";
import type {
  ActionPlan,
  CapabilityMode,
  DecisionPack,
  GrowthDelta,
  InsightPack,
} from "../contracts/capability";
import type { ValidationTask } from "../contracts/validation";
import {
  mBizFounderAdapter,
  mEdFounderAdapter,
  mMktFounderAdapter,
  mPntFounderAdapter,
} from "../adapters";
import { buildFounderFinalDecision } from "../decision";
import { attachEvidenceToDecisions, createEvidenceRegistry, linkSeatContradictions } from "../evidence";
import { buildFounderMeeting } from "../meeting";
import { applyMemoryPriorsToDecisions, buildFounderMemoryWrites } from "../memory";
import { buildFounderMission } from "../mission";
import { runCapabilityCycleFromMissionRequest } from "../capability";

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
  /** Evidence Layer 本轮证据包 */
  evidencePack: EvidencePack;
  /** V2：Cognition Agent InsightPack（能力母架构） */
  insightPack?: InsightPack;
  /** V2：Decision Agent DecisionPack */
  decisionPack?: DecisionPack;
  /** V2：Execution Agent ActionPlan */
  actionPlan?: ActionPlan;
  /** V2：Growth Agent GrowthDelta */
  growthDelta?: GrowthDelta;
  /** V2：本轮生成的验证任务（未落库，供 Gateway 写入 profile） */
  validationTask?: ValidationTask;
  /** V2：本轮调度模式 */
  capabilityMode?: CapabilityMode;
}

export interface RunFounderLoopInput {
  request: FounderMissionRequest;
  /** 可注入自定义 adapter；默认用四席样板 */
  adapters?: FounderAgentAdapter[];
  /** 覆盖 mission 选席；不传则用 mission engine 推断 */
  requiredAgents?: FounderMission["requiredAgents"];
  /**
   * true（默认）：走 Capability Runtime（Cognition → Meeting/Decision）
   * false：保留旧四席并行 Adapter 路径（自定义 adapters 时强制旧路径）
   */
  useCapabilityRuntime?: boolean;
}

async function runAdapterSafely(
  adapter: FounderAgentAdapter,
  buildInput: AdapterBuildInput,
): Promise<FounderDecision> {
  const request = adapter.buildRequest(buildInput);
  const timeoutMs = request.timeoutMs ?? 20000;
  try {
    const raw = await Promise.race([
      adapter.invoke(request),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${adapter.agent} 调用超时（${timeoutMs}ms）`));
        }, timeoutMs);
      }),
    ]);
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
        provider: "heuristic",
      },
    };
  }
}

/** 旧路径：四席并行 Adapter（自定义 adapter 注入时使用） */
async function runLegacyFounderLoop(
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
    assetContextBlock: input.request.assetContextBlock,
  };

  const rawDecisions = await Promise.all(
    adapters.map((adapter) => runAdapterSafely(adapter, buildInput)),
  );

  const registry = createEvidenceRegistry(input.request.projectId);
  const withEvidence = attachEvidenceToDecisions({
    registry,
    projectId: input.request.projectId,
    missionId: mission.missionId,
    decisions: rawDecisions,
    assetContextBlock: input.request.assetContextBlock,
  });
  const decisions = applyMemoryPriorsToDecisions({
    decisions: withEvidence,
    memory: input.request.currentMemory,
  });
  linkSeatContradictions(registry, decisions);
  const evidencePack = registry.toPack();

  const meeting = buildFounderMeeting({ mission, decisions });
  const finalDecision = buildFounderFinalDecision({
    mission,
    meeting,
    decisions,
    projectId: input.request.projectId,
  });
  const memoryWrites = buildFounderMemoryWrites({
    projectId: input.request.projectId,
    mission,
    decisions,
    meeting,
    finalDecision,
    evidencePack,
    companyContext: input.request.companyContext,
  });

  return {
    mission,
    decisions,
    meeting,
    finalDecision,
    memoryWrites,
    evidencePack,
    capabilityMode: "strategy_meeting",
  };
}

/**
 * Founder Layer 闭环（V2）：
 * Capability Runtime：Cognition(Market/Brand/Business/World/Self) → Decision(会议/辩论/合同)
 * 兼容：自定义 adapters 时回退旧四席并行路径。
 */
export async function runFounderLoop(
  input: RunFounderLoopInput,
): Promise<FounderRuntimeResult> {
  const useCapability =
    input.useCapabilityRuntime !== false && !input.adapters?.length;

  if (useCapability) {
    const cycle = await runCapabilityCycleFromMissionRequest({
      request: input.request,
      requiredAgents: input.requiredAgents,
      mode: "strategy_meeting",
    });

    if (!cycle.meeting || !cycle.finalDecision) {
      return runLegacyFounderLoop(input);
    }

    return {
      mission: cycle.mission,
      decisions: cycle.decisions,
      meeting: cycle.meeting,
      finalDecision: cycle.finalDecision,
      memoryWrites: cycle.memoryWrites,
      evidencePack: cycle.evidencePack,
      insightPack: cycle.insightPack,
      decisionPack: cycle.decisionPack,
      actionPlan: cycle.actionPlan,
      growthDelta: cycle.growthDelta,
      validationTask: cycle.validationTask,
      capabilityMode: cycle.mode,
    };
  }

  return runLegacyFounderLoop(input);
}
