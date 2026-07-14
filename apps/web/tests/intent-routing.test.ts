import { describe, expect, it } from "vitest";
import { isMMktProductIntent } from "@/server/services/m-mkt.service";
import { isMPntProductIntent } from "@/server/services/m-pnt.service";
import { isMEdProductIntent } from "@/server/services/m-ed.service";

describe("意图路由冲突", () => {
  it("「品类分析」归 M-PNT，不归 M-MKT", () => {
    const msg = "帮我做一下湘菜品类分析";
    expect(isMPntProductIntent(msg)).toBe(true);
    expect(isMMktProductIntent(msg)).toBe(false);
  });

  it("「市场机会」命中 M-MKT", () => {
    expect(isMMktProductIntent("这个城市有没有开火锅的市场机会")).toBe(true);
  });

  it("「股权怎么分」命中 M-ED", () => {
    expect(isMEdProductIntent("三个合伙人股权怎么分比较合理")).toBe(true);
  });

  it("「品牌定位」命中 M-PNT", () => {
    expect(isMPntProductIntent("我们的品牌定位应该怎么做")).toBe(true);
  });
});
