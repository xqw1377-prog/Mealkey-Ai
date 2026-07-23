/**
 * M-PNT Decision Engine V1 — 决策追踪
 *
 * 记录每个候选方向在每一维度的评分过程和理由。
 * V1 新增，不改变任何现有接口。
 */
import type { TheorySource, RiskLevel, TheoryRecommend, PositionCandidate, MatrixInputPackage } from "../matrix/types";
import type { DimensionTrace, DecisionTraceEntry, DimensionId } from "./types";
import { DEFAULT_DIMENSIONS, getWeights } from "./score-card";

// ─── 追踪收集器 ───────────────────────────────────────────────

export class DecisionTraceCollector {
  private traces: DecisionTraceEntry[] = [];
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  /**
   * 记录一个候选方向在某个理论下的完整评估追踪
   */
  add(
    candidate: PositionCandidate,
    theoryId: TheorySource,
    dimensions: DimensionTrace[],
    totalScore: number,
    theoryRecommend: TheoryRecommend,
    mainRisks: Array<{ risk: string; severity: RiskLevel }>,
  ): void {
    if (!this.enabled) return;

    this.traces.push({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateOneLiner: candidate.oneLiner,
      theoryId,
      dimensions,
      totalScore,
      theoryRecommend,
      mainRisks,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取某理论体系下所有候选方向的追踪
   */
  getByTheory(theoryId: TheorySource): DecisionTraceEntry[] {
    return this.traces.filter(t => t.theoryId === theoryId);
  }

  /**
   * 获取某候选方向在所有理论下的追踪
   */
  getByCandidate(candidateId: string): DecisionTraceEntry[] {
    return this.traces.filter(t => t.candidateId === candidateId);
  }

  /**
   * 获取所有追踪
   */
  getAll(): DecisionTraceEntry[] {
    return this.traces;
  }

  /**
   * 生成人类可读的决策理由
   */
  generateWhyText(
    candidate: PositionCandidate,
    theoryId: TheorySource,
  ): string {
    const entries = this.getByCandidate(candidate.id)
      .filter(t => t.theoryId === theoryId);

    if (entries.length === 0) return "";

    const entry = entries[0];
    const strongDims = entry.dimensions
      .filter(d => d.rawScore >= 70)
      .map(d => `${d.dimensionName}(${d.rawScore}分)`);
    const weakDims = entry.dimensions
      .filter(d => d.rawScore < 40)
      .map(d => `${d.dimensionName}(${d.rawScore}分)`);

    const parts: string[] = [];
    parts.push(`【${theoryId === 'ries' ? '里斯' : theoryId === 'trout' ? '特劳特' : '叶茂中'}视角】`);
    parts.push(`「${candidate.oneLiner}」综合评分 ${entry.totalScore}/100`);

    if (strongDims.length > 0) {
      parts.push(`优势维度：${strongDims.join("、")}`);
    }
    if (weakDims.length > 0) {
      parts.push(`薄弱维度：${weakDims.join("、")}`);
    }
    if (entry.mainRisks.length > 0) {
      parts.push(`主要风险：${entry.mainRisks.map(r => `${r.severity} ${r.risk}`).join("；")}`);
    }

    return parts.join("。");
  }

  /**
   * 生成简化的评分摘要（用于 TheoryView.direction_scores）
   */
  generateScoreSummary(
    candidate: PositionCandidate,
    theoryId: TheorySource,
  ): { score: number; recommend: TheoryRecommend; risks: Array<{ risk: string; severity: RiskLevel }> } {
    const entries = this.getByCandidate(candidate.id)
      .filter(t => t.theoryId === theoryId);

    if (entries.length === 0) {
      return { score: 50, recommend: "neutral" as TheoryRecommend, risks: [] };
    }

    const e = entries[0];
    return {
      score: e.totalScore,
      recommend: e.theoryRecommend,
      risks: e.mainRisks,
    };
  }

  /**
   * 构建维度打分详情字符串（用于 TheoryView.why_this_direction）
   */
  generateDimDetails(
    candidate: PositionCandidate,
    theoryId: TheorySource,
  ): string {
    const entries = this.getByCandidate(candidate.id)
      .filter(t => t.theoryId === theoryId);

    if (entries.length === 0) return "";

    const entry = entries[0];
    return entry.dimensions
      .map(d => `${d.dimensionName}(${d.rawScore}分/权重${d.weight}): ${d.reason}`)
      .join("\n");
  }

  clear(): void {
    this.traces = [];
  }
}

// ─── 单例 ─────────────────────────────────────────────────────

let globalCollector: DecisionTraceCollector | null = null;

export function getTraceCollector(enabled = true): DecisionTraceCollector {
  if (!globalCollector) {
    globalCollector = new DecisionTraceCollector(enabled);
  }
  return globalCollector;
}

export function resetTraceCollector(): void {
  globalCollector = null;
}
