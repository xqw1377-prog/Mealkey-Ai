/**
 * KnowledgeEngine — 存储无关的知识引擎（薄壳）
 *
 * 通过 KnowledgeStorageAdapter 接口解耦存储层。
 * 此类提供简单的搜索/添加/学习功能，不包含内置数据。
 *
 * 与 @mealkey/core 的 KnowledgeEngine（rich engine）不同：
 * - 此类：存储无关，轻量级，适合外部消费者
 * - core 的：依赖 rich KnowledgeStorage，支持规则/案例/模型引擎
 */

// ─── 存储适配器接口（薄壳引擎专用）───

export interface KnowledgeStorageAdapter {
  searchNodes(query: string, options: { category?: string; topK?: number }): Promise<Array<{
    id: string;
    title: string;
    content: string;
    categoryName: string | null;
    tags: string;
    source: string | null;
    status: string;
  }>>;
  findCategory(name: string): Promise<{ id: string; name: string } | null>;
  createCategory(name: string): Promise<{ id: string; name: string }>;
  createNode(data: {
    title: string;
    content: string;
    categoryId: string;
    tags: string;
    source: string | null;
    status: string;
  }): Promise<void>;
}

// ─── 知识层级 ───

export type KnowledgeLayer = "industry" | "expert" | "project";

// ─── 知识条目 ───

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  layer: KnowledgeLayer;
  tags: string[];
  source?: string;
  relevance?: number;
}

// ─── 搜索选项 ───

export interface SearchOptions {
  layer?: KnowledgeLayer;
  category?: string;
  topK?: number;
  minRelevance?: number;
}

// ─── 知识引擎 ───

export class KnowledgeEngine {
  constructor(private storage: KnowledgeStorageAdapter) {}

  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<KnowledgeEntry[]> {
    const { category, topK = 5 } = options;
    const nodes = await this.storage.searchNodes(query, { category, topK });

    return nodes
      .filter(n => n.status === "published")
      .map((node) => ({
        id: node.id,
        title: node.title,
        content: node.content,
        category: node.categoryName ?? "未分类",
        layer: this.inferLayer(node.source),
        tags: this.parseTags(node.tags),
        source: node.source ?? undefined,
        relevance: 0.8,
      }));
  }

  async getContextForAgent(
    _agentId: string,
    _projectId: string,
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    const results = await this.search(query, { topK: limit });
    return results.map(k => `【${k.category}】${k.title}\n${k.content}`);
  }

  async addKnowledge(entry: Omit<KnowledgeEntry, "id">): Promise<void> {
    let category = await this.storage.findCategory(entry.category);
    if (!category) {
      category = await this.storage.createCategory(entry.category);
    }
    await this.storage.createNode({
      title: entry.title,
      content: entry.content,
      categoryId: category.id,
      tags: JSON.stringify(entry.tags),
      source: entry.source ?? entry.layer,
      status: "published",
    });
  }

  async learnFromAgentOutput(
    agentId: string,
    projectId: string,
    output: { decision?: { summary: string; reasoning?: string } }
  ): Promise<void> {
    if (!output.decision) return;
    await this.addKnowledge({
      title: `Agent ${agentId} 决策`,
      content: `${output.decision.summary}\n\n推理: ${output.decision.reasoning ?? "无"}`,
      category: "agent_decisions",
      layer: "project",
      tags: [agentId, projectId],
      source: `agent:${agentId}`,
    });
  }

  private inferLayer(source: string | null): KnowledgeLayer {
    if (!source) return "industry";
    if (source.startsWith("agent:")) return "project";
    if (source.startsWith("expert:")) return "expert";
    return "industry";
  }

  private parseTags(tagsStr: string): string[] {
    try {
      const parsed = JSON.parse(tagsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
