import { describe, expect, it } from "vitest";
import {
  computeEvidenceWeight,
  sourceTrustValue,
} from "@/server/founder-layer/capability/decision-center/evidence-weight";

describe("computeEvidenceWeight", () => {
  const now = new Date("2026-07-18T12:00:00.000Z");

  it("POS 近期高相关 > 老板主观感觉", () => {
    const pos = computeEvidenceWeight({
      sourceTrustBand: "pos_system",
      timestamp: "2026-07-10T00:00:00.000Z",
      relevance: 1,
      confidence: 0.95,
      now,
    });
    const vibe = computeEvidenceWeight({
      sourceTrustBand: "owner_subjective",
      timestamp: "2026-07-10T00:00:00.000Z",
      relevance: 1,
      confidence: 0.9,
      now,
    });
    expect(pos).toBeGreaterThan(vibe);
    expect(sourceTrustValue("pos_system")).toBe(0.9);
    expect(sourceTrustValue("owner_subjective")).toBe(0.3);
  });

  it("过期证据权重下降", () => {
    const fresh = computeEvidenceWeight({
      sourceTrustBand: "ugc",
      timestamp: "2026-07-15T00:00:00.000Z",
      relevance: 0.8,
      now,
    });
    const stale = computeEvidenceWeight({
      sourceTrustBand: "ugc",
      timestamp: "2025-01-01T00:00:00.000Z",
      relevance: 0.8,
      now,
    });
    expect(fresh).toBeGreaterThan(stale);
  });
});
