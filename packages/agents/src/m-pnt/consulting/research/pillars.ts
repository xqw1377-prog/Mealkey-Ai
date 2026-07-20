/**
 * 市场调研三柱 — 区域 / 竞对 / 用户门店
 *
 * 每柱必须有可追溯工具来源（或店访一手），才能算「信息收集完成」。
 * 本地情报库只能辅助，不能单独过门禁。
 */
import type { MarketResearchPack } from "../journey-types";

type CrawlSourceHit = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  query: string;
  capturedAt: string;
};

type CompetitorIntel = {
  name: string;
  sources: CrawlSourceHit[];
  dataQuality: "live" | "local" | "inferred";
};

type CollectionSlice = {
  regionSources: CrawlSourceHit[];
  categorySources: CrawlSourceHit[];
  consumerSources: CrawlSourceHit[];
  competitors: CompetitorIntel[];
  mode: "live_crawl" | "local_intel" | "hybrid";
};

export type ResearchPillarId = "region" | "competitor" | "store_user";

export type ResearchPillarStatus = {
  id: ResearchPillarId;
  label: string;
  ok: boolean;
  requiredHits: number;
  hitCount: number;
  detail: string;
  /** 本柱代表性来源（最多 3） */
  sampleSources: Array<{ title: string; url: string; snippet: string }>;
};

export type ResearchPillarCoverage = {
  evaluatedAt: string;
  pillars: ResearchPillarStatus[];
  allOk: boolean;
  missing: string[];
  summary: string;
};

export const RESEARCH_PILLAR_META: Record<
  ResearchPillarId,
  { label: string; why: string; minHits: number }
> = {
  region: {
    label: "区域市场分析",
    why: "城市/商圈供需、密度、客单带必须来自外部数据。",
    minHits: 2,
  },
  competitor: {
    label: "竞对分析",
    why: "对手心智与证据句须可追溯，禁止占位名。",
    minHits: 2,
  },
  store_user: {
    label: "用户与门店分析",
    why: "场景/口碑/门店观察支撑洞察；可用联网口碑或店访补齐。",
    minHits: 2,
  },
};

function samples(hits: CrawlSourceHit[], n = 3) {
  return hits.slice(0, n).map((h) => ({
    title: h.title,
    url: h.url,
    snippet: h.snippet,
  }));
}

function liveCompetitorHits(competitors: CompetitorIntel[]): CrawlSourceHit[] {
  return competitors.flatMap((c) =>
    c.dataQuality === "live" || c.dataQuality === "local" ? c.sources : [],
  );
}

/**
 * 从采集结果评估三柱是否达标。
 * storeVisitFilled：店访回填数，可替代 store_user 联网命中。
 */
export function evaluateResearchPillars(input: {
  collection?: CollectionSlice | null;
  pack?: MarketResearchPack | null;
  storeVisitFilled?: number;
}): ResearchPillarCoverage {
  const collection = input.collection;
  const pack = input.pack;
  const visitFilled =
    input.storeVisitFilled ??
    (pack?.storeVisitPlan?.tasks || []).filter((t) => t.status === "filled")
      .length;

  // 优先用 pack 上已存的结构化字段回放
  const regionHits: CrawlSourceHit[] =
    collection?.regionSources ||
    (pack?.sources || [])
      .filter((s) =>
        /区域|商圈|城市|市场|密度|客流|客单价/i.test(
          `${s.query || ""} ${s.title || ""}`,
        ),
      )
      .map((s) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        source: s.source,
        query: s.query || "",
        capturedAt: pack?.generatedAt || "",
      }));

  const categoryAsRegionBoost = (collection?.categorySources || []).filter((s) =>
    /市场|格局|趋势|规模/i.test(`${s.query} ${s.title}`),
  );

  const competitorHits: CrawlSourceHit[] = collection
    ? liveCompetitorHits(collection.competitors)
    : (pack?.sources || [])
        .filter((s) =>
          /竞|对手|点评|美团|门店|品牌|口碑/i.test(
            `${s.query || ""} ${s.title || ""}`,
          ),
        )
        .map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          source: s.source,
          query: s.query || "",
          capturedAt: pack?.generatedAt || "",
        }));

  const liveRivalCount = collection
    ? collection.competitors.filter(
        (c) => c.dataQuality === "live" && c.sources.length > 0,
      ).length
    : (pack?.competitorBriefs || []).filter((c) => c.dataQuality === "live")
        .length;

  const userHits: CrawlSourceHit[] =
    collection?.consumerSources ||
    (pack?.sources || [])
      .filter((s) =>
        /用户|客人|评价|口碑|需求|场景|偏好/i.test(
          `${s.query || ""} ${s.title || ""}`,
        ),
      )
      .map((s) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        source: s.source,
        query: s.query || "",
        capturedAt: pack?.generatedAt || "",
      }));

  const mode = collection?.mode || pack?.collectionMode;
  const modeLive = mode === "live_crawl" || mode === "hybrid";

  const regionCount = regionHits.length + categoryAsRegionBoost.length;
  const competitorCount = Math.max(competitorHits.length, liveRivalCount);
  const userCount = userHits.length + (visitFilled > 0 ? 2 : 0);

  const pillars: ResearchPillarStatus[] = [
    {
      id: "region",
      label: RESEARCH_PILLAR_META.region.label,
      requiredHits: RESEARCH_PILLAR_META.region.minHits,
      hitCount: regionCount,
      ok: modeLive && regionCount >= RESEARCH_PILLAR_META.region.minHits,
      detail: !modeLive
        ? "未进入联网采集模式"
        : regionCount >= 2
          ? `区域/市场来源 ${regionCount} 条`
          : `区域来源仅 ${regionCount} 条，至少需要 ${RESEARCH_PILLAR_META.region.minHits}`,
      sampleSources: samples([...regionHits, ...categoryAsRegionBoost]),
    },
    {
      id: "competitor",
      label: RESEARCH_PILLAR_META.competitor.label,
      requiredHits: RESEARCH_PILLAR_META.competitor.minHits,
      hitCount: competitorCount,
      ok:
        modeLive &&
        competitorCount >= RESEARCH_PILLAR_META.competitor.minHits &&
        liveRivalCount + competitorHits.length > 0,
      detail: !modeLive
        ? "未进入联网采集模式"
        : liveRivalCount > 0
          ? `联网竞对 ${liveRivalCount} 家 · 命中 ${competitorHits.length}`
          : `竞对可追溯命中不足（${competitorCount}），需重跑或店访`,
      sampleSources: samples(competitorHits),
    },
    {
      id: "store_user",
      label: RESEARCH_PILLAR_META.store_user.label,
      requiredHits: RESEARCH_PILLAR_META.store_user.minHits,
      hitCount: userCount,
      ok:
        (modeLive && userHits.length >= RESEARCH_PILLAR_META.store_user.minHits) ||
        visitFilled >= 1,
      detail: visitFilled >= 1
        ? `已店访回填 ${visitFilled} 家`
        : userHits.length >= 2
          ? `用户/口碑来源 ${userHits.length} 条`
          : `用户/门店信号不足（联网 ${userHits.length} · 店访 ${visitFilled}）`,
      sampleSources: samples(userHits),
    },
  ];

  const missing = pillars.filter((p) => !p.ok).map((p) => p.label);
  const allOk = missing.length === 0;

  return {
    evaluatedAt: new Date().toISOString(),
    pillars,
    allOk,
    missing,
    summary: allOk
      ? "三柱采集已齐（区域 / 竞对 / 用户门店）。"
      : `三柱未齐：缺 ${missing.join("、")}`,
  };
}
