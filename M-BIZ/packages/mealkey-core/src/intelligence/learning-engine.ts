/**
 * Learning Engine — 经营学习循环
 *
 * 一次决策不是结束。完整循环：
 * Decision → Execute → Result → Compare → Learn → Memory Update
 *
 * 这是 MealKey OS 的进化能力。
 */

import type { MKDecision, MKContext } from "@mealkey/agent-sdk";

/** 知识引用（与 chief-agent.ts 中的 KnowledgeRef 结构一致） */
export interface KnowledgeRefRecord {
  id: string;
  type: "rule" | "case" | "model";
  title: string;
  relevance: number;
}

export interface LearningOutcome {
  /** 决策 ID */
  decisionId: string;
  /** 实际结果描述 */
  result: string;
  /** 结果评分 0-1 */
  score: number;
  /** 哪些判断正确 */
  correct: string[];
  /** 哪些判断错误 */
  incorrect: string[];
  /** 学到的教训 */
  lessons: string[];
  /** 本次判断引用的知识节点 */
  knowledgeRefs?: KnowledgeRefRecord[];
}

export interface LearningInsight {
  /** 洞察类型 */
  type: "rule_update" | "case_add" | "model_adjust" | "preference_update";
  /** 描述 */
  description: string;
  /** 置信度 */
  confidence: number;
  /** 应用范围 */
  scope: "owner" | "project" | "global";
}

export interface LearningEngineDeps {
  saveMemory: (ownerId: string, memory: {
    layer: string;
    key: string;
    value: unknown;
    importance: number;
    source: string;
    projectId?: string;
  }) => Promise<void>;
}

export class LearningEngine {
  constructor(private deps: LearningEngineDeps) {}

  /**
   * 从结果中学习
   */
  async learnFromOutcome(
    ownerId: string,
    decision: MKDecision,
    outcome: LearningOutcome
  ): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // 1. 分析判断准确性
    const accuracy = this.analyzeAccuracy(decision, outcome);

    // 2. 如果判断错误，提取教训
    if (outcome.score < 0.6 && outcome.lessons.length > 0) {
      for (const lesson of outcome.lessons) {
        await this.deps.saveMemory(ownerId, {
          layer: "learning",
          key: `lesson_${decision.problem}_${Date.now()}`,
          value: {
            problem: decision.problem,
            judgement: decision.judgement,
            actualResult: outcome.result,
            lesson,
            confidence: decision.confidence,
            actualScore: outcome.score,
          },
          importance: 0.9,
          source: "learning_engine",
        });

        insights.push({
          type: "case_add",
          description: `学习: ${lesson}`,
          confidence: 0.8,
          scope: "owner",
        });
      }
    }

    // 3. 如果判断正确，强化记忆
    if (outcome.score >= 0.8) {
      await this.deps.saveMemory(ownerId, {
        layer: "decision",
        key: `validated_${decision.problem}_${Date.now()}`,
        value: {
          problem: decision.problem,
          judgement: decision.judgement,
          result: outcome.result,
          score: outcome.score,
        },
        importance: 0.7,
        source: "learning_engine",
      });

      insights.push({
        type: "rule_update",
        description: `验证: ${decision.judgement} → ${outcome.result}`,
        confidence: outcome.score,
        scope: "owner",
      });
    }

    // 4. 更新认知模型
    if (accuracy.overall < 0.5) {
      insights.push({
        type: "model_adjust",
        description: `判断模型需要调整: ${decision.problem}`,
        confidence: 0.6,
        scope: "global",
      });
    }

    // 5. 沉淀知识引用：将本次判断引用的知识节点存入记忆
    if (outcome.knowledgeRefs && outcome.knowledgeRefs.length > 0) {
      const topRefs = outcome.knowledgeRefs
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5);
      await this.deps.saveMemory(ownerId, {
        layer: "learning",
        key: `knowledge_refs_${decision.problem}_${Date.now()}`,
        value: {
          decisionId: outcome.decisionId,
          problem: decision.problem,
          judgement: decision.judgement,
          score: outcome.score,
          refs: topRefs.map(r => ({
            id: r.id,
            type: r.type,
            title: r.title,
          })),
        },
        importance: 0.6,
        source: "learning_engine",
      });
    }

    return insights;
  }

  /**
   * 分析判断准确性
   */
  private analyzeAccuracy(
    decision: MKDecision,
    outcome: LearningOutcome
  ): { overall: number; details: Record<string, number> } {
    const details: Record<string, number> = {};

    // 信心校准: 高信心但低结果 = 过度自信
    const confidenceCalibration = 1 - Math.abs(decision.confidence - outcome.score);
    details.confidenceCalibration = confidenceCalibration;

    // 判断命中: 正确判断数 / 总判断数
    const totalJudgements = outcome.correct.length + outcome.incorrect.length;
    const judgementHitRate = totalJudgements > 0 ? outcome.correct.length / totalJudgements : 0.5;
    details.judgementHitRate = judgementHitRate;

    // 综合评分
    const overall = (confidenceCalibration + judgementHitRate) / 2;

    return { overall, details };
  }

  /**
   * 批量学习: 从多个决策结果中提取模式
   */
  async learnFromBatch(
    ownerId: string,
    outcomes: Array<{ decision: MKDecision; outcome: LearningOutcome }>
  ): Promise<LearningInsight[]> {
    const allInsights: LearningInsight[] = [];

    // 统计模式
    const problemTypes = new Map<string, { count: number; avgScore: number }>();

    for (const { decision, outcome } of outcomes) {
      const existing = problemTypes.get(decision.problem) ?? { count: 0, avgScore: 0 };
      existing.count++;
      existing.avgScore = (existing.avgScore * (existing.count - 1) + outcome.score) / existing.count;
      problemTypes.set(decision.problem, existing);

      // 逐个学习
      const insights = await this.learnFromOutcome(ownerId, decision, outcome);
      allInsights.push(...insights);
    }

    // 识别系统性问题
    for (const [problem, stats] of problemTypes) {
      if (stats.count >= 3 && stats.avgScore < 0.5) {
        allInsights.push({
          type: "model_adjust",
          description: `系统性问题: "${problem}" 类型判断平均得分 ${stats.avgScore.toFixed(2)}，需要改进`,
          confidence: 0.9,
          scope: "global",
        });
      }
    }

    return allInsights;
  }
}
