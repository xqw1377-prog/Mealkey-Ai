/**
 * 一手证据账本 — 可引用事实，非启发式填充
 */
import type {
  EvidenceLedger,
  PrimaryFact,
  PrimaryFactRelatedStage,
  PrimaryFactSourceType,
  PositioningEvidence,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const PRIMARY_FACT_SOURCE_LABELS: Record<PrimaryFactSourceType, string> = {
  founder_interview: "创始人陈述",
  customer_quote: "用户原话",
  store_observation: "门店观察",
  sales_note: "经营/销售笔记",
  competitor_note: "竞品笔记",
  other: "其他一手事实",
};

export function createEmptyEvidenceLedger(): EvidenceLedger {
  return {
    ledgerId: createId("led"),
    facts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function addPrimaryFact(
  ledger: EvidenceLedger | undefined,
  input: {
    claim: string;
    sourceType: PrimaryFactSourceType;
    relatedStage: PrimaryFactRelatedStage;
    strength?: PrimaryFact["strength"];
    capturedBy?: string;
    tags?: string[];
    verificationStatus?: PrimaryFact["verificationStatus"];
  },
): EvidenceLedger {
  const claim = input.claim.trim();
  if (claim.length < 8) {
    throw new Error("一手事实至少 8 个字，请写清可引用的具体观察或原话");
  }
  const base = ledger || createEmptyEvidenceLedger();
  // 同阶段已有足够事实时不重复堆叠
  const exists = base.facts.some(
    (f) =>
      f.relatedStage === input.relatedStage &&
      f.claim.slice(0, 12) === claim.slice(0, 12),
  );
  if (exists) return base;
  const seeded =
    input.tags?.includes("needs_verification") ||
    input.tags?.includes("seed_from_brief");
  const fact: PrimaryFact = {
    factId: createId("fact"),
    claim,
    sourceType: input.sourceType,
    relatedStage: input.relatedStage,
    strength: input.strength || (seeded ? "weak" : "moderate"),
    capturedAt: new Date().toISOString(),
    capturedBy: input.capturedBy,
    tags: input.tags,
    verificationStatus:
      input.verificationStatus ?? (seeded ? "unverified" : "verified"),
  };
  return {
    ...base,
    facts: [...base.facts, fact],
    updatedAt: new Date().toISOString(),
  };
}

/** Brief 种子：待核实，不得冒充已验证一手事实 / 不得单独过门禁 */
export function isVerifiedPrimaryFact(f: PrimaryFact): boolean {
  if (!f.verificationStatus || f.verificationStatus === "unverified") return false;
  if (f.tags?.includes("seed_from_brief")) return false;
  if (f.tags?.includes("needs_verification")) return false;
  return true;
}

/** 从简报五问自动种入三阶段线索（弱证据，须人工核实） */
export function seedPrimaryFactsFromBrief(
  ledger: EvidenceLedger | undefined,
  brief: {
    categoryDefinition?: string;
    targetCustomer?: string;
    customerNeed?: string;
    competitiveSet?: string[];
    founderBelief?: string;
  },
): EvidenceLedger {
  let next = ledger || createEmptyEvidenceLedger();
  const cat = (brief.categoryDefinition || "").trim();
  const who = (brief.targetCustomer || "").trim();
  const need = (brief.customerNeed || "").trim();
  const rival = (brief.competitiveSet || []).filter(Boolean).join("、");
  const edge = (brief.founderBelief || "").trim();
  const seedTags = ["seed_from_brief", "needs_verification"];

  if (cat || who) {
    next = addPrimaryFact(next, {
      claim: `【待核实·简报】店里主场是${who || "核心客人"}，品类感知偏「${cat || "本地餐饮"}」`,
      sourceType: "founder_interview",
      relatedStage: "CATEGORY_ANALYSIS",
      strength: "weak",
      tags: seedTags,
      verificationStatus: "unverified",
    });
  }
  if (need || who) {
    next = addPrimaryFact(next, {
      claim: `【待核实·简报】${who || "客人"}最在意的是：${need || "吃得放心、可预期"}`,
      sourceType: "founder_interview",
      relatedStage: "CONSUMER_INSIGHT",
      strength: "weak",
      tags: seedTags,
      verificationStatus: "unverified",
    });
  }
  if (rival || edge) {
    next = addPrimaryFact(next, {
      claim: rival
        ? `【待核实·简报】主要对手是${rival}${edge ? `；我们更靠${edge}` : ""}`
        : `【待核实·简报】竞争上我们更靠：${edge}`,
      sourceType: "founder_interview",
      relatedStage: "COMPETITIVE_MAPPING",
      strength: "weak",
      tags: seedTags,
      verificationStatus: "unverified",
    });
  }
  return next;
}

export function removePrimaryFact(
  ledger: EvidenceLedger,
  factId: string,
): EvidenceLedger {
  return {
    ...ledger,
    facts: ledger.facts.filter((f) => f.factId !== factId),
    updatedAt: new Date().toISOString(),
  };
}

export function listFactsForStage(
  ledger: EvidenceLedger | undefined,
  stage: PrimaryFactRelatedStage,
): PrimaryFact[] {
  return (ledger?.facts || []).filter((f) => f.relatedStage === stage);
}

/**
 * 一手事实强度加成（0–20）
 * strong×8 + moderate×4 + 条数×2；weak 不计强度分但仍计条数。
 * 与品类战场 / 假设压力测试证据维同源。
 */
export function primaryFactStrengthBoost(facts: PrimaryFact[]): number {
  if (facts.length === 0) return 0;
  const strong = facts.filter((f) => f.strength === "strong").length;
  const moderate = facts.filter((f) => f.strength === "moderate").length;
  return Math.min(20, strong * 8 + moderate * 4 + facts.length * 2);
}

export function summarizePrimaryFactStrength(facts: PrimaryFact[]): string {
  if (facts.length === 0) return "一手事实：0";
  const strong = facts.filter((f) => f.strength === "strong").length;
  const moderate = facts.filter((f) => f.strength === "moderate").length;
  const weak = facts.filter((f) => f.strength === "weak").length;
  const boost = primaryFactStrengthBoost(facts);
  return `一手${facts.length}条（强${strong}/中${moderate}/弱${weak}，强度+${boost}）`;
}

export function countFacts(
  ledger: EvidenceLedger | undefined,
  opts?: {
    stage?: PrimaryFactRelatedStage;
    sourceType?: PrimaryFactSourceType;
    /** 默认 true：门禁只认已核实事实，Brief 种子不算 */
    verifiedOnly?: boolean;
  },
): number {
  const verifiedOnly = opts?.verifiedOnly !== false;
  let facts = ledger?.facts || [];
  if (verifiedOnly) facts = facts.filter(isVerifiedPrimaryFact);
  if (opts?.stage) facts = facts.filter((f) => f.relatedStage === opts.stage);
  if (opts?.sourceType) {
    facts = facts.filter((f) => f.sourceType === opts.sourceType);
  }
  return facts.length;
}

/** 覆盖度：至少覆盖用户/品类/竞争相关「已核实」一手事实 */
export function primaryEvidenceCoverage(ledger: EvidenceLedger | undefined): {
  ok: boolean;
  missing: string[];
  total: number;
} {
  const facts = (ledger?.facts || []).filter(isVerifiedPrimaryFact);
  const missing: string[] = [];
  const hasCustomer = facts.some(
    (f) =>
      f.relatedStage === "CONSUMER_INSIGHT" ||
      f.sourceType === "customer_quote",
  );
  const hasCategory = facts.some(
    (f) =>
      f.relatedStage === "CATEGORY_ANALYSIS" ||
      f.sourceType === "sales_note" ||
      f.sourceType === "store_observation",
  );
  const hasCompetition = facts.some(
    (f) =>
      f.relatedStage === "COMPETITIVE_MAPPING" ||
      f.sourceType === "competitor_note",
  );
  if (!hasCustomer) missing.push("primary:customer_or_insight");
  if (!hasCategory) missing.push("primary:category_or_ops");
  if (!hasCompetition) missing.push("primary:competition");
  if (facts.length < 3) missing.push("primary:count<3");
  return { ok: missing.length === 0, missing, total: facts.length };
}

export function primaryFactsToPositioningEvidence(
  ledger: EvidenceLedger | undefined,
): PositioningEvidence[] {
  return (ledger?.facts || []).map((f) => ({
    evidenceId: f.factId,
    claim: f.claim,
    sourceArtifact: `PrimaryFact.${f.sourceType}`,
    strength: f.strength,
    reviewStatus:
      f.verificationStatus === "verified" && isVerifiedPrimaryFact(f)
        ? ("accepted" as const)
        : ("pending" as const),
  }));
}

export function formatFactsForNarrative(facts: PrimaryFact[]): string {
  if (facts.length === 0) return "";
  return [
    "【一手证据引用】",
    ...facts.map(
      (f) =>
        `- (${PRIMARY_FACT_SOURCE_LABELS[f.sourceType]} / ${f.strength}) ${f.claim}`,
    ),
  ].join("\n");
}

export function formatFactsForReportSection(
  facts: PrimaryFact[],
  heading = "### 本章引用的一手证据",
): string {
  if (facts.length === 0) {
    return [heading, "", "> 本章尚无一手指认事实。交付前须补录可引用证据。"].join("\n");
  }
  return [
    heading,
    "",
    ...facts.map(
      (f) =>
        `- **[${f.factId}]** ${PRIMARY_FACT_SOURCE_LABELS[f.sourceType]}（${f.strength}）— ${f.claim}`,
    ),
  ].join("\n");
}

export function buildEvidenceAppendix(ledger: EvidenceLedger | undefined): string {
  const facts = ledger?.facts || [];
  const coverage = primaryEvidenceCoverage(ledger);
  return [
    "## 附录 A · 一手证据账本（Primary Evidence Ledger）",
    "",
    `**账本条目：** ${facts.length} 条`,
    `**覆盖门禁：** ${coverage.ok ? "已通过" : `未通过（${coverage.missing.join("；")}）`}`,
    "",
    "### 全量事实清单",
    facts.length === 0
      ? "> 空账本：本报告结论偏启发式，不具备签字级证据强度。"
      : facts
          .map(
            (f) =>
              `- **${f.factId}**｜${PRIMARY_FACT_SOURCE_LABELS[f.sourceType]}｜阶段 ${f.relatedStage}｜${f.strength}｜${f.capturedAt}\n  ${f.claim}`,
          )
          .join("\n"),
    "",
    "### 使用说明",
    "- 正文各章「本章引用的一手证据」必须能回指本附录 factId。",
    "- 签字交付前须满足：≥3 条，且覆盖用户/品类/竞争三类。",
  ].join("\n");
}

export type ConsultingCoverageItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

/** 工作台 / API 用的覆盖度清单 */
export function getConsultingCoverageChecklist(input: {
  stage?: string;
  ledger?: EvidenceLedger;
  categorySelected?: boolean;
  brandSystemComplete?: boolean;
  reportSigned?: boolean;
}): ConsultingCoverageItem[] {
  const ledger = input.ledger;
  const facts = (ledger?.facts || []).filter(isVerifiedPrimaryFact);
  const coverage = primaryEvidenceCoverage(ledger);
  const cat = facts.filter((f) => f.relatedStage === "CATEGORY_ANALYSIS").length;
  const cus = facts.filter((f) => f.relatedStage === "CONSUMER_INSIGHT").length;
  const cmp = facts.filter((f) => f.relatedStage === "COMPETITIVE_MAPPING").length;

  return [
    {
      id: "fact_category",
      label: "品类阶段一手事实",
      ok: cat >= 1,
      detail: cat >= 1 ? `已录 ${cat} 条` : "至少 1 条（销售笔记/门店观察等）",
    },
    {
      id: "fact_consumer",
      label: "洞察阶段一手事实",
      ok: cus >= 1,
      detail: cus >= 1 ? `已录 ${cus} 条` : "至少 1 条（用户原话优先）",
    },
    {
      id: "fact_competitive",
      label: "竞争阶段一手事实",
      ok: cmp >= 1,
      detail: cmp >= 1 ? `已录 ${cmp} 条` : "至少 1 条（竞品笔记）",
    },
    {
      id: "fact_coverage",
      label: "定位设计证据覆盖",
      ok: coverage.ok,
      detail: coverage.ok
        ? `共 ${coverage.total} 条，覆盖完整`
        : `缺口：${coverage.missing.join("；") || "不足"}`,
    },
    {
      id: "category_decision",
      label: "Category Decision 已选定",
      ok: Boolean(input.categorySelected),
      detail: input.categorySelected ? "已选定战场" : "品类阶段须选定战场",
    },
    {
      id: "brand_system",
      label: "Brand System 已确认",
      ok: Boolean(input.brandSystemComplete),
      detail: input.brandSystemComplete ? "已确认" : "终稿阶段确认价值主张与传播主线",
    },
    {
      id: "report_signed",
      label: "战略报告已签字",
      ok: Boolean(input.reportSigned),
      detail: input.reportSigned ? "已签字交付" : "确认体系后由创始人签字",
    },
  ];
}
