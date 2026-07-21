/**
 * 公开检索 → RestaurantEvidence（经 M-INTEL 锚点后使用）
 * 有 SEARXNG/SERPAPI 时走真实源；否则尝试 DuckDuckGo/Bing HTML 降级。
 * 禁止编造星级/百分比；无结果则诚实空返回。
 */

import { getWebSearch } from "@mealkey/knowledge-engine";
import type { RestaurantEvidenceV1 } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import { inferAspectFromContent } from "./customer-perception";
import { isUsableBusinessEvidenceSnippet } from "./evidence-quality";

function newEvId(): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `ev_live_${uuid.slice(0, 10)}`;
}

function inferSentiment(
  text: string,
): RestaurantEvidenceV1["sentiment"] {
  if (/难吃|差评|失望|态度差|等位太久|坑|踩雷|不推荐|后悔/.test(text)) {
    return "negative";
  }
  if (/好吃|推荐|不错|值得|满意|惊艳|锅气|性价比高|氛围好/.test(text)) {
    return "positive";
  }
  return "neutral";
}

function sourceLabel(provider: string | null | undefined, title: string): string {
  if (/大众点评|dianping/i.test(title)) return "大众点评·公开检索";
  if (/小红书|xiaohongshu|rednote/i.test(title)) return "小红书·公开检索";
  if (/美团|meituan/i.test(title)) return "美团·公开检索";
  if (/抖音|douyin/i.test(title)) return "抖音·公开检索";
  if (provider === "serpapi") return "公开检索·SerpAPI";
  if (provider === "searxng") return "公开检索·SearXNG";
  return "公开检索";
}

export type LiveMarketEvidenceResult = {
  evidences: RestaurantEvidenceV1[];
  hitProvider: string | null;
  tried: string[];
  notes: string[];
};

/**
 * 按品牌+城市公开检索口碑与商圈线索。
 * 超时/无源时返回空证据 + notes，调用方不得打假勾。
 */
export async function fetchLiveMarketEvidence(input: {
  brandName: string;
  city: string;
  district?: string;
  category?: string;
  storeName?: string;
  timeoutMs?: number;
}): Promise<LiveMarketEvidenceResult> {
  const brand = input.brandName.trim();
  const city = input.city.trim();
  if (!brand || !city) {
    return {
      evidences: [],
      hitProvider: null,
      tried: [],
      notes: ["缺品牌或城市，未执行公开检索"],
    };
  }

  const geo = [city, input.district?.trim()].filter(Boolean).join(" ");
  const cat = input.category?.trim() || "餐饮";
  const store = input.storeName?.trim();
  const queries = [
    `${brand} ${geo} 评价 口碑`,
    `${brand} ${geo} 大众点评`,
    `${geo} ${cat} 商圈 竞争`,
  ];
  if (store && store !== brand) {
    queries.unshift(`${store} ${geo} 评价`);
  }

  const search = getWebSearch();
  const timeoutMs = input.timeoutMs ?? 8_000;
  const notes: string[] = [];
  const evidences: RestaurantEvidenceV1[] = [];
  const seen = new Set<string>();
  let hitProvider: string | null = null;
  let tried: string[] = [];

  for (const query of queries.slice(0, 3)) {
    try {
      const results = await Promise.race([
        search.search({ query, limit: 5 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeoutMs),
        ),
      ]);
      const attempt = search.getLastAttempt();
      tried = [...new Set([...tried, ...(attempt?.tried || [])])];
      if (attempt?.hitProvider) hitProvider = attempt.hitProvider;

      for (const r of results) {
        const snippet = String(r.snippet || "").trim();
        const title = String(r.title || "").trim();
        const content = (snippet || title).slice(0, 280);
        if (!isUsableBusinessEvidenceSnippet(content)) continue;
        // 标题像百科、正文才像评价时，仍要求合并文本可过门禁
        if (
          !isUsableBusinessEvidenceSnippet(`${title} ${snippet}`.slice(0, 280))
        ) {
          continue;
        }
        const key = content.slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);

        const sentiment = inferSentiment(`${title} ${snippet}`);
        const aspect = inferAspectFromContent(`${title} ${snippet}`);
        const isMarket =
          /商圈|竞争|密度|周边|同类|新开/.test(`${title} ${snippet}`);

        evidences.push({
          schemaVersion: 1,
          id: newEvId(),
          source: isMarket
            ? "地图·公开检索"
            : sourceLabel(hitProvider, `${title} ${r.url || ""}`),
          content,
          sentiment,
          aspect,
          keyword: aspect,
          signal: isMarket ? "market_scan" : "review_signal",
          confidence: hitProvider ? 0.62 : 0.48,
          observedAt: new Date().toISOString(),
        });
      }
    } catch {
      notes.push(`公开检索超时或失败：${query.slice(0, 24)}`);
    }
  }

  if (evidences.length === 0) {
    notes.push(
      tried.length
        ? `已尝试 ${tried.join("/")}，暂无可用公开口碑片段`
        : "公开检索源未返回结果（可配置 SEARXNG_URL / SERPAPI_KEY）",
    );
  }

  return {
    evidences: evidences.slice(0, 10),
    hitProvider,
    tried,
    notes: [...new Set(notes)].slice(0, 4),
  };
}
