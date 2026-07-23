import {
  type DiagnosisFinding,
  type DiagnosisGap,
  type DiagnosisInsight,
  type DiagnosisSignal,
  type HealthDimensionState,
  type RestaurantDiagnosisRequest,
  type RestaurantDiagnosisResult,
  type RestaurantHealthDeltaRecord,
  type RestaurantHealthModelResult,
  type RestaurantHealthSnapshot,
} from "../contracts";
import type {
  DiagnosisEvidenceRecord,
  DiagnosisObservation,
  DiagnosisPattern,
  RestaurantContextRecord,
} from "../knowledge";
import {
  buildExternalScanJob,
  buildLearningDraft,
  createDiagnosisCase,
} from "../lifecycle";
import { enrichLearning, buildEvolutionState } from "./evolution";
import { buildConsultationReport } from "../engines/council-report";
import { analyzeCompetitionIntelligence } from "../engines/competition-engine";
import {
  analyzeCustomerIntelligence,
  buildCustomerRealityMap,
} from "../engines/customer-engine";
import { buildRestaurantExamReport, examGaps } from "../engines/exam-axes";
import { analyzeGrowthIntelligence } from "../engines/growth-engine";
import { analyzeOperationIntelligence, analyzeServiceIntelligence } from "../engines/operation-engine";
import { analyzeProductIntelligence } from "../engines/product-engine";
import type { EngineAnalysis } from "../engines/types";
import {
  runExperienceOfficer,
  runFinanceOfficer,
  runMarketingOfficer,
  runProductOfficer,
} from "../engines/expert-capabilities";
import { expertResultToAnalysis, mergeAnalyses } from "../engines/expert-bridge";
import {
  aggregateByMonth,
  computePnL,
  decomposeRevenueChange,
  mealContributionIndex,
  type DailyOpsRow,
} from "../engines/diagnosis-math";
import {
  compareHealthLevels,
  decisionTopicFromDimension,
  findPrevLevel,
  focusFromDimension,
  impactFromDimension,
  levelScore,
  makeDeltaSummary,
  severityFromState,
  signalTypeFromDimension,
  sourceTypeFromEvidence,
  titleFromDimension,
} from "./helpers";
import { assessImpact } from "./impact";
import { rankHypotheses } from "./hypothesis";

