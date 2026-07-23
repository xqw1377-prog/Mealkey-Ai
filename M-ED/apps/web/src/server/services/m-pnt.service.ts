/**
 * M-PNT Product Service — D2 AI 品牌战略工作坊
 *
 * 检测用户是否在询问"品牌定位怎么做"，包括：
 * - 品类选择（什么品类/做什么菜/选什么品）
 * - 客群画像（客群画像/目标客群）
 * - 品牌定位（品牌定位/定位策略/品牌）
 * - 差异化策略（差异化/心智位置）
 * - 价格带决策（价格带）
 *
 * 委托 `shouldUseMPntAgent()` 做更精确的场景推理：
 * - 区分"开店总包"（如"我想开一家火锅店"）vs "纯定位咨询"（如"我的品牌应该怎么定位"）
 * - 加入定位关键词且非新开店话术 → 路由到 M-PNT
 * - 纯新开店意图 → 走 ChiefAgent
 *
 * 与 D1（M-MKT 市场机会）的区别：
 * - D1 问"这个市场能不能进" → M-MKT
 * - D2 问"这个品牌怎么做" → M-PNT
 *
 * 当前路径：
 * 意图识别 → buildMKContext → runMPnt（MealKey LLM 默认）
 *   → 流式输出定位推演 → 落库 Decision / Memory / Report / AgentRun / Message
 *
 * V2 方向：
 * 从“品牌定位 Agent”升级为“AI Brand Strategy Workshop”，
 * 以 7 阶段工作坊状态机承接诊断、市场扫描、专家分歧、创始人选择与落地执行。
 */

import type { StreamChunk, MKContext, MKDecision } from "@mealkey/agent-sdk";
import type { PrismaClient } from "@/generated/prisma";
import {
  MPntAgent,
  runMPnt,
  mPntWorkflow,
  getCapability,
  fuseStepDecisions,
  readStructured,
  mPntKnowledgeSeeds,
  setMPntLlmWithTheory,
  clearMPntLlmOptions,
  type LLMAdapter,
} from "@mealkey/agents";
import {
  searchPositioningKnowledge,
  findPositioningCases,
  matchPositioningRules,
  queryPositioningWisdom,
} from "@mealkey/knowledge-engine";
import { createLLMAdapter } from "@mealkey/agent-runtime";
import type { TheoryLLMAdapter } from "@mealkey/agents";
import { shouldUseMPntAgent } from "@mealkey/core";
import { buildMKContext } from "./chief-agent.factory";
import {
  createAgentRun,
  updateAgentRun,
  createDecision,
  saveMemory,
} from "./agent-os.service";
import {
  buildPositioningSnapshot,
  diffPositioningSnapshots,
  snapshotFromMPntBlob,
  type PositioningDiff,
  type PositioningSnapshot,
} from "@/lib/positioning";
import {
  buildReviewReason,
  isPositioningSensitiveType,
  mergeReviewQueue,
  type ReviewQueueItem,
} from "@/lib/positioning-review";
import { withFounderPositioningContext } from "@/lib/founder-decision-snapshot";

export type MPntMetaChunk = {
  type: "meta";
  runtime: "m-pnt";
  provider: "deepseek" | "openai" | "none";
  model: string;
  fallback: boolean;
  assetCount: number;
  conversationId: string;
  agentId: "m-pnt";
  agentName: string;
};

export type MPntResultChunk = {
  type: "positioning_result";
  data: PositioningSnapshot;
  previous?: PositioningSnapshot | null;
  diff?: PositioningDiff | null;
};

export interface MPntServiceOptions {
  projectId: string;
  userId: string;
  message: string;
  conversationId?: string;
  assetIds?: string[];
  /** 强制走 M-PNT，跳过意图检测 */
  force?: boolean;
  assetContextBlock?: string | null;
}

type ExtractedLearningMemory = {
  key: string;
  value: Record<string, unknown>;
  source: string;
  importance: number;
};

export function isMPntProductIntent(message: string, force?: boolean): boolean {
  if (force) return true;
  return shouldUseMPntAgent(message);
}

function buildAutoLearningMemories(args: {
  userId: string;
  projectId: string;
  message: string;
  decision: MKDecision;
}): ExtractedLearningMemory[] {
  const normalizedMessage = args.message.trim();
  const memories: ExtractedLearningMemory[] = [];

  if (normalizedMessage) {
    memories.push({
      key: `m_pnt_user_intent_${args.projectId}`,
      value: {
        userId: args.userId,
        type: "positioning_intent",
        message: normalizedMessage.slice(0, 240),
      },
      source: "m-pnt:auto",
      importance: 72,
    });
  }

  if (args.decision.judgement?.trim()) {
    memories.push({
      key: `m_pnt_positioning_judgement_${args.projectId}`,
      value: {
        problem: args.decision.problem,
        judgement: args.decision.judgement,
        confidence: args.decision.confidence,
      },
      source: "m-pnt:auto",
      importance: Math.round(Math.min(1, Math.max(0, args.decision.confidence)) * 100),
    });
  }

  if (args.decision.action?.trim()) {
    memories.push({
      key: `m_pnt_positioning_action_${args.projectId}`,
      value: {
        action: args.decision.action,
        strategy: args.decision.strategy,
      },
      source: "m-pnt:auto",
      importance: 76,
    });
  }

  return memories.slice(0, 3);
}

