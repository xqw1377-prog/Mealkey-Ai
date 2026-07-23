/**
 * Project Context Builder - 项目上下文构建器
 * 
 * 为 Agent 构建完整的项目上下文
 */

import type {
  Project,
  ProjectContext,
  ProjectProfile,
  ProjectStage,
  Decision,
  ProjectMemory,
  Report,
  TimelineEvent,
} from "./types";
import { STAGES } from "./lifecycle";

// ─── Context Builder ───

export class ProjectContextBuilder {
  /**
   * 构建完整的项目上下文
   */
  build(
    project: Project,
    decisions: Decision[],
    memories: ProjectMemory[],
    reports: Report[],
    timeline: TimelineEvent[]
  ): ProjectContext {
    const activeGoals = this.extractActiveGoals(memories);
    const pendingActions = this.extractPendingActions(decisions);

    return {
      project,
      profile: project.profile,
      decisions,
      memories,
      reports,
      timeline,
      currentStage: project.stage,
      activeGoals,
      pendingActions,
    };
  }

  /**
   * 生成上下文摘要（供 LLM 使用）
   */
  buildSummary(context: ProjectContext): string {
    const parts: string[] = [];

    // 基础信息
    parts.push("## 项目信息");
    parts.push(`- 项目名称: ${context.project.name}`);
    parts.push(`- 当前阶段: ${this.getStageName(context.currentStage)}`);

    if (context.profile) {
      if (context.profile.city) parts.push(`- 城市: ${context.profile.city}`);
      if (context.profile.category) parts.push(`- 品类: ${context.profile.category}`);
      if (context.profile.area) parts.push(`- 面积: ${context.profile.area}㎡`);
      if (context.profile.investment) parts.push(`- 投资预算: ${context.profile.investment}万`);
      if (context.profile.targetCustomers) parts.push(`- 目标客群: ${context.profile.targetCustomers}`);
      if (context.profile.positioning) parts.push(`- 品牌定位: ${context.profile.positioning}`);
    }

    // 决策历史
    if (context.decisions.length > 0) {
      parts.push("\n## 决策历史");
      const recentDecisions = context.decisions.slice(0, 5);
      for (const decision of recentDecisions) {
        parts.push(`- ${decision.title}: ${decision.summary}`);
      }
    }

    // 项目记忆
    if (context.memories.length > 0) {
      parts.push("\n## 项目记忆");
      const importantMemories = context.memories
        .filter(m => m.importance >= 0.7)
        .slice(0, 5);
      for (const memory of importantMemories) {
        parts.push(`- ${memory.key}: ${JSON.stringify(memory.value)}`);
      }
    }

    // 活跃目标
    if (context.activeGoals.length > 0) {
      parts.push("\n## 当前目标");
      for (const goal of context.activeGoals) {
        parts.push(`- ${goal}`);
      }
    }

    // 待办行动
    if (context.pendingActions.length > 0) {
      parts.push("\n## 待办行动");
      for (const action of context.pendingActions.slice(0, 3)) {
        parts.push(`- ${action}`);
      }
    }

    // 最近报告
    if (context.reports.length > 0) {
      parts.push("\n## 最近报告");
      const latestReport = context.reports[0];
      parts.push(`- ${latestReport.title}`);
      if (latestReport.summary) {
        parts.push(`  ${latestReport.summary}`);
      }
    }

    return parts.join("\n");
  }

  /**
   * 构建能力推荐上下文
   */
  buildCapabilityContext(context: ProjectContext): {
    stage: string;
    requiredCapabilities: string[];
    availableCapabilities: string[];
  } {
    const stageInfo = STAGES[context.currentStage];
    return {
      stage: context.currentStage,
      requiredCapabilities: stageInfo.requiredCapabilities,
      availableCapabilities: [], // 需要从 Capability Registry 获取
    };
  }

  /**
   * 构建知识查询上下文
   */
  buildKnowledgeContext(context: ProjectContext): {
    category: string | null;
    stage: string;
    keywords: string[];
  } {
    const keywords: string[] = [];

    if (context.profile?.category) {
      keywords.push(context.profile.category);
    }
    if (context.profile?.city) {
      keywords.push(context.profile.city);
    }
    if (context.profile?.positioning) {
      keywords.push(context.profile.positioning);
    }

    return {
      category: context.profile?.category ?? null,
      stage: context.currentStage,
      keywords,
    };
  }

  // ─── 内部方法 ───

  /**
   * 提取活跃目标
   */
  private extractActiveGoals(memories: ProjectMemory[]): string[] {
    return memories
      .filter(m => m.key.startsWith("goal.") && m.importance >= 0.5)
      .map(m => m.value as string);
  }

  /**
   * 提取待办行动
   */
  private extractPendingActions(decisions: Decision[]): string[] {
    return decisions
      .filter(d => !d.outcome || d.outcome.status === "pending")
      .flatMap(d => d.content.nextSteps)
      .filter((step): step is string => !!step);
  }

  /**
   * 获取阶段名称
   */
  private getStageName(stage: ProjectStage): string {
    return STAGES[stage]?.name ?? stage;
  }
}
