/**
 * Category Decision — 战场评分卡、强制决策理由、覆盖推荐协议
 */
import type {
  BrandBrief,
  CategoryBattlefieldOption,
  CategoryDecision,
  CategoryDiagnosis,
  PrimaryFact,
} from "./types";
import { ContractGateError } from "./types";
import {
  primaryFactStrengthBoost,
  summarizePrimaryFactStrength,
} from "./evidence-ledger-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function scoreTotal(s: {
  opportunity: number;
  defensibility: number;
  resourceFit: number;
  evidenceStrength: number;
}) {
  return Math.round(
    s.opportunity * 0.3 +
      s.defensibility * 0.3 +
      s.resourceFit * 0.2 +
      s.evidenceStrength * 0.2,
  );
}

/**
 * 生成带评分卡的候选战场（推荐项总分最高，其余为高压否决对照）
 */
export function buildBattlefieldOptions(input: {
  brief: BrandBrief;
  city: string;
  categoryName: string;
  primaryFacts?: PrimaryFact[];
}): CategoryBattlefieldOption[] {
  const { brief, city, categoryName, primaryFacts = [] } = input;
  const customer = brief.targetCustomer || "核心客群";
  const need = brief.customerNeed || "核心需求";
  const boost = primaryFactStrengthBoost(primaryFacts);
  const beliefHint = brief.founderBelief
    ? `创始人信念：${brief.founderBelief}`
    : "创始人信念未声明，证据权重偏低";
  const strengthHint = summarizePrimaryFactStrength(primaryFacts);

  const sceneScores = {
    opportunity: 85,
    defensibility: 78,
    resourceFit: 72,
    evidenceStrength: Math.min(95, 58 + boost),
  };
  const qualityScores = {
    opportunity: 70,
    defensibility: 32,
    resourceFit: 38,
    evidenceStrength: Math.min(70, 36 + Math.floor(boost / 2)),
  };
  const priceScores = {
    opportunity: 55,
    defensibility: 24,
    resourceFit: 66,
    evidenceStrength: Math.min(65, 30 + Math.floor(boost / 3)),
  };
  const lifestyleScores = {
    opportunity: 48,
    defensibility: 28,
    resourceFit: 44,
    evidenceStrength: Math.min(60, 28 + Math.floor(boost / 3)),
  };

  const options: CategoryBattlefieldOption[] = [
    {
      optionId: createId("bf"),
      label: `${city} · ${customer}场景心智位`,
      rationale: `以「${customer}」为切口，在「${categoryName}」争夺可防御的场景第一联想，兑现「${need}」。`,
      risk: "场景过窄导致增长天花板；需验证场合频率与付费意愿",
      recommended: true,
      scores: { ...sceneScores, total: scoreTotal(sceneScores) },
      evidenceHints: [
        `Brief 目标用户：${customer}`,
        `Brief 核心需求：${need}`,
        beliefHint,
        strengthHint,
      ],
    },
    {
      optionId: createId("bf"),
      label: `品类通用「高品质」第一位`,
      rationale: "直接争夺品类默认选项，传播简单、想象空间大",
      risk: "与头部正面硬碰，资源与心智成本过高，P0 默认否决",
      recommended: false,
      scores: { ...qualityScores, total: scoreTotal(qualityScores) },
      evidenceHints: [
        "缺少可支撑『品类第一』的资源与差异证据",
        strengthHint,
      ],
    },
    {
      optionId: createId("bf"),
      label: `价格带下沉替代战`,
      rationale: "用更低价格切走流量，快速起量",
      risk: "可替换性强，品牌资产难沉淀，默认否决",
      recommended: false,
      scores: { ...priceScores, total: scoreTotal(priceScores) },
      evidenceHints: [
        "价格战难沉淀品牌资产，除非有明确成本护城河证据",
        strengthHint,
      ],
    },
    {
      optionId: createId("bf"),
      label: `泛「生活方式」无锚点战场`,
      rationale: "用情绪与审美占领宽泛心智",
      risk: "无场景锚点，难以指导产品与传播，默认否决",
      recommended: false,
      scores: { ...lifestyleScores, total: scoreTotal(lifestyleScores) },
      evidenceHints: [
        "生活方式叙事需强供给兑现，当前默认证据不足",
        strengthHint,
      ],
    },
  ];

  // 确保推荐项 = 总分最高
  const maxTotal = Math.max(...options.map((o) => o.scores?.total ?? 0));
  return options.map((o) => ({
    ...o,
    recommended: (o.scores?.total ?? 0) === maxTotal,
  }));
}

