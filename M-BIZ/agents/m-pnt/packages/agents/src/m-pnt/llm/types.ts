/**
 * LLM 适配器类型 — 对应 MealKey monorepo 的 LLMAdapter 接口
 *
 * MealKey 的大模型适配器由 @mealkey/agent-runtime 提供，
 * M-PNT 直接使用该契约，不自己实现 LLM 调用。
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface LLMParams {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMAdapter {
  chat(params: LLMParams): Promise<LLMResponse>;
}

/** M-PNT 运行模式 — 在 MealKey 生态下始终为 "llm" */
export type MPntLlmMode = "llm";

/** M-PNT LLM 配置 */
export interface MPntLlmOptions {
  llm: LLMAdapter;
  mode?: MPntLlmMode;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
