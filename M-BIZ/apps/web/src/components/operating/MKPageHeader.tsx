import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
    <header className={cn("space-y-3 pt-4 md:space-y-4 md:pt-6", className)}>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between md:gap-4">
        <div className="min-w-0">
          <p className="truncate text-[12px] leading-4 tracking-[0.01em] text-[#66735E] md:text-[13px] md:leading-5">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-[24px] font-semibold leading-none tracking-[-0.05em] text-[#202124] md:mt-2 md:text-[42px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-[30rem] text-[12px] leading-5 tracking-[0.01em] text-[#6f747b] md:mt-2 md:max-w-[34rem] md:text-[13px] md:leading-6">
              {description}
            </p>
          ) : null}
        </div>
        {badge}
      </div>
      {children}
    </header>
  );
}
