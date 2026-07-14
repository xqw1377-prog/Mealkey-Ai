/**
 * M-PNT 蒸馏层（已废弃）
 *
 * @deprecated V1 已使用 DecisionEngine 替代所有蒸馏功能。
 * 保留仅用于 V0 兼容回落。V2 中将移除。
 *
 * 替代方案：
 * - 六维诊断 → DecisionEngine.scoreCard / LLM Prompt Builder
 * - 候选生成 → buildMatrixInputPackage() + externalCandidates
 * - 红队挑战 → DecisionEngine 的 risk 识别
 * - 质量校验 → runQualityCheck() 在 runtime-v1.ts 中
 *
 * LLM Prompt Builder 在 llm/llm-prompt-builder.ts 中
 */
export { runSixDimensionDiagnosis, buildLLMSixDimensionPrompt } from "./six-dimension-engine";
export type { SixDimensionResult, DimensionLevel, OverallFeasibility } from "./six-dimension-engine";

export { generateCandidates, buildLLMCandidatePrompt } from "./candidate-generator";
export type { PositionCandidate_, CandidateStyle, EntryPointType } from "./candidate-generator";

export { runRedTeamChallenge, buildLLMRedTeamPrompt } from "./red-team-engine";
export type { ChallengeResult, ChallengedCandidate, ChallengeDimension } from "./red-team-engine";

export { runQualityCheck, buildLLMQualityCheckPrompt } from "./quality-checker";
export type { QualityCheckResult, QualityInput } from "./quality-checker";
