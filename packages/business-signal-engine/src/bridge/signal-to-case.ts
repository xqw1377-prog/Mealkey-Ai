/**
 * Signal → DecisionCase 转换（无 Prisma；Case.id ≡ MKDecision.id）
 * 权威：docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md §六
 */

import { hasMinimumEvidenceChain } from "../evidence/evidence-chain";
import type {
  BusinessSignalSeverityV1,
  BusinessSignalTypeV1,
  BusinessSignalV1,
} from "../types/signal";

export type SignalCaseDecisionTypeV1 =
  | "GROWTH"
  | "OPERATION"
  | "PRODUCT"
  | "MARKETING"
  | "ORGANIZATION"
  | "FINANCE";

export type SignalToCaseDraftV1 = {
  caseId?: string;
  projectId: string;
  title: string;
  question: string;
  objective: string;
  decisionType: SignalCaseDecisionTypeV1;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  impactStars: 1 | 2 | 3 | 4 | 5;
  signalId: string;
  evidenceSummary: Array<{
    source: string;
    fact: string;
    sourceRef?: string;
  }>;
  unknowns: string[];
  status: "DISCOVERED";
};

export type PromoteGateResultV1 =
  | { ok: true }
  | { ok: false; reason: string };

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function canPromoteSignalToCase(
  signal: BusinessSignalV1,
  opts?: { forceByUser?: boolean },
): PromoteGateResultV1 {
  if (
    signal.status === "dismissed" ||
    signal.status === "merged" ||
    signal.status === "resolved"
  ) {
    return { ok: false, reason: "signal_closed" };
  }
  if (!hasMinimumEvidenceChain(signal.evidence)) {
    return { ok: false, reason: "evidence_insufficient" };
  }
  const question = (
    signal.suggestedQuestion ||
    signal.decisionTopic ||
    ""
  ).trim();
  if (!question) {
    return { ok: false, reason: "missing_question" };
  }
  const severityOk =
    signal.severity === "HIGH" || signal.severity === "CRITICAL";
  if (!severityOk && !opts?.forceByUser) {
    return { ok: false, reason: "severity_gate" };
  }
  return { ok: true };
}

export function mapSignalTypeToDecisionType(
  type: BusinessSignalTypeV1,
): SignalCaseDecisionTypeV1 {
  if (type === "CUSTOMER" || type === "OPERATION") return "OPERATION";
  if (type === "COMPETITION" || type === "MARKET") return "GROWTH";
  if (type === "BRAND") return "MARKETING";
  if (type === "ORGANIZATION") return "ORGANIZATION";
  return "OPERATION";
}

export function mapSeverityToCaseUrgency(
  sev: BusinessSignalSeverityV1,
): "LOW" | "MEDIUM" | "HIGH" {
  if (sev === "CRITICAL" || sev === "HIGH") return "HIGH";
  if (sev === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function starsFromRank(rank: number): 1 | 2 | 3 | 4 | 5 {
  if (rank >= 5000) return 5;
  if (rank >= 3500) return 4;
  if (rank >= 2000) return 3;
  if (rank >= 1000) return 2;
  return 1;
}

/**
 * 通过 Promote Gate 后生成 Case 草稿（尚未落库）
 */
export function toDecisionCaseDraft(
  signal: BusinessSignalV1,
  opts?: { forceByUser?: boolean; projectId?: string },
): SignalToCaseDraftV1 | null {
  const gate = canPromoteSignalToCase(signal, opts);
  if (!gate.ok) return null;

  const question = (
    signal.suggestedQuestion ||
    signal.decisionTopic ||
    signal.title
  ).trim();

  const evidenceSummary = signal.evidence
    .filter((e) => e.kind !== "inference")
    .map((e) => ({
      source: e.source,
      fact: e.fact,
      sourceRef: e.sourceRef,
    }));

  const unansweredProbes = (signal.probeQuestions || []).filter(Boolean);

  return {
    projectId: opts?.projectId || signal.projectId || "",
    title: clip(signal.title, 48),
    question: clip(question, 120),
    objective: clip(signal.meaning || signal.insight || signal.impact, 160),
    decisionType: mapSignalTypeToDecisionType(signal.type),
    urgency: mapSeverityToCaseUrgency(signal.severity),
    impactStars: starsFromRank(signal.scores?.rankScore ?? 0),
    signalId: signal.id,
    evidenceSummary,
    unknowns: unansweredProbes,
    status: "DISCOVERED",
  };
}

/** 升格成功后的 Signal 写回（纯函数） */
export function markSignalPromoted(
  signal: BusinessSignalV1,
  caseId: string,
): BusinessSignalV1 {
  return {
    ...signal,
    status: "promoted_case",
    decisionCaseId: caseId,
    updatedAt: new Date().toISOString(),
  };
}
