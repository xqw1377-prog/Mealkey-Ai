/**
 * Chief Agent 工厂
 *
 * 职责：
 * 1. 从数据库构建 MKContext（Protocol 1）
 * 2. 组装 ChiefAgent 依赖
 * 3. 创建 ChiefAgent 实例
 *
 * 核心原则：Factory 负责数据访问，Agent 负责智能推理。
 */

import type { PrismaClient } from "@/generated/prisma";
import type { MKContext, OwnerContext, MKDecision } from "@mealkey/agent-sdk";
import { safeParseJson, safeParseJsonArray } from "@mealkey/agent-sdk";
import {
  AgentRunTracker,
  ChiefAgent,
  ChiefToolRegistry,
  DefaultRiskAnalyzer,
} from "@mealkey/core";
import type { AgentRunStorage, ChiefAgentDeps } from "@mealkey/core";
import { createLLMAdapter } from "@mealkey/agent-runtime";
import { createDecision } from "./agent-os.service";

let cachedChief: ChiefAgent | null = null;

/**
 * 获取 ChiefAgent 单例
 */
export function getChiefAgent(prisma: PrismaClient): ChiefAgent {
  if (cachedChief) return cachedChief;

  const deps = createDeps(prisma);
  cachedChief = new ChiefAgent(deps);
  return cachedChief;
}

/**
 * 测试/热重载时清除缓存（例如切换 API Key 后）
 */
export function resetChiefAgentCache(): void {
  cachedChief = null;
}

/**
 * 构建 MKContext — Protocol 1
 */
export async function buildMKContext(
  prisma: PrismaClient,
  userId: string,
  projectId?: string
): Promise<MKContext> {
  const owner = await prisma.owner.findUnique({ where: { userId } });

  if (!owner) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const newOwner = await prisma.owner.create({
      data: {
        userId,
        name: user?.name,
        email: user?.email,
      },
    });
    return buildMKContextFromOwner(prisma, newOwner.id, projectId);
  }

  return buildMKContextFromOwner(prisma, owner.id, projectId);
}

