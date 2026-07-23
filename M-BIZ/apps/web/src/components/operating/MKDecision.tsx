import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { MKCard } from "./MKCard";

type MKDecisionProps = {
  title?: string;
  risk: string;
  action: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function MKDecision({
  title = "AI 今日判断",
  risk,
  action,
  ctaLabel = "查看分析",
  ctaHref,
}: MKDecisionProps) {
  return (
    <MKCard eyebrow="AI 餐饮经营大脑" title={title}>
      <div className="space-y-5">
        <div className="rounded-[24px] bg-[#171717] p-5 text-[#F6F3ED]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#B7BEA8]">
            <Sparkles className="h-4 w-4" />
            今日经营判断
          </div>
          <div className="mt-5 flex gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)]">
              <AlertTriangle className="h-4 w-4 text-[#B47C5C]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#A6A197]">当前最大风险</p>
              <p className="mt-2 text-lg leading-8 text-[#F6F3ED]">{risk}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[rgba(40,33,24,0.08)] bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">建议动作</p>
          <p className="mt-3 text-base leading-7 text-stone-900">{action}</p>
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm text-stone-50 transition hover:bg-stone-800"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm text-stone-50 transition hover:bg-stone-800">
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </MKCard>
  );
}
