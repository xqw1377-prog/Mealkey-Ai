/**
 * Agent Service — Kernel Agent 编排层
 *
 * ## 产品执行路径（D1-D6 全覆盖意图识别策略）
 *
 * 六维决策链路，按经营判断的自然顺序路由：
 *
 * | 维度 | 产品 | 意图策略 | 关键词 |
 * |------|------|---------|--------|
 * | D1 市场进入 | M-MKT | 正则关键词匹配 | 市场/机会/赛道/竞争格局/供需/进入窗口/城市机会/六维模型 |
 * | D2 品类客群 | M-PNT | shouldUseMPntAgent | 定位/品牌定位/品类分析/心智/差异化 |
 * | D3 商业模式 | M-BIZ | 正则关键词 / forceAgent | 商业模式/怎么赚钱/单位经济/复制 |
 * | D4 股权设计 | M-ED | 正则关键词匹配 | 股权/股份/合伙/融资/稀释/控制权/期权/激励池 |
 * | D5 经营诊断 | ChiefAgent | 兜底（非 D1-D4 的所有请求） | 通用经营判断、风险评估、行动建议 |
 * | D6 执行追踪 | ChiefAgent + Decisions | 通过 `/decisions` 页面直接访问 | 决策档案、结果反馈、学习沉淀 |
 *
 * 路由优先级：forceAgent > M-MKT > M-PNT > M-BIZ > M-ED > ChiefAgent
 * forceAgent="chief" 时跳过所有子 Agent 意图检测，直接走通用判断链。
 *
 * 产品执行顺序：先判断"进不进市场"(D1)→再判断"做什么定位"(D2)
 * →再判断"商业怎么赚钱"(D3)→再判断"怎么分股权"(D4)→默认走"通用经营判断"(D5)
 */

import type { StreamChunk } from "@mealkey/agent-sdk";
import type { PrismaClient } from "@/generated/prisma";
import { assertAgentQuota, type AgentCode } from "@/server/services/billing.service";
import { getChiefAgent, buildMKContext } from "./chief-agent.factory";
import { buildAssetContextBlock } from "./asset.service";
import {
  isMMktProductIntent,
  streamMMktProduct,
  type MMktMetaChunk,
  type MMktResultChunk,
} from "./m-mkt.service";
import {
  isMPntProductIntent,
  streamMPntProduct,
  type MPntMetaChunk,
  type MPntResultChunk,
} from "./m-pnt.service";
import {
  isMEdProductIntent,
  streamMEdProduct,
  type MEdMetaChunk,
  type MEdResultChunk,
} from "./m-ed.service";
import {
  isMBizProductIntent,
  streamMBizProduct,
  type MBizMetaChunk,
  type MBizResultChunk,
} from "./m-biz.service";

export interface AgentServiceOptions {
  projectId: string;
  userId: string;
  message: string;
  conversationId?: string;
  assetIds?: string[];
  /** 强制指定子 Agent：m-mkt | m-pnt | m-biz | m-ed | chief */
  forceAgent?: "m-mkt" | "m-pnt" | "m-biz" | "m-ed" | "chief";
}

export type AgentMetaChunk = {
  type: "meta";
  runtime: "runtime" | "chief" | "m-mkt" | "m-pnt" | "m-biz" | "m-ed";
  provider: "deepseek" | "openai" | "none" | "external" | "heuristic";
  model: string;
  fallback: boolean;
  assetCount: number;
  conversationId: string;
  agentId?: string;
  agentName?: string;
};

/**
 * 流式调用 Agent，返回 SSE 友好的 StreamChunk
 */
export async function* streamAgentResponse(
  prisma: PrismaClient,
  options: AgentServiceOptions
): AsyncGenerator<
  | StreamChunk
  | AgentMetaChunk
  | MMktMetaChunk
  | MMktResultChunk
  | MPntMetaChunk
  | MPntResultChunk
  | MBizMetaChunk
  | MBizResultChunk
  | MEdMetaChunk
  | MEdResultChunk
