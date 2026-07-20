/**
 * 定位信息收集清单：三源未齐不得确认调研
 */
import { describe, expect, it } from "vitest";
import {
  createBrandProject,
  upsertBrandBasics,
  writeBrandBasics,
  writeDiscoveryNotes,
  writeAdaptiveFollowups,
  writeBrandBrief,
  writeJourneyAssets,
  writeEvidenceLedger,
  generateAdaptiveFollowups,
  answerAdaptiveFollowup,
  compileBrandBriefFromBasics,
  evaluatePositioningIntakeChecklist,
  assertCanConfirmMarketResearch,
  assertCanRunMarketResearch,
  seedFactsFromMarketResearchPack,
  addPrimaryFact,
  resolveResearchCity,
  type MarketResearchPack,
} from "../../../packages/agents/src/m-pnt/consulting";

const FULL_BASICS = {
  brandName: "味本源",
  storeScale: "直营2家",
  annualRevenue: "单店月均38万",
  category: "鲜椒烤鱼",
  currentPositioning: "高新白领下班后的鲜椒烤鱼据点",
  region: "成都高新区",
  avgTicket: "人均95元",
  slogan: "暂无",
  competitors: "探鱼,江边城外",
  advantages: "自研鲜椒油底与出餐节奏，三个月抄不走",
  businessGoal: "先把心智钉死再开第三家",
  mainPain: "客人说好吃但记不住我们叫什么",
};

function projectAfterIntake() {
  let p = createBrandProject("proj_intake");
  const basics = upsertBrandBasics(undefined, FULL_BASICS);
  p = writeBrandBasics(p, basics);
  p = writeDiscoveryNotes(p, {
    status: "complete",
    notes: "档案",
    category: "鲜椒烤鱼",
  });
  let followups = generateAdaptiveFollowups({
    brandProjectId: p.brandProjectId,
    basics,
  });
  for (const q of followups.questions.filter((x) => x.priority === "must")) {
    followups = answerAdaptiveFollowup(
      followups,
      q.id,
      `具体经营事实回答 ${q.id}`,
    );
  }
  p = writeAdaptiveFollowups(p, followups);
  const brief = compileBrandBriefFromBasics({ basics, followups });
  expect(brief.status).toBe("complete");
  p = writeBrandBrief(p, brief);
  return p;
}

function livePack(): MarketResearchPack {
  return {
    packId: "mrp_1",
    status: "ready",
    headline: "成都鲜椒烤鱼调研",
    categoryTrend: "品类升温",
    consumerShift: "聚会场景",
    competitiveLandscape: "连锁挤压",
    whitespace: "白领下班鲜椒据点",
    risks: ["同质化"],
    evidenceNotes: ["来源可追溯"],
    generatedAt: new Date().toISOString(),
    collectionMode: "live_crawl",
    pillarCoverage: {
      evaluatedAt: new Date().toISOString(),
      allOk: true,
      missing: [],
      summary: "三柱采集已齐（区域 / 竞对 / 用户门店）。",
      pillars: [
        {
          id: "region",
          label: "区域市场分析",
          ok: true,
          hitCount: 3,
          requiredHits: 2,
          detail: "区域/市场来源 3 条",
        },
        {
          id: "competitor",
          label: "竞对分析",
          ok: true,
          hitCount: 2,
          requiredHits: 2,
          detail: "联网竞对 1 家",
        },
        {
          id: "store_user",
          label: "用户与门店分析",
          ok: true,
          hitCount: 2,
          requiredHits: 2,
          detail: "用户/口碑来源 2 条",
        },
      ],
    },
    scope: {
      city: "成都",
      category: "鲜椒烤鱼",
      businessFormat: "火锅烧烤",
      brandName: "味本源",
      brandStage: "多店扩张",
      brandStatusNote: "直营2家",
      rivals: ["探鱼", "江边城外"],
    },
    competitorBriefs: [
      {
        name: "探鱼",
        summary: "连锁心智",
        dataQuality: "live",
        evidenceSentence: "大众点评高频提到聚会烤鱼",
      },
    ],
    sources: [
      {
        title: "成都餐饮市场报告",
        url: "https://example.com/a",
        snippet: "高新区域烤鱼需求上升，客流向写字楼商圈集中",
        source: "web",
        query: "成都 区域 烤鱼 市场",
      },
      {
        title: "探鱼门店评价",
        url: "https://example.com/b",
        snippet: "客人对比探鱼与江边城外，认为连锁更稳",
        source: "web",
        query: "成都 探鱼 竞品 点评",
      },
      {
        title: "用户场景观察",
        url: "https://example.com/c",
        snippet: "下班后朋友小聚是高频场景，口碑看翻台",
        source: "web",
        query: "成都 烤鱼 用户 评价 场景",
      },
      {
        title: "商圈客流",
        url: "https://example.com/d",
        snippet: "高新区夜间客流稳定",
        source: "web",
        query: "成都高新区 客流",
      },
    ],
  };
}

describe("PositioningIntakeChecklist", () => {
  it("blocks market research before fixed+adaptive complete", () => {
    const p = createBrandProject("empty");
    const c = evaluatePositioningIntakeChecklist(p);
    expect(c.canRunMarketResearch).toBe(false);
    expect(() => assertCanRunMarketResearch(p)).toThrow(/信息采集未完成/);
  });

  it("allows run research after intake, but blocks confirm without live tools", () => {
    const p = projectAfterIntake();
    expect(evaluatePositioningIntakeChecklist(p).canRunMarketResearch).toBe(
      true,
    );
    expect(evaluatePositioningIntakeChecklist(p).canConfirmMarketResearch).toBe(
      false,
    );
    expect(() => assertCanConfirmMarketResearch(p)).toThrow(/清单未齐/);
  });

  it("resolves city from basics.region", () => {
    const p = projectAfterIntake();
    expect(resolveResearchCity(p, "目标城市")).toContain("成都");
  });

  it("confirms only after live pack + ledger seeded", () => {
    let p = projectAfterIntake();
    const pack = livePack();
    p = writeJourneyAssets(p, {
      ...p.assets.journey,
      marketResearch: pack,
    });
    p = writeEvidenceLedger(
      p,
      seedFactsFromMarketResearchPack(p.assets.evidenceLedger, pack, addPrimaryFact),
    );
    const c = evaluatePositioningIntakeChecklist(p);
    expect(c.canConfirmMarketResearch).toBe(true);
    expect(() => assertCanConfirmMarketResearch(p)).not.toThrow();
  });

  it("rejects local_intel pack as confirmable", () => {
    let p = projectAfterIntake();
    p = writeJourneyAssets(p, {
      ...p.assets.journey,
      marketResearch: {
        ...livePack(),
        status: "draft",
        collectionMode: "local_intel",
        sources: [],
      },
    });
    expect(evaluatePositioningIntakeChecklist(p).canConfirmMarketResearch).toBe(
      false,
    );
  });
});
