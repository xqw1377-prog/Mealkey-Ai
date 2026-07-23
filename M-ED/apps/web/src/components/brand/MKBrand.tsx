"use client";

import { cn } from "@/lib/utils";

type MKBrandProps = {
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
  subtitle?: string | null;
};

export function MKBrand({
  compact = false,
  showTagline = false,
  className,
  subtitle = "经营能力增长系统",
}: MKBrandProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#171717] text-white shadow-[0_14px_30px_rgba(24,24,23,0.10)]",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 48 48"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="31" cy="14" r="3.5" fill="#F6F3ED" fillOpacity="0.95" />
          <path
            d="M14 31V17.5L21.5 27L29 17.5V31"
            stroke="#F6F3ED"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M26 27.5H36"
            stroke="#77805F"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-[#171717]">
          MealKey
        </p>
        {subtitle ? (
          <p className="truncate text-[12px] leading-5 tracking-[0.01em] text-[#77805F]">
            {subtitle}
          </p>
        ) : null}
        {showTagline ? (
          <p className="truncate text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">
            让你拥有更强的经营能力
          </p>
        ) : null}
      </div>
    </div>
  );
}
