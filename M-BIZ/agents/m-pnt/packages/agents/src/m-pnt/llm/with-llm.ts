/**
 * LLM 驱动层 — MealKey 生态下的执行引擎
 *
 * 在 MealKey 环境中，大模型是默认配置。
 * 规则引擎（heuristic）仅在 LLM 不可用或测试时启用。
 *
 * 工作模式：
 *   1. LLM 执行完整推理（含品类竞争数据上下文）
 *   2. 规则引擎做结构化校验和回落兜底
 *   3. 推理结果统一映射为 MKDecision
 */
import type { CapabilityDefinition, MKContext, MKDecision, MPntRuntimeConfig } from "@mealkey/agent-sdk";
import type { LLMAdapter, MPntLlmMode, MPntLlmOptions } from "./types";
import { parseLlmToMKDecision } from "./parse-decision";
import { M_PNT_SYSTEM_PROMPT } from "../prompts/system";
import { buildCategoryContext } from "./llm-context";

/** Module-level options set by runMPnt / orchestrator */
let activeOptions: {
  mode?: MPntLlmMode;
  llm?: LLMAdapter;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  runtimeConfig?: MPntRuntimeConfig;
} = {};

export function setMPntOptions(opts: {
  mode?: MPntLlmMode;
  llm?: LLMAdapter;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  runtimeConfig?: MPntRuntimeConfig;
}): void {
  activeOptions = opts;
}

export function getMPntOptions() {
  return activeOptions;
}

export function clearMPntOptions(): void {
  activeOptions = {};
}

/**
 * 在 MealKey 生态下，所有 Capability 都用 LLM 执行。
 * 规则引擎（base.execute）仅在 LLM 失败时做结构回落。
 *
 * 核心优势：
 * - LLM 带竞争数据上下文，判断更精准
 * - 规则引擎确保输出结构一致
 * - 无 heuristics 模式的性能开销
 */
export function withMealKeyLlm(
  base: CapabilityDefinition,
  buildLLMPrompt: (input: unknown, context: MKContext) => {
    systemPromptExtension: string;
    userMessage: string;
  },
): CapabilityDefinition {
  return {
    ...base,
    async execute(input: unknown, context: MKContext): Promise<MKDecision> {
      const opts = getMPntOptions();
      const llm = opts.llm;

      // MealKey 环境：LLM 必须可用
      if (!llm) {
        // 无 LLM 时走规则引擎（测试/离线场景）
        return base.execute(input, context);
      }

      try {
        // 1. 构建 LLM Prompt（注入品类竞争数据）
        const { systemPromptExtension, userMessage } = buildLLMPrompt(input, context);

        // 2. 注入竞争数据上下文
        const marketContext = buildCategoryContext(
          context.project.category || "餐饮",
          context.project.city || "目标城市",
        );

        // 3. 调用 LLM
        const response = await llm.chat({
          model: opts.model,
          temperature: opts.temperature ?? 0.3,
          maxTokens: opts.maxTokens ?? 4096,
          messages: [
            {
              role: "system",
              content: `${M_PNT_SYSTEM_PROMPT}

## 当前能力
${base.id}（${base.name}）

## 市场情报
${marketContext}

${systemPromptExtension}

## 输出要求
必须输出 JSON（可包在 markdown code fence 中）：
{
  "problem": string,
  "observation": string,
  "diagnosis": string,
  "judgement": string,
  "strategy": string,
  "action": string,
  "confidence": number,
  "evidence": [{ "source": string, "content": string, "relevance": number }]
}`,
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
        });

        const decision = parseLlmToMKDecision(response.content, {
          idPrefix: base.id,
          problem: `${context.project.name || context.project.category || "项目"} ${base.name}`,
          context,
        });

        // LLM 成功：返回结果
        if (decision.judgement && decision.judgement.length > 10) {
          return decision;
        }

        // LLM 输出为空：回落规则引擎
        return base.execute(input, context);
      } catch {
        // LLM 失败：回落规则引擎
        return base.execute(input, context);
      }
    },
  };
}

/**
 * 构建 LLM Prompt（默认实现）
 */
export function buildDefaultLLMPrompt(
  capName: string,
  dims: string[],
  input: unknown,
  context: MKContext,
): { systemPromptExtension: string; userMessage: string } {
  const p = context.project;
  const o = context.owner;

  return {
    systemPromptExtension: `你正在执行「${capName}」分析任务。
分析维度：
${dims.map((d, i) => `${i + 1}. ${d}`).join("\n")}

请基于市场情报数据，给出专业的判断。
禁止输出教学式空话；判断要可执行、可验证。`,
    userMessage: `## 项目信息
- 名称: ${p.name || "-"}
- 品类: ${p.category || "-"}
- 城市: ${p.city || "-"}
- 区域: ${p.district || "-"}
- 阶段: ${p.stage || "-"}
- 预算: ${p.budget ?? "-"}
- profile: ${JSON.stringify(p.profile || {})}

## 经营者信息
- 经验: ${o.experience || "-"}
- 优势: ${JSON.stringify(o.strengths || [])}
- 盲区: ${JSON.stringify(o.weaknesses || [])}

## 输入数据
${JSON.stringify(input ?? {}, null, 2)}

请输出 MKDecision JSON。`,
  };
}
