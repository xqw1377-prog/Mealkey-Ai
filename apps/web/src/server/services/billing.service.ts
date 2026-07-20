import type { PrismaClient } from "@/generated/prisma";
import {
  creditWalletPoints,
  ensureUserWallet,
  LOCAL_TEST_WALLET_FLOOR_POINTS,
} from "./wallet.service";

export type AgentCode = "chief" | "m-mkt" | "m-pnt" | "m-ed" | "m-biz";

export const AGENT_CATALOG: Array<{
  code: AgentCode;
  name: string;
  description: string;
}> = [
  { code: "chief", name: "经营会议", description: "母体会议入口，通用经营判断" },
  { code: "m-mkt", name: "市场机会", description: "市场进入判断，专项咨询能力" },
  { code: "m-pnt", name: "品牌定位", description: "品牌战略咨询，专项工作流" },
  { code: "m-ed", name: "股权诊断", description: "股权与治理判断，专项工作流" },
  { code: "m-biz", name: "商业模式", description: "商业顾问能力，专项工作流" },
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
  kind: "platform" | "specialty_pack" | "credit_pack";
  agentCode?: AgentCode;
  creditCents?: number;
  pointsAmount?: number;
  productType?: "BALANCE_CREDIT" | "BUSINESS_POINTS";
};

const PLAN_SEEDS: PlanSeed[] = [
  {
    id: "plan_starter",
    code: "starter",
    name: "体验版",
    description: "体验版：含 Founder 会议与专项判断，按基础额度使用",
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
    description: "增长版：更高额度与更低超额单价，覆盖完整 Founder 工作流",
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
    description: "合伙版：高用量团队套餐，含更高额度与更低超额单价",
    priceCents: 69900,
    includedRuns: 15000,
    includedTokens: 20000000,
    includedAgents: ["chief", "m-mkt", "m-pnt", "m-ed", "m-biz"],
    overageRunCents: 29,
    kind: "platform",
  },
  {
    id: "plan_addon_m_mkt",
    code: "specialty_m-mkt",
    name: "市场机会专项咨询包",
    description: "市场机会专项咨询包，适合高频市场扫描与进入判断",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-mkt"],
    overageRunCents: 99,
    kind: "specialty_pack",
    agentCode: "m-mkt",
  },
  {
    id: "plan_addon_m_pnt",
    code: "specialty_m-pnt",
    name: "品牌定位专项咨询包",
    description: "品牌定位专项咨询包，适合高频定位复盘与品牌判断",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-pnt"],
    overageRunCents: 99,
    kind: "specialty_pack",
    agentCode: "m-pnt",
  },
  {
    id: "plan_addon_m_ed",
    code: "specialty_m-ed",
    name: "股权诊断专项咨询包",
    description: "股权诊断专项咨询包，适合高频股权结构与治理判断",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-ed"],
    overageRunCents: 99,
    kind: "specialty_pack",
    agentCode: "m-ed",
  },
  {
    id: "plan_addon_m_biz",
    code: "specialty_m-biz",
    name: "商业模式专项咨询包",
    description: "商业模式专项咨询包，适合高频经营诊断与方案推演",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: ["m-biz"],
    overageRunCents: 99,
    kind: "specialty_pack",
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
    productType: "BALANCE_CREDIT",
  },
  {
    id: "plan_points_explore",
    code: "points_explore",
    name: "探索包",
    description: "第一次使用：约 10,000 经营点，适合体验经营分析",
    priceCents: 9900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: [],
    overageRunCents: 99,
    kind: "credit_pack",
    pointsAmount: 10000,
    productType: "BUSINESS_POINTS",
  },
  {
    id: "plan_points_startup",
    code: "points_startup",
    name: "创业包",
    description: "开店/创业规划：约 60,000 经营点",
    priceCents: 49900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: [],
    overageRunCents: 99,
    kind: "credit_pack",
    pointsAmount: 60000,
    productType: "BUSINESS_POINTS",
  },
  {
    id: "plan_points_chain",
    code: "points_chain",
    name: "连锁成长包",
    description: "多店经营：约 300,000 经营点",
    priceCents: 199900,
    includedRuns: 0,
    includedTokens: 0,
    includedAgents: [],
    overageRunCents: 99,
    kind: "credit_pack",
    pointsAmount: 300000,
    productType: "BUSINESS_POINTS",
  },
];

