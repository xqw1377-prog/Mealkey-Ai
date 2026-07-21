import { prisma } from "@/lib/prisma";
import {
  assertInstalled,
  assembleContextPackage,
  gatewayErrorResponse,
  gatewayJson,
  gatewayPathFromUrl,
  parseScopes,
  verifyAgentSignature,
  verifyUserAccessToken,
  type ContextScope,
} from "@/server/agent-platform-gateway";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ restaurantId: string }> },
) {
  try {
    const { restaurantId } = await ctx.params;
    const path = gatewayPathFromUrl(request.url);
    const agent = await verifyAgentSignature({
      method: "GET",
      path,
      body: "",
      agentId: request.headers.get("x-agent-id"),
      timestamp: request.headers.get("x-timestamp"),
      signature: request.headers.get("x-signature"),
    });
    const user = verifyUserAccessToken(request.headers.get("authorization"));
    await assertInstalled({
      agentId: agent.agentId,
      restaurantId,
      userMode: user.mode,
      ownerId: user.ownerId,
    });

    const url = new URL(request.url);
    const scopes = parseScopes(url.searchParams.get("scope")) as ContextScope[];

    const project =
      user.mode === "sandbox"
        ? null
        : await prisma.project.findUnique({
            where: { id: restaurantId },
            select: {
              id: true,
              name: true,
              city: true,
              district: true,
              category: true,
              stage: true,
              profile: true,
            },
          });

    // sandbox 无项目时仍可按空项目 + fixture 风格组装；有项目则用真实 profile
    const pkg = assembleContextPackage({
      restaurantId,
      requestedScopes: scopes,
      agent,
      project:
        project ||
        (user.mode === "sandbox"
          ? {
              id: restaurantId,
              name: "Sandbox Restaurant",
              city: "长沙",
              district: "岳麓区",
              category: "湘菜",
              stage: "growth",
              profile: null,
            }
          : null),
    });

    if (!project && user.mode !== "sandbox" && user.mode !== "dev_open") {
      return gatewayJson(
        { ok: false, code: "SCOPE_DENIED", message: "餐厅不存在或未授权" },
        403,
      );
    }

    return gatewayJson(pkg);
  } catch (error) {
    return gatewayErrorResponse(error);
  }
}
