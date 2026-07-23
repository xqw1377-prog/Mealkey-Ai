"use client";

import Link from "next/link";
import { AlertTriangle, CheckCheck, RefreshCw } from "lucide-react";
import type { ReviewQueueItem } from "@/lib/positioning-review";
import { buildReviewMeetingHref } from "@/lib/review-meeting";
import { cn } from "@/lib/utils";

type PositioningReviewQueueProps = {
  items: ReviewQueueItem[];
  projectId: string;
  onDismiss?: (decisionId: string) => void;
  onReviewed?: (decisionId: string) => void;
  dismissingId?: string | null;
  className?: string;
};

export function PositioningReviewQueue({
  items,
  projectId,
  onDismiss,
  onReviewed,
  dismissingId,
  className,
}: PositioningReviewQueueProps) {
  const pending = items.filter((i) => i.status === "pending");

  if (pending.length === 0) {
    return (
      <section
        className={cn(
          "rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#202124]">
          <CheckCheck className="h-4 w-4 text-[#66735E]" />
          定位复审
        </div>
        <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">
          当前没有待复审判断。
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-[22px] border border-[rgba(180,124,92,0.2)] bg-[linear-gradient(180deg,#fffdfb_0%,#fbf6f1_100%)] p-5 shadow-[0_10px_24px_rgba(24,24,23,0.04)]",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#202124]">
          <AlertTriangle className="h-4 w-4 text-[#B47C5C]" />
          待复审判断
          <span className="rounded-full bg-[rgba(180,124,92,0.15)] px-2 py-0.5 text-[11px] text-[#B47C5C]">
            {pending.length}
          </span>
        </div>
        <p className="text-[12px] text-[#5f6368]">
          定位变化后，这些判断可能失效
        </p>
      </div>

      <ul className="space-y-3">
        {pending.map((item) => (
          <li
            key={item.decisionId}
            className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white/90 p-3"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F5F3EE] px-2 py-0.5 text-[11px] text-[#5f6368]">
                {item.type || "general"}
              </span>
              <span className="text-[11px] text-[#6f747b]">
                {formatTime(item.flaggedAt)}
              </span>
            </div>
            <p className="text-[14px] font-medium leading-6 text-[#202124]">
              {item.problem}
            </p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-[#5f6368]">
              {item.judgement}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[#B47C5C]">
              {item.reason}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={buildReviewMeetingHref({
                  projectId,
                  decisionId: item.decisionId,
                  problem: item.problem,
                  judgement: item.judgement,
                  previousOneLiner: item.previousOneLiner,
                  newOneLiner: item.newOneLiner,
                  reason: item.reason,
                })}
                className="inline-flex items-center gap-1 rounded-full bg-[#181817] px-3 py-1.5 text-[12px] text-white no-underline"
              >
                <RefreshCw className="h-3 w-3" />
                去复审
              </Link>
              <Link
                href={`#decision-${item.decisionId}`}
                className="inline-flex rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-3 py-1.5 text-[12px] text-[#202124] no-underline"
                onClick={() => {
                  const el = document.getElementById(`decision-${item.decisionId}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                查看判断
              </Link>
              {onReviewed && (
                <button
                  type="button"
                  disabled={dismissingId === item.decisionId}
                  onClick={() => onReviewed(item.decisionId)}
                  className="rounded-full border border-[rgba(102,115,94,0.2)] bg-[rgba(102,115,94,0.08)] px-3 py-1.5 text-[12px] text-[#66735E] disabled:opacity-50"
                >
                  已复审
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  disabled={dismissingId === item.decisionId}
                  onClick={() => onDismiss(item.decisionId)}
                  className="rounded-full border border-[rgba(24,24,23,0.08)] px-3 py-1.5 text-[12px] text-[#5f6368] disabled:opacity-50"
                >
                  忽略
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}
