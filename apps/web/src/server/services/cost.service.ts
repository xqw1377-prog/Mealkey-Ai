/**
 * 成本服务 — 记录模型成本到 ConsumptionRecord
 */
import type { PrismaClient } from "@/generated/prisma";

export async function recordConsumptionCost(
  prisma: PrismaClient,
  input: {
    consumptionRecordId?: string | null;
    runId?: string | null;
    provider?: string | null;
    model?: string | null;
    tokenInput?: number;
    tokenOutput?: number;
    tokenCached?: number;
    tokenReasoning?: number;
    costCents?: number;
  },
) {
  const record = input.consumptionRecordId
    ? await prisma.consumptionRecord.findUnique({ where: { id: input.consumptionRecordId } })
    : input.runId
      ? await prisma.consumptionRecord.findFirst({
          where: { runId: input.runId },
          orderBy: { createdAt: "desc" },
        })
      : null;
  if (!record) return null;

  const tokenInput = Math.max(0, Math.trunc(input.tokenInput ?? record.tokenInput));
  const tokenOutput = Math.max(0, Math.trunc(input.tokenOutput ?? record.tokenOutput));
  const tokenCached = Math.max(0, Math.trunc(input.tokenCached ?? record.tokenCached));
  const tokenReasoning = Math.max(0, Math.trunc(input.tokenReasoning ?? record.tokenReasoning));

  return prisma.consumptionRecord.update({
    where: { id: record.id },
    data: {
      provider: input.provider ?? record.provider,
      model: input.model ?? record.model,
      tokenInput,
      tokenOutput,
      tokenCached,
      tokenReasoning,
      tokenTotal: tokenInput + tokenOutput + tokenCached + tokenReasoning,
      costCents: Math.max(0, Math.trunc(input.costCents ?? record.costCents)),
      runId: input.runId ?? record.runId,
    },
  });
}

export async function getCapabilityEconomicsSummary(
  prisma: PrismaClient,
  input?: { take?: number },
) {
  const rows = await prisma.consumptionRecord.findMany({
    where: { status: "SETTLED" },
    orderBy: { createdAt: "desc" },
    take: input?.take ?? 1000,
  });
  const map = new Map<string, { capability: string; calls: number; revenuePoints: number; costCents: number }>();
  for (const row of rows) {
    const current = map.get(row.capability) ?? { capability: row.capability, calls: 0, revenuePoints: 0, costCents: 0 };
    current.calls += 1;
    current.revenuePoints += row.actualAmount;
    current.costCents += row.costCents;
    map.set(row.capability, current);
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenuePoints - a.revenuePoints)
    .map((item) => ({
      ...item,
      marginCents: item.revenuePoints - item.costCents,
      marginRate: item.revenuePoints > 0
        ? Number((((item.revenuePoints - item.costCents) / item.revenuePoints) * 100).toFixed(1))
        : null,
    }));
}
