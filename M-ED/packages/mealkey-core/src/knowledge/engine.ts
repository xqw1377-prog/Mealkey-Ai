/**
 * Knowledge Engine - 餐饮经营知识引擎
 * 
 * 五层架构:
 * 1. Knowledge Base - 事实知识库
 * 2. Rule Engine - 经营规则库
 * 3. Case Engine - 案例库
 * 4. Model Engine - 经营模型库
 * 5. Master Layer - 大师经验层
 */

import type {
  KnowledgeCard,
  KnowledgeType,
  KnowledgeQuery,
  KnowledgeSearchResult,
  KnowledgeStorage,
  DecisionRule,
  CaseStudy,
  BusinessModel,
  MasterExperience,
  Condition,
} from "@mealkey/knowledge-engine";

// ─── Knowledge Engine ───

export class KnowledgeEngine {
  constructor(private storage: KnowledgeStorage) {}

  // ═══════════════════════════════════════════
  // 通用查询
  // ═══════════════════════════════════════════

  /**
   * 搜索知识
   */
  async search(query: string, options?: {
    type?: KnowledgeType;
    category?: string;
    scenario?: string;
    limit?: number;
  }): Promise<KnowledgeSearchResult[]> {
    return this.storage.search({
      query,
      type: options?.type,
      category: options?.category,
      scenario: options?.scenario,
      limit: options?.limit ?? 10,
      minConfidence: 0.5,
    });
  }

  /**
   * 获取知识卡片
   */
  async getCard(id: string): Promise<KnowledgeCard | null> {
    return this.storage.get(id);
  }

