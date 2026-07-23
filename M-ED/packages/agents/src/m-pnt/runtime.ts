import type { MKContext, MKDecision } from "@mealkey/agent-sdk";
import { mPntCapabilities, getCapability } from "./capabilities";
import { mPntWorkflow } from "./workflow";
import { fuseStepDecisions, readStructured } from "./protocols/mk-decision-mapper";
import {
  clearMPntLlmOptions,
  setMPntLlmOptions,
  getMPntLlmOptions,
  type MPntLlmOptions,
} from "./llm";

export interface KnowledgeEngineLike {
  getContextForAgent(agentId: string, projectId: string, query: string, limit?: number): Promise<string[]>;
}

export interface MemoryEngineLike {
  getContextForAgent(projectId: string, agentId: string): Promise<{
    memories: Array<{ key: string; value: unknown; source: string; confidence: number }>;
    recentDecisions: Array<{
      id: string;
      type: string;
      summary: string;
      reasoning: string | null;
      confidence: number;
      outcome: string | null;
    }>;
  }>;
  saveDecision(projectId: string, agentId: string, decision: {
    type: string;
    summary: string;
    reasoning?: string;
    confidence: number;
  }): Promise<{ id: string }>;
}

export interface MPntRunResult {
  agentId: "m-pnt";
  missionId?: string;
  mode: string;
  steps: Array<{ stepId: string; decision: MKDecision }>;
  decision: MKDecision;
}

export interface MPntRunOptions extends MPntLlmOptions {
  /** Extra input merged into each capability call */
  input?: Record<string, unknown>;
  /** KnowledgeEngine for context injection */
  knowledgeEngine?: KnowledgeEngineLike;
  /** MemoryEngine for history loading / decision saving */
  memoryEngine?: MemoryEngineLike;
}

/** Loose mission handle — monorepo Mission shape differs by layer */
export interface MPntMissionRef {
  id?: string;
  objective?: string;
  type?: string;
  goal?: string;
}

/**
 * Lightweight offline / hybrid runner for M-PNT.
 * Parent AgentRuntime should use the same capabilities + workflow.
 *
 * V2 改进：
 * - 集成 KnowledgeEngine：在每步执行前注入定位理论知识
 * - 集成 MemoryEngine：执行前加载历史记忆、执行后保存决策
 * - 知识锚定 context 注入
 */
export async function runMPnt(
  context: MKContext,
  mission?: MPntMissionRef,
  options: MPntRunOptions = {},
): Promise<MPntRunResult> {
  const { input = {}, knowledgeEngine, memoryEngine, ...llmOpts } = options;
  setMPntLlmOptions(llmOpts);
  const mode = llmOpts.mode ?? (llmOpts.llm ? "hybrid" : "heuristic");

  try {
    // ─── 执行前：从 MemoryEngine 加载历史记忆 ───
    let historyMemory: string[] = [];
    let recentDecisionSummary: string[] = [];
    if (memoryEngine) {
      try {
        const memCtx = await memoryEngine.getContextForAgent(
          context.project.id,
          "m-pnt",
        );
        historyMemory = memCtx.memories.map(
          (m) => `【${m.source}】${String(m.value ?? "")}`,
        );
        recentDecisionSummary = memCtx.recentDecisions
          .slice(-5)
          .map((d) => `- ${d.type}: ${d.summary} (置信度: ${(d.confidence * 100).toFixed(0)}%)`);
      } catch {
        // 记忆加载失败不影响主流程
      }
    }

    // ─── 执行前：从 KnowledgeEngine 加载定位理论上下文 ───
    let knowledgeContext: string[] = [];
    const projectCategory = context.project.category ?? "";
    const projectCity = context.project.city ?? "";
    const query = `定位分析 ${projectCategory} ${projectCity}`;
    if (knowledgeEngine) {
      try {
        knowledgeContext = await knowledgeEngine.getContextForAgent(
          "m-pnt",
          context.project.id,
          query,
          8, // topK
        );
      } catch {
        // 知识加载失败不影响主流程
      }
    }

    // ─── 构建 rich context 注入到每步的 input ───
    const enrichedInput = {
      ...input,
      _knowledgeContext: knowledgeContext.join("\n---\n"),
      _historyMemory: historyMemory.join("\n"),
      _recentDecisions: recentDecisionSummary.join("\n"),
      _hasKnowledge: knowledgeContext.length > 0,
      _hasMemory: historyMemory.length > 0,
    };

    const steps: Array<{ stepId: string; decision: MKDecision }> = [];
    let previousSummary = "";
    let first = true;

    for (const step of mPntWorkflow.steps) {
      // 每步注入上一步结果 + 知识 + 记忆
      const stepInput = first
        ? enrichedInput
        : { ...enrichedInput, previousSummary, previousResults: previousSummary };

      const capId = step.capabilities?.[0];
      if (!capId) {
        if (step.output === "final") {
          const fused = fuseStepDecisions(
            steps.map((s) => s.decision),
            context,
          );
          steps.push({ stepId: step.id, decision: fused });
          return finalize(mission, mode, steps, memoryEngine, context);
        }
        continue;
      }

      const cap = getCapability(capId);
      if (!cap) {
        throw new Error(`Capability not registered: ${capId}`);
      }

      const decision = await cap.execute(stepInput, context);
      steps.push({ stepId: step.id, decision });
      previousSummary = [
        previousSummary,
        `[${step.name}] ${decision.judgement}`,
      ]
        .filter(Boolean)
        .join("\n");
      first = false;
    }

    const decision = fuseStepDecisions(
      steps.map((s) => s.decision),
      context,
    );
    return finalize(mission, mode, [...steps, { stepId: "fused", decision }], memoryEngine, context);
  } finally {
    clearMPntLlmOptions();
  }
}

/** 统一收尾：保存决策到 memory + 返回结果 */
async function finalize(
  mission: MPntMissionRef | undefined,
  mode: string,
  steps: Array<{ stepId: string; decision: MKDecision }>,
  memoryEngine: MemoryEngineLike | undefined,
  context: MKContext,
): Promise<MPntRunResult> {
  const final = steps[steps.length - 1].decision;

  // ─── 执行后：保存决策到 MemoryEngine ───
  if (memoryEngine && final) {
    try {
      await memoryEngine.saveDecision(
        context.project.id,
        "m-pnt",
        {
          type: "positioning",
          summary: final.judgement.slice(0, 200),
          reasoning: `${final.diagnosis}\n${final.strategy}`,
          confidence: final.confidence,
        },
      );
    } catch {
      // 保存失败不影响主流程
    }
  }

  return {
    agentId: "m-pnt",
    missionId: mission?.id,
    mode,
    steps: steps.filter((s) => s.stepId !== "fused"),
    decision: final,
  };
}

export function listMPntCapabilityIds(): string[] {
  return mPntCapabilities.map((c) => c.id);
}

export { readStructured };
