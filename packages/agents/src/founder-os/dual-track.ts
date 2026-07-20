/**
 * 双轨表决：Track A 一人一票多数 + Track B Red Flag 专业否决
 */

import { getDecisionType } from "./catalog";
import type {
  CouncilOpinion,
  CouncilRoleId,
  DecisionTypeId,
  DualTrackVoteResult,
  RecommendedAction,
} from "./types";

/** 默认红线角色（Red Flag Protocol） */
export const RED_FLAG_ROLES: CouncilRoleId[] = ["CFO", "CRO", "COO"];

export interface DualTrackInput {
  decisionType: DecisionTypeId;
  opinions: CouncilOpinion[];
  /** 议题级别影响通过人数门槛 */
  level?: "L1" | "L2" | "L3" | "L4";
  founderConfirmed?: boolean;
}

function majoritySide(
  support: number,
  oppose: number,
  conditional: number,
): DualTrackVoteResult["track_a"]["majority_side"] {
  const advance = support + conditional;
  if (advance === oppose && advance === 0) return "tie";
  if (oppose > advance) return "oppose";
  if (support >= oppose && support >= conditional) return "support";
  if (conditional >= support && conditional >= oppose) return "conditional";
  if (advance > oppose) return support >= conditional ? "support" : "conditional";
  return "tie";
}

function passThreshold(level: DualTrackInput["level"], rosterSize: number): number {
  if (level === "L4") return rosterSize; // 全员推进侧（support+conditional）更严：要求无纯反对压力时由红线管
  if (level === "L3") return Math.ceil(rosterSize * 0.85); // ~6/7
  if (level === "L2") return Math.ceil(rosterSize * 0.6);
  return Math.ceil(rosterSize * 0.5);
}

/**
 * 双轨决议：
 * - Track A：一人一票形成多数意见
 * - Track B：授权角色有效 veto → blocked，强制暂缓，且应有替代方案
 */
export function resolveDualTrack(input: DualTrackInput): DualTrackVoteResult {
  const dt = getDecisionType(input.decisionType);
  let support = 0;
  let oppose = 0;
  let conditional = 0;
  const red_flags: DualTrackVoteResult["track_b"]["red_flags"] = [];

  for (const op of input.opinions) {
    if (op.position === "support") support += 1;
    else if (op.position === "oppose") oppose += 1;
    else conditional += 1;

    const authorized =
      RED_FLAG_ROLES.includes(op.member) &&
      (dt.veto_roles.includes(op.member) || op.member === "CFO" || op.member === "CRO");

    // COO 仅在 decisionType 授权时生效
    const cooOk = op.member !== "COO" || dt.veto_roles.includes("COO");

    if (op.veto && authorized && cooOk) {
      red_flags.push({
        role: op.member,
        reason: op.veto_reason || op.summary || "红线触发",
        alternative:
          op.conditions?.[0] ||
          (op.reasoning?.find((r) => /替代|改为|建议先/.test(r)) ?? undefined),
      });
    }
  }

  const blocked = red_flags.length > 0;
  const side = majoritySide(support, oppose, conditional);
  const rosterSize = input.opinions.length || 7;
  const need = passThreshold(input.level ?? "L3", rosterSize);
  const advanceCount = support + conditional;
  const founderOk =
    !input.level ||
    input.level === "L1" ||
    input.level === "L2" ||
    Boolean(input.founderConfirmed);

  let recommended_action: RecommendedAction;
  if (blocked) {
    recommended_action = "暂缓";
  } else if (side === "oppose" || oppose > advanceCount) {
    recommended_action = "推翻";
  } else if (advanceCount >= need && founderOk) {
    recommended_action = "执行";
  } else if (advanceCount >= need && !founderOk) {
    recommended_action = "暂缓";
  } else {
    recommended_action = "暂缓";
  }

  return {
    track_a: { support, oppose, conditional, majority_side: side },
    track_b: { red_flags, blocked },
    recommended_action,
  };
}
