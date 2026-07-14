/**
 * MealKey Intelligence Layer — 经营智能层
 *
 * Learning Engine — 学习引擎（结果→反馈→进化）
 * Auto Extractor — 从对话中自动提取知识
 */

export { LearningEngine } from "./learning-engine";
export type { LearningOutcome, LearningInsight, LearningEngineDeps, KnowledgeRefRecord } from "./learning-engine";

export { AutoKnowledgeExtractor, globalAutoExtractor } from "./auto-extractor";
export type { KnowledgeFragment } from "./auto-extractor";
