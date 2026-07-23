import Link from "next/link";
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

export function ShellHeader({ items, currentSection, contextHref, contextLabel, projectName }: ShellHeaderProps) {
  const currentItem =
    items.find((item) => item.section === currentSection) ?? items[0];

  return (
    <>
      <header className="sticky top-0 z-30 mb-4 rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-[rgba(250,249,246,0.95)] px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] shadow-[0_10px_24px_rgba(24,24,23,0.04)] md:hidden">
        <div className="flex items-center gap-2">
          {contextHref && contextLabel ? (
            <Link
              href={contextHref}
              prefetch={false}
              className="inline-flex min-h-11 min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white/90 px-3 text-[#59606a] no-underline active:scale-[0.98]"
              aria-label={contextLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              prefetch={false}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white/90 px-3 no-underline active:scale-[0.98]"
            >
              <MKBrand compact subtitle="" />
            </Link>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium leading-5 text-[#202124]">
              {projectName || currentItem.label}
            </p>
            {contextLabel ? (
              <p className="truncate text-[11px] leading-4 tracking-[0.01em] text-[#5f655d]">
                {contextLabel}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-30 mb-6 hidden rounded-[24px] border border-[rgba(24,24,23,0.06)] bg-[rgba(250,249,246,0.84)] px-4 py-3 shadow-[0_10px_28px_rgba(24,24,23,0.04)] backdrop-blur-xl md:block">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link href="/dashboard" prefetch={false} className="inline-flex items-center gap-3">
              <MKBrand compact subtitle="Founder OS" />
            </Link>
            {projectName ? (
              <p className="mt-2 truncate pl-[52px] text-[12px] leading-5 tracking-[0.01em] text-[#5f655d]">
                当前经营世界：{projectName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {contextHref && contextLabel ? (
              <Link
                href={contextHref}
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white/72 px-3 py-2 text-sm text-[#59606a] transition hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {contextLabel}
              </Link>
            ) : null}

            {items.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.section;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  title={item.disabled ? item.disabledHint || "先建立经营世界" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                    item.disabled && !isActive
                      ? "bg-white/50 text-[#9a968e]"
                      : isActive
                        ? "bg-[#202124] text-white"
                        : "bg-white/70 text-[#59606a] hover:bg-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
    </>
  );
}
