/**
 * Agent OS Service - Agent 执行记录和决策管理
 *
 * 对齐 Kernel Schema V1:
 * - AgentRun.ownerId → Owner.id
 * - Decision 使用 MKDecision 字段
 * - ProjectMemory → Memory (统一模型)
 *
 * ⚠️ 所有 outcome/learning 字段统一存储为 JSON 字符串，
 *    读取时需使用 safeParseJson 解析。
 */

import type { PrismaClient } from "@/generated/prisma";
import { createLogger } from "@/lib/logger";
import { safeParseJson } from "@mealkey/agent-sdk";

const log = createLogger("agent-os");

type DecisionEvidence = {
  source: string;
  content: string;
  relevance: number;
};

function clamp01(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number | null | undefined, digits = 4) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildCognitiveIds(decisionId: string) {
  return {
    sessionId: `cs_${decisionId}`,
    confidenceId: `cf_${decisionId}`,
  };
}

function normalizeEvidenceList(evidence: DecisionEvidence[] | undefined) {
  return (evidence ?? [])
    .filter((item) => item && typeof item.source === "string" && typeof item.content === "string")
    .map((item) => ({
      source: item.source,
      content: item.content,
      relevance: clamp01(item.relevance) ?? 0,
    }));
}

function mapEvidenceToCognitiveShape(evidence: DecisionEvidence, index: number) {
  if (evidence.source === "observation") {
    return {
      traceType: "CONTEXT_LOAD",
      sourceType: "CONTEXT",
      sourceId: null,
      evidenceType: "CONTEXT",
      contribution: evidence.relevance,
      sequence: index + 1,
    };
  }

  if (evidence.source.startsWith("knowledge_rule:")) {
    return {
      traceType: "RULE_VALIDATE",
      sourceType: "RULE",
      sourceId: evidence.source.split(":")[1] ?? null,
      evidenceType: "RULE",
      contribution: evidence.relevance,
      sequence: index + 1,
    };
  }

  if (evidence.source.startsWith("knowledge_case:")) {
    return {
      traceType: "CASE_RETRIEVE",
      sourceType: "CASE",
      sourceId: evidence.source.split(":")[1] ?? null,
      evidenceType: "CASE",
      contribution: evidence.relevance,
      sequence: index + 1,
    };
  }

  if (evidence.source === "risk_analysis") {
    return {
      traceType: "RULE_VALIDATE",
      sourceType: "SYSTEM",
      sourceId: null,
      evidenceType: "CONTRADICT",
      contribution: evidence.relevance,
      sequence: index + 1,
    };
  }

  if (evidence.source === "tool") {
    return {
      traceType: "FUSION",
      sourceType: "TOOL",
      sourceId: null,
      evidenceType: "SUPPORT",
      contribution: evidence.relevance,
      sequence: index + 1,
    };
  }

  if (evidence.source === "structured") {
    return {
      traceType: "DECISION_BUILD",
      sourceType: "SYSTEM",
      sourceId: null,
      evidenceType: "SUPPORT",
      contribution: evidence.relevance,
      sequence: index + 1,
    };
  }

  return {
    traceType: "LLM_REASON",
    sourceType: "SYSTEM",
    sourceId: evidence.source,
    evidenceType: "SUPPORT",
    contribution: evidence.relevance,
    sequence: index + 1,
  };
}

function buildConfidenceBreakdown(evidenceList: DecisionEvidence[], overallConfidence: number) {
  const byPrefix = (predicate: (item: DecisionEvidence) => boolean) =>
    evidenceList.filter(predicate).map((item) => item.relevance);

  const dataConfidence = average(byPrefix((item) => item.source === "observation"));
  const knowledgeConfidence = average(
    byPrefix((item) => item.source.startsWith("knowledge_rule:") || item.source === "structured"),
  );
  const ruleConfidence = average(
    byPrefix((item) => item.source.startsWith("knowledge_rule:") || item.source === "risk_analysis"),
  );
  const historicalConfidence = average(byPrefix((item) => item.source.startsWith("knowledge_case:")));
  const llmConfidence = average(
    byPrefix(
      (item) =>
        !item.source.startsWith("knowledge_rule:") &&
        !item.source.startsWith("knowledge_case:") &&
        item.source !== "observation" &&
        item.source !== "risk_analysis",
    ),
  );

  return {
    overall: roundScore(clamp01(overallConfidence) ?? 0) ?? 0,
    dataConfidence,
    knowledgeConfidence,
    ruleConfidence,
    llmConfidence,
    historicalConfidence,
  };
}

