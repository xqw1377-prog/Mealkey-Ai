/**
 * Restaurant Brain tRPC 契约：procedure 名与页面约定对齐
 */
import { describe, expect, it } from "vitest";
import { restaurantBrainRouter } from "@/server/routers/restaurant-brain";

describe("restaurantBrainRouter", () => {
  it("暴露我的餐厅所需 procedure", () => {
    const keys = Object.keys(restaurantBrainRouter._def.procedures);
    expect(keys).toEqual(
      expect.arrayContaining([
        "getOverview",
        "getContext",
        "listDecisions",
        "listEvents",
        "seedGoldenScenario",
        "seedExpansionScenario",
      ]),
    );
  });
});
