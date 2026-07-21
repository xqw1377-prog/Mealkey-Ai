import { describe, expect, it } from "vitest";
import {
  calibrateOpinionConfidenceByEvidenceWeight,
  collectWorldChangesFromProfile,
  enrichCouncilEvidencePacket,
  worldChangesToEvidenceItems,
} from "@/server/founder-layer/council/council-world-evidence";
import {
  isDecisionQualityQuestion,
  pickFocusCandidate,
  computePromoteScore,
} from "@/server/founder-layer/capability/decision-intelligence/candidate-promote";
import type { DecisionCandidateV1 } from "@/server/founder-layer/contracts/decision-candidate";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";

describe("council-world-evidence", () => {
  it("世界变化进入证据包并保留决策题", () => {
    const items = worldChangesToEvidenceItems(
      [
        {
          id: "wc1",
          kind: "competition",
          title: "周边竞品加套餐",
          detail: "南门店对面新店推出晚餐套餐",
          decisionTopic: "要不要跟进晚餐套餐？",
        },
      ],
      "DR-test",
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.claim).toContain("周边竞品");
    expect(items[0]!.refs?.[0]).toContain("套餐");
  });

  it("从 profile.dailyScan 收集世界变化", () => {
    const changes = collectWorldChangesFromProfile({
      dailyScan: {
        worldChanges: [
          {
            id: "a",
            kind: "alert",
            title: "市场策略待签字",
            detail: "已确认尚未签字",
            decisionTopic: "是否完成市场决策签字？",
          },
        ],
      },
    });
    expect(changes).toHaveLength(1);
    expect(changes[0]!.id).toBe("a");
  });

  it("enrich 合并世界变化 + Brain未知缺口 + 领域强度", () => {
    const packet = enrichCouncilEvidencePacket({
      caseId: "DR-x",
      base: {
        caseId: "DR-x",
        items: [
          {
            evidenceId: "E-1",
            claim: "已有一手事实",
            strength: "strong",
          },
        ],
      },
      worldChanges: [
        {
          id: "wc_gap",
          kind: "customer",
          title: "商业咨询：证据强度不足",
          detail: "硬证不足",
          decisionTopic: "是否先补齐商业关键证据再开会？",
        },
      ],
      brain: {
        facts: [{ id: "f1", claim: "定位：轻松湖南聚餐", confidence: 0.8 }],
        knownUnknowns: [{ question: "第二店长是否可独立？" }],
      },
      domainStrengths: [
        {
          agentId: "m-biz",
          overall: 42,
          grade: "D",
          readyForCouncil: false,
          gaps: ["缺单店模型硬证"],
          summary: "商业强度不足",
        },
      ],
    });
    expect(packet.items.some((i) => i.evidenceId.startsWith("WC-"))).toBe(true);
    expect(packet.items.some((i) => i.evidenceId.startsWith("BR-"))).toBe(true);
    expect(packet.items.some((i) => i.evidenceId === "E-1")).toBe(true);
    expect(packet.gaps?.some((g) => /Brain未知/.test(g))).toBe(true);
    expect(packet.gaps?.some((g) => /m-biz/.test(g))).toBe(true);
  });

  it("有证据引用时校准置信度", () => {
    const up = calibrateOpinionConfidenceByEvidenceWeight({
      confidence: 0.7,
      evidenceUsedIds: ["E-strong"],
      packet: {
        caseId: "c",
        items: [
          { evidenceId: "E-strong", claim: "硬证", strength: "strong" },
        ],
      },
    });
    const down = calibrateOpinionConfidenceByEvidenceWeight({
      confidence: 0.7,
      evidenceUsedIds: ["E-weak"],
      packet: {
        caseId: "c",
        items: [{ evidenceId: "E-weak", claim: "弱证", strength: "weak" }],
      },
    });
    expect(up).toBeGreaterThan(down);
  });
});

describe("今日决策 Focus 题质", () => {
  it("识别可拍板决策题", () => {
    expect(isDecisionQualityQuestion("要不要跟进晚餐套餐？")).toBe(true);
    expect(isDecisionQualityQuestion("看看生意")).toBe(false);
  });

  it("优先选决策题质更高的 Focus", () => {
    const vague: DecisionCandidateV1 = {
      candidateId: "c1",
      projectId: "p",
      signalIds: ["s1"],
      question: "看看生意怎么样",
      title: "观察",
      whyNow: "无",
      impactStars: 3,
      urgencyStars: 3,
      horizonFit: null,
      promoteScore: 80,
      readiness: {
        stars: 3,
        score: 70,
        state: "ready",
        stateLabel: "可开会",
        known: [],
        missing: [],
        canClaimExternalIntel: false,
        suggestionLine: "进入决策会议室",
      },
      recommendedAction: "进入决策会议室完成判断",
      status: "open",
      createdAt: new Date().toISOString(),
    };
    const sharp: DecisionCandidateV1 = {
      ...vague,
      candidateId: "c2",
      question: "是否先补齐商业关键证据再开会？",
      title: "商业证据",
      promoteScore: 78,
    };
    const picked = pickFocusCandidate([vague, sharp]);
    expect(picked?.candidateId).toBe("c2");
  });

  it("SYSTEM 席位带决策题抬升 promoteScore", () => {
    const base: DecisionSignalV1 = {
      id: "s",
      signalId: "s",
      projectId: "p",
      source: "SYSTEM",
      type: "CHANGE",
      title: "市场策略待签字",
      description: "已确认",
      importance: 0.55,
      urgency: "low",
      evidenceIds: ["wc_seat"],
      suggestedQuestion: "是否按建议完成市场决策签字与落地？",
      observedAt: new Date().toISOString(),
      status: "open",
    };
    const withQ = computePromoteScore(base, { projectId: "p" });
    const vague = computePromoteScore(
      {
        ...base,
        suggestedQuestion: "看看",
        evidenceIds: [],
      },
      { projectId: "p" },
    );
    expect(withQ).toBeGreaterThan(vague);
  });
});
