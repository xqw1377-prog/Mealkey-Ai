import {
  gatewayErrorResponse,
  gatewayJson,
  gatewayPathFromUrl,
  getInstallStatus,
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
    const agent = await verifyAgentSignature({
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
    const user = verifyUserAccessToken(request.headers.get("authorization"));

    const registered = agent;
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurantId") || "";

    if (user.mode === "sandbox") {
      return gatewayJson({
        installed: Boolean(restaurantId.trim()),
        scopesGranted: registered.allowedScopes,
        maxInsightLevel: registered.maxInsightLevel,
        mode: user.mode,
      });
    }

    const status = await getInstallStatus({
      agentId,
      restaurantId,
      ownerId: user.ownerId,
    });

    return gatewayJson({
      installed: status.installed,
      scopesGranted: status.installed ? registered.allowedScopes : [],
      maxInsightLevel: registered.maxInsightLevel,
      reason: status.reason,
      mode: user.mode,
    });
  } catch (error) {
    return gatewayErrorResponse(error);
  }
}
