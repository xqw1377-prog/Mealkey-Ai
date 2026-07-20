import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { buildProductAcceptanceReport } from "@/server/services/product-acceptance.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const report = await buildProductAcceptanceReport();
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
