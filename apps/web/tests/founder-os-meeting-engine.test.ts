import { describe, expect, it } from "vitest";
import {
  buildConflictMap,
  buildDecisionBoard,
  buildStanceMatrix,
  classifyDecisionIssue,
  closeCouncilMeeting,
  conveneCouncilMeeting,
  describeMeetingPlan,
  extractMinorityReport,
  prepareRound1,
  prepareRound2,
  renderStanceMatrixText,
  runCouncilMeetingSync,
  submitRound1Opinions,
} from "../../../packages/agents/src/founder-os";
import type { CouncilOpinion, EvidencePacket, ExpertReport } from "../../../packages/agents/src/founder-os";

describe("议题识别 Engine", () => {
  it("加盟 → STRATEGY L3 + BIZ/ED/PNT", () => {
    const issue = classifyDecisionIssue({ question: "我要不要加盟？" });
    expect(issue.type).toBe("STRATEGY");
    expect(issue.importance).toBe("L3");
    expect(issue.relatedAgents).toEqual(["M-BIZ", "M-ED", "M-PNT"]);
    expect(issue.suggestedRoster).toHaveLength(7);
  });

  it("菜单涨价 → L1 两席", () => {
    const issue = classifyDecisionIssue({ question: "菜单要不要涨价？" });
    expect(issue.importance).toBe("L1");
    expect(issue.suggestedRoster.length).toBeLessThanOrEqual(2);
    expect(issue.suggestedRoster.length).toBeGreaterThanOrEqual(1);
  });

  it("300万开第二家店 → L2 经营决策", () => {
    const issue = classifyDecisionIssue({
      question: "我现在有300万，要不要开第二家店？",
    });
    expect(issue.importance).toBe("L2");
    expect(issue.suggestedRoster.length).toBeGreaterThanOrEqual(3);
    expect(issue.suggestedRoster.length).toBeLessThanOrEqual(5);
  });
});

