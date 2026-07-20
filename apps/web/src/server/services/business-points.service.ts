/**
 * MealKey 经营点产品接口
 * 对外保持“经营点”语义不变，内部底座切到 UserWallet / WalletLedger / ConsumptionRecord。
 */
import type { PrismaClient } from "@/generated/prisma";
import {
  RECHARGE_PACKS,
  SPEND_OFFERS,
  type SpendKind,
  type ValueArchiveItem,
} from "@/lib/business-wallet";
import { ensureBillingAccountForOwner, ensureDefaultPlans, getBillingSnapshot } from "./billing.service";
import {
  authorizeCapabilityConsumption,
  failCapabilityConsumption,
  listRecentConsumptions,
  settleCapabilityConsumption,
} from "./consumption.service";
import { listWalletLedger } from "./ledger.service";
import type { CapabilityCode } from "./pricing.service";
import {
  creditWalletPoints,
  ensureUserWallet,
  getUserWallet,
  LOCAL_TEST_WALLET_FLOOR_POINTS,
  reserveWalletPoints,
  settleWalletReservation,
} from "./wallet.service";

function parseJsonObject<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function hasConsumptionRecordDelegate(prisma: PrismaClient) {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  const delegate = runtimePrisma.consumptionRecord;
  return !!delegate && typeof delegate === "object";
}

function visibleTestingPoints(balance: number) {
  if (process.env.NODE_ENV === "production") return balance;
  return Math.max(balance, LOCAL_TEST_WALLET_FLOOR_POINTS);
}

function hasUserWalletDelegate(prisma: PrismaClient) {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  const delegate = runtimePrisma.userWallet;
  return !!delegate && typeof delegate === "object";
}

type WalletMeta = {
  pointsBootstrapped?: boolean;
  valueArchive?: ValueArchiveItem[];
  [key: string]: unknown;
};

type ChargeMeta = {
  sourceType: string;
  sourceId: string;
  spendKind: SpendKind;
  title?: string;
  description?: string;
};

function stringifyMeta(meta: WalletMeta) {
  return JSON.stringify(meta);
}

function capabilityForSpendKind(kind: SpendKind): CapabilityCode {
  switch (kind) {
    case "brand":
      return "brand_strategy";
    case "market":
      return "market_analysis";
    case "business":
      return "business_model";
    case "capital":
      return "equity_design";
    case "council":
      return "founder_council";
    case "growth":
    case "general":
    default:
      return "general_consulting";
  }
}

export function resolveSpendKind(input?: {
  spendKind?: string | null;
  agentCode?: string | null;
  department?: string | null;
}): SpendKind {
  const raw = (input?.spendKind || "").toLowerCase();
  if (raw && raw in SPEND_OFFERS) return raw as SpendKind;

  const agent = (input?.agentCode || "").toLowerCase();
  if (agent === "m-pnt" || agent === "brand") return "brand";
  if (agent === "m-mkt" || agent === "market") return "market";
  if (agent === "m-biz" || agent === "business") return "business";
  if (agent === "m-ed" || agent === "org" || agent === "capital") return "capital";
  if (agent === "chief") return "council";

  const dept = (input?.department || "").toLowerCase();
  if (dept === "brand") return "brand";
  if (dept === "market") return "market";
  if (dept === "business") return "business";
  if (dept === "org") return "capital";
  if (dept === "general") return "council";

  return "general";
}

export function pointsCostForSpendKind(kind: SpendKind): number {
  return SPEND_OFFERS[kind]?.cost ?? SPEND_OFFERS.general.cost;
}

export function marketedPointsForPlanCode(planCode: string, creditCents?: number | null): number {
  const pack = RECHARGE_PACKS.find((p) => p.planCode === planCode || p.code === planCode);
  if (pack) return pack.points;
  if (creditCents && creditCents > 0) {
    return Math.round(creditCents);
  }
  return 0;
}

async function resolveBillingAccount(prisma: PrismaClient, userId: string) {
  await ensureDefaultPlans(prisma);
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) throw new Error("经营者档案不存在，请先完成引导");
  const account = await ensureBillingAccountForOwner(prisma, {
    ownerId: owner.id,
    userId,
    name: owner.name,
  });
  return { owner, account };
}

