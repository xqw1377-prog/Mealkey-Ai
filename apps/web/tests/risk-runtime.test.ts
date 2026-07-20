import { describe, expect, it } from "vitest";
import {
  assertRiskEvidenceForLevel,
  buildRiskAlert,
  computeRiskScore,
  isRiskType,
  riskLevelFromScore,
} from "@/server/founder-layer/contracts/risk-runtime";
import {
  projectRisksFromDeviation,
  projectRisksFromValidation,
} from "@/server/founder-layer/capability/risk/detect";
import { detectStrategicForbiddenConflict } from "@/server/founder-layer/capability/risk/memory-conflict";
import { toDecisionRequestCta } from "@/server/founder-layer/capability/risk/decision-request";

describe("computeRiskScore", () => {
  it("P×I×E×100：开店失败示例 → 43.2 medium", () => {
    const score = computeRiskScore({
      probability: 0.6,
      impact: 0.9,
      exposure: 0.8,
    });
    expect(score).toBe(43.2);
    expect(riskLevelFromScore(score)).toBe("medium");
  });

  it("夹紧越界因子", () => {
    expect(
      computeRiskScore({ probability: 2, impact: -1, exposure: 0.5 }),
    ).toBe(0);
    expect(
      computeRiskScore({ probability: 1, impact: 1, exposure: 1 }),
    ).toBe(100);
  });
});

describe("riskLevelFromScore", () => {
  it("四级阈值", () => {
    expect(riskLevelFromScore(0)).toBe("low");
    expect(riskLevelFromScore(19.9)).toBe("low");
    expect(riskLevelFromScore(20)).toBe("medium");
    expect(riskLevelFromScore(50)).toBe("high");
    expect(riskLevelFromScore(80)).toBe("critical");
  });
});

describe("assertRiskEvidenceForLevel", () => {
  it("无证据不得 CRITICAL", () => {
    expect(assertRiskEvidenceForLevel("critical", [])).toBe("high");
    expect(assertRiskEvidenceForLevel("critical", ["现金流缺口"])).toBe(
      "critical",
    );
  });
});

describe("buildRiskAlert / 六域", () => {
  it("六大风险域均可构造", () => {
    const types = [
      "strategic",
      "market",
      "brand",
      "business",
      "financial",
      "execution",
    ] as const;
    for (const type of types) {
      expect(isRiskType(type)).toBe(true);
      const alert = buildRiskAlert({
        id: `risk_${type}`,
        ownerId: "owner_1",
        projectId: "proj_1",
        type,
        title: `${type} 风险`,
        description: "单测",
        evidence: ["证据A"],
        source: "rule",
        factors: { probability: 0.9, impact: 0.95, exposure: 0.95 },
      });
      expect(alert.type).toBe(type);
      expect(alert.score).toBeGreaterThan(70);
      expect(alert.level).toBe("critical");
      expect(alert.status).toBe("open");
    }
  });

  it("高分无证据降为 high", () => {
    const alert = buildRiskAlert({
      id: "risk_x",
      ownerId: "o",
      projectId: "p",
      type: "financial",
      title: "恐吓",
      description: "无证据",
      evidence: [],
      source: "rule",
      factors: { probability: 1, impact: 1, exposure: 1 },
    });
    expect(alert.score).toBe(100);
    expect(alert.level).toBe("high");
  });
});

describe("Risk R2/R3 projection", () => {
  it("验证证伪 → business Alert", () => {
    const alerts = projectRisksFromValidation({
      ownerId: "o",
      projectId: "p",
      result: "off",
      impact: "invalidated",
      summary: "客流未达假设",
      hypothesis: "加投放涨客流",
      committee: "market",
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("business");
    expect(alerts[0].suggestExpert).toBe("M-MKT");
  });

  it("Deviation medium+ → execution Alert", () => {
    const alerts = projectRisksFromDeviation({
      ownerId: "o",
      projectId: "p",
      report: {
        reportId: "dev_1",
        projectId: "p",
        decisionId: "clxyz0123456789",
        validationTaskId: "vt_1",
        kind: "metric_miss",
        severity: "high",
        summary: "指标未达",
        suggestedCouncilTopic: "复盘：指标未达",
        suggestCommittee: "business",
        createdAt: new Date().toISOString(),
      },
    });
    expect(alerts[0].type).toBe("execution");
    expect(toDecisionRequestCta(alerts[0]).topic).toMatch(/复盘|风险/);
  });

  it("Memory 禁区 → strategic", () => {
    const alert = detectStrategicForbiddenConflict({
      ownerId: "o",
      projectId: "p",
      draftTopic: "进高租金购物中心开店",
      snapshot: {
        facts: [],
        decisions: [],
        preferences: [],
        patterns: [
          {
            patternId: "p1",
            kind: "failure",
            summary: "不要进高租金购物中心——失败两次",
            createdAt: new Date().toISOString(),
          },
        ],
        priorBlock: "",
      },
    });
    expect(alert).not.toBeNull();
    expect(alert!.type).toBe("strategic");
    expect(["high", "critical", "medium"]).toContain(alert!.level);
  });
});
