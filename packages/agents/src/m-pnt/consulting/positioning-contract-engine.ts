/**
 * Positioning Contract Engine — 强制标准定位句 + Evidence 绑定
 */
import {
  BrandProjectStage,
  ContractGateError,
  type BrandStrategyProject,
  type PositioningContract,
  type PositioningEvidence,
  type PositioningStatement,
} from "./types";
import { assertCanDesignPositioning } from "./state-machine";
import { primaryEvidenceCoverage } from "./evidence-ledger-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function fieldMissing(statement: PositioningStatement): string[] {
  const keys: Array<keyof PositioningStatement> = [
    "forAudience",
    "whoNeed",
    "ourBrandIs",
    "thatValue",
    "because",
    "unlike",
  ];
  return keys.filter((k) => !statement[k]?.trim());
}

function evidenceCoverage(evidence: PositioningEvidence[]): {
  ok: boolean;
  missing: string[];
} {
  const accepted = acceptedEvidence(evidence);
  const sources = accepted.map((e) => e.sourceArtifact.toLowerCase());
  const missing: string[] = [];
  // 兼容上游资产名 + 一手账本 PrimaryFact.{sourceType}
  const hasCustomer = sources.some(
    (s) =>
      s.includes("customer") ||
      s.includes("consumer") ||
      s.includes("brief") ||
      s.includes("customer_quote") ||
      s.includes("founder_interview"),
  );
  const hasCategory = sources.some(
    (s) =>
      s.includes("category") ||
      s.includes("sales_note") ||
      s.includes("store_observation"),
  );
  const hasCompetitive = sources.some(
    (s) =>
      s.includes("competitive") ||
      s.includes("competitor") ||
      s.includes("competitor_note"),
  );
  if (!hasCustomer) missing.push("evidence:customer_or_brief");
  if (!hasCategory) missing.push("evidence:category");
  if (!hasCompetitive) missing.push("evidence:competitive");
  if (accepted.length < 3) missing.push("evidence:accepted_count<3");
  const pending = evidence.filter((e) => e.reviewStatus === "pending").length;
  if (pending > 0) missing.push(`evidence:pending=${pending}`);
  return { ok: missing.length === 0, missing };
}

/** 缺省 reviewStatus 视为 accepted（兼容旧合同） */
export function isAcceptedEvidence(e: PositioningEvidence): boolean {
  return !e.reviewStatus || e.reviewStatus === "accepted";
}

export function acceptedEvidence(
  evidence: PositioningEvidence[],
): PositioningEvidence[] {
  return evidence.filter(isAcceptedEvidence);
}

export function emptyStatement(): PositioningStatement {
  return {
    forAudience: "",
    whoNeed: "",
    ourBrandIs: "",
    thatValue: "",
    because: "",
    unlike: "",
  };
}

export function formatPositioningStatement(s: PositioningStatement): string {
  return [
    `For: ${s.forAudience}`,
    `Who: ${s.whoNeed}`,
    `Our brand is: ${s.ourBrandIs}`,
    `That: ${s.thatValue}`,
    `Because: ${s.because}`,
    `Unlike: ${s.unlike}`,
  ].join("\n");
}

/**
 * 禁止把一句散文当成定位结果。
 * 返回 true = 疑似非结构化金句（应拒绝作为终态）。
 */
export function looksLikeUnstructuredSlogan(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const hasStructure =
    /For\s*:/i.test(t) &&
    /Who\s*:/i.test(t) &&
    (/Our brand is\s*:/i.test(t) || /定位类别/.test(t));
  if (hasStructure) return false;
  // 短金句、无字段
  if (t.length < 80 && !t.includes("\n")) return true;
  if (/建议定位为/.test(t) && !hasStructure) return true;
  return false;
}

function buildPrerequisites(project: BrandStrategyProject) {
  return {
    brandBriefId: project.assets.brandBrief?.briefId,
    categoryDone: project.assets.categoryDiagnosis?.status === "complete",
    consumerDone: project.assets.consumerInsight?.status === "complete",
    competitiveDone: project.assets.competitiveMap?.status === "complete",
  };
}

/**
 * 从项目资产草稿一份合同（仍需 propose 过门禁）。
 */
