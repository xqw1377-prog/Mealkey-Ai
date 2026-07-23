import { describe, expect, it } from "vitest";
import {
  buildCausalSectionMarkdown,
  detectCausalIntent,
  isRevenueDeclineUtterance,
  CAUSAL_CHAINS_V1,
} from "@/server/founder-layer/restaurant-intelligence";

describe("Restaurant Intelligence SSOT", () => {
  it("识别营业额下降意图", () => {
    expect(isRevenueDeclineUtterance("我的店最近营业额下降怎么办")).toBe(true);
    expect(detectCausalIntent("我想降价促销")).toBe("price_cut");
    expect(detectCausalIntent("菜品太多厨房忙不过来")).toBe("sku_bloat");
  });

  it("因果区 markdown 含公式与节点", () => {
    const md = buildCausalSectionMarkdown("营业额下降怎么办");
    expect(md).toMatch(/经营因果链/);
    expect(md).toMatch(/客流/);
    expect(md).toMatch(/客单价|客单/);
    expect(CAUSAL_CHAINS_V1.revenue_decompose?.formula).toMatch(/客流/);
  });
});
