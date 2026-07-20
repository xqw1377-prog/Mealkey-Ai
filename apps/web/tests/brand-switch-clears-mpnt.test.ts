/**
 * 切换品牌时清空四席咨询状态（M-PNT + M-MKT/BIZ/ED）
 */
import { describe, expect, it } from "vitest";
import {
  clearAgentConsultingStateFromProfile,
  clearAllConsultingStateFromProfile,
  clearMPntConsultingStateFromProfile,
  switchActiveBrandInProfile,
} from "@/lib/brand-registry";

describe("brand switch clears consulting", () => {
  it("removes M-PNT consulting project and interview keys", () => {
    const cleared = clearMPntConsultingStateFromProfile({
      mPntBrandProject: { brandProjectId: "bp_old", stage: "FINAL_STRATEGY" },
      mPntBriefInterview: { layer: "enterprise" },
      mPnt: {
        source: "m-pnt-consulting",
        oneLiner: "旧定位",
        positioningContract: { status: "frozen" },
        reportSigned: true,
      },
      brands: [],
    });
    expect(cleared.mPntBrandProject).toBeUndefined();
    expect(cleared.mPntBriefInterview).toBeUndefined();
    const mPnt = cleared.mPnt as Record<string, unknown>;
    expect(mPnt.oneLiner).toBeUndefined();
    expect(mPnt.positioningContract).toBeUndefined();
    expect(mPnt.reportSigned).toBeUndefined();
    expect(cleared.mPntConsultingClearedReason).toBe("brand_switch");
  });

  it("removes three-agent consulting projects", () => {
    const cleared = clearAgentConsultingStateFromProfile({
      mMktConsultingProject: { agentId: "m-mkt", consultingId: "ac1" },
      mBizConsultingProject: { agentId: "m-biz", consultingId: "ac2" },
      mEdConsultingProject: { agentId: "m-ed", consultingId: "ac3" },
    });
    expect(cleared.mMktConsultingProject).toBeUndefined();
    expect(cleared.mBizConsultingProject).toBeUndefined();
    expect(cleared.mEdConsultingProject).toBeUndefined();
    expect(cleared.agentConsultingClearedReason).toBe("brand_switch");
  });

  it("clears all four seats when switching to another brand", () => {
    const profile = {
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
      mPntBrandProject: { brandProjectId: "bp_a", boundBrandId: "br_a" },
      mPntBriefInterview: { answers: { x: "1" } },
      mPnt: { source: "m-pnt-consulting", oneLiner: "A的定位" },
      mMktConsultingProject: { agentId: "m-mkt", consultingId: "ac_mkt" },
      mBizConsultingProject: { agentId: "m-biz", consultingId: "ac_biz" },
      mEdConsultingProject: { agentId: "m-ed", consultingId: "ac_ed" },
    };
    const { profile: next, view } = switchActiveBrandInProfile(
      profile,
      "br_b",
      "测试项目",
    );
    expect(view.activeBrandId).toBe("br_b");
    expect(next.mPntBrandProject).toBeUndefined();
    expect(next.mPntBriefInterview).toBeUndefined();
    expect((next.mPnt as Record<string, unknown>).oneLiner).toBeUndefined();
    expect(next.mMktConsultingProject).toBeUndefined();
    expect(next.mBizConsultingProject).toBeUndefined();
    expect(next.mEdConsultingProject).toBeUndefined();
  });

  it("clearAllConsultingStateFromProfile clears four seats", () => {
    const cleared = clearAllConsultingStateFromProfile({
      mPntBrandProject: { brandProjectId: "bp" },
      mMktConsultingProject: { consultingId: "1" },
      mBizConsultingProject: { consultingId: "2" },
      mEdConsultingProject: { consultingId: "3" },
    });
    expect(cleared.mPntBrandProject).toBeUndefined();
    expect(cleared.mMktConsultingProject).toBeUndefined();
    expect(cleared.mBizConsultingProject).toBeUndefined();
    expect(cleared.mEdConsultingProject).toBeUndefined();
  });

  it("does not clear when selecting the same brand", () => {
    const profile = {
      brands: [
        {
          id: "br_a",
          brandName: "品牌A",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      activeBrandId: "br_a",
      mPntBrandProject: { brandProjectId: "bp_a", boundBrandId: "br_a" },
      mMktConsultingProject: { consultingId: "keep" },
    };
    const { profile: next } = switchActiveBrandInProfile(profile, "br_a");
    expect(next.mPntBrandProject).toEqual(profile.mPntBrandProject);
    expect(next.mMktConsultingProject).toEqual(profile.mMktConsultingProject);
  });

  it("material brand edit should clear consulting via clearAll", () => {
    // 同品牌改名/改品类：router 会调 clearAllConsultingStateFromProfile
    const cleared = clearAllConsultingStateFromProfile({
      mPntBrandProject: {
        brandProjectId: "bp_a",
        boundBrandId: "br_a",
        assets: { journey: { marketResearch: { headline: "旧品牌调研" } } },
      },
      mPntBriefInterview: { answers: {} },
    });
    expect(cleared.mPntBrandProject).toBeUndefined();
    expect(cleared.mPntBriefInterview).toBeUndefined();
  });
});
