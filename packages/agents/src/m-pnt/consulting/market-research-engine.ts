/**
 * 步 2：市场调研 — 按区域/业态/品类/竞对采集情报，输出定位公司框架报告
 */
import type {
  BrandBrief,
  BrandStrategyProject,
  CategoryDiagnosis,
  CompetitiveMap,
  ConsumerInsight,
} from "./types";
import type { MarketResearchPack } from "./journey-types";
import {
  buildResearchScope,
  collectMarketIntelligence,
  composePositioningResearchReport,
  hardenAllCompetitors,
  buildStoreVisitPlan,
  evaluateResearchPillars,
  type ResearchSearchAdapter,
} from "./research";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 同步启发式（无联网）— 兼容旧测试 */
export function buildMarketResearchPack(input: {
  brief?: BrandBrief | null;
  category?: CategoryDiagnosis | null;
  consumer?: ConsumerInsight | null;
  map?: CompetitiveMap | null;
  city?: string;
  district?: string;
  brandName?: string;
  projectStage?: string;
}): MarketResearchPack {
  // 同步路径：不传 searchAdapter，走本地库 + 简报
  // 注意：此函数保持同步签名供测试；正式服务请用 buildMarketResearchPackAsync
  const brief = input.brief;
  const scope = buildResearchScope({
    city: input.city,
    district: input.district,
    brandName: input.brandName,
    category:
      input.category?.categoryName || brief?.categoryDefinition || undefined,
    competitiveSet: brief?.competitiveSet,
    targetCustomer: brief?.targetCustomer,
    customerNeed: brief?.customerNeed,
    businessContext: brief?.businessContext,
    brandAmbition: brief?.brandAmbition,
    founderBelief: brief?.founderBelief,
    projectStage: input.projectStage,
  });

  // 同步无法 await；用空采集 + 本地库通过 compose 前手动拼 collection 过重
  // 改为调用内部 sync 组装
  return buildSyncPackFromHints(input, scope);
}

function buildSyncPackFromHints(
  input: {
    brief?: BrandBrief | null;
    category?: CategoryDiagnosis | null;
    consumer?: ConsumerInsight | null;
    map?: CompetitiveMap | null;
    city?: string;
  },
  scope: ReturnType<typeof buildResearchScope>,
): MarketResearchPack {
  const brief = input.brief;
  const category = input.category;
  const consumer = input.consumer;
  const map = input.map;
  const city = input.city || scope.city;

  const catName =
    category?.categoryName || brief?.categoryDefinition || scope.category;
  const who = consumer?.primaryPersona || brief?.targetCustomer || scope.who;
  const need =
    consumer?.unmetNeeds?.[0] || brief?.customerNeed || scope.need;
  const whitespace =
    map?.whitespace ||
    category?.battlefield ||
    scope.need;
  const rivals =
    (map?.competitors || [])
      .slice(0, 3)
      .map((c) => c.name)
      .join("、") ||
    scope.rivals.slice(0, 3).join("、");

  const risks = [
    ...(category?.risks || []).slice(0, 2),
    ...(map?.noGoZones || []).slice(0, 1),
    "若定位过宽，会被连锁与低价馆两头挤压",
  ].filter(Boolean);

  const whitespaceCandidates = [whitespace, `${who}的「${need}」场景`];
  const competitors = hardenAllCompetitors(
    scope.rivals.map((name) => ({
      name,
      summary: `简报竞对「${name}」，待联网抓取补强`,
      signals: ["来自品牌简报"],
      sources: [],
      dataQuality: "inferred" as const,
    })),
    whitespaceCandidates,
  );

  // 最小同步采集骨架 → 长报告
  const collectionPromiseIgnored = {
    scope,
    collectedAt: new Date().toISOString(),
    mode: "local_intel" as const,
    queries: [
      `${city} ${catName} 竞争格局`,
      ...scope.rivals.map((r) => `${city} ${r} 定位`),
    ],
    categorySources: [],
    regionSources: [],
    consumerSources: [],
    competitors,
    localMarket: null,
    whitespaceCandidates,
    saturationNote: "待联网校准",
    priceBandNote: "待校准",
    rawNotes: ["同步启发式路径（未联网）"],
  };

  const composed = composePositioningResearchReport(collectionPromiseIgnored, {
    categoryTrendHint: category?.opportunity
      ? `${catName}机会：${category.opportunity}`
      : undefined,
    consumerHint: consumer?.insightStatement || undefined,
    mapHint: map?.mapNarrative || undefined,
  });

  return {
    packId: createId("mrp"),
    status: "ready",
    headline: composed.headline,
    categoryTrend: composed.categoryTrend,
    consumerShift: composed.consumerShift,
    competitiveLandscape:
      composed.competitiveLandscape ||
      `主要对手（${rivals}）多在价格或泛品类上纠缠；「${whitespace}」仍缺少清晰第一联想。`,
    whitespace: composed.whitespace,
    risks: composed.risks.length ? composed.risks : risks.slice(0, 4),
    evidenceNotes: composed.evidenceNotes,
    generatedAt: new Date().toISOString(),
    scope: {
      city: scope.city,
      district: scope.district,
      category: scope.category,
      businessFormat: scope.businessFormat,
      brandName: scope.brandName,
      brandStage: scope.brandStage,
      brandStatusNote: scope.brandStatusNote,
      rivals: scope.rivals,
    },
    collectionMode: "local_intel",
    reportMarkdown: composed.markdown,
    competitorBriefs: collectionPromiseIgnored.competitors.map((c) => ({
      name: c.name,
      mentalPosition: c.mentalPosition,
      evidenceSentence: c.evidenceSentence,
      threatToWhitespace: c.threatToWhitespace,
      summary: c.summary,
      dataQuality: c.dataQuality,
    })),
    sources: [],
    storeVisitPlan: (() => {
      const plan = buildStoreVisitPlan({
        city,
        whitespace: composed.whitespace,
        competitors: collectionPromiseIgnored.competitors,
      });
      return {
        title: plan.title,
        honestyNote: plan.honestyNote,
        tasks: plan.tasks,
        markdown: plan.markdown,
      };
    })(),
  };
}

