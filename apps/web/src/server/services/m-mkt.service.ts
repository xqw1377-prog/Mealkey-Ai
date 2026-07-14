import type { StreamChunk, MKContext } from "@mealkey/agent-sdk";
import type { PrismaClient } from "@/generated/prisma";
import { buildMKContext } from "./chief-agent.factory";
import {
  createAgentRun,
  createDecision,
  saveMemory,
  updateAgentRun,
} from "./agent-os.service";
import {
  buildMarketSnapshot,
  snapshotFromMMktBlob,
  type MarketPageOutput,
  type MarketSnapshot,
} from "@/lib/market";
import { withFounderMarketContext } from "@/lib/founder-decision-snapshot";

export const mMktManifest = {
  id: "m-mkt",
  name: "市场机会引擎",
  version: "1.0.0",
  description: "围绕进入概率、竞争格局和 Founder 适配度，形成市场进入判断。",
  capabilities: [
    "market_opportunity",
    "entry_probability",
    "gap_identification",
    "founder_fit",
  ],
};

export type MMktMetaChunk = {
  type: "meta";
  runtime: "m-mkt";
  provider: "heuristic";
  model: "rule-based";
  fallback: true;
  assetCount: number;
  conversationId: string;
  agentId: "m-mkt";
  agentName: string;
};

export type MMktResultChunk = {
  type: "market_result";
  data: MarketSnapshot;
  previous?: MarketSnapshot | null;
};

export interface MMktServiceOptions {
  projectId: string;
  userId: string;
  message: string;
  conversationId?: string;
  assetIds?: string[];
  force?: boolean;
  assetContextBlock?: string | null;
}

/**
 * M-MKT 意图识别 — D1 市场进入维度
 *
 * 检测用户是否在询问\"市场值不值得进\"，包括：
 * - 市场机会评估（赛道/机会/值得进入）
 * - 竞争格局分析（竞争格局/供需/竞争烈度）
 * - 城市与区域机会（城市机会/区域机会/城市分析）
 * - 进入时机判断（进入窗口/进入时机/市场空位）
 * - 品类可行性（创业机会/加盟机会；「品类分析」归 M-PNT 定位）
 * - 六维模型评分（六维模型/机会评分/市场评估/消费适配/运营可行/品牌势能/环境适配）
 *
 * 与 D2（M-PNT 定位）的区别：
 * - D1 问\"这个市场能不能做\" → M-MKT
 * - D2 问\"这个品牌怎么做 / 品类怎么定位\" → M-PNT
 */
export function isMMktProductIntent(message: string, force?: boolean): boolean {
  if (force) return true;
  return /市场|机会|赛道|值得进入|值不值得做|竞争格局|供需|进入窗口|城市机会|区域机会|市场容量|竞争烈度|消费适配|运营可行|品牌势能|环境适配|六维模型|机会评分|市场评估|城市分析|创业机会|加盟机会|开餐厅|进入时机|市场空位/i.test(
    message,
  );
}

