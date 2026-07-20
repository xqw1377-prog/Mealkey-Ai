import { NextResponse } from "next/server";

import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  AGENT_CATALOG,
  ensureDefaultPlans,
  getBillingSnapshot,
  getPlanCommercialMeta,
} from "@/server/services/billing.service";
import { getWalletSnapshot, listRecentPointSpend } from "@/server/services/business-points.service";
import { getPaymentMode } from "@/server/services/payment.service";

export async function GET() {
  try {
    const authUser = await requireAuth();
    await ensureDefaultPlans(prisma);

    const [plans, snapshot, wallet, recentLedger] = await Promise.all([
      prisma.plan.findMany({
        where: { status: "active" },
        orderBy: { priceCents: "asc" },
      }),
      getBillingSnapshot(prisma, authUser.id),
      getWalletSnapshot(prisma, authUser.id),
      listRecentPointSpend(prisma, authUser.id, 20),
    ]);

    const categorized = {
      platform: plans.filter((plan) => getPlanCommercialMeta(plan).kind === "platform"),
      specialtyPacks: plans.filter(
        (plan) =>
          getPlanCommercialMeta(plan).kind === "specialty_pack" ||
          getPlanCommercialMeta(plan).kind === "agent_addon",
      ),
      creditPacks: plans.filter((plan) => getPlanCommercialMeta(plan).kind === "credit_pack"),
    };

    return NextResponse.json({
      ok: true,
      mode: getPaymentMode(),
      agentCatalog: AGENT_CATALOG,
      plans,
      categorized: {
        ...categorized,
        agentAddons: categorized.specialtyPacks,
      },
      wallet: {
        businessPoints: wallet.businessPoints,
        monthAnalyses: wallet.monthAnalyses,
        hoursSaved: wallet.hoursSaved,
        estimateDeep: wallet.estimateDeep,
        estimateConsult: wallet.estimateConsult,
        valueArchive: wallet.valueArchive,
        recentLedger: recentLedger.map((row) => ({
          id: row.id,
          entryType: row.entryType,
          amount: row.amount,
          description: row.description,
          sourceId: row.sourceId,
          createdAt: row.createdAt,
        })),
      },
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
        businessPoints: wallet.businessPoints,
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
      { ok: false, error: (error as Error).message || "获取经营点失败" },
      { status: 400 },
    );
  }
}
