import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MKCardProps = {
  title?: string;
  eyebrow?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function MKCard({ title, eyebrow, aside, className, children }: MKCardProps) {
  return (
    <section
      className={cn(
        "rounded-[30px] border border-[rgba(32,33,36,0.07)] bg-white/80 p-5 text-[#202124] shadow-[0_14px_36px_rgba(32,33,36,0.05)] backdrop-blur-xl md:p-6",
        className
      )}
    >
      {(title || eyebrow || aside) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#5f655d]">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-2 text-base font-semibold tracking-[-0.02em] text-[#202124]">
                {title}
              </h2>
            )}
          </div>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}
