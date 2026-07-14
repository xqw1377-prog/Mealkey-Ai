import { describe, expect, it } from "vitest";
import { runFounderLoop } from "@/server/founder-layer";

/**
 * founder-layer 集成测试
 *
 * 测试会调用真实的 LLM API（DeepSeek）和 M-BIZ HTTP 服务。
 * 当外部服务不可用时，测试会超时。
 *
 * 配置环境变量以跳过真实 API 调用：
 *   SKIP_EXTERNAL_API=true npx vitest run
 *
 * 或在 vitest.config.ts 中配置 testTimeout 为较大值。
 */

/**
 * 集成测试超时：M-BIZ 服务在没有外部服务时也会降级返回（不 hang），
 * M-PNT 在 heuristic 模式下也不依赖外部 API。
 * 30 秒足以覆盖降级路径和启发式执行。
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
