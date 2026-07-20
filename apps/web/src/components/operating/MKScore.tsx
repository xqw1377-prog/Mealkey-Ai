import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { MKCard } from "./MKCard";
import type { ScoreBreakdown } from "@/types/operating";

type MKScoreProps = {
  score: number;
  label: string;
  advice: string;
  confidence: number;
  evidenceRules: number;
  evidenceCases: number;
  breakdown: ScoreBreakdown;
  compact?: boolean;
};

const breakdownLabels: Array<keyof ScoreBreakdown> = [
  "market",
  "capability",
  "capital",
  "risk",
];

const labelMap: Record<keyof ScoreBreakdown, string> = {
  market: "市场",
  capability: "能力",
  capital: "资金",
  risk: "风险",
};

export function MKScore({
  score,
  label,
  advice,
  confidence,
  evidenceRules,
  evidenceCases,
  breakdown,
  compact = false,
}: MKScoreProps) {
  return (
    <MKCard
      eyebrow="Project Confidence"
      title="项目状态"
      aside={
        <div className="hidden rounded-full border border-[rgba(40,33,24,0.08)] bg-white/70 px-3 py-1 text-xs text-stone-600 md:flex">
          点击查看判断解释
        </div>
      }
      className={cn(compact && "p-4 md:p-5")}
    >
      <div className={cn("grid gap-5", compact ? "md:grid-cols-[1.2fr_1fr]" : "md:grid-cols-[1.35fr_1fr]")}>
        <div className="rounded-[24px] bg-[#171717] px-5 py-6 text-[#F6F3ED] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#A6A197]">项目状态</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-serif text-5xl leading-none tracking-[-0.04em] text-[#F6F3ED] md:text-6xl">
                  {score}%
                </span>
                <span className="mb-2 rounded-full bg-[rgba(119,128,95,0.14)] px-3 py-1 text-xs text-[#DDE2D3]">
                  {label}
                </span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[#DDD8CF]">{advice}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#B8B2A8]">
                <span>AI 信心 {confidence}%</span>
                <span>依据 {evidenceRules} 条规则</span>
                <span>{evidenceCases} 个案例</span>
              </div>
            </div>
            <div className="hidden h-16 w-16 items-center justify-center rounded-full border border-[rgba(201,171,110,0.2)] bg-[rgba(255,255,255,0.04)] md:flex">
              <ArrowUpRight className="h-6 w-6 text-[#77805F]" />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-[rgba(40,33,24,0.08)] bg-white/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
            <ShieldAlert className="h-4 w-4 text-[#8c5c3b]" />
            维度拆解
          </div>
          <div className="space-y-3">
            {breakdownLabels.map((key) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>{labelMap[key]}</span>
                  <span className="font-medium text-stone-900">{breakdown[key]}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-200/80">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#8c6736_0%,#c9ab6e_100%)]"
                    style={{ width: `${breakdown[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MKCard>
  );
}
