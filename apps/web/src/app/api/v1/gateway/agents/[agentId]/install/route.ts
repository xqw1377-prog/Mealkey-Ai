import {
  gatewayErrorResponse,
  gatewayJson,
  gatewayPathFromUrl,
  resolveAgent,
  verifyAgentSignature,
  verifyUserAccessToken,
} from "@/server/agent-platform-gateway";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await ctx.params;
    const path = gatewayPathFromUrl(request.url);
    const agent = verifyAgentSignature({
      method: "GET",
      path,
      body: "",
      agentId: request.headers.get("x-agent-id") || agentId,
      timestamp: request.headers.get("x-timestamp"),
      signature: request.headers.get("x-signature"),
    });
    if (agent.agentId !== agentId) {
      return gatewayJson(
        { ok: false, code: "AUTH_EXPIRED", message: "agentId 不匹配" },
        401,
      );
    }
    verifyUserAccessToken(request.headers.get("authorization"));

    const registered = resolveAgent(agentId);
    if (!registered) {
      return gatewayJson(
        {
          installed: false,
          scopesGranted: [],
          maxInsightLevel: 1,
        },
        200,
      );
    }

    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurantId") || "";
    return gatewayJson({
      installed: !!restaurantId.trim(),
      scopesGranted: registered.allowedScopes,
      maxInsightLevel: registered.maxInsightLevel,
    });
  } catch (error) {
    return gatewayErrorResponse(error);
  }
}
