import type { PrismaClient } from "@/generated/prisma";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  type: string;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  billingAccountCount: number;
};

type PlanRow = {
  id: string;
  code: string;
  name: string;
  billingCycle: string;
  priceCents: number;
  currency: string;
  includedTokens: number;
  includedRuns: number;
  status: string;
};

type SubscriptionRow = {
  id: string;
  status: string;
  seats: number;
  startedAt: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: number | boolean;
  planName: string | null;
  billingAccountName: string | null;
  organizationName: string | null;
};

type BillingAccountRow = {
  id: string;
  name: string;
  status: string;
  currency: string;
  organizationName: string | null;
  ownerId: string | null;
};

type InvoiceRow = {
  id: string;
  invoiceNo: string;
  status: string;
  total: string;
  currency: string;
  billingAccountName: string | null;
  createdAt: string;
};

type ListingRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  visibility: string;
  pricingModel: string;
  priceCents: number;
  currency: string;
  installCount: number;
  rating: number;
  revenueShareCount: number;
};

type LearningQueueRow = {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  weightDelta: number | null;
  createdAt: string;
  verdict: string | null;
  score: number | null;
  problem: string | null;
};

type CognitiveSessionRow = {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  decisionId: string | null;
  overall: number | null;
  traceCount: number;
  evidenceCount: number;
};

type PlatformAdminSummary = {
  organizations: number;
  members: number;
  billingAccounts: number;
  activeSubscriptions: number;
  draftInvoices: number;
  activeListings: number;
  revenueShares: number;
  learningPending: number;
  evaluationResults: number;
  cognitiveSessions: number;
};

