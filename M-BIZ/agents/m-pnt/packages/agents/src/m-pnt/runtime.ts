/**
 * M-PNT 运行时 — MealKey 生态版
 *
 * V1 更新：增加 runMPntUnified 统一入口。
 * - runMPnt(): V0 兼容，7 步串行
 * - runMPntV1(): V1 三阶段并行（见 runtime-v1.ts）
 * - runMPntUnified(): 统一入口，可选 V0/V1
 *
 * 在 MealKey 环境下，大模型始终可用。
 * runMPnt 的默认行为：
 *   - 所有 Capability 由 LLM 驱动
 *   - 规则引擎仅做结构化回落
 *   - 启动时从 MealKey 的 orchestrator 获取 LLM 适配器
 *
 * 外部调用示例（MealKey monorepo）：
 *   import { runMPnt } from "@mealkey/agents";
 *   import { getLLMAdapter } from "@mealkey/agent-runtime";
 *   const result = await runMPnt(context, mission, {
 *     llm: getLLMAdapter(),     // MealKey 的大模型适配器
 *     runtimeConfig: {
 *       runMode: "llm",
 *       memoryEngine,
 *       knowledgeEngine,
 *     },
 *   });
 *
 * V1 统一入口：
 *   const result = await runMPntUnified(context, mission, {
 *     llm: getLLMAdapter(),
 *     runtimeVersion: 'v1',
 *   });
 *   // result.decision → MKDecision for mother-body
 *   // result.pageOutput → PositioningPageOutput for frontend
 */
import type { MKContext, MKDecision, MPntRuntimeConfig } from "@mealkey/agent-sdk";
import type { LLMAdapter } from "./llm/types";
import { mPntCapabilities, getCapability } from "./capabilities";
import { mPntWorkflow } from "./workflow";
import { fuseStepDecisions, readStructured } from "./protocols/mk-decision-mapper";
import { setMPntOptions, clearMPntOptions } from "./llm/with-llm";
import { mPntKnowledgeSeeds } from "./knowledge/seeds";

export interface MPntRunResult {
  agentId: "m-pnt";
  missionId?: string;
  /** 运行模式：始终为 "llm"（MealKey 环境） */
  mode: "llm";
  steps: Array<{ stepId: string; decision: MKDecision }>;
  decision: MKDecision;
}