async function buildMKContextFromOwner(
  prisma: PrismaClient,
  ownerId: string,
  projectId?: string
): Promise<MKContext> {
  const [ownerRecord, project, memories, decisions, knowledgeNodes] = await Promise.all([
    prisma.owner.findUnique({ where: { id: ownerId } }),
    projectId
      ? prisma.project.findFirst({ where: { id: projectId, ownerId } })
      : null,
    prisma.memory.findMany({
      where: { ownerId, ...(projectId ? { projectId } : { projectId: null }) },
      orderBy: { importance: "desc" },
      take: 30,
    }),
    projectId
      ? prisma.decision.findMany({
          where: { ownerId, projectId },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : prisma.decision.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
    prisma.knowledgeNode.findMany({
      where: { status: "published" },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // OwnerContext (Protocol 1)
  const ownerCtx: OwnerContext = {
    id: ownerId,
    name: ownerRecord?.name ?? null,
    email: ownerRecord?.email ?? null,
    experience: ownerRecord?.experience ?? "0年",
    strengths: safeParseJsonArray(ownerRecord?.strengths),
    weaknesses: safeParseJsonArray(ownerRecord?.weaknesses),
    overallScore: ownerRecord?.overallScore ?? 50,
    riskTolerance: ownerRecord?.riskTolerance ?? "medium",
    investmentStyle: ownerRecord?.investmentStyle ?? "moderate",
  };

  // ProjectContext (Protocol 1)
  const profileData = project ? (safeParseJson(project.profile) as Record<string, unknown>) ?? {} : {};
  const projectCtx = project
    ? {
        id: project.id,
        name: project.name,
        stage: project.stage,
        category: project.category,
        target: project.target ?? (profileData.target as string) ?? project.description ?? null,
        city: project.city,
        district: project.district,
        budget: (profileData.budget as number) ?? null,
        profile: profileData,
        healthScore: project.healthScore,
        confidence: project.confidence,
      }
    : {
        id: "",
        name: "未选择项目",
        stage: "idea",
        category: null,
        target: null,
        city: null,
        district: null,
        budget: null,
        profile: null,
        healthScore: null,
        confidence: null,
      };

  // MemoryContext (Protocol 1)
  const memoryCtx = memories.map(m => ({
    type: m.type as "OWNER" | "PROJECT" | "DECISION" | "LEARNING",
    content: m.content,
    key: m.key,
    importance: m.importance / 100,
    source: m.source,
    updatedAt: m.updatedAt,
  }));

  // DecisionContext (Protocol 1)
  const decisionCtx = decisions.map(d => ({
    id: d.id,
    problem: d.problem,
    judgement: d.judgement,
    confidence: d.confidence,
    type: d.type,
    createdAt: d.createdAt,
  }));

  // KnowledgeContext (Protocol 1)
  const knowledgeCtx = {
    rules: knowledgeNodes
      .filter(n => n.type === "rule" || n.type === "principle")
      .map(n => ({ id: n.id, title: n.title, content: n.content })),
    cases: knowledgeNodes
      .filter(n => n.type === "case")
      .map(n => ({ id: n.id, title: n.title, outcome: n.content })),
    models: knowledgeNodes
      .filter(n => n.type === "model")
      .map(n => ({ id: n.id, name: n.title, formula: n.content })),
  };

  return {
    owner: ownerCtx,
    project: projectCtx,
    memories: memoryCtx,
    decisions: decisionCtx,
    knowledge: knowledgeCtx,
  };
}

// ─── 内部方法 ───

function createDeps(prisma: PrismaClient): ChiefAgentDeps {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const apiKey = deepseekKey || openaiKey;

  // 无 API Key 时提供会失败的 stub，让 ChiefAgent 走规则降级链（与 M-PNT heuristic 对称）
  const llm = apiKey
    ? (() => {
        const llmAdapter = createLLMAdapter({
          provider: deepseekKey ? "deepseek" : "openai",
          apiKey,
          baseURL: deepseekKey ? "https://api.deepseek.com" : undefined,
        });
        return {
          async chat(params: {
            messages: Array<{ role: string; content: string }>;
            temperature?: number;
            max_tokens?: number;
          }) {
            const response = await llmAdapter.chat({
              messages: params.messages as Array<{
                role: "user" | "assistant" | "system" | "tool";
                content: string;
                toolName?: string;
                toolCallId?: string;
                toolResult?: Record<string, unknown>;
              }>,
              temperature: params.temperature ?? 0.7,
              maxTokens: params.max_tokens ?? 4096,
            });
            return { content: response.content };
          },
        };
      })()
    : {
        async chat() {
          throw new Error("LLM_UNAVAILABLE");
        },
      };

  // MemoryStore (Protocol 3)
  const memoryStore = createPrismaMemoryStore(prisma);

  // ChiefAgentDeps 需要 memoryStore 有 save/search 方法
  // createPrismaMemoryStore 返回的是 remember/retrieve——做别名
  const adaptedMemoryStore = {
    ...memoryStore,
    save: memoryStore.remember,
    search: memoryStore.retrieve,
  };

  // AgentRun 生命周期追踪（schema 使用 ownerId，需从 userId 映射）
  const runTracker = new AgentRunTracker(createPrismaAgentRunStorage(prisma));

  // 构建真实 ToolRegistry（使用 DefaultRiskAnalyzer 作为诊断引擎）
  const riskAnalyzer = new DefaultRiskAnalyzer();
  const toolRegistry = ChiefToolRegistry.createDefault({
    // 知识引擎：使用 Prisma 搜索知识节点
    knowledgeEngine: {
      async search(query: string, limit = 5) {
        const nodes = await prisma.knowledgeNode.findMany({
          where: {
            status: "published",
            OR: [
              { title: { contains: query } },
              { content: { contains: query } },
            ],
          },
          take: limit,
          orderBy: { updatedAt: "desc" },
        });
        return nodes.map((n) => ({
          key: n.title,
          value: n.content,
          importance: n.confidence,
        }));
      },
    },
    // 诊断引擎：基于 DefaultRiskAnalyzer 构建
    diagnosisEngine: {
      async diagnose(project: Record<string, unknown>, owner: Record<string, unknown>) {
        const risks = riskAnalyzer.identifyRisks(project, owner);
        const score = Math.max(
          10,
          100 -
            risks.reduce((acc, r) => {
              const levelMap = { critical: 25, high: 15, medium: 8, low: 3 };
              return acc + (levelMap[r.level] || 0);
            }, 0),
        );
        const highRisks = risks.filter((r) => r.level === "critical" || r.level === "high");
        return {
          risks: risks.map((r) => ({ type: r.type, description: r.description, level: r.level })),
          score,
          recommendation:
            highRisks.length > 0
              ? `发现 ${highRisks.length} 个高风险项，建议优先处理: ${highRisks.map((r) => r.description).join("、")}`
              : "未发现严重风险",
        };
      },
    },
  });

  return { llm, memoryStore: adaptedMemoryStore, toolRegistry, runTracker };
}

/**
 * AgentRun 存储适配：协议用 userId，Prisma schema 用 ownerId
 */
function createPrismaAgentRunStorage(prisma: PrismaClient): AgentRunStorage {
  return {
    async create(input) {
      const owner = await prisma.owner.findUnique({
        where: { userId: input.userId },
        select: { id: true },
      });
      if (!owner) {
        throw new Error("经营者信息不存在，无法创建 AgentRun");
      }

      const run = await prisma.agentRun.create({
        data: {
          agentId: input.agentId,
          ownerId: owner.id,
          projectId: input.projectId ?? null,
          conversationId: input.conversationId ?? null,
          input: input.input ? JSON.stringify(input.input) : null,
          status: "running",
        },
        select: { id: true },
      });
      return run.id;
    },

    async update(runId, update) {
      const run = await prisma.agentRun.update({
        where: { id: runId },
        data: {
          ...(update.status !== undefined ? { status: update.status } : {}),
          ...(update.output !== undefined ? { output: JSON.stringify(update.output) } : {}),
          ...(update.duration !== undefined ? { duration: update.duration } : {}),
          ...(update.tokens !== undefined ? { tokens: update.tokens } : {}),
        },
      });

      if (update.status === "success" || update.status === "failed") {
        try {
          const { recordAgentRunUsage } = await import("./usage.service");
          await recordAgentRunUsage(prisma, {
            runId,
            agentId: run.agentId,
            tokens: update.tokens ?? run.tokens,
          });
        } catch {
          // 计量失败不影响主链路
        }
      }
    },

    async linkDecision(runId, decisionId) {
      await prisma.decision.update({
        where: { id: decisionId },
        data: { agentRunId: runId },
      });
    },
  };
}

function createPrismaMemoryStore(prisma: PrismaClient) {
  return {
    async remember(userId: string, memory: { layer: string; key: string; value: unknown; importance: number; source: string; projectId?: string }) {
      const owner = await prisma.owner.findUnique({ where: { userId } });
      if (!owner) return;

      const existing = await prisma.memory.findFirst({
        where: {
          ownerId: owner.id,
          projectId: memory.projectId ?? null,
          key: memory.key,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.memory.update({
          where: { id: existing.id },
          data: {
            content: JSON.stringify(memory.value),
            source: memory.source,
            importance: Math.round(memory.importance * 100),
            updatedAt: new Date(),
            projectId: memory.projectId ?? null,
          },
        });
        return;
      }

      await prisma.memory.create({
        data: {
          ownerId: owner.id,
          projectId: memory.projectId ?? null,
          type: memory.layer.toUpperCase(),
          key: memory.key,
          content: JSON.stringify(memory.value),
          source: memory.source,
          importance: Math.round(memory.importance * 100),
        },
      });
    },

    async saveDecision(
      userId: string,
      projectId: string,
      decision: MKDecision,
      _knowledgeRefs?: Array<{ id: string; type: string; title: string; relevance: number }>,
    ) {
      if (!projectId) return "";
      const owner = await prisma.owner.findUnique({ where: { userId } });
      if (!owner) return "";

      const record = await createDecision(prisma, {
        ownerId: owner.id,
        projectId,
        agentId: "chief-agent",
        type: "general",
        problem: decision.problem,
        observation: decision.observation,
        diagnosis: decision.diagnosis,
        judgement: decision.judgement,
        strategy: decision.strategy,
        action: decision.action,
        confidence: decision.confidence,
        evidence: decision.evidence,
      });
      return record.id;
    },

    async retrieve(userId: string, query: string, limit = 5) {
      const owner = await prisma.owner.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!owner) return [];

      const q = query.trim();
      const memories = await prisma.memory.findMany({
        where: {
          ownerId: owner.id,
          ...(q
            ? {
                OR: [
                  { key: { contains: q } },
                  { content: { contains: q } },
                ],
              }
            : {}),
        },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: limit,
      });

      return memories.map((m) => {
        let value: unknown = m.content;
        try {
          value = JSON.parse(m.content);
        } catch {
          // keep raw string
        }
        return {
          key: m.key,
          value,
          importance: m.importance / 100,
        };
      });
    },

    async getForProject(userId: string, projectId: string) {
      const owner = await prisma.owner.findUnique({ where: { userId } });
      if (!owner) return [];

      const memories = await prisma.memory.findMany({
        where: { ownerId: owner.id, projectId },
        orderBy: { importance: "desc" },
        take: 20,
      });
      return memories.map(m => ({
        type: m.type as "OWNER" | "PROJECT" | "DECISION" | "LEARNING",
        content: m.content,
        key: m.key,
        importance: m.importance / 100,
        source: m.source,
        updatedAt: m.updatedAt,
      }));
    },

    async getForUser(userId: string) {
      const owner = await prisma.owner.findUnique({ where: { userId } });
      if (!owner) return [];

      const memories = await prisma.memory.findMany({
        where: { ownerId: owner.id },
        orderBy: { importance: "desc" },
        take: 20,
      });
      return memories.map(m => ({
        type: m.type as "OWNER" | "PROJECT" | "DECISION" | "LEARNING",
        content: m.content,
        key: m.key,
        importance: m.importance / 100,
        source: m.source,
        updatedAt: m.updatedAt,
      }));
    },

    async getDecisionHistory(userId: string, projectId: string, limit = 10) {
      const owner = await prisma.owner.findUnique({ where: { userId } });
      if (!owner) return [];

      const decisions = await prisma.decision.findMany({
        where: { ownerId: owner.id, ...(projectId ? { projectId } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return decisions.map(d => ({
        id: d.id,
        title: d.problem,
        conclusion: d.judgement,
        confidence: d.confidence,
        type: d.type,
        createdAt: d.createdAt,
      }));
    },
  };
}
