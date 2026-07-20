/**
 * Decision Brief — Founder OS 核心决策资产
 * Founder Override — 非第八常委，必须留笔记
 */

import { CONFLICT_AXES, getDecisionType } from "./catalog";
import type {
  CasePacket,
  CouncilOpinion,
  CouncilRoleId,
  DecisionBrief,
  DecisionBriefConflict,
  DecisionResolution,
  EvidencePacket,
  ExpertReport,
  FounderDecisionNote,
  RecommendedAction,
  ValidationPlan,
} from "./types";

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

/** 从常委意见中抽取冲突轴（启发式） */
export function detectCouncilConflicts(
  opinions: CouncilOpinion[],
): DecisionBriefConflict[] {
  const byMember = new Map(opinions.map((o) => [o.member, o]));
  const out: DecisionBriefConflict[] = [];

  for (const axis of CONFLICT_AXES) {
    const roles = axis.sides.filter((s) =>
      ["CSO", "CMO", "CBO", "BMO", "CFO", "COO", "CRO"].includes(s),
    ) as CouncilRoleId[];
    if (roles.length < 2) continue;
    const [a, b] = roles;
    const oa = byMember.get(a!);
    const ob = byMember.get(b!);
    if (!oa || !ob) continue;
    if (oa.position === ob.position && oa.position !== "conditional") continue;
    if (oa.position === "support" && ob.position === "support") continue;

    const opposeSide =
      oa.position === "oppose"
        ? oa
        : ob.position === "oppose"
          ? ob
          : oa.position === "conditional"
            ? oa
            : ob;

    out.push({
      axis: axis.label,
      summary: axis.essence,
      sides: [a!, b!],
      strongestObjection: `[${opposeSide.member}] ${opposeSide.summary}`,
    });
  }
  return out;
}

export interface BuildDecisionBriefInput {
  casePacket: CasePacket;
  evidencePacket?: EvidencePacket;
  expertReports: ExpertReport[];
  councilOpinions: CouncilOpinion[];
  resolution: DecisionResolution;
  validationPlan?: Partial<ValidationPlan>;
  founderOverride?: DecisionBrief["founderOverride"];
}

export function buildDecisionBrief(input: BuildDecisionBriefInput): DecisionBrief {
  const kill =
    input.resolution.execution_bet?.kill_metric ??
    "验证周期内未达最低成功阈值则停损";
  const cycle =
    input.validationPlan?.cycle ??
    input.resolution.execution_bet?.validation_cycle ??
    "90 天";

  return {
    briefId: buildId("DB"),
    createdAt: new Date().toISOString(),
    casePacket: input.casePacket,
    evidencePacket: input.evidencePacket,
    expertReports: input.expertReports,
    councilOpinions: input.councilOpinions,
    conflicts: detectCouncilConflicts(input.councilOpinions),
    resolution: input.resolution,
    founderOverride: input.founderOverride,
    validationPlan: {
      cycle,
      killMetric: input.validationPlan?.killMetric ?? kill,
      successMetrics: input.validationPlan?.successMetrics ?? [],
      owners: input.validationPlan?.owners ?? [],
    },
    learningHook: {
      outcomeStatus: "pending",
      whoWasRight: "unknown",
    },
  };
}

export interface ApplyFounderOverrideInput {
  brief: DecisionBrief;
  founderAction: RecommendedAction;
  whyDisagree: string[];
  /** 我的核心判断 */
  coreJudgment?: string;
  acceptedRisks?: string[];
  /** 验证方式 */
  validationMethod?: string;
  personalThesis?: string;
}

/**
 * 创始人 Override：不改写常委票，只覆盖最终行动并留下笔记。
 */
export function applyFounderOverride(
  input: ApplyFounderOverrideInput,
): DecisionBrief {
  const councilRec = input.brief.resolution.recommended_action;
  const overrode = input.founderAction !== councilRec;

  const note: FounderDecisionNote = {
    caseId: input.brief.casePacket.caseId,
    councilRecommendation: councilRec,
    founderAction: input.founderAction,
    overrode,
    whyDisagree:
      overrode && input.whyDisagree.length === 0
        ? ["未填写分歧理由（系统要求至少一条）"]
        : input.whyDisagree,
    coreJudgment: input.coreJudgment ?? input.personalThesis,
    acceptedRisks: input.acceptedRisks ?? [],
    validationMethod: input.validationMethod,
    personalThesis: input.personalThesis,
    timestamp: new Date().toISOString(),
  };

  return {
    ...input.brief,
    founderOverride: {
      overrode,
      finalAction: input.founderAction,
      note,
    },
  };
}

/** 权重整数 → 百分比（用于展示） */
export function weightsToPercent(
  decisionType: CasePacket["decisionType"],
): Record<CouncilRoleId, number> {
  const w = getDecisionType(decisionType).weights;
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const out = {} as Record<CouncilRoleId, number>;
  for (const [k, v] of Object.entries(w) as Array<[CouncilRoleId, number]>) {
    out[k] = Math.round((v / sum) * 1000) / 1000;
  }
  return out;
}