export function draftContractFromProject(
  project: BrandStrategyProject,
  statement: PositioningStatement,
  extras?: {
    strategicChoice?: string;
    rejectedAlternatives?: PositioningContract["rejectedAlternatives"];
    evidence?: PositioningEvidence[];
  },
): PositioningContract {
  const brief = project.assets.brandBrief;
  const category = project.assets.categoryDiagnosis;
  const consumer = project.assets.consumerInsight;
  const map = project.assets.competitiveMap;
  const ledger = project.assets.evidenceLedger;

  const autoEvidence: PositioningEvidence[] = [];
  // 一手事实优先进入证据池
  for (const f of ledger?.facts || []) {
    autoEvidence.push({
      evidenceId: f.factId,
      claim: f.claim,
      sourceArtifact: `PrimaryFact.${f.sourceType}`,
      strength: f.strength,
      reviewStatus: "pending",
    });
  }
  if (brief?.customerNeed) {
    autoEvidence.push({
      evidenceId: createId("ev"),
      claim: brief.customerNeed,
      sourceArtifact: "BrandBrief.customerNeed",
      strength: "strong",
      reviewStatus: "pending",
    });
  }
  if (category?.battlefield) {
    autoEvidence.push({
      evidenceId: createId("ev"),
      claim: category.battlefield,
      sourceArtifact: "CategoryDiagnosis.battlefield",
      strength: "moderate",
      reviewStatus: "pending",
    });
  }
  if (map?.whitespace) {
    autoEvidence.push({
      evidenceId: createId("ev"),
      claim: map.whitespace,
      sourceArtifact: "CompetitiveMap.whitespace",
      strength: "strong",
      reviewStatus: "pending",
    });
  }
  if (consumer?.unmetNeeds?.[0]) {
    autoEvidence.push({
      evidenceId: createId("ev"),
      claim: consumer.unmetNeeds[0],
      sourceArtifact: "ConsumerInsight.unmetNeeds",
      strength: "moderate",
      reviewStatus: "pending",
    });
  }

  return {
    contractId: createId("pcontract"),
    version: 1,
    status: "draft",
    statement,
    supportingEvidence: extras?.evidence?.length
      ? extras.evidence
      : autoEvidence,
    strategicChoice:
      extras?.strategicChoice ||
      map?.whitespace ||
      "基于竞争空位与用户未满足需求的战略选择",
    rejectedAlternatives: extras?.rejectedAlternatives?.length
      ? extras.rejectedAlternatives
      : [
          {
            statementSummary: "泛化的「高品质品类品牌」口号式定位",
            rejectReason: "无差异空位与证据支撑，无法指导产品与传播",
          },
        ],
    prerequisites: buildPrerequisites(project),
  };
}

