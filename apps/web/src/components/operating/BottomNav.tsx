"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/types/operating";

export type ShellNavItem = {
  label: string;
  href: string;
  section: NavSection;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  disabledHint?: string;
};

type BottomNavProps = {
  items: ShellNavItem[];
  currentSection: NavSection;
};

/**
 * 底栏 — 底线 active indicator；无企业时点击给出轻提示并引导建企
 */
export function BottomNav({ items, currentSection }: BottomNavProps) {
  const router = useRouter();
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(24,24,23,0.08)] bg-[rgba(250,249,246,0.98)] px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-1.5 md:hidden">
      {hint ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-x-3 bottom-[calc(100%+8px)] rounded-[12px] border border-[rgba(24,24,23,0.10)] bg-[#181817] px-3 py-2.5 text-center text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(24,24,23,0.16)]"
        >
          {hint}
          <button
            type="button"
            onClick={() => router.push("/projects")}
            className="ml-2 underline underline-offset-2 touch-manipulation"
          >
            去建立
          </button>
        </div>
      ) : null}
      <nav
        className="mx-auto flex max-w-[440px] items-stretch justify-between"
        aria-label="主导航"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.section;
          const disabled = Boolean(item.disabled);

          const className = cn(
            "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] no-underline transition touch-manipulation",
            disabled && !isActive
              ? "cursor-not-allowed text-[#9a968e] opacity-50"
              : "active:opacity-80",
            !disabled && isActive
              ? "font-semibold text-[#181817]"
              : !disabled
                ? "text-[#6f747b]"
                : null,
          );

          const inner = (
            <>
              {isActive && !disabled ? (
                <span
                  aria-hidden
                  className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-[#181817]"
                />
              ) : null}
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive && !disabled ? "text-[#181817]" : "text-current",
                )}
              />
              <span className="whitespace-nowrap leading-4 tracking-[0.01em]">
                {item.label}
              </span>
            </>
          );

          if (disabled) {
            return (
              <button
                key={item.label}
                type="button"
                aria-disabled="true"
                title={item.disabledHint || "先建立企业"}
                onClick={() => {
                  showHint(item.disabledHint || "先建立企业");
                }}
                className={className}
              >
                {inner}
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
              {inner}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
