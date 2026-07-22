/**
 * Web Search — 联网搜索模块
 *
 * 优先级：SearXNG > SerpAPI > DuckDuckGo HTML > Bing HTML
 * 说明：DuckDuckGo Instant Answer API 对中文市场查询几乎恒为空，不能当主检索。
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebSearchOptions {
  query: string;
  limit?: number;
  region?: string;
  language?: string;
  timeRange?: string;
}

interface SearchProvider {
  name: string;
  search(options: WebSearchOptions): Promise<WebSearchResult[]>;
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapDuckDuckGoUrl(href: string): string {
  const normalized = href.startsWith("//") ? `https:${href}` : href;
  try {
    const u = new URL(normalized, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
  } catch {
    // ignore
  }
  return normalized;
}

/** 解析 DuckDuckGo HTML 结果页（供单测） */
export function parseDuckDuckGoHtml(
  html: string,
  limit = 5,
): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const linkRe =
    /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snipRe = /class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\//gi;
  const snippets = [...html.matchAll(snipRe)].map((m) => stripHtml(m[1] || ""));

  let idx = 0;
  for (const match of html.matchAll(linkRe)) {
    const url = unwrapDuckDuckGoUrl(match[1] || "");
    const title = stripHtml(match[2] || "");
    if (!title || !url || url.includes("duckduckgo.com/y.js")) continue;
    results.push({
      title: title.slice(0, 160),
      url,
      snippet: (snippets[idx] || title).slice(0, 400),
      source: "duckduckgo",
    });
    idx += 1;
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * 餐饮定位调研只收中文可读命中。
 * Bing/DDG 常回灌 Outlook/SAP/多语言无关页，禁止进入报告正文。
 */
const BLOCKED_HOST_RE =
  /(?:^|\.)(?:microsoft\.com|office\.com|live\.com|outlook\.com|hotmail\.com|msn\.com|sap\.com|support\.google\.com|translate\.google\.|hema\.nl|wikipedia\.org)(?:\/|$)/i;

export function isChineseFacingSearchHit(hit: {
  title?: string;
  snippet?: string;
  url?: string;
}): boolean {
  const title = (hit.title || "").trim();
  const snippet = (hit.snippet || "").trim();
  const text = `${title} ${snippet}`.replace(/\s+/g, " ").trim();
  if (text.length < 8) return false;

  if (hit.url) {
    try {
      const host = new URL(hit.url).hostname.toLowerCase();
      if (BLOCKED_HOST_RE.test(host)) return false;
      // 非中文维基路径
      if (host.includes("wikipedia.org") && !/\/zh/.test(hit.url)) return false;
    } catch {
      // ignore bad url
    }
  }

  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (cjk < 6) return false;
  // 英文/多语主导 → 剔除
  if (latin >= 24 && cjk / (cjk + latin) < 0.4) return false;
  if (latin >= 40 && cjk < 12) return false;
  return true;
}

export function filterChineseFacingSearchHits<T extends {
  title?: string;
  snippet?: string;
  url?: string;
}>(hits: T[], limit?: number): T[] {
  const kept = hits.filter((h) => isChineseFacingSearchHit(h));
  return typeof limit === "number" ? kept.slice(0, limit) : kept;
}

/** 解析 Bing HTML 结果页（供单测） */
export function parseBingHtml(html: string, limit = 5): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const blockRe =
    /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
  for (const block of html.matchAll(blockRe)) {
    const chunk = block[1] || "";
    const link = chunk.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const url = link[1] || "";
    const title = stripHtml(link[2] || "");
    const snipMatch =
      chunk.match(/class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
      chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = stripHtml(snipMatch?.[1] || title);
    if (!title || !url.startsWith("http")) continue;
    results.push({
      title: title.slice(0, 160),
      url,
      snippet: snippet.slice(0, 400),
      source: "bing",
    });
    if (results.length >= limit) break;
  }
  return results;
}

class DuckDuckGoHtmlProvider implements SearchProvider {
  readonly name = "duckduckgo";

  async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
    const { query, limit = 5 } = options;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
      const controller = new AbortController();
      // HTML 抓取易被墙/限流；短超时避免拖垮整次工具调研
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MealKey/1.0; +https://mealkey.local)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const html = await res.text();
      return parseDuckDuckGoHtml(html, limit);
    } catch {
      return [];
    }
  }
}

class BingHtmlProvider implements SearchProvider {
  readonly name = "bing";

  async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
    const { query, limit = 5 } = options;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-CN&mkt=zh-CN`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MealKey/1.0; +https://mealkey.local)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const html = await res.text();
      return parseBingHtml(html, limit);
    } catch {
      return [];
    }
  }
}

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

      const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/search?${params}`, {
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
        gl: region === "cn" ? "cn" : region,
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

export class WebSearchManager {
  private providers: SearchProvider[] = [];
  private lastAttempt: {
    query: string;
    tried: string[];
    hitProvider: string | null;
    at: string;
  } | null = null;

  constructor() {
    const searxngUrl =
      typeof process !== "undefined" ? process.env.SEARXNG_URL : undefined;
    const serpapiKey =
      typeof process !== "undefined" ? process.env.SERPAPI_KEY : undefined;

    if (searxngUrl) {
      this.providers.push(new SearXNGProvider(searxngUrl));
    }
    if (serpapiKey) {
      this.providers.push(new SerpAPIProvider(serpapiKey));
    }
    this.providers.push(new DuckDuckGoHtmlProvider());
    this.providers.push(new BingHtmlProvider());
  }

  async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
    const tried: string[] = [];
    const want = options.limit ?? 5;
    // 多取再滤中文，避免英文垃圾占满额度后报告空窗
    const fetchLimit = Math.min(20, Math.max(want * 3, want + 4));
    for (const provider of this.providers) {
      tried.push(provider.name);
      try {
        const results = await provider.search({ ...options, limit: fetchLimit });
        const filtered = filterChineseFacingSearchHits(results, want);
        if (filtered.length > 0) {
          this.lastAttempt = {
            query: options.query,
            tried,
            hitProvider: provider.name,
            at: new Date().toISOString(),
          };
          return filtered;
        }
      } catch {
        continue;
      }
    }
    this.lastAttempt = {
      query: options.query,
      tried,
      hitProvider: null,
      at: new Date().toISOString(),
    };
    return [];
  }

  getLastAttempt() {
    return this.lastAttempt;
  }

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

  get isAvailable(): boolean {
    return this.providers.length > 0;
  }

  get activeProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}

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
