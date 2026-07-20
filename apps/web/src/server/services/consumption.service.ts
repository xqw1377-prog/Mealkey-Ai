import type { PrismaClient } from "@/generated/prisma";
import {
  ensureCapabilityPricingSeeds,
  estimateCapabilityConsumption,
  getCapabilityLabel,
  mapAgentCodeToCapability,
  type CapabilityCode,
} from "./pricing.service";
import {
  ensureUserWallet,
  releaseWalletReservation,
  reserveWalletPoints,
  settleWalletReservation,
} from "./wallet.service";

function stringifyJson(value: unknown) {
  return JSON.stringify(value);
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseAgentCodes(raw: string | null | undefined) {
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function getConsumptionRecordDelegate(prisma: PrismaClient) {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  const delegate = runtimePrisma.consumptionRecord;
  if (!delegate || typeof delegate !== "object") return null;
  return delegate as Record<string, unknown>;
}

export async function previewCapabilityConsumption(
  prisma: PrismaClient,
  input: {
    userId: string;
    capability: CapabilityCode;
    depth?: string;
    complexity?: string | number;
    agents?: string[];
    model?: string;
    dataMode?: string;
  },
) {
  await ensureCapabilityPricingSeeds(prisma);
  const wallet = await ensureUserWallet(prisma, input.userId);
  const estimate = await estimateCapabilityConsumption(prisma, input);
  return {
    approved: wallet.balance >= estimate.estimated,
    estimatedCost: estimate.estimated,
    balanceBefore: wallet.balance,
    balanceAfter: wallet.balance - estimate.estimated,
    reason: `${getCapabilityLabel(input.capability)}消耗预估`,
    pricing: estimate,
  };
}

export async function authorizeCapabilityConsumption(
  prisma: PrismaClient,
  input: {
    userId: string;
    capability: CapabilityCode;
    depth?: string;
    complexity?: string | number;
    agents?: string[];
    model?: string;
    dataMode?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const preview = await previewCapabilityConsumption(prisma, input);
  if (!preview.approved) {
    throw new Error("当前经营点不足，请前往 /billing 充值经营点");
  }

  const reason = input.reason ?? `${getCapabilityLabel(input.capability)}预授权`;
  if (!getConsumptionRecordDelegate(prisma)) {
    const wallet = await reserveWalletPoints(prisma, {
      userId: input.userId,
      amount: preview.estimatedCost,
      reason,
      metadata: {
        capability: input.capability,
        pricing: preview.pricing,
        ...(input.metadata ?? {}),
      },
    });
    return {
      recordId: `wallet_auth_${input.userId}_${Date.now().toString(36)}`,
      approved: true,
      estimatedCost: preview.estimatedCost,
      balanceAfter: wallet.balance,
      reason,
    };
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await reserveWalletPoints(tx, {
      userId: input.userId,
      amount: preview.estimatedCost,
      reason,
      metadata: {
        capability: input.capability,
        pricing: preview.pricing,
        ...(input.metadata ?? {}),
      },
    });

    const record = await tx.consumptionRecord.create({
      data: {
        userId: input.userId,
        walletId: wallet.id,
        capability: input.capability,
        agentCodes: stringifyJson(input.agents ?? []),
        requestedAmount: preview.estimatedCost,
        actualAmount: 0,
        status: "AUTHORIZED",
        reason,
        pricingSnapshot: stringifyJson(preview.pricing),
        metadata: stringifyJson(input.metadata ?? null),
      },
    });

    return {
      recordId: record.id,
      approved: true,
      estimatedCost: preview.estimatedCost,
      balanceAfter: wallet.balance,
      reason: record.reason,
    };
  });
}

export async function settleCapabilityConsumption(
  prisma: PrismaClient,
  input: {
    recordId: string;
    userId?: string;
    reservedAmount?: number;
    actualAmount?: number;
    runId?: string | null;
    tokenInput?: number;
    tokenOutput?: number;
    tokenCached?: number;
    tokenReasoning?: number;
    model?: string | null;
    provider?: string | null;
    costCents?: number;
    metadata?: Record<string, unknown>;
  },
) {
  if (!getConsumptionRecordDelegate(prisma)) {
    const actualAmount = Math.max(0, Math.trunc(input.actualAmount ?? 0));
    const reservedAmount = Math.max(
      0,
      Math.trunc(input.reservedAmount ?? actualAmount),
    );
    if (!input.userId) {
      return {
        record: {
          id: input.recordId,
          status: "SETTLED" as const,
          requestedAmount: reservedAmount,
          actualAmount,
        },
        balanceAfter: 0,
      };
    }
    const wallet = await settleWalletReservation(prisma, {
      userId: input.userId,
      reservedAmount,
      actualAmount,
      reason: "能力消耗结算",
      referenceId: input.recordId,
      metadata: input.metadata,
    });
    return {
      record: {
        id: input.recordId,
        status: "SETTLED" as const,
        requestedAmount: reservedAmount,
        actualAmount,
      },
      balanceAfter: wallet.balance,
    };
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.consumptionRecord.findUnique({
      where: { id: input.recordId },
    });
    if (!record) {
      throw new Error("消耗记录不存在");
    }
    if (record.status === "SETTLED") {
      const hasEnrichment =
        input.runId != null ||
        input.tokenInput != null ||
        input.tokenOutput != null ||
        input.tokenCached != null ||
        input.tokenReasoning != null ||
        input.model !== undefined ||
        input.provider !== undefined ||
        input.costCents != null ||
        (input.metadata != null && Object.keys(input.metadata).length > 0);
      if (hasEnrichment) {
        const currentMetadata = parseJsonObject(record.metadata);
        const updated = await tx.consumptionRecord.update({
          where: { id: record.id },
          data: {
            runId: input.runId ?? record.runId,
            tokenInput: input.tokenInput ?? record.tokenInput,
            tokenOutput: input.tokenOutput ?? record.tokenOutput,
            tokenCached: input.tokenCached ?? record.tokenCached,
            tokenReasoning: input.tokenReasoning ?? record.tokenReasoning,
            tokenTotal:
              (input.tokenInput ?? record.tokenInput) +
              (input.tokenOutput ?? record.tokenOutput) +
              (input.tokenCached ?? record.tokenCached) +
              (input.tokenReasoning ?? record.tokenReasoning),
            model: input.model ?? record.model,
            provider: input.provider ?? record.provider,
            costCents: input.costCents ?? record.costCents,
            metadata:
              input.metadata != null && Object.keys(input.metadata).length > 0
                ? stringifyJson({
                    ...currentMetadata,
                    ...input.metadata,
                  })
                : record.metadata,
          },
        });
        const wallet = await ensureUserWallet(tx, record.userId);
        return { record: updated, balanceAfter: wallet.balance };
      }
      const wallet = await ensureUserWallet(tx, record.userId);
      return { record, balanceAfter: wallet.balance };
    }

    const actualAmount = Math.max(0, Math.trunc(input.actualAmount ?? record.requestedAmount));
    const wallet = await settleWalletReservation(tx, {
      userId: record.userId,
      reservedAmount: record.requestedAmount,
      actualAmount,
      reason: record.reason,
      referenceId: record.id,
      metadata: input.metadata,
    });

    const updated = await tx.consumptionRecord.update({
      where: { id: record.id },
      data: {
        actualAmount,
        status: "SETTLED",
        runId: input.runId ?? record.runId,
        tokenInput: input.tokenInput ?? record.tokenInput,
        tokenOutput: input.tokenOutput ?? record.tokenOutput,
        tokenCached: input.tokenCached ?? record.tokenCached,
        tokenReasoning: input.tokenReasoning ?? record.tokenReasoning,
        tokenTotal:
          (input.tokenInput ?? record.tokenInput) +
          (input.tokenOutput ?? record.tokenOutput) +
          (input.tokenCached ?? record.tokenCached) +
          (input.tokenReasoning ?? record.tokenReasoning),
        model: input.model ?? record.model,
        provider: input.provider ?? record.provider,
        costCents: input.costCents ?? record.costCents,
        metadata: stringifyJson({
          ...(record.metadata ? { previous: record.metadata } : {}),
          ...(input.metadata ?? {}),
        }),
      },
    });

    return { record: updated, balanceAfter: wallet.balance };
  });
}

export async function failCapabilityConsumption(
  prisma: PrismaClient,
  input: { recordId: string; reason?: string; metadata?: Record<string, unknown> },
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.consumptionRecord.findUnique({
      where: { id: input.recordId },
    });
    if (!record) {
      throw new Error("消耗记录不存在");
    }
    if (record.status === "FAILED" || record.status === "REFUNDED") {
      const wallet = await ensureUserWallet(tx, record.userId);
      return { record, balanceAfter: wallet.balance };
    }

    const wallet = await releaseWalletReservation(tx, {
      userId: record.userId,
      amount: record.requestedAmount,
      reason: input.reason ?? `${record.reason}失败退回`,
      referenceId: record.id,
      metadata: input.metadata,
    });

    const updated = await tx.consumptionRecord.update({
      where: { id: record.id },
      data: {
        status: "REFUNDED",
        metadata: stringifyJson({
          ...(record.metadata ? { previous: record.metadata } : {}),
          ...(input.metadata ?? {}),
        }),
      },
    });

    return { record: updated, balanceAfter: wallet.balance };
  });
}

export async function listRecentConsumptions(
  prisma: PrismaClient,
  input: { userId: string; take?: number },
) {
  if (!getConsumptionRecordDelegate(prisma)) {
    return [];
  }
  const rows = await prisma.consumptionRecord.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 20,
  });

  return rows.map((row) => ({
    ...row,
    agentCodesList: parseAgentCodes(row.agentCodes),
  }));
}

export async function authorizeAgentCapability(
  prisma: PrismaClient,
  input: {
    userId: string;
    agentCode?: string | null;
    depth?: string;
    complexity?: string | number;
    reason?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const capability = mapAgentCodeToCapability(input.agentCode);
  return authorizeCapabilityConsumption(prisma, {
    userId: input.userId,
    capability,
    depth: input.depth,
    complexity: input.complexity,
    agents: input.agentCode ? [input.agentCode] : [],
    reason: input.reason,
    metadata: { agentCode: input.agentCode, ...(input.metadata ?? {}) },
  });
}
