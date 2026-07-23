import { NextResponse } from "next/server";

import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOrderForUser } from "@/server/services/payment.service";

export async function GET(
  _request: Request,
  context: { params: { orderId: string } },
) {
  try {
    const authUser = await requireAuth();
    const orderId = context.params.orderId;
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "缺少订单标识" }, { status: 400 });
    }

    const order = await getOrderForUser(prisma, authUser.id, orderId);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "查询订单失败" },
      { status: 400 },
    );
  }
}
