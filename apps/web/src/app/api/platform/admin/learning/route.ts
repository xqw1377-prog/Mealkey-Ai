import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { getPlatformAdminOverview, reviewLearningRecord } from "@/server/services/platform-admin.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const overview = await getPlatformAdminOverview(prisma);
    return NextResponse.json({
      ok: true,
      learningQueue: overview.learningQueue,
      cognitiveSessions: overview.cognitiveSessions,
      summary: overview.summary,
    });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const body = (await request.json()) as {
      id?: string;
      status?: "approved" | "rejected";
      weightDelta?: number | null;
    };

    if (!body.id || !body.status) {
      return NextResponse.json({ ok: false, error: "id 和 status 必填" }, { status: 400 });
    }

    const learningRecord = await reviewLearningRecord(prisma, {
      id: body.id,
      status: body.status,
      weightDelta: body.weightDelta,
    });

    return NextResponse.json({ ok: true, learningRecord });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
