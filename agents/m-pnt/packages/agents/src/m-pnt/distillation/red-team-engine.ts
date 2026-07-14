/**
 * 红队挑战引擎（精简版）
 *
 * @deprecated 使用 DecisionEngine 的 risk 识别替代。
 * LLM 模式下由 LLM 完成红队挑战。
 * 此文件保留旧版逻辑作为回落，并导出 LLM Prompt 构建函数。
 */
import type { RiskLevel } from "../matrix/types";
import { buildRedTeamPrompt } from "../llm/llm-prompt-builder";

export type ChallengeDimension = "mental" | "customer" | "scene" | "competition" | "resource" | "time";

export interface ChallengeResult {
  dimension: ChallengeDimension;
  risk: string;
  severity: RiskLevel;
  failureSignal: string;
  mitigationHint: string;
  isElimination: boolean;
}

export interface ChallengedCandidate {
  name: string;
  oneLiner: string;
  challenges: ChallengeResult[];
  maxSeverity: RiskLevel;
  isEliminated: boolean;
}

/**
 * 构建 LLM 用的红队挑战 Prompt
 */
export function buildLLMRedTeamPrompt(
  candidateName: string,
  oneLiner: string,
  category: string,
  city: string,
  budget: number,
): string {
  return buildRedTeamPrompt(candidateName, oneLiner, category, city, budget);
}

/**
 * 旧版规则引擎回落
 */
export function runRedTeamChallenge(
  candidates: Array<{ id: string; name: string; oneLiner: string }>,
  context: { category: string; budget: number; strengths: string[]; weaknesses: string[]; experience: string },
): ChallengedCandidate[] {
  return candidates.map((c) => {
    const challenges = simpleChallenges(c, context);
    const severities = challenges.map((ch) => ch.severity);
    const max = computeMax(severities);
    return {
      name: c.name,
      oneLiner: c.oneLiner,
      challenges: challenges.slice(0, 4),
      maxSeverity: max,
      isEliminated: challenges.some((ch) => ch.isElimination && ch.severity === "R4"),
    };
  });
}

function simpleChallenges(
  candidate: { id: string; name: string; oneLiner: string },
  _ctx: { category: string; budget: number; strengths: string[]; weaknesses: string[]; experience: string },
): ChallengeResult[] {
  const results: ChallengeResult[] = [];
  const len = candidate.oneLiner.length;

  if (len > 30) {
    results.push({ dimension: "mental", risk: "定位语过长", severity: "R2", failureSignal: "消费者记不住", mitigationHint: "压缩到25字以内", isElimination: false });
  }
  if (/所有人|都|大众/.test(candidate.oneLiner)) {
    results.push({ dimension: "customer", risk: "客群过宽", severity: "R3", failureSignal: "定位模糊", mitigationHint: "收窄到单一客群", isElimination: true });
  }
  results.push({ dimension: "time", risk: "需评估长期可行性", severity: "R1", failureSignal: "市场变化", mitigationHint: "定期评估有效性", isElimination: false });

  if (results.length === 0) {
    results.push({ dimension: "mental", risk: "需验证消费者是否能记住", severity: "R1", failureSignal: "转述率低", mitigationHint: "做转述测试", isElimination: false });
  }
  return results;
}

function computeMax(severities: RiskLevel[]): RiskLevel {
  if (severities.some((s) => s === "R4")) return "R4";
  if (severities.some((s) => s === "R3")) return "R3";
  if (severities.some((s) => s === "R2")) return "R2";
  return "R1";
}
