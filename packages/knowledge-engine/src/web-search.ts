/**
 * Web Search — 联网搜索模块
 *
 * 为 MealKey 添加联网获取最新市场数据的能力。
 * 支持 Multiple 搜索引擎（SearXNG 优先 / SerpAPI 备选 / DuckDuckGo 免费降级）。
 *
 * 使用方式：
 * - 配置 SEARCH_API_URL / SEARCH_API_KEY 环境变量
 * - 默认可选 DuckDuckGo（零配置，免费但有限制）
 */

// ─── 搜索结果类型 ───

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebSearchOptions {
  query: string;
  limit?: number;
  region?: string;        // 搜索结果地域
  language?: string;       // 搜索语言
  timeRange?: string;      // d=天, w=周, m=月, y=年
}

interface SearchProvider {
  name: string;
  search(options: WebSearchOptions): Promise<WebSearchResult[]>;
}

// ═══════════════════════════════════════════════════════════════
// Provider 1: DuckDuckGo（零配置免费方案）
// ═══════════════════════════════════════════════════════════════

class DuckDuckGoProvider implements SearchProvider {
  readonly name = "duckduckgo";

  async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
    const { query, limit = 5 } = options;
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "MealKey/1.0 (Restaurant OS)" },
      });
      clearTimeout(timeout);

      if (!res.ok) return [];

      const data = (await res.json()) as {
        AbstractText?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Result?: string }>;
      };

      const results: WebSearchResult[] = [];

      if (data.AbstractText) {
        results.push({
          title: query,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: data.AbstractText.slice(0, 500),
          source: "duckduckgo",
        });
      }

      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, limit)) {
          const text = topic.Text || "";
          const firstUrl = topic.FirstURL || "";
          if (text && firstUrl) {
            results.push({
              title: text.split(" - ")[0] || text.slice(0, 60),
              url: firstUrl,
              snippet: text,
              source: "duckduckgo",
            });
          }
        }
      }

      return results.slice(0, limit);
    } catch {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Provider 2: SearXNG（自建，推荐）
// ═══════════════════════════════════════════════════════════════

class SearXNGProvider implements SearchProvider {
  readonly name = "searxng";

  constructor(
    private baseUrl: string,
    private apiKey?: string,
  ) {}

  async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
    const { query, limit = 5, language = "zh-CN" } = options;

    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        language,
        pageno: "1",
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const headers: Record<string, string> = {
        "User-Agent": "MealKey/1.0",
      };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeout);

      if (!res.ok) return [];

      const data = (await res.json()) as {
        results?: Array<{
          title?: string;
          url?: string;
          content?: string;
        }>;
      };

      return (data.results || []).slice(0, limit).map((r) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || "",
        source: "searxng",
      }));
    } catch {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Provider 3: SerpAPI（付费，最稳定）
// ═══════════════════════════════════════════════════════════════

class SerpAPIProvider implements SearchProvider {
  readonly name = "serpapi";

  constructor(private apiKey: string) {}

  async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
    const { query, limit = 5, region = "cn", language = "zh" } = options;

    try {
      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: "google",
        hl: language,
        gl: region,
        num: String(limit),
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `https://serpapi.com/search?${params.toString()}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      if (!res.ok) return [];

      const data = (await res.json()) as {
        organic_results?: Array<{
          title?: string;
          link?: string;
          snippet?: string;
        }>;
      };

      return (data.organic_results || []).slice(0, limit).map((r) => ({
        title: r.title || "",
        url: r.link || "",
        snippet: r.snippet || "",
        source: "serpapi",
      }));
    } catch {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 搜索管理器
// ═══════════════════════════════════════════════════════════════

export class WebSearchManager {
  private providers: SearchProvider[] = [];

  constructor() {
    // 尝试构建可用的搜索引擎
    const searxngUrl = typeof process !== "undefined" ? process.env.SEARXNG_URL : undefined;
    const serpapiKey = typeof process !== "undefined" ? process.env.SERPAPI_KEY : undefined;

    // 优先级：SearXNG > SerpAPI > DuckDuckGo
    if (searxngUrl) {
      this.providers.push(new SearXNGProvider(searxngUrl));
    }
    if (serpapiKey) {
      this.providers.push(new SerpAPIProvider(serpapiKey));
    }
    // DuckDuckGo 作为零配置兜底
    this.providers.push(new DuckDuckGoProvider());
  }

  /**
   * 搜索互联网并返回结构化结果
   */
  async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
    for (const provider of this.providers) {
      try {
        const results = await provider.search(options);
        if (results.length > 0) return results;
      } catch {
        // 当前 provider 失败，尝试下一个
        continue;
      }
    }
    return [];
  }

  /**
   * 搜索特定餐饮市场数据
   */
  async searchMarketData(
    category: string,
    city?: string,
  ): Promise<{ summary: string; sources: WebSearchResult[] }> {
    const queries: string[] = [];

    if (city && category) {
      queries.push(`${city} ${category} 市场 2025`);
      queries.push(`${city} ${category} 竞争分析`);
    }
    queries.push(`${category} 餐饮行业 趋势 2025`);
    queries.push(`${category} 品类 市场规模 增长率`);

    const allResults: WebSearchResult[] = [];
    const seen = new Set<string>();

    for (const q of queries) {
      const results = await this.search({ query: q, limit: 3 });
      for (const r of results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          allResults.push(r);
        }
      }
      if (allResults.length >= 10) break;
    }

    const summary = allResults
      .map((r) => `- ${r.snippet} ([${r.title}](${r.url}))`)
      .join("\n");

    return {
      summary: summary || "未找到相关市场数据，建议补充更多信息。",
      sources: allResults,
    };
  }

  /**
   * 搜索品牌/门店评价
   */
  async searchBrandReputation(brandName: string): Promise<WebSearchResult[]> {
    const queries = [
      `${brandName} 评价 口碑`,
      `${brandName} 大众点评`,
      `${brandName} 负面新闻`,
    ];

    const allResults: WebSearchResult[] = [];
    const seen = new Set<string>();

    for (const q of queries) {
      const results = await this.search({ query: q, limit: 3 });
      for (const r of results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          allResults.push(r);
        }
      }
    }

    return allResults;
  }

  /**
   * 检查是否有任何 provider 可用
   */
  get isAvailable(): boolean {
    return this.providers.length > 0;
  }

  /**
   * 获取当前启用的 provider 列表
   */
  get activeProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}

// ─── 全局单例 ───

let globalWebSearch: WebSearchManager | null = null;

export function getWebSearch(): WebSearchManager {
  if (!globalWebSearch) {
    globalWebSearch = new WebSearchManager();
  }
  return globalWebSearch;
}

export function resetWebSearch(): void {
  globalWebSearch = null;
}
