import type { StreamChunk, MKContext } from "@mealkey/agent-sdk";
import type { PrismaClient } from "@/generated/prisma";
import { createLogger } from "@/lib/logger";
import { buildMKContext } from "./chief-agent.factory";
import {
  createAgentRun,
  createDecision,
  saveMemory,
  updateAgentRun,
} from "./agent-os.service";
import {
  buildEquitySnapshot,
  snapshotFromMEDBlob,
  type EquityCommitteeOpinion,
  type EquityFounder,
  type EquityPageOutput,
  type EquityScenario,
  type EquitySnapshot,
  type EquitySimulationInputs,
} from "@/lib/equity";
import { withFounderEquityContext } from "@/lib/founder-decision-snapshot";
import { polishAdvisorJudgement } from "./llm-polish";
import { injectDomainKnowledge, withKnowledgeMessage } from "@/server/knowledge/inject-domain";

const log = createLogger("m-ed");

export const mEdManifest = {
  id: "m-ed",
  name: "股权决策引擎",
  version: "1.0.0",
  description: "围绕控制权、融资安全和激励空间，生成股权结构主判断。",
  capabilities: [
    "equity_design",
    "funding_simulation",
    "control_assessment",
    "incentive_design",
  ],
};

export type MEdMetaChunk = {
  type: "meta";
  runtime: "m-ed";
  provider: "deepseek" | "openai" | "none" | "heuristic";
  model: string;
  fallback: boolean;
  assetCount: number;
  conversationId: string;
  agentId: "m-ed";
  agentName: string;
};

export type MEdResultChunk = {
  type: "equity_result";
  data: EquitySnapshot;
  previous?: EquitySnapshot | null;
};

export interface MEdServiceOptions {
  projectId: string;
  userId: string;
  message: string;
  missionId?: string;
  conversationId?: string;
  assetIds?: string[];
  force?: boolean;
  assetContextBlock?: string | null;
}

/**
 * M-ED 意图识别 — D4 股权设计维度
 *
 * 检测用户是否在询问"股权怎么分"，包括：
 * - 股权结构（股权/股份/控制权）
 * - 合伙设计（合伙/合伙人）
 * - 融资设计（融资/稀释/投资人）
 * - 激励机制（期权/激励池）
 *
 * 与 D2（M-PNT 定位）、D5（ChiefAgent 通用判断）的区别：
 * - D4 有明确的股权/合伙关键词 → M-ED
 * - 其他非关键词的经营问题 → ChiefAgent
 */
export function isMEdProductIntent(message: string, force?: boolean): boolean {
  if (force) return true;
  return /股权|股份|合伙|合伙人|融资|稀释|控制权|期权|激励池|投资人/i.test(
    message,
  );
}

