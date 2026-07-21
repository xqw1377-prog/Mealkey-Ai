import { describe, expect, it } from "vitest";
import {
  collectD7ReviewItems,
  computeD7ReviewDueAt,
} from "@/server/founder-layer/capability/decision-center/d7-review";
import { extractRestaurantContextForSignals } from "@/server/founder-layer/capability/decision-center/restaurant-context-for-signals";
import { buildDecisionBriefFromWorldChange } from "@/lib/decision-brief-from-scan";
import { buildBusinessRadar } from "@/server/founder-layer/capability/decision-center/build-business-radar";

describe("MVP 闭环落地", () => {
  it("D+7：到期任务进入复盘清单", () => {
    const dueAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const items = collectD7ReviewItems({
      projectId: "p1",
      profile: {
        validationTasks: [
          {
            decisionId: "dec_1",
            title: "调整晚市出餐",
            hypothesis: { statement: "缩短等待能抬升复购" },
            d7ReviewDueAt: dueAt,
            d7ReviewStatus: "pending",
            lifecycle: "RUNNING",
          },
        ],
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toMatch(/第7天复盘/);
    expect(items[0]!.href).toContain("decision-room");
    expect(items[0]!.questions).toHaveLength(3);
  });

  it("D+7：未到期不出现", () => {
    const items = collectD7ReviewItems({
      projectId: "p1",
      profile: {
        validationTasks: [
          {
            decisionId: "dec_2",
            title: "新套餐",
            d7ReviewDueAt: computeD7ReviewDueAt(),
            d7ReviewStatus: "pending",
          },
        ],
      },
    });
    expect(items).toHaveLength(0);
  });

  it("D+7：Prisma Decision outcome 也可到期", () => {
    const dueAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const items = collectD7ReviewItems({
      projectId: "p1",
      profile: {},
      decisions: [
        {
          id: "dec_prisma",
          judgement: "缩短晚市出餐",
          outcome: JSON.stringify({
            mkStatus: "EXECUTING",
            d7ReviewDueAt: dueAt,
            d7ReviewStatus: "pending",
          }),
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.decisionId).toBe("dec_prisma");
  });

  it("restaurantContext 从 Identity 投影", () => {
    const ctx = extractRestaurantContextForSignals({
      restaurantName: "南门小馆",
      brandName: "南门小馆",
      profile: {
        businessIdentity: {
          brandName: "南门小馆",
          category: "湘菜",
          positioning: "炭火聚餐",
          peakDaypart: "晚市",
        },
      },
    });
    expect(ctx.peakDaypart).toBe("晚市");
    expect(ctx.dnaHints?.some((h) => /湘菜|炭火/.test(h))).toBe(true);
  });

  it("Brief 携带 evidenceSummary", () => {
    const brief = buildDecisionBriefFromWorldChange({
      title: "服务风险",
      detail: "等待评价增多",
      evidenceClaims: ["过去7天42条评价", "38%提到等待"],
      judgment: "服务在限制增长",
      suggestion: "检查晚市出餐",
    });
    expect(brief.evidenceSummary).toHaveLength(2);
    expect(brief.whyNow).toMatch(/证据/);
  });

  it("雷达空态诚实说明 + todayOneThing", () => {
    const empty = buildBusinessRadar({
      projectId: "p1",
      worldChanges: [],
      externalIntelReady: true,
    });
    expect(empty.emptyIntelNote).toMatch(/不编造|暂未发现/);
    expect(empty.todayOneThing).toBeNull();

    const withSignal = buildBusinessRadar({
      projectId: "p1",
      restaurantContext: { peakDaypart: "晚市", dnaHints: ["湘菜"] },
      worldChanges: [
        {
          id: "1",
          kind: "alert",
          title: "服务体验风险上升",
          detail: "过去7天服务慢相关评价增加",
        },
      ],
    });
    expect(withSignal.primary).toBeTruthy();
    expect(withSignal.todayOneThing?.action).toBeTruthy();
    expect(withSignal.primary!.judgment).toMatch(/晚市|翻台|服务/);
  });
});
