/**
 * Decision Engine — 决策引擎
 *
 * 唯一活跃组件：ChallengeEngine（被 ChiefAgent 使用）。
 * DecisionModelEngine / ActionPlanner 已因 ChiefAgent 合并而废弃。
 */

export { ChallengeEngine } from "./challenge-engine";
export type { Challenge, ChallengeType, ChallengeResult } from "./challenge-engine";
