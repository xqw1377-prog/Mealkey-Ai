import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { protectedProcedure, router } from "../trpc";
import {
  AGENT_CATALOG,
  ensureDefaultPlans,
  getBillingSnapshot,
  getPlanCommercialMeta,
} from "@/server/services/billing.service";
import {
  getWalletSnapshot,
  listRecentPointSpend,
} from "@/server/services/business-points.service";
import {
  confirmSandboxPayment,
  createCheckout,
  getOrderForUser,
  getPaymentMode,
} from "@/server/services/payment.service";

/**
 * 经营点 / 计费 — 供前端钱包页使用（替代 raw fetch）
 */
export const billingRouter = router({
  getPlansAndWallet: protectedProcedure.query(async ({ ctx }) => {
    await ensureDefaultPlans(prisma);

    const [plans, snapshot, wallet, recentLedger] = await Promise.all([
      prisma.plan.findMany({
        where: { status: "active" },
        orderBy: { priceCents: "asc" },
      }),
      getBillingSnapshot(prisma, ctx.userId),
      getWalletSnapshot(prisma, ctx.userId),
      listRecentPointSpend(prisma, ctx.userId, 20),
    ]);

    const specialtyPacks = plans.filter(
      (plan) =>
        getPlanCommercialMeta(plan).kind === "specialty_pack" ||
        getPlanCommercialMeta(plan).kind === "agent_addon",
    );

    return {
      mode: getPaymentMode(),
      agentCatalog: AGENT_CATALOG,
      plans,
      categorized: {
        platform: plans.filter((plan) => getPlanCommercialMeta(plan).kind === "platform"),
        specialtyPacks,
        creditPacks: plans.filter((plan) => getPlanCommercialMeta(plan).kind === "credit_pack"),
        agentAddons: specialtyPacks,
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
    };
  }),

  getOrder: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderForUser(prisma, ctx.userId, input.orderId);
      return { order };
    }),

  checkout: protectedProcedure
    .input(
      z.object({
        planId: z.string().min(1),
        channel: z.enum(["wechat", "alipay"]),
        /** 微信内置浏览器：优先 H5，失败回退 Native */
        preferWechatH5: z.boolean().optional(),
        clientIp: z.string().max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const forwarded =
          ctx.headers.get("x-forwarded-for") || ctx.headers.get("x-real-ip");
        const clientIp =
          input.clientIp || forwarded?.split(",")[0]?.trim() || undefined;
        const result = await createCheckout(prisma, {
          userId: ctx.userId,
          planId: input.planId,
          channel: input.channel,
          preferWechatH5: input.preferWechatH5,
          clientIp,
        });
        return {
          ok: true as const,
          mode: result.mode || getPaymentMode(),
          activated: result.activated,
          subscription: result.subscription,
          order: result.order,
          pay: result.pay,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "创建支付失败",
        });
      }
    }),

  confirmSandbox: protectedProcedure
    .input(z.object({ orderNo: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (getPaymentMode() !== "sandbox") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅沙箱模式可确认模拟支付",
        });
      }
      try {
        const result = await confirmSandboxPayment(prisma, {
          userId: ctx.userId,
          orderNo: input.orderNo,
        });
        return {
          ok: true as const,
          alreadyPaid: result.alreadyPaid,
          order: result.order,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "沙箱确认失败",
        });
      }
    }),
});
