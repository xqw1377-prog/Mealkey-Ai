/**
 * Challenge Engine - 反方挑战引擎
 * 
 * 这是 MealKey 必须拥有的能力。
 * 因为创业者最大问题不是没有想法，而是相信自己的想法。
 * 
 * AI 必须问: "如果失败，最可能为什么？"
 */

// ─── AgentContext 内联定义（原来自 context/builder，该文件已废弃删除）───

interface ChallengeOwnerState {
  id: string;
  userId: string;
  experienceYears: number;
  overallScore: number;
  capabilities: Array<{ name: string; score: number; category: string }>;
  strengths: string[];
  blindspots: string[];
  riskTolerance: string;
  preferences: {
    investmentStyle: string;
    productFocus: boolean;
    brandAwareness: boolean;
    dataDriven: boolean;
  };
}

interface ChallengeSituationState {
  currentGoal?: string;
  projectStage?: string;
  problemType?: string;
  urgency: "low" | "medium" | "high";
  context: Record<string, unknown>;
}

interface ChallengeMemoryItem {
  type: string;
  content: string;
  importance: number;
  date?: string;
  source?: string;
}

interface ChallengeKnowledgeItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  confidence: number;
  relevance: number;
}

interface ChallengeHistoryItem {
  role: "user" | "assistant";
  content: string;
  date?: string;
  intent?: string;
}

/** AgentContext 精简版（仅 ChallengeEngine 使用的子集） */
interface AgentContext {
  owner: ChallengeOwnerState;
  situation: ChallengeSituationState;
  memories: ChallengeMemoryItem[];
  knowledge: ChallengeKnowledgeItem[];
  history: ChallengeHistoryItem[];
}

// ─── 挑战类型 ───

export interface Challenge {
  id: string;
  type: ChallengeType;
  assumption: string;
  risk: "low" | "medium" | "high";
  question: string;
  counterEvidence: string;
  verificationAction: string;
}

export type ChallengeType =
  | "assumption"      // 假设挑战
  | "market"          // 市场挑战
  | "competition"     // 竞争挑战
  | "capability"      // 能力挑战
  | "financial"       // 财务挑战
  | "timing"          // 时机挑战;

// ─── 挑战结果 ───

export interface ChallengeResult {
  challenges: Challenge[];
  overallRisk: "low" | "medium" | "high";
  summary: string;
  recommendedActions: string[];
}

// ─── LLM 接口 ───

export interface LLMAdapter {
  chat(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }): Promise<{ content: string }>;
}

// ─── Challenge Engine ───

export class ChallengeEngine {
  constructor(private llm?: LLMAdapter) {}

  /**
   * 生成挑战
   */
  async generateChallenges(
    userStatement: string,
    context: AgentContext
  ): Promise<ChallengeResult> {
    // 1. 识别假设
    const assumptions = await this.identifyAssumptions(userStatement, context);

    // 2. 为每个假设生成挑战
    const challenges: Challenge[] = [];
    for (const assumption of assumptions) {
      const challenge = await this.generateChallengeForAssumption(assumption, context);
      challenges.push(challenge);
    }

    // 3. 计算整体风险
    const overallRisk = this.calculateOverallRisk(challenges);

    // 4. 生成摘要
    const summary = this.generateSummary(challenges, overallRisk);

    // 5. 生成验证行动
    const recommendedActions = this.generateVerificationActions(challenges);

    return {
      challenges,
      overallRisk,
      summary,
      recommendedActions,
    };
  }

