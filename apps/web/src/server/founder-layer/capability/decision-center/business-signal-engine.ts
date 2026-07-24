/**
 * Business Signal Engine — Web 薄适配层
 * 协议 SSOT：@mealkey/business-signal-engine
 * 本文件只做：WorldChange/Focus → package 输入；协议 Signal → 雷达 UI 契约
 */

import {
  analyzeSignals,
  selectRadarSlice,
  type BusinessSignalSeverityV1,
  type BusinessSignalTypeV1 as ProtocolType,
  type BusinessSignalV1 as ProtocolSignal,
} from "@mealkey/business-signal-engine";
import type { WorldChangeV1 } from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";
import type {
  DailyDiagnosisV1,
  TodayFocusV1,
} from "@/server/founder-layer/contracts/decision-center";
import {
  SIGNAL_TYPE_LABEL,
  type BusinessSignalTypeV1,
  type BusinessSignalV1,
  type EvidenceChainStepV1,
} from "@/server/founder-layer/contracts/business-signal";
import { businessAnalysisPath } from "@/lib/business-analysis-packet";
import { isUsableBusinessEvidenceSnippet } from "@/server/founder-layer/capability/restaurant-intelligence/evidence-quality";

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function starsFromRank(rank: number): 1 | 2 | 3 | 4 | 5 {
  if (rank >= 5000) return 5;
  if (rank >= 3500) return 4;
  if (rank >= 2000) return 3;
  if (rank >= 1000) return 2;
  return 1;
}

/** 协议 type → UI 兼容别名 */
function toUiType(t: ProtocolType): BusinessSignalTypeV1 {
  if (t === "CUSTOMER") return "customer";
  if (t === "OPERATION") return "business";
  if (t === "COMPETITION") return "market";
  if (t === "MARKET" || t === "BRAND") return "brand";
  return "organization";
}

function isPositiveProtocol(s: ProtocolSignal): boolean {
  return /增长|上升|认可|正向|机会|提升/.test(
    `${s.title}${s.meaning || ""}${s.insight || ""}${s.observation}`,
  );
}

/** 协议 severity → UI decide|watch|positive */
function toUiSeverity(
  sev: BusinessSignalSeverityV1,
  signal: ProtocolSignal,
): BusinessSignalV1["severity"] {
  if (isPositiveProtocol(signal) && sev !== "CRITICAL" && sev !== "HIGH") {
    return "positive";
  }
  if (sev === "CRITICAL" || sev === "HIGH") return "decide";
  return "watch";
}

function toEvidenceChain(signal: ProtocolSignal): EvidenceChainStepV1[] {
  return signal.evidence
    .filter((e) => {
      if (e.kind === "inference") return true;
      return isUsableBusinessEvidenceSnippet(e.fact);
    })
    .map((e, i) => ({
      order: i + 1,
      kind: e.kind || "external_intel",
      claim: e.fact,
      sourceRef: e.sourceRef || e.source,
    }));
}

function ctaLabel(severity: BusinessSignalV1["severity"]): string {
  if (severity === "decide") return "进入分析";
  if (severity === "positive") return "放大机会";
  return "查看变化";
}

/** 协议 Signal → 雷达 UI 契约 */
export function protocolToUiSignal(
  s: ProtocolSignal,
  projectId: string,
): BusinessSignalV1 {
  const severity = toUiSeverity(s.severity, s);
  const conf = s.scores?.confidence ?? s.scores?.trust ?? 5;
  const scores = {
    impact: s.scores?.impact ?? 5,
    urgency: s.scores?.urgency ?? 4,
    trust: conf,
    relevance: s.scores?.relevance ?? 8,
    rankScore: s.scores?.rankScore ?? 800,
  };
  const topic =
    s.suggestedQuestion ||
    s.decisionTopic ||
    s.title ||
    "根据今日经营变化，下一步最该拍什么板？";
  // 雷达/信号默认进今日经营动态（变化解读主位），禁止直跳决策室
  const href =
    s.href && !s.href.includes("/business-analysis")
      ? s.href
      : businessAnalysisPath(projectId);

  return {
    id: s.id,
    type: toUiType(s.type),
    title: s.title,
    observation: s.observation,
    pattern: s.pattern,
    meaning: s.meaning || s.insight,
    judgment: s.meaning || s.insight || s.pattern,
    impact: s.impact,
    suggestion: s.recommendation,
    severity,
    scores,
    evidenceChain: toEvidenceChain(s),
    importanceStars: starsFromRank(scores.rankScore),
    href,
    ctaLabel: ctaLabel(severity),
    decisionTopic: topic,
  };
}

