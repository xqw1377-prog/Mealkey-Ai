"use client";

import { ArrowRight, GitCompareArrows } from "lucide-react";
import type { PositioningDiff, PositioningSnapshot } from "@/lib/positioning";
import { cn } from "@/lib/utils";

type PositioningDiffCardProps = {
  previous: PositioningSnapshot | null;
  current: PositioningSnapshot;
  diff: PositioningDiff | null;
  className?: string;
};

export function PositioningDiffCard({
  previous,
  current,
  diff,
  className,
}: PositioningDiffCardProps) {
  if (!diff) return null;

  const confDeltaPct = Math.round(diff.confidenceDelta * 100);
  const changedFields = diff.fields.filter((f) => f.changed);

  return (
    <section
      className={cn(
        "rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5 shadow-[0_10px_24px_rgba(24,24,23,0.04)]",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[#66735E]">
          <GitCompareArrows className="h-3.5 w-3.5" />
          定位变更对比
        </div>
        <span className="rounded-full bg-[#F5F3EE] px-2.5 py-0.5 text-[12px] text-[#202124]">
          {diff.summary}
        </span>
        {confDeltaPct !== 0 && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[12px]",
              confDeltaPct > 0
                ? "bg-[rgba(102,115,94,0.12)] text-[#66735E]"
                : "bg-[rgba(180,124,92,0.12)] text-[#B47C5C]",
            )}
          >
            信心 {confDeltaPct > 0 ? "+" : ""}
            {confDeltaPct} 分
          </span>
        )}
      </div>

      {!previous ? (
        <p className="text-[13px] leading-6 text-[#5f6368]">
          这是该项目的首次定位结论，暂无历史版本可比。
        </p>
      ) : changedFields.length === 0 ? (
        <p className="text-[13px] leading-6 text-[#5f6368]">
          相对上一版，核心字段没有文案级变化
          {confDeltaPct !== 0 ? "（仅信心分变动）" : "。"}
        </p>
      ) : (
        <ul className="space-y-3">
          {changedFields.map((f) => (
            <li
              key={f.field}
              className="rounded-[16px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] p-3"
            >
              <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[#6f747b]">
                {f.label}
              </p>
              <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-start">
                <div>
                  <p className="mb-1 text-[11px] text-[#B47C5C]">旧</p>
                  <p className="text-[13px] leading-6 text-[#5f6368] line-through decoration-[rgba(24,24,23,0.2)]">
                    {f.before}
                  </p>
                </div>
                <div className="hidden pt-5 md:block">
                  <ArrowRight className="h-4 w-4 text-[#6f747b]" />
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-[#66735E]">新</p>
                  <p className="text-[13px] leading-6 font-medium text-[#202124]">
                    {f.after}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {previous && (
        <div className="mt-4 grid gap-3 border-t border-[rgba(24,24,23,0.06)] pt-4 md:grid-cols-2">
          <MiniSide label="上一版" value={previous.oneLiner} tone="old" />
          <MiniSide label="当前版" value={current.oneLiner} tone="new" />
        </div>
      )}
    </section>
  );
}

function MiniSide({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "old" | "new";
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] px-3 py-2",
        tone === "old" ? "bg-[rgba(180,124,92,0.08)]" : "bg-[rgba(102,115,94,0.08)]",
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.1em] text-[#6f747b]">
        {label}
      </p>
      <p className="mt-1 text-[13px] leading-6 text-[#202124]">{value}</p>
    </div>
  );
}
