/**
 * 支付漏单巡检 — 查渠道：已付补发货 / 未付关单 / 失败跳过
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  queryWechat: vi.fn(),
  queryAlipay: vi.fn(),
  applyPlanPurchaseSideEffects: vi.fn(),
  getPlanCommercialMeta: vi.fn(() => ({ kind: "credit_pack" })),
  planFindUnique: vi.fn(),
  subscriptionFindMany: vi.fn(),
  creditLedgerFindFirst: vi.fn(),
  creditLedgerCreate: vi.fn(),
  invoiceCreate: vi.fn(),
  subscriptionCreate: vi.fn(),
}));

vi.mock("@/server/services/billing.service", () => ({
  applyPlanPurchaseSideEffects: mocks.applyPlanPurchaseSideEffects,
  ensureBillingAccountForOwner: vi.fn(),
  ensureDefaultPlans: vi.fn(),
  ensureFreeSubscription: vi.fn(),
  getPlanCommercialMeta: mocks.getPlanCommercialMeta,
}));

vi.mock("@/server/services/payment/alipay", () => ({
  createAlipayPagePay: vi.fn(),
  isAlipayConfigured: () => true,
  queryAlipayOrderByOutTradeNo: (...args: unknown[]) =>
    mocks.queryAlipay(...args),
}));

vi.mock("@/server/services/payment/wechat-pay", () => ({
  createWechatNativeOrder: vi.fn(),
  isWechatPayConfigured: () => true,
  queryWechatOrderByOutTradeNo: (...args: unknown[]) =>
    mocks.queryWechat(...args),
}));

import { reconcileStalePendingOrders } from "@/server/services/payment.service";

function prismaStub() {
  return {
    paymentOrder: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      update: mocks.update,
    },
    plan: { findUnique: mocks.planFindUnique },
    subscription: {
      findMany: mocks.subscriptionFindMany,
      create: mocks.subscriptionCreate,
      findUnique: vi.fn(),
    },
    creditLedger: {
      findFirst: mocks.creditLedgerFindFirst,
      create: mocks.creditLedgerCreate,
    },
    invoice: { create: mocks.invoiceCreate },
  } as never;
}

const staleWechat = {
  id: "po1",
  orderNo: "MK1",
  status: "pending",
  channel: "wechat",
  billingAccountId: "ba_1",
  planId: "plan_1",
  amountCents: 9900,
  metadata: null,
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
};

describe("reconcileStalePendingOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.planFindUnique.mockResolvedValue({
      id: "plan_1",
      name: "额度包",
      code: "credits",
      metadata: "{}",
    });
    mocks.applyPlanPurchaseSideEffects.mockResolvedValue(undefined);
    mocks.creditLedgerFindFirst.mockResolvedValue(null);
    mocks.subscriptionFindMany.mockResolvedValue([]);
    mocks.update.mockResolvedValue({
      ...staleWechat,
      status: "paid",
      metadata: JSON.stringify({ fulfilledAt: "2026-01-01T00:00:00.000Z" }),
    });
  });

  it("dryRun：渠道已付计入 paid，不写库", async () => {
    mocks.findMany.mockResolvedValue([staleWechat]);
    mocks.queryWechat.mockResolvedValue({
      status: "paid",
      tradeNo: "wx_1",
    });
    const result = await reconcileStalePendingOrders(prismaStub(), {
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.paid).toBe(1);
    expect(result.closed).toBe(0);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("渠道已付 → markOrderPaid 补发货", async () => {
    mocks.findMany.mockResolvedValue([staleWechat]);
    mocks.queryWechat.mockResolvedValue({
      status: "paid",
      tradeNo: "wx_1",
    });
    mocks.findUnique.mockResolvedValue({ ...staleWechat, status: "pending" });
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 }) // pending → paid CAS
      .mockResolvedValue({ count: 0 });
    mocks.findUniqueOrThrow.mockResolvedValue({
      ...staleWechat,
      status: "paid",
      channel: "wechat",
    });

    const result = await reconcileStalePendingOrders(prismaStub(), {
      dryRun: false,
    });
    expect(result.paid).toBe(1);
    expect(result.closed).toBe(0);
    expect(mocks.applyPlanPurchaseSideEffects).toHaveBeenCalled();
  });

  it("渠道未付 → closed", async () => {
    mocks.findMany.mockResolvedValue([staleWechat]);
    mocks.queryWechat.mockResolvedValue({ status: "unpaid" });
    mocks.updateMany.mockResolvedValue({ count: 1 });

    const result = await reconcileStalePendingOrders(prismaStub(), {
      dryRun: false,
    });
    expect(result.closed).toBe(1);
    expect(result.paid).toBe(0);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po1", status: "pending" },
        data: expect.objectContaining({ status: "closed" }),
      }),
    );
  });

  it("查单失败 → 跳过且不关单", async () => {
    mocks.findMany.mockResolvedValue([staleWechat]);
    mocks.queryWechat.mockResolvedValue({
      status: "unknown",
      detail: "timeout",
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });

    const result = await reconcileStalePendingOrders(prismaStub(), {
      dryRun: false,
    });
    expect(result.skipped).toBe(1);
    expect(result.closed).toBe(0);
    expect(result.paid).toBe(0);
    // 只写 metadata，不改 status 为 closed
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.stringContaining("timeout"),
        }),
      }),
    );
    const statusWrites = mocks.updateMany.mock.calls.filter(
      (call) =>
        (call[0] as { data?: { status?: string } }).data?.status === "closed",
    );
    expect(statusWrites).toHaveLength(0);
  });

  it("支付宝未付 → closed", async () => {
    mocks.findMany.mockResolvedValue([
      { ...staleWechat, id: "po2", orderNo: "MK2", channel: "alipay" },
    ]);
    mocks.queryAlipay.mockResolvedValue({ status: "unpaid" });
    mocks.updateMany.mockResolvedValue({ count: 1 });

    const result = await reconcileStalePendingOrders(prismaStub(), {
      dryRun: false,
    });
    expect(result.closed).toBe(1);
    expect(mocks.queryAlipay).toHaveBeenCalledWith("MK2");
  });
});
