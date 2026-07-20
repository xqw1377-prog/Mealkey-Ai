/**
 * Agent Run Tracker
 *
 * 设计文档 §十一：Agent Run 生命周期追踪
 * 创建 → 加载上下文 → 推理 → 调用工具 → 生成决策 → 保存结果 → 更新记忆
 */

export interface AgentRunCreateInput {
  agentId: string;
  userId: string;
  projectId?: string;
  missionId?: string;
  conversationId?: string;
  input?: unknown;
}

export interface AgentRunUpdateInput {
  status?: "running" | "success" | "failed";
  output?: unknown;
  resultType?: string;
  duration?: number;
  tokens?: number;
  cost?: number;
}

export interface AgentRunStorage {
  create(input: AgentRunCreateInput): Promise<string>;
  update(runId: string, update: AgentRunUpdateInput): Promise<void>;
  linkDecision(runId: string, decisionId: string): Promise<void>;
}

export class AgentRunTracker {
  constructor(private storage: AgentRunStorage) {}

  async startRun(input: AgentRunCreateInput): Promise<string> {
    return this.storage.create(input);
  }

  async completeRun(
    runId: string,
    output: unknown,
    meta: { duration: number; tokens?: number; resultType?: string }
  ): Promise<void> {
    await this.storage.update(runId, {
      status: "success",
      output,
      duration: meta.duration,
      tokens: meta.tokens ?? 0,
      resultType: meta.resultType,
    });
  }

  async failRun(runId: string, error: string): Promise<void> {
    await this.storage.update(runId, {
      status: "failed",
      output: { error },
    });
  }

  async attachDecision(runId: string, decisionId: string): Promise<void> {
    await this.storage.linkDecision(runId, decisionId);
  }
}

/**
 * 通用 Prisma 适配器（期望 schema 含 userId）。
 * MealKey Web 实际 schema 使用 ownerId，请使用
 * `apps/web/.../chief-agent.factory.ts` 中的 createPrismaAgentRunStorage。
 *
 * @deprecated 优先在应用层实现与 schema 对齐的 AgentRunStorage
 */
export class PrismaAgentRunStorage implements AgentRunStorage {
  constructor(
    private prisma: {
      agentRun: {
        create(args: unknown): Promise<{ id: string }>;
        update(args: unknown): Promise<unknown>;
      };
    },
  ) {}

  async create(input: AgentRunCreateInput): Promise<string> {
    // 兼容旧调用：部分部署可能仍用 userId 字段
    const run = await this.prisma.agentRun.create({
      data: {
        agentId: input.agentId,
        userId: input.userId,
        projectId: input.projectId,
        missionId: input.missionId,
        conversationId: input.conversationId,
        input: input.input ? JSON.stringify(input.input) : null,
        status: "running",
      },
    } as never);
    return run.id;
  }

  async update(runId: string, update: AgentRunUpdateInput): Promise<void> {
    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: update.status,
        output: update.output ? JSON.stringify(update.output) : undefined,
        duration: update.duration,
        tokens: update.tokens,
      },
    } as never);
  }

  async linkDecision(_runId: string, _decisionId: string): Promise<void> {
    // Web 层实现会更新 Decision.agentRunId
  }
}