export type PlatformAdminOverview = {
  summary: PlatformAdminSummary;
  organizations: OrganizationRow[];
  plans: PlanRow[];
  billingAccounts: BillingAccountRow[];
  subscriptions: SubscriptionRow[];
  invoices: InvoiceRow[];
  listings: ListingRow[];
  learningQueue: LearningQueueRow[];
  cognitiveSessions: CognitiveSessionRow[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function parsePricing(priceField: string | null | undefined) {
  if (!priceField) {
    return { pricingModel: "subscription", priceCents: 0, currency: "CNY" };
  }

  try {
    const parsed = JSON.parse(priceField) as { model?: string; price?: number; currency?: string };
    return {
      pricingModel: parsed.model ?? "subscription",
      priceCents: Math.max(0, Math.round((parsed.price ?? 0) * 100)),
      currency: parsed.currency ?? "CNY",
    };
  } catch {
    return { pricingModel: "subscription", priceCents: 0, currency: "CNY" };
  }
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function countByKey(rows: Array<Record<string, unknown>>, key: string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = row[key];
    const count = row._count as { _all?: number } | undefined;
    if (typeof id === "string" && typeof count?._all === "number") {
      map.set(id, count._all);
    }
  }
  return map;
}

export async function ensurePlatformAdminSeed(prisma: PrismaClient) {
  const planSeeds = [
    {
      id: "plan_starter",
      code: "starter",
      name: "Starter",
      description: "单店起步版",
      billingCycle: "MONTHLY",
      priceCents: 0,
      currency: "CNY",
      includedTokens: 500000,
      includedRuns: 1000,
    },
    {
      id: "plan_growth",
      code: "growth",
      name: "Growth",
      description: "多项目经营增长版",
      billingCycle: "MONTHLY",
      priceCents: 19900,
      currency: "CNY",
      includedTokens: 5000000,
      includedRuns: 12000,
    },
    {
      id: "plan_partner",
      code: "partner",
      name: "Partner",
      description: "平台合作与分润版",
      billingCycle: "MONTHLY",
      priceCents: 69900,
      currency: "CNY",
      includedTokens: 20000000,
      includedRuns: 50000,
    },
  ];

  for (const plan of planSeeds) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        ...plan,
        status: "active",
        metadata: JSON.stringify({ seeded: true }),
      },
      update: {},
    });
  }

  const owners = await prisma.owner.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      userId: true,
      user: { select: { id: true, email: true } },
      _count: { select: { projects: true } },
    },
  });

  for (const owner of owners) {
    const workspaceBase = owner.name || owner.user.email || owner.id;
    const orgId = `org_${owner.id}`;
    const orgSlug = `${slugify(workspaceBase || "workspace") || "workspace"}-${owner.id.slice(-6)}`;
    const billingAccountId = `ba_${orgId}`;
    const subscriptionId = `sub_${billingAccountId}`;
    const invoiceId = `inv_${billingAccountId}`;
    const projectCount = owner._count.projects;
    const planId = projectCount > 1 ? "plan_growth" : "plan_starter";
    const now = new Date();
    const periodEnd = daysFromNow(30);
    const seededMeta = JSON.stringify({ seeded: true });

    await prisma.organization.upsert({
      where: { id: orgId },
      create: {
        id: orgId,
        name: workspaceBase || `Workspace ${owner.id.slice(-4)}`,
        slug: orgSlug,
        type: "workspace",
        status: "active",
        ownerUserId: owner.userId,
        metadata: JSON.stringify({ seeded: true, ownerId: owner.id }),
      },
      update: {},
    });

    await prisma.organizationMember.upsert({
      where: { id: `orgm_${orgId}_${owner.userId}` },
      create: {
        id: `orgm_${orgId}_${owner.userId}`,
        organizationId: orgId,
        userId: owner.userId,
        role: "OWNER",
        status: "active",
        metadata: seededMeta,
      },
      update: {},
    });

    await prisma.billingAccount.upsert({
      where: { id: billingAccountId },
      create: {
        id: billingAccountId,
        organizationId: orgId,
        ownerId: owner.id,
        name: `${workspaceBase || "Workspace"} 账务账户`,
        status: "active",
        currency: "CNY",
        balance: "0",
        metadata: seededMeta,
      },
      update: {},
    });

    await prisma.subscription.upsert({
      where: { id: subscriptionId },
      create: {
        id: subscriptionId,
        billingAccountId,
        planId,
        status: "active",
        seats: Math.max(1, projectCount || 1),
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: seededMeta,
      },
      update: {},
    });

    await prisma.invoice.upsert({
      where: { id: invoiceId },
      create: {
        id: invoiceId,
        billingAccountId,
        invoiceNo: `MK-${owner.id.slice(-6).toUpperCase()}`,
        status: "draft",
        subtotal: "0",
        tax: "0",
        total: "0",
        currency: "CNY",
        metadata: seededMeta,
      },
      update: {},
    });
  }

  const products = await prisma.agentProduct.findMany({
    where: { status: "active" },
    select: { id: true, slug: true, name: true, description: true, pricing: true },
  });

  for (const product of products) {
    const listingId = `listing_${product.id}`;
    const revenueShareId = `rev_${listingId}`;
    const pricing = parsePricing(product.pricing);
    const seededMeta = JSON.stringify({ seeded: true });

    await prisma.agentListing.upsert({
      where: { id: listingId },
      create: {
        id: listingId,
        agentProductId: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        status: "active",
        visibility: "public",
        pricingModel: pricing.pricingModel,
        priceCents: pricing.priceCents,
        currency: pricing.currency,
        installCount: 0,
        rating: 0,
        metadata: seededMeta,
      },
      update: {},
    });

    await prisma.revenueShare.upsert({
      where: { id: revenueShareId },
      create: {
        id: revenueShareId,
        listingId,
        beneficiaryType: "PLATFORM",
        beneficiaryId: "mealkey",
        sharePercent: 0.3,
        status: "active",
        metadata: JSON.stringify({ seeded: true, publisherShare: 0.7 }),
      },
      update: {},
    });
  }

  if (products.length === 0) {
    await prisma.agentListing.upsert({
      where: { id: "listing_mealkey_platform" },
      create: {
        id: "listing_mealkey_platform",
        agentProductId: null,
        slug: "mealkey-platform-console",
        name: "MealKey Platform Console",
        description: "平台默认控制台产品，用于承接 Marketplace 管理闭环。",
        status: "active",
        visibility: "public",
        pricingModel: "subscription",
        priceCents: 29900,
        currency: "CNY",
        installCount: 0,
        rating: 0,
        metadata: JSON.stringify({ seeded: true, fallback: true }),
      },
      update: {},
    });

    await prisma.revenueShare.upsert({
      where: { id: "rev_listing_mealkey_platform" },
      create: {
        id: "rev_listing_mealkey_platform",
        listingId: "listing_mealkey_platform",
        beneficiaryType: "PLATFORM",
        beneficiaryId: "mealkey",
        sharePercent: 0.3,
        status: "active",
        metadata: JSON.stringify({ seeded: true, fallback: true, publisherShare: 0.7 }),
      },
      update: {},
    });
  }

  const decisions = await prisma.decision.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      agentRunId: true,
      confidence: true,
      problem: true,
      learning: true,
      outcome: true,
    },
  });

  for (const decision of decisions) {
    const evaluationId = `eval_${decision.id}`;
    const learningId = `lrn_${decision.id}`;
    const score = Number(decision.confidence ?? 0);
    const verdict = score >= 0.8 ? "PASS" : score >= 0.6 ? "REVIEW" : "FAIL";
    const learningStatus = decision.learning || decision.outcome ? "approved" : "pending";

    await prisma.evaluationResult.upsert({
      where: { id: evaluationId },
      create: {
        id: evaluationId,
        agentRunId: decision.agentRunId,
        decisionId: decision.id,
        evaluator: "kernel-evaluator",
        score,
        verdict,
        summary: `自动评估：当前判断置信度 ${score}`,
        metadata: JSON.stringify({ seeded: true }),
      },
      update: {},
    });

    await prisma.learningRecord.upsert({
      where: { id: learningId },
      create: {
        id: learningId,
        decisionId: decision.id,
        evaluationResultId: evaluationId,
        sourceType: "DECISION",
        sourceId: decision.id,
        title: `判断学习：${decision.problem.slice(0, 24)}`,
        summary: decision.learning || decision.outcome || "等待人工复核这条认知路径。",
        status: learningStatus,
        weightDelta: learningStatus === "approved" ? 0.08 : null,
        metadata: JSON.stringify({ seeded: true }),
      },
      update: {},
    });
  }
}

