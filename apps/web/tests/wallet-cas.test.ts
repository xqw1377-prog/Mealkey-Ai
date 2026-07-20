/**
 * 经营点预扣 CAS — 余额不足时 updateMany 不得扣成负数
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
  appendWalletLedger: vi.fn(),
}));

vi.mock("@/server/services/ledger.service", () => ({
  appendWalletLedger: mocks.appendWalletLedger,
}));

import {
  releaseWalletReservation,
  reserveWalletPoints,
  settleWalletReservation,
} from "@/server/services/wallet.service";

function prismaStub() {
  return {
    userWallet: {
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      updateMany: mocks.updateMany,
      create: mocks.create,
    },
  } as never;
}

describe("wallet CAS reserve/settle/release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appendWalletLedger.mockResolvedValue(undefined);
    mocks.findUnique.mockResolvedValue({
      id: "wallet_1",
      userId: "user_1",
      balance: 100,
      frozenAmount: 0,
      totalPurchased: 0,
      totalConsumed: 0,
      status: "active",
      metadata: "{}",
    });
  });

  it("reserve uses balance>=amount CAS and rejects when count=0", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      reserveWalletPoints(prismaStub(), {
        userId: "user_1",
        amount: 80,
        reason: "开会预扣",
      }),
    ).rejects.toThrow(/经营点不足/);

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "wallet_1",
          status: "active",
          balance: { gte: 80 },
        }),
        data: expect.objectContaining({
          balance: { decrement: 80 },
          frozenAmount: { increment: 80 },
        }),
      }),
    );
  });

  it("reserve succeeds when CAS matches and ledgers new balance", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: "wallet_1",
      userId: "user_1",
      balance: 20,
      frozenAmount: 80,
      status: "active",
    });

    const updated = await reserveWalletPoints(prismaStub(), {
      userId: "user_1",
      amount: 80,
      reason: "开会预扣",
    });
    expect(updated.balance).toBe(20);
    expect(mocks.appendWalletLedger).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        amount: -80,
        balanceAfter: 20,
        type: "RESERVE",
      }),
    );
  });

  it("settle rejects when frozen CAS fails", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "wallet_1",
      userId: "user_1",
      balance: 20,
      frozenAmount: 10,
      status: "active",
    });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      settleWalletReservation(prismaStub(), {
        userId: "user_1",
        reservedAmount: 80,
        actualAmount: 50,
        reason: "结算",
      }),
    ).rejects.toThrow(/预扣金额异常|经营点不足/);
  });

  it("release requires frozenAmount>=amount", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "wallet_1",
      userId: "user_1",
      balance: 20,
      frozenAmount: 80,
      status: "active",
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: "wallet_1",
      balance: 100,
      frozenAmount: 0,
      status: "active",
    });

    await releaseWalletReservation(prismaStub(), {
      userId: "user_1",
      amount: 80,
      reason: "取消预扣",
    });

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          frozenAmount: { gte: 80 },
        }),
      }),
    );
  });
});
