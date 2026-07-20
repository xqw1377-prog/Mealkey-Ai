import { describe, expect, it } from "vitest";
import {
  buildExpansionDecisionCase,
  caseStatusToMkStatus,
  mkStatusToCaseStatus,
} from "@/server/founder-layer/capability/decision-intelligence";

describe("expansion DecisionCase factory", () => {
  it("生成 GROWTH 扩店 Case", () => {
    const c = buildExpansionDecisionCase({
      id: "dec_1",
      projectId: "p1",
      ownerId: "o1",
      ownerLabel: "王老板",
      now: new Date("2026-07-18T00:00:00.000Z"),
    });
    expect(c.decisionType).toBe("GROWTH");
    expect(c.title).toContain("第二家");
    expect(c.status).toBe("DISCOVERED");
    expect(c.question).toContain("12");
  });

  it("Case.status ↔ mkStatus 双向映射", () => {
    expect(caseStatusToMkStatus("DELIBERATING")).toBe("COUNCIL_REVIEW");
    expect(mkStatusToCaseStatus("APPROVED")).toBe("DECIDED");
    expect(mkStatusToCaseStatus("VALIDATING")).toBe("EXECUTING");
  });
});
