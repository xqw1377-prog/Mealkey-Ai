"use client";

import Link from "next/link";

type Props = {
  projectId: string;
  decisionId: string;
  resolving?: boolean;
  resolved?: boolean;
  onMarkReviewed: () => void;
};

export function PositioningReviewBanner({
  projectId,
  decisionId,
  resolving,
  resolved,
  onMarkReviewed,
}: Props) {
  return (
    <section className="rounded-[18px] border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)] p-4">
      <p className="text-[12px] font-medium text-[#B47C5C]">定位变更复审模式</p>
      <p className="mt-2 text-[14px] leading-6 text-[#202124]">已预填复审议题。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={resolving}
          onClick={onMarkReviewed}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#181817] px-4 text-[13px] text-white touch-manipulation disabled:opacity-50"
        >
          {resolved ? "已标记复审 ✓" : "标记为已复审"}
        </button>
        <Link
          href={`/projects/${projectId}/decisions#decision-${decisionId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[13px] text-[#202124] no-underline touch-manipulation"
        >
          回到决策档案
        </Link>
      </div>
    </section>
  );
}
