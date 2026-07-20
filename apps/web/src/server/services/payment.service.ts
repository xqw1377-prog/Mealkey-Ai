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
  queryAlipayOrderByOutTradeNo,
  type ChannelTradeQueryResult,
} from "@/server/services/payment/alipay";
import {
  createWechatH5Order,
  createWechatNativeOrder,
  isWechatH5PreferredEnabled,
  isWechatPayConfigured,
  queryWechatOrderByOutTradeNo,
} from "@/server/services/payment/wechat-pay";

type CheckoutChannel = "wechat" | "alipay";
export type CheckoutOptions = {
  userId: string;
  planId: string;
  channel: CheckoutChannel;
  /** 微信内优先走 H5，失败回退 Native 扫码 */
  preferWechatH5?: boolean;
  /** H5 必填：付款人客户端 IP */
  clientIp?: string;
};
type CommercialKind = "platform" | "specialty_pack" | "credit_pack";

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

function buildCommercialPlanLabel(kind: CommercialKind, planName: string) {
  if (kind === "specialty_pack") return `专项咨询包：${planName}`;
  if (kind === "credit_pack") return `额度包：${planName}`;
  return `母体席位：${planName}`;
}

/** 生产环境仅在显式放行时可走沙箱（防未配渠道时自助「付款」） */
export function isProductionSandboxAllowed(): boolean {
  return process.env.PAYMENT_ALLOW_SANDBOX === "1";
}

export function getPaymentMode(): "live" | "sandbox" {
  const forced = process.env.PAYMENT_MODE?.trim();
  if (forced === "sandbox") {
    if (
      process.env.NODE_ENV === "production" &&
      !isProductionSandboxAllowed()
    ) {
      return "live";
    }
    return "sandbox";
  }
  if (forced === "live") return "live";
  if (process.env.NODE_ENV !== "production") return "sandbox";
  // 生产绝不因「未配渠道」自动落 sandbox
  return "live";
}

