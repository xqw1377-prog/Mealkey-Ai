import { NextResponse } from "next/server";

import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  confirmSandboxPayment,
  getPaymentMode,
  isProductionSandboxAllowed,
} from "@/server/services/payment.service";

export async function POST(request: Request) {
  try {
    if (
      process.env.NODE_ENV === "production" &&
      !isProductionSandboxAllowed()
    ) {
      return NextResponse.json(
        { ok: false, error: "生产环境禁止沙箱支付确认" },
        { status: 403 },
      );
    }

    const authUser = await requireAuth();

    if (getPaymentMode() !== "sandbox") {
      return NextResponse.json({ ok: false, error: "仅沙箱模式可确认模拟支付" }, { status: 403 });
    }

    const body = (await request.json()) as { orderNo?: string };
    const orderNo = typeof body.orderNo === "string" ? body.orderNo.trim() : "";
    if (!orderNo) {
      return NextResponse.json({ ok: false, error: "缺少 orderNo" }, { status: 400 });
    }

    const result = await confirmSandboxPayment(prisma, {
      userId: authUser.id,
      orderNo,
    });

    return NextResponse.json({
      ok: true,
      alreadyPaid: result.alreadyPaid,
      order: result.order,
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "沙箱确认失败" },
      { status: 400 },
    );
  }
}
