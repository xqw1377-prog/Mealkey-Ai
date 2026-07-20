import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { getConsultingEngineHealth } from "@/server/services/engine-health.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const health = await getConsultingEngineHealth();
    return NextResponse.json({ ok: true, health });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
