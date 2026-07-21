import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-helpers";
import { installStoreListing } from "@/lib/store/store-service";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as { listingId?: string; slug?: string };
    const key =
      (typeof body.listingId === "string" && body.listingId.trim()) ||
      (typeof body.slug === "string" && body.slug.trim()) ||
      "";
    if (!key) {
      return NextResponse.json({ ok: false, error: "listingId 或 slug 必填" }, { status: 400 });
    }

    const result = await installStoreListing({
      userId: user.id,
      listingIdOrSlug: key,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message: result.alreadyInstalled
        ? "已安装，可在 /my-agents 管理"
        : result.settlement
          ? `已用 ${result.settlement.pointsCharged} 经营点结算并安装`
          : "免费安装成功（授权写入 Entitlement）",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "安装失败";
    const status = message.includes("引导") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
