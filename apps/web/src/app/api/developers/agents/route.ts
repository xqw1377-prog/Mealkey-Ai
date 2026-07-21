import { NextResponse } from "next/server";

import { requireAuth, AuthError } from "@/lib/auth-helpers";
import {
  DeveloperAccessError,
  assertConsoleAccess,
  completionSteps,
  parseJsonArray,
  resolveDeveloperAccount,
} from "@/lib/developers/access";
import { LIFECYCLE_LABEL } from "@/lib/developers/capability-registry";
import { createPartnerAgent } from "@/lib/developers/agent-service";
import { prisma } from "@/lib/prisma";

function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
  }
  if (error instanceof DeveloperAccessError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error("[developers/agents]", error);
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "请求失败" },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const user = await requireAuth();
    const account = await resolveDeveloperAccount(user);
    assertConsoleAccess(account);

    const agents = await prisma.partnerAgentApplication.findMany({
      where: { developerAccountId: account.id },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { sandboxRuns: true, reviewTasks: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      account: {
        id: account.id,
        displayName: account.displayName,
        status: account.status,
        contactEmail: account.contactEmail,
      },
      agents: agents.map((app) => {
        const completion = completionSteps(app);
        return {
          id: app.id,
          agentId: app.agentId,
          name: app.name,
          category: app.category,
          capabilityIds: parseJsonArray(app.capabilityIds),
          runtimeMode: app.runtimeMode,
          endpointUrl: app.endpointUrl,
          lifecycleStatus: app.lifecycleStatus,
          lifecycleLabel: LIFECYCLE_LABEL[app.lifecycleStatus] ?? app.lifecycleStatus,
          qualityScore: app.qualityScore,
          version: app.versions[0]?.version ?? null,
          completion,
          updatedAt: app.updatedAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const account = await resolveDeveloperAccount(user);
    assertConsoleAccess(account);

    const body = (await request.json()) as {
      name?: string;
      agentId?: string;
      category?: string;
      capabilityIds?: string[];
      endpointUrl?: string;
    };
    const created = await createPartnerAgent(account.id, body);
    return NextResponse.json({ ok: true, ...created });
  } catch (error) {
    return jsonError(error);
  }
}
