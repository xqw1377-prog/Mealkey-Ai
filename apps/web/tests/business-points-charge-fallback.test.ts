/**
 * 缺 ConsumptionRecord 委托时，扣点不得因 findFirst 崩溃
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureDefaultPlans: vi.fn(),
  ensureBillingAccountForOwner: vi.fn(),
  getBillingSnapshot: vi.fn(),
  ownerFindUnique: vi.fn(),
  reserveWalletPoints: vi.fn(),
  settleWalletReservation: vi.fn(),
  ensureUserWallet: vi.fn(),
  getUserWallet: vi.fn(),
  creditWalletPoints: vi.fn(),
}));

vi.mock("@/server/services/billing.service", () => ({
  ensureDefaultPlans: mocks.ensureDefaultPlans,
  ensureBillingAccountForOwner: mocks.ensureBillingAccountForOwner,
  getBillingSnapshot: mocks.getBillingSnapshot,
}));

vi.mock("@/server/services/wallet.service", () => ({
  creditWalletPoints: mocks.creditWalletPoints,
  ensureUserWallet: mocks.ensureUserWallet,
  getUserWallet: mocks.getUserWallet,
  LOCAL_TEST_WALLET_FLOOR_POINTS: 100000,
  reserveWalletPoints: mocks.reserveWalletPoints,
  settleWalletReservation: mocks.settleWalletReservation,
}));

vi.mock("@/server/services/consumption.service", () => ({
  authorizeCapabilityConsumption: vi.fn(),
  failCapabilityConsumption: vi.fn(),
  listRecentConsumptions: vi.fn(),
  settleCapabilityConsumption: vi.fn(),
}));

vi.mock("@/server/services/ledger.service", () => ({
  listWalletLedger: vi.fn(async () => []),
}));

import { chargeBusinessPoints } from "@/server/services/business-points.service";

describe("chargeBusinessPoints fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureDefaultPlans.mockResolvedValue(undefined);
    mocks.ownerFindUnique.mockResolvedValue({ id: "owner_1", name: "店主", userId: "u1" });
    mocks.ensureBillingAccountForOwner.mockResolvedValue({
      id: "ba_1",
      metadata: JSON.stringify({ pointsBootstrapped: true }),
    });
    mocks.ensureUserWallet.mockResolvedValue({
      id: "wallet_local_u1",
      userId: "u1",
      balance: 100000,
      metadata: JSON.stringify({ pointsBootstrapped: true, valueArchive: [] }),
    });
    mocks.getUserWallet.mockResolvedValue({
      id: "wallet_local_u1",
      balance: 97000,
    });
    mocks.reserveWalletPoints.mockResolvedValue({
      id: "wallet_local_u1",
      balance: 97000,
      frozenAmount: 3000,
    });
    mocks.settleWalletReservation.mockResolvedValue({
      id: "wallet_local_u1",
      balance: 97000,
    });
  });

  it("无 consumptionRecord 时走钱包扣点且不抛 findFirst", async () => {
    const prisma = {
      // 故意不挂 consumptionRecord / userWallet，模拟未 generate 的客户端
      owner: { findUnique: mocks.ownerFindUnique },
    } as never;

    const result = await chargeBusinessPoints(prisma, "u1", {
      spendKind: "growth",
      sourceType: "founder_meeting",
      sourceId: "meet_1",
      title: "增长诊断",
    });

    expect(result.points).toBe(3000);
    expect(result.ledgerId).toBe("wallet_meet_1");
    expect(mocks.reserveWalletPoints).toHaveBeenCalled();
    expect(mocks.settleWalletReservation).toHaveBeenCalled();
  });
});
