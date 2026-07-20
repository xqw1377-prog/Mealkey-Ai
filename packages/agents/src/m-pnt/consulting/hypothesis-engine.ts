/**
 * 定位多假设引擎 — 四维压力测试评分 → 否决 / 选定
 */
import type {
  BrandStrategyProject,
  PositioningContract,
  PositioningHypothesis,
  PositioningStatement,
} from "./types";
import { ContractGateError } from "./types";
import { draftContractFromProject } from "./positioning-contract-engine";
import {
  primaryFactStrengthBoost,
  summarizePrimaryFactStrength,
} from "./evidence-ledger-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function summarize(s: PositioningStatement): string {
  return `${s.ourBrandIs} · ${s.thatValue}（相对 ${s.unlike}）`;
}

function scoreTotal(s: {
  whitespaceFit: number;
  evidenceFit: number;
  resourceFit: number;
  categoryFit: number;
}) {
  return Math.round(
    s.whitespaceFit * 0.3 +
      s.evidenceFit * 0.3 +
      s.resourceFit * 0.2 +
      s.categoryFit * 0.2,
  );
}

function band(total: number): "high" | "medium" | "low" {
  if (total >= 72) return "high";
  if (total >= 50) return "medium";
  return "low";
}

function formatScoreLine(h: PositioningHypothesis): string {
  const s = h.scores;
  if (!s) return "";
  return `总分${s.total}（空位${s.whitespaceFit}/证据${s.evidenceFit}/资源${s.resourceFit}/品类${s.categoryFit}）`;
}

function formatScores(s: {
  whitespaceFit: number;
  evidenceFit: number;
  resourceFit: number;
  categoryFit: number;
  total: number;
}): string {
  return `总分${s.total}（空位${s.whitespaceFit}/证据${s.evidenceFit}/资源${s.resourceFit}/品类${s.categoryFit}）`;
}

/**
 * 基于上游资产生成 3 条定位假设（带四维评分卡：空位/证据/资源/品类）
 */
