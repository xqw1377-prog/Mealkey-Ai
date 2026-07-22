/**
 * 市场情报采集层
 *
 * 采集策略（合规优先）：
 * 1) 联网公开检索（SearXNG / SerpAPI / DuckDuckGo）— 按区域×品类×竞对构图
 * 2) 本地市场情报库（品类×城市）— 补领导者/空位/价格带
 * 3) 预留站点适配器接口（点评/美团等需官方授权或自有数据管道，禁止违规破解）
 *
 * 说明：产品文案可称「情报抓取」；实现上以公开检索 + 结构化汇总为主。
 */
import type { ResearchScope } from "./scope";
import { lookupLocalMarket, type LocalMarketHit } from "./market-intel-lite";
import {
  hardenAllCompetitors,
  pickEvidenceSentence,
} from "./competitor-triple";
import {
  collectVerticalSignals,
  type MarketResearchToolAdapter,
} from "./tool-adapter";
import {
  evaluateResearchPillars,
  type ResearchPillarCoverage,
} from "./pillars";

export type { MarketResearchToolAdapter, ResearchPillarCoverage };

export type CrawlSourceHit = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  query: string;
  capturedAt: string;
};

export type CompetitorIntel = {
  name: string;
  /** 心智词 — 客人脑中怎么称呼它 */
  mentalPosition?: string;
  /** 证据句 — 可引用的公开/本地一句 */
  evidenceSentence?: string;
  /** 空位威胁 — 相对本稿空位如何挤压 */
  threatToWhitespace?: string;
  summary: string;
  signals: string[];
  sources: CrawlSourceHit[];
  dataQuality: "live" | "local" | "inferred";
};

export type ResearchCollection = {
  scope: ResearchScope;
  collectedAt: string;
  mode: "live_crawl" | "local_intel" | "hybrid";
  queries: string[];
  categorySources: CrawlSourceHit[];
  regionSources: CrawlSourceHit[];
  consumerSources: CrawlSourceHit[];
  competitors: CompetitorIntel[];
  localMarket: LocalMarketHit | null;
  whitespaceCandidates: string[];
  saturationNote: string;
  priceBandNote: string;
  rawNotes: string[];
  /** 三柱覆盖（区域 / 竞对 / 用户门店） */
  pillarCoverage?: ResearchPillarCoverage;
};

export type ResearchSearchAdapter = {
  search(input: {
    query: string;
    limit?: number;
    region?: string;
  }): Promise<Array<{ title: string; url: string; snippet: string; source: string }>>;
};

function nowIso() {
  return new Date().toISOString();
}

function buildQueries(scope: ResearchScope): {
  category: string[];
  region: string[];
  consumer: string[];
  rival: Array<{ name: string; query: string }>;
} {
  const { city, category, businessFormat, who, rivals } = scope;
  const district = scope.district ? `${scope.district}` : "";
  const place = `${city}${district ? ` ${district}` : ""}`;
  // 首轮精简查询：保证三柱各有一把，避免 HTML 搜索串行拖死
  return {
    category: [
      `${place} ${category} 餐饮 竞争格局 市场`,
      `${category} ${businessFormat} 品类 机会`,
    ],
    region: [
      `${place} ${category} 门店 密度 商圈`,
      `${place} ${category} 客单价 客流`,
    ],
    consumer: [
      `${place} ${who} ${category} 消费 偏好`,
      `${place} ${category} 点评 口碑 评价`,
    ],
    rival: rivals.slice(0, 2).map((name) => ({
      name,
      query: `${place} ${name} ${category} 门店 定位 口碑`,
    })),
  };
}

/** 定位报告禁止英文/多语主导的公开检索噪声 */
function isChineseFacingHit(hit: {
  title?: string;
  snippet?: string;
  url?: string;
}): boolean {
  const text = `${hit.title || ""} ${hit.snippet || ""}`.replace(/\s+/g, " ").trim();
  if (text.length < 8) return false;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (cjk < 6) return false;
  if (latin >= 24 && cjk / (cjk + latin) < 0.4) return false;
  if (latin >= 40 && cjk < 12) return false;
  const url = hit.url || "";
  if (
    /microsoft\.com|office\.com|outlook\.com|hotmail|sap\.com|hema\.nl|support\.google|translate\.google/i.test(
      url,
    )
  ) {
    return false;
  }
  return true;
}

