/**
 * Evidence weight = sourceTrust × freshness × relevance（× confidence 可选）
 * 权威：MEALKEY_DECISION_QUALITY_MECHANISM_V1 / DATA_CONTRACT_V1
 */
import {
  EVIDENCE_SOURCE_TRUST,
  type EvidenceSourceTrustBandV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";

export function sourceTrustValue(band: EvidenceSourceTrustBandV1): number {
  return EVIDENCE_SOURCE_TRUST[band];
}

/** 新鲜度：0–1，按距今天数衰减（默认 90 天降到 ~0.35） */
export function timeFreshness(
  timestampIso: string,
  now: Date = new Date(),
  halfLifeDays = 45,
): number {
  const t = Date.parse(timestampIso);
  if (!Number.isFinite(t)) return 0.5;
  const ageDays = Math.max(0, (now.getTime() - t) / (86400 * 1000));
  const freshness = Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
  return Math.max(0.15, Math.min(1, freshness));
}

export function computeEvidenceWeight(input: {
  sourceTrustBand: EvidenceSourceTrustBandV1;
  timestamp: string;
  relevance: number; // 0–1
  confidence?: number; // 0–1
  now?: Date;
}): number {
  const trust = sourceTrustValue(input.sourceTrustBand);
  const fresh = timeFreshness(input.timestamp, input.now);
  const rel = Math.max(0, Math.min(1, input.relevance));
  const conf =
    typeof input.confidence === "number"
      ? Math.max(0, Math.min(1, input.confidence))
      : 1;
  const w = trust * fresh * rel * conf;
  return Math.round(w * 1000) / 1000;
}
