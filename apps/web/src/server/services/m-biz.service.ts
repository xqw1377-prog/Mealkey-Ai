/**
 * M-BIZ Product Service — D3 商业模式引擎（SSE）
 * 外呼 FastAPI；不可用时降级启发式，并落库 Decision / Memory / profile.mBiz。
 */

import type { StreamChunk } from "@mealkey/agent-sdk";
import type { PrismaClient } from "@/generated/prisma";
import { parseJsonField, stringifyJsonField } from "@/lib/prisma";
import { buildBusinessSnapshotFromChat, type BusinessSnapshot } from "@/lib/business";
import { withFounderBusinessContext } from "@/lib/founder-decision-snapshot";
import {
  createAgentRun,
  createDecision,
  saveMemory,
  updateAgentRun,
} from "./agent-os.service";
import {
  checkMBizHealth,
  mbizChat,
  mbizDegradedResponse,
  normalizeBizIndustry,
  normalizeBizStage,
} from "./m-biz-client";

export const mBizManifest = {
  id: "m-biz",
  name: "商业模式引擎",
  version: "1.0.0",
  description: "围绕赚钱、复制与验证，形成商业模式判断。",
  capabilities: ["business_model", "unit_economics", "replication", "verification"],
};

export type MBizMetaChunk = {
  type: "meta";
  runtime: "m-biz";
  provider: "external" | "heuristic";
  model: string;
  fallback: boolean;
  assetCount: number;
  conversationId: string;
  agentId: "m-biz";
  agentName: string;
};

export type MBizResultChunk = {
  type: "business_result";
  data: BusinessSnapshot;
  previous?: BusinessSnapshot | null;
};

export interface MBizServiceOptions {
  projectId: string;
  userId: string;
  message: string;
  conversationId?: string;
  assetIds?: string[];
  force?: boolean;
  assetContextBlock?: string | null;
}

