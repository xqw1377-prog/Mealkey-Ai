/**
 * M-MKT 市场情报 — 一手证据账本
 *
 * 市场机会判断不可靠「我觉得」——必须靠可引用事实。
 * 事实类型：竞品数据、用户调研、渠道验证、市场趋势。
 * 对标 M-PNT evidence-ledger-engine.ts。
 */

export type MarketFactSourceType =
  | "founder_interview"    // 创始人陈述
  | "competitor_visit"     // 竞品探店/调研
  | "user_interview"       // 用户访谈
  | "channel_data"         // 渠道/平台数据
  | "industry_report"      // 行业报告
  | "sales_note"           // 经营/销售笔记
  | "city_data"            // 城市数据
  | "other";

export type MarketFactStage =
  | "MARKET_SCAN"          // 市场扫描
  | "COMPETITOR_ANALYSIS"  // 竞争分析
  | "USER_RESEARCH"        // 用户研究
  | "CHANNEL_VERIFICATION" // 渠道验证
  | "ENTRY_PLAN";          // 进入方案

export type MarketFactStrength = "strong" | "moderate" | "weak";

export interface MarketPrimaryFact {
  factId: string;
  claim: string;
  sourceType: MarketFactSourceType;
  relatedStage: MarketFactStage;
  strength: MarketFactStrength;
  capturedAt: string;
  capturedBy?: string;
  tags?: string[];
  verificationStatus?: "verified" | "unverified";
}

export interface MarketEvidenceLedger {
  ledgerId: string;
  facts: MarketPrimaryFact[];
  updatedAt: string;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const MARKET_FACT_SOURCE_LABELS: Record<MarketFactSourceType, string> = {
  founder_interview: "创始人陈述",
  competitor_visit: "竞品探店",
  user_interview: "用户访谈",
  channel_data: "渠道数据",
  industry_report: "行业报告",
  sales_note: "经营笔记",
  city_data: "城市数据",
  other: "其他一手事实",
};

export function createEmptyMarketLedger(): MarketEvidenceLedger {
  return {
    ledgerId: createId("mkt-led"),
    facts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function addMarketFact(
  ledger: MarketEvidenceLedger | undefined,
  input: {
    claim: string;
    sourceType: MarketFactSourceType;
    relatedStage: MarketFactStage;
    strength?: MarketFactStrength;
    capturedBy?: string;
    tags?: string[];
    verificationStatus?: "verified" | "unverified";
  },
): MarketEvidenceLedger {
  const claim = input.claim.trim();
  if (claim.length < 8) {
    throw new Error("市场事实至少 8 个字，请写清可引用的具体观察或数据");
  }
  const base = ledger || createEmptyMarketLedger();
  const exists = base.facts.some(
    (f) => f.relatedStage === input.relatedStage && f.claim.slice(0, 12) === claim.slice(0, 12),
  );
  if (exists) return base;

  const fact: MarketPrimaryFact = {
    factId: createId("mkt-fact"),
    claim,
    sourceType: input.sourceType,
    relatedStage: input.relatedStage,
    strength: input.strength || "moderate",
    capturedAt: new Date().toISOString(),
    capturedBy: input.capturedBy,
    tags: input.tags,
    verificationStatus: input.verificationStatus ?? "verified",
  };
  return {
    ...base,
    facts: [...base.facts, fact],
    updatedAt: new Date().toISOString(),
  };
}

export function seedMarketFactsFromScan(
  ledger: MarketEvidenceLedger | undefined,
  scope: { city?: string; category?: string; intent?: string; scene?: string; rivals?: string },
): MarketEvidenceLedger {
  let next = ledger || createEmptyMarketLedger();

  if (scope.city && scope.category) {
    next = addMarketFact(next, {
      claim: `【待核实·扫描】目标市场 ${scope.city} · ${scope.category}，意图 ${scope.intent || "待补"}`,
      sourceType: "founder_interview",
      relatedStage: "MARKET_SCAN",
      strength: "weak",
      tags: ["seed_from_scan", "needs_verification"],
      verificationStatus: "unverified",
    });
  }
  if (scope.scene) {
    next = addMarketFact(next, {
      claim: `【待核实·扫描】创始人场景切口: ${scope.scene}`,
      sourceType: "founder_interview",
      relatedStage: "USER_RESEARCH",
      strength: "weak",
      tags: ["seed_from_scan", "needs_verification"],
      verificationStatus: "unverified",
    });
  }
  if (scope.rivals) {
    next = addMarketFact(next, {
      claim: `【待核实·扫描】提到的主要竞品: ${scope.rivals}`,
      sourceType: "founder_interview",
      relatedStage: "COMPETITOR_ANALYSIS",
      strength: "weak",
      tags: ["seed_from_scan", "needs_verification"],
      verificationStatus: "unverified",
    });
  }
  return next;
}

export function isVerifiedMarketFact(f: MarketPrimaryFact): boolean {
  if (!f.verificationStatus || f.verificationStatus === "unverified") return false;
  if (f.tags?.includes("seed_from_scan")) return false;
  if (f.tags?.includes("needs_verification")) return false;
  return true;
}

export function marketEvidenceCoverage(ledger: MarketEvidenceLedger | undefined): {
  ok: boolean; missing: string[]; total: number;
} {
  const facts = (ledger?.facts || []).filter(isVerifiedMarketFact);
  const missing: string[] = [];
  if (!facts.some((f) => f.relatedStage === "MARKET_SCAN")) missing.push("market:market_scan");
  if (!facts.some((f) => f.relatedStage === "COMPETITOR_ANALYSIS")) missing.push("market:competitor");
  if (!facts.some((f) => f.relatedStage === "USER_RESEARCH")) missing.push("market:user_research");
  if (facts.length < 3) missing.push("market:count<3");
  return { ok: missing.length === 0, missing, total: facts.length };
}

export function marketFactStrengthBoost(facts: MarketPrimaryFact[]): number {
  if (facts.length === 0) return 0;
  const strong = facts.filter((f) => f.strength === "strong").length;
  const moderate = facts.filter((f) => f.strength === "moderate").length;
  return Math.min(20, strong * 8 + moderate * 4 + facts.length * 2);
}
