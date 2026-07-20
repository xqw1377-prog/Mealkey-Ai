"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MKBrand } from "@/components/brand/MKBrand";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/types/operating";
import type { ShellNavItem } from "./BottomNav";

type ShellHeaderProps = {
  items: ShellNavItem[];
  currentSection: NavSection;
  contextHref?: string | null;
  contextLabel?: string | null;
  projectName?: string | null;
};

export function ShellHeader({
  items,
  currentSection,
  contextHref,
  contextLabel,
  projectName,
}: ShellHeaderProps) {
  const router = useRouter();
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentItem =
    items.find((item) => item.section === currentSection) ?? items[0];

  const showHint = useCallback((message: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(message);
    hintTimer.current = setTimeout(() => setHint(null), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[rgba(24,24,23,0.08)] bg-[rgba(250,249,246,0.98)] px-1 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:hidden">
        <div className="flex items-center gap-2">
          {contextHref && contextLabel ? (
            <Link
              href={contextHref}
              prefetch={false}
              className="inline-flex min-h-11 min-w-[44px] shrink-0 items-center justify-center rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 text-[#6f747b] no-underline touch-manipulation"
              aria-label={contextLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              prefetch={false}
              className="inline-flex min-h-11 shrink-0 items-center rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 no-underline touch-manipulation"
            >
              <MKBrand compact subtitle="" />
            </Link>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium leading-5 text-[#202124]">
              {projectName || currentItem.label}
            </p>
            {contextLabel ? (
              <p className="truncate text-[11px] leading-4 tracking-[0.08em] text-[#6f747b]">
                {contextLabel}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-30 mb-6 hidden border-b border-[rgba(24,24,23,0.08)] bg-[rgba(250,249,246,0.96)] py-3 md:block">
        {hint ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-2 flex items-center justify-end gap-2 rounded-[12px] bg-[#181817] px-3 py-2 text-[13px] font-medium text-white"
          >
            <span>{hint}</span>
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="underline underline-offset-2 touch-manipulation"
            >
              去建立
            </button>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              prefetch={false}
              className="inline-flex items-center gap-3 no-underline"
            >
              <MKBrand compact />
            </Link>
            {projectName ? (
              <p className="mt-2 truncate pl-[52px] text-[13px] leading-5 text-[#6f747b]">
                {projectName}
              </p>
            ) : null}
          </div>

          <nav
            className="flex flex-wrap items-center justify-end gap-1"
            aria-label="主导航"
          >
            {contextHref && contextLabel ? (
              <Link
                href={contextHref}
                prefetch={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2 text-[13px] text-[#6f747b] no-underline transition hover:border-[rgba(24,24,23,0.22)]"
              >
                <ArrowLeft className="h-4 w-4" />
                {contextLabel}
              </Link>
            ) : null}

            {items.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.section;
              const disabled = Boolean(item.disabled);
              const className = cn(
                "inline-flex min-h-11 items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-50",
                disabled && !isActive
                  ? "cursor-not-allowed text-[#9a968e] opacity-50"
                  : isActive
                    ? "bg-[#181817] font-semibold text-white"
                    : "text-[#6f747b] hover:bg-[rgba(24,24,23,0.05)]",
              );

              if (disabled) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-disabled="true"
                    title={item.disabledHint || "先建立企业"}
                    onClick={() => showHint(item.disabledHint || "先建立企业")}
                    className={className}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  className={className}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
