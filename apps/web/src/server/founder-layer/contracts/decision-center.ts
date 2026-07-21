/**
 * Decision Center V1 — 投影契约（非 Prisma 表）
 * 权威：docs/MEALKEY_DECISION_CENTER_TECHNICAL_V1.md
 */

import type { BusinessRadarV1 } from "./business-radar";

export type { BusinessRadarV1 } from "./business-radar";
export type {
  RadarChangeItemV1,
  RadarSeverityV1,
  OperatingHealthV1,
  OperatingHealthDimV1,
} from "./business-radar";

export type DecisionCardTone = "red" | "yellow" | "green";
export type DecisionCardKind = "risk" | "opportunity" | "action_bundle";
export type DecisionEntryMode = "research" | "council" | "resume";

export type DecisionCardV1 = {
  cardId: string;
  kind: DecisionCardKind;
  tone: DecisionCardTone;
  title: string;
  situationLine: string;
  impactStars: 1 | 2 | 3 | 4 | 5;
  urgencyStars: 1 | 2 | 3 | 4 | 5;
  councilPreview?: {
    /** 常委真实支持票；勿用 insightCount 估算 */
    supportCount: number;
    /** 条件/观望票 */
    observeCount: number;
    oneLineAdvice: string;
  };
  confidence: number;
  evidenceHints: string[];
  href: string;
  entryMode: DecisionEntryMode;
  decisionId?: string;
  riskAlertId?: string;
  opportunityId?: string;
  deferred?: boolean;
};

export type DailyDiagnosisV1 = {
  greetingName: string;
  restaurantName: string;
  healthScore: number | null;
  stageLabel: string;
  primaryCause: string;
  notCause?: string;
  impactLine: string;
  evidenceChecks: Array<{ label: string; available: boolean }>;
  confidence: number;
  understandingScore?: number;
  dataCompleteness?: number;
};

/** 今日焦点 — Decision Experience 驾驶舱主角 */
export type TodayFocusV1 = {
  kind: "decide" | "watch" | "observe";
  title: string;
  whyToday: string;
  href: string;
  readinessStars: 1 | 2 | 3 | 4 | 5;
  known: string[];
  missing: string[];
};

export type IdentityHintV1 = {
  externalIntelReady: boolean;
  missingAnchors: string[];
  patchHref: string;
  summaryLine: string;
};

export type DecisionInboxScanV1 = {
  pendingDecide: number;
  watching: number;
  executing: number;
  reviewing: number;
  /** 可点进决策室的条目（投影，非任务墙） */
  items?: Array<{
    id: string;
    title: string;
    bucket: "pending_decide" | "watching" | "executing" | "reviewing";
    href: string;
  }>;
};

export type DailyScanV1 = {
  diagnosis: DailyDiagnosisV1;
  /** Experience：今日你最该关注什么 */
  todayFocus: TodayFocusV1;
  identityHint: IdentityHintV1;
  /** 经营问题池计数（非任务墙） */
  inbox: DecisionInboxScanV1;
  /** E1：今天生意发生了什么（来自 RIP 日更差分） */
  worldChanges?: Array<{
    id: string;
    kind: "review" | "competition" | "customer" | "alert";
    title: string;
    detail: string;
    decisionTopic?: string;
    href?: string;
  }>;
  worldScanSummary?: string;
  /**
   * 今日经营雷达 — Business Observer（日活入口）
   * 变化检测 → 影响 → 建议；不做决策
   */
  radar?: BusinessRadarV1;
  /** D+7 复盘到期（MVP 仪式） */
  reviewDue?: Array<{
    id: string;
    decisionId: string;
    title: string;
    href: string;
    daysOverdue: number;
    questions: [string, string, string];
  }>;
  primaryCard: DecisionCardV1 | null;
  secondaryCards: DecisionCardV1[];
  actions: Array<{ id: string; title: string; done: boolean; checkable: boolean }>;
  counts: { risks: number; opportunities: number; actions: number };
  primaryCta: {
    label: string;
    href: string;
    reason:
      | "redeision"
      | "council"
      | "draft"
      | "meeting"
      | "checkin"
      | "open_card"
      | "d7_review";
  };
};

export type CouncilSeatView = {
  roleId: string;
  title: string;
  judgement: string;
  reason: string;
  redLine?: string;
  stance: "support" | "oppose" | "conditional" | "observe";
};
