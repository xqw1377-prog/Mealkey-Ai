import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { MKCard } from "./MKCard";

type MKInsightCardProps = {
  title: string;
  judgement: string;
  summary: string;
  tags?: string[];
  href: string;
  ctaLabel?: string;
};

export function MKInsightCard({
  title,
  judgement,
  summary,
  tags = [],
  href,
  ctaLabel = "学习 5 分钟",
}: MKInsightCardProps) {
  return (
    <MKCard
      eyebrow="认知"
      title="今日经营洞察"
      aside={<BookOpen className="h-5 w-5 text-[#66735E]" />}
    >
      <div className="grid gap-4 border-t border-[rgba(24,24,23,0.08)] pt-4">
        <div>
          <p className="text-[26px] leading-[1.18] tracking-[-0.03em] text-[#202124]">{title}</p>
          <p className="mt-3 text-[17px] leading-[1.6] tracking-[-0.02em] text-[#202124]">
            高手判断：{judgement}
          </p>
          <p className="mt-3 text-[14px] leading-[1.7] text-[#6f747b]">{summary}</p>

          {tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className={
                    index === tags.length - 1
                      ? "rounded-full bg-[rgba(102,115,94,0.10)] px-3 py-1 text-[12px] leading-5 text-[#66735E]"
                      : "rounded-full bg-[rgba(24,24,23,0.06)] px-3 py-1 text-[12px] leading-5 text-[#181817]"
                  }
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
      >
        <span>{ctaLabel}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </MKCard>
  );
}
