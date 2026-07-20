import { describe, expect, it } from "vitest";
import {
  buildChallengeStatements,
  buildConflictMatrix,
} from "@/server/founder-layer/meeting/conflict-matrix";
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
    question: "是否扩张",
    judgement,
    confidence: 0.7,
    evidence: [
      {
        evidenceId: `E-${agent}-1`,
        label: "依据1",
        content: `${agent}核心事实`,
      },
      {
        evidenceId: `E-${agent}-2`,
        label: "依据2",
        content: `${agent}补充事实`,
      },
      {
        evidenceId: `E-${agent}-3`,
        label: "依据3",
        content: `${agent}风险边界`,
      },
    ],
    risks: extras?.risks ?? ["需验证"],
    nextSteps: extras?.nextSteps ?? ["先验证"],
    stance,
    ...extras,
  };
}

describe("Debate Engine · Conflict Matrix", () => {
  it("扩张议题上生成市场 vs 商业冲突矩阵", () => {
    const decisions = [
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
      }),
      decision("M-ED", "控制权尚可，但融资节奏需谨慎", "conditional", {
        risks: ["稀释风险"],
        nextSteps: ["锁控制权边界"],
      }),
    ];

    const matrix = buildConflictMatrix({
      missionId: "mission-1",
      decisions,
    });

    expect(matrix.rows.length).toBeGreaterThan(0);
    expect(matrix.primary).toBeTruthy();
    expect(matrix.primary?.topic).toBeTruthy();
    expect(matrix.primary?.sideA.agents.length).toBeGreaterThan(0);
    expect(matrix.primary?.sideB.agents.length).toBeGreaterThan(0);
    expect(matrix.tradeoffs.length).toBeGreaterThan(0);

    const challenges = buildChallengeStatements({ decisions, matrix });
    expect(challenges).toHaveLength(4);
    expect(challenges.every((c) => Boolean(c.challengeTo))).toBe(true);
    expect(
      challenges.some(
        (c) =>
          Boolean(c.challengeEvidenceId) ||
          c.reasons.some((r) => /E-|缺口|证据/.test(r)),
      ),
    ).toBe(true);
  });
});
