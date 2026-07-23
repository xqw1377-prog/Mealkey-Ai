/**
 * Project Service - 项目服务
 * 
 * 管理项目的完整生命周期和所有资产
 */

import type {
  Project,
  ProjectStage,
  ProjectStatus,
  ProjectProfile,
  ProjectContext,
  CreateProjectInput,
  UpdateProjectInput,
  Decision,
  DecisionType,
  DecisionOutcome,
  ProjectMemory,
  Report,
  ReportType,
  TimelineEvent,
  EventType,
  ProjectStorage,
  StageTransition,
  STAGE_TRANSITIONS,
} from "./types";

// ─── Project Service ───

export class ProjectService {
  constructor(private storage: ProjectStorage) {}

  // ═══════════════════════════════════════════
  // CRUD 操作
  // ═══════════════════════════════════════════

  /**
   * 创建项目
   */
  async create(input: CreateProjectInput): Promise<Project> {
    const project = await this.storage.create({
      ...input,
      profile: input.profile ?? {},
    });

    // 记录创建事件
    await this.addEvent(project.id, {
      type: "milestone",
      title: "项目创建",
      description: `创建项目: ${project.name}`,
    });

    return project;
  }

  /**
   * 获取项目
   */
  async get(id: string): Promise<Project | null> {
    return this.storage.get(id);
  }

  /**
   * 更新项目
   */
  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const project = await this.storage.update(id, input);

    // 如果阶段变更，记录事件
    if (input.stage) {
      await this.addEvent(id, {
        type: "stage_change",
        title: "阶段变更",
        description: `项目进入${input.stage}阶段`,
        metadata: { from: project.stage, to: input.stage },
      });
    }

