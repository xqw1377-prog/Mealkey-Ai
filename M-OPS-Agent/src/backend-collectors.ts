import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import type { DiagnosisEvidenceItem, DiagnosisFact } from "@mealkey/m-ops-diag";
import type {
  ExternalSourceName,
  RestaurantProfile,
} from "./backend-types";
import { createLogger } from "./logger";

const log = createLogger("collectors");

/**
 * 采集模式：
 * - synthetic（默认）：确定性 fixture，仅用于本地演示 / 自测
 * - live：走可注册的真实适配器；未注册时跳过并记 warn，不伪装成真实外采
 */
export type CollectorMode = "synthetic" | "live";

export type ExternalSourceAdapter = {
  source: ExternalSourceName;
  mode: CollectorMode;
  collect(input: {
    profile: RestaurantProfile;
    asOf: string;
  }): {
    evidence: DiagnosisEvidenceItem[];
    facts?: DiagnosisFact[];
  };
};

function getCollectorMode(): CollectorMode {
  const raw = (process.env.M_OPS_COLLECTOR_MODE || "synthetic").trim().toLowerCase();
  return raw === "live" ? "live" : "synthetic";
}

function stableNumber(seed: string, min: number, max: number) {
  const hash = Array.from(seed).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return min + (hash % (max - min + 1));
}

function mkEvidence(
  source: string,
  restaurantId: string,
  asOf: string,
  items: Array<{
    claim: string;
    sentiment: "positive" | "neutral" | "negative";
    theme: string;
  }>,
): DiagnosisEvidenceItem[] {
  return items.map((item, index) => ({
    id: `${source}-${restaurantId}-${index + 1}-${asOf.slice(0, 10)}`,
    source,
    claim: item.claim,
    sentiment: item.sentiment,
    theme: item.theme,
    observedAt: asOf,
    kind: "external_evidence",
  }));
}

const dianpingSynthetic: ExternalSourceAdapter = {
  source: "dianping",
  mode: "synthetic",
  collect({ profile, asOf }) {
    const queue = stableNumber(profile.restaurantId, 20, 45);
    const signature =
      profile.tags?.find((tag) => tag && !/聚餐|高峰|居民|打卡|接待|复购|外卖/.test(tag)) ||
      profile.category ||
      "招牌菜";
    const pain =
      profile.manualFacts?.find((item) => item.kind === "owner_pain")?.claim ||
      `周末晚餐等位接近 ${queue} 分钟，上菜速度偏慢`;
    const praise =
      profile.manualFacts?.find((item) => item.kind === "owner_praise")?.claim ||
      `${profile.brand} 味道稳定，${signature}依然有记忆点`;
    return {
      evidence: mkEvidence("dianping", profile.restaurantId, asOf, [
        {
          claim: praise,
          sentiment: "positive",
          theme: "product",
        },
        {
          claim: pain.includes("等") || pain.includes("慢") ? pain : `高峰时：${pain}`,
          sentiment: "negative",
          theme: "wait",
        },
        {
          claim: `适合${profile.tags?.find((t) => /聚餐|打卡|接待|复购/.test(t)) || "朋友聚餐"}，但高峰服务响应偏慢`,
          sentiment: "negative",
          theme: "service",
        },
        {
          claim:
            profile.priceRange
              ? `有人觉得人均 ${profile.priceRange} 元档偏贵，性价比一般`
              : "有人觉得价格偏贵，性价比一般",
          sentiment: "negative",
          theme: "price",
        },
        {
          claim: `${profile.brand} 环境还行，适合聚餐拍照`,
          sentiment: "positive",
          theme: "environment",
        },
      ]),
      facts: [
        {
          kind: "review_count_7d",
          claim: `近7天新增点评 ${stableNumber(profile.brand, 12, 38)} 条`,
          asOf,
        },
        {
          kind: "collector_mode",
          claim: "synthetic",
          asOf,
        },
        ...(profile.priceRange
          ? [
              {
                kind: "price_context",
                claim: `门店自报人均约 ${profile.priceRange} 元`,
                asOf,
              },
            ]
          : []),
      ],
    };
  },
};