export async function getPlatformAdminOverview(prisma: PrismaClient): Promise<PlatformAdminOverview> {
  await ensurePlatformAdminSeed(prisma);

  const [
    organizationRecords,
    planRecords,
    billingAccountRecords,
    subscriptionRecords,
    invoiceRecords,
    listingRecords,
    pendingLearning,
    otherLearning,
    cognitiveSessionRecords,
    summary,
  ] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.plan.findMany({
      orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        billingCycle: true,
        priceCents: true,
        currency: true,
        includedTokens: true,
        includedRuns: true,
        status: true,
      },
    }),
    prisma.billingAccount.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.agentListing.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.learningRecord.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.learningRecord.findMany({
      where: { status: { not: "pending" } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.cognitiveSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    (async (): Promise<PlatformAdminSummary> => {
      const [
        organizations,
        members,
        billingAccounts,
        activeSubscriptions,
        draftInvoices,
        activeListings,
        revenueShares,
        learningPending,
        evaluationResults,
        cognitiveSessions,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.organizationMember.count({ where: { status: "active" } }),
        prisma.billingAccount.count({ where: { status: "active" } }),
        prisma.subscription.count({ where: { status: "active" } }),
        prisma.invoice.count({ where: { status: "draft" } }),
        prisma.agentListing.count({ where: { status: "active" } }),
        prisma.revenueShare.count({ where: { status: "active" } }),
        prisma.learningRecord.count({ where: { status: "pending" } }),
        prisma.evaluationResult.count(),
        prisma.cognitiveSession.count(),
      ]);

      return {
        organizations,
        members,
        billingAccounts,
        activeSubscriptions,
        draftInvoices,
        activeListings,
        revenueShares,
        learningPending,
        evaluationResults,
        cognitiveSessions,
      };
    })(),
  ]);

  const orgIds = organizationRecords.map((org) => org.id);
  const ownerUserIds = organizationRecords
    .map((org) => org.ownerUserId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const billingAccountIds = [
    ...new Set([
      ...billingAccountRecords.map((item) => item.id),
      ...subscriptionRecords.map((item) => item.billingAccountId),
      ...invoiceRecords.map((item) => item.billingAccountId),
    ]),
  ];
  const planIds = [...new Set(subscriptionRecords.map((item) => item.planId))];
  const listingIds = listingRecords.map((item) => item.id);
  const learningRecords = [...pendingLearning, ...otherLearning].slice(0, 8);
  const evaluationIds = learningRecords
    .map((item) => item.evaluationResultId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const decisionIds = learningRecords
    .map((item) => item.decisionId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const sessionIds = cognitiveSessionRecords.map((item) => item.id);

  const [
    memberCountRows,
    billingCountRows,
    ownersForProjects,
    relatedBillingAccounts,
    relatedPlans,
    relatedOrganizations,
    revenueShareCountRows,
    evaluationResults,
    decisions,
    confidenceModels,
    traceCountRows,
    evidenceCountRows,
  ] = await Promise.all([
    orgIds.length === 0
      ? Promise.resolve([])
      : prisma.organizationMember.groupBy({
          by: ["organizationId"],
          where: { organizationId: { in: orgIds }, status: "active" },
          _count: { _all: true },
        }),
    orgIds.length === 0
      ? Promise.resolve([])
      : prisma.billingAccount.groupBy({
          by: ["organizationId"],
          where: { organizationId: { in: orgIds }, status: "active" },
          _count: { _all: true },
        }),
    ownerUserIds.length === 0
      ? Promise.resolve([])
      : prisma.owner.findMany({
          where: { userId: { in: ownerUserIds } },
          select: { userId: true, _count: { select: { projects: true } } },
        }),
    billingAccountIds.length === 0
      ? Promise.resolve([])
      : prisma.billingAccount.findMany({
          where: { id: { in: billingAccountIds } },
          select: { id: true, name: true, organizationId: true },
        }),
    planIds.length === 0
      ? Promise.resolve([])
      : prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true },
        }),
    prisma.organization.findMany({
      select: { id: true, name: true },
    }),
    listingIds.length === 0
      ? Promise.resolve([])
      : prisma.revenueShare.groupBy({
          by: ["listingId"],
          where: { listingId: { in: listingIds }, status: "active" },
          _count: { _all: true },
        }),
    evaluationIds.length === 0
      ? Promise.resolve([])
      : prisma.evaluationResult.findMany({
          where: { id: { in: evaluationIds } },
          select: { id: true, verdict: true, score: true },
        }),
    decisionIds.length === 0
      ? Promise.resolve([])
      : prisma.decision.findMany({
          where: { id: { in: decisionIds } },
          select: { id: true, problem: true },
        }),
    sessionIds.length === 0
      ? Promise.resolve([])
      : prisma.confidenceModel.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, overall: true },
        }),
    sessionIds.length === 0
      ? Promise.resolve([])
      : prisma.cognitiveTrace.groupBy({
          by: ["sessionId"],
          where: { sessionId: { in: sessionIds } },
          _count: { _all: true },
        }),
    sessionIds.length === 0
      ? Promise.resolve([])
      : prisma.evidenceReference.groupBy({
          by: ["sessionId"],
          where: { sessionId: { in: sessionIds } },
          _count: { _all: true },
        }),
  ]);

  const memberCountMap = countByKey(memberCountRows as Array<Record<string, unknown>>, "organizationId");
  const billingCountMap = countByKey(
    billingCountRows.map((row) => ({
      ...row,
      organizationId: row.organizationId ?? "",
    })) as Array<Record<string, unknown>>,
    "organizationId",
  );
  const projectCountByUserId = new Map(
    ownersForProjects.map((owner) => [owner.userId, owner._count.projects] as const),
  );
  const billingAccountMap = new Map(relatedBillingAccounts.map((item) => [item.id, item] as const));
  const planMap = new Map(relatedPlans.map((item) => [item.id, item] as const));
  const organizationMap = new Map(relatedOrganizations.map((item) => [item.id, item] as const));
  const revenueShareCountMap = countByKey(
    revenueShareCountRows as Array<Record<string, unknown>>,
    "listingId",
  );
  const evaluationMap = new Map(evaluationResults.map((item) => [item.id, item] as const));
  const decisionMap = new Map(decisions.map((item) => [item.id, item] as const));
  const confidenceMap = new Map(confidenceModels.map((item) => [item.sessionId, item.overall] as const));
  const traceCountMap = countByKey(traceCountRows as Array<Record<string, unknown>>, "sessionId");
  const evidenceCountMap = countByKey(evidenceCountRows as Array<Record<string, unknown>>, "sessionId");

  const organizations: OrganizationRow[] = organizationRecords.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    type: org.type,
    createdAt: toIso(org.createdAt) ?? "",
    memberCount: memberCountMap.get(org.id) ?? 0,
    projectCount: org.ownerUserId ? (projectCountByUserId.get(org.ownerUserId) ?? 0) : 0,
    billingAccountCount: billingCountMap.get(org.id) ?? 0,
  }));

  const plans: PlanRow[] = planRecords;

  const billingAccounts: BillingAccountRow[] = billingAccountRecords.map((account) => ({
    id: account.id,
    name: account.name,
    status: account.status,
    currency: account.currency,
    ownerId: account.ownerId,
    organizationName: account.organizationId
      ? (organizationMap.get(account.organizationId)?.name ?? null)
      : null,
  }));

  const subscriptions: SubscriptionRow[] = subscriptionRecords.map((subscription) => {
    const billingAccount = billingAccountMap.get(subscription.billingAccountId);
    const organizationName = billingAccount?.organizationId
      ? (organizationMap.get(billingAccount.organizationId)?.name ?? null)
      : null;

    return {
      id: subscription.id,
      status: subscription.status,
      seats: subscription.seats,
      startedAt: toIso(subscription.startedAt) ?? "",
      currentPeriodEnd: toIso(subscription.currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      planName: planMap.get(subscription.planId)?.name ?? null,
      billingAccountName: billingAccount?.name ?? null,
      organizationName,
    };
  });

  const invoices: InvoiceRow[] = invoiceRecords.map((invoice) => ({
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    status: invoice.status,
    total: invoice.total,
    currency: invoice.currency,
    billingAccountName: billingAccountMap.get(invoice.billingAccountId)?.name ?? null,
    createdAt: toIso(invoice.createdAt) ?? "",
  }));

  const listings: ListingRow[] = listingRecords.map((listing) => ({
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    status: listing.status,
    visibility: listing.visibility,
    pricingModel: listing.pricingModel,
    priceCents: listing.priceCents,
    currency: listing.currency,
    installCount: listing.installCount,
    rating: listing.rating,
    revenueShareCount: revenueShareCountMap.get(listing.id) ?? 0,
  }));

  const learningQueue: LearningQueueRow[] = learningRecords.map((record) => {
    const evaluation = record.evaluationResultId
      ? evaluationMap.get(record.evaluationResultId)
      : undefined;
    const decision = record.decisionId ? decisionMap.get(record.decisionId) : undefined;

    return {
      id: record.id,
      title: record.title,
      status: record.status,
      sourceType: record.sourceType,
      weightDelta: record.weightDelta,
      createdAt: toIso(record.createdAt) ?? "",
      verdict: evaluation?.verdict ?? null,
      score: evaluation?.score ?? null,
      problem: decision?.problem ?? null,
    };
  });

  const cognitiveSessions: CognitiveSessionRow[] = cognitiveSessionRecords.map((session) => ({
    id: session.id,
    status: session.status,
    source: session.source,
    createdAt: toIso(session.createdAt) ?? "",
    decisionId: session.decisionId,
    overall: confidenceMap.get(session.id) ?? null,
    traceCount: traceCountMap.get(session.id) ?? 0,
    evidenceCount: evidenceCountMap.get(session.id) ?? 0,
  }));

  return {
    summary,
    organizations,
    plans,
    billingAccounts,
    subscriptions,
    invoices,
    listings,
    learningQueue,
    cognitiveSessions,
  };
}

