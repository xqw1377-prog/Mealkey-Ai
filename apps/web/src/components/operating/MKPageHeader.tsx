import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 页头主 CTA — 对齐晨间驾驶舱 */
export const mkPageHeaderPrimaryCtaClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const mkPageHeaderSecondaryCtaClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[15px] font-semibold text-[#181817] no-underline touch-manipulation disabled:cursor-not-allowed disabled:opacity-50";

type MKPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function MKPageHeader({
  eyebrow,
  title,
  description,
  badge,
  children,
  className,
}: MKPageHeaderProps) {
  return (
    <header className={cn("space-y-3 pt-2 md:space-y-4 md:pt-4", className)}>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between md:gap-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium leading-4 tracking-[0.14em] text-[#66735E]">
            {eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:mt-2 md:text-[36px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[32rem] text-[15px] leading-7 text-[#3a3d41] md:max-w-[36rem]">
              {description}
            </p>
          ) : null}
        </div>
        {badge}
      </div>
      {children ? (
        <div className="[&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-50 [&_a[aria-disabled=true]]:pointer-events-none [&_a[aria-disabled=true]]:cursor-not-allowed [&_a[aria-disabled=true]]:opacity-50">
          {children}
        </div>
      ) : null}
    </header>
  );
}
