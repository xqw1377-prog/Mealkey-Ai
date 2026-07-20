import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { enforcePlatformAdminWriteRateLimit, platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { ensurePlatformAdminSeed, getPlatformAdminOverview } from "@/server/services/platform-admin.service";
import { recordPlatformAdminAudit } from "@/server/services/admin-audit.service";

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "生产环境禁止执行 bootstrap 种子操作" },
        { status: 403 },
      );
    }

    const user = await requirePlatformAdmin();
    const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "bootstrap.seed", 4, 60_000);
    if (limited) return limited;
    await ensurePlatformAdminSeed(prisma);
    const overview = await getPlatformAdminOverview(prisma, { mode: "summary" });
    await recordPlatformAdminAudit(prisma, user, {
      route: "/api/platform/admin/bootstrap",
      action: "bootstrap.seed",
      targetType: "platform_admin_seed",
      result: {
        generatedAt: overview.generatedAt,
      },
    });
    return NextResponse.json({ ok: true, overview });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
