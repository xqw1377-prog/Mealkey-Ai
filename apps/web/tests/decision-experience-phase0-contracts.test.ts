import { describe, expect, it } from "vitest";
import {
  CASE_STATUS_TO_MK,
  PROFILE_IDENTITY_KEY,
  PROMOTE_SCORE_THRESHOLD,
  buildDecisionReadiness,
  shouldPromoteCandidate,
  toLegacyDieSignalShape,
  toScopeType,
  type DecisionCandidateV1,
  type DecisionSignalV1,
} from "@/server/founder-layer/contracts/decision-experience-v1";

describe("Experience Phase 0 contracts", () => {
  it("Case.status ↔ mkStatus 映射完整", () => {
    expect(CASE_STATUS_TO_MK.DELIBERATING).toBe("COUNCIL_REVIEW");
    expect(CASE_STATUS_TO_MK.DECIDED).toBe("APPROVED");
    expect(CASE_STATUS_TO_MK.EXECUTING).toBe("EXECUTING");
  });

  it("Identity profile 键冻结", () => {
    expect(PROFILE_IDENTITY_KEY).toBe("businessIdentity");
    expect(toScopeType("store")).toBe("STORE");
    expect(toScopeType("multi_brand")).toBe("COMPANY");
  });

  it("Signal 可降级为旧 DIE 瘦形状", () => {
    const s: DecisionSignalV1 = {
      id: "sig_1",
      signalId: "sig_1",
      projectId: "p1",
      source: "BRAIN",
      type: "RISK",
      title: "南门店晚餐客流连降",
      description: "连续4周下降且竞品加套餐，或影响30天利润",
      importance: 0.8,
      urgency: "high",
      evidenceIds: [],
      suggestedQuestion: "是否调整晚餐产品策略？",
      observedAt: new Date().toISOString(),
      status: "open",
    };
    const legacy = toLegacyDieSignalShape(s);
    expect(legacy.signal).toBe(s.title);
    expect(legacy.suggestedQuestion).toContain("晚餐");
  });

  it("Candidate 升格阈值", () => {
    const base: DecisionCandidateV1 = {
      candidateId: "cand_1",
      projectId: "p1",
      signalIds: ["sig_1"],
      question: "是否开第二家店？",
      title: "第二家店",
      whyNow: "单店增长见顶信号",
      impactStars: 5,
      urgencyStars: 4,
      horizonFit: "mid",
      promoteScore: PROMOTE_SCORE_THRESHOLD,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    expect(shouldPromoteCandidate(base)).toBe(true);
    expect(shouldPromoteCandidate({ ...base, promoteScore: 40 })).toBe(false);
  });

  it("Readiness 状态优先", () => {
    const r = buildDecisionReadiness({
      score: 48,
      known: ["品牌"],
      missing: ["店长独立能力"],
      canClaimExternalIntel: true,
    });
    expect(r.state).toBe("need_context");
    expect(r.stateLabel.length).toBeGreaterThan(0);
  });
});
