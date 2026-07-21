/**
 * 三席领域深度对齐：证据账本 + 强度 + Identity 先验
 */
import { describe, expect, it } from "vitest";
import {
  createAgentConsultingProject,
  enrichConsultingWithDomainDepth,
  assertDomainDepthForStrategy,
  mergeIdentityPriorsIntoAnswers,
  harvestVerifiedDomainFacts,
} from "../../../packages/agents/src/consulting-os";
import { toMMktMkInsights } from "../../../packages/agents/src/m-mkt/consulting";
import { toMBizMkInsights } from "../../../packages/agents/src/m-biz/consulting";
import { toMEdMkInsights } from "../../../packages/agents/src/m-ed/consulting";

function baseMkt() {
  const p = createAgentConsultingProject("m-mkt", "p_mkt");
  return {
    ...p,
    intakeAnswers: {
      city: "长沙",
      category: "湘菜",
      intent: "开第二家",
      scene: "家庭聚餐",
      rivals: "周边馆",
      targetCustomer: "带娃家庭",
    },
    intakeStatus: "complete" as const,
    assets: {
      ...p.assets,
      research: {
        status: "confirmed" as const,
        headline: "长沙湘菜家庭聚餐仍有场景空位",
        sections: [
          { title: "市场规模与增长", body: "家庭聚餐频次上升，客单 80-120 可成立。" },
          { title: "竞争格局", body: "同品类同价带连锁增加，差异化不足。" },
          { title: "客群洞察", body: "带娃家庭怕赌运气，要可预期出品。" },
          { title: "渠道验证", body: "点评好评集中味道，差评集中等位。" },
        ],
        risks: ["服务速度"],
        generatedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        scope: {
          city: "长沙",
          category: "湘菜",
          intent: "开第二家",
          constraint: "单店验证",
        },
        competitorBriefs: [
          { name: "周边馆A", play: "宽菜单低价", threat: "分流家庭客" },
          { name: "连锁B", play: "标准化快", threat: "体验同质" },
          { name: "新店C", play: "网红装修", threat: "吸睛不复购" },
        ],
        collectionMode: "hybrid" as const,
        sources: [
          "公开检索·长沙湘菜评价",
          "创始人陈述·客群与场景",
        ],
      },
      primaryFacts: [
        {
          factId: "f1",
          claim: "长沙岳麓区家庭聚餐客群稳定",
          sourceRef: "founder_interview",
          related: "research" as const,
          capturedAt: new Date().toISOString(),
        },
        {
          factId: "f2",
          claim: "点评差评集中在等位与服务速度",
          sourceRef: "channel_data",
          related: "research" as const,
          capturedAt: new Date().toISOString(),
        },
      ],
    },
  };
}

describe("三席 domain-depth 对齐", () => {
  it("Identity 先验不覆盖已填答案", () => {
    const merged = mergeIdentityPriorsIntoAnswers(
      { city: "武汉", category: "" },
      { city: "长沙", category: "湘菜", brandName: "等里" },
    );
    expect(merged.city).toBe("武汉");
    expect(merged.category).toBe("湘菜");
    expect(merged.brandName).toBe("等里");
  });

  it("M-MKT：LIVE 调研收割领域账本 + 强度", () => {
    const enriched = enrichConsultingWithDomainDepth("m-mkt", baseMkt());
    expect(enriched.assets.domainLedger).toBeTruthy();
    expect(enriched.assets.domainStrength?.overall).toBeGreaterThan(20);
    expect((enriched.assets.primaryFacts || []).length).toBeGreaterThanOrEqual(2);
    const bundle = harvestVerifiedDomainFacts("m-mkt", enriched);
    expect(bundle.kind).toBe("m-mkt");
    expect(bundle.ledger.facts.length).toBeGreaterThan(2);
  });

  it("M-MKT：证据过薄时策略确认硬拦", () => {
    const thin = createAgentConsultingProject("m-mkt", "p_thin");
    expect(() => assertDomainDepthForStrategy("m-mkt", thin)).toThrow(/一手事实不足/);
  });

  it("M-BIZ：客单/UE intake 写入核实事实", () => {
    const p = createAgentConsultingProject("m-biz", "p_biz");
    const withUe = {
      ...p,
      intakeAnswers: {
        avgTicket: "人均 88",
        unitEconomics: "月流水 35 万，毛利 52%",
        pain: "利润不够稳",
        resource: "供应链成熟",
      },
      assets: {
        ...p.assets,
        research: {
          status: "confirmed" as const,
          headline: "利润主航道可验证",
          sections: [
            { title: "单位经济 UE", body: "客单与毛利可支撑单店。" },
            { title: "营收与客单", body: "人均 88，周末更高。" },
            { title: "成本结构", body: "食材与人力可控。" },
            { title: "复制准备", body: "店长体系未验证。" },
          ],
          risks: ["复制"],
          generatedAt: new Date().toISOString(),
          collectionMode: "hybrid" as const,
          sources: ["经营账本摘要", "创始人访谈"],
        },
        primaryFacts: [
          {
            factId: "b1",
            claim: "人均客单约 88 元",
            sourceRef: "financial_data",
            related: "research" as const,
            capturedAt: new Date().toISOString(),
          },
          {
            factId: "b2",
            claim: "月流水约 35 万毛利约 52%",
            sourceRef: "financial_data",
            related: "research" as const,
            capturedAt: new Date().toISOString(),
          },
        ],
      },
    };
    const enriched = enrichConsultingWithDomainDepth("m-biz", withUe);
    expect(enriched.assets.domainStrength?.summary).toMatch(/商业强度/);
    const insights = toMBizMkInsights(enriched);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some((i) => i.evidence.some((e) => e.type === "PRIMARY_FACT"))).toBe(
      true,
    );
  });

  it("M-ED：控制权事实进入账本，Insight 挂强度", () => {
    const p = createAgentConsultingProject("m-ed", "p_ed");
    const withEq = {
      ...p,
      intakeAnswers: {
        control: "创始人持股 65%，联合创始人 20%",
        pool: "期权池预留 10%",
        topic: "融资前治理",
        team: "核心三人合伙",
        mustSign: "股东协议、一致行动",
      },
      assets: {
        ...p.assets,
        research: {
          status: "confirmed" as const,
          headline: "控制权底线需先锁",
          sections: [
            { title: "股权结构", body: "创始人相对控股。" },
            { title: "合规风险", body: "协议未齐。" },
            { title: "团队激励", body: "期权池待落地。" },
            { title: "融资节奏", body: "先治理后融资。" },
          ],
          risks: ["稀释"],
          generatedAt: new Date().toISOString(),
          collectionMode: "hybrid" as const,
          sources: ["股权结构表草稿", "法务备忘"],
        },
        primaryFacts: [
          {
            factId: "e1",
            claim: "创始人持股约 65%",
            sourceRef: "cap_table",
            related: "research" as const,
            capturedAt: new Date().toISOString(),
          },
          {
            factId: "e2",
            claim: "期权池预留约 10%",
            sourceRef: "contract_document",
            related: "research" as const,
            capturedAt: new Date().toISOString(),
          },
        ],
      },
    };
    const enriched = enrichConsultingWithDomainDepth("m-ed", withEq);
    expect(enriched.assets.domainLedger).toBeTruthy();
    const insights = toMEdMkInsights(enriched);
    expect(insights.length).toBeGreaterThan(0);
    expect(toMMktMkInsights(baseMkt()).length).toBeGreaterThan(0);
  });
});
