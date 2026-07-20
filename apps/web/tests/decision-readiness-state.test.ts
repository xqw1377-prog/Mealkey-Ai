import { describe, expect, it } from "vitest";
import {
  buildDecisionReadiness,
  deriveReadinessState,
} from "@/server/founder-layer/contracts/business-identity";

describe("Decision Readiness State", () => {
  it("无地理锚点 → need_evidence", () => {
    const r = buildDecisionReadiness({
      score: 60,
      known: ["品牌"],
      missing: ["地理/地址"],
      canClaimExternalIntel: false,
    });
    expect(r.state).toBe("need_evidence");
    expect(r.stateLabel).toContain("外部");
  });

  it("缺经营事实 → need_context", () => {
    const state = deriveReadinessState({
      score: 50,
      missing: ["店长独立能力", "利润趋势"],
      canClaimExternalIntel: true,
    });
    expect(state).toBe("need_context");
  });

  it("高分无缺口 → ready", () => {
    const r = buildDecisionReadiness({
      score: 82,
      known: ["经营状态", "证据"],
      missing: [],
      canClaimExternalIntel: true,
    });
    expect(r.state).toBe("ready");
  });
});