/** propose：升为 proposed，强制门禁 */
export function proposeContract(
  project: BrandStrategyProject,
  contract: PositioningContract,
): PositioningContract {
  assertCanDesignPositioning(project);

  const missing = fieldMissing(contract.statement);
  const coverage = evidenceCoverage(contract.supportingEvidence);
  const prereqMissing: string[] = [];
  const p = buildPrerequisites(project);
  if (!p.brandBriefId) prereqMissing.push("prerequisites.brandBriefId");
  if (!p.categoryDone) prereqMissing.push("prerequisites.categoryDone");
  if (!p.consumerDone) prereqMissing.push("prerequisites.consumerDone");
  if (!p.competitiveDone) prereqMissing.push("prerequisites.competitiveDone");
  if (contract.rejectedAlternatives.length < 1) {
    prereqMissing.push("rejectedAlternatives.length<1");
  }
  if (!contract.strategicChoice?.trim()) {
    prereqMissing.push("strategicChoice");
  }
  const hyps = contract.hypotheses || [];
  if (hyps.length < 2) prereqMissing.push("hypotheses.length>=2");
  if (!hyps.every((h) => h.scores && typeof h.scores.total === "number")) {
    prereqMissing.push("hypotheses.scores");
  }
  if (!hyps.some((h) => h.status === "selected")) {
    prereqMissing.push("hypotheses.selected");
  }
  const selectedHyp = hyps.find((h) => h.status === "selected");
  if (selectedHyp && (selectedHyp.scores?.total ?? 0) < 40) {
    prereqMissing.push("hypotheses.selected.score>=40");
  }
  const maxHypTotal = Math.max(...hyps.map((h) => h.scores?.total ?? 0));
  if (
    selectedHyp &&
    (selectedHyp.scores?.total ?? 0) < maxHypTotal &&
    (contract.hypothesisOverride?.overrideReason?.trim().length || 0) < 20
  ) {
    prereqMissing.push("hypotheses.overrideReason");
  }
  const primary = primaryEvidenceCoverage(project.assets.evidenceLedger);
  if (!primary.ok) {
    prereqMissing.push(...primary.missing);
  }

  const allMissing = [...missing.map((m) => `statement.${m}`), ...coverage.missing, ...prereqMissing];
  if (allMissing.length > 0) {
    throw new ContractGateError(
      "定位合同未过咨询门禁，禁止作为战略输出",
      allMissing,
    );
  }

  // 状态机至少应在定位设计或之后
  const stageOk = [
    BrandProjectStage.POSITIONING_DESIGN,
    BrandProjectStage.POSITION_VALIDATION,
    BrandProjectStage.FINAL_STRATEGY,
  ].includes(project.stage);
  if (!stageOk && project.stage !== BrandProjectStage.COMPETITIVE_MAPPING) {
    // 允许从 COMPETITIVE_MAPPING 完成后 advance 进来再 propose；
    // 若仍早于定位设计，门禁已由 assertCanDesignPositioning 覆盖。
  }

  return {
    ...contract,
    status: "proposed",
    prerequisites: p,
  };
}

/** 人工审阅证据：采纳或驳回 */
export function reviewEvidenceItems(
  contract: PositioningContract,
  reviews: Array<{
    evidenceId: string;
    reviewStatus: "accepted" | "rejected" | "pending";
    rejectReason?: string;
  }>,
): PositioningContract {
  if (contract.status !== "draft") {
    throw new ContractGateError("仅草稿合同可审阅证据", [
      `status=${contract.status}`,
    ]);
  }
  const map = new Map(reviews.map((r) => [r.evidenceId, r]));
  return {
    ...contract,
    supportingEvidence: contract.supportingEvidence.map((e) => {
      const r = map.get(e.evidenceId);
      if (!r) return e;
      return {
        ...e,
        reviewStatus: r.reviewStatus,
        rejectReason:
          r.reviewStatus === "rejected"
            ? (r.rejectReason || "创始人驳回，证据不足以支撑定位").trim()
            : undefined,
      };
    }),
  };
}

export function validateContract(
  contract: PositioningContract,
): PositioningContract {
  if (contract.status !== "proposed") {
    throw new ContractGateError("仅 proposed 合同可验证", [
      `status=${contract.status}`,
    ]);
  }
  if (contract.rehearsal?.status !== "passed") {
    throw new ContractGateError("请先完成并通过可复述测试", [
      "positioningContract.rehearsal.status=passed",
    ]);
  }
  return { ...contract, status: "validated" };
}

export function freezeContract(
  contract: PositioningContract,
): PositioningContract {
  if (contract.status !== "validated" && contract.status !== "proposed") {
    throw new ContractGateError("冻结前需至少 proposed/validated", [
      `status=${contract.status}`,
    ]);
  }
  if (contract.rehearsal?.status !== "passed") {
    throw new ContractGateError("请先完成并通过可复述测试再冻结", [
      "positioningContract.rehearsal.status=passed",
    ]);
  }
  // P0：允许 proposed → freeze（等同创始人确认）；严格模式可改为仅 validated
  return {
    ...contract,
    status: "frozen",
    frozenAt: new Date().toISOString(),
  };
}

export const REPORT_CHAPTERS = [
  { no: "01", title: "Brand Brief" },
  { no: "02", title: "Category Diagnosis" },
  { no: "03", title: "Consumer Insight" },
  { no: "04", title: "Competitive Map" },
  { no: "05", title: "Positioning Strategy" },
  { no: "06", title: "Positioning Contract" },
  { no: "07", title: "Brand Architecture" },
  { no: "08", title: "Strategic Recommendations" },
] as const;

