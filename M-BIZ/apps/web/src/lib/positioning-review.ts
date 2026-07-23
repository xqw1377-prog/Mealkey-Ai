/**
 * Positioning change → related decision re-review helpers
 */

export type ReviewQueueItem = {
  decisionId: string;
  problem: string;
  judgement: string;
  type: string;
  reason: string;
  flaggedAt: string;
  status: "pending" | "dismissed" | "reviewed";
  positioningDecisionId?: string;
  previousOneLiner?: string;
  newOneLiner?: string;
};

/** Decision types that are sensitive to brand positioning shifts */
export const POSITIONING_SENSITIVE_TYPES = new Set([
  "location",
  "investment",
  "marketing",
  "product",
  "branding",
  "general",
  "risk",
]);

export function isPositioningSensitiveType(type: string | null | undefined): boolean {
  if (!type) return true;
  if (type === "positioning") return false;
  return POSITIONING_SENSITIVE_TYPES.has(type) || type === "general";
}

export function buildReviewReason(args: {
  previousOneLiner?: string | null;
  newOneLiner: string;
  decisionType?: string;
}): string {
  const prev = args.previousOneLiner?.trim();
  if (prev) {
    return `品牌定位已从「${truncate(prev, 40)}」调整为「${truncate(args.newOneLiner, 40)}」，此${typeLabel(args.decisionType)}判断可能依赖旧定位，建议复审。`;
  }
  return `品牌定位已更新为「${truncate(args.newOneLiner, 40)}」，建议复审此相关经营判断是否仍成立。`;
}

export function mergeReviewQueue(
  existing: ReviewQueueItem[] | unknown,
  incoming: ReviewQueueItem[],
  max = 30,
): ReviewQueueItem[] {
  const prev = Array.isArray(existing)
    ? (existing as ReviewQueueItem[]).filter((i) => i && i.decisionId)
    : [];
  const byId = new Map<string, ReviewQueueItem>();
  for (const item of prev) {
    byId.set(item.decisionId, item);
  }
  for (const item of incoming) {
    const old = byId.get(item.decisionId);
    // Don't re-open dismissed unless force new flag (we overwrite with pending on new positioning)
    byId.set(item.decisionId, {
      ...old,
      ...item,
      status: "pending",
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => (a.flaggedAt < b.flaggedAt ? 1 : -1))
    .slice(0, max);
}

export function dismissReviewItem(
  queue: ReviewQueueItem[] | unknown,
  decisionId: string,
  status: "dismissed" | "reviewed" = "dismissed",
): ReviewQueueItem[] {
  const list = Array.isArray(queue) ? (queue as ReviewQueueItem[]) : [];
  return list.map((item) =>
    item.decisionId === decisionId
      ? { ...item, status, flaggedAt: item.flaggedAt }
      : item,
  );
}

export function pendingReviewCount(queue: ReviewQueueItem[] | unknown): number {
  if (!Array.isArray(queue)) return 0;
  return (queue as ReviewQueueItem[]).filter((i) => i.status === "pending").length;
}

function typeLabel(type?: string): string {
  const map: Record<string, string> = {
    location: "选址",
    investment: "投资",
    marketing: "营销",
    product: "产品",
    branding: "品牌",
    risk: "风险",
    general: "经营",
  };
  return (type && map[type]) || "经营";
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
