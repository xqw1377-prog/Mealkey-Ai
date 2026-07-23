/**
 * LLM Provider 工厂
 */

import type { LLMAdapter, LLMProvider } from "./adapter";
import { DeepSeekAdapter } from "./deepseek";

export interface LLMFactoryConfig {
  provider: LLMProvider;
  apiKey: string;
  baseURL?: string;
}

export function createLLMAdapter(config: LLMFactoryConfig): LLMAdapter {
  switch (config.provider) {
    case "deepseek":
      return new DeepSeekAdapter(config.apiKey, config.baseURL);
    case "openai": {
      return new DeepSeekAdapter(config.apiKey, config.baseURL, "gpt-4o-mini");
    }
    case "claude":
      // TODO: 实现 Claude adapter
      throw new Error("Claude adapter not implemented yet");
    case "local":
      // TODO: 实现本地模型 adapter
      throw new Error("Local adapter not implemented yet");
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