export async function* streamMMktProduct(
  prisma: PrismaClient,
  options: MMktServiceOptions,
  conversation: { id: string },
  ownerId: string,
): AsyncGenerator<StreamChunk | MMktMetaChunk | MMktResultChunk> {
  const { projectId, userId, message, assetIds = [] } = options;
  const startedAt = Date.now();
  const enrichedMessage = options.assetContextBlock
    ? `${message}\n\n补充资料：\n${options.assetContextBlock}`
    : message;

  yield {
    type: "meta",
    runtime: "m-mkt",
    provider: "heuristic",
    model: "rule-based",
    fallback: true,
    assetCount: assetIds.length,
    conversationId: conversation.id,
    agentId: "m-mkt",
    agentName: mMktManifest.name,
  };

  const agentRun = await createAgentRun(prisma, {
    agentId: "m-mkt",
    userId,
    projectId,
    conversationId: conversation.id,
    input: { message, assetIds, agent: "m-mkt" },
  });

  try {
    const mkContext = await buildMKContext(prisma, userId, projectId);
    const generated = buildMarketWorkspace(mkContext, enrichedMessage);
    const snapshot = buildMarketSnapshot({
      problem: generated.problem,
      observation: generated.observation,
      diagnosis: generated.diagnosis,
      judgement: generated.judgement,
      strategy: generated.strategy,
      action: generated.action,
      confidence: generated.confidence,
      structured: { pageOutput: generated.pageOutput },
      source: "m-mkt",
    });

    yield {
      type: "text",
      content:
        "## 市场机会工作台\n\n系统已基于当前项目、城市、品类和 Founder 状态，开始生成本轮市场进入判断。\n",
    };
    yield { type: "tool_start", toolName: "market_scoring" } as StreamChunk;
    yield { type: "text", content: formatHealthSection(snapshot.pageOutput) };
    yield {
      type: "tool_result",
      toolName: "market_scoring",
      result: {
        success: true,
        data: {
          entryProbability: snapshot.pageOutput.scores.entryProbability,
          judgement: snapshot.pageOutput.health.judgement,
        },
      },
    } as StreamChunk;

    yield { type: "tool_start", toolName: "market_gap_analysis" } as StreamChunk;
    yield { type: "text", content: formatGapSection(snapshot.pageOutput) };
    yield {
      type: "tool_result",
      toolName: "market_gap_analysis",
      result: {
        success: true,
        data: {
          gapCount: snapshot.pageOutput.gaps.length,
          opportunityId: snapshot.pageOutput.opportunityCard?.opportunityId || null,
        },
      },
    } as StreamChunk;

    yield { type: "tool_start", toolName: "entry_decision" } as StreamChunk;
    yield { type: "text", content: formatFinalSection(snapshot.pageOutput, generated.confidence) };

    const persisted = await persistMMktResult(prisma, {
      ownerId,
      projectId,
      userId,
      agentRunId: agentRun.id,
      snapshot,
      pageOutput: generated.pageOutput,
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
          "## Market Opportunity Center",
          finalSnapshot.oneLiner,
          `进入概率：${finalSnapshot.pageOutput.scores.entryProbability}`,
          `最大阻力：${finalSnapshot.pageOutput.health.biggestRisk}`,
        ].join("\n\n"),
        metadata: JSON.stringify({
          agentRunId: agentRun.id,
          decisionId: persisted.decisionId,
          runtime: "m-mkt",
          provider: "heuristic",
          model: "rule-based",
          snapshot: finalSnapshot,
          previous: persisted.previous,
        }),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        agentType: "m-mkt",
        messageCount: { increment: 2 },
        summary: finalSnapshot.oneLiner.slice(0, 200),
      },
    });

    await prisma.report.create({
      data: {
        projectId,
        type: "market",
        title: generated.problem,
        summary: finalSnapshot.oneLiner,
        content: JSON.stringify({
          snapshot: finalSnapshot,
          pageOutput: generated.pageOutput,
        }),
        status: "published",
      },
    });

    yield {
      type: "market_result",
      data: finalSnapshot,
      previous: persisted.previous,
    };
    yield { type: "done" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "M-MKT 执行失败";
    await updateAgentRun(prisma, agentRun.id, {
      status: "failed",
      duration: Date.now() - startedAt,
      output: { error: message },
    }).catch(() => undefined);
    yield { type: "error", message };
  }
}

