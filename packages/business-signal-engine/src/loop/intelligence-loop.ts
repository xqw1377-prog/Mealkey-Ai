/**
 * Intelligence Loop 阶段常量（产品冻结）
 */

export const INTELLIGENCE_LOOP_STAGES = [
  "observe",
  "detect",
  "understand",
  "judge",
  "recommend",
  "learn",
] as const;

export type IntelligenceLoopStageV1 =
  (typeof INTELLIGENCE_LOOP_STAGES)[number];

export const INTELLIGENCE_LOOP_LABEL_ZH: Record<
  IntelligenceLoopStageV1,
  string
> = {
  observe: "观察",
  detect: "发现变化",
  understand: "理解原因",
  judge: "判断影响",
  recommend: "建议行动",
  learn: "结果学习",
};