async function runQuery(
  adapter: ResearchSearchAdapter | undefined,
  query: string,
  limit = 3,
  region?: string,
): Promise<CrawlSourceHit[]> {
  if (!adapter) return [];
  try {
    const rows = await adapter.search({
      query,
      limit: Math.min(12, limit * 3),
      region,
    });
    const at = nowIso();
    return (rows || [])
      .filter((r) => r.snippet || r.title)
      .filter((r) => isChineseFacingHit(r))
      .slice(0, limit)
      .map((r) => ({
        title: r.title || query,
        url: r.url || "",
        snippet: (r.snippet || "").slice(0, 280),
        source: r.source || "web",
        query,
        capturedAt: at,
      }));
  } catch {
    return [];
  }
}

function inferCompetitorFromLocal(
  name: string,
  local: LocalMarketHit | null,
): CompetitorIntel | null {
  const hit = local?.leaders.find(
    (l) => name.includes(l.brand) || l.brand.includes(name),
  );
  if (!hit) return null;
  const summary = `${hit.brand} 在本地情报库中的心智位：${hit.position}${hit.note ? `（${hit.note}）` : ""}`;
  return {
    name,
    mentalPosition: hit.position,
    evidenceSentence: summary,
    summary,
    signals: [
      hit.position,
      hit.budget ? `资源强度 ${hit.budget}` : "",
      hit.note || "",
    ].filter(Boolean),
    sources: [],
    dataQuality: "local",
  };
}

function synthesizeCompetitor(
  name: string,
  hits: CrawlSourceHit[],
  local: LocalMarketHit | null,
): CompetitorIntel {
  const fromLocal = inferCompetitorFromLocal(name, local);
  if (!hits.length && fromLocal) return fromLocal;
  if (!hits.length) {
    return {
      name,
      mentalPosition: `${name}默认联想（待钉死）`,
      evidenceSentence: `公开检索暂未抓到「${name}」的可引用证据句，需店访复核。`,
      summary: `公开检索暂未抓到「${name}」的稳定情报，暂按简报竞对处理；确认后建议补一手店访。`,
      signals: ["数据不足，需店访或授权数据源"],
      sources: [],
      dataQuality: "inferred",
    };
  }
  const snippets = hits.map((h) => h.snippet).filter(Boolean);
  const mental =
    fromLocal?.mentalPosition ||
    snippets.find((s) => /第一|招牌|主打|定位|心智/.test(s))?.slice(0, 40);
  const summary =
    snippets.slice(0, 2).join("；") ||
    fromLocal?.summary ||
    `${name} 有公开提及`;
  return {
    name,
    mentalPosition: mental,
    evidenceSentence:
      fromLocal?.evidenceSentence ||
      pickEvidenceSentence(name, hits, summary),
    summary,
    signals: [
      ...(fromLocal?.signals || []),
      ...snippets.slice(0, 3).map((s) => s.slice(0, 60)),
    ].slice(0, 5),
    sources: hits,
    dataQuality: fromLocal && hits.length ? "live" : hits.length ? "live" : "inferred",
  };
}

