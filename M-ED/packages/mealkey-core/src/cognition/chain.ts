/**
 * Judgment Chain - 判断链
 * 
 * 完整的判断流程:
 * Observation → Diagnosis → Evaluation → Strategy → Action
 */

import type {
  JudgmentChain,
  JudgmentInput,
  JudgmentStep,
  StepContext,
  StepResult,
  JudgmentResult,
  Observation,
  Diagnosis,
  Evaluation,
  Strategy,
  Action,
  Risk,
} from "./types";
import { DefaultRiskAnalyzer } from "./risk-analyzer";
import { DefaultDecisionGenerator } from "./decision-gen";

// ─── Judgment Chain 实现 ───

export class DefaultJudgmentChain implements JudgmentChain {
  input: JudgmentInput;
  steps: JudgmentStep[];
  output: JudgmentResult;

  private riskAnalyzer: DefaultRiskAnalyzer;
  private decisionGenerator: DefaultDecisionGenerator;

  constructor(input: JudgmentInput) {
    this.input = input;
    this.riskAnalyzer = new DefaultRiskAnalyzer();
    this.decisionGenerator = new DefaultDecisionGenerator();
    this.steps = this.buildSteps();
    this.output = this.createDefaultOutput();
  }

  /**
   * 执行判断链
   */
  async execute(): Promise<JudgmentResult> {
    const context: StepContext = {
      input: this.input,
      previousResults: new Map(),
    };

    // 按顺序执行每个步骤
    for (const step of this.steps) {
      const result = await step.execute(context);
      context.previousResults.set(step.name, result);
    }

    // 编译最终结果
    this.output = this.compileResult(context.previousResults);
    return this.output;
  }

  /**
   * 构建步骤
   */
  private buildSteps(): JudgmentStep[] {
    return [
      {
        name: "observation",
        type: "observation",
        execute: async (ctx) => this.executeObservation(ctx),
      },
      {
        name: "diagnosis",
        type: "diagnosis",
        execute: async (ctx) => this.executeDiagnosis(ctx),
      },
      {
        name: "evaluation",
        type: "evaluation",
        execute: async (ctx) => this.executeEvaluation(ctx),
      },
      {
        name: "strategy",
        type: "strategy",
        execute: async (ctx) => this.executeStrategy(ctx),
      },
      {
        name: "action",
        type: "action",
        execute: async (ctx) => this.executeAction(ctx),
      },
    ];
  }

  /**
   * 执行观察步骤
   */
  private async executeObservation(context: StepContext): Promise<StepResult> {
    const { project, owner } = context.input;
    const facts: string[] = [];
    const entities: Record<string, unknown> = {};

    // 提取事实
    if (project.city) facts.push(`城市: ${project.city}`);
    if (project.category) facts.push(`品类: ${project.category}`);
    if (project.area) facts.push(`面积: ${project.area}㎡`);
    if (project.investment) facts.push(`投资: ${project.investment}万`);

    // 提取实体
    entities.city = project.city;
    entities.category = project.category;
    entities.area = project.area;
    entities.investment = project.investment;

    // 经营者信息
    if (owner.experience_level) facts.push(`经验: ${owner.experience_level}`);
    if (owner.strengths?.length) facts.push(`优势: ${owner.strengths.join(", ")}`);

    return {
      stepName: "observation",
      data: { facts, entities, context: facts.join("; ") },
      confidence: 0.9,
    };
  }

  /**
   * 执行诊断步骤
   */
  private async executeDiagnosis(context: StepContext): Promise<StepResult> {
    const { project, owner } = context.input;

    // 识别风险
    const risks = this.riskAnalyzer.identifyRisks(project, owner);

    // 诊断问题
    let problem = "需要进一步分析";
    let rootCause = "信息不足";
    let riskLevel: "low" | "medium" | "high" = "medium";

    if (risks.length > 0) {
      const highestRisk = risks[0];
      problem = highestRisk.description;
      rootCause = highestRisk.mitigation?.strategy ?? "需要进一步分析";
      riskLevel = highestRisk.level === "critical" ? "high" : highestRisk.level;
    }

    return {
      stepName: "diagnosis",
      data: {
        problem,
        rootCause,
        riskLevel,
        riskFactors: risks.map(r => r.description),
        risks,
      },
      confidence: 0.8,
      risks,
    };
  }

