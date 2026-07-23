/**
 * DeepSeek LLM Provider
 */

import type OpenAI from "openai";
import type { LLMAdapter, LLMParams, LLMResponse, LLMChunk } from "./adapter";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";

export class DeepSeekAdapter implements LLMAdapter {
  private clientPromise: Promise<OpenAI> | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly baseURL: string = DEEPSEEK_BASE_URL,
    private readonly defaultModel: string = DEEPSEEK_MODEL,
  ) {}

  private async getClient(): Promise<OpenAI> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { default: OpenAIClient } = await import("openai");
        return new OpenAIClient({
          apiKey: this.apiKey,
          baseURL: this.baseURL,
        });
      })();
    }

    return this.clientPromise;
  }

  async chat(params: LLMParams): Promise<LLMResponse> {
    const client = await this.getClient();
    const tools = params.tools?.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.id,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const messages = params.messages.map((m) => {
      if (m.role === "system") {
        return { role: "system" as const, content: m.content };
      }
      if (m.role === "user") {
        return { role: "user" as const, content: m.content };
      }
      if (m.role === "assistant") {
        return { role: "assistant" as const, content: m.content };
      }
      if (m.role === "tool") {
        return {
          role: "function" as const,
          name: m.toolName ?? "unknown",
          content: m.content,
        };
      }
      return { role: "user" as const, content: m.content };
    });

    const response = await client.chat.completions.create({
      model: params.model || this.defaultModel,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      tool_choice: tools && tools.length > 0 ? "auto" : undefined,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    if (!choice) {
      return { content: "", toolCalls: [] };
    }

    const toolCalls =
      choice.message.tool_calls?.map((tc) => {
        if (tc.type === "function") {
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          };
        }
        return { id: tc.id, name: "unknown", arguments: {} };
      }) ?? [];

    return {
      content: choice.message.content ?? "",
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(params: LLMParams): AsyncGenerator<LLMChunk> {
    const client = await this.getClient();
    const tools = params.tools?.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.id,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const messages = params.messages.map((m) => {
      if (m.role === "system") {
        return { role: "system" as const, content: m.content };
      }
      if (m.role === "user") {
        return { role: "user" as const, content: m.content };
      }
      if (m.role === "assistant") {
        return { role: "assistant" as const, content: m.content };
      }
      return { role: "user" as const, content: m.content };
    });

    const stream = await client.chat.completions.create({
      model: params.model || this.defaultModel,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      tool_choice: tools && tools.length > 0 ? "auto" : undefined,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: true,
    });

    const toolCallBuffer: { id: string; name: string; args: string }[] = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { type: "text", content: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = toolCallBuffer.find((t) => t.id === tc.id);
          if (existing) {
            existing.args += tc.function?.arguments || "";
          } else if (tc.function) {
            toolCallBuffer.push({
              id: tc.id!,
              name: tc.function.name ?? "",
              args: tc.function.arguments ?? "",
            });
            yield { type: "tool_start", toolName: tc.function.name || "" };
          }
        }
      }
    }

    // 输出完整的工具调用
    for (const tc of toolCallBuffer) {
      yield {
        type: "tool_call",
        toolCall: {
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.args),
        },
      };
    }

    yield { type: "done" };
  }
}
