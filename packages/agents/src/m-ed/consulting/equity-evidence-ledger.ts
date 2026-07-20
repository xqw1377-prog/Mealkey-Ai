/**
 * M-ED 股权治理 — 一手证据账本
 *
 * 股权决策不可靠「我觉得」——必须靠可引用事实。
 * 本引擎管理：股权结构事实、控制权事实、合规事实、团队事实。
 * 对标 M-PNT evidence-ledger-engine.ts。
 */

export type EquityFactSourceType =
  | "founder_interview"     // 创始人陈述
  | "cap_table"             // 股权结构表
  | "contract_document"     // 合同/协议文件
  | "regulatory_filing"     // 监管备案
  | "investor_term"         // 投资人条款
  | "team_conversation"     // 团队沟通
  | "legal_review"          // 法务审查
  | "other";

export type EquityFactStage =
  | "EQUITY_SCAN"           // 股权扫描
  | "CONTROL_ANALYSIS"      // 控制权分析
  | "COMPLIANCE_CHECK"      // 合规检查
  | "TEAM_STRUCTURE"        // 团队结构
  | "VALUATION"             // 估值
  | "EXECUTION_PLAN";       // 执行计划

export type EquityFactStrength = "strong" | "moderate" | "weak";

export interface EquityPrimaryFact {
  factId: string;
  claim: string;
  sourceType: EquityFactSourceType;
  relatedStage: EquityFactStage;
  strength: EquityFactStrength;
  capturedAt: string;
  capturedBy?: string;
  tags?: string[];
  verificationStatus?: "verified" | "unverified";
}

