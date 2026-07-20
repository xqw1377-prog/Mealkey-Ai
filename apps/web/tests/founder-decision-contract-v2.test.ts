import { describe, expect, it } from "vitest";
import {
  assembleFounderDecisionContract,
  missionTypeToIntent,
  runDecisionGate,
} from "@/server/founder-layer/decision/contract-v2";
import { buildConflictMatrix } from "@/server/founder-layer/meeting/conflict-matrix";
import type { FounderDecision, FounderMeeting, FounderMission } from "@/server/founder-layer/contracts";

function seat(
  agent: FounderDecision["sourceAgent"],
  judgement: string,
  stance: FounderDecision["stance"],
  opts?: Partial<FounderDecision>,
): FounderDecision {
  return {
    decisionId: `d-${agent}`,
    sourceAgent: agent,
    question: "是否扩张",
    judgement,
    confidence: 0.75,
    evidence: [
      { evidenceId: `E-${agent}-1`, label: "a", content: `${agent}事实1` },
      { evidenceId: `E-${agent}-2`, label: "b", content: `${agent}事实2` },
      { evidenceId: `E-${agent}-3`, label: "c", content: `${agent}事实3` },
    ],
    risks: opts?.risks ?? ["风险"],
    nextSteps: opts?.nextSteps ?? ["验证"],
    stance,
    evidenceSufficient: opts?.evidenceSufficient ?? true,
    evidenceGap: opts?.evidenceGap,
    ...opts,
  };
}

describe("Decision Contract V2", () => {
  it("missionType 映射到 DecisionIntent", () => {
    expect(missionTypeToIntent("expansion_review")).toBe("EXPAND");
    expect(missionTypeToIntent("market_entry")).toBe("ENTER_MARKET");
    expect(missionTypeToIntent("positioning_review")).toBe("POSITION_BRAND");
  });

  it("证据不足时 Gate 输出 VALIDATION_REQUIRED", () => {
    const seats = [
      seat("M-MKT", "窗口打开应扩张", "support"),
      seat("M-BIZ", "模型未就绪", "oppose", {
        evidenceSufficient: false,
        evidenceGap: ["单店回本未验证"],
      }),
      seat("M-PNT", "定位可支撑", "conditional"),
      seat("M-ED", "控制权尚可", "conditional"),
    ];
    const gate = runDecisionGate({
      intent: "EXPAND",
      seatDecisions: seats,
      tensions: [
        {
          topic: "扩张速度",
          supporters: ["M-MKT"],
          opponents: ["M-BIZ"],
          criticalEvidence: ["E-M-MKT-1"],
        },
      ],
      evidenceStatus: "insufficient",
    });
    expect(gate.status).toBe("VALIDATION_REQUIRED");
    expect(gate.ready).toBe(false);
  });

  it("组装企业行动协议：Claim + Committee + Validation", () => {
    const seats = [
      seat("M-MKT", "市场窗口已打开，应加快扩张", "support", {
        nextSteps: ["90天验证5店复制"],
      }),
      seat("M-PNT", "定位清晰但加盟会稀释", "conditional"),
      seat("M-BIZ", "先验证直营复制再扩张", "conditional", {
        risks: ["现金流承压"],
      }),
      seat("M-ED", "控制权边界需锁定", "conditional"),
    ];
    const matrix = buildConflictMatrix({ missionId: "m1", decisions: seats });
    const mission: FounderMission = {
      missionId: "m1",
      requestId: "r1",
      mission: "是否扩张到100家",
      missionType: "expansion_review",
      objective: "扩张评审",
      question: "是否扩张到100家",
      requiredAgents: ["M-MKT", "M-PNT", "M-BIZ", "M-ED"],
      meetingType: "expansion_meeting",
      confidence: 0.7,
      createdAt: new Date().toISOString(),
    };
    const meeting: FounderMeeting = {
      meetingId: "mtg1",
      missionId: "m1",
      topic: "是否扩张到100家",
      experts: ["M-MKT", "M-PNT", "M-BIZ", "M-ED"],
      rounds: [],
      conflicts: [],
      conflictMatrix: matrix,
      recommendation: "带条件推进：先验证直营复制",
      createdAt: new Date().toISOString(),
    };

    const contract = assembleFounderDecisionContract({
      projectId: "proj-1",
      mission,
      meeting,
      seatDecisions: seats,
      chosen: "带条件推进",
      evidenceStatus: "sufficient",
      evidenceIds: seats.flatMap((s) => s.evidence.map((e) => e.evidenceId!)),
    });

    expect(contract.intent).toBe("EXPAND");
    expect(contract.claims.length).toBe(4);
    expect(contract.committeeViews.length).toBe(4);
    expect(contract.decision.length).toBeGreaterThan(0);
    expect(contract.validationPlan.metrics.length).toBeGreaterThan(0);
    expect(contract.validationPlan.period).toBe("90days");
    expect(contract.claimRefs.length).toBe(4);
    expect(["READY_FOR_APPROVAL", "VALIDATION_REQUIRED"]).toContain(contract.status);
  });
});
