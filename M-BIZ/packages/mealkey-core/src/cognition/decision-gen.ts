/**
 * Decision Generator - 决策生成器
 * 
 * 基于评估和风险分析生成结构化决策
 */

import type {
  Decision,
  DecisionContext,
  DecisionGenerator,
  Action,
  Risk,
  Evaluation,
} from "./types";

// ─── Decision Generator 实现 ───

export class DefaultDecisionGenerator implements DecisionGenerator {
  /**
   * 生成决策
   */
  generate(context: DecisionContext): Decision {
    const { project, owner, risks, evaluation } = context;

    // 1. 生成摘要
    const summary = this.generateSummary(evaluation, risks);

    // 2. 生成推理
    const reasoning = this.generateReasoning(evaluation, risks, owner);

    // 3. 计算置信度
    const confidence = this.assessConfidence({
      summary,
      reasoning,
      confidence: 0,
      risks,
      actions: [],
      alternatives: [],
    });

    // 4. 生成行动
    const actions = this.generateActions({
      summary,
      reasoning,
      confidence,
      risks,
      actions: [],
      alternatives: [],
    });

    // 5. 生成替代方案
    const alternatives = this.generateAlternatives(evaluation, risks);

    return {
      summary,
      reasoning,
      confidence,
      risks,
      actions,
      alternatives,
    };
  }

  /**
   * 评估置信度
   */
  assessConfidence(decision: Decision): number {
    let confidence = 70; // 基础置信度

    // 风险影响
    const criticalRisks = decision.risks.filter(r => r.level === "critical");
    const highRisks = decision.risks.filter(r => r.level === "high");

    confidence -= criticalRisks.length * 15;
    confidence -= highRisks.length * 10;

    // 评估分数影响
    if (decision.summary.includes("健康")) confidence += 10;
    if (decision.summary.includes("风险")) confidence -= 10;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * 生成行动步骤
   */
  generateActions(decision: Decision): Action[] {
    const actions: Action[] = [];

    // 基于风险生成行动
    for (const risk of decision.risks) {
      if (risk.mitigation) {
        actions.push({
          nextSteps: risk.mitigation.actions,
          immediate: risk.level === "critical" ? [risk.mitigation.actions[0]] : [],
          shortTerm: risk.mitigation.actions.slice(1, 3),
          longTerm: risk.mitigation.actions.slice(3),
        });
      }
    }

    // 如果没有风险，生成通用行动
    if (actions.length === 0) {
      actions.push({
        nextSteps: ["继续完善项目计划", "收集更多信息"],
        immediate: ["明确项目定位"],
        shortTerm: ["做市场调研"],
        longTerm: ["制定详细执行计划"],
      });
    }

    return actions;
  }

  /**
   * 生成摘要
   */
  private generateSummary(evaluation: Evaluation, risks: Risk[]): string {
    const parts: string[] = [];

    // 评估结果
    if (evaluation.overall >= 80) {
      parts.push("项目整体健康");
    } else if (evaluation.overall >= 60) {
      parts.push("项目基本可行，但需关注风险");
    } else if (evaluation.overall >= 40) {
      parts.push("项目风险较高，需要谨慎");
    } else {
      parts.push("项目风险很高，建议重新评估");
    }

    // 主要风险
    const criticalRisks = risks.filter(r => r.level === "critical");
    if (criticalRisks.length > 0) {
      parts.push(`主要风险: ${criticalRisks[0].description}`);
    }

    return parts.join("。");
  }

  /**
   * 生成推理
   */
  private generateReasoning(
    evaluation: Evaluation,
    risks: Risk[],
    owner: { experience_level?: string; strengths?: string[] }
  ): string[] {
    const reasoning: string[] = [];

    // 评估推理
    if (evaluation.strengths.length > 0) {
      reasoning.push(`优势: ${evaluation.strengths.join(", ")}`);
    }
    if (evaluation.weaknesses.length > 0) {
      reasoning.push(`需要加强: ${evaluation.weaknesses.join(", ")}`);
    }

    // 风险推理
    for (const risk of risks.slice(0, 3)) {
      reasoning.push(`风险: ${risk.description} (${risk.level})`);
    }

    // 经验推理
    if (owner.experience_level === "beginner") {
      reasoning.push("注意: 缺乏餐饮经验，建议先学习或找合伙人");
    }

    return reasoning;
  }

  /**
   * 生成替代方案
   */
  private generateAlternatives(
    evaluation: Evaluation,
    risks: Risk[]
  ): string[] {
    const alternatives: string[] = [];

    // 基于弱点生成替代方案
    if (evaluation.weaknesses.includes("品牌建设")) {
      alternatives.push("先做社区店，积累口碑后再扩张");
    }

    if (evaluation.weaknesses.includes("运营管理")) {
      alternatives.push("找有经验的合伙人或店长");
    }

    // 基于风险生成替代方案
    const financialRisks = risks.filter(r => r.type === "financial");
    if (financialRisks.length > 0) {
      alternatives.push("降低投资规模，先验证模型");
    }

    const marketRisks = risks.filter(r => r.type === "market");
    if (marketRisks.length > 0) {
      alternatives.push("先做小规模测试，验证市场需求");
    }

    // 通用替代方案
    if (alternatives.length === 0) {
      alternatives.push("继续完善项目计划");
      alternatives.push("寻求专家建议");
    }

    return alternatives;
  }
}