async function updateWalletMeta(
  prisma: PrismaClient,
  userId: string,
  updater: (meta: WalletMeta) => WalletMeta,
) {
  const wallet = await ensureUserWallet(prisma, userId);
  const meta = parseJsonObject<WalletMeta>(wallet.metadata, {});
  const next = updater(meta);
  if (!hasUserWalletDelegate(prisma)) {
    return {
      ...wallet,
      metadata: stringifyMeta(next),
      balance: visibleTestingPoints(wallet.balance),
    };
  }
  return prisma.userWallet.update({
    where: { id: wallet.id },
    data: { metadata: stringifyMeta(next) },
  });
}

async function ensureWalletBootstrap(prisma: PrismaClient, userId: string) {
  const wallet = await ensureUserWallet(prisma, userId);
  const meta = parseJsonObject<WalletMeta>(wallet.metadata, {});
  if (meta.pointsBootstrapped) {
    const { account } = await resolveBillingAccount(prisma, userId);
    return { billingAccountId: account.id, balance: wallet.balance, meta };
  }

  const { account } = await resolveBillingAccount(prisma, userId);
  const legacyMeta = parseJsonObject<Record<string, unknown>>(account.metadata, {});
  const legacyPoints =
    typeof legacyMeta.businessPoints === "number" ? Math.max(0, Math.floor(legacyMeta.businessPoints)) : 0;

  if (legacyPoints > 0) {
    await creditWalletPoints(prisma, {
      userId,
      amount: legacyPoints,
      type: "ADJUST",
      reason: "迁移历史经营点余额",
      referenceId: account.id,
      metadata: { source: "billing_account.metadata.businessPoints" },
    });
  }

  const mergedArchive = Array.isArray(legacyMeta.valueArchive)
    ? (legacyMeta.valueArchive as ValueArchiveItem[])
    : [];

  const updated = await updateWalletMeta(prisma, userId, (current) => ({
    ...current,
    pointsBootstrapped: true,
    valueArchive: current.valueArchive?.length ? current.valueArchive : mergedArchive,
  }));

  return {
    billingAccountId: account.id,
    balance: visibleTestingPoints(updated.balance),
    meta: parseJsonObject<WalletMeta>(updated.metadata, {}),
  };
}

export async function ensureBusinessPointsBalance(
  prisma: PrismaClient,
  userId: string,
): Promise<{ billingAccountId: string; balance: number; meta: WalletMeta }> {
  return ensureWalletBootstrap(prisma, userId);
}

export async function getBusinessPointsBalance(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  const ensured = await ensureBusinessPointsBalance(prisma, userId);
  return ensured.balance;
}

export async function grantBusinessPoints(
  prisma: PrismaClient,
  input: {
    billingAccountId: string;
    points: number;
    description: string;
    sourceType: string;
    sourceId: string;
  },
) {
  if (input.points <= 0) return null;
  const account = await prisma.billingAccount.findUnique({
    where: { id: input.billingAccountId },
    select: { ownerId: true },
  });
  if (!account?.ownerId) return null;
  const owner = await prisma.owner.findUnique({
    where: { id: account.ownerId },
    select: { userId: true },
  });
  if (!owner?.userId) return null;

  const wallet = await creditWalletPoints(prisma, {
    userId: owner.userId,
    amount: input.points,
    type: "PURCHASE",
    reason: input.description,
    referenceId: input.sourceId,
    metadata: { sourceType: input.sourceType },
  });

  return { balanceAfter: wallet.balance };
}

export type PointsChargeResult = {
  billingAccountId: string;
  points: number;
  balanceAfter: number;
  spendKind: SpendKind;
  ledgerId: string;
};