/**
 * 流式执行 M-PNT 定位工作流（产品路径）
 */
export async function* streamMPntProduct(
  prisma: PrismaClient,
  options: MPntServiceOptions,
  conversation: { id: string },
  ownerId: string,
): AsyncGenerator<StreamChunk | MPntMetaChunk | MPntResultChunk> {
  const { projectId, userId, message, assetIds = [] } = options;
  const startedAt = Date.now();

  const provider = resolveProvider();
  const model = resolveModel(provider);

  yield {
    type: "meta",
    runtime: "m-pnt",
    provider,
    model,
    fallback: provider === "none",
    assetCount: assetIds.length,
    conversationId: conversation.id,
    agentId: "m-pnt",
    agentName: MPntAgent.manifest.name,
  };

  // AgentRun (Protocol 7)
  const agentRun = await createAgentRun(prisma, {
    agentId: "m-pnt",
    userId,
    projectId,
    conversationId: conversation.id,
    input: { message, assetIds, agent: "m-pnt" },
  });

  let mkContext = await buildMKContext(prisma, userId, projectId);
  mkContext = injectMPntKnowledge(mkContext, message);
  mkContext = await injectFeedbackMemory(prisma, mkContext, userId, projectId);
  mkContext = await injectPositioningHistoryMemory(prisma, mkContext, userId, projectId);

  const llm = tryCreateLlmAdapter();
  const mode = llm ? "hybrid" : "heuristic";

  // 构造三理论专用的 TheoryLLMAdapter（复用同一个 LLM 连接）
  const theoryLlm: TheoryLLMAdapter | undefined = llm
    ? {
        async chat(params) {
          const res = await llm.chat({
            model: "deepseek-chat",
            temperature: params.temperature ?? 0.3,
            maxTokens: params.maxTokens ?? 2048,
            messages: params.messages as Array<{
              role: "system" | "user" | "assistant" | "tool";
              content: string;
            }>,
          });
          return { content: res.content };
        },
      }
    : undefined;

  yield {
    type: "text",
    content:
      "## 🎯 MealKey 品牌定位工作台\n\n已识别当前定位议题，系统将结合项目背景、历史判断、上传资料与竞争线索，开始 7 步定位推演。\n",
  };

  const stepDecisions: MKDecision[] = [];
  let previousSummary = "";
  let fullResponse = "";

  try {
    setMPntLlmWithTheory({
      mode,
      llm: llm ?? undefined,
      theoryLlm,
      temperature: 0.35,
      maxTokens: 2048,
    });

    for (const step of mPntWorkflow.steps) {
      const capId = step.capabilities?.[0];

      if (!capId) {
        if (step.output === "final") {
          yield {
            type: "tool_start",
            toolName: "final_positioning",
          } as StreamChunk;

          const fused = fuseStepDecisions(stepDecisions, mkContext);
          stepDecisions.push(fused);

          const section = formatFinalDecision(fused);
          fullResponse += section;
          yield { type: "text", content: section };

          // Persist + sync project profile (returns previous for diff)
          const persistOut = await persistMPntResult(prisma, {
            ownerId,
            projectId,
            userId,
            agentRunId: agentRun.id,
            decision: fused,
            message,
          });
          const decisionId = persistOut.decisionId;
          const previous = persistOut.previous;

          const snapshot = buildPositioningSnapshot({
            decisionId,
            problem: fused.problem,
            observation: fused.observation,
            diagnosis: fused.diagnosis,
            judgement: fused.judgement,
            strategy: fused.strategy,
            action: fused.action,
            confidence: fused.confidence,
            structured: readStructured(fused),
            source: "m-pnt",
          });
          const diff = diffPositioningSnapshots(previous, snapshot);

          if (diff?.hasChanges && previous) {
            const diffLines = [
              `\n### 📌 相对上一版的变化\n`,
              `${diff.summary}\n`,
            ];
            for (const f of diff.fields.filter((x) => x.changed).slice(0, 5)) {
              diffLines.push(`- **${f.label}**: ${f.before} → ${f.after}`);
            }
            const diffText = diffLines.join("\n") + "\n";
            fullResponse += diffText;
            yield { type: "text", content: diffText };
          }

          await updateAgentRun(prisma, agentRun.id, {
            status: "success",
            duration: Date.now() - startedAt,
            decisionId,
            output: {
              judgement: fused.judgement,
              confidence: fused.confidence,
              structured: readStructured(fused) ?? null,
              snapshot,
              previous,
              diff,
            },
          });

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: fullResponse,
              metadata: JSON.stringify({
                agentRunId: agentRun.id,
                decisionId,
                confidence: fused.confidence,
                intent: "positioning",
                runtime: "m-pnt",
                provider,
                model,
                fallback: provider === "none",
                assetIds,
                snapshot,
                previous,
                diff,
              }),
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              agentType: "m-pnt",
              messageCount: { increment: 2 },
              summary: fused.judgement.slice(0, 200),
            },
          });

          await prisma.report.create({
            data: {
              projectId,
              type: "positioning",
              title: fused.problem || "品牌定位决策",
              summary: fused.judgement,
              content: JSON.stringify({
                mkDecision: fused,
                structured: readStructured(fused),
                snapshot,
                previous,
                diff,
                steps: stepDecisions.map((d) => ({
                  id: d.id,
                  problem: d.problem,
                  judgement: d.judgement,
                  confidence: d.confidence,
                })),
              }),
              status: "published",
            },
          });

          yield {
            type: "positioning_result",
            data: snapshot,
            previous,
            diff,
          };
          yield { type: "done" };
          return;
        }
        continue;
      }

      yield {
        type: "tool_start",
        toolName: step.id,
      } as StreamChunk;

      yield {
        type: "text",
        content: `\n### ⏳ ${step.name}\n`,
      };

      const cap = getCapability(capId);
      if (!cap) {
        throw new Error(`Capability not registered: ${capId}`);
      }

      const decision = await cap.execute(
        {
          previousSummary,
          previousResults: previousSummary,
          userMessage: message,
          assetContext: options.assetContextBlock ?? undefined,
        },
        mkContext,
      );
      stepDecisions.push(decision);
      previousSummary = [previousSummary, `[${step.name}] ${decision.judgement}`]
        .filter(Boolean)
        .join("\n");

      const stepText = formatStepDecision(step.name, decision);
      fullResponse += stepText;
      yield { type: "text", content: stepText };

      yield {
        type: "tool_result",
        toolName: step.id,
        result: {
          success: true,
          data: {
            judgement: decision.judgement,
            confidence: decision.confidence,
          },
        },
      } as StreamChunk;
    }

    // Fallback if workflow had no final step
    const result = await runMPnt(mkContext, { id: agentRun.id, goal: message }, {
      mode,
      llm: llm ?? undefined,
    });
    const section = formatFinalDecision(result.decision);
    fullResponse += section;
    yield { type: "text", content: section };

    const persistOut = await persistMPntResult(prisma, {
      ownerId,
      projectId,
      userId,
      agentRunId: agentRun.id,
      decision: result.decision,
      message,
    });
    const decisionId = persistOut.decisionId;
    const previous = persistOut.previous;

    const snapshot = buildPositioningSnapshot({
      decisionId,
      problem: result.decision.problem,
      observation: result.decision.observation,
      diagnosis: result.decision.diagnosis,
      judgement: result.decision.judgement,
      strategy: result.decision.strategy,
      action: result.decision.action,
      confidence: result.decision.confidence,
      structured: readStructured(result.decision),
      source: "m-pnt",
    });
    const diff = diffPositioningSnapshots(previous, snapshot);

    await updateAgentRun(prisma, agentRun.id, {
      status: "success",
      duration: Date.now() - startedAt,
      decisionId,
      output: { judgement: result.decision.judgement, snapshot, previous, diff },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: fullResponse,
        metadata: JSON.stringify({
          agentRunId: agentRun.id,
          decisionId,
          runtime: "m-pnt",
          provider,
          model,
          snapshot,
          previous,
          diff,
        }),
      },
    });

    yield {
      type: "positioning_result",
      data: snapshot,
      previous,
      diff,
    };
    yield { type: "done" };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "M-PNT 执行失败";
    await updateAgentRun(prisma, agentRun.id, {
      status: "failed",
      duration: Date.now() - startedAt,
      output: { error: errMsg },
    }).catch(() => undefined);

    yield { type: "error", message: errMsg };
  } finally {
    clearMPntLlmOptions();
  }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async function persistMPntResult(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    projectId: string;
    userId: string;
    agentRunId: string;
    decision: MKDecision;
    message: string;
  },
): Promise<{ decisionId: string; previous: PositioningSnapshot | null }> {
  const { ownerId, projectId, agentRunId, decision, message } = args;
  const structured = readStructured(decision);

  const record = await createDecision(prisma, {
    ownerId,
    projectId,
    agentRunId,
    agentId: "m-pnt",
    type: "positioning",
    problem: decision.problem,
    observation: decision.observation,
    diagnosis: decision.diagnosis,
    judgement: decision.judgement,
    strategy: decision.strategy,
    action: decision.action,
    confidence: decision.confidence,
    evidence: decision.evidence,
  });

  // Decision memory for next runs
  await saveMemory(prisma, ownerId, {
    key: `m-pnt_positioning_${projectId}`,
    content: JSON.stringify({
      summary: decision.judgement,
      strategy: decision.strategy,
      action: decision.action,
      confidence: decision.confidence,
      structured,
      sourceMessage: message.slice(0, 200),
      at: new Date().toISOString(),
    }),
    type: "DECISION",
    source: "m-pnt",
    importance: Math.round(Math.min(1, Math.max(0, decision.confidence)) * 100),
    projectId,
  });

  // Project-level latest positioning snapshot
  await saveMemory(prisma, ownerId, {
    key: `project_positioning_latest_${projectId}`,
    content: decision.judgement,
    type: "PROJECT",
    source: "m-pnt",
    importance: 90,
    projectId,
  });

  // Auto-extract lightweight learning memories from positioning conversation
  try {
    const extractedMemories = buildAutoLearningMemories({
      userId: args.userId,
      projectId,
      message: args.message,
      decision: args.decision,
    });
    for (const memory of extractedMemories) {
      await saveMemory(prisma, args.ownerId, {
        key: memory.key,
        content: JSON.stringify(memory.value),
        type: "LEARNING",
        source: memory.source,
        importance: Math.round(memory.importance),
        projectId,
      });
    }
  } catch {
    // non-blocking
  }

  // Write back to project.profile / target for other modules
  const previous = await syncProjectPositioning(prisma, {
    ownerId,
    projectId,
    decision,
    structured: structured || {},
    decisionId: record.id,
  });

  return { decisionId: record.id, previous };
}

