/**
 * 每阶段 StageContract — 咨询质量控制权威表
 */
import { BrandProjectStage, type StageContract } from "./types";

export const STAGE_CONTRACTS: Record<BrandProjectStage, StageContract> = {
  [BrandProjectStage.DISCOVERY]: {
    stage: BrandProjectStage.DISCOVERY,
    label: "品牌基础档案",
    entryCriteria: ["brand_project_created"],
    requiredInputs: ["brand_basics_must_fields"],
    analysisMethod: "brand_basics_profile_intake",
    outputArtifact: "BrandBasicsProfile",
    exitCriteria: [
      "brandBasics.status=complete",
      "discoveryNotes.status=complete",
    ],
  },
  [BrandProjectStage.BRAND_BRIEF]: {
    stage: BrandProjectStage.BRAND_BRIEF,
    label: "定位追问与简报",
    entryCriteria: ["brandBasics.status=complete"],
    requiredInputs: ["brandBasics", "adaptive_followup_answers"],
    analysisMethod: "adaptive_followup_then_compile_brief",
    outputArtifact: "BrandBrief",
    exitCriteria: ["brandBrief.status=complete"],
  },
  [BrandProjectStage.CATEGORY_ANALYSIS]: {
    stage: BrandProjectStage.CATEGORY_ANALYSIS,
    label: "品类机会分析",
    entryCriteria: ["brandBrief.status=complete"],
    requiredInputs: ["brandBrief.categoryDefinition"],
    analysisMethod: "category_battlefield_analysis",
    outputArtifact: "CategoryDiagnosis",
    exitCriteria: [
      "categoryDiagnosis.status=complete",
      "categoryDiagnosis.battlefield",
      "categoryDiagnosis.decision.selected",
      "categoryDiagnosis.decision.reasonOk",
      "evidenceLedger.stageFacts.CATEGORY_ANALYSIS>=1",
    ],
  },
  [BrandProjectStage.CONSUMER_INSIGHT]: {
    stage: BrandProjectStage.CONSUMER_INSIGHT,
    label: "用户洞察",
    entryCriteria: ["categoryDiagnosis.status=complete"],
    requiredInputs: ["brandBrief.targetCustomer", "brandBrief.customerNeed"],
    analysisMethod: "consumer_insight_synthesis",
    outputArtifact: "ConsumerInsight",
    exitCriteria: [
      "consumerInsight.status=complete",
      "consumerInsight.unmetNeeds.length>=1",
      "consumerInsight.insightStatement",
      "consumerInsight.judgmentConfirmed",
      "consumerInsight.insightEvidence.accepted>=2",
      "evidenceLedger.stageFacts.CONSUMER_INSIGHT>=1",
    ],
  },
  [BrandProjectStage.COMPETITIVE_MAPPING]: {
    stage: BrandProjectStage.COMPETITIVE_MAPPING,
    label: "竞争地图",
    entryCriteria: [
      "consumerInsight.status=complete",
      "consumerInsight.judgmentConfirmed",
      "consumerInsight.insightEvidence.accepted>=2",
    ],
    requiredInputs: ["brandBrief.competitiveSet"],
    analysisMethod: "competitive_whitespace_mapping",
    outputArtifact: "CompetitiveMap",
    exitCriteria: [
      "competitiveMap.status=complete",
      "competitiveMap.whitespace",
      "competitiveMap.whitespaceRegion",
      "competitiveMap.plotPoints.length>=3",
      "competitiveMap.plotPoints.hasWhitespaceAndOurBrand",
      "competitiveMap.mapEvidence.accepted>=2",
      "evidenceLedger.stageFacts.COMPETITIVE_MAPPING>=1",
    ],
  },
  [BrandProjectStage.POSITIONING_DESIGN]: {
    stage: BrandProjectStage.POSITIONING_DESIGN,
    label: "定位设计",
    entryCriteria: [
      "brandBrief.status=complete",
      "categoryDiagnosis.status=complete",
      "consumerInsight.status=complete",
      "competitiveMap.status=complete",
      "competitiveMap.whitespace",
      "competitiveMap.whitespaceRegion",
      "competitiveMap.mapEvidence.accepted>=2",
      "evidenceLedger.primaryCoverageOk",
    ],
    requiredInputs: [
      "BrandBrief",
      "CategoryDiagnosis",
      "ConsumerInsight",
      "CompetitiveMap",
    ],
    analysisMethod: "evidence_backed_positioning_contract",
    outputArtifact: "PositioningContract",
    exitCriteria: [
      "positioningContract.status=proposed|validated|frozen",
      "positioningContract.supportingEvidence.length>=3",
    ],
  },
  [BrandProjectStage.POSITION_VALIDATION]: {
    stage: BrandProjectStage.POSITION_VALIDATION,
    label: "定位验证",
    entryCriteria: ["positioningContract.status=proposed"],
    requiredInputs: ["positioningContract"],
    analysisMethod: "founder_validation_gate",
    outputArtifact: "PositioningContract",
    exitCriteria: [
      "positioningContract.status=validated|frozen",
      "positioningContract.rehearsal.status=passed",
    ],
  },
  [BrandProjectStage.FINAL_STRATEGY]: {
    stage: BrandProjectStage.FINAL_STRATEGY,
    label: "战略交付",
    entryCriteria: ["positioningContract.status=validated|frozen"],
    requiredInputs: ["positioningContract", "all_prior_artifacts"],
    analysisMethod: "brand_system_and_signed_report",
    outputArtifact: "BrandSystem+ReportOutline",
    exitCriteria: [
      "reportOutline.chapters.length=8",
      "brandSystem.status=complete",
      "reportOutline.signOffStatus=signed",
    ],
  },
};

/** 进入 POSITIONING_DESIGN 前的人类可读检查清单 */
export const POSITIONING_DESIGN_GATE_CHECKLIST = [
  "品类定义完成（CategoryDiagnosis）",
  "用户画像/洞察完成（ConsumerInsight）",
  "竞争地图完成（CompetitiveMap）",
  "差异机会明确（competitiveMap.whitespace）",
  "BrandBrief 完成",
  "一手证据账本覆盖用户/品类/竞争（≥3 条）",
] as const;