export function isMBizProductIntent(message: string, force?: boolean): boolean {
  if (force) return true;
  return /商业模式|怎么赚钱|单位经济|单店模型|复制|加盟模型|毛利|现金流|获客成本|LTV|验证任务|经营体检|商业体检/i.test(
    message,
  );
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeBizChatData(data: Record<string, unknown>) {
  return {
    sessionId:
      (typeof data.session_id === "string" && data.session_id) ||
      (typeof data.sessionId === "string" && data.sessionId) ||
      "",
    status: (typeof data.status === "string" && data.status) || "idle",
    currentLayer:
      (typeof data.current_layer === "string" && data.current_layer) ||
      (typeof data.currentLayer === "string" && data.currentLayer) ||
      "L1",
    reply: (typeof data.reply === "string" && data.reply) || "",
    pendingQuestions: toStringArray(data.pending_questions || data.pendingQuestions),
    factNodes: Array.isArray(data.fact_nodes)
      ? data.fact_nodes.map((item) => {
          const node = item as Record<string, unknown>;
          return {
            nodeId: String(node.node_id || node.nodeId || ""),
            category: String(node.category || ""),
            statement: String(node.statement || ""),
            confidence: typeof node.confidence === "number" ? node.confidence : 0.6,
            source: String(node.source || ""),
            needsVerification: Boolean(node.needs_verification ?? node.needsVerification),
            verificationStatus: String(node.verification_status || node.verificationStatus || "unverified"),
            followUpQuestions: toStringArray(node.follow_up_questions || node.followUpQuestions),
            createdAt: typeof node.created_at === "string" ? node.created_at : undefined,
          };
        })
      : [],
    dimensionScores:
      data.dimension_scores && typeof data.dimension_scores === "object"
        ? Object.fromEntries(
            Object.entries(data.dimension_scores as Record<string, unknown>).flatMap(([key, value]) => {
              if (!value || typeof value !== "object") return [];
              const item = value as Record<string, unknown>;
              if (typeof item.score !== "number" || typeof item.summary !== "string") return [];
              return [[key, { score: item.score, summary: item.summary }]];
            }),
          )
        : undefined,
    ruleJudgments: Array.isArray(data.rule_judgments)
      ? data.rule_judgments.map((item) => {
          const judgment = item as Record<string, unknown>;
          return {
            ruleId: String(judgment.rule_id || judgment.ruleId || ""),
            domain: String(judgment.domain || ""),
            inputFactIds: toStringArray(judgment.input_fact_ids || judgment.inputFactIds),
            conclusion: String(judgment.conclusion || ""),
            confidence: typeof judgment.confidence === "number" ? judgment.confidence : 0.6,
            severity: String(judgment.severity || "info"),
          };
        })
      : [],
    suggestions: Array.isArray(data.suggestions)
      ? data.suggestions.map((item) => {
          const suggestion = item as Record<string, unknown>;
          return {
            suggestionId: String(suggestion.suggestion_id || suggestion.suggestionId || ""),
            priority: String(suggestion.priority || "medium"),
            dimension: String(suggestion.dimension || ""),
            action: String(suggestion.action || ""),
            expectedImpact:
              typeof suggestion.expected_impact === "string" ? suggestion.expected_impact : "",
            verificationAction:
              typeof suggestion.verification_action === "string" ? suggestion.verification_action : "",
            estimatedVerificationPeriod:
              typeof suggestion.estimated_verification_period === "string"
                ? suggestion.estimated_verification_period
                : "",
          };
        })
      : [],
    verificationTasks: Array.isArray(data.verification_tasks)
      ? data.verification_tasks.map((item) => {
          const task = item as Record<string, unknown>;
          return {
            taskId: String(task.task_id || task.taskId || ""),
            sourceSuggestionId: String(task.source_suggestion_id || task.sourceSuggestionId || ""),
            dimension: String(task.dimension || ""),
            verificationAction: String(task.verification_action || task.verificationAction || ""),
            estimatedPeriod: typeof task.estimated_period === "string" ? task.estimated_period : "",
            status: String(task.status || "unverified"),
            createdAt: typeof task.created_at === "string" ? task.created_at : undefined,
            deadline: typeof task.deadline === "string" ? task.deadline : null,
            reminderSchedule: toStringArray(task.reminder_schedule || task.reminderSchedule),
          };
        })
      : [],
    progress: typeof data.progress === "number" ? data.progress : 0,
  };
}

function deriveBizHealthScore(normalized: {
  dimensionScores?: Record<string, { score: number; summary: string }>;
}): number | undefined {
  const scores = normalized.dimensionScores ? Object.values(normalized.dimensionScores) : [];
  if (scores.length === 0) return undefined;
  return Math.round((scores.reduce((sum, item) => sum + item.score, 0) / scores.length / 5) * 100);
}

async function persistBizProfile(
  prisma: PrismaClient,
  projectId: string,
  ownerId: string,
  snapshot: BusinessSnapshot,
): Promise<BusinessSnapshot | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true, profile: true },
  });
  if (!project) return null;

  const profile = (parseJsonField(project.profile) as Record<string, unknown> | null) || {};
  const current = profile.mBiz && typeof profile.mBiz === "object" ? profile.mBiz : null;
  const history = Array.isArray(profile.mBizHistory) ? (profile.mBizHistory as unknown[]) : [];
  const nextProfileBase: Record<string, unknown> = {
    ...profile,
    mBiz: {
      ...snapshot,
      updatedAt: new Date().toISOString(),
    },
    mBizPrevious: current || profile.mBizPrevious || null,
    mBizHistory: [current, ...history].filter(Boolean).slice(0, 6),
  };
  const nextProfile = withFounderBusinessContext(
    nextProfileBase,
    {
      decisionId: snapshot.sessionId,
      modelHealthScore: deriveBizHealthScore(snapshot.pageOutput),
      finalJudgement: snapshot.oneLiner,
      handoffPayload: {
        sessionId: snapshot.sessionId,
        currentLayer: snapshot.pageOutput.currentLayer,
      },
    },
    project.id,
  );

  await prisma.project.update({
    where: { id: project.id },
    data: { profile: stringifyJsonField(nextProfile) },
  });

  return current && typeof current === "object" ? (current as BusinessSnapshot) : null;
}

