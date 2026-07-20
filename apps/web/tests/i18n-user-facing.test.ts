import { describe, expect, it } from "vitest";
import {
  labelUnknownField,
  listUnknownKeys,
  listUnknowns,
  createEmptyBrain,
} from "@mealkey/restaurant-brain";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";

describe("用户可见缺口文案 i18n", () => {
  it("中文默认把字段键翻成人话", () => {
    expect(labelUnknownField("business.monthlyRevenue")).toBe("月营收");
    expect(labelUnknownField("capability")).toBe("组织与经营能力画像");
    expect(labelUnknownField("founder.decisionStyle")).toBe("老板决策风格");
    expect(toUserFacingGapLabel("brand.positioning")).toBe("品牌定位");
  });

  it("英文 locale 输出英文标签", () => {
    expect(labelUnknownField("business.monthlyRevenue", "en")).toBe("Monthly revenue");
    expect(listUnknowns(createEmptyBrain({ projectId: "p", ownerId: "o" }), "en")).toContain(
      "Monthly revenue",
    );
  });

  it("自然语言问句保持原样", () => {
    const q = "现任店长能否在你不在场时独立撑起门店？";
    expect(toUserFacingGapLabel(q)).toBe(q);
  });

  it("listUnknownKeys 仍保留稳定机器键", () => {
    const keys = listUnknownKeys(createEmptyBrain({ projectId: "p", ownerId: "o" }));
    expect(keys).toContain("business.monthlyRevenue");
  });
});
