import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/server/services/payment.service";
import { verifyAlipayNotify } from "@/server/services/payment/alipay";

async function parseAlipayParams(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || "";
  const params: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    }
    return params;
  }

  const text = await request.text();
  const search = new URLSearchParams(text);
  for (const [key, value] of search.entries()) {
    params[key] = value;
  }
  return params;
}

export async function POST(request: Request) {
  try {
    const params = await parseAlipayParams(request);
    const parsed = verifyAlipayNotify(params);

    if (parsed.success) {
      await markOrderPaid(prisma, {
        orderNo: parsed.orderNo,
        providerTradeNo: parsed.tradeNo,
        channel: "alipay",
      });
    }

    return new NextResponse("success", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return new NextResponse((error as Error).message || "fail", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
