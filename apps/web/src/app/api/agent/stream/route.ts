import { streamAgentResponse } from "@/server/services/agent.service";
import { assertAgentQuota } from "@/server/services/billing.service";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";

const encoder = new TextEncoder();

function toSSE(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
}

function clientSafeError(error: unknown, fallback: string): string {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "";
  if (
    /不能为空|过长|不存在|无权限|请先配置|过于频繁|经营者信息不存在|项目不存在|会议次数已用完|升级套餐|未开通|余额不足|超额/.test(
      message,
    )
  ) {
    return message;
  }
  return fallback;
}

/**
 * Agent 流式 API
 *
 * POST /api/agent/stream
 * 需要认证
 * Body: { message: string, projectId: string, conversationId?: string }
 *
 * 返回 SSE (Server-Sent Events) 流
 */
export async function POST(request: Request) {
  try {
    const authUser = await requireAuth();

    const limited = await rateLimit(`agent-stream:${authUser.id}`, 20, 60 * 1000);
    if (!limited.ok) {
      return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((limited.resetAt - Date.now()) / 1000)),
        },
      });
    }

    const body = (await request.json()) as {
      message: string;
      projectId: string;
      conversationId?: string;
      assetIds?: string[];
      forceAgent?: "m-mkt" | "m-pnt" | "m-biz" | "m-ed" | "chief";
    };

    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return new Response(JSON.stringify({ error: "消息不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.message.length > 8000) {
      return new Response(JSON.stringify({ error: "消息过长，请控制在 8000 字以内" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!body.projectId) {
      return new Response(JSON.stringify({ error: "项目ID不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify project ownership before entering SSE stream
    const owner = await prisma.owner.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    });
    if (!owner) {
      return new Response(JSON.stringify({ error: "经营者信息不存在" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, ownerId: owner.id },
      select: { id: true },
    });
    if (!project) {
      return new Response(JSON.stringify({ error: "项目不存在或无权限" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await assertAgentQuota(prisma, authUser.id);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: clientSafeError(error, "会议额度不足，请先升级套餐"),
          code: "QUOTA_EXCEEDED",
          billingUrl: "/billing",
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamAgentResponse(prisma, {
            projectId: body.projectId,
            userId: authUser.id,
            message: body.message,
            conversationId: body.conversationId,
            assetIds: Array.isArray(body.assetIds) ? body.assetIds : [],
            forceAgent:
              body.forceAgent === "m-mkt" ||
              body.forceAgent === "m-pnt" ||
              body.forceAgent === "m-biz" ||
              body.forceAgent === "m-ed" ||
              body.forceAgent === "chief"
                ? body.forceAgent
                : undefined,
          })) {
            if (chunk.type === "error") {
              controller.enqueue(
                toSSE({
                  type: "error",
                  message: clientSafeError(
                    (chunk as { message?: string }).message,
                    "处理失败，请稍后重试",
                  ),
                }),
              );
              continue;
            }
            controller.enqueue(toSSE(chunk as Record<string, unknown>));
          }
        } catch (error) {
          console.error("[agent/stream]", error instanceof Error ? error.message : error);
          controller.enqueue(
            toSSE({
              type: "error",
              message: clientSafeError(error, "流式处理失败，请稍后重试"),
            }),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    console.error("[agent/stream]", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "请求处理失败，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
