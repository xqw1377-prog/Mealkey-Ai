/**
 * PrismaKnowledgeStorage — 数据库驱动的知识存储
 *
 * 对齐 Kernel Schema V1: KnowledgeNode 模型
 * 支持五层知识: FACT / RULE / CASE / MODEL / EXPERIENCE
 */

import type { PrismaClient } from "@prisma/client";
import type {
  KnowledgeStorage,
  KnowledgeCard,
  KnowledgeType,
  KnowledgeQuery,
  KnowledgeSearchResult,
  DecisionRule,
  Condition,
  CaseStudy,
} from "@mealkey/knowledge-engine";

export class PrismaKnowledgeStorage implements KnowledgeStorage {
  constructor(private prisma: PrismaClient) {}

  private static readonly publishedStatus = "published";
 
  // ═══════════════════════════════════════════
  // 基础 CRUD
  // ═══════════════════════════════════════════
 
  async save(card: KnowledgeCard): Promise<void> {
    await this.prisma.knowledgeNode.upsert({
      where: { id: card.id },
      update: {
        title: card.title,
        content: JSON.stringify(card.content),
        type: card.type.toLowerCase(),
        tags: JSON.stringify(card.tags),
        source: card.source,
        confidence: card.confidence,
        status: PrismaKnowledgeStorage.publishedStatus,
      },
      create: {
        id: card.id,
        title: card.title,
        content: JSON.stringify(card.content),
        type: card.type.toLowerCase(),
        tags: JSON.stringify(card.tags),
        source: card.source,
        confidence: card.confidence,
        status: PrismaKnowledgeStorage.publishedStatus,
      },
    });
  }
 
  async get(id: string): Promise<KnowledgeCard | null> {
    const node = await this.prisma.knowledgeNode.findUnique({ where: { id } });
    if (!node) return null;
    return this.toCard(node);
  }
 
  async update(id: string, updates: Partial<KnowledgeCard>): Promise<void> {
    const data: Record<string, unknown> = {};
    if (updates.title) data.title = updates.title;
    if (updates.content) data.content = JSON.stringify(updates.content);
    if (updates.confidence) data.confidence = updates.confidence;
    if (updates.tags) data.tags = JSON.stringify(updates.tags);
 
    await this.prisma.knowledgeNode.update({ where: { id }, data });
  }
 
  async delete(id: string): Promise<void> {
    await this.prisma.knowledgeNode.delete({ where: { id } });
  }
 
  // ═══════════════════════════════════════════
  // 查询
  // ═══════════════════════════════════════════
 
  async search(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]> {
    const where: KnowledgeNodeSearchWhere = {
      status: PrismaKnowledgeStorage.publishedStatus,
      confidence: { gte: query.minConfidence ?? 0.5 },
    };
 
    if (query.type) {
      where.type = query.type.toLowerCase();
    }
 
    if (query.query) {
      where.OR = [
        { title: { contains: query.query } },
        { content: { contains: query.query } },
        { tags: { contains: query.query } },
      ];
    }
 
    const nodes = (await this.prisma.knowledgeNode.findMany({
      where,
      orderBy: { confidence: "desc" },
      take: query.limit ?? 10,
    })) as KnowledgeNodeRecord[];
 
    return nodes.map((node: KnowledgeNodeRecord) => ({
      card: this.toCard(node),
      relevance: this.calculateRelevance(node, query),
      matchedFields: this.getMatchedFields(node, query),
    }));
  }
 
  async listByType(type: KnowledgeType, limit?: number): Promise<KnowledgeCard[]> {
    const nodes = (await this.prisma.knowledgeNode.findMany({
      where: { type: type.toLowerCase(), status: PrismaKnowledgeStorage.publishedStatus },
      orderBy: { confidence: "desc" },
      take: limit ?? 50,
    })) as KnowledgeNodeRecord[];
    return nodes.map((node: KnowledgeNodeRecord) => this.toCard(node));
  }
 
  async listByCategory(category: string, limit?: number): Promise<KnowledgeCard[]> {
    const nodes = (await this.prisma.knowledgeNode.findMany({
      where: {
        status: PrismaKnowledgeStorage.publishedStatus,
        content: { contains: category },
      },
      orderBy: { confidence: "desc" },
      take: limit ?? 50,
    })) as KnowledgeNodeRecord[];
    return nodes.map((node: KnowledgeNodeRecord) => this.toCard(node));
  }
 
  // ═══════════════════════════════════════════
  // 规则专用
  // ═══════════════════════════════════════════
 
  async findMatchingRules(facts: Record<string, unknown>): Promise<DecisionRule[]> {
    const ruleNodes = (await this.prisma.knowledgeNode.findMany({
      where: { type: "rule", status: PrismaKnowledgeStorage.publishedStatus },
      orderBy: { confidence: "desc" },
    })) as KnowledgeNodeRecord[];
 
    const rules: DecisionRule[] = [];
 
    for (const node of ruleNodes) {
      const content = this.parseContent(node.content);
      const conditions = content.conditions as Condition[] | undefined;
      if (conditions && this.evaluateConditions(conditions, facts)) {
        rules.push({
          id: node.id,
          scenario: String(content.scenario ?? ""),
          description: node.title,
          conditions,
          judgement: String(content.judgement ?? ""),
          risk: this.inferRiskLevel(node.confidence),
          recommendation: String(content.recommendation ?? ""),
          weight: node.confidence,
          source: node.source ?? "system",
        });
      }
    }
 
    return rules;
  }
 
