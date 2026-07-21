/**
 * Signal Analyzer — 输入事实 → BusinessSignal（五层 · 不 invent）
 * 权威：docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md
 */

import type {
  BusinessSignalEvidenceItemV1,
  BusinessSignalSubjectV1,
  BusinessSignalTypeV1,
  BusinessSignalV1,
} from "../types/signal";
import { normalizeSignalType } from "../types/signal";
import { enforceEvidenceGate } from "../evidence/evidence-chain";
import {
  computeRankScores,
  severityFromScores,
} from "../ranking/signal-ranking";

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export type SignalFactHintV1 = {
  id: string;
  title: string;
  detail?: string;
  /** review | competition | customer | alert | operation | brand | market */
  kind?: string;
  source?: string;
  decisionTopic?: string;
  href?: string;
};

export type SignalAnalyzeInputV1 = {
  projectId?: string;
  subject?: BusinessSignalSubjectV1;
  restaurantContext?: {
    brandName?: string;
    stageLabel?: string;
    peakDaypart?: string;
    dnaHints?: string[];
  };
  worldHints?: SignalFactHintV1[];
  externalFacts?: Array<{
    source: string;
    fact: string;
    id?: string;
    observedAt?: string;
  }>;
  internalFacts?: Array<{
    source: string;
    fact: string;
    id?: string;
    observedAt?: string;
  }>;
};

function classifyType(hint: SignalFactHintV1): BusinessSignalTypeV1 {
  const blob = `${hint.title} ${hint.detail || ""} ${hint.kind || ""}`;
  if (/店长|组织|编制|员工|复制/.test(blob)) return "ORGANIZATION";
  if (
    hint.kind === "market" ||
    (/搜索|趋势|品类增长|年轻消费者/.test(blob) && !/竞品|新店/.test(blob))
  ) {
    return "MARKET";
  }
  if (/定位|心智|关键词|品牌|聚餐|宴请/.test(blob) && !/竞争|竞品/.test(blob)) {
    return "BRAND";
  }
  if (
    hint.kind === "competition" ||
    /竞争|竞品|新店|周边/.test(blob)
  ) {
    return "COMPETITION";
  }
  if (
    /营业额|客流|客单|翻台|套餐占比|利润|生意|下降\d|毛利|现金流|成本/.test(
      blob,
    ) ||
    hint.kind === "operation"
  ) {
    return "OPERATION";
  }
  return "CUSTOMER";
}

function decideLean(blob: string, kind?: string): boolean {
  return (
    kind === "alert" ||
    /证据强度不足|风险|差评|负面|下降|承压|告警|待签字|红线|服务慢|等待|投诉/.test(
      blob,
    )
  );
}

function positiveLean(blob: string): boolean {
  return (
    /增长|上升|认可|正向|机会|匹配|关键词|传播|口碑提升/.test(blob) &&
    !/风险|负面|下降/.test(blob)
  );
}

function buildEvidence(hint: SignalFactHintV1): BusinessSignalEvidenceItemV1[] {
  const source = hint.source || "经营观察";
  const steps: BusinessSignalEvidenceItemV1[] = [
    {
      source,
      fact: clip(hint.detail || hint.title, 140),
      kind: "external_intel",
      sourceRef: hint.id,
    },
  ];
  if (hint.kind === "competition" || /竞品|新店/.test(hint.title)) {
    steps.push({
      source,
      fact: "竞争环境出现可观察变化",
      kind: "external_intel",
      sourceRef: `${hint.id}:market`,
    });
  } else if (/服务|等待|评价|差评/.test(`${hint.title}${hint.detail}`)) {
    steps.push({
      source,
      fact: "口碑侧出现可观察变化（评价/关键词）",
      kind: "external_intel",
      sourceRef: `${hint.id}:review`,
    });
  } else if (/证据|强度|咨询/.test(hint.title)) {
    steps.push({
      source: "席位咨询",
      fact: "咨询资产显示证据或签字状态未就绪",
      kind: "internal_fact",
      sourceRef: `${hint.id}:seat`,
    });
  } else {
    steps.push({
      source,
      fact: `变化类型：${hint.kind || "general"}`,
      kind: "external_intel",
      sourceRef: `${hint.id}:kind`,
    });
  }

  let inference = "该变化与本店经营相关，值得纳入今日观察。";
  const blob = `${hint.title}${hint.detail}`;
  if (/服务|等待|出餐/.test(blob)) {
    inference =
      "判断：更可能是高峰服务/出餐流程问题，而不只是市场需求波动。";
  } else if (/竞争|竞品|新店/.test(blob)) {
    inference = "判断：可能分流同价位客群，需强化差异定位。";
  } else if (positiveLean(blob)) {
    inference = "判断：出现可放大的认可窗口。";
  }
  steps.push({
    source: "AI推理",
    fact: inference,
    kind: "inference",
  });
  return steps;
}