/**
 * 是否强制使用 heuristic（纯规则）模式
 * 设置 HEURISTIC_ONLY=true 可跳过所有 LLM 调用
 */
function isHeuristicOnly(): boolean {
  return process.env.HEURISTIC_ONLY === "true";
}

export async function previewMPntSnapshot(input: {
  message: string;
  companyContext: {
    companyId: string;
    basicInfo: {
      name: string;
      industry: string;
      city: string;
      stage: string;
    };
    brand?: {
      name?: string;
      positioning?: string;
      users?: string;
    };
    goals: string[];
  };
}): Promise<PositioningSnapshot> {
  const provider = resolveProvider();
  const llm = tryCreateLlmAdapter();
  const mode = isHeuristicOnly() ? "heuristic" : (llm ? "hybrid" : "heuristic");

  const mkContext = {
    owner: {
      id: "founder-layer",
      name: null,
      email: null,
      experience: "3年",
      strengths: [],
      weaknesses: [],
      overallScore: 60,
      riskTolerance: "medium",
      investmentStyle: "moderate",
    },
    project: {
      id: input.companyContext.companyId,
      name: input.companyContext.brand?.name || input.companyContext.basicInfo.name,
      stage: input.companyContext.basicInfo.stage,
      category: input.companyContext.basicInfo.industry,
      target: input.companyContext.goals.join("；") || input.message,
      city: input.companyContext.basicInfo.city,
      district: null,
      budget: null,
      profile: {
        brandName: input.companyContext.brand?.name || input.companyContext.basicInfo.name,
        targetCustomers: input.companyContext.brand?.users,
        mentalPosition: input.companyContext.brand?.positioning,
      },
      healthScore: null,
      confidence: null,
    },
    memories: [],
    decisions: [],
    knowledge: {
      rules: [],
      cases: [],
      models: [],
    },
  } as MKContext;

  const enhancedContext = injectMPntKnowledge(mkContext, input.message);
  const theoryLlm: TheoryLLMAdapter | undefined = llm
    ? {
        async chat(params) {
          const res = await llm.chat({
            model: provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini",
            temperature: params.temperature ?? 0.3,
            maxTokens: params.maxTokens ?? 2048,
            messages: params.messages as Array<{
              role: "system" | "user" | "assistant" | "tool";
              content: string;
            }>,
          });
          return { content: res.content };
        },
      }
    : undefined;

  try {
    setMPntLlmWithTheory({
      mode,
      llm: llm ?? undefined,
      theoryLlm,
      temperature: 0.35,
      maxTokens: 2048,
    });

    const result = await runMPnt(enhancedContext, { id: `founder-layer-${Date.now()}`, goal: input.message }, {
      mode,
      llm: llm ?? undefined,
    });

    return buildPositioningSnapshot({
      problem: result.decision.problem,
      observation: result.decision.observation,
      diagnosis: result.decision.diagnosis,
      judgement: result.decision.judgement,
      strategy: result.decision.strategy,
      action: result.decision.action,
      confidence: result.decision.confidence,
      structured: readStructured(result.decision),
      source: "m-pnt",
    });
  } finally {
    clearMPntLlmOptions();
  }
}

