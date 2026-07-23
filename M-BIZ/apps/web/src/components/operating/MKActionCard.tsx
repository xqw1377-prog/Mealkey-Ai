import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MKCard } from "./MKCard";

type MKActionMetric = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

type MKActionItem = {
  id: string;
  title: string;
  status: "done" | "active" | "pending";
};

type MKActionCardProps = {
  eyebrow?: string;
  title?: string;
  aside?: ReactNode;
  headline?: string;
  summary?: string;
  metrics?: MKActionMetric[];
  items?: MKActionItem[];
  emptyMessage?: string;
  primaryAction?: {
    href: string;
    label: string;
  };
};

export function MKActionCard({
  eyebrow = "行动",
  title = "今日行动",
  aside,
  headline,
  summary,
  metrics = [],
  items = [],
  emptyMessage,
  primaryAction,
}: MKActionCardProps) {
  const hasHeadline = Boolean(headline);
  const hasItems = items.length > 0;

  return (
    <MKCard eyebrow={eyebrow} title={title} aside={aside}>
      {hasHeadline ? (
        <div className="rounded-[18px] bg-[rgba(102,115,94,0.07)] p-4">
          <p className="text-[22px] leading-[1.2] tracking-[-0.03em] text-[#202124]">{headline}</p>
          {summary ? (
            <p className="mt-2 text-[14px] leading-[1.7] text-[#6f747b]">{summary}</p>
          ) : null}

          {metrics.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {metrics.map((metric) => (
                <div
                  key={`${metric.label}-${metric.value}`}
                  className={metric.fullWidth ? "rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3 md:col-span-2" : "rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3"}
                >
                  <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">{metric.label}</p>
                  <p className="mt-1 text-[15px] leading-6 text-[#181817]">{metric.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!hasHeadline && hasItems ? (
        <ul className="list-none p-0" aria-label="当前任务">
          {items.map((item, index) => {
            const sign = item.status === "done" ? "✓" : item.status === "active" ? "→" : "○";
            const tone = item.status === "pending" ? "text-[#9298a1]" : "text-[#7e9d7a]";

            return (
              <li
                key={item.id}
                className={`flex min-h-14 items-center gap-3 py-3 text-base leading-6 text-[#6f747b] ${
                  index === 0 ? "pt-0" : "border-t border-[rgba(32,33,36,0.08)]"
                }`}
              >
                <span className={`inline-flex w-5 justify-center ${tone}`}>{sign}</span>
                <span className="truncate tracking-[-0.02em] text-[#202124]">{item.title}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!hasHeadline && !hasItems && emptyMessage ? (
        <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-5">
          <p className="text-[16px] leading-7 text-[#202124]">{emptyMessage}</p>
        </div>
      ) : null}

      {primaryAction ? (
        <Link
          href={primaryAction.href}
          prefetch={false}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span>{primaryAction.label}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </MKCard>
  );
}
