/**
 * 席位一手事实账本 — 对齐 M-PNT PrimaryFact 的最小可审计子集
 */
import type { ResearchPack } from "./types";

export type SeatPrimaryFact = {
  factId: string;
  claim: string;
  sourceRef: string;
  related: "research" | "war_room" | "decision";
  capturedAt: string;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 从调研来源/章节收割可追溯一手事实 */
export function harvestSeatPrimaryFacts(
  research?: ResearchPack | null,
): SeatPrimaryFact[] {
  if (!research) return [];
  const now = new Date().toISOString();
  const fromSources = (research.sources || [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
    .slice(0, 8)
    .map((sourceRef, i) => {
      const parts = sourceRef.split("|").map((p) => p.trim()).filter(Boolean);
      let claim = parts[1] || parts[0] || sourceRef.slice(0, 80);
      if (claim.length < 10 && parts[0]) {
        claim = [parts[0], parts[1]].filter(Boolean).join(" · ");
      }
      return {
        factId: createId(`spf${i}`),
        claim: claim.slice(0, 160),
        sourceRef: sourceRef.slice(0, 240),
        related: "research" as const,
        capturedAt: now,
      };
    });

  if (fromSources.length >= 2) return fromSources;

  const fromSections = (research.sections || [])
    .filter((s) => (s.body || "").trim().length >= 24)
    .slice(0, 6)
    .map((s, i) => ({
      factId: createId(`spc${i}`),
      claim: `${s.title}：${s.body.trim().slice(0, 100)}`,
      sourceRef: `research.section:${s.title}`,
      related: "research" as const,
      capturedAt: now,
    }));

  return [...fromSources, ...fromSections].slice(0, 8);
}

export function evaluateSeatPrimaryFactsReady(
  facts?: SeatPrimaryFact[] | null,
): { ok: boolean; missing: string[] } {
  const list = facts || [];
  const missing: string[] = [];
  if (list.length < 2) missing.push("一手事实<2");
  const weak = list.filter((f) => f.claim.trim().length < 8 || !f.sourceRef.trim());
  if (weak.length) missing.push("存在无来源/过短事实");
  return { ok: missing.length === 0, missing };
}

/** 人工补录 / 覆盖一手事实（清洗 + 上限） */
export function normalizeSeatPrimaryFacts(
  input: Array<{
    factId?: string;
    claim: string;
    sourceRef: string;
    related?: SeatPrimaryFact["related"];
    capturedAt?: string;
  }>,
): SeatPrimaryFact[] {
  const now = new Date().toISOString();
  const cleaned = input
    .map((f, i) => ({
      factId: (f.factId || "").trim() || createId(`spf${i}`),
      claim: (f.claim || "").trim().slice(0, 160),
      sourceRef: (f.sourceRef || "").trim().slice(0, 240),
      related: f.related || ("research" as const),
      capturedAt: f.capturedAt || now,
    }))
    .filter((f) => f.claim.length >= 8 && f.sourceRef.length >= 4)
    .slice(0, 12);
  return cleaned;
}
