import { describe, expect, it } from "vitest";
import {
  CONSULTING_CASE_FIXTURES,
  evaluateAllConsultingCases,
  evaluateConsultingCase,
} from "@/server/founder-layer/eval/consulting-cases";

describe("Consulting case blind-tests", () => {
  it("覆盖 5 个餐饮高压案例", () => {
    expect(CONSULTING_CASE_FIXTURES).toHaveLength(5);
    expect(CONSULTING_CASE_FIXTURES.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        "franchise-20-stores",
        "banquet-national-rollout",
        "dilute-to-expand",
        "copy-without-supply-chain",
        "national-data-for-changsha",
      ]),
    );
  });

  it("每个案例：敢反对老板 + Round2 点名 Evidence ID + 提案有约束", () => {
    for (const fixture of CONSULTING_CASE_FIXTURES) {
      const result = evaluateConsultingCase(fixture);
      expect(result.dareToOpposeFounder, result.notes.join("; ")).toBe(true);
      expect(result.citesTargetEvidenceId, result.notes.join("; ")).toBe(true);
      expect(result.proposalOk, result.notes.join("; ")).toBe(true);
      expect(result.memoHasStopLine, result.notes.join("; ")).toBe(true);
      expect(result.passed, `${fixture.id}: ${result.notes.join("; ")}`).toBe(true);
    }
  });

  it("全量盲测通过率 ≥ 80%", () => {
    const summary = evaluateAllConsultingCases();
    expect(summary.total).toBe(5);
    expect(summary.passRate).toBeGreaterThanOrEqual(0.8);
    expect(summary.passCount).toBeGreaterThanOrEqual(4);
  });
});
