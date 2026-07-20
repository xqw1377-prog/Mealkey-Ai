"use client";

import { cn } from "@/lib/utils";
import { PRODUCT_BRAND } from "@/lib/product-brand";

type MKBrandProps = {
  compact?: boolean;
  /** 首页等场景：品牌名升到英雄级 */
  size?: "default" | "hero";
  showTagline?: boolean;
  className?: string;
  /** 默认：餐饮经营能力增长系统；compact 默认不显示；传 null/"" 可隐藏 */
  subtitle?: string | null;
};

export function MKBrand({
  compact = false,
  size = "default",
  showTagline = false,
  className,
  subtitle,
}: MKBrandProps) {
  const hero = size === "hero";
  const resolvedSubtitle =
    subtitle === undefined
      ? compact
        ? null
        : PRODUCT_BRAND.positioning
      : subtitle || null;

  return (
    <div
      className={cn(
        // hero：顶对齐，避免图标相对三行文案上下「悬空」
        "inline-flex",
        hero ? "items-start gap-3" : "items-center gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-[rgba(24,24,23,0.08)] bg-[#171717] text-white",
          hero
            ? "mt-0.5 h-11 w-11 rounded-[14px] shadow-[0_12px_28px_rgba(24,24,23,0.10)]"
            : compact
              ? "h-10 w-10 rounded-[14px]"
              : "h-12 w-12 rounded-[18px] shadow-[0_14px_30px_rgba(24,24,23,0.10)]",
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
        {hero ? (
          <div className="flex flex-col items-start gap-0.5">
            <p className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#171717]">
              {PRODUCT_BRAND.nameZh}
            </p>
            <p className="text-[13px] font-medium leading-none tracking-[0.04em] text-[#66735E]">
              {PRODUCT_BRAND.nameEn}
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 items-baseline gap-2">
            <p
              className={cn(
                "font-semibold tracking-[-0.04em] text-[#171717]",
                compact
                  ? "truncate text-[15px] leading-5"
                  : "truncate text-[17px] leading-5",
              )}
            >
              {PRODUCT_BRAND.nameZh}
            </p>
            <p
              className={cn(
                "font-medium tracking-[0.04em] text-[#66735E]",
                compact ? "truncate text-[11px]" : "truncate text-[12px]",
              )}
            >
              {PRODUCT_BRAND.nameEn}
            </p>
          </div>
        )}
        {resolvedSubtitle ? (
          <p
            className={cn(
              "tracking-[0.02em] text-[#6f747b]",
              hero
                ? "mt-1.5 text-[12px] leading-5"
                : "mt-0.5 truncate text-[12px] leading-5",
            )}
          >
            {resolvedSubtitle}
          </p>
        ) : null}
        {showTagline ? (
          <p className="mt-0.5 truncate text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">
            {PRODUCT_BRAND.positioning}
          </p>
        ) : null}
      </div>
    </div>
  );
}
