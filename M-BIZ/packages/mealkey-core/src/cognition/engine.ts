/**
 * Cognition Engine - 认知引擎
 * 
 * 核心职责:
 * 1. 应用判断框架评估项目
 * 2. 生成反思建议（挑战假设、暴露盲区）
 * 3. 查询知识支撑
 */

import type {
  AssessInput,
  CognitionResult,
  Assessment,
  VariableScore,
  Reflection,
  ReflectInput,
  Assumption,
  JudgmentFramework,
} from "./types";
import { getFramework, recommendFramework } from "./models";

// LLM 接口（避免直接依赖）
export interface LLMAdapter {
  chat(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }): Promise<{ content: string }>;
}

export class CognitionEngine {
  constructor(private llm?: LLMAdapter) {}

  /**
   * 评估项目
   */
  async assess(input: AssessInput): Promise<CognitionResult> {
    // 1. 加载判断框架
    const framework = getFramework(input.framework) 
      ?? recommendFramework(JSON.stringify(input.project));

    // 2. 评估各变量
    const scores = await this.evaluateVariables(framework, input);

    // 3. 生成综合评估
    const assessment = this.compileAssessment(framework, scores);

    // 4. 生成反思建议
    const reflection = await this.generateReflection(input, assessment);

    return {
      assessment,
      reflection,
      knowledgeRefs: [],
    };
  }

  /**
   * 反思挑战
   */
  async reflect(input: ReflectInput): Promise<Reflection> {
    // 识别隐藏假设
    const assumptions = await this.identifyAssumptions(input.statement);

    // 生成挑战
    const challenge = await this.generateChallenge(input.statement, assumptions);

    return {
      originalThinking: input.statement,
      hiddenAssumptions: assumptions,
      challenge: challenge.challenge,
      alternativeFramework: challenge.alternative,
      guidingQuestion: challenge.question,
      cases: [],
    };
  }

  /**
   * 评估各变量
   */
  private async evaluateVariables(
    framework: JudgmentFramework,
    input: AssessInput
  ): Promise<VariableScore[]> {
    const scores: VariableScore[] = [];

    for (const variable of framework.variables) {
      const score = await this.evaluateSingleVariable(variable, input);
      scores.push(score);
    }

    return scores;
  }

