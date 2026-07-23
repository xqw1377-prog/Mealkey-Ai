/**
 * Auto Knowledge Extractor — 从对话中自动提取知识
 *
 * 每次用户与 Agent 对话后，Learning Engine 自动：
 * 1. 提取用户提到的行业数据/市场信息 → 新的 Facts
 * 2. 提取用户提到的经验/教训 → 新的 Experiences
 * 3. 提取重复出现的经营模式 → 新的 Rules
 * 4. 提取用户的判断结果 → 新的 Cases
 *
 * 这些新知识被存入记忆层（LEARNING），
 * 后续对话自动注入 MKContext.knowledge 中，
 * 使系统能持续学习、进化。
 */

import type { MKContext, MKDecision } from "@mealkey/agent-sdk";
import type { LearningOutcome } from "./learning-engine";

// ─── 提取出的知识碎片 ───

export interface KnowledgeFragment {
  type: "fact" | "rule" | "experience" | "case" | "insight";
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence: number;
  source: string;
}

// ═══════════════════════════════════════════════════════════════
// Auto Extractor — 从对话中自动提取知识
// ═══════════════════════════════════════════════════════════════

export class AutoKnowledgeExtractor {
  /**
   * 从用户的输入消息中提取潜在的知识碎片
   */
  extractFromUserMessage(
    userId: string,
    message: string,
    context?: MKContext,
  ): KnowledgeFragment[] {
    const fragments: KnowledgeFragment[] = [];

    // 1. 提取市场/行业数据（"XX市场有XX亿"、"年增长率XX%"）
    const marketDataPatterns = [
      /市场[规模总量约达]?[约达]?(\d+[万亿])/,
      /增长[率速]?[约达]?(\d+(?:\.\d+)?%)/,
      /市场[占有份额]?[约达]?(\d+(?:\.\d+)?%)/,
      /门店[数量]?[约达预计]?(\d+[万])/,
      /营收[额]?[约达]?(\d+[万亿])/,
      /(\w+)[类]?[的]?[毛]?利[率]?[约达]?(\d+(?:\.\d+)?%)/,
    ];

    for (const pattern of marketDataPatterns) {
      const match = message.match(pattern);
      if (match) {
        const title = `市场数据: ${message.slice(Math.max(0, match.index! - 10), match.index! + match[0].length + 10)}`;
        fragments.push({
          type: "fact",
          title: title.slice(0, 60),
          content: match[0],
          category: "market_data",
          tags: ["auto_extracted", "market"],
          confidence: 0.5, // 初始置信度较低，需要验证
          source: `user:${userId}`,
        });
      }
    }

    // 2. 提取经营经验/教训（"我的经验是..."、"教训是..."）
    const experiencePatterns = [
      /经验[就是]?[：:]?(.+?)(?:。|\.|$)/,
      /教训[就是]?[：:]?(.+?)(?:。|\.|$)/,
      /我学到[了]?[：:]?(.+?)(?:。|\.|$)/,
      /关键[是]?[：:]?(.+?)(?:。|\.|$)/,
      /最重要的[是]?[：:]?(.+?)(?:。|\.|$)/,
    ];

    for (const pattern of experiencePatterns) {
      const match = message.match(pattern);
      if (match && match[1].length > 5 && match[1].length < 200) {
        fragments.push({
          type: "experience",
          title: `用户经验: ${match[1].slice(0, 40)}`,
          content: match[1].trim(),
          category: "user_experience",
          tags: ["auto_extracted", "experience"],
          confidence: 0.5,
          source: `user:${userId}`,
        });
      }
    }

    // 3. 提取经营规则/原则（"XX一定要XX"、"绝对不能XX"）
    const rulePatterns = [
      /一定[要得]?(.+?)(?:否则|不然|\.|。|$)/,
      /绝对[不能不要]?(.+?)(?:否则|不然|\.|。|$)/,
      /千万[不能不要]?(.+?)(?:否则|不然|\.|。|$)/,
      /(.*?)是[生死底线红线]/,
      /(.*?)比(.*?)更重要/,
    ];

    for (const pattern of rulePatterns) {
      const match = message.match(pattern);
      if (match) {
        fragments.push({
          type: "rule",
          title: `用户原则: ${match[0].slice(0, 40)}`,
          content: match[0],
          category: "user_principle",
          tags: ["auto_extracted", "rule"],
          confidence: 0.4,
          source: `user:${userId}`,
        });
      }
    }

    // 4. 提取成功/失败案例
    const casePatterns = [
      /(?:我|我们|有[一]?个[朋友客户]?)[曾]?(?:做过|开过|经营过)(.+?)(?:。|，|\.|,)(.+?)(?:成功|失败|赚钱|亏|倒闭)/,
      /(?:之前|以前|原来)[有]?[一]?个(.+?)(?:后来|最后|结果)(.+?)(?:成功|失败|赚钱|亏)/,
    ];

    for (const pattern of casePatterns) {
      const match = message.match(pattern);
      if (match) {
        fragments.push({
          type: "case",
          title: `用户案例: ${match[1]?.slice(0, 30) || "案例"}`,
          content: match[0].slice(0, 300),
          category: "user_case",
          tags: ["auto_extracted", "case"],
          confidence: 0.4,
          source: `user:${userId}`,
        });
      }
    }

    return fragments;
  }