async function persistCognitiveKernelSnapshot(
  prisma: PrismaClient,
  args: {
    decisionId: string;
    agentRunId?: string;
    projectId?: string;
    ownerId: string;
    agentId?: string;
    problem: string;
    observation: string;
    diagnosis: string;
    judgement: string;
    strategy: string;
    action: string;
    confidence: number;
    evidence?: DecisionEvidence[];
  },
) {
  const { sessionId, confidenceId } = buildCognitiveIds(args.decisionId);
  const evidenceList = normalizeEvidenceList(args.evidence);
  const confidence = buildConfidenceBreakdown(evidenceList, args.confidence);
  const startedAt = new Date();
  const completedAt = new Date();

  const contextSnapshotRef = JSON.stringify({
    ownerId: args.ownerId,
    agentId: args.agentId ?? null,
    problem: args.problem,
    observation: args.observation,
    diagnosis: args.diagnosis,
    judgement: args.judgement,
    strategy: args.strategy,
    action: args.action,
  });

  // Prisma upsert：兼容 SQLite / PostgreSQL（避免 INSERT OR REPLACE 方言锁死）
  await prisma.cognitiveSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      agentRunId: args.agentRunId ?? null,
      projectId: args.projectId ?? null,
      decisionId: args.decisionId,
      contextSnapshotRef,
      status: "COMPLETED",
      confidenceRef: confidenceId,
      source: "decision_persistence",
      startedAt,
      completedAt,
    },
    update: {
      agentRunId: args.agentRunId ?? null,
      projectId: args.projectId ?? null,
      decisionId: args.decisionId,
      contextSnapshotRef,
      status: "COMPLETED",
      confidenceRef: confidenceId,
      source: "decision_persistence",
      startedAt,
      completedAt,
    },
  });

  const sessionTrace = {
    problem: args.problem,
    diagnosis: args.diagnosis,
    judgement: args.judgement,
    strategy: args.strategy,
    action: args.action,
  };

  const decisionTraceId = `ct_${args.decisionId}_decision_build`;
  await prisma.cognitiveTrace.upsert({
    where: { id: decisionTraceId },
    create: {
      id: decisionTraceId,
      sessionId,
      type: "DECISION_BUILD",
      sourceType: "SYSTEM",
      sourceId: args.agentId ?? "decision_engine",
      input: JSON.stringify({
        problem: args.problem,
        observation: args.observation,
        evidenceCount: evidenceList.length,
      }),
      output: JSON.stringify(sessionTrace),
      confidence: confidence.overall,
      weight: 1,
      sequence: 0,
      sourceEventId: null,
    },
    update: {
      sessionId,
      type: "DECISION_BUILD",
      sourceType: "SYSTEM",
      sourceId: args.agentId ?? "decision_engine",
      input: JSON.stringify({
        problem: args.problem,
        observation: args.observation,
        evidenceCount: evidenceList.length,
      }),
      output: JSON.stringify(sessionTrace),
      confidence: confidence.overall,
      weight: 1,
      sequence: 0,
    },
  });

  for (const [index, item] of evidenceList.entries()) {
    const shape = mapEvidenceToCognitiveShape(item, index);
    const traceId = `ct_${args.decisionId}_${index + 1}`;
    const evidenceId = `ev_${args.decisionId}_${index + 1}`;

    await prisma.cognitiveTrace.upsert({
      where: { id: traceId },
      create: {
        id: traceId,
        sessionId,
        type: shape.traceType,
        sourceType: shape.sourceType,
        sourceId: shape.sourceId,
        input: null,
        output: item.content,
        confidence: item.relevance,
        weight: item.relevance,
        sequence: shape.sequence,
        sourceEventId: null,
      },
      update: {
        sessionId,
        type: shape.traceType,
        sourceType: shape.sourceType,
        sourceId: shape.sourceId,
        output: item.content,
        confidence: item.relevance,
        weight: item.relevance,
        sequence: shape.sequence,
      },
    });

    await prisma.evidenceReference.upsert({
      where: { id: evidenceId },
      create: {
        id: evidenceId,
        sessionId,
        decisionId: args.decisionId,
        type: shape.evidenceType,
        sourceType: shape.sourceType,
        sourceId: shape.sourceId ?? item.source,
        contribution: shape.contribution,
        confidence: item.relevance,
        content: item.content,
        metadata: JSON.stringify({ source: item.source }),
      },
      update: {
        sessionId,
        decisionId: args.decisionId,
        type: shape.evidenceType,
        sourceType: shape.sourceType,
        sourceId: shape.sourceId ?? item.source,
        contribution: shape.contribution,
        confidence: item.relevance,
        content: item.content,
        metadata: JSON.stringify({ source: item.source }),
      },
    });
  }

  await prisma.confidenceModel.upsert({
    where: { id: confidenceId },
    create: {
      id: confidenceId,
      sessionId,
      overall: confidence.overall,
      dataConfidence: confidence.dataConfidence,
      knowledgeConfidence: confidence.knowledgeConfidence,
      ruleConfidence: confidence.ruleConfidence,
      llmConfidence: confidence.llmConfidence,
      historicalConfidence: confidence.historicalConfidence,
      metadata: JSON.stringify({ evidenceCount: evidenceList.length }),
    },
    update: {
      sessionId,
      overall: confidence.overall,
      dataConfidence: confidence.dataConfidence,
      knowledgeConfidence: confidence.knowledgeConfidence,
      ruleConfidence: confidence.ruleConfidence,
      llmConfidence: confidence.llmConfidence,
      historicalConfidence: confidence.historicalConfidence,
      metadata: JSON.stringify({ evidenceCount: evidenceList.length }),
    },
  });

  return { sessionId, confidenceId, evidenceCount: evidenceList.length };
}

