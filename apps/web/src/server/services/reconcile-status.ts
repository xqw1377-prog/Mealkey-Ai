/**
 * 对账状态服务 — 用于平台管理端展示最近一次对账结果
 */
import type { PrismaClient } from "@/generated/prisma";

export type LastReconcile = {
  at: string;
  source: "cron" | "admin";
  dryRun: boolean;
  counted: number;
  paid: number;
  closed: number;
  skipped: number;
};

export async function getLastReconcileStatus(prisma: PrismaClient): Promise<LastReconcile | null> {
  try {
    const runtimePrisma = prisma as unknown as Record<string, unknown>;
    if (!runtimePrisma.platformMeta || typeof runtimePrisma.platformMeta !== "object") {
      return null;
    }
    const meta = await (prisma as any).platformMeta.findFirst({
      where: { key: "payment_reconcile_status" },
      orderBy: { updatedAt: "desc" },
    });
    if (!meta) return null;
    const value = typeof meta.value === "string" ? JSON.parse(meta.value) : meta.value;
    return {
      at: value.at || meta.updatedAt?.toISOString(),
      source: value.source || "cron",
      dryRun: value.dryRun ?? false,
      counted: value.counted ?? 0,
      paid: value.paid ?? 0,
      closed: value.closed ?? 0,
      skipped: value.skipped ?? 0,
    };
  } catch {
    return null;
  }
}

export async function setLastReconcileStatus(
  prisma: PrismaClient,
  input: LastReconcile,
): Promise<void> {
  try {
    const runtimePrisma = prisma as unknown as Record<string, unknown>;
    if (!runtimePrisma.platformMeta || typeof runtimePrisma.platformMeta !== "object") {
      return;
    }
    await (prisma as any).platformMeta.upsert({
      where: { key: "payment_reconcile_status" },
      create: { key: "payment_reconcile_status", value: JSON.stringify(input) },
      update: { value: JSON.stringify(input) },
    });
  } catch {
    // ignore
  }
}

export async function recordReconcileStatus(
  prisma: PrismaClient,
  input: Omit<LastReconcile, "at"> & { at?: string },
): Promise<LastReconcile> {
  const snapshot: LastReconcile = {
    at: input.at ?? new Date().toISOString(),
    source: input.source,
    dryRun: input.dryRun,
    counted: input.counted,
    paid: input.paid,
    closed: input.closed,
    skipped: input.skipped,
  };
  await setLastReconcileStatus(prisma, snapshot);
  return snapshot;
}
