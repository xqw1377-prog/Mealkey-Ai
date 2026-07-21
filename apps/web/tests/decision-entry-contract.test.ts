import { describe, expect, it } from "vitest";
import {
  decisionEntryPath,
  decisionReadyPath,
  buildDecisionReadyHref,
} from "@/lib/decision-entry";
import { buildConflictMap } from "../../../packages/agents/src/founder-os/meeting-engine";
import type { CouncilOpinion } from "../../../packages/agents/src/founder-os";

describe("决策入口契约", () => {
  it("经营议题默认 intake=ready，并可带 why", () => {
    const href = decisionReadyPath("p1", "要不要跟进套餐？", {
      whyNow: "竞品已动，晚餐承压",
    });
    expect(href).toContain("intake=ready");
    expect(href).toContain(encodeURIComponent("要不要跟进套餐？"));
    expect(href).toContain("why=");
  });

  it("decisionEntryPath 与 ready 对齐；扩店走 case", () => {
    expect(decisionEntryPath("p1", "要不要涨价")).toContain("intake=ready");
    expect(decisionEntryPath("p1", "要不要开第二家店")).toContain(
      "decision-case",
    );
    expect(buildDecisionReadyHref("p1", "是否签字")).toContain("intake=ready");
  });
});

describe("冲突图证据权重 severity", () => {
  it("立场对立且证据弱 → high", () => {
    const packet = {
      caseId: "c",
      items: [
        {
          evidenceId: "E-weak",
          sourceAgent: "WORLD",
          claim: "弱线索",
          strength: "weak" as const,
        },
      ],
      gaps: ["缺硬证"],
    };
    const opinions: CouncilOpinion[] = [
      {
        member: "CSO",
        position: "support",
        confidence: 70,
        summary: "推",
        judgment: "推",
        reasoning: [],
        risks: [],
        conditions: [],
        veto: false,
        evidence_used: ["E-weak"],
      },
      {
        member: "CFO",
        position: "oppose",
        confidence: 80,
        summary: "停",
        judgment: "停",
        reasoning: [],
        risks: [],
        conditions: [],
        veto: false,
        evidence_used: ["E-weak"],
      },
    ];
    const conflicts = buildConflictMap(opinions, [], packet);
    const hit = conflicts.find(
      (c) =>
        (c.agentA === "CSO" && c.agentB === "CFO") ||
        (c.agentA === "CFO" && c.agentB === "CSO"),
    );
    expect(hit?.severity).toBe("high");
  });
});