/**
 * Sync M-PNT conclusion into Project fields so World / Meeting / Report share one source of truth.
 * Returns the previous snapshot (if any) for diff UI.
 */
export async function syncProjectPositioning(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    projectId: string;
    decision: MKDecision;
    structured: Record<string, unknown>;
    decisionId: string;
  },
): Promise<PositioningSnapshot | null> {
  const { ownerId, projectId, decision, structured, decisionId } = args;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
  });
  if (!project) return null;

  let profile: Record<string, unknown> = {};
  if (project.profile) {
    try {
      const parsed = JSON.parse(project.profile) as unknown;
      if (parsed && typeof parsed === "object") {
        profile = parsed as Record<string, unknown>;
      }
    } catch {
      profile = {};
    }
  }

  const previousBlob = (profile.mPnt || null) as Record<string, unknown> | null;
  const previous = snapshotFromMPntBlob(previousBlob, "profile");

  const bp = (structured.brandPositioning || {}) as Record<string, unknown>;
  const pageOutput =
    ((structured.pageOutput ||
      structured.page_output ||
      null) as Record<string, unknown> | null) ?? null;
  const normalizedBrandPositioning: Record<string, unknown> = {
    ...bp,
    brandName: bp.brandName ?? profile.brandName ?? project.name,
    category: bp.category ?? profile.category ?? project.category ?? undefined,
  };
  const oneLiner = decision.judgement;
  const mental =
    (typeof normalizedBrandPositioning.mentalPosition === "string" &&
      normalizedBrandPositioning.mentalPosition) ||
    oneLiner;

  const mPnt = {
    decisionId,
    updatedAt: new Date().toISOString(),
    oneLiner,
    problem: decision.problem,
    observation: decision.observation,
    diagnosis: decision.diagnosis,
    strategy: decision.strategy,
    action: decision.action,
    confidence: decision.confidence,
    decision_recommend: structured.decision_recommend,
    brandPositioning: normalizedBrandPositioning,
    risks: structured.risks,
    nextSteps: structured.nextSteps,
    validation: structured.validation,
    theory_vote_summary: structured.theory_vote_summary,
    mSolution: structured.mSolution,
    candidates: structured.candidates,
    pageOutput,
    marketResearch:
      structured.marketResearch ||
      (pageOutput && typeof pageOutput.marketResearch === "object"
        ? pageOutput.marketResearch
        : null),
    theoryViews:
      structured.theoryViews ||
      (pageOutput && typeof pageOutput.theoryViews === "object"
        ? pageOutput.theoryViews
        : null),
    crossFire:
      structured.crossFire ||
      (pageOutput && typeof pageOutput.crossFire === "object"
        ? pageOutput.crossFire
        : null),
    synthesis:
      structured.synthesis ||
      (pageOutput && typeof pageOutput.synthesis === "object"
        ? pageOutput.synthesis
        : null),
  };

  // Keep short history (max 5) for audit / compare UI
  const historyRaw = Array.isArray(profile.mPntHistory)
    ? (profile.mPntHistory as Record<string, unknown>[])
    : [];
  const mPntHistory = previousBlob
    ? [previousBlob, ...historyRaw].slice(0, 5)
    : historyRaw.slice(0, 5);

  // When positioning materially changes, flag related decisions for re-review
  let positioningReviewQueue = Array.isArray(profile.positioningReviewQueue)
    ? profile.positioningReviewQueue
    : [];
  if (previous && previous.oneLiner !== oneLiner) {
    positioningReviewQueue = await flagRelatedDecisionsForReview(prisma, {
      ownerId,
      projectId,
      positioningDecisionId: decisionId,
      previousOneLiner: previous.oneLiner,
      newOneLiner: oneLiner,
      existingQueue: positioningReviewQueue,
    });
  }

  const nextProfile: Record<string, unknown> = withFounderPositioningContext(
    {
      ...profile,
      brandName:
        normalizedBrandPositioning.brandName ?? profile.brandName ?? project.name,
      category:
        normalizedBrandPositioning.category ??
        profile.category ??
        project.category ??
        undefined,
      positioning: oneLiner,
      mentalPosition: mental,
      targetCustomers:
        normalizedBrandPositioning.targetCustomers ?? profile.targetCustomers,
      priceRange: normalizedBrandPositioning.priceRange ?? profile.priceRange,
      differentiation:
        normalizedBrandPositioning.differentiation ?? profile.differentiation,
      brandTonality:
        normalizedBrandPositioning.brandTonality ?? profile.brandTonality,
      mPnt,
      mPntPrevious: previousBlob ?? profile.mPntPrevious ?? null,
      mPntHistory,
      positioningReviewQueue,
    },
    {
      decisionId,
      brandName:
        typeof normalizedBrandPositioning.brandName === "string"
          ? normalizedBrandPositioning.brandName
          : undefined,
      category:
        typeof normalizedBrandPositioning.category === "string"
          ? normalizedBrandPositioning.category
          : undefined,
      mentalPosition: typeof mental === "string" ? mental : undefined,
      targetCustomers:
        typeof normalizedBrandPositioning.targetCustomers === "string"
          ? normalizedBrandPositioning.targetCustomers
          : undefined,
      priceRange:
        typeof normalizedBrandPositioning.priceRange === "string"
          ? normalizedBrandPositioning.priceRange
          : undefined,
      differentiation:
        typeof normalizedBrandPositioning.differentiation === "string"
          ? normalizedBrandPositioning.differentiation
          : undefined,
      finalJudgement: oneLiner,
      handoffPayload: {
        brandName:
          typeof normalizedBrandPositioning.brandName === "string"
            ? normalizedBrandPositioning.brandName
            : undefined,
        category:
          typeof normalizedBrandPositioning.category === "string"
            ? normalizedBrandPositioning.category
            : undefined,
        mentalPosition: typeof mental === "string" ? mental : undefined,
        targetCustomers:
          typeof normalizedBrandPositioning.targetCustomers === "string"
            ? normalizedBrandPositioning.targetCustomers
            : undefined,
        priceRange:
          typeof normalizedBrandPositioning.priceRange === "string"
            ? normalizedBrandPositioning.priceRange
            : undefined,
        differentiation:
          typeof normalizedBrandPositioning.differentiation === "string"
            ? normalizedBrandPositioning.differentiation
            : undefined,
      },
    },
    projectId,
  );

  const data: Record<string, unknown> = {
    target: String(mental).slice(0, 240),
    profile: JSON.stringify(nextProfile),
  };

  // Stage progression: idea → positioning
  if (!project.stage || project.stage === "idea") {
    data.stage = "positioning";
  }

  // Fill empty category from brand card if possible
  if (
    !project.category &&
    typeof normalizedBrandPositioning.category === "string" &&
    normalizedBrandPositioning.category.trim()
  ) {
    data.category = normalizedBrandPositioning.category.trim().slice(0, 40);
  }

  await prisma.project.update({
    where: { id: projectId },
    data,
  });

  return previous;
}