  /**
   * 评估单个变量
   */
  private async evaluateSingleVariable(
    variable: JudgmentFramework["variables"][0],
    input: AssessInput
  ): Promise<VariableScore> {
    if (!this.llm) {
      // 无 LLM 时返回默认分数
      return {
        variable: variable.id,
        name: variable.name,
        score: 50,
        weight: variable.weight,
        reasoning: "需要更多信息来评估",
        risks: [],
        suggestions: [],
      };
    }

    const prompt = `
你是餐饮经营评估专家。请评估以下维度。

评估维度: ${variable.name}
描述: ${variable.description}
评估指标:
${variable.indicators.map(i => `- ${i.name}: ${i.question}`).join("\n")}

项目信息:
${JSON.stringify(input.project, null, 2)}

经营者信息:
${JSON.stringify(input.owner, null, 2)}

请评估这个维度的得分(0-100)并给出理由。

输出JSON格式（不要输出其他内容）:
{
  "score": 数字,
  "reasoning": "理由",
  "risks": ["风险1", "风险2"],
  "suggestions": ["建议1", "建议2"]
}
`;

    try {
      const response = await this.llm.chat({
        messages: [
          { role: "system", content: "你是餐饮经营评估专家。只输出JSON，不要输出其他内容。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      });

      const result = JSON.parse(response.content);

      return {
        variable: variable.id,
        name: variable.name,
        score: result.score ?? 50,
        weight: variable.weight,
        reasoning: result.reasoning ?? "评估完成",
        risks: result.risks ?? [],
        suggestions: result.suggestions ?? [],
      };
    } catch {
      return {
        variable: variable.id,
        name: variable.name,
        score: 50,
        weight: variable.weight,
        reasoning: "评估过程中出现问题",
        risks: [],
        suggestions: [],
      };
    }
  }

  /**
   * 编译综合评估
   */
  private compileAssessment(
    framework: JudgmentFramework,
    scores: VariableScore[]
  ): Assessment {
    // 计算加权总分
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
    const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // 找出最大风险
    const lowestScore = scores.reduce((min, s) => s.score < min.score ? s : min, scores[0]);
    const biggestRisk = lowestScore 
      ? `${lowestScore.name}得分最低(${lowestScore.score}分)` 
      : "暂无明显风险";

    // 生成建议
    const recommendation = this.generateRecommendation(scores, overall);

    return {
      framework: framework.id,
      frameworkName: framework.name,
      scores,
      overall,
      biggestRisk,
      recommendation,
      confidence: 70,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendation(scores: VariableScore[], overall: number): string {
    if (overall >= 80) {
      return "项目整体健康，可以推进";
    }

    if (overall >= 60) {
      const weakAreas = scores.filter(s => s.score < 60).map(s => s.name);
      if (weakAreas.length > 0) {
        return `项目基本可行，但需要加强: ${weakAreas.join("、")}`;
      }
      return "项目基本可行，建议继续完善";
    }

    if (overall >= 40) {
      const criticalAreas = scores.filter(s => s.score < 40).map(s => s.name);
      if (criticalAreas.length > 0) {
        return `项目风险较高，需要先解决: ${criticalAreas.join("、")}`;
      }
      return "项目风险较高，建议重新评估";
    }

    return "项目风险很高，建议暂停并重新思考";
  }

  /**
   * 生成反思建议
   */
  private async generateReflection(
    input: AssessInput,
    assessment: Assessment
  ): Promise<Reflection | null> {
    // 如果分数较低，生成反思建议
    if (assessment.overall >= 70) {
      return null;
    }

    const assumptions = await this.inferAssumptions(input, assessment);
    const challenge = this.generateChallengeFromAssessment(assumptions, assessment);

    return {
      originalThinking: JSON.stringify(input.project),
      hiddenAssumptions: assumptions,
      challenge,
      alternativeFramework: "建议使用'餐饮成功五变量'框架重新评估",
      guidingQuestion: this.generateGuidingQuestion(assessment),
      cases: [],
    };
  }

  /**
   * 推断隐藏假设 — LLM 优先，规则降级
   */
  private async inferAssumptions(input: AssessInput, assessment: Assessment): Promise<Assumption[]> {
    // 1. 优先使用 LLM 深度分析
    if (this.llm) {
      try {
        const llmAssumptions = await this.identifyAssumptionsWithLLM(
          JSON.stringify(input.project),
          {
            experienceYears: 0,
            strengths: [],
            blindspots: [],
          }
        );
        if (llmAssumptions.length > 0) {
          return llmAssumptions.map(a => ({
            assumption: a.assumption,
            risk: (a.risk === "high" || a.risk === "medium" || a.risk === "low" ? a.risk : "medium") as "high" | "medium" | "low",
            challenge: `建议验证: ${a.assumption}`,
          }));
        }
      } catch {
        // LLM 失败，降级到规则
      }
    }

    // 2. 降级：基于低分项推断假设
    const assumptions: Assumption[] = [];
    for (const score of assessment.scores) {
      if (score.score < 50) {
        switch (score.variable) {
          case "customer":
            assumptions.push({
              assumption: "你假设了客户需求存在",
              risk: "high",
              challenge: "建议先验证客户需求",
            });
            break;
          case "scenario":
            assumptions.push({
              assumption: "你假设了消费场景清晰",
              risk: "medium",
              challenge: "建议细化消费场景",
            });
            break;
          case "product":
            assumptions.push({
              assumption: "你假设了产品有竞争力",
              risk: "high",
              challenge: "建议做竞品分析",
            });
            break;
          case "experience":
            assumptions.push({
              assumption: "你假设了用户体验会好",
              risk: "medium",
              challenge: "建议设计体验记忆点",
            });
            break;
          case "organization":
            assumptions.push({
              assumption: "你假设了团队能执行",
              risk: "high",
              challenge: "建议评估团队能力",
            });
            break;
        }
      }
    }

    return assumptions;
  }

  /**
   * 从评估生成挑战
   */
  private generateChallengeFromAssessment(
    assumptions: Assumption[],
    assessment: Assessment
  ): string {
    if (assumptions.length === 0) {
      return "项目整体健康，继续保持";
    }

    const highRisk = assumptions.filter(a => a.risk === "high");
    if (highRisk.length > 0) {
      return `你的项目有几个需要验证的假设: ${highRisk.map(a => a.assumption).join("、")}`;
    }

    return `项目有一些需要关注的地方: ${assumptions.map(a => a.assumption).join("、")}`;
  }

  /**
   * 生成引导性问题
   */
  private generateGuidingQuestion(assessment: Assessment): string {
    const lowestScore = assessment.scores.reduce(
      (min, s) => s.score < min.score ? s : min,
      assessment.scores[0]
    );

    switch (lowestScore?.variable) {
      case "customer":
        return "你能不能用一句话描述你的目标客户是谁？";
      case "scenario":
        return "你的客人在什么场景下来消费？";
      case "product":
        return "你的产品和竞争对手有什么不同？";
      case "experience":
        return "客人离开后，会记住什么？";
      case "organization":
        return "你的团队有能力做好这件事吗？";
      default:
        return "你最担心这个项目的哪个方面？";
    }
  }

  /**
   * 识别隐藏假设 — LLM 优先，关键词降级
   */
  private async identifyAssumptions(statement: string): Promise<Assumption[]> {
    // 1. 优先使用 LLM
    if (this.llm) {
      try {
        const llmAssumptions = await this.identifyAssumptionsWithLLM(statement, {
          experienceYears: 0,
          strengths: [],
          blindspots: [],
        });
        if (llmAssumptions.length > 0) {
          return llmAssumptions.map(a => ({
            assumption: a.assumption,
            risk: (a.risk === "high" || a.risk === "medium" || a.risk === "low" ? a.risk : "medium") as "high" | "medium" | "low",
            challenge: `建议验证: ${a.assumption}`,
          }));
        }
      } catch {
        // LLM 失败，降级到关键词
      }
    }

    // 2. 降级：基于关键词推断假设
    const assumptions: Assumption[] = [];

    if (statement.includes("租金便宜") || statement.includes("租金低")) {
      assumptions.push({
        assumption: "你假设了租金低就是好位置",
        risk: "high",
        challenge: "租金只是成本变量，真正核心是有效客流×消费能力×复购",
      });
    }

    if (statement.includes("年轻人喜欢") || statement.includes("年轻人")) {
      assumptions.push({
        assumption: "你假设了年轻人会来",
        risk: "medium",
        challenge: "年轻人为什么选择你？需要明确消费场景",
      });
    }

    if (statement.includes("网红") || statement.includes("抖音")) {
      assumptions.push({
        assumption: "你假设了流量能带来成功",
        risk: "high",
        challenge: "网红是起点，不是终点。品牌生命周期=复购率×口碑",
      });
    }

    if (statement.includes("好吃") || statement.includes("品质")) {
      assumptions.push({
        assumption: "你假设了好吃就能成功",
        risk: "medium",
        challenge: "好吃是必要条件，不是充分条件。还需要考虑获客、场景、成本",
      });
    }

    // 如果没有识别到假设，返回通用假设
    if (assumptions.length === 0) {
      assumptions.push({
        assumption: "你假设了需求存在",
        risk: "medium",
        challenge: "建议先验证需求",
      });
    }

    return assumptions;
  }

  /**
   * 使用 LLM 识别假设（供内部调用）
   */
  private async identifyAssumptionsWithLLM(
    statement: string,
    owner: { experienceYears: number; strengths: string[]; blindspots: string[] }
  ): Promise<Array<{ assumption: string; type: string; risk: string }>> {
    const prompt = `
分析以下陈述，识别其中的隐藏假设。

陈述: ${statement}

经营者背景:
- 经验: ${owner.experienceYears}年
- 优势: ${owner.strengths.join(", ")}
- 需要提升: ${owner.blindspots.join(", ")}

请识别陈述中的隐藏假设。每个假设应该是一个可能不成立的前提。

输出JSON格式:
{
  "assumptions": [
    {
      "assumption": "假设内容",
      "type": "assumption|market|competition|capability|financial|timing",
      "risk": "low|medium|high"
    }
  ]
}`;

    const response = await this.llm!.chat({
      messages: [
        { role: "system", content: "你是餐饮经营分析专家。只输出JSON。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    const parsed = JSON.parse(response.content);
    return (parsed.assumptions ?? []).map((a: any) => ({
      assumption: a.assumption ?? "未知假设",
      type: a.type ?? "assumption",
      risk: a.risk ?? "medium",
    }));
  }

  /**
   * 生成挑战（用于反思模式）
   */
  private async generateChallenge(
    statement: string,
    assumptions: Assumption[]
  ): Promise<{ challenge: string; alternative: string; question: string }> {
    const highRisk = assumptions.filter(a => a.risk === "high");

    if (highRisk.length > 0) {
      return {
        challenge: `你的判断有几个需要验证的假设: ${highRisk.map(a => a.assumption).join("、")}`,
        alternative: "建议先验证这些假设，再做决定",
        question: highRisk[0].challenge,
      };
    }

    return {
      challenge: "你的想法有一些需要进一步思考的地方",
      alternative: "建议使用更系统的框架来评估",
      question: "你最担心的是什么？",
    };
  }
}
