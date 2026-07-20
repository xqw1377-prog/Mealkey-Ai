"use client";

import { useEffect, useState } from "react";

import type { AdminInboxItem, AdminInboxKind } from "@/server/services/platform-admin-inbox.service";

type InboxFilter = AdminInboxKind | "all";

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "learning", label: "学习" },
  { id: "invoice", label: "发票" },
  { id: "cognitive", label: "认知" },
  { id: "usage", label: "用量" },
];

function priorityLabel(priority: AdminInboxItem["priority"]) {
  if (priority === "high") return "高优先";
  if (priority === "medium") return "跟进";
  return "观察";
}

function priorityClass(priority: AdminInboxItem["priority"]) {
  if (priority === "high") return "bg-[rgba(180,124,92,0.12)] text-[#8A5A40]";
  if (priority === "medium") return "bg-[rgba(186,160,92,0.10)] text-[#7A6941]";
  return "bg-[rgba(24,24,23,0.06)] text-[#6f747b]";
}

export function AdminInbox({
  onOpenItem,
  compact = false,
}: {
  onOpenItem: (item: AdminInboxItem) => void;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [items, setItems] = useState<AdminInboxItem[]>([]);
  const [counts, setCounts] = useState<Partial<Record<AdminInboxKind, number>>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = compact ? 8 : 12;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/platform/admin/inbox?kind=${filter}&page=${page}&pageSize=${pageSize}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const body = (await res.json()) as {
          ok?: boolean;
          error?: string;
          items?: AdminInboxItem[];
          pagination?: { total: number };
          counts?: Record<AdminInboxKind, number>;
        };
        if (!res.ok || body.ok === false) {
          throw new Error(body.error || "待办加载失败");
        }
        if (cancelled) return;
        setItems(body.items ?? []);
        setTotal(body.pagination?.total ?? 0);
        setCounts(body.counts ?? {});
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "待办加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          const count =
            item.id === "all"
              ? Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)
              : counts[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFilter(item.id);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-[12px] transition ${
                active
                  ? "bg-[#181817] text-white"
                  : "border border-[rgba(24,24,23,0.08)] bg-white text-[#5f6368]"
              }`}
            >
              {item.label}
              {count > 0 ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-[13px] text-[#6f747b]">正在加载统一待办…</p>
      ) : null}
      {error ? <p className="text-[13px] text-[#8A5A40]">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-6 text-center text-[13px] text-[#6f747b]">
          当前筛选下没有待办，队列已日清。
        </p>
      ) : null}

      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenItem(item)}
            className="flex w-full items-start justify-between gap-3 rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3 text-left transition hover:border-[rgba(24,24,23,0.12)]"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#202124]">{item.title}</p>
              <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">{item.description}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#8a8f98]">{item.kind}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] ${priorityClass(item.priority)}`}>
              {priorityLabel(item.priority)}
            </span>
          </button>
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-1 text-[13px] text-[#5f6368]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-[10px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-1.5 disabled:opacity-40"
          >
            上一页
          </button>
          <span>
            {page} / {pageCount} · 共 {total}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="rounded-[10px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-1.5 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      ) : null}
    </div>
  );
}