> {
  const { projectId, userId, message, conversationId, assetIds = [], forceAgent } = options;

  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) {
    yield { type: "error", message: "经营者信息不存在，请先完成注册" };
    return;
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: owner.id },
  });
  if (!project) {
    yield { type: "error", message: "项目不存在或无权限访问" };
    return;
  }

  let conversation = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, userId, projectId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } },
      })
    : null;

  // ─── D1-D6 意图路由：M-MKT → M-PNT → M-BIZ → M-ED → ChiefAgent ───
  // 优先级：forceAgent > D1 市场 > D2 定位 > D3 商业 > D4 股权 > D5 通用
  const useMMkt =
    forceAgent === "m-mkt" ||
    (forceAgent !== "chief" && isMMktProductIntent(message));
  const useMPnt =
    forceAgent === "m-pnt" ||
    (forceAgent !== "chief" &&
      !useMMkt &&
      isMPntProductIntent(message));
  const useMBiz =
    forceAgent === "m-biz" ||
    (forceAgent !== "chief" &&
      !useMMkt &&
      !useMPnt &&
      isMBizProductIntent(message));
  const useMEd =
    forceAgent === "m-ed" ||
    (forceAgent !== "chief" &&
      !useMMkt &&
      !useMPnt &&
      !useMBiz &&
      isMEdProductIntent(message));

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId,
        projectId,
        agentType: useMMkt
          ? "m-mkt"
          : useMPnt
            ? "m-pnt"
            : useMBiz
              ? "m-biz"
              : useMEd
                ? "m-ed"
                : "chief",
        title: message.slice(0, 50),
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
      metadata: assetIds.length > 0 ? JSON.stringify({ assetIds }) : null,
    },
  });

  const attachedAssets =
    assetIds.length > 0
      ? await prisma.asset.findMany({
          where: {
            id: { in: assetIds },
            ownerId: owner.id,
          },
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  if (attachedAssets.length > 0) {
    await prisma.asset.updateMany({
      where: {
        id: { in: attachedAssets.map((item) => item.id) },
        ownerId: owner.id,
      },
      data: {
        projectId,
        conversationId: conversation.id,
        messageId: userMessage.id,
      },
    });
  }

  const assetContextBlock = buildAssetContextBlock(attachedAssets);

  const runWithAgentGate = async function* (
    agentCode: AgentCode,
    runner: () => AsyncGenerator<
      | StreamChunk
      | AgentMetaChunk
      | MMktMetaChunk
      | MMktResultChunk
      | MPntMetaChunk
      | MPntResultChunk
      | MBizMetaChunk
      | MBizResultChunk
      | MEdMetaChunk
      | MEdResultChunk
    >,
  ) {
    await assertAgentQuota(prisma, userId, { agentCode });
    yield* runner();
  };

  // ─── 产品路径 A: M-MKT 市场机会 ───
  if (useMMkt) {
    yield* runWithAgentGate("m-mkt", () =>
      streamMMktProduct(
        prisma,
        {
          projectId,
          userId,
          message,
          conversationId: conversation.id,
          assetIds,
          force: forceAgent === "m-mkt",
          assetContextBlock,
        },
        conversation,
        owner.id,
      ),
    );
    return;
  }

  // ─── 产品路径 B: M-PNT 餐饮定位 ───
  if (useMPnt) {
    yield* runWithAgentGate("m-pnt", () =>
      streamMPntProduct(
        prisma,
        {
          projectId,
          userId,
          message,
          conversationId: conversation.id,
          assetIds,
          force: forceAgent === "m-pnt",
          assetContextBlock,
        },
        conversation,
        owner.id,
      ),
    );
    return;
  }

  // ─── 产品路径 C: M-BIZ 商业模式 ───
  if (useMBiz) {
    yield* runWithAgentGate("m-biz", () =>
      streamMBizProduct(
        prisma,
        {
          projectId,
          userId,
          message,
          conversationId: conversation.id,
          assetIds,
          force: forceAgent === "m-biz",
          assetContextBlock,
        },
        conversation,
        owner.id,
      ),
    );
    return;
  }

  // ─── 产品路径 D: M-ED 股权决策 ───
  if (useMEd) {
    yield* runWithAgentGate("m-ed", () =>
      streamMEdProduct(
        prisma,
        {
          projectId,
          userId,
          message,
          conversationId: conversation.id,
          assetIds,
          force: forceAgent === "m-ed",
          assetContextBlock,
        },
        conversation,
        owner.id,
      ),
    );
    return;
  }

  // ─── 产品路径 E: ChiefAgent ───
  yield* runWithAgentGate("chief", async function* () {
    const mkContext = await buildMKContext(prisma, userId, projectId);
    const positioningBlock = extractPositioningContextBlock(mkContext);
    const enrichedAssets = [assetContextBlock, positioningBlock]
      .filter(Boolean)
      .join("\n\n");
    yield* streamChiefAgentResponse(
      prisma,
      { userId, projectId, message, conversationId: conversation.id, assetIds },
      mkContext,
      conversation,
      enrichedAssets || null,
    );
  });
}

/** Inject current M-PNT positioning so Meeting judgements stay anchored */
function extractPositioningContextBlock(
  mkContext: Awaited<ReturnType<typeof buildMKContext>>,
): string | null {
  const profile = (mkContext.project?.profile || null) as Record<
    string,
    unknown
  > | null;
  const mPnt = (profile?.mPnt || null) as Record<string, unknown> | null;
  const oneLiner =
    (typeof mPnt?.oneLiner === "string" && mPnt.oneLiner) ||
    (typeof profile?.positioning === "string" && profile.positioning) ||
    mkContext.project?.target ||
    null;
  if (!oneLiner) return null;

  const bp = (mPnt?.brandPositioning || {}) as Record<string, unknown>;
  return [
    "【当前品牌定位（M-PNT，会议判断前提）】",
    `- 一句话定位: ${oneLiner}`,
    bp.brandName ? `- 品牌名: ${bp.brandName}` : null,
    bp.category ? `- 品类: ${bp.category}` : null,
    bp.targetCustomers ? `- 客群: ${bp.targetCustomers}` : null,
    bp.priceRange ? `- 价格带: ${bp.priceRange}` : null,
    bp.differentiation ? `- 差异化: ${bp.differentiation}` : null,
    mPnt?.strategy ? `- 策略: ${mPnt.strategy}` : null,
    "请在后续经营判断中不要偏离上述定位，若建议调整定位须明确说明理由。",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * ChiefAgent 执行路径
 */
async function* streamChiefAgentResponse(
  prisma: PrismaClient,
  options: AgentServiceOptions,
  mkContext: Awaited<ReturnType<typeof buildMKContext>>,
  conversation: { id: string },
  assetContextBlock?: string | null,
): AsyncGenerator<StreamChunk | AgentMetaChunk> {
  const { projectId, userId, message, conversationId } = options;
  const chiefAgent = getChiefAgent(prisma);
  let fullResponse = "";

  yield {
    type: "meta",
    runtime: "chief",
    provider: resolveRuntimeProvider(),
    model: resolveChiefModel(),
    fallback: resolveRuntimeProvider() === "none",
    assetCount: options.assetIds?.length ?? 0,
    conversationId: conversation.id,
    agentId: "chief",
    agentName: "经营顾问",
  };

  for await (const rawChunk of chiefAgent.process({
    userId,
    projectId,
    message: assetContextBlock ? `${message}\n\n补充资料：\n${assetContextBlock}` : message,
    context: mkContext,
    conversationId,
  })) {
    const chunk = rawChunk as Record<string, unknown>;
    switch (chunk.type as string) {
      case "thinking":
        yield { type: "text", content: chunk.content as string };
        break;
      case "context":
      case "knowledge":
        yield { type: "text", content: "" };
        break;
      case "assessment":
        yield { type: "text", content: `\n## 📊 评估\n综合评分: ${(chunk.data as Record<string, unknown>)?.overall ?? "?"}/100` };
        {
          const strengths = (chunk.data as Record<string, unknown>)?.strengths;
          if (strengths && Array.isArray(strengths) && strengths.length > 0) {
            yield { type: "text", content: `\n优势: ${strengths.join(", ")}` };
          }
          const weaknesses = (chunk.data as Record<string, unknown>)?.weaknesses;
          if (weaknesses && Array.isArray(weaknesses) && weaknesses.length > 0) {
            yield { type: "text", content: `\n需要加强: ${weaknesses.join(", ")}` };
          }
        }
        break;
      case "mk_decision":
        {
          const d = chunk.data as Record<string, unknown>;
          yield {
            type: "text",
            content: `\n## 🔍 判断链\n**问题**: ${d?.problem ?? ""}\n**诊断**: ${d?.diagnosis ?? ""}\n**判断**: ${d?.judgement ?? ""}`,
          };
        }
        break;
      case "tool_start":
        yield { type: "tool_start" as const, toolName: chunk.toolName as string };
        break;
      case "tool_result":
        yield {
          type: "tool_result" as const,
          toolName: chunk.toolName as string,
          result: {
            success: true,
            data: ((chunk.result as Record<string, unknown>)?.data ?? {}) as Record<string, unknown>,
          },
        };
        break;
      case "challenges":
        yield {
          type: "text",
          content: `\n## 🤔 需要验证的假设\n${((chunk.data as Record<string, unknown>)?.summary as string) ?? ""}\n`,
        };
        break;
      case "message":
        fullResponse = chunk.content as string;
        yield { type: "text", content: chunk.content as string };
        break;
      case "done": {
        const data = chunk.data as Record<string, unknown>;
        const metadata = data?.metadata as Record<string, unknown> | undefined;
        const mkDecision = data?.mkDecision as Record<string, unknown> | undefined;

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: fullResponse || (data?.message as string ?? ""),
            metadata: JSON.stringify({
              agentRunId: metadata?.agentRunId,
              confidence: metadata?.confidence,
              intent: metadata?.intent,
              runtime: "chief",
              provider: resolveRuntimeProvider(),
              model: resolveChiefModel(),
              fallback: resolveRuntimeProvider() === "none",
              assetIds: options.assetIds ?? [],
            }),
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            messageCount: { increment: 2 },
            summary: (fullResponse || (data?.message as string ?? "")).slice(0, 200),
          },
        });

        if (mkDecision) {
          await prisma.report.create({
            data: {
              projectId,
              type: "diagnosis",
              title: (mkDecision.problem as string) ?? "",
              summary: (mkDecision.judgement as string) ?? "",
              content: JSON.stringify(mkDecision),
              status: "published",
            },
          });
        }

        yield { type: "done" };
        break;
      }
      case "error":
        yield { type: "error", message: chunk.message as string };
        break;
    }
  }
}

function resolveRuntimeProvider(): "deepseek" | "openai" | "none" {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

function resolveChiefModel() {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek-chat";
  if (process.env.OPENAI_API_KEY) return "gpt-4o-mini";
  return "rule-only";
}
