import { describe, expect, it } from "vitest";
import { greetingByHour } from "../src/lib/time-greeting";
import {
  archiveActiveConsultingForBrand,
  brandHasConsultingArchive,
  restoreConsultingArchiveToActive,
  switchActiveBrandInProfile,
} from "../src/lib/brand-registry";

describe("greetingByHour", () => {
  it("按时段返回问候", () => {
    expect(greetingByHour(new Date("2026-07-16T08:00:00"))).toBe("早上好");
    expect(greetingByHour(new Date("2026-07-16T12:30:00"))).toBe("中午好");
    expect(greetingByHour(new Date("2026-07-16T15:00:00"))).toBe("下午好");
    expect(greetingByHour(new Date("2026-07-16T20:00:00"))).toBe("晚上好");
    expect(greetingByHour(new Date("2026-07-16T02:00:00"))).toBe("夜深了");
  });
});

describe("品牌咨询归档", () => {
  it("切换品牌时归档并可恢复", () => {
    const profile: Record<string, unknown> = {
      brands: [
        {
          id: "br_a",
          brandName: "品牌A",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        {
          id: "br_b",
          brandName: "品牌B",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      activeBrandId: "br_a",
      mPntBrandProject: {
        boundBrandId: "br_a",
        projectId: "p1",
        stage: "BRAND_BRIEF",
      },
    };

    const switched = switchActiveBrandInProfile(profile, "br_b", "企业");
    expect(switched.view.activeBrandId).toBe("br_b");
    expect(switched.profile.mPntBrandProject).toBeUndefined();
    expect(brandHasConsultingArchive(switched.profile, "br_a")).toBe(true);

    const back = switchActiveBrandInProfile(switched.profile, "br_a", "企业");
    expect(back.view.activeBrandId).toBe("br_a");
    expect(
      (back.profile.mPntBrandProject as { boundBrandId?: string })?.boundBrandId,
    ).toBe("br_a");
  });

  it("无卷宗时归档为空操作", () => {
    const profile: Record<string, unknown> = {
      brands: [
        {
          id: "br_a",
          brandName: "A",
          createdAt: "",
          updatedAt: "",
        },
      ],
      activeBrandId: "br_a",
    };
    const next = archiveActiveConsultingForBrand(profile, "br_a");
    expect(next).toEqual(profile);
    expect(restoreConsultingArchiveToActive(next, "br_a")).toEqual(next);
  });
});
