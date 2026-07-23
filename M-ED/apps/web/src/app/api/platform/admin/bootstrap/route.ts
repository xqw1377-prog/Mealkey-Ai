import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { ensurePlatformAdminSeed, getPlatformAdminOverview } from "@/server/services/platform-admin.service";

export async function POST() {
  try {
    await requirePlatformAdmin();
    await ensurePlatformAdminSeed(prisma);
    const overview = await getPlatformAdminOverview(prisma);
    return NextResponse.json({ ok: true, overview });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
