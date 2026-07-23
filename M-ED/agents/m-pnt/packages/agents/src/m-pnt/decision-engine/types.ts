/**
 * M-PNT Decision Engine V1 — 类型定义
 *
 * 不改变现有 TheoryView / CrossFireResult / SynthesisResult 接口，
 * 新增内部使用的决策追踪和评分卡类型。
 */
import type { TheorySource, RiskLevel, TheoryRecommend, MatrixInputPackage, PositionCandidate } from "../matrix/types";

// ─── 六维评分卡 ───────────────────────────────────────────────

export type DimensionId =
  | 'mental_uniqueness'
  | 'competitive_strength'
  | 'customer_fit'
  | 'executability'
  | 'long_term_defense'
  | 'risk_controllability';

export interface DimensionDef {
  id: DimensionId;
  name: string;
  weight: number;           // 标准权重（满分）
  theoryWeights?: Partial<Record<TheorySource, number>>;  // 按理论调整
  scoreFn: (candidate: PositionCandidate, pkg: MatrixInputPackage, theoryId: TheorySource) => DimensionScore;
}

export interface DimensionScore {
  score: number;            // 0-100
  reason: string;           // 评分理由
  evidence?: string;        // 支撑数据
  risk?: {
    risk: string;
    severity: RiskLevel;
  };
}

// ─── 决策追踪 ─────────────────────────────────────────────────

export interface DimensionTrace {
  dimensionId: DimensionId;
  dimensionName: string;
  rawScore: number;         // 原始分 0-100
  weight: number;           // 该理论下使用的权重
  weightedScore: number;    // rawScore * weight / 100
  reason: string;
  evidence?: string;
  risk?: {
    risk: string;
    severity: RiskLevel;
  };
}

export interface DecisionTraceEntry {
  candidateId: string;
  candidateName: string;
  candidateOneLiner: string;
  theoryId: TheorySource;
  dimensions: DimensionTrace[];
  totalScore: number;       // 加权总分 0-100
  theoryRecommend: TheoryRecommend;
  mainRisks: Array<{ risk: string; severity: RiskLevel }>;
  timestamp: number;
}

// ─── 引擎配置 ─────────────────────────────────────────────────

export interface DecisionEngineConfig {
  /** 启用决策追踪 */
  enableTracing?: boolean;
  /** 评分卡维度定义（可覆盖默认） */
  customDimensions?: DimensionDef[];
  /** 各理论体系的决策规则权重 */
  theoryDecisionRules?: Partial<Record<TheorySource, {
    /** 理论推荐等级映射阈值 */
    thresholds?: {
      strong_recommend: number;
      recommend: number;
      neutral: number;
    };
    /** 该理论特有关注点 */
    focusKeywords?: string[];
  }>>;
}