const xhsSynthetic: ExternalSourceAdapter = {
  source: "xiaohongshu",
  mode: "synthetic",
  collect({ profile, asOf }) {
    const guest =
      profile.tags?.find((t) => /打卡|聚餐|接待|复购|居民|外卖/.test(t)) || "聚餐";
    const signature =
      profile.tags?.find((tag) => tag && !/聚餐|高峰|居民|打卡|接待|复购|外卖|午市|晚市|周末|夜宵/.test(tag)) ||
      profile.category ||
      "招牌";
    return {
      evidence: mkEvidence("xiaohongshu", profile.restaurantId, asOf, [
        {
          claim: `${profile.city || "本地"}笔记里，${profile.brand} 常被写成「${signature}」值得一试的${profile.category || "餐厅"}，客群偏${guest}`,
          sentiment: "positive",
          theme: "brand",
        },
        {
          claim: `内容里常出现“排队”“环境不错但是要等”，说明体验和心智同时存在`,
          sentiment: "neutral",
          theme: "wait",
        },
      ]),
      facts: [
        {
          kind: "xhs_mentions_30d",
          claim: `近30天小红书相关内容 ${stableNumber(profile.restaurantId + "x", 8, 22)} 篇`,
          asOf,
        },
      ],
    };
  },
};

const douyinSynthetic: ExternalSourceAdapter = {
  source: "douyin",
  mode: "synthetic",
  collect({ profile, asOf }) {
    return {
      evidence: mkEvidence("douyin", profile.restaurantId, asOf, [
        {
          claim: `${profile.brand} 的现场氛围和招牌菜更容易传播，但服务反馈容易拖后腿`,
          sentiment: "neutral",
          theme: "growth",
        },
        {
          claim: `评论里开始出现“适合拍照，不适合久等”的说法`,
          sentiment: "negative",
          theme: "wait",
        },
      ]),
      facts: [
        {
          kind: "douyin_heat",
          claim: `近7天抖音相关热视频 ${stableNumber(profile.restaurantId + "d", 2, 9)} 条`,
          asOf,
        },
      ],
    };
  },
};

const mapSynthetic: ExternalSourceAdapter = {
  source: "map",
  mode: "synthetic",
  collect({ profile, asOf }) {
    const sameCategory = stableNumber(profile.restaurantId + "m", 9, 18);
    const lowerPrice = Math.max(2, Math.floor(sameCategory / 3));
    const price = profile.priceRange ? `人均约 ${profile.priceRange} 元档` : "同档客单";
    const where =
      profile.address ||
      `${profile.city || "本地"}${profile.district || ""}`;
    return {
      evidence: mkEvidence("map", profile.restaurantId, asOf, [
        {
          claim: `${where} 附近 3 公里内同类 ${profile.category || "餐厅"}约 ${sameCategory} 家，低客单竞争约 ${lowerPrice} 家（对照本店${price}）`,
          sentiment: "neutral",
          theme: "competition",
        },
        {
          claim: `最近一月附近新增 ${stableNumber(profile.restaurantId + "new", 1, 4)} 家同类门店，竞争压力抬升`,
          sentiment: "negative",
          theme: "competition",
        },
      ]),
      facts: [
        {
          kind: "competition_density",
          claim: `3公里同类门店 ${sameCategory} 家`,
          asOf,
        },
      ],
    };
  },
};

const manualAdapter: ExternalSourceAdapter = {
  source: "manual",
  mode: "synthetic",
  collect({ profile, asOf }) {
    return {
      evidence: (profile.manualEvidence || []).map((item, index) => ({
        id: item.id || `manual-${profile.restaurantId}-${index + 1}`,
        source: item.source || "owner",
        claim: item.claim,
        sentiment: item.sentiment,
        theme: item.theme,
        observedAt: item.observedAt || asOf,
        kind: "owner_fact",
      })),
      facts:
        profile.manualFacts?.map((item) => ({
          kind: item.kind,
          claim: item.claim,
          asOf: item.asOf || asOf,
        })) || [],
    };
  },
};