export interface EquityEvidenceLedger {
  ledgerId: string;
  facts: EquityPrimaryFact[];
  updatedAt: string;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const EQUITY_FACT_SOURCE_LABELS: Record<EquityFactSourceType, string> = {
  founder_interview: "创始人陈述",
  cap_table: "股权结构表",
  contract_document: "合同/协议文件",
  regulatory_filing: "监管备案",
  investor_term: "投资人条款",
  team_conversation: "团队沟通",
  legal_review: "法务审查",
  other: "其他一手事实",
};

export function createEmptyEquityLedger(): EquityEvidenceLedger {
  return {
    ledgerId: createId("eq-led"),
    facts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function addEquityFact(
  ledger: EquityEvidenceLedger | undefined,
  input: {
    claim: string;
    sourceType: EquityFactSourceType;
    relatedStage: EquityFactStage;
    strength?: EquityFactStrength;
    capturedBy?: string;
    tags?: string[];
    verificationStatus?: "verified" | "unverified";
  },
): EquityEvidenceLedger {
  const claim = input.claim.trim();
  if (claim.length < 8) {
    throw new Error("股权事实至少 8 个字，请写清可引用的具体条款或数据");
  }
  const base = ledger || createEmptyEquityLedger();
  const exists = base.facts.some(
    (f) =>
      f.relatedStage === input.relatedStage &&
      f.claim.slice(0, 12) === claim.slice(0, 12),
  );
  if (exists) return base;

  const fact: EquityPrimaryFact = {
    factId: createId("eq-fact"),
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

/** 从股权扫描范围自动种入线索事实 */
export function seedEquityFactsFromScan(
  ledger: EquityEvidenceLedger | undefined,
  scan: {
    stage: string;
    topic: string;
    control: string;
    team: string;
  },
): EquityEvidenceLedger {
  let next = ledger || createEmptyEquityLedger();

  if (scan.control.trim().length >= 4) {
    next = addEquityFact(next, {
      claim: `【待核实·扫描】当前控制权结构: ${scan.control}`,
      sourceType: "founder_interview",
      relatedStage: "CONTROL_ANALYSIS",
      strength: "weak",
      tags: ["seed_from_scan", "needs_verification"],
      verificationStatus: "unverified",
    });
  }

  if (scan.team.trim().length >= 4) {
    next = addEquityFact(next, {
      claim: `【待核实·扫描】团队结构: ${scan.team}`,
      sourceType: "founder_interview",
      relatedStage: "TEAM_STRUCTURE",
      strength: "weak",
      tags: ["seed_from_scan", "needs_verification"],
      verificationStatus: "unverified",
    });
  }

  if (scan.topic.trim().length >= 4) {
    next = addEquityFact(next, {
      claim: `【待核实·扫描】当前阶段与议题: ${scan.topic}`,
      sourceType: "founder_interview",
      relatedStage: "EQUITY_SCAN",
      strength: "weak",
      tags: ["seed_from_scan", "needs_verification"],
      verificationStatus: "unverified",
    });
  }

  return next;
}

export function isVerifiedEquityFact(f: EquityPrimaryFact): boolean {
  if (!f.verificationStatus || f.verificationStatus === "unverified") return false;
  if (f.tags?.includes("seed_from_scan")) return false;
  if (f.tags?.includes("needs_verification")) return false;
  return true;
}

export function listFactsForEquityStage(
  ledger: EquityEvidenceLedger | undefined,
  stage: EquityFactStage,
): EquityPrimaryFact[] {
  return (ledger?.facts || []).filter((f) => f.relatedStage === stage);
}

export function equityEvidenceCoverage(ledger: EquityEvidenceLedger | undefined): {
  ok: boolean;
  missing: string[];
  total: number;
} {
  const facts = (ledger?.facts || []).filter(isVerifiedEquityFact);
  const missing: string[] = [];
  const hasControl = facts.some((f) => f.relatedStage === "CONTROL_ANALYSIS");
  const hasTeam = facts.some((f) => f.relatedStage === "TEAM_STRUCTURE");
  const hasCompliance = facts.some((f) => f.relatedStage === "COMPLIANCE_CHECK");

  if (!hasControl) missing.push("equity:control_structure");
  if (!hasTeam) missing.push("equity:team_structure");
  if (!hasCompliance) missing.push("equity:compliance");
  if (facts.length < 3) missing.push("equity:count<3");

  return { ok: missing.length === 0, missing, total: facts.length };
}

export function equityFactStrengthBoost(facts: EquityPrimaryFact[]): number {
  if (facts.length === 0) return 0;
  const strong = facts.filter((f) => f.strength === "strong").length;
  const moderate = facts.filter((f) => f.strength === "moderate").length;
  return Math.min(20, strong * 8 + moderate * 4 + facts.length * 2);
}

export function formatEquityFactForNarrative(facts: EquityPrimaryFact[]): string {
  if (facts.length === 0) return "";
  return [
    "【股权证据引用】",
    ...facts.map(
      (f) =>
        `- (${EQUITY_FACT_SOURCE_LABELS[f.sourceType]} / ${f.strength}) ${f.claim}`,
    ),
  ].join("\n");
}

export function getEquityCoverageChecklist(input: {
  ledger?: EquityEvidenceLedger;
  contractFrozen?: boolean;
  roadmapComplete?: boolean;
}) {
  const ledger = input.ledger;
  const facts = (ledger?.facts || []).filter(isVerifiedEquityFact);
  const coverage = equityEvidenceCoverage(ledger);

  return [
    {
      id: "fact_control",
      label: "控制权结构事实",
      ok: facts.some((f) => f.relatedStage === "CONTROL_ANALYSIS"),
      detail: `已录 ${facts.filter((f) => f.relatedStage === "CONTROL_ANALYSIS").length} 条`,
    },
    {
      id: "fact_team",
      label: "团队结构事实",
      ok: facts.some((f) => f.relatedStage === "TEAM_STRUCTURE"),
      detail: `已录 ${facts.filter((f) => f.relatedStage === "TEAM_STRUCTURE").length} 条`,
    },
    {
      id: "fact_compliance",
      label: "合规事实",
      ok: facts.some((f) => f.relatedStage === "COMPLIANCE_CHECK"),
      detail: `已录 ${facts.filter((f) => f.relatedStage === "COMPLIANCE_CHECK").length} 条`,
    },
    {
      id: "fact_coverage",
      label: "股权证据覆盖",
      ok: coverage.ok,
      detail: coverage.ok
        ? `共 ${coverage.total} 条，覆盖完整`
        : `缺口：${coverage.missing.join("；") || "不足"}`,
    },
    {
      id: "contract_frozen",
      label: "股权治理合同已冻结",
      ok: Boolean(input.contractFrozen),
      detail: input.contractFrozen ? "已冻结" : "须完成合同冻结",
    },
    {
      id: "roadmap_complete",
      label: "执行路径已确认",
      ok: Boolean(input.roadmapComplete),
      detail: input.roadmapComplete ? "已确认" : "须生成执行路径",
    },
  ];
}
