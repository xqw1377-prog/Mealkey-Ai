/**
 * Business Observer Layer — Signal Engine → 今日经营雷达
 * 权威：docs/TODAY_RADAR_EXPERIENCE_V1.md · BUSINESS_SIGNAL_ENGINE_V1.md
 */

import type {
  BusinessRadarV1,
  OperatingHealthV1,
  RadarChangeItemV1,
} from "@/server/founder-layer/contracts/business-radar";
import type {
  DailyDiagnosisV1,
  DecisionCardV1,
  TodayFocusV1,
} from "@/server/founder-layer/contracts/decision-center";
import type { WorldChangeV1 } from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";
import type { BusinessSignalV1 } from "@/server/founder-layer/contracts/business-signal";
import { runBusinessSignalEngine } from "./business-signal-engine";

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function signalToRadarItem(s: BusinessSignalV1): RadarChangeItemV1 {
  return {
    id: s.id,
    severity: s.severity,
    title: s.title,
    reason: s.observation,
    pattern: s.pattern,
    meaning: s.meaning,
    impact: s.impact,
    suggestion: s.suggestion,
    href: s.href,
    ctaLabel: s.ctaLabel,
    decisionTopic: s.decisionTopic,
    signalType: s.type,
    importanceStars: s.importanceStars,
    judgment: s.judgment,
    evidenceChain: s.evidenceChain,
    rankScore: s.scores.rankScore,
  };
}

function buildHeadlineJudgment(input: {
  primary: RadarChangeItemV1 | null;
  focus?: TodayFocusV1 | null;
  primaryCard?: DecisionCardV1 | null;
  diagnosis?: DailyDiagnosisV1 | null;
}): string {
  const top = input.primary;
  if (top) {
    if (top.judgment) return clip(top.judgment, 72);
    if (/服务|等待|出餐/.test(`${top.title}${top.reason}`)) {
      return "你的服务体验正在影响复购。";
    }
    if (/竞争|竞品|新店/.test(top.title)) {
      return "竞争正在增加，你需要提前建立更清晰的区域认知。";
    }
    return clip(`今天最该盯的是：${top.title}`, 64);
  }
  if (input.focus?.kind === "decide" && input.focus.title) {
    return clip(`今天最该先定：${input.focus.title}`, 64);
  }
  if (input.primaryCard?.kind === "opportunity") {
    return "消费者侧出现机会窗口，值得判断要不要放大。";
  }
  if (input.primaryCard?.kind === "risk") {
    return "经营侧出现风险信号，建议今天先做判断再行动。";
  }
  if (input.diagnosis?.primaryCause) {
    return clip(input.diagnosis.primaryCause, 64);
  }
  return "今天外部世界暂无尖锐变化；继续盯紧日常经营节奏即可。";
}

function buildHealth(input: {
  changes: RadarChangeItemV1[];
  diagnosis?: DailyDiagnosisV1 | null;
  healthScore?: number | null;
}): OperatingHealthV1 {
  const decideN = input.changes.filter((c) => c.severity === "decide").length;
  const positiveN = input.changes.filter((c) => c.severity === "positive").length;
  const watchN = input.changes.filter((c) => c.severity === "watch").length;
  const score = input.healthScore;

  let status: OperatingHealthV1["status"] = "unknown";
  let statusLabel = "待观察";
  if (decideN >= 2 || (typeof score === "number" && score < 40)) {
    status = "pressure";
    statusLabel = "承压";
  } else if (decideN === 1 || watchN >= 2) {
    status = "watch";
    statusLabel = "需关注";
  } else if (positiveN > 0 || (typeof score === "number" && score >= 55)) {
    status = "stable";
    statusLabel = "稳定";
  } else if (typeof score === "number") {
    status = score >= 55 ? "stable" : "watch";
    statusLabel = status === "stable" ? "稳定" : "需关注";
  }

  const hasReviewRisk = input.changes.some(
    (c) =>
      c.severity === "decide" &&
      /评价|服务|口碑|等待/.test(c.title + c.reason),
  );
  const hasComp = input.changes.some((c) => /竞争|竞品|新店/.test(c.title));
  const hasPositive = positiveN > 0;

  return {
    status,
    statusLabel,
    dims: [
      {
        id: "perception",
        label: "用户感知",
        trend: hasReviewRisk ? "down" : hasPositive ? "up" : "flat",
        note: hasReviewRisk
          ? "口碑侧出现承压信号"
          : hasPositive
            ? "认可信号在增强"
            : "暂无尖锐口碑变化",
      },
      {
        id: "market",
        label: "市场位置",
        trend: hasComp ? "warn" : "flat",
        note: hasComp ? "竞争环境有新增压力" : "竞争格局暂稳",
      },
      {
        id: "efficiency",
        label: "经营效率",
        trend:
          typeof score === "number"
            ? score >= 70
              ? "up"
              : score < 45
                ? "down"
                : "flat"
            : "flat",
        note:
          typeof score === "number"
            ? `综合健康参考 ${Math.round(score)}`
            : "内部经营数据仍薄",
      },
      {
        id: "growth",
        label: "增长机会",
        trend: hasPositive ? "up" : decideN > 0 ? "warn" : "flat",
        note: hasPositive
          ? "出现可放大的正向窗口"
          : decideN > 0
            ? "先处理风险，再谈放大"
            : "暂无明确机会窗口",
      },
    ],
  };
}

