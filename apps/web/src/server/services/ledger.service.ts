/**
 * 账本服务 — WalletLedger 读写
 */
import type { PrismaClient } from "@/generated/prisma";

export type WalletLedgerType =
  | "PURCHASE" | "CONSUME" | "REFUND" | "BONUS" | "EXPIRE"
  | "RESERVE" | "RELEASE" | "SETTLE" | "ADJUST";

export async function appendWalletLedger(
  prisma: PrismaClient,
  input: {
    userId: string;
    walletId: string;
    amount: number;
    balanceAfter: number;
    type: WalletLedgerType;
    reason: string;
    referenceId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  if (!runtimePrisma.walletLedger || typeof runtimePrisma.walletLedger !== "object") {
    return null;
  }
  return prisma.walletLedger.create({
    data: {
      userId: input.userId,
      walletId: input.walletId,
      amount: Math.trunc(input.amount),
      balanceAfter: Math.max(0, Math.trunc(input.balanceAfter)),
      type: input.type,
      reason: input.reason,
      referenceId: input.referenceId ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function listWalletLedger(
  prisma: PrismaClient,
  input: { userId: string; take?: number },
) {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  if (!runtimePrisma.walletLedger || typeof runtimePrisma.walletLedger !== "object") {
    return [];
  }
  return prisma.walletLedger.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 20,
  });
}