function safeParseMeta(
  raw: string | null | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function orderFulfilledAt(
  order: { metadata?: string | null },
): string | null {
  const meta = safeParseMeta(order.metadata);
  const at = meta?.fulfilledAt;
  return typeof at === "string" && at.length > 0 ? at : null;
}

async function findActivationByOrderNo(
  prisma: PrismaClient,
  billingAccountId: string,
  orderNo: string,
) {
  const ledger = await prisma.creditLedger.findFirst({
    where: {
      billingAccountId,
      sourceType: "payment_order",
      sourceId: orderNo,
    },
  });
  if (ledger) return { kind: "ledger" as const, id: ledger.id };

  const subs = await prisma.subscription.findMany({
    where: { billingAccountId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const sub = subs.find((item) => {
    const meta = safeParseMeta(item.metadata);
    return meta?.orderNo === orderNo;
  });
  if (sub) return { kind: "subscription" as const, id: sub.id };
  return null;
}

async function markOrderFulfilledMeta(
  prisma: PrismaClient,
  order: { id: string; metadata?: string | null },
) {
  const meta = safeParseMeta(order.metadata) || {};
  if (typeof meta.fulfilledAt === "string" && meta.fulfilledAt) {
    return order;
  }
  return prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      metadata: JSON.stringify({
        ...meta,
        fulfilledAt: new Date().toISOString(),
      }),
    },
  });
}

/** 已付订单补发货（幂等）；回调重试可修「已付未发货」 */
async function ensureOrderFulfilled(
  prisma: PrismaClient,
  order: {
    id: string;
    orderNo: string;
    billingAccountId: string;
    planId: string;
    amountCents: number;
    channel: string;
    metadata?: string | null;
  },
) {
  if (orderFulfilledAt(order)) {
    return { order, fulfilled: true as const, activated: false as const };
  }

  const existing = await findActivationByOrderNo(
    prisma,
    order.billingAccountId,
    order.orderNo,
  );
  if (!existing) {
    await activateSubscriptionForPlan(prisma, {
      billingAccountId: order.billingAccountId,
      planId: order.planId,
      orderNo: order.orderNo,
      amountCents: order.amountCents,
      channel: order.channel,
    });
  }

  const fulfilled = await markOrderFulfilledMeta(prisma, order);
  return {
    order: fulfilled,
    fulfilled: true as const,
    activated: !existing,
  };
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
  if (input.orderNo) {
    const prior = await findActivationByOrderNo(
      prisma,
      input.billingAccountId,
      input.orderNo,
    );
    if (prior?.kind === "subscription") {
      return prisma.subscription.findUnique({ where: { id: prior.id } });
    }
    if (prior?.kind === "ledger") {
      return null;
    }
  }

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
  } else if (meta.kind === "specialty_pack" || meta.kind === "agent_addon") {
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
          kind: "specialty_pack",
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
        description: input.orderNo
          ? `${buildCommercialPlanLabel(meta.kind as CommercialKind, plan.name)} · 订单 ${input.orderNo}`
          : `购买 ${buildCommercialPlanLabel(meta.kind as CommercialKind, plan.name)}`,
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
          planCode: plan.code,
          planName: plan.name,
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
  input: CheckoutOptions,
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

  const mode = getPaymentMode();
  if (mode === "live") {
    if (input.channel === "wechat" && !isWechatPayConfigured()) {
      throw new Error("微信支付未配置，无法发起收款");
    }
    if (input.channel === "alipay" && !isAlipayConfigured()) {
      throw new Error("支付宝未配置，无法发起收款");
    }
  } else if (
    process.env.NODE_ENV === "production" &&
    !isProductionSandboxAllowed()
  ) {
    throw new Error("生产环境禁止沙箱收款，请配置微信/支付宝或显式放行");
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
    const tryH5 =
      Boolean(input.preferWechatH5) && isWechatH5PreferredEnabled();
    if (tryH5) {
      try {
        const h5 = await createWechatH5Order({
          orderNo,
          description: `Mealkey ${plan.name}`,
          amountCents: plan.priceCents,
          payerClientIp: input.clientIp || "127.0.0.1",
        });
        payUrl = h5.h5Url;
        metadata.wechatTradeType = "h5";
      } catch (h5Error) {
        metadata.wechatH5Error =
          h5Error instanceof Error ? h5Error.message : "h5_failed";
        metadata.wechatTradeType = "native_fallback";
        const result = await createWechatNativeOrder({
          orderNo,
          description: `Mealkey ${plan.name}`,
          amountCents: plan.priceCents,
        });
        codeUrl = result.codeUrl;
      }
    } else {
      const result = await createWechatNativeOrder({
        orderNo,
        description: `Mealkey ${plan.name}`,
        amountCents: plan.priceCents,
      });
      codeUrl = result.codeUrl;
      metadata.wechatTradeType = "native";
    }
  } else {
    const result = createAlipayPagePay({
      orderNo,
      subject: `Mealkey ${plan.name}`,
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
    order: {
      ...order,
      planCode: plan.code,
      planName: plan.name,
      planKind: meta.kind,
    },
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
    const ensured = await ensureOrderFulfilled(prisma, existing);
    return { order: ensured.order, alreadyPaid: true as const };
  }

  if (existing.status !== "pending") {
    throw new Error(`订单状态不可支付：${existing.status}`);
  }

  const now = new Date();
  // CAS：仅 pending → paid 成功的一方可激活权益，避免双回调重复发货
  const cas = await prisma.paymentOrder.updateMany({
    where: { id: existing.id, status: "pending" },
    data: {
      status: "paid",
      providerTradeNo: input.providerTradeNo || existing.providerTradeNo,
      channel: input.channel || existing.channel,
      paidAt: now,
    },
  });

  if (cas.count === 0) {
    const again = await prisma.paymentOrder.findUnique({
      where: { orderNo: input.orderNo },
    });
    if (again?.status === "paid") {
      const ensured = await ensureOrderFulfilled(prisma, again);
      return { order: ensured.order, alreadyPaid: true as const };
    }
    throw new Error(`订单状态不可支付：${again?.status || "unknown"}`);
  }

  const order = await prisma.paymentOrder.findUniqueOrThrow({
    where: { id: existing.id },
  });

  const ensured = await ensureOrderFulfilled(prisma, order);
  return { order: ensured.order, alreadyPaid: false as const };
}

export async function confirmSandboxPayment(
  prisma: PrismaClient,
  input: { userId: string; orderNo: string },
) {
  if (
    process.env.NODE_ENV === "production" &&
    !isProductionSandboxAllowed()
  ) {
    throw new Error("生产环境禁止沙箱支付确认");
  }
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

/** 默认：超过 2 小时仍 pending 视为漏单/超时，可关闭巡检 */
export const STALE_PENDING_ORDER_MS = 2 * 60 * 60 * 1000;

export async function listStalePendingOrders(
  prisma: PrismaClient,
  opts?: { olderThanMs?: number; limit?: number },
) {
  const olderThanMs = opts?.olderThanMs ?? STALE_PENDING_ORDER_MS;
  const cutoff = new Date(Date.now() - olderThanMs);
  return prisma.paymentOrder.findMany({
    where: {
      status: "pending",
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(200, opts?.limit ?? 50),
  });
}

async function queryChannelTrade(
  order: { orderNo: string; channel: string },
): Promise<ChannelTradeQueryResult> {
  if (order.channel === "wechat") {
    return queryWechatOrderByOutTradeNo(order.orderNo);
  }
  if (order.channel === "alipay") {
    return queryAlipayOrderByOutTradeNo(order.orderNo);
  }
  // sandbox / 未知渠道：本地超时直接视为未付
  return { status: "unpaid" };
}

async function closePendingOrder(
  prisma: PrismaClient,
  order: { id: string; orderNo: string; metadata?: string | null },
  reason: string,
  channelDetail?: string,
) {
  const cas = await prisma.paymentOrder.updateMany({
    where: { id: order.id, status: "pending" },
    data: {
      status: "closed",
      metadata: JSON.stringify({
        ...(safeParseMeta(order.metadata) || {}),
        closedReason: reason,
        closedAt: new Date().toISOString(),
        ...(channelDetail ? { channelQueryDetail: channelDetail } : {}),
      }),
    },
  });
  return cas.count === 1;
}

export type ReconcileStaleResult = {
  dryRun: boolean;
  counted: number;
  /** @deprecated 同 closed；保留兼容旧调用方 */
  closed: number;
  paid: number;
  skipped: number;
  orderNos: string[];
  paidOrderNos: string[];
  closedOrderNos: string[];
  skippedOrderNos: string[];
};

/**
 * 超时 pending 真对账：
 * - 渠道已付 → markOrderPaid（补发货）
 * - 未付/已关 → closed
 * - 查单失败 → 跳过（不误关、不误发）
 */
export async function reconcileStalePendingOrders(
  prisma: PrismaClient,
  opts?: { olderThanMs?: number; limit?: number; dryRun?: boolean },
): Promise<ReconcileStaleResult> {
  const stale = await listStalePendingOrders(prisma, opts);
  const paidOrderNos: string[] = [];
  const closedOrderNos: string[] = [];
  const skippedOrderNos: string[] = [];

  for (const order of stale) {
    const query = await queryChannelTrade(order);

    if (query.status === "paid") {
      if (!opts?.dryRun) {
        try {
          await markOrderPaid(prisma, {
            orderNo: order.orderNo,
            providerTradeNo: query.tradeNo || null,
            channel: order.channel,
          });
          paidOrderNos.push(order.orderNo);
        } catch (error) {
          skippedOrderNos.push(order.orderNo);
          await prisma.paymentOrder.updateMany({
            where: { id: order.id, status: "pending" },
            data: {
              metadata: JSON.stringify({
                ...(safeParseMeta(order.metadata) || {}),
                reconcileError:
                  (error as Error).message || "markOrderPaid_failed",
                reconcileAt: new Date().toISOString(),
              }),
            },
          });
        }
      } else {
        paidOrderNos.push(order.orderNo);
      }
      continue;
    }

    if (query.status === "unpaid" || query.status === "closed") {
      if (!opts?.dryRun) {
        const ok = await closePendingOrder(
          prisma,
          order,
          query.status === "closed"
            ? "channel_closed_reconcile"
            : "stale_pending_reconcile",
          query.status,
        );
        if (ok) closedOrderNos.push(order.orderNo);
        else skippedOrderNos.push(order.orderNo);
      } else {
        closedOrderNos.push(order.orderNo);
      }
      continue;
    }

    // unknown：不关不发
    skippedOrderNos.push(order.orderNo);
    if (!opts?.dryRun) {
      await prisma.paymentOrder.updateMany({
        where: { id: order.id, status: "pending" },
        data: {
          metadata: JSON.stringify({
            ...(safeParseMeta(order.metadata) || {}),
            reconcileSkipReason: query.detail,
            reconcileAt: new Date().toISOString(),
          }),
        },
      });
    }
  }

  return {
    dryRun: Boolean(opts?.dryRun),
    counted: stale.length,
    closed: closedOrderNos.length,
    paid: paidOrderNos.length,
    skipped: skippedOrderNos.length,
    orderNos: closedOrderNos,
    paidOrderNos,
    closedOrderNos,
    skippedOrderNos,
  };
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
  const plan = await prisma.plan.findUnique({
    where: { id: order.planId },
    select: { code: true, name: true, metadata: true },
  });
  const meta = plan ? getPlanCommercialMeta(plan) : null;
  return {
    ...order,
    planCode: plan?.code ?? null,
    planName: plan?.name ?? null,
    planKind: meta?.kind ?? null,
  };
}
