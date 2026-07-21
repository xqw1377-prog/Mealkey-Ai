import {
  SANDBOX_FIXTURES,
  gatewayErrorResponse,
  gatewayJson,
  gatewayPathFromUrl,
  verifyAgentSignature,
} from "@/server/agent-platform-gateway";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ fixtureId: string }> },
) {
  try {
    const { fixtureId } = await ctx.params;
    const path = gatewayPathFromUrl(request.url);
    verifyAgentSignature({
      method: "GET",
      path,
      body: "",
      agentId: request.headers.get("x-agent-id"),
      timestamp: request.headers.get("x-timestamp"),
      signature: request.headers.get("x-signature"),
    });

    const fixture = SANDBOX_FIXTURES[fixtureId];
    if (!fixture) {
      return gatewayJson(
        { ok: false, code: "SCHEMA_INVALID", message: `未知 fixture: ${fixtureId}` },
        404,
      );
    }
    return gatewayJson(fixture);
  } catch (error) {
    return gatewayErrorResponse(error);
  }
}
