import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/server/services/payment.service";
import { verifyAndParseWechatNotify } from "@/server/services/payment/wechat-pay";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const parsed = verifyAndParseWechatNotify(request.headers, rawBody);

    if (parsed.success) {
      await markOrderPaid(prisma, {
        orderNo: parsed.orderNo,
        providerTradeNo: parsed.tradeNo,
        channel: "wechat",
      });
    }

    return NextResponse.json({ code: "SUCCESS", message: "成功" });
  } catch (error) {
    return NextResponse.json(
      {
        code: "FAIL",
        message: (error as Error).message || "微信支付回调处理失败",
      },
      { status: 400 },
    );
  }
}