describe("会议引擎：真正开会", () => {
  const evidence: EvidencePacket = {
    caseId: "D-meet",
    items: [
      {
        evidenceId: "E-MKT-002",
        sourceAgent: "M-MKT",
        claim: "目标用户存在",
        strength: "medium",
      },
      {
        evidenceId: "E-BIZ-001",
        sourceAgent: "M-BIZ",
        claim: "单店模型毛利不足",
        strength: "strong",
      },
    ],
  };

  const experts: ExpertReport[] = [
    {
      engineId: "M-MKT",
      caseId: "D-meet",
      headline: "用户存在",
      sections: [{ id: "d", title: "需求", content: "有目标客群" }],
    },
    {
      engineId: "M-BIZ",
      caseId: "D-meet",
      headline: "模型不足",
      sections: [{ id: "u", title: "单位经济", content: "单店模型不足" }],
    },
  ];

  function mkOpinions(): CouncilOpinion[] {
    return [
      {
        member: "CSO",
        position: "support",
        confidence: 70,
        summary: "建议进入",
        judgment: "建议进入",
        evidence_used: ["E-MKT-002"],
        top_risk: "竞争加剧",
        proposal: "聚焦进入",
        needs_validation: "市场份额",
        reasoning: [],
        risks: ["竞争加剧"],
        conditions: [],
        veto: false,
      },
      {
        member: "CMO",
        position: "support",
        confidence: 65,
        summary: "需求存在",
        judgment: "需求存在",
        evidence_used: ["E-MKT-002"],
        reasoning: [],
        risks: [],
        conditions: [],
        veto: false,
      },
      {
        member: "CBO",
        position: "support",
        confidence: 60,
        summary: "品牌可差异",
        judgment: "品牌可差异",
        evidence_used: [],
        reasoning: [],
        risks: [],
        conditions: [],
        veto: false,
      },
      {
        member: "BMO",
        position: "oppose",
        confidence: 80,
        summary: "暂缓",
        judgment: "暂缓",
        evidence_used: ["E-BIZ-001"],
        top_risk: "现金流压力",
        proposal: "先修单店模型",
        needs_validation: "单店回本",
        reasoning: [],
        risks: ["现金流压力"],
        conditions: ["先验证单位经济"],
        veto: false,
        challenge_to_others: [
          "反对市场常委：E-MKT-002 只证明用户存在，没有证明支付意愿",
        ],
      },
      {
        member: "CFO",
        position: "oppose",
        confidence: 85,
        summary: "现金风险",
        judgment: "现金承压",
        evidence_used: ["E-BIZ-001"],
        reasoning: [],
        risks: ["现金"],
        conditions: ["投资不超过300万"],
        veto: true,
        veto_reason: "现金安全不足",
      },
      {
        member: "COO",
        position: "oppose",
        confidence: 70,
        summary: "复制未就绪",
        judgment: "复制未就绪",
        reasoning: [],
        risks: ["走样"],
        conditions: [],
        veto: false,
      },
    ];
  }

  it("Round1 产生独立观点矩阵", () => {
    let session = conveneCouncilMeeting({
      topic: "我现在有300万，要不要开第二家店？",
      caseId: "D-meet",
    });
    session = prepareRound1(session, experts, evidence);
    expect(session.round1Prompts.BMO).toContain("禁止查看或引用其他常委观点");
    expect(session.phase).toBe("round1_prompts_ready");

    session = submitRound1Opinions(session, mkOpinions());
    expect(session.phase).toBe("round1_matrix_ready");
    expect(session.stanceMatrix?.support).toContain("CSO");
    expect(session.stanceMatrix?.oppose).toContain("BMO");
    expect(renderStanceMatrixText(session.stanceMatrix!)).toContain("CSO");
  });

  it("Round2 冲突图挂 Evidence ID；Round3 决议板+少数意见", () => {
    let session = conveneCouncilMeeting({
      topic: "我现在有300万，要不要开第二家店？",
      caseId: "D-meet",
    });
    session = prepareRound1(session, experts, evidence);
    session = prepareRound2(session, mkOpinions());
    expect(session.conflicts.length).toBeGreaterThan(0);
    expect(
      session.conflicts.some(
        (c) =>
          c.evidenceA.includes("E-BIZ-001") ||
          c.evidenceB.includes("E-MKT-002") ||
          c.challenge.includes("Evidence"),
      ),
    ).toBe(true);

    session = closeCouncilMeeting(session, mkOpinions(), {
      founderConfirmed: true,
    });
    expect(session.board?.title).toContain("第二家店");
    expect(session.board?.founderChoices).toContain("接受委员会");
    expect(session.minorityReport.length).toBeGreaterThan(0);
    expect(session.minorityReport.some((m) => m.includes("CFO") || m.includes("BMO"))).toBe(
      true,
    );
    expect(session.brief?.resolution.minority_report.length).toBeGreaterThan(0);
    expect(session.calibrationHints.some((h) => h.member === "CFO")).toBe(true);
    expect(session.phase).toBe("closed");
    expect(describeMeetingPlan(session)).toContain("Board:");
  });

  it("buildDecisionBoard / Conflict / Minority 纯函数", () => {
    const ops = mkOpinions();
    const matrix = buildStanceMatrix(ops);
    expect(matrix.support.length).toBe(3);
    const conflicts = buildConflictMap(ops, ["[BMO→CBO] test"], evidence);
    expect(conflicts[0]?.challenge).toContain("Evidence");
    const minority = extractMinorityReport(ops);
    expect(minority.some((m) => m.includes("红线"))).toBe(true);

    const board = buildDecisionBoard({
      title: "进入上海市场",
      opinions: ops,
      resolution: {
        recommended_action: "暂缓",
        weighted_result: { support_score: 1, oppose_score: 2, conditional_score: 0 },
        majority_view: ["品牌有差异化"],
        minority_report: minority,
        required_conditions: ["首店模型必须验证", "投资不超过300万"],
        execution_bet: {
          validation_cycle: "测试3个月",
          kill_metric: "日均客流",
        },
      },
      conflicts,
      minorityReport: minority,
    });
    expect(board.recommendedAction).toBe("暂缓");
    expect(board.conditions).toContain("投资不超过300万");
    expect(board.validation[0]?.metric).toContain("客流");
  });

  it("同步开会：进入上海 → L3 全委会", () => {
    const session = runCouncilMeetingSync({
      topic: "是否进入上海市场",
      expertReports: experts,
      evidencePacket: evidence,
      opinions: [
        ...mkOpinions(),
        {
          member: "CRO",
          position: "conditional",
          confidence: 60,
          summary: "风险可控",
          judgment: "可试点",
          reasoning: [],
          risks: [],
          conditions: [],
          veto: false,
        },
      ],
      founderConfirmed: true,
    });
    expect(session.issue.importance).toBe("L3");
    expect(session.roster).toHaveLength(7);
    expect(session.memory?.memoryId).toMatch(/^DM-/);
  });
});
