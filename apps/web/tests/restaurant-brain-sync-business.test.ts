/**
 * M-BIZ / M-MKT intake → Brain 经营/市场事实
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as prismaService from "@/server/restaurant-brain/prisma-service";
import {
  parseAvgTicket,
  parseStoreCount,
  parseUnitEconomics,
  syncBusinessFactsToRestaurantBrain,
  syncMarketFactsToRestaurantBrain,
} from "@/server/restaurant-brain/sync-business-facts";

describe("parseUnitEconomics / parseAvgTicket", () => {
  it("解析月流水与毛利率", () => {
    expect(parseUnitEconomics("月流水 40 万，毛利约 55%")).toEqual({
      monthlyRevenue: 400000,
      grossMargin: 0.55,
    });
    expect(parseAvgTicket("人均 78")).toBe(78);
    expect(parseStoreCount("直营 1 家")).toBe(1);
  });

  it("解析净利率", () => {
    expect(parseUnitEconomics("营收 30万 净利率 8%").netMargin).toBe(0.08);
  });
});

describe("syncBusinessFactsToRestaurantBrain", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("写入 BusinessProfile 并提议 grossMargin DNA", async () => {
    const businessUpdate = vi.fn().mockResolvedValue({});
    const profileUpdate = vi.fn().mockResolvedValue({});
    const restaurantUpdate = vi.fn().mockResolvedValue({});
    const recordEvent = vi.fn().mockResolvedValue(undefined);
    const proposeAndMaybeMergeDna = vi
      .fn()
      .mockResolvedValue({ accepted: true, completenessOverall: 60 });

    vi.spyOn(prismaService, "createRestaurantBrainService").mockReturnValue({
      ensureByProject: vi.fn().mockResolvedValue({
        restaurant: { id: "r1" },
      }),
      recordEvent,
      proposeAndMaybeMergeDna,
    } as never);

    const result = await syncBusinessFactsToRestaurantBrain(
      {
        businessProfile: { update: businessUpdate },
        restaurantProfile: { update: profileUpdate },
        restaurant: { update: restaurantUpdate },
      } as never,
      {
        projectId: "p1",
        ownerId: "o1",
        source: "consulting",
        confidence: 0.7,
        avgTicket: "人均 78",
        unitEconomics: "月流水 40 万，毛利约 55%",
        storeCount: "直营 1 家",
        businessModel: "单店验证优先利润",
        brandName: "味本源",
      },
    );

    expect(result.restaurantId).toBe("r1");
    expect(result.wrote).toEqual(
      expect.arrayContaining([
        "averageTicket",
        "monthlyRevenue",
        "grossMargin",
        "storeCount",
        "businessModel",
        "name",
      ]),
    );
    expect(result.dnaAccepted).toBe(true);
    expect(businessUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          averageTicket: 78,
          monthlyRevenue: 400000,
          grossMargin: 0.55,
        }),
      }),
    );
    expect(proposeAndMaybeMergeDna).toHaveBeenCalledWith(
      expect.objectContaining({
        layer: "business",
        key: "grossMargin",
        value: 0.55,
      }),
    );
    expect(recordEvent).toHaveBeenCalled();
  });
});

describe("syncMarketFactsToRestaurantBrain", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("写入城市/品类并提议 brandRisk", async () => {
    const profileUpdate = vi.fn().mockResolvedValue({});
    const proposeAndMaybeMergeDna = vi
      .fn()
      .mockResolvedValue({ accepted: true, completenessOverall: 55 });

    vi.spyOn(prismaService, "createRestaurantBrainService").mockReturnValue({
      ensureByProject: vi.fn().mockResolvedValue({
        restaurant: { id: "r2" },
      }),
      proposeAndMaybeMergeDna,
    } as never);

    const result = await syncMarketFactsToRestaurantBrain(
      { restaurantProfile: { update: profileUpdate } } as never,
      {
        projectId: "p2",
        ownerId: "o2",
        source: "consulting",
        confidence: 0.7,
        city: "成都",
        category: "鲜椒烤鱼",
        ticketBand: "80-100",
        targetCustomer: "白领聚会",
        brandRisk: "预算不足 90 天必须见效",
      },
    );

    expect(result.wrote).toEqual(
      expect.arrayContaining(["city", "category", "priceRange", "brandRisk"]),
    );
    expect(proposeAndMaybeMergeDna).toHaveBeenCalled();
    expect(profileUpdate).toHaveBeenCalled();
  });
});
