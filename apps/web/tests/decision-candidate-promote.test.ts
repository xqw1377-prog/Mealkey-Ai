import { describe, expect, it } from "vitest";
import {
  buildCandidatesFromSignals,
  computePromoteScore,
  pickFocusCandidate,
  PROMOTE_SCORE_THRESHOLD,
} from "@/server/founder-layer/capability/decision-intelligence/candidate-promote";
import { collectDecisionSignals } from "@/server/founder-layer/capability/decision-intelligence/signal-engine";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";

function baseSignal(
  partial: Partial<DecisionSignalV1> & Pick<DecisionSignalV1, "id" | "title">,
): DecisionSignalV1 {
  return {
    signalId: partial.id,
    projectId: "p1",
    source: "BRAIN",
    type: "RISK",
    description: partial.description || partial.title,
    importance: 0.5,
    urgency: "low",
    evidenceIds: [],
    suggestedQuestion: "是否处理？",
    observedAt: "2026-07-18T00:00:00.000Z",
    status: "open",
    ...partial,
  };
}

describe("Signal → Candidate promote", () => {
  it("低重要度信号 promoteScore < 阈值，不进焦点", () => {
    const s = baseSignal({
      id: "sig_low",
      title: "轻微波动",
      importance: 0.3,
      urgency: "low",
      type: "CHANGE",
    });
    const score = computePromoteScore(s, {
      projectId: "p1",
      dataCompleteness: 40,
      decisionHorizon: "short",
      blockingRisk: false,
    });
    expect(score).toBeLessThan(PROMOTE_SCORE_THRESHOLD);
    const focus = pickFocusCandidate(
      buildCandidatesFromSignals([s], {
        projectId: "p1",
        dataCompleteness: 40,
        decisionHorizon: "short",
      }),
    );
    expect(focus).toBeNull();
  });

  it("阻断高风险 + Horizon 对齐 → 升格", () => {
    const s = baseSignal({
      id: "sig_hi",
      title: "人效侵蚀利润",
      description: "南门店人效下降影响利润",
      importance: 0.85,
      urgency: "high",
      type: "RISK",
      suggestedQuestion: "是否调整排班与套餐？",
    });
    const score = computePromoteScore(s, {
      projectId: "p1",
      dataCompleteness: 40,
      decisionHorizon: "short",
      blockingRisk: true,
    });
    expect(score).toBeGreaterThanOrEqual(PROMOTE_SCORE_THRESHOLD);
  });

  it("用户扩店困扰 + mid Horizon → 黄金路径焦点", () => {
    const signals = collectDecisionSignals({
      projectId: "p1",
      restaurantName: "南门小馆",
      brandName: "最湘宴",
      city: "长沙",
      focusProblem: "要不要开第二家店",
      decisionHorizon: "mid",
    });
    expect(signals.some((s) => /第二家/.test(s.suggestedQuestion))).toBe(true);
    const candidates = buildCandidatesFromSignals(signals, {
      projectId: "p1",
      dataCompleteness: 35,
      decisionHorizon: "mid",
      brandOk: true,
      geoOk: true,
    });
    const focus = pickFocusCandidate(candidates);
    expect(focus).not.toBeNull();
    expect(focus!.question).toContain("第二家");
    expect(focus!.caseId).toBeUndefined(); // 未升格落库
  });

  it("完整度极低时扣分，弱信号不进焦点", () => {
    const s = baseSignal({
      id: "sig_mid",
      title: "机会苗头",
      type: "OPPORTUNITY",
      source: "OPPORTUNITY_RUNTIME",
      importance: 0.55,
      urgency: "medium",
    });
    const score = computePromoteScore(s, {
      projectId: "p1",
      dataCompleteness: 5,
      decisionHorizon: "long",
      blockingRisk: false,
    });
    expect(score).toBeLessThan(PROMOTE_SCORE_THRESHOLD);
  });
});
