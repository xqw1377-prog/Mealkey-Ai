/**
 * 席位一手事实规范化
 */
import { describe, expect, it } from "vitest";
import {
  normalizeSeatPrimaryFacts,
  evaluateSeatPrimaryFactsReady,
} from "../../packages/agents/src/consulting-os";

describe("normalizeSeatPrimaryFacts", () => {
  it("keeps valid facts and drops weak ones", () => {
    const facts = normalizeSeatPrimaryFacts([
      { claim: "短", sourceRef: "x" },
      {
        claim: "写字楼商圈客流向晚间集中",
        sourceRef: "店访笔记 · 2026-07-01",
      },
      {
        claim: "连锁挤压下切口必须可证明复购",
        sourceRef: "区域客流扫描 | 摘要 | https://example.com/a",
      },
    ]);
    expect(facts).toHaveLength(2);
    expect(evaluateSeatPrimaryFactsReady(facts).ok).toBe(true);
  });
});