export interface MPntRunOptions {
  /** MealKey 的大模型适配器 */
  llm: LLMAdapter;
  /** 运行时配置（由 orchestrator 注入） */
  runtimeConfig?: MPntRuntimeConfig;
  /** 额外入参 */
  input?: Record<string, unknown>;
  /** 模型参数 */
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MPntMissionRef {
  id?: string;
  objective?: string;
  type?: string;
  goal?: string;
}

/**
 * 运行 M-PNT 全链路定位决策
 *
 * 要求：
 *   - llm: 必须传入 MealKey 的 LLM 适配器
 *   - runtimeConfig: 可选（由 orchestrator 注入）
 */
export async function runMPnt(
  context: MKContext,
  mission?: MPntMissionRef,
  options: MPntRunOptions = { llm: { chat: async () => ({ content: "" }) } },
): Promise<MPntRunResult> {
  const { llm, input = {}, runtimeConfig, model, temperature, maxTokens } = options;

  // 设置 LLM 配置
  setMPntOptions({
    mode: "llm",
    llm,
    model,
    temperature,
    maxTokens,
    runtimeConfig,
  });

  // 注入知识种子
  const enrichedContext = enrichContextWithKnowledge(context, runtimeConfig);

  try {
    const steps: Array<{ stepId: string; decision: MKDecision }> = [];
    let previousSummary = "";

    for (const step of mPntWorkflow.steps) {
      const capId = step.capabilities?.[0];
      if (!capId) {
        if (step.output === "final") {
          const fused = fuseStepDecisions(
            steps.map((s) => s.decision),
            enrichedContext,
          );
          steps.push({ stepId: step.id, decision: fused });

          // 记忆回写
          if (runtimeConfig?.memoryEngine && (mission?.id || enrichedContext.project.id)) {
            try {
              await runtimeConfig.memoryEngine.saveDecision(
                enrichedContext.project.id || mission!.id || "unknown",
                "m-pnt",
                {
                  type: "positioning",
                  summary: fused.judgement,
                  reasoning: fused.strategy,
                  confidence: fused.confidence,
                },
              );
            } catch { /* 记忆写入失败不阻断 */ }
          }

          return {
            agentId: "m-pnt",
            missionId: mission?.id,
            mode: "llm",
            steps,
            decision: fused,
          };
        }
        continue;
      }

      const cap = getCapability(capId);
      if (!cap) {
        throw new Error(`Capability not registered: ${capId}`);
      }

      const decision = await cap.execute(
        { ...input, previousSummary, previousResults: previousSummary },
        enrichedContext,
      );
      steps.push({ stepId: step.id, decision });
      previousSummary = [
        previousSummary,
        `[${step.name}] ${decision.judgement}`,
      ].filter(Boolean).join("\n");
    }

    const decision = fuseStepDecisions(
      steps.map((s) => s.decision),
      enrichedContext,
    );
    return {
      agentId: "m-pnt",
      missionId: mission?.id,
      mode: "llm",
      steps,
      decision,
    };
  } finally {
    clearMPntOptions();
  }
}

function enrichContextWithKnowledge(
  context: MKContext,
  runtimeConfig?: MPntRuntimeConfig,
): MKContext {
  const knowledge = { ...(context.knowledge || {}) } as {
    nodes?: Array<{ id?: string; title?: string; content?: unknown; tags?: string[] }>;
    texts?: string[];
  };

  // 内置知识种子
  const builtinNodes = mPntKnowledgeSeeds.map((s) => ({
    id: s.id,
    title: s.title,
    content: s.content,
    tags: s.tags,
  }));

  if (runtimeConfig?.knowledgeEngine) {
    // knowledgeEngine 已注入，可在运行时调用
    // runtimeConfig.knowledgeEngine.query(category, { tags: ["m-pnt"] })
    //   .then(nodes => { ... })
    // 当前暂不阻塞主流程，预留接口
  }

  const existingIds = new Set((knowledge.nodes || []).map((n) => n.id));
  for (const node of builtinNodes) {
    if (!existingIds.has(node.id)) {
      knowledge.nodes = [...(knowledge.nodes || []), node as any];
    }
  }

  return { ...context, knowledge: knowledge as MKContext["knowledge"] };
}

export function listMPntCapabilityIds(): string[] {
  return mPntCapabilities.map((c) => c.id);
}

export { readStructured };

// ═══════════════════════════════════════════════════════════════
// V1 统一输出契约
// ═══════════════════════════════════════════════════════════════

import { decisionToPageOutput } from "./protocols/mk-decision-mapper";
import type { PositioningPageOutput } from "./protocols/mk-decision-mapper";

/**
 * V1 统一输出契约
 * 同时满足母体（MKDecision）和前端（PositioningPageOutput）的消费需求。
 */
export interface MPntOutput {
  agentId: 'm-pnt';
  missionId?: string;
  /** Frozen Protocol — 母体消费 */
  decision: MKDecision;
  /** 前端消费层 — UI 直接渲染 */
  pageOutput: PositioningPageOutput;

  /** V0 兼容 */
  steps?: Array<{ stepId: string; decision: MKDecision }>;

  /** V1 扩展 */
  stages?: Record<string, unknown>;
  metrics?: {
    totalMs: number;
    stageMs: Record<string, number>;
    modelCalls: number;
    shortCircuited: boolean;
    shortCircuitReason?: string;
  };
}

export interface MPntUnifiedOptions extends MPntRunOptions {
  /** 运行时版本：v0（默认）| v1 */
  runtimeVersion?: 'v0' | 'v1';
}

/**
 * runMPntUnified — 统一入口
 *
 * 用法：
 *   const output = await runMPntUnified(ctx, mission, { llm, runtimeVersion: 'v1' });
 *   // output.decision     → MKDecision（母体）
 *   // output.pageOutput   → PositioningPageOutput（前端）
 *   // output.stages       → V1 三阶段结果
 *   // output.metrics      → 运行时指标
 */
export async function runMPntUnified(
  context: MKContext,
  mission?: MPntMissionRef,
  options: MPntUnifiedOptions = { llm: { chat: async () => ({ content: "" }) } },
): Promise<MPntOutput> {
  if (options.runtimeVersion === 'v1') {
    // 动态导入避免循环引用
    const { runMPntV1 } = await import('./runtime-v1');
    const v1Result = await runMPntV1(context, mission, options);

    return {
      agentId: 'm-pnt',
      missionId: mission?.id,
      decision: v1Result.decision,
      pageOutput: decisionToPageOutput(v1Result.decision),
      stages: v1Result.stages as unknown as Record<string, unknown>,
      metrics: v1Result.metrics,
    };
  }

  // V0 默认
  const v0Result = await runMPnt(context, mission, options);
  return {
    agentId: 'm-pnt',
    missionId: mission?.id,
    decision: v0Result.decision,
    pageOutput: decisionToPageOutput(v0Result.decision),
    steps: v0Result.steps,
  };
}
