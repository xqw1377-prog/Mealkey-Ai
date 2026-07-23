import type { PrismaClient } from "@/generated/prisma";
import {
  applyPlanPurchaseSideEffects,
  ensureBillingAccountForOwner,
  ensureDefaultPlans,
  ensureFreeSubscription,
  getPlanCommercialMeta,
} from "@/server/services/billing.service";
import {
  createAlipayPagePay,
  isAlipayConfigured,
} from "@/server/services/payment/alipay";
import {
  createWechatNativeOrder,
  isWechatPayConfigured,
} from "@/server/services/payment/wechat-pay";

type CheckoutChannel = "wechat" | "alipay";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function createOrderNo() {
  const stamp = Date.now().toString();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MK${stamp}${rand}`;
}

function centsToYuanString(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

export function getPaymentMode(): "live" | "sandbox" {
  if (process.env.PAYMENT_MODE === "sandbox") return "sandbox";
  if (process.env.NODE_ENV !== "production") return "sandbox";
  if (!isWechatPayConfigured() && !isAlipayConfigured()) return "sandbox";
  return "live";
}

async function resolveOwnerContext(prisma: PrismaClient, userId: string) {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) {
    throw new Error("经营者档案不存在，请先完成引导");
  }
  const account = await ensureBillingAccountForOwner(prisma, {
    ownerId: owner.id,
    userId,
    name: owner.name,
  });
  await ensureFreeSubscription(prisma, account.id);
  return { owner, account };
}

async function activateSubscriptionForPlan(
  prisma: PrismaClient,
  input: {
    billingAccountId: string;
    planId: string;
    orderNo?: string;
    amountCents: number;
    channel: string;
  },
) {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new Error("套餐不存在");

  const meta = getPlanCommercialMeta(plan);
  const now = new Date();
  const periodEnd = addDays(now, 30);
  let subscriptionId: string | undefined;

  if (meta.kind === "platform") {
    const activeSubs = await prisma.subscription.findMany({
      where: { billingAccountId: input.billingAccountId, status: "active" },
    });
    for (const sub of activeSubs) {
      const subPlan = await prisma.plan.findUnique({ where: { id: sub.planId } });
      if (!subPlan) continue;
      if (getPlanCommercialMeta(subPlan).kind === "platform") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "canceled", cancelAtPeriodEnd: true, updatedAt: now },
        });
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        id: createId("sub"),
        billingAccountId: input.billingAccountId,
        planId: input.planId,
        status: "active",
        seats: 1,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: JSON.stringify({
          source: "payment",
          orderNo: input.orderNo ?? null,
          channel: input.channel,
          kind: "platform",
        }),
      },
    });
    subscriptionId = subscription.id;
  } else if (meta.kind === "agent_addon") {
    const subscription = await prisma.subscription.create({
      data: {
        id: createId("sub"),
        billingAccountId: input.billingAccountId,
        planId: input.planId,
        status: "active",
        seats: 1,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: JSON.stringify({
          source: "payment",
          orderNo: input.orderNo ?? null,
          channel: input.channel,
          kind: "agent_addon",
          agentCode: meta.agentCode ?? null,
        }),
      },
    });
    subscriptionId = subscription.id;
  }

  if (input.amountCents > 0) {
    await prisma.creditLedger.create({
      data: {
        id: createId("cl"),
        billingAccountId: input.billingAccountId,
        entryType: "PAYMENT",
        amount: centsToYuanString(input.amountCents),
        currency: "CNY",
        description: input.orderNo ? `支付订单 ${input.orderNo}` : `购买 ${plan.name}`,
        sourceType: "payment_order",
        sourceId: input.orderNo ?? subscriptionId ?? plan.id,
      },
    });

    await prisma.invoice.create({
      data: {
        id: createId("inv"),
        billingAccountId: input.billingAccountId,
        invoiceNo: `INV${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        status: "paid",
        subtotal: centsToYuanString(input.amountCents),
        tax: "0",
        total: centsToYuanString(input.amountCents),
        currency: "CNY",
        issuedAt: now,
        paidAt: now,
        metadata: JSON.stringify({
          orderNo: input.orderNo ?? null,
          planId: input.planId,
          channel: input.channel,
          subscriptionId: subscriptionId ?? null,
          kind: meta.kind,
        }),
      },
    });
  }

  await applyPlanPurchaseSideEffects(prisma, {
    billingAccountId: input.billingAccountId,
    planId: input.planId,
    subscriptionId,
    endsAt: meta.kind === "credit_pack" ? null : periodEnd,
  });

  return subscriptionId
    ? await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    : null;
}

