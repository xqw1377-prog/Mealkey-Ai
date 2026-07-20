import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { enforcePlatformAdminWriteRateLimit, platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { getPlatformAdminLearningDomain, parsePlatformAdminPaginationFromUrl, reviewLearningRecord } from "@/server/services/platform-admin.service";
import { recordPlatformAdminAudit } from "@/server/services/admin-audit.service";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const pagination = parsePlatformAdminPaginationFromUrl(new URL(request.url));
    const domain = await getPlatformAdminLearningDomain(prisma, pagination);
    return NextResponse.json({
      ok: true,
      learning: domain.learning,
      cognitive: domain.cognitive,
      learningQueue: domain.learningQueue,
      cognitiveSessions: domain.cognitiveSessions,
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
    const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "learning.review");
    if (limited) return limited;
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

    await recordPlatformAdminAudit(prisma, user, {
      route: "/api/platform/admin/learning",
      action: `learning.${body.status}`,
      targetType: "learning_record",
      targetId: learningRecord.id,
      input: {
        id: body.id,
        status: body.status,
        weightDelta: body.weightDelta ?? null,
      },
      result: {
        id: learningRecord.id,
        status: learningRecord.status,
        memoryResult: learningRecord.memoryResult ?? null,
      },
    });

    return NextResponse.json({ ok: true, learningRecord });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
