/**
 * Memory Engine 模块导出
 *
 * Protocol 3: Memory Protocol
 * 新代码应使用 agent-sdk 的 MemoryStore 接口。
 * 旧 MemoryEngine 保留向后兼容。
 *
 * 实现已迁移至 @mealkey/memory-engine。
 */

// ─── 从 @mealkey/memory-engine 导入 ───

export { MemoryEngine } from "@mealkey/memory-engine";
export { DefaultMemoryExtractor } from "@mealkey/memory-engine";
export { DefaultMemoryRetriever } from "@mealkey/memory-engine";

export type {
  MemoryItem,
  MemoryLayer,
  MemoryContext,
  MemoryExtractor,
  MemoryRetriever,
  MemoryStorage,
  MemoryFilter,
  Conversation,
  UserProfile,
  MemoryScore,
} from "@mealkey/memory-engine";

// Protocol 3: MemoryStore（新标准，从 agent-sdk re-export）
export type { MemoryStore, MemoryInput, MemoryLayer as MemoryLayerV2 } from "@mealkey/agent-sdk";
