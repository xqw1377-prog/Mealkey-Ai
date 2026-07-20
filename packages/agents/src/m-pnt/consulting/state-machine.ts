/**
 * Brand Strategy Project Lifecycle — 咨询状态机
 */
import { STAGE_CONTRACTS } from "./stage-contracts";
import {
  BRAND_PROJECT_STAGE_ORDER,
  BrandProjectStage,
  StageGateError,
  type BrandBrief,
  type BrandStrategyProject,
  type CategoryDiagnosis,
  type CompetitiveMap,
  type ConsumerInsight,
  type DiscoveryNotes,
  type PositioningContract,
  type ReportOutline,
  type BrandSystem,
  type EvidenceLedger,
} from "./types";
import type { MpntJourneyAssets } from "./journey-types";

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nonEmpty(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value != null;
}

function evaluateGate(
  project: BrandStrategyProject,
  criterion: string,
): boolean {
  const a = project.assets;
  switch (criterion) {
    case "brand_project_created":
      return Boolean(project.brandProjectId);
    case "brand_basics_must_fields":
    case "brandBasics.status=complete":
      return a.brandBasics?.status === "complete";
    case "discoveryNotes.status=complete":
      return a.discoveryNotes?.status === "complete";
    case "brandBrief.status=complete":
      return a.brandBrief?.status === "complete";
    case "categoryDiagnosis.status=complete":
      return a.categoryDiagnosis?.status === "complete";
    case "categoryDiagnosis.battlefield":
      return nonEmpty(a.categoryDiagnosis?.battlefield);
    case "categoryDiagnosis.decision.selected":
      return Boolean(a.categoryDiagnosis?.decision?.selectedOptionId);
    case "categoryDiagnosis.decision.reasonOk":
      return (
        (a.categoryDiagnosis?.decision?.decisionReason?.trim().length ?? 0) >= 20
      );
    case "consumerInsight.status=complete":
      return a.consumerInsight?.status === "complete";
    case "consumerInsight.unmetNeeds.length>=1":
      return (a.consumerInsight?.unmetNeeds?.length ?? 0) >= 1;
    case "consumerInsight.insightStatement":
      return (a.consumerInsight?.insightStatement?.trim().length ?? 0) >= 40;
    case "consumerInsight.judgmentConfirmed":
      return Boolean(a.consumerInsight?.judgmentConfirmedAt);
    case "consumerInsight.insightEvidence.accepted>=2":
      return (
        (a.consumerInsight?.insightEvidence || []).filter(
          (e) => e.reviewStatus === "accepted",
        ).length >= 2
      );
    case "competitiveMap.status=complete":
      return a.competitiveMap?.status === "complete";
    case "competitiveMap.whitespace":
      return nonEmpty(a.competitiveMap?.whitespace);
    case "competitiveMap.plotPoints.length>=3":
      return (a.competitiveMap?.plotPoints?.length ?? 0) >= 3;
    case "competitiveMap.whitespaceRegion":
      return Boolean(
        a.competitiveMap?.whitespaceRegion &&
          typeof a.competitiveMap.whitespaceRegion.x === "number" &&
          typeof a.competitiveMap.whitespaceRegion.y === "number",
      );
    case "competitiveMap.plotPoints.hasWhitespaceAndOurBrand": {
      const kinds = new Set(
        (a.competitiveMap?.plotPoints || []).map((p) => p.kind),
      );
      return kinds.has("whitespace") && kinds.has("our_brand");
    }
    case "competitiveMap.mapEvidence.accepted>=2":
      return (
        (a.competitiveMap?.mapEvidence || []).filter(
          (e) => e.reviewStatus === "accepted",
        ).length >= 2
      );
    case "evidenceLedger.stageFacts.CATEGORY_ANALYSIS>=1":
      return (
        (a.evidenceLedger?.facts || []).filter(
          (f) =>
            f.relatedStage === "CATEGORY_ANALYSIS" &&
            f.verificationStatus === "verified" &&
            !f.tags?.includes("seed_from_brief") &&
            !f.tags?.includes("needs_verification"),
        ).length >= 1
      );
    case "evidenceLedger.stageFacts.CONSUMER_INSIGHT>=1":
      return (
        (a.evidenceLedger?.facts || []).filter(
          (f) =>
            f.relatedStage === "CONSUMER_INSIGHT" &&
            f.verificationStatus === "verified" &&
            !f.tags?.includes("seed_from_brief") &&
            !f.tags?.includes("needs_verification"),
        ).length >= 1
      );
    case "evidenceLedger.stageFacts.COMPETITIVE_MAPPING>=1":
      return (
        (a.evidenceLedger?.facts || []).filter(
          (f) =>
            f.relatedStage === "COMPETITIVE_MAPPING" &&
            f.verificationStatus === "verified" &&
            !f.tags?.includes("seed_from_brief") &&
            !f.tags?.includes("needs_verification"),
        ).length >= 1
      );
    case "evidenceLedger.primaryCoverageOk": {
      const facts = (a.evidenceLedger?.facts || []).filter(
        (f) =>
          f.verificationStatus === "verified" &&
          !f.tags?.includes("seed_from_brief") &&
          !f.tags?.includes("needs_verification"),
      );
      if (facts.length < 3) return false;
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
      return hasCustomer && hasCategory && hasCompetition;
    }
    case "positioningContract.status=proposed":
      return a.positioningContract?.status === "proposed";
    case "positioningContract.status=proposed|validated|frozen":
      return ["proposed", "validated", "frozen"].includes(
        a.positioningContract?.status || "",
      );
    case "positioningContract.status=validated|frozen":
      return ["validated", "frozen"].includes(
        a.positioningContract?.status || "",
      );
    case "positioningContract.rehearsal.status=passed":
      return a.positioningContract?.rehearsal?.status === "passed";
    case "positioningContract.supportingEvidence.length>=3":
      return (
        (a.positioningContract?.supportingEvidence || []).filter(
          (e) => !e.reviewStatus || e.reviewStatus === "accepted",
        ).length >= 3
      );
    case "reportOutline.chapters.length=8":
      return (a.reportOutline?.chapters?.length ?? 0) === 8;
    case "reportOutline.signOffStatus=signed":
      return a.reportOutline?.signOffStatus === "signed";
    case "brandSystem.status=complete":
      return a.brandSystem?.status === "complete";
    default:
      return false;
  }
}

