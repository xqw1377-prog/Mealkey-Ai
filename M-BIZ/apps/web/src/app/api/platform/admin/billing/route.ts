import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import {
  createPlatformPlan,
  createPlatformSubscription,
  getPlatformAdminOverview,
  updatePlatformSubscription,
} from "@/server/services/platform-admin.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const overview = await getPlatformAdminOverview(prisma);
    return NextResponse.json({
      ok: true,
      plans: overview.plans,
      subscriptions: overview.subscriptions,
      invoices: overview.invoices,
      summary: overview.summary,
    });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "create_subscription") {
      const billingAccountId =
        typeof body.billingAccountId === "string" ? body.billingAccountId : "";
      const planId = typeof body.planId === "string" ? body.planId : "";
      const seats = typeof body.seats === "number" ? body.seats : undefined;

      if (!billingAccountId || !planId) {
        return NextResponse.json({ ok: false, error: "billingAccountId 和 planId 必填" }, { status: 400 });
      }

      const subscription = await createPlatformSubscription(prisma, {
        billingAccountId,
        planId,
        seats,
      });

      return NextResponse.json({ ok: true, subscription });
    }

    if (body.action === "update_subscription") {
      const id = typeof body.id === "string" ? body.id : "";
      const status = typeof body.status === "string" ? body.status : "";
      const seats = typeof body.seats === "number" ? body.seats : undefined;
      const cancelAtPeriodEnd =
        typeof body.cancelAtPeriodEnd === "boolean" ? body.cancelAtPeriodEnd : false;

      if (!id || !status) {
        return NextResponse.json({ ok: false, error: "id 和 status 必填" }, { status: 400 });
      }

      const subscription = await updatePlatformSubscription(prisma, {
        id,
        status,
        seats,
        cancelAtPeriodEnd,
      });

      return NextResponse.json({ ok: true, subscription });
    }

    const code = typeof body.code === "string" ? body.code : "";
    const name = typeof body.name === "string" ? body.name : "";
    const priceCents = typeof body.priceCents === "number" ? body.priceCents : undefined;
    const billingCycle = typeof body.billingCycle === "string" ? body.billingCycle : undefined;
    const currency = typeof body.currency === "string" ? body.currency : undefined;

    if (!code || !name) {
      return NextResponse.json({ ok: false, error: "code 和 name 必填" }, { status: 400 });
    }

    const plan = await createPlatformPlan(prisma, {
      code,
      name,
      priceCents,
      billingCycle,
      currency,
    });

    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
