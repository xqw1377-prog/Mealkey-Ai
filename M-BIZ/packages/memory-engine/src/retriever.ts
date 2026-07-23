/**
 * Memory Retriever - 智能记忆检索器
 * 
 * 负责从存储中检索相关记忆，构建上下文
 */

import type {
  MemoryItem,
  MemoryLayer,
  MemoryContext,
  UserProfile,
  MemoryRetriever,
  MemoryStorage,
} from "./types";

// ─── Memory Retriever 实现 ───

export class DefaultMemoryRetriever implements MemoryRetriever {
  constructor(private storage: MemoryStorage) {}

  /**
   * 获取项目相关记忆
   */
  async getForProject(projectId: string): Promise<MemoryContext> {
    // 查询项目相关记忆
    const memories = await this.storage.query({
      projectId,
      limit: 50,
    });

    // 按层级分组
    const userMemories = memories.filter(m => m.layer === "user");
    const projectMemories = memories.filter(m => m.layer === "project");
    const decisionMemories = memories.filter(m => m.layer === "decision");
    const failureMemories = memories.filter(m => m.layer === "failure");
    const insightMemories = memories.filter(m => m.layer === "insight");

    // 构建用户画像
    const userProfile = this.buildUserProfile(userMemories);

    // 生成摘要
    const summary = this.generateSummary(memories);

    return {
      userProfile,
      memories: memories.slice(0, 20),
      similarDecisions: decisionMemories.slice(0, 5),
      failureLessons: failureMemories.slice(0, 3),
      insights: insightMemories.slice(0, 3),
      summary,
    };
  }

  /**
   * 获取用户相关记忆
   */
  async getForUser(userId: string): Promise<MemoryContext> {
    // 查询用户所有记忆
    const memories = await this.storage.query({
      userId,
      limit: 100,
    });

    // 按层级分组
    const userMemories = memories.filter(m => m.layer === "user");
    const decisionMemories = memories.filter(m => m.layer === "decision");
    const failureMemories = memories.filter(m => m.layer === "failure");
    const insightMemories = memories.filter(m => m.layer === "insight");

    // 构建用户画像
    const userProfile = this.buildUserProfile(userMemories);

    // 生成摘要
    const summary = this.generateSummary(memories);

    return {
      userProfile,
      memories: memories.slice(0, 50),
      similarDecisions: decisionMemories.slice(0, 10),
      failureLessons: failureMemories.slice(0, 5),
      insights: insightMemories.slice(0, 5),
      summary,
    };
  }

  /**
   * 语义搜索记忆
   */
  async search(query: string, limit: number = 10): Promise<MemoryItem[]> {
    // 简单关键词搜索
    const allMemories = await this.storage.query({ limit: 1000 });
    
    const results = allMemories.filter(memory => {
      const content = JSON.stringify(memory.value).toLowerCase();
      const tags = memory.tags.join(" ").toLowerCase();
      const queryLower = query.toLowerCase();
      
      return content.includes(queryLower) || tags.includes(queryLower);
    });

    // 按权重排序
    return results
      .sort((a, b) => {
        const scoreA = a.importance * a.confidence;
        const scoreB = b.importance * b.confidence;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * 查找相似决策
   */
  async findSimilarDecisions(scenario: string): Promise<MemoryItem[]> {
    const decisions = await this.storage.query({
      layer: "decision",
      limit: 50,
    });

    // 简单相似度匹配
    return decisions.filter(d => {
      const content = JSON.stringify(d.value).toLowerCase();
      return content.includes(scenario.toLowerCase());
    }).slice(0, 5);
  }

  /**
   * 构建用户画像
   */
  private buildUserProfile(memories: MemoryItem[]): UserProfile {
    const defaultProfile: UserProfile = {
      userId: "",
      capabilities: {
        product: 50,
        operation: 50,
        brand: 50,
        finance: 50,
        management: 50,
      },
      preferences: {
        investmentStyle: "moderate",
        riskTolerance: "medium",
        expansionGoal: "stable",
      },
      experience: {
        years: 0,
        domains: [],
        roles: [],
      },
      beliefs: [],
      overallScore: 50,
    };

    if (memories.length === 0) return defaultProfile;

    // 从记忆中提取用户信息
    for (const memory of memories) {
      const content = memory.value as Record<string, unknown>;
      
      // 提取能力
      if (memory.tags.includes("capability")) {
        const capabilityKey = content.key as keyof typeof defaultProfile.capabilities;
        if (capabilityKey && capabilityKey in defaultProfile.capabilities) {
          defaultProfile.capabilities[capabilityKey] = content.value as number;
        }
      }

      // 提取偏好
      if (memory.tags.includes("preference")) {
        if (content.key === "investment_style") {
          const v = String(content.value);
          if (v === "conservative" || v === "moderate" || v === "aggressive") {
            defaultProfile.preferences.investmentStyle = v;
          }
        }
        if (content.key === "risk_tolerance") {
          const v = String(content.value);
          if (v === "low" || v === "medium" || v === "high") {
            defaultProfile.preferences.riskTolerance = v;
          }
        }
      }

      // 提取经验
      if (memory.tags.includes("experience")) {
        if (content.key === "experience_years") {
          defaultProfile.experience.years = content.value as number;
        }
        if (content.key === "domain") {
          defaultProfile.experience.domains.push(content.value as string);
        }
      }

      // 提取信念
      if (memory.tags.includes("belief")) {
        defaultProfile.beliefs.push(content.value as string);
      }
    }

    // 计算综合分数
    const scores = Object.values(defaultProfile.capabilities);
    defaultProfile.overallScore = Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    );

    return defaultProfile;
  }

  /**
   * 生成摘要
   */
  private generateSummary(memories: MemoryItem[]): string {
    if (memories.length === 0) {
      return "暂无记忆";
    }

    const parts: string[] = [];

    // 按层级统计
    const layerCounts: Record<string, number> = {};
    for (const memory of memories) {
      layerCounts[memory.layer] = (layerCounts[memory.layer] || 0) + 1;
    }

    parts.push(`共 ${memories.length} 条记忆`);
    
    if (layerCounts.user) parts.push(`用户记忆: ${layerCounts.user}`);
    if (layerCounts.decision) parts.push(`决策记录: ${layerCounts.decision}`);
    if (layerCounts.failure) parts.push(`失败经验: ${layerCounts.failure}`);
    if (layerCounts.insight) parts.push(`认知提升: ${layerCounts.insight}`);

    return parts.join(" | ");
  }
}