  /**
   * 执行评估步骤
   */
  private async executeEvaluation(context: StepContext): Promise<StepResult> {
    const { project, owner } = context.input;
    const diagnosisResult = context.previousResults.get("diagnosis");
    const risks = diagnosisResult?.risks ?? [];

    // 基于项目数据动态计算初始分数
    const scores: Record<string, number> = {
      market: this.calcMarketScore(project),
      financial: this.calcFinancialScore(project, owner),
      operational: this.calcOperationalScore(project, owner),
      brand: this.calcBrandScore(owner),
      team: this.calcTeamScore(owner),
    };

    // 根据风险调整分数
    for (const risk of risks) {
      if (risk.level === "critical") scores[risk.type] -= 20;
      if (risk.level === "high") scores[risk.type] -= 10;
      if (risk.level === "medium") scores[risk.type] -= 5;
    }

    // 根据经验调整分数
    if (owner.experience_level === "expert") {
      scores.operational += 15;
      scores.team += 10;
    } else if (owner.experience_level === "beginner") {
      scores.operational -= 10;
      scores.team -= 10;
    }

    // 计算总分
    const overall = Math.round(
      Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length
    );

    // 识别优势和劣势
    const strengths = Object.entries(scores)
      .filter(([_, score]) => score >= 70)
      .map(([key, _]) => key);

    const weaknesses = Object.entries(scores)
      .filter(([_, score]) => score < 50)
      .map(([key, _]) => key);

    return {
      stepName: "evaluation",
      data: {
        framework: "综合评估",
        scores,
        overall,
        strengths,
        weaknesses,
      },
      confidence: 0.7,
    };
  }

  /**
   * 执行策略步骤
   */
  private async executeStrategy(context: StepContext): Promise<StepResult> {
    const evaluationResult = context.previousResults.get("evaluation");
    const diagnosisResult = context.previousResults.get("diagnosis");

    const overall = (evaluationResult?.data.overall as number) ?? 50;
    const risks = (diagnosisResult?.risks as Risk[]) ?? [];

    // 生成建议
    let recommendation = "";
    if (overall >= 80) {
      recommendation = "项目整体健康，可以推进";
    } else if (overall >= 60) {
      recommendation = "项目基本可行，但需要关注风险";
    } else if (overall >= 40) {
      recommendation = "项目风险较高，建议先解决关键问题";
    } else {
      recommendation = "项目风险很高，建议重新评估";
    }

    // 生成替代方案
    const alternatives = [];
    if (risks.some((r: Risk) => r.type === "financial")) {
      alternatives.push("降低投资规模，先验证模型");
    }
    if (risks.some((r: Risk) => r.type === "market")) {
      alternatives.push("先做小规模测试，验证市场需求");
    }

    return {
      stepName: "strategy",
      data: {
        recommendation,
        alternatives,
        reasoning: [recommendation],
        timeframe: "待定",
      },
      confidence: 0.7,
    };
  }

  /**
   * 执行行动步骤
   */
  private async executeAction(context: StepContext): Promise<StepResult> {
    const strategyResult = context.previousResults.get("strategy");
    const diagnosisResult = context.previousResults.get("diagnosis");
    const risks = diagnosisResult?.risks ?? [];

    // 生成行动
    const immediate = [];
    const shortTerm = [];
    const longTerm = [];

    // 基于风险生成行动
    for (const risk of risks.slice(0, 3)) {
      if (risk.mitigation) {
        if (risk.level === "critical" || risk.level === "high") {
          immediate.push(risk.mitigation.actions[0]);
        }
        shortTerm.push(...risk.mitigation.actions.slice(1, 3));
      }
    }

    // 通用行动
    if (immediate.length === 0) {
      immediate.push("明确项目定位");
    }
    if (shortTerm.length === 0) {
      shortTerm.push("做市场调研", "制定详细计划");
    }
    longTerm.push("执行计划", "监控进展");

    return {
      stepName: "action",
      data: {
        nextSteps: [...immediate, ...shortTerm],
        immediate,
        shortTerm,
        longTerm,
      },
      confidence: 0.7,
    };
  }