export function listMissingCriteria(
  project: BrandStrategyProject,
  criteria: string[],
): string[] {
  return criteria.filter((c) => !evaluateGate(project, c));
}

export function createBrandProject(
  projectId: string,
  boundBrandId?: string,
): BrandStrategyProject {
  const brandProjectId = createId("bpnt");
  return {
    projectId,
    brandProjectId,
    boundBrandId,
    stage: BrandProjectStage.DISCOVERY,
    stageStatus: "active",
    blockedReasons: [],
    assets: {},
    history: [],
    updatedAt: nowIso(),
  };
}

export function getStageContract(stage: BrandProjectStage) {
  return STAGE_CONTRACTS[stage];
}

/** 是否允许进入目标阶段（含当前阶段的 entryCriteria） */
export function assertCanEnter(
  project: BrandStrategyProject,
  target: BrandProjectStage,
): void {
  const contract = STAGE_CONTRACTS[target];
  const missing = listMissingCriteria(project, contract.entryCriteria);
  if (missing.length > 0) {
    throw new StageGateError(
      `无法进入「${contract.label}」：咨询门禁未通过`,
      missing,
    );
  }
}

/** 当前阶段 exitCriteria 是否满足 */
export function canExitCurrentStage(project: BrandStrategyProject): {
  ok: boolean;
  missing: string[];
} {
  const contract = STAGE_CONTRACTS[project.stage];
  const missing = listMissingCriteria(project, contract.exitCriteria);
  return { ok: missing.length === 0, missing };
}

export function nextStage(
  stage: BrandProjectStage,
): BrandProjectStage | null {
  const idx = BRAND_PROJECT_STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= BRAND_PROJECT_STAGE_ORDER.length - 1) return null;
  return BRAND_PROJECT_STAGE_ORDER[idx + 1]!;
}

/**
 * 在 exitCriteria 满足时推进到下一阶段。
 * 下一阶段 entryCriteria 不满足 → blocked。
 */
