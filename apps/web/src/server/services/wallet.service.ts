/**
 * 钱包服务 — UserWallet 读写（预扣/结算/释放均走 CAS updateMany）
 */
import type { Prisma, PrismaClient } from "@/generated/prisma";
import { appendWalletLedger, type WalletLedgerType } from "./ledger.service";

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
    (typeof candidate.update !== "function" && typeof candidate.updateMany !== "function")
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
  const amount = Math.max(0, Math.trunc(input.amount));
  const newBalance = wallet.balance + amount;
  if (!findWalletDelegate(prisma)) {
    return { ...wallet, balance: newBalance };
  }

  const cas = await prisma.userWallet.updateMany({
    where: { id: wallet.id, status: "active", balance: wallet.balance },
    data: { balance: { increment: amount } },
  });
  if (cas.count === 0) {
    throw new Error("经营点账户更新冲突，请重试");
  }
  const updated = await prisma.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await appendWalletLedger(prisma as PrismaClient, {
    userId: input.userId,
    walletId: updated.id,
    amount,
    balanceAfter: updated.balance,
    type: (input.type as WalletLedgerType) || "ADJUST",
    reason: input.reason,
    referenceId: input.referenceId,
    metadata: input.metadata,
  });
  return updated;
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
  if (amount <= 0) return wallet;

  if (!findWalletDelegate(prisma)) {
    if (wallet.balance < amount) throw new Error("当前经营点不足");
    return {
      ...wallet,
      balance: wallet.balance - amount,
      frozenAmount: (wallet.frozenAmount ?? 0) + amount,
    };
  }

  // 幂等：同一 referenceId 已 RESERVE 则直接返回当前钱包
  if (input.referenceId) {
    const runtimePrisma = prisma as unknown as Record<string, unknown>;
    if (runtimePrisma.walletLedger && typeof runtimePrisma.walletLedger === "object") {
      const existing = await prisma.walletLedger.findFirst({
        where: {
          userId: input.userId,
          referenceId: input.referenceId,
          type: "RESERVE",
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        return prisma.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      }
    }
  }

  const cas = await prisma.userWallet.updateMany({
    where: {
      id: wallet.id,
      status: "active",
      balance: { gte: amount },
    },
    data: {
      balance: { decrement: amount },
      frozenAmount: { increment: amount },
    },
  });
  if (cas.count === 0) {
    throw new Error("当前经营点不足");
  }

  const updated = await prisma.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await appendWalletLedger(prisma as PrismaClient, {
    userId: input.userId,
    walletId: updated.id,
    amount: -amount,
    balanceAfter: updated.balance,
    type: "RESERVE",
    reason: input.reason,
    referenceId: input.referenceId,
    metadata: input.metadata,
  });
  return updated;
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

  if (!findWalletDelegate(prisma)) {
    return {
      ...wallet,
      balance: wallet.balance + refund,
      frozenAmount: Math.max(0, (wallet.frozenAmount ?? 0) - reserved),
    };
  }

  if (input.referenceId) {
    const runtimePrisma = prisma as unknown as Record<string, unknown>;
    if (runtimePrisma.walletLedger && typeof runtimePrisma.walletLedger === "object") {
      const existing = await prisma.walletLedger.findFirst({
        where: {
          userId: input.userId,
          referenceId: input.referenceId,
          type: "SETTLE",
        },
      });
      if (existing) {
        return prisma.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      }
    }
  }

  const cas = await prisma.userWallet.updateMany({
    where: {
      id: wallet.id,
      status: "active",
      frozenAmount: { gte: reserved },
    },
    data: {
      frozenAmount: { decrement: reserved },
      balance: { increment: refund },
      totalConsumed: { increment: actual },
    },
  });
  if (cas.count === 0) {
    throw new Error("预扣金额异常或经营点不足");
  }

  const updated = await prisma.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await appendWalletLedger(prisma as PrismaClient, {
    userId: input.userId,
    walletId: updated.id,
    amount: -actual,
    balanceAfter: updated.balance,
    type: "SETTLE",
    reason: input.reason,
    referenceId: input.referenceId,
    metadata: {
      ...(input.metadata ?? {}),
      reserved,
      actual,
      refund,
    },
  });
  return updated;
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
  if (amount <= 0) return wallet;

  if (!findWalletDelegate(prisma)) {
    return {
      ...wallet,
      balance: wallet.balance + amount,
      frozenAmount: Math.max(0, (wallet.frozenAmount ?? 0) - amount),
    };
  }

  const cas = await prisma.userWallet.updateMany({
    where: {
      id: wallet.id,
      status: "active",
      frozenAmount: { gte: amount },
    },
    data: {
      frozenAmount: { decrement: amount },
      balance: { increment: amount },
    },
  });
  if (cas.count === 0) {
    throw new Error("预扣金额异常或经营点不足");
  }

  const updated = await prisma.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await appendWalletLedger(prisma as PrismaClient, {
    userId: input.userId,
    walletId: updated.id,
    amount,
    balanceAfter: updated.balance,
    type: "RELEASE",
    reason: input.reason,
    referenceId: input.referenceId,
    metadata: input.metadata,
  });
  return updated;
}
