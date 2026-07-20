import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { enforcePlatformAdminWriteRateLimit, platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import {
  listStalePendingOrders,
  reconcileStalePendingOrders,
} from "@/server/services/payment.service";
import {
  getLastReconcileStatus,
  recordReconcileStatus,
} from "@/server/services/reconcile-status";
import {
  createPlatformPlan,
  createPlatformSubscription,
  getPlatformAdminBusinessDomain,
  parsePlatformAdminPaginationFromUrl,
  updatePlatformSubscription,
} from "@/server/services/platform-admin.service";
import { recordPlatformAdminAudit } from "@/server/services/admin-audit.service";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const pagination = parsePlatformAdminPaginationFromUrl(url);
    const domain = await getPlatformAdminBusinessDomain(prisma, pagination);
    const includeStale = url.searchParams.get("stalePending") === "1";
    const stalePending = includeStale
      ? await listStalePendingOrders(prisma, { limit: 50 })
      : undefined;
    return NextResponse.json({
      ok: true,
      business: domain.business,
      objects: domain.objects,
      plans: domain.business.plans,
      subscriptions: domain.business.subscriptions,
      invoices: domain.business.invoices,
      summary: domain.summary,
      pagination: domain.pagination,
      lastReconcile: await getLastReconcileStatus(prisma),
      ...(stalePending
        ? {
            stalePending: {
              count: stalePending.length,
              orders: stalePending.map((o) => ({
                orderNo: o.orderNo,
                channel: o.channel,
                amountCents: o.amountCents,
                createdAt: o.createdAt,
                userId: o.userId,
              })),
            },
          }
        : {}),
    });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformAdmin();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "reconcile_stale_pending") {
      const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "billing.reconcile");
      if (limited) return limited;
      const dryRun = body.dryRun !== false;
      const olderThanMs =
        typeof body.olderThanMs === "number" && body.olderThanMs > 0
          ? body.olderThanMs
          : undefined;
      const result = await reconcileStalePendingOrders(prisma, {
        dryRun,
        olderThanMs,
        limit: 100,
      });
      const lastReconcile = await recordReconcileStatus(prisma, {
        source: "admin",
        dryRun,
        counted: result.counted,
        paid: result.paid,
        closed: result.closed,
        skipped: result.skipped,
      });
      await recordPlatformAdminAudit(prisma, user, {
        route: "/api/platform/admin/billing",
        action: "billing.reconcile_stale_pending",
        targetType: "payment_order",
        input: {
          dryRun,
          olderThanMs: olderThanMs ?? null,
        },
        result: {
          counted: result.counted,
          paid: result.paid,
          closed: result.closed,
          skipped: result.skipped,
        },
      });
      return NextResponse.json({ ok: true, reconcile: result, lastReconcile });
    }

    if (body.action === "create_subscription") {
      const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "billing.create_subscription");
      if (limited) return limited;
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

      await recordPlatformAdminAudit(prisma, user, {
        route: "/api/platform/admin/billing",
        action: "subscription.create",
        targetType: "subscription",
        targetId: subscription.id,
        input: {
          billingAccountId,
          planId,
          seats: seats ?? null,
        },
        result: {
          id: subscription.id,
          seats: seats ?? null,
        },
      });

      return NextResponse.json({ ok: true, subscription });
    }

    if (body.action === "update_subscription") {
      const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "billing.update_subscription");
      if (limited) return limited;
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

      await recordPlatformAdminAudit(prisma, user, {
        route: "/api/platform/admin/billing",
        action: "subscription.update",
        targetType: "subscription",
        targetId: subscription.id,
        input: {
          id,
          status,
          seats: seats ?? null,
          cancelAtPeriodEnd,
        },
        result: {
          id: subscription.id,
          status,
          seats: seats ?? null,
          cancelAtPeriodEnd,
        },
      });

      return NextResponse.json({ ok: true, subscription });
    }

    const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "billing.create_plan");
    if (limited) return limited;

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

    await recordPlatformAdminAudit(prisma, user, {
      route: "/api/platform/admin/billing",
      action: "plan.create",
      targetType: "plan",
      targetId: plan.id,
      input: {
        code,
        name,
        priceCents: priceCents ?? null,
        billingCycle: billingCycle ?? null,
        currency: currency ?? null,
      },
      result: {
        id: plan.id,
        code: plan.code,
      },
    });

    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