function worldChangeToHint(change: WorldChangeV1) {
  return {
    id: change.id,
    title: change.title,
    detail: change.detail,
    kind: change.kind,
    source: "世界变化",
    decisionTopic: change.decisionTopic,
    href: change.href,
  };
}

/** WorldChange → UI BusinessSignal（经 package analyzer） */
export function worldChangeToBusinessSignal(
  change: WorldChangeV1,
  projectId: string,
): BusinessSignalV1 {
  const [proto] = analyzeSignals({
    projectId,
    worldHints: [worldChangeToHint(change)],
  });
  if (!proto) {
    throw new Error(`signal analyze failed for ${change.id}`);
  }
  return protocolToUiSignal(
    {
      ...proto,
      href: change.href || proto.href,
      decisionTopic: change.decisionTopic || proto.decisionTopic,
    },
    projectId,
  );
}

function focusToUiSignal(
  focus: TodayFocusV1,
  projectId: string,
): BusinessSignalV1 {
  const severity = focus.kind === "decide" ? "decide" : "watch";
  const chain: EvidenceChainStepV1[] = [
    {
      order: 1,
      kind: "internal_fact",
      claim: clip(focus.whyToday || focus.title, 120),
      sourceRef: "focus:whyToday",
    },
    {
      order: 2,
      kind: "internal_fact",
      claim: focus.known[0]
        ? `已知：${clip(focus.known[0], 80)}`
        : "来自今日决策焦点升格",
      sourceRef: "focus:known",
    },
    {
      order: 3,
      kind: "inference",
      claim:
        severity === "decide"
          ? "判断：拖延会占用决策带宽，建议今天明确做/不做/条件做。"
          : "判断：纳入观察清单，恶化再升格。",
    },
  ];
  const rankScore =
    severity === "decide" ? 8 * 7 * 6 * 9 : 5 * 4 * 6 * 9;
  const meaning =
    severity === "decide"
      ? "拖延会占用决策带宽，建议今天明确做/不做/条件做"
      : "纳入观察清单，恶化再升格";
  return {
    id: "sig_focus",
    type: "business",
    title: clip(focus.title, 48),
    observation: clip(focus.whyToday, 160),
    pattern:
      severity === "decide"
        ? "决策焦点已升格，但仍缺完整证据闭环"
        : "焦点在观察带，尚未到拍板门槛",
    meaning,
    judgment: meaning,
    impact:
      severity === "decide"
        ? "拖延会让风险/机会窗口滑过"
        : "值得纳入今日观察",
    suggestion:
      severity === "decide"
        ? "进入分析，明确做 / 不做 / 条件做"
        : "先盯紧，恶化再升格",
    severity,
    scores: {
      impact: severity === "decide" ? 8 : 5,
      urgency: severity === "decide" ? 7 : 4,
      trust: 6,
      relevance: 9,
      rankScore,
    },
    evidenceChain: chain,
    importanceStars: starsFromRank(rankScore),
    href:
      focus.href && !focus.href.includes("/business-analysis")
        ? focus.href
        : businessAnalysisPath(projectId),
    ctaLabel: ctaLabel(severity),
    decisionTopic: focus.title,
  };
}

/** 排序：委托 package，再映回 UI；保留导出供测试 */
export function rankBusinessSignals(
  signals: BusinessSignalV1[],
): BusinessSignalV1[] {
  return [...signals].sort((a, b) => {
    if (b.scores.rankScore !== a.scores.rankScore) {
      return b.scores.rankScore - a.scores.rankScore;
    }
    const sevRank = (s: BusinessSignalV1["severity"]) =>
      s === "decide" ? 3 : s === "watch" ? 2 : 1;
    const sev = sevRank(b.severity) - sevRank(a.severity);
    if (sev) return sev;
    return b.scores.trust - a.scores.trust;
  });
}

