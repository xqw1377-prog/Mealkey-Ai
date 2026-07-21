/**
 * 钱包服务 — UserWallet 读写
 * 经营点余额、预留、结算、充值
 */
import type { Prisma, PrismaClient } from "@/generated/prisma";

type WalletPrisma = PrismaClient | Prisma.TransactionClient;

export const LOCAL_TEST_WALLET_FLOOR_POINTS = 5000;

function findWalletDelegate(prisma: WalletPrisma) {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  const delegate = runtimePrisma.userWallet;
  if (!delegate || typeof delegate !== "object") return null;
  const candidate = delegate as Record<string, unknown>;
  if (
    typeof candidate.findUnique !== "function" ||
    typeof candidate.create !== "function" ||
    typeof candidate.update !== "function"
  ) {
    return null;
  }
  return candidate;
}

function shouldUseLocalWalletFallback(prisma: WalletPrisma) {
  return process.env.NODE_ENV !== "production" && !findWalletDelegate(prisma);
}

function localWallet(userId: string) {
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

export async function ensureUserWallet(prisma: WalletPrisma, userId: string) {
  const delegate = findWalletDelegate(prisma);
  if (!delegate) {
    if (shouldUseLocalWalletFallback(prisma)) return localWallet(userId);
    throw new Error("经营点账户未就绪");
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

export async function getUserWallet(prisma: WalletPrisma, userId: string) {
  if (!findWalletDelegate(prisma)) {
    return null;
  }
  return prisma.userWallet.findUnique({ where: { userId } });
}

export async function creditWalletPoints(
  prisma: WalletPrisma,
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
  prisma: WalletPrisma,
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
  prisma: WalletPrisma,
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
  prisma: WalletPrisma,
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
