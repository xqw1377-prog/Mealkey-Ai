"use client";

import type { ListingRow, PlanRow, PlatformAdminAlert, PlatformAdminMetric } from "@/server/services/platform-admin.service";
import { formatDate as formatDateShared, formatNumber as formatNumberShared } from "@/lib/format";

export const SEEDED_FILTER_STORAGE_KEY = "mealkey-platform-admin-show-seeded-data";

export function formatNumber(value: number | null | undefined) {
  const next = formatNumberShared(value);
  return next === "—" ? "--" : next;
}

export function formatMetricValue(metric: PlatformAdminMetric) {
  if (metric.value === null || Number.isNaN(metric.value)) return "--";
  if (metric.unit === "%") return `${metric.value}%`;
  if (metric.unit === "元") return `${formatNumber(metric.value)} 元`;
  if (metric.unit === "/100") return `${metric.value} / 100`;
  return formatNumber(metric.value);
}

export function formatMoney(cents: number | null | undefined, currency = "CNY") {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "--";
  const amount = cents / 100;
  return `${currency === "CNY" ? "¥" : `${currency} `}${amount.toFixed(2)}`;
}

export function formatMoneyValue(amount: number | null | undefined, currency = "USD", digits = 4) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "--";
  return `${currency === "CNY" ? "¥" : `${currency} `}${amount.toFixed(digits)}`;
}

export function formatDate(value: string | null | undefined) {
  const next = formatDateShared(value, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return next === "—" ? "--" : next;
}

export function readPersistedSeededFilter() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SEEDED_FILTER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePersistedSeededFilter(next: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEDED_FILTER_STORAGE_KEY, next ? "1" : "0");
  } catch {}
}

export function formatPercent(value: number | null | undefined, digits = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value * 100)} / 100`;
}

export function formatListingRating(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value * 20)} / 100`;
}

export function formatSignedDelta(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function formatBillingCycle(plan: PlanRow) {
  if (plan.category === "points_pack" || plan.category === "specialty_pack" || plan.category === "balance_credit") {
    return "一次性购买";
  }
  if (plan.billingCycle === "MONTHLY") return "按月";
  if (plan.billingCycle === "YEARLY") return "按年";
  return plan.billingCycle;
}

export function feedbackStyle(tone: "idle" | "loading" | "success" | "error") {
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

export function statusChipTone(status: string) {
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

export function priorityTone(priority: "high" | "medium" | "low") {
  if (priority === "high") return "bg-[rgba(180,124,92,0.12)] text-[#8A5A40]";
  if (priority === "medium") return "bg-[rgba(186,160,92,0.10)] text-[#7A6941]";
  return "bg-[rgba(102,115,94,0.10)] text-[#465240]";
}

export function alertSeverityRank(severity: PlatformAdminAlert["severity"]) {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

export function upsertById<T extends { id: string }>(rows: T[], nextRow: T, insertAtStart = false) {
  const existingIndex = rows.findIndex((row) => row.id === nextRow.id);
  if (existingIndex === -1) {
    return insertAtStart ? [nextRow, ...rows] : [...rows, nextRow];
  }

  return rows.map((row) => (row.id === nextRow.id ? nextRow : row));
}

export function buildListingHint(listing: {
  installCount: number;
  visibility: string;
  revenueShareCount: number;
}) {
  if (listing.installCount === 0) return "尚未形成安装转化，建议先检查曝光与定价。";
  if (listing.visibility !== "public") return "当前为非公开上架，仅内部或定向可见。";
  if (listing.revenueShareCount === 0) return "缺少分润规则，商业闭环未完整。";
  return "已具备上架与分润基础，可继续优化转化。";
}

export function buildMarketplaceCardsFromListings(listings: ListingRow[]): PlatformAdminMetric[] {
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

export async function readJson<T extends { ok?: boolean; error?: string } = { ok?: boolean; error?: string }>(
  response: Response,
) {
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
