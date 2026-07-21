import { describe, expect, it } from "vitest";
import { buildBusinessRadar } from "@/server/founder-layer/capability/decision-center/build-business-radar";
import {
  rankBusinessSignals,
  runBusinessSignalEngine,
  worldChangeToBusinessSignal,
} from "@/server/founder-layer/capability/decision-center/business-signal-engine";
import { toDailyScanV1 } from "@/server/founder-layer/capability/decision-center/daily-scan";

describe("Business Signal Engine", () => {
  it("五类信号 + 证据链 + 排序进主焦点", () => {
    const service = worldChangeToBusinessSignal(
      {
        id: "1",
        kind: "alert",
        title: "服务体验风险上升",
        detail: "过去7天服务慢相关评价增加",
        decisionTopic: "是否今天检查晚市出餐？",
        href: "/x",
      },
      "p1",
    );
    expect(service.type).toBe("customer");
    expect(service.evidenceChain.length).toBeGreaterThanOrEqual(2);
    expect(
      service.evidenceChain.some(
        (s) => s.kind === "external_intel" || s.kind === "internal_fact",
      ),
    ).toBe(true);
    expect(service.scores.rankScore).toBeGreaterThan(800);

    const market = worldChangeToBusinessSignal(
      {
        id: "2",
        kind: "competition",
        title: "附近新增湘菜馆",
        detail: "3公里内新开2家，客单80-120",
      },
      "p1",
    );
    expect(market.type).toBe("market");

    const ranked = rankBusinessSignals([market, service]);
    expect(ranked[0]!.id).toBe(service.id);
  });

  it("runBusinessSignalEngine：1 primary + others", () => {
    const { primary, others } = runBusinessSignalEngine({
      projectId: "p1",
      worldChanges: [
        {
          id: "1",
          kind: "alert",
          title: "服务体验风险上升",
          detail: "等待时间差评增多",
        },
        {
          id: "2",
          kind: "competition",
          title: "附近新增湘菜馆",
          detail: "同价位",
        },
        {
          id: "3",
          kind: "customer",
          title: "用户认可增强",
          detail: "炭火关键词正向增长",
        },
      ],
    });
    expect(primary).toBeTruthy();
    expect(primary!.severity).toBe("decide");
    expect(others.length).toBeGreaterThanOrEqual(1);
    expect(others.every((o) => o.id !== primary!.id)).toBe(true);
  });
});

describe("今日经营雷达 · 经 Signal Engine", () => {
  it("雷达挂载 primary / 证据链 / 经营状态", () => {
    const radar = buildBusinessRadar({
      projectId: "p1",
      worldChanges: [
        {
          id: "1",
          kind: "alert",
          title: "服务体验风险上升",
          detail: "过去7天服务慢相关评价增加",
          decisionTopic: "是否今天检查晚市出餐？",
          href: "/projects/p1/decision-room?intake=ready&topic=x",
        },
        {
          id: "2",
          kind: "competition",
          title: "附近新增湘菜馆",
          detail: "3公里内新开2家，客单80-120",
        },
        {
          id: "3",
          kind: "customer",
          title: "用户认可增强",
          detail: "小锅现炒关键词正向增长28%",
        },
      ],
      diagnosis: {
        greetingName: "张总",
        restaurantName: "南门小馆",
        healthScore: 62,
        stageLabel: "经营推进期",
        primaryCause: "服务复制是瓶颈",
        impactLine: "",
        evidenceChecks: [],
        confidence: 0.6,
      },
    });

    expect(radar.primary).toBeTruthy();
    expect(radar.primary!.evidenceChain!.length).toBeGreaterThanOrEqual(2);
    expect(radar.primary!.judgment).toBeTruthy();
    expect(radar.summaryLine).toMatch(/观察你的生意/);
    expect(radar.others.length).toBeGreaterThanOrEqual(1);
    expect(radar.health.dims).toHaveLength(4);
  });

  it("无世界变化时用 Focus 兜底", () => {
    const radar = buildBusinessRadar({
      projectId: "p1",
      worldChanges: [],
      todayFocus: {
        kind: "decide",
        title: "要不要跟进晚餐套餐？",
        whyToday: "竞品已动",
        href: "/x",
        readinessStars: 3,
        known: [],
        missing: [],
      },
    });
    expect(radar.primary?.title).toMatch(/套餐/);
    expect(radar.changeCount).toBe(1);
  });

  it("toDailyScanV1 挂载 radar.primary", () => {
    const scan = toDailyScanV1(
      {
        ownerName: "张总",
        projectHealth: 60,
        openOpportunity: {
          id: "o1",
          title: "老客复购",
          score: 70,
          status: "open",
          suggestedTopic: "是否做老客复购活动？",
          suggestExpert: null,
        },
      },
      {
        projectId: "proj_1",
        restaurantName: "南门小馆",
        understandingScore: 40,
        dataCompleteness: 50,
      },
    );
    expect(scan.radar).toBeTruthy();
    expect(scan.radar!.headlineJudgment.length).toBeGreaterThan(4);
  });
});
