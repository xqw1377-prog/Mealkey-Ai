/**
 * Signal Ranking Engine
 * rankScore = impact × urgency × confidence × relevance
 * 权威：docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md §四
 */

import {
  RADAR_HOME_OTHERS_MAX,
  RADAR_HOME_RANK_FLOOR,
  RADAR_NON_HOME_PROMOTE_FLOOR,
  V1_HOME_RADAR_TYPES,
  type BusinessSignalSeverityV1,
  type BusinessSignalTypeV1,
  type BusinessSignalV1,
  type SignalScoreBreakdownV1,
} from "../types/signal";
import { hasMinimumEvidenceChain } from "../evidence/evidence-chain";

function clamp1to10(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}

export function computeRankScores(parts: {
  impact: number;
  urgency: number;
  confidence: number;
  relevance: number;
}): SignalScoreBreakdownV1 {
  const impact = clamp1to10(parts.impact);
  const urgency = clamp1to10(parts.urgency);
  const confidence = clamp1to10(parts.confidence);
  const relevance = clamp1to10(parts.relevance);
  return {
    impact,
    urgency,
    confidence,
    relevance,
    rankScore: impact * urgency * confidence * relevance,
    trust: confidence,
  };
}

function severityRank(s: BusinessSignalSeverityV1): number {
  if (s === "CRITICAL") return 4;
  if (s === "HIGH") return 3;
  if (s === "MEDIUM") return 2;
  return 1;
}

function typePriority(t: BusinessSignalTypeV1): number {
  const i = V1_HOME_RADAR_TYPES.indexOf(t);
  if (i >= 0) return 3 - i;
  return 0;
}

export function isPositiveSignal(s: BusinessSignalV1): boolean {
  return /增长|上升|认可|正向|机会|提升/.test(
    `${s.title}${s.meaning}${s.insight || ""}${s.observation}`,
  );
}

function isHomeEligibleType(t: BusinessSignalTypeV1, rankScore: number): boolean {
  if (V1_HOME_RADAR_TYPES.includes(t)) return true;
  return rankScore >= RADAR_NON_HOME_PROMOTE_FLOOR;
}

export function rankBusinessSignals(
  signals: BusinessSignalV1[],
): BusinessSignalV1[] {
  return [...signals].sort((a, b) => {
    const ra = a.scores?.rankScore ?? 0;
    const rb = b.scores?.rankScore ?? 0;
    if (rb !== ra) return rb - ra;
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev) return sev;
    const ca = a.scores?.confidence ?? a.scores?.trust ?? 0;
    const cb = b.scores?.confidence ?? b.scores?.trust ?? 0;
    if (cb !== ca) return cb - ca;
    return typePriority(b.type) - typePriority(a.type);
  });
}

export type RadarSignalSliceV1 = {
  primary: BusinessSignalV1 | null;
  others: BusinessSignalV1[];
  allRanked: BusinessSignalV1[];
};

/**
 * 首页切片：1 primary + ≤3 others
 * 无证据链 / 非三大雷达（且未达升格分）不得做 primary
 */
export function selectRadarSlice(
  signals: BusinessSignalV1[],
): RadarSignalSliceV1 {
  const ranked = rankBusinessSignals(signals);
  let primary: BusinessSignalV1 | null = null;
  for (const s of ranked) {
    const score = s.scores?.rankScore ?? 0;
    if (
      hasMinimumEvidenceChain(s.evidence) &&
      isHomeEligibleType(s.type, score) &&
      (s.pattern || "").trim() &&
      (s.meaning || s.insight || "").trim()
    ) {
      primary = { ...s, status: s.status === "detected" ? "surfaced" : s.status };
      break;
    }
  }
  const others = ranked
    .filter((s) => s.id !== primary?.id)
    .filter((s) => {
      const score = s.scores?.rankScore ?? 0;
      if (!isHomeEligibleType(s.type, score) && !isPositiveSignal(s)) {
        return false;
      }
      return isPositiveSignal(s) || score >= RADAR_HOME_RANK_FLOOR;
    })
    .slice(0, RADAR_HOME_OTHERS_MAX)
    .map((s) => ({
      ...s,
      status: s.status === "detected" ? ("surfaced" as const) : s.status,
    }));

  return { primary, others, allRanked: ranked };
}

export function severityFromScores(
  scores: SignalScoreBreakdownV1,
  decideLean: boolean,
): BusinessSignalSeverityV1 {
  if (scores.impact >= 9 && scores.urgency >= 8) return "CRITICAL";
  if (decideLean || scores.rankScore >= 3500) return "HIGH";
  if (scores.rankScore >= 1500) return "MEDIUM";
  return "LOW";
}
