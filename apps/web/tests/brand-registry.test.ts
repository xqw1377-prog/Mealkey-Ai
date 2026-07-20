import { describe, expect, it } from "vitest";
import {
  ensureBrandRegistry,
  switchActiveBrandInProfile,
  upsertBrandInProfile,
} from "@/lib/brand-registry";

describe("brand-registry", () => {
  it("从旧扁平字段迁移默认品牌", () => {
    const { view, profile } = ensureBrandRegistry(
      {
        brandName: "能力湘菜",
        category: "湘菜",
        mentalPosition: "长沙宴请",
      },
      "测试企业",
    );
    expect(view.brands).toHaveLength(1);
    expect(view.activeBrand?.brandName).toBe("能力湘菜");
    expect(profile.brandName).toBe("能力湘菜");
    expect(profile.activeBrandId).toBeTruthy();
  });

  it("支持新建第二品牌并切换", () => {
    const base = ensureBrandRegistry({ brandName: "能力湘菜" }, "企业");
    const upserted = upsertBrandInProfile(
      base.profile,
      {
        brandName: "能力小馆",
        category: "快餐",
        mentalPosition: "日常湘味",
      },
      "企业",
    );
    expect(upserted.profile.brands).toHaveLength(2);

    const switched = switchActiveBrandInProfile(
      upserted.profile,
      upserted.brand.id,
      "企业",
    );
    expect(switched.view.activeBrandId).toBe(upserted.brand.id);
    expect(switched.profile.brandName).toBe("能力小馆");
    expect(
      (switched.profile.mPnt as { brandPositioning?: { brandName?: string } })
        ?.brandPositioning?.brandName,
    ).toBe("能力小馆");
  });
});
