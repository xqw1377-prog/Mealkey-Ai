/**
 * M-PNT Decision Engine V1 — 核心引擎
 *
 * 替代 evaluateByRules()，提供按理论差异化的多维度评估。
 * 不改变 TheoryView / TheoryAgent 接口。
 */
import type { TheorySource, RiskLevel, TheoryRecommend, MatrixInputPackage, PositionCandidate, TheoryView } from "../matrix/types";
import type { DecisionEngineConfig, DimensionTrace } from "./types";
import { DEFAULT_DIMENSIONS, getWeights } from "./score-card";
import { getTraceCollector } from "./trace";

// ─── 推荐等级映射 ─────────────────────────────────────────────

const THEORY_THRESHOLDS = {
  strong_recommend: 80,
  recommend: 62,
  neutral: 45,
};

function scoreToRecommend(score: number): TheoryRecommend {
  if (score >= THEORY_THRESHOLDS.strong_recommend) return "strong_recommend";
  if (score >= THEORY_THRESHOLDS.recommend) return "recommend";
  if (score >= THEORY_THRESHOLDS.neutral) return "neutral";
  return "not_recommend";
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ─── 决策引擎 ─────────────────────────────────────────────────

export class DecisionEngine {
  private config: DecisionEngineConfig;

  constructor(config: DecisionEngineConfig = {}) {
    this.config = {
      enableTracing: true,
      ...config,
    };
  }

  /**
   * 对单个候选方向执行六维评估
   */
  evaluateCandidate(
    candidate: PositionCandidate,
    pkg: MatrixInputPackage,
    theoryId: TheorySource,
  ): {
    totalScore: number;
    theoryRecommend: TheoryRecommend;
    dimensionScores: DimensionTrace[];
    mainRisks: Array<{ risk: string; severity: RiskLevel }>;
  } {
    const weights = getWeights(theoryId);
    const dimensions = this.config.customDimensions || DEFAULT_DIMENSIONS;

    const dimensionScores: DimensionTrace[] = [];
    const allRisks: Array<{ risk: string; severity: RiskLevel }> = [];
    let totalWeighted = 0;
    let totalWeight = 0;

    for (const dim of dimensions) {
      // 执行评分函数
      const result = dim.scoreFn(candidate, pkg, theoryId);

      // 获取该理论下的权重
      const weight = dim.theoryWeights?.[theoryId] ?? dim.weight;

      // 加权分
      const weighted = (result.score * weight) / 100;
      totalWeighted += weighted;
      totalWeight += weight;

      // 记录维度追踪
      dimensionScores.push({
        dimensionId: dim.id,
        dimensionName: dim.name,
        rawScore: result.score,
        weight,
        weightedScore: Math.round(weighted * 10) / 10,
        reason: result.reason,
        evidence: result.evidence,
        risk: result.risk,
      });

      // 收集风险
      if (result.risk) {
        allRisks.push(result.risk);
      }
    }

    // 计算总分（加权平均后归一化到 0-100）
    const totalScore = totalWeight > 0
      ? clampScore(Math.round((totalWeighted / totalWeight) * 100))
      : 50;

    const theoryRecommend = scoreToRecommend(totalScore);

    // 去重风险
    const uniqueRisks = deduplicateRisks(allRisks);

    // 记录追踪
    if (this.config.enableTracing) {
      const collector = getTraceCollector(true);
      collector.add(candidate, theoryId, dimensionScores, totalScore, theoryRecommend, uniqueRisks);
    }

    return {
      totalScore,
      theoryRecommend,
      dimensionScores,
      mainRisks: uniqueRisks,
    };
  }

  /**
   * 对所有候选方向执行评估，返回 TheoryView
   */
  evaluateAll(
    theoryId: TheorySource,
    pkg: MatrixInputPackage,
  ): TheoryView {
    const candidates = pkg.candidates || [];

    // 空候选处理
    if (candidates.length === 0) {
      return {
        agent_id: theoryId,
        agent_name: getAgentName(theoryId),
        preferred_direction: "",
        preferred_candidate_id: undefined,
        why_this_direction: "无可评估的候选方向",
        rejected_directions: [],
        core_strategic_logic: getCoreLogic(theoryId),
        key_mental_position: "",
        main_risks: [{ risk: "无候选方向可评估", severity: "R1" as RiskLevel }],
        direction_scores: [],
        theory_recommend: "neutral" as TheoryRecommend,
        recommendation_level: "neutral" as TheoryRecommend,
        confidence: 0.3,
      };
    }

    // 逐候选评估
    const evaluated = candidates.map(c => ({
      candidate: c,
      result: this.evaluateCandidate(c, pkg, theoryId),
    }));

    // 按总分排序
    evaluated.sort((a, b) => b.result.totalScore - a.result.totalScore);

    const best = evaluated[0];
    const collector = getTraceCollector();

    // 构建 TheoryView
    const view: TheoryView = {
      agent_id: theoryId,
      agent_name: getAgentName(theoryId),
      preferred_direction: best.candidate.name,
      preferred_candidate_id: best.candidate.id,
      why_this_direction: collector.generateWhyText(best.candidate, theoryId) ||
        `【${getAgentName(theoryId)}】「${best.candidate.oneLiner}」综合评分 ${best.result.totalScore}/100`,
      rejected_directions: evaluated
        .filter(e => e !== best && e.result.theoryRecommend === "not_recommend")
        .map(e => ({
          name: e.candidate.name,
          reason: `评分${e.result.totalScore}，${e.result.mainRisks.map(r => r.risk).join("；") || "未达推荐标准"}`,
        })),
      core_strategic_logic: getCoreLogic(theoryId),
      key_mental_position: best.candidate.oneLiner,
      main_risks: best.result.mainRisks.length > 0
        ? best.result.mainRisks
        : [{ risk: `【${getAgentShortName(theoryId)}】标准风控检查通过`, severity: "R1" as RiskLevel }],
      direction_scores: evaluated.map(e => ({
        name: e.candidate.name,
        theory_score: e.result.totalScore,
        theory_recommend: e.result.theoryRecommend,
      })),
      theory_recommend: best.result.theoryRecommend,
      recommendation_level: best.result.theoryRecommend,
      confidence: Math.min(0.9, 0.4 + best.result.totalScore / 180),
    };

    return view;
  }
}

// ─── 辅助函数 ─────────────────────────────────────────────────

function getAgentName(id: TheorySource): string {
  switch (id) {
    case "ries": return "里斯定位 Agent";
    case "trout": return "特劳特定位 Agent";
    case "ye_maozhong": return "叶茂中冲突营销 Agent";
  }
}

function getAgentShortName(id: TheorySource): string {
  switch (id) {
    case "ries": return "里斯";
    case "trout": return "特劳特";
    case "ye_maozhong": return "冲突营销";
  }
}

function getCoreLogic(id: TheorySource): string {
  switch (id) {
    case "ries": return "在心智中抢占第一位置。聚焦单一概念，建立领导资产。";
    case "trout": return "定位是相对于竞争的。不是更好，而是不同。";
    case "ye_maozhong": return "没有冲突就没有记忆。制造旧选择vs新选择的张力。";
  }
}

function deduplicateRisks(
  risks: Array<{ risk: string; severity: RiskLevel }>,
): Array<{ risk: string; severity: RiskLevel }> {
  const seen = new Set<string>();
  return risks.filter(r => {
    const key = r.risk.slice(0, 20);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
