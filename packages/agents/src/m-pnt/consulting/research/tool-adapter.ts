/**
 * 市场调研工具适配层
 *
 * - search：公开网页检索（现网主路径）
 * - fetchSite：垂直站点/授权数据管道（点评/美团等）— 必须合规接入，默认空实现
 *
 * 产品可称「抓取归集」；实现禁止违规破解。
 */

export type SiteFetchRequest = {
  /** dianping | meituan | generic */
  site: "dianping" | "meituan" | "generic";
  city: string;
  keyword: string;
  rivalName?: string;
  limit?: number;
};

export type SiteFetchHit = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  /** 结构化信号（可选） */
  signals?: string[];
};

export type MarketResearchToolAdapter = {
  search(input: {
    query: string;
    limit?: number;
    region?: string;
  }): Promise<
    Array<{ title: string; url: string; snippet: string; source: string }>
  >;
  /**
   * 垂直站点/授权管道。未配置时返回 [] 并在 notes 说明原因。
   */
  fetchSite?(req: SiteFetchRequest): Promise<SiteFetchHit[]>;
  /** 适配器能力说明（审计用） */
  capabilities?: {
    webSearch: boolean;
    dianping: boolean;
    meituan: boolean;
  };
};

/** 仅包装 search 的轻量适配器 */
export function asToolAdapter(
  search: MarketResearchToolAdapter["search"],
  caps?: MarketResearchToolAdapter["capabilities"],
): MarketResearchToolAdapter {
  return {
    search,
    capabilities: {
      webSearch: true,
      dianping: false,
      meituan: false,
      ...caps,
    },
    async fetchSite() {
      // 合规占位：等待官方/授权数据管道，不在此做破解爬虫
      return [];
    },
  };
}

/**
 * 用工具适配器补强竞对/门店口碑查询（search + 可选 site）。
 */
export async function collectVerticalSignals(
  adapter: MarketResearchToolAdapter | undefined,
  input: {
    city: string;
    category: string;
    rivals: string[];
  },
): Promise<{
  hits: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    query: string;
    pillar: "competitor" | "store_user";
  }>;
  notes: string[];
}> {
  const notes: string[] = [];
  const hits: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    query: string;
    pillar: "competitor" | "store_user";
  }> = [];

  if (!adapter) {
    notes.push("无工具适配器：无法做垂直补强");
    return { hits, notes };
  }

  const caps = adapter.capabilities || {
    webSearch: true,
    dianping: false,
    meituan: false,
  };

  if (!caps.dianping && !caps.meituan) {
    notes.push(
      "点评/美团授权管道未接入：竞对与门店口碑仅依赖公开网页检索 + 店访",
    );
  }

  // 公开检索补强：每家竞对专门打「口碑/门店」查询
  for (const rival of input.rivals.slice(0, 3)) {
    const query = `${input.city} ${rival} ${input.category} 门店 口碑 客单价`;
    try {
      const rows = await adapter.search({
        query,
        limit: 3,
        region: input.city,
      });
      for (const r of rows || []) {
        if (!r.snippet && !r.title) continue;
        hits.push({
          title: r.title || rival,
          url: r.url || "",
          snippet: (r.snippet || "").slice(0, 280),
          source: r.source || "web",
          query,
          pillar: "competitor",
        });
      }
    } catch {
      notes.push(`检索失败：${rival}`);
    }

    if (adapter.fetchSite && (caps.dianping || caps.meituan)) {
      const site = caps.dianping ? "dianping" : "meituan";
      try {
        const siteHits = await adapter.fetchSite({
          site,
          city: input.city,
          keyword: input.category,
          rivalName: rival,
          limit: 3,
        });
        for (const h of siteHits) {
          hits.push({
            title: h.title,
            url: h.url,
            snippet: h.snippet,
            source: h.source,
            query: `${site}:${rival}`,
            pillar: "store_user",
          });
        }
      } catch {
        notes.push(`${site} 管道失败：${rival}`);
      }
    }
  }

  // 用户场景公开检索
  const userQuery = `${input.city} ${input.category} 消费者 评价 场景 聚会`;
  try {
    const rows = await adapter.search({
      query: userQuery,
      limit: 3,
      region: input.city,
    });
    for (const r of rows || []) {
      if (!r.snippet && !r.title) continue;
      hits.push({
        title: r.title || userQuery,
        url: r.url || "",
        snippet: (r.snippet || "").slice(0, 280),
        source: r.source || "web",
        query: userQuery,
        pillar: "store_user",
      });
    }
  } catch {
    notes.push("用户场景检索失败");
  }

  return { hits, notes };
}
