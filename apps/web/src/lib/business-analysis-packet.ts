/**
 * 经营分析页载荷（客户端暂存）
 * 权威：docs/BUSINESS_ANALYSIS_OUTPUT_TEMPLATE_V1.md
 */

export type BusinessAnalysisEvidenceItem = {
  claim: string;
  source: string;
  kind: "internal_fact" | "external_intel" | "inference";
};

export type BusinessAnalysisPacketV1 = {
  signalId: string;
  brandLine: string;
  signalTypeLabel: string;
  severity: "decide" | "watch" | "positive";
  importanceStars: 1 | 2 | 3 | 4 | 5;
  decisionQuestion: string;
  headlineJudgment: string;
  observation: string;
  pattern: string;
  meaning: string;
  impact: string;
  recommendation: string;
  evidence: BusinessAnalysisEvidenceItem[];
  known: string[];
  unknown: string[];
  confidenceNote: string;
  todayOneThing?: { action: string; why: string } | null;
  /** 升格决策室用 */
  decisionTopic: string;
};

const STORAGE_KEY = "mk_business_analysis_packet_v1";

export function saveBusinessAnalysisPacket(
  projectId: string,
  packet: BusinessAnalysisPacketV1,
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projectId, packet, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function readBusinessAnalysisPacket(
  projectId: string,
): BusinessAnalysisPacketV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      projectId?: string;
      packet?: BusinessAnalysisPacketV1;
      at?: number;
    };
    if (parsed.projectId !== projectId || !parsed.packet) return null;
    if (parsed.at && Date.now() - parsed.at > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.packet;
  } catch {
    return null;
  }
}

export function clearBusinessAnalysisPacket() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function businessAnalysisPath(projectId: string) {
  return `/projects/${projectId}/business-analysis`;
}