/**
 * Flag non-positioning decisions that may be invalidated by a positioning shift.
 */
async function flagRelatedDecisionsForReview(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    projectId: string;
    positioningDecisionId: string;
    previousOneLiner: string;
    newOneLiner: string;
    existingQueue: unknown;
  },
): Promise<ReviewQueueItem[]> {
  const related = await prisma.decision.findMany({
    where: {
      ownerId: args.ownerId,
      projectId: args.projectId,
      NOT: {
        OR: [{ type: "positioning" }, { agentId: "m-pnt" }],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      problem: true,
      judgement: true,
      type: true,
      createdAt: true,
    },
  });

  const flaggedAt = new Date().toISOString();
  const incoming: ReviewQueueItem[] = related
    .filter((d) => isPositioningSensitiveType(d.type))
    .map((d) => ({
      decisionId: d.id,
      problem: d.problem,
      judgement: d.judgement,
      type: d.type,
      reason: buildReviewReason({
        previousOneLiner: args.previousOneLiner,
        newOneLiner: args.newOneLiner,
        decisionType: d.type,
      }),
      flaggedAt,
      status: "pending" as const,
      positioningDecisionId: args.positioningDecisionId,
      previousOneLiner: args.previousOneLiner,
      newOneLiner: args.newOneLiner,
    }));

  // Soft-tag on decision.outcome.review without wiping user feedback
  for (const item of incoming.slice(0, 15)) {
    try {
      const row = await prisma.decision.findUnique({
        where: { id: item.decisionId },
        select: { outcome: true },
      });
      let outcome: Record<string, unknown> = {};
      if (row?.outcome) {
        try {
          const parsed = JSON.parse(row.outcome) as unknown;
          if (parsed && typeof parsed === "object") {
            outcome = parsed as Record<string, unknown>;
          }
        } catch {
          outcome = {};
        }
      }
      outcome.review = {
        needsReReview: true,
        status: "pending",
        reason: item.reason,
        flaggedAt,
        positioningDecisionId: args.positioningDecisionId,
        previousOneLiner: args.previousOneLiner,
        newOneLiner: args.newOneLiner,
      };
      await prisma.decision.update({
        where: { id: item.decisionId },
        data: { outcome: JSON.stringify(outcome) },
      });
    } catch {
      // non-blocking
    }
  }

  return mergeReviewQueue(args.existingQueue, incoming, 30);
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatStepDecision(stepName: string, d: MKDecision): string {
  return (
    `**判断**: ${d.judgement}\n` +
    `- 观察: ${truncate(d.observation, 160)}\n` +
    `- 策略: ${truncate(d.strategy, 160)}\n` +
    `- 信心: ${Math.round(d.confidence * 100)}%\n`
  );
}

function formatFinalDecision(d: MKDecision): string {
  const s = readStructured(d) || {};
  const bp = (s.brandPositioning || {}) as Record<string, unknown>;
  const fallbackBrandName =
    typeof s.project === "string" && s.project.trim() ? s.project.trim() : "待补";
  const nextSteps = (s.nextSteps || []) as Array<{
    step?: string;
    priority?: string;
    timeline?: string;
  }>;
  const risks = (s.risks || []) as Array<{
    risk?: string;
    level?: string;
    mitigation?: string;
  }>;

  const lines = [
    `\n---\n`,
    `## ✅ 最终定位决策\n`,
    `**一句话结论**: ${d.judgement}\n`,
    `**问题**: ${d.problem}`,
    `**观察**: ${d.observation}`,
    `**诊断**: ${d.diagnosis}`,
    `**策略**: ${d.strategy}`,
    `**行动**: ${d.action}`,
    `**信心**: ${Math.round(d.confidence * 100)}%`,
    `**推荐等级**: ${String(s.decision_recommend || "primary")}`,
  ];

  if (bp.brandName || bp.mentalPosition || bp.category) {
    lines.push(
      `\n### 品牌定位卡`,
      `- 品牌名: ${String(bp.brandName || fallbackBrandName)}`,
      `- 心智位置: ${String(bp.mentalPosition || d.judgement)}`,
      `- 品类: ${String(bp.category || "-")}`,
      `- 客群: ${String(bp.targetCustomers || "-")}`,
      `- 价格带: ${String(bp.priceRange || "-")}`,
      `- 差异化: ${String(bp.differentiation || "-")}`,
      `- 调性: ${String(bp.brandTonality || "-")}`,
    );
  }

  if (risks.length) {
    lines.push(`\n### 主要风险`);
    for (const r of risks.slice(0, 5)) {
      lines.push(
        `- [${r.level || "medium"}] ${r.risk || ""}${r.mitigation ? ` → ${r.mitigation}` : ""}`,
      );
    }
  }

  if (nextSteps.length) {
    lines.push(`\n### 下一步`);
    for (const n of nextSteps.slice(0, 5)) {
      lines.push(
        `- ${n.step || ""}${n.timeline ? `（${n.timeline}）` : ""}${n.priority ? ` · ${n.priority}` : ""}`,
      );
    }
  }

  lines.push(
    `\n> 本决策已写入决策档案与项目记忆，可在「Decisions / Report」复盘。\n`,
  );

  return lines.join("\n") + "\n";
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

/**
 * 保存用户对定位决策的反馈
 * 写入 memory LEARNING 层，供下一次定位时注入
 */
export async function savePositioningFeedback(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    decisionId: string;
    helpful: boolean;
    comment?: string;
    projectId: string;
  },
): Promise<void> {
  const decision = await prisma.decision.findFirst({
    where: {
      id: args.decisionId,
      ownerId: args.ownerId,
      projectId: args.projectId,
    },
    select: { id: true },
  });
  if (!decision) {
    throw new Error("决策不存在或无权限");
  }

  await saveMemory(prisma, args.ownerId, {
    key: `feedback_m-pnt_${args.decisionId}`,
    content: JSON.stringify({
      type: args.helpful ? "positive_feedback" : "negative_feedback",
      comment: args.comment || "",
      decisionId: args.decisionId,
      projectId: args.projectId,
      at: new Date().toISOString(),
    }),
    type: "LEARNING",
    source: "feedback",
    importance: 90,
    projectId: args.projectId,
  });
}

/**
 * 读取最近 10 条定位反馈，注入到 MKContext.knowledge 中
 * 使 LLM 知道过去哪里出过偏差
 */
async function injectFeedbackMemory(
  prisma: PrismaClient,
  ctx: MKContext,
  userId: string,
  projectId?: string,
): Promise<MKContext> {
  try {
    const owner = await prisma.owner.findUnique({ where: { userId } });
    if (!owner) return ctx;

    const feedbackMemories = await prisma.memory.findMany({
      where: {
        ownerId: owner.id,
        key: { startsWith: "feedback_m-pnt_" },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (feedbackMemories.length === 0) return ctx;

    const feedbackRules = feedbackMemories.map((m) => {
      let content = m.content;
      try {
        const parsed = JSON.parse(m.content) as Record<string, unknown>;
        const type = parsed.type === "positive_feedback" ? "正面反馈" : "负面反馈";
        const comment = (parsed.comment as string) || "";
        content = `【历史反馈·${type}】${comment}`;
      } catch {
        content = `【历史反馈】${m.content}`;
      }
      return {
        id: m.key,
        title: `定位反馈 (${new Date(m.createdAt).toLocaleDateString("zh-CN")})`,
        content,
      };
    });

    return {
      ...ctx,
      knowledge: {
        ...ctx.knowledge,
        rules: [...feedbackRules, ...ctx.knowledge.rules].slice(0, 40),
      },
    };
  } catch {
    return ctx;
  }
}

/** 注入历史定位决策记忆，供后续步骤续写/对比 */
async function injectPositioningHistoryMemory(
  prisma: PrismaClient,
  ctx: MKContext,
  userId: string,
  projectId: string,
): Promise<MKContext> {
  try {
    const owner = await prisma.owner.findUnique({ where: { userId } });
    if (!owner) return ctx;

    const history = await prisma.memory.findMany({
      where: {
        ownerId: owner.id,
        projectId,
        OR: [
          { key: { startsWith: "m-pnt_positioning_" } },
          { key: { startsWith: "m-pnt_" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (history.length === 0) return ctx;

    const historyRules = history.map((m) => ({
      id: m.key,
      title: `历史定位记忆 (${new Date(m.createdAt).toLocaleDateString("zh-CN")})`,
      content: m.content.slice(0, 800),
    }));

    return {
      ...ctx,
      knowledge: {
        ...ctx.knowledge,
        rules: [...historyRules, ...(ctx.knowledge?.rules || [])].slice(0, 40),
      },
      memories: [
        ...history.map((m) => ({
          type: (["OWNER", "PROJECT", "DECISION", "LEARNING"].includes(m.type)
            ? m.type
            : "PROJECT") as "OWNER" | "PROJECT" | "DECISION" | "LEARNING",
          key: m.key,
          content: m.content.slice(0, 500),
          importance: Math.min(1, (m.importance || 50) / 100),
          source: m.source || "history",
          updatedAt: m.updatedAt || m.createdAt,
        })),
        ...(ctx.memories || []),
      ].slice(0, 20),
    };
  } catch {
    return ctx;
  }
}

// ─── Knowledge inject ────────────────────────────────────────────────────────

function injectMPntKnowledge(ctx: MKContext, message = ""): MKContext {
  const extraRules = mPntKnowledgeSeeds
    .filter((k) => k.type === "RULE" || k.type === "EXPERIENCE" || k.type === "FACT")
    .map((k) => ({
      id: k.id,
      title: k.title,
      content:
        typeof k.content === "object"
          ? JSON.stringify(k.content)
          : String(k.content),
    }));

  const extraModels = mPntKnowledgeSeeds
    .filter((k) => k.type === "MODEL")
    .map((k) => ({
      id: k.id,
      name: k.title,
      formula:
        typeof k.content === "object"
          ? JSON.stringify(k.content)
          : String(k.content),
    }));

  const query = [message, ctx.project?.category, ctx.project?.city, ctx.project?.name]
    .filter(Boolean)
    .join(" ");

  const searchResults = query
    ? searchPositioningKnowledge(query, {
        category: ctx.project?.category ?? undefined,
        topK: 8,
      })
    : [];

  const dynamicRules = searchResults.map((r) => ({
    id: r.card.id,
    title: r.card.title,
    content: r.card.summary || String(r.card.content?.answer ?? ""),
  }));

  const matchedRules = matchPositioningRules({
    category: ctx.project?.category,
    city: ctx.project?.city,
    stage: ctx.project?.stage,
    message,
  }).slice(0, 8).map((rule) => ({
    id: rule.id,
    title: rule.scenario || rule.id,
    content: rule.recommendation || rule.description || rule.judgement,
  }));

  const wisdom = query
    ? queryPositioningWisdom(ctx.project?.category || message.slice(0, 20) || "定位")
        .slice(0, 5)
        .map((exp) => ({
          id: exp.id,
          title: exp.topic,
          content: exp.wisdom,
        }))
    : [];

  const dynamicCases = findPositioningCases({
    category: ctx.project?.category,
    city: ctx.project?.city,
    scenario: "品牌定位",
  })
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      outcome:
        c.lessons?.join("；") ||
        `${c.outcome?.status ?? "neutral"}${c.outcome?.duration ? ` · ${c.outcome.duration}` : ""}`,
    }));

  return {
    ...ctx,
    knowledge: {
      rules: [
        ...dynamicRules,
        ...matchedRules,
        ...wisdom,
        ...(ctx.knowledge?.rules || []),
        ...extraRules,
      ].slice(0, 40),
      cases: [...dynamicCases, ...(ctx.knowledge?.cases || [])].slice(0, 10),
      models: [...(ctx.knowledge?.models || []), ...extraModels].slice(0, 20),
    },
  };
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

function resolveProvider(): "deepseek" | "openai" | "none" {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

function resolveModel(provider: "deepseek" | "openai" | "none"): string {
  if (provider === "deepseek") return "deepseek-chat";
  if (provider === "openai") return "gpt-4o-mini";
  return "heuristic";
}

function tryCreateLlmAdapter(): LLMAdapter | null {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const apiKey = deepseekKey || openaiKey;
  if (!apiKey) return null;
  try {
    return createLLMAdapter({
      provider: deepseekKey ? "deepseek" : "openai",
      apiKey,
      baseURL: deepseekKey ? "https://api.deepseek.com" : undefined,
    }) as unknown as LLMAdapter;
  } catch {
    return null;
  }
}
