/**
 * 钱包服务 — UserWallet 读写
 * 经营点余额、预留、结算、充值
 */
import type { PrismaClient } from "@/generated/prisma";

export const LOCAL_TEST_WALLET_FLOOR_POINTS = 5000;

function findWalletDelegate(prisma: PrismaClient) {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  const delegate = runtimePrisma.userWallet;
  if (!delegate || typeof delegate !== "object") return null;
  return delegate as Record<string, unknown>;
}

export async function ensureUserWallet(prisma: PrismaClient, userId: string) {
  if (!findWalletDelegate(prisma)) {
    return {
      id: `wallet_${userId}`,
      userId,
      balance: LOCAL_TEST_WALLET_FLOOR_POINTS,
      frozenAmount: 0,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const existing = await prisma.userWallet.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userWallet.create({
    data: {
      userId,
      balance: LOCAL_TEST_WALLET_FLOOR_POINTS,
      metadata: JSON.stringify({ bootstrapped: true }),
    },
  });
}

export async function getUserWallet(prisma: PrismaClient, userId: string) {
  if (!findWalletDelegate(prisma)) {
    return null;
  }
  return prisma.userWallet.findUnique({ where: { userId } });
}

export async function creditWalletPoints(
  prisma: PrismaClient,
  input: {
    userId: string;
    amount: number;
    type: string;
    reason: string;
    referenceId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const wallet = await ensureUserWallet(prisma, input.userId);
  const newBalance = wallet.balance + Math.max(0, Math.trunc(input.amount));
  if (!findWalletDelegate(prisma)) {
    return { ...wallet, balance: newBalance };
  }
  return prisma.userWallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance },
  });
}

export async function reserveWalletPoints(
  prisma: PrismaClient,
  input: {
    userId: string;
    amount: number;
    reason: string;
    referenceId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const wallet = await ensureUserWallet(prisma, input.userId);
  const amount = Math.max(0, Math.trunc(input.amount));
  if (wallet.balance < amount) {
    throw new Error("当前经营点不足");
  }
  const newBalance = wallet.balance - amount;
  const newFrozen = (wallet.frozenAmount ?? 0) + amount;
  if (!findWalletDelegate(prisma)) {
    return { ...wallet, balance: newBalance, frozenAmount: newFrozen };
  }
  return prisma.userWallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance, frozenAmount: newFrozen },
  });
}

export async function settleWalletReservation(
  prisma: PrismaClient,
  input: {
    userId: string;
    reservedAmount: number;
    actualAmount: number;
    reason: string;
    referenceId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const wallet = await ensureUserWallet(prisma, input.userId);
  const reserved = Math.max(0, Math.trunc(input.reservedAmount));
  const actual = Math.max(0, Math.min(Math.trunc(input.actualAmount), reserved));
  const refund = reserved - actual;
  const newFrozen = (wallet.frozenAmount ?? 0) - reserved;
  const newBalance = wallet.balance + refund;
  if (!findWalletDelegate(prisma)) {
    return { ...wallet, balance: newBalance, frozenAmount: Math.max(0, newFrozen) };
  }
  return prisma.userWallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance, frozenAmount: Math.max(0, newFrozen) },
  });
}

export async function releaseWalletReservation(
  prisma: PrismaClient,
  input: {
    userId: string;
    amount: number;
    reason: string;
    referenceId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const wallet = await ensureUserWallet(prisma, input.userId);
  const amount = Math.max(0, Math.trunc(input.amount));
  const newFrozen = Math.max(0, (wallet.frozenAmount ?? 0) - amount);
  const newBalance = wallet.balance + amount;
  if (!findWalletDelegate(prisma)) {
    return { ...wallet, balance: newBalance, frozenAmount: newFrozen };
  }
  return prisma.userWallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance, frozenAmount: newFrozen },
  });
}
