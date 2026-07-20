/**
 * Round A 基础档案 + Round B 自适应追问 — 采集质量门禁
 */
import { describe, expect, it } from "vitest";
import {
  upsertBrandBasics,
  generateAdaptiveFollowups,
  answerAdaptiveFollowup,
  compileBrandBriefFromBasics,
  compileBrandBrief,
  createBriefInterviewSession,
  BrandProjectStage,
  createBrandProject,
  writeBrandBasics,
  writeDiscoveryNotes,
  writeAdaptiveFollowups,
  advance,
} from "../../../packages/agents/src/m-pnt/consulting";

const FULL_BASICS = {
  brandName: "味本源",
  storeScale: "直营2家",
  annualRevenue: "单店月均38万",
  category: "鲜椒烤鱼",
  currentPositioning: "适合朋友小聚的鲜椒烤鱼",
  region: "成都高新区",
  avgTicket: "人均95元",
  slogan: "暂无",
  competitors: "探鱼",
  advantages: "好吃实惠",
  businessGoal: "先把心智钉死再开第三家",
  mainPain: "客人说好吃但记不住我们叫什么",
};

describe("BrandBasicsRoundA", () => {
  it("refuses complete when must fields missing", () => {
    const basics = upsertBrandBasics(undefined, {
      brandName: "味本源",
      category: "烤鱼",
    });
    expect(basics.status).toBe("draft");
    expect(basics.missingMust.length).toBeGreaterThan(0);
  });

  it("marks complete only when must fields are meaningful", () => {
    const basics = upsertBrandBasics(undefined, FULL_BASICS);
    expect(basics.status).toBe("complete");
    expect(basics.missingMust).toEqual([]);
  });
});

describe("AdaptiveFollowupRoundB", () => {
  it("generates different followups from rival/advantage gaps", () => {
    const thin = upsertBrandBasics(undefined, FULL_BASICS);
    const rich = upsertBrandBasics(undefined, {
      ...FULL_BASICS,
      competitors: "探鱼,江边城外,老字号烤鱼",
      advantages: "自研鲜椒油底+出餐节奏表，对手抄菜单三个月也稳不住翻台",
      currentPositioning: "高新白领下班后的鲜椒烤鱼据点",
    });

    const qThin = generateAdaptiveFollowups({
      brandProjectId: "bp1",
      basics: thin,
    });
    const qRich = generateAdaptiveFollowups({
      brandProjectId: "bp2",
      basics: rich,
    });

    const thinIds = qThin.questions.map((q) => q.id);
    const richIds = qRich.questions.map((q) => q.id);

    expect(thinIds).toContain("fq_rival_second");
    expect(richIds).not.toContain("fq_rival_second");
    expect(thinIds).toContain("fq_moat");
    expect(richIds).toContain("fq_moat_soft");
    expect(qThin.questions.some((q) => q.whyNeeded.length > 0)).toBe(true);
  });

  it("does not compile brief without answering must followups", () => {
    const basics = upsertBrandBasics(undefined, FULL_BASICS);
    const followups = generateAdaptiveFollowups({
      brandProjectId: "bp",
      basics,
    });
    const brief = compileBrandBriefFromBasics({ basics, followups });
    expect(brief.status).toBe("draft");
    expect(brief.gaps.some((g) => g.startsWith("followup."))).toBe(true);
  });

  it("compiles complete brief from basics + must answers without fake rivals", () => {
    const basics = upsertBrandBasics(undefined, {
      ...FULL_BASICS,
      competitors: "探鱼,江边城外",
      advantages: "自研鲜椒油底与出餐节奏，三个月抄不走",
      currentPositioning: "高新白领下班后的鲜椒烤鱼据点",
    });
    let followups = generateAdaptiveFollowups({
      brandProjectId: "bp",
      basics,
    });
    for (const q of followups.questions.filter((x) => x.priority === "must")) {
      followups = answerAdaptiveFollowup(
        followups,
        q.id,
        `针对${q.id}的具体经营事实回答`,
      );
    }
    expect(followups.status).toBe("ready_to_compile");

    const brief = compileBrandBriefFromBasics({ basics, followups });
    expect(brief.status).toBe("complete");
    expect(brief.gaps).toEqual([]);
    expect(brief.competitiveSet).toEqual(
      expect.arrayContaining(["探鱼", "江边城外"]),
    );
    expect(brief.competitiveSet.join(",")).not.toContain("周边同类馆");
    expect(brief.businessContext).toContain("味本源");
    expect(brief.targetCustomer.length).toBeGreaterThan(0);
  });
});

describe("LegacyBriefNoFakeDefaults", () => {
  it("keeps draft and never injects 周边同类馆", () => {
    const brief = compileBrandBrief(createBriefInterviewSession("bp"));
    expect(brief.status).toBe("draft");
    expect(brief.competitiveSet).toEqual([]);
  });
});

describe("DiscoveryGateRequiresBasics", () => {
  it("blocks leaving DISCOVERY without brandBasics complete", () => {
    let p = createBrandProject("proj");
    p = writeDiscoveryNotes(p, { status: "complete", notes: "仅两问不够" });
    p = advance(p, "discovery_only");
    expect(p.stage).toBe(BrandProjectStage.DISCOVERY);
    expect(p.stageStatus).toBe("blocked");
  });

  it("advances to BRAND_BRIEF when basics + discovery complete", () => {
    let p = createBrandProject("proj");
    const basics = upsertBrandBasics(undefined, FULL_BASICS);
    p = writeBrandBasics(p, basics);
    p = writeDiscoveryNotes(p, {
      status: "complete",
      notes: "档案摘要",
      category: basics.values.category,
    });
    const followups = generateAdaptiveFollowups({
      brandProjectId: p.brandProjectId,
      basics,
    });
    p = writeAdaptiveFollowups(p, followups);
    p = advance(p, "brand_basics_complete");
    expect(p.stage).toBe(BrandProjectStage.BRAND_BRIEF);
    expect(p.stageStatus).toBe("active");
  });
});
