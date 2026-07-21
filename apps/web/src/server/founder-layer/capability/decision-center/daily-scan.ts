/**
 * buildDashboardHome → DailyScanV1（纯投影，无新 Runtime）
 */
import type {
  DailyDiagnosisV1,
  DailyScanV1,
  DecisionCardV1,
} from "@/server/founder-layer/contracts/decision-center";
import type { DecisionHorizonV1 } from "@/server/founder-layer/contracts/business-identity";
import {
  decisionReadyPath,
  isExpansionDecisionTopic,
} from "@/lib/decision-entry";
import { collectDecisionSignals } from "@/server/founder-layer/capability/decision-intelligence/signal-engine";
import {
  buildCandidatesFromSignals,
  pickFocusCandidate,
  projectInboxFromCandidates,
} from "@/server/founder-layer/capability/decision-intelligence/candidate-promote";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";
import { readRipStore } from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import {
  diffRipSnapshots,
  pickRipDiffPair,
  signalsFromRipDiff,
  type RipDiffV1,
} from "@/server/founder-layer/capability/restaurant-intelligence/rip-diff";
import {
  buildWorldChangesFromDiff,
  primaryWorldChangeHref,
  worldChangesSummaryLine,
} from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";
import { PROFILE_RIP_LAST_DIFF_KEY } from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import {
  signalsFromSeatConsulting,
  worldChangesFromSeatConsulting,
} from "@/server/founder-layer/capability/decision-center/seat-consulting-scan";
import { buildBusinessRadar } from "@/server/founder-layer/capability/decision-center/build-business-radar";
import { collectD7ReviewItems } from "@/server/founder-layer/capability/decision-center/d7-review";
import { extractRestaurantContextForSignals } from "@/server/founder-layer/capability/decision-center/restaurant-context-for-signals";
import {
  readWeeklyOpsMetrics,
  weeklyOpsToInternalFacts,
  weeklyOpsToWorldHint,
} from "@/server/founder-layer/capability/ops-metrics/weekly-upload";

type HomeLike = {
  ownerName?: string;
  projectStatus?: string;
  homeMode?: string;
  projectHealth?: number;
  confidence?: number;
  biggestRisk?: string;
  currentProblemTitle?: string;
  dailyDiagnosis?: string;
  dailyJudgement?: string;
  dailyRecommendation?: string;
  dailyObservation?: string;
  riskBlocksOpportunity?: boolean;
  openRiskAlert?: {
    id: string;
    type: string;
    level: string;
    title: string;
    description: string;
    suggestedTopic: string;
    suggestExpert: string | null;
    suggestCouncil?: boolean;
  } | null;
  openOpportunity?: {
    id: string;
    title: string;
    score: number | null;
    status: string;
    suggestedTopic: string;
    suggestExpert: string | null;
  } | null;
  pendingCouncilAdjudication?: {
    topic: string;
    recommendedAction?: string | null;
    statusLabel: string;
    href: string;
    insightCount?: number;
    supportCount?: number;
    opposeCount?: number;
    observeCount?: number;
  } | null;
  pendingMeetingDraft?: { topic: string; href: string } | null;
  pendingRedeision?: { topic: string; reason: string; href: string } | null;
  lastActionPlan?: {
    planId: string;
    actions: Array<{
      actionId?: string;
      title: string;
      status: string;
    }>;
  } | null;
  activeValidationTask?: {
    href: string;
    suggestRedeision?: boolean;
    status: string;
    hypothesisStatement?: string;
  } | null;
  lastDeviation?: { summary: string; severity: string } | null;
  founderGrowth?: {
    cognitiveGap?: {
      summary: string;
      believedCause: string;
      likelyRootCause: string;
    } | null;
    weakest?: { note: string } | null;
  } | null;
  lastMeetingDecision?: {
    id: string;
    judgement: string;
    problem: string;
  } | null;
};

function clampStars(n: number): 1 | 2 | 3 | 4 | 5 {
  const v = Math.round(n);
  if (v <= 1) return 1;
  if (v >= 5) return 5;
  return v as 1 | 2 | 3 | 4 | 5;
}

