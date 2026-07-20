import type { PrismaClient } from "@/generated/prisma";

type MetricTone = "neutral" | "good" | "warning" | "danger";
type AlertSeverity = "info" | "warning" | "critical";
type PlanCommercialCategory = "platform" | "specialty_pack" | "points_pack" | "balance_credit" | "other";
type QueuePriority = "high" | "medium" | "low";

export type PlatformAdminMetric = {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  helper: string;
  tone?: MetricTone;
};

export type PlatformAdminAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  count?: number;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  type: string;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  billingAccountCount: number;
  isSeeded: boolean;
};

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  billingCycle: string;
  priceCents: number;
  currency: string;
  includedTokens: number;
  includedRuns: number;
  status: string;
  category: PlanCommercialCategory;
  categoryLabel: string;
  pointsAmount: number | null;
  usageSummary: string;
  isSeeded: boolean;
};

export type SubscriptionRow = {
  id: string;
  status: string;
  seats: number;
  startedAt: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: number | boolean;
  planName: string | null;
  planLabel: string;
  billingAccountName: string | null;
  organizationName: string | null;
  daysToRenewal: number | null;
  isSeeded: boolean;
};

export type BillingAccountRow = {
  id: string;
  name: string;
  status: string;
  currency: string;
  organizationName: string | null;
  ownerId: string | null;
  hasOrganization: boolean;
  isSeeded: boolean;
};

export type InvoiceRow = {
  id: string;
  invoiceNo: string;
  status: string;
  total: string;
  amountValue: number;
  currency: string;
  billingAccountName: string | null;
  planName: string | null;
  planKind: string | null;
  planKindLabel: string;
  orderNo: string | null;
  createdAt: string;
  isDraft: boolean;
  isUnlinked: boolean;
  isSeeded: boolean;
};

export type BusinessPointsOrderRow = {
  id: string;
  orderNo: string;
  ownerId: string | null;
  ownerName: string | null;
  billingAccountId: string;
  billingAccountName: string | null;
  planName: string | null;
  pointsAmount: number;
  amountCents: number;
  currency: string;
  paidAt: string | null;
  isSeeded: boolean;
};

export type CapabilityPricingRow = {
  capability: string;
  label: string;
  baseCost: number;
  depthSummary: string;
  complexitySummary: string;
  agentSummary: string | null;
  isSeeded: boolean;
};

export type ConsumptionEconomicsRow = {
  id: string;
  ownerId: string | null;
  ownerName: string | null;
  capability: string;
  capabilityLabel: string;
  status: string;
  requestedPoints: number;
  actualPoints: number;
  revenueCents: number;
  costCents: number;
  grossProfitCents: number;
  grossMarginPercent: number | null;
  tokenTotal: number;
  provider: string | null;
  model: string | null;
  agentCodes: string[];
  reason: string;
  createdAt: string;
  isSeeded: boolean;
};

export type ThirdPartyUsageSummary = {
  recordedEvents: number;
  billableCount: number;
  tokenTotal: number;
  costValue: number;
  currency: string;
  missingProviderCount: number;
  missingModelCount: number;
};

export type ThirdPartyUsageRow = {
  key: string;
  label: string;
  secondaryLabel: string;
  recordCount: number;
  billableCount: number;
  tokenInput: number;
  tokenOutput: number;
  tokenCached: number;
  tokenReasoning: number;
  tokenTotal: number;
  costValue: number;
  currency: string;
  sharePercent: number | null;
  latestOccurredAt: string | null;
  topUsageTypes: string[];
};

export type ThirdPartyUsageTrendPoint = {
  day: string;
  label: string;
  recordCount: number;
  billableCount: number;
  tokenTotal: number;
  costValue: number;
  currency: string;
};

export type ThirdPartyUsageAnomalyRow = {
  id: string;
  key: string;
  severity: AlertSeverity;
  occurredAt: string | null;
  usageType: string;
  provider: string;
  model: string;
  tokenInput: number;
  tokenOutput: number;
  tokenCached: number;
  tokenReasoning: number;
  tokenTotal: number;
  costValue: number;
  currency: string;
  billable: boolean;
  anomalyFlags: string[];
  summary: string;
  reconciliationStatus: "reconciled" | "suspected" | "missing";
  reconciliationLabel: string;
  reconciliationReason: string;
  consumptionId: string | null;
  consumptionStatus: string | null;
  consumptionCapability: string | null;
  consumptionCreatedAt: string | null;
  consumptionRevenueCents: number | null;
  consumptionCostCents: number | null;
  consumptionGrossProfitCents: number | null;
};

export type ListingRow = {
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
  detailHint: string;
  isSeeded: boolean;
};

export type LearningQueueRow = {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  sourceId: string | null;
  weightDelta: number | null;
  createdAt: string;
  verdict: string | null;
  score: number | null;
  problem: string | null;
  summary: string;
  decisionId: string | null;
  projectId: string | null;
  evaluationResultId: string | null;
  priority: QueuePriority;
  agingDays: number;
  detailHint: string;
};

