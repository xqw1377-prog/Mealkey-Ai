/**
 * Problem Understanding Engine
 *
 * 设计文档 §四：理解用户问题背后的经营意图
 * 从表面问题推断真实问题，而非直接回答。
 */

export interface ProblemAnalysis {
  surfaceIntent: string;
  realProblem: string;
  projectStage: string;
  requiredCapabilities: string[];
  contextGaps: string[];
}

export interface ProblemUnderstandingDeps {
  llm: {
    chat(params: {
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
    }): Promise<{ content: string }>;
  };
}

export class ProblemUnderstandingEngine {
  constructor(private deps: ProblemUnderstandingDeps) {}

  async analyze(
    message: string,
    context: {
      project?: { name?: string; stage?: string; category?: string; city?: string } | null;
      recentDecisions?: string[];
      userCapabilities?: Record<string, number>;
    }
  ): Promise<ProblemAnalysis> {
    const projectInfo = context.project
      ? `项目: ${context.project.name ?? "未知"}, 阶段: ${context.project.stage ?? "未知"}, 品类: ${context.project.category ?? "未知"}, 城市: ${context.project.city ?? "未知"}`
      : "暂无项目信息";

    const decisionsText = context.recentDecisions?.length
      ? `历史决策: ${context.recentDecisions.join("; ")}`
      : "暂无历史决策";

    const prompt = `你是 MealKey 餐饮经营认知系统的问题分析引擎。
你的任务不是回答用户问题，而是理解问题背后的真实经营意图。

## 用户输入
"${message}"

## 项目上下文
${projectInfo}

## 历史决策
${decisionsText}

## 分析要求
1. surfaceIntent: 用户表面在问什么
2. realProblem: 用户真正需要解决的经营问题是什么
3. projectStage: 当前项目处于什么阶段（idea/positioning/location/setup/opening/growth/optimization）
4. requiredCapabilities: 解决这个问题需要哪些能力（从: positioning, finance, brand, product, location, marketing, team, risk, category_analysis, customer_portrait, price_positioning, competitor_analysis, differentiation, brand_tonality 中选）
5. contextGaps: 要做出判断还缺少哪些关键信息

用 JSON 输出，不要输出其他内容：
{
  "surfaceIntent": "...",
  "realProblem": "...",
  "projectStage": "...",
  "requiredCapabilities": ["..."],
  "contextGaps": ["..."]
}`;

    try {
      const response = await this.deps.llm.chat({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const parsed = this.tryParseJSON(response.content);
      if (parsed) {
        return {
          surfaceIntent: String(parsed.surfaceIntent ?? message),
          realProblem: String(parsed.realProblem ?? "需要进一步分析"),
          projectStage: String(parsed.projectStage ?? context.project?.stage ?? "idea"),
          requiredCapabilities: Array.isArray(parsed.requiredCapabilities) ? parsed.requiredCapabilities as string[] : [],
          contextGaps: Array.isArray(parsed.contextGaps) ? parsed.contextGaps as string[] : [],
        };
      }
    } catch {
      // LLM 调用失败，降级到规则分析
    }

    return this.fallbackAnalyze(message, context);
  }

  private fallbackAnalyze(
    message: string,
    context: { project?: { stage?: string } | null }
  ): ProblemAnalysis {
    const lower = message.toLowerCase();
    let realProblem = "general_advice";
    const capabilities: string[] = [];

    if (
      lower.includes("品牌") ||
      lower.includes("定位") ||
      lower.includes("品类") ||
      lower.includes("差异化") ||
      lower.includes("心智")
    ) {
      realProblem = "positioning_strategy";
      capabilities.push(
        "brand",
        "positioning",
        "market_analysis",
        "category_analysis",
        "customer_portrait",
        "price_positioning",
        "competitor_analysis",
        "differentiation",
        "brand_tonality",
      );
    } else if (
      lower.includes("品类") ||
      lower.includes("品类分析") ||
      lower.includes("做什么菜")
    ) {
      realProblem = "category_analysis";
      capabilities.push("category_analysis", "positioning", "market_analysis");
    } else if (lower.includes("客群") || lower.includes("客户") || lower.includes("消费者")) {
      realProblem = "customer_portrait";
      capabilities.push("customer_portrait", "positioning");
    } else if (lower.includes("价格") || lower.includes("定价") || lower.includes("客单价")) {
      realProblem = "price_positioning";
      capabilities.push("price_positioning", "finance");
    } else if (lower.includes("竞品") || lower.includes("竞争") || lower.includes("对手")) {
      realProblem = "competitor_analysis";
      capabilities.push("competitor_analysis", "positioning", "market_analysis");
    } else if (lower.includes("差异化") || lower.includes("区分") || lower.includes("不同")) {
      realProblem = "differentiation";
      capabilities.push("differentiation", "positioning", "brand");
    } else if (lower.includes("品牌调性") || lower.includes("视觉") || lower.includes("品牌风格")) {
      realProblem = "brand_tonality";
      capabilities.push("brand_tonality", "brand", "positioning");
    } else if (lower.includes("选址") || lower.includes("位置") || lower.includes("店铺")) {
      realProblem = "location_decision";
      capabilities.push("location", "finance");
    } else if (lower.includes("钱") || lower.includes("投资") || lower.includes("成本") || lower.includes("预算")) {
      realProblem = "financial_planning";
      capabilities.push("finance");
    } else if (lower.includes("菜单") || lower.includes("菜品") || lower.includes("产品")) {
      realProblem = "product_strategy";
      capabilities.push("product");
    } else if (lower.includes("人") || lower.includes("招") || lower.includes("团队")) {
      realProblem = "team_building";
      capabilities.push("team");
    } else if (lower.includes("营销") || lower.includes("客流") || lower.includes("推广")) {
      realProblem = "marketing";
      capabilities.push("marketing");
    } else if (lower.includes("风险") || lower.includes("问题") || lower.includes("能不能")) {
      realProblem = "risk_assessment";
      capabilities.push("risk");
    }

    return {
      surfaceIntent: message.slice(0, 100),
      realProblem,
      projectStage: context.project?.stage ?? "idea",
      requiredCapabilities: capabilities,
      contextGaps: [],
    };
  }

  private tryParseJSON(text: string): Record<string, unknown> | null {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : text;
    try {
      return JSON.parse(jsonStr.trim()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
