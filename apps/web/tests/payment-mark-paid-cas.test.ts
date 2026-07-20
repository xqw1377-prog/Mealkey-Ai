/**
 * 支付回调幂等 — pending→paid CAS；已付未发货可补履约
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  planFindUnique: vi.fn(),
  subscriptionFindMany: vi.fn(),
  subscriptionCreate: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  creditLedgerCreate: vi.fn(),
  creditLedgerFindFirst: vi.fn(),
  invoiceCreate: vi.fn(),
  applyPlanPurchaseSideEffects: vi.fn(),
  getPlanCommercialMeta: vi.fn(),
  ensureBillingAccountForOwner: vi.fn(),
  ensureDefaultPlans: vi.fn(),
  ensureFreeSubscription: vi.fn(),
}));

vi.mock("@/server/services/billing.service", () => ({
  applyPlanPurchaseSideEffects: mocks.applyPlanPurchaseSideEffects,
  ensureBillingAccountForOwner: mocks.ensureBillingAccountForOwner,
  ensureDefaultPlans: mocks.ensureDefaultPlans,
  ensureFreeSubscription: mocks.ensureFreeSubscription,
  getPlanCommercialMeta: mocks.getPlanCommercialMeta,
}));

vi.mock("@/server/services/payment/alipay", () => ({
  createAlipayPagePay: vi.fn(),
  isAlipayConfigured: () => false,
}));

vi.mock("@/server/services/payment/wechat-pay", () => ({
  createWechatNativeOrder: vi.fn(),
  isWechatPayConfigured: () => false,
}));

import { markOrderPaid } from "@/server/services/payment.service";

function prismaStub() {
  return {
    paymentOrder: {
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      updateMany: mocks.updateMany,
      update: mocks.update,
    },
    plan: { findUnique: mocks.planFindUnique },
    subscription: {
      findMany: mocks.subscriptionFindMany,
      create: mocks.subscriptionCreate,
      findUnique: mocks.subscriptionFindUnique,
    },
    creditLedger: {
      create: mocks.creditLedgerCreate,
      findFirst: mocks.creditLedgerFindFirst,
    },
    invoice: { create: mocks.invoiceCreate },
  } as never;
}

describe("markOrderPaid CAS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlanCommercialMeta.mockReturnValue({ kind: "credit_pack" });
    mocks.applyPlanPurchaseSideEffects.mockResolvedValue(undefined);
    mocks.planFindUnique.mockResolvedValue({
      id: "plan_1",
      name: "额度包",
      code: "credits",
      metadata: "{}",
    });
    mocks.creditLedgerFindFirst.mockResolvedValue(null);
    mocks.subscriptionFindMany.mockResolvedValue([]);
    mocks.update.mockImplementation(async ({ data }: { data: { metadata: string } }) => ({
      id: "po_1",
      orderNo: "MK1",
      status: "paid",
      billingAccountId: "ba_1",
      planId: "plan_1",
      amountCents: 9900,
      channel: "wechat",
      metadata: data.metadata,
    }));
  });

  it("alreadyPaid + fulfilledAt 时不重复发货", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "po_1",
      orderNo: "MK1",
      status: "paid",
      billingAccountId: "ba_1",
      planId: "plan_1",
      amountCents: 9900,
      channel: "wechat",
      metadata: JSON.stringify({ fulfilledAt: "2026-01-01T00:00:00.000Z" }),
    });
    const result = await markOrderPaid(prismaStub(), { orderNo: "MK1" });
    expect(result.alreadyPaid).toBe(true);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.applyPlanPurchaseSideEffects).not.toHaveBeenCalled();
  });

  it("alreadyPaid 但未履约时补发货", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "po_1",
      orderNo: "MK1",
      status: "paid",
      billingAccountId: "ba_1",
      planId: "plan_1",
      amountCents: 9900,
      channel: "wechat",
      metadata: JSON.stringify({ mode: "live" }),
    });

    const result = await markOrderPaid(prismaStub(), { orderNo: "MK1" });
    expect(result.alreadyPaid).toBe(true);
    expect(mocks.applyPlanPurchaseSideEffects).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
    const meta = JSON.parse(
      (mocks.update.mock.calls[0][0] as { data: { metadata: string } }).data
        .metadata,
    ) as { fulfilledAt?: string };
    expect(meta.fulfilledAt).toBeTruthy();
  });

  it("uses pending CAS and activates once", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "po_1",
      orderNo: "MK1",
      status: "pending",
      providerTradeNo: null,
      channel: "wechat",
      billingAccountId: "ba_1",
      planId: "plan_1",
      amountCents: 9900,
      metadata: null,
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: "po_1",
      orderNo: "MK1",
      status: "paid",
      billingAccountId: "ba_1",
      planId: "plan_1",
      amountCents: 9900,
      channel: "wechat",
      metadata: null,
    });

    const result = await markOrderPaid(prismaStub(), {
      orderNo: "MK1",
      providerTradeNo: "wx_1",
      channel: "wechat",
    });
    expect(result.alreadyPaid).toBe(false);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po_1", status: "pending" },
      }),
    );
    expect(mocks.applyPlanPurchaseSideEffects).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
  });

  it("lost CAS race 时若未履约则补发货", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({
        id: "po_1",
        orderNo: "MK1",
        status: "pending",
        channel: "wechat",
        billingAccountId: "ba_1",
        planId: "plan_1",
        amountCents: 100,
        metadata: null,
      })
      .mockResolvedValueOnce({
        id: "po_1",
        orderNo: "MK1",
        status: "paid",
        billingAccountId: "ba_1",
        planId: "plan_1",
        amountCents: 100,
        channel: "wechat",
        metadata: null,
      });
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const result = await markOrderPaid(prismaStub(), { orderNo: "MK1" });
    expect(result.alreadyPaid).toBe(true);
    expect(mocks.applyPlanPurchaseSideEffects).toHaveBeenCalled();
  });
});
