import { NextResponse } from "next/server";

import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  AGENT_CATALOG,
  ensureDefaultPlans,
  getBillingSnapshot,
  getPlanCommercialMeta,
} from "@/server/services/billing.service";
import { getPaymentMode } from "@/server/services/payment.service";

export async function GET() {
  try {
    const authUser = await requireAuth();
    await ensureDefaultPlans(prisma);

    const [plans, snapshot] = await Promise.all([
      prisma.plan.findMany({
        where: { status: "active" },
        orderBy: { priceCents: "asc" },
      }),
      getBillingSnapshot(prisma, authUser.id),
    ]);

    const categorized = {
      platform: plans.filter((plan) => getPlanCommercialMeta(plan).kind === "platform"),
      agentAddons: plans.filter((plan) => getPlanCommercialMeta(plan).kind === "agent_addon"),
      creditPacks: plans.filter((plan) => getPlanCommercialMeta(plan).kind === "credit_pack"),
    };

    return NextResponse.json({
      ok: true,
      mode: getPaymentMode(),
      agentCatalog: AGENT_CATALOG,
      plans,
      categorized,
      snapshot: {
        plan: snapshot.plan,
        planMeta: snapshot.planMeta,
        periodRunsUsed: snapshot.periodRunsUsed,
        periodRunsLimit: snapshot.periodRunsLimit,
        remainingRuns: snapshot.remainingRuns,
        balanceCents: snapshot.balanceCents,
        overageRunCents: snapshot.overageRunCents,
        hybrid: snapshot.hybrid,
        usageByAgent: snapshot.usageByAgent,
        entitlements: snapshot.entitlements.map((item) => ({
          agentCode: item.agentCode,
          status: item.status,
          source: item.source,
          endsAt: item.endsAt,
        })),
        activeSubscription: {
          id: snapshot.activeSubscription.id,
          status: snapshot.activeSubscription.status,
          currentPeriodEnd: snapshot.activeSubscription.currentPeriodEnd,
        },
        account: {
          id: snapshot.account.id,
          name: snapshot.account.name,
          balance: snapshot.account.balance,
          currency: snapshot.account.currency,
        },
      },
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "获取套餐失败" },
      { status: 400 },
    );
  }
}
