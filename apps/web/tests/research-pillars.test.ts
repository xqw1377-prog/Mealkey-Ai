/**
 * 市场调研三柱：区域 / 竞对 / 用户门店
 */
import { describe, expect, it } from "vitest";
import {
  evaluateResearchPillars,
  collectMarketIntelligence,
  buildResearchScope,
  asToolAdapter,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("ResearchPillars", () => {
  it("fails all pillars without live sources", () => {
    const coverage = evaluateResearchPillars({
      collection: {
        mode: "local_intel",
        regionSources: [],
        categorySources: [],
        consumerSources: [],
        competitors: [],
      },
    });
    expect(coverage.allOk).toBe(false);
    expect(coverage.missing.length).toBe(3);
  });

  it("passes store_user via store visit even if consumer crawl thin", () => {
    const coverage = evaluateResearchPillars({
      collection: {
        mode: "live_crawl",
        regionSources: [
          {
            title: "商圈",
            url: "https://a",
            snippet: "客流",
            source: "web",
            query: "区域 市场",
            capturedAt: "",
          },
          {
            title: "密度",
            url: "https://b",
            snippet: "门店",
            source: "web",
            query: "区域 密度",
            capturedAt: "",
          },
        ],
        categorySources: [],
        consumerSources: [],
        competitors: [
          {
            name: "探鱼",
            dataQuality: "live",
            sources: [
              {
                title: "探鱼",
                url: "https://c",
                snippet: "口碑",
                source: "web",
                query: "竞品",
                capturedAt: "",
              },
              {
                title: "探鱼2",
                url: "https://d",
                snippet: "客单",
                source: "web",
                query: "竞品2",
                capturedAt: "",
              },
            ],
          },
        ],
      },
      storeVisitFilled: 1,
    });
    expect(coverage.pillars.find((p) => p.id === "store_user")?.ok).toBe(true);
    expect(coverage.pillars.find((p) => p.id === "region")?.ok).toBe(true);
    expect(coverage.pillars.find((p) => p.id === "competitor")?.ok).toBe(true);
    expect(coverage.allOk).toBe(true);
  });

  it("collectMarketIntelligence attaches pillarCoverage with mock search", async () => {
    const scope = buildResearchScope({
      city: "成都",
      category: "烤鱼",
      competitiveSet: ["探鱼", "江边城外"],
      targetCustomer: "白领聚会",
      customerNeed: "鲜椒过瘾",
    });
    const adapter = asToolAdapter(async ({ query }) => [
      {
        title: `命中 ${query}`,
        url: `https://example.com/${encodeURIComponent(query)}`,
        snippet: `${query} 的公开市场与口碑信号，含客单价与场景`,
        source: "mock",
      },
    ]);
    const collection = await collectMarketIntelligence(scope, adapter);
    expect(collection.mode).toBe("live_crawl");
    expect(collection.pillarCoverage).toBeTruthy();
    expect(collection.regionSources.length).toBeGreaterThan(0);
    expect(collection.consumerSources.length).toBeGreaterThan(0);
    expect(collection.competitors.some((c) => c.sources.length > 0)).toBe(true);
  });
});
