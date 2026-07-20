/**
 * 决议引擎：双轨表决（一人一票 + Red Flag）为主；权重分为展示参考。
 */

import { getDecisionType } from "./catalog";
import { resolveDualTrack } from "./dual-track";
import type {
  CouncilOpinion,
  CouncilPosition,
  CouncilRoleId,
  DecisionResolution,
  DecisionTypeId,
  IssueLevel,
} from "./types";

function scorePosition(position: CouncilPosition, weight: number) {
  if (position === "support") return { support: weight, oppose: 0, conditional: 0 };
  if (position === "oppose") return { support: 0, oppose: weight, conditional: 0 };
  return { support: 0, oppose: 0, conditional: weight };
}

export interface ResolveCouncilInput {
  decisionType: DecisionTypeId;
  opinions: CouncilOpinion[];
  /** 创始人是否已确认（L3/L4 需要） */
  founderConfirmed?: boolean;
  unresolvedQuestions?: string[];
  /** 议题级别：驱动双轨通过门槛 */
  level?: IssueLevel;
}

/** @deprecated 与 DecisionResolution 同义 */
export type ResolveCouncilResult = DecisionResolution;

export function resolveCouncilDecision(input: ResolveCouncilInput): DecisionResolution {
  const dt = getDecisionType(input.decisionType);
  const dual = resolveDualTrack({
    decisionType: input.decisionType,
    opinions: input.opinions,
    level: input.level,
    founderConfirmed: input.founderConfirmed,
  });

  let support_score = 0;
  let oppose_score = 0;
  let conditional_score = 0;
  const majority_view: string[] = [];
  const minority_report: string[] = [];
  const required_conditions: string[] = [];
  const veto_flags: string[] = [];

  const highWeight = Math.max(...Object.values(dt.weights));

  for (const op of input.opinions) {
    const weight = dt.weights[op.member] ?? op.weight ?? 3;
    const s = scorePosition(op.position, weight);
    support_score += s.support;
    oppose_score += s.oppose;
    conditional_score += s.conditional;

    if (op.position === "support") {
      majority_view.push(`[${op.member}] ${op.summary}`);
    } else if (op.position === "oppose") {
      minority_report.push(`[${op.member}] ${op.summary}`);
    } else {
      majority_view.push(`[${op.member}/条件] ${op.summary}`);
    }

    if (op.conditions?.length) required_conditions.push(...op.conditions);

    if (op.veto && !dt.veto_roles.includes(op.member) && op.member !== "CFO" && op.member !== "CRO") {
      minority_report.push(
        `[${op.member}/非授权否决降级] ${op.veto_reason || op.summary}`,
      );
    }

    if (op.position === "oppose" && weight >= highWeight) {
      minority_report.push(`[高权重反对/${op.member}] ${op.summary}`);
    }

    if (op.minority_report && op.position !== "oppose") {
      minority_report.push(`[${op.member}/少数保留] ${op.summary}`);
    }
  }

  for (const flag of dual.track_b.red_flags) {
    const alt = flag.alternative ? `；替代：${flag.alternative}` : "；须补替代方案";
    veto_flags.push(`${flag.role}: ${flag.reason}${alt}`);
    if (flag.alternative) required_conditions.push(flag.alternative);
  }

  const uniqConditions = [...new Set(required_conditions.filter(Boolean))];
  const uniqMinority = [...new Set(minority_report.filter(Boolean))];
  const uniqMajority = [...new Set(majority_view.filter(Boolean))];

  const kill =
    input.opinions.find((o) => o.prediction?.kill_metric)?.prediction?.kill_metric ??
    "验证周期内未达最低成功阈值则停损";

  return {
    recommended_action: dual.recommended_action,
    weighted_result: { support_score, oppose_score, conditional_score },
    majority_view: [
      `【Track A 一人一票】支持${dual.track_a.support} / 反对${dual.track_a.oppose} / 条件${dual.track_a.conditional} → 多数侧 ${dual.track_a.majority_side}`,
      ...uniqMajority,
    ],
    minority_report: uniqMinority,
    unresolved_questions: input.unresolvedQuestions ?? [],
    required_conditions: uniqConditions,
    veto_flags,
    execution_bet: {
      expected_upside: uniqMajority[0],
      worst_case: uniqMinority[0] || veto_flags[0],
      kill_metric: kill,
      validation_cycle: "默认 90 天，按决议覆盖",
    },
  };
}

export function attachWeights(
  opinions: CouncilOpinion[],
  decisionType: DecisionTypeId,
): CouncilOpinion[] {
  const dt = getDecisionType(decisionType);
  return opinions.map((o) => ({
    ...o,
    weight: dt.weights[o.member as CouncilRoleId] ?? o.weight ?? 3,
  }));
}