export function generatePositioningHypotheses(
  project: BrandStrategyProject,
): PositioningHypothesis[] {
  const brief = project.assets.brandBrief;
  const category = project.assets.categoryDiagnosis;
  const consumer = project.assets.consumerInsight;
  const map = project.assets.competitiveMap;
  const ledger = project.assets.evidenceLedger;

  const audience = brief?.targetCustomer || "核心用户";
  const need =
    consumer?.unmetNeeds?.[0] || brief?.customerNeed || "未被满足的确定感";
  const battlefield =
    category?.battlefield || brief?.categoryDefinition || "目标品类";
  const because = brief?.founderBelief || "可兑现的供给与体验系统";
  const whitespace = map?.whitespace || "尚未被占领的场景空位";

  const primaryFacts = ledger?.facts || [];
  const acceptedPrimary = primaryFacts.length;
  const strengthBoost = primaryFactStrengthBoost(primaryFacts);
  const mapAccepted = (map?.mapEvidence || []).filter(
    (e) => e.reviewStatus === "accepted",
  ).length;
  const insightAccepted = (consumer?.insightEvidence || []).filter(
    (e) => e.reviewStatus === "accepted",
  ).length;
  // 覆盖分封顶 70，为强度加成（0–20）留出区分度；弱证据同条数下更低
  const coveragePart = Math.min(
    70,
    35 +
      acceptedPrimary * 4 +
      mapAccepted * 4 +
      insightAccepted * 4,
  );
  const evidenceBase = Math.min(95, coveragePart + strengthBoost);
  const categoryBoost = category?.decision?.selectedOptionId ? 12 : 0;
  const whitespaceBoost = map?.whitespaceRegion ? 10 : 0;
  const judgmentBoost = consumer?.judgmentConfirmedAt ? 8 : 0;

  const primaryScores = {
    whitespaceFit: Math.min(95, 78 + whitespaceBoost),
    evidenceFit: Math.min(95, evidenceBase + judgmentBoost),
    resourceFit: Math.min(90, 70 + (brief?.founderBelief ? 10 : 0)),
    categoryFit: Math.min(95, 75 + categoryBoost),
  };
  const genericScores = {
    whitespaceFit: 28,
    evidenceFit: Math.min(45, 25 + Math.floor(evidenceBase / 5)),
    resourceFit: 40,
    categoryFit: 35,
  };
  const priceScores = {
    whitespaceFit: 35,
    evidenceFit: Math.min(50, 30 + Math.floor(evidenceBase / 6)),
    resourceFit: 72,
    categoryFit: 42,
  };

  const primary: PositioningStatement = {
    forAudience: audience,
    whoNeed: need,
    ourBrandIs: `${battlefield}生活方式品牌`.slice(0, 80),
    thatValue: consumer?.insightStatement?.slice(0, 80) || need,
    because,
    unlike: whitespace.slice(0, 80),
  };

  const generic: PositioningStatement = {
    forAudience: "追求品质的消费者",
    whoNeed: "吃得更好",
    ourBrandIs: "高品质品类品牌",
    thatValue: "更好的味道与体验",
    because: "用心做好产品",
    unlike: "其他普通品牌",
  };

  const price: PositioningStatement = {
    forAudience: audience,
    whoNeed: "更便宜地解决用餐",
    ourBrandIs: "高性价比替代品牌",
    thatValue: "同样品类更低价格",
    because: "成本控制与规模采购",
    unlike: "贵的正餐品牌",
  };

  const primaryTotal = scoreTotal(primaryScores);
  const genericTotal = scoreTotal(genericScores);
  const priceTotal = scoreTotal(priceScores);

  return [
    {
      hypothesisId: createId("hyp"),
      summary: summarize(primary),
      statement: primary,
      attractiveness: band(primaryTotal),
      defensibility: band(
        Math.round(
          (primaryScores.whitespaceFit + primaryScores.resourceFit) / 2,
        ),
      ),
      scores: { ...primaryScores, total: primaryTotal },
      pressureNotes: [
        "对齐已选战场与用户洞察陈述",
        map?.whitespaceRegion
          ? `空位区块：${map.whitespaceRegion.label}`
          : "空位来自竞争地图声明",
        `证据密度：${summarizePrimaryFactStrength(primaryFacts)} · 地图采纳${mapAccepted} · 洞察采纳${insightAccepted}`,
      ],
      status: "candidate",
    },
    {
      hypothesisId: createId("hyp"),
      summary: summarize(generic),
      statement: generic,
      attractiveness: band(genericTotal),
      defensibility: "low",
      scores: { ...genericScores, total: genericTotal },
      pressureNotes: ["无场景空位", "证据无法支撑品类第一", "无法指导产品与传播"],
      rejectReason: `压力测试未通过：${formatScores({ ...genericScores, total: genericTotal })} · 无场景空位与证据支撑`,
      status: "candidate",
    },
    {
      hypothesisId: createId("hyp"),
      summary: summarize(price),
      statement: price,
      attractiveness: band(priceTotal),
      defensibility: "low",
      scores: { ...priceScores, total: priceTotal },
      pressureNotes: ["价格可替换", "品牌资产难沉淀", "资源适合起量但不适合心智占位"],
      rejectReason: `压力测试未通过：${formatScores({ ...priceScores, total: priceTotal })} · 价格战稀释品牌资产`,
      status: "candidate",
    },
  ];
}