async function findChargeRecord(prisma: PrismaClient, userId: string, sourceId: string) {
  if (!hasConsumptionRecordDelegate(prisma)) {
    return null;
  }
  return prisma.consumptionRecord.findFirst({
    where: {
      userId,
      metadata: { contains: sourceId },
      status: { in: ["AUTHORIZED", "SETTLED"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** 缺 ConsumptionRecord 表时，直接走钱包预留/结算，避免 findFirst 炸穿 */
async function chargeBusinessPointsViaWallet(
  prisma: PrismaClient,
  userId: string,
  ensured: { billingAccountId: string; balance: number; meta: WalletMeta },
  input: {
    spendKind: SpendKind;
    sourceType: string;
    sourceId: string;
    title?: string;
    description?: string;
  },
): Promise<PointsChargeResult> {
  const offer = SPEND_OFFERS[input.spendKind];
  const points = pointsCostForSpendKind(input.spendKind);
  const archived = (ensured.meta.valueArchive || []).find(
    (item) => item.id === input.sourceId && item.status !== "未完成",
  );
  if (archived) {
    return {
      billingAccountId: ensured.billingAccountId,
      points: archived.invested,
      balanceAfter: ensured.balance,
      spendKind: input.spendKind,
      ledgerId: `wallet_${input.sourceId}`,
    };
  }

  const reason =
    input.description || `消耗经营点 · ${input.title || offer.title}`;
  await reserveWalletPoints(prisma, {
    userId,
    amount: points,
    reason,
    referenceId: input.sourceId,
    metadata: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      spendKind: input.spendKind,
    },
  });
  const settled = await settleWalletReservation(prisma, {
    userId,
    reservedAmount: points,
    actualAmount: points,
    reason,
    referenceId: input.sourceId,
    metadata: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      spendKind: input.spendKind,
    },
  });

  await updateWalletMeta(prisma, userId, (meta) => {
    const archiveItem: ValueArchiveItem = {
      id: input.sourceId,
      dateLabel: new Date().toISOString().slice(0, 10),
      title: input.title || offer.title,
      invested: points,
      gained: offer.includes.slice(0, 4),
      status: "进行中",
    };
    return {
      ...meta,
      valueArchive: [
        archiveItem,
        ...(meta.valueArchive || []).filter((item) => item.id !== input.sourceId),
      ].slice(0, 40),
    };
  });

  return {
    billingAccountId: ensured.billingAccountId,
    points,
    balanceAfter: settled.balance,
    spendKind: input.spendKind,
    ledgerId: `wallet_${input.sourceId}`,
  };
}

export async function chargeBusinessPoints(
  prisma: PrismaClient,
  userId: string,
  input: {
    spendKind: SpendKind;
    sourceType: string;
    sourceId: string;
    title?: string;
    description?: string;
  },
): Promise<PointsChargeResult> {
  const ensured = await ensureBusinessPointsBalance(prisma, userId);
  if (!hasConsumptionRecordDelegate(prisma)) {
    return chargeBusinessPointsViaWallet(prisma, userId, ensured, input);
  }
  const existing = await findChargeRecord(prisma, userId, input.sourceId);
  if (existing) {
    const wallet = await getUserWallet(prisma, userId);
    return {
      billingAccountId: ensured.billingAccountId,
      points: existing.actualAmount || existing.requestedAmount,
      balanceAfter: wallet?.balance ?? ensured.balance,
      spendKind: input.spendKind,
      ledgerId: existing.id,
    };
  }

  const offer = SPEND_OFFERS[input.spendKind];
  const auth = await authorizeCapabilityConsumption(prisma, {
    userId,
    capability: capabilityForSpendKind(input.spendKind),
    agents: [],
    reason: input.description || `消耗经营点 · ${input.title || offer.title}`,
    metadata: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      spendKind: input.spendKind,
      title: input.title || offer.title,
    } satisfies ChargeMeta,
  });

  await settleCapabilityConsumption(prisma, {
    recordId: auth.recordId,
    userId,
    reservedAmount: auth.estimatedCost,
    actualAmount: pointsCostForSpendKind(input.spendKind),
    metadata: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      spendKind: input.spendKind,
      title: input.title || offer.title,
    } satisfies ChargeMeta,
  });

  await updateWalletMeta(prisma, userId, (meta) => {
    const archiveItem: ValueArchiveItem = {
      id: input.sourceId,
      dateLabel: new Date().toISOString().slice(0, 10),
      title: input.title || offer.title,
      invested: pointsCostForSpendKind(input.spendKind),
      gained: offer.includes.slice(0, 4),
      status: "进行中",
    };
    return {
      ...meta,
      valueArchive: [
        archiveItem,
        ...(meta.valueArchive || []).filter((item) => item.id !== input.sourceId),
      ].slice(0, 40),
    };
  });

  const wallet = await getUserWallet(prisma, userId);
  return {
    billingAccountId: ensured.billingAccountId,
    points: pointsCostForSpendKind(input.spendKind),
    balanceAfter: wallet?.balance ?? ensured.balance,
    spendKind: input.spendKind,
    ledgerId: auth.recordId,
  };
}

export async function refundBusinessPoints(
  prisma: PrismaClient,
  userId: string,
  input: {
    sourceType: string;
    sourceId: string;
    points?: number;
    reason?: string;
  },
): Promise<{ refunded: number; balanceAfter: number } | null> {
  const ensured = await ensureBusinessPointsBalance(prisma, userId);
  const existing = await findChargeRecord(prisma, userId, input.sourceId);
  if (!existing) return null;
  if (existing.status === "REFUNDED") {
    const wallet = await getUserWallet(prisma, userId);
    return {
      refunded: existing.actualAmount || existing.requestedAmount,
      balanceAfter: wallet?.balance ?? ensured.balance,
    };
  }

  await failCapabilityConsumption(prisma, {
    recordId: existing.id,
    reason: input.reason || "本次分析未完成，经营点已退回",
    metadata: { sourceType: input.sourceType, sourceId: input.sourceId },
  });

  await updateWalletMeta(prisma, userId, (meta) => ({
    ...meta,
    valueArchive: (meta.valueArchive || []).map((item) =>
      item.id === input.sourceId ? { ...item, status: "未完成" as const } : item,
    ),
  }));

  const wallet = await getUserWallet(prisma, userId);
  const refunded = input.points ?? existing.actualAmount ?? existing.requestedAmount;
  return {
    refunded,
    balanceAfter: wallet?.balance ?? ensured.balance,
  };
}

export async function completeValueArchive(
  prisma: PrismaClient,
  userId: string,
  input: {
    sourceId: string;
    gained?: string[];
    title?: string;
  },
) {
  await ensureBusinessPointsBalance(prisma, userId);
  await updateWalletMeta(prisma, userId, (meta) => ({
    ...meta,
    valueArchive: (meta.valueArchive || []).map((item) =>
      item.id !== input.sourceId
        ? item
        : {
            ...item,
            title: input.title || item.title,
            gained: input.gained?.length ? input.gained : item.gained,
            status: "已完成" as const,
          },
    ),
  }));
}

export async function listRecentPointSpend(
  prisma: PrismaClient,
  userId: string,
  limit = 12,
) {
  await ensureBusinessPointsBalance(prisma, userId);
  const rows = await listWalletLedger(prisma, { userId, take: limit });
  return rows.map((row) => ({
    id: row.id,
    entryType: row.type,
    amount: String(row.amount),
    description: row.reason,
    sourceId: row.referenceId,
    createdAt: row.createdAt,
  }));
}

export async function getWalletSnapshot(prisma: PrismaClient, userId: string) {
  const ensured = await ensureBusinessPointsBalance(prisma, userId);
  const billing = await getBillingSnapshot(prisma, userId);
  const monthDebits = hasConsumptionRecordDelegate(prisma)
    ? await prisma.consumptionRecord.count({
        where: {
          userId,
          status: "SETTLED",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      })
    : 0;
  const wallet = await getUserWallet(prisma, userId);
  const meta = parseJsonObject<WalletMeta>(wallet?.metadata, {});
  const visibleBalance = visibleTestingPoints(ensured.balance);

  return {
    businessPoints: visibleBalance,
    monthAnalyses: monthDebits,
    hoursSaved: monthDebits * 3,
    estimateDeep: Math.floor(visibleBalance / SPEND_OFFERS.council.cost),
    estimateConsult: Math.floor(visibleBalance / SPEND_OFFERS.general.cost),
    valueArchive: meta.valueArchive || [],
    recentConsumptions: await listRecentConsumptions(prisma, { userId, take: 12 }),
    billing,
  };
}