function starsFromRiskLevel(level: string): 1 | 2 | 3 | 4 | 5 {
  if (level === "critical") return 5;
  if (level === "high") return 4;
  if (level === "medium") return 3;
  return 2;
}

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function isExpansionTopic(topic: string) {
  return isExpansionDecisionTopic(topic);
}

function expansionCaseHref(projectId: string) {
  return `/projects/${projectId}/decision-case`;
}

/** 今日决策入口：默认 ready（可配 why 摘要）；扩店走 case */
function decisionEntryHref(
  projectId: string,
  topic: string,
  whyNow?: string,
) {
  return decisionReadyPath(projectId, topic, {
    whyNow: whyNow || undefined,
  });
}

export type DailyScanOptions = {
  projectId: string;
  restaurantName: string;
  understandingScore?: number;
  dataCompleteness?: number;
  /** project.profile.businessIdentity 或等价字段 */
  brandName?: string | null;
  city?: string | null;
  district?: string | null;
  focusProblem?: string | null;
  decisionHorizon?: DecisionHorizonV1 | null;
  /** 原始 profile，用于 RIP 差分 → Signal */
  profile?: Record<string, unknown> | null;
  /** 近期 Decision（D+7 补充源） */
  recentDecisions?: Array<{
    id: string;
    problem?: string | null;
    judgement?: string | null;
    outcome?: string | null;
  }> | null;
};

