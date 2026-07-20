/**
 * 市场调研：范围采集 + 定位公司九章报告
 */
import { describe, expect, it } from "vitest";
import {
  buildMarketResearchPack,
  buildMarketResearchPackAsync,
  buildResearchScope,
  collectMarketIntelligence,
  composePositioningResearchReport,
  createBrandProject,
  writeBrandBrief,
  BrandProjectStage,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("market research crawl + firm report", () => {
  function briefed() {
    let project = createBrandProject("p1", "b1");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "brief_1",
      version: 1,
      status: "complete",
      businessContext: "长沙单店经营，准备第二家",
      categoryDefinition: "湘菜",
      targetCustomer: "带娃家庭",
      customerNeed: "干净可预期",
      competitiveSet: ["费大厨", "炊烟"],
      brandAmbition: "家庭首选",
      founderBelief: "一线稳出品",
      rawAnswers: {},
      gaps: [],
      compiledAt: new Date().toISOString(),
    });
    return project;
  }

  it("builds scope from region / format / category / rivals / stage", () => {
    const project = briefed();
    const scope = buildResearchScope({
      city: "长沙",
      district: "岳麓区",
      brandName: "测试湘菜馆",
      category: project.assets.brandBrief!.categoryDefinition,
      competitiveSet: project.assets.brandBrief!.competitiveSet,
      targetCustomer: project.assets.brandBrief!.targetCustomer,
      customerNeed: project.assets.brandBrief!.customerNeed,
      businessContext: project.assets.brandBrief!.businessContext,
      brandAmbition: project.assets.brandBrief!.brandAmbition,
      founderBelief: project.assets.brandBrief!.founderBelief,
    });
    expect(scope.city).toBe("长沙");
    expect(scope.businessFormat).toBe("正餐");
    expect(scope.rivals).toContain("费大厨");
    expect(scope.brandStage).toMatch(/多店|单店|未知|扩张/);
  });

  it("async pack produces nine-chapter report even with mock crawl", async () => {
    const project = briefed();
    const pack = await buildMarketResearchPackAsync({
      brief: project.assets.brandBrief,
      city: "长沙",
      district: "岳麓区",
      brandName: "测试湘菜馆",
      searchAdapter: {
        async search({ query }) {
          return [
            {
              title: `${query} 摘要`,
              url: `https://example.com/r?q=${encodeURIComponent(query)}`,
              snippet: `${query}：区域供给密集，家庭场景仍有可切空位。`,
              source: "mock-crawl",
            },
          ];
        },
      },
    });

    expect(pack.reportMarkdown).toMatch(/## 一、调研目的与范围/);
    expect(pack.reportMarkdown).toMatch(/## 五、竞争格局与心智地图/);
    expect(pack.reportMarkdown).toMatch(/## 六、竞品深描/);
    expect(pack.reportMarkdown).toMatch(/## 九、附录：证据与来源/);
    expect(pack.scope?.city).toBe("长沙");
    expect(pack.competitorBriefs?.some((c) => /费大厨|炊烟/.test(c.name))).toBe(
      true,
    );
    expect(pack.collectionMode).toMatch(/live_crawl|hybrid/);
    expect(pack.sources?.length).toBeGreaterThan(0);
    expect(pack.whitespace.length).toBeGreaterThan(2);

    // 心智词 + 证据句 + 空位威胁三联
    const brief = pack.competitorBriefs?.find((c) => /费大厨|炊烟/.test(c.name));
    expect(brief?.mentalPosition?.length).toBeGreaterThan(1);
    expect(brief?.evidenceSentence?.length).toBeGreaterThan(8);
    expect(brief?.threatToWhitespace?.length).toBeGreaterThan(8);
    expect(pack.reportMarkdown).toMatch(/心智词/);
    expect(pack.reportMarkdown).toMatch(/空位威胁/);
    expect(pack.storeVisitPlan?.tasks.length).toBeGreaterThan(0);
    expect(pack.storeVisitPlan?.honestyNote).toMatch(/店访|一手/);
    expect(pack.reportMarkdown).toMatch(/一手店访证据计划/);
  });

  it("sync pack still returns firm report skeleton", () => {
    const project = briefed();
    const pack = buildMarketResearchPack({
      brief: project.assets.brandBrief,
      city: "长沙",
    });
    expect(pack.reportMarkdown).toMatch(/市场调研报告/);
    expect(pack.scope?.category).toBe("湘菜");
  });

  it("collector merges local intel for changsha xiangcai", async () => {
    const scope = buildResearchScope({
      city: "长沙",
      category: "湘菜",
      competitiveSet: ["周边馆"],
      targetCustomer: "家庭",
      customerNeed: "放心",
    });
    const col = await collectMarketIntelligence(scope);
    expect(col.localMarket?.saturation).toBeTruthy();
    const report = composePositioningResearchReport(col);
    expect(report.markdown).toContain("机会空位");
  });
});
