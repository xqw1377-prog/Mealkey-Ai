import { cn } from "@/lib/utils";

type MKMetaPillProps = {
  label: string;
  value: string;
  className?: string;
};

export function MKMetaPill({ label, value, className }: MKMetaPillProps) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-2.5 py-1 md:gap-1.5 md:px-3 md:py-1.5",
        className,
      )}
    >
      <span className="shrink-0 text-[11px] leading-4 tracking-[0.01em] text-[#6f747b] md:text-[11px]">{label}</span>
      <span className="min-w-0 truncate text-[12px] font-semibold leading-4 text-[#181817] md:text-[12px]">{value}</span>
    </div>
  );
}
