/**
 * LLM Adapter 接口定义
 */

import type { ChatMessage } from "@mealkey/agent-sdk";
import type { CapabilityTool } from "@mealkey/agent-sdk";

// ─── LLM 适配器接口 ───

export interface LLMAdapter {
  chat(params: LLMParams): Promise<LLMResponse>;
  chatStream(params: LLMParams): AsyncGenerator<LLMChunk>;
}

// ─── LLM 参数 ───

export interface LLMParams {
  model?: string;
  messages: ChatMessage[];
  tools?: CapabilityTool[];
  temperature?: number;
  maxTokens?: number;
}

// ─── LLM 响应 ───

export interface LLMResponse {
  content: string;
  toolCalls: LLMToolCall[];
  usage?: LLMUsage;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── LLM 流式 Chunk ───

export type LLMChunk =
  | { type: "text"; content: string }
  | { type: "tool_start"; toolName: string }
  | { type: "tool_call"; toolCall: LLMToolCall }
  | { type: "done" };

// ─── LLM Provider 类型 ───

export type LLMProvider = "deepseek" | "openai" | "claude" | "local";
