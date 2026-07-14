/**
 * 定位知识工具函数
 *
 * 提供对定位知识（FACT/RULE/CASE/MODEL/EXPERIENCE）的查询和匹配功能。
 * 与 knowledge-engine 现有 matchRules/findSimilarCases/queryMasterWisdom 风格一致。
 */

import type { DecisionRule, CaseStudy, MasterExperience, KnowledgeCard, KnowledgeSearchResult } from "../types";
import { POSITIONING_RULES } from "./rules";
import { POSITIONING_CASES } from "./cases";
import { POSITIONING_EXPERIENCES } from "./experiences";
import { POSITIONING_FACTS } from "./facts";

/**
 * 根据输入事实匹配定位规则
 */
export function matchPositioningRules(
  facts: Record<string, unknown>,
  rules: DecisionRule[] = POSITIONING_RULES
): DecisionRule[] {
  return rules.filter(rule => {
    return rule.conditions.every(condition => {
      const fieldValue = facts[condition.field];
      if (fieldValue === undefined) return false;

      switch (condition.operator) {
        case "=":
          return fieldValue === condition.value;
        case "!=":
          return fieldValue !== condition.value;
        case ">":
          return (fieldValue as number) > (condition.value as number);
        case "<":
          return (fieldValue as number) < (condition.value as number);
        case ">=":
          return (fieldValue as number) >= (condition.value as number);
        case "<=":
          return (fieldValue as number) <= (condition.value as number);
        case "contains":
          return String(fieldValue).includes(String(condition.value));
        case "in":
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  });
}

/**
 * 查找相似定位案例
 */
export function findPositioningCases(
  context: Record<string, unknown>,
  cases: CaseStudy[] = POSITIONING_CASES
): CaseStudy[] {
  const scores: Array<{ case: CaseStudy; score: number }> = [];

  for (const c of cases) {
    let score = 0;
    let totalWeight = 0;

    // 品类匹配（权重高）
    if (context.category && c.basics.category) {
      totalWeight += 2;
      if (c.basics.category.includes(context.category as string) ||
          (context.category as string).includes(c.basics.category)) {
        score += 2;
      }
    }

    // 场景匹配
    const scenarios = c.applicableScenarios;
    if (context.scenario && scenarios) {
      totalWeight += 1.5;
      if (scenarios.some(s =>
        s.includes(context.scenario as string) ||
        (context.scenario as string).includes(s)
      )) {
        score += 1.5;
      }
    }

    // 城市匹配
    if (context.city && c.basics.city) {
      totalWeight += 0.5;
      if (c.basics.city === context.city) {
        score += 0.5;
      }
    }

    // 结果相关性：失败案例对风险评估更有价值
    if (context.need_risk_warning && c.outcome.status === "failure") {
      totalWeight += 1;
      score += 0.8;
    }

    const finalScore = totalWeight > 0 ? score / totalWeight * c.confidence : c.confidence * 0.5;
    scores.push({ case: c, score: finalScore });
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .map(s => s.case);
}

/**
 * 查询定位大师智慧
 */
export function queryPositioningWisdom(
  topic: string,
  experiences: MasterExperience[] = POSITIONING_EXPERIENCES
): MasterExperience[] {
  return experiences.filter(exp => {
    return (
      exp.topic.includes(topic) ||
      exp.scenario.includes(topic) ||
      exp.question.includes(topic) ||
      exp.wisdom.includes(topic)
    );
  }).sort((a, b) => b.confidence - a.confidence);
}

/**
 * 完整的定位知识搜索（一站式查询 FACT + RULE + EXPERIENCE）
 */
export function searchPositioningKnowledge(
  query: string,
  options: {
    category?: string;
    scenario?: string;
    topK?: number;
  } = {}
): KnowledgeSearchResult[] {
  const results: KnowledgeSearchResult[] = [];
  const topK = options.topK ?? 5;

  for (const fact of POSITIONING_FACTS) {
    if (matchesQuery(fact, query, options)) {
      results.push({
        card: fact,
        relevance: calculateRelevance(fact, query),
        matchedFields: ["title", "summary", "content"],
      });
    }
  }

  // RULE / EXPERIENCE 以轻量 KnowledgeCard 形态并入结果
  const now = new Date();
  for (const rule of POSITIONING_RULES) {
    const haystack = `${rule.scenario} ${rule.description} ${rule.recommendation} ${rule.judgement}`.toLowerCase();
    const q = query.toLowerCase();
    const firstToken = q.split(/\s+/).filter(Boolean)[0] || q;
    if (!q || !haystack.includes(firstToken)) continue;
    if (options.category && !haystack.includes(options.category.toLowerCase())) continue;
    results.push({
      card: {
        id: rule.id,
        type: "RULE",
        title: rule.scenario,
        summary: rule.recommendation || rule.description,
        content: { answer: rule.judgement, recommendation: rule.recommendation },
        category: options.category || "定位",
        scenario: [rule.scenario],
        tags: [rule.risk],
        confidence: rule.weight,
        source: rule.source,
        createdAt: now,
        updatedAt: now,
      },
      relevance: 0.7,
      matchedFields: ["scenario", "recommendation"],
    });
  }

  for (const exp of POSITIONING_EXPERIENCES) {
    const haystack = `${exp.topic} ${exp.wisdom} ${exp.scenario} ${exp.question}`.toLowerCase();
    const q = query.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const hit =
      Boolean(q) &&
      (haystack.includes(q) ||
        exp.topic.includes(query) ||
        exp.wisdom.includes(query) ||
        tokens.some((t) => haystack.includes(t)));
    if (!hit) continue;
    results.push({
      card: {
        id: exp.id,
        type: "EXPERIENCE",
        title: exp.topic,
        summary: exp.wisdom,
        content: { answer: exp.wisdom, reasoning: exp.reasoning },
        category: options.category || "定位",
        scenario: [exp.scenario],
        tags: [exp.master],
        confidence: exp.confidence,
        source: exp.source,
        createdAt: now,
        updatedAt: now,
      },
      relevance: exp.confidence,
      matchedFields: ["topic", "wisdom"],
    });
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, topK);
}

function matchesQuery(
  card: KnowledgeCard,
  query: string,
  options: { category?: string; scenario?: string }
): boolean {
  const q = query.toLowerCase();

  // 分类过滤
  if (options.category && !card.category.includes(options.category)) {
    return false;
  }

  // 场景过滤
  if (options.scenario && !card.scenario.some(s => s.includes(options.scenario!))) {
    return false;
  }

  // 关键词匹配
  return (
    card.title.toLowerCase().includes(q) ||
    card.summary.toLowerCase().includes(q) ||
    card.tags.some(t => t.toLowerCase().includes(q)) ||
    (typeof card.content.answer === "string" && card.content.answer.toLowerCase().includes(q)) ||
    (typeof card.content.question === "string" && card.content.question.toLowerCase().includes(q))
  );
}

function calculateRelevance(card: KnowledgeCard, query: string): number {
  const q = query.toLowerCase();
  let score = 0;

  if (card.title.toLowerCase().includes(q)) score += 0.3;
  if (card.summary.toLowerCase().includes(q)) score += 0.2;
  if (card.tags.some(t => t.toLowerCase().includes(q))) score += 0.3;
  if (card.scenario.some(s => s.toLowerCase().includes(q))) score += 0.2;

  return Math.min(1, score) * card.confidence;
}
