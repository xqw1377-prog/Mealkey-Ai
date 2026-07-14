import type { PrismaClient } from "@/generated/prisma";
import { chargeOverageIfNeeded, getPlanCommercialMeta } from "@/server/services/billing.service";

export type RecordAgentRunUsageInput = {
  runId: string;
  agentId?: string | null;
  provider?: string | null;
  model?: string | null;
  tokens?: number | null;
  billable?: boolean;
  billingAccountId?: string | null;
};

async function resolveBillingAccountId(
  prisma: PrismaClient,
  runId: string,
  explicit?: string | null,
): Promise<string | undefined> {
  if (explicit) return explicit;

  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { ownerId: true },
  });
  if (!run?.ownerId) return undefined;

  const account = await prisma.billingAccount.findFirst({
    where: { ownerId: run.ownerId, status: "active" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return account?.id;
}

async function settleHybridOverage(
  prisma: PrismaClient,
  input: { runId: string; billingAccountId: string; agentId?: string | null },
) {
  const existing = await prisma.creditLedger.findFirst({
    where: {
      billingAccountId: input.billingAccountId,
      entryType: "USAGE_OVERAGE",
      sourceId: input.runId,
    },
    select: { id: true },
  });
  if (existing) return;

  const now = new Date();
  const subscription = await prisma.subscription.findFirst({
    where: {
      billingAccountId: input.billingAccountId,
      status: "active",
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return;

  const plan = await prisma.plan.findUnique({ where: { id: subscription.planId } });
  if (!plan) return;
  const meta = getPlanCommercialMeta(plan);
  if (meta.kind !== "platform") {
    // 用量挂在平台订阅周期上：找到平台订阅
    const platformSubs = await prisma.subscription.findMany({
      where: {
        billingAccountId: input.billingAccountId,
        status: "active",
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    let platformPlan = plan;
    let platformSub = subscription;
    for (const sub of platformSubs) {
      const p = await prisma.plan.findUnique({ where: { id: sub.planId } });
      if (p && getPlanCommercialMeta(p).kind === "platform") {
        platformPlan = p;
        platformSub = sub;
        break;
      }
    }
    const platformMeta = getPlanCommercialMeta(platformPlan);
    const used = await prisma.usageRecord.count({
      where: {
        billingAccountId: input.billingAccountId,
        usageType: "agent_run",
        occurredAt: {
          gte: platformSub.currentPeriodStart ?? new Date(0),
          lte: platformSub.currentPeriodEnd ?? now,
        },
      },
    });
    if (used <= platformPlan.includedRuns) return;
    await chargeOverageIfNeeded(prisma, {
      billingAccountId: input.billingAccountId,
      runId: input.runId,
      overageRunCents: platformMeta.overageRunCents,
      chargeMode: "overage",
      agentCode: input.agentId,
    });
    return;
  }

  const used = await prisma.usageRecord.count({
    where: {
      billingAccountId: input.billingAccountId,
      usageType: "agent_run",
      occurredAt: {
        gte: subscription.currentPeriodStart ?? new Date(0),
        lte: subscription.currentPeriodEnd ?? now,
      },
    },
  });

  if (used <= plan.includedRuns) return;

  await chargeOverageIfNeeded(prisma, {
    billingAccountId: input.billingAccountId,
    runId: input.runId,
    overageRunCents: meta.overageRunCents,
    chargeMode: "overage",
    agentCode: input.agentId,
  });
}

/**
 * Agent 主路径用量事实：一次 Run 对应一条 UsageRecord。
 * 用 sourceEventId 幂等；超出套餐后按 Hybrid 超额扣余额。
 */
export async function recordAgentRunUsage(
  prisma: PrismaClient,
  input: RecordAgentRunUsageInput,
): Promise<void> {
  const sourceEventId = `agent-run-usage:${input.runId}`;
  const tokenTotal = Math.max(0, Math.floor(input.tokens ?? 0));
  const billingAccountId = await resolveBillingAccountId(
    prisma,
    input.runId,
    input.billingAccountId,
  );

  await prisma.usageRecord.upsert({
    where: { sourceEventId },
    update: {
      agentId: input.agentId ?? undefined,
      provider: input.provider ?? undefined,
      model: input.model ?? undefined,
      tokenOutput: tokenTotal,
      tokenTotal,
      billable: input.billable ?? true,
      billingAccountId: billingAccountId ?? undefined,
      occurredAt: new Date(),
    },
    create: {
      runId: input.runId,
      agentId: input.agentId ?? undefined,
      billingAccountId: billingAccountId ?? undefined,
      usageType: "agent_run",
      provider: input.provider ?? undefined,
      model: input.model ?? undefined,
      tokenInput: 0,
      tokenOutput: tokenTotal,
      tokenCached: 0,
      tokenReasoning: 0,
      tokenTotal,
      cost: "0",
      currency: "CNY",
      billable: input.billable ?? true,
      source: "mealkey.web",
      sourceEventId,
      occurredAt: new Date(),
    },
  });

  if (billingAccountId) {
    try {
      await settleHybridOverage(prisma, {
        runId: input.runId,
        billingAccountId,
        agentId: input.agentId,
      });
    } catch {
      // 扣费失败不阻断主链路；下次 assertAgentQuota 会拦截
    }
  }
}
