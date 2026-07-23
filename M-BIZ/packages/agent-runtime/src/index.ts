/**
 * @mealkey/agent-runtime
 *
 * MealKey Agent Runtime — Agent 操作系统内核
 *
 * 对齐 7 Frozen Protocols:
 * - Protocol 4: Agent Manifest → AgentRegistry
 * - Protocol 5: Capability → CapabilityRegistry
 * - Protocol 6: Mission → MissionRouter
 * - Protocol 7: Agent Run → AgentRunTracker
 *
 * 核心模块:
 * - AgentRegistry: Agent 注册中心
 * - CapabilityRegistry: 能力注册中心
 * - MissionRouter: Agent 间通信路由
 * - WorkflowEngine: 工作流引擎
 * - AgentRuntime: 核心执行器
 */

// ─── Agent 注册中心 (Protocol 4) ───

export { AgentRegistry } from "./registry";

// ─── 能力注册中心 (Protocol 5) ───

export { CapabilityRegistry } from "./capability-registry";

// ─── Mission 路由 (Protocol 6) ───

export { MissionRouter } from "./mission-router";
export type { MissionRouterConfig } from "./mission-router";

// ─── Agent 沙箱 ───

export { AgentSandbox } from "./sandbox";
export type { SandboxConfig, SandboxResult } from "./sandbox";

// ─── Kernel 调度器 ───

export { KernelDispatcher } from "./dispatcher";
export type { DispatcherConfig, DispatchResult } from "./dispatcher";

// ─── 工作流引擎 ───

export { WorkflowEngine } from "./workflow-engine";

// ─── 核心执行器 ───

export { AgentRuntime } from "./agent-runtime";
export type { AgentRuntimeConfig, KnowledgeEngineLike, MemoryEngineLike } from "./agent-runtime";

// ─── LLM 适配层 ───

export type {
  LLMAdapter,
  LLMParams,
  LLMResponse,
  LLMToolCall,
  LLMUsage,
  LLMChunk,
  LLMProvider,
} from "./llm";
export { DeepSeekAdapter, createLLMAdapter } from "./llm";
export type { LLMFactoryConfig } from "./llm";

// ─── 工厂函数 ───

import type { AgentRuntimeConfig, KnowledgeEngineLike, MemoryEngineLike } from "./agent-runtime";
import { AgentRuntime } from "./agent-runtime";
import { AgentRegistry } from "./registry";
import { CapabilityRegistry } from "./capability-registry";
import { WorkflowEngine } from "./workflow-engine";
import { MissionRouter } from "./mission-router";
import { AgentSandbox } from "./sandbox";
import { createLLMAdapter } from "./llm";
import type { LLMFactoryConfig } from "./llm";

export interface CreateRuntimeConfig {
  llm: LLMFactoryConfig;
  knowledgeEngine?: KnowledgeEngineLike;
  memoryEngine?: MemoryEngineLike;
}

/**
 * 创建 Runtime 实例
 */
export function createRuntime(config: CreateRuntimeConfig): AgentRuntime {
  const registry = new AgentRegistry();
  const capabilityRegistry = new CapabilityRegistry();
  const workflowEngine = new WorkflowEngine();
  const llmAdapter = createLLMAdapter(config.llm);
  const sandbox = new AgentSandbox();
  const missionRouter = new MissionRouter({ registry, sandbox });

  const runtime = new AgentRuntime({
    registry,
    capabilityRegistry,
    workflowEngine,
    missionRouter,
    llmAdapter,
    knowledgeEngine: config.knowledgeEngine,
    memoryEngine: config.memoryEngine,
  });

  return runtime;
}