export function selectRadarSignals(signals: BusinessSignalV1[]): {
  primary: BusinessSignalV1 | null;
  others: BusinessSignalV1[];
  allRanked: BusinessSignalV1[];
} {
  // UI 层：已是适配后的信号，用 package 规则的等价切片
  const ranked = rankBusinessSignals(signals);
  const primary =
    ranked.find((s) =>
      s.evidenceChain.some(
        (e) => e.kind === "internal_fact" || e.kind === "external_intel",
      ),
    ) || null;
  const others = ranked
    .filter((s) => s.id !== primary?.id)
    .filter(
      (s) => s.severity === "positive" || s.scores.rankScore >= 800,
    )
    .slice(0, 3);
  return { primary, others, allRanked: ranked };
}

export function signalTypeShortLabel(type: BusinessSignalTypeV1): string {
  return SIGNAL_TYPE_LABEL[type];
}

/** 引擎入口：WorldChange → package → UI 切片 */
export function runBusinessSignalEngine(input: {
  projectId: string;
  worldChanges?: WorldChangeV1[] | null;
  todayFocus?: TodayFocusV1 | null;
  diagnosis?: DailyDiagnosisV1 | null;
  restaurantContext?: {
    brandName?: string;
    stageLabel?: string;
    peakDaypart?: string;
    dnaHints?: string[];
  } | null;
  internalFacts?: Array<{
    id?: string;
    source: string;
    fact: string;
  }> | null;
}): {
  primary: BusinessSignalV1 | null;
  others: BusinessSignalV1[];
  allRanked: BusinessSignalV1[];
} {
  const changes = input.worldChanges || [];
  if (changes.length > 0) {
    const protocolSignals = analyzeSignals({
      projectId: input.projectId,
      restaurantContext: input.restaurantContext || undefined,
      worldHints: changes.map(worldChangeToHint),
      internalFacts: input.internalFacts || undefined,
    });
    const withHref = protocolSignals.map((s, i) => {
      const c = changes[i];
      return {
        ...s,
        href: c?.href || s.href,
        decisionTopic: c?.decisionTopic || s.decisionTopic,
      };
    });
    const slice = selectRadarSlice(withHref);
    return {
      primary: slice.primary
        ? protocolToUiSignal(slice.primary, input.projectId)
        : null,
      others: slice.others.map((s) =>
        protocolToUiSignal(s, input.projectId),
      ),
      allRanked: slice.allRanked.map((s) =>
        protocolToUiSignal(s, input.projectId),
      ),
    };
  }

  const signals: BusinessSignalV1[] = [];
  if (input.todayFocus && input.todayFocus.kind !== "observe") {
    signals.push(focusToUiSignal(input.todayFocus, input.projectId));
  }

  if (
    signals.length === 0 &&
    input.diagnosis?.primaryCause &&
    input.diagnosis.primaryCause.trim().length >= 6
  ) {
    const chain: EvidenceChainStepV1[] = [
      {
        order: 1,
        kind: "internal_fact",
        claim: clip(input.diagnosis.primaryCause, 120),
        sourceRef: "diagnosis:primaryCause",
      },
      {
        order: 2,
        kind: "inference",
        claim: "判断：来自经营诊断投影，需结合今日事实再确认。",
      },
    ];
    const scores = {
      impact: 5,
      urgency: 4,
      trust: 5,
      relevance: 7,
      rankScore: 5 * 4 * 5 * 7,
    };
    const cause = clip(input.diagnosis.primaryCause, 100);
    signals.push({
      id: "sig_diagnosis",
      type: "business",
      title: clip(input.diagnosis.primaryCause, 48),
      observation: clip(
        input.diagnosis.impactLine || input.diagnosis.primaryCause,
        160,
      ),
      pattern: "经营诊断投影出现可关注主因",
      meaning: cause,
      judgment: cause,
      impact: "与当前经营阶段相关，值得核对",
      suggestion: "打开经营动态核对事实，再决定是否升格",
      severity: "watch",
      scores,
      evidenceChain: chain,
      importanceStars: starsFromRank(scores.rankScore),
      href: businessAnalysisPath(input.projectId),
      ctaLabel: "查看变化",
      decisionTopic: input.diagnosis.primaryCause,
    });
  }

  return selectRadarSignals(signals);
}
