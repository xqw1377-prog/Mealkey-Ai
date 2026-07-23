/**
 * 将四官能力结果桥接为编排层 EngineAnalysis，实现双轨融合。
 */

import type { DiagnosisEvidenceItem, HealthDimension, HealthLevel } from "../contracts";
import type { ExpertCapabilityResult } from "./expert-capabilities";
import type { EngineAnalysis } from "./types";

const ROLE_DIMENSION: Record<ExpertCapabilityResult["role"], HealthDimension> = {
  finance: "operation",
  product: "product",
  marketing: "growth",
  experience: "service",
};

function levelFromExpert(result: ExpertCapabilityResult): HealthLevel {
  if (result.refused) return "critical";
  return result.level;
}

/** 四官 → 编排层分析单元（可与评论引擎合并排序） */
export function expertResultToAnalysis(result: ExpertCapabilityResult): EngineAnalysis {
  const dimension = ROLE_DIMENSION[result.role];
  const topSignals = (result.signals || []).filter((s) => s.severity !== "healthy");
  const finding =
    topSignals[0]?.statement ||
    result.risks[0] ||
    result.verdict.slice(0, 80) ||
    `${result.title}观察`;
  const meaning =
    result.analyses
      .filter((a) => a.metricId)
      .slice(0, 2)
      .map((a) => `${a.label}：${a.value}`)
      .join("；") || result.verdict;
  const observed =
    result.observations.slice(0, 2).join("；") ||
    result.analyses[0]?.value ||
    result.verdict;

  const rawEvidence: DiagnosisEvidenceItem[] = (
    result.analyses.length
      ? result.analyses
      : [{ label: result.title, value: result.verdict, metricId: undefined }]
  )
    .slice(0, 6)
    .map((cell, index) => ({
      id: `${result.role}-${cell.metricId || index}`,
      source: `${result.title}·可复核指标`,
      claim: `${cell.label}：${cell.value}`,
      kind: "system_fact" as const,
      theme: result.role,
      observedAt: new Date().toISOString(),
    }));

  const hypotheses = [
    {
      statement: finding,
      probability: result.refused
        ? 0.35
        : Math.min(0.92, 0.45 + result.confidence * 0.4),
      supportingEvidence: result.analyses
        .filter((a) => a.metricId)
        .slice(0, 3)
        .map((a) => a.metricId!),
      validationPlan: result.counsel.slice(0, 2),
    },
    ...result.risks.slice(0, 2).map((risk) => ({
      statement: risk,
      probability: Math.min(0.85, 0.4 + result.confidence * 0.3),
      supportingEvidence: [`${result.role}-risk`],
      validationPlan: result.counsel.slice(0, 1),
    })),
  ];

  return {
    dimension,
    level: levelFromExpert(result),
    finding,
    meaning,
    observed,
    confidence: result.confidence,
    evidenceIds: result.analyses
      .map((a) => a.metricId)
      .filter(Boolean)
      .slice(0, 6) as string[],
    watchHint: result.counsel[0],
    hypotheses,
    opportunity: result.level === "healthy" || result.level === "observe",
    rawEvidence,
    source: "expert",
    expertRole: result.role,
    metricIds: result.analyses.map((a) => a.metricId).filter(Boolean) as string[],
  };
}

export function mergeAnalyses(
  review: EngineAnalysis[],
  expert: EngineAnalysis[],
): EngineAnalysis[] {
  const byDim = new Map<HealthDimension, EngineAnalysis>();
  for (const item of [...review, ...expert]) {
    const prev = byDim.get(item.dimension);
    if (!prev) {
      byDim.set(item.dimension, item);
      continue;
    }
    // 同维度：取更差等级；假设合并；置信取高
    const rank: Record<HealthLevel, number> = {
      healthy: 0,
      observe: 1,
      attention: 2,
      risk: 3,
      critical: 4,
    };
    const worse = rank[item.level] >= rank[prev.level] ? item : prev;
    const betterConf = item.confidence >= prev.confidence ? item : prev;
    byDim.set(item.dimension, {
      ...worse,
      confidence: Math.max(prev.confidence, item.confidence),
      hypotheses: [...prev.hypotheses, ...item.hypotheses]
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 4),
      evidenceIds: [...new Set([...prev.evidenceIds, ...item.evidenceIds])].slice(0, 8),
      meaning: [prev.meaning, item.meaning].filter(Boolean).join("｜").slice(0, 220),
      watchHint: worse.watchHint || betterConf.watchHint,
      source: prev.source === "expert" || item.source === "expert" ? "merged" : worse.source,
    });
  }
  return [...byDim.values()];
}
