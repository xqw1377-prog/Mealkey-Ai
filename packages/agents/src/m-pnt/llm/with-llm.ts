import type { CapabilityDefinition, MKContext, MKDecision } from "@mealkey/agent-sdk";
import type { LLMAdapter, MPntLlmMode, MPntLlmOptions } from "./types";
import type { TheoryLLMAdapter } from "../matrix/types";
import { parseLlmToMKDecision } from "./parse-decision";
import { M_PNT_SYSTEM_PROMPT } from "../prompts/system";

/** Module-level options set by runMPnt / monorepo host */
let activeOptions: MPntLlmOptions & { theoryLlm?: TheoryLLMAdapter } = { mode: "heuristic" };

export function setMPntLlmOptions(opts: MPntLlmOptions & { theoryLlm?: TheoryLLMAdapter }): void {
  activeOptions = { mode: "heuristic", ...opts };
}

/** @deprecated Use setMPntLlmOptions instead (it already accepts theoryLlm) */
export function setMPntLlmWithTheory(opts: MPntLlmOptions & { theoryLlm?: TheoryLLMAdapter }): void {
  activeOptions = { mode: "heuristic", ...opts };
}

export function getMPntLlmOptions(): MPntLlmOptions & { theoryLlm?: TheoryLLMAdapter } {
  return activeOptions;
}

export function clearMPntLlmOptions(): void {
  activeOptions = { mode: "heuristic" };
}

/**
 * Wrap a heuristic capability with optional LLM execution.
 * hybrid (default when llm present): LLM first, heuristic fallback.
 */
export function withLlm(
  base: CapabilityDefinition,
  buildUserPrompt: (input: unknown, context: MKContext) => string,
): CapabilityDefinition {
  return {
    ...base,
    async execute(input: unknown, context: MKContext): Promise<MKDecision> {
      const opts = getMPntLlmOptions();
      const mode: MPntLlmMode =
        opts.mode ?? (opts.llm ? "hybrid" : "heuristic");

      if (mode === "heuristic" || !opts.llm) {
        return base.execute(input, context);
      }

      try {
        const decision = await runCapabilityLlm(
          opts.llm,
          base,
          input,
          context,
          buildUserPrompt,
          opts,
        );
        // Require minimal structure
        if (!decision.judgement && mode === "llm") {
          throw new Error("LLM decision missing judgement");
        }
        if (!decision.judgement) {
          return base.execute(input, context);
        }
        return decision;
      } catch (err) {
        if (mode === "llm") throw err;
        return base.execute(input, context);
      }
    },
  };
}

async function runCapabilityLlm(
  llm: LLMAdapter,
  base: CapabilityDefinition,
  input: unknown,
  context: MKContext,
  buildUserPrompt: (input: unknown, context: MKContext) => string,
  opts: MPntLlmOptions,
): Promise<MKDecision> {
  const userPrompt = buildUserPrompt(input, context);
  const response = await llm.chat({
    model: opts.model,
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 2048,
    messages: [
      {
        role: "system",
        content: `${M_PNT_SYSTEM_PROMPT}

你当前执行的能力: ${base.id}（${base.name}）
必须只输出一个 JSON 对象（可包在 markdown code fence 中），字段:
{
  "problem": string,
  "observation": string,
  "diagnosis": string,
  "judgement": string,
  "strategy": string,
  "action": string,
  "confidence": number,  // 0-1 或 0-100
  "evidence": [{ "source": string, "content": string, "relevance": number }]
}
禁止输出教学式空话；判断要可执行、可验证。`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  return parseLlmToMKDecision(response.content, {
    idPrefix: base.id,
    problem: `${context.project.name || context.project.category || "项目"} ${base.name}`,
    context,
  });
}

/** Simple prompt builder used by enhanced capabilities */
export function defaultCapPrompt(
  capName: string,
  dims: string[],
  input: unknown,
  context: MKContext,
): string {
  const p = context.project;
  const o = context.owner;
  const brain = context.restaurantContext?.priorBlock?.trim();

  return `## 能力任务：${capName}

### 餐厅经营大脑（长期认知）
${brain || "暂无（未知处不得编造）"}

### 项目
- 名称: ${p.name || "-"}
- 品类: ${p.category || "-"}
- 城市: ${p.city || "-"}
- 区域: ${p.district || "-"}
- 阶段: ${p.stage || "-"}
- 预算: ${p.budget ?? "-"}
- profile: ${JSON.stringify(p.profile || {})}

### 经营者
- 经验: ${o.experience || "-"}
- 优势: ${JSON.stringify(o.strengths || [])}
- 盲区: ${JSON.stringify(o.weaknesses || [])}

### 输入
${JSON.stringify(input ?? {}, null, 2)}

### 分析维度
${dims.map((d, i) => `${i + 1}. ${d}`).join("\n")}

请输出 MKDecision JSON。`;
}
