/**

 * Founder OS — 四大能力评分

 * 严谨性：能力分反映「验证后的解决力」，不是开会活跃度。

 * 无 validated_outcome / 结果反馈时，分数上限压住，禁止假装变强。

 */



import type {

  ActionPlan,

  CapabilityScore,

  CapabilityScoreId,

  DecisionPack,

  InsightPack,

} from "../../contracts/capability";

import type { FounderMemorySnapshot } from "../../contracts/mission";

import { CAPABILITY_AGENT_LABEL } from "../../contracts/capability";



/** 无验证结果时，能力分不得突破此上限（防「开会涨分」） */

export const CAPABILITY_SCORE_CAP_WITHOUT_OUTCOME = 52;



function clamp(n: number, min = 32, max = 92) {

  return Math.max(min, Math.min(max, Math.round(n)));

}



function trendFrom(

  current: number,

  prior?: number,

): CapabilityScore["trend"] {

  if (prior == null || Number.isNaN(prior)) return "flat";

  const delta = current - prior;

  if (delta >= 4) return "up";

  if (delta <= -4) return "down";

  return "flat";

}



function priorMap(

  prior?: CapabilityScore[],

): Partial<Record<CapabilityScoreId, number>> {

  const out: Partial<Record<CapabilityScoreId, number>> = {};

  for (const s of prior ?? []) {

    out[s.id] = s.score;

  }

  return out;

}



export interface AssessCapabilityInput {

  memory?: FounderMemorySnapshot | null;

  insightPack?: InsightPack | null;

  decisionPack?: DecisionPack | null;

  actionPlan?: ActionPlan | null;

  priorScores?: CapabilityScore[];

  /** profile 上活跃验证任务数（可选） */

  activeValidationCount?: number;

  /**

   * 有真实结果反馈的决策数（validation complete / validated_outcome）

   * 开会、记 Memory 本身不算。

   */

  decisionsWithOutcome?: number;

  /** profile.evidenceLedger 中 validated_outcome 条数 */

  validatedOutcomeCount?: number;

}



/**

 * 从验证结果密度 + 记忆结构评估四大能力分。

 * 活动量只提供极弱信号；真实抬升依赖验证回写。

 */

export function assessFounderCapabilities(

  input: AssessCapabilityInput,

): CapabilityScore[] {

  const mem = input.memory;

  const facts = mem?.facts?.length ?? 0;

  const decisions = mem?.decisions?.length ?? 0;

  const preferences = mem?.preferences?.length ?? 0;

  const patterns = mem?.patterns?.length ?? 0;

  const successPatterns =

    mem?.patterns?.filter((p) => p.kind === "success").length ?? 0;

  const failurePatterns =

    mem?.patterns?.filter((p) => p.kind === "failure").length ?? 0;



  const insightCount = input.insightPack?.insights?.length ?? 0;

  const evidenceOk = input.decisionPack?.evidenceStatus === "sufficient";

  const hasDebate = Boolean(input.decisionPack?.debateSession);

  const riskCount = input.decisionPack?.risks?.length ?? 0;

  const actionCount = input.actionPlan?.actions?.length ?? 0;

  const goalCount = input.actionPlan?.goals?.length ?? 0;

  const hasValidation = Boolean(input.actionPlan?.validationTaskId);

  const activeVal = input.activeValidationCount ?? (hasValidation ? 1 : 0);

  const withOutcome = Math.max(0, input.decisionsWithOutcome ?? 0);

  const validatedOutcomes = Math.max(

    0,

    input.validatedOutcomeCount ?? withOutcome,

  );

  const hasRealOutcomes = validatedOutcomes > 0 || withOutcome > 0;



  const priors = priorMap(input.priorScores);



  // 活动信号压低权重：开会/洞察只能微调，不能主导分数

  const cognitionRaw =

    36 +

    Math.min(facts, 6) * 1.5 +

    Math.min(insightCount, 4) * 1.5 +

    Math.min(preferences, 3) * 1 +

    Math.min(validatedOutcomes, 5) * 5;



  const decisionRaw =

    36 +

    Math.min(decisions, 6) * 1.2 +

    (evidenceOk ? 6 : 0) +

    (hasDebate ? 3 : 0) +

    Math.min(riskCount, 3) * 1 +

    Math.min(validatedOutcomes, 5) * 6;



  const executionRaw =

    36 +

    Math.min(goalCount, 3) * 2 +

    Math.min(actionCount, 4) * 1.5 +

    (hasValidation || activeVal > 0 ? 4 : 0) +

    Math.min(activeVal, 2) * 2 +

    Math.min(withOutcome, 6) * 6;



  const growthRaw =

    36 +

    Math.min(patterns, 4) * 2 +

    Math.min(successPatterns, 3) * 2 +

    Math.min(failurePatterns, 3) * 3 +

    Math.min(withOutcome, 6) * 5 +

    (validatedOutcomes >= 2 ? 4 : 0);



  const defs: Array<{

    id: CapabilityScoreId;

    raw: number;

    note: string;

  }> = [

    {

      id: "cognition",

      raw: cognitionRaw,

      note: hasRealOutcomes

        ? "已有验证回写，世界图景开始可检验。"

        : "尚无验证结果；认知分不因会商抬升，先补可核验事实。",

    },

    {

      id: "decision",

      raw: decisionRaw,

      note: evidenceOk && hasRealOutcomes

        ? "证据门禁通过且有结果样本，决策可验证性上升。"

        : evidenceOk

          ? "本轮证据看似充分，但仍缺验证结果，不得宣称决策力已提升。"

          : "证据或验证样本不足；先压假设再进决策室。"

    },

    {

      id: "execution",

      raw: executionRaw,

      note: withOutcome > 0

        ? "已有行动结果回写，执行力按结果校准。"

        : activeVal > 0

          ? "验证任务在跑，结果未回写前执行分不上涨。"

          : "还缺可验证动作与结果；会商不等于执行力。",

    },

    {

      id: "growth",

      raw: growthRaw,

      note: withOutcome > 0 || patterns > 0

        ? "成败模式来自验证回写，飞轮才算转起来。"

        : "无验证样本时成长分锁低；完成一次结果回写后再评估。",

    },

  ];



  return defs.map((d) => {

    const cappedRaw = hasRealOutcomes

      ? d.raw

      : Math.min(d.raw, CAPABILITY_SCORE_CAP_WITHOUT_OUTCOME);

    const score = clamp(cappedRaw);

    // 无真实结果时禁止相对先验「上涨」——最多持平

    let trend = trendFrom(score, priors[d.id]);

    if (!hasRealOutcomes && trend === "up") {

      trend = "flat";

    }

    return {

      id: d.id,

      label: CAPABILITY_AGENT_LABEL[d.id],

      score,

      trend,

      note: d.note,

    };

  });

}



export function trendGlyph(trend: CapabilityScore["trend"]): "↑" | "→" | "↓" {

  if (trend === "up") return "↑";

  if (trend === "down") return "↓";

  return "→";

}


