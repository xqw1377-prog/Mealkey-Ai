import type { ComponentType } from "react";
import Link from "next/link";
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

export function BottomNav({ items, currentSection }: BottomNavProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(24,24,23,0.06)] bg-[rgba(250,249,246,0.97)] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 md:hidden">
      <nav className="mx-auto flex max-w-[440px] items-end justify-between rounded-[24px] border border-[rgba(24,24,23,0.08)] bg-white px-2 py-1.5 shadow-[0_8px_20px_rgba(24,24,23,0.07)]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.section;
          const isMeeting = item.section === "meeting";

          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              title={item.disabled ? item.disabledHint || "先建立经营世界" : undefined}
              aria-disabled={item.disabled || undefined}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-1.5 py-2 text-[12px] transition active:scale-[0.98] no-underline",
                item.disabled && !isActive
                  ? "text-[#9a968e]"
                  : isMeeting
                    ? "bg-[#181817] text-white shadow-[0_10px_20px_rgba(24,24,23,0.14)]"
                    : isActive
                      ? "bg-[rgba(102,115,94,0.12)] text-[#181817]"
                      : "text-[#5f655d]",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition",
                  isMeeting
                    ? "bg-white/12 text-white"
                    : isActive
                      ? "bg-[#66735E] text-white shadow-[0_8px_18px_rgba(102,115,94,0.18)]"
                      : "bg-transparent",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="whitespace-nowrap text-[12px] leading-4 tracking-[0.01em]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