function fiveLayers(
  hint: SignalFactHintV1,
  type: BusinessSignalTypeV1,
  ctx?: SignalAnalyzeInputV1["restaurantContext"],
) {
  const blob = `${hint.title}${hint.detail}`;
  const observation = clip(hint.detail || hint.title, 160);
  let pattern = "相对近期基线出现可观察偏移";
  let meaning = clip(hint.detail || hint.title, 100);
  let impact = "值得观察，尚未到必须立刻拍板";
  let recommendation = "先观察 48 小时，恶化再升格决策";
  let suggestedQuestion = hint.decisionTopic || `是否需要处理：${hint.title}？`;
  const probeQuestions: string[] = [];

  if (/服务|等待|出餐/.test(blob)) {
    pattern = "等待/服务相关反馈占比相对基线明显升高（异常）";
    meaning = ctx?.peakDaypart
      ? `这不只是服务标签问题：你的${ctx.peakDaypart}占比高，等待会直接伤翻台`
      : "这不只是服务标签问题：高峰等待会直接影响翻台与复购";
    impact = "可能导致复购下降、评分下滑、品牌场景认知受损";
    recommendation = "检查 18:00–20:00 点单→出餐→收台流程";
    suggestedQuestion = hint.decisionTopic || "是否需要调整晚市服务流程？";
    probeQuestions.push(
      "最近是否调整过菜单？",
      "晚市是否增加新人？",
      "高峰期是否出现排队？",
    );
  } else if (type === "COMPETITION") {
    pattern = "竞争半径内供给增加或打法趋同";
    meaning = "竞争圈变化正在压缩你的差异窗口";
    impact = "可能分流同价位客群";
    recommendation = "强化差异定位或跟进打法判断";
    suggestedQuestion = hint.decisionTopic || "是否需要强化区域差异定位？";
  } else if (type === "MARKET") {
    pattern = "外部品类/搜索趋势与本店方向出现共振";
    meaning = "市场趋势与你的品牌方向相关，可能是放大窗口";
    impact = "若不跟进表达，可能错过心智占领时机";
    recommendation = "评估内容与场景传播是否对齐该趋势";
    suggestedQuestion = hint.decisionTopic || "是否要把该趋势纳入传播主轴？";
  } else if (type === "BRAND") {
    pattern = "消费者描述你的关键词发生迁移";
    meaning = "品牌心智正在被重新定义";
    impact = "场景认知变了，菜单与传播若不跟会错位";
    recommendation = "核对官网/内容主轴是否匹配新场景词";
    suggestedQuestion = hint.decisionTopic || "是否确认并固化新的场景心智？";
  } else if (positiveLean(blob)) {
    pattern = "正向关键词/认可相对基线上升";
    meaning = "消费者侧出现可放大的认可信号";
    impact = "有机会把认可转化为主动传播";
    recommendation = "评估是否放大场景与传播表达";
    suggestedQuestion = hint.decisionTopic || "是否放大当前正向认可？";
  } else if (/证据|强度/.test(hint.title)) {
    pattern = "决策证据密度低于拍板门槛";
    meaning = "证据不足时强硬拍板，执行失败风险上升";
    impact = "薄证据开会易拍出不可执行方案";
    recommendation = "先补一手事实，或显式带着缺口开会";
    suggestedQuestion = hint.decisionTopic || "是否带着证据缺口进入决策室？";
  } else if (type === "OPERATION") {
    pattern = "经营指标组合出现非同向变化";
    meaning = "需要拆开客流/客单/结构，避免误判为纯市场问题";
    impact = "可能持续侵蚀利润或掩盖真因";
    recommendation = "今天核对客单与结构，而不是只看营业额";
    suggestedQuestion = hint.decisionTopic || "是否针对客单/结构做经营调整？";
  }

  return {
    observation,
    pattern,
    meaning,
    impact,
    recommendation,
    suggestedQuestion,
    probeQuestions,
  };
}

