import { describe, expect, it } from "vitest";
import {
  inferMMktCategoryCity,
} from "@/server/services/m-mkt-client";
import {
  buildDefaultEquityPayload,
  inferMEdAction,
} from "@/server/services/m-ed-client";
import { normalizeBizIndustry } from "@/server/services/m-biz-client";
import { attachEvidenceToDecisions, createEvidenceRegistry } from "@/server/founder-layer/evidence";
import type { FounderDecision } from "@/server/founder-layer/contracts";
import { assembleFounderDecisionContract } from "@/server/founder-layer/decision/contract-v2";
import type { FounderMeeting, FounderMission } from "@/server/founder-layer/contracts";

describe("P0 Agent wiring helpers", () => {
  it("M-MKT 从问题推断品类与城市", () => {
    const hit = inferMMktCategoryCity({
      message: "长沙湘菜高端宴请值不值得进入",
      industry: "餐饮",
      city: "待补充",
    });
    expect(hit.category).toBe("湘菜");
    expect(hit.city).toBe("长沙");
  });

  it("M-ED 根据文案推断 action，并生成默认 payload", () => {
    expect(inferMEdAction("股权怎么分")).toBe("design_equity");
    expect(inferMEdAction("融资稀释模拟")).toBe("simulate");
    const payload = buildDefaultEquityPayload({
      projectName: "测试品牌",
      stage: "seed",
      message: "股权设计",
    });
    expect(payload.project_name).toBe("测试品牌");
    expect(Array.isArray(payload.team_members)).toBe(true);
  });

  it("M-BIZ 行业映射不再写死 retail", () => {
    expect(normalizeBizIndustry("湘菜餐饮")).toBe("food_service");
    expect(normalizeBizIndustry("SaaS")).toBe("technology");
  });

  it("证据不足时 support 降为 conditional", () => {
    const registry = createEvidenceRegistry("proj-1");
    const weak: FounderDecision = {
      decisionId: "d1",
      sourceAgent: "M-MKT",
      question: "是否进入",
      judgement: "应该进入",
      confidence: 0.9,
      evidence: [{ label: "弱依据", content: "感觉不错" }],
      risks: [],
      nextSteps: [],
      stance: "support",
    };
    const [next] = attachEvidenceToDecisions({
      registry,
      projectId: "proj-1",
      missionId: "m1",
      decisions: [weak],
    });
    expect(next!.stance).toBe("conditional");
    expect(next!.evidenceSufficient).toBe(false);
  });

  it("Decision Contract 产出董事会 Memo", () => {
    const mission: FounderMission = {
      missionId: "m1",
      requestId: "r1",
      mission: "扩张评审",
      missionType: "expansion_review",
      objective: "是否扩张",
      question: "是否快速扩张？",
      requiredAgents: ["M-MKT", "M-BIZ"],
      meetingType: "expansion_meeting",
      confidence: 0.7,
      createdAt: new Date().toISOString(),
    };
    const meeting: FounderMeeting = {
      meetingId: "mtg1",
      missionId: "m1",
      topic: "扩张",
      experts: ["M-MKT", "M-BIZ"],
      rounds: [],
      conflicts: [],
      recommendation: "先验证直营复制",
      createdAt: new Date().toISOString(),
    };
    const seats: FounderDecision[] = [
      {
        decisionId: "d-mkt",
        sourceAgent: "M-MKT",
        question: "是否扩张",
        judgement: "市场窗口存在",
        confidence: 0.8,
        evidence: [
          { evidenceId: "E1", label: "a", content: "需求增长" },
          { evidenceId: "E2", label: "b", content: "供给缺口" },
          { evidenceId: "E3", label: "c", content: "客单可支撑" },
        ],
        risks: ["窗口关闭"],
        nextSteps: ["区域测试"],
        stance: "support",
        evidenceSufficient: true,
      },
      {
        decisionId: "d-biz",
        sourceAgent: "M-BIZ",
        question: "是否扩张",
        judgement: "复制未完成",
        confidence: 0.7,
        evidence: [
          { evidenceId: "E4", label: "a", content: "回本未验证" },
          { evidenceId: "E5", label: "b", content: "人效不足" },
          { evidenceId: "E6", label: "c", content: "供应链弱" },
        ],
        risks: ["现金流承压"],
        nextSteps: ["先验证回本"],
        stance: "oppose",
        evidenceSufficient: true,
      },
    ];
    const contract = assembleFounderDecisionContract({
      projectId: "p1",
      mission,
      meeting,
      seatDecisions: seats,
      chosen: "带条件推进",
      evidenceIds: ["E1", "E2", "E3", "E4"],
    });
    expect(contract.memo.title).toContain("备忘录");
    expect(contract.memo.decision.length).toBeGreaterThan(4);
    expect(contract.memo.stopLine.length).toBeGreaterThan(4);
    expect(contract.memo.killCriteria.length).toBeGreaterThan(4);
  });
});