export async function createPlatformOrganization(
  prisma: PrismaClient,
  input: { name: string; ownerUserId?: string | null; type?: string },
) {
  const id = createId("org");
  const slug = `${slugify(input.name) || "organization"}-${id.slice(-6)}`;

  await prisma.organization.create({
    data: {
      id,
      name: input.name,
      slug,
      type: input.type ?? "workspace",
      status: "active",
      ownerUserId: input.ownerUserId ?? null,
      metadata: JSON.stringify({ source: "api" }),
    },
  });

  return { id, slug };
}

export async function createPlatformPlan(
  prisma: PrismaClient,
  input: { code: string; name: string; priceCents?: number; billingCycle?: string; currency?: string },
) {
  const id = createId("plan");

  await prisma.plan.create({
    data: {
      id,
      code: input.code,
      name: input.name,
      billingCycle: input.billingCycle ?? "MONTHLY",
      priceCents: Math.max(0, Math.round(input.priceCents ?? 0)),
      currency: input.currency ?? "CNY",
      includedTokens: 0,
      includedRuns: 0,
      status: "active",
      metadata: JSON.stringify({ source: "api" }),
    },
  });

  return { id, code: input.code };
}

export async function createPlatformSubscription(
  prisma: PrismaClient,
  input: { billingAccountId: string; planId: string; seats?: number },
) {
  const id = createId("sub");
  const now = new Date();

  await prisma.subscription.create({
    data: {
      id,
      billingAccountId: input.billingAccountId,
      planId: input.planId,
      status: "active",
      seats: Math.max(1, Math.round(input.seats ?? 1)),
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: daysFromNow(30),
      cancelAtPeriodEnd: false,
      metadata: JSON.stringify({ source: "api" }),
    },
  });

  return { id };
}