export async function* streamMEdProduct(
  prisma: PrismaClient,
  options: MEdServiceOptions,
  conversation: { id: string },
  ownerId: string,
): AsyncGenerator<StreamChunk | MEdMetaChunk | MEdResultChunk> {
  const { projectId, userId, message, assetIds = [] } = options;
  const startedAt = Date.now();
  const enrichedMessage = options.assetContextBlock
    ? `${message}\n\n补充资料：\n${options.assetContextBlock}`
    : message;

  const agentRun = await createAgentRun(prisma, {
    agentId: "m-ed",
    userId,
    projectId,
    missionId: options.missionId,
    conversationId: conversation.id,
    input: { message, assetIds, agent: "m-ed" },
  });

  try {
    let mkContext = await buildMKContext(prisma, userId, projectId);
    mkContext = injectDomainKnowledge(mkContext, "equity", enrichedMessage);
    const analysisMessage = withKnowledgeMessage(
      message,
      mkContext,
      options.assetContextBlock,
    );
    const generated = buildEquityWorkspace(mkContext, analysisMessage);
    const polished = await polishAdvisorJudgement({
      domain: "equity",
      message: analysisMessage,
      draft: {
        judgement: generated.judgement,
        strategy: generated.strategy,
        action: generated.action,
      },
    });
    const pageOutput: EquityPageOutput = {
      ...generated.pageOutput,
      finalDecision: {
        ...generated.pageOutput.finalDecision,
        judgement: polished.fields.judgement,
        actions: [
          polished.fields.action,
          ...generated.pageOutput.finalDecision.actions.slice(1),
        ],
      },
    };
    const provider = polished.polished ? polished.provider : "heuristic";
    const model = polished.polished ? polished.model : "rule-based";

    yield {
      type: "meta",
      runtime: "m-ed",
      provider,
      model,
      fallback: !polished.polished,
      assetCount: assetIds.length,
      conversationId: conversation.id,
      agentId: "m-ed",
      agentName: mEdManifest.name,
    };

    const snapshot = buildEquitySnapshot({
      problem: generated.problem,
      observation: generated.observation,
      diagnosis: generated.diagnosis,
      judgement: polished.fields.judgement,
      strategy: polished.fields.strategy,
      action: polished.fields.action,
      confidence: generated.confidence,
      structured: { pageOutput },
      source: "m-ed",
    });

    yield {
      type: "text",
      content:
        "## Equity Decision Center\n\n系统已基于当前项目、阶段、团队结构和股权常见风险，开始生成本轮股权健康扫描。\n",
    };
    yield {
      type: "tool_start",
      toolName: "equity_health_scan",
    } as StreamChunk;
    yield {
      type: "text",
      content: formatHealthSection(snapshot.pageOutput),
    };
    yield {
      type: "tool_result",
      toolName: "equity_health_scan",
      result: {
        success: true,
        data: {
          score: snapshot.pageOutput.health.score,
          biggestRisk: snapshot.pageOutput.health.biggestRisk,
        },
      },
    } as StreamChunk;

    yield {
      type: "tool_start",
      toolName: "equity_scenarios",
    } as StreamChunk;
    yield {
      type: "text",
      content: formatScenarioSection(snapshot.pageOutput),
    };
    yield {
      type: "tool_result",
      toolName: "equity_scenarios",
      result: {
        success: true,
        data: {
          scenarios: snapshot.pageOutput.scenarios.length,
          primary:
            snapshot.pageOutput.scenarios.find(
              (item) => item.recommendation === "primary",
            )?.title || snapshot.pageOutput.scenarios[0]?.title,
        },
      },
    } as StreamChunk;

    yield {
      type: "tool_start",
      toolName: "equity_committee",
    } as StreamChunk;
    yield {
      type: "text",
      content: formatCommitteeSection(snapshot.pageOutput),
    };

    yield {
      type: "text",
      content: formatFinalSection(snapshot.pageOutput, generated.confidence),
    };

    const persisted = await persistMEdResult(prisma, {
      ownerId,
      projectId,
      userId,
      agentRunId: agentRun.id,
      snapshot,
      pageOutput,
      message,
    });

    const finalSnapshot = {
      ...snapshot,
      decisionId: persisted.decisionId,
    };

    await updateAgentRun(prisma, agentRun.id, {
      status: "success",
      duration: Date.now() - startedAt,
      decisionId: persisted.decisionId,
      output: {
        summary: finalSnapshot.oneLiner,
        snapshot: finalSnapshot,
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: [
          "## Equity Decision Center",
          finalSnapshot.oneLiner,
          `当前最大风险：${finalSnapshot.pageOutput.health.biggestRisk}`,
          `下一步：${finalSnapshot.pageOutput.finalDecision.actions[0] || finalSnapshot.action}`,
        ].join("\n\n"),
        metadata: JSON.stringify({
          agentRunId: agentRun.id,
          decisionId: persisted.decisionId,
          runtime: "m-ed",
          provider,
          model,
          snapshot: finalSnapshot,
          previous: persisted.previous,
        }),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        agentType: "m-ed",
        messageCount: { increment: 2 },
        summary: finalSnapshot.oneLiner.slice(0, 200),
      },
    });

    await prisma.report.create({
      data: {
        projectId,
        type: "equity",
        title: generated.problem,
        summary: finalSnapshot.oneLiner,
        content: JSON.stringify({
          snapshot: finalSnapshot,
          pageOutput,
        }),
        status: "published",
      },
    });

    yield {
      type: "equity_result",
      data: finalSnapshot,
      previous: persisted.previous,
    };
    yield { type: "done" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "M-ED 执行失败";
    await updateAgentRun(prisma, agentRun.id, {
      status: "failed",
      duration: Date.now() - startedAt,
      output: { error: message },
    }).catch(() => undefined);
    yield { type: "error", message };
  }
}

async function persistMEdResult(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    projectId: string;
    userId: string;
    agentRunId: string;
    snapshot: EquitySnapshot;
    pageOutput: EquityPageOutput;
    message: string;
  },
): Promise<{ decisionId: string; previous: EquitySnapshot | null }> {
  const evidence = [
    {
      source: "structured",
      content: JSON.stringify({
        pageOutput: args.pageOutput,
      }),
      relevance: 1,
    },
  ];

  const record = await createDecision(prisma, {
    ownerId: args.ownerId,
    projectId: args.projectId,
    agentRunId: args.agentRunId,
    agentId: "m-ed",
    type: "equity",
    problem: args.snapshot.problem,
    observation: args.snapshot.observation,
    diagnosis: args.snapshot.diagnosis,
    judgement: args.snapshot.oneLiner,
    strategy: args.snapshot.strategy,
    action: args.snapshot.action,
    confidence: args.snapshot.confidence,
    evidence,
  });

  await saveMemory(prisma, args.ownerId, {
    key: `m-ed_equity_${args.projectId}`,
    content: JSON.stringify({
      summary: args.snapshot.oneLiner,
      stage: args.snapshot.stage,
      health: args.pageOutput.health,
      finalDecision: args.pageOutput.finalDecision,
      sourceMessage: args.message.slice(0, 200),
      at: new Date().toISOString(),
    }),
    type: "DECISION",
    source: "m-ed",
    importance: 88,
    projectId: args.projectId,
  });

  await saveMemory(prisma, args.ownerId, {
    key: `project_equity_latest_${args.projectId}`,
    content: args.snapshot.oneLiner,
    type: "PROJECT",
    source: "m-ed",
    importance: 85,
    projectId: args.projectId,
  });

  const previous = await syncProjectEquity(prisma, {
    ownerId: args.ownerId,
    projectId: args.projectId,
    decisionId: record.id,
    snapshot: args.snapshot,
    pageOutput: args.pageOutput,
  });

  return { decisionId: record.id, previous };
}

