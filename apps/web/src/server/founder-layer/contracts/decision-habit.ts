/**
 * 经营决策习惯 V1（内部可称 Decision DNA）
 * 权威：MEALKEY_DECISION_EXPERIENCE_V1
 *
 * 对外禁止：「决策人格」「心理测评」话术。
 */

export type OperatingDecisionHabitV1 = {
  schemaVersion: 1;
  projectId: string;
  /** 短标签，如：增长导向、执行快 */
  traits: string[];
  /** 老板可见提醒（非人格诊断） */
  reminder: string;
  /** 来自最近复盘 */
  lastLesson?: string;
  sampleCount: number;
  updatedAt: string;
  sourceDecisionIds: string[];
};

/** profile JSON 键 */
export const PROFILE_HABIT_KEY = "operatingDecisionHabit" as const;

export const FORBIDDEN_HABIT_UI_LABELS = [
  "决策人格",
  "你的决策人格",
  "心理测评",
  "性格测试",
] as const;