export type CognitiveSessionRow = {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  decisionId: string | null;
  projectId: string | null;
  overall: number | null;
  traceCount: number;
  evidenceCount: number;
  priority: QueuePriority;
  lowConfidence: boolean;
  missingEvidence: boolean;
  detailHint: string;
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

export type PlatformAdminPaginationInput = {
  page?: number;
  pageSize?: number;
};

export type PlatformAdminPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type PlatformAdminOverviewOptions = {
  mode?: "summary" | "full";
  domain?: "business" | "learning" | "marketplace" | "objects";
  pagination?: PlatformAdminPaginationInput;
};

export type PlatformAdminOverview = {
  generatedAt: string;
  summary: PlatformAdminSummary;
  header: {
    cards: PlatformAdminMetric[];
    alerts: PlatformAdminAlert[];
  };
  domains: {
    overview: {
      cards: PlatformAdminMetric[];
      queues: PlatformAdminMetric[];
      alerts: PlatformAdminAlert[];
    };
    business: {
      cards: PlatformAdminMetric[];
      plans: PlanRow[];
      subscriptions: SubscriptionRow[];
      invoices: InvoiceRow[];
      pointsOrders: BusinessPointsOrderRow[];
      capabilityPricing: CapabilityPricingRow[];
      consumptions: ConsumptionEconomicsRow[];
      usageSummary: ThirdPartyUsageSummary;
      usageProviders: ThirdPartyUsageRow[];
      usageModels: ThirdPartyUsageRow[];
      usageTypes: ThirdPartyUsageRow[];
      usageTrend: ThirdPartyUsageTrendPoint[];
      usageAnomalies: ThirdPartyUsageAnomalyRow[];
    };
    marketplace: {
      cards: PlatformAdminMetric[];
      listings: ListingRow[];
    };
    learning: {
      cards: PlatformAdminMetric[];
      queue: LearningQueueRow[];
    };
    cognitive: {
      cards: PlatformAdminMetric[];
      sessions: CognitiveSessionRow[];
    };
    objects: {
      cards: PlatformAdminMetric[];
      organizations: OrganizationRow[];
      billingAccounts: BillingAccountRow[];
      plans: PlanRow[];
      subscriptions: SubscriptionRow[];
      listings: ListingRow[];
    };
  };
};

type PaymentOrderQueryRow = {
  id: string;
  orderNo: string;
  ownerId: string | null;
  billingAccountId: string;
  planId: string;
  amountCents: number;
  currency: string;
  paidAt: Date | string | null;
  metadata: string | null;
};

type CapabilityPriceQueryRow = {
  capability: string;
  baseCost: number;
  depthMultipliers: string | null;
  complexityMultipliers: string | null;
  agentMultipliers: string | null;
  metadata: string | null;
};

type ConsumptionRecordQueryRow = {
  id: string;
  userId: string | null;
  runId: string | null;
  capability: string;
  requestedAmount: number;
  actualAmount: number;
  status: string;
  reason: string;
  tokenTotal: number;
  provider: string | null;
  model: string | null;
  costCents: number;
  agentCodes: string | null;
  metadata: string | null;
  createdAt: Date | string;
};

type UsageRecordQueryRow = {
  id: string;
  runId: string | null;
  usageType: string;
  provider: string | null;
  model: string | null;
  tokenInput: number;
  tokenOutput: number;
  tokenCached: number;
  tokenReasoning: number;
  tokenTotal: number;
  cost: string | number | null;
  currency: string | null;
  billable: boolean;
  metadata: string | null;
  occurredAt: Date | string;
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

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
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

function parseAmount(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 1) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return round((numerator / denominator) * 100, 1);
}

function daysUntil(value: Date | string | null | undefined) {
  if (!value) return null;
  const target = new Date(value);
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function daysSince(value: Date | string | null | undefined) {
  if (!value) return 0;
  const target = new Date(value);
  const diff = Date.now() - target.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function planCategoryLabel(category: PlanCommercialCategory) {
  switch (category) {
    case "platform":
      return "母体席位";
    case "specialty_pack":
      return "专项咨询包";
    case "points_pack":
      return "经营点商品";
    case "balance_credit":
      return "账户余额";
    default:
      return "其他商品";
  }
}

function classifyPlan(code: string, metadata: Record<string, unknown>, includedRuns: number) {
  const kind = typeof metadata.kind === "string" ? metadata.kind : null;
  const productType = typeof metadata.productType === "string" ? metadata.productType : null;

  if (kind === "specialty_pack" || kind === "agent_addon" || code.startsWith("specialty_") || code.startsWith("addon_")) {
    return "specialty_pack" satisfies PlanCommercialCategory;
  }

  if (productType === "BUSINESS_POINTS" || code.startsWith("points_")) {
    return "points_pack" satisfies PlanCommercialCategory;
  }

  if (productType === "BALANCE_CREDIT" || code.startsWith("credit_")) {
    return "balance_credit" satisfies PlanCommercialCategory;
  }

  if (kind === "platform" || code === "starter" || code === "growth" || code === "partner" || includedRuns > 0) {
    return "platform" satisfies PlanCommercialCategory;
  }

  return "other" satisfies PlanCommercialCategory;
}

function buildPlanUsageSummary(
  category: PlanCommercialCategory,
  includedRuns: number,
  includedTokens: number,
  pointsAmount: number | null,
) {
  switch (category) {
    case "platform":
      return includedRuns > 0
        ? `母体席位 · ${includedRuns} 次基础额度`
        : "母体席位 · 基础权限商品";
    case "specialty_pack":
      return "专项咨询包 · 覆盖单一能力";
    case "points_pack":
      return pointsAmount ? `充值 ${pointsAmount} 经营点` : "经营点储值商品";
    case "balance_credit":
      return "账户余额充值";
    default:
      return `内部口径 · token ${includedTokens} / run ${includedRuns}`;
  }
}

function formatInvoicePlanKind(kind: string | null | undefined) {
  if (kind === "specialty_pack" || kind === "agent_addon") return "专项咨询包";
  if (kind === "credit_pack") return "经营点商品";
  if (kind === "balance_credit") return "账户余额";
  if (kind === "platform") return "母体席位";
  return "待补类型";
}

function inferInvoicePlanKindFromCategory(category: PlanCommercialCategory | null) {
  if (category === "specialty_pack") return "specialty_pack";
  if (category === "points_pack") return "credit_pack";
  if (category === "balance_credit") return "balance_credit";
  if (category === "platform") return "platform";
  return null;
}

function capabilityLabel(capability: string) {
  switch (capability) {
    case "general_consulting":
      return "经营咨询";
    case "market_analysis":
      return "市场分析";
    case "brand_strategy":
      return "品牌定位";
    case "business_model":
      return "商业诊断";
    case "equity_design":
      return "股权设计";
    case "founder_council":
      return "四席会议";
    default:
      return capability.replace(/_/g, " ");
  }
}

function summarizeFactorMap(raw: string | null | undefined) {
  const parsed = parseJsonObject(raw);
  const entries = Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number");
  if (entries.length === 0) return "默认 1x";
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key} ${value}x`)
    .join(" · ");
}

function parseStringArray(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

function normalizeUsageLabel(value: string | null | undefined, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function parseUsageCostValue(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function extractMetadataStringCandidates(metadata: Record<string, unknown>, keys: string[]) {
  const values: string[] = [];
  for (const key of keys) {
    const raw = metadata[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      values.push(raw.trim());
      continue;
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
      values.push(String(raw));
      continue;
    }
    if (Array.isArray(raw)) {
      values.push(
        ...raw
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim()),
      );
    }
  }
  return [...new Set(values)];
}

function buildConversationAgentRunMap(
  rows: Array<{ conversationId: string; metadata: string | null; createdAt: Date | string }>,
) {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (map.has(row.conversationId)) continue;
    const metadata = parseJsonObject(row.metadata);
    const agentRunId = extractMetadataStringCandidates(metadata, ["agentRunId"])[0] ?? null;
    if (agentRunId) {
      map.set(row.conversationId, agentRunId);
    }
  }
  return map;
}

function enrichConsumptionRunIdsFromConversation(
  records: ConsumptionRecordQueryRow[],
  conversationAgentRunMap: Map<string, string>,
) {
  return records.map((record) => {
    if (record.runId) return record;
    const metadata = parseJsonObject(record.metadata);
    const conversationId =
      extractMetadataStringCandidates(metadata, ["conversationId", "sourceConversationId"])[0] ?? null;
    if (!conversationId) return record;
    const derivedRunId = conversationAgentRunMap.get(conversationId) ?? null;
    if (!derivedRunId) return record;
    return {
      ...record,
      runId: derivedRunId,
    };
  });
}

function normalizeComparableLabel(value: string | null | undefined) {
  return normalizeUsageLabel(value, "").trim().toLowerCase();
}

function diffHours(left: Date | string, right: Date | string) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return Number.POSITIVE_INFINITY;
  return Math.abs(leftTime - rightTime) / (1000 * 60 * 60);
}

function toDayKey(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid-day";
  return date.toISOString().slice(0, 10);
}

function aggregateUsageRows(
  records: UsageRecordQueryRow[],
  dimension: "provider" | "model",
): ThirdPartyUsageRow[] {
  const totalTokens = records.reduce((sum, item) => sum + item.tokenTotal, 0);
  const map = new Map<
    string,
    ThirdPartyUsageRow & { secondarySet: Set<string>; usageTypeSet: Set<string>; latestTs: number }
  >();

  for (const record of records) {
    const providerLabel = normalizeUsageLabel(record.provider, "未记录 Provider");
    const modelLabel = normalizeUsageLabel(record.model, "未记录模型");
    const label = dimension === "provider" ? providerLabel : modelLabel;
    const secondaryLabel = dimension === "provider" ? modelLabel : providerLabel;
    const costValue = parseUsageCostValue(record.cost);
    const occurredAt = new Date(record.occurredAt).getTime();
    const current = map.get(label) ?? {
      key: label,
      label,
      secondaryLabel: "",
      recordCount: 0,
      billableCount: 0,
      tokenInput: 0,
      tokenOutput: 0,
      tokenCached: 0,
      tokenReasoning: 0,
      tokenTotal: 0,
      costValue: 0,
      currency: record.currency || "USD",
      sharePercent: null,
      latestOccurredAt: null,
      topUsageTypes: [],
      secondarySet: new Set<string>(),
      usageTypeSet: new Set<string>(),
      latestTs: Number.isFinite(occurredAt) ? occurredAt : 0,
    };

    current.recordCount += 1;
    current.billableCount += record.billable ? 1 : 0;
    current.tokenInput += record.tokenInput;
    current.tokenOutput += record.tokenOutput;
    current.tokenCached += record.tokenCached;
    current.tokenReasoning += record.tokenReasoning;
    current.tokenTotal += record.tokenTotal;
    current.costValue += Number.isFinite(costValue) ? costValue : 0;
    current.secondarySet.add(secondaryLabel);
    current.usageTypeSet.add(record.usageType || "unknown");
    if (Number.isFinite(occurredAt) && occurredAt >= current.latestTs) {
      current.latestTs = occurredAt;
      current.latestOccurredAt = toIso(record.occurredAt);
    }
    if (!current.currency && record.currency) {
      current.currency = record.currency;
    }
    map.set(label, current);
  }

  return Array.from(map.values())
    .map((item) => ({
      key: item.key,
      label: item.label,
      secondaryLabel:
        dimension === "provider"
          ? `${item.secondarySet.size} 个模型`
          : Array.from(item.secondarySet).slice(0, 2).join(" / "),
      recordCount: item.recordCount,
      billableCount: item.billableCount,
      tokenInput: item.tokenInput,
      tokenOutput: item.tokenOutput,
      tokenCached: item.tokenCached,
      tokenReasoning: item.tokenReasoning,
      tokenTotal: item.tokenTotal,
      costValue: round(item.costValue, 6),
      currency: item.currency || "USD",
      sharePercent: totalTokens > 0 ? round((item.tokenTotal / totalTokens) * 100, 1) : null,
      latestOccurredAt: item.latestOccurredAt,
      topUsageTypes: Array.from(item.usageTypeSet).slice(0, 3),
    }))
    .sort((a, b) => {
      if (b.tokenTotal !== a.tokenTotal) return b.tokenTotal - a.tokenTotal;
      return b.costValue - a.costValue;
    });
}

function aggregateUsageTypeRows(records: UsageRecordQueryRow[]): ThirdPartyUsageRow[] {
  const totalTokens = records.reduce((sum, item) => sum + item.tokenTotal, 0);
  const map = new Map<
    string,
    ThirdPartyUsageRow & { providerSet: Set<string>; modelSet: Set<string>; latestTs: number }
  >();

  for (const record of records) {
    const usageTypeLabel = normalizeUsageLabel(record.usageType, "unknown");
    const providerLabel = normalizeUsageLabel(record.provider, "未记录 Provider");
    const modelLabel = normalizeUsageLabel(record.model, "未记录模型");
    const costValue = parseUsageCostValue(record.cost);
    const occurredAt = new Date(record.occurredAt).getTime();
    const current = map.get(usageTypeLabel) ?? {
      key: usageTypeLabel,
      label: usageTypeLabel,
      secondaryLabel: "",
      recordCount: 0,
      billableCount: 0,
      tokenInput: 0,
      tokenOutput: 0,
      tokenCached: 0,
      tokenReasoning: 0,
      tokenTotal: 0,
      costValue: 0,
      currency: record.currency || "USD",
      sharePercent: null,
      latestOccurredAt: null,
      topUsageTypes: [usageTypeLabel],
      providerSet: new Set<string>(),
      modelSet: new Set<string>(),
      latestTs: Number.isFinite(occurredAt) ? occurredAt : 0,
    };

    current.recordCount += 1;
    current.billableCount += record.billable ? 1 : 0;
    current.tokenInput += record.tokenInput;
    current.tokenOutput += record.tokenOutput;
    current.tokenCached += record.tokenCached;
    current.tokenReasoning += record.tokenReasoning;
    current.tokenTotal += record.tokenTotal;
    current.costValue += costValue;
    current.providerSet.add(providerLabel);
    current.modelSet.add(modelLabel);
    if (Number.isFinite(occurredAt) && occurredAt >= current.latestTs) {
      current.latestTs = occurredAt;
      current.latestOccurredAt = toIso(record.occurredAt);
    }
    if (!current.currency && record.currency) {
      current.currency = record.currency;
    }
    map.set(usageTypeLabel, current);
  }

  return Array.from(map.values())
    .map((item) => ({
      key: item.key,
      label: item.label,
      secondaryLabel: `${item.providerSet.size} 个 Provider / ${item.modelSet.size} 个模型`,
      recordCount: item.recordCount,
      billableCount: item.billableCount,
      tokenInput: item.tokenInput,
      tokenOutput: item.tokenOutput,
      tokenCached: item.tokenCached,
      tokenReasoning: item.tokenReasoning,
      tokenTotal: item.tokenTotal,
      costValue: round(item.costValue, 6),
      currency: item.currency || "USD",
      sharePercent: totalTokens > 0 ? round((item.tokenTotal / totalTokens) * 100, 1) : null,
      latestOccurredAt: item.latestOccurredAt,
      topUsageTypes: [item.label],
    }))
    .sort((a, b) => {
      if (b.tokenTotal !== a.tokenTotal) return b.tokenTotal - a.tokenTotal;
      return b.costValue - a.costValue;
    });
}

function aggregateUsageTrend(records: UsageRecordQueryRow[], days = 7): ThirdPartyUsageTrendPoint[] {
  const currency =
    records.find((item) => typeof item.currency === "string" && item.currency.trim().length > 0)?.currency ?? "USD";
  const map = new Map<string, ThirdPartyUsageTrendPoint>();

  for (const record of records) {
    const day = toDayKey(record.occurredAt);
    if (day === "invalid-day") continue;
    const current = map.get(day) ?? {
      day,
      label: day.slice(5),
      recordCount: 0,
      billableCount: 0,
      tokenTotal: 0,
      costValue: 0,
      currency,
    };
    current.recordCount += 1;
    current.billableCount += record.billable ? 1 : 0;
    current.tokenTotal += record.tokenTotal;
    current.costValue += parseUsageCostValue(record.cost);
    map.set(day, current);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const day = date.toISOString().slice(0, 10);
    const current = map.get(day);
    return {
      day,
      label: day.slice(5),
      recordCount: current?.recordCount ?? 0,
      billableCount: current?.billableCount ?? 0,
      tokenTotal: current?.tokenTotal ?? 0,
      costValue: round(current?.costValue ?? 0, 6),
      currency: current?.currency ?? currency,
    };
  });
}

function aggregateUsageAnomalies(
  records: UsageRecordQueryRow[],
  consumptionRecords: ConsumptionRecordQueryRow[],
  limit = 12,
): ThirdPartyUsageAnomalyRow[] {
  const averageTokens =
    records.length > 0 ? records.reduce((sum, item) => sum + item.tokenTotal, 0) / records.length : 0;
  const highTokenThreshold = Math.max(20000, Math.round(averageTokens * 2.5));
  const enrichConsumption = consumptionRecords.map((record) => {
    const metadata = parseJsonObject(record.metadata);
    const explicitUsageIds = extractMetadataStringCandidates(metadata, [
      "usageRecordId",
      "usageId",
      "sourceUsageRecordId",
      "sourceUsageId",
      "usageRecordIds",
    ]);
    const explicitRunIds = extractMetadataStringCandidates(metadata, [
      "runId",
      "sourceRunId",
      "agentRunId",
      "agentRunIds",
      "usageRunIds",
    ]);

    return {
      record,
      metadata,
      explicitUsageIds,
      explicitRunIds,
      providerKey: normalizeComparableLabel(record.provider),
      modelKey: normalizeComparableLabel(record.model),
      runId: record.runId?.trim() ?? null,
      occurredAt: toIso(record.createdAt),
      revenueCents: Math.max(0, Math.round(record.actualAmount)),
      grossProfitCents: Math.max(0, Math.round(record.actualAmount)) - record.costCents,
    };
  });
  const consumptionById = new Map(enrichConsumption.map((item) => [item.record.id, item] as const));
  const consumptionByRunId = new Map(
    enrichConsumption.flatMap((item) => {
      const keys = new Set<string>();
      if (typeof item.runId === "string" && item.runId.length > 0) {
        keys.add(item.runId);
      }
      for (const runId of item.explicitRunIds) {
        if (runId) keys.add(runId);
      }
      return [...keys].map((runId) => [runId, item] as const);
    }),
  );
  const consumptionByUsageId = new Map<string, (typeof enrichConsumption)[number]>();
  for (const item of enrichConsumption) {
    for (const usageId of item.explicitUsageIds) {
      if (!consumptionByUsageId.has(usageId)) {
        consumptionByUsageId.set(usageId, item);
      }
    }
  }

  const anomalies: ThirdPartyUsageAnomalyRow[] = [];
  for (const record of records) {
      const metadata = parseJsonObject(record.metadata);
      const usageType = normalizeUsageLabel(record.usageType, "unknown");
      const provider = normalizeUsageLabel(record.provider, "未记录 Provider");
      const model = normalizeUsageLabel(record.model, "未记录模型");
      const costValue = parseUsageCostValue(record.cost);
      const anomalyFlags: string[] = [];

      if (provider === "未记录 Provider") anomalyFlags.push("缺 Provider");
      if (model === "未记录模型") anomalyFlags.push("缺模型");
      if (usageType === "unknown") anomalyFlags.push("未知 usageType");
      if (record.billable && record.tokenTotal > 0 && costValue <= 0) anomalyFlags.push("billable 无成本");
      if (!record.billable && record.tokenTotal >= highTokenThreshold) anomalyFlags.push("高 Tokens 但未计费");

      if (anomalyFlags.length === 0) continue;

      const severity: AlertSeverity =
        anomalyFlags.includes("billable 无成本") || anomalyFlags.includes("高 Tokens 但未计费")
          ? "critical"
          : "warning";
      const explicitConsumptionIds = extractMetadataStringCandidates(metadata, [
        "consumptionId",
        "consumptionRecordId",
        "settledConsumptionId",
        "sourceConsumptionId",
      ]);
      const explicitConsumption =
        explicitConsumptionIds.map((id) => consumptionById.get(id)).find((item) => item != null) ?? null;
      const explicitUsageConsumption = consumptionByUsageId.get(record.id) ?? null;
      const runIdConsumption = record.runId ? consumptionByRunId.get(record.runId) ?? null : null;
      const providerKey = normalizeComparableLabel(record.provider);
      const modelKey = normalizeComparableLabel(record.model);
      const heuristicConsumption =
        enrichConsumption
          .map((candidate) => {
            let score = 0;
            if (providerKey && candidate.providerKey && providerKey === candidate.providerKey) score += 2;
            if (modelKey && candidate.modelKey && modelKey === candidate.modelKey) score += 2;
            if (record.tokenTotal > 0 && candidate.record.tokenTotal === record.tokenTotal) score += 2;
            const hourDiff = diffHours(record.occurredAt, candidate.record.createdAt);
            if (hourDiff <= 6) score += 2;
            else if (hourDiff <= 24) score += 1;
            const usageCostCents = Math.round(costValue * 100);
            if (usageCostCents > 0 && Math.abs(candidate.record.costCents - usageCostCents) <= 1) score += 1;
            return { candidate, score, hourDiff };
          })
          .filter((item) => item.score >= 5)
          .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            return left.hourDiff - right.hourDiff;
          })[0]?.candidate ?? null;
      const matchedConsumption = explicitConsumption ?? explicitUsageConsumption ?? runIdConsumption ?? heuristicConsumption;
      const isStrongLink = Boolean(explicitConsumption ?? explicitUsageConsumption ?? runIdConsumption);
      const reconciliationStatus: ThirdPartyUsageAnomalyRow["reconciliationStatus"] = matchedConsumption
        ? isStrongLink
          ? "reconciled"
          : "suspected"
        : "missing";
      const reconciliationLabel =
        reconciliationStatus === "reconciled"
          ? "已回传到经营结算层"
          : reconciliationStatus === "suspected"
            ? "疑似已进入经营结算层"
            : "尚未看到经营结算回传";
      const reconciliationReason = matchedConsumption
        ? explicitConsumption || explicitUsageConsumption
          ? "已通过 metadata 显式关联到 consumptionRecord。"
          : runIdConsumption
            ? "已通过 runId 精确关联到 consumptionRecord。"
          : "已按 Provider / Model / Tokens / 时间窗口匹配到最接近的 consumptionRecord。"
        : "当前没有匹配到 consumptionRecord，建议核查结算回传链。";

      anomalies.push({
        id: record.id,
        key: record.id,
        severity,
        occurredAt: toIso(record.occurredAt),
        usageType,
        provider,
        model,
        tokenInput: record.tokenInput,
        tokenOutput: record.tokenOutput,
        tokenCached: record.tokenCached,
        tokenReasoning: record.tokenReasoning,
        tokenTotal: record.tokenTotal,
        costValue: round(costValue, 6),
        currency: record.currency ?? "USD",
        billable: record.billable,
        anomalyFlags,
        summary: anomalyFlags.join(" / "),
        reconciliationStatus,
        reconciliationLabel,
        reconciliationReason,
        consumptionId: matchedConsumption?.record.id ?? null,
        consumptionStatus: matchedConsumption?.record.status ?? null,
        consumptionCapability: matchedConsumption?.record.capability ?? null,
        consumptionCreatedAt: matchedConsumption?.occurredAt ?? null,
        consumptionRevenueCents: matchedConsumption?.revenueCents ?? null,
        consumptionCostCents: matchedConsumption?.record.costCents ?? null,
        consumptionGrossProfitCents: matchedConsumption?.grossProfitCents ?? null,
      });
  }

  return anomalies
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
      if ((b.occurredAt ?? "") !== (a.occurredAt ?? "")) return (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "");
      return b.tokenTotal - a.tokenTotal;
    })
    .slice(0, limit);
}

function looksUnreadableLabel(value: string | null | undefined) {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  const core = trimmed.replace(/账务账户|账户/g, "").trim();
  const target = core || trimmed;
  if (/^[?？�\s._-]+$/.test(target)) return true;
  return !/[A-Za-z0-9\u4E00-\u9FFF@]/.test(target);
}

function resolveReadableLabel(value: string | null | undefined) {
  if (looksUnreadableLabel(value)) return null;
  return value!.trim();
}

function resolveOrganizationDisplayName(input: {
  id?: string | null;
  name: string | null | undefined;
  slug?: string | null;
}) {
  const readableName = resolveReadableLabel(input.name);
  if (readableName) return readableName;

  const slug = input.slug?.trim() ?? "";
  if (slug) {
    return slug.startsWith("workspace-") ? `工作区 ${slug.slice("workspace-".length)}` : `组织 ${slug}`;
  }

  return input.id ? `组织 ${input.id.slice(-6)}` : "未命名组织";
}

function resolveBillingAccountDisplayName(input: {
  accountId?: string | null;
  accountName: string | null | undefined;
  organizationName?: string | null;
  organizationSlug?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
}) {
  const readableAccountName = resolveReadableLabel(input.accountName);
  if (readableAccountName) return readableAccountName;

  const organizationLabel = resolveOrganizationDisplayName({
    name: input.organizationName,
    slug: input.organizationSlug,
  });
  const ownerLabel = resolveReadableLabel(input.ownerName) ?? resolveReadableLabel(input.ownerEmail);
  if (organizationLabel && !organizationLabel.startsWith("未命名")) {
    return `${organizationLabel} 账务账户`;
  }
  if (ownerLabel) {
    return `${ownerLabel} 的账务账户`;
  }
  return input.accountId ? `账务账户 ${input.accountId.slice(-6)}` : "未命名账务账户";
}

function buildListingHint(listing: {
  installCount: number;
  visibility: string;
  revenueShareCount: number;
}) {
  if (listing.installCount === 0) return "尚未形成安装转化，建议先检查曝光与定价。";
  if (listing.visibility !== "public") return "当前为非公开上架，仅内部或定向可见。";
  if (listing.revenueShareCount === 0) return "缺少分润规则，商业闭环未完整。";
  return "已具备上架与分润基础，可继续优化转化。";
}

function learningPriority(score: number | null, status: string, agingDays: number): QueuePriority {
  if (status === "pending" && (agingDays >= 3 || (score !== null && score < 0.6))) return "high";
  if (status === "pending" || (score !== null && score < 0.75)) return "medium";
  return "low";
}

function sessionPriority(overall: number | null, evidenceCount: number): QueuePriority {
  if ((overall !== null && overall < 0.6) || evidenceCount === 0) return "high";
  if ((overall !== null && overall < 0.75) || evidenceCount <= 1) return "medium";
  return "low";
}

function toneForPriority(priority: QueuePriority): MetricTone {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "good";
}

export function normalizePlatformAdminPagination(input?: PlatformAdminPaginationInput) {
  const page = Math.max(1, Math.floor(input?.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(input?.pageSize ?? 20)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function parsePlatformAdminPaginationFromUrl(url: URL) {
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  return normalizePlatformAdminPagination({ page, pageSize });
}

async function fetchPlatformAdminSummary(prisma: PrismaClient): Promise<PlatformAdminSummary> {
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
}

async function fetchPlatformAdminSummaryMetrics(prisma: PrismaClient) {
  const now = new Date();
  const renewalDeadline = daysFromNow(7);

  const [
    lowConfidenceSessions,
    dueSoonSubscriptions,
    orphanBillingAccounts,
    learningApprovedCount,
    learningRejectedCount,
    averageConfidenceAggregate,
  ] = await Promise.all([
    prisma.confidenceModel.count({ where: { overall: { lt: 0.6 } } }),
    prisma.subscription.count({
      where: {
        status: "active",
        currentPeriodEnd: { gte: now, lte: renewalDeadline },
      },
    }),
    prisma.billingAccount.count({
      where: { status: "active", organizationId: null },
    }),
    prisma.learningRecord.count({ where: { status: "approved" } }),
    prisma.learningRecord.count({ where: { status: "rejected" } }),
    prisma.confidenceModel.aggregate({ _avg: { overall: true } }),
  ]);

  return {
    lowConfidenceSessions,
    dueSoonSubscriptions,
    orphanBillingAccounts,
    learningApprovedCount,
    learningRejectedCount,
    averageConfidence: averageConfidenceAggregate._avg.overall ?? 0,
  };
}

function buildDraftInvoiceAlert(count: number): PlatformAdminAlert {
  return {
    id: "draft_invoices",
    severity: "warning",
    title: "草稿发票队列",
    description: "发票确认/开票闭环待建，当前仅只读队列。",
    count,
  };
}

function buildPlatformAdminAlerts(input: {
  summary: PlatformAdminSummary;
  lowConfidenceSessions: number;
  unlinkedInvoiceCount?: number;
}): PlatformAdminAlert[] {
  const alerts: PlatformAdminAlert[] = [];
  if (input.summary.draftInvoices > 0) {
    alerts.push(buildDraftInvoiceAlert(input.summary.draftInvoices));
  }
  if (input.summary.learningPending > 0) {
    alerts.push({
      id: "learning_pending",
      severity: "warning",
      title: "学习复核队列堆积",
      description: "待审学习记录会影响判断闭环质量，建议优先处理。",
      count: input.summary.learningPending,
    });
  }
  if (input.lowConfidenceSessions > 0) {
    alerts.push({
      id: "low_confidence",
      severity: "critical",
      title: "低置信认知会话待复核",
      description: "存在低置信或缺证据会话，需要检查 trace 和 evidence。",
      count: input.lowConfidenceSessions,
    });
  }
  if (typeof input.unlinkedInvoiceCount === "number" && input.unlinkedInvoiceCount > 0) {
    alerts.push({
      id: "invoice_metadata",
      severity: "info",
      title: "部分发票缺少购买语义",
      description: "仍有发票无法明确识别购买方案或订单号，影响运营归因。",
      count: input.unlinkedInvoiceCount,
    });
  }
  return alerts;
}

function emptyThirdPartyUsageSummary(): ThirdPartyUsageSummary {
  return {
    recordedEvents: 0,
    billableCount: 0,
    tokenTotal: 0,
    costValue: 0,
    currency: "USD",
    missingProviderCount: 0,
    missingModelCount: 0,
  };
}

export async function getPlatformAdminSummaryOverview(
  prisma: PrismaClient,
): Promise<PlatformAdminOverview> {
  const now = new Date();
  const [summary, metrics] = await Promise.all([
    fetchPlatformAdminSummary(prisma),
    fetchPlatformAdminSummaryMetrics(prisma),
  ]);

  const reviewedLearningCount = metrics.learningApprovedCount + metrics.learningRejectedCount;
  const learningPassRate = ratio(metrics.learningApprovedCount, reviewedLearningCount);
  const openQueues = summary.learningPending + summary.draftInvoices + metrics.lowConfidenceSessions;
  const averageConfidence = metrics.averageConfidence;

  const headerCards: PlatformAdminMetric[] = [
    {
      id: "workspace_count",
      label: "平台工作台",
      value: summary.organizations,
      helper: "当前纳入平台管理的组织 / 工作空间数量",
      tone: "neutral",
    },
    {
      id: "business_objects",
      label: "活跃商业对象",
      value: summary.activeSubscriptions + summary.activeListings,
      helper: "订阅与上架能力共同构成当前商业面",
      tone: "good",
    },
    {
      id: "open_queues",
      label: "待处理事项",
      value: openQueues,
      helper: "草稿发票、学习待审与低置信会话需要优先处理",
      tone: openQueues > 0 ? "warning" : "good",
    },
    {
      id: "avg_confidence",
      label: "认知健康",
      value: averageConfidence ? Math.round(averageConfidence * 100) : 0,
      unit: "%",
      helper: "基于认知会话置信度模型的平均值",
      tone: averageConfidence >= 0.75 ? "good" : averageConfidence >= 0.6 ? "warning" : "danger",
    },
  ];

  const alerts = buildPlatformAdminAlerts({
    summary,
    lowConfidenceSessions: metrics.lowConfidenceSessions,
  });

  return {
    generatedAt: now.toISOString(),
    summary,
    header: { cards: headerCards, alerts },
    domains: {
      overview: {
        cards: [
          {
            id: "overview_orgs",
            label: "组织数",
            value: summary.organizations,
            helper: "平台当前接入的组织 / 工作空间总数",
          },
          {
            id: "overview_members",
            label: "成员数",
            value: summary.members,
            helper: "活跃组织成员规模",
          },
          {
            id: "overview_revenue_shares",
            label: "分润规则",
            value: summary.revenueShares,
            helper: "已绑定生效的 revenue share 配置",
          },
          {
            id: "overview_evaluations",
            label: "评估结果",
            value: summary.evaluationResults,
            helper: "累计认知评估结果数量",
          },
        ],
        queues: [
          {
            id: "queue_invoices",
            label: "待处理草稿发票",
            value: summary.draftInvoices,
            helper: "发票确认/开票闭环待建，当前为只读队列",
            tone: summary.draftInvoices > 0 ? "warning" : "good",
          },
          {
            id: "queue_learning",
            label: "待审学习记录",
            value: summary.learningPending,
            helper: "待审越多，学习燃料积压越重",
            tone: summary.learningPending > 0 ? "warning" : "good",
          },
          {
            id: "queue_cognitive",
            label: "低置信会话",
            value: metrics.lowConfidenceSessions,
            helper: "需要补证据或人工复核",
            tone: metrics.lowConfidenceSessions > 0 ? "danger" : "good",
          },
          {
            id: "queue_renewal",
            label: "7 天内待续费",
            value: metrics.dueSoonSubscriptions,
            helper: "帮助平台提前发现续费与流失风险",
            tone: metrics.dueSoonSubscriptions > 0 ? "warning" : "neutral",
          },
        ],
        alerts,
      },
      business: {
        cards: [
          {
            id: "business_draft_invoices",
            label: "草稿发票",
            value: summary.draftInvoices,
            helper: "只读队列，确认/开票闭环待建",
            tone: summary.draftInvoices > 0 ? "warning" : "good",
          },
          {
            id: "business_active_subscriptions",
            label: "活跃订阅",
            value: summary.activeSubscriptions,
            helper: "当前生效中的订阅数量",
          },
          {
            id: "business_billing_accounts",
            label: "账务账户",
            value: summary.billingAccounts,
            helper: "活跃账务归因主体",
          },
          {
            id: "business_revenue_shares",
            label: "分润规则",
            value: summary.revenueShares,
            helper: "Marketplace 分润配置数量",
          },
        ],
        plans: [],
        subscriptions: [],
        invoices: [],
        pointsOrders: [],
        capabilityPricing: [],
        consumptions: [],
        usageSummary: emptyThirdPartyUsageSummary(),
        usageProviders: [],
        usageModels: [],
        usageTypes: [],
        usageTrend: aggregateUsageTrend([], 7),
        usageAnomalies: [],
      },
      marketplace: {
        cards: [
          {
            id: "marketplace_active",
            label: "活跃上架",
            value: summary.activeListings,
            helper: "正在对外展示或可流通的 Listing",
          },
          {
            id: "marketplace_revenue_shares",
            label: "分润规则",
            value: summary.revenueShares,
            helper: "已绑定生效的分润配置",
          },
          {
            id: "marketplace_evaluations",
            label: "评估结果",
            value: summary.evaluationResults,
            helper: "累计认知评估结果",
          },
          {
            id: "marketplace_pending_learning",
            label: "待审学习",
            value: summary.learningPending,
            helper: "等待平台复核的学习记录",
            tone: summary.learningPending > 0 ? "warning" : "good",
          },
        ],
        listings: [],
      },
      learning: {
        cards: [
          {
            id: "learning_pending",
            label: "待审记录",
            value: summary.learningPending,
            helper: "当前仍等待平台复核的学习记录",
            tone: summary.learningPending > 0 ? "warning" : "good",
          },
          {
            id: "learning_pass_rate",
            label: "通过率",
            value: Math.round(learningPassRate),
            unit: "%",
            helper: "已复核记录中的批准占比",
          },
          {
            id: "learning_approved",
            label: "已批准",
            value: metrics.learningApprovedCount,
            helper: "累计批准的学习记录",
          },
          {
            id: "learning_rejected",
            label: "已驳回",
            value: metrics.learningRejectedCount,
            helper: "累计驳回的学习记录",
            tone: metrics.learningRejectedCount > 0 ? "warning" : "good",
          },
        ],
        queue: [],
      },
      cognitive: {
        cards: [
          {
            id: "cognitive_sessions",
            label: "认知会话",
            value: summary.cognitiveSessions,
            helper: "累计认知会话数量",
          },
          {
            id: "cognitive_low_confidence",
            label: "低置信会话",
            value: metrics.lowConfidenceSessions,
            helper: "置信度低于 0.6 的会话",
            tone: metrics.lowConfidenceSessions > 0 ? "danger" : "good",
          },
          {
            id: "cognitive_evaluations",
            label: "评估结果",
            value: summary.evaluationResults,
            helper: "累计认知评估结果",
          },
          {
            id: "cognitive_avg",
            label: "平均置信度",
            value: Math.round(averageConfidence * 100),
            unit: "%",
            helper: "认知会话置信度模型平均值",
            tone: averageConfidence >= 0.75 ? "good" : averageConfidence >= 0.6 ? "warning" : "danger",
          },
        ],
        sessions: [],
      },
      objects: {
        cards: [
          {
            id: "objects_organizations",
            label: "组织 / 工作台",
            value: summary.organizations,
            helper: "当前可管理的组织主体数量",
          },
          {
            id: "objects_billing_accounts",
            label: "账务账户",
            value: summary.billingAccounts,
            helper: "所有账务归因主体数量",
          },
          {
            id: "objects_orphan_accounts",
            label: "孤立账户",
            value: metrics.orphanBillingAccounts,
            helper: "未绑定组织的账务账户需要清理",
            tone: metrics.orphanBillingAccounts > 0 ? "warning" : "good",
          },
          {
            id: "objects_active_listings",
            label: "活跃上架",
            value: summary.activeListings,
            helper: "Marketplace 活跃 Listing 数量",
          },
        ],
        organizations: [],
        billingAccounts: [],
        plans: [],
        subscriptions: [],
        listings: [],
      },
    },
  };
}

export async function ensurePlatformAdminSeed(prisma: PrismaClient) {
  const planSeeds = [
    {
      id: "plan_starter",
      code: "starter",
      name: "母体席位 · 体验版",
      description: "平台体验版，覆盖最小经营工作台闭环。",
      billingCycle: "MONTHLY",
      priceCents: 0,
      currency: "CNY",
      includedTokens: 500000,
      includedRuns: 1000,
    },
    {
      id: "plan_growth",
      code: "growth",
      name: "母体席位 · 增长版",
      description: "适合多项目经营协同与更高额度管理。",
      billingCycle: "MONTHLY",
      priceCents: 19900,
      currency: "CNY",
      includedTokens: 5000000,
      includedRuns: 12000,
    },
    {
      id: "plan_partner",
      code: "partner",
      name: "母体席位 · 合伙版",
      description: "平台合作与更高经营管理额度。",
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
        metadata: JSON.stringify({ seeded: true, kind: "platform" }),
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
        name: "MealKey 平台工作台",
        description: "平台默认工作台产品，用于承接 Marketplace 管理演示闭环。",
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

type RuntimeFindManyDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
};

function getRuntimeFindManyDelegate(prisma: PrismaClient, key: string): RuntimeFindManyDelegate | null {
  const runtimePrisma = prisma as unknown as Record<string, unknown>;
  const delegate = runtimePrisma[key];
  if (!delegate || typeof delegate !== "object") return null;

  const findMany = (delegate as { findMany?: unknown }).findMany;
  if (typeof findMany !== "function") return null;

  return delegate as RuntimeFindManyDelegate;
}

async function safeRuntimeFindMany<T>(prisma: PrismaClient, key: string, args?: unknown): Promise<T[]> {
  const delegate = getRuntimeFindManyDelegate(prisma, key);
  if (!delegate) return [];
  return (await delegate.findMany(args)) as T[];
}

function isUnknownSelectFieldError(error: unknown, field: string) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Unknown field") &&
    (message.includes(`'${field}'`) || message.includes(`\`${field}\``)) &&
    message.includes("select statement")
  );
}

