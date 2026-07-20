import { NextResponse } from "next/server";

import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createCheckout, getPaymentMode } from "@/server/services/payment.service";

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth();
    const body = (await request.json()) as {
      planId?: string;
      channel?: string;
      preferWechatH5?: boolean;
      clientIp?: string;
    };

    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const channel = body.channel === "wechat" || body.channel === "alipay" ? body.channel : null;

    if (!planId) {
      return NextResponse.json({ ok: false, error: "请选择经营点包" }, { status: 400 });
    }
    if (!channel) {
      return NextResponse.json({ ok: false, error: "请选择支付渠道：wechat 或 alipay" }, { status: 400 });
    }

    const forwarded =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip");
    const clientIp =
      (typeof body.clientIp === "string" && body.clientIp.trim()) ||
      forwarded?.split(",")[0]?.trim() ||
      undefined;

    const result = await createCheckout(prisma, {
      userId: authUser.id,
      planId,
      channel,
      preferWechatH5: Boolean(body.preferWechatH5),
      clientIp,
    });

    return NextResponse.json({
      ok: true,
      mode: result.mode || getPaymentMode(),
      activated: result.activated,
      subscription: result.subscription,
      order: result.order,
      pay: result.pay,
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "创建支付失败" },
      { status: 400 },
    );
  }
}
