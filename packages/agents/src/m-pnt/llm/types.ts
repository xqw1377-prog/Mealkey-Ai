/**
 * LLM adapter contract — compatible with monorepo
 * packages/agent-runtime/src/llm/adapter.ts
 *
 * When merging, inject the real DeepSeekAdapter / createLLMAdapter.
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

export type MPntLlmMode = "heuristic" | "llm" | "hybrid";

export interface MPntLlmOptions {
  /** LLM adapter; required for llm / hybrid modes */
  llm?: LLMAdapter;
  /**
   * heuristic — rules only (default, offline)
   * llm — LLM only, throw if parse fails
   * hybrid — try LLM, fall back to heuristic on failure
   */
  mode?: MPntLlmMode;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Theory matrix LLM adapter (reuses same connection but with theory-specific params) */
  theoryLlm?: import("../matrix/types").TheoryLLMAdapter;
}
