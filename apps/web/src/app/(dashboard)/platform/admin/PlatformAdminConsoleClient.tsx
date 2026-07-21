"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useTransition,
  type ComponentType,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  BrainCircuit,
  ClipboardCheck,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";

import type {
  BillingAccountRow,
  InvoiceRow,
  LearningQueueRow,
  ListingRow,
  OrganizationRow,
  PlanRow,
  PlatformAdminAlert,
  PlatformAdminMetric,
  PlatformAdminOverview,
  SubscriptionRow,
} from "@/server/services/platform-admin.service";
import type { AdminInboxItem } from "@/server/services/platform-admin-inbox.service";
import { formatDate as formatDateShared, formatNumber as formatNumberShared } from "@/lib/format";
import {
  type AdminNavSectionId,
  type AdminPanel,
  type AdminWorkspaceId,
  NAV_SECTIONS,
  PANELS,
  WORKSPACES,
  cognitiveHash,
  getNavSection,
  getPanelMeta,
  getWorkspaceMeta,
  getWorkspacesBySection,
  learningHash,
  objectHash,
  panelHash,
  parseAdminHash,
  parseObjectHash,
  parseUsageAnomalyHash,
  resolveWorkspace,
  usageAnomalyHash,
} from "./admin-console-config";
import { capabilityAnchorId, consumptionAnchorId } from "./panels/shared";
import { type CapabilityConsumptionSummary } from "./panels/business-tables";
import { PlatformAdminConsoleShell } from "./admin-console-shell";

type FeedbackTone = "idle" | "loading" | "success" | "error";
type UsageAnomalyFilter = "all" | "metadata" | "billable_without_cost" | "high_token_unbillable";
type RefreshScope = "overview" | "billing" | "learning" | "marketplace" | "objects";
const SEEDED_FILTER_STORAGE_KEY = "mealkey-platform-admin-show-seeded-data";
type WorkspaceContextItem = {
  label: string;
  value: string;
};
type PlatformAdminResponseBody = {
  ok?: boolean;
  error?: string;
  overview?: PlatformAdminOverview;
  summary?: PlatformAdminOverview["summary"];
  business?: PlatformAdminOverview["domains"]["business"];
  learning?: PlatformAdminOverview["domains"]["learning"];
  cognitive?: PlatformAdminOverview["domains"]["cognitive"];
  marketplace?: PlatformAdminOverview["domains"]["marketplace"];
  objects?: PlatformAdminOverview["domains"]["objects"];
  objectsListings?: ListingRow[];
  learningRecord?: { id: string; status: string };
  organization?: { id: string; slug?: string };
  subscription?: { id: string; status?: string; replacedSubscriptionIds?: string[] };
  invoice?: {
    id: string;
    status?: string;
    planId?: string | null;
    orderNo?: string | null;
    issuedAt?: string | null;
    paidAt?: string | null;
  };
  plan?: { id: string; code?: string };
  listing?: { id: string; slug?: string; status?: string };
};

function formatNumber(value: number | null | undefined) {
  const next = formatNumberShared(value);
  return next === "—" ? "--" : next;
}

function formatMetricValue(metric: PlatformAdminMetric) {
  if (metric.value === null || Number.isNaN(metric.value)) return "--";
  if (metric.unit === "%") return `${metric.value}%`;
  if (metric.unit === "元") return `${formatNumber(metric.value)} 元`;
  if (metric.unit === "/100") return `${metric.value} / 100`;
  return formatNumber(metric.value);
}

function formatMoney(cents: number | null | undefined, currency = "CNY") {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "--";
  const amount = cents / 100;
  return `${currency === "CNY" ? "¥" : `${currency} `}${amount.toFixed(2)}`;
}

function formatMoneyValue(amount: number | null | undefined, currency = "USD", digits = 4) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "--";
  return `${currency === "CNY" ? "¥" : `${currency} `}${amount.toFixed(digits)}`;
}

function formatDate(value: string | null | undefined) {
  const next = formatDateShared(value, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return next === "—" ? "--" : next;
}

function readPersistedSeededFilter() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SEEDED_FILTER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writePersistedSeededFilter(next: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEDED_FILTER_STORAGE_KEY, next ? "1" : "0");
  } catch {}
}

function formatPercent(value: number | null | undefined, digits = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value * 100)} / 100`;
}

function formatListingRating(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value * 20)} / 100`;
}

