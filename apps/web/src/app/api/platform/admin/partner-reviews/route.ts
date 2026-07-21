import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { DeveloperAccessError } from "@/lib/developers/access";
import {
  decidePartnerReview,
  listPartnerReviewTasks,
} from "@/lib/developers/publish-service";
import { enforcePlatformAdminWriteRateLimit, platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import { recordPlatformAdminAudit } from "@/server/services/admin-audit.service";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const reviews = await listPartnerReviewTasks({ status: status || undefined });
    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformAdmin();
    const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "partner-review.decide");
    if (limited) return limited;

    const body = (await request.json()) as {
      reviewTaskId?: string;
      action?: string;
      decisionNote?: string;
    };

    const reviewTaskId = typeof body.reviewTaskId === "string" ? body.reviewTaskId : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";
    if (!reviewTaskId) {
      return NextResponse.json({ ok: false, error: "reviewTaskId 必填" }, { status: 400 });
    }
    if (action !== "approve" && action !== "changes_requested" && action !== "reject") {
      return NextResponse.json(
        { ok: false, error: "action 仅支持 approve / changes_requested / reject" },
        { status: 400 },
      );
    }

    const result = await decidePartnerReview({
      reviewTaskId,
      action,
      reviewerUserId: user.id,
      decisionNote: typeof body.decisionNote === "string" ? body.decisionNote : undefined,
    });

    await recordPlatformAdminAudit(prisma, user, {
      route: "/api/platform/admin/partner-reviews",
      action: `partner_review.${action}`,
      targetType: "partner_review_task",
      targetId: reviewTaskId,
      input: {
        reviewTaskId,
        action,
        decisionNote: body.decisionNote ?? null,
      },
      result: {
        status: result.task.status,
        published: result.published,
      },
    });

    return NextResponse.json({
      ok: true,
      task: {
        id: result.task.id,
        status: result.task.status,
        decisionNote: result.task.decisionNote,
        resolvedAt: result.task.resolvedAt?.toISOString() ?? null,
      },
      published: result.published,
    });
  } catch (error) {
    if (error instanceof DeveloperAccessError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return platformAdminErrorResponse(error);
  }
}
