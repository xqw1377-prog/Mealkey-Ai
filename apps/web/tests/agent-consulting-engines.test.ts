/**
 * 一枪引擎 → 六步资产投影冒烟
 */
import { describe, expect, it } from "vitest";
import {
  businessAnswersToResearch,
  equitySnapshotToAdvisors,
  equitySnapshotToResearch,
  marketSnapshotToAdvisors,
  marketSnapshotToResearch,
} from "@/server/services/agent-consulting-engines";
import type { EquitySnapshot } from "@/lib/equity";
import type { MarketSnapshot } from "@/lib/market";

describe("agent-consulting-engines mappers", () => {
  it("maps market snapshot to research + advisors", () => {
    const snap = {
      oneLiner: "长沙家常正餐有场景空位",
      problem: "进入判断",
      observation: "供给偏宽",
      diagnosis: "同质化",
      strategy: "场景切入",
      action: "试点",
      confidence: 0.8,
      pageOutput: {
        topic: "进入",
        city: "长沙",
        category: "湘菜",
        scores: {
          demand: 70,
          competition: 60,
          gap: 65,
          timing: 70,
          economics: 68,
          founderFit: 72,
          entryProbability: 70,
        },
        health: {
          biggestRisk: "切口过宽",
          judgement: "cautious" as const,
          rationale: "需小步验证",
        },
        marketStructure: {
          trendSummary: "场景心智稀缺",
          sceneSummary: "家庭聚餐",
        },
        competition: {
          headPlayers: ["连锁A"],
          densitySummary: "中密",
          homogenization: "高",
          biggestPressure: "低价",
        },
        gaps: [{ title: "场景", summary: "可证明供给少" }],
        opportunityCard: {
          opportunityId: "o1",
          city: "长沙",
          category: "湘菜",
          opportunity: "家庭安心聚餐",
          suggestedArea: "60-90㎡",
          suggestedPriceBand: "人均60-90",
        },
        entryStrategies: [
          {
            id: "s1",
            title: "结构性空位切入",
            summary: "先占场景",
            fit: "primary" as const,
            pros: ["心智清晰"],
            risks: ["流量偏窄"],
          },
          {
            id: "s2",
            title: "缩小模型后进入",
            summary: "控人效",
            fit: "secondary" as const,
            pros: ["可兑现"],
            risks: ["增长慢"],
          },
        ],
        finalDecision: {
          judgement: "谨慎进入",
          reasoning: ["先验证"],
          risks: ["烧钱"],
          actions: ["90天验证"],
        },
      },
    } satisfies MarketSnapshot;

    const research = marketSnapshotToResearch(snap);
    expect(research.headline).toContain("长沙");
    expect(research.sections.length).toBe(4);

    const advisors = marketSnapshotToAdvisors(snap, {
      constraint: "预算有限",
    });
    expect(advisors.strategies).toHaveLength(3);
    expect(advisors.strategies[0]!.advisorId).toBe("strategy");
  });

  it("maps equity snapshot committee to four advisors", () => {
    const snap = {
      oneLiner: "先锁控制权",
      stage: "融资前",
      problem: "股权",
      observation: "三人合伙",
      diagnosis: "协议空",
      strategy: "锁权再融资",
      action: "写协议",
      confidence: 0.75,
      pageOutput: {
        topic: "融资稀释",
        stage: "融资前",
        health: {
          score: 62,
          control: 58,
          fundingSafety: 55,
          incentiveRoom: 12,
          biggestRisk: "控制权松",
        },
        profile: {
          founders: [
            { name: "A", role: "CEO", equity: 60 },
            { name: "B", role: "COO", equity: 40 },
          ],
          capTable: [
            { label: "A", equity: 60 },
            { label: "B", equity: 40 },
          ],
          optionPool: 10,
        },
        scenarios: [
          {
            id: "sc1",
            title: "控制权优先方案",
            summary: "锁表决权",
            highlights: [],
            risks: [],
            recommendation: "primary" as const,
          },
        ],
        committee: [
          { role: "资本顾问", opinion: "融资换增长", concern: "稀释" },
          { role: "创始人视角", opinion: "必须能拍板", concern: "失控" },
          { role: "风险顾问", opinion: "协议要齐", concern: "争议" },
          { role: "治理顾问", opinion: "vesting 留人", concern: "走人" },
        ],
        finalDecision: {
          judgement: "先锁权",
          reasoning: [],
          risks: ["失控"],
          actions: ["写协议"],
        },
      },
    } satisfies EquitySnapshot;

    const research = equitySnapshotToResearch(snap);
    expect(research.headline).toBeTruthy();
    const advisors = equitySnapshotToAdvisors(snap);
    expect(advisors.strategies.map((s) => s.advisorId)).toEqual([
      "capital",
      "founder",
      "risk",
      "govern",
    ]);
    expect(advisors.strategies[0]!.oneLiner).toContain("融资");
  });

  it("builds biz research from consulting heuristic (not bare degraded)", () => {
    const { research, advisors } = businessAnswersToResearch(
      {
        stage: "验证期",
        pain: "复制不了",
        priority: "先利润",
        resource: "现金紧",
      },
      "商业模式怎么跑通",
    );
    expect(research.headline).toContain("验证期");
    expect(research.headline).not.toContain("暂不可用");
    expect(research.sections.some((s) => s.title === "主矛盾")).toBe(true);
    expect(advisors.strategies).toHaveLength(4);
    expect(advisors.conflictSummary).toContain("战略官押");
    expect(advisors.conflictSummary).toContain("运营官押");
  });

  it("war room has cross challenges and blend synthesizes", async () => {
    const { openGenericWarRoom, applyGenericVote } = await import(
      "../../../packages/agents/src/consulting-os/meeting"
    );
    const { advisors } = businessAnswersToResearch(
      {
        stage: "验证期",
        pain: "增长很贵",
        priority: "先增长",
        resource: "人手紧",
      },
      "怎么赚钱",
    );
    let room = openGenericWarRoom(advisors, "开会");
    const challenges = room.turns.filter((t) => t.kind === "challenge");
    expect(challenges.length).toBeGreaterThanOrEqual(3);
    expect(challenges[0]!.text).toContain("挑战");
    room = applyGenericVote(
      room,
      advisors,
      "blend",
      (id) => id,
      "主轴清晰可验证",
    );
    expect(room.status).toBe("agreed");
    expect(room.consensusOneLiner).toContain("主轴");
    expect(room.consensusBullets!.length).toBeGreaterThanOrEqual(2);
  });
});