export async function* streamMBizProduct(
  prisma: PrismaClient,
  options: MBizServiceOptions,
  conversation: { id: string },
  ownerId: string,
): AsyncGenerator<StreamChunk | MBizMetaChunk | MBizResultChunk> {
  const { projectId, userId, message, assetIds = [] } = options;
  const startedAt = Date.now();
  const enrichedMessage = options.assetContextBlock
    ? `${message}\n\n补充资料：\n${options.assetContextBlock}`
    : message;

  const healthy = await checkMBizHealth();
  const provider = healthy ? "external" : "heuristic";

  yield {
    type: "meta",
    runtime: "m-biz",
    provider,
    model: healthy ? "m-biz-api" : "rule-based",
    fallback: !healthy,
    assetCount: assetIds.length,
    conversationId: conversation.id,
    agentId: "m-biz",
    agentName: mBizManifest.name,
  };

  const agentRun = await createAgentRun(prisma, {
    agentId: "m-biz",
    userId,
    projectId,
    conversationId: conversation.id,
    input: { message, assetIds, agent: "m-biz" },
  });

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId },
      select: { id: true, name: true, category: true, stage: true, profile: true },
    });
    if (!project) {
      yield { type: "error", message: "项目不存在或无权限访问" };
      return;
    }

    yield {
      type: "text",
      content: "## 商业模式工作台\n\n正在接入商业引擎，形成本轮赚钱与复制判断。\n",
    };
    yield { type: "tool_start", toolName: "business_diagnosis" } as StreamChunk;

    let raw: Record<string, unknown>;
    try {
      if (!healthy) throw new Error("M-BIZ health check failed");
      const response = await mbizChat({
        message: enrichedMessage,
        enterprise_name: project.name,
        industry: normalizeBizIndustry(project.category),
        stage: normalizeBizStage(project.stage),
      });
      raw = response as unknown as Record<string, unknown>;
    } catch {
      raw = mbizDegradedResponse(enrichedMessage) as unknown as Record<string, unknown>;
    }

    const normalized = normalizeBizChatData(raw);
    const snapshot = buildBusinessSnapshotFromChat({
      message,
      response: normalized,
      source: "m-biz",
    });

    yield { type: "text", content: `\n${snapshot.oneLiner}\n` };
    yield {
      type: "tool_result",
      toolName: "business_diagnosis",
      result: {
        success: true,
        data: {
          sessionId: snapshot.sessionId,
          currentLayer: snapshot.pageOutput.currentLayer,
          progress: snapshot.pageOutput.progress,
        },
      },
    } as StreamChunk;

    const decision = await createDecision(prisma, {
      ownerId,
      projectId,
      agentRunId: agentRun.id,
      agentId: "m-biz",
      type: "business",
      problem: snapshot.problem,
      observation: snapshot.observation,
      diagnosis: snapshot.diagnosis,
      judgement: snapshot.oneLiner.slice(0, 500),
      strategy: snapshot.strategy,
      action: snapshot.action,
      confidence: snapshot.confidence,
      evidence: [
        {
          source: "structured",
          content: JSON.stringify({ pageOutput: snapshot.pageOutput }),
          relevance: 1,
        },
      ],
    });

    await saveMemory(prisma, ownerId, {
      key: `m-biz_business_${projectId}`,
      content: JSON.stringify({
        summary: snapshot.oneLiner.slice(0, 400),
        sessionId: snapshot.sessionId,
        currentLayer: snapshot.pageOutput.currentLayer,
        sourceMessage: message.slice(0, 200),
        at: new Date().toISOString(),
      }),
      type: "DECISION",
      source: "m-biz",
      importance: 88,
      projectId,
    });

    const previous = await persistBizProfile(prisma, projectId, ownerId, snapshot);

    await updateAgentRun(prisma, agentRun.id, {
      status: "success",
      duration: Date.now() - startedAt,
      decisionId: decision.id,
      output: {
        summary: snapshot.oneLiner.slice(0, 200),
        snapshot,
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: ["## Business Model Center", snapshot.oneLiner.slice(0, 1200)].join("\n\n"),
        metadata: JSON.stringify({
          agentRunId: agentRun.id,
          decisionId: decision.id,
          runtime: "m-biz",
          provider,
          model: healthy ? "m-biz-api" : "rule-based",
          snapshot,
          previous,
        }),
      },
    });

    yield { type: "business_result", data: snapshot, previous };
    yield { type: "done" };
  } catch (error) {
    await updateAgentRun(prisma, agentRun.id, {
      status: "failed",
      duration: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "M-BIZ 执行失败",
    });
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "商业模式分析失败，请稍后重试",
    };
  }
}