const LEGACY_SPECIALTY_PLAN_CODE_MAP = {
  "addon_m-mkt": "specialty_m-mkt",
  "addon_m-pnt": "specialty_m-pnt",
  "addon_m-ed": "specialty_m-ed",
  "addon_m-biz": "specialty_m-biz",
} as const;

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
  pointsAmount?: number;
  productType?: "BALANCE_CREDIT" | "BUSINESS_POINTS";
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
      kind:
        typeof parsed.kind === "string"
          ? parsed.kind === "agent_addon"
            ? "specialty_pack"
            : parsed.kind
          : "platform",
      agentCode:
        typeof parsed.agentCode === "string" ? (parsed.agentCode as AgentCode) : undefined,
      creditCents: typeof parsed.creditCents === "number" ? parsed.creditCents : undefined,
      pointsAmount: typeof parsed.pointsAmount === "number" ? parsed.pointsAmount : undefined,
      productType:
        parsed.productType === "BUSINESS_POINTS" ? "BUSINESS_POINTS" : "BALANCE_CREDIT",
    };
  } catch {
    return { includedAgents: ["chief"], overageRunCents: 99, kind: "platform" };
  }
}

export function getPlanCommercialMeta(plan: { metadata: string | null }) {
  return parsePlanMeta(plan.metadata);
}

function normalizeLegacyBillingMetadata(raw: string | null | undefined) {
  try {
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    if (parsed.kind === "agent_addon") {
      parsed.kind = "specialty_pack";
    }
    return JSON.stringify(parsed);
  } catch {
    return raw ?? null;
  }
}

async function migrateLegacySpecialtyBilling(prisma: PrismaClient) {
  for (const [legacyCode, specialtyCode] of Object.entries(LEGACY_SPECIALTY_PLAN_CODE_MAP)) {
    const legacyPlan = await prisma.plan.findUnique({
      where: { code: legacyCode },
      select: { id: true, metadata: true },
    });
    if (!legacyPlan) continue;

    const specialtyPlan = await prisma.plan.findUnique({
      where: { code: specialtyCode },
      select: { id: true },
    });

    if (specialtyPlan && specialtyPlan.id !== legacyPlan.id) {
      await prisma.plan.update({
        where: { id: legacyPlan.id },
        data: {
          code: `legacy_${legacyCode}`,
          status: "inactive",
          metadata: normalizeLegacyBillingMetadata(legacyPlan.metadata),
        },
      });
      continue;
    }

    await prisma.plan.update({
      where: { id: legacyPlan.id },
      data: {
        code: specialtyCode,
        metadata: normalizeLegacyBillingMetadata(legacyPlan.metadata),
      },
    });
  }

  const legacyKindPlans = await prisma.plan.findMany({
    where: { metadata: { contains: "\"agent_addon\"" } },
    select: { id: true, metadata: true },
  });
  for (const plan of legacyKindPlans) {
    await prisma.plan.update({
      where: { id: plan.id },
      data: { metadata: normalizeLegacyBillingMetadata(plan.metadata) },
    });
  }

  const legacyKindSubscriptions = await prisma.subscription.findMany({
    where: { metadata: { contains: "\"agent_addon\"" } },
    select: { id: true, metadata: true },
  });
  for (const subscription of legacyKindSubscriptions) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { metadata: normalizeLegacyBillingMetadata(subscription.metadata) },
    });
  }

  await prisma.agentEntitlement.updateMany({
    where: { source: "addon" },
    data: { source: "specialty_pack" },
  });
}

