/**
 * User Intelligence Evolution — Intelligence Profile V1 契约
 * 权威：docs/FOUNDER_OS_USER_INTELLIGENCE_EVOLUTION_V1_FREEZE.md
 * 挂载：Memory + Growth 加深；禁止第七 Runtime / 学习顾问席
 */

import type { FounderCapabilityDim } from "./growth-runtime";

export type MemoryPermissionState = {
  /** 保存本次经营经验到本人/本项目记忆 */
  saveExperience: boolean;
  /** 用于个人能力提升与后续建议校准 */
  useForPersonalGrowth: boolean;
  /** 脱敏后贡献行业模型（默认必须为 false，直至显式 opt-in） */
  contributeToIndustryModel: boolean;
  confirmedAt?: string;
};

export const DEFAULT_MEMORY_PERMISSIONS: MemoryPermissionState = {
  saveExperience: true,
  useForPersonalGrowth: true,
  contributeToIndustryModel: false,
};

export type DecisionStyleProfile = {
  riskPreference: "conservative" | "balanced" | "aggressive" | "unknown";
  speedPreference: "deliberate" | "balanced" | "fast" | "unknown";
  detailLevel: "high" | "medium" | "low" | "unknown";
  aiStance: "follow" | "negotiate" | "override" | "unknown";
};

export type IntelligenceCapabilityScore = {
  dim: FounderCapabilityDim;
  score: number;
  confidence: number;
  note?: string;
};

export type HistoricalLesson = {
  lessonId: string;
  summary: string;
  source: "decision" | "execution" | "override" | "validation";
  outcome: "confirmed" | "partial" | "invalidated" | "unknown";
};

/** 经营者数字镜像 — 读模型 / 投影 */
export type FounderIntelligenceProfile = {
  ownerId: string;
  projectId?: string;
  version: "v1";
  updatedAt: string;
  confidence: number;
  personality: {
    summary: string;
    traits: string[];
  };
  decisionStyle: DecisionStyleProfile;
  businessCapability: IntelligenceCapabilityScore[];
  knowledgeLevel: {
    categoryFamiliarity: "low" | "medium" | "high" | "unknown";
    notes: string[];
  };
  executionAbility: {
    recentCompletionRate: number | null;
    followThrough: "weak" | "mixed" | "strong" | "unknown";
  };
  historicalLessons: HistoricalLesson[];
  permissions: MemoryPermissionState;
};

export type DecisionBehaviorSignal = {
  kind: "decision_choice";
  decisionId?: string;
  caseId?: string;
  topic: string;
  optionsShown: string[];
  choice: string;
  vsRecommended?: "aligned" | "modified" | "overturned";
  at: string;
};

export type OverrideBehaviorSignal = {
  kind: "override_ai";
  recommendation: string;
  userChoice: string;
  reason?: string;
  laterOutcome?: "success" | "fail" | "mixed" | "unknown";
  at: string;
};

export type ExecutionBehaviorSignal = {
  kind: "execution_followthrough";
  planId?: string;
  completionRate: number;
  windowDays: number;
  at: string;
};

export type OutcomeBehaviorSignal = {
  kind: "prediction_error";
  metric: string;
  predicted: number;
  actual: number;
  unit?: string;
  at: string;
};

export type BehaviorSignal =
  | DecisionBehaviorSignal
  | OverrideBehaviorSignal
  | ExecutionBehaviorSignal
  | OutcomeBehaviorSignal;

export function emptyIntelligenceProfile(input: {
  ownerId: string;
  projectId?: string;
  now?: string;
}): FounderIntelligenceProfile {
  const now = input.now ?? new Date().toISOString();
  return {
    ownerId: input.ownerId,
    projectId: input.projectId,
    version: "v1",
    updatedAt: now,
    confidence: 0,
    personality: { summary: "", traits: [] },
    decisionStyle: {
      riskPreference: "unknown",
      speedPreference: "unknown",
      detailLevel: "unknown",
      aiStance: "unknown",
    },
    businessCapability: [],
    knowledgeLevel: { categoryFamiliarity: "unknown", notes: [] },
    executionAbility: {
      recentCompletionRate: null,
      followThrough: "unknown",
    },
    historicalLessons: [],
    permissions: { ...DEFAULT_MEMORY_PERMISSIONS },
  };
}
