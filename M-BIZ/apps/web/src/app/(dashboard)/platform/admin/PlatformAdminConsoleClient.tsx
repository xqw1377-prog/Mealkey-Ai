"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, BookMarked, Building2, Coins, Cpu, GraduationCap, Layers3, ReceiptText, RefreshCcw } from "lucide-react";

type PlatformAdminOverview = {
  summary: {
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
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    type: string;
    createdAt: string;
    memberCount: number;
    projectCount: number;
    billingAccountCount: number;
  }>;
  plans: Array<{
    id: string;
    code: string;
    name: string;
    billingCycle: string;
    priceCents: number;
    currency: string;
    includedTokens: number;
    includedRuns: number;
    status: string;
  }>;
  billingAccounts: Array<{
    id: string;
    name: string;
    status: string;
    currency: string;
    organizationName: string | null;
    ownerId: string | null;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    seats: number;
    startedAt: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: number | boolean;
    planName: string | null;
    billingAccountName: string | null;
    organizationName: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    total: string;
    currency: string;
    billingAccountName: string | null;
    createdAt: string;
  }>;
  listings: Array<{
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
  }>;
  learningQueue: Array<{
    id: string;
    title: string;
    status: string;
    sourceType: string;
    weightDelta: number | null;
    createdAt: string;
    verdict: string | null;
    score: number | null;
    problem: string | null;
  }>;
  cognitiveSessions: Array<{
    id: string;
    status: string;
    source: string;
    createdAt: string;
    decisionId: string | null;
    overall: number | null;
    traceCount: number;
    evidenceCount: number;
  }>;
};

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatMoney(cents: number | null | undefined, currency = "CNY") {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "--";
  const amount = cents / 100;
  return `${currency === "CNY" ? "¥" : `${currency} `}${amount.toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function readJson(response: Response) {
  const body = (await response.json()) as { ok?: boolean; error?: string; overview?: PlatformAdminOverview };
  if (!response.ok || body.ok === false) {
    throw new Error(body.error || "平台管理请求失败");
  }
  return body;
}

type FeedbackTone = "idle" | "loading" | "success" | "error";

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
  if (normalized === "active" || normalized === "approved" || normalized === "pass") {
    return "bg-[rgba(102,115,94,0.10)] text-[#465240]";
  }
  if (normalized === "pending" || normalized === "review" || normalized === "draft") {
    return "bg-[rgba(186,160,92,0.10)] text-[#7A6941]";
  }
  return "bg-[rgba(180,124,92,0.10)] text-[#8A5A40]";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-medium leading-5 tracking-[0.01em] text-[#6f747b]">{children}</p>;
}

export function PlatformAdminConsoleClient({ initialOverview }: { initialOverview: PlatformAdminOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("idle");
  const [learningFilter, setLearningFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
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
  const [subscriptionEdits, setSubscriptionEdits] = useState<
    Record<string, { status: string; seats: string; cancelAtPeriodEnd: boolean }>
  >({});
  const [listingEdits, setListingEdits] = useState<
    Record<string, { status: string; visibility: string; priceCents: string }>
  >({});
  const [isPending, startTransition] = useTransition();

  const canCreateSubscription = useMemo(
    () => !!selectedBillingAccountId && !!selectedPlanId,
    [selectedBillingAccountId, selectedPlanId],
  );
  const filteredLearningQueue = useMemo(() => {
    if (learningFilter === "all") return overview.learningQueue;
    return overview.learningQueue.filter((item) => item.status.toLowerCase() === learningFilter);
  }, [learningFilter, overview.learningQueue]);

  function getSubscriptionEdit(subscription: PlatformAdminOverview["subscriptions"][number]) {
    return (
      subscriptionEdits[subscription.id] ?? {
        status: subscription.status,
        seats: String(subscription.seats),
        cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
      }
    );
  }

  function getListingEdit(listing: PlatformAdminOverview["listings"][number]) {
    return (
      listingEdits[listing.id] ?? {
        status: listing.status,
        visibility: listing.visibility,
        priceCents: String(listing.priceCents),
      }
    );
  }

  async function refreshOverview() {
    const response = await fetch("/api/platform/admin/overview", { cache: "no-store" });
    const body = await readJson(response);
    if (body.overview) {
      setOverview(body.overview);
      setSubscriptionEdits({});
      setListingEdits({});
    }
  }

  function runAction(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        setFeedback("正在处理...");
        setFeedbackTone("loading");
        await action();
        await refreshOverview();
        setFeedback(successMessage);
        setFeedbackTone("success");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "平台管理动作执行失败");
        setFeedbackTone("error");
      }
    });
  }

  return (
    <div className="space-y-5 pb-2">
      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">操作台</p>
            <h2 className="mt-1 text-[22px] leading-[1.15] tracking-[-0.03em] text-[#202124] md:text-[28px]">
              先完成对象动作，再看下面的结果回流
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              这里集中处理组织、计划、订阅、上架和学习复核，所有动作完成后会自动刷新下方对象概览。
            </p>
          </div>
          <div className="inline-flex min-h-10 items-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[13px] font-medium text-[#202124]">
            账户 {formatNumber(overview.summary.billingAccounts)} · 分润 {formatNumber(overview.summary.revenueShares)}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <form
          className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
          onSubmit={(event) => {
            event.preventDefault();
            runAction(async () => {
              const response = await fetch("/api/platform/admin/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: orgName, type: "workspace" }),
              });
              await readJson(response);
              setOrgName("");
            }, "组织已创建");
          }}
        >
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Quick Action</p>
          <h2 className="mt-1 text-[16px] font-semibold text-[#202124]">创建组织</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">先建平台工作空间，后续账务和成员都会挂在这里。</p>
          <div className="mt-4 space-y-2">
            <FieldLabel>组织名称</FieldLabel>
            <input
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="例如：MealKey North China"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !orgName.trim()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            新建工作空间
          </button>
        </form>

        <form
          className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
          onSubmit={(event) => {
            event.preventDefault();
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
              await readJson(response);
              setPlanCode("");
              setPlanName("");
              setPlanPrice("0");
            }, "计划已创建");
          }}
        >
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Quick Action</p>
          <h2 className="mt-1 text-[16px] font-semibold text-[#202124]">创建计划</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">定义平台商品层，订阅和开票都会引用这条计划。</p>
          <div className="mt-4 grid gap-2">
            <FieldLabel>计划编码</FieldLabel>
            <input
              value={planCode}
              onChange={(event) => setPlanCode(event.target.value)}
              placeholder="growth_plus"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
            <FieldLabel>计划名称</FieldLabel>
            <input
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              placeholder="计划名称"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
            <FieldLabel>价格（分）</FieldLabel>
            <input
              value={planPrice}
              onChange={(event) => setPlanPrice(event.target.value)}
              placeholder="29900"
              inputMode="numeric"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !planCode.trim() || !planName.trim()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            新建计费计划
          </button>
        </form>

        <form
          className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
          onSubmit={(event) => {
            event.preventDefault();
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
              await readJson(response);
              setListingName("");
              setListingSlug("");
              setListingPrice("29900");
            }, "Listing 已创建");
          }}
        >
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Quick Action</p>
          <h2 className="mt-1 text-[16px] font-semibold text-[#202124]">创建 Listing</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">把平台能力包装成可上架对象，后面继续接分润与编辑。</p>
          <div className="mt-4 grid gap-2">
            <FieldLabel>Listing 名称</FieldLabel>
            <input
              value={listingName}
              onChange={(event) => setListingName(event.target.value)}
              placeholder="Listing 名称"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
            <FieldLabel>Slug</FieldLabel>
            <input
              value={listingSlug}
              onChange={(event) => setListingSlug(event.target.value)}
              placeholder="slug（可选）"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
            <FieldLabel>价格（分）</FieldLabel>
            <input
              value={listingPrice}
              onChange={(event) => setListingPrice(event.target.value)}
              placeholder="29900"
              inputMode="numeric"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !listingName.trim()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            新建上架对象
          </button>
        </form>

        <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Quick Action</p>
          <h2 className="mt-1 text-[16px] font-semibold text-[#202124]">创建订阅</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">从已有账户和计划里直接绑定，先跑通平台商业闭环。</p>
          <div className="mt-4 grid gap-2">
            <FieldLabel>Billing Account</FieldLabel>
            <select
              value={selectedBillingAccountId}
              onChange={(event) => setSelectedBillingAccountId(event.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            >
              <option value="">选择 Billing Account</option>
              {overview.billingAccounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.organizationName ?? item.name}
                </option>
              ))}
            </select>
            <FieldLabel>Plan</FieldLabel>
            <select
              value={selectedPlanId}
              onChange={(event) => setSelectedPlanId(event.target.value)}
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            >
              <option value="">选择 Plan</option>
              {overview.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            <FieldLabel>席位数</FieldLabel>
            <input
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
              placeholder="1"
              inputMode="numeric"
              className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() =>
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
                await readJson(response);
                setSeats("1");
              }, "订阅已创建")
            }
            disabled={isPending || !canCreateSubscription}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            绑定订阅
          </button>
        </div>
      </section>

      <div className={`flex flex-col gap-3 rounded-[18px] border px-4 py-3 transition md:flex-row md:items-center md:justify-between ${feedbackStyle(feedbackTone)}`}>
        <div>
          <p className="text-[12px] font-medium leading-5 tracking-[0.01em]">系统反馈</p>
          <p className="text-[14px] leading-6">{feedback ?? "平台管理动作已经接上，这里会直接回显执行结果。"}</p>
        </div>
        <button
          type="button"
          onClick={() => runAction(refreshOverview, "平台概览已刷新")}
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124] disabled:opacity-50"
        >
          <RefreshCcw className="h-4 w-4" />
          刷新概览
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "组织", value: overview.summary.organizations, icon: Building2 },
          { label: "订阅", value: overview.summary.activeSubscriptions, icon: Coins },
          { label: "账单草稿", value: overview.summary.draftInvoices, icon: ReceiptText },
          { label: "商城上架", value: overview.summary.activeListings, icon: Layers3 },
          { label: "学习待审", value: overview.summary.learningPending, icon: GraduationCap },
          { label: "认知会话", value: overview.summary.cognitiveSessions, icon: Cpu },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">{item.label}</p>
              <item.icon className="h-4 w-4 text-[#66735E]" />
            </div>
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
              {formatNumber(item.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">对象概览</p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">下面看对象层是否真的长出来</h2>
          </div>
          <p className="text-[13px] leading-5 text-[#6f747b]">
            Evaluation {formatNumber(overview.summary.evaluationResults)} · Revenue Share {formatNumber(overview.summary.revenueShares)}
          </p>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Organizations</p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">组织与工作空间</h2>
              </div>
              <span className="text-[13px] text-[#6f747b]">{formatNumber(overview.summary.members)} 名成员</span>
            </div>

            <div className="mt-5 space-y-3">
              {overview.organizations.map((item) => (
                <div key={item.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#202124]">{item.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">{item.slug}</span>
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">{item.type}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>{item.status}</span>
                      </div>
                    </div>
                    <div className="text-[12px] leading-5 text-[#6f747b]">{formatDate(item.createdAt)}</div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[12px] bg-white px-3 py-2 text-[13px] text-[#202124]">成员 {formatNumber(item.memberCount)}</div>
                    <div className="rounded-[12px] bg-white px-3 py-2 text-[13px] text-[#202124]">项目 {formatNumber(item.projectCount)}</div>
                    <div className="rounded-[12px] bg-white px-3 py-2 text-[13px] text-[#202124]">账务账户 {formatNumber(item.billingAccountCount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Billing</p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">计划、订阅与账单</h2>
            </div>

            <div className="mt-5 grid gap-3">
              {overview.plans.map((plan) => (
                <div key={plan.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-[#202124]">{plan.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">{plan.code}</span>
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">{plan.billingCycle}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(plan.status)}`}>{plan.status}</span>
                      </div>
                    </div>
                    <div className="text-[14px] font-medium text-[#202124]">{formatMoney(plan.priceCents, plan.currency)}</div>
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-[#6f747b]">
                    token {formatNumber(plan.includedTokens)} / run {formatNumber(plan.includedRuns)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {overview.subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex flex-col gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3">
                  <p className="text-[14px] font-medium text-[#202124]">
                    {subscription.organizationName ?? "未绑定组织"} · {subscription.planName ?? "未知计划"}
                  </p>
                  <p className="text-[13px] leading-5 text-[#6f747b]">
                    {subscription.billingAccountName ?? "未绑定账户"} · seats {formatNumber(subscription.seats)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(subscription.status)}`}>{subscription.status}</span>
                    <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">
                      到期 {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      value={getSubscriptionEdit(subscription).status}
                      onChange={(event) =>
                        setSubscriptionEdits((current) => ({
                          ...current,
                          [subscription.id]: {
                            ...getSubscriptionEdit(subscription),
                            status: event.target.value,
                          },
                        }))
                      }
                      className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-2 text-[13px] text-[#202124] outline-none"
                    >
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="canceled">canceled</option>
                    </select>
                    <input
                      value={getSubscriptionEdit(subscription).seats}
                      onChange={(event) =>
                        setSubscriptionEdits((current) => ({
                          ...current,
                          [subscription.id]: {
                            ...getSubscriptionEdit(subscription),
                            seats: event.target.value,
                          },
                        }))
                      }
                      inputMode="numeric"
                      placeholder="席位数"
                      className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-2 text-[13px] text-[#202124] outline-none"
                    />
                    <label className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-2 text-[13px] text-[#202124]">
                      <input
                        type="checkbox"
                        checked={getSubscriptionEdit(subscription).cancelAtPeriodEnd}
                        onChange={(event) =>
                          setSubscriptionEdits((current) => ({
                            ...current,
                            [subscription.id]: {
                              ...getSubscriptionEdit(subscription),
                              cancelAtPeriodEnd: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span>到期取消</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        const draft = getSubscriptionEdit(subscription);
                        const response = await fetch("/api/platform/admin/billing", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "update_subscription",
                            id: subscription.id,
                            status: draft.status,
                            seats: Number(draft.seats || subscription.seats),
                            cancelAtPeriodEnd: draft.cancelAtPeriodEnd,
                          }),
                        });
                        await readJson(response);
                      }, "订阅已更新")
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    保存订阅状态
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {overview.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#202124]">{invoice.invoiceNo}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">
                        {invoice.billingAccountName ?? "未绑定账户"}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(invoice.status)}`}>{invoice.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-medium text-[#202124]">
                      {invoice.currency} {invoice.total}
                    </p>
                    <p className="text-[12px] leading-5 text-[#6f747b]">{formatDate(invoice.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Marketplace</p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">上架与分润</h2>
              </div>
              <BookMarked className="h-4 w-4 text-[#66735E]" />
            </div>

            <div className="mt-5 space-y-3">
              {overview.listings.map((listing) => (
                <div key={listing.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-[#202124]">{listing.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">{listing.slug}</span>
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">{listing.visibility}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(listing.status)}`}>{listing.status}</span>
                      </div>
                    </div>
                    <p className="text-[14px] font-medium text-[#202124]">{formatMoney(listing.priceCents, listing.currency)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[12px] bg-white px-3 py-2 text-[13px] text-[#202124]">安装 {formatNumber(listing.installCount)}</div>
                    <div className="rounded-[12px] bg-white px-3 py-2 text-[13px] text-[#202124]">评分 {listing.rating}</div>
                    <div className="rounded-[12px] bg-white px-3 py-2 text-[13px] text-[#202124]">分润规则 {formatNumber(listing.revenueShareCount)}</div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <select
                      value={getListingEdit(listing).status}
                      onChange={(event) =>
                        setListingEdits((current) => ({
                          ...current,
                          [listing.id]: {
                            ...getListingEdit(listing),
                            status: event.target.value,
                          },
                        }))
                      }
                      className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    >
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="paused">paused</option>
                    </select>
                    <select
                      value={getListingEdit(listing).visibility}
                      onChange={(event) =>
                        setListingEdits((current) => ({
                          ...current,
                          [listing.id]: {
                            ...getListingEdit(listing),
                            visibility: event.target.value,
                          },
                        }))
                      }
                      className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    >
                      <option value="public">public</option>
                      <option value="private">private</option>
                    </select>
                    <input
                      value={getListingEdit(listing).priceCents}
                      onChange={(event) =>
                        setListingEdits((current) => ({
                          ...current,
                          [listing.id]: {
                            ...getListingEdit(listing),
                            priceCents: event.target.value,
                          },
                        }))
                      }
                      inputMode="numeric"
                      placeholder="价格（分）"
                      className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        const draft = getListingEdit(listing);
                        const response = await fetch("/api/platform/admin/marketplace", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "update_listing",
                            id: listing.id,
                            status: draft.status,
                            visibility: draft.visibility,
                            priceCents: Number(draft.priceCents || listing.priceCents),
                          }),
                        });
                        await readJson(response);
                      }, "Listing 已更新")
                    }
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    保存上架状态
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Learning Review</p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">学习复核队列</h2>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: "all", label: `全部 ${overview.learningQueue.length}` },
                { key: "pending", label: `待审 ${overview.learningQueue.filter((item) => item.status === "pending").length}` },
                { key: "approved", label: `通过 ${overview.learningQueue.filter((item) => item.status === "approved").length}` },
                { key: "rejected", label: `驳回 ${overview.learningQueue.filter((item) => item.status === "rejected").length}` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setLearningFilter(item.key as "all" | "pending" | "approved" | "rejected")}
                  className={`inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium transition ${
                    learningFilter === item.key
                      ? "bg-[#181817] text-white"
                      : "border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] text-[#5f6368]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {filteredLearningQueue.map((item) => (
                <div key={item.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#202124]">{item.title}</p>
                      <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                        {item.problem ?? "未绑定判断"} · {item.sourceType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`inline-flex rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>{item.status}</p>
                      <p className="text-[12px] text-[#6f747b]">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-[#6f747b]">
                    verdict {item.verdict ?? "--"} · score {item.score ?? "--"} · weight {item.weightDelta ?? "--"}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => {
                          const response = await fetch("/api/platform/admin/learning", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: item.id,
                              status: "approved",
                              weightDelta: item.weightDelta ?? 0.08,
                            }),
                          });
                          await readJson(response);
                        }, "学习记录已批准")
                      }
                      className="inline-flex min-h-10 items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                    >
                      批准
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => {
                          const response = await fetch("/api/platform/admin/learning", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: item.id,
                              status: "rejected",
                              weightDelta: null,
                            }),
                          });
                          await readJson(response);
                        }, "学习记录已驳回")
                      }
                      className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124] disabled:opacity-50"
                    >
                      驳回
                    </button>
                  </div>
                </div>
              ))}
              {filteredLearningQueue.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FCFBF8] px-4 py-6 text-[13px] leading-6 text-[#6f747b]">
                  当前筛选下没有学习记录。
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Cognitive Kernel</p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">认知会话</h2>
            </div>

            <div className="mt-5 space-y-3">
              {overview.cognitiveSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-2 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-medium text-[#202124]">{session.id}</p>
                    <p className="text-[12px] text-[#6f747b]">{formatDate(session.createdAt)}</p>
                  </div>
                  <p className="text-[13px] leading-5 text-[#6f747b]">
                    {session.status} · {session.source} · decision {session.decisionId ?? "--"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(session.status)}`}>{session.status}</span>
                    <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">
                      trace {formatNumber(session.traceCount)}
                    </span>
                    <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">
                      evidence {formatNumber(session.evidenceCount)}
                    </span>
                    <span className="rounded-full bg-[rgba(102,115,94,0.10)] px-2.5 py-1 text-[12px] text-[#465240]">
                      confidence {session.overall ?? "--"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2">
              <Link
                href="/platform"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition active:scale-[0.98]"
              >
                <span>回到平台观测</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition active:scale-[0.98]"
              >
                <span>回到今日</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
