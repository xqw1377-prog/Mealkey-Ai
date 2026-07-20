import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { getCognitiveSessionTraces } from "@/server/services/platform-admin-inbox.service";

/** 认知会话 Trace 只读下钻 */
export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const sessionId = (url.searchParams.get("sessionId") ?? "").trim();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "sessionId 必填" }, { status: 400 });
    }
    const limitRaw = Number(url.searchParams.get("limit") ?? 40);
    const payload = await getCognitiveSessionTraces(
      prisma,
      sessionId,
      Number.isFinite(limitRaw) ? limitRaw : 40,
    );
    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