/** 正式路径：联网情报采集 + 定位公司框架报告 */
export async function buildMarketResearchPackAsync(input: {
  brief?: BrandBrief | null;
  category?: CategoryDiagnosis | null;
  consumer?: ConsumerInsight | null;
  map?: CompetitiveMap | null;
  city?: string;
  district?: string;
  brandName?: string;
  projectStage?: string;
  searchAdapter?: ResearchSearchAdapter;
}): Promise<MarketResearchPack> {
  const brief = input.brief;
  const scope = buildResearchScope({
    city: input.city,
    district: input.district,
    brandName: input.brandName,
    category:
      input.category?.categoryName || brief?.categoryDefinition || undefined,
    competitiveSet: brief?.competitiveSet,
    targetCustomer: brief?.targetCustomer,
    customerNeed: brief?.customerNeed,
    businessContext: brief?.businessContext,
    brandAmbition: brief?.brandAmbition,
    founderBelief: brief?.founderBelief,
    projectStage: input.projectStage,
  });

  const collection = await collectMarketIntelligence(
    scope,
    input.searchAdapter,
  );

  const composed = composePositioningResearchReport(collection, {
    categoryTrendHint: input.category?.opportunity
      ? `${scope.category}机会：${input.category.opportunity}`
      : undefined,
    consumerHint: input.consumer?.insightStatement || undefined,
    mapHint: input.map?.mapNarrative || undefined,
  });

  const sources = [
    ...collection.categorySources,
    ...collection.regionSources,
    ...collection.consumerSources,
    ...collection.competitors.flatMap((c) => c.sources),
  ].slice(0, 24);

  const pillars =
    collection.pillarCoverage ||
    evaluateResearchPillars({ collection });

  // 三柱齐 + 联网模式才 ready；否则 draft
  const liveEnough =
    (collection.mode === "live_crawl" || collection.mode === "hybrid") &&
    sources.length >= 3 &&
    pillars.allOk;

  return {
    packId: createId("mrp"),
    status: liveEnough ? "ready" : "draft",
    headline: composed.headline,
    categoryTrend: composed.categoryTrend,
    consumerShift: composed.consumerShift,
    competitiveLandscape: composed.competitiveLandscape,
    whitespace: composed.whitespace,
    risks: composed.risks,
    evidenceNotes: [
      ...composed.evidenceNotes,
      pillars.summary,
      ...collection.rawNotes.slice(0, 3),
    ],
    generatedAt: new Date().toISOString(),
    scope: {
      city: scope.city,
      district: scope.district,
      category: scope.category,
      businessFormat: scope.businessFormat,
      brandName: scope.brandName,
      brandStage: scope.brandStage,
      brandStatusNote: scope.brandStatusNote,
      rivals: scope.rivals,
    },
    collectionMode: collection.mode,
    pillarCoverage: {
      evaluatedAt: pillars.evaluatedAt,
      allOk: pillars.allOk,
      missing: pillars.missing,
      summary: pillars.summary,
      pillars: pillars.pillars.map((p) => ({
        id: p.id,
        label: p.label,
        ok: p.ok,
        hitCount: p.hitCount,
        requiredHits: p.requiredHits,
        detail: p.detail,
      })),
    },
    reportMarkdown: composed.markdown,
    competitorBriefs: collection.competitors.map((c) => ({
      name: c.name,
      mentalPosition: c.mentalPosition,
      evidenceSentence: c.evidenceSentence,
      threatToWhitespace: c.threatToWhitespace,
      summary: c.summary,
      dataQuality: c.dataQuality,
    })),
    sources: sources.map((s) => ({
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      source: s.source,
      query: s.query,
    })),
    storeVisitPlan: (() => {
      const plan = buildStoreVisitPlan({
        city: scope.city,
        whitespace: composed.whitespace,
        competitors: collection.competitors,
      });
      return {
        title: plan.title,
        honestyNote: plan.honestyNote,
        tasks: plan.tasks,
        markdown: plan.markdown,
      };
    })(),
  };
}

export function confirmMarketResearchPack(
  pack: MarketResearchPack,
): MarketResearchPack {
  return {
    ...pack,
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  };
}

export function canBuildMarketResearch(project: BrandStrategyProject): boolean {
  return Boolean(project.assets.brandBrief?.status === "complete");
}
