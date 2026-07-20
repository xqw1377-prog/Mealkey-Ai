/**
 * 定位/咨询结构化事实 → Brain DNA 同步
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as prismaService from "@/server/restaurant-brain/prisma-service";
import { syncBrandFactsToRestaurantBrain } from "@/server/restaurant-brain/sync-brand-facts";

describe("syncBrandFactsToRestaurantBrain", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("对 positioning / targetCustomer / differentiation 发起 DNA patch", async () => {
    const restaurantUpdate = vi.fn().mockResolvedValue({});
    const profileUpdate = vi.fn().mockResolvedValue({});
    const $transaction = vi.fn(async (ops: unknown[]) => ops);
    const proposeAndMaybeMergeDna = vi
      .fn()
      .mockResolvedValue({ accepted: true, completenessOverall: 50 });

    vi.spyOn(prismaService, "createRestaurantBrainService").mockReturnValue({
      ensureByProject: vi.fn().mockResolvedValue({
        restaurant: { id: "r1" },
      }),
      proposeAndMaybeMergeDna,
    } as never);

    const result = await syncBrandFactsToRestaurantBrain(
      {
        restaurant: { update: restaurantUpdate },
        restaurantProfile: { update: profileUpdate },
        $transaction,
      } as never,
      {
        projectId: "p1",
        ownerId: "o1",
        source: "decision",
        confidence: 0.72,
        brandName: "等里长沙",
        category: "湘菜",
        positioning: "年轻人的高性价比湘菜",
        targetCustomers: "25-35白领",
        priceRange: "60-100",
        differentiation: "现炒不隔夜",
      },
    );

    expect(result.restaurantId).toBe("r1");
    expect(result.patches).toBe(3);
    expect(result.accepted).toBe(3);
    expect(proposeAndMaybeMergeDna).toHaveBeenCalledTimes(3);
    expect(
      proposeAndMaybeMergeDna.mock.calls.map((c) => c[0].key).sort(),
    ).toEqual(["differentiation", "positioning", "targetCustomer"]);
    expect(profileUpdate).toHaveBeenCalled();
    expect(restaurantUpdate).toHaveBeenCalled();
  });

  it("空字段不发起 patch", async () => {
    const proposeAndMaybeMergeDna = vi.fn();
    vi.spyOn(prismaService, "createRestaurantBrainService").mockReturnValue({
      ensureByProject: vi.fn().mockResolvedValue({
        restaurant: { id: "r2" },
      }),
      proposeAndMaybeMergeDna,
    } as never);

    const result = await syncBrandFactsToRestaurantBrain(
      {
        restaurant: { update: vi.fn() },
        restaurantProfile: { update: vi.fn() },
        $transaction: vi.fn(async (ops: unknown[]) => ops),
      } as never,
      {
        projectId: "p2",
        ownerId: "o2",
        source: "consulting",
        confidence: 0.7,
      },
    );

    expect(result.patches).toBe(0);
    expect(proposeAndMaybeMergeDna).not.toHaveBeenCalled();
  });
});
