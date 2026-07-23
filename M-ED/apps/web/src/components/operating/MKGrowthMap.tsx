import Link from "next/link";
import { BookOpen } from "lucide-react";

type GrowthItem = {
  label: string;
  value: number;
};

type MKGrowthMapProps = {
  title?: string;
  items: GrowthItem[];
  recommendation: string;
  actionLabel: string;
  actionHref?: string;
  actionText?: string;
};

function GrowthBar({ label, value }: GrowthItem) {
  return (
    <div className="flex flex-col gap-1 md:gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] leading-6 text-[#202124] md:text-[14px]">{label}</span>
        <span className="text-[12px] font-semibold leading-5 text-[#66735E] md:text-[13px]">{value}</span>
      </div>
      <span className="block h-1.5 overflow-hidden rounded-full bg-[rgba(24,24,23,0.08)]">
        <span className="block h-full rounded-full bg-[#66735E]" style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

export function MKGrowthMap({
  title = "成长",
  items,
  recommendation,
  actionLabel,
  actionHref = "/knowledge",
  actionText = "进入经营智慧",
}: MKGrowthMapProps) {
  return (
    <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-3 shadow-[0_14px_28px_rgba(24,24,23,0.04)] md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">地图</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124] md:text-[19px]">{title}</h2>
        </div>
        <div className="hidden h-24 w-20 overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,#f0ede7_0%,#e5e0d7_100%)] md:block">
          <div className="mt-3 ml-3 h-5 w-5 rounded-full bg-white/70" />
          <div className="mx-3 mt-8 rounded-[12px] border border-white/40 bg-white/35 p-2 backdrop-blur-sm">
            <div className="h-1.5 rounded-full bg-white/80" />
            <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-white/60" />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        {items.map((item) => (
          <GrowthBar key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="mt-4 rounded-[16px] bg-[rgba(102,115,94,0.07)] px-3 py-3 md:px-4">
        <p className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">下一步</p>
        <p className="mt-1 text-[14px] leading-[1.65] text-[#202124] md:text-[16px]">{recommendation}</p>
        <p className="mt-2 text-[12px] leading-[1.65] text-[#6f747b] md:text-[14px]">{actionLabel}</p>
      </div>

      <Link
        href={actionHref}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[13px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5 md:text-[15px]"
      >
        <span>{actionText}</span>
        <BookOpen className="h-4 w-4" />
      </Link>
    </section>
  );
}
