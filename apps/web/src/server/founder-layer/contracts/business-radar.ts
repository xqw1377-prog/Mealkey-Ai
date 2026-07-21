/**
 * 今日经营雷达 V1 — 变化检测投影（非 Prisma 表）
 * 定位：日活入口 · AI 经营观察员 · 不做决策，只发现值得决策的问题
 * 权威：docs/TODAY_RADAR_EXPERIENCE_V1.md · BUSINESS_SIGNAL_ENGINE_V1.md
 */

import type { BusinessSignalV1 } from "./business-signal";

export type RadarSeverityV1 = "decide" | "watch" | "positive";

export type RadarChangeItemV1 = {
  id: string;
  severity: RadarSeverityV1;
  title: string;
  /** L1 观察（同 reason，兼容旧字段） */
  reason: string;
  /** L2 模式 */
  pattern?: string;
  /** L3 意义 */
  meaning?: string;
  impact: string;
  suggestion: string;
  href: string;
  ctaLabel: string;
  decisionTopic?: string;
  /** 信号类型（五类） */
  signalType?: BusinessSignalV1["type"];
  /** 重要程度星级 */
  importanceStars?: 1 | 2 | 3 | 4 | 5;
  /** 我的判断（优先 meaning） */
  judgment?: string;
  /** 为什么提醒你 */
  evidenceChain?: BusinessSignalV1["evidenceChain"];
  rankScore?: number;
};

export type OperatingHealthDimIdV1 =
  | "perception"
  | "market"
  | "efficiency"
  | "growth";

export type OperatingHealthDimV1 = {
  id: OperatingHealthDimIdV1;
  label: string;
  trend: "up" | "down" | "flat" | "warn";
  note: string;
};

export type OperatingHealthV1 = {
  status: "stable" | "watch" | "pressure" | "unknown";
  statusLabel: string;
  dims: OperatingHealthDimV1[];
};

/**
 * Business Observer 输出：挂在 DailyScan 上，供首页雷达渲染
 */
export type BusinessRadarV1 = {
  /** 今日经营判断 — 首页顶部一句话，不是数字 */
  headlineJudgment: string;
  changeCount: number;
  attentionCount: number;
  /** 「我昨天观察你的生意，发现 N 个变化。」 */
  summaryLine: string;
  /** 今天最值得关注（仅 1 条） */
  primary: RadarChangeItemV1 | null;
  /** 其他变化（≤3） */
  others: RadarChangeItemV1[];
  /** @deprecated 兼容：primary + others */
  changes: RadarChangeItemV1[];
  /** 今天只做一件事 */
  todayOneThing?: { action: string; why: string } | null;
  /** 外采诚实空态说明（无证据时） */
  emptyIntelNote?: string | null;
  health: OperatingHealthV1;
};