export function selectPositioningHypothesis(
  contract: PositioningContract,
  hypothesisId: string,
  input?: {
    overrideReason?: string;
    rejectOthersReason?: string;
  },
): PositioningContract {
  if (contract.status !== "draft") {
    throw new ContractGateError("仅草稿合同可选定定位假设", [
      `status=${contract.status}`,
    ]);
  }
  const list = contract.hypotheses || [];
  const selected = list.find((h) => h.hypothesisId === hypothesisId);
  if (!selected) {
    throw new ContractGateError("无效的定位假设", [`hypothesisId=${hypothesisId}`]);
  }
  if (!selected.scores) {
    throw new ContractGateError("假设缺少压力测试评分卡，请重新生成草稿", [
      "hypotheses.scores",
    ]);
  }

  const maxTotal = Math.max(...list.map((h) => h.scores?.total ?? 0));
  const isOverride = selected.scores.total < maxTotal;
  const overrideReason = (input?.overrideReason || "").trim();
  if (isOverride && overrideReason.length < 20) {
    throw new ContractGateError(
      "你覆盖了更高分假设，须另写覆盖理由（至少 20 字）",
      ["hypotheses.overrideReason"],
    );
  }

  const hypotheses: PositioningHypothesis[] = list.map((h) => {
    if (h.hypothesisId === hypothesisId) {
      return { ...h, status: "selected" as const, rejectReason: undefined };
    }
    const scoreLine = formatScoreLine(h);
    return {
      ...h,
      status: "rejected" as const,
      rejectReason:
        h.rejectReason ||
        input?.rejectOthersReason ||
        `未被选定：相对主假设更弱（${scoreLine || "无评分"}）`,
    };
  });

  const rejectedAlternatives = hypotheses
    .filter((h) => h.status === "rejected")
    .map((h) => ({
      statementSummary: h.summary,
      rejectReason: h.rejectReason || "压力测试未通过",
    }));

  const scoreLine = formatScoreLine(selected);
  return {
    ...contract,
    statement: selected.statement,
    hypotheses,
    hypothesisOverride: {
      overrideRecommended: isOverride,
      overrideReason: isOverride ? overrideReason : undefined,
    },
    rejectedAlternatives:
      rejectedAlternatives.length > 0
        ? rejectedAlternatives
        : contract.rejectedAlternatives,
    strategicChoice: isOverride
      ? `选定假设：${selected.summary} · ${scoreLine}（覆盖更高分对照项：${overrideReason}）`
      : `选定假设：${selected.summary} · ${scoreLine}`,
  };
}

/** Propose 前：压力测试资产必须完整 */
export function assertHypothesesPressureReady(
  contract: PositioningContract,
): void {
  const list = contract.hypotheses || [];
  const missing: string[] = [];
  if (list.length < 2) missing.push("hypotheses.length>=2");
  if (!list.every((h) => h.scores && typeof h.scores.total === "number")) {
    missing.push("hypotheses.scores");
  }
  if (!list.some((h) => h.status === "selected")) {
    missing.push("hypotheses.selected");
  }
  const selected = list.find((h) => h.status === "selected");
  if (selected && (selected.scores?.total ?? 0) < 40) {
    missing.push("hypotheses.selected.score>=40");
  }
  const maxTotal = Math.max(...list.map((h) => h.scores?.total ?? 0));
  if (
    selected &&
    (selected.scores?.total ?? 0) < maxTotal &&
    (contract.hypothesisOverride?.overrideReason?.trim().length || 0) < 20
  ) {
    missing.push("hypotheses.overrideReason");
  }
  if (missing.length > 0) {
    throw new ContractGateError(
      "定位假设压力测试未完成：须有评分卡并选定一条主假设；覆盖最高分时须写覆盖理由",
      missing,
    );
  }
}

/** 生成带多假设的合同草稿 */
export function draftContractWithHypotheses(
  project: BrandStrategyProject,
  statement?: PositioningStatement,
): PositioningContract {
  const hypotheses = generatePositioningHypotheses(project);
  const preferred = hypotheses[0]!;
  const base = draftContractFromProject(
    project,
    statement || preferred.statement,
    {
      strategicChoice: `压力测试后倾向：${preferred.summary} · ${formatScoreLine(preferred)}`,
      rejectedAlternatives: hypotheses.slice(1).map((h) => ({
        statementSummary: h.summary,
        rejectReason: h.rejectReason || "待确认否决",
      })),
    },
  );
  return {
    ...base,
    hypotheses,
  };
}