  /**
   * 识别假设 — 默认走 LLM 路径，关键词匹配作为降级
   *
   * 解决了：原来 80% 靠关键词匹配的问题
   * 现在：LLM 优先 → 关键词辅助 → 通用假设
   */
  private async identifyAssumptions(
    statement: string,
    context: AgentContext
  ): Promise<Array<{ assumption: string; type: ChallengeType; risk: "low" | "medium" | "high" }>> {
    // 1. 优先使用 LLM 识别（如果有 LLM）
    if (this.llm) {
      try {
        const llmAssumptions = await this.identifyAssumptionsWithLLM(statement, context);
        if (llmAssumptions.length > 0) {
          return llmAssumptions;
        }
      } catch {
        // LLM 失败，降级到关键词
      }
    }

    // 2. 降级：基于关键词的快速识别
    const assumptions: Array<{ assumption: string; type: ChallengeType; risk: "low" | "medium" | "high" }> = [];
    const lower = statement.toLowerCase();

    // 市场假设
    if (lower.includes("没有竞争") || lower.includes("竞争少")) {
      assumptions.push({
        assumption: "低竞争 = 高机会",
        type: "market",
        risk: "high",
      });
    }

    if (lower.includes("年轻人喜欢") || lower.includes("年轻人会来")) {
      assumptions.push({
        assumption: "年轻人会来消费",
        type: "market",
        risk: "medium",
      });
    }

    // 能力假设
    if (lower.includes("好吃") || lower.includes("品质好")) {
      assumptions.push({
        assumption: "产品好就能成功",
        type: "capability",
        risk: "medium",
      });
    }

    if (lower.includes("我有经验") || lower.includes("我做过")) {
      assumptions.push({
        assumption: "过去经验可以复用",
        type: "capability",
        risk: "medium",
      });
    }

    // 财务假设
    if (lower.includes("租金便宜") || lower.includes("租金低")) {
      assumptions.push({
        assumption: "低租金 = 低成本",
        type: "financial",
        risk: "high",
      });
    }

    if (lower.includes("投资不大") || lower.includes("投入不多")) {
      assumptions.push({
        assumption: "投资规模可控",
        type: "financial",
        risk: "medium",
      });
    }

    // 时机假设
    if (lower.includes("现在是好时机") || lower.includes("机会难得")) {
      assumptions.push({
        assumption: "时机正确",
        type: "timing",
        risk: "medium",
      });
    }

    // 3. 如果仍然没有假设，添加通用假设
    if (assumptions.length === 0) {
      assumptions.push({
        assumption: "需求存在且足够大",
        type: "market",
        risk: "medium",
      });
    }

    return assumptions;
  }

  /**
   * 使用 LLM 识别假设
   */
  private async identifyAssumptionsWithLLM(
    statement: string,
    context: AgentContext
  ): Promise<Array<{ assumption: string; type: ChallengeType; risk: "low" | "medium" | "high" }>> {
    const prompt = `
分析以下陈述，识别其中的隐藏假设。

陈述: ${statement}

经营者背景:
- 经验: ${context.owner.experienceYears}年
- 优势: ${context.owner.strengths.join(", ")}
- 需要提升: ${context.owner.blindspots.join(", ")}

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
}
`;

    try {
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
    } catch {
      return [];
    }
  }

  /**
   * 为单个假设生成挑战
   */
  private async generateChallengeForAssumption(
    assumption: { assumption: string; type: ChallengeType; risk: "low" | "medium" | "high" },
    context: AgentContext
  ): Promise<Challenge> {
    // 基于规则的快速挑战生成
    const ruleBasedChallenge = this.getRuleBasedChallenge(assumption);
    if (ruleBasedChallenge) {
      return ruleBasedChallenge;
    }

    // 使用 LLM 生成挑战
    if (this.llm) {
      return await this.generateChallengeWithLLM(assumption, context);
    }

    // 默认挑战
    return {
      id: `challenge_${Date.now()}`,
      type: assumption.type,
      assumption: assumption.assumption,
      risk: assumption.risk,
      question: `你假设了${assumption.assumption}，这个假设成立吗？`,
      counterEvidence: "需要进一步验证",
      verificationAction: "收集更多数据",
    };
  }