/** 从 DailyScan 素材组装雷达（经 Signal Engine） */
export function buildBusinessRadar(input: {
  projectId: string;
  worldChanges?: WorldChangeV1[] | null;
  todayFocus?: TodayFocusV1 | null;
  primaryCard?: DecisionCardV1 | null;
  diagnosis?: DailyDiagnosisV1 | null;
  restaurantContext?: {
    brandName?: string;
    stageLabel?: string;
    peakDaypart?: string;
    dnaHints?: string[];
  } | null;
  externalIntelReady?: boolean;
  internalFacts?: Array<{
    id?: string;
    source: string;
    fact: string;
  }> | null;
  opsWorldHint?: {
    id: string;
    title: string;
    detail: string;
    kind: string;
    source?: string;
  } | null;
}): BusinessRadarV1 {
  const worldChanges = [
    ...(input.worldChanges || []),
    ...(input.opsWorldHint
      ? [
          {
            id: input.opsWorldHint.id,
            kind: "alert" as const,
            title: input.opsWorldHint.title,
            detail: input.opsWorldHint.detail,
          },
        ]
      : []),
  ];
  const { primary, others, allRanked } = runBusinessSignalEngine({
    projectId: input.projectId,
    worldChanges,
    todayFocus: input.todayFocus,
    diagnosis: input.diagnosis,
    restaurantContext: input.restaurantContext,
    internalFacts: input.internalFacts,
  });

  const primaryItem = primary ? signalToRadarItem(primary) : null;
  const otherItems = others.map(signalToRadarItem);
  const changes = [
    ...(primaryItem ? [primaryItem] : []),
    ...otherItems,
  ];

  const attentionCount = allRanked.filter((s) => s.severity === "decide").length;
  const changeCount = allRanked.length;
  const summaryLine =
    changeCount === 0
      ? "我昨天观察你的生意，暂无新增尖锐变化。"
      : `我昨天观察你的生意，发现 ${changeCount} 个变化。`;

  let emptyIntelNote: string | null = null;
  if (changeCount === 0) {
    if (input.externalIntelReady === false) {
      emptyIntelNote =
        "补齐品牌与城市后，才能用公开市场线索观察外部变化；内部经营决策现在就能发起。";
    } else {
      emptyIntelNote =
        "已尝试观察公开口碑与竞争线索，暂未发现可核验的尖锐变化（不编造数据）。";
    }
  }

  return {
    headlineJudgment: buildHeadlineJudgment({
      primary: primaryItem,
      focus: input.todayFocus,
      primaryCard: input.primaryCard,
      diagnosis: input.diagnosis,
    }),
    changeCount,
    attentionCount,
    summaryLine,
    primary: primaryItem,
    others: otherItems,
    changes,
    todayOneThing: primaryItem
      ? {
          action: primaryItem.suggestion,
          why: primaryItem.judgment || primaryItem.impact,
        }
      : null,
    emptyIntelNote,
    health: buildHealth({
      changes,
      diagnosis: input.diagnosis,
      healthScore: input.diagnosis?.healthScore ?? null,
    }),
  };
}
