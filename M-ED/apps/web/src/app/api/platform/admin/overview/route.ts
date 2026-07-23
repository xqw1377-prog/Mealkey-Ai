import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { getPlatformAdminOverview } from "@/server/services/platform-admin.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const overview = await getPlatformAdminOverview(prisma);
    return NextResponse.json({ ok: true, overview });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
