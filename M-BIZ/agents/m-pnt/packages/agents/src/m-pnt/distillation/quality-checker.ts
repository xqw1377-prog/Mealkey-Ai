/**
 * 质量校验引擎（精简版）
 *
 * @deprecated 使用 runtime-v1.ts 的 runQualityCheck() 替代。
 * LLM 模式下由 LLM 完成质量校验。
 * 此文件保留旧版逻辑作为回落。
 */
import type { DecisionRecommend, MindPositionLevel } from "../matrix/types";
import { buildQualityCheckPrompt } from "../llm/llm-prompt-builder";

export interface QualityCheckResult {
  is_pass: boolean;
  scoring: { mental_uniqueness: number; competitive_strength: number; customer_fit: number; executability: number; long_term_defense: number; risk_controllability: number; total: number };
  mind_position_level: MindPositionLevel;
  quality_issues: string[];
  missing_parts: string[];
  revision_suggestions: string[];
  bottom_line_check: { has_clear_conclusion: boolean; has_why_choose: boolean; has_why_not: boolean; has_risk: boolean; has_validation: boolean; all_pass: boolean };
}

export interface QualityInput {
  decision_recommend?: DecisionRecommend;
  overall_score?: number;
  why_choose_this?: string;
  why_not_others?: string;
  risks?: Array<{ risk?: string; severity?: string }>;
  validation?: Record<string, unknown>;
  candidates?: unknown[];
  theory_vote_summary?: Record<string, unknown>;
}

/**
 * 构建 LLM 用的质量校验 Prompt
 */
export function buildLLMQualityCheckPrompt(solutionJson: string): string {
  return buildQualityCheckPrompt(solutionJson);
}

/**
 * 旧版规则引擎回落
 */
export function runQualityCheck(input: QualityInput): QualityCheckResult {
  const issues: string[] = [];
  const missing: string[] = [];
  const suggestions: string[] = [];

  if (!input.decision_recommend) { missing.push("缺少 decision_recommend"); issues.push("没有明确推荐"); suggestions.push("给出 primary/secondary/backup/reject"); }
  if (!input.why_choose_this || input.why_choose_this.length < 10) { missing.push("缺少推荐理由"); issues.push("用户不知道为什么选这个方向"); suggestions.push("写清胜出理由"); }
  if (!input.why_not_others || input.why_not_others.length < 10) { missing.push("缺少不选理由"); issues.push("用户不知道为什么没选其他"); suggestions.push("写清被淘汰方向的问题"); }
  if (!Array.isArray(input.risks) || input.risks.length === 0) { missing.push("缺少风险提示"); issues.push("没有风险提示"); suggestions.push("至少包含1个R2+风险"); }
  if (!input.validation) { missing.push("缺少验证路径"); issues.push("没有验证路径"); suggestions.push("添加30/90天验证动作"); }

  const mental_uniqueness = input.theory_vote_summary ? 10 : 0;
  const competitive_strength = (input.candidates && input.candidates.length >= 3) ? 10 : 5;
  const customer_fit = input.theory_vote_summary ? 7 : 0;
  const executability = input.why_choose_this ? 7 : 0;
  const long_term_defense = input.decision_recommend === "primary" ? 8 : 5;
  const risk_controllability = Array.isArray(input.risks) && input.risks.length > 0 ? 10 : 0;
  let total = mental_uniqueness + competitive_strength + customer_fit + executability + long_term_defense + risk_controllability;
  if (total > 100) total = 100;
  const scoring = { mental_uniqueness, competitive_strength, customer_fit, executability, long_term_defense, risk_controllability, total };

  const mindLevel: MindPositionLevel = scoring.total >= 75 ? "A" : scoring.total >= 55 ? "B" : scoring.total >= 35 ? "C" : "D";
  const bottomLine = { has_clear_conclusion: !!input.decision_recommend, has_why_choose: !!input.why_choose_this && input.why_choose_this.length >= 10, has_why_not: !!input.why_not_others && input.why_not_others.length >= 10, has_risk: Array.isArray(input.risks) && input.risks.length > 0, has_validation: !!input.validation, all_pass: false };
  bottomLine.all_pass = bottomLine.has_clear_conclusion && bottomLine.has_why_choose && bottomLine.has_why_not && bottomLine.has_risk && bottomLine.has_validation;

  return { is_pass: missing.length === 0 && bottomLine.all_pass, scoring, mind_position_level: mindLevel, quality_issues: issues, missing_parts: missing, revision_suggestions: suggestions, bottom_line_check: bottomLine };
}
