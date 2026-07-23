import { describe, expect, it } from "vitest";
import { runFounderLoop, projectStartMeetingPayload } from "@/server/founder-layer";

/**
 * 集成测试：M-BIZ 降级路径 + 启发式运行，30s 足够
 */
const PROJECTION_TIMEOUT = 30000;

describe("founder-layer projection", () => {
  it("把 runtime 投影成 startMeeting 载荷", async () => {
    const runtime = await runFounderLoop({
      request: {
        requestId: "req-proj-1",
        projectId: "proj-proj-1",
        userId: "user-proj-1",
        message: "我们要不要扩张到 100 家店？",
        companyContext: {
          companyId: "proj-proj-1",
          basicInfo: {
            name: "测试品牌",
            industry: "湘菜快餐",
            city: "长沙",
            stage: "成长期",
          },
          brand: {
            name: "测试品牌",
            positioning: "年轻人的快湘菜",
          },
          business: {
            scale: "8 家店",
          },
          goals: ["一年开到 100 家"],
        },
        createdAt: new Date().toISOString(),
      },
    });

    const payload = projectStartMeetingPayload({
      meetingId: "mtg_test_1",
      companyId: "proj-proj-1",
      companyContext: {
        brandName: "测试品牌",
        industry: "湘菜快餐",
        city: "长沙",
        stageLabel: "成长期",
        storeCount: "8 家店",
        yearlyGoal: "一年开到 100 家",
      },
      runtime,
      topic: "是否扩张到 100 家店",
    });

    expect(payload.opinions).toHaveLength(4);
    expect(payload.opinions.every((item) => item.seatLabel.length > 0)).toBe(true);
    expect(payload.mission.topic).toBe("是否扩张到 100 家店");
    expect(payload.synthesis.judgement.length).toBeGreaterThan(0);
    expect(payload.synthesis.validationPlan.length).toBeGreaterThan(0);
    expect(payload.forceAgents).toHaveLength(4);
    expect(payload.runtime.finalDecision.chosen.length).toBeGreaterThan(0);
  }, PROJECTION_TIMEOUT);
});
