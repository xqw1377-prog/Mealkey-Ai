import { prisma } from "@/lib/prisma";
import {
  assertInstalled,
  gatewayErrorResponse,
  gatewayJson,
  gatewayPathFromUrl,
  mergeIngressIntoProfile,
  validateAndProjectIngress,
  verifyAgentSignature,
  verifyUserAccessToken,
  type IngressBatchV1,
} from "@/server/agent-platform-gateway";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const path = gatewayPathFromUrl(request.url);
    const agent = await verifyAgentSignature({
      method: "POST",
      path,
      body: rawBody,
      agentId: request.headers.get("x-agent-id"),
      timestamp: request.headers.get("x-timestamp"),
      signature: request.headers.get("x-signature"),
    });
    const user = verifyUserAccessToken(request.headers.get("authorization"));

    const body = JSON.parse(rawBody || "{}") as IngressBatchV1;
    if (!body.restaurantId || !body.invokeId || !Array.isArray(body.items)) {
      return gatewayJson(
        {
          ok: false,
          code: "SCHEMA_INVALID",
          message: "restaurantId/invokeId/items required",
        },
        422,
      );
    }
    if (body.agentId && body.agentId !== agent.agentId) {
      return gatewayJson(
        { ok: false, code: "AUTH_EXPIRED", message: "agentId 与签名不一致" },
        401,
      );
    }
    body.agentId = agent.agentId;

    await assertInstalled({
      agentId: agent.agentId,
      restaurantId: body.restaurantId,
      userMode: user.mode,
      ownerId: user.ownerId,
    });

    let prior = new Set<string>();
    let profileObj: Record<string, unknown> = {};
    const project =
      user.mode === "sandbox"
        ? null
        : await prisma.project.findUnique({
            where: { id: body.restaurantId },
            select: { id: true, profile: true },
          });

    if (project?.profile) {
      try {
        profileObj = JSON.parse(project.profile) as Record<string, unknown>;
      } catch {
        profileObj = {};
      }
      const prev = Array.isArray(profileObj.agentGatewayIngress)
        ? (profileObj.agentGatewayIngress as Array<{ invokeId?: string }>)
        : [];
      prior = new Set(
        prev.map((e) => e.invokeId).filter((id): id is string => !!id),
      );
    }

    const ack = validateAndProjectIngress({
      batch: body,
      agent,
      priorInvokeIds: prior,
    });

    if (project && ack.accepted.length > 0) {
      const nextProfile = mergeIngressIntoProfile(profileObj, body, ack);
      await prisma.project.update({
        where: { id: project.id },
        data: { profile: JSON.stringify(nextProfile) },
      });
    }

    return gatewayJson(ack, ack.ok || ack.accepted.length > 0 ? 200 : 422);
  } catch (error) {
    return gatewayErrorResponse(error);
  }
}
