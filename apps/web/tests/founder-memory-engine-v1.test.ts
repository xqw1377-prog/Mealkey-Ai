import { describe, expect, it } from "vitest";
import {
  applyMemoryPriorsToDecisions,
  buildFounderMemoryWrites,
  buildLearningMemoryWrite,
  buildPreferenceMemoryWrite,
  emptyMemorySnapshot,
  formatMemoryPriorBlock,
} from "@/server/founder-layer/memory";
import type {
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
  FounderMemorySnapshot,
  FounderMission,
} from "@/server/founder-layer/contracts";

function mission(): FounderMission {
  return {
    missionId: "m1",
    requestId: "r1",
    mission: "是否扩张",
    missionType: "expansion_review",
    objective: "评估扩张",
    question: "是否快速扩张？",
    requiredAgents: ["M-MKT", "M-PNT", "M-BIZ", "M-ED"],
    meetingType: "expansion_meeting",
    confidence: 0.7,
    createdAt: new Date().toISOString(),
  };
}

function decision(agent: FounderDecision["sourceAgent"]): FounderDecision {
  return {
    decisionId: `d-${agent}`,
    sourceAgent: agent,
    question: "是否扩张",
    judgement: `${agent} 判断`,
    confidence: 0.7,
    evidence: [{ label: "依据", content: "事实A" }],
    risks: ["风险A"],
    nextSteps: ["下一步A"],
    stance: "conditional",
  };
}

describe("Memory Engine V1", () => {
  it("formatMemoryPriorBlock 汇总偏好/决策/模式/事实", () => {
    const snapshot: FounderMemorySnapshot = {
      facts: [{ label: "城市", value: "长沙" }],
      decisions: [{ summary: "先验证直营复制" }],
      preferences: [{ label: "创始人关注", value: "稳健盈利", confidence: 0.9 }],
      patterns: [
        {
          patternId: "p1",
          kind: "failure",
          summary: "扩张前未完成供应链能力建设",
        },
      ],
      priorBlock: "",
    };
    const block = formatMemoryPriorBlock(snapshot);
    expect(block).toContain("稳健盈利");
    expect(block).toContain("直营复制");
    expect(block).toContain("供应链");
    expect(block).toContain("长沙");
  });

  it("applyMemoryPriorsToDecisions 注入证据、风险与偏好对齐，并可校准立场", () => {
    const memory: FounderMemorySnapshot = {
      ...emptyMemorySnapshot(),
      preferences: [{ label: "创始人关注", value: "品牌长期价值" }],
      patterns: [
        { patternId: "f1", kind: "failure", summary: "加盟稀释品牌" },
        { patternId: "s1", kind: "success", summary: "谨慎扩张有效" },
      ],
      priorBlock: "",
    };
    memory.priorBlock = formatMemoryPriorBlock(memory);

    const next = applyMemoryPriorsToDecisions({
      decisions: [
        decision("M-BIZ"),
        {
          ...decision("M-MKT"),
          judgement: "马上开放加盟快速扩张",
          stance: "support",
          confidence: 0.9,
        },
      ],
      memory,
    });
    expect(next[0]!.evidence.some((e) => e.label.includes("记忆"))).toBe(true);
    expect(next[0]!.evidence.some((e) => e.label.includes("成功"))).toBe(true);
    expect(next[0]!.risks.some((r) => r.includes("历史教训"))).toBe(true);
    expect(next[0]!.nextSteps[0]).toContain("品牌长期价值");
    expect(next[1]!.stance).toBe("conditional");
  });

  it("buildFounderMemoryWrites 含企业事实与会议决策", () => {
    const meeting: FounderMeeting = {
      meetingId: "mtg1",
      missionId: "m1",
      topic: "扩张评审",
      experts: ["M-MKT", "M-BIZ"],
      rounds: [],
      conflicts: [],
      recommendation: "先验证再扩张",
      createdAt: new Date().toISOString(),
    };
    const finalDecision: FounderFinalDecision = {
      finalDecisionId: "fd1",
      missionId: "m1",
      chosen: "带条件推进",
      problem: "是否扩张",
      options: [
        {
          label: "带条件推进",
          summary: "先完成一轮验证再扩张",
          supportedBy: ["M-MKT", "M-BIZ"],
        },
      ],
      reason: ["市场有窗口", "模型未验证"],
      validationPlan: ["90天5店复制"],
      status: "proposed",
      createdAt: new Date().toISOString(),
    };

    const writes = buildFounderMemoryWrites({
      projectId: "proj-1",
      mission: mission(),
      decisions: [decision("M-MKT"), decision("M-BIZ")],
      meeting,
      finalDecision,
      companyContext: {
        companyId: "proj-1",
        basicInfo: {
          name: "测试湘菜",
          industry: "餐饮",
          city: "长沙",
          stage: "扩张前",
        },
        goals: ["稳健增长"],
      },
      focusPreference: "稳健盈利",
    });

    expect(writes.some((w) => w.type === "fact" && w.source === "company_context")).toBe(
      true,
    );
    expect(writes.some((w) => w.type === "meeting")).toBe(true);
    expect(writes.some((w) => w.type === "decision")).toBe(true);
    expect(writes.some((w) => w.type === "preference")).toBe(true);
  });

  it("preference / learning 写对象形状正确", () => {
    const pref = buildPreferenceMemoryWrite({
      projectId: "p1",
      label: "创始人关注",
      value: "快速增长",
    });
    expect(pref.type).toBe("preference");
    expect(pref.payload.value).toBe("快速增长");

    const learn = buildLearningMemoryWrite({
      projectId: "p1",
      decisionId: "d1",
      summary: "扩张前必须完成供应链能力建设",
      impact: "invalidated",
      committee: "business",
      resultEvidenceId: "E-VAL-1",
    });
    expect(learn.type).toBe("learning");
    expect(learn.source).toBe("validation_os");
  });
});