function formatSignedDelta(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatBillingCycle(plan: PlanRow) {
  if (plan.category === "points_pack" || plan.category === "specialty_pack" || plan.category === "balance_credit") {
    return "一次性购买";
  }
  if (plan.billingCycle === "MONTHLY") return "按月";
  if (plan.billingCycle === "YEARLY") return "按年";
  return plan.billingCycle;
}

function feedbackStyle(tone: FeedbackTone) {
  switch (tone) {
    case "loading":
      return "border-[rgba(24,24,23,0.08)] bg-[rgba(251,250,247,0.9)] text-[#5f6368]";
    case "success":
      return "border-[rgba(102,115,94,0.16)] bg-[rgba(102,115,94,0.08)] text-[#3F4B37]";
    case "error":
      return "border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.08)] text-[#8A5A40]";
    default:
      return "border-[rgba(24,24,23,0.08)] bg-[rgba(251,250,247,0.7)] text-[#5f6368]";
  }
}

function statusChipTone(status: string) {
  const normalized = status.toLowerCase();
  if (
    normalized === "active" ||
    normalized === "approved" ||
    normalized === "pass" ||
    normalized === "issued" ||
    normalized === "paid"
  ) {
    return "bg-[rgba(102,115,94,0.10)] text-[#465240]";
  }
  if (normalized === "pending" || normalized === "review" || normalized === "draft" || normalized === "confirmed") {
    return "bg-[rgba(186,160,92,0.10)] text-[#7A6941]";
  }
  return "bg-[rgba(180,124,92,0.10)] text-[#8A5A40]";
}

function priorityTone(priority: "high" | "medium" | "low") {
  if (priority === "high") return "bg-[rgba(180,124,92,0.12)] text-[#8A5A40]";
  if (priority === "medium") return "bg-[rgba(186,160,92,0.10)] text-[#7A6941]";
  return "bg-[rgba(102,115,94,0.10)] text-[#465240]";
}

function alertSeverityRank(severity: PlatformAdminAlert["severity"]) {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function upsertById<T extends { id: string }>(rows: T[], nextRow: T, insertAtStart = false) {
  const existingIndex = rows.findIndex((row) => row.id === nextRow.id);
  if (existingIndex === -1) {
    return insertAtStart ? [nextRow, ...rows] : [...rows, nextRow];
  }

  return rows.map((row) => (row.id === nextRow.id ? nextRow : row));
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

function buildMarketplaceCardsFromListings(listings: ListingRow[]): PlatformAdminMetric[] {
  const zeroInstallListingCount = listings.filter((item) => item.installCount === 0).length;
  const privateListingCount = listings.filter((item) => item.visibility !== "public").length;
  const averageRating =
    listings.length === 0 ? 0 : listings.reduce((sum, item) => sum + item.rating, 0) / listings.length;
  return [
    {
      id: "marketplace_active",
      label: "活跃上架",
      value: listings.filter((item) => item.status.toLowerCase() === "active").length,
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
  ];
}

async function readJson<T extends PlatformAdminResponseBody = PlatformAdminResponseBody>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const compact = text.replace(/\s+/g, " ").trim();
    throw new Error(
      response.ok
        ? compact.slice(0, 160) || "平台管理接口未返回 JSON"
        : `请求失败（${response.status}）: ${compact.slice(0, 120) || "服务端未返回 JSON 错误体"}`,
    );
  }

  const body = (await response.json()) as T;
  if (!response.ok || body.ok === false) {
    throw new Error(body.error || "平台管理请求失败");
  }
  return body;
}

function PanelLoading() {
  return (
    <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-8 text-center text-[13px] text-[#6f747b]">
      正在加载工作台…
    </div>
  );
}

function dynamicPanel<TProps extends object, TModule>(
  loader: () => Promise<TModule>,
  pick: (module: TModule) => ComponentType<TProps>,
) {
  return dynamic<TProps>(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const module = await loader();
        return pick(module);
      } catch (error) {
        lastError = error;
        if (attempt === 1) {
          throw error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("平台管理域加载失败");
  }, {
    ssr: false,
    loading: PanelLoading,
  });
}

const OverviewPanel = dynamicPanel(() => import("./panels/OverviewPanel"), (m) => m.OverviewPanel);
const BusinessPanel = dynamicPanel(() => import("./panels/BusinessPanel"), (m) => m.BusinessPanel);
const MarketplacePanel = dynamicPanel(() => import("./panels/MarketplacePanel"), (m) => m.MarketplacePanel);
const CognitivePanel = dynamicPanel(() => import("./panels/CognitivePanel"), (m) => m.CognitivePanel);
const LearningPanel = dynamicPanel(() => import("./admin-console-panels"), (m) => m.LearningPanel);
const ObjectsPanel = dynamicPanel(() => import("./admin-console-panels"), (m) => m.ObjectsPanel);

function buildAlert(
  id: string,
  severity: PlatformAdminAlert["severity"],
  title: string,
  description: string,
  count?: number,
): PlatformAdminAlert {
  return { id, severity, title, description, count };
}

export function PlatformAdminConsoleClient({
  initialOverview,
  initialPanel = "overview",
  allowBootstrap = false,
}: {
  initialOverview: PlatformAdminOverview;
  initialPanel?: AdminPanel;
  allowBootstrap?: boolean;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [activePanel, setActivePanel] = useState<AdminPanel>(initialPanel);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<AdminWorkspaceId>(() =>
    resolveWorkspace(initialPanel),
  );
  const [pendingPanelSectionTarget, setPendingPanelSectionTarget] = useState<{
    panel: AdminPanel;
    sectionId: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("idle");
  // 默认仅真实对象，避免种子污染经营口径
  const [showSeededData, setShowSeededDataState] = useState(readPersistedSeededFilter);
  const [loadedScopes, setLoadedScopes] = useState<Set<RefreshScope>>(() => new Set(["overview"]));
  const [domainLoading, setDomainLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetUrlPreview, setResetUrlPreview] = useState<string | null>(null);
  const [resetExpiresAt, setResetExpiresAt] = useState<string | null>(null);
  const [showEngineeringTools, setShowEngineeringTools] = useState(false);
  const [usageAnomalyFilter, setUsageAnomalyFilter] = useState<UsageAnomalyFilter>("all");
  const [selectedUsageAnomalyId, setSelectedUsageAnomalyId] = useState<string | null>(null);
  const [learningFilter, setLearningFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedLearningId, setSelectedLearningId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedObjectAccountId, setSelectedObjectAccountId] = useState<string | null>(null);
  const [selectedObjectPlanId, setSelectedObjectPlanId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("0");
  const [listingName, setListingName] = useState("");
  const [listingSlug, setListingSlug] = useState("");
  const [listingPrice, setListingPrice] = useState("29900");
  const [selectedBillingAccountId, setSelectedBillingAccountId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [seats, setSeats] = useState("1");
  const [collapsedNavSections, setCollapsedNavSections] = useState<Record<AdminNavSectionId, boolean>>({
    cockpit: false,
    operations: false,
    governance: false,
    objects: false,
  });
  const [subscriptionEdits, setSubscriptionEdits] = useState<
    Record<string, { status: string; seats: string; cancelAtPeriodEnd: boolean }>
  >({});
  const [invoiceEdits, setInvoiceEdits] = useState<Record<string, { planId: string; orderNo: string }>>({});
  const [listingEdits, setListingEdits] = useState<
    Record<string, { status: string; visibility: string; priceCents: string }>
  >({});
  const setShowSeededData: Dispatch<SetStateAction<boolean>> = (value) => {
    setShowSeededDataState((current) => {
      const next = typeof value === "function" ? value(current) : value;
      writePersistedSeededFilter(next);
      return next;
    });
  };
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState<string | undefined>();
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [panelBoundaryKey, setPanelBoundaryKey] = useState(0);

  function askConfirm(opts: {
    title: string;
    description?: string;
    onConfirm: () => void;
  }) {
    setConfirmTitle(opts.title);
    setConfirmDescription(opts.description);
    setConfirmAction(() => opts.onConfirm);
    setConfirmOpen(true);
  }

  function scrollToSection(sectionId: string) {
    if (typeof document === "undefined") return;
    const tryScroll = (attempt = 0) => {
      const target = document.getElementById(sectionId);
      if (!target) {
        if (attempt < 6) {
          window.setTimeout(() => tryScroll(attempt + 1), 80);
        }
        return;
      }
      const targetTop = window.scrollY + target.getBoundingClientRect().top - 96;
      window.scrollTo(0, Math.max(targetTop, 0));
    };
    window.requestAnimationFrame(() => tryScroll());
  }

  function writeHash(panel: AdminPanel, hash: string | null) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("panel", panel);
    const nextHash = hash ? `#${hash}` : "";
    const nextUrl = `${url.pathname}${url.search}${nextHash}`;
    window.history.replaceState(null, "", nextUrl);
  }

  function openPanelSection(panel: AdminPanel, sectionId: string) {
    setPendingPanelSectionTarget({ panel, sectionId });
    setActivePanel(panel);
    setActiveWorkspaceId(resolveWorkspace(panel, sectionId));
  }

  function navigateToPanel(panel: AdminPanel, sectionId?: string) {
    if (sectionId) {
      writeHash(panel, sectionId);
      jumpWithinPanel(panel, sectionId);
      return;
    }

    writeHash(panel, panelHash(panel));
    setPendingPanelSectionTarget(null);
    setActivePanel(panel);
    setActiveWorkspaceId(resolveWorkspace(panel));
  }

  function navigateToLearningItem(learningId: string) {
    writeHash("learning", learningHash(learningId));
    setSelectedLearningId(learningId);
    setActivePanel("learning");
    setActiveWorkspaceId("learning-review");
  }

  function navigateToCognitiveSession(sessionId: string) {
    writeHash("cognitive", cognitiveHash(sessionId));
    setSelectedSessionId(sessionId);
    setActivePanel("cognitive");
    setActiveWorkspaceId("cognitive-review");
  }

  function navigateToObject(kind: "org" | "account" | "plan", id: string) {
    writeHash("objects", objectHash(kind, id));
    setPendingPanelSectionTarget(null);
    setActivePanel("objects");
    setActiveWorkspaceId(resolveWorkspace("objects", objectHash(kind, id)));

    if (kind === "org") {
      setSelectedOrganizationId(id);
      return;
    }

    if (kind === "account") {
      setSelectedObjectAccountId(id);
      setSelectedBillingAccountId(id);
      return;
    }

    setSelectedObjectPlanId(id);
    setSelectedPlanId(id);
  }

  useEffect(() => {
    if (!pendingPanelSectionTarget || activePanel !== pendingPanelSectionTarget.panel) return;
    scrollToSection(pendingPanelSectionTarget.sectionId);
    setPendingPanelSectionTarget(null);
  }, [activePanel, pendingPanelSectionTarget]);

  useEffect(() => {
    if (!pendingPanelSectionTarget || activePanel === pendingPanelSectionTarget.panel) return;
    setPendingPanelSectionTarget(null);
  }, [activePanel, pendingPanelSectionTarget]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const parsed = parseAdminHash(window.location.hash);
      if (!parsed) return;

      setActivePanel(parsed.panel);
      setActiveWorkspaceId(resolveWorkspace(parsed.panel, parsed.sectionId));
      if (parsed.panel === "business" && parsed.sectionId) {
        const usageAnomalyTarget = parseUsageAnomalyHash(parsed.sectionId);
        if (usageAnomalyTarget) {
          setSelectedUsageAnomalyId(usageAnomalyTarget.id);
          setPendingPanelSectionTarget({ panel: "business", sectionId: "business-usage-anomalies" });
          return;
        }
        setPendingPanelSectionTarget({ panel: "business", sectionId: parsed.sectionId });
        return;
      }
      if (parsed.panel === "marketplace" && parsed.sectionId) {
        setPendingPanelSectionTarget({ panel: "marketplace", sectionId: parsed.sectionId });
        return;
      }
      if (parsed.panel === "learning" && parsed.sectionId) {
        if (parsed.sectionId === "learning-review-workbench") {
          setPendingPanelSectionTarget({ panel: "learning", sectionId: parsed.sectionId });
          return;
        }
        setSelectedLearningId(parsed.sectionId);
        return;
      }
      if (parsed.panel === "cognitive" && parsed.sectionId) {
        if (parsed.sectionId === "cognitive-review-workbench") {
          setPendingPanelSectionTarget({ panel: "cognitive", sectionId: parsed.sectionId });
          return;
        }
        setSelectedSessionId(parsed.sectionId);
        return;
      }
      if (parsed.panel === "objects" && parsed.sectionId) {
        const objectTarget = parseObjectHash(parsed.sectionId);
        if (!objectTarget) {
          setPendingPanelSectionTarget({ panel: "objects", sectionId: parsed.sectionId });
          return;
        }
        if (objectTarget.kind === "org") {
          setSelectedOrganizationId(objectTarget.id);
          return;
        }
        if (objectTarget.kind === "account") {
          setSelectedObjectAccountId(objectTarget.id);
          setSelectedBillingAccountId(objectTarget.id);
          return;
        }
        setSelectedObjectPlanId(objectTarget.id);
        setSelectedPlanId(objectTarget.id);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function jumpWithinPanel(panel: AdminPanel, sectionId: string) {
    writeHash(panel, sectionId);
    setActiveWorkspaceId(resolveWorkspace(panel, sectionId));
    if (activePanel === panel) {
      scrollToSection(sectionId);
      return;
    }
    openPanelSection(panel, sectionId);
  }

  function jumpWithinBusiness(sectionId: string) {
    jumpWithinPanel("business", sectionId);
  }

  function handleUsageAnomalySelect(usageRecordId: string) {
    setSelectedUsageAnomalyId(usageRecordId);
    writeHash("business", usageAnomalyHash(usageRecordId));
  }

  function handleOperationalAlertClick(alert: PlatformAdminAlert) {
    if (alert.id === "business_missing_cost_coverage" || alert.id === "business_low_cost_coverage") {
      jumpWithinBusiness(
        firstMissingCostConsumption
          ? consumptionAnchorId(firstMissingCostConsumption.id)
          : "business-consumption-economics",
      );
      return;
    }
    if (alert.id === "business_consumption_concentration") {
      jumpWithinBusiness(
        topConsumptionCapability
          ? capabilityAnchorId(topConsumptionCapability.capability)
          : "business-capability-structure",
      );
      return;
    }
    if (alert.id === "business_lowest_margin_capability") {
      jumpWithinBusiness(
        lowestMarginCapability
          ? capabilityAnchorId(lowestMarginCapability.capability)
          : "business-capability-structure",
      );
      return;
    }
    if (alert.id === "business_consumption_without_sales") {
      jumpWithinBusiness("business-points-orders");
      return;
    }
    if (alert.id === "business_usage_missing_provider") {
      jumpWithinBusiness("business-usage-anomalies");
      return;
    }
    if (alert.id === "business_usage_missing_model") {
      jumpWithinBusiness("business-usage-anomalies");
      return;
    }
    if (
      alert.id === "business_usage_metadata_quality" ||
      alert.id === "business_usage_billable_without_cost" ||
      alert.id === "business_usage_high_token_unbillable"
    ) {
      jumpWithinBusiness("business-usage-anomalies");
    }
  }

  const businessDomain = overview.domains.business;
  const marketplaceDomain = overview.domains.marketplace;
  const learningDomain = overview.domains.learning;
  const cognitiveDomain = overview.domains.cognitive;
  const objectsDomain = overview.domains.objects;

  const canCreateSubscription = useMemo(
    () => !!selectedBillingAccountId && !!selectedPlanId,
    [selectedBillingAccountId, selectedPlanId],
  );

  const filteredLearningQueue = useMemo(() => {
    if (learningFilter === "all") return learningDomain.queue;
    return learningDomain.queue.filter((item) => item.status.toLowerCase() === learningFilter);
  }, [learningDomain.queue, learningFilter]);

  const visibleBusinessPlans = useMemo(
    () => (showSeededData ? businessDomain.plans : businessDomain.plans.filter((item) => !item.isSeeded)),
    [businessDomain.plans, showSeededData],
  );
  const visibleBusinessSubscriptions = useMemo(
    () =>
      showSeededData
        ? businessDomain.subscriptions
        : businessDomain.subscriptions.filter((item) => !item.isSeeded),
    [businessDomain.subscriptions, showSeededData],
  );
  const visibleBusinessInvoices = useMemo(
    () => (showSeededData ? businessDomain.invoices : businessDomain.invoices.filter((item) => !item.isSeeded)),
    [businessDomain.invoices, showSeededData],
  );
  const visibleBusinessPointsOrders = useMemo(
    () =>
      showSeededData
        ? businessDomain.pointsOrders
        : businessDomain.pointsOrders.filter((item) => !item.isSeeded),
    [businessDomain.pointsOrders, showSeededData],
  );
  const visibleBusinessConsumptions = useMemo(
    () =>
      showSeededData
        ? businessDomain.consumptions
        : businessDomain.consumptions.filter((item) => !item.isSeeded),
    [businessDomain.consumptions, showSeededData],
  );
  const visibleBusinessUsageSummary = businessDomain.usageSummary;
  const visibleBusinessUsageProviders = businessDomain.usageProviders ?? [];
  const visibleBusinessUsageModels = businessDomain.usageModels ?? [];
  const visibleBusinessUsageTypes = businessDomain.usageTypes ?? [];
  const visibleBusinessUsageTrend = businessDomain.usageTrend ?? [];
  const visibleBusinessUsageAnomalies = useMemo(
    () => businessDomain.usageAnomalies ?? [],
    [businessDomain.usageAnomalies],
  );
  const visibleUsageMetadataAnomalyCount = useMemo(
    () =>
      visibleBusinessUsageAnomalies.filter(
        (item) =>
          item.anomalyFlags.includes("缺 Provider") ||
          item.anomalyFlags.includes("缺模型") ||
          item.anomalyFlags.includes("未知 usageType"),
      ).length,
    [visibleBusinessUsageAnomalies],
  );
  const visibleUsageBillableWithoutCostCount = useMemo(
    () => visibleBusinessUsageAnomalies.filter((item) => item.anomalyFlags.includes("billable 无成本")).length,
    [visibleBusinessUsageAnomalies],
  );
  const visibleUsageHighTokenUnbillableCount = useMemo(
    () => visibleBusinessUsageAnomalies.filter((item) => item.anomalyFlags.includes("高 Tokens 但未计费")).length,
    [visibleBusinessUsageAnomalies],
  );
  const filteredBusinessUsageAnomalies = useMemo(() => {
    if (usageAnomalyFilter === "all") return visibleBusinessUsageAnomalies;
    if (usageAnomalyFilter === "metadata") {
      return visibleBusinessUsageAnomalies.filter(
        (item) =>
          item.anomalyFlags.includes("缺 Provider") ||
          item.anomalyFlags.includes("缺模型") ||
          item.anomalyFlags.includes("未知 usageType"),
      );
    }
    if (usageAnomalyFilter === "billable_without_cost") {
      return visibleBusinessUsageAnomalies.filter((item) => item.anomalyFlags.includes("billable 无成本"));
    }
    return visibleBusinessUsageAnomalies.filter((item) => item.anomalyFlags.includes("高 Tokens 但未计费"));
  }, [usageAnomalyFilter, visibleBusinessUsageAnomalies]);
  const selectedUsageAnomaly = useMemo(
    () =>
      filteredBusinessUsageAnomalies.find((item) => item.id === selectedUsageAnomalyId) ??
      filteredBusinessUsageAnomalies[0] ??
      null,
    [filteredBusinessUsageAnomalies, selectedUsageAnomalyId],
  );
  useEffect(() => {
    if (filteredBusinessUsageAnomalies.length === 0) {
      setSelectedUsageAnomalyId(null);
      return;
    }
    if (
      selectedUsageAnomalyId &&
      filteredBusinessUsageAnomalies.some((item) => item.id === selectedUsageAnomalyId)
    ) {
      return;
    }
    setSelectedUsageAnomalyId(filteredBusinessUsageAnomalies[0]?.id ?? null);
  }, [filteredBusinessUsageAnomalies, selectedUsageAnomalyId]);
  const visibleBusinessCapabilityPricing = useMemo(
    () => businessDomain.capabilityPricing,
    [businessDomain.capabilityPricing],
  );
  const visibleMarketplaceListings = useMemo(
    () => (showSeededData ? marketplaceDomain.listings : marketplaceDomain.listings.filter((item) => !item.isSeeded)),
    [marketplaceDomain.listings, showSeededData],
  );
  const visibleObjectOrganizations = useMemo(
    () => (showSeededData ? objectsDomain.organizations : objectsDomain.organizations.filter((item) => !item.isSeeded)),
    [objectsDomain.organizations, showSeededData],
  );
  const visibleObjectBillingAccounts = useMemo(
    () => (showSeededData ? objectsDomain.billingAccounts : objectsDomain.billingAccounts.filter((item) => !item.isSeeded)),
    [objectsDomain.billingAccounts, showSeededData],
  );
  const visibleObjectPlans = useMemo(
    () => (showSeededData ? objectsDomain.plans : objectsDomain.plans.filter((item) => !item.isSeeded)),
    [objectsDomain.plans, showSeededData],
  );
  const hiddenSeededCount = useMemo(
    () =>
      businessDomain.plans.filter((item) => item.isSeeded).length +
      businessDomain.subscriptions.filter((item) => item.isSeeded).length +
      businessDomain.invoices.filter((item) => item.isSeeded).length +
      businessDomain.pointsOrders.filter((item) => item.isSeeded).length +
      businessDomain.consumptions.filter((item) => item.isSeeded).length +
      marketplaceDomain.listings.filter((item) => item.isSeeded).length +
      objectsDomain.organizations.filter((item) => item.isSeeded).length +
      objectsDomain.billingAccounts.filter((item) => item.isSeeded).length +
      objectsDomain.plans.filter((item) => item.isSeeded).length,
    [
      businessDomain.invoices,
      businessDomain.pointsOrders,
      businessDomain.plans,
      businessDomain.subscriptions,
      businessDomain.consumptions,
      marketplaceDomain.listings,
      objectsDomain.billingAccounts,
      objectsDomain.organizations,
      objectsDomain.plans,
    ],
  );

  const visibleLearningPending = useMemo(
    () => learningDomain.queue.filter((item) => item.status.toLowerCase() === "pending").length,
    [learningDomain.queue],
  );
  const visibleLowConfidenceSessions = useMemo(
    () => cognitiveDomain.sessions.filter((item) => item.lowConfidence).length,
    [cognitiveDomain.sessions],
  );
  const visibleMissingEvidenceSessions = useMemo(
    () => cognitiveDomain.sessions.filter((item) => item.missingEvidence).length,
    [cognitiveDomain.sessions],
  );
  const visibleAverageConfidence = useMemo(() => {
    const sessions = cognitiveDomain.sessions.filter((item) => typeof item.overall === "number");
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((sum, item) => sum + (item.overall ?? 0), 0);
    return total / sessions.length;
  }, [cognitiveDomain.sessions]);
  const visibleDraftInvoices = useMemo(
    () => visibleBusinessInvoices.filter((item) => item.isDraft).length,
    [visibleBusinessInvoices],
  );
  const visiblePendingInvoiceAmount = useMemo(
    () =>
      visibleBusinessInvoices
        .filter((item) => item.isDraft)
        .reduce((sum, item) => sum + (item.amountValue || 0), 0),
    [visibleBusinessInvoices],
  );
  const visiblePointsProductCount = useMemo(
    () => visibleBusinessPlans.filter((item) => item.category === "points_pack").length,
    [visibleBusinessPlans],
  );
  const visiblePointsSalesCents = useMemo(
    () => visibleBusinessPointsOrders.reduce((sum, item) => sum + item.amountCents, 0),
    [visibleBusinessPointsOrders],
  );
  const visibleSettledConsumptionPoints = useMemo(
    () => visibleBusinessConsumptions.reduce((sum, item) => sum + item.actualPoints, 0),
    [visibleBusinessConsumptions],
  );
  const visibleSettledConsumptionRevenueCents = useMemo(
    () => visibleBusinessConsumptions.reduce((sum, item) => sum + item.revenueCents, 0),
    [visibleBusinessConsumptions],
  );
  const visibleSettledConsumptionCostCents = useMemo(
    () => visibleBusinessConsumptions.reduce((sum, item) => sum + item.costCents, 0),
    [visibleBusinessConsumptions],
  );
  const visibleObservedUsageCostCents = useMemo(() => {
    if (visibleBusinessUsageSummary.currency !== "CNY") return null;
    return Math.max(0, Math.round(visibleBusinessUsageSummary.costValue * 100));
  }, [visibleBusinessUsageSummary.costValue, visibleBusinessUsageSummary.currency]);
  const visibleBusinessCostDisplayCents = useMemo(() => {
    if (visibleSettledConsumptionCostCents > 0) return visibleSettledConsumptionCostCents;
    return visibleObservedUsageCostCents ?? 0;
  }, [visibleObservedUsageCostCents, visibleSettledConsumptionCostCents]);
  const visibleSettledGrossProfitCents = useMemo(
    () => visibleBusinessConsumptions.reduce((sum, item) => sum + item.grossProfitCents, 0),
    [visibleBusinessConsumptions],
  );
  const visibleBusinessGrossProfitDisplayCents = useMemo(() => {
    return visibleSettledConsumptionRevenueCents - visibleBusinessCostDisplayCents;
  }, [visibleBusinessCostDisplayCents, visibleSettledConsumptionRevenueCents]);
  const visibleSettledGrossMargin = useMemo(() => {
    if (visibleSettledConsumptionRevenueCents <= 0) return null;
    return Number((((visibleBusinessGrossProfitDisplayCents / visibleSettledConsumptionRevenueCents) * 100)).toFixed(1));
  }, [visibleBusinessGrossProfitDisplayCents, visibleSettledConsumptionRevenueCents]);
  const capabilityConsumptionSummaries = useMemo<CapabilityConsumptionSummary[]>(() => {
    const summaryMap = new Map<string, CapabilityConsumptionSummary>();

    for (const item of visibleBusinessConsumptions) {
      const current = summaryMap.get(item.capability) ?? {
        capability: item.capability,
        capabilityLabel: item.capabilityLabel,
        callCount: 0,
        totalPoints: 0,
        totalRevenueCents: 0,
        totalCostCents: 0,
        grossProfitCents: 0,
        grossMarginPercent: null,
        averagePointsPerCall: 0,
        tokenTotal: 0,
        topAgents: [],
      };

      current.callCount += 1;
      current.totalPoints += item.actualPoints;
      current.totalRevenueCents += item.revenueCents;
      current.totalCostCents += item.costCents;
      current.grossProfitCents += item.grossProfitCents;
      current.tokenTotal += item.tokenTotal;

      if (item.agentCodes.length > 0) {
        current.topAgents = Array.from(new Set([...current.topAgents, ...item.agentCodes])).slice(0, 3);
      }

      summaryMap.set(item.capability, current);
    }

    return Array.from(summaryMap.values())
      .map((item) => ({
        ...item,
        averagePointsPerCall: item.callCount > 0 ? Math.round(item.totalPoints / item.callCount) : 0,
        grossMarginPercent:
          item.totalRevenueCents > 0
            ? Number((((item.grossProfitCents / item.totalRevenueCents) * 100)).toFixed(1))
            : null,
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.grossProfitCents - b.grossProfitCents;
      });
  }, [visibleBusinessConsumptions]);
  const topConsumptionCapability = capabilityConsumptionSummaries[0] ?? null;
  const lowestMarginCapability = useMemo(() => {
    const rows = capabilityConsumptionSummaries.filter((item) => typeof item.grossMarginPercent === "number");
    if (rows.length === 0) return null;
    return [...rows].sort((a, b) => (a.grossMarginPercent ?? 0) - (b.grossMarginPercent ?? 0))[0] ?? null;
  }, [capabilityConsumptionSummaries]);
  const firstMissingCostConsumption = useMemo(
    () => visibleBusinessConsumptions.find((item) => item.costCents <= 0) ?? null,
    [visibleBusinessConsumptions],
  );
  const visibleCostTrackedConsumptions = useMemo(
    () => visibleBusinessConsumptions.filter((item) => item.costCents > 0).length,
    [visibleBusinessConsumptions],
  );
  const visibleCostCoveragePercent = useMemo(() => {
    if (visibleBusinessConsumptions.length === 0) return null;
    return Number((((visibleCostTrackedConsumptions / visibleBusinessConsumptions.length) * 100)).toFixed(1));
  }, [visibleBusinessConsumptions.length, visibleCostTrackedConsumptions]);
  const topConsumptionSharePercent = useMemo(() => {
    if (!topConsumptionCapability || visibleSettledConsumptionPoints <= 0) return null;
    return Number((((topConsumptionCapability.totalPoints / visibleSettledConsumptionPoints) * 100)).toFixed(1));
  }, [topConsumptionCapability, visibleSettledConsumptionPoints]);
  const businessOperationalAlerts = useMemo<PlatformAdminAlert[]>(() => {
    const alerts: PlatformAdminAlert[] = [];

    if (visibleBusinessConsumptions.length > 0 && visibleCostTrackedConsumptions === 0) {
      alerts.push(
        buildAlert(
          "business_missing_cost_coverage",
          "critical",
          "模型成本还没有回传进经营面板",
          "最近 30 天已经有能力结算，但成本字段仍为 0。现在看到的毛利会系统性偏高，建议优先补齐 costCents 回传链路。",
          visibleBusinessConsumptions.length,
        ),
      );
    } else if (
      visibleBusinessConsumptions.length > 0 &&
      typeof visibleCostCoveragePercent === "number" &&
      visibleCostCoveragePercent < 80
    ) {
      alerts.push(
        buildAlert(
          "business_low_cost_coverage",
          "warning",
          "成本回传覆盖率偏低",
          `最近 30 天只有 ${visibleCostCoveragePercent}% 的结算记录带了成本，当前毛利判断仍存在偏差。`,
          visibleCostTrackedConsumptions,
        ),
      );
    }

    if (typeof topConsumptionSharePercent === "number" && topConsumptionSharePercent >= 60 && topConsumptionCapability) {
      alerts.push(
        buildAlert(
          "business_consumption_concentration",
          "warning",
          "能力消耗过于集中",
          `${topConsumptionCapability.capabilityLabel} 吃掉了最近 30 天 ${topConsumptionSharePercent}% 的经营点，建议检查是否存在定价、流程或需求入口过度集中。`,
          topConsumptionCapability.totalPoints,
        ),
      );
    }

    if (
      lowestMarginCapability &&
      typeof lowestMarginCapability.grossMarginPercent === "number" &&
      lowestMarginCapability.grossMarginPercent < 40
    ) {
      alerts.push(
        buildAlert(
          "business_lowest_margin_capability",
          lowestMarginCapability.grossMarginPercent < 20 ? "critical" : "warning",
          "存在低毛利能力",
          `${lowestMarginCapability.capabilityLabel} 当前毛利率只有 ${lowestMarginCapability.grossMarginPercent}%，建议复核定价因子、模型成本和调用策略。`,
          lowestMarginCapability.callCount,
        ),
      );
    }

    if (visiblePointsSalesCents === 0 && visibleSettledConsumptionPoints > 0) {
      alerts.push(
        buildAlert(
          "business_consumption_without_sales",
          "info",
          "最近有消耗但没有看到充值收入",
          "最近 30 天平台已经发生经营点消耗，但没有捕获到新的充值订单。要么处于消耗存量余额阶段，要么充值归因还没接进这个面板。",
        ),
      );
    }

    if (visibleBusinessUsageSummary.missingProviderCount > 0) {
      alerts.push(
        buildAlert(
          "business_usage_missing_provider",
          "warning",
          "第三方耗用缺少 Provider 标记",
          `最近 30 天有 ${visibleBusinessUsageSummary.missingProviderCount} 条 UsageRecord 没有记录 Provider，供应商成本归因会失真。`,
          visibleBusinessUsageSummary.missingProviderCount,
        ),
      );
    }

    if (visibleBusinessUsageSummary.missingModelCount > 0) {
      alerts.push(
        buildAlert(
          "business_usage_missing_model",
          "warning",
          "第三方耗用缺少模型标记",
          `最近 30 天有 ${visibleBusinessUsageSummary.missingModelCount} 条 UsageRecord 没有记录 Model，模型层成本分析还不完整。`,
          visibleBusinessUsageSummary.missingModelCount,
        ),
      );
    }

    if (visibleUsageMetadataAnomalyCount > 0) {
      alerts.push(
        buildAlert(
          "business_usage_metadata_quality",
          "warning",
          "第三方耗用存在元数据缺口",
          `最近 30 天有 ${visibleUsageMetadataAnomalyCount} 条 UsageRecord 命中了缺 Provider、缺模型或未知 usageType，建议优先补齐元数据后再看成本结构。`,
          visibleUsageMetadataAnomalyCount,
        ),
      );
    }

    if (visibleUsageBillableWithoutCostCount > 0) {
      alerts.push(
        buildAlert(
          "business_usage_billable_without_cost",
          "critical",
          "存在 billable 但没有成本的第三方耗用",
          `最近 30 天有 ${visibleUsageBillableWithoutCostCount} 条 UsageRecord 已标记为 billable，但成本仍为 0，这会直接污染毛利判断。`,
          visibleUsageBillableWithoutCostCount,
        ),
      );
    }

    if (visibleUsageHighTokenUnbillableCount > 0) {
      alerts.push(
        buildAlert(
          "business_usage_high_token_unbillable",
          "warning",
          "存在高 Tokens 但未计费的第三方耗用",
          `最近 30 天有 ${visibleUsageHighTokenUnbillableCount} 条 UsageRecord 在高 Tokens 区间仍被标为 non-billable，建议核对 usageType 与计费策略。`,
          visibleUsageHighTokenUnbillableCount,
        ),
      );
    }

    return [...alerts].sort((a, b) => {
      const severityDiff = alertSeverityRank(a.severity) - alertSeverityRank(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return (b.count ?? 0) - (a.count ?? 0);
    });
  }, [
    visibleBusinessUsageSummary.missingModelCount,
    visibleBusinessUsageSummary.missingProviderCount,
    lowestMarginCapability,
    topConsumptionCapability,
    topConsumptionSharePercent,
    visibleUsageBillableWithoutCostCount,
    visibleBusinessConsumptions,
    visibleCostCoveragePercent,
    visibleCostTrackedConsumptions,
    visibleUsageHighTokenUnbillableCount,
    visibleUsageMetadataAnomalyCount,
    visiblePointsSalesCents,
    visibleSettledConsumptionPoints,
  ]);
  const visiblePlatformPlanCount = useMemo(
    () => visibleObjectPlans.filter((item) => item.category === "platform").length,
    [visibleObjectPlans],
  );
  const visibleSpecialtyPlanCount = useMemo(
    () => visibleObjectPlans.filter((item) => item.category === "specialty_pack").length,
    [visibleObjectPlans],
  );
  const visibleOrphanAccounts = useMemo(
    () => visibleObjectBillingAccounts.filter((item) => !item.hasOrganization).length,
    [visibleObjectBillingAccounts],
  );
  const visibleRevenueShares = useMemo(
    () => visibleMarketplaceListings.reduce((sum, item) => sum + item.revenueShareCount, 0),
    [visibleMarketplaceListings],
  );
  const visibleZeroInstallListings = useMemo(
    () => visibleMarketplaceListings.filter((item) => item.installCount === 0).length,
    [visibleMarketplaceListings],
  );
  const visiblePrivateListings = useMemo(
    () => visibleMarketplaceListings.filter((item) => item.visibility.toLowerCase() !== "public").length,
    [visibleMarketplaceListings],
  );
  const visibleAverageRating = useMemo(() => {
    if (visibleMarketplaceListings.length === 0) return 0;
    const total = visibleMarketplaceListings.reduce((sum, item) => sum + item.rating, 0);
    return total / visibleMarketplaceListings.length;
  }, [visibleMarketplaceListings]);
  const dueSoonVisibleSubscriptions = useMemo(
    () =>
      visibleBusinessSubscriptions.filter(
        (item) =>
          typeof item.daysToRenewal === "number" &&
          item.daysToRenewal >= 0 &&
          item.daysToRenewal <= 7,
      ).length,
    [visibleBusinessSubscriptions],
  );
  const visibleMembers = useMemo(
    () => visibleObjectOrganizations.reduce((sum, item) => sum + item.memberCount, 0),
    [visibleObjectOrganizations],
  );
  const visibleUnlinkedInvoices = useMemo(
    () => visibleBusinessInvoices.filter((item) => item.isUnlinked).length,
    [visibleBusinessInvoices],
  );

  const derivedHeaderCards = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return overview.header.cards;
    return [
      {
        id: "header_orgs_visible",
        label: "平台工作台",
        value: visibleObjectOrganizations.length,
        helper: "当前纳入真实视图的组织 / 工作空间数量",
      },
      {
        id: "header_commercial_visible",
        label: "活跃商业对象",
        value: visibleBusinessSubscriptions.length + visibleMarketplaceListings.length,
        helper: "真实视图下的订阅与上架对象数量",
      },
      {
        id: "header_pending_visible",
        label: "待处理事项",
        value: visibleDraftInvoices + visibleLearningPending + visibleLowConfidenceSessions,
        helper: "已按真实对象视图过滤草稿发票，学习与认知保持全量",
      },
      {
        id: "header_cognitive_visible",
        label: "认知健康",
        value: Math.round(visibleAverageConfidence * 100),
        unit: "%",
        helper: "基于最近认知会话的平均置信度计算",
      },
    ];
  }, [
    overview.header.cards,
    showSeededData,
    visibleAverageConfidence,
    visibleBusinessSubscriptions.length,
    visibleDraftInvoices,
    visibleLearningPending,
    visibleLowConfidenceSessions,
    visibleMarketplaceListings.length,
    visibleObjectOrganizations.length,
  ]);

  const derivedAlerts = useMemo<PlatformAdminAlert[]>(() => {
    const alerts: PlatformAdminAlert[] = showSeededData ? [...overview.header.alerts] : [];
    if (!showSeededData) {
      if (visibleDraftInvoices > 0) {
        alerts.push(
          buildAlert(
            "alert_draft_invoices_visible",
            "warning",
            "草稿发票需要清理",
            "真实对象视图下仍有草稿发票未进入后续确认或开票流程。",
            visibleDraftInvoices,
          ),
        );
      }
      if (visibleLowConfidenceSessions > 0) {
        alerts.push(
          buildAlert(
            "alert_low_confidence_visible",
            "warning",
            "低置信认知会话待复核",
            "存在低置信或缺证据会话，需要检查 trace 和 evidence。",
            visibleLowConfidenceSessions,
          ),
        );
      }
      if (visibleUnlinkedInvoices > 0) {
        alerts.push(
          buildAlert(
            "alert_unlinked_invoices_visible",
            "critical",
            "真实发票缺少购买归因",
            "当前真实对象视图下仍有发票缺少明确购买方案或订单归因。",
            visibleUnlinkedInvoices,
          ),
        );
      }
    }

    const merged = [...alerts, ...businessOperationalAlerts];
    const seen = new Set<string>();
    return merged
      .filter((alert) => {
        if (seen.has(alert.id)) return false;
        seen.add(alert.id);
        return true;
      })
      .sort((a, b) => {
        const severityDiff = alertSeverityRank(a.severity) - alertSeverityRank(b.severity);
        if (severityDiff !== 0) return severityDiff;
        return (b.count ?? 0) - (a.count ?? 0);
      });
  }, [
    businessOperationalAlerts,
    overview.header.alerts,
    showSeededData,
    visibleDraftInvoices,
    visibleLowConfidenceSessions,
    visibleUnlinkedInvoices,
  ]);

  const derivedOverviewCards = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return overview.domains.overview.cards;
    return [
      {
        id: "overview_orgs_visible",
        label: "组织数",
        value: visibleObjectOrganizations.length,
        helper: "真实视图下的平台组织 / 工作空间总数",
      },
      {
        id: "overview_members_visible",
        label: "成员数",
        value: visibleMembers,
        helper: "真实视图下的组织成员规模",
      },
      {
        id: "overview_revenue_shares_visible",
        label: "分润规则",
        value: visibleRevenueShares,
        helper: "真实视图下已绑定的 revenue share 配置",
      },
      {
        id: "overview_evaluations_visible",
        label: "评估结果",
        value: overview.summary.evaluationResults,
        helper: "评估结果目前仍为全量认知资产口径",
      },
    ];
  }, [
    overview.domains.overview.cards,
    overview.summary.evaluationResults,
    showSeededData,
    visibleMembers,
    visibleObjectOrganizations.length,
    visibleRevenueShares,
  ]);

  const derivedOverviewQueues = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return overview.domains.overview.queues;
    return [
      {
        id: "queue_invoices_visible",
        label: "待处理草稿发票",
        value: visibleDraftInvoices,
        helper: "仅统计真实对象视图下直接影响商业确认和回款归因的发票",
        tone: visibleDraftInvoices > 0 ? "warning" : "good",
      },
      {
        id: "queue_learning_visible",
        label: "待审学习记录",
        value: visibleLearningPending,
        helper: "待审越多，学习闭环越慢",
        tone: visibleLearningPending > 0 ? "warning" : "good",
      },
      {
        id: "queue_cognitive_visible",
        label: "低置信会话",
        value: visibleLowConfidenceSessions,
        helper: "需要补证据或人工复核",
        tone: visibleLowConfidenceSessions > 0 ? "danger" : "good",
      },
      {
        id: "queue_renewal_visible",
        label: "7 天内待续费",
        value: dueSoonVisibleSubscriptions,
        helper: "真实对象视图下帮助平台提前发现续费与流失风险",
        tone: dueSoonVisibleSubscriptions > 0 ? "warning" : "neutral",
      },
    ];
  }, [
    dueSoonVisibleSubscriptions,
    overview.domains.overview.queues,
    showSeededData,
    visibleDraftInvoices,
    visibleLearningPending,
    visibleLowConfidenceSessions,
  ]);

  const derivedBusinessCards = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return businessDomain.cards;
    return [
      {
        id: "business_points_sales_visible",
        label: "30 天充值收入",
        value: Math.round(visiblePointsSalesCents / 100),
        unit: "元",
        helper: "真实视图下最近 30 天经营点充值订单带来的现金收入",
      },
      {
        id: "business_settled_points_visible",
        label: "30 天已结算经营点",
        value: visibleSettledConsumptionPoints,
        helper: "真实视图下最近 30 天已经完成结算的能力消耗总量",
      },
      {
        id: "business_settled_cost_visible",
        label: "30 天模型成本",
        value: Math.round(visibleBusinessCostDisplayCents / 100),
        unit: "元",
        helper:
          visibleSettledConsumptionCostCents > 0
            ? "真实视图下最近 30 天已结算消耗对应的模型与推理成本"
            : visibleObservedUsageCostCents
              ? "结算侧还没完整回传 costCents，先回退展示第三方已观测成本"
              : "真实视图下最近 30 天已结算消耗对应的模型与推理成本",
      },
      {
        id: "business_gross_margin_visible",
        label: "30 天综合毛利率",
        value: visibleSettledGrossMargin,
        unit: "%",
        helper: "按真实视图下已结算经营点收入与实际模型成本计算",
        tone:
          typeof visibleSettledGrossMargin === "number"
            ? visibleSettledGrossMargin >= 60
              ? "good"
              : visibleSettledGrossMargin >= 30
                ? "warning"
                : "danger"
            : "neutral",
      },
    ];
  }, [
    businessDomain.cards,
    showSeededData,
    visiblePointsSalesCents,
    visibleBusinessCostDisplayCents,
    visibleObservedUsageCostCents,
    visibleSettledConsumptionCostCents,
    visibleSettledConsumptionPoints,
    visibleSettledGrossMargin,
  ]);

  const derivedMarketplaceCards = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return marketplaceDomain.cards;
    return [
      {
        id: "marketplace_active_visible",
        label: "活跃上架",
        value: visibleMarketplaceListings.filter((item) => item.status.toLowerCase() === "active").length,
        helper: "真实视图下正在对外展示或可流通的 Listing",
      },
      {
        id: "marketplace_zero_install_visible",
        label: "零安装 Listing",
        value: visibleZeroInstallListings,
        helper: "可优先检查曝光与定价",
        tone: visibleZeroInstallListings > 0 ? "warning" : "good",
      },
      {
        id: "marketplace_private_visible",
        label: "非公开上架",
        value: visiblePrivateListings,
        helper: "内部或定向分发的 Listing 数量",
      },
      {
        id: "marketplace_rating_visible",
        label: "平均评分",
        value: Math.round(visibleAverageRating * 20),
        unit: "/100",
        helper: "真实视图下上架对象的平均评分（按 100 分口径展示）",
        tone: visibleAverageRating >= 4 ? "good" : visibleAverageRating >= 3 ? "warning" : "neutral",
      },
    ];
  }, [
    marketplaceDomain.cards,
    showSeededData,
    visibleAverageRating,
    visibleMarketplaceListings,
    visiblePrivateListings,
    visibleZeroInstallListings,
  ]);

  const derivedObjectsCards = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return objectsDomain.cards;
    return [
      {
        id: "objects_organizations_visible",
        label: "组织 / 工作台",
        value: visibleObjectOrganizations.length,
        helper: "当前可管理的真实组织主体数量",
      },
      {
        id: "objects_billing_accounts_visible",
        label: "账务账户",
        value: visibleObjectBillingAccounts.length,
        helper: "真实视图下所有账务归因主体数量",
      },
      {
        id: "objects_orphan_accounts_visible",
        label: "孤立账户",
        value: visibleOrphanAccounts,
        helper: "未绑定组织的真实账务账户需要清理",
        tone: visibleOrphanAccounts > 0 ? "warning" : "good",
      },
      {
        id: "objects_catalog_mix_visible",
        label: "商品结构",
        value: visibleObjectPlans.length,
        helper: `母体席位 ${visiblePlatformPlanCount} / 专项 ${visibleSpecialtyPlanCount} / 经营点 ${visiblePointsProductCount}`,
      },
    ];
  }, [
    objectsDomain.cards,
    showSeededData,
    visibleObjectBillingAccounts.length,
    visibleObjectOrganizations.length,
    visibleObjectPlans.length,
    visibleOrphanAccounts,
    visiblePlatformPlanCount,
    visiblePointsProductCount,
    visibleSpecialtyPlanCount,
  ]);

  const derivedLearningCards = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return learningDomain.cards;
    const approvedCount = learningDomain.queue.filter((item) => item.status.toLowerCase() === "approved").length;
    const rejectedCount = learningDomain.queue.filter((item) => item.status.toLowerCase() === "rejected").length;
    const reviewedCount = approvedCount + rejectedCount;
    const passRate = reviewedCount === 0 ? 0 : Math.round((approvedCount / reviewedCount) * 100);
    return [
      {
        id: "learning_pending_visible",
        label: "待审记录",
        value: visibleLearningPending,
        helper: "当前工作台里仍等待平台复核的学习记录",
        tone: visibleLearningPending > 0 ? "warning" : "good",
      },
      {
        id: "learning_pass_rate_visible",
        label: "通过率",
        value: passRate,
        unit: "%",
        helper: "按当前可见复核队列计算的批准占比",
      },
      {
        id: "learning_approved_visible",
        label: "已批准",
        value: approvedCount,
        helper: "当前工作台里已经通过的学习记录",
      },
      {
        id: "learning_rejected_visible",
        label: "已驳回",
        value: rejectedCount,
        helper: "当前工作台里已驳回的学习记录",
        tone: rejectedCount > 0 ? "warning" : "good",
      },
    ];
  }, [learningDomain.cards, learningDomain.queue, showSeededData, visibleLearningPending]);

  const derivedCognitiveCards = useMemo<PlatformAdminMetric[]>(() => {
    if (showSeededData) return cognitiveDomain.cards;
    return [
      {
        id: "cognitive_sessions_visible",
        label: "认知会话",
        value: cognitiveDomain.sessions.length,
        helper: "当前工作台里可复核的认知会话数量",
      },
      {
        id: "cognitive_low_confidence_visible",
        label: "低置信会话",
        value: visibleLowConfidenceSessions,
        helper: "置信度低于阈值、需要优先处理的会话",
        tone: visibleLowConfidenceSessions > 0 ? "danger" : "good",
      },
      {
        id: "cognitive_missing_evidence_visible",
        label: "缺证据会话",
        value: visibleMissingEvidenceSessions,
        helper: "存在 trace 或证据缺口，需要补链路",
        tone: visibleMissingEvidenceSessions > 0 ? "warning" : "good",
      },
      {
        id: "cognitive_avg_visible",
        label: "平均置信度",
        value: Math.round(visibleAverageConfidence * 100),
        unit: "%",
        helper: "按当前工作台可见会话计算的平均值",
        tone:
          visibleAverageConfidence >= 0.75
            ? "good"
            : visibleAverageConfidence >= 0.6
              ? "warning"
              : "danger",
      },
    ];
  }, [
    cognitiveDomain.cards,
    cognitiveDomain.sessions.length,
    showSeededData,
    visibleAverageConfidence,
    visibleLowConfidenceSessions,
    visibleMissingEvidenceSessions,
  ]);

  const selectedLearning = useMemo(
    () =>
      filteredLearningQueue.find((item) => item.id === selectedLearningId) ??
      filteredLearningQueue[0] ??
      null,
    [filteredLearningQueue, selectedLearningId],
  );

  const selectedSession = useMemo(
    () =>
      cognitiveDomain.sessions.find((item) => item.id === selectedSessionId) ??
      cognitiveDomain.sessions[0] ??
      null,
    [cognitiveDomain.sessions, selectedSessionId],
  );
  const selectedOrganization = useMemo(
    () =>
      visibleObjectOrganizations.find((item) => item.id === selectedOrganizationId) ??
      visibleObjectOrganizations[0] ??
      null,
    [selectedOrganizationId, visibleObjectOrganizations],
  );
  const selectedObjectAccount = useMemo(
    () =>
      visibleObjectBillingAccounts.find((item) => item.id === selectedObjectAccountId) ??
      visibleObjectBillingAccounts[0] ??
      null,
    [selectedObjectAccountId, visibleObjectBillingAccounts],
  );
  const selectedObjectPlan = useMemo(
    () =>
      visibleObjectPlans.find((item) => item.id === selectedObjectPlanId) ??
      visibleObjectPlans[0] ??
      null,
    [selectedObjectPlanId, visibleObjectPlans],
  );
  const defaultLearningTargetId = useMemo(
    () => filteredLearningQueue.find((item) => item.status === "pending")?.id ?? selectedLearning?.id ?? null,
    [filteredLearningQueue, selectedLearning?.id],
  );
  const defaultCognitiveTargetId = useMemo(
    () =>
      cognitiveDomain.sessions.find((item) => item.priority === "high")?.id ??
      selectedSession?.id ??
      null,
    [cognitiveDomain.sessions, selectedSession?.id],
  );
  const navBadgeByPanel = useMemo<Record<AdminPanel, string | null>>(
    () => ({
      overview: derivedAlerts.length > 0 ? `${formatNumber(derivedAlerts.length)} 项` : null,
      business: businessOperationalAlerts.length > 0 ? `${formatNumber(businessOperationalAlerts.length)} 项异常` : null,
      marketplace: visibleMarketplaceListings.length > 0 ? `${formatNumber(visibleMarketplaceListings.length)} 个上架` : null,
      learning: visibleLearningPending > 0 ? `${formatNumber(visibleLearningPending)} 待审` : null,
      cognitive: cognitiveDomain.sessions.length > 0 ? `${formatNumber(cognitiveDomain.sessions.length)} 会话` : null,
      objects: visibleObjectOrganizations.length > 0 ? `${formatNumber(visibleObjectOrganizations.length)} 组织` : null,
    }),
    [
      businessOperationalAlerts.length,
      cognitiveDomain.sessions.length,
      derivedAlerts.length,
      visibleLearningPending,
      visibleMarketplaceListings.length,
      visibleObjectOrganizations.length,
    ],
  );
  const navBadgeByWorkspace = useMemo<Record<AdminWorkspaceId, string | null>>(
    () => ({
      "overview-home": derivedAlerts.length > 0 ? `${formatNumber(derivedAlerts.length)} 项` : null,
      "business-core": businessOperationalAlerts.length > 0 ? `${formatNumber(businessOperationalAlerts.length)} 项异常` : null,
      "business-third-party":
        visibleBusinessUsageSummary.recordedEvents > 0
          ? `${formatNumber(visibleBusinessUsageSummary.recordedEvents)} 条记录`
          : null,
      "marketplace-listings":
        visibleMarketplaceListings.length > 0 ? `${formatNumber(visibleMarketplaceListings.length)} 个上架` : null,
      "learning-review": visibleLearningPending > 0 ? `${formatNumber(visibleLearningPending)} 待审` : null,
      "cognitive-review":
        cognitiveDomain.sessions.length > 0 ? `${formatNumber(cognitiveDomain.sessions.length)} 会话` : null,
      "objects-organizations":
        visibleObjectOrganizations.length > 0 ? `${formatNumber(visibleObjectOrganizations.length)} 组织` : null,
      "objects-accounts":
        visibleObjectBillingAccounts.length > 0 ? `${formatNumber(visibleObjectBillingAccounts.length)} 账户` : null,
      "objects-plans": visibleObjectPlans.length > 0 ? `${formatNumber(visibleObjectPlans.length)} 商品` : null,
    }),
    [
      businessOperationalAlerts.length,
      cognitiveDomain.sessions.length,
      derivedAlerts.length,
      visibleBusinessUsageSummary.recordedEvents,
      visibleLearningPending,
      visibleMarketplaceListings.length,
      visibleObjectBillingAccounts.length,
      visibleObjectOrganizations.length,
      visibleObjectPlans.length,
    ],
  );
  const sectionSummaryById = useMemo<Record<AdminNavSectionId, string | null>>(
    () => ({
      cockpit: navBadgeByWorkspace["overview-home"],
      operations:
        navBadgeByWorkspace["business-core"] ??
        navBadgeByWorkspace["business-third-party"] ??
        navBadgeByWorkspace["marketplace-listings"],
      governance: navBadgeByWorkspace["learning-review"] ?? navBadgeByWorkspace["cognitive-review"],
      objects:
        navBadgeByWorkspace["objects-organizations"] ??
        navBadgeByWorkspace["objects-accounts"] ??
        navBadgeByWorkspace["objects-plans"],
    }),
    [navBadgeByWorkspace],
  );
  const activePanelMeta = useMemo(() => getPanelMeta(activePanel), [activePanel]);
  const activeWorkspace = useMemo(() => getWorkspaceMeta(activeWorkspaceId), [activeWorkspaceId]);
  const activeNavSection = useMemo(() => getNavSection(activePanel), [activePanel]);
  const activeSectionWorkspaces = useMemo(
    () => getWorkspacesBySection(activeNavSection.id),
    [activeNavSection.id],
  );
  const sidebarQuickQueues: Array<{
    id: string;
    label: string;
    value: string;
    helper: string;
    icon: typeof CircleDollarSign;
    onClick: () => void;
  }> = [
    {
      id: "draft-invoices",
      label: "草稿发票",
      value: `${formatNumber(showSeededData ? overview.summary.draftInvoices : visibleDraftInvoices)} 张`,
      helper: "跳到发票归因",
      icon: CircleDollarSign,
      onClick: () => navigateToPanel("business", "business-invoices"),
    },
    {
      id: "business-alerts",
      label: "经营异常",
      value: `${formatNumber(businessOperationalAlerts.length)} 项`,
      helper: "跳到经营异常",
      icon: AlertTriangle,
      onClick: () => navigateToPanel("business", "business-alerts"),
    },
    {
      id: "learning-pending",
      label: "学习待审",
      value: `${formatNumber(showSeededData ? overview.summary.learningPending : visibleLearningPending)} 条`,
      helper: "跳到学习复核",
      icon: ClipboardCheck,
      onClick: () => defaultLearningTargetId && navigateToLearningItem(defaultLearningTargetId),
    },
    {
      id: "cognitive-sessions",
      label: "认知会话",
      value: `${formatNumber(showSeededData ? overview.summary.cognitiveSessions : cognitiveDomain.sessions.length)} 个`,
      helper: "跳到认知内核",
      icon: BrainCircuit,
      onClick: () => defaultCognitiveTargetId && navigateToCognitiveSession(defaultCognitiveTargetId),
    },
  ];

  useEffect(() => {
    setCollapsedNavSections((current) =>
      current[activeNavSection.id]
        ? {
            ...current,
            [activeNavSection.id]: false,
          }
        : current,
    );
  }, [activeNavSection.id]);
  const activeWorkspaceContextItems = useMemo<WorkspaceContextItem[]>(() => {
    switch (activeWorkspaceId) {
      case "overview-home":
        return [
          { label: "全局告警", value: `${formatNumber(derivedAlerts.length)} 项` },
          { label: "草稿发票", value: `${formatNumber(visibleDraftInvoices)} 张` },
          { label: "低置信会话", value: `${formatNumber(visibleLowConfidenceSessions)} 个` },
        ];
      case "business-core":
        return [
          { label: "30 天充值收入", value: formatMoney(visiblePointsSalesCents, "CNY") },
          {
            label: "综合毛利率",
            value: typeof visibleSettledGrossMargin === "number" ? `${visibleSettledGrossMargin}%` : "--",
          },
          { label: "7 天内待续费", value: `${formatNumber(dueSoonVisibleSubscriptions)} 个` },
        ];
      case "business-third-party":
        return [
          { label: "Usage 记录", value: `${formatNumber(visibleBusinessUsageSummary.recordedEvents)} 条` },
          {
            label: "第三方成本",
            value: formatMoneyValue(
              visibleBusinessUsageSummary.costValue,
              visibleBusinessUsageSummary.currency,
              visibleBusinessUsageSummary.currency === "CNY" ? 2 : 6,
            ),
          },
          {
            label: "缺标记",
            value: `P ${formatNumber(visibleBusinessUsageSummary.missingProviderCount)} / M ${formatNumber(visibleBusinessUsageSummary.missingModelCount)}`,
          },
        ];
      case "marketplace-listings":
        return [
          { label: "上架对象", value: `${formatNumber(visibleMarketplaceListings.length)} 个` },
          { label: "私有 Listing", value: `${formatNumber(visiblePrivateListings)} 个` },
          { label: "分润规则", value: `${formatNumber(visibleRevenueShares)} 条` },
        ];
      case "learning-review":
        return [
          { label: "待审记录", value: `${formatNumber(visibleLearningPending)} 条` },
          { label: "当前筛选", value: learningFilter === "all" ? "全部" : learningFilter },
          { label: "当前定位", value: selectedLearning?.title ?? "--" },
        ];
      case "cognitive-review":
        return [
          { label: "认知会话", value: `${formatNumber(cognitiveDomain.sessions.length)} 个` },
          { label: "低置信", value: `${formatNumber(visibleLowConfidenceSessions)} 个` },
          { label: "当前定位", value: selectedSession?.id ?? "--" },
        ];
      case "objects-organizations":
        return [
          { label: "组织主体", value: `${formatNumber(visibleObjectOrganizations.length)} 个` },
          { label: "当前定位", value: selectedOrganization?.name ?? "--" },
          { label: "成员总数", value: `${formatNumber(visibleMembers)} 人` },
        ];
      case "objects-accounts":
        return [
          { label: "账务账户", value: `${formatNumber(visibleObjectBillingAccounts.length)} 个` },
          { label: "孤立账户", value: `${formatNumber(visibleOrphanAccounts)} 个` },
          { label: "当前定位", value: selectedObjectAccount?.name ?? "--" },
        ];
      case "objects-plans":
        return [
          { label: "平台商品", value: `${formatNumber(visibleObjectPlans.length)} 个` },
          { label: "平台计划", value: `${formatNumber(visiblePlatformPlanCount)} 个` },
          { label: "当前定位", value: selectedObjectPlan?.name ?? "--" },
        ];
      default:
        return [];
    }
  }, [
    activeWorkspaceId,
    cognitiveDomain.sessions.length,
    derivedAlerts.length,
    dueSoonVisibleSubscriptions,
    learningFilter,
    selectedLearning?.title,
    selectedObjectAccount?.name,
    selectedObjectPlan?.name,
    selectedOrganization?.name,
    selectedSession?.id,
    visibleBusinessUsageSummary.costValue,
    visibleBusinessUsageSummary.currency,
    visibleBusinessUsageSummary.missingModelCount,
    visibleBusinessUsageSummary.missingProviderCount,
    visibleBusinessUsageSummary.recordedEvents,
    visibleDraftInvoices,
    visibleLearningPending,
    visibleLowConfidenceSessions,
    visibleMarketplaceListings.length,
    visibleMembers,
    visibleObjectBillingAccounts.length,
    visibleObjectOrganizations.length,
    visibleObjectPlans.length,
    visibleOrphanAccounts,
    visiblePlatformPlanCount,
    visiblePointsSalesCents,
    visiblePrivateListings,
    visibleRevenueShares,
    visibleSettledGrossMargin,
  ]);

  function getSubscriptionEdit(subscription: SubscriptionRow) {
    return (
      subscriptionEdits[subscription.id] ?? {
        status: subscription.status,
        seats: String(subscription.seats),
        cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
      }
    );
  }

  function getListingEdit(listing: ListingRow) {
    return (
      listingEdits[listing.id] ?? {
        status: listing.status,
        visibility: listing.visibility,
        priceCents: String(listing.priceCents),
      }
    );
  }

  function getInvoiceEdit(invoice: InvoiceRow) {
    return (
      invoiceEdits[invoice.id] ?? {
        planId: invoice.planId ?? "",
        orderNo: invoice.orderNo ?? "",
      }
    );
  }

  function applyActionLocalPatch(body: PlatformAdminResponseBody) {
    let patched = false;

    if (body.subscription?.id) {
      const subscriptionId = body.subscription.id;
      const draft = subscriptionEdits[subscriptionId];
      const replacedIds = new Set(body.subscription.replacedSubscriptionIds ?? []);
      setOverview((current) => {
        const patchRow = (row: SubscriptionRow) => {
          if (row.id === subscriptionId) {
            return {
              ...row,
              status: body.subscription?.status ?? row.status,
              seats:
                draft && Number.isFinite(Number(draft.seats))
                  ? Math.max(1, Math.round(Number(draft.seats)))
                  : row.seats,
              cancelAtPeriodEnd: draft?.cancelAtPeriodEnd ?? row.cancelAtPeriodEnd,
            };
          }
          if (replacedIds.has(row.id)) {
            return {
              ...row,
              status: "canceled",
              cancelAtPeriodEnd: true,
            };
          }
          return row;
        };

        return {
          ...current,
          domains: {
            ...current.domains,
            business: {
              ...current.domains.business,
              subscriptions: current.domains.business.subscriptions.map(patchRow),
            },
            objects: {
              ...current.domains.objects,
              subscriptions: current.domains.objects.subscriptions.map(patchRow),
            },
          },
        };
      });
      setSubscriptionEdits((current) => {
        if (!(subscriptionId in current)) return current;
        const next = { ...current };
        delete next[subscriptionId];
        return next;
      });
      patched = true;
    }

    if (body.invoice?.id) {
      const invoiceId = body.invoice.id;
      const draft = invoiceEdits[invoiceId];
      setOverview((current) => {
        const nextInvoices = current.domains.business.invoices.map((row) => {
          if (row.id !== invoiceId) return row;

          const nextPlanId = body.invoice?.planId ?? draft?.planId?.trim() ?? row.planId;
          const resolvedPlan =
            current.domains.business.plans.find((plan) => plan.id === nextPlanId) ?? null;
          const nextPlanName = resolvedPlan?.name ?? row.planName;
          const nextStatus = body.invoice?.status ?? row.status;
          const nextOrderNo =
            body.invoice?.orderNo ?? (draft?.orderNo?.trim() ? draft.orderNo.trim() : row.orderNo);

          return {
            ...row,
            status: nextStatus,
            planId: nextPlanId || null,
            planName: nextPlanName,
            planKind: resolvedPlan?.category ?? row.planKind,
            planKindLabel: resolvedPlan?.categoryLabel ?? row.planKindLabel,
            orderNo: nextOrderNo,
            issuedAt: body.invoice?.issuedAt ?? row.issuedAt,
            paidAt: body.invoice?.paidAt ?? row.paidAt,
            isDraft: nextStatus === "draft",
            isUnlinked: !row.isSeeded && !(resolvedPlan?.category && nextPlanName),
          };
        });
        return {
          ...current,
          summary: {
            ...current.summary,
            draftInvoices: nextInvoices.filter((item) => item.status.toLowerCase() === "draft").length,
          },
          domains: {
            ...current.domains,
            business: {
              ...current.domains.business,
              invoices: nextInvoices,
            },
          },
        };
      });
      setInvoiceEdits((current) => {
        if (!(invoiceId in current)) return current;
        const next = { ...current };
        delete next[invoiceId];
        return next;
      });
      patched = true;
    }

    if (body.listing?.id) {
      const listingId = body.listing.id;
      const draft = listingEdits[listingId];
      setOverview((current) => {
        const patchRow = (row: ListingRow) => {
          if (row.id !== listingId) return row;
          const nextVisibility = draft?.visibility ?? row.visibility;
          return {
            ...row,
            status: body.listing?.status ?? row.status,
            visibility: nextVisibility,
            priceCents:
              draft && Number.isFinite(Number(draft.priceCents))
                ? Math.max(0, Math.round(Number(draft.priceCents)))
                : row.priceCents,
            detailHint: buildListingHint({
              installCount: row.installCount,
              visibility: nextVisibility,
              revenueShareCount: row.revenueShareCount,
            }),
          };
        };

        const nextMarketplaceListings = current.domains.marketplace.listings.map(patchRow);
        return {
          ...current,
          domains: {
            ...current.domains,
            marketplace: {
              ...current.domains.marketplace,
              cards: buildMarketplaceCardsFromListings(nextMarketplaceListings),
              listings: nextMarketplaceListings,
            },
            objects: {
              ...current.domains.objects,
              listings: current.domains.objects.listings.map(patchRow),
            },
          },
        };
      });
      setListingEdits((current) => {
        if (!(listingId in current)) return current;
        const next = { ...current };
        delete next[listingId];
        return next;
      });
      patched = true;
    }

    return patched;
  }

  function openWorkspace(workspace: (typeof WORKSPACES)[number]) {
    if (workspace.panel === "objects" && workspace.sectionId === "objects-organizations") {
      navigateToPanel("objects", workspace.sectionId);
      return;
    }
    if (workspace.sectionId) {
      navigateToPanel(workspace.panel, workspace.sectionId);
      return;
    }
    navigateToPanel(workspace.panel);
  }

  function toggleNavSection(sectionId: AdminNavSectionId) {
    if (sectionId === activeNavSection.id) return;
    setCollapsedNavSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  function mergeOverviewPatch(body: PlatformAdminResponseBody) {
    setOverview((current) => {
      if (body.overview) {
        return body.overview;
      }

      return {
        ...current,
        summary: body.summary ?? current.summary,
        domains: {
          ...current.domains,
          business: body.business ?? current.domains.business,
          learning: body.learning ?? current.domains.learning,
          cognitive: body.cognitive ?? current.domains.cognitive,
          marketplace: body.marketplace ?? current.domains.marketplace,
          objects: body.objects
            ? body.objects
            : body.objectsListings
              ? { ...current.domains.objects, listings: body.objectsListings }
              : current.domains.objects,
        },
      };
    });
  }

  async function refreshOverview() {
    const response = await fetch("/api/platform/admin/overview", { cache: "no-store" });
    const body = await readJson(response);
    if (body.overview) {
      mergeOverviewPatch(body);
      setSubscriptionEdits({});
      setListingEdits({});
    }
  }

  async function refreshScopedData(scope: RefreshScope) {
    if (scope === "overview") {
      await refreshOverview();
      setLoadedScopes((prev) => new Set(prev).add("overview"));
      return;
    }

    const endpoint =
      scope === "billing"
        ? "/api/platform/admin/billing?page=1&pageSize=20"
        : scope === "learning"
          ? "/api/platform/admin/learning?page=1&pageSize=20"
          : scope === "marketplace"
            ? "/api/platform/admin/marketplace?page=1&pageSize=20"
            : "/api/platform/admin/organizations?page=1&pageSize=20";

    const response = await fetch(endpoint, { cache: "no-store" });
    const body = await readJson(response);
    mergeOverviewPatch(body);
    setLoadedScopes((prev) => new Set(prev).add(scope));
    if (scope === "billing") {
      setSubscriptionEdits({});
    }
    if (scope === "marketplace") {
      setListingEdits({});
    }
  }

  function panelToScope(panel: AdminPanel): RefreshScope | null {
    if (panel === "business") return "billing";
    if (panel === "learning" || panel === "cognitive") return "learning";
    if (panel === "marketplace") return "marketplace";
    if (panel === "objects") return "objects";
    return null;
  }

  useEffect(() => {
    const scope = panelToScope(activePanel);
    if (!scope || loadedScopes.has(scope)) return;
    let cancelled = false;
    setDomainLoading(true);
    void refreshScopedData(scope)
      .catch((error) => {
        if (cancelled) return;
        setFeedback(error instanceof Error ? error.message : "域数据加载失败");
        setFeedbackTone("error");
      })
      .finally(() => {
        if (!cancelled) setDomainLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在切换域时懒加载
  }, [activePanel, loadedScopes]);

  function runAction<T>(
    action: () => Promise<T>,
    options: {
      successMessage: string;
      refreshScope?: RefreshScope | RefreshScope[];
      applyResult?: (result: T) => void;
    },
  ) {
    startTransition(async () => {
      try {
        setFeedback("正在处理...");
        setFeedbackTone("loading");
        const result = await action();
        options.applyResult?.(result);
        const shouldSkipRefresh =
          typeof result === "object" &&
          result !== null &&
          applyActionLocalPatch(result as PlatformAdminResponseBody);
        const scopes = options.refreshScope
          ? Array.isArray(options.refreshScope)
            ? options.refreshScope
            : [options.refreshScope]
          : [];
        for (const scope of shouldSkipRefresh ? [] : scopes) {
          await refreshScopedData(scope);
        }
        setFeedback(options.successMessage);
        setFeedbackTone("success");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "平台管理动作执行失败");
        setFeedbackTone("error");
      }
    });
  }

  function handleApproveLearning(row: LearningQueueRow) {
    runAction(async () => {
      const response = await fetch("/api/platform/admin/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          status: "approved",
          weightDelta: row.weightDelta ?? 0.08,
        }),
      });
      return readJson(response);
    }, { successMessage: "学习记录已批准", refreshScope: "learning" });
  }

  function handleRejectLearning(row: LearningQueueRow) {
    runAction(async () => {
      const response = await fetch("/api/platform/admin/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          status: "rejected",
          weightDelta: null,
        }),
      });
      return readJson(response);
    }, { successMessage: "学习记录已驳回", refreshScope: "learning" });
  }

  function handleBootstrapSeed() {
    if (!allowBootstrap) {
      setFeedback("生产环境禁止写入演示种子");
      setFeedbackTone("error");
      return;
    }
    runAction(async () => {
      const response = await fetch("/api/platform/admin/bootstrap", {
        method: "POST",
      });
      return readJson(response);
    }, {
      successMessage: "演示数据已补齐（仅非生产）",
      refreshScope: ["overview", "objects", "billing", "marketplace"],
    });
  }

  function handleIssuePasswordReset() {
    runAction(async () => {
      const response = await fetch("/api/platform/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const body = await readJson(response) as PlatformAdminResponseBody & {
        resetUrl?: string;
        expiresAt?: string;
        message?: string;
      };
      setResetUrlPreview(typeof body.resetUrl === "string" ? body.resetUrl : null);
      setResetExpiresAt(typeof body.expiresAt === "string" ? body.expiresAt : null);
      // 60 秒后自动清除完整链接，避免长期展示
      window.setTimeout(() => setResetUrlPreview(null), 60_000);
      return body;
    }, {
      successMessage: "重置链接已签发，请立即复制私发给用户",
    });
  }

  function handleOpenInboxItem(item: AdminInboxItem) {
    if (item.kind === "learning") {
      navigateToLearningItem(item.hrefHash);
      return;
    }
    if (item.kind === "cognitive") {
      navigateToCognitiveSession(item.hrefHash);
      return;
    }
    if (item.kind === "invoice" || item.kind === "usage" || item.kind === "payment") {
      navigateToPanel("business", item.hrefHash);
    }
  }

  function handleCreateOrganization(input: {
    name: string;
    ownerUserId?: string | null;
    planId?: string | null;
    seats?: number;
  }) {
    runAction(async () => {
      const response = await fetch("/api/platform/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          type: "workspace",
          ownerUserId: input.ownerUserId?.trim() || null,
          planId: input.planId?.trim() || null,
          seats: input.planId ? (input.seats ?? 1) : undefined,
        }),
      });
      const body = (await readJson(response)) as PlatformAdminResponseBody & {
        organization?: { id: string; slug?: string; billingAccountId?: string; subscriptionId?: string };
      };
      setOrgName("");
      return body;
    }, {
      successMessage: input.planId ? "组织、账务与订阅已创建" : "组织与账务账户已创建",
      refreshScope: ["objects", "billing"],
    });
  }

  function handleCreatePlan() {
    runAction(async () => {
      const response = await fetch("/api/platform/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_plan",
          code: planCode,
          name: planName,
          priceCents: Number(planPrice || 0),
          billingCycle: "MONTHLY",
          currency: "CNY",
        }),
      });
      const body = await readJson(response);
      setPlanCode("");
      setPlanName("");
      setPlanPrice("0");
      return body;
    }, { successMessage: "计划已创建", refreshScope: "billing" });
  }

  function handleCreateListing() {
    runAction(async () => {
      const response = await fetch("/api/platform/admin/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: listingName,
          slug: listingSlug,
          priceCents: Number(listingPrice || 0),
          currency: "CNY",
          pricingModel: "subscription",
        }),
      });
      const body = await readJson(response);
      setListingName("");
      setListingSlug("");
      setListingPrice("29900");
      return body;
    }, { successMessage: "Listing 已创建", refreshScope: "marketplace" });
  }

  function handleCreateSubscription() {
    runAction(async () => {
      const response = await fetch("/api/platform/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_subscription",
          billingAccountId: selectedBillingAccountId,
          planId: selectedPlanId,
          seats: Number(seats || 1),
        }),
      });
      const body = await readJson(response);
      setSeats("1");
      return body;
    }, { successMessage: "订阅已创建", refreshScope: "billing" });
  }

  function renderActivePanel() {
    switch (activePanel) {
      case "overview":
        return (
          <OverviewPanel
            overview={overview}
            derivedOverviewCards={derivedOverviewCards}
            derivedOverviewQueues={derivedOverviewQueues}
            formatMetricValue={formatMetricValue}
            showEngineeringTools={showEngineeringTools}
            setShowEngineeringTools={setShowEngineeringTools}
            formatDate={formatDate}
            derivedAlerts={derivedAlerts}
            handleOperationalAlertClick={handleOperationalAlertClick}
            businessOperationalAlerts={businessOperationalAlerts}
            formatNumber={formatNumber}
            onOpenInboxItem={handleOpenInboxItem}
          />
        );
      case "business":
        return (
          <BusinessPanel
            activeWorkspaceId={activeWorkspaceId}
            showSeededData={showSeededData}
            hiddenSeededCount={hiddenSeededCount}
            setShowSeededData={setShowSeededData}
            derivedBusinessCards={derivedBusinessCards}
            formatMetricValue={formatMetricValue}
            visibleBusinessPointsOrders={visibleBusinessPointsOrders}
            visibleBusinessConsumptions={visibleBusinessConsumptions}
            visibleBusinessCapabilityPricing={visibleBusinessCapabilityPricing}
            visibleBusinessPlans={visibleBusinessPlans}
            visibleBusinessSubscriptions={visibleBusinessSubscriptions}
            visibleBusinessInvoices={visibleBusinessInvoices}
            visibleBusinessUsageSummary={visibleBusinessUsageSummary}
            visibleBusinessUsageTrend={visibleBusinessUsageTrend}
            visibleBusinessUsageTypes={visibleBusinessUsageTypes}
            visibleBusinessUsageProviders={visibleBusinessUsageProviders}
            visibleBusinessUsageModels={visibleBusinessUsageModels}
            visibleBusinessUsageAnomalies={visibleBusinessUsageAnomalies}
            visibleUsageMetadataAnomalyCount={visibleUsageMetadataAnomalyCount}
            visibleUsageBillableWithoutCostCount={visibleUsageBillableWithoutCostCount}
            visibleUsageHighTokenUnbillableCount={visibleUsageHighTokenUnbillableCount}
            filteredBusinessUsageAnomalies={filteredBusinessUsageAnomalies}
            selectedUsageAnomaly={selectedUsageAnomaly}
            visibleSettledConsumptionPoints={visibleSettledConsumptionPoints}
            visibleCostCoveragePercent={visibleCostCoveragePercent}
            businessOperationalAlerts={businessOperationalAlerts}
            usageAnomalyFilter={usageAnomalyFilter}
            setUsageAnomalyFilter={setUsageAnomalyFilter}
            capabilityConsumptionSummaries={capabilityConsumptionSummaries}
            topConsumptionCapability={topConsumptionCapability}
            lowestMarginCapability={lowestMarginCapability}
            getSubscriptionEdit={getSubscriptionEdit}
            setSubscriptionEdits={setSubscriptionEdits}
            getInvoiceEdit={getInvoiceEdit}
            setInvoiceEdits={setInvoiceEdits}
            runAction={runAction}
            readJson={readJson}
            isPending={isPending}
            formatDate={formatDate}
            formatNumber={formatNumber}
            formatMoney={formatMoney}
            formatMoneyValue={formatMoneyValue}
            formatBillingCycle={formatBillingCycle}
            statusChipTone={statusChipTone}
            jumpWithinBusiness={jumpWithinBusiness}
            handleUsageAnomalySelect={handleUsageAnomalySelect}
          />
        );
      case "marketplace":
        return (
          <MarketplacePanel
            showSeededData={showSeededData}
            hiddenSeededCount={hiddenSeededCount}
            setShowSeededData={setShowSeededData}
            derivedMarketplaceCards={derivedMarketplaceCards}
            formatMetricValue={formatMetricValue}
            visibleMarketplaceListings={visibleMarketplaceListings}
            getListingEdit={getListingEdit}
            setListingEdits={setListingEdits}
            runAction={runAction}
            readJson={readJson}
            isPending={isPending}
            formatNumber={formatNumber}
            formatListingRating={formatListingRating}
            statusChipTone={statusChipTone}
          />
        );
      case "learning":
        return (
          <LearningPanel
            showSeededData={showSeededData}
            learningDomain={learningDomain}
            derivedLearningCards={derivedLearningCards}
            filteredLearningQueue={filteredLearningQueue}
            learningFilter={learningFilter}
            setLearningFilter={setLearningFilter}
            selectedLearning={selectedLearning}
            isPending={isPending}
            formatMetricValue={formatMetricValue}
            formatNumber={formatNumber}
            formatScore={formatScore}
            statusChipTone={statusChipTone}
            priorityTone={priorityTone}
            formatSignedDelta={formatSignedDelta}
            formatDate={formatDate}
            navigateToLearningItem={navigateToLearningItem}
            askConfirm={askConfirm}
            onApproveLearning={handleApproveLearning}
            onRejectLearning={handleRejectLearning}
          />
        );
      case "cognitive":
        return (
          <CognitivePanel
            showSeededData={showSeededData}
            cognitiveDomain={cognitiveDomain}
            derivedCognitiveCards={derivedCognitiveCards}
            formatMetricValue={formatMetricValue}
            selectedSession={selectedSession}
            navigateToCognitiveSession={navigateToCognitiveSession}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
            priorityTone={priorityTone}
            statusChipTone={statusChipTone}
          />
        );
      case "objects":
        return (
          <ObjectsPanel
            activeWorkspaceId={activeWorkspaceId}
            showSeededData={showSeededData}
            hiddenSeededCount={hiddenSeededCount}
            setShowSeededData={setShowSeededData}
            isPending={isPending}
            derivedObjectsCards={derivedObjectsCards}
            visibleObjectBillingAccounts={visibleObjectBillingAccounts}
            selectedObjectAccount={selectedObjectAccount}
            visibleObjectPlans={visibleObjectPlans}
            selectedObjectPlan={selectedObjectPlan}
            visibleObjectOrganizations={visibleObjectOrganizations}
            selectedOrganization={selectedOrganization}
            orgName={orgName}
            setOrgName={setOrgName}
            planCode={planCode}
            setPlanCode={setPlanCode}
            planName={planName}
            setPlanName={setPlanName}
            planPrice={planPrice}
            setPlanPrice={setPlanPrice}
            listingName={listingName}
            setListingName={setListingName}
            listingSlug={listingSlug}
            setListingSlug={setListingSlug}
            listingPrice={listingPrice}
            setListingPrice={setListingPrice}
            selectedBillingAccountId={selectedBillingAccountId}
            setSelectedBillingAccountId={setSelectedBillingAccountId}
            selectedPlanId={selectedPlanId}
            setSelectedPlanId={setSelectedPlanId}
            seats={seats}
            setSeats={setSeats}
            canCreateSubscription={canCreateSubscription}
            formatMetricValue={formatMetricValue}
            formatNumber={formatNumber}
            formatDate={formatDate}
            formatBillingCycle={formatBillingCycle}
            formatMoney={formatMoney}
            statusChipTone={statusChipTone}
            navigateToObject={navigateToObject}
            askConfirm={askConfirm}
            runAction={runAction}
            allowBootstrap={allowBootstrap}
            onBootstrap={handleBootstrapSeed}
            onCreateOrganization={handleCreateOrganization}
            onCreatePlan={handleCreatePlan}
            onCreateListing={handleCreateListing}
            onCreateSubscription={handleCreateSubscription}
            resetEmail={resetEmail}
            setResetEmail={setResetEmail}
            resetUrlPreview={resetUrlPreview}
            resetExpiresAt={resetExpiresAt}
            onIssuePasswordReset={handleIssuePasswordReset}
            onClearResetPreview={() => {
              setResetUrlPreview(null);
              setResetExpiresAt(null);
            }}
          />
        );
      default:
        return null;
    }
  }

  return (
    <PlatformAdminConsoleShell
      domainLoading={domainLoading}
      confirmOpen={confirmOpen}
      confirmTitle={confirmTitle}
      confirmDescription={confirmDescription}
      isPending={isPending}
      onCancelConfirm={() => {
        setConfirmOpen(false);
        setConfirmAction(null);
      }}
      onConfirmConfirm={() => {
        const action = confirmAction;
        setConfirmOpen(false);
        setConfirmAction(null);
        action?.();
      }}
      activePanel={activePanel}
      activePanelMeta={activePanelMeta}
      activeNavSection={activeNavSection}
      activeWorkspace={activeWorkspace}
      activeSectionWorkspaces={activeSectionWorkspaces}
      activeWorkspaceId={activeWorkspaceId}
      activeWorkspaceContextItems={activeWorkspaceContextItems}
      derivedHeaderCards={derivedHeaderCards}
      derivedAlerts={derivedAlerts}
      interactiveAlertIds={businessOperationalAlerts.map((alert) => alert.id)}
      navBadgeByPanel={navBadgeByPanel}
      navBadgeByWorkspace={navBadgeByWorkspace}
      sectionSummaryById={sectionSummaryById}
      collapsedNavSections={collapsedNavSections}
      sidebarQuickQueues={sidebarQuickQueues}
      feedback={feedback}
      feedbackTone={feedbackTone}
      feedbackClassName={feedbackStyle(feedbackTone)}
      generatedAt={overview.generatedAt}
      formatMetricValue={formatMetricValue}
      formatNumber={formatNumber}
      formatDate={formatDate}
      onRefreshOverview={() => {
        runAction(async () => undefined, { successMessage: "平台概览已刷新", refreshScope: "overview" });
      }}
      onAlertClick={handleOperationalAlertClick}
      onOpenInboxItem={handleOpenInboxItem}
      onNavigateToPanel={navigateToPanel}
      onToggleNavSection={toggleNavSection}
      onOpenWorkspace={openWorkspace}
      panelBoundaryKey={panelBoundaryKey}
      onResetPanelBoundary={() => setPanelBoundaryKey((current) => current + 1)}
    >
      {renderActivePanel()}
    </PlatformAdminConsoleShell>
  );
}
