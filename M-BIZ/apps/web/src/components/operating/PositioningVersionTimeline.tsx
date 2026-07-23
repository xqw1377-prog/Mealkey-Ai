"use client";

import Link from "next/link";
import { GitBranch, Target } from "lucide-react";
import type { PositioningSnapshot } from "@/lib/positioning";
import { cn } from "@/lib/utils";

type PositioningVersionTimelineProps = {
  current: PositioningSnapshot | null;
  previous: PositioningSnapshot | null;
  history?: Array<PositioningSnapshot | null>;
  projectId: string;
  className?: string;
};

export function PositioningVersionTimeline({
  current,
  previous,
  history = [],
  projectId,
  className,
}: PositioningVersionTimelineProps) {
  const versions: Array<{
    key: string;
    label: string;
    snapshot: PositioningSnapshot;
    tone: "current" | "previous" | "history";
  }> = [];

  if (current) {
    versions.push({
      key: current.decisionId || "current",
      label: "当前版本",
      snapshot: current,
      tone: "current",
    });
  }
  if (previous) {
    versions.push({
      key: previous.decisionId || "previous",
      label: "上一版本",
      snapshot: previous,
      tone: "previous",
    });
  }
  for (const [idx, h] of history.entries()) {
    if (!h) continue;
    if (current && h.decisionId && h.decisionId === current.decisionId) continue;
    if (previous && h.decisionId && h.decisionId === previous.decisionId) continue;
    if (current && h.oneLiner === current.oneLiner && h.updatedAt === current.updatedAt) {
      continue;
    }
    versions.push({
      key: h.decisionId || `hist-${idx}`,
      label: `历史 v${history.length - idx}`,
      snapshot: h,
      tone: "history",
    });
  }

  if (versions.length === 0) {
    return (
      <section
        className={cn(
          "rounded-[22px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBF9F5] p-5",
          className,
        )}
      >
        <p className="text-[13px] text-[#66735E]">定位版本</p>
        <p className="mt-2 text-[15px] text-[#202124]">
          还没有定位版本。完成一次定位后，这里会记录每次演进。
        </p>
        <Link
          href={`/projects/${projectId}/positioning`}
          className="mt-3 inline-flex text-[13px] text-[#66735E] no-underline"
        >
          去定位 →
        </Link>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5 shadow-[0_10px_24px_rgba(24,24,23,0.04)]",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#202124]">
          <GitBranch className="h-4 w-4 text-[#66735E]" />
          定位版本
        </div>
        <Link
          href={`/projects/${projectId}/positioning`}
          className="text-[12px] text-[#66735E] no-underline"
        >
          去定位
        </Link>
      </div>

      <ol className="relative space-y-0 border-l border-[rgba(24,24,23,0.1)] ml-2">
        {versions.map((v, i) => (
          <li key={v.key} className="relative pb-4 pl-5 last:pb-0">
            <span
              className={cn(
                "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                v.tone === "current"
                  ? "bg-[#66735E]"
                  : v.tone === "previous"
                    ? "bg-[#B47C5C]"
                    : "bg-[#89867F]",
              )}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  v.tone === "current"
                    ? "bg-[rgba(102,115,94,0.12)] text-[#66735E]"
                    : v.tone === "previous"
                      ? "bg-[rgba(180,124,92,0.12)] text-[#B47C5C]"
                      : "bg-[#F5F3EE] text-[#5f6368]",
                )}
              >
                {v.label}
              </span>
              {v.snapshot.updatedAt && (
                <span className="text-[11px] text-[#6f747b]">
                  {formatTime(v.snapshot.updatedAt)}
                </span>
              )}
              <span className="text-[11px] text-[#6f747b]">
                信心 {Math.round(v.snapshot.confidence * 100)}%
              </span>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[14px] leading-6 text-[#202124]">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#66735E]" />
              <span className="line-clamp-2">{v.snapshot.oneLiner}</span>
            </p>
            {(v.snapshot.brandPositioning?.category ||
              v.snapshot.brandPositioning?.brandName ||
              v.snapshot.brandPositioning?.priceRange) && (
              <p className="mt-1 text-[12px] text-[#5f6368]">
                {[
                  v.snapshot.brandPositioning?.brandName
                    ? `品牌：${v.snapshot.brandPositioning.brandName}`
                    : null,
                  v.snapshot.brandPositioning?.category,
                  v.snapshot.brandPositioning?.priceRange,
                  v.snapshot.brandPositioning?.targetCustomers
                    ? truncate(String(v.snapshot.brandPositioning.targetCustomers), 24)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {i === 0 && previous && current && (
              <p className="mt-2 text-[12px] text-[#B47C5C]">
                相对上一版有变化
              </p>
            )}
          </li>
        ))}
      </ol>
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

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
