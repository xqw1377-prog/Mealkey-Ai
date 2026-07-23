import type { PrismaClient } from "@/generated/prisma";

export type AgentCode = "chief" | "m-mkt" | "m-pnt" | "m-ed" | "m-biz";

export const AGENT_CATALOG: Array<{
  code: AgentCode;
  name: string;
  description: string;
}> = [
  { code: "chief", name: "经营会议", description: "母体会议入口，通用经营判断" },
  { code: "m-mkt", name: "市场机会", description: "市场进入判断，独立咨询能力" },
  { code: "m-pnt", name: "品牌定位", description: "品牌战略咨询，独立工作台" },
  { code: "m-ed", name: "股权诊断", description: "股权与治理判断，独立工作台" },
  { code: "m-biz", name: "商业模式", description: "商业顾问能力，独立工作台" },
];

type PlanSeed = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceCents: number;
  includedRuns: number;
  includedTokens: number;
  includedAgents: AgentCode[];
  overageRunCents: number;
  kind: "platform" | "agent_addon" | "credit_pack";
  agentCode?: AgentCode;
  creditCents?: number;
};

const PLAN_SEEDS: PlanSeed[] = [
  {
    id: "plan_starter",
    code: "starter",
    name: "体验版",
    description: "母体会议体验：含经营会议，专项 Agent 需单独开通",
    priceCents: 0,
    includedRuns: 100,
    includedTokens: 500000,
    includedAgents: ["chief"],
    overageRunCents: 99,
    kind: "platform",
  },
  {
    id: "plan_growth",
    code: "growth",
    name: "增长版",
    description: "母体 + 四专项 Agent，含 Hybrid 超额按次计费",
    priceCents: 19900,
    includedRuns: 3000,
    includedTokens: 5000000,
    includedAgents: ["chief", "m-mkt", "m-pnt", "m-ed", "m-biz"],
    overageRunCents: 49,
    kind: "platform",
  },
  {
    id: "plan_partner",
    code: "partner",
    name: "合伙版",
    description: "高用量团队：全 Agent + 更低超额单价",
    priceCents: 69900,
    includedRuns: 15000,
    includedTokens: 20000000,
    includedAgents: ["chief", "m-mkt", "m-pnt", "m-ed", "m-biz"],
    overageRunCents: 29,
    kind: "platform",
  },
  {
    id: "plan_addon_m_mkt",
    code: "addon_m-mkt",
    name: "市场机会 Agent",
    description: "独立开通 M-MKT，可单独运行",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-mkt"],
    overageRunCents: 99,
    kind: "agent_addon",
    agentCode: "m-mkt",
  },
  {
    id: "plan_addon_m_pnt",
    code: "addon_m-pnt",
    name: "品牌定位 Agent",
    description: "独立开通 M-PNT，可单独运行",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-pnt"],
    overageRunCents: 99,
    kind: "agent_addon",
    agentCode: "m-pnt",
  },
  {
    id: "plan_addon_m_ed",
    code: "addon_m-ed",
    name: "股权诊断 Agent",
    description: "独立开通 M-ED，可单独运行",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-ed"],
    overageRunCents: 99,
    kind: "agent_addon",
    agentCode: "m-ed",
  },
  {
    id: "plan_addon_m_biz",
    code: "addon_m-biz",
    name: "商业模式 Agent",
    description: "独立开通 M-BIZ，可单独运行",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-biz"],
    overageRunCents: 99,
    kind: "agent_addon",
    agentCode: "m-biz",
  },
  {
    id: "plan_credit_50",
    code: "credit_50",
    name: "额度包 ¥50",
    description: "充值账户余额，用于 Hybrid 超额按次扣费",
    priceCents: 5000,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: [],
    overageRunCents: 99,
    kind: "credit_pack",
    creditCents: 5000,
  },
];

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parsePlanMeta(raw: string | null | undefined): {
  includedAgents: AgentCode[];
  overageRunCents: number;
  kind: string;
  agentCode?: AgentCode;
  creditCents?: number;
} {
  try {
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const includedAgents = Array.isArray(parsed.includedAgents)
      ? (parsed.includedAgents.filter((item): item is AgentCode =>
          typeof item === "string" &&
          ["chief", "m-mkt", "m-pnt", "m-ed", "m-biz"].includes(item),
        ) as AgentCode[])
      : (["chief"] as AgentCode[]);
    return {
      includedAgents,
      overageRunCents:
        typeof parsed.overageRunCents === "number" ? parsed.overageRunCents : 99,
      kind: typeof parsed.kind === "string" ? parsed.kind : "platform",
      agentCode:
        typeof parsed.agentCode === "string" ? (parsed.agentCode as AgentCode) : undefined,
      creditCents: typeof parsed.creditCents === "number" ? parsed.creditCents : undefined,
    };
  } catch {
    return { includedAgents: ["chief"], overageRunCents: 99, kind: "platform" };
  }
}