  // ═══════════════════════════════════════════
  // 案例专用
  // ═══════════════════════════════════════════
 
  async findSimilarCases(context: Record<string, unknown>): Promise<CaseStudy[]> {
    const caseNodes = (await this.prisma.knowledgeNode.findMany({
      where: { type: "case", status: PrismaKnowledgeStorage.publishedStatus },
      orderBy: { confidence: "desc" },
    })) as KnowledgeNodeRecord[];
 
    const cases: CaseStudy[] = [];
 
    for (const node of caseNodes) {
      const content = this.parseContent(node.content);
      const similarity = this.calculateCaseSimilarity(content, context);
 
      if (similarity > 0.3) {
        const basics = (content.basics ?? {}) as CaseStudy["basics"];
        const timeline = (content.timeline ?? []) as CaseStudy["timeline"];
        const outcome = (content.outcome ?? { status: "neutral" }) as CaseStudy["outcome"];
        const lessons = (content.lessons ?? []) as string[];
        const applicableScenarios = (content.applicableScenarios ?? []) as string[];
 
        cases.push({
          id: node.id,
          title: node.title,
          industry: "餐饮",
          category: String(content.category ?? ""),
          basics,
          timeline,
          outcome,
          lessons,
          applicableScenarios,
          source: node.source ?? "",
          confidence: node.confidence * similarity,
        });
      }
    }
 
    return cases.sort((a, b) => b.confidence - a.confidence);
  }
 
  // ═══════════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════════
 
  private toCard(node: { id: string; title: string; content: string; type: string; tags: string; source: string | null; confidence: number; createdAt: Date; updatedAt: Date }): KnowledgeCard {
    return {
      id: node.id,
      type: node.type.toUpperCase() as KnowledgeType,
      title: node.title,
      summary: this.extractSummary(node.content),
      content: this.parseContent(node.content),
      category: "餐饮经营",
      scenario: [],
      confidence: node.confidence,
      source: node.source ?? "",
      tags: this.parseJsonArray(node.tags),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }
 
  private parseContent(content: string): Record<string, unknown> {
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return { text: content };
    }
  }
 
  private parseJsonArray(value: string): string[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
 
  private extractSummary(content: string): string {
    const parsed = this.parseContent(content);
    if (typeof parsed.text === "string") return parsed.text.slice(0, 100);
    if (typeof parsed.summary === "string") return parsed.summary;
    if (typeof parsed.wisdom === "string") return parsed.wisdom.slice(0, 100);
    return content.slice(0, 100);
  }
 
  private calculateRelevance(node: { title: string; content: string; tags: string; confidence: number }, query: KnowledgeQuery): number {
    let relevance = node.confidence;
 
    if (query.query) {
      const q = query.query.toLowerCase();
      if (node.title.toLowerCase().includes(q)) relevance += 0.2;
      if (node.content.toLowerCase().includes(q)) relevance += 0.1;
    }
 
    return Math.min(1, relevance);
  }
 
  private getMatchedFields(node: { title: string; content: string }, query: KnowledgeQuery): string[] {
    const fields: string[] = [];
    if (!query.query) return fields;
 
    const q = query.query.toLowerCase();
    if (node.title.toLowerCase().includes(q)) fields.push("title");
    if (node.content.toLowerCase().includes(q)) fields.push("content");
    return fields;
  }
 
  private evaluateConditions(conditions: unknown[], facts: Record<string, unknown>): boolean {
    if (!Array.isArray(conditions) || conditions.length === 0) return true;
 
    for (const cond of conditions) {
      const c = cond as Record<string, unknown>;
      const field = c.field as string;
      const operator = c.operator as string;
      const value = c.value;
      const factValue = facts[field];
 
      if (!this.evaluateCondition(factValue, operator, value)) {
        return false;
      }
    }
    return true;
  }
 
  private evaluateCondition(factValue: unknown, operator: string, expectedValue: unknown): boolean {
    switch (operator) {
      case "=": return factValue === expectedValue;
      case "!=": return factValue !== expectedValue;
      case ">": return Number(factValue) > Number(expectedValue);
      case "<": return Number(factValue) < Number(expectedValue);
      case ">=": return Number(factValue) >= Number(expectedValue);
      case "<=": return Number(factValue) <= Number(expectedValue);
      case "contains": return String(factValue).includes(String(expectedValue));
      case "in": return Array.isArray(expectedValue) && expectedValue.includes(factValue);
      default: return false;
    }
  }
 
  private inferRiskLevel(confidence: number): "low" | "medium" | "high" {
    if (confidence >= 0.8) return "low";
    if (confidence >= 0.6) return "medium";
    return "high";
  }
 
  private calculateCaseSimilarity(caseContent: Record<string, unknown>, context: Record<string, unknown>): number {
    let score = 0;
    let total = 0;
 
    const basics = caseContent.basics as Record<string, unknown> | undefined;
    if (basics) {
      if (context.category && basics.category) {
        total++;
        if (basics.category === context.category) score++;
      }
      if (context.city && basics.city) {
        total++;
        if (basics.city === context.city) score++;
      }
    }
 
    return total > 0 ? score / total : 0.5;
  }
}

type KnowledgeNodeRecord = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string;
  source: string | null;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
};

type KnowledgeNodeSearchWhere = {
  status: string;
  confidence: { gte: number };
  type?: string;
  OR?: Array<{
    title?: { contains: string };
    content?: { contains: string };
    tags?: { contains: string };
  }>;
};
