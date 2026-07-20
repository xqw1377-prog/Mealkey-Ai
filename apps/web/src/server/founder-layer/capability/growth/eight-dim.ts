/**
 * Growth G1 — 八维能力映射（四维 CapabilityScore → 八维）
 */

import type { CapabilityScore } from "../../contracts/capability";
import type { FounderCapabilityDim, FounderCapabilityScore } from "../../contracts/growth-runtime";

const EIGHT: FounderCapabilityDim[] = [
  "strategy",
  "positioning",
  "marketing",
  "product",
  "finance",
  "organization",
  "execution",
  "learning",
];

/** 四维 id → 八维权重分配 */
const FOUR_TO_EIGHT: Record<string, Partial<Record<FounderCapabilityDim, number>>> = {
  cognition: { strategy: 0.5, positioning: 0.5 },
  decision: { product: 0.35, finance: 0.35, organization: 0.3 },
  execution: { execution: 0.7, marketing: 0.3 },
  growth: { learning: 0.6, marketing: 0.2, organization: 0.2 },
};

const LABELS: Record<FounderCapabilityDim, string> = {
  strategy: "战略判断",
  positioning: "定位心智",
  marketing: "市场获客",
  product: "产品运营",
  finance: "财务模型",
  organization: "组织治理",
  execution: "执行落地",
  learning: "复盘学习",
};

export function mapFourToEight(
  scores: CapabilityScore[],
): FounderCapabilityScore[] {
  const buckets: Record<FounderCapabilityDim, { sum: number; weight: number; notes: string[] }> =
    Object.fromEntries(
      EIGHT.map((d) => [d, { sum: 0, weight: 0, notes: [] as string[] }]),
    ) as Record<
      FounderCapabilityDim,
      { sum: number; weight: number; notes: string[] }
    >;

  for (const s of scores) {
    const map = FOUR_TO_EIGHT[s.id] || {};
    for (const [dim, w] of Object.entries(map)) {
      const d = dim as FounderCapabilityDim;
      const weight = w || 0;
      buckets[d].sum += s.score * weight;
      buckets[d].weight += weight;
      if (s.note) buckets[d].notes.push(s.note);
    }
  }

  const now = new Date().toISOString();
  return EIGHT.map((dim) => {
    const b = buckets[dim];
    const score =
      b.weight > 0 ? Math.round(b.sum / b.weight) : 50;
    return {
      dim,
      label: LABELS[dim],
      score: Math.max(0, Math.min(100, score)),
      confidence: b.weight > 0 ? 0.7 : 0.4,
      note: b.notes[0],
      updatedAt: now,
    };
  });
}
