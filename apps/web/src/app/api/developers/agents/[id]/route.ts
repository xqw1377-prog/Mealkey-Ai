import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-helpers";
import {
  DeveloperAccessError,
  assertConsoleAccess,
  completionSteps,
  resolveDeveloperAccount,
} from "@/lib/developers/access";
import {
  getOwnedAgent,
  serializeAgentDetail,
  updatePartnerAgent,
} from "@/lib/developers/agent-service";
import { LIFECYCLE_LABEL } from "@/lib/developers/capability-registry";
import { prisma } from "@/lib/prisma";

function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
  }
  if (error instanceof DeveloperAccessError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error("[developers/agents/id]", error);
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "请求失败" },
    { status: 500 },
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const account = await resolveDeveloperAccount(user);
    assertConsoleAccess(account);
    const app = await getOwnedAgent(account.id, id);
    const completion = completionSteps(app);
    let listingSlug: string | null = null;
    if (app.listingId) {
      const listing = await prisma.agentListing.findUnique({
        where: { id: app.listingId },
        select: { slug: true },
      });
      listingSlug = listing?.slug ?? null;
    }
    return NextResponse.json({
      ok: true,
      agent: {
        ...serializeAgentDetail(app, listingSlug),
        lifecycleLabel: LIFECYCLE_LABEL[app.lifecycleStatus] ?? app.lifecycleStatus,
        completion,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const account = await resolveDeveloperAccount(user);
    assertConsoleAccess(account);
    const body = (await request.json()) as {
      endpointUrl?: string;
      webhookUrl?: string | null;
    };
    const updated = await updatePartnerAgent(account.id, id, body);
    return NextResponse.json({
      ok: true,
      agent: {
        id: updated.id,
        endpointUrl: updated.endpointUrl,
        webhookUrl: updated.webhookUrl,
        lifecycleStatus: updated.lifecycleStatus,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
