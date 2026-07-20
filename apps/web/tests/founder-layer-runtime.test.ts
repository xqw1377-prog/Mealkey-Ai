import { describe, expect, it } from "vitest";
import { runFounderLoop } from "@/server/founder-layer";
import {
  applyMemoryPriorsToDecisions,
  emptyMemorySnapshot,
  formatMemoryPriorBlock,
} from "@/server/founder-layer/memory";
import type { FounderDecision, FounderMemorySnapshot } from "@/server/founder-layer/contracts";

/**
 * founder-layer 集成测试
 *
 * 默认强制 heuristic，避免外部 LLM / M-BIZ 导致超时。
 * 若要跑真实联调：HEURISTIC_ONLY=false npx vitest run tests/founder-layer-runtime.test.ts
 */
process.env.HEURISTIC_ONLY = process.env.HEURISTIC_ONLY ?? "true";

/**
 * 集成测试超时：降级路径应在数秒内完成。
 */
const RUNTIME_TIMEOUT = 30000;

describe("founder-layer runtime", () => {
  it("跑通 Mission → Adapters → Meeting → FinalDecision → MemoryWrites", async () => {
    const result = await runFounderLoop({
      request: {
        requestId: "req-test-1",
        projectId: "proj-test-1",
        userId: "user-test-1",
        message: "我们要不要扩张到 100 家店？",
        companyContext: {
          companyId: "proj-test-1",
          basicInfo: {
            name: "测试品牌",
            industry: "湘菜快餐",
            city: "长沙",
            stage: "成长期",
          },
          brand: {
            name: "测试品牌",
            positioning: "年轻人的快湘菜",
            users: "年轻白领",
          },
          business: {
            scale: "8 家店",
          },
          goals: ["一年开到 100 家"],
        },
        createdAt: new Date().toISOString(),
      },
    });

    expect(result.mission.missionType).toBe("expansion_review");
    expect(result.mission.requiredAgents).toEqual(["M-MKT", "M-PNT", "M-BIZ", "M-ED"]);
    expect(result.decisions.length).toBe(4);
    expect(result.meeting.rounds).toHaveLength(3);
    expect(result.finalDecision.chosen.length).toBeGreaterThan(0);
    expect(result.memoryWrites.length).toBeGreaterThanOrEqual(2);
    expect(result.memoryWrites.some((item) => item.type === "decision")).toBe(true);
    expect(result.memoryWrites.some((item) => item.type === "meeting")).toBe(true);
  }, RUNTIME_TIMEOUT);

  it("飞轮冒烟：Debate 点名证据 + What-If + Decision Memo + 终局对齐提案", async () => {
    const result = await runFounderLoop({
      request: {
        requestId: "req-flywheel-1",
        projectId: "proj-flywheel-1",
        userId: "user-flywheel-1",
        message: "马上开放加盟，90天开到20家可以吗？",
        companyContext: {
          companyId: "proj-flywheel-1",
          basicInfo: {
            name: "飞轮湘菜",
            industry: "湘菜",
            city: "长沙",
            stage: "扩张前",
          },
          brand: {
            name: "飞轮湘菜",
            positioning: "长沙宴请湘菜",
            users: "商务宴请",
          },
          business: { scale: "3 家直营" },
          goals: ["快速开店"],
        },
        createdAt: new Date().toISOString(),
      },
    });

    const debate = result.meeting.debateSession;
    expect(debate).toBeTruthy();
    expect(debate!.rounds).toHaveLength(3);
    expect(debate!.challenges.length).toBeGreaterThan(0);
    expect(
      debate!.challenges.every(
        (ch) =>
          Boolean(ch.targetEvidenceId) &&
          ch.statement.includes(ch.targetEvidenceId!),
      ),
    ).toBe(true);
    expect(debate!.scenarioTests.length).toBeGreaterThanOrEqual(2);
    expect(debate!.proposal?.decision).toBeTruthy();
    expect(result.meeting.recommendation).toBeTruthy();

    expect(result.evidencePack.nodes.length).toBeGreaterThanOrEqual(4);
    expect(result.finalDecision.contract?.memo?.stopLine).toBeTruthy();
    expect(result.finalDecision.contract?.memo?.killCriteria).toBeTruthy();
    // 终局应落在约束档，而不是无条件继续
    expect(["带条件推进", "暂缓推进"]).toContain(result.finalDecision.chosen);
  }, RUNTIME_TIMEOUT);

  it("记忆先验可把激进 support 降为 conditional", () => {
    const memory: FounderMemorySnapshot = {
      ...emptyMemorySnapshot(),
      patterns: [
        { patternId: "f1", kind: "failure", summary: "加盟稀释品牌导致复制失败" },
      ],
      priorBlock: "",
    };
    memory.priorBlock = formatMemoryPriorBlock(memory);

    const aggressive: FounderDecision = {
      decisionId: "d-mkt",
      sourceAgent: "M-MKT",
      question: "是否开放加盟",
      judgement: "马上开放加盟，抓住窗口快速扩张",
      confidence: 0.88,
      evidence: [{ label: "窗口", content: "需求上升" }],
      risks: [],
      nextSteps: ["招商"],
      stance: "support",
    };

    const next = applyMemoryPriorsToDecisions({
      decisions: [aggressive],
      memory,
    });
    expect(next[0]!.stance).toBe("conditional");
    expect(next[0]!.confidence).toBeLessThanOrEqual(0.62);
    expect(next[0]!.metadata?.memoryStanceAdjusted).toBe(true);
  });

  it("定位问题只召集品牌与市场席", async () => {
    const result = await runFounderLoop({
      request: {
        requestId: "req-test-2",
        projectId: "proj-test-2",
        userId: "user-test-2",
        message: "我们的品牌定位应该怎么做？",
        companyContext: {
          companyId: "proj-test-2",
          basicInfo: {
            name: "测试品牌",
            industry: "咖啡",
            city: "上海",
            stage: "起步期",
          },
          goals: ["先把定位说清"],
        },
        createdAt: new Date().toISOString(),
      },
    });

    expect(result.mission.missionType).toBe("positioning_review");
    expect(result.mission.requiredAgents).toEqual(["M-PNT", "M-MKT"]);
    expect(result.decisions.map((item) => item.sourceAgent).sort()).toEqual(["M-MKT", "M-PNT"]);
  }, RUNTIME_TIMEOUT);
});
