import { describe, expect, it } from "vitest";
import {
  buildDebateSession,
  detectDebateConflicts,
  routeDebateChallenges,
  synthesizeDecisionProposal,
  buildScenarioTests,
} from "@/server/founder-layer/meeting/debate-engine";
import { buildConflictMatrix } from "@/server/founder-layer/meeting/conflict-matrix";
import { DEBATE_CHALLENGE_ROUTES } from "@/server/founder-layer/contracts/debate-session";
import type { FounderDecision } from "@/server/founder-layer/contracts";

function decision(
  agent: FounderDecision["sourceAgent"],
  judgement: string,
  stance: FounderDecision["stance"],
  extras?: Partial<FounderDecision>,
): FounderDecision {
  return {
    decisionId: `d-${agent}`,
    sourceAgent: agent,
    question: "是否快速扩张？",
    judgement,
    confidence: 0.75,
    evidence: [
      {
        evidenceId: `E${agent === "M-MKT" ? "001" : agent === "M-PNT" ? "002" : agent === "M-BIZ" ? "003" : "004"}`,
        label: "依据1",
        content: `核心事实`,
      },
      {
        evidenceId: `E${agent === "M-MKT" ? "011" : agent === "M-PNT" ? "012" : agent === "M-BIZ" ? "013" : "014"}`,
        label: "依据2",
        content: `补充事实`,
      },
      {
        evidenceId: `E${agent === "M-MKT" ? "021" : agent === "M-PNT" ? "022" : agent === "M-BIZ" ? "023" : "024"}`,
        label: "依据3",
        content: `风险边界`,
      },
    ],
    risks: extras?.risks ?? ["需验证"],
    nextSteps: extras?.nextSteps ?? ["先验证"],
    stance,
    ...extras,
  };
}

const SAMPLE = [
  decision("M-MKT", "市场窗口已打开，应加快扩张开店", "support", {
    risks: ["窗口关闭"],
    nextSteps: ["抓住窗口加速开店"],
  }),
  decision("M-PNT", "定位尚可，但加盟会稀释心智", "conditional", {
    risks: ["加盟稀释品牌"],
    nextSteps: ["先稳直营表达"],
  }),
  decision("M-BIZ", "复制模型未完成，不建议扩张与加盟", "oppose", {
    risks: ["标准化不足", "现金流承压"],
    nextSteps: ["先验证单店回本"],
    evidenceSufficient: false,
    evidenceGap: ["缺少区域单店模型验证"],
  }),
  decision("M-ED", "控制权尚可，但融资节奏需谨慎", "conditional", {
    risks: ["稀释风险"],
    nextSteps: ["锁控制权边界"],
  }),
];

describe("Debate Engine V1", () => {
  it("D1 Conflict Detector 发现立场与假设冲突", () => {
    const matrix = buildConflictMatrix({ missionId: "m1", decisions: SAMPLE });
    const conflicts = detectDebateConflicts({ decisions: SAMPLE, matrix });
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.some((c) => c.severity === "high" || c.severity === "medium")).toBe(true);
    expect(conflicts.every((c) => c.topic && c.summary)).toBe(true);
  });

  it("D2 Challenge Router 按专业关系路由，且含四类挑战", () => {
    const matrix = buildConflictMatrix({ missionId: "m1", decisions: SAMPLE });
    const conflicts = detectDebateConflicts({ decisions: SAMPLE, matrix });
    const challenges = routeDebateChallenges({
      decisions: SAMPLE,
      matrix,
      conflicts,
    });

    expect(challenges).toHaveLength(4);
    expect(DEBATE_CHALLENGE_ROUTES.market).toContain("business");
    expect(
      challenges.every((ch) =>
        DEBATE_CHALLENGE_ROUTES[ch.fromCommittee].includes(ch.targetCommittee),
      ),
    ).toBe(true);
    expect(
      challenges.every((ch) =>
        ["evidence", "logic", "assumption", "risk"].includes(ch.challengeType),
      ),
    ).toBe(true);
    expect(challenges.every((ch) => Boolean(ch.targetEvidenceId))).toBe(true);
    expect(
      challenges.every(
        (ch) => !ch.targetEvidenceId || ch.statement.includes(ch.targetEvidenceId),
      ),
    ).toBe(true);
    expect(challenges.every((ch) => !/M-MKT|M-PNT|M-BIZ|M-ED/.test(ch.statement))).toBe(
      true,
    );
  });

  it("D3 三轮 Runtime 产出 DebateSession", () => {
    const session = buildDebateSession({
      missionId: "m1",
      decisions: SAMPLE,
    });
    expect(session.rounds).toHaveLength(3);
    expect(session.rounds[0]?.kind).toBe("independent");
    expect(session.rounds[1]?.kind).toBe("challenge");
    expect(session.rounds[2]?.kind).toBe("synthesis");
    expect(session.challenges.length).toBeGreaterThan(0);
    expect(session.conflicts.length).toBeGreaterThan(0);
  });

  it("D4 Decision Proposal 解决冲突而非总结", () => {
    const matrix = buildConflictMatrix({ missionId: "m1", decisions: SAMPLE });
    const conflicts = detectDebateConflicts({ decisions: SAMPLE, matrix });
    const challenges = routeDebateChallenges({
      decisions: SAMPLE,
      matrix,
      conflicts,
    });
    const proposal = synthesizeDecisionProposal({
      decisions: SAMPLE,
      matrix,
      conflicts,
      challenges,
    });
    expect(proposal.decision).toMatch(/不开放加盟|直营|验证|条件/);
    expect(proposal.whyNow.length).toBeGreaterThan(8);
    expect(proposal.tradeoffs.length).toBeGreaterThan(0);
    expect(proposal.conditions.length).toBeGreaterThan(0);
    expect(proposal.validationPlan.length).toBeGreaterThan(0);

    const scenarios = buildScenarioTests({
      decisions: SAMPLE,
      proposal,
      matrix,
    });
    expect(scenarios.length).toBeGreaterThanOrEqual(2);
    expect(scenarios.every((s) => s.trigger && s.impact && s.mitigation)).toBe(true);
  });
});
