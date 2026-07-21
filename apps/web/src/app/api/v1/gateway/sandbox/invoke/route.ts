import {
  SANDBOX_FIXTURES,
  gatewayErrorResponse,
  gatewayJson,
  gatewayPathFromUrl,
  verifyAgentSignature,
} from "@/server/agent-platform-gateway";

/**
 * 薄封装：签名校验后返回 fixture Context（对齐 External Interface sandbox/invoke 叙述）
 * 不发明新协议字段；body.fixtureId 选择夹具。
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const path = gatewayPathFromUrl(request.url);
    await verifyAgentSignature({
      method: "POST",
      path,
      body: rawBody,
      agentId: request.headers.get("x-agent-id"),
      timestamp: request.headers.get("x-timestamp"),
      signature: request.headers.get("x-signature"),
    });

    const body = JSON.parse(rawBody || "{}") as { fixtureId?: string };
    const fixtureId = (body.fixtureId || "changsha-xiangcai-a").trim();
    const fixture = SANDBOX_FIXTURES[fixtureId];
    if (!fixture) {
      return gatewayJson(
        { ok: false, code: "SCHEMA_INVALID", message: `未知 fixture: ${fixtureId}` },
        404,
      );
    }

    return gatewayJson({
      ok: true,
      fixtureId,
      context: fixture,
      note: "sandbox/invoke V1：返回真 fixture Context，不写出站 Partner endpoint",
    });
  } catch (error) {
    return gatewayErrorResponse(error);
  }
}
