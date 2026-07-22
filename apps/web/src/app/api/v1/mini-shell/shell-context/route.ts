import { NextResponse } from "next/server";
import {
  buildBrainHandoffUrl,
  buildShellContextV1,
  M_OPS_DIAG_AGENT_ID,
  mOpsBillingManifestV1,
} from "@mealkey/agent-sdk/mini-shell";

type Body = {
  agentId?: string;
  session?: {
    userId?: string;
    status?: "guest" | "bound" | "member";
    wechatOpenId?: string;
  };
  restaurant?: {
    localProfileId?: string;
    mealkeyRestaurantId?: string;
    name?: string;
    city?: string;
    category?: string;
  };
  fuelBalance?: number;
};

/**
 * POST /api/v1/mini-shell/shell-context
 * Builds ShellContextV1 for PluginHost.open (S1/S2).
 * Real WeChat code2session + Entitlement deepen in later slices.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "invalid json" }, { status: 400 });
  }

  const agentId = body.agentId?.trim() || M_OPS_DIAG_AGENT_ID;
  const userId = body.session?.userId?.trim();
  const wechatOpenId = body.session?.wechatOpenId?.trim();
  const name = body.restaurant?.name?.trim();

  if (!userId || !wechatOpenId || !name) {
    return NextResponse.json(
      { ok: false, message: "session.userId / wechatOpenId / restaurant.name required" },
      { status: 400 },
    );
  }

  const cost =
    mOpsBillingManifestV1.priceTable.find((p) => p.skillOrActionId.includes("diagnosis"))
      ?.costPoints ?? 100;

  const osOrigin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.MK_OS_ORIGIN?.replace(/\/$/, "") ||
    "http://127.0.0.1:3000";

  const context = buildShellContextV1({
    userId,
    status: body.session?.status ?? "guest",
    wechatOpenId,
    restaurant: {
      localProfileId: body.restaurant?.localProfileId?.trim() || `rp_${userId}`,
      mealkeyRestaurantId: body.restaurant?.mealkeyRestaurantId,
      name,
      city: body.restaurant?.city,
      category: body.restaurant?.category,
    },
    agentId,
    installed: true,
    balancePoints: typeof body.fuelBalance === "number" ? body.fuelBalance : 500,
    estimatedCostPoints: cost,
    userAccessToken: `shell_dev_${userId}`,
  });

  return NextResponse.json({
    ok: true,
    context,
    handoffUrl: buildBrainHandoffUrl({
      osOrigin,
      restaurantId: context.restaurant.mealkeyRestaurantId,
      focus: "profile",
    }),
    primaryCta: "进入 MealKey 经营大脑",
  });
}
