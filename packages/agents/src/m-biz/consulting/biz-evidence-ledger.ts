/**
 * M-BIZ 商业模式 — 一手证据账本
 *
 * 商业模式判断不可靠「我觉得」——必须靠可引用事实。
 * 事实类型：收入数据、成本数据、UE 计算、运营数据。
 * 对标 M-PNT evidence-ledger-engine.ts。
 */

export type BizFactSourceType =
  | "founder_interview"   // 创始人陈述
  | "financial_data"      // 财务数据
  | "sales_note"          // 经营笔记
  | "supplier_quote"      // 供应商报价
  | "industry_benchmark"  // 行业基准
  | "partner_feedback"    // 合作伙伴反馈
  | "customer_data"       // 客户数据
  | "other";

export type BizFactStage =
  | "PROFIT_ANALYSIS"     // 利润分析
  | "UNIT_ECONOMICS"      // 单位经济
  | "COST_STRUCTURE"      // 成本结构
  | "REVENUE_MODEL"       // 收入模型
  | "REPLICATION"         // 复制能力
  | "SCALE_PROJECTION";   // 规模预测

export type BizFactStrength = "strong" | "moderate" | "weak";

export interface BizPrimaryFact {
  factId: string;
  claim: string;
  sourceType: BizFactSourceType;
  relatedStage: BizFactStage;
  strength: BizFactStrength;
  capturedAt: string;
  capturedBy?: string;
  tags?: string[];
  verificationStatus?: "verified" | "unverified";
}

export interface BizEvidenceLedger {
  ledgerId: string;
  facts: BizPrimaryFact[];
  updatedAt: string;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const BIZ_FACT_SOURCE_LABELS: Record<BizFactSourceType, string> = {
  founder_interview: "创始人陈述",
  financial_data: "财务数据",
  sales_note: "经营笔记",
  supplier_quote: "供应商报价",
  industry_benchmark: "行业基准",
  partner_feedback: "合作伙伴反馈",
  customer_data: "客户数据",
  other: "其他一手事实",
};

export function createEmptyBizLedger(): BizEvidenceLedger {
  return {
    ledgerId: createId("biz-led"),
    facts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function addBizFact(
  ledger: BizEvidenceLedger | undefined,
  input: {
    claim: string;
    sourceType: BizFactSourceType;
    relatedStage: BizFactStage;
    strength?: BizFactStrength;
    capturedBy?: string;
    tags?: string[];
    verificationStatus?: "verified" | "unverified";
  },
): BizEvidenceLedger {
  const claim = input.claim.trim();
  if (claim.length < 8) throw new Error("商业事实至少 8 个字，请写清可引用的具体数据");
  const base = ledger || createEmptyBizLedger();
  if (base.facts.some((f) => f.relatedStage === input.relatedStage && f.claim.slice(0, 12) === claim.slice(0, 12))) return base;

  const fact: BizPrimaryFact = {
    factId: createId("biz-fact"), claim, sourceType: input.sourceType,
    relatedStage: input.relatedStage, strength: input.strength || "moderate",
    capturedAt: new Date().toISOString(), capturedBy: input.capturedBy,
    tags: input.tags, verificationStatus: input.verificationStatus ?? "verified",
  };
  return { ...base, facts: [...base.facts, fact], updatedAt: new Date().toISOString() };
}

export function seedBizFactsFromScan(
  ledger: BizEvidenceLedger | undefined,
  scan: { stage: string; pain: string; priority: string; resource: string },
): BizEvidenceLedger {
  let next = ledger || createEmptyBizLedger();
  if (scan.pain.trim().length >= 4) {
    next = addBizFact(next, { claim: `【待核实·扫描】核心痛点: ${scan.pain}`, sourceType: "founder_interview", relatedStage: "PROFIT_ANALYSIS", strength: "weak", tags: ["seed_from_scan", "needs_verification"], verificationStatus: "unverified" });
  }
  if (scan.resource.trim().length >= 4) {
    next = addBizFact(next, { claim: `【待核实·扫描】可用资源: ${scan.resource}`, sourceType: "founder_interview", relatedStage: "COST_STRUCTURE", strength: "weak", tags: ["seed_from_scan", "needs_verification"], verificationStatus: "unverified" });
  }
  return next;
}

export function isVerifiedBizFact(f: BizPrimaryFact): boolean {
  if (!f.verificationStatus || f.verificationStatus === "unverified") return false;
  if (f.tags?.includes("seed_from_scan")) return false;
  if (f.tags?.includes("needs_verification")) return false;
  return true;
}

export function bizEvidenceCoverage(ledger: BizEvidenceLedger | undefined): {
  ok: boolean; missing: string[]; total: number;
} {
  const facts = (ledger?.facts || []).filter(isVerifiedBizFact);
  const missing: string[] = [];
  if (!facts.some((f) => f.relatedStage === "UNIT_ECONOMICS")) missing.push("biz:unit_economics");
  if (!facts.some((f) => f.relatedStage === "COST_STRUCTURE")) missing.push("biz:cost_structure");
  if (!facts.some((f) => f.relatedStage === "REVENUE_MODEL")) missing.push("biz:revenue_model");
  if (facts.length < 3) missing.push("biz:count<3");
  return { ok: missing.length === 0, missing, total: facts.length };
}

export function bizFactStrengthBoost(facts: BizPrimaryFact[]): number {
  if (facts.length === 0) return 0;
  const strong = facts.filter((f) => f.strength === "strong").length;
  const moderate = facts.filter((f) => f.strength === "moderate").length;
  return Math.min(20, strong * 8 + moderate * 4 + facts.length * 2);
}
