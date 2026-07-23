/**
 * Skill Engine V1 契约
 * 真源：docs/MEALKEY_SKILL_ENGINE_V1.md
 * Skill = Role × Scenario × Behavior × Outcome
 */

export type SkillRole = "owner" | "manager" | "server" | "chef";

/** L1 知道 → L5 专家（非考试分） */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export type RubricItemV1 = {
  id: string;
  label: string;
  /** 命中任一关键词加分 */
  keywords: string[];
  weight: number;
  /** 命中则扣分（坏习惯） */
  penaltyKeywords?: string[];
};

export type ScenarioDrillV1 = {
  id: string;
  role: SkillRole;
  skillKey: string;
  title: string;
  /** AI 开场 */
  scenarioPrompt: string;
  /** 模拟对方台词（可选） */
  customerLine?: string;
  behaviorSteps: string[];
  /** 经营结果链（挂图谱） */
  outcomeChain: string[];
  causalChainId?: string;
  rubric: RubricItemV1[];
};

export type DrillRubricScoreV1 = {
  id: string;
  label: string;
  hit: boolean;
  note: string;
};

export type DrillEvaluationV1 = {
  drillId: string;
  score: number;
  level: SkillLevel;
  levelLabel: string;
  rubricScores: DrillRubricScoreV1[];
  strengths: string[];
  improvements: string[];
  feedbackMarkdown: string;
  outcomeReminder: string;
};

export type ActiveDrillV1 = {
  drillId: string;
  role: SkillRole;
  title: string;
  startedAt: string;
  status: "awaiting_answer" | "completed";
  lastEvaluation?: DrillEvaluationV1;
  attemptCount: number;
};

export type SkillEngineTurnResultV1 = {
  kind: "start" | "evaluate" | "exit";
  activeDrill: ActiveDrillV1 | null;
  coachText: string;
  evaluation?: DrillEvaluationV1;
  artifactBody?: string;
  artifactTitle?: string;
};
