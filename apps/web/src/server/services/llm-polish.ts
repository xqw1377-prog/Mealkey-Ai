/**
 * 共享 LLM 润色：有 Key 时把启发式判断改写成顾问口吻；无 Key 原样返回。
 */

import { createLLMAdapter } from "@mealkey/agent-runtime";

type LlmProvider = "deepseek" | "openai" | "none";

export type PolishFields = {
  judgement: string;
  strategy: string;
  action: string;
};

export function resolveLlmProvider(): LlmProvider {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

export function resolveLlmModel(provider: LlmProvider): string {
  if (provider === "deepseek") return "deepseek-chat";
  if (provider === "openai") return "gpt-4o-mini";
  return "heuristic";
}

export function tryCreateSharedLlmAdapter() {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const apiKey = deepseekKey || openaiKey;
  if (!apiKey) return null;
  try {
    return createLLMAdapter({
      provider: deepseekKey ? "deepseek" : "openai",
      apiKey,
      baseURL: deepseekKey ? "https://api.deepseek.com" : undefined,
    });
  } catch {
    return null;
  }
}

function safeParsePolish(content: string, fallback: PolishFields): PolishFields {
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as Partial<PolishFields>;
    return {
      judgement: typeof parsed.judgement === "string" && parsed.judgement.trim()
        ? parsed.judgement.trim()
        : fallback.judgement,
      strategy: typeof parsed.strategy === "string" && parsed.strategy.trim()
        ? parsed.strategy.trim()
        : fallback.strategy,
      action: typeof parsed.action === "string" && parsed.action.trim()
        ? parsed.action.trim()
        : fallback.action,
    };
  } catch {
    return fallback;
  }
}

/** 把规则引擎产出的判断润色成咨询顾问表达；失败则回退原文 */
export async function polishAdvisorJudgement(input: {
  domain: "market" | "equity";
  message: string;
  draft: PolishFields;
}): Promise<{ fields: PolishFields; provider: LlmProvider; model: string; polished: boolean }> {
  if (process.env.HEURISTIC_ONLY === "true") {
    return { fields: input.draft, provider: "none", model: "heuristic", polished: false };
  }

  const provider = resolveLlmProvider();
  const model = resolveLlmModel(provider);
  const llm = tryCreateSharedLlmAdapter();
  if (!llm || provider === "none") {
    return { fields: input.draft, provider: "none", model: "heuristic", polished: false };
  }

  const domainLabel = input.domain === "market" ? "市场进入" : "组织与股权";
  try {
    const response = await llm.chat({
      model,
      temperature: 0.3,
      maxTokens: 600,
      messages: [
        {
          role: "system",
          content: `你是餐饮创业${domainLabel}顾问。把草稿判断改写成更专业、可执行的中文建议。只返回 JSON：{"judgement":"...","strategy":"...","action":"..."}。不要编造未给出的数据。`,
        },
        {
          role: "user",
          content: JSON.stringify({
            question: input.message.slice(0, 400),
            draft: input.draft,
          }),
        },
      ],
    });
    return {
      fields: safeParsePolish(response.content || "", input.draft),
      provider,
      model,
      polished: true,
    };
  } catch {
    return { fields: input.draft, provider: "none", model: "heuristic", polished: false };
  }
}