  /**
   * 保存知识卡片
   */
  async saveCard(card: Omit<KnowledgeCard, "createdAt" | "updatedAt">): Promise<void> {
    const now = new Date();
    await this.storage.save({
      ...card,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ═══════════════════════════════════════════
  // Rule Engine - 规则引擎
  // ═══════════════════════════════════════════

  /**
   * 查找匹配的规则
   */
  async findMatchingRules(facts: Record<string, unknown>): Promise<DecisionRule[]> {
    return this.storage.findMatchingRules(facts);
  }

  /**
   * 评估规则
   */
  async evaluateRules(context: {
    scenario?: string;
    facts: Record<string, unknown>;
  }): Promise<{
    matchedRules: DecisionRule[];
    judgement: string;
    risk: "low" | "medium" | "high";
    recommendation: string;
  }> {
    const rules = await this.findMatchingRules(context.facts);
    
    if (rules.length === 0) {
      return {
        matchedRules: [],
        judgement: "未找到匹配的规则",
        risk: "medium",
        recommendation: "建议进一步分析",
      };
    }

    // 按权重排序
    const sorted = rules.sort((a, b) => b.weight - a.weight);
    const topRule = sorted[0];

    return {
      matchedRules: sorted,
      judgement: topRule.judgement,
      risk: topRule.risk,
      recommendation: topRule.recommendation,
    };
  }

  // ═══════════════════════════════════════════
  // Case Engine - 案例引擎
  // ═══════════════════════════════════════════

  /**
   * 查找相似案例
   */
  async findSimilarCases(context: Record<string, unknown>): Promise<CaseStudy[]> {
    return this.storage.findSimilarCases(context);
  }

  /**
   * 从案例中提取教训
   */
  async extractLessons(caseId: string): Promise<string[]> {
    const caseStudy = await this.storage.get(caseId);
    if (!caseStudy || caseStudy.type !== "CASE") return [];
    
    const lessons = caseStudy.content.lesson;
    if (typeof lessons === "string") return [lessons];
    if (Array.isArray(lessons)) return lessons as string[];
    return [];
  }

  // ═══════════════════════════════════════════
  // Model Engine - 模型引擎
  // ═══════════════════════════════════════════

  /**
   * 计算经营模型
   */
  async calculateModel(modelId: string, inputs: Record<string, number>): Promise<{
    model: BusinessModel;
    result: Record<string, number>;
    benchmark: Record<string, { value: number; status: "good" | "warning" | "bad" }>;
  } | null> {
    const card = await this.storage.get(modelId);
    if (!card || card.type !== "MODEL") return null;

    // 解析模型
    const model: BusinessModel = {
      id: card.id,
      name: card.title,
      category: card.category,
      description: card.summary,
      parameters: (card.content.inputs as string[]).map(name => ({
        name,
        description: name,
        unit: "",
      })),
      formula: (card.content.formula as string) ?? "",
      benchmarks: {},
      applicableScenarios: card.scenario,
      source: card.source,
    };

    // 计算结果
    const result = this.evaluateFormula(model.formula, inputs);

    // 对比基准
    const benchmark: Record<string, { value: number; status: "good" | "warning" | "bad" }> = {};
    for (const [key, value] of Object.entries(result)) {
      const benchValue = model.benchmarks[key];
      if (benchValue !== undefined) {
        const ratio = value / benchValue;
        benchmark[key] = {
          value,
          status: ratio > 1.2 ? "good" : ratio < 0.8 ? "bad" : "warning",
        };
      }
    }

    return { model, result, benchmark };
  }

  // ═══════════════════════════════════════════
  // Master Layer - 大师经验层
  // ═══════════════════════════════════════════

  /**
   * 查询大师经验
   */
  async queryMasterWisdom(topic: string): Promise<MasterExperience[]> {
    const results = await this.storage.search({
      query: topic,
      type: "EXPERIENCE",
      limit: 5,
      minConfidence: 0.7,
    });

    return results.map(r => ({
      id: r.card.id,
      topic: r.card.title,
      question: (r.card.content.question as string) ?? "",
      wisdom: (r.card.content.wisdom as string) ?? r.card.summary,
      scenario: (r.card.content.scenario as string) ?? "",
      reasoning: (r.card.content.answer as string) ?? "",
      risks: [],
      application: (r.card.content.application as string) ?? "",
      master: r.card.source,
      source: r.card.source,
      confidence: r.card.confidence,
    }));
  }

  // ═══════════════════════════════════════════
  // 综合判断
  // ═══════════════════════════════════════════

  /**
   * 综合知识判断
   */
  async comprehensiveJudgment(context: {
    scenario: string;
    facts: Record<string, unknown>;
    question: string;
  }): Promise<{
    rules: DecisionRule[];
    cases: CaseStudy[];
    wisdom: MasterExperience[];
    synthesis: string;
    confidence: number;
  }> {
    // 1. 查找规则
    const rules = await this.findMatchingRules(context.facts);

    // 2. 查找案例
    const cases = await this.findSimilarCases(context.facts);

    // 3. 查找大师经验
    const wisdom = await this.queryMasterWisdom(context.question);

    // 4. 综合判断
    const synthesis = this.synthesizeJudgment(rules, cases, wisdom);

    // 5. 计算置信度
    const confidence = this.calculateConfidence(rules, cases, wisdom);

    return {
      rules,
      cases,
      wisdom,
      synthesis,
      confidence,
    };
  }

  // ═══════════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════════

  /**
   * 安全评估公式 — 使用递归下降解析器，避免 eval/Function 安全风险
   * 支持: +, -, *, /, (, ), 数字, 变量
   * 例如: "investment / monthlyProfit" → 投资回收期
   */
  private evaluateFormula(
    formula: string,
    inputs: Record<string, number>
  ): Record<string, number> {
    const result: Record<string, number> = {};

    try {
      // 替换变量
      let evaluated = formula;
      for (const [key, value] of Object.entries(inputs)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        evaluated = evaluated.replace(new RegExp(escapedKey, "g"), String(value));
      }

      // 只允许: 数字, 空格, +, -, *, /, (, ), .
      if (!/^[\d\s+\-*/().]+$/.test(evaluated)) {
        return result;
      }

      const value = this.safeMathEval(evaluated);
      if (value !== null && isFinite(value)) {
        result[formula] = Math.round(value * 100) / 100;
      }
    } catch {
      // 公式计算失败，静默忽略
    }

    return result;
  }

  /**
   * 安全的数学表达式求值 — 递归下降解析器
   * 仅支持 +, -, *, /, (), 数字
   * 比 Function()/eval() 更安全，不执行任意代码
   */
  private safeMathEval(expr: string): number | null {
    const tokens = expr.replace(/\s+/g, "");
    let pos = 0;

    const parseExpression = (): number => {
      let left = parseTerm();
      while (pos < tokens.length && (tokens[pos] === "+" || tokens[pos] === "-")) {
        const op = tokens[pos];
        pos++;
        const right = parseTerm();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    };

    const parseTerm = (): number => {
      let left = parseFactor();
      while (pos < tokens.length && (tokens[pos] === "*" || tokens[pos] === "/")) {
        const op = tokens[pos];
        pos++;
        const right = parseFactor();
        if (op === "*") left *= right;
        else if (right !== 0) left /= right;
        else throw new Error("Division by zero");
      }
      return left;
    };

    const parseFactor = (): number => {
      if (pos >= tokens.length) throw new Error("Unexpected end of expression");

      if (tokens[pos] === "(") {
        pos++;
        const val = parseExpression();
        if (pos >= tokens.length || tokens[pos] !== ")") throw new Error("Missing closing parenthesis");
        pos++;
        return val;
      }

      const start = pos;
      while (pos < tokens.length && /[\d.]/.test(tokens[pos])) pos++;
      if (pos === start) throw new Error(`Unexpected character: "${tokens[pos]}"`);
      return parseFloat(tokens.slice(start, pos));
    };

    try {
      const val = parseExpression();
      return pos !== tokens.length ? null : val;
    } catch {
      return null;
    }
  }

  /**
   * 综合判断
   */
  private synthesizeJudgment(
    rules: DecisionRule[],
    cases: CaseStudy[],
    wisdom: MasterExperience[]
  ): string {
    const parts: string[] = [];

    // 规则判断
    if (rules.length > 0) {
      const highRiskRules = rules.filter(r => r.risk === "high");
      if (highRiskRules.length > 0) {
        parts.push(`风险提示: ${highRiskRules[0].recommendation}`);
      }
    }

    // 案例参考
    if (cases.length > 0) {
      const successCases = cases.filter(c => c.outcome.status === "success");
      const failureCases = cases.filter(c => c.outcome.status === "failure");
      
      if (failureCases.length > 0) {
        parts.push(`历史教训: ${failureCases[0].lessons[0] ?? ""}`);
      }
      if (successCases.length > 0) {
        parts.push(`成功经验: ${successCases[0].lessons[0] ?? ""}`);
      }
    }

    // 大师智慧
    if (wisdom.length > 0) {
      parts.push(`专家建议: ${wisdom[0].wisdom}`);
    }

    return parts.join("\n") || "需要更多信息来判断";
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    rules: DecisionRule[],
    cases: CaseStudy[],
    wisdom: MasterExperience[]
  ): number {
    let confidence = 0.5;

    // 有规则匹配
    if (rules.length > 0) {
      confidence += 0.1;
      const highWeightRules = rules.filter(r => r.weight > 0.7);
      if (highWeightRules.length > 0) confidence += 0.1;
    }

    // 有案例支撑
    if (cases.length > 0) {
      confidence += 0.1;
      const similarCases = cases.filter(c => c.confidence > 0.7);
      if (similarCases.length > 0) confidence += 0.1;
    }

    // 有大师经验
    if (wisdom.length > 0) {
      confidence += 0.1;
      const highConfidenceWisdom = wisdom.filter(w => w.confidence > 0.8);
      if (highConfidenceWisdom.length > 0) confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }
}
