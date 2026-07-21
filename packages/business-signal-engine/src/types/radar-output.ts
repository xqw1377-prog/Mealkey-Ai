/**
 * Daily Radar 输出协议
 * 权威：docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md §五
 */

import type { BusinessSignalV1 } from "./signal";

export type DailyRadarHealthDimIdV1 =
  | "perception"
  | "market"
  | "efficiency"
  | "growth";

export type DailyRadarHealthDimV1 = {
  id: DailyRadarHealthDimIdV1;
  label: string;
  trend: "up" | "down" | "flat" | "warn";
  note: string;
};

export type DailyRadarOutputV1 = {
  schemaVersion: 1;
  projectId: string;
  generatedAt: string;
  headlineJudgment: string;
  summaryLine: string;
  changeCount: number;
  attentionCount: number;
  primary: BusinessSignalV1 | null;
  others: BusinessSignalV1[];
  todayOneThing: {
    action: string;
    why: string;
  } | null;
  health?: {
    status: "stable" | "watch" | "pressure" | "unknown";
    statusLabel: string;
    dims: DailyRadarHealthDimV1[];
  };
};

export function buildTodayOneThing(
  primary: BusinessSignalV1 | null,
): DailyRadarOutputV1["todayOneThing"] {
  if (!primary) return null;
  return {
    action: primary.recommendation,
    why: primary.meaning || primary.insight || primary.pattern,
  };
}
