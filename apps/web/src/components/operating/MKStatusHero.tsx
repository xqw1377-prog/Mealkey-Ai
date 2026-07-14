import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MKMetaPill } from "./MKMetaPill";

type MKStatusHeroProps = {
  mode: "forming" | "active";
  projectName: string;
  projectStage: string;
  statusScore: number;
  confidence: number;
  summary: string;
  currentFocus: string;
  currentProblem: string;
  currentProblemReason: string;
  currentProblemImpact: string;
  currentProblemAction: string;
  ctaHref: string;
  ctaLabel: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
};

export function MKStatusHero({
  mode,
  projectName,
  projectStage,
  statusScore,
  confidence,
  summary,
  currentFocus,
  currentProblem,
  currentProblemReason,
  currentProblemImpact,
  currentProblemAction,
  ctaHref,
  ctaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
}: MKStatusHeroProps) {
  const modeLabel = mode === "forming" ? "判断生成中" : "今日判断已同步";
  const heroTitle = mode === "forming" ? "AI 正在建立你的经营判断" : "AI 已形成今天的经营判断";
  const heroDescription =
    mode === "forming"
      ? "当前还在收束项目上下文和判断依据，先把最大问题确认清楚。"
      : "先看 AI 现在如何理解你的经营状态，再决定今天最该推进什么。";
  const progressSteps = [
    { label: "项目已建立", active: true },
    { label: "判断形成中", active: true },
    { label: "进入日常使用", active: mode === "active" },
  ];

  return (
    <section className="overflow-hidden rounded-[30px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-5 shadow-[0_20px_48px_rgba(24,24,23,0.06)] md:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white/78 px-3 py-1.5 text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{modeLabel}</span>
            </div>
            <div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">经营大脑首屏</p>
              <h2 className="mt-1 font-display text-[30px] font-semibold leading-[1.05] tracking-[-0.05em] text-[#202124] md:text-[40px]">
                {heroTitle}
              </h2>
              <p className="mt-3 max-w-[36rem] text-[15px] leading-[1.8] text-[#6f747b]">{heroDescription}</p>
            </div>
          </div>

          <div className="grid min-w-[180px] grid-cols-2 gap-3">
            <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white/82 px-4 py-3">
              <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">经营健康度</p>
              <p className="mt-1 font-display text-[36px] leading-none tracking-[-0.05em] text-[#202124]">{statusScore}</p>
            </div>
            <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white/82 px-4 py-3">
              <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">AI 信心</p>
              <p className="mt-1 font-display text-[36px] leading-none tracking-[-0.05em] text-[#202124]">{confidence}%</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <MKMetaPill label="当前项目" value={projectName} />
          <MKMetaPill label="阶段" value={projectStage} />
          <MKMetaPill label="AI 当前关注" value={currentFocus} />
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {progressSteps.map((step, index) => (
            <div
              key={step.label}
              className={`rounded-[16px] border px-4 py-3 ${
                step.active
                  ? index === progressSteps.length - 1 && mode === "active"
                    ? "border-[rgba(102,115,94,0.22)] bg-[rgba(102,115,94,0.10)]"
                    : "border-[rgba(24,24,23,0.08)] bg-white/72"
                  : "border-[rgba(24,24,23,0.06)] bg-white/44"
              }`}
            >
              <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">经营大脑阶段 {index + 1}</p>
              <p className="mt-1 text-[15px] leading-6 text-[#202124]">{step.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white/84 p-4 md:p-5">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">AI 当前判断</p>
            <p className="mt-2 text-[23px] leading-[1.35] tracking-[-0.03em] text-[#202124]">{summary}</p>
            <div className="mt-4 rounded-[16px] bg-[rgba(24,24,23,0.04)] px-4 py-3">
              <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">为什么 AI 先看这个</p>
              <p className="mt-1 text-[14px] leading-[1.8] text-[#6f747b]">{currentProblemReason}</p>
            </div>
          </div>

          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[#171717] p-4 text-[#F6F3ED] shadow-[0_18px_30px_rgba(24,24,23,0.10)] md:p-5">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-white/66">当前最值得解决的问题</p>
            <p className="mt-2 text-[22px] leading-[1.35] tracking-[-0.03em] text-white">{currentProblem}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[16px] bg-white/8 px-4 py-3">
                <p className="text-[12px] leading-5 tracking-[0.01em] text-white/56">现在先做</p>
                <p className="mt-1 text-[14px] leading-[1.7] text-white/88">{currentProblemAction}</p>
              </div>
              <div className="rounded-[16px] bg-white/8 px-4 py-3">
                <p className="text-[12px] leading-5 tracking-[0.01em] text-white/56">预计影响</p>
                <p className="mt-1 text-[14px] leading-[1.7] text-white/88">{currentProblemImpact}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Link
                href={ctaHref}
                prefetch={false}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#F6F3ED] px-4 text-[15px] font-semibold text-[#171717] no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {secondaryCtaHref && secondaryCtaLabel ? (
                <Link
                  href={secondaryCtaHref}
                  prefetch={false}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/8 px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <span>{secondaryCtaLabel}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