export function analyzeHintToSignal(
  hint: SignalFactHintV1,
  input: SignalAnalyzeInputV1 = {},
): BusinessSignalV1 {
  const subject = input.subject || {};
  const type = normalizeSignalType(classifyType(hint));
  const blob = `${hint.title} ${hint.detail || ""}`;
  const lean = decideLean(blob, hint.kind);
  const evidence = buildEvidence(hint);
  const layers = fiveLayers(hint, type, input.restaurantContext);

  let impactN = 5;
  let urgencyN = 4;
  let confidenceN = 5 + Math.min(3, evidence.filter((e) => e.kind !== "inference").length);
  let relevanceN = input.restaurantContext ? 8 : 6;

  if (lean) {
    impactN += 3;
    urgencyN += 3;
  }
  if (positiveLean(blob)) impactN += 1;
  if (type === "CUSTOMER" && /服务|等待|差评/.test(blob)) {
    impactN += 2;
    urgencyN += 2;
    relevanceN = 10;
  }
  if (type === "COMPETITION") {
    impactN += 1;
    relevanceN = Math.max(relevanceN, 9);
  }
  if (input.restaurantContext?.dnaHints?.length) {
    relevanceN = Math.min(10, relevanceN + 1);
  }

  const scores = computeRankScores({
    impact: impactN,
    urgency: urgencyN,
    confidence: confidenceN,
    relevance: relevanceN,
  });
  const severity = severityFromScores(scores, lean);
  const now = new Date().toISOString();

  const signal: BusinessSignalV1 = {
    id: `sig_${hint.id}`,
    schemaVersion: 1,
    projectId: input.projectId,
    subject,
    type,
    severity,
    status: "detected",
    title: clip(hint.title, 48),
    observation: layers.observation,
    pattern: layers.pattern,
    meaning: layers.meaning,
    insight: layers.meaning,
    impact: layers.impact,
    recommendation: layers.recommendation,
    evidence,
    confidence: Math.min(
      0.92,
      0.45 + scores.confidence / 20 + evidence.length * 0.05,
    ),
    scores,
    probeQuestions: layers.probeQuestions.length
      ? layers.probeQuestions
      : undefined,
    decisionTopic: hint.decisionTopic || layers.suggestedQuestion,
    suggestedQuestion: layers.suggestedQuestion,
    href: hint.href,
    sourceRefs: {
      worldChangeIds: [hint.id],
    },
    createdAt: now,
    updatedAt: now,
  };

  return enforceEvidenceGate(signal);
}

/** 批量分析 + 附加内外部事实作为补充证据（不 invent） */
export function analyzeSignals(
  input: SignalAnalyzeInputV1,
): BusinessSignalV1[] {
  const fromHints = (input.worldHints || []).map((h) =>
    analyzeHintToSignal(h, input),
  );

  const extras: BusinessSignalEvidenceItemV1[] = [
    ...(input.externalFacts || []).map((f) => ({
      source: f.source,
      fact: f.fact,
      kind: "external_intel" as const,
      sourceRef: f.id,
      observedAt: f.observedAt,
    })),
    ...(input.internalFacts || []).map((f) => ({
      source: f.source,
      fact: f.fact,
      kind: "internal_fact" as const,
      sourceRef: f.id,
      observedAt: f.observedAt,
    })),
  ];

  if (!extras.length) return fromHints;

  return fromHints.map((s, idx) => {
    if (idx > 0) return s;
    const merged = [...s.evidence, ...extras.slice(0, 3)];
    const confidenceBoost = Math.min(10, (s.scores?.confidence ?? 5) + 1);
    const scores = computeRankScores({
      impact: s.scores.impact,
      urgency: s.scores.urgency,
      confidence: confidenceBoost,
      relevance: s.scores.relevance,
    });
    return enforceEvidenceGate({
      ...s,
      evidence: merged,
      scores,
      confidence: Math.min(0.95, s.confidence + 0.05),
      sourceRefs: {
        ...s.sourceRefs,
        mintelEvidenceIds: [
          ...(s.sourceRefs?.mintelEvidenceIds || []),
          ...extras
            .filter((e) => e.kind === "external_intel" && e.sourceRef)
            .map((e) => e.sourceRef!),
        ],
      },
    });
  });
}
