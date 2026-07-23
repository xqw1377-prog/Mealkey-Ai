"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";

type ActionLink = {
  href: string;
  label: string;
};

type StateStep = {
  label: string;
  status?: "pending" | "active" | "done";
};

function ActionButtons({
  primaryAction,
  secondaryAction,
}: {
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
}) {
  if (!primaryAction && !secondaryAction) return null;

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 md:gap-3">
      {secondaryAction ? (
        <Link
          href={secondaryAction.href}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[14px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5 active:scale-[0.98] md:min-h-11 md:text-[15px]"
        >
          <span>{secondaryAction.label}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
      {primaryAction ? (
        <Link
          href={primaryAction.href}
          className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white no-underline transition hover:-translate-y-0.5 active:scale-[0.98] md:min-h-11 md:text-[15px] ${
            secondaryAction ? "" : "col-span-2"
          }`}
        >
          <span>{primaryAction.label}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function PageLoadingState({
  eyebrow = "MealKey",
  title = "AI 正在整理这一页",
  description = "正在读取上下文和判断结果。",
  steps = [
    { label: "读取上下文", status: "done" },
    { label: "收束问题", status: "active" },
    { label: "生成本页", status: "pending" },
  ],
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  steps?: StateStep[];
}) {
  return (
    <div className="space-y-4 pb-2 pt-[calc(env(safe-area-inset-top)+1rem)] md:space-y-5 md:pt-8">
      <header className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded-full bg-[rgba(24,24,23,0.12)]" />
        <div className="h-8 w-44 animate-pulse rounded-[14px] bg-[rgba(24,24,23,0.12)] md:h-9 md:w-48" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-full bg-[rgba(24,24,23,0.10)] md:w-72" />
      </header>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)] md:p-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-[12px] font-medium leading-5 tracking-[0.01em] text-[#66735E]">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          <span>{eyebrow}</span>
        </div>
        <p className="mt-2 text-[18px] leading-[1.25] tracking-[-0.03em] text-[#202124] md:text-[22px]">{title}</p>
        <p className="mt-3 text-[14px] leading-[1.7] text-[#6f747b]">{description}</p>

        <div className="mt-5 rounded-[18px] border border-[rgba(24,24,23,0.06)] bg-white/80 p-3 md:p-4">
          <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">当前状态</p>
          <div className="mt-3 space-y-3">
            {steps.map((step) => (
              <div
                key={step.label}
                className="flex items-center gap-3 rounded-[14px] border border-[rgba(24,24,23,0.05)] bg-[#FCFBF8] px-3 py-2.5 md:py-3"
              >
                <div
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                    step.status === "done"
                      ? "bg-[rgba(102,115,94,0.12)] text-[#66735E]"
                      : step.status === "active"
                        ? "bg-[rgba(180,124,92,0.14)] text-[#B47C5C]"
                        : "bg-[rgba(24,24,23,0.06)] text-[#6f747b]",
                  ].join(" ")}
                >
                  {step.status === "done" ? "01" : step.status === "active" ? "02" : "03"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-6 text-[#202124]">{step.label}</p>
                </div>
                <div
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    step.status === "done"
                      ? "bg-[#66735E]"
                      : step.status === "active"
                        ? "animate-pulse bg-[#B47C5C]"
                        : "bg-[rgba(24,24,23,0.10)]",
                  ].join(" ")}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)] md:p-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(102,115,94,0.08)] px-3 py-1 text-[12px] font-medium leading-5 tracking-[0.01em] text-[#66735E]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>正在组织内容</span>
        </div>
        <div className="mt-4 grid gap-3">
          <div className="rounded-[16px] bg-[rgba(24,24,23,0.04)] p-3 md:p-4">
            <div className="h-4 w-24 animate-pulse rounded-full bg-[rgba(24,24,23,0.12)]" />
            <div className="mt-3 h-14 animate-pulse rounded-[14px] bg-[rgba(24,24,23,0.10)]" />
          </div>
          <div className="rounded-[16px] bg-[rgba(24,24,23,0.04)] p-3 md:p-4">
            <div className="h-4 w-20 animate-pulse rounded-full bg-[rgba(24,24,23,0.12)]" />
            <div className="mt-3 h-14 animate-pulse rounded-[14px] bg-[rgba(24,24,23,0.10)]" />
          </div>
          <div className="hidden rounded-[16px] bg-[rgba(24,24,23,0.04)] p-3 md:block md:p-4">
            <div className="h-4 w-28 animate-pulse rounded-full bg-[rgba(24,24,23,0.12)]" />
            <div className="mt-3 h-14 animate-pulse rounded-[14px] bg-[rgba(24,24,23,0.10)]" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function PageEmptyState({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
}) {
  return (
    <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)] md:p-5">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1 text-[12px] font-medium leading-5 tracking-[0.01em] text-[#66735E]">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{eyebrow}</span>
      </div>
      <p className="mt-2 text-[20px] leading-[1.3] tracking-[-0.03em] text-[#202124] md:text-[24px]">{title}</p>
      <p className="mt-3 text-[15px] leading-[1.7] text-[#6f747b]">{description}</p>

      <div className="mt-5 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white/80 px-4 py-3">
        <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">下一步</p>
        <p className="mt-1 text-[14px] leading-[1.7] text-[#202124]">补上下文，再回来。</p>
      </div>

      <ActionButtons primaryAction={primaryAction} secondaryAction={secondaryAction} />
    </section>
  );
}

export function PageErrorState({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  highlights = ["先继续主链路。", "上下文恢复后，这一页会自动重建。"],
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  highlights?: string[];
}) {
  return (
    <section className="rounded-[22px] border border-[rgba(180,124,92,0.18)] bg-[linear-gradient(180deg,#fbfaf7_0%,rgba(180,124,92,0.08)_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)] md:p-5">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1 text-[12px] font-medium leading-5 tracking-[0.01em] text-[#B47C5C]">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{eyebrow}</span>
      </div>
      <p className="mt-2 text-[20px] leading-[1.3] tracking-[-0.03em] text-[#202124] md:text-[24px]">{title}</p>
      <p className="mt-3 text-[15px] leading-[1.7] text-[#6f747b]">{description}</p>

      {highlights.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {highlights.map((item) => (
            <div
              key={item}
              className="rounded-[16px] border border-[rgba(180,124,92,0.12)] bg-white/70 px-4 py-3"
            >
              <p className="text-[14px] leading-[1.7] text-[#202124]">{item}</p>
            </div>
          ))}
        </div>
      ) : null}

      <ActionButtons primaryAction={primaryAction} secondaryAction={secondaryAction} />
    </section>
  );
}