export function toDailyScanV1(
  home: HomeLike,
  options: DailyScanOptions,
): DailyScanV1 {
  const projectId = options.projectId;
  const restaurantName = options.restaurantName || "你的餐厅";
  const ownerName = (home.ownerName || "老板").replace(/经营者/g, "老板");

  const riskBlocks = Boolean(
    home.riskBlocksOpportunity ||
      home.openRiskAlert?.level === "critical" ||
      home.openRiskAlert?.level === "high" ||
      home.openRiskAlert?.suggestCouncil,
  );

  const gap = home.founderGrowth?.cognitiveGap;
  const stageLabel =
    gap?.summary?.trim() ||
    home.projectStatus ||
    (home.homeMode === "forming" ? "认知校准期" : "经营推进期");

  const primaryCause =
    gap?.likelyRootCause?.trim() ||
    home.openRiskAlert?.title ||
    home.dailyDiagnosis ||
    home.biggestRisk ||
    "关键经营变量尚未收束";

  const notCause = gap?.believedCause?.trim()
    ? `不是：${clip(gap.believedCause, 40)}`
    : undefined;

  const hasQuantHint = /%|\d/.test(
    home.openRiskAlert?.description ||
      home.lastDeviation?.summary ||
      home.dailyObservation ||
      "",
  );
  const impactLine = hasQuantHint
    ? clip(
        home.openRiskAlert?.description ||
          home.lastDeviation?.summary ||
          home.dailyObservation ||
          primaryCause,
        80,
      )
    : clip(
        home.openRiskAlert?.description ||
          home.dailyRecommendation ||
          `建议先围绕「${home.currentProblemTitle || primaryCause}」做一次可验证判断`,
        80,
      );

  const completeness = options.dataCompleteness ?? 0;
  const understanding = options.understandingScore;
  const confBase =
    typeof home.confidence === "number"
      ? home.confidence > 1
        ? home.confidence / 100
        : home.confidence
      : 0.55;
  const diagnosisConfidence = Math.max(
    0.35,
    Math.min(
      0.92,
      confBase * 0.5 +
        (completeness / 100) * 0.35 +
        (home.openRiskAlert || home.openOpportunity ? 0.1 : 0) +
        (home.lastMeetingDecision ? 0.05 : 0),
    ),
  );

  const evidenceChecks: DailyDiagnosisV1["evidenceChecks"] = [
    {
      label: "风险 / 机会运行时信号",
      available: Boolean(home.openRiskAlert || home.openOpportunity),
    },
    {
      label: "历史经营判断",
      available: Boolean(home.lastMeetingDecision),
    },
    {
      label: "餐厅经营认知（Brain）",
      available: completeness >= 15 || (understanding ?? 0) >= 15,
    },
    {
      label: "执行 / 验证任务",
      available: Boolean(
        home.lastActionPlan?.actions?.length || home.activeValidationTask,
      ),
    },
  ];

  const healthScore =
    typeof home.projectHealth === "number" &&
    Number.isFinite(home.projectHealth)
      ? Math.round(Math.max(0, Math.min(100, home.projectHealth)))
      : null;

  const diagnosis: DailyDiagnosisV1 = {
    greetingName: ownerName,
    restaurantName,
    healthScore,
    stageLabel: clip(String(stageLabel), 24),
    primaryCause: clip(primaryCause, 48),
    notCause,
    impactLine,
    evidenceChecks,
    confidence: diagnosisConfidence,
    understandingScore: understanding,
    dataCompleteness: options.dataCompleteness,
  };

  const cards: DecisionCardV1[] = [];

  if (home.openRiskAlert) {
    const topic =
      home.openRiskAlert.suggestedTopic || home.openRiskAlert.title;
    const entryMode: DecisionCardV1["entryMode"] =
      home.pendingCouncilAdjudication
        ? "resume"
        : home.openRiskAlert.suggestCouncil || riskBlocks
          ? "council"
          : "research";
    const href = isExpansionTopic(topic)
      ? expansionCaseHref(projectId)
      : entryMode === "resume" && home.pendingCouncilAdjudication?.href
        ? home.pendingCouncilAdjudication.href
        : entryMode === "council"
          ? `/projects/${projectId}/decision-room?topic=${encodeURIComponent(topic)}`
          : decisionEntryHref(projectId, topic);
    cards.push({
      cardId: `risk:${home.openRiskAlert.id || topic}`,
      kind: "risk",
      tone: "red",
      title: topic.startsWith("是否") || topic.includes("？")
        ? topic
        : `是否优先处理：${clip(home.openRiskAlert.title, 28)}？`,
      situationLine: clip(
        home.openRiskAlert.description || home.openRiskAlert.title,
        72,
      ),
      impactStars: starsFromRiskLevel(home.openRiskAlert.level),
      urgencyStars: starsFromRiskLevel(home.openRiskAlert.level),
      councilPreview: home.pendingCouncilAdjudication
        ? {
            supportCount:
              home.pendingCouncilAdjudication.supportCount ?? 0,
            observeCount:
              home.pendingCouncilAdjudication.observeCount ??
              home.pendingCouncilAdjudication.opposeCount ??
              0,
            oneLineAdvice: clip(
              home.pendingCouncilAdjudication.recommendedAction ||
                home.pendingCouncilAdjudication.statusLabel,
              40,
            ),
          }
        : undefined,
      confidence: diagnosisConfidence,
      evidenceHints: evidenceChecks
        .filter((e) => e.available)
        .map((e) => e.label)
        .slice(0, 4),
      href,
      entryMode,
      riskAlertId: home.openRiskAlert.id,
    });
  }

  if (home.openOpportunity && !riskBlocks) {
    const topic =
      home.openOpportunity.suggestedTopic || home.openOpportunity.title;
    const score = home.openOpportunity.score ?? 60;
    cards.push({
      cardId: `opp:${home.openOpportunity.id || topic}`,
      kind: "opportunity",
      tone: "yellow",
      title: topic.startsWith("是否") || topic.includes("？")
        ? topic
        : `是否推进：${clip(home.openOpportunity.title, 28)}？`,
      situationLine: clip(home.openOpportunity.title, 72),
      impactStars: clampStars(score / 20),
      urgencyStars: clampStars(score / 25 + 1),
      confidence: Math.min(0.9, diagnosisConfidence + 0.05),
      evidenceHints: evidenceChecks
        .filter((e) => e.available)
        .map((e) => e.label)
        .slice(0, 3),
      href: decisionEntryHref(projectId, topic),
      entryMode: "research",
      opportunityId: home.openOpportunity.id,
    });
  } else if (home.openOpportunity && riskBlocks) {
    cards.push({
      cardId: `opp:${home.openOpportunity.id}:deferred`,
      kind: "opportunity",
      tone: "yellow",
      title: `机会暂缓：${clip(home.openOpportunity.title, 28)}`,
      situationLine: "当前有阻断性风险，先处理风险再评估机会",
      impactStars: 3,
      urgencyStars: 2,
      confidence: diagnosisConfidence,
      evidenceHints: ["风险优先于机会"],
      href: `/projects/${projectId}/runtime?tab=opportunity`,
      entryMode: "research",
      opportunityId: home.openOpportunity.id,
      deferred: true,
    });
  }

  // 无风险/机会时：用当前问题生成一张主卡
  if (cards.length === 0) {
    const topic =
      home.currentProblemTitle ||
      home.dailyJudgement ||
      "明确今天最重要的经营问题";
    cards.push({
      cardId: `topic:${clip(topic, 24)}`,
      kind: "risk",
      tone: "red",
      title: topic.includes("？") ? topic : `今天是否先解决：${clip(topic, 32)}？`,
      situationLine: clip(
        home.dailyDiagnosis ||
          home.dailyObservation ||
          "餐厅认知与证据仍在积累——先做一个今日决策，系统会越来越懂你",
        72,
      ),
      impactStars: 3,
      urgencyStars: 3,
      confidence: Math.max(0.4, diagnosisConfidence - 0.1),
      evidenceHints: evidenceChecks
        .filter((e) => e.available)
        .map((e) => e.label)
        .slice(0, 3),
      href: decisionEntryHref(projectId, topic),
      entryMode: "research",
    });
  }

  const primaryCard = cards[0] ?? null;
  const secondaryCards = cards.slice(1, 3);

  const planActions = (home.lastActionPlan?.actions ?? [])
    .filter((a) => Boolean(a.title))
    .slice(0, 3)
    .map((a, i) => ({
      id: a.actionId || `act_${i + 1}`,
      title: a.title,
      done: a.status === "done",
      checkable: Boolean(a.actionId || home.lastActionPlan?.planId),
    }));

  const fallbackActions = [
    home.activeValidationTask?.hypothesisStatement
      ? `推进验证：${home.activeValidationTask.hypothesisStatement}`
      : null,
    home.dailyRecommendation || null,
    primaryCard ? `跟进决策：${clip(primaryCard.title, 36)}` : null,
  ].filter(Boolean) as string[];

  const actions =
    planActions.length > 0
      ? planActions
      : fallbackActions.slice(0, 3).map((title, i) => ({
          id: `fallback_${i + 1}`,
          title,
          done: false,
          checkable: false,
        }));

  const allDone =
    planActions.length > 0 && planActions.every((a) => a.done);
  const checkInHref =
    home.activeValidationTask?.href ||
    `/projects/${projectId}/decisions`;

  let primaryCta: DailyScanV1["primaryCta"];
  if (home.pendingCouncilAdjudication) {
    primaryCta = {
      label: "去拍板",
      href: home.pendingCouncilAdjudication.href,
      reason: "council",
    };
  } else if (home.pendingRedeision || riskBlocks) {
    // 复盘/风险回到决策室，不进顾问咨询会
    const redeisionTopic =
      home.pendingRedeision?.topic ||
      home.openRiskAlert?.suggestedTopic ||
      primaryCard?.title ||
      "处理当前经营风险";
    primaryCta = {
      label: riskBlocks ? "先处理风险再决策" : "继续这笔决策",
      href:
        home.pendingRedeision?.href?.includes("decision-")
          ? home.pendingRedeision.href
          : decisionEntryHref(projectId, redeisionTopic),
      reason: "redeision",
    };
  } else if (allDone) {
    primaryCta = {
      label: "去打卡验证",
      href: checkInHref,
      reason: "checkin",
    };
  } else if (primaryCard) {
    primaryCta = {
      label: "进入今日决策",
      href: isExpansionTopic(primaryCard.title)
        ? expansionCaseHref(projectId)
        : primaryCard.href.startsWith(`/projects/${projectId}/advisor`)
          ? decisionEntryHref(projectId, primaryCard.title)
          : primaryCard.href,
      reason: "open_card",
    };
  } else {
    primaryCta = {
      label: "发起今日决策",
      href: `/projects/${projectId}/decision-room`,
      reason: "meeting",
    };
  }

  const brandOk = Boolean(
    (options.brandName && options.brandName.trim()) ||
      restaurantName.trim(),
  );
  const geoOk = Boolean(
    (options.city && options.city.trim()) ||
      (options.district && options.district.trim()),
  );
  const missingAnchors: string[] = [];
  if (!brandOk) missingAnchors.push("品牌");
  if (!geoOk) missingAnchors.push("地理/地址");

  const known: string[] = [];
  if (brandOk) known.push("品牌与经营对象");
  if (geoOk) known.push("地理锚点");
  if (completeness >= 20) known.push("餐厅经营状态（Brain）");
  if (home.openRiskAlert || home.openOpportunity) known.push("运行时风险/机会信号");
  if (home.lastMeetingDecision) known.push("历史经营判断");
  if (!known.length) known.push("基础开户信息");

  const missing: string[] = [...missingAnchors.map((a) => `经营身份：${a}`)];
  if (completeness < 25) missing.push("更多经营事实");
  if (!home.lastMeetingDecision && completeness < 40) {
    missing.push("可验证的经营判断样本");
  }

  const readinessScore = Math.round(
    (completeness || 0) * 0.45 +
      diagnosisConfidence * 100 * 0.25 +
      (brandOk ? 12 : 0) +
      (geoOk ? 12 : 0) +
      (home.openRiskAlert || home.openOpportunity ? 8 : 0) -
      missingAnchors.length * 10,
  );
  const readinessStars = ((): 1 | 2 | 3 | 4 | 5 => {
    if (readinessScore >= 85) return 5;
    if (readinessScore >= 70) return 4;
    if (readinessScore >= 55) return 3;
    if (readinessScore >= 35) return 2;
    return 1;
  })();

  // R4/E1：经营画像差分 → Signal + 世界变化条
  let ripSignals: DecisionSignalV1[] = [];
  let worldChanges: NonNullable<DailyScanV1["worldChanges"]> = [];
  try {
    const ripStore = readRipStore(options.profile || undefined);
    const { previous, current } = pickRipDiffPair(
      ripStore.snapshots,
      ripStore.currentSnapshotId,
    );
    if (current && current.status === "confirmed" && previous) {
      const storedDiff = options.profile?.[PROFILE_RIP_LAST_DIFF_KEY];
      const diff: RipDiffV1 =
        storedDiff &&
        typeof storedDiff === "object" &&
        (storedDiff as RipDiffV1).toSnapshotId === current.snapshotId
          ? (storedDiff as RipDiffV1)
          : diffRipSnapshots(previous, current);
      ripSignals = signalsFromRipDiff({
        projectId,
        brandName: options.brandName,
        storeName: restaurantName,
        city: options.city,
        decisionHorizon: options.decisionHorizon,
        diff,
        current,
      });
      worldChanges = buildWorldChangesFromDiff({
        diff,
        current,
        projectId,
      });
    } else {
      ripSignals = [];
      worldChanges = [];
    }
  } catch {
    ripSignals = [];
    worldChanges = [];
  }

  // E2：三席咨询进展 → 世界变化 + Signal
  try {
    const seatChanges = worldChangesFromSeatConsulting({
      profile: options.profile || null,
      projectId,
    });
    const seenTitles = new Set(worldChanges.map((c) => c.title));
    for (const c of seatChanges) {
      if (seenTitles.has(c.title)) continue;
      seenTitles.add(c.title);
      worldChanges.push(c);
    }
    worldChanges = worldChanges.slice(0, 6);
  } catch {
    // ignore
  }

  const seatSignals = (() => {
    try {
      return signalsFromSeatConsulting({
        profile: options.profile || null,
        projectId,
        brandName: options.brandName,
        city: options.city,
      });
    } catch {
      return [] as DecisionSignalV1[];
    }
  })();

  // Signal → Candidate → Focus（不在此 createDecision）
  const signals = collectDecisionSignals({
    projectId,
    restaurantName,
    brandName: options.brandName,
    city: options.city,
    focusProblem: options.focusProblem,
    decisionHorizon: options.decisionHorizon,
    openRiskAlert: home.openRiskAlert,
    openOpportunity: home.openOpportunity
      ? {
          ...home.openOpportunity,
          score: home.openOpportunity.score ?? 60,
        }
      : null,
    riskBlocksOpportunity: riskBlocks,
    ripSignals: [...ripSignals, ...seatSignals],
  });
  const candidates = buildCandidatesFromSignals(signals, {
    projectId,
    dataCompleteness: completeness,
    decisionHorizon: options.decisionHorizon,
    blockingRisk: riskBlocks,
    brandOk,
    geoOk,
    known: known.slice(0, 4),
    missing: missing.slice(0, 4),
  });
  const focusCandidate = pickFocusCandidate(candidates);

  let todayFocus: DailyScanV1["todayFocus"];
  if (focusCandidate) {
    const focusTopic =
      focusCandidate.question || focusCandidate.title || "今日经营决策";
    const href = decisionEntryHref(
      projectId,
      focusTopic,
      focusCandidate.whyNow || undefined,
    );
    todayFocus = {
      kind: "decide",
      title: focusCandidate.question || focusCandidate.title,
      whyToday: clip(focusCandidate.whyNow, 72),
      href,
      readinessStars:
        focusCandidate.readiness?.stars ?? readinessStars,
      known: (focusCandidate.readiness?.known || known).slice(0, 4),
      missing: (focusCandidate.readiness?.missing || missing).slice(0, 4),
    };
    // 达阈值的焦点 CTA 对齐决策室
    if (
      primaryCta.reason === "open_card" ||
      primaryCta.reason === "meeting"
    ) {
      primaryCta = {
        label: "进入今日决策",
        href,
        reason: "open_card",
      };
    }
  } else if (worldChanges.length > 0) {
    const first = worldChanges[0]!;
    const topic =
      first.decisionTopic ||
      first.title ||
      "根据今日经营变化，下一步最该拍什么板？";
    const href =
      first.href || primaryWorldChangeHref(projectId, worldChanges, topic);
    todayFocus = {
      kind: "decide",
      title: topic,
      whyToday: clip(
        `${worldChangesSummaryLine(worldChanges)}建议先判断：${first.title}`,
        72,
      ),
      href,
      readinessStars,
      known: known.slice(0, 4),
      missing: missing.slice(0, 4),
    };
    primaryCta = {
      label: "进入决策会议室",
      href,
      reason: "open_card",
    };
  } else if (primaryCard) {
    todayFocus = {
      kind: "watch",
      title: primaryCard.title,
      whyToday: clip(
        `信号还不够强，建议先观察或补证据。${primaryCard.situationLine}`,
        72,
      ),
      href: decisionEntryHref(projectId, primaryCard.title),
      readinessStars,
      known: known.slice(0, 4),
      missing: missing.slice(0, 4),
    };
  } else {
    todayFocus = {
      kind: "observe",
      title: "今天暂无必须立刻拍板的事",
      whyToday: geoOk
        ? signals.length
          ? "已有一些信号，但还不到非定不可。你仍可用语音主动发起一笔决策。"
          : "没有强制事项时，也可主动发起：换菜牌、招人开人、调价、促销。"
        : "补齐品牌与地理后，外部证据才能帮你判断；内部经营决策现在就能发起。",
      href: missingAnchors.length
        ? `/projects/${projectId}/business-identity`
        : `/projects/${projectId}/decision-room`,
      readinessStars,
      known: known.slice(0, 4),
      missing: missing.slice(0, 4),
    };
  }

  const identityHint: DailyScanV1["identityHint"] = {
    externalIntelReady: brandOk && geoOk,
    missingAnchors,
    patchHref: `/projects/${projectId}/business-identity`,
    summaryLine: missingAnchors.length
      ? `还缺${missingAnchors.join("、")}：补齐后才能用外部市场证据做判断`
      : `${restaurantName} · 经营身份已就绪，可用于今日决策`,
  };

  const openActions =
    home.lastActionPlan?.actions.filter(
      (a) => a.status !== "done" && a.status !== "completed",
    ) ?? [];
  const executingCount = Math.max(
    openActions.length,
    actions.filter((a) => !a.done).length,
  );
  const reviewDue = collectD7ReviewItems({
    projectId,
    profile: options.profile,
    decisions: options.recentDecisions,
  });

  const reviewingCount =
    (home.activeValidationTask || home.pendingRedeision ? 1 : 0) +
    reviewDue.length;

  const inboxFull = projectInboxFromCandidates({
    candidates,
    focusId: focusCandidate?.candidateId,
    executingCount,
    reviewingCount,
    projectId,
  });

  const loopItems = [...inboxFull.items];
  if (executingCount > 0) {
    const title =
      openActions[0]?.title ||
      home.lastActionPlan?.actions[0]?.title ||
      "跟进已拍板事项";
    loopItems.push({
      id: "exec_loop",
      kind: "case",
      title,
      bucket: "executing",
      href: `/projects/${projectId}/decisions`,
    });
  }
  for (const due of reviewDue) {
    loopItems.push({
      id: due.id,
      kind: "case",
      title: clip(due.title, 48),
      bucket: "reviewing",
      href: due.href,
    });
  }
  if (reviewDue.length === 0 && (home.activeValidationTask || home.pendingRedeision)) {
    const title =
      home.activeValidationTask?.hypothesisStatement ||
      home.pendingRedeision?.topic ||
      "验证与复盘";
    const href =
      home.pendingRedeision?.href?.includes("decision-")
        ? home.pendingRedeision.href
        : home.activeValidationTask?.href ||
          `/projects/${projectId}/decisions`;
    loopItems.push({
      id: "review_loop",
      kind: "case",
      title: clip(title, 48),
      bucket: "reviewing",
      href: href.includes("/advisor")
        ? decisionEntryHref(projectId, title)
        : href,
    });
  }

  const inbox: DailyScanV1["inbox"] = {
    pendingDecide: inboxFull.pendingDecide,
    watching: inboxFull.watching,
    executing: executingCount,
    reviewing: reviewingCount,
    items: loopItems.slice(0, 8).map((it) => ({
      id: it.id,
      title: it.title,
      bucket: it.bucket,
      href: it.href.includes("/advisor")
        ? decisionEntryHref(projectId, it.title)
        : it.href,
    })),
  };

  const restaurantContext = extractRestaurantContextForSignals({
    restaurantName,
    brandName: options.brandName,
    stageLabel: diagnosis.stageLabel,
    profile: options.profile,
  });

  const weeklyOps = readWeeklyOpsMetrics(options.profile);
  const opsFacts = weeklyOpsToInternalFacts(weeklyOps);
  const opsHint = weeklyOpsToWorldHint(weeklyOps);

  const radar = buildBusinessRadar({
    projectId,
    worldChanges,
    todayFocus,
    primaryCard,
    diagnosis,
    restaurantContext,
    externalIntelReady: identityHint.externalIntelReady,
    internalFacts: opsFacts,
    opsWorldHint: opsHint,
  });

  // D+7 到期时提升为今日主 CTA（复盘优先于闲逛）
  let finalCta = primaryCta;
  let finalFocus = todayFocus;
  if (reviewDue[0] && todayFocus.kind === "observe") {
    finalFocus = {
      kind: "decide",
      title: reviewDue[0].title,
      whyToday: "决策已满 7 天，该对照结果复盘了。",
      href: reviewDue[0].href,
      readinessStars: 4,
      known: ["当时有过明确裁决", "已进入执行/验证窗口"],
      missing: [...reviewDue[0].questions],
    };
    finalCta = {
      label: "进入第7天复盘",
      href: reviewDue[0].href,
      reason: "d7_review",
    };
  }

  return {
    diagnosis,
    todayFocus: finalFocus,
    identityHint,
    inbox,
    worldChanges,
    worldScanSummary: worldChangesSummaryLine(worldChanges),
    radar,
    reviewDue: reviewDue.map((r) => ({
      id: r.id,
      decisionId: r.decisionId,
      title: r.title,
      href: r.href,
      daysOverdue: r.daysOverdue,
      questions: r.questions,
    })),
    primaryCard,
    secondaryCards,
    actions,
    counts: {
      risks: home.openRiskAlert ? 1 : primaryCard?.kind === "risk" ? 1 : 0,
      opportunities: home.openOpportunity
        ? home.openOpportunity && riskBlocks
          ? 1
          : 1
        : 0,
      actions: actions.length,
    },
    primaryCta: finalCta,
  };
}
