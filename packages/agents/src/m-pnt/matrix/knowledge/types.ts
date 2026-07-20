/**
 * M-PNT 矩阵知识蒸馏 — 类型定义
 *
 * 三学派标签：ries（心智占位）| trout（竞争空位）| ye_maozhong（冲突营销）
 */

export type TheorySource = "ries" | "trout" | "ye_maozhong";

/** 理论规则 — 蒸馏后可执行的判断标准 */
export interface TheoryRule {
  id: string;
  theory_source: TheorySource;
  name: string;
  principle: string;
  decision_question: string;
  applicable_context: string[];
  key_variables: string[];
  decision_rules: string[];
  anti_patterns: string[];
  output_implication: string;
}

/** 案例资产 — 围绕品牌定位决策过程的可复用案例 */
export interface CaseAsset {
  id: string;
  brand_name: string;
  category: string;
  city_context: string;
  market_stage: string;
  project_stage: string;
  initial_problem: string;
  resource_condition: string;
  competition_context: string;
  candidate_positions: string[];
  final_position: string;
  why_choose: string;
  why_not_others: string;
  differentiation_design: string;
  execution_actions: string[];
  market_feedback: string;
  result_summary: string;
  success_or_failure: "success" | "failure";
  quality_tier: "gold_case" | "silver_case" | "bronze_case";
  mental_takeaway: string;
  reusable_principles: string[];
  risk_lessons: string[];
  theory_tags: TheorySource[];
}

/** 商规检验结果（apply-rules 输出） */
export interface LawCheckResult {
  law: string;
  pass: boolean;
  delta: number;
  note: string;
}