  /**
   * 编译最终结果
   */
  private compileResult(results: Map<string, StepResult>): JudgmentResult {
    const observation = results.get("observation");
    const diagnosis = results.get("diagnosis");
    const evaluation = results.get("evaluation");
    const strategy = results.get("strategy");
    const action = results.get("action");

    // 计算总体置信度
    const confidences = Array.from(results.values()).map(r => r.confidence);
    const overallConfidence = Math.round(
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length * 100
    );

    return {
      observation: {
        facts: (observation?.data.facts as string[]) ?? [],
        entities: (observation?.data.entities as Record<string, unknown>) ?? {},
        context: (observation?.data.context as string) ?? "",
      },
      diagnosis: {
        problem: (diagnosis?.data.problem as string) ?? "需要进一步分析",
        rootCause: (diagnosis?.data.rootCause as string) ?? "信息不足",
        riskLevel: (diagnosis?.data.riskLevel as "low" | "medium" | "high") ?? "medium",
        riskFactors: (diagnosis?.data.riskFactors as string[]) ?? [],
      },
      evaluation: {
        framework: (evaluation?.data.framework as string) ?? "综合评估",
        scores: (evaluation?.data.scores as Record<string, number>) ?? {},
        overall: (evaluation?.data.overall as number) ?? 50,
        strengths: (evaluation?.data.strengths as string[]) ?? [],
        weaknesses: (evaluation?.data.weaknesses as string[]) ?? [],
      },
      strategy: {
        recommendation: (strategy?.data.recommendation as string) ?? "继续完善",
        alternatives: (strategy?.data.alternatives as string[]) ?? [],
        reasoning: (strategy?.data.reasoning as string) ?? "",
        timeframe: (strategy?.data.timeframe as string) ?? "待定",
      },
      action: {
        nextSteps: (action?.data.nextSteps as string[]) ?? [],
        immediate: (action?.data.immediate as string[]) ?? [],
        shortTerm: (action?.data.shortTerm as string[]) ?? [],
        longTerm: (action?.data.longTerm as string[]) ?? [],
      },
      overallConfidence,
    };
  }

  /**
   * 创建默认输出
   */
  private createDefaultOutput(): JudgmentResult {
    return {
      observation: { facts: [], entities: {}, context: "" },
      diagnosis: { problem: "", rootCause: "", riskLevel: "medium", riskFactors: [] },
      evaluation: { framework: "", scores: {}, overall: 0, strengths: [], weaknesses: [] },
      strategy: { recommendation: "", alternatives: [], reasoning: "", timeframe: "" },
      action: { nextSteps: [], immediate: [], shortTerm: [], longTerm: [] },
      overallConfidence: 0,
    };
  }

  /** 动态计算市场分 */
  private calcMarketScore(project: { city?: string; category?: string; area?: number; investment?: number; [key: string]: unknown }): number {
    let score = 50;
    if (project.category) score += 10; // 有品类定位
    if (project.city) score += 5;      // 有目标城市
    if (project.area && project.area > 50) score += 5; // 有面积规划
    const tier1Cities = ["北京", "上海", "广州", "深圳"];
    if (project.city && tier1Cities.includes(project.city)) score += 10; // 一线城市市场大
    return Math.min(95, score);
  }

  /** 动态计算财务分 */
  private calcFinancialScore(project: { investment?: number; area?: number; [key: string]: unknown }, owner: { experience_level?: string; [key: string]: unknown }): number {
    let score = 50;
    const investment = project.investment ?? 0;
    if (investment > 0 && investment < 500) score += 15;  // 投资合理
    else if (investment >= 500 && investment < 1000) score += 5; // 投资偏大
    else if (investment >= 1000) score -= 10; // 投资过大
    if (owner.experience_level === "expert") score += 10;
    return Math.max(10, Math.min(95, score));
  }

  /** 动态计算运营分 */
  private calcOperationalScore(project: { area?: number; [key: string]: unknown }, owner: { experience_level?: string; strengths?: string[]; [key: string]: unknown }): number {
    let score = 50;
    const area = project.area ?? 0;
    if (area > 0 && area < 100) score += 10;  // 小型店易管理
    else if (area > 300) score -= 10;          // 大型店管理复杂
    if (owner.experience_level === "expert") score += 15;
    if (owner.strengths?.includes("运营") || owner.strengths?.includes("operation")) score += 10;
    return Math.max(10, Math.min(95, score));
  }

  /** 动态计算品牌分 */
  private calcBrandScore(owner: { strengths?: string[]; [key: string]: unknown }): number {
    let score = 40; // 默认品牌分较低（多数创业者品牌弱）
    if (owner.strengths?.includes("品牌") || owner.strengths?.includes("brand")) score += 20;
    if (owner.strengths?.includes("营销") || owner.strengths?.includes("marketing")) score += 10;
    return Math.min(90, score);
  }

  /** 动态计算团队分 */
  private calcTeamScore(owner: { experience_level?: string; strengths?: string[]; [key: string]: unknown }): number {
    let score = 45;
    if (owner.experience_level === "expert") score += 15;
    if (owner.experience_level === "intermediate") score += 5;
    if (owner.strengths?.includes("团队") || owner.strengths?.includes("management")) score += 10;
    if (owner.strengths && owner.strengths.length > 2) score += 5; // 多维度能力
    return Math.max(10, Math.min(95, score));
  }
}
