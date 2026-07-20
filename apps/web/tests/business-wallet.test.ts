/**
 * 经营点账本 V1 — 目录与换算单测
 */
import { describe, expect, it } from "vitest";
import {
  POINTS_PER_RUN,
  RECHARGE_PACKS,
  SPEND_OFFERS,
  buildRecentSpend,
  buildWalletView,
  humanizeWalletError,
  isWalletPaywallError,
  pointsFromSnapshot,
} from "@/lib/business-wallet";

function marketedPointsForPlanCode(planCode: string, creditCents?: number | null) {
  const pack = RECHARGE_PACKS.find((p) => p.planCode === planCode || p.code === planCode);
  if (pack) return pack.points;
  if (creditCents && creditCents > 0) return Math.round((creditCents / 100) * 100);
  return 0;
}

describe("business-wallet catalog", () => {
  it("has three recharge packs with marketing points", () => {
    expect(RECHARGE_PACKS.map((p) => p.points)).toEqual([10000, 60000, 300000]);
  });

  it("maps spend offers to frozen costs", () => {
    expect(SPEND_OFFERS.brand.cost).toBe(800);
    expect(SPEND_OFFERS.business.cost).toBe(1200);
    expect(SPEND_OFFERS.council.cost).toBe(5000);
    expect(SPEND_OFFERS.growth.cost).toBe(3000);
  });

  it("prefers businessPoints from ledger over hybrid conversion", () => {
    expect(
      pointsFromSnapshot({
        businessPoints: 12580,
        remainingRuns: 100,
        balanceCents: 9900,
      }),
    ).toBe(12580);
  });

  it("falls back to hybrid conversion", () => {
    expect(
      pointsFromSnapshot({
        remainingRuns: 10,
        balanceCents: 5000,
      }),
    ).toBe(10 * POINTS_PER_RUN + 50 * 100);
  });

  it("builds wallet view from API wallet payload", () => {
    const view = buildWalletView(
      { remainingRuns: 0 },
      { businessPoints: 8000, monthAnalyses: 2, hoursSaved: 6 },
    );
    expect(view.balance).toBe(8000);
    expect(view.monthAnalyses).toBe(2);
    expect(view.estimateConsult).toBe(Math.floor(8000 / 800));
  });

  it("maps plan codes to marketed points", () => {
    expect(marketedPointsForPlanCode("points_explore")).toBe(10000);
    expect(marketedPointsForPlanCode("points_startup")).toBe(60000);
    expect(marketedPointsForPlanCode("credit_50", 5000)).toBe(5000);
  });

  it("识别经营点不足并引导充值文案", () => {
    expect(isWalletPaywallError("当前经营点不足，请先充值")).toBe(true);
    expect(humanizeWalletError("PAYMENT_REQUIRED", 5000, 100)).toContain("经营点不足");
    expect(isWalletPaywallError("引擎未就绪")).toBe(false);
  });

  it("builds recent spend from new wallet ledger types", () => {
    const recent = buildRecentSpend(null, [
      {
        id: "refund_1",
        entryType: "REFUND",
        amount: "800",
        description: "失败退回",
        sourceId: "c_1",
        createdAt: new Date(),
      },
      {
        id: "reserve_1",
        entryType: "RESERVE",
        amount: "-1200",
        description: "消耗 1200 经营点 · 商业模式诊断",
        sourceId: "c_2",
        createdAt: new Date(),
      },
    ]);

    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      id: "reserve_1",
      title: "商业模式诊断",
      points: 1200,
    });
  });
});