async function persistMMktResult(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    projectId: string;
    userId: string;
    agentRunId: string;
    snapshot: MarketSnapshot;
    pageOutput: MarketPageOutput;
    message: string;
  },
): Promise<{ decisionId: string; previous: MarketSnapshot | null }> {
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
    agentId: "m-mkt",
    type: "market",
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
    key: `m-mkt_market_${args.projectId}`,
    content: JSON.stringify({
      summary: args.snapshot.oneLiner,
      scores: args.pageOutput.scores,
      opportunityCard: args.pageOutput.opportunityCard,
      finalDecision: args.pageOutput.finalDecision,
      sourceMessage: args.message.slice(0, 200),
      at: new Date().toISOString(),
    }),
    type: "DECISION",
    source: "m-mkt",
    importance: 88,
    projectId: args.projectId,
  });

  const previous = await syncProjectMarket(prisma, {
    ownerId: args.ownerId,
    projectId: args.projectId,
    decisionId: record.id,
    snapshot: args.snapshot,
    pageOutput: args.pageOutput,
  });

  return { decisionId: record.id, previous };
}

async function syncProjectMarket(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    projectId: string;
    decisionId: string;
    snapshot: MarketSnapshot;
    pageOutput: MarketPageOutput;
  },
): Promise<MarketSnapshot | null> {
  const project = await prisma.project.findFirst({
    where: { id: args.projectId, ownerId: args.ownerId },
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

  const previousBlob = (profile.mMkt || null) as Record<string, unknown> | null;
  const previous = snapshotFromMMktBlob(previousBlob, "profile");

  const mMkt = {
    decisionId: args.decisionId,
    updatedAt: new Date().toISOString(),
    oneLiner: args.snapshot.oneLiner,
    problem: args.snapshot.problem,
    observation: args.snapshot.observation,
    diagnosis: args.snapshot.diagnosis,
    strategy: args.snapshot.strategy,
    action: args.snapshot.action,
    confidence: args.snapshot.confidence,
    pageOutput: args.pageOutput,
  };

  const historyRaw = Array.isArray(profile.mMktHistory)
    ? (profile.mMktHistory as Record<string, unknown>[])
    : [];
  const mMktHistory = previousBlob
    ? [previousBlob, ...historyRaw].slice(0, 5)
    : historyRaw.slice(0, 5);

  const nextProfile = withFounderMarketContext(
    {
      ...profile,
      marketOpportunityScore: args.pageOutput.scores.entryProbability,
      marketJudgement: args.pageOutput.finalDecision.judgement,
      marketBiggestRisk: args.pageOutput.health.biggestRisk,
      mMkt,
      mMktPrevious: previousBlob ?? profile.mMktPrevious ?? null,
      mMktHistory,
    },
    {
      opportunityId: args.pageOutput.opportunityCard?.opportunityId,
      city: args.pageOutput.city,
      district: args.pageOutput.district,
      category: args.pageOutput.category,
      entryProbability: args.pageOutput.scores.entryProbability,
      finalJudgement: args.pageOutput.finalDecision.judgement,
      handoffPayload: args.pageOutput.opportunityCard?.handoffPayload,
    },
    args.projectId,
  );

  await prisma.project.update({
    where: { id: args.projectId },
    data: {
      profile: JSON.stringify(nextProfile),
    },
  });

  return previous;
}

export async function saveMarketFeedback(
  prisma: PrismaClient,
  args: {
    ownerId: string;
    decisionId: string;
    helpful: boolean;
    comment?: string;
    projectId: string;
  },
): Promise<void> {
  await saveMemory(prisma, args.ownerId, {
    key: `feedback_m-mkt_${args.decisionId}`,
    content: JSON.stringify({
      type: args.helpful ? "positive_feedback" : "negative_feedback",
      comment: args.comment || "",
      decisionId: args.decisionId,
      projectId: args.projectId,
      at: new Date().toISOString(),
    }),
    type: "LEARNING",
    source: "feedback",
    importance: 86,
    projectId: args.projectId,
  });
}

function buildMarketWorkspace(
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
  pageOutput: MarketPageOutput;
} {
  const project = mkContext.project;
  const owner = mkContext.owner;
  const city = project.city || "目标城市";
  const district = project.district || undefined;
  const category = project.category || "餐饮项目";
  const cityTier = resolveCityTier(city);
  const founderScore = clamp100(owner.overallScore ?? 58);

  const demand = calcDemandScore(cityTier, category);
  const competition = calcCompetitionScore(cityTier, category, district);
  const gap = calcGapScore(category, competition);
  const timing = calcTimingScore(project.stage, category);
  const economics = calcEconomicsScore(category, project.budget);
  const founderFit = calcFounderFit(owner.experience || "0年", founderScore, project.budget);
  const entryProbability = clamp100(
    demand * 0.2 +
      (100 - competition) * 0.14 +
      gap * 0.19 +
      timing * 0.14 +
      economics * 0.15 +
      founderFit * 0.18,
  );

  const judgementKey: MarketPageOutput["health"]["judgement"] =
    entryProbability >= 74 ? "enter" : entryProbability >= 58 ? "cautious" : "kill";
  const biggestRisk =
    founderFit < 60
      ? "Founder 当前资源和执行经验还不足以承接这个市场难度。"
      : competition >= 78
        ? "当前竞争密度过高，直接正面进入的代价太大。"
        : economics < 62
          ? "即使存在需求，商业空间也可能撑不起后续经营。"
          : "市场空位存在，但切入姿态和定位边界必须更克制。";

  const opportunity = buildOpportunityText(category, cityTier);
  const suggestedPositioning = buildSuggestedPositioning(category);
  const suggestedPriceBand = buildSuggestedPriceBand(category);
  const suggestedArea = buildSuggestedArea(category, cityTier);
  const opportunityId = [normalizeCode(city), normalizeCode(district || city), normalizeCode(category)]
    .filter(Boolean)
    .join("-");

  const health: MarketPageOutput["health"] = {
    biggestRisk,
    judgement: judgementKey,
    rationale:
      judgementKey === "enter"
        ? "机会存在，但应从结构性空位切入，而不是跟成熟玩家正面竞争。"
        : judgementKey === "cautious"
          ? "市场不是不能做，但需要先缩小切口，再验证 Founder 是否真的承接得住。"
          : "当前市场与 Founder 适配度都不够，继续推进会提高错误进入概率。",
  };

  const gaps = [
    {
      title: "场景空位",
      summary: `${city}${district ? ` ${district}` : ""} 里仍有 ${opportunity} 的场景缺口。`,
      confidence: clamp100(gap + 6),
    },
    {
      title: "价格带空位",
      summary: `相比主流玩家，${suggestedPriceBand} 的切口更适合形成第一轮验证。`,
      confidence: clamp100(gap),
    },
    {
      title: "Founder 匹配空位",
      summary:
        founderFit >= 70
          ? "当前 Founder 条件能承接轻量切入，但不适合直接做大店或重投入模型。"
          : "Founder 适配度偏弱，应先把模型和资源边界压缩后再推进。",
      confidence: clamp100(founderFit),
    },
  ];

  const primaryStrategy =
    judgementKey === "kill"
      ? "先暂停进入，回到会议重设城市、区域或品类。"
      : `以「${opportunity}」为切口，先验证 ${suggestedPositioning} 的进入姿态。`;
  const nextAgent =
    judgementKey === "enter" ? "m-pnt" : economics < 62 ? "m-biz" : "chief";

  const pageOutput: MarketPageOutput = {
    topic: `${city}${district ? ` · ${district}` : ""} ${category} 市场进入判断`,
    city,
    district,
    category,
    scores: {
      demand,
      competition,
      gap,
      timing,
      economics,
      founderFit,
      entryProbability,
    },
    health,
    marketStructure: {
      trendSummary: `${cityTier}城市中，${category} 需求仍有空间，但用户更偏好更明确的场景和更克制的面积模型。`,
      populationTag: cityTier === "一线/新一线" ? "高密度外食人群" : "本地熟客与家庭消费并存",
      spendingPower: cityTier === "一线/新一线" ? "中高消费带稳定" : "价格敏感但稳定复购",
      sceneSummary: `适合先从 ${opportunity} 这类高频、低教育成本场景切入。`,
      priceBandSummary: `初步建议价格带 ${suggestedPriceBand}。`,
    },
    competition: {
      headPlayers: buildHeadPlayers(category),
      densitySummary:
        competition >= 78
          ? "区域内主流玩家已形成密集供给，进入门槛偏高。"
          : competition >= 60
            ? "竞争不轻，但仍有从细分场景切入的空间。"
            : "当前竞争密度可控，仍存在早期进入机会。",
      homogenization:
        competition >= 70
          ? "多数玩家仍在重复主流打法，同质化明显。"
          : "供给差异开始拉开，但心智高地仍未完全固化。",
      biggestPressure:
        competition >= 78
          ? "成熟品牌已占住主流心智，新进入者必须避免正面重资产竞争。"
          : "最大压力来自切口不够清晰，而不是市场完全被占满。",
    },
    gaps,
    opportunityCard: {
      opportunityId,
      city,
      district,
      category,
      opportunity,
      suggestedPositioning,
      suggestedPriceBand,
      suggestedArea,
      risk: biggestRisk,
      handoffPayload: {
        city,
        district,
        category,
        opportunity,
        suggestedPositioning,
        suggestedPriceBand,
        suggestedArea,
        entryProbability,
      },
    },
    entryStrategies: [
      {
        id: "primary",
        title: "结构性空位切入",
        summary: primaryStrategy,
        fit: judgementKey === "kill" ? "reject" : "primary",
        pros: [
          "先从更容易被识别的消费场景切入，降低认知教育成本。",
          "避免一开始就进入最拥挤的主流价格带。",
        ],
        risks: [biggestRisk, "如果后续定位没有及时收口，市场机会会被浪费。"],
      },
      {
        id: "secondary",
        title: "缩小模型后进入",
        summary: `先用 ${suggestedArea} 的轻量模型验证需求，再决定是否加大投入。`,
        fit: judgementKey === "enter" ? "secondary" : "primary",
        pros: ["资金暴露更低，Founder 更容易承接。", "能更快验证真实复购与场景密度。"],
        risks: ["模型过小可能导致品牌势能不足。", "如果供应链不稳，轻量模型也会失真。"],
      },
      {
        id: "reject",
        title: "直接做大店主流打法",
        summary: "当前阶段不建议直接上重投入、高房租、高人效压力模型。",
        fit: "reject",
        pros: [],
        risks: ["竞争最强、投入最大、回撤最慢。", "Founder 需要先验证切口，而不是先放大赌注。"],
      },
    ],
    finalDecision: {
      judgement:
        judgementKey === "enter"
          ? `建议进入 ${city}${district ? ` ${district}` : ""} ${category}，但必须以结构性空位切入。`
          : judgementKey === "cautious"
            ? `当前可以谨慎进入 ${city}${district ? ` ${district}` : ""} ${category}，先缩小模型再验证。`
            : `当前不建议直接进入 ${city}${district ? ` ${district}` : ""} ${category}。`,
      reasoning: [
        `进入概率 ${entryProbability} / 100，说明市场机会与 Founder 适配度尚可，但并不支持盲目进入。`,
        `Founder 匹配度 ${founderFit} / 100，说明这不是“市场好不好”的问题，还包含“你能不能承接”的问题。`,
        "当前建议先把市场判断压成机会卡，再交给下一阶段工作台继续推进。",
      ],
      risks: [
        biggestRisk,
        "如果没有把机会卡转换成清晰定位，市场分析会停在认知层，无法转成经营动作。",
        "如果忽略 Founder 适配度，只看市场热度，后续很容易在经营强度上失速。",
      ],
      actions: [
        primaryStrategy,
        judgementKey === "kill"
          ? "回到 Meeting，调整城市、区域或品类，再重新做市场判断。"
          : "带着机会卡进入下一步工作台，把市场空位转成品牌定位和商业模型。",
        "把本轮市场判断写入 Founder 决策快照，避免后续重新问一遍相同问题。",
      ],
      alternatives:
        judgementKey === "kill"
          ? ["切换区域", "切换品类", "改成更轻的面积和投入模型"]
          : ["先缩小面积", "先验证价格带", "先做单一场景切入"],
      nextAgent,
    },
    marketMemory: {
      patternSummary: `${city} ${category} 当前更适合从具体场景与更轻模型切入，而不是直接复制主流打法。`,
      relatedCases: [`${city} ${category} 社区模型`, `${city} ${category} 家庭聚餐切口`],
      confidenceNote: "该判断已沉淀为一条市场案例，可供后续定位与商业模型继续引用。",
    },
  };

  const judgement = pageOutput.finalDecision.judgement;
  const strategy = primaryStrategy;
  const action = pageOutput.finalDecision.actions[0];
  const observation = `${city}${district ? ` ${district}` : ""} ${category} 的进入概率 ${entryProbability}，最大阻力是${biggestRisk}`;
  const diagnosis = "这不是单纯的市场热度问题，而是市场机会、竞争压力和 Founder 适配度共同决定的进入判断。";

  return {
    problem: `${city}${district ? ` ${district}` : ""} ${category} 市场是否值得进入？`,
    observation,
    diagnosis,
    judgement,
    strategy,
    action,
    confidence: 0.75,
    pageOutput,
  };
}

export function previewMMktSnapshot(input: {
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
}): MarketSnapshot {
  const mkContext = {
    owner: {
      id: "founder-layer",
      name: null,
      email: null,
      experience: input.companyContext.business?.scale || "0年",
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

  const generated = buildMarketWorkspace(mkContext, input.message);

  return buildMarketSnapshot({
    problem: generated.problem,
    observation: generated.observation,
    diagnosis: generated.diagnosis,
    judgement: generated.judgement,
    strategy: generated.strategy,
    action: generated.action,
    confidence: generated.confidence,
    structured: { pageOutput: generated.pageOutput },
    source: "m-mkt",
  });
}

function formatHealthSection(pageOutput: MarketPageOutput): string {
  return [
    "### 市场机会概览",
    `- 进入概率：${pageOutput.scores.entryProbability}`,
    `- Demand：${pageOutput.scores.demand}`,
    `- Competition：${pageOutput.scores.competition}`,
    `- Founder Fit：${pageOutput.scores.founderFit}`,
    `- 当前判断：${pageOutput.finalDecision.judgement}`,
    `- 最大阻力：${pageOutput.health.biggestRisk}`,
    "",
  ].join("\n");
}

function formatGapSection(pageOutput: MarketPageOutput): string {
  return [
    "### 机会缺口与进入姿态",
    ...pageOutput.gaps.map((item) => `- ${item.title}：${item.summary}`),
    pageOutput.opportunityCard
      ? `- 机会卡：${pageOutput.opportunityCard.opportunityId} · ${pageOutput.opportunityCard.opportunity}`
      : null,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatFinalSection(pageOutput: MarketPageOutput, confidence: number): string {
  return [
    "### 最终进入判断",
    pageOutput.finalDecision.judgement,
    "",
    "关键理由：",
    ...pageOutput.finalDecision.reasoning.map((item) => `- ${item}`),
    "",
    "下一步：",
    ...pageOutput.finalDecision.actions.map((item) => `- ${item}`),
    "",
    `可信度：${Math.round(confidence * 100)}%`,
    "",
  ].join("\n");
}

function resolveCityTier(city: string | null | undefined): "一线/新一线" | "强二线" | "区域城市" {
  if (!city) return "区域城市";
  if (/北京|上海|广州|深圳|杭州|成都|武汉|苏州|南京/i.test(city)) return "一线/新一线";
  if (/长沙|西安|重庆|郑州|合肥|福州|厦门|宁波|青岛/i.test(city)) return "强二线";
  return "区域城市";
}

function calcDemandScore(cityTier: string, category: string): number {
  let score = cityTier === "一线/新一线" ? 74 : cityTier === "强二线" ? 70 : 66;
  if (/湘菜|火锅|烧烤|咖啡|茶饮/i.test(category)) score += 4;
  if (/高端|宴请|fine/i.test(category)) score -= 5;
  return clamp100(score);
}

function calcCompetitionScore(cityTier: string, category: string, district?: string): number {
  let score = cityTier === "一线/新一线" ? 80 : cityTier === "强二线" ? 72 : 64;
  if (/湘菜|火锅|咖啡|茶饮/i.test(category)) score += 4;
  if (district && /商圈|核心|CBD|徐汇|朝阳|天河/i.test(district)) score += 4;
  return clamp100(score);
}

function calcGapScore(category: string, competition: number): number {
  let score = 72 - Math.round((competition - 60) * 0.35);
  if (/家庭|社区|家常/i.test(category)) score += 3;
  return clamp100(score);
}

function calcTimingScore(stage: string | null | undefined, category: string): number {
  let score = 68;
  if (stage === "idea" || stage === "positioning") score += 4;
  if (/高端|宴请/i.test(category)) score -= 4;
  return clamp100(score);
}

function calcEconomicsScore(category: string | null | undefined, budget: number | null | undefined): number {
  let score = /咖啡|茶饮|快餐/i.test(category || "") ? 70 : 64;
  if (typeof budget === "number" && budget > 0) {
    if (budget < 500000) score -= 4;
    if (budget > 1500000) score += 2;
  }
  return clamp100(score);
}

function calcFounderFit(
  experience: string | null | undefined,
  founderScore: number,
  budget: number | null | undefined,
): number {
  const years = extractYears(experience);
  let score = founderScore;
  if (years >= 8) score += 6;
  else if (years >= 3) score += 2;
  else score -= 4;
  if (typeof budget === "number" && budget > 0 && budget < 500000) score -= 3;
  return clamp100(score);
}

function extractYears(experience: string | null | undefined): number {
  if (!experience) return 0;
  const match = experience.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function buildOpportunityText(category: string, cityTier: string): string {
  if (/湘菜/i.test(category)) {
    return cityTier === "一线/新一线" ? "年轻家庭晚餐" : "社区熟客聚餐";
  }
  if (/咖啡/i.test(category)) return "通勤轻社交";
  if (/茶饮/i.test(category)) return "高频即买即走";
  return "高频刚需场景";
}

function buildSuggestedPositioning(category: string): string {
  if (/湘菜/i.test(category)) return "高品质家庭聚餐";
  if (/咖啡/i.test(category)) return "稳定复购的社区精品咖啡";
  if (/火锅/i.test(category)) return "高效率轻社交火锅";
  return "高频消费的清晰场景品牌";
}

function buildSuggestedPriceBand(category: string): string {
  if (/湘菜/i.test(category)) return "120-180";
  if (/咖啡/i.test(category)) return "25-35";
  if (/茶饮/i.test(category)) return "18-28";
  if (/火锅/i.test(category)) return "110-160";
  return "60-100";
}

function buildSuggestedArea(category: string, cityTier: string): string {
  if (/咖啡|茶饮/i.test(category)) return cityTier === "一线/新一线" ? "80-120㎡" : "60-90㎡";
  return cityTier === "一线/新一线" ? "180-250㎡" : "140-200㎡";
}

function buildHeadPlayers(category: string): string[] {
  if (/湘菜/i.test(category)) return ["费大厨", "炊烟", "本地强势湘菜馆"];
  if (/咖啡/i.test(category)) return ["星巴克", "Manner", "本地精品咖啡"];
  if (/火锅/i.test(category)) return ["海底捞", "区域头部火锅", "本地社交火锅"];
  return ["区域头部品牌", "本地成熟门店", "连锁主流玩家"];
}

function normalizeCode(value: string): string {
  return value
    .replace(/\s+/g, "")
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