const syntheticAdapters: Record<ExternalSourceName, ExternalSourceAdapter> = {
  dianping: dianpingSynthetic,
  meituan: dianpingSynthetic,
  xiaohongshu: xhsSynthetic,
  douyin: douyinSynthetic,
  map: mapSynthetic,
  manual: manualAdapter,
};

/** 可注册的 live 适配器（默认空；由集成方注入真实外采） */
const liveAdapters = new Map<ExternalSourceName, ExternalSourceAdapter>();

export function registerLiveCollector(adapter: ExternalSourceAdapter) {
  if (adapter.mode !== "live") {
    throw new Error(`registerLiveCollector 需要 mode=live，收到 ${adapter.mode}`);
  }
  liveAdapters.set(adapter.source, adapter);
}

export function listRegisteredLiveCollectors(): ExternalSourceName[] {
  return Array.from(liveAdapters.keys());
}

export function collectRestaurantIntelligence(input: {
  profile: RestaurantProfile;
  asOf?: string;
  sources?: ExternalSourceName[];
  mode?: CollectorMode;
}) {
  const asOf = input.asOf || new Date().toISOString();
  const mode = input.mode || getCollectorMode();
  const sources = input.sources?.length
    ? input.sources
    : (["dianping", "xiaohongshu", "douyin", "map", "manual"] as ExternalSourceName[]);

  const evidence: DiagnosisEvidenceItem[] = [];
  const facts: DiagnosisFact[] = [
    {
      kind: "collector_mode",
      claim: mode,
      asOf,
    },
  ];

  for (const source of sources) {
    if (mode === "live") {
      const live = liveAdapters.get(source);
      if (!live) {
        if (source === "manual") {
          const payload = manualAdapter.collect({ profile: input.profile, asOf });
          evidence.push(...payload.evidence);
          if (payload.facts?.length) facts.push(...payload.facts);
        } else {
          log("warn", `live 模式未注册适配器，已跳过 source=${source}`);
        }
        continue;
      }
      const payload = live.collect({ profile: input.profile, asOf });
      evidence.push(...payload.evidence);
      if (payload.facts?.length) facts.push(...payload.facts);
      continue;
    }

    const adapter = syntheticAdapters[source];
    if (!adapter) continue;
    const payload = adapter.collect({
      profile: input.profile,
      asOf,
    });
    evidence.push(...payload.evidence);
    if (payload.facts?.length) {
      facts.push(...payload.facts);
    }
  }

  return {
    asOf,
    mode,
    evidence,
    facts,
  };
}

export function buildContextFromProfile(input: {
  profile: RestaurantProfile;
  asOf?: string;
  sources?: ExternalSourceName[];
  mode?: CollectorMode;
}): ContextPackageV1 {
  const collected = collectRestaurantIntelligence(input);
  return {
    restaurantId: input.profile.restaurantId,
    asOf: collected.asOf,
    scopesGranted: ["basic", "review", "market"],
    scopesDenied: [],
    identity: {
      brand: input.profile.brand,
      storeName: input.profile.storeName,
      city: input.profile.city,
      district: input.profile.district,
      category: input.profile.category,
    },
    facts: collected.facts.map((item) => ({
      kind: item.kind,
      claim: item.claim,
      asOf: item.asOf,
    })),
    evidence: collected.evidence.map((item) => ({
      id: item.id || `ctx-${input.profile.restaurantId}-${item.source}-${item.theme || "misc"}`,
      source: item.source,
      claim: item.claim,
      sentiment: item.sentiment,
      theme: item.theme,
      observedAt: item.observedAt,
    })),
  };
}