export async function updatePlatformSubscription(
  prisma: PrismaClient,
  input: {
    id: string;
    status: string;
    seats?: number;
    cancelAtPeriodEnd?: boolean;
  },
) {
  await prisma.subscription.update({
    where: { id: input.id },
    data: {
      status: input.status,
      seats: Math.max(1, Math.round(input.seats ?? 1)),
      cancelAtPeriodEnd: Boolean(input.cancelAtPeriodEnd),
    },
  });

  return { id: input.id, status: input.status };
}

export async function createPlatformListing(
  prisma: PrismaClient,
  input: { name: string; slug?: string; priceCents?: number; currency?: string; pricingModel?: string },
) {
  const id = createId("listing");
  const slug =
    input.slug && input.slug.length > 0
      ? slugify(input.slug)
      : `${slugify(input.name) || "listing"}-${id.slice(-6)}`;

  await prisma.agentListing.create({
    data: {
      id,
      slug,
      name: input.name,
      status: "active",
      visibility: "public",
      pricingModel: input.pricingModel ?? "subscription",
      priceCents: Math.max(0, Math.round(input.priceCents ?? 0)),
      currency: input.currency ?? "CNY",
      installCount: 0,
      rating: 0,
      metadata: JSON.stringify({ source: "api" }),
    },
  });

  await prisma.revenueShare.create({
    data: {
      id: `rev_${id}`,
      listingId: id,
      beneficiaryType: "PLATFORM",
      beneficiaryId: "mealkey",
      sharePercent: 0.3,
      status: "active",
      metadata: JSON.stringify({ source: "api", publisherShare: 0.7 }),
    },
  });

  return { id, slug };
}

export async function updatePlatformListing(
  prisma: PrismaClient,
  input: {
    id: string;
    status: string;
    visibility?: string;
    priceCents?: number;
  },
) {
  await prisma.agentListing.update({
    where: { id: input.id },
    data: {
      status: input.status,
      visibility: input.visibility ?? "public",
      priceCents: Math.max(0, Math.round(input.priceCents ?? 0)),
    },
  });

  return { id: input.id, status: input.status };
}

export async function reviewLearningRecord(
  prisma: PrismaClient,
  input: { id: string; status: "approved" | "rejected"; weightDelta?: number | null },
) {
  await prisma.learningRecord.update({
    where: { id: input.id },
    data: {
      status: input.status,
      weightDelta: input.weightDelta ?? null,
    },
  });

  return { id: input.id, status: input.status };
}