export async function ensureDefaultPlans(prisma: PrismaClient) {
  await migrateLegacySpecialtyBilling(prisma);
  for (const plan of PLAN_SEEDS) {
    const metadata = JSON.stringify({
      seeded: true,
      locale: "zh-CN",
      kind: plan.kind,
      includedAgents: plan.includedAgents,
      overageRunCents: plan.overageRunCents,
      agentCode: plan.agentCode ?? null,
      creditCents: plan.creditCents ?? null,
      pointsAmount: plan.pointsAmount ?? null,
      productType: plan.productType ?? null,
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
    source: "plan" | "addon" | "specialty_pack" | "grant";
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

async function resolveUserIdFromBillingAccount(
  prisma: PrismaClient,
  billingAccountId: string,
) {
  const account = await prisma.billingAccount.findUnique({
    where: { id: billingAccountId },
    select: { ownerId: true },
  });
  if (!account?.ownerId) return null;
  const owner = await prisma.owner.findUnique({
    where: { id: account.ownerId },
    select: { userId: true },
  });
  return owner?.userId ?? null;
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
    throw new Error(`当前经营点不足，无法启动「${label}」。请前往 /billing 充值经营点`);
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
  const wallet = await ensureUserWallet(prisma, userId);

  const usageByAgent = await Promise.all(
    AGENT_CATALOG.map(async (agent) => ({
      agentCode: agent.code,
      name: agent.name,
      entitled: true,
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
  const visibleBusinessPoints =
    process.env.NODE_ENV === "production"
      ? wallet.balance
      : Math.max(wallet.balance, LOCAL_TEST_WALLET_FLOOR_POINTS);

  return {
    account,
    activeSubscription,
    plan,
    planMeta,
    periodRunsUsed,
    periodRunsLimit,
    remainingRuns,
    balanceCents,
    businessPoints: visibleBusinessPoints,
    frozenPoints: wallet.frozenAmount,
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
  const snapshot = await getBillingSnapshot(prisma, userId);

  // 经营点门禁：优先检查真实经营点余额
  try {
    const {
      getBusinessPointsBalance,
      resolveSpendKind,
      pointsCostForSpendKind,
    } = await import("@/server/services/business-points.service");
    const points = await getBusinessPointsBalance(prisma, userId);
    const spendKind = resolveSpendKind({ agentCode: options?.agentCode });
    const need = pointsCostForSpendKind(spendKind);
    if (points < need && snapshot.remainingRuns <= 0) {
      throw new Error(
        `当前经营点不足\n本次分析需要：${need}点\n余额：${points}`,
      );
    }
    if (points >= need) {
      return {
        billingAccountId: snapshot.account.id,
        subscriptionId: snapshot.activeSubscription.id,
        planCode: snapshot.plan.code,
        chargeMode: "included",
        overageRunCents: snapshot.overageRunCents,
        agentCode: options?.agentCode,
      };
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("经营点不足")) {
      throw error;
    }
    // 账本异常时回退 Hybrid
  }

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

  throw new Error("当前经营点不足，请前往 /billing 充值经营点后继续");
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
    throw new Error("当前余额不足，无法完成本次超额扣费，请前往 /billing 充值额度包");
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

    // 先初始化经营点账本，再发放充值点数（避免覆盖折算）
    const { grantBusinessPoints, marketedPointsForPlanCode, ensureBusinessPointsBalance } =
      await import("@/server/services/business-points.service");
    if (account.ownerId) {
      const owner = await prisma.owner.findUnique({
        where: { id: account.ownerId },
        select: { userId: true },
      });
      if (owner?.userId) {
        await ensureBusinessPointsBalance(prisma, owner.userId);
      }
    }
    const points = marketedPointsForPlanCode(plan.code, meta.creditCents);
    if (points > 0) {
      await grantBusinessPoints(prisma, {
        billingAccountId: input.billingAccountId,
        points,
        description: `${plan.name} · +${points} 经营点`,
        sourceType: "plan",
        sourceId: `points-${plan.id}-${Date.now()}`,
      });
    }
    return;
  }

  if (meta.kind === "credit_pack" && meta.pointsAmount) {
    const userId = await resolveUserIdFromBillingAccount(prisma, input.billingAccountId);
    if (!userId) return;

    await creditWalletPoints(prisma, {
      userId,
      amount: meta.pointsAmount,
      type: "PURCHASE",
      reason: `购买 ${plan.name}`,
      referenceId: input.subscriptionId ?? plan.id,
      metadata: {
        planId: plan.id,
        planCode: plan.code,
        productType: meta.productType ?? "BUSINESS_POINTS",
      },
    });
    return;
  }

  if (meta.includedAgents.length > 0) {
    await grantAgentEntitlements(prisma, {
      billingAccountId: input.billingAccountId,
      agentCodes: meta.includedAgents,
      source: meta.kind === "specialty_pack" ? "specialty_pack" : "plan",
      planId: plan.id,
      subscriptionId: input.subscriptionId,
      endsAt: input.endsAt ?? null,
    });
  }
}

export { PLAN_SEEDS, parsePlanMeta, createId, addDays };
