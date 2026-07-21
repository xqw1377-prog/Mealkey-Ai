import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { enforcePlatformAdminWriteRateLimit, platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { createPlatformOrganization, getPlatformAdminObjectsDomain, parsePlatformAdminPaginationFromUrl } from "@/server/services/platform-admin.service";
import { recordPlatformAdminAudit } from "@/server/services/admin-audit.service";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const pagination = parsePlatformAdminPaginationFromUrl(new URL(request.url));
    const domain = await getPlatformAdminObjectsDomain(prisma, pagination);
    return NextResponse.json({
      ok: true,
      objects: domain.objects,
      organizations: domain.organizations,
      billingAccounts: domain.billingAccounts,
      summary: domain.summary,
      pagination: domain.pagination,
    });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformAdmin();
    const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "organizations.create");
    if (limited) return limited;
    const body = (await request.json()) as {
      name?: string;
      ownerUserId?: string | null;
      type?: string;
      planId?: string | null;
      seats?: number;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "组织名称不能为空" }, { status: 400 });
    }

    const created = await createPlatformOrganization(prisma, {
      name: body.name.trim(),
      ownerUserId: body.ownerUserId ?? null,
      type: body.type,
      planId: typeof body.planId === "string" && body.planId.trim().length > 0 ? body.planId.trim() : null,
      seats: typeof body.seats === "number" && Number.isFinite(body.seats) ? body.seats : undefined,
    });

    await recordPlatformAdminAudit(prisma, user, {
      route: "/api/platform/admin/organizations",
      action: "organization.create",
      targetType: "organization",
      targetId: created.id,
      input: {
        name: body.name.trim(),
        ownerUserId: body.ownerUserId ?? null,
        type: body.type ?? null,
        planId: body.planId ?? null,
        seats: typeof body.seats === "number" && Number.isFinite(body.seats) ? body.seats : null,
      },
      result: {
        id: created.id,
        slug: created.slug,
        billingAccountId: created.billingAccountId ?? null,
        memberId: created.memberId ?? null,
        subscriptionId: created.subscriptionId ?? null,
      },
    });

    return NextResponse.json({ ok: true, organization: created });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
