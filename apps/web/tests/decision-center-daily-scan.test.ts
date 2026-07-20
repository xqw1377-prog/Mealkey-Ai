import { describe, expect, it } from "vitest";
import { toDailyScanV1 } from "@/server/founder-layer/capability/decision-center/daily-scan";

const baseOpts = {
  projectId: "proj_1",
  restaurantName: "南门小馆",
  understandingScore: 42,
  dataCompleteness: 35,
};

describe("toDailyScanV1", () => {
  it("阻断风险走 council，机会暂缓", () => {
    const scan = toDailyScanV1(
      {
        ownerName: "王老板",
        openRiskAlert: {
          id: "risk_1",
          type: "revenue",
          level: "high",
          title: "晚餐订单下滑",
          description: "近 14 天晚餐订单下降 21%",
          suggestedTopic: "是否调整晚餐套餐？",
          suggestExpert: null,
          suggestCouncil: true,
        },
        openOpportunity: {
          id: "opp_1",
          title: "午市团购放量",
          score: 78,
          status: "open",
          suggestedTopic: "是否加大午市投放？",
          suggestExpert: null,
        },
        riskBlocksOpportunity: true,
      },
      baseOpts,
    );

    expect(scan.primaryCard?.kind).toBe("risk");
    expect(scan.primaryCard?.entryMode).toBe("council");
    expect(scan.primaryCard?.href).toContain("/decision-room?topic=");
    expect(scan.secondaryCards[0]?.deferred).toBe(true);
    expect(scan.primaryCta.reason).toBe("redeision");
    expect(scan.diagnosis.restaurantName).toBe("南门小馆");
    expect(scan.diagnosis.understandingScore).toBe(42);
  });

  it("待拍板时 entryMode=resume，主 CTA 去拍板", () => {
    const scan = toDailyScanV1(
      {
        ownerName: "李老板",
        pendingCouncilAdjudication: {
          topic: "是否开第二家店？",
          recommendedAction: "先验证单店利润",
          statusLabel: "待拍板",
          href: "/projects/proj_1/decision-room?resume=1",
          insightCount: 7,
          supportCount: 4,
          opposeCount: 1,
          observeCount: 2,
        },
        openRiskAlert: {
          id: "risk_2",
          type: "expansion",
          level: "medium",
          title: "扩店冲动",
          description: "现金流未验证",
          suggestedTopic: "是否开第二家店？",
          suggestExpert: null,
          suggestCouncil: true,
        },
      },
      baseOpts,
    );

    expect(scan.primaryCard?.entryMode).toBe("resume");
    // 扩店议题收口决策会议室（Experience），不再强制 resume 旧 room
    expect(scan.primaryCard?.href).toContain("/decision-case");
    expect(scan.primaryCard?.councilPreview?.oneLineAdvice).toContain("验证");
    expect(scan.primaryCard?.councilPreview?.supportCount).toBe(4);
    expect(scan.primaryCard?.councilPreview?.observeCount).toBe(2);
    expect(scan.primaryCta).toMatchObject({
      label: "去拍板",
      reason: "council",
    });
    expect(scan.todayFocus.kind).toBe("decide");
  });

  it("待拍板预览不用 insightCount 估算支持票", () => {
    const scan = toDailyScanV1(
      {
        ownerName: "周老板",
        pendingCouncilAdjudication: {
          topic: "是否涨价？",
          recommendedAction: "先测客单价",
          statusLabel: "待拍板",
          href: "/projects/proj_1/decision-room?resume=1",
          insightCount: 10,
          // 故意不传票数 → 应为 0，而非 10*0.6
        },
        openRiskAlert: {
          id: "risk_3",
          type: "revenue",
          level: "high",
          title: "毛利承压",
          description: "食材成本上升",
          suggestedTopic: "是否涨价？",
          suggestExpert: null,
          suggestCouncil: true,
        },
      },
      baseOpts,
    );
    expect(scan.primaryCard?.councilPreview?.supportCount).toBe(0);
    expect(scan.primaryCard?.councilPreview?.observeCount).toBe(0);
  });

  it("普通机会走 research → 决策室（不进顾问咨询）", () => {
    const scan = toDailyScanV1(
      {
        ownerName: "赵老板",
        openOpportunity: {
          id: "opp_2",
          title: "私域复购活动",
          score: 70,
          status: "open",
          suggestedTopic: "是否做老客复购活动？",
          suggestExpert: null,
        },
      },
      baseOpts,
    );

    expect(scan.primaryCard?.kind).toBe("opportunity");
    expect(scan.primaryCard?.entryMode).toBe("research");
    expect(scan.primaryCard?.href).toContain("/decision-room?topic=");
    expect(scan.primaryCta.reason).toBe("open_card");
    expect(scan.primaryCta.label).toBe("进入今日决策");
    expect(scan.todayFocus.title).toBeTruthy();
    expect(scan.identityHint).toBeDefined();
  });

  it("无信号时仍产出主卡与保守诊断，入口进决策室", () => {
    const scan = toDailyScanV1(
      {
        ownerName: "陈老板",
        currentProblemTitle: "客单价上不去",
        dailyDiagnosis: "菜单结构与客群错位",
        projectStatus: "认知校准期",
        homeMode: "forming",
      },
      { ...baseOpts, dataCompleteness: 8, understandingScore: 10 },
    );

    expect(scan.primaryCard).not.toBeNull();
    expect(scan.primaryCard?.href).toContain("/decision-room");
    expect(scan.diagnosis.primaryCause).toContain("菜单");
    expect(scan.diagnosis.evidenceChecks.some((e) => !e.available)).toBe(true);
    expect(scan.actions.length).toBeGreaterThan(0);
    expect(scan.actions.length).toBeLessThanOrEqual(3);
  });

  it("风险主卡优先于顾问草稿：CTA 进今日决策", () => {
    const scan = toDailyScanV1(
      {
        ownerName: "周老板",
        pendingMeetingDraft: {
          topic: "定位复盘",
          href: "/projects/proj_1/advisor?resume=draft",
        },
        openRiskAlert: {
          id: "risk_3",
          type: "brand",
          level: "low",
          title: "定位模糊",
          description: "话术不一致",
          suggestedTopic: "是否重做定位？",
          suggestExpert: null,
        },
      },
      baseOpts,
    );

    expect(scan.primaryCard?.kind).toBe("risk");
    expect(scan.primaryCta.reason).toBe("open_card");
    expect(scan.primaryCta.href).toContain("/decision-room");
    expect(scan.primaryCta.href).not.toContain("/advisor");
  });
});
