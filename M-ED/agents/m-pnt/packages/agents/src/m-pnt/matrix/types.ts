/**
 * 三理论 Agent 矩阵 — 类型协议
 *
 * 每一个理论 = 一个 TheoryAgent（ries / trout / ye_maozhong）
 * 它们不是 @mealkey/agents 顶层产品 Agent，而是 M-PNT 内部的正交子 Agent。
 * Cross-Fire / Synthesis 也是矩阵内专职 Agent。
 */

export type TheoryAgentId = "ries" | "trout" | "ye_maozhong";

export type TheoryRecommend =
  | "strong_recommend"
  | "recommend"
  | "neutral"
  | "not_recommend";

export type DecisionRecommend = "primary" | "secondary" | "backup" | "reject";

export type RiskLevel = "R1" | "R2" | "R3" | "R4";

export interface PositionCandidate {
  id: string;
  name: string;
  oneLiner: string;
  type: string;
  focus: string;
}

/** 三理论共享 Input Package — 禁止各 Agent 改写事实字段 */
export interface MatrixInputPackage {
  project: {
    name?: string;
    category?: string;
    city?: string;
    district?: string;
    stage?: string;
    budget?: number | string | null;
  };
  owner: {
    experience?: string;
    strengths: string[];
    weaknesses: string[];
  };
  previousSummary?: string;
  candidates: PositionCandidate[];
  constraints?: string[];
}

export interface DirectionScore {
  name: string;
  theory_score: number;
  theory_recommend: TheoryRecommend;
}

export interface TheoryRisk {
  risk: string;
  severity: RiskLevel;
}

/** 统一 Theory View 输出（每个理论 Agent 必须产出） */
export interface TheoryView {
  agent_id: TheoryAgentId;
  agent_name: string;
  preferred_direction: string;
  preferred_candidate_id?: string;
  why_this_direction: string;
  rejected_directions: Array<{ name: string; reason: string }>;
  core_strategic_logic: string;
  key_mental_position: string;
  main_risks: TheoryRisk[];
  direction_scores: DirectionScore[];
  theory_recommend: TheoryRecommend;
  recommendation_level: TheoryRecommend;
  confidence: number;
}

/** 理论 Agent 之间的攻击/反驳（博弈回合） */
export interface TheoryChallenge {
  from: TheoryAgentId;
  to: TheoryAgentId;
  /** 被攻击的对方首选方向 */
  target_direction: string;
  /** 攻击理由（来自攻击方理论体系） */
  attack: string;
  /** 被攻击方理论可能的防守点（简述） */
  defense_hint: string;
  severity: RiskLevel;
}

export interface CrossFireResult {
  agent_id: "cross_fire";
  /** 立场冲突（竞争面） */
  conflicts: string[];
  /** @deprecated 使用 hard_consensus / soft_consensus；保留兼容 */
  consensus: string[];
  /** 三方一致 → 硬共识 */
  hard_consensus: string[];
  /** 恰好两方一致 → 软共识（仍须博弈） */
  soft_consensus: string[];
  /** 相互攻击清单（博弈面） */
  challenges: TheoryChallenge[];
  /** 应淘汰方向 */
  eliminate: string[];
  /** 不可调和矛盾 */
  irreducible: string[];
  /** 一句话博弈叙事 */
  game_summary: string;
  notes: string;
}

export type MindPositionLevel = "A" | "B" | "C" | "D";

export interface SynthesisResult {
  agent_id: "synthesis";
  final_recommended_position: string;
  preferred_candidate_id?: string;
  decision_recommend: DecisionRecommend;
  secondary_option?: string;
  secondary_decision_recommend?: DecisionRecommend;
  backup_option?: string;
  rejected_options: string[];
  why_choose_this: string;
  why_not_others: string;
  theory_vote_summary: Record<
    TheoryAgentId,
    { preferred: string; theory_recommend: TheoryRecommend }
  >;
  /** 百分制综合评分（0-100） */
  overall_score: number;
  /** 心智占位等级 */
  mind_position_level: MindPositionLevel;
  /** 最大风险等级 */
  max_risk_severity: RiskLevel;
  /** 核心风险摘要 */
  core_risk_summary: string;
  /** 验证重点 */
  validation_focus: string;
  confidence: number;
}

export interface TheoryMatrixResult {
  inputPackage: MatrixInputPackage;
  views: {
    ries: TheoryView;
    trout: TheoryView;
    ye_maozhong: TheoryView;
  };
  crossFire: CrossFireResult;
  synthesis: SynthesisResult;
  /** 并行执行耗时 ms */
  elapsedMs: number;
}

/** Theory Agent 接口 — 一个理论 = 一个 Agent */
export interface TheoryAgent {
  id: TheoryAgentId;
  name: string;
  stance: string;
  systemPrompt: string;
  evaluate(
    pkg: MatrixInputPackage,
    options?: { llmHint?: string },
  ): Promise<TheoryView>;
}