/** 统一解析 outcome 字段 */
function parseOutcome(outcome: string | null): { result?: string } | null {
  if (!outcome) return null;
  const parsed = safeParseJson<{ result?: string }>(outcome);
  return parsed && typeof parsed === "object" ? parsed : { result: outcome };
}

/** 统一解析 learning 字段 */
function parseLearning(learning: string | null): { lesson?: string } | null {
  if (!learning) return null;
  const parsed = safeParseJson<{ lesson?: string }>(learning);
  return parsed && typeof parsed === "object" ? parsed : { lesson: learning };
}

/** 统一序列化 outcome */
function serializeOutcome(outcome: string): string {
  return JSON.stringify({ result: outcome, updatedAt: new Date().toISOString() });
}

/** 统一序列化 learning */
function serializeLearning(learning: string): string {
  return JSON.stringify({ lesson: learning, updatedAt: new Date().toISOString() });
}

// ─── 辅助函数 ───

async function findOwnerId(prisma: PrismaClient, userId: string): Promise<string | null> {
  const owner = await prisma.owner.findUnique({ where: { userId }, select: { id: true } });
  return owner?.id ?? null;
}

// ─── AgentRun 管理 (Protocol 7) ───

export async function createAgentRun(
  prisma: PrismaClient,
  data: {
    agentId: string;
    userId: string;
    projectId?: string;
    missionId?: string;
    conversationId?: string;
    input?: Record<string, unknown>;
  }
) {
  const ownerId = await findOwnerId(prisma, data.userId);
  if (!ownerId) throw new Error("经营者信息不存在");

  return prisma.agentRun.create({
    data: {
      agentId: data.agentId,
      ownerId,
      projectId: data.projectId,
      missionId: data.missionId,
      conversationId: data.conversationId,
      input: data.input ? JSON.stringify(data.input) : null,
      status: "running",
    },
  });
}

export async function updateAgentRun(
  prisma: PrismaClient,
  runId: string,
  data: {
    output?: Record<string, unknown>;
    status?: "success" | "failed";
    duration?: number;
    tokens?: number;
    decisionId?: string;
  }
) {
  const run = await prisma.agentRun.update({
    where: { id: runId },
    data: {
      output: data.output ? JSON.stringify(data.output) : undefined,
      status: data.status,
      duration: data.duration,
      tokens: data.tokens,
      decisionId: data.decisionId,
    },
  });

  if (data.status === "success" || data.status === "failed") {
    try {
      const { recordAgentRunUsage } = await import("./usage.service");
      await recordAgentRunUsage(prisma, {
        runId,
        agentId: run.agentId,
        tokens: data.tokens ?? run.tokens,
      });
    } catch {
      // 计量失败不影响主链路
    }
  }

  return run;
}

export async function getAgentRuns(
  prisma: PrismaClient,
  filters: {
    userId?: string;
    projectId?: string;
    agentId?: string;
    limit?: number;
  }
) {
  const where: Record<string, unknown> = {};
  if (filters.userId) {
    const ownerId = await findOwnerId(prisma, filters.userId);
    if (ownerId) where.ownerId = ownerId;
  }
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.agentId) where.agentId = filters.agentId;

  return prisma.agentRun.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 20,
    include: {
      decisions: true,
    },
  });
}

