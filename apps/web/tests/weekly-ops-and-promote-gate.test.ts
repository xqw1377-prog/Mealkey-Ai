import { describe, expect, it } from "vitest";
import {
  parseWeeklyOpsCsv,
  weeklyOpsToInternalFacts,
  weeklyOpsToWorldHint,
} from "@/server/founder-layer/capability/ops-metrics/weekly-upload";
import { canPromoteDecisionSignal } from "@/server/founder-layer/capability/decision-intelligence/candidate-promote";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";

describe("weekly ops upload", () => {
  it("解析 CSV 并生成 internalFacts / worldHint", () => {
    const parsed = parseWeeklyOpsCsv(
      "日期,营业额,客流,客单\n2026-07-14,82000,710,115",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.metrics.revenue).toBe(82000);
    expect(parsed.metrics.avgTicket).toBe(115);
    const facts = weeklyOpsToInternalFacts(parsed.metrics);
    expect(facts.length).toBeGreaterThanOrEqual(1);
    expect(weeklyOpsToWorldHint(parsed.metrics)?.kind).toBe("operation");
  });

  it("缺列时报错", () => {
    const parsed = parseWeeklyOpsCsv("名字,年龄\n张三,18");
    expect(parsed.ok).toBe(false);
  });
});

describe("Promote Gate 单轨（DecisionSignal）", () => {
  const base: DecisionSignalV1 = {
    id: "s1",
    signalId: "s1",
    projectId: "p1",
    source: "SYSTEM",
    type: "RISK",
    title: "服务风险",
    description: "过去7天等待相关评价明显增加，需要判断",
    importance: 0.8,
    urgency: "high",
    evidenceIds: ["e1"],
    suggestedQuestion: "是否调整晚市服务流程？",
    observedAt: new Date().toISOString(),
    status: "open",
  };

  it("证据+问题+高严重度可升格", () => {
    expect(canPromoteDecisionSignal(base).ok).toBe(true);
  });

  it("无证据不可升格", () => {
    const thin = {
      ...base,
      evidenceIds: [],
      description: "短",
    };
    expect(canPromoteDecisionSignal(thin).ok).toBe(false);
  });
});
