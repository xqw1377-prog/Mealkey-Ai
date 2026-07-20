/**
 * External Intelligence Collector（R2）
 * 经 M-INTEL 锚点门禁采集市场证据；无源可降级，禁止打假勾。
 */

import {
  filterEvidenceByAnchorGate,
  queryMintelRegional,
} from "@/server/founder-layer/capability/m-intel/anchor-gate";
import type { BusinessIdentityV1 } from "@/server/founder-layer/contracts/business-identity";
import type { RestaurantEvidenceV1 } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";

/** profile 可选种子：适配器/手工注入的市场证据（非 Brain 事实） */
export const PROFILE_RIP_MARKET_EVIDENCE_KEY = "restaurantMarketEvidence" as const;

const MARKET_SOURCE_RE =
  /大众点评|小红书|美团|抖音|口碑|评价|地图|公开信息|竞品/;

export type ExternalCollectResult = {
  canClaimRegional: boolean;
  evidences: RestaurantEvidenceV1[];
  reviewIntelReady: boolean;
  feedbackIntelReady: boolean;
  marketScanReady: boolean;
  degradedNotes: string[];
  subjectLabel?: string;
};

function newEvId(): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `ev_mkt_${uuid.slice(0, 10)}`;
}

function asSentiment(
  raw: unknown,
): RestaurantEvidenceV1["sentiment"] {
  if (raw === "positive" || raw === "negative" || raw === "neutral") return raw;
  return "neutral";
}

function normalizeEvidenceRow(
  row: Record<string, unknown>,
  fallbackSource: string,
): RestaurantEvidenceV1 | null {
  const content = String(row.content || row.summary || "").trim();
  if (!content) return null;
  const confidenceRaw = Number(row.confidence ?? row.reliability ?? 0.6);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(1, Math.max(0, confidenceRaw))
    : 0.6;
  return {
    schemaVersion: 1,
    id: String(row.id || newEvId()),
    source: String(row.source || fallbackSource).slice(0, 40),
    content: content.slice(0, 280),
    sentiment: asSentiment(row.sentiment),
    keyword:
      typeof row.keyword === "string" ? row.keyword.slice(0, 40) : undefined,
    aspect:
      typeof row.aspect === "string" ? row.aspect.slice(0, 40) : undefined,
    signal:
      typeof row.signal === "string" ? row.signal.slice(0, 40) : undefined,
    confidence,
    observedAt:
      typeof row.observedAt === "string"
        ? row.observedAt
        : typeof row.createdAt === "string"
          ? row.createdAt
          : undefined,
    relatedAspect:
      typeof row.relatedAspect === "string"
        ? row.relatedAspect.slice(0, 40)
        : undefined,
  };
}

function readSeedEvidence(
  profile: Record<string, unknown> | null | undefined,
): RestaurantEvidenceV1[] {
  const raw = profile?.[PROFILE_RIP_MARKET_EVIDENCE_KEY];
  if (!Array.isArray(raw)) return [];
  const out: RestaurantEvidenceV1[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const normalized = normalizeEvidenceRow(
      item as Record<string, unknown>,
      "市场证据",
    );
    if (normalized) out.push(normalized);
  }
  return out;
}

/** 从 evidenceLedger 保守抽取「像外部口碑」的行 */
function harvestLedgerEvidence(
  profile: Record<string, unknown> | null | undefined,
): RestaurantEvidenceV1[] {
  const ledger = profile?.evidenceLedger;
  if (!Array.isArray(ledger)) return [];
  const out: RestaurantEvidenceV1[] = [];
  for (const row of ledger) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const source = String(r.source || "");
    const domain = String(r.domain || "");
    const type = String(r.type || "");
    const content = String(r.content || "");
    const looksMarket =
      MARKET_SOURCE_RE.test(source) ||
      MARKET_SOURCE_RE.test(content) ||
      /consumer|review|口碑|评价/.test(domain) ||
      /consumer|review|口碑|评价/.test(type);
    if (!looksMarket) continue;
    const normalized = normalizeEvidenceRow(r, source || "公开口碑");
    if (normalized) out.push(normalized);
  }
  return out;
}

/**
 * 采集外部市场证据。
 * - 无 brand+city：不产出区域/口碑结论，明示降级
 * - 有锚点但无源：仍可前进，reviewIntelReady=false
 * - 禁止编造点评星级/百分比
 */
export function collectExternalIntelligence(input: {
  identity: BusinessIdentityV1;
  profile?: Record<string, unknown> | null;
  /** 测试/适配器注入；生产默认勿传假数据 */
  injectedEvidence?: RestaurantEvidenceV1[];
}): ExternalCollectResult {
  const gate = queryMintelRegional({
    brandName: input.identity.brandName,
    city: input.identity.city,
    storeName: input.identity.objectName,
    topic: "餐厅口碑与区域市场",
  });

  const degradedNotes: string[] = [];

  if (!gate.ok) {
    return {
      canClaimRegional: false,
      evidences: [],
      reviewIntelReady: false,
      feedbackIntelReady: false,
      marketScanReady: false,
      degradedNotes: [
        "品牌或位置不完整，未宣称网络评价分析",
        "外部评价采集未执行（缺 M-INTEL 锚点）",
      ],
    };
  }

  const pooled = [
    ...(input.injectedEvidence || []),
    ...readSeedEvidence(input.profile),
    ...harvestLedgerEvidence(input.profile),
  ];

  const { kept, rejected } = filterEvidenceByAnchorGate(
    pooled,
    gate.canClaimRegional,
  );
  if (rejected.length > 0) {
    degradedNotes.push(
      `已剔除 ${rejected.length} 条无锚点不可信的区域量化话术`,
    );
  }

  // 去重（content+source）
  const seen = new Set<string>();
  const evidences: RestaurantEvidenceV1[] = [];
  for (const e of kept) {
    const key = `${e.source}::${e.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    evidences.push(e);
  }

  const reviewIntelReady = evidences.some(
    (e) =>
      MARKET_SOURCE_RE.test(e.source) ||
      Boolean(e.aspect) ||
      e.sentiment !== "neutral",
  );
  const marketScanReady = evidences.some((e) =>
    /竞品|商圈|地图|市场/.test(`${e.source}${e.content}`),
  );

  if (evidences.length === 0) {
    degradedNotes.push(
      "锚点已就绪，但外部评价源尚未接入或暂无可用证据",
    );
  } else if (!reviewIntelReady) {
    degradedNotes.push("已挂载部分市场线索，口碑维度仍不足");
  }

  return {
    canClaimRegional: true,
    evidences,
    reviewIntelReady,
    feedbackIntelReady: false,
    marketScanReady,
    degradedNotes,
    subjectLabel: gate.subjectLabel,
  };
}