const MIN_REASON = 20;

export function assertCategoryDecisionReady(diagnosis: CategoryDiagnosis): void {
  const decision = diagnosis.decision;
  const missing: string[] = [];
  if (!decision?.selectedOptionId) {
    missing.push("categoryDiagnosis.decision.selected");
  }
  const reason = decision?.decisionReason?.trim() || "";
  if (reason.length < MIN_REASON) {
    missing.push("categoryDiagnosis.decision.reasonOk");
  }
  const selected = decision?.options?.find(
    (o) => o.optionId === decision.selectedOptionId,
  );
  const recommended = decision?.options?.find((o) => o.recommended);
  if (
    selected &&
    recommended &&
    selected.optionId !== recommended.optionId &&
    (decision?.overrideReason?.trim().length || 0) < MIN_REASON
  ) {
    missing.push("categoryDiagnosis.decision.overrideReason");
  }
  if (missing.length > 0) {
    throw new ContractGateError(
      "Category Decision 未完成：须自填决策理由；覆盖推荐时还须填写覆盖理由",
      missing,
    );
  }
}

export function selectCategoryBattlefield(
  diagnosis: CategoryDiagnosis,
  optionId: string,
  input?: {
    decisionReason?: string;
    overrideReason?: string;
  },
): CategoryDiagnosis {
  if (diagnosis.status === "complete") {
    throw new ContractGateError("品类诊断已确认完成，不可再改战场决策", [
      "categoryDiagnosis.status=draft",
    ]);
  }
  const options = diagnosis.decision?.options || [];
  const selected = options.find((o) => o.optionId === optionId);
  if (!selected) {
    throw new ContractGateError("无效的战场选项", [`optionId=${optionId}`]);
  }

  const decisionReason = (input?.decisionReason || "").trim();
  if (decisionReason.length < MIN_REASON) {
    throw new ContractGateError(
      `请用自己的话写清决策理由（至少 ${MIN_REASON} 字），不可只点选推荐项`,
      ["categoryDiagnosis.decision.reasonOk"],
    );
  }

  const recommended = options.find((o) => o.recommended);
  const isOverride = Boolean(
    recommended && recommended.optionId !== selected.optionId,
  );
  const overrideReason = (input?.overrideReason || "").trim();
  if (isOverride && overrideReason.length < MIN_REASON) {
    throw new ContractGateError(
      `你覆盖了系统推荐战场，须另写覆盖理由（至少 ${MIN_REASON} 字）`,
      ["categoryDiagnosis.decision.overrideReason"],
    );
  }

  const rejected = options
    .filter((o) => o.optionId !== optionId)
    .map((o) => {
      const score = o.scores?.total != null ? `总分${o.scores.total}` : "未评分";
      return `${o.label}（否决：${o.risk}；${score}）`;
    });

  const decision: CategoryDecision = {
    options,
    selectedOptionId: optionId,
    decisionReason,
    decidedAt: new Date().toISOString(),
    overrideRecommended: isOverride,
    overrideReason: isOverride ? overrideReason : undefined,
  };

  return {
    ...diagnosis,
    battlefield: selected.label,
    recommendedBattlefield: recommended?.label || selected.label,
    rejectedBattlefields: rejected,
    decision,
    analysisNarrative: [
      diagnosis.analysisNarrative || "",
      "",
      `【Category Decision】已选定：${selected.label}`,
      selected.scores
        ? `评分卡：机会${selected.scores.opportunity} · 可防御${selected.scores.defensibility} · 资源契合${selected.scores.resourceFit} · 证据${selected.scores.evidenceStrength} · 总分${selected.scores.total}`
        : "",
      `决策理由：${decisionReason}`,
      isOverride ? `覆盖推荐理由：${overrideReason}` : "与系统推荐一致。",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