export function advance(
  project: BrandStrategyProject,
  reason = "stage_complete",
): BrandStrategyProject {
  const exit = canExitCurrentStage(project);
  if (!exit.ok) {
    return {
      ...project,
      stageStatus: "blocked",
      blockedReasons: exit.missing,
      updatedAt: nowIso(),
    };
  }

  const to = nextStage(project.stage);
  if (!to) {
    return {
      ...project,
      stageStatus: "complete",
      blockedReasons: [],
      updatedAt: nowIso(),
    };
  }

  const entryMissing = listMissingCriteria(
    project,
    STAGE_CONTRACTS[to].entryCriteria,
  );
  if (entryMissing.length > 0) {
    return {
      ...project,
      stageStatus: "blocked",
      blockedReasons: entryMissing,
      updatedAt: nowIso(),
    };
  }

  return {
    ...project,
    stage: to,
    stageStatus: "active",
    blockedReasons: [],
    history: [
      ...project.history,
      {
        at: nowIso(),
        from: project.stage,
        to,
        reason,
      },
    ],
    updatedAt: nowIso(),
  };
}

export function writeDiscoveryNotes(
  project: BrandStrategyProject,
  notes: Omit<DiscoveryNotes, "artifactId"> & { artifactId?: string },
): BrandStrategyProject {
  return {
    ...project,
    assets: {
      ...project.assets,
      discoveryNotes: {
        artifactId: notes.artifactId || createId("disc"),
        status: notes.status,
        enterpriseStage: notes.enterpriseStage,
        category: notes.category,
        productSummary: notes.productSummary,
        businessGoal: notes.businessGoal,
        notes: notes.notes,
      },
    },
    updatedAt: nowIso(),
  };
}

export function writeBrandBasics(
  project: BrandStrategyProject,
  basics: NonNullable<BrandStrategyProject["assets"]["brandBasics"]>,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, brandBasics: basics },
    updatedAt: nowIso(),
  };
}

export function writeAdaptiveFollowups(
  project: BrandStrategyProject,
  followups: NonNullable<BrandStrategyProject["assets"]["adaptiveFollowups"]>,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, adaptiveFollowups: followups },
    updatedAt: nowIso(),
  };
}

export function writeBrandBrief(
  project: BrandStrategyProject,
  brief: BrandBrief,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, brandBrief: brief },
    updatedAt: nowIso(),
  };
}

export function writeCategoryDiagnosis(
  project: BrandStrategyProject,
  artifact: CategoryDiagnosis,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, categoryDiagnosis: artifact },
    updatedAt: nowIso(),
  };
}

export function writeConsumerInsight(
  project: BrandStrategyProject,
  artifact: ConsumerInsight,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, consumerInsight: artifact },
    updatedAt: nowIso(),
  };
}

export function writeCompetitiveMap(
  project: BrandStrategyProject,
  artifact: CompetitiveMap,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, competitiveMap: artifact },
    updatedAt: nowIso(),
  };
}

export function writePositioningContract(
  project: BrandStrategyProject,
  contract: PositioningContract,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, positioningContract: contract },
    updatedAt: nowIso(),
  };
}

export function writeReportOutline(
  project: BrandStrategyProject,
  outline: ReportOutline,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, reportOutline: outline },
    updatedAt: nowIso(),
  };
}

export function writeBrandSystem(
  project: BrandStrategyProject,
  system: BrandSystem,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, brandSystem: system },
    updatedAt: nowIso(),
  };
}

export function writeEvidenceLedger(
  project: BrandStrategyProject,
  ledger: EvidenceLedger,
): BrandStrategyProject {
  return {
    ...project,
    assets: { ...project.assets, evidenceLedger: ledger },
    updatedAt: nowIso(),
  };
}

export function writeJourneyAssets(
  project: BrandStrategyProject,
  journey: MpntJourneyAssets,
): BrandStrategyProject {
  return {
    ...project,
    assets: {
      ...project.assets,
      journey: { ...project.assets.journey, ...journey },
    },
    updatedAt: nowIso(),
  };
}

/** 进入定位设计前的门禁检查（给 UI / 引擎共用） */
export function assertCanDesignPositioning(project: BrandStrategyProject): void {
  assertCanEnter(project, BrandProjectStage.POSITIONING_DESIGN);
}