/** 执行情报采集（公开检索 + 可选垂直管道） */
export async function collectMarketIntelligence(
  scope: ResearchScope,
  adapter?: ResearchSearchAdapter | MarketResearchToolAdapter,
): Promise<ResearchCollection> {
  const q = buildQueries(scope);
  const allQueries = [
    ...q.category,
    ...q.region,
    ...q.consumer,
    ...q.rival.map((r) => r.query),
  ];

  const localMarket = lookupLocalMarket(scope.category, scope.city);
  const tool = adapter as MarketResearchToolAdapter | undefined;

  const [categoryChunks, regionChunks, consumerChunks, rivalChunks, vertical] =
    await Promise.all([
      Promise.all(q.category.map((query) => runQuery(adapter, query, 3, scope.city))),
      Promise.all(q.region.map((query) => runQuery(adapter, query, 3, scope.city))),
      Promise.all(q.consumer.map((query) => runQuery(adapter, query, 3, scope.city))),
      Promise.all(
        q.rival.map(async (r) => ({
          name: r.name,
          hits: await runQuery(adapter, r.query, 3, scope.city),
        })),
      ),
      collectVerticalSignals(tool, {
        city: scope.city,
        category: scope.category,
        rivals: scope.rivals,
      }),
    ]);

  const categorySources = categoryChunks.flat().slice(0, 8);
  const regionSources = regionChunks.flat().slice(0, 8);

  const at = nowIso();
  const verticalCompetitor = vertical.hits
    .filter((h) => h.pillar === "competitor")
    .map(
      (h): CrawlSourceHit => ({
        title: h.title,
        url: h.url,
        snippet: h.snippet,
        source: h.source,
        query: h.query,
        capturedAt: at,
      }),
    );
  const verticalUser = vertical.hits
    .filter((h) => h.pillar === "store_user")
    .map(
      (h): CrawlSourceHit => ({
        title: h.title,
        url: h.url,
        snippet: h.snippet,
        source: h.source,
        query: h.query,
        capturedAt: at,
      }),
    );

  const consumerSources = [...consumerChunks.flat(), ...verticalUser].slice(0, 10);

  const competitorsRaw: CompetitorIntel[] = rivalChunks.map((r) =>
    synthesizeCompetitor(
      r.name,
      [
        ...r.hits,
        ...verticalCompetitor.filter(
          (h) => h.query.includes(r.name) || h.title.includes(r.name),
        ),
      ],
      localMarket,
    ),
  );

  // 把本地库领导者补进竞对（若简报未列）
  if (localMarket) {
    for (const leader of localMarket.leaders.slice(0, 3)) {
      if (
        competitorsRaw.some(
          (c) =>
            c.name.includes(leader.brand) || leader.brand.includes(c.name),
        )
      ) {
        continue;
      }
      const summary = `区域情报库补录：${leader.position}${leader.note ? ` · ${leader.note}` : ""}`;
      competitorsRaw.push({
        name: leader.brand,
        mentalPosition: leader.position,
        evidenceSentence: summary,
        summary,
        signals: [
          leader.position,
          leader.budget ? `资源${leader.budget}` : "",
        ].filter(Boolean),
        sources: [],
        dataQuality: "local",
      });
    }
  }

  const whitespaceCandidates = [
    ...(localMarket?.whiteSpots || []),
  ];
  if (!whitespaceCandidates.length) {
    whitespaceCandidates.push(
      `${scope.who}的「${scope.need}」场景心智`,
      `${scope.category}中尚未被清晰占领的差异联想`,
    );
  }

  const competitors = hardenAllCompetitors(
    competitorsRaw,
    whitespaceCandidates,
  );

  const liveCount =
    categorySources.length +
    regionSources.length +
    consumerSources.length +
    competitors.reduce((n, c) => n + c.sources.length, 0);

  const mode: ResearchCollection["mode"] =
    liveCount > 0 && localMarket
      ? "hybrid"
      : liveCount > 0
        ? "live_crawl"
        : "local_intel";

  const base: ResearchCollection = {
    scope,
    collectedAt: nowIso(),
    mode,
    queries: allQueries,
    categorySources,
    regionSources,
    consumerSources,
    competitors,
    localMarket,
    whitespaceCandidates,
    saturationNote: localMarket
      ? `饱和度 ${localMarket.saturation} · 阶段 ${localMarket.stage}`
      : "饱和度待本地校准（联网摘要见正文）",
    priceBandNote: localMarket
      ? `参考客单带 ${localMarket.priceBand[0]}–${localMarket.priceBand[1]} 元`
      : "客单带需结合店访与公开检索校准",
    rawNotes: [
      `采集模式：${mode}`,
      `查询 ${allQueries.length} 条`,
      `公开命中 ${liveCount} 条`,
      ...vertical.notes,
      localMarket?.note || "",
    ].filter(Boolean),
  };

  return {
    ...base,
    pillarCoverage: evaluateResearchPillars({ collection: base }),
  };
}
