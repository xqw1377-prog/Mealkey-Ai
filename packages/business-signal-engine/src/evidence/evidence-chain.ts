/**
 * Evidence Chain — 每个信号必须可回答「为什么告诉我」
 * 权威：docs/EVIDENCE_CHAIN_PROTOCOL_V1.md
 *       docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md §二
 */

import type {
  BusinessSignalEvidenceItemV1,
  BusinessSignalV1,
} from "../types/signal";

export function hasMinimumEvidenceChain(
  evidence: BusinessSignalEvidenceItemV1[],
): boolean {
  if (!evidence || evidence.length < 2) return false;
  return evidence.some(
    (e) => e.kind !== "inference" && (e.fact || "").trim().length >= 4,
  );
}

/** 五层完整性：进主焦点前检查 */
export function hasFiveLayers(signal: Pick<
  BusinessSignalV1,
  "observation" | "pattern" | "meaning" | "insight" | "impact" | "recommendation"
>): boolean {
  const meaning = signal.meaning || signal.insight || "";
  return (
    (signal.observation || "").trim().length >= 4 &&
    (signal.pattern || "").trim().length >= 2 &&
    meaning.trim().length >= 4 &&
    (signal.impact || "").trim().length >= 4 &&
    (signal.recommendation || "").trim().length >= 4
  );
}

/** 无足够证据则降级 severity，禁止进主焦点的 CRITICAL/HIGH */
export function enforceEvidenceGate(
  signal: BusinessSignalV1,
): BusinessSignalV1 {
  if (hasMinimumEvidenceChain(signal.evidence)) return signal;
  const severity =
    signal.severity === "CRITICAL" || signal.severity === "HIGH"
      ? "MEDIUM"
      : signal.severity;
  return {
    ...signal,
    severity,
    confidence: Math.min(signal.confidence, 0.45),
  };
}

export function evidenceToWhyLines(
  evidence: BusinessSignalEvidenceItemV1[],
): string[] {
  return evidence.map((e, i) => `${i + 1}. [${e.source}] ${e.fact}`);
}
