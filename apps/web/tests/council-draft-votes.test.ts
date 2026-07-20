import { describe, expect, it } from "vitest";
import {
  buildActiveCouncilDraft,
  countCouncilStanceVotes,
} from "@/server/founder-layer/council/council-draft";
import type { CouncilMeetingSession } from "../../../packages/agents/src/founder-os";

function baseSession(
  partial: Partial<CouncilMeetingSession>,
): CouncilMeetingSession {
  return {
    sessionId: "s1",
    phase: "awaiting_founder",
    issue: {} as CouncilMeetingSession["issue"],
    agenda: {
      briefId: "b1",
      topic: "是否扩店？",
      objective: "拍板",
      constraints: [],
      questionsToAnswer: [],
      level: "L3",
      decisionType: "expansion",
      roster: ["CFO", "CRO", "CSO"],
      requiredEngines: [],
      conveneCouncil: true,
      founderRequired: true,
    },
    casePacket: { caseId: "c1", topic: "是否扩店？" },
    roster: ["CFO", "CRO", "CSO"],
    requiredEngines: [],
    expertReports: [],
    round1Prompts: {},
    round1Opinions: [],
    challenges: [],
    round2Prompts: {},
    conflicts: [],
    opinions: [],
    minorityReport: [],
    calibrationHints: [],
    cdoNote: "",
    board: {
      recommendedAction: "先验证",
      biggestDispute: "现金流",
      founderChoices: ["接受", "反对", "再议"],
    },
    ...partial,
  } as CouncilMeetingSession;
}

describe("council-draft 真实票数", () => {
  it("优先读 stanceMatrix", () => {
    const votes = countCouncilStanceVotes(
      baseSession({
        stanceMatrix: {
          support: ["CFO", "CSO"],
          oppose: ["CRO"],
          conditional: ["COO"],
        },
      }),
    );
    expect(votes).toEqual({
      supportCount: 2,
      opposeCount: 1,
      observeCount: 1,
    });
  });

  it("写入 draft，禁止用 insight 估算", () => {
    const draft = buildActiveCouncilDraft(
      baseSession({
        insights: [{ id: "i1" }, { id: "i2" }, { id: "i3" }] as never,
        stanceMatrix: {
          support: ["CFO", "CSO", "BMO"],
          oppose: [],
          conditional: ["CRO", "COO"],
        },
      }),
    );
    expect(draft?.insightCount).toBe(3);
    expect(draft?.supportCount).toBe(3);
    expect(draft?.observeCount).toBe(2);
    expect(draft?.opposeCount).toBe(0);
  });
});
