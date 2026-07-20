/**
 * 支付漏单巡检 — 查渠道后：已付补发货 / 未付关单 / 查单失败跳过
 * 鉴权：Authorization: Bearer $CRON_SECRET 或 ?secret=
 * 预检：?dryRun=1
 */
import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { reconcileStalePendingOrders } from "@/server/services/payment.service";
import { recordReconcileStatus } from "@/server/services/reconcile-status";

export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const result = await reconcileStalePendingOrders(prisma, {
    dryRun,
    limit: 100,
  });
  const snapshot = await recordReconcileStatus(prisma, {
    source: "cron",
    dryRun,
    counted: result.counted,
    paid: result.paid,
    closed: result.closed,
    skipped: result.skipped,
  });

  return NextResponse.json({
    ok: true,
    reconcile: result,
    lastReconcile: snapshot,
    at: snapshot.at,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