    return project;
  }

  /**
   * 列出用户的项目
   */
  async list(ownerId: string): Promise<Project[]> {
    return this.storage.list(ownerId);
  }

  /**
   * 删除项目
   */
  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  // ═══════════════════════════════════════════
  // 阶段管理
  // ═══════════════════════════════════════════

  /**
   * 变更项目阶段
   */
  async changeStage(id: string, to: ProjectStage): Promise<void> {
    const project = await this.storage.get(id);
    if (!project) throw new Error("Project not found");

    // 验证转换是否合法
    const transition = this.findTransition(project.stage, to);
    if (!transition) {
      throw new Error(`Invalid stage transition: ${project.stage} -> ${to}`);
    }

    // 检查是否满足条件
    const decisions = await this.storage.getDecisions(id);
    const hasRequiredAssets = transition.requiredAssets.every(asset =>
      decisions.some(d => d.type === asset || d.title.includes(asset))
    );

    if (!hasRequiredAssets) {
      // 记录但不阻止（软约束）
      console.warn(`Missing required assets for transition: ${transition.requiredAssets}`);
    }

    // 执行转换
    await this.storage.update(id, { stage: to });

    // 记录事件
    await this.addEvent(id, {
      type: "stage_change",
      title: `进入${to}阶段`,
      description: transition.condition,
      metadata: { from: project.stage, to },
    });
  }

  /**
   * 查找有效的阶段转换
   */
  private findTransition(from: ProjectStage, to: ProjectStage): StageTransition | undefined {
    // 导入的 STAGE_TRANSITIONS 是类型，需要硬编码
    const transitions: StageTransition[] = [
      { from: "idea", to: "positioning", condition: "完成市场验证和定位分析", requiredAssets: ["market_analysis", "positioning_decision"] },
      { from: "positioning", to: "location", condition: "定位确定，开始选址", requiredAssets: ["brand_position", "target_customer"] },
      { from: "location", to: "setup", condition: "选址确定，开始筹备", requiredAssets: ["location_decision", "lease_signed"] },
      { from: "setup", to: "opening", condition: "筹备完成，准备开业", requiredAssets: ["team_ready", "menu_finalized"] },
      { from: "opening", to: "growth", condition: "开业稳定，开始增长", requiredAssets: ["operations_stable", "initial_feedback"] },
      { from: "growth", to: "optimization", condition: "增长稳定，开始优化", requiredAssets: ["growth_metrics", "expansion_plan"] },
    ];

    return transitions.find(t => t.from === from && t.to === to);
  }

  // ═══════════════════════════════════════════
  // 决策管理
  // ═══════════════════════════════════════════

  /**
   * 添加决策
   */
  async addDecision(
    projectId: string,
    decision: {
      type: DecisionType;
      title: string;
      summary: string;
      content: Decision["content"];
    }
  ): Promise<Decision> {
    const result = await this.storage.addDecision(projectId, {
      ...decision,
      projectId,
      outcome: null,
      learning: null,
    });

    // 记录事件
    await this.addEvent(projectId, {
      type: "decision_made",
      title: decision.title,
      description: decision.summary,
      metadata: { decisionId: result.id, type: decision.type },
    });

    return result;
  }

  /**
   * 获取决策列表
   */
  async getDecisions(projectId: string, type?: DecisionType): Promise<Decision[]> {
    return this.storage.getDecisions(projectId, type);
  }

  /**
   * 更新决策结果
   */
  async updateDecisionOutcome(
    decisionId: string,
    outcome: DecisionOutcome
  ): Promise<void> {
    await this.storage.updateDecision(decisionId, outcome);
  }

  // ═══════════════════════════════════════════
  // 记忆管理
  // ═══════════════════════════════════════════

  /**
   * 添加记忆
   */
  async addMemory(
    projectId: string,
    memory: {
      key: string;
      value: unknown;
      source: "user" | "ai" | "system";
      importance?: number;
    }
  ): Promise<ProjectMemory> {
    return this.storage.addMemory(projectId, {
      ...memory,
      projectId,
      importance: memory.importance ?? 0.5,
    });
  }

  /**
   * 获取记忆
   */
  async getMemories(projectId: string): Promise<ProjectMemory[]> {
    return this.storage.getMemories(projectId);
  }

  /**
   * 获取特定记忆
   */
  async getMemoryByKey(projectId: string, key: string): Promise<ProjectMemory | null> {
    return this.storage.getMemoryByKey(projectId, key);
  }

  // ═══════════════════════════════════════════
  // 报告管理
  // ═══════════════════════════════════════════

  /**
   * 添加报告
   */
  async addReport(
    projectId: string,
    report: {
      type: ReportType;
      title: string;
      summary?: string;
      content: Report["content"];
    }
  ): Promise<Report> {
    const result = await this.storage.addReport(projectId, {
      ...report,
      projectId,
      summary: report.summary ?? null,
    });

    // 记录事件
    await this.addEvent(projectId, {
      type: "report_generated",
      title: report.title,
      description: report.summary ?? "",
      metadata: { reportId: result.id, type: report.type },
    });

    return result;
  }

  /**
   * 获取报告列表
   */
  async getReports(projectId: string, type?: ReportType): Promise<Report[]> {
    return this.storage.getReports(projectId, type);
  }

  // ═══════════════════════════════════════════
  // 时间线
  // ═══════════════════════════════════════════

  /**
   * 添加事件
   */
  async addEvent(
    projectId: string,
    event: {
      type: EventType;
      title: string;
      description: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<TimelineEvent> {
    return this.storage.addEvent(projectId, {
      ...event,
      projectId,
    });
  }

  /**
   * 获取时间线
   */
  async getTimeline(projectId: string, limit?: number): Promise<TimelineEvent[]> {
    return this.storage.getTimeline(projectId, limit);
  }

  // ═══════════════════════════════════════════
  // 上下文构建
  // ═══════════════════════════════════════════

  /**
   * 构建项目上下文（供 Agent 使用）
   */
  async getContext(projectId: string): Promise<ProjectContext> {
    const project = await this.storage.get(projectId);
    if (!project) throw new Error("Project not found");

    const [decisions, memories, reports, timeline] = await Promise.all([
      this.storage.getDecisions(projectId),
      this.storage.getMemories(projectId),
      this.storage.getReports(projectId),
      this.storage.getTimeline(projectId, 20),
    ]);

    // 提取活跃目标
    const activeGoals = memories
      .filter(m => m.key.startsWith("goal."))
      .map(m => m.value as string);

    // 提取待办行动
    const pendingActions = decisions
      .filter(d => !d.outcome || d.outcome.status === "pending")
      .flatMap(d => d.content.nextSteps);

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
   * 生成项目摘要
   */
  async getSummary(projectId: string): Promise<string> {
    const context = await this.getContext(projectId);
    const parts: string[] = [];

    // 基础信息
    parts.push(`项目: ${context.project.name}`);
    parts.push(`阶段: ${context.currentStage}`);

    if (context.profile) {
      if (context.profile.city) parts.push(`城市: ${context.profile.city}`);
      if (context.profile.category) parts.push(`品类: ${context.profile.category}`);
      if (context.profile.investment) parts.push(`投资: ${context.profile.investment}万`);
    }

    // 最近决策
    if (context.decisions.length > 0) {
      const latest = context.decisions[0];
      parts.push(`最新决策: ${latest.summary}`);
    }

    // 待办
    if (context.pendingActions.length > 0) {
      parts.push(`待办: ${context.pendingActions[0]}`);
    }

    return parts.join("\n");
  }
}