export function getPlanCommercialMeta(plan: { metadata: string | null }) {
  return parsePlanMeta(plan.metadata);
}

export async function ensureDefaultPlans(prisma: PrismaClient) {
  for (const plan of PLAN_SEEDS) {
    const metadata = JSON.stringify({
      seeded: true,
      locale: "zh-CN",
      kind: plan.kind,
      includedAgents: plan.includedAgents,
      overageRunCents: plan.overageRunCents,
      agentCode: plan.agentCode ?? null,
      creditCents: plan.creditCents ?? null,
    });

    await prisma.plan.upsert({
      where: { code: plan.code },
      create: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        billingCycle: "MONTHLY",
        priceCents: plan.priceCents,
        currency: "CNY",
        includedTokens: plan.includedTokens,
        includedRuns: plan.includedRuns,
        status: "active",
        metadata,
      },
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        includedRuns: plan.includedRuns,
        includedTokens: plan.includedTokens,
        status: "active",
        metadata,
      },
    });
  }
}

export async function ensureBillingAccountForOwner(
  prisma: PrismaClient,
  input: { ownerId: string; userId: string; name?: string | null },
) {
  const existing = await prisma.billingAccount.findFirst({
    where: { ownerId: input.ownerId, status: "active" },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const anyExisting = await prisma.billingAccount.findFirst({
    where: { ownerId: input.ownerId },
    orderBy: { createdAt: "asc" },
  });
  if (anyExisting) return anyExisting;

  const id = `ba_${input.ownerId}`;
  return prisma.billingAccount.create({
    data: {
      id,
      ownerId: input.ownerId,
      name: input.name?.trim() || `账户-${input.userId.slice(-6)}`,
      status: "active",
      currency: "CNY",
      balance: "0",
      metadata: JSON.stringify({ userId: input.userId, autoCreated: true }),
    },
  });
}

export async function grantAgentEntitlements(
  prisma: PrismaClient,
  input: {
    billingAccountId: string;
    agentCodes: AgentCode[];
    source: "plan" | "addon" | "grant";
    planId?: string;
    subscriptionId?: string;
    endsAt?: Date | null;
  },
) {
  const now = new Date();
  for (const agentCode of input.agentCodes) {
    await prisma.agentEntitlement.upsert({
      where: {
        billingAccountId_agentCode: {
          billingAccountId: input.billingAccountId,
          agentCode,
        },
      },
      create: {
        billingAccountId: input.billingAccountId,
        agentCode,
        status: "active",
        source: input.source,
        planId: input.planId,
        subscriptionId: input.subscriptionId,
        startedAt: now,
        endsAt: input.endsAt ?? null,
        metadata: JSON.stringify({ grantedAt: now.toISOString() }),
      },
      update: {
        status: "active",
        source: input.source,
        planId: input.planId,
        subscriptionId: input.subscriptionId,
        endsAt: input.endsAt ?? null,
        updatedAt: now,
      },
    });
  }
}

export async function ensureFreeSubscription(prisma: PrismaClient, billingAccountId: string) {
  const now = new Date();
  const activeSubs = await prisma.subscription.findMany({
    where: {
      billingAccountId,
      status: "active",
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });

  for (const active of activeSubs) {
    const plan = await prisma.plan.findUnique({ where: { id: active.planId } });
    if (!plan) continue;
    const meta = parsePlanMeta(plan.metadata);
    if (meta.kind !== "platform") continue;
    await grantAgentEntitlements(prisma, {
      billingAccountId,
      agentCodes: meta.includedAgents,
      source: "plan",
      planId: plan.id,
      subscriptionId: active.id,
      endsAt: active.currentPeriodEnd,
    });
    return active;
  }

  await ensureDefaultPlans(prisma);
  const starter = await prisma.plan.findUnique({ where: { code: "starter" } });
  if (!starter) {
    throw new Error("未找到体验版套餐，请先初始化套餐");
  }

  const subscription = await prisma.subscription.create({
    data: {
      id: createId("sub"),
      billingAccountId,
      planId: starter.id,
      status: "active",
      seats: 1,
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: addDays(now, 30),
      cancelAtPeriodEnd: false,
      metadata: JSON.stringify({ source: "ensure_free", planCode: "starter" }),
    },
  });

  await grantAgentEntitlements(prisma, {
    billingAccountId,
    agentCodes: parsePlanMeta(starter.metadata).includedAgents,
    source: "plan",
    planId: starter.id,
    subscriptionId: subscription.id,
    endsAt: subscription.currentPeriodEnd,
  });

  return subscription;
}

async function countPeriodAgentRuns(
  prisma: PrismaClient,
  billingAccountId: string,
  periodStart: Date | null | undefined,
  periodEnd: Date | null | undefined,
  agentCode?: string,
) {
  const start = periodStart ?? new Date(0);
  const end = periodEnd ?? new Date();

  return prisma.usageRecord.count({
    where: {
      billingAccountId,
      usageType: "agent_run",
      occurredAt: { gte: start, lte: end },
      ...(agentCode ? { agentId: agentCode } : {}),
    },
  });
}

export async function listActiveEntitlements(prisma: PrismaClient, billingAccountId: string) {
  const now = new Date();
  const rows = await prisma.agentEntitlement.findMany({
    where: {
      billingAccountId,
      status: "active",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  return rows;
}

export async function assertAgentAccess(
  prisma: PrismaClient,
  userId: string,
  agentCode: AgentCode,
) {
  const snapshot = await getBillingSnapshot(prisma, userId);
  const entitled = snapshot.entitlements.some((item) => item.agentCode === agentCode);
  if (!entitled) {
    const label = AGENT_CATALOG.find((item) => item.code === agentCode)?.name || agentCode;
    throw new Error(`未开通「${label}」能力，请前往 /billing 单独开通该 Agent`);
  }
  return snapshot;
}

export async function getBillingSnapshot(prisma: PrismaClient, userId: string) {
  await ensureDefaultPlans(prisma);

  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) {
    throw new Error("经营者档案不存在，请先完成引导");
  }

  const account = await ensureBillingAccountForOwner(prisma, {
    ownerId: owner.id,
    userId,
    name: owner.name,
  });
  const activeSubscription = await ensureFreeSubscription(prisma, account.id);
  const plan = await prisma.plan.findUnique({ where: { id: activeSubscription.planId } });
  if (!plan) {
    throw new Error("订阅关联套餐不存在");
  }

  const planMeta = parsePlanMeta(plan.metadata);
  const periodRunsUsed = await countPeriodAgentRuns(
    prisma,
    account.id,
    activeSubscription.currentPeriodStart,
    activeSubscription.currentPeriodEnd,
  );
  const periodRunsLimit = plan.includedRuns;
  const remainingRuns = Math.max(0, periodRunsLimit - periodRunsUsed);
  const entitlements = await listActiveEntitlements(prisma, account.id);

  const usageByAgent = await Promise.all(
    AGENT_CATALOG.map(async (agent) => ({
      agentCode: agent.code,
      name: agent.name,
      entitled: entitlements.some((item) => item.agentCode === agent.code),
      runsUsed: await countPeriodAgentRuns(
        prisma,
        account.id,
        activeSubscription.currentPeriodStart,
        activeSubscription.currentPeriodEnd,
        agent.code,
      ),
    })),
  );

  const balanceCents = Math.round((Number.parseFloat(account.balance || "0") || 0) * 100);

  return {
    account,
    activeSubscription,
    plan,
    planMeta,
    periodRunsUsed,
    periodRunsLimit,
    remainingRuns,
    balanceCents,
    overageRunCents: planMeta.overageRunCents,
    entitlements,
    usageByAgent,
    hybrid: {
      includedRemaining: remainingRuns,
      overageEnabled: planMeta.overageRunCents > 0,
      affordableOverageRuns:
        planMeta.overageRunCents > 0
          ? Math.floor(balanceCents / planMeta.overageRunCents)
          : 0,
    },
  };
}

export type QuotaAssertion = {
  billingAccountId: string;
  subscriptionId: string;
  planCode: string;
  chargeMode: "included" | "overage";
  overageRunCents: number;
  agentCode?: AgentCode;
};

export async function assertAgentQuota(
  prisma: PrismaClient,
  userId: string,
  options?: { agentCode?: AgentCode },
): Promise<QuotaAssertion> {
  if (options?.agentCode) {
    await assertAgentAccess(prisma, userId, options.agentCode);
  }

  const snapshot = await getBillingSnapshot(prisma, userId);

  if (snapshot.remainingRuns > 0) {
    return {
      billingAccountId: snapshot.account.id,
      subscriptionId: snapshot.activeSubscription.id,
      planCode: snapshot.plan.code,
      chargeMode: "included",
      overageRunCents: snapshot.overageRunCents,
      agentCode: options?.agentCode,
    };
  }

  if (snapshot.overageRunCents > 0 && snapshot.balanceCents >= snapshot.overageRunCents) {
    return {
      billingAccountId: snapshot.account.id,
      subscriptionId: snapshot.activeSubscription.id,
      planCode: snapshot.plan.code,
      chargeMode: "overage",
      overageRunCents: snapshot.overageRunCents,
      agentCode: options?.agentCode,
    };
  }

  throw new Error(
    "会议额度已用完且余额不足以支付超额费用，请前往 /billing 升级套餐或充值额度包",
  );
}

export async function chargeOverageIfNeeded(
  prisma: PrismaClient,
  input: {
    billingAccountId: string;
    runId: string;
    overageRunCents: number;
    chargeMode: "included" | "overage";
    agentCode?: string | null;
  },
) {
  if (input.chargeMode !== "overage" || input.overageRunCents <= 0) return null;

  const account = await prisma.billingAccount.findUnique({
    where: { id: input.billingAccountId },
  });
  if (!account) return null;

  const prev = Number.parseFloat(account.balance || "0") || 0;
  const cost = input.overageRunCents / 100;
  if (prev + 1e-9 < cost) {
    throw new Error("余额不足，无法完成超额扣费，请前往 /billing 充值");
  }

  const balanceAfter = (prev - cost).toFixed(2);
  await prisma.billingAccount.update({
    where: { id: input.billingAccountId },
    data: { balance: balanceAfter },
  });

  await prisma.creditLedger.create({
    data: {
      id: createId("cl"),
      billingAccountId: input.billingAccountId,
      entryType: "USAGE_OVERAGE",
      amount: (-cost).toFixed(2),
      currency: "CNY",
      balanceAfter,
      description: `超额按次扣费 · ${input.agentCode || "agent"} · run ${input.runId}`,
      sourceType: "agent_run",
      sourceId: input.runId,
    },
  });

  return { balanceAfter, costYuan: cost };
}

export async function applyPlanPurchaseSideEffects(
  prisma: PrismaClient,
  input: {
    billingAccountId: string;
    planId: string;
    subscriptionId?: string;
    endsAt?: Date | null;
  },
) {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) return;

  const meta = parsePlanMeta(plan.metadata);

  if (meta.kind === "credit_pack" && meta.creditCents) {
    const account = await prisma.billingAccount.findUnique({
      where: { id: input.billingAccountId },
    });
    if (!account) return;
    const prev = Number.parseFloat(account.balance || "0") || 0;
    const credit = meta.creditCents / 100;
    const balanceAfter = (prev + credit).toFixed(2);
    await prisma.billingAccount.update({
      where: { id: input.billingAccountId },
      data: { balance: balanceAfter },
    });
    await prisma.creditLedger.create({
      data: {
        id: createId("cl"),
        billingAccountId: input.billingAccountId,
        entryType: "CREDIT_GRANT",
        amount: credit.toFixed(2),
        currency: "CNY",
        balanceAfter,
        description: `充值 ${plan.name}`,
        sourceType: "plan",
        sourceId: plan.id,
      },
    });
    return;
  }

  if (meta.includedAgents.length > 0) {
    await grantAgentEntitlements(prisma, {
      billingAccountId: input.billingAccountId,
      agentCodes: meta.includedAgents,
      source: meta.kind === "agent_addon" ? "addon" : "plan",
      planId: plan.id,
      subscriptionId: input.subscriptionId,
      endsAt: input.endsAt ?? null,
    });
  }
}

export { PLAN_SEEDS, parsePlanMeta, createId, addDays };