export async function createCheckout(
  prisma: PrismaClient,
  input: { userId: string; planId: string; channel: CheckoutChannel },
) {
  await ensureDefaultPlans(prisma);

  const plan = await prisma.plan.findFirst({
    where: { id: input.planId, status: "active" },
  });
  if (!plan) {
    throw new Error("套餐不存在或已停用");
  }

  const { owner, account } = await resolveOwnerContext(prisma, input.userId);
  const meta = getPlanCommercialMeta(plan);

  if (plan.priceCents <= 0 && meta.kind === "platform") {
    const subscription = await activateSubscriptionForPlan(prisma, {
      billingAccountId: account.id,
      planId: plan.id,
      amountCents: 0,
      channel: "free",
    });
    return {
      mode: getPaymentMode(),
      activated: true as const,
      subscription,
      order: null,
      pay: null,
    };
  }

  if (input.channel !== "wechat" && input.channel !== "alipay") {
    throw new Error("支付渠道无效，请选择微信或支付宝");
  }

  let mode = getPaymentMode();
  if (
    mode === "live" &&
    ((input.channel === "wechat" && !isWechatPayConfigured()) ||
      (input.channel === "alipay" && !isAlipayConfigured()))
  ) {
    mode = "sandbox";
  }

  const orderNo = createOrderNo();
  let channel: string = input.channel;
  let codeUrl: string | null = null;
  let payUrl: string | null = null;
  const metadata: Record<string, unknown> = {
    planCode: plan.code,
    mode,
    kind: meta.kind,
  };

  if (mode === "sandbox") {
    channel = "sandbox";
    metadata.sandbox = true;
    metadata.requestedChannel = input.channel;
  } else if (input.channel === "wechat") {
    const result = await createWechatNativeOrder({
      orderNo,
      description: `MealKey ${plan.name}`,
      amountCents: plan.priceCents,
    });
    codeUrl = result.codeUrl;
  } else {
    const result = createAlipayPagePay({
      orderNo,
      subject: `MealKey ${plan.name}`,
      amountCents: plan.priceCents,
    });
    payUrl = result.payUrl;
  }

  const order = await prisma.paymentOrder.create({
    data: {
      orderNo,
      userId: input.userId,
      ownerId: owner.id,
      billingAccountId: account.id,
      planId: plan.id,
      channel,
      status: "pending",
      amountCents: plan.priceCents,
      currency: plan.currency || "CNY",
      codeUrl,
      payUrl,
      metadata: JSON.stringify(metadata),
    },
  });

  return {
    mode,
    activated: false as const,
    subscription: null,
    order,
    pay: {
      channel: order.channel,
      codeUrl: order.codeUrl,
      payUrl: order.payUrl,
      sandbox: mode === "sandbox",
    },
  };
}

export async function markOrderPaid(
  prisma: PrismaClient,
  input: { orderNo: string; providerTradeNo?: string | null; channel?: string },
) {
  const existing = await prisma.paymentOrder.findUnique({
    where: { orderNo: input.orderNo },
  });
  if (!existing) {
    throw new Error("支付订单不存在");
  }

  if (existing.status === "paid") {
    return { order: existing, alreadyPaid: true as const };
  }

  if (existing.status !== "pending") {
    throw new Error(`订单状态不可支付：${existing.status}`);
  }

  const now = new Date();
  const order = await prisma.paymentOrder.update({
    where: { id: existing.id },
    data: {
      status: "paid",
      providerTradeNo: input.providerTradeNo || existing.providerTradeNo,
      channel: input.channel || existing.channel,
      paidAt: now,
    },
  });

  await activateSubscriptionForPlan(prisma, {
    billingAccountId: order.billingAccountId,
    planId: order.planId,
    orderNo: order.orderNo,
    amountCents: order.amountCents,
    channel: order.channel,
  });

  return { order, alreadyPaid: false as const };
}

export async function confirmSandboxPayment(
  prisma: PrismaClient,
  input: { userId: string; orderNo: string },
) {
  if (getPaymentMode() !== "sandbox") {
    throw new Error("仅沙箱模式可确认模拟支付");
  }

  const order = await prisma.paymentOrder.findFirst({
    where: {
      orderNo: input.orderNo,
      userId: input.userId,
    },
  });
  if (!order) {
    throw new Error("支付订单不存在");
  }
  if (order.channel !== "sandbox") {
    throw new Error("该订单不是沙箱订单");
  }

  return markOrderPaid(prisma, {
    orderNo: order.orderNo,
    providerTradeNo: `sandbox_${Date.now()}`,
    channel: "sandbox",
  });
}

export async function getOrderForUser(
  prisma: PrismaClient,
  userId: string,
  orderIdOrNo: string,
) {
  const order = await prisma.paymentOrder.findFirst({
    where: {
      userId,
      OR: [{ id: orderIdOrNo }, { orderNo: orderIdOrNo }],
    },
  });
  if (!order) {
    throw new Error("支付订单不存在");
  }
  return order;
}
