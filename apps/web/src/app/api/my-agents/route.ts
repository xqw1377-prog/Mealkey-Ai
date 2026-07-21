import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-helpers";
import {
  listMyInstalledAgents,
  revokeInstalledAgent,
} from "@/lib/store/store-service";

export async function GET() {
  try {
    const user = await requireAuth();
    const agents = await listMyInstalledAgents(user.id);
    return NextResponse.json({ ok: true, agents });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as { action?: string; entitlementId?: string };
    if (body.action !== "revoke") {
      return NextResponse.json({ ok: false, error: "仅支持 action=revoke" }, { status: 400 });
    }
    const entitlementId = typeof body.entitlementId === "string" ? body.entitlementId : "";
    if (!entitlementId) {
      return NextResponse.json({ ok: false, error: "entitlementId 必填" }, { status: 400 });
    }
    const result = await revokeInstalledAgent({
      userId: user.id,
      entitlementId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "操作失败" },
      { status: 400 },
    );
  }
}
