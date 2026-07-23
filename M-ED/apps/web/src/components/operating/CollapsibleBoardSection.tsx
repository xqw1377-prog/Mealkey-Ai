"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type CollapsibleBoardSectionProps = {
  eyebrow: string;
  title: string;
  summary?: string;
  /** 默认收起，减少协议墙压迫感 */
  defaultOpen?: boolean;
  children: ReactNode;
  tone?: "default" | "dark" | "warm";
};

/**
 * 部门看板次要区块：协议 / 智能层 / 账本等默认折叠
 */
export function CollapsibleBoardSection({
  eyebrow,
  title,
  summary,
  defaultOpen = false,
  children,
  tone = "default",
}: CollapsibleBoardSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const shell =
    tone === "dark"
      ? "border-[rgba(24,24,23,0.12)] bg-[#202124] text-white"
      : tone === "warm"
        ? "border-[rgba(180,124,92,0.18)] bg-[linear-gradient(180deg,#fffdfb_0%,#fbf6f1_100%)]"
        : "border-[rgba(24,24,23,0.08)] bg-white";

  const muted = tone === "dark" ? "text-white/65" : "text-[#6f747b]";
  const titleColor = tone === "dark" ? "text-white" : "text-[#202124]";
  const eyebrowColor = tone === "dark" ? "text-white/70" : "text-[#66735E]";

  return (
    <section className={`overflow-hidden rounded-[22px] border ${shell}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left md:px-5"
      >
        <div className="min-w-0">
          <p className={`text-[12px] tracking-[0.08em] ${eyebrowColor}`}>{eyebrow}</p>
          <h3 className={`mt-1 text-[18px] font-medium leading-snug tracking-[-0.02em] ${titleColor}`}>
            {title}
          </h3>
          {summary ? (
            <p className={`mt-1 text-[13px] leading-6 ${muted}`}>
              {open ? summary : `${summary} · 点击展开`}
            </p>
          ) : (
            <p className={`mt-1 text-[13px] ${muted}`}>{open ? "收起" : "点击展开详情"}</p>
          )}
        </div>
        <span
          className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
            tone === "dark" ? "border-white/20 text-white" : "border-[rgba(24,24,23,0.08)] text-[#66735E]"
          }`}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open ? <div className="border-t border-[rgba(24,24,23,0.06)] px-4 pb-5 pt-4 md:px-5">{children}</div> : null}
    </section>
  );
}