async function syncProjectEquity(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    projectId: string;
    decisionId: string;
    snapshot: EquitySnapshot;
    pageOutput: EquityPageOutput;
  },
): Promise<EquitySnapshot | null> {
  const project = await prisma.project.findFirst({
    where: { id: args.projectId, ownerId: args.ownerId },
  });
  if (!project) return null;

  const { updateProjectProfile } = await import("@/server/services/project-profile");
  let previous: EquitySnapshot | null = null;

  await updateProjectProfile(
    args.projectId,
    (profile) => {
      const previousBlob = (profile.mEd || null) as Record<string, unknown> | null;
      previous = snapshotFromMEDBlob(previousBlob, "profile");

      const mEd = {
        decisionId: args.decisionId,
        updatedAt: new Date().toISOString(),
        oneLiner: args.snapshot.oneLiner,
        stage: args.snapshot.stage,
        problem: args.snapshot.problem,
        observation: args.snapshot.observation,
        diagnosis: args.snapshot.diagnosis,
        strategy: args.snapshot.strategy,
        action: args.snapshot.action,
        confidence: args.snapshot.confidence,
        pageOutput: args.pageOutput,
      };

      const historyRaw = Array.isArray(profile.mEdHistory)
        ? (profile.mEdHistory as Record<string, unknown>[])
        : [];
      const mEdHistory = previousBlob
        ? [previousBlob, ...historyRaw].slice(0, 5)
        : historyRaw.slice(0, 5);

      return withFounderEquityContext(
        {
          ...profile,
          equityStage: args.pageOutput.stage,
          equityHealthScore: args.pageOutput.health.score,
          equityBiggestRisk: args.pageOutput.health.biggestRisk,
          mEd,
          mEdPrevious: previousBlob ?? profile.mEdPrevious ?? null,
          mEdHistory,
        },
        {
          decisionId: args.decisionId,
          stage: args.pageOutput.stage,
          healthScore: args.pageOutput.health.score,
          biggestRisk: args.pageOutput.health.biggestRisk,
          finalJudgement: args.pageOutput.finalDecision.judgement,
          handoffPayload: {
            stage: args.pageOutput.stage,
            healthScore: args.pageOutput.health.score,
            biggestRisk: args.pageOutput.health.biggestRisk,
          },
        },
        args.projectId,
      );
    },
    { ownerId: args.ownerId, prisma },
  );

  return previous;
}

export async function saveEquityFeedback(
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
    key: `feedback_m-ed_${args.decisionId}`,
    content: JSON.stringify({
      type: args.helpful ? "positive_feedback" : "negative_feedback",
      comment: args.comment || "",
      decisionId: args.decisionId,
      projectId: args.projectId,
      at: new Date().toISOString(),
    }),
    type: "LEARNING",
    source: "feedback",
    importance: 88,
    projectId: args.projectId,
  });
}

function buildEquityWorkspace(
  mkContext: MKContext,
  message: string,
): {
  problem: string;
  observation: string;
  diagnosis: string;
  judgement: string;
  strategy: string;
  action: string;
  confidence: number;
  pageOutput: EquityPageOutput;
} {
  const project = mkContext.project;
  const owner = mkContext.owner;
  const profile = (project.profile || {}) as Record<string, unknown>;
  const stage = mapStage(project.stage);
  const simulationInputs = extractSimulationInputs(message, profile);
  const founders = deriveFounders(owner.name || project.name, profile);
  const optionPool = deriveOptionPool(profile, stage, simulationInputs);
  const investors = deriveInvestors(profile, stage, simulationInputs);
  const capTable = buildCapTable(founders, optionPool, investors);
  const health = assessHealth(founders, optionPool, investors, stage, simulationInputs);
  const scenarios = buildScenarios(
    founders,
    optionPool,
    investors,
    stage,
    message,
    simulationInputs,
  );
  const committee = buildCommittee(stage, health, scenarios);
  const primary =
    scenarios.find((item) => item.recommendation === "primary") || scenarios[0];

  const topic = /融资|稀释|投资人/i.test(message)
    ? "融资前股权结构重排"
    : /合伙|合伙人/i.test(message)
      ? "合伙股权边界设计"
      : "股权健康扫描与结构优化";

  const finalDecision = {
    judgement:
      primary?.title
        ? `建议当前采用「${primary.title}」作为股权主方案。`
        : "建议当前优先保障创始控制权，再补激励空间。",
    reasoning: [
      `当前项目处于${stage}，股权设计不能只看今天，要兼顾后续融资和组织扩张。`,
      `控制权评分 ${health.control} / 100，说明创始主导权${health.control >= 75 ? "仍可稳住" : "存在被稀释风险"}。`,
      `激励空间 ${health.incentiveRoom} / 100，说明${health.incentiveRoom >= 70 ? "有能力预留关键岗位激励" : "激励池仍偏紧"}。`,
    ],
    risks: [
      health.biggestRisk,
      "如果角色边界和归属机制没有写清楚，后续分歧会从认知冲突升级成权益冲突。",
      "如果先引入外部投资再补内部协议，融资效率会被治理问题拖慢。",
    ],
    actions: [
      "先把创始人、核心合伙人和未来激励对象的角色边界写清楚。",
      "把预留激励池、归属机制和退出条款纳入下一轮股东协议。",
      "进入经营会议，模拟一次下一轮融资或新增合伙人的稀释后果。",
    ],
  };

  const judgement = finalDecision.judgement;
  const strategy =
    primary?.summary || "优先稳住控制权，再设计激励与融资缓冲。";
  const action = finalDecision.actions[0];
  const observation = `当前处于${stage}，创始团队 ${founders.length} 人，股权健康度 ${health.score}，最大风险是${health.biggestRisk}`;
  const diagnosis = `当前股权结构的主要任务不是把股份分完，而是先把控制权、激励空间和下一轮融资承压能力排顺序。`;

  const pageOutput: EquityPageOutput = {
    topic,
    stage,
    health,
    profile: {
      founders,
      capTable,
      optionPool,
      investors,
    },
    simulationInputs,
    scenarios,
    committee,
    finalDecision,
  };

  return {
    problem: "这家餐饮项目的股权应该如何设计？",
    observation,
    diagnosis,
    judgement,
    strategy,
    action,
    confidence: 0.76,
    pageOutput,
  };
}