function parseJsonFact<T>(
  facts: RestaurantDiagnosisRequest["facts"],
  kind: string,
): T | null {
  const raw = facts?.find((f) => f.kind === kind)?.claim;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 由日×餐段账本推导经营冲击上下文，供 impact 评分共用 */
function buildBusinessImpact(
  facts: RestaurantDiagnosisRequest["facts"],
): EngineAnalysis["businessImpact"] {
  const daily = parseJsonFact<DailyOpsRow[]>(facts, "daily_ops_json") || [];
  if (!daily.length) return undefined;

  const months = aggregateByMonth(daily);
  const pnl = computePnL(daily);
  const meals = mealContributionIndex(daily);

  let revenueDeltaPct: number | undefined;
  let trafficDeltaPct: number | undefined;
  if (months.length >= 2) {
    const prev = months[months.length - 2]!;
    const curr = months[months.length - 1]!;
    const decomp = decomposeRevenueChange({
      revenue0: prev.revenue,
      guests0: prev.guests,
      ticket0: prev.avgTicket,
      revenue1: curr.revenue,
      guests1: curr.guests,
      ticket1: curr.avgTicket,
    });
    revenueDeltaPct = decomp.dRevPct;
    trafficDeltaPct = prev.guests
      ? ((curr.guests - prev.guests) / prev.guests) * 100
      : 0;
  }

  return {
    revenueDeltaPct,
    trafficDeltaPct,
    marginPct: pnl.hasCost || pnl.hasExpense ? pnl.marginPct : undefined,
    peakSharePct: meals[0]?.revenueShare,
  };
}

function buildRestaurantContext(
  request: RestaurantDiagnosisRequest,
): RestaurantContextRecord {
  const ctx = request.restaurantContext;
  return {
    restaurantId: ctx.projectId || ctx.storeName || ctx.brandName || "unknown-restaurant",
    brand: ctx.brandName,
    category: ctx.category,
    city: ctx.city,
    location: ctx.address,
    priceRange: request.facts?.find((fact) => fact.kind === "priceRange")?.claim,
    storeStage: ctx.stage,
    businessModel: request.facts?.find((fact) => fact.kind === "businessModel")?.claim,
    operatingModel: request.facts?.find((fact) => fact.kind === "operatingModel")?.claim,
  };
}

function buildEvidenceRecords(
  restaurantId: string,
  evidence: RestaurantDiagnosisRequest["evidence"],
): DiagnosisEvidenceRecord[] {
  return (evidence || []).map((item, index) => ({
    id: item.id || `evidence-${index}`,
    restaurantId,
    source: sourceTypeFromEvidence(item.source),
    type: item.theme || "review",
    content: item.claim,
    capturedAt: item.observedAt || new Date().toISOString(),
    reliability: item.kind === "owner_fact" ? 1 : item.kind === "system_fact" ? 1 : 0.75,
    scope: item.theme,
    metadata: {
      originalSource: item.source,
      sentiment: item.sentiment,
      url: item.url,
    },
  }));
}

function buildDimensionState(
  analysis: EngineAnalysis,
  previousSnapshot: RestaurantHealthSnapshot | undefined,
): HealthDimensionState {
  const previousLevel = findPrevLevel(previousSnapshot, analysis.dimension);
  const direction = compareHealthLevels(previousLevel, analysis.level);
  const magnitude = previousLevel
    ? Math.min(3, Math.abs(levelScore(analysis.level) - levelScore(previousLevel)))
    : 0;
  return {
    dimension: analysis.dimension,
    level: analysis.level,
    previousLevel,
    delta: {
      metric: `${analysis.dimension}_health`,
      direction,
      magnitude: magnitude as 0 | 1 | 2 | 3,
      summary: makeDeltaSummary({
        metric: analysis.dimension,
        previousLevel,
        currentLevel: analysis.level,
        observed: analysis.observed,
      }),
      changed: direction !== "flat",
      evidenceIds: analysis.evidenceIds,
    },
    finding: analysis.finding,
    meaning: analysis.meaning,
    watchHint: analysis.watchHint,
    confidence: analysis.confidence,
    evidenceIds: analysis.evidenceIds,
  };
}

export function runDiagnosisOrchestrator(
  request: RestaurantDiagnosisRequest,
): Omit<RestaurantDiagnosisResult, "agentId" | "ok" | "productName" | "horizon" | "focus" | "asOf"> {
  const evidence = request.evidence || [];
  const previousSnapshot = request.previousSnapshot;
  const restaurantContext = buildRestaurantContext(request);
  const evidenceRecords = buildEvidenceRecords(restaurantContext.restaurantId, evidence);
  const gaps: DiagnosisGap[] = [];

  if (!evidence.length) {
    gaps.push({
      field: "evidence",
      reason: "缺少消费者反馈证据（点评/内容），体验轴无法建立",
      severity: "high",
    });
  }

  const exam = buildRestaurantExamReport({
    facts: request.facts,
    evidence,
    asOf: request.asOf,
  });
  gaps.push(...examGaps(exam));

  // 双轨融合：评论引擎（有证据才跑）与四官专业能力（始终跑，硬门槛不足则拒签）并行，再按维度合并。
  const reviewAnalyses: EngineAnalysis[] = evidence.length
    ? [
        analyzeCustomerIntelligence({ evidence }),
        analyzeServiceIntelligence({ evidence }),
        analyzeOperationIntelligence({ evidence }),
        analyzeProductIntelligence({ evidence }),
        analyzeCompetitionIntelligence({ evidence }),
        analyzeGrowthIntelligence({ evidence }),
      ]
    : [];

  const financeExpert = runFinanceOfficer({ facts: request.facts });
  const productExpert = runProductOfficer({ facts: request.facts, evidence });
  const marketingExpert = runMarketingOfficer({
    facts: request.facts,
    evidence,
    signals: [],
  });
  const experienceExpert = runExperienceOfficer({ facts: request.facts, evidence });
  const expertAnalyses: EngineAnalysis[] = [
    financeExpert,
    productExpert,
    marketingExpert,
    experienceExpert,
  ]
    .filter((item) => !item.refused || (item.signals && item.signals.length))
    .map(expertResultToAnalysis);

  const businessImpact = buildBusinessImpact(request.facts);

  const taggedReview: EngineAnalysis[] = reviewAnalyses.map((item) => ({
    ...item,
    source: "review" as const,
    businessImpact,
  }));
  const taggedExpert: EngineAnalysis[] = expertAnalyses.map((item) => ({
    ...item,
    businessImpact,
  }));

  const analyses: EngineAnalysis[] = mergeAnalyses(taggedReview, taggedExpert);

  const dimensions = analyses.map((analysis) =>
    buildDimensionState(analysis, previousSnapshot),
  );

  const topRisk = dimensions
    .filter((item) => levelScore(item.level) >= levelScore("attention"))
    .sort((a, b) => levelScore(b.level) - levelScore(a.level) || b.confidence - a.confidence)[0];

  const topOpportunity = analyses
    .filter((item) => item.opportunity)
    .sort((a, b) => b.confidence - a.confidence)[0];

  const snapshot: RestaurantHealthSnapshot = {
    asOf: request.asOf || new Date().toISOString(),
    summary: topRisk
      ? `${titleFromDimension(topRisk.dimension, topRisk.delta.direction)}，${topRisk.meaning}`
      : "当前样本未发现明显经营异常，已建立首份健康快照",
    topRiskDimension: topRisk?.dimension,
    topOpportunityDimension: topOpportunity?.dimension,
    dimensions,
  };

  const deltas: RestaurantHealthDeltaRecord[] = dimensions.map((item) => ({
    dimension: item.dimension,
    fromLevel: item.previousLevel || item.level,
    toLevel: item.level,
    direction: item.delta.direction,
    magnitude: item.delta.magnitude,
    summary: item.delta.summary,
    evidenceIds: item.evidenceIds,
  }));

  const evidenceLedger: DiagnosisObservation[] = analyses.map((analysis, index) => ({
    id: `obs-${analysis.dimension}-${index + 1}`,
    evidenceIds: analysis.evidenceIds,
    statement: analysis.observed,
    dimension: analysis.dimension,
    trend:
      analysis.level === "risk" || analysis.level === "attention"
        ? "up"
        : analysis.opportunity
          ? "up"
          : "flat",
    confidence: analysis.confidence,
  }));

  const patterns: DiagnosisPattern[] = analyses.map((analysis, index) => ({
    id: `pattern-${analysis.dimension}-${index + 1}`,
    name: analysis.finding,
    category: analysis.dimension,
    observationIds: evidenceLedger
      .filter((item) => item.dimension === analysis.dimension)
      .map((item) => item.id),
    occurrence: analysis.evidenceIds.length,
    trend:
      analysis.level === "risk" || analysis.level === "attention"
        ? "up"
        : analysis.opportunity
          ? "up"
          : "flat",
    confidence: analysis.confidence,
  }));

  const ranked = analyses
    .map((analysis) => ({ analysis, impactScore: assessImpact(analysis) }))
    .sort((a, b) => b.impactScore - a.impactScore);

  const primary = ranked[0];
  const caseRecord = createDiagnosisCase({
    restaurantId: restaurantContext.restaurantId,
    trigger: topRisk ? topRisk.finding : "initial_scan",
    observations: evidenceLedger.map((item) => item.id),
    patterns: patterns.map((item) => item.id),
    hypothesis: rankHypotheses(analyses, request.previousLearnings),
    impactScore: primary?.impactScore,
    createdAt: request.asOf,
  });

  const signals: DiagnosisSignal[] = ranked
    .filter(({ analysis, impactScore }) => {
      const isExpertSourced = analysis.source === "expert" || analysis.source === "merged";
      const enoughEvidence =
        analysis.evidenceIds.length >= (isExpertSourced ? 1 : 2) ||
        analysis.source === "expert" ||
        analysis.opportunity;
      const hasPattern = analysis.finding.trim().length > 0 && analysis.observed.trim().length > 0;
      const actionPossible = Boolean(analysis.watchHint || analysis.hypotheses[0]?.validationPlan?.length);
      const impactThreshold = isExpertSourced ? 80 : 120;
      return enoughEvidence && hasPattern && impactScore >= impactThreshold && actionPossible;
    })
    .slice(0, 3)
    .map(({ analysis, impactScore }, index) => ({
      id: `sig-${analysis.dimension}-${index + 1}`,
      type: signalTypeFromDimension(analysis.dimension),
      severity: severityFromState(
        dimensions.find((item) => item.dimension === analysis.dimension)?.level || analysis.level,
        dimensions.find((item) => item.dimension === analysis.dimension)?.delta.magnitude || 0,
      ),
      urgency: severityFromState(
        dimensions.find((item) => item.dimension === analysis.dimension)?.level || analysis.level,
        dimensions.find((item) => item.dimension === analysis.dimension)?.delta.magnitude || 0,
      ),
      title: titleFromDimension(
        analysis.dimension,
        dimensions.find((item) => item.dimension === analysis.dimension)?.delta.direction || "flat",
      ),
      category: analysis.dimension,
      observation: analysis.finding,
      pattern:
        dimensions.find((item) => item.dimension === analysis.dimension)?.delta.summary ||
        analysis.observed,
      meaning: analysis.meaning,
      impact: impactFromDimension(analysis.dimension),
      impactScore,
      watchHint: analysis.watchHint,
      confidence: analysis.confidence,
      evidence: analysis.rawEvidence.map((item) => ({
        source: item.source,
        fact: item.claim,
      })),
      decisionTopic: decisionTopicFromDimension(analysis.dimension),
      hypotheses: analysis.hypotheses,
      recommendedValidation:
        analysis.hypotheses.flatMap((item) => item.validationPlan || []).slice(0, 3),
    }));

  const findings: DiagnosisFinding[] = ranked.slice(0, 4).map(({ analysis }, index) => ({
    id: `finding-${analysis.dimension}-${index + 1}`,
    observation: analysis.finding,
    pattern:
      dimensions.find((item) => item.dimension === analysis.dimension)?.delta.summary ||
      analysis.observed,
    meaning: analysis.meaning,
    confidence: analysis.confidence,
    focus: focusFromDimension(analysis.dimension),
    evidenceIds: analysis.evidenceIds,
  }));

  const insights: DiagnosisInsight[] = signals.slice(0, 2).map((signal) => ({
    domain: signal.category || signal.type.toLowerCase(),
    question: signal.decisionTopic || "是否值得进入经营判断",
    finding: signal.observation,
    reasoning: signal.pattern,
    impact: signal.meaning,
    confidence: signal.confidence,
    evidence: signal.evidence.map((item) => ({
      claim: item.fact,
      source: item.source,
    })),
    unknowns:
      evidence.length < 8 ? ["样本量偏少，建议继续累积更多平台证据"] : undefined,
  }));

  const customerMap = buildCustomerRealityMap(evidence);
  const customerLens = {
    theyThink: customerMap.likes.concat(customerMap.hesitates).slice(0, 3),
    biggestOpportunity: topOpportunity?.finding,
    biggestRisk: topRisk?.finding || signals[0]?.title,
  };

  const learningDraft = signals.map((signal) =>
    enrichLearning(
      buildLearningDraft({
        diagnosisId: caseRecord.id,
        hypothesis: signal.hypotheses?.[0]?.statement || signal.observation,
        expectedOutcome: signal.recommendedValidation?.[0],
      }),
    ),
  );

  const evolution = buildEvolutionState(
    request.previousLearnings,
    restaurantContext.restaurantId,
  );

  const consultation = buildConsultationReport({
    request,
    restaurantContext,
    exam,
    health: {
      snapshot,
      previousSnapshot,
      deltas,
    },
    signals,
    gaps,
    customerLens,
    evolution,
    asOf: request.asOf,
  });

  return {
    restaurantContext,
    health: {
      snapshot,
      previousSnapshot,
      deltas,
    } as RestaurantHealthModelResult,
    exam,
    consultation,
    evidenceLedger,
    patterns,
    caseRecord,
    learningDraft,
    evolution,
    externalScan: buildExternalScanJob({
      restaurantId: restaurantContext.restaurantId,
      sources: Array.from(new Set(evidenceRecords.map((item) => item.source))),
      newEvidenceCount: evidenceRecords.length,
      frequency: "daily",
    }),
    findings,
    signals,
    insights,
    gaps,
    customerLens,
  };
}
