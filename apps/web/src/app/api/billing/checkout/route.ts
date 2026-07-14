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
    };

    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const channel = body.channel === "wechat" || body.channel === "alipay" ? body.channel : null;

    if (!planId) {
      return NextResponse.json({ ok: false, error: "请选择套餐" }, { status: 400 });
    }
    if (!channel) {
      return NextResponse.json({ ok: false, error: "请选择支付渠道：wechat 或 alipay" }, { status: 400 });
    }

    const result = await createCheckout(prisma, {
      userId: authUser.id,
      planId,
      channel,
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