function omitSelectField(args: unknown, field: string) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return args;
  const argsRecord = args as Record<string, unknown>;
  const select = argsRecord.select;
  if (!select || typeof select !== "object" || Array.isArray(select)) return args;

  const nextSelect = { ...(select as Record<string, unknown>) };
  if (!(field in nextSelect)) return args;
  delete nextSelect[field];

  return {
    ...argsRecord,
    select: nextSelect,
  };
}

async function safeRuntimeUsageRecordFindMany(
  prisma: PrismaClient,
  args?: unknown,
): Promise<UsageRecordQueryRow[]> {
  const delegate = getRuntimeFindManyDelegate(prisma, "usageRecord");
  if (!delegate) return [];

  try {
    return (await delegate.findMany(args)) as UsageRecordQueryRow[];
  } catch (error) {
    if (!isUnknownSelectFieldError(error, "metadata")) {
      throw error;
    }

    const fallbackArgs = omitSelectField(args, "metadata");
    const rows = (await delegate.findMany(fallbackArgs)) as Array<Omit<UsageRecordQueryRow, "metadata">>;
    return rows.map((row) => ({
      ...row,
      metadata: null,
    }));
  }
}

export async function getPlatformAdminOverview(
  prisma: PrismaClient,
  options?: PlatformAdminOverviewOptions,
): Promise<PlatformAdminOverview> {
  if (options?.mode === "summary") {
    return getPlatformAdminSummaryOverview(prisma);
  }

  const domain = options?.domain;
  const pagination = normalizePlatformAdminPagination(options?.pagination);
  const loadAll = !domain;
  const loadBusiness = loadAll || domain === "business";
  const loadLearning = loadAll || domain === "learning";
  const loadMarketplace = loadAll || domain === "marketplace";
  const loadObjects = loadAll || domain === "objects";
  const listSkip = domain ? pagination.skip : 0;
  const listTake = (fallback: number) => (domain ? pagination.pageSize : fallback);

  const now = new Date();
  const businessWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    organizationRecords,
    planRecords,
    billingAccountRecords,
    subscriptionRecords,
    invoiceRecords,
    listingRecords,
    paymentOrderRecords,
    capabilityPriceRecords,
    consumptionRecords,
    reconcileConsumptionRecords,
    usageRecords,
    pendingLearning,
    reviewedLearning,
    cognitiveSessionRecords,
    summary,
    learningApprovedCount,
    learningRejectedCount,
  ] = await Promise.all([
    loadObjects || loadAll
      ? prisma.organization.findMany({
          orderBy: { createdAt: "desc" },
          skip: loadObjects && domain ? listSkip : undefined,
          take: listTake(8),
        })
      : Promise.resolve([]),
    loadBusiness || loadObjects || loadAll
      ? prisma.plan.findMany({
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
            metadata: true,
          },
        })
      : Promise.resolve([]),
    loadObjects || loadBusiness || loadAll
      ? prisma.billingAccount.findMany({
          orderBy: { createdAt: "desc" },
          skip: loadObjects && domain ? listSkip : undefined,
          take: listTake(12),
        })
      : Promise.resolve([]),
    loadBusiness || loadObjects || loadAll
      ? prisma.subscription.findMany({
          orderBy: { createdAt: "desc" },
          skip: loadBusiness && domain ? listSkip : loadObjects && domain ? listSkip : undefined,
          take: listTake(8),
        })
      : Promise.resolve([]),
    loadBusiness || loadAll
      ? prisma.invoice.findMany({
          orderBy: { createdAt: "desc" },
          skip: loadBusiness && domain ? listSkip : undefined,
          take: listTake(12),
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            total: true,
            currency: true,
            billingAccountId: true,
            metadata: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    loadMarketplace || loadObjects || loadAll
      ? prisma.agentListing.findMany({
          orderBy: { createdAt: "desc" },
          skip: loadMarketplace && domain ? listSkip : loadObjects && domain ? listSkip : undefined,
          take: listTake(8),
        })
      : Promise.resolve([]),
    loadBusiness || loadAll
      ? prisma.paymentOrder.findMany({
          where: {
            status: "paid",
            paidAt: { gte: businessWindowStart },
          },
          orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          skip: loadBusiness && domain ? listSkip : undefined,
          take: listTake(24),
          select: {
            id: true,
            orderNo: true,
            ownerId: true,
            billingAccountId: true,
            planId: true,
            amountCents: true,
            currency: true,
            paidAt: true,
            metadata: true,
          },
        })
      : Promise.resolve([]),
    loadBusiness || loadAll
      ? safeRuntimeFindMany<CapabilityPriceQueryRow>(prisma, "capabilityPrice", {
          where: { active: true },
          orderBy: { capability: "asc" },
          select: {
            capability: true,
            baseCost: true,
            depthMultipliers: true,
            complexityMultipliers: true,
            agentMultipliers: true,
            metadata: true,
          },
        })
      : Promise.resolve([]),
    loadBusiness || loadAll
      ? safeRuntimeFindMany<ConsumptionRecordQueryRow>(prisma, "consumptionRecord", {
          where: {
            status: "SETTLED",
            createdAt: { gte: businessWindowStart },
          },
          orderBy: { createdAt: "desc" },
          skip: loadBusiness && domain ? listSkip : undefined,
          take: listTake(24),
          select: {
            id: true,
            userId: true,
            runId: true,
            capability: true,
            requestedAmount: true,
            actualAmount: true,
            status: true,
            reason: true,
            tokenTotal: true,
            provider: true,
            model: true,
            costCents: true,
            agentCodes: true,
            metadata: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    loadBusiness || loadAll
      ? safeRuntimeFindMany<ConsumptionRecordQueryRow>(prisma, "consumptionRecord", {
          where: {
            status: "SETTLED",
            createdAt: { gte: businessWindowStart },
          },
          orderBy: { createdAt: "desc" },
          take: domain ? Math.min(60, pagination.pageSize * 3) : 180,
          select: {
            id: true,
            userId: true,
            runId: true,
            capability: true,
            requestedAmount: true,
            actualAmount: true,
            status: true,
            reason: true,
            tokenTotal: true,
            provider: true,
            model: true,
            costCents: true,
            agentCodes: true,
            metadata: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    loadBusiness || loadAll
      ? safeRuntimeUsageRecordFindMany(prisma, {
          where: {
            occurredAt: { gte: businessWindowStart },
          },
          orderBy: { occurredAt: "desc" },
          take: domain ? Math.min(60, pagination.pageSize * 3) : 240,
          select: {
            id: true,
            runId: true,
            usageType: true,
            provider: true,
            model: true,
            tokenInput: true,
            tokenOutput: true,
            tokenCached: true,
            tokenReasoning: true,
            tokenTotal: true,
            cost: true,
            currency: true,
            billable: true,
            metadata: true,
            occurredAt: true,
          },
        })
      : Promise.resolve([]),
    loadLearning || loadAll
      ? prisma.learningRecord.findMany({
          where: domain === "learning" ? undefined : { status: "pending" },
          orderBy: { createdAt: "desc" },
          skip: loadLearning && domain ? listSkip : undefined,
          take: domain === "learning" ? listTake(20) : listTake(8),
        })
      : Promise.resolve([]),
    loadLearning || loadAll
      ? domain === "learning"
        ? Promise.resolve([])
        : prisma.learningRecord.findMany({
            where: { status: { not: "pending" } },
            orderBy: { createdAt: "desc" },
            take: listTake(8),
          })
      : Promise.resolve([]),
    loadLearning || loadAll
      ? prisma.cognitiveSession.findMany({
          orderBy: { createdAt: "desc" },
          skip: loadLearning && domain ? listSkip : undefined,
          take: listTake(8),
        })
      : Promise.resolve([]),
    fetchPlatformAdminSummary(prisma),
    loadLearning || loadAll
      ? prisma.learningRecord.count({ where: { status: "approved" } })
      : Promise.resolve(0),
    loadLearning || loadAll
      ? prisma.learningRecord.count({ where: { status: "rejected" } })
      : Promise.resolve(0),
  ]);

  const orgIds = organizationRecords.map((org) => org.id);
  const consumptionConversationIds = [
    ...new Set(
      [...consumptionRecords, ...reconcileConsumptionRecords].flatMap((record) =>
        extractMetadataStringCandidates(parseJsonObject(record.metadata), ["conversationId", "sourceConversationId"]),
      ),
    ),
  ];
  const consumptionAssistantMessages =
    consumptionConversationIds.length === 0
      ? []
      : await prisma.message.findMany({
          where: {
            conversationId: { in: consumptionConversationIds },
            role: "assistant",
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            conversationId: true,
            metadata: true,
            createdAt: true,
          },
        });
  const conversationAgentRunMap = buildConversationAgentRunMap(consumptionAssistantMessages);
  const enrichedConsumptionRecords = enrichConsumptionRunIdsFromConversation(consumptionRecords, conversationAgentRunMap);
  const enrichedReconcileConsumptionRecords = enrichConsumptionRunIdsFromConversation(
    reconcileConsumptionRecords,
    conversationAgentRunMap,
  );
  const ownerUserIds = organizationRecords
    .map((org) => org.ownerUserId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const billingAccountIds = [
    ...new Set([
      ...billingAccountRecords.map((item) => item.id),
      ...subscriptionRecords.map((item) => item.billingAccountId),
      ...invoiceRecords.map((item) => item.billingAccountId),
      ...paymentOrderRecords.map((item) => item.billingAccountId),
    ]),
  ];
  const consumptionUserIds = [
    ...new Set(
      enrichedConsumptionRecords
        .map((item) => item.userId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const listingIds = listingRecords.map((item) => item.id);
  const learningRecords =
    domain === "learning" ? pendingLearning : [...pendingLearning, ...reviewedLearning].slice(0, 10);
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
    relatedOrganizations,
    relatedSubscriptions,
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
          select: { id: true, name: true, organizationId: true, ownerId: true, metadata: true },
        }),
    prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
    }),
    billingAccountIds.length === 0
      ? Promise.resolve([])
      : prisma.subscription.findMany({
          where: { billingAccountId: { in: billingAccountIds } },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          select: { id: true, billingAccountId: true, planId: true, status: true, createdAt: true },
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
          select: { id: true, verdict: true, score: true, summary: true },
        }),
    decisionIds.length === 0
      ? Promise.resolve([])
      : prisma.decision.findMany({
          where: { id: { in: decisionIds } },
          select: { id: true, problem: true, learning: true, outcome: true, projectId: true },
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
  const planMap = new Map(planRecords.map((item) => [item.id, item] as const));
  const organizationMap = new Map(relatedOrganizations.map((item) => [item.id, item] as const));
  const subscriptionByBillingAccount = new Map(
    relatedSubscriptions.map((item) => [item.billingAccountId, item] as const),
  );
  const revenueShareCountMap = countByKey(
    revenueShareCountRows as Array<Record<string, unknown>>,
    "listingId",
  );
  const evaluationMap = new Map(evaluationResults.map((item) => [item.id, item] as const));
  const decisionMap = new Map(decisions.map((item) => [item.id, item] as const));
  const confidenceMap = new Map(confidenceModels.map((item) => [item.sessionId, item.overall] as const));
  const traceCountMap = countByKey(traceCountRows as Array<Record<string, unknown>>, "sessionId");
  const evidenceCountMap = countByKey(evidenceCountRows as Array<Record<string, unknown>>, "sessionId");
  const ownerIds = [
    ...new Set(
      [...billingAccountRecords, ...relatedBillingAccounts, ...paymentOrderRecords]
        .map((account) => account.ownerId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const relatedOwners = ownerIds.length || consumptionUserIds.length
    ? await prisma.owner.findMany({
        where: {
          OR: [
            ...(ownerIds.length ? [{ id: { in: ownerIds } }] : []),
            ...(consumptionUserIds.length ? [{ userId: { in: consumptionUserIds } }] : []),
          ],
        },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          user: { select: { name: true, email: true } },
        },
      })
    : [];
  const ownerMap = new Map(relatedOwners.map((owner) => [owner.id, owner] as const));
  const ownerByUserId = new Map(relatedOwners.map((owner) => [owner.userId, owner] as const));

  const organizations: OrganizationRow[] = organizationRecords.map((org) => ({
    id: org.id,
    name: resolveOrganizationDisplayName({
      id: org.id,
      name: org.name,
      slug: org.slug,
    }),
    slug: org.slug,
    status: org.status,
    type: org.type,
    createdAt: toIso(org.createdAt) ?? "",
    memberCount: memberCountMap.get(org.id) ?? 0,
    projectCount: org.ownerUserId ? (projectCountByUserId.get(org.ownerUserId) ?? 0) : 0,
    billingAccountCount: billingCountMap.get(org.id) ?? 0,
    isSeeded: parseJsonObject(org.metadata).seeded === true,
  }));

  const plans: PlanRow[] = planRecords.map((plan) => {
    const metadata = parseJsonObject(plan.metadata);
    const pointsAmount =
      typeof metadata.pointsAmount === "number" ? Math.round(metadata.pointsAmount) : null;
    const category = classifyPlan(plan.code, metadata, plan.includedRuns);

    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      billingCycle: plan.billingCycle,
      priceCents: plan.priceCents,
      currency: plan.currency,
      includedTokens: plan.includedTokens,
      includedRuns: plan.includedRuns,
      status: plan.status,
      category,
      categoryLabel: planCategoryLabel(category),
      pointsAmount,
      usageSummary: buildPlanUsageSummary(category, plan.includedRuns, plan.includedTokens, pointsAmount),
      isSeeded: metadata.seeded === true,
    };
  });

  const billingAccounts: BillingAccountRow[] = billingAccountRecords.map((account) => {
    const organization = account.organizationId ? organizationMap.get(account.organizationId) : null;
    const owner = account.ownerId ? ownerMap.get(account.ownerId) : null;
    return {
      id: account.id,
      name: resolveBillingAccountDisplayName({
        accountId: account.id,
        accountName: account.name,
        organizationName: organization?.name ?? null,
        organizationSlug: organization?.slug ?? null,
        ownerName: owner?.name ?? owner?.user.name ?? null,
        ownerEmail: owner?.email ?? owner?.user.email ?? null,
      }),
      status: account.status,
      currency: account.currency,
      ownerId: account.ownerId,
      organizationName: organization
        ? resolveOrganizationDisplayName({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          })
        : null,
      hasOrganization: Boolean(account.organizationId),
      isSeeded: parseJsonObject(account.metadata).seeded === true,
    };
  });

  const subscriptions: SubscriptionRow[] = subscriptionRecords.map((subscription) => {
    const billingAccount = billingAccountMap.get(subscription.billingAccountId);
    const organization = billingAccount?.organizationId
      ? (organizationMap.get(billingAccount.organizationId) ?? null)
      : null;
    const owner = billingAccount?.ownerId ? ownerMap.get(billingAccount.ownerId) : null;
    const plan = planMap.get(subscription.planId);
    const planMetadata = parseJsonObject(plan?.metadata ?? null);
    const planCategory = classifyPlan(plan?.code ?? "", planMetadata, plan?.includedRuns ?? 0);
    const subscriptionMetadata = parseJsonObject(subscription.metadata);

    return {
      id: subscription.id,
      status: subscription.status,
      seats: subscription.seats,
      startedAt: toIso(subscription.startedAt) ?? "",
      currentPeriodEnd: toIso(subscription.currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      planName: plan?.name ?? null,
      planLabel: `${planCategoryLabel(planCategory)} · ${plan?.name ?? "未知计划"}`,
      billingAccountName: resolveBillingAccountDisplayName({
        accountId: billingAccount?.id ?? null,
        accountName: billingAccount?.name ?? null,
        organizationName: organization?.name ?? null,
        organizationSlug: organization?.slug ?? null,
        ownerName: owner?.name ?? owner?.user.name ?? null,
        ownerEmail: owner?.email ?? owner?.user.email ?? null,
      }),
      organizationName: organization
        ? resolveOrganizationDisplayName({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          })
        : null,
      daysToRenewal: daysUntil(subscription.currentPeriodEnd),
      isSeeded: subscriptionMetadata.seeded === true,
    };
  });

  const invoices: InvoiceRow[] = invoiceRecords.map((invoice) => {
    const metadata = parseJsonObject(invoice.metadata);
    const billingAccount = billingAccountMap.get(invoice.billingAccountId);
    const organization = billingAccount?.organizationId
      ? (organizationMap.get(billingAccount.organizationId) ?? null)
      : null;
    const owner = billingAccount?.ownerId ? ownerMap.get(billingAccount.ownerId) : null;
    const fallbackSubscription = subscriptionByBillingAccount.get(invoice.billingAccountId);
    const planId =
      typeof metadata.planId === "string"
        ? metadata.planId
        : (fallbackSubscription?.planId ?? null);
    const planNameFromMeta = typeof metadata.planName === "string" ? metadata.planName : null;
    const inferredPlan = planId ? planMap.get(planId) : undefined;
    const inferredPlanMetadata = parseJsonObject(inferredPlan?.metadata ?? null);
    const inferredPlanCategory = inferredPlan
      ? classifyPlan(
          inferredPlan.code,
          inferredPlanMetadata,
          inferredPlan.includedRuns,
        )
      : null;
    const planKindFromMeta = typeof metadata.kind === "string" ? metadata.kind : null;
    const planKind =
      planKindFromMeta ?? inferInvoicePlanKindFromCategory(inferredPlanCategory);
    const orderNo = typeof metadata.orderNo === "string" ? metadata.orderNo : null;
    const amountValue = parseAmount(invoice.total);
    const resolvedPlanName = planNameFromMeta ?? inferredPlan?.name ?? null;
    const isSeeded = metadata.seeded === true;

    return {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      status: invoice.status,
      total: invoice.total,
      amountValue,
      currency: invoice.currency,
      billingAccountName: resolveBillingAccountDisplayName({
        accountId: billingAccount?.id ?? null,
        accountName: billingAccount?.name ?? null,
        organizationName: organization?.name ?? null,
        organizationSlug: organization?.slug ?? null,
        ownerName: owner?.name ?? owner?.user.name ?? null,
        ownerEmail: owner?.email ?? owner?.user.email ?? null,
      }),
      planName: resolvedPlanName,
      planKind,
      planKindLabel: formatInvoicePlanKind(planKind),
      orderNo,
      createdAt: toIso(invoice.createdAt) ?? "",
      isDraft: invoice.status === "draft",
      isUnlinked: !isSeeded && (!planKind || !resolvedPlanName),
      isSeeded,
    };
  });

  const listings: ListingRow[] = listingRecords.map((listing) => {
    const metadata = parseJsonObject(listing.metadata);
    const revenueShareCount = revenueShareCountMap.get(listing.id) ?? 0;
    return {
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
      revenueShareCount,
      detailHint: buildListingHint({
        installCount: listing.installCount,
        visibility: listing.visibility,
        revenueShareCount,
      }),
      isSeeded: metadata.seeded === true,
    };
  });

  const pointsOrders = paymentOrderRecords.reduce<BusinessPointsOrderRow[]>((rows, order) => {
      const metadata = parseJsonObject(order.metadata);
      const billingAccount = billingAccountMap.get(order.billingAccountId);
      const organization = billingAccount?.organizationId
        ? (organizationMap.get(billingAccount.organizationId) ?? null)
        : null;
      const owner = order.ownerId ? ownerMap.get(order.ownerId) : null;
      const plan = planMap.get(order.planId);
      const planMetadata = parseJsonObject(plan?.metadata ?? null);
      const planCategory = plan
        ? classifyPlan(plan.code, planMetadata, plan.includedRuns)
        : null;
      const pointsAmount =
        typeof metadata.pointsAmount === "number"
          ? Math.round(metadata.pointsAmount)
          : typeof planMetadata.pointsAmount === "number"
            ? Math.round(planMetadata.pointsAmount)
            : 0;
      const isPointsProduct =
        pointsAmount > 0 ||
        metadata.kind === "credit_pack" ||
        metadata.kind === "balance_credit" ||
        planCategory === "points_pack" ||
        planCategory === "balance_credit";
      if (!isPointsProduct) return rows;

      rows.push({
        id: order.id,
        orderNo: order.orderNo,
        ownerId: order.ownerId ?? null,
        ownerName: resolveReadableLabel(owner?.name) ?? resolveReadableLabel(owner?.user.name) ?? resolveReadableLabel(owner?.email) ?? resolveReadableLabel(owner?.user.email) ?? null,
        billingAccountId: order.billingAccountId,
        billingAccountName: resolveBillingAccountDisplayName({
          accountId: billingAccount?.id ?? null,
          accountName: billingAccount?.name ?? null,
          organizationName: organization?.name ?? null,
          organizationSlug: organization?.slug ?? null,
          ownerName: owner?.name ?? owner?.user.name ?? null,
          ownerEmail: owner?.email ?? owner?.user.email ?? null,
        }),
        planName: plan?.name ?? (typeof metadata.planName === "string" ? metadata.planName : null),
        pointsAmount,
        amountCents: order.amountCents,
        currency: order.currency,
        paidAt: toIso(order.paidAt),
        isSeeded:
          metadata.seeded === true ||
          planMetadata.seeded === true ||
          parseJsonObject(billingAccount?.metadata).seeded === true,
      });
      return rows;
    }, []);

  const capabilityPricing: CapabilityPricingRow[] = capabilityPriceRecords.map((rule) => {
    const metadata = parseJsonObject(rule.metadata);
    return {
      capability: rule.capability,
      label:
        (typeof metadata.label === "string" && metadata.label.trim().length > 0
          ? metadata.label
          : capabilityLabel(rule.capability)),
      baseCost: rule.baseCost,
      depthSummary: summarizeFactorMap(rule.depthMultipliers),
      complexitySummary: summarizeFactorMap(rule.complexityMultipliers),
      agentSummary: summarizeFactorMap(rule.agentMultipliers),
      isSeeded: metadata.seeded === true,
    };
  });

  const consumptions: ConsumptionEconomicsRow[] = enrichedConsumptionRecords.map((record) => {
    const metadata = parseJsonObject(record.metadata);
    const owner = record.userId ? ownerByUserId.get(record.userId) : null;
    const revenueCents = Math.max(0, Math.round(record.actualAmount));
    const grossProfitCents = revenueCents - record.costCents;
    return {
      id: record.id,
      ownerId: owner?.id ?? null,
      ownerName: resolveReadableLabel(owner?.name) ?? resolveReadableLabel(owner?.user.name) ?? resolveReadableLabel(owner?.email) ?? resolveReadableLabel(owner?.user.email) ?? null,
      capability: record.capability,
      capabilityLabel: capabilityLabel(record.capability),
      status: record.status,
      requestedPoints: record.requestedAmount,
      actualPoints: record.actualAmount,
      revenueCents,
      costCents: record.costCents,
      grossProfitCents,
      grossMarginPercent: revenueCents > 0 ? ratio(grossProfitCents, revenueCents) : null,
      tokenTotal: record.tokenTotal,
      provider: record.provider,
      model: record.model,
      agentCodes: parseStringArray(record.agentCodes),
      reason: record.reason,
      createdAt: toIso(record.createdAt) ?? "",
      isSeeded: metadata.seeded === true,
    };
  });
  const usageProviders = aggregateUsageRows(usageRecords, "provider");
  const usageModels = aggregateUsageRows(usageRecords, "model");
  const usageTypes = aggregateUsageTypeRows(usageRecords);
  const usageTrend = aggregateUsageTrend(usageRecords, 7);
  const usageAnomalies = aggregateUsageAnomalies(usageRecords, enrichedReconcileConsumptionRecords, 12);
  const usageSummary: ThirdPartyUsageSummary = {
    recordedEvents: usageRecords.length,
    billableCount: usageRecords.filter((item) => item.billable).length,
    tokenTotal: usageRecords.reduce((sum, item) => sum + item.tokenTotal, 0),
    costValue: round(
      usageRecords.reduce((sum, item) => {
        const next =
          typeof item.cost === "number"
            ? item.cost
            : typeof item.cost === "string"
              ? Number(item.cost)
              : 0;
        return sum + (Number.isFinite(next) ? next : 0);
      }, 0),
      6,
    ),
    currency:
      usageRecords.find((item) => typeof item.currency === "string" && item.currency.trim().length > 0)?.currency ??
      "USD",
    missingProviderCount: usageRecords.filter((item) => normalizeUsageLabel(item.provider, "") === "").length,
    missingModelCount: usageRecords.filter((item) => normalizeUsageLabel(item.model, "") === "").length,
  };

  const learningQueue: LearningQueueRow[] = learningRecords.map((record) => {
    const evaluation = record.evaluationResultId ? evaluationMap.get(record.evaluationResultId) : undefined;
    const decision = record.decisionId ? decisionMap.get(record.decisionId) : undefined;
    const agingDays = daysSince(record.createdAt);
    const priority = learningPriority(evaluation?.score ?? null, record.status, agingDays);

    return {
      id: record.id,
      title: record.title,
      status: record.status,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      weightDelta: record.weightDelta,
      createdAt: toIso(record.createdAt) ?? "",
      verdict: evaluation?.verdict ?? null,
      score: evaluation?.score ?? null,
      problem: decision?.problem ?? null,
      summary: record.summary ?? "暂无复核摘要，请结合问题原文与评分判断。",
      decisionId: record.decisionId,
      projectId: decision?.projectId ?? null,
      evaluationResultId: record.evaluationResultId,
      priority,
      agingDays,
      detailHint:
        priority === "high"
          ? "需要优先复核，避免低质量判断进入学习燃料。"
          : "可按当前队列顺序处理。",
    };
  });

  const cognitiveSessions: CognitiveSessionRow[] = cognitiveSessionRecords.map((session) => {
    const overall = confidenceMap.get(session.id) ?? null;
    const evidenceCount = evidenceCountMap.get(session.id) ?? 0;
    const priority = sessionPriority(overall, evidenceCount);

    return {
      id: session.id,
      status: session.status,
      source: session.source,
      createdAt: toIso(session.createdAt) ?? "",
      decisionId: session.decisionId,
      projectId: session.projectId ?? null,
      overall,
      traceCount: traceCountMap.get(session.id) ?? 0,
      evidenceCount,
      priority,
      lowConfidence: overall !== null && overall < 0.6,
      missingEvidence: evidenceCount === 0,
      detailHint:
        priority === "high"
          ? "该会话需要进一步补证据或复核判断链路。"
          : "当前会话链路完整度可接受。",
    };
  });

  const platformPlanCount = plans.filter((plan) => plan.category === "platform").length;
  const specialtyPlanCount = plans.filter((plan) => plan.category === "specialty_pack").length;
  const pointsProductCount = plans.filter((plan) => plan.category === "points_pack").length;
  const dueSoonSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "active" &&
      subscription.daysToRenewal !== null &&
      subscription.daysToRenewal >= 0 &&
      subscription.daysToRenewal <= 7,
  ).length;
  const pendingInvoiceAmount = invoices
    .filter((invoice) => invoice.isDraft)
    .reduce((sum, invoice) => sum + invoice.amountValue, 0);
  const pointsSalesCents = pointsOrders.reduce((sum, item) => sum + item.amountCents, 0);
  const settledConsumptionPoints = consumptions.reduce((sum, item) => sum + item.actualPoints, 0);
  const settledConsumptionCostCents = consumptions.reduce((sum, item) => sum + item.costCents, 0);
  const settledGrossProfitCents = consumptions.reduce((sum, item) => sum + item.grossProfitCents, 0);
  const settledGrossMarginPercent =
    settledConsumptionPoints > 0 ? ratio(settledGrossProfitCents, settledConsumptionPoints) : null;
  const unlinkedInvoiceCount = invoices.filter((invoice) => invoice.isUnlinked).length;
  const privateListingCount = listings.filter((listing) => listing.visibility !== "public").length;
  const zeroInstallListingCount = listings.filter((listing) => listing.installCount === 0).length;
  const averageRating =
    listings.length > 0 ? round(listings.reduce((sum, listing) => sum + listing.rating, 0) / listings.length, 1) : 0;
  const reviewedLearningCount = learningApprovedCount + learningRejectedCount;
  const learningPassRate = ratio(learningApprovedCount, reviewedLearningCount);
  const learningAverageScore =
    learningQueue.length > 0
      ? round(
          learningQueue.reduce((sum, item) => sum + (item.score ?? 0), 0) /
            Math.max(1, learningQueue.filter((item) => item.score !== null).length),
          2,
        )
      : 0;
  const lowScoreLearningCount = learningQueue.filter((item) => item.score !== null && item.score < 0.6).length;
  const lowConfidenceSessions = cognitiveSessions.filter((session) => session.lowConfidence).length;
  const missingEvidenceSessions = cognitiveSessions.filter((session) => session.missingEvidence).length;
  const averageConfidence =
    cognitiveSessions.length > 0
      ? round(
          cognitiveSessions.reduce((sum, item) => sum + (item.overall ?? 0), 0) /
            Math.max(1, cognitiveSessions.filter((item) => item.overall !== null).length),
          2,
        )
      : 0;
  const orphanBillingAccounts = billingAccounts.filter((account) => !account.hasOrganization).length;
  const openQueues = summary.learningPending + summary.draftInvoices + lowConfidenceSessions;

  const headerCards: PlatformAdminMetric[] = [
    {
      id: "workspace_count",
      label: "平台工作台",
      value: summary.organizations,
      helper: "当前纳入平台管理的组织 / 工作空间数量",
      tone: "neutral",
    },
    {
      id: "business_objects",
      label: "活跃商业对象",
      value: summary.activeSubscriptions + summary.activeListings,
      helper: "订阅与上架能力共同构成当前商业面",
      tone: "good",
    },
    {
      id: "open_queues",
      label: "待处理事项",
      value: openQueues,
      helper: "草稿发票、学习待审与低置信会话需要优先处理",
      tone: openQueues > 0 ? "warning" : "good",
    },
    {
      id: "avg_confidence",
      label: "认知健康",
      value: averageConfidence ? Math.round(averageConfidence * 100) : 0,
      unit: "%",
      helper: "基于最近认知会话的平均置信度计算",
      tone: averageConfidence >= 0.75 ? "good" : averageConfidence >= 0.6 ? "warning" : "danger",
    },
  ];

  const alerts = buildPlatformAdminAlerts({
    summary,
    lowConfidenceSessions,
    unlinkedInvoiceCount,
  });

  const emptyDomain = domain
    ? {
        overview: {
          cards: [],
          queues: [],
          alerts: [],
        },
        business: {
          cards: [],
          plans: [],
          subscriptions: [],
          invoices: [],
          pointsOrders: [],
          capabilityPricing: [],
          consumptions: [],
          usageSummary: emptyThirdPartyUsageSummary(),
          usageProviders: [],
          usageModels: [],
          usageTypes: [],
          usageTrend: aggregateUsageTrend([], 7),
          usageAnomalies: [],
        },
        marketplace: {
          cards: [],
          listings: [],
        },
        learning: {
          cards: [],
          queue: [],
        },
        cognitive: {
          cards: [],
          sessions: [],
        },
        objects: {
          cards: [],
          organizations: [],
          billingAccounts: [],
          plans: [],
          subscriptions: [],
          listings: [],
        },
      }
    : null;

  return {
    generatedAt: now.toISOString(),
    summary,
    header: {
      cards: headerCards,
      alerts,
    },
    domains: {
      overview: emptyDomain && domain !== "business" && domain !== "learning" && domain !== "marketplace" && domain !== "objects"
        ? emptyDomain.overview
        : {
        cards: [
          {
            id: "overview_orgs",
            label: "组织数",
            value: summary.organizations,
            helper: "平台当前接入的组织 / 工作空间总数",
          },
          {
            id: "overview_members",
            label: "成员数",
            value: summary.members,
            helper: "活跃组织成员规模",
          },
          {
            id: "overview_revenue_shares",
            label: "分润规则",
            value: summary.revenueShares,
            helper: "已绑定生效的 revenue share 配置",
          },
          {
            id: "overview_evaluations",
            label: "评估结果",
            value: summary.evaluationResults,
            helper: "累计认知评估结果数量",
          },
        ],
        queues: [
          {
            id: "queue_invoices",
            label: "待处理草稿发票",
            value: summary.draftInvoices,
            helper: "发票确认/开票闭环待建，当前为只读队列",
            tone: summary.draftInvoices > 0 ? "warning" : "good",
          },
          {
            id: "queue_learning",
            label: "待审学习记录",
            value: summary.learningPending,
            helper: "待审越多，学习闭环越慢",
            tone: summary.learningPending > 0 ? "warning" : "good",
          },
          {
            id: "queue_cognitive",
            label: "低置信会话",
            value: lowConfidenceSessions,
            helper: "需要补证据或人工复核",
            tone: lowConfidenceSessions > 0 ? "danger" : "good",
          },
          {
            id: "queue_renewal",
            label: "7 天内待续费",
            value: dueSoonSubscriptions,
            helper: "帮助平台提前发现续费与流失风险",
            tone: dueSoonSubscriptions > 0 ? "warning" : "neutral",
          },
        ],
        alerts,
      },
      business: loadBusiness
        ? {
        cards: [
          {
            id: "business_points_sales",
            label: "30 天充值收入",
            value: Math.round(pointsSalesCents / 100),
            unit: "元",
            helper: "最近 30 天经营点充值订单带来的现金收入",
          },
          {
            id: "business_settled_points",
            label: "30 天已结算经营点",
            value: settledConsumptionPoints,
            helper: "最近 30 天已经完成结算的能力消耗总量",
          },
          {
            id: "business_settled_cost",
            label: "30 天模型成本",
            value: Math.round(settledConsumptionCostCents / 100),
            unit: "元",
            helper: "最近 30 天已结算消耗对应的模型与推理成本",
          },
          {
            id: "business_gross_margin",
            label: "30 天综合毛利率",
            value: settledGrossMarginPercent,
            unit: "%",
            helper: "按已结算经营点收入与实际模型成本计算",
            tone:
              typeof settledGrossMarginPercent === "number"
                ? settledGrossMarginPercent >= 60
                  ? "good"
                  : settledGrossMarginPercent >= 30
                    ? "warning"
                    : "danger"
                : "neutral",
          },
        ],
        plans,
        subscriptions,
        invoices,
        pointsOrders,
        capabilityPricing,
        consumptions,
        usageSummary,
        usageProviders,
        usageModels,
        usageTypes,
        usageTrend,
        usageAnomalies,
      }
        : (emptyDomain?.business ?? {
            cards: [],
            plans: [],
            subscriptions: [],
            invoices: [],
            pointsOrders: [],
            capabilityPricing: [],
            consumptions: [],
            usageSummary: emptyThirdPartyUsageSummary(),
            usageProviders: [],
            usageModels: [],
            usageTypes: [],
            usageTrend: aggregateUsageTrend([], 7),
            usageAnomalies: [],
          }),
      marketplace: loadMarketplace
        ? {
        cards: [
          {
            id: "marketplace_active",
            label: "活跃上架",
            value: summary.activeListings,
            helper: "正在对外展示或可流通的 Listing",
          },
          {
            id: "marketplace_zero_install",
            label: "零安装 Listing",
            value: zeroInstallListingCount,
            helper: "可优先检查曝光与定价",
            tone: zeroInstallListingCount > 0 ? "warning" : "good",
          },
          {
            id: "marketplace_private",
            label: "非公开上架",
            value: privateListingCount,
            helper: "内部或定向分发的 Listing 数量",
          },
          {
            id: "marketplace_rating",
            label: "平均评分",
            value: Math.round(averageRating * 20),
            unit: "/100",
            helper: "最近上架对象的平均评分（按 100 分口径展示）",
            tone: averageRating >= 4 ? "good" : averageRating >= 3 ? "warning" : "neutral",
          },
        ],
        listings,
      }
        : (emptyDomain?.marketplace ?? { cards: [], listings: [] }),
      learning: loadLearning
        ? {
        cards: [
          {
            id: "learning_pending",
            label: "待审记录",
            value: summary.learningPending,
            helper: "当前仍等待平台复核的学习记录",
            tone: summary.learningPending > 0 ? "warning" : "good",
          },
          {
            id: "learning_pass_rate",
            label: "通过率",
            value: Math.round(learningPassRate),
            unit: "%",
            helper: "已复核记录中的批准占比",
          },
          {
            id: "learning_avg_score",
            label: "平均评分",
            value: Math.round(learningAverageScore * 100),
            unit: "/100",
            helper: "按当前队列评分估算的平均质量",
            tone: learningAverageScore >= 0.75 ? "good" : learningAverageScore >= 0.6 ? "warning" : "danger",
          },
          {
            id: "learning_low_score",
            label: "低分记录",
            value: lowScoreLearningCount,
            helper: "评分低于 0.6 的学习记录",
            tone: lowScoreLearningCount > 0 ? "danger" : "good",
          },
        ],
        queue: learningQueue,
      }
        : (emptyDomain?.learning ?? { cards: [], queue: [] }),
      cognitive: loadLearning
        ? {
        cards: [
          {
            id: "cognitive_sessions",
            label: "最近会话",
            value: cognitiveSessions.length,
            helper: "当前页展示的最近认知会话数量",
          },
          {
            id: "cognitive_low_confidence",
            label: "低置信会话",
            value: lowConfidenceSessions,
            helper: "置信度低于 0.6 的会话",
            tone: lowConfidenceSessions > 0 ? "danger" : "good",
          },
          {
            id: "cognitive_missing_evidence",
            label: "缺证据会话",
            value: missingEvidenceSessions,
            helper: "evidence 为空的会话需要优先复核",
            tone: missingEvidenceSessions > 0 ? "warning" : "good",
          },
          {
            id: "cognitive_avg",
            label: "平均置信度",
            value: Math.round(averageConfidence * 100),
            unit: "%",
            helper: "最近认知会话的平均置信水平",
            tone: averageConfidence >= 0.75 ? "good" : averageConfidence >= 0.6 ? "warning" : "danger",
          },
        ],
        sessions: cognitiveSessions,
      }
        : (emptyDomain?.cognitive ?? { cards: [], sessions: [] }),
      objects: loadObjects || loadBusiness || loadMarketplace
        ? {
        cards: [
          {
            id: "objects_organizations",
            label: "组织 / 工作台",
            value: summary.organizations,
            helper: "当前可管理的组织主体数量",
          },
          {
            id: "objects_billing_accounts",
            label: "账务账户",
            value: summary.billingAccounts,
            helper: "所有账务归因主体数量",
          },
          {
            id: "objects_orphan_accounts",
            label: "孤立账户",
            value: orphanBillingAccounts,
            helper: "未绑定组织的账务账户需要清理",
            tone: orphanBillingAccounts > 0 ? "warning" : "good",
          },
          {
            id: "objects_catalog_mix",
            label: "商品结构",
            value: platformPlanCount + specialtyPlanCount + pointsProductCount,
            helper: `母体席位 ${platformPlanCount} / 专项 ${specialtyPlanCount} / 经营点 ${pointsProductCount}`,
          },
        ],
        organizations,
        billingAccounts,
        plans,
        subscriptions,
        listings,
      }
        : (emptyDomain?.objects ?? {
            cards: [],
            organizations: [],
            billingAccounts: [],
            plans: [],
            subscriptions: [],
            listings: [],
          }),
    },
  };
}

export async function getPlatformAdminBusinessDomain(
  prisma: PrismaClient,
  paginationInput?: PlatformAdminPaginationInput,
) {
  const pagination = normalizePlatformAdminPagination(paginationInput);
  const [overview, total] = await Promise.all([
    getPlatformAdminOverview(prisma, {
      mode: "full",
      domain: "business",
      pagination,
    }),
    prisma.invoice.count(),
  ]);

  return {
    business: overview.domains.business,
    objects: overview.domains.objects,
    summary: overview.summary,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    },
  };
}

export async function getPlatformAdminLearningDomain(
  prisma: PrismaClient,
  paginationInput?: PlatformAdminPaginationInput,
) {
  const pagination = normalizePlatformAdminPagination(paginationInput);
  const [overview, total] = await Promise.all([
    getPlatformAdminOverview(prisma, {
      mode: "full",
      domain: "learning",
      pagination,
    }),
    prisma.learningRecord.count(),
  ]);

  return {
    learning: overview.domains.learning,
    cognitive: overview.domains.cognitive,
    learningQueue: overview.domains.learning.queue,
    cognitiveSessions: overview.domains.cognitive.sessions,
    summary: overview.summary,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    },
  };
}

export async function getPlatformAdminMarketplaceDomain(
  prisma: PrismaClient,
  paginationInput?: PlatformAdminPaginationInput,
) {
  const pagination = normalizePlatformAdminPagination(paginationInput);
  const [overview, total] = await Promise.all([
    getPlatformAdminOverview(prisma, {
      mode: "full",
      domain: "marketplace",
      pagination,
    }),
    prisma.agentListing.count(),
  ]);

  return {
    marketplace: overview.domains.marketplace,
    objectsListings: overview.domains.marketplace.listings,
    listings: overview.domains.marketplace.listings,
    summary: overview.summary,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    },
  };
}

export async function getPlatformAdminObjectsDomain(
  prisma: PrismaClient,
  paginationInput?: PlatformAdminPaginationInput,
) {
  const pagination = normalizePlatformAdminPagination(paginationInput);
  const [overview, total] = await Promise.all([
    getPlatformAdminOverview(prisma, {
      mode: "full",
      domain: "objects",
      pagination,
    }),
    prisma.organization.count(),
  ]);

  return {
    objects: overview.domains.objects,
    organizations: overview.domains.objects.organizations,
    billingAccounts: overview.domains.objects.billingAccounts,
    summary: overview.summary,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    },
  };
}

export async function createPlatformOrganization(
  prisma: PrismaClient,
  input: { name: string; ownerUserId?: string | null; type?: string },
) {
  const id = createId("org");
  const slug = `${slugify(input.name) || "organization"}-${id.slice(-6)}`;

  return prisma.$transaction(async (tx) => {
    await tx.organization.create({
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

    let memberId: string | undefined;
    if (input.ownerUserId) {
      memberId = createId("orgm");
      await tx.organizationMember.create({
        data: {
          id: memberId,
          organizationId: id,
          userId: input.ownerUserId,
          role: "OWNER",
          status: "active",
          metadata: JSON.stringify({ source: "api" }),
        },
      });
    }

    let ownerId: string | null = null;
    if (input.ownerUserId) {
      const owner = await tx.owner.findUnique({
        where: { userId: input.ownerUserId },
        select: { id: true },
      });
      ownerId = owner?.id ?? null;
    }

    const billingAccountId = createId("ba");
    await tx.billingAccount.create({
      data: {
        id: billingAccountId,
        organizationId: id,
        ownerId,
        name: `${input.name} 账务账户`,
        status: "active",
        currency: "CNY",
        balance: "0",
        metadata: JSON.stringify({ source: "api" }),
      },
    });

    return { id, slug, billingAccountId, memberId };
  });
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
  const existing = await prisma.learningRecord.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      title: true,
      summary: true,
      decisionId: true,
      weightDelta: true,
    },
  });

  await prisma.learningRecord.update({
    where: { id: input.id },
    data: {
      status: input.status,
      weightDelta: input.weightDelta ?? null,
    },
  });

  let memoryResult: { ok: boolean; memoryId?: string; error?: string } | undefined;
  if (input.status === "approved" && existing?.decisionId) {
    try {
      const decision = await prisma.decision.findUnique({
        where: { id: existing.decisionId },
        select: { ownerId: true, projectId: true, problem: true },
      });
      if (decision?.ownerId) {
        // 对齐 FounderMemoryWrite / Intelligence 学习燃料契约
        const writeId = `admin_lrn_${existing.id}`;
        const projectId = decision.projectId ?? "platform";
        const summary = (existing.summary || existing.title || "平台批准学习记录").slice(0, 160);
        const content = JSON.stringify({
          summary,
          payload: {
            decisionId: existing.decisionId,
            learningRecordId: existing.id,
            title: existing.title,
            weightDelta: input.weightDelta ?? existing.weightDelta,
            impact: "admin_approved_learning",
            retrospective: {
              problem: decision.problem,
              approvedBy: "platform_admin",
            },
          },
          memoryLayer: "PROJECT",
          valueLevel: 2,
          domain: "mixed",
          source: "validation_os",
          writeId,
          type: "learning",
          projectId,
          createdAt: new Date().toISOString(),
        });
        const key = `founder_learning_${projectId}_${writeId}`;
        const existingMemory = await prisma.memory.findFirst({
          where: {
            ownerId: decision.ownerId,
            key,
            ...(decision.projectId ? { projectId: decision.projectId } : { projectId: null }),
          },
          select: { id: true },
        });
        const memory = existingMemory
          ? await prisma.memory.update({
              where: { id: existingMemory.id },
              data: {
                content,
                importance: 92,
                source: "validation_os",
                type: "LEARNING",
                projectId: decision.projectId,
              },
            })
          : await prisma.memory.create({
              data: {
                ownerId: decision.ownerId,
                projectId: decision.projectId,
                type: "LEARNING",
                source: "validation_os",
                importance: 92,
                key,
                content,
              },
            });
        memoryResult = { ok: true, memoryId: memory.id };
      }
    } catch (error) {
      memoryResult = {
        ok: false,
        error: error instanceof Error ? error.message : "memory_write_failed",
      };
    }
  }

  return { id: input.id, status: input.status, memoryResult };
}