  /**
   * 从 Agent 做出的决策中提取可学习的知识
   */
  extractFromDecision(
    decision: MKDecision,
    context?: MKContext,
  ): KnowledgeFragment[] {
    const fragments: KnowledgeFragment[] = [];

    // 如果判断置信度高（>0.8），且策略有价值，提取为规则
    if (decision.confidence >= 0.8 && decision.strategy) {
      fragments.push({
        type: "rule",
        title: `判断规则: ${decision.problem.slice(0, 40)}`,
        content: `问题: ${decision.problem}\n判断: ${decision.judgement}\n策略: ${decision.strategy}`,
        category: "ai_judgment",
        tags: ["ai_generated", "high_confidence"],
        confidence: decision.confidence * 0.8,
        source: "chief_agent",
      });
    }

    // 如果有具体的行动建议，提取为经验
    if (decision.action && decision.action.length > 10) {
      fragments.push({
        type: "insight",
        title: `行动指引: ${decision.problem.slice(0, 30)}`,
        content: decision.action,
        category: "action_guide",
        tags: ["ai_generated", "action"],
        confidence: decision.confidence * 0.7,
        source: "chief_agent",
      });
    }

    return fragments;
  }

  /**
   * 从用户反馈中提取学习
   */
  extractFromFeedback(
    outcome: LearningOutcome,
  ): KnowledgeFragment[] {
    const fragments: KnowledgeFragment[] = [];

    if (outcome.score < 0.4 && outcome.incorrect.length > 0) {
      // 判断不准确，提取为警示
      fragments.push({
        type: "insight",
        title: `判断偏差警示: ${outcome.decisionId.slice(0, 20)}`,
        content: `判断错误的方面: ${outcome.incorrect.join("、")}\n教训: ${outcome.lessons.join("；")}`,
        category: "judgment_error",
        tags: ["feedback", "negative"],
        confidence: 0.7,
        source: "user_feedback",
      });
    }

    if (outcome.score >= 0.8 && outcome.correct.length > 0) {
      // 判断准确，强化验证
      fragments.push({
        type: "fact",
        title: `验证通过的判断模式`,
        content: `正确的判断: ${outcome.correct.join("、")}\n结果: ${outcome.result}`,
        category: "validated_judgment",
        tags: ["feedback", "positive"],
        confidence: 0.8,
        source: "user_feedback",
      });
    }

    return fragments;
  }

  /**
   * 从对话历史中提取重复模式（发现规律）
   */
  extractPatternsFromHistory(
    messages: Array<{ role: string; content: string }>,
  ): KnowledgeFragment[] {
    const fragments: KnowledgeFragment[] = [];

    // 统计用户反复提及的问题/品类
    const categoryCounts = new Map<string, number>();
    const problemCounts = new Map<string, number>();

    const categories = [
      "火锅", "湘菜", "川菜", "粤菜", "烧烤", "茶饮", "咖啡",
      "快餐", "面馆", "日料", "烘焙", "小吃", "卤味", "小龙虾",
    ];

    const problems = [
      "选址", "租金", "装修", "菜单", "定价", "营销", "获客",
      "复购", "外卖", "管理", "厨师", "合伙人", "资金", "竞争",
    ];

    for (const msg of messages) {
      if (msg.role !== "user") continue;
      const content = msg.content;

      for (const cat of categories) {
        if (content.includes(cat)) {
          categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
        }
      }

      for (const prob of problems) {
        if (content.includes(prob)) {
          problemCounts.set(prob, (problemCounts.get(prob) || 0) + 1);
        }
      }
    }

    // 如果某个品类被提到超过3次，说明用户聚焦在这个品类
    for (const [cat, count] of categoryCounts) {
      if (count >= 3) {
        fragments.push({
          type: "insight",
          title: `用户关注的品类: ${cat}`,
          content: `用户在与系统的对话中，${count}次提到「${cat}」品类。这是用户的主要关注品类。`,
          category: "user_focus",
          tags: ["pattern", "category"],
          confidence: 0.6,
          source: "pattern_analysis",
        });
      }
    }

    // 如果某个问题被反复提到，说明这是用户的长期痛点
    for (const [prob, count] of problemCounts) {
      if (count >= 3) {
        fragments.push({
          type: "insight",
          title: `用户长期关注的问题: ${prob}`,
          content: `用户${count}次提到「${prob}」相关问题，这是用户长期关注的经营痛点。`,
          category: "user_pain_point",
          tags: ["pattern", "problem"],
          confidence: 0.6,
          source: "pattern_analysis",
        });
      }
    }

    return fragments;
  }

  /**
   * 将提取的知识碎片转为记忆格式
   */
  toMemoryFormat(
    fragments: KnowledgeFragment[],
  ): Array<{
    layer: "learning";
    key: string;
    value: unknown;
    importance: number;
    source: string;
  }> {
    return fragments.map((f) => ({
      layer: "learning" as const,
      key: `auto_${f.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      value: {
        type: f.type,
        title: f.title,
        content: f.content,
        category: f.category,
        tags: f.tags,
        extractedAt: new Date().toISOString(),
      },
      importance: Math.round(f.confidence * 100),
      source: f.source,
    }));
  }
}

// 全局单例
export const globalAutoExtractor = new AutoKnowledgeExtractor();
