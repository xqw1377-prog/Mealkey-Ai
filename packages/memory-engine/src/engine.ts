/**
 * Memory Engine V1 - 餐饮经营者长期记忆系统
 * 
 * 六层记忆结构:
 * 1. User Memory - 用户长期能力
 * 2. Project Memory - 项目状态
 * 3. Decision Memory - 历史判断
 * 4. Preference Memory - 用户偏好
 * 5. Failure Memory - 失败经验
 * 6. Insight Memory - 认知提升
 */

import type {
  MemoryItem,
  MemoryLayer,
  MemoryContext,
  MemoryExtractor,
  MemoryRetriever,
  MemoryStorage,
  Conversation,
  UserProfile,
} from "./types";
import { DefaultMemoryExtractor } from "./extractor";
import { DefaultMemoryRetriever } from "./retriever";

// ─── Memory Engine ───

export class MemoryEngine {
  private extractor: MemoryExtractor;
  private retriever: MemoryRetriever;

  constructor(private storage: MemoryStorage) {
    this.extractor = new DefaultMemoryExtractor();
    this.retriever = new DefaultMemoryRetriever(storage);
  }

  // ═══════════════════════════════════════════
  // 记忆存储
  // ═══════════════════════════════════════════

  /**
   * 保存记忆
   */
  async save(item: Omit<MemoryItem, "id" | "createdAt" | "updatedAt" | "recency">): Promise<MemoryItem> {
    const now = new Date();
    const memory: MemoryItem = {
      ...item,
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      recency: 1.0,
      createdAt: now,
      updatedAt: now,
    };

    // 判断是否值得保存
    if (!this.extractor.shouldSave(memory)) {
      return memory;
    }

    await this.storage.save(memory);
    return memory;
  }

  /**
   * 从对话中提取并保存记忆
   */
  async extractAndSave(conversation: Conversation): Promise<MemoryItem[]> {
    const extracted = this.extractor.extract(conversation);
    const saved: MemoryItem[] = [];

    for (const item of extracted) {
      if (this.extractor.shouldSave(item)) {
        await this.storage.save(item);
        saved.push(item);
      }
    }

    return saved;
  }

  // ═══════════════════════════════════════════
  // 记忆检索
  // ═══════════════════════════════════════════

  /**
   * 获取项目相关记忆
   */
  async getForProject(projectId: string): Promise<MemoryContext> {
    return this.retriever.getForProject(projectId);
  }

  /**
   * 获取用户相关记忆
   */
  async getForUser(userId: string): Promise<MemoryContext> {
    return this.retriever.getForUser(userId);
  }

  /**
   * 搜索记忆
   */
  async search(query: string, limit?: number): Promise<MemoryItem[]> {
    return this.retriever.search(query, limit);
  }

  /**
   * 查找相似决策
   */
  async findSimilarDecisions(scenario: string): Promise<MemoryItem[]> {
    return this.retriever.findSimilarDecisions(scenario);
  }

  // ═══════════════════════════════════════════
  // 记忆管理
  // ═══════════════════════════════════════════

  /**
   * 更新记忆
   */
  async update(id: string, updates: Partial<MemoryItem>): Promise<void> {
    await this.storage.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  /**
   * 获取记忆详情
   */
  async get(id: string): Promise<MemoryItem | null> {
    return this.storage.get(id);
  }

  // ═══════════════════════════════════════════
  // 便捷方法
  // ═══════════════════════════════════════════

  /**
   * 保存用户能力
   */
  async saveUserCapability(
    userId: string,
    capability: keyof UserProfile["capabilities"],
    score: number
  ): Promise<void> {
    await this.save({
      layer: "user",
      userId,
      key: `capability_${capability}`,
      value: { key: capability, score },
      importance: 0.8,
      confidence: 0.9,
      source: "ai",
      tags: ["capability", capability],
    });
  }

  /**
   * 保存用户偏好
   */
  async saveUserPreference(
    userId: string,
    preference: string,
    value: string
  ): Promise<void> {
    await this.save({
      layer: "preference",
      userId,
      key: `preference_${preference}`,
      value: { key: preference, value },
      importance: 0.7,
      confidence: 0.8,
      source: "user",
      tags: ["preference", preference],
    });
  }

  /**
   * 保存决策
   */
  async saveDecision(
    userId: string,
    projectId: string,
    decision: {
      question: string;
      recommendation: string;
      reasoning: string;
      confidence: number;
    }
  ): Promise<void> {
    await this.save({
      layer: "decision",
      userId,
      projectId,
      key: `decision_${Date.now()}`,
      value: decision,
      importance: 0.8,
      confidence: decision.confidence / 100,
      source: "ai",
      tags: ["decision", "ai_recommendation"],
    });
  }

  /**
   * 保存失败经验
   */
  async saveFailure(
    userId: string,
    projectId: string,
    failure: {
      description: string;
      reason: string;
      lesson: string;
    }
  ): Promise<void> {
    await this.save({
      layer: "failure",
      userId,
      projectId,
      key: `failure_${Date.now()}`,
      value: failure,
      importance: 0.9,
      confidence: 0.9,
      source: "feedback",
      tags: ["failure", "learning"],
    });
  }

  /**
   * 保存认知提升
   */
  async saveInsight(
    userId: string,
    insight: {
      topic: string;
      understanding: string;
      source: string;
    }
  ): Promise<void> {
    await this.save({
      layer: "insight",
      userId,
      key: `insight_${Date.now()}`,
      value: insight,
      importance: 0.8,
      confidence: 0.7,
      source: "ai",
      tags: ["insight", "learning"],
    });
  }
}

// ─── 导出 ───

export type {
  MemoryItem,
  MemoryLayer,
  MemoryContext,
  MemoryExtractor,
  MemoryRetriever,
  MemoryStorage,
  Conversation,
  UserProfile,
  MemoryScore,
} from "./types";

export { DefaultMemoryExtractor } from "./extractor";
export { DefaultMemoryRetriever } from "./retriever";