// ─── Decision 管理 (Protocol 2: MKDecision) ───

export async function createDecision(
  prisma: PrismaClient,
  data: {
    ownerId: string;
    projectId?: string;
    agentRunId?: string;
    agentId?: string;
    type?: string;
    problem: string;
    observation: string;
    diagnosis: string;
    judgement: string;
    strategy: string;
    action: string;
    confidence: number;
    evidence?: Array<{ source: string; content: string; relevance: number }>;
  }
) {
  const record = await prisma.decision.create({
    data: {
      ownerId: data.ownerId,
      projectId: data.projectId,
      agentRunId: data.agentRunId,
      agentId: data.agentId,
      type: data.type ?? "general",
      problem: data.problem,
      observation: data.observation,
      diagnosis: data.diagnosis,
      judgement: data.judgement,
      strategy: data.strategy,
      action: data.action,
      confidence: data.confidence,
      evidence: data.evidence ? JSON.stringify(data.evidence) : "[]",
    },
  });

  try {
    await persistCognitiveKernelSnapshot(prisma, {
      decisionId: record.id,
      agentRunId: data.agentRunId,
      projectId: data.projectId,
      ownerId: data.ownerId,
      agentId: data.agentId,
      problem: data.problem,
      observation: data.observation,
      diagnosis: data.diagnosis,
      judgement: data.judgement,
      strategy: data.strategy,
      action: data.action,
      confidence: data.confidence,
      evidence: data.evidence,
    });
  } catch (error) {
    log.warn("Persisting cognitive kernel snapshot failed", { error: String(error) });
  }

  // Restaurant Brain：Decision → DecisionRecord 关联（不复制完整决策正文）
  if (data.projectId) {
    try {
      const { linkDecisionToRestaurantBrain } = await import(
        "../restaurant-brain/service"
      );
      await linkDecisionToRestaurantBrain(prisma, {
        projectId: data.projectId,
        ownerId: data.ownerId,
        mkDecisionId: record.id,
        type: data.type ?? "general",
        question: data.problem,
        judgementSummary: data.judgement,
      });
    } catch (error) {
      log.warn("Restaurant Brain decision writeback failed", { error: String(error) });
    }
  }

  return record;
}

export async function getDecisions(
  prisma: PrismaClient,
  ownerId: string,
  projectId?: string,
  type?: string
) {
  const where: Record<string, unknown> = { ownerId };
  if (projectId) where.projectId = projectId;
  if (type) where.type = type;

  const records = await prisma.decision.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 统一解析 outcome/learning
  return records.map(r => ({
    ...r,
    outcome: parseOutcome(r.outcome),
    learning: parseLearning(r.learning),
  }));
}

export async function updateDecisionOutcome(
  prisma: PrismaClient,
  decisionId: string,
  outcome: string,
  learning?: string
) {
  return prisma.decision.update({
    where: { id: decisionId },
    data: {
      outcome: serializeOutcome(outcome),
      learning: learning ? serializeLearning(learning) : null,
    },
  });
}

// ─── Memory 管理 (Protocol 3: MemoryEngine) ───

export async function getMemories(
  prisma: PrismaClient,
  ownerId: string,
  projectId?: string,
  type?: string
) {
  const where: Record<string, unknown> = { ownerId };
  if (projectId) where.projectId = projectId;
  if (type) where.type = type;

  return prisma.memory.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveMemory(
  prisma: PrismaClient,
  ownerId: string,
  entry: {
    key: string;
    content: string;
    type?: string;
    source?: string;
    importance?: number;
    projectId?: string;
  }
) {
  const existing = await prisma.memory.findFirst({
    where: {
      ownerId,
      projectId: entry.projectId ?? null,
      key: entry.key,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.memory.update({
      where: { id: existing.id },
      data: {
        content: entry.content,
        source: entry.source ?? "ai",
        importance: entry.importance ?? 50,
        type: entry.type ?? "PROJECT",
        projectId: entry.projectId ?? null,
      },
    });
  }

  return prisma.memory.create({
    data: {
      ownerId,
      projectId: entry.projectId ?? null,
      key: entry.key,
      content: entry.content,
      source: entry.source ?? "ai",
      importance: entry.importance ?? 50,
      type: entry.type ?? "PROJECT",
    },
  });
}
