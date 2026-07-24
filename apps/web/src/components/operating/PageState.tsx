"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import { PRODUCT_BRAND_EYEBROW } from "@/lib/product-brand";

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
    <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
      {primaryAction ? (
        <Link
          href={primaryAction.href}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          <span>{primaryAction.label}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
      {secondaryAction ? (
        <Link
          href={secondaryAction.href}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[15px] font-semibold text-[#181817] no-underline touch-manipulation aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          <span>{secondaryAction.label}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** 加载态 — 对齐 Ops 页头字号阶梯 */
export function PageLoadingState({
  eyebrow = PRODUCT_BRAND_EYEBROW,
  title = "正在打开…",
  description = "稍等片刻。",
  steps = [
    { label: "读取", status: "done" },
    { label: "整理", status: "active" },
    { label: "就绪", status: "pending" },
  ],
  /** shell：OperatingShell 已有水平 padding，避免再叠一层 */
  inset = "page",
  /** 加载过久时的逃生口，避免用户卡死在「整理」 */
  primaryAction,
  secondaryAction,
  slowHint,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  steps?: StateStep[];
  inset?: "shell" | "page";
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  slowHint?: string | null;
}) {
  const padX = inset === "shell" ? "px-0" : "px-4 md:px-6";
  return (
    <div
      className={`mx-auto w-full max-w-xl space-y-5 ${padX} pb-10 pt-6 md:pt-8`}
    >
      <header className="space-y-2">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">
          {eyebrow}
        </p>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
          {title}
        </h1>
        <p className="text-[15px] leading-7 text-[#3a3d41]">{description}</p>
      </header>

      <section className="border-y border-[rgba(24,24,23,0.08)] py-5">
        <p className="inline-flex items-center gap-2 text-[13px] text-[#66735E]">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          加载中
        </p>
        <ul className="mt-4 space-y-3" aria-live="polite">
          {steps.map((step, index) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={[
                  "inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-[11px] font-semibold",
                  step.status === "done"
                    ? "bg-[rgba(102,115,94,0.12)] text-[#66735E]"
                    : step.status === "active"
                      ? "bg-[rgba(180,124,92,0.14)] text-[#B47C5C]"
                      : "bg-[rgba(24,24,23,0.06)] text-[#6f747b]",
                ].join(" ")}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] text-[#202124]">{step.label}</span>
              {step.status === "active" ? (
                <span className="ml-auto h-2 w-2 animate-pulse bg-[#B47C5C]" />
              ) : null}
            </li>
          ))}
        </ul>
        {slowHint ? (
          <p className="mt-4 text-[13px] leading-6 text-[#B47C5C]">{slowHint}</p>
        ) : null}
      </section>
      <ActionButtons
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />
    </div>
  );
}

export function PageEmptyState({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  inset = "page",
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  inset?: "shell" | "page";
}) {
  const padX = inset === "shell" ? "px-0" : "px-4 md:px-6";
  return (
    <section
      className={`mx-auto w-full max-w-xl border-y border-[rgba(24,24,23,0.08)] ${padX} py-8`}
    >
      <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-[#3a3d41]">{description}</p>
      <ActionButtons
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />
    </section>
  );
}

export function PageErrorState({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  highlights = [],
  inset = "page",
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  highlights?: string[];
  inset?: "shell" | "page";
}) {
  const padX = inset === "shell" ? "px-0" : "px-4 md:px-6";
  return (
    <section
      className={`mx-auto w-full max-w-xl border-y border-[rgba(180,124,92,0.22)] ${padX} py-8`}
    >
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] text-[#B47C5C]">
        <AlertCircle className="h-3.5 w-3.5" />
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-[#3a3d41]">{description}</p>
      {highlights.length > 0 ? (
        <ul className="mt-5 space-y-2 border-l-2 border-[#B47C5C] pl-3">
          {highlights.map((item) => (
            <li key={item} className="text-[15px] leading-6 text-[#202124]">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <ActionButtons
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />
    </section>
  );
}
