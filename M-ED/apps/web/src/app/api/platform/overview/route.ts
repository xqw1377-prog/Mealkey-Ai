import { NextResponse } from "next/server";

import { forbiddenResponse, requirePlatformAdmin, unauthorizedResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPlatformOverview } from "@/server/services/platform-dashboard.service";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const hoursParam = searchParams.get("hours");
    const hours = hoursParam ? Number(hoursParam) : undefined;

    const overview = await getPlatformOverview(prisma, { hours });

    return NextResponse.json({
      ok: true,
      overview,
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      if ((error as Error)?.message === "请先登录") {
        return unauthorizedResponse();
      }

      return forbiddenResponse((error as Error).message);
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "平台概览读取失败",
      },
      { status: 500 },
    );
  }
}