  /**
   * 基于规则的挑战生成
   */
  private getRuleBasedChallenge(
    assumption: { assumption: string; type: ChallengeType; risk: "low" | "medium" | "high" }
  ): Challenge | null {
    const challenges: Record<string, Challenge> = {
      "低竞争 = 高机会": {
        id: "challenge_competition",
        type: "competition",
        assumption: "低竞争 = 高机会",
        risk: "high",
        question: "低竞争可能意味着没有市场。你验证过需求吗？",
        counterEvidence: "很多餐饮失败不是因为竞争，而是因为没有消费理由",
        verificationAction: "访谈30个目标消费者，验证需求",
      },
      "年轻人会来消费": {
        id: "challenge_young",
        type: "market",
        assumption: "年轻人会来消费",
        risk: "medium",
        question: "年轻人为什么选择你？消费频率是多少？",
        counterEvidence: "年轻人消费选择多，忠诚度低",
        verificationAction: "分析目标区域年轻人消费习惯",
      },
      "产品好就能成功": {
        id: "challenge_product",
        type: "capability",
        assumption: "产品好就能成功",
        risk: "medium",
        question: "好吃是必要条件，不是充分条件。获客和品牌呢？",
        counterEvidence: "很多好吃的餐厅也倒闭了",
        verificationAction: "分析5个竞品的成功因素",
      },
      "低租金 = 低成本": {
        id: "challenge_rent",
        type: "financial",
        assumption: "低租金 = 低成本",
        risk: "high",
        question: "租金低可能意味着客流少。有效客流是多少？",
        counterEvidence: "租金只是成本变量，真正核心是有效客流×消费能力×复购",
        verificationAction: "实地调研3天，统计有效客流",
      },
    };

    return challenges[assumption.assumption] ?? null;
  }

  /**
   * 使用 LLM 生成挑战
   */
  private async generateChallengeWithLLM(
    assumption: { assumption: string; type: ChallengeType; risk: "low" | "medium" | "high" },
    context: AgentContext
  ): Promise<Challenge> {
    const prompt = `
你是一个餐饮经营挑战专家。请为以下假设生成挑战。

假设: ${assumption.assumption}
类型: ${assumption.type}
风险: ${assumption.risk}

经营者背景:
- 经验: ${context.owner.experienceYears}年
- 优势: ${context.owner.strengths.join(", ")}
- 需要提升: ${context.owner.blindspots.join(", ")}

请生成一个有力的挑战。

输出JSON格式:
{
  "question": "挑战性问题",
  "counterEvidence": "反证",
  "verificationAction": "验证行动"
}
`;

    try {
      const response = await this.llm!.chat({
        messages: [
          { role: "system", content: "你是餐饮经营挑战专家。只输出JSON。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      });

      const parsed = JSON.parse(response.content);
      return {
        id: `challenge_${Date.now()}`,
        type: assumption.type,
        assumption: assumption.assumption,
        risk: assumption.risk,
        question: parsed.question ?? `你假设了${assumption.assumption}，这个假设成立吗？`,
        counterEvidence: parsed.counterEvidence ?? "需要进一步验证",
        verificationAction: parsed.verificationAction ?? "收集更多数据",
      };
    } catch {
      return {
        id: `challenge_${Date.now()}`,
        type: assumption.type,
        assumption: assumption.assumption,
        risk: assumption.risk,
        question: `你假设了${assumption.assumption}，这个假设成立吗？`,
        counterEvidence: "需要进一步验证",
        verificationAction: "收集更多数据",
      };
    }
  }

  /**
   * 计算整体风险
   */
  private calculateOverallRisk(challenges: Challenge[]): "low" | "medium" | "high" {
    if (challenges.length === 0) return "low";

    const highRiskCount = challenges.filter(c => c.risk === "high").length;
    const mediumRiskCount = challenges.filter(c => c.risk === "medium").length;

    if (highRiskCount > 0) return "high";
    if (mediumRiskCount > 1) return "medium";
    return "low";
  }

  /**
   * 生成摘要
   */
  private generateSummary(challenges: Challenge[], overallRisk: "low" | "medium" | "high" ): string {
    if (challenges.length === 0) {
      return "没有发现明显的隐藏假设";
    }

    const parts: string[] = [];
    parts.push(`发现${challenges.length}个需要验证的假设:`);

    for (const challenge of challenges) {
      parts.push(`- ${challenge.assumption} (风险: ${challenge.risk})`);
    }

    parts.push(`整体风险: ${overallRisk}`);

    return parts.join("\n");
  }

  /**
   * 生成验证行动
   */
  private generateVerificationActions(challenges: Challenge[]): string[] {
    const actions: string[] = [];

    for (const challenge of challenges) {
      if (challenge.risk === "high") {
        actions.push(challenge.verificationAction);
      }
    }

    if (actions.length === 0) {
      actions.push("继续收集更多信息");
    }

    return actions;
  }
}
