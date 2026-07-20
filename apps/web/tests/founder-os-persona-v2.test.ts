import { describe, expect, it } from "vitest";
import {
  buildCouncilRuntimePrompt,
  conveneCouncilMeeting,
  describeMeetingPlan,
  getPersonaV2,
  prepareRound1,
  prepareRound2,
  closeCouncilMeeting,
  runCouncilMeetingSync,
  suggestCasePacket,
  COUNCIL_SPEECH_FORMAT,
  NATURAL_BIAS,
} from "../../../packages/agents/src/founder-os";
import type { CouncilOpinion, ExpertReport } from "../../../packages/agents/src/founder-os";

describe("人格模型 V2.0 认知协议", () => {
  it("含世界观 / 判断模型 / 问题库 / 学习方式 / 天然倾向", () => {
    const cso = getPersonaV2("CSO");
    expect(cso.world_view).toContain("错误方向");
    expect(cso.decision_model.name).toContain("Strategy Triangle");
    expect(cso.question_bank[0]?.question).toContain("三个玩家");
    expect(cso.memory_pattern.length).toBeGreaterThan(0);
    expect(cso.natural_bias).toBe("看未来");
    expect(NATURAL_BIAS.CRO).toBe("看最坏情况");
  });

  it("商业席是 BMO 且问单位经济", () => {
    const bmo = getPersonaV2("BMO");
    expect(bmo.world_view).toContain("赚钱结构");
    expect(bmo.question_bank.some((q) => q.question.includes("赚多少钱"))).toBe(
      true,
    );
  });

  it("Prompt 冻结发言格式并禁止我觉得", () => {
    const prompt = buildCouncilRuntimePrompt({
      roleId: "CMO",
      casePacket: suggestCasePacket({
        caseId: "D-1",
        question: "是否进入上海市场",
      }),
      round: 1,
    });
    expect(prompt).toContain("World View");
    expect(prompt).toContain("Question Bank");
    expect(prompt).toContain("我觉得");
    expect(prompt).toContain("needs_validation");
    expect(COUNCIL_SPEECH_FORMAT.blocks).toHaveLength(5);
  });
});

describe("会议引擎 V1", () => {
  const experts: ExpertReport[] = [
    {
      engineId: "M-BIZ",
      caseId: "D-2",
      headline: "单店模型承压",
      sections: [{ id: "ue", title: "单位经济", content: "租金压力大" }],
    },
  ];

  function opinions(): CouncilOpinion[] {
    return (["CSO", "CMO", "CBO", "BMO", "CFO", "COO"] as const).map((m) => ({
      member: m,
      position: m === "CFO" || m === "BMO" ? "oppose" : "conditional",
      confidence: 70,
      summary: `${m} 意见`,
      judgment: `${m} 一句话判断`,
      top_risk: "现金或复制失败",
      proposal: "先单店验证",
      needs_validation: "12周回本曲线",
      evidence_used: ["E1"],
      reasoning: [],
      risks: ["现金"],
      conditions: ["直营1店"],
      veto: m === "CFO",
      veto_reason: m === "CFO" ? "现金安全不足" : undefined,
    }));
  }

  it("开第二家店：召集 L2 经营委会", () => {
    const session = conveneCouncilMeeting({ topic: "我要不要开第二家店？" });
    expect(session.agenda.level).toBe("L2");
    expect(session.roster.length).toBeGreaterThanOrEqual(3);
    expect(session.roster.length).toBeLessThanOrEqual(5);
    expect(session.phase).toBe("awaiting_experts");
    expect(describeMeetingPlan(session)).toContain("看赚钱");
  });

  it("三轮编排：Prompt → 质询 → Memory", () => {
    let session = conveneCouncilMeeting({
      topic: "我要不要开第二家店？",
      caseId: "D-2",
    });
    session = prepareRound1(session, experts);
    expect(session.phase).toBe("round1_prompts_ready");
    expect(session.round1Prompts.BMO).toContain("Persona V2.0");
    expect(session.round1Prompts.BMO).toContain("赚多少钱");

    session = prepareRound2(session, opinions());
    expect(session.phase).toBe("round2_challenges_ready");
    expect(session.challenges.some((c) => c.includes("BMO→CBO"))).toBe(true);
    expect(session.round2Prompts.CFO).toContain("Challenge Packet");

    session = closeCouncilMeeting(session, opinions(), {
      founderConfirmed: true,
    });
    expect(session.phase).toBe("closed");
    expect(session.brief?.resolution.recommended_action).toBe("暂缓");
    expect(session.memory?.memoryId).toMatch(/^DM-/);
  });

  it("同步捷径可落盘", () => {
    const session = runCouncilMeetingSync({
      topic: "是否进入上海市场",
      expertReports: experts,
      opinions: [
        ...opinions(),
        {
          member: "CRO",
          position: "conditional",
          confidence: 60,
          summary: "风险可控若慢进",
          judgment: "可试点",
          reasoning: [],
          risks: [],
          conditions: [],
          veto: false,
        },
      ],
      founderConfirmed: true,
    });
    expect(session.agenda.level).toBe("L3");
    expect(session.memory?.decision).toBeTruthy();
  });
});
