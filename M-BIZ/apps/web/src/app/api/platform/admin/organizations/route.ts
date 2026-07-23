import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { createPlatformOrganization, getPlatformAdminOverview } from "@/server/services/platform-admin.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const overview = await getPlatformAdminOverview(prisma);
    return NextResponse.json({ ok: true, organizations: overview.organizations, summary: overview.summary });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const body = (await request.json()) as { name?: string; ownerUserId?: string | null; type?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "组织名称不能为空" }, { status: 400 });
    }

    const created = await createPlatformOrganization(prisma, {
      name: body.name.trim(),
      ownerUserId: body.ownerUserId ?? null,
      type: body.type,
    });

    return NextResponse.json({ ok: true, organization: created });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
