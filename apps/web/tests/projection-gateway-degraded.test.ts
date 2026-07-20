import { describe, expect, it } from "vitest";
import { projectDecisionToOpinion } from "@/server/founder-layer/projection/gateway";
import type { FounderDecision } from "@/server/founder-layer/contracts";

function baseDecision(
  overrides: Partial<FounderDecision> & {
    metadata?: FounderDecision["metadata"];
  },
): FounderDecision {
  return {
    decisionId: "d1",
    sourceAgent: "M-BIZ",
    question: "该不该扩第二店",
    judgement: "先算清单店单位经济",
    confidence: 0.82,
    evidence: [],
    risks: [],
    nextSteps: [],
    metadata: {
      missionId: "m1",
      producedAt: new Date().toISOString(),
      ...overrides.metadata,
    },
    ...overrides,
  };
}

describe("projectDecisionToOpinion degraded", () => {
  it("marks heuristic provider as degraded even with high confidence", () => {
    const opinion = projectDecisionToOpinion({
      meetingId: "meet_1",
      decision: baseDecision({
        judgement: "看似完整的启发式剧本",
        confidence: 0.9,
        metadata: {
          missionId: "m1",
          producedAt: new Date().toISOString(),
          provider: "heuristic",
        },
      }),
    });
    expect(opinion.degraded).toBe(true);
  });

  it("does not mark external provider as degraded when confidence is healthy", () => {
    const opinion = projectDecisionToOpinion({
      meetingId: "meet_1",
      decision: baseDecision({
        judgement: "【真实引擎】先稳住单店毛利",
        confidence: 0.78,
        metadata: {
          missionId: "m1",
          producedAt: new Date().toISOString(),
          provider: "external",
        },
      }),
    });
    expect(opinion.degraded).toBe(false);
  });

  it("marks 【启发式】 prefix as degraded", () => {
    const opinion = projectDecisionToOpinion({
      meetingId: "meet_1",
      decision: baseDecision({
        judgement: "【启发式】本席暂时用规则补全",
        confidence: 0.7,
        metadata: {
          missionId: "m1",
          producedAt: new Date().toISOString(),
          provider: "external",
        },
      }),
    });
    expect(opinion.degraded).toBe(true);
  });
});
