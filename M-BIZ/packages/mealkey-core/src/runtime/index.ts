/**
 * Runtime 模块导出（精简）
 *
 * 唯一活跃组件：ChallengeEngine（被 ChiefAgent 使用）。
 * 其余旧模块（ContextBuilder / ReasoningEngine / MemoryManager / CapabilityRegistry
 * / DecisionModelEngine / ActionPlanner）已因 ChiefAgent 合并而废弃，不再导出。
 */

// ─── 活跃组件 ───

export { ChallengeEngine } from "./decision/challenge-engine";

export type { ChallengeResult, Challenge } from "./decision/challenge-engine";