export async function previewMEdSnapshot(input: {
  message: string;
  companyContext: {
    companyId: string;
    basicInfo: {
      name: string;
      industry: string;
      city: string;
      stage: string;
    };
    business?: {
      scale?: string;
    };
    goals: string[];
  };
  assetContextBlock?: string;
}): Promise<EquitySnapshot> {
  // 优先真实 M-ED FastAPI 引擎
  try {
    const {
      checkMEdHealth,
      medEquity,
      inferMEdAction,
      buildDefaultEquityPayload,
    } = await import("./m-ed-client");
    const healthy = await checkMEdHealth();
    if (healthy) {
      const action = inferMEdAction(input.message);
      const payload =
        action === "design_equity"
          ? buildDefaultEquityPayload({
              projectName: input.companyContext.basicInfo.name,
              stage: input.companyContext.basicInfo.stage,
              message: input.message,
            })
          : {
              ...buildDefaultEquityPayload({
                projectName: input.companyContext.basicInfo.name,
                stage: input.companyContext.basicInfo.stage,
                message: input.message,
              }),
              context_note: input.message,
              user_question: input.message,
            };
      const response = await medEquity(
        {
          user_id: input.companyContext.companyId || "founder",
          action,
          payload,
        },
        { timeoutMs: 20000 },
      );
      const data = (response.data || {}) as Record<string, unknown>;
      const summary =
        typeof data.summary === "string"
          ? data.summary
          : typeof data.recommendation === "string"
            ? data.recommendation
            : typeof data.message === "string"
              ? data.message
              : JSON.stringify(data).slice(0, 180);
      const risksRaw = data.risks || data.warnings || data.concerns;
      const risks = Array.isArray(risksRaw)
        ? risksRaw.map((r) => String(r)).slice(0, 4)
        : ["控制权与稀释边界需书面确认"];
      const actionsRaw = data.actions || data.next_steps || data.suggestions;
      const actions = Array.isArray(actionsRaw)
        ? actionsRaw.map((a) => String(a)).slice(0, 4)
        : ["锁定创始人控制权底线", "预留期权池", "明确 Vesting"];
      const judgement = `【真实引擎】${summary}`.slice(0, 160);
      const strategy = actions[0] || "先锁控制权与融资节奏，再谈扩张投入";
      const actionText = actions[1] || risks[0] || "完成股权协议关键条款确认";
      const allocations = Array.isArray(data.allocations)
        ? (data.allocations as Array<Record<string, unknown>>)
        : Array.isArray((data.scheme as Record<string, unknown> | undefined)?.allocations)
          ? ((data.scheme as Record<string, unknown>).allocations as Array<Record<string, unknown>>)
          : [];
      const founders =
        allocations.length > 0
          ? allocations.slice(0, 4).map((item, index) => ({
              name: String(item.member || item.name || `成员${index + 1}`),
              role: String(item.role || "股东"),
              equity: Number(item.equity_percent ?? item.equity ?? 0),
            }))
          : [
              { name: "创始人", role: "创始人", equity: 60 },
              { name: "核心合伙人", role: "联合创始人", equity: 25 },
            ];
      const pageOutput: EquityPageOutput = {
        topic: input.message,
        stage: input.companyContext.basicInfo.stage,
        health: {
          score: 72,
          control: 70,
          fundingSafety: 65,
          incentiveRoom: 60,
          biggestRisk: risks[0] || "稀释与控制权冲突",
        },
        profile: {
          founders,
          capTable: founders.map((f) => ({ label: f.name, equity: f.equity })),
          optionPool: 10,
        },
        scenarios: [
          {
            id: "baseline",
            title: "当前建议方案",
            summary: judgement,
            highlights: actions.slice(0, 3),
            risks: risks.slice(0, 3),
            recommendation: "primary",
          },
        ],
        finalDecision: {
          judgement,
          reasoning: [strategy, summary].filter(Boolean),
          risks,
          actions,
        },
      };

      return buildEquitySnapshot({
        problem: input.message,
        observation: `M-ED action=${action}`,
        diagnosis: risks[0] || "股权结构需与融资节奏对齐",
        judgement,
        strategy,
        action: actionText,
        confidence: 0.78,
        structured: { pageOutput, engineRaw: data, provider: "external" },
        source: "m-ed",
      });
    }
  } catch (error) {
    log.warn("[Founder-MED] 真实引擎不可用，降级启发式", { error: (error as Error)?.message });
  }

  const baseContext = {
    owner: {
      id: "founder-layer",
      name: input.companyContext.basicInfo.name,
      email: null,
      experience: input.companyContext.business?.scale || "3年",
      strengths: [],
      weaknesses: [],
      overallScore: 60,
      riskTolerance: "medium",
      investmentStyle: "moderate",
    },
    project: {
      id: input.companyContext.companyId,
      name: input.companyContext.basicInfo.name,
      stage: input.companyContext.basicInfo.stage,
      category: input.companyContext.basicInfo.industry,
      target: input.companyContext.goals.join("；") || input.message,
      city: input.companyContext.basicInfo.city,
      district: null,
      budget: null,
      profile: null,
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

  const mkContext = injectDomainKnowledge(baseContext, "equity", input.message);
  const analysisMessage = withKnowledgeMessage(
    input.message,
    mkContext,
    input.assetContextBlock,
  );
  const generated = buildEquityWorkspace(mkContext, analysisMessage);
  const polished = await polishAdvisorJudgement({
    domain: "equity",
    message: analysisMessage,
    draft: {
      judgement: generated.judgement,
      strategy: generated.strategy,
      action: generated.action,
    },
  });
  const pageOutput: EquityPageOutput = {
    ...generated.pageOutput,
    finalDecision: {
      ...generated.pageOutput.finalDecision,
      judgement: polished.fields.judgement,
      actions: [
        polished.fields.action,
        ...generated.pageOutput.finalDecision.actions.slice(1),
      ],
    },
  };

  return buildEquitySnapshot({
    problem: generated.problem,
    observation: generated.observation,
    diagnosis: generated.diagnosis,
    judgement: `【启发式】${polished.fields.judgement}`,
    strategy: polished.fields.strategy,
    action: polished.fields.action,
    confidence: generated.confidence,
    structured: { pageOutput, provider: "heuristic" },
    source: "m-ed",
  });
}

function deriveFounders(
  fallbackName: string,
  profile: Record<string, unknown>,
): EquityFounder[] {
  const rawCandidates = [
    profile.founders,
    profile.teamMembers,
    profile.team_members,
  ];
  for (const value of rawCandidates) {
    if (!Array.isArray(value)) continue;
    const founders = value.reduce<EquityFounder[]>((acc, item, index) => {
      if (!item || typeof item !== "object") return acc;
      const raw = item as Record<string, unknown>;
      acc.push({
        name:
          (typeof raw.name === "string" && raw.name.trim()) ||
          `创始成员 ${index + 1}`,
        role:
          (typeof raw.role === "string" && raw.role.trim()) ||
          "创始人",
        equity:
          typeof raw.equity === "number"
            ? Math.max(0, Math.min(100, raw.equity))
            : typeof raw.share === "number"
              ? Math.max(0, Math.min(100, raw.share))
              : 0,
        responsibility:
          typeof raw.responsibility === "string"
            ? raw.responsibility
            : undefined,
      });
      return acc;
    }, []);
    if (founders.length > 0) return founders;
  }

  return [
    {
      name: fallbackName || "创始人",
      role: "创始人 / CEO",
      equity: 100,
      responsibility: "品牌方向与项目总负责",
    },
  ];
}

function deriveOptionPool(
  profile: Record<string, unknown>,
  stage: string,
  simulationInputs?: EquitySimulationInputs,
): number {
  if (
    simulationInputs?.optionPoolTarget !== undefined &&
    Number.isFinite(simulationInputs.optionPoolTarget)
  ) {
    return Math.max(0, Math.min(30, Math.round(simulationInputs.optionPoolTarget)));
  }
  const direct = profile.optionPool ?? profile.option_pool;
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return Math.max(0, Math.min(30, Math.round(direct)));
  }
  if (typeof direct === "string" && Number.isFinite(Number(direct))) {
    return Math.max(0, Math.min(30, Math.round(Number(direct))));
  }
  if (stage === "复制扩张期") return 12;
  if (stage === "单店验证期") return 10;
  return 8;
}

function deriveInvestors(
  profile: Record<string, unknown>,
  stage: string,
  simulationInputs?: EquitySimulationInputs,
) {
  const raw = profile.investors;
  if (Array.isArray(raw)) {
    return raw.reduce<Array<{ name: string; equity: number }>>((acc, item) => {
      if (!item || typeof item !== "object") return acc;
      const record = item as Record<string, unknown>;
      const name =
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : null;
      const equity =
        typeof record.equity === "number"
          ? record.equity
          : typeof record.share === "number"
            ? record.share
            : null;
      if (!name || equity === null) return acc;
      acc.push({ name, equity: Math.max(0, Math.min(100, equity)) });
      return acc;
    }, []);
  }

  if (
    simulationInputs?.fundingAmountWan &&
    simulationInputs.fundingAmountWan >= 300
  ) {
    const impliedEquity = Math.max(
      8,
      Math.min(28, Math.round(simulationInputs.fundingAmountWan / 80)),
    );
    return [{ name: "本轮融资预留", equity: impliedEquity }];
  }

  if (stage === "复制扩张期") {
    return [{ name: "外部投资预留", equity: 12 }];
  }
  return [];
}

function buildCapTable(
  founders: EquityFounder[],
  optionPool: number,
  investors: Array<{ name: string; equity: number }>,
) {
  const founderItems = founders.map((item) => ({
    label: item.name,
    equity: item.equity,
  }));
  const optionItem =
    optionPool > 0 ? [{ label: "激励池", equity: optionPool }] : [];
  const investorItems = investors.map((item) => ({
    label: item.name,
    equity: item.equity,
  }));
  return [...founderItems, ...optionItem, ...investorItems];
}

function assessHealth(
  founders: EquityFounder[],
  optionPool: number,
  investors: Array<{ name: string; equity: number }>,
  stage: string,
  simulationInputs?: EquitySimulationInputs,
) {
  const topFounder = founders[0]?.equity ?? 0;
  const founderTotal = founders.reduce((sum, item) => sum + item.equity, 0);
  const fundingPressure =
    simulationInputs?.fundingAmountWan && simulationInputs.fundingAmountWan >= 500
      ? 8
      : simulationInputs?.fundingAmountWan && simulationInputs.fundingAmountWan >= 200
        ? 4
        : 0;
  const partnerPressure =
    simulationInputs?.newPartnerCount && simulationInputs.newPartnerCount > 0
      ? simulationInputs.newPartnerCount * 4
      : 0;
  const control =
    (topFounder >= 67 ? 88 : topFounder >= 55 ? 78 : topFounder >= 50 ? 68 : 58) -
    fundingPressure -
    partnerPressure;
  const incentiveRoom =
    (optionPool >= 12 ? 84 : optionPool >= 10 ? 76 : optionPool >= 8 ? 66 : 54) +
    (simulationInputs?.newPartnerCount ? 2 : 0);
  const fundingSafety =
    stage === "复制扩张期"
      ? investors.length > 0
        ? 72
        : 66
      : stage === "单店验证期"
        ? 74
        : 70 + (simulationInputs?.fundingAmountWan ? 2 : 0);

  const score = Math.round((control + incentiveRoom + fundingSafety) / 3);
  const biggestRisk =
    simulationInputs?.fundingAmountWan && control < 75
      ? "本轮融资后创始控制权会明显走弱，必须先锁住核心表决权与保留事项。"
      : simulationInputs?.newPartnerCount && optionPool < 12
        ? "新增合伙人后，激励与归属机制空间不足，容易把组织问题提前转成股权矛盾。"
        : optionPool < 10
      ? "激励池偏紧，未来关键岗位和店长层激励空间不足。"
      : control < 70
        ? "创始控制权边界偏弱，一旦引入融资或新合伙人容易失衡。"
        : founderTotal >= 95 && optionPool <= 8
          ? "当前结构太贴近个人持有，后续组织化会缺少缓冲空间。"
          : "当前结构可用，但融资前必须先补齐协议和归属机制。";

  return {
    score,
    control,
    fundingSafety,
    incentiveRoom,
    biggestRisk,
  };
}

function buildScenarios(
  founders: EquityFounder[],
  optionPool: number,
  investors: Array<{ name: string; equity: number }>,
  stage: string,
  message: string,
  simulationInputs?: EquitySimulationInputs,
): EquityScenario[] {
  const founderShare = founders[0]?.equity ?? 100;
  const wantsFunding =
    /融资|投资人|稀释/i.test(message) ||
    simulationInputs?.scenarioMode === "funding" ||
    Boolean(simulationInputs?.fundingAmountWan);
  const wantsPartner =
    /合伙|合伙人/i.test(message) ||
    simulationInputs?.scenarioMode === "partner" ||
    Boolean(simulationInputs?.newPartnerCount);
  const highOptionPool = optionPool >= 12 || simulationInputs?.scenarioMode === "option_pool";
  const fundingEquityTake = wantsFunding
    ? Math.max(
        12,
        Math.min(
          30,
          Math.round((simulationInputs?.fundingAmountWan || 800) / 80),
        ),
      )
    : 0;
  const partnerDilution = wantsPartner
    ? Math.max(6, (simulationInputs?.newPartnerCount || 1) * 5)
    : 0;

  const primaryTitle =
    stage === "复制扩张期" || wantsFunding
      ? "平衡融资方案"
      : wantsPartner
        ? "合伙边界优先方案"
        : highOptionPool
          ? "激励预留方案"
          : "控制权优先方案";
  const primary: EquityScenario = {
    id: "primary",
    title: primaryTitle,
    summary:
      primaryTitle === "平衡融资方案"
        ? "保留创始人绝对主导权，同时为下一轮融资和核心岗位激励留出缓冲。"
        : primaryTitle === "合伙边界优先方案"
          ? "先按角色和结果责任划清边界，再决定权益释放速度，避免把合伙关系一次性锁死。"
          : primaryTitle === "激励预留方案"
            ? "优先为关键岗位和店长层预留激励池，再决定什么时候实际释放。"
        : "先把创始控制权锁住，再按岗位和阶段逐步释放激励。",
    founderEquityChange:
      primaryTitle === "平衡融资方案"
        ? `${founderShare}% → ${Math.max(52, founderShare - fundingEquityTake)}%`
        : primaryTitle === "合伙边界优先方案"
          ? `${founderShare}% → ${Math.max(60, founderShare - partnerDilution)}%`
        : `${founderShare}% → ${Math.max(67, founderShare - 12)}%`,
    controlScore:
      primaryTitle === "平衡融资方案"
        ? Math.max(70, 90 - fundingEquityTake / 2)
        : primaryTitle === "合伙边界优先方案"
          ? Math.max(72, 88 - partnerDilution / 2)
          : 90,
    dilutionImpact:
      primaryTitle === "平衡融资方案"
        ? fundingEquityTake >= 18
          ? "中高"
          : "中"
        : primaryTitle === "合伙边界优先方案"
          ? "中"
          : "低",
    highlights: [
      "控制权、激励池和融资空间按顺序排好。",
      wantsFunding
        ? `按本轮约 ${simulationInputs?.fundingAmountWan || 800} 万融资规模估算，先保留创始主导权。`
        : "优先保证决策权不被过早打散。",
      "适合在下一轮引入核心岗位或外部资金前先完成内部对齐。",
      "便于后续写入股东协议和归属机制。",
    ],
    risks: [
      "如果团队对阶段性归属没有共识，后续仍可能发生权益争议。",
      "过度保护控制权会压缩短期融资灵活度。",
    ],
    recommendation: "primary",
  };

  const secondary: EquityScenario = {
    id: "secondary",
    title: "激励优先方案",
    summary:
      wantsPartner
        ? "为新增合伙人与关键岗位预留更多权益，组织吸引力更强，但治理复杂度会更快上升。"
        : "更早释放激励池，用更大空间吸引核心岗位，但控制权会被更快稀释。",
    founderEquityChange: `${founderShare}% → ${Math.max(48, founderShare - 22 - partnerDilution)}%`,
    controlScore: Math.max(66, 74 - partnerDilution),
    dilutionImpact: "中高",
    highlights: [
      "适合已经明确需要店长、区域负责人或核心运营搭档的阶段。",
      "组织吸引力更强。",
    ],
    risks: [
      "早期释放过多权益，后续融资和治理会变复杂。",
      "如果角色和归属机制不严谨，会放大内部分歧。",
    ],
    recommendation: "secondary",
  };

  const reject: EquityScenario = {
    id: "reject",
    title: "融资优先方案",
    summary: "把当前问题主要交给融资解决，短期现金缓冲更大，但创始控制和组织稳定性会被提前透支。",
    founderEquityChange: `${founderShare}% → ${Math.max(38, founderShare - Math.max(30, fundingEquityTake + 10))}%`,
    controlScore: Math.max(54, 62 - fundingEquityTake / 2),
    dilutionImpact: "高",
    highlights: [
      "短期可快速补资金与资源。",
    ],
    risks: [
      "如果商业模式和治理结构还没稳住，融资只会放大原有问题。",
      "后续再补股权协议，谈判成本会更高。",
    ],
    recommendation: "reject",
  };

  const scenarios = [primary, secondary, reject];
  if (optionPool >= 12) {
    scenarios[1] = {
      ...secondary,
      summary: "当前已经具备一定激励池基础，可以更谨慎地释放给关键岗位。",
    };
  }
  return scenarios.map((scenario) => ({
    ...scenario,
    capTable: buildScenarioCapTable({
      founders,
      optionPool,
      investors,
      scenarioId: scenario.id,
      fundingEquityTake,
      partnerDilution,
    }),
  }));
}

function extractSimulationInputs(
  message: string,
  profile: Record<string, unknown>,
): EquitySimulationInputs {
  const fundingMatch =
    message.match(/融资(?:金额)?\s*(\d+(?:\.\d+)?)\s*万/i) ||
    message.match(/(\d+(?:\.\d+)?)\s*万(?:融资|资金)/i);
  const optionPoolMatch =
    message.match(/期权池(?:目标)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
    message.match(/激励池(?:目标)?\s*(\d+(?:\.\d+)?)\s*%/i);
  const partnerMatch =
    message.match(/新增(?:合伙人)?\s*(\d+)\s*位/i) ||
    message.match(/(\d+)\s*位(?:合伙人|伙伴)/i);

  const inputs: EquitySimulationInputs = {
    scenarioMode: /融资|投资人|稀释/i.test(message)
      ? "funding"
      : /合伙|合伙人/i.test(message)
        ? "partner"
        : /期权池|激励池/i.test(message)
          ? "option_pool"
          : "baseline",
    fundingAmountWan: fundingMatch ? Number(fundingMatch[1]) : undefined,
    optionPoolTarget: optionPoolMatch ? Number(optionPoolMatch[1]) : undefined,
    newPartnerCount: partnerMatch ? Number(partnerMatch[1]) : undefined,
  };

  if (inputs.optionPoolTarget === undefined) {
    const raw = profile.optionPool ?? profile.option_pool;
    if (typeof raw === "number") inputs.optionPoolTarget = raw;
    if (typeof raw === "string" && Number.isFinite(Number(raw))) {
      inputs.optionPoolTarget = Number(raw);
    }
  }

  return inputs;
}

function buildScenarioCapTable(args: {
  founders: EquityFounder[];
  optionPool: number;
  investors: Array<{ name: string; equity: number }>;
  scenarioId: string;
  fundingEquityTake: number;
  partnerDilution: number;
}) {
  const before = buildCapTable(args.founders, args.optionPool, args.investors);
  const founder = args.founders[0];
  const founderLabel = founder?.name || "创始人";
  const baseFounderShare = founder?.equity ?? 100;
  const basePool = args.optionPool;
  const partnerEquity =
    args.partnerDilution > 0 ? Math.max(6, Math.round(args.partnerDilution)) : 0;
  const fundingEquity =
    args.fundingEquityTake > 0 ? Math.max(10, Math.round(args.fundingEquityTake)) : 0;

  let afterFounder = baseFounderShare;
  let afterPool = basePool;
  let afterInvestor = args.investors.reduce((sum, item) => sum + item.equity, 0);
  let afterPartner = 0;

  if (args.scenarioId === "primary") {
    afterInvestor = fundingEquity;
    afterPool = Math.max(basePool, 10);
    afterPartner = partnerEquity > 0 ? Math.max(4, partnerEquity - 2) : 0;
    afterFounder = Math.max(52, 100 - afterInvestor - afterPool - afterPartner);
  } else if (args.scenarioId === "secondary") {
    afterInvestor = Math.max(fundingEquity, 10);
    afterPool = Math.max(basePool, 14);
    afterPartner = partnerEquity > 0 ? partnerEquity : 6;
    afterFounder = Math.max(40, 100 - afterInvestor - afterPool - afterPartner);
  } else {
    afterInvestor = Math.max(18, fundingEquity + 8);
    afterPool = Math.max(8, Math.min(basePool, 10));
    afterPartner = partnerEquity > 0 ? partnerEquity + 2 : 0;
    afterFounder = Math.max(32, 100 - afterInvestor - afterPool - afterPartner);
  }

  const remainder = 100 - afterFounder - afterPool - afterInvestor - afterPartner;
  if (remainder !== 0) {
    afterFounder = Math.max(0, afterFounder + remainder);
  }

  const after = [
    { label: founderLabel, equity: afterFounder },
    ...(afterPartner > 0 ? [{ label: "新增合伙人", equity: afterPartner }] : []),
    ...(afterPool > 0 ? [{ label: "激励池", equity: afterPool }] : []),
    ...(afterInvestor > 0 ? [{ label: "本轮投资方", equity: afterInvestor }] : []),
  ];

  return { before, after };
}

function buildCommittee(
  stage: string,
  health: EquityPageOutput["health"],
  scenarios: EquityScenario[],
): EquityCommitteeOpinion[] {
  const primary =
    scenarios.find((item) => item.recommendation === "primary") || scenarios[0];
  return [
    {
      role: "资本顾问",
      opinion: `在${stage}，不建议先把股份分死。更合理的是保留融资与激励的缓冲，再推进 ${primary?.title || "主方案"}。`,
      concern: "如果提前把权益全部锁定，下一轮融资谈判会缺少空间。",
    },
    {
      role: "创始人视角",
      opinion: `当前控制权评分 ${health.control}，主判断应先保证项目方向不被外部变量轻易改写。`,
      concern: "如果关键合伙关系没有写清楚，后续争议不会停留在情绪层面。",
    },
    {
      role: "风险顾问",
      opinion: "真正风险不只是分股比例，而是角色、归属、退出和补偿机制没有同步设计。",
      concern: health.biggestRisk,
    },
    {
      role: "治理顾问",
      opinion: "股权结构必须服务组织演进，而不是一次性安抚所有人。",
      concern: "先补协议，再扩融资和组织层级。",
    },
  ];
}

function formatHealthSection(pageOutput: EquityPageOutput): string {
  return [
    "\n### 股权健康状态",
    `- 当前阶段：${pageOutput.stage}`,
    `- 股权健康度：${pageOutput.health.score}`,
    `- 控制权评分：${pageOutput.health.control}`,
    `- 融资安全：${pageOutput.health.fundingSafety}`,
    `- 激励空间：${pageOutput.health.incentiveRoom}`,
    `- 当前最大风险：${pageOutput.health.biggestRisk}`,
  ].join("\n") + "\n";
}

function formatScenarioSection(pageOutput: EquityPageOutput): string {
  const lines = ["\n### 方案模拟"];
  for (const scenario of pageOutput.scenarios) {
    lines.push(
      `- ${scenario.title}：${scenario.summary}`,
      scenario.founderEquityChange
        ? `  创始人变化：${scenario.founderEquityChange}`
        : "  创始人变化：待补",
      scenario.controlScore ? `  控制评分：${scenario.controlScore}` : "  控制评分：待补",
      scenario.dilutionImpact ? `  稀释影响：${scenario.dilutionImpact}` : "  稀释影响：待补",
    );
  }
  return lines.join("\n") + "\n";
}

function formatCommitteeSection(pageOutput: EquityPageOutput): string {
  const committee = pageOutput.committee || [];
  if (committee.length === 0) return "";
  const lines = ["\n### AI 决策委员会"];
  for (const item of committee) {
    lines.push(`- ${item.role}：${item.opinion}`);
    if (item.concern) {
      lines.push(`  关注：${item.concern}`);
    }
  }
  return lines.join("\n") + "\n";
}

function formatFinalSection(
  pageOutput: EquityPageOutput,
  confidence: number,
): string {
  const lines = [
    "\n---\n",
    "## 最终决策",
    `**主判断**：${pageOutput.finalDecision.judgement}`,
    `**信心**：${Math.round(confidence * 100)}%`,
    "",
    "### 理由",
    ...pageOutput.finalDecision.reasoning.map((item) => `- ${item}`),
    "",
    "### 风险",
    ...pageOutput.finalDecision.risks.map((item) => `- ${item}`),
    "",
    "### 下一步",
    ...pageOutput.finalDecision.actions.map((item) => `- ${item}`),
    "",
    "> 本轮股权主判断已写入 Decisions 与项目记忆。",
    "",
  ];
  return lines.join("\n");
}

function mapStage(stage: string | null | undefined): string {
  switch (stage) {
    case "idea":
    case "positioning":
      return "筹备期";
    case "location":
    case "setup":
    case "opening":
      return "单店验证期";
    case "growth":
      return "复制扩张期";
    default:
      return "筹备期";
  }
}
