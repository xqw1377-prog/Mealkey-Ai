"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MKPageHeader } from "@/components/operating";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";

const scoreLabels: Record<string, string> = {
  product_stability: "产品稳定性",
  user_retention: "用户复购",
  team_replication: "团队复制",
  cash_flow: "现金流",
  brand_awareness: "品牌认知",
  world_variable: "经营变量",
};

export default function ScorePage({
  params,
}: {
  params: { projectId: string };
}) {
  const { data, isLoading, error } = trpc.dashboard.getScorecard.useQuery({ projectId: params.projectId });
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!data?.scorecard) return;
    const score = data.scorecard.score;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplayScore(score);
      return;
    }

    let frameId = 0;
    const duration = 760;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.round(score * (1 - (1 - progress) ** 3));
      setDisplayScore(value);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [data?.scorecard]);

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="记分卡"
        title="正在算分…"
        description="读取关键指标。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="记分卡"
          title="暂时打不开"
          description="数据还在同步。"
          primaryAction={{ href: "/dashboard", label: "回今日" }}
          secondaryAction={{
            href: `/projects/${params.projectId}/decision-room`,
            label: "进决策室",
          }}
        />
      </div>
    );
  }

  if (!data?.currentProject || !data?.scorecard) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageEmptyState
          eyebrow="记分卡"
          title="还没有分数"
          description="先开几次会、做验证，分数才可信。"
          primaryAction={{ href: "/dashboard", label: "回今日" }}
          secondaryAction={{ href: `/projects/${params.projectId}`, label: "企业" }}
        />
      </div>
    );
  }

  const project = data.currentProject;
  const scorecard = data.scorecard;

  return (
    <div className="space-y-5 pb-2">
      <MKPageHeader
        eyebrow="记分卡"
        title={project.name}
        description="一眼看健康度；分数要有验证才可信。"
      />

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
        <div className="text-center">
          <p className="font-display text-[78px] leading-none tracking-[-0.05em] text-[#202124] md:text-[108px]">{displayScore}</p>
          <p className="mt-2 text-[16px] font-medium tracking-[-0.02em] text-[#202124]">
            {scorecard.scoreLabel}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {scorecard.metrics.map((metric) => (
            <span key={metric.key} className="inline-flex items-center rounded-full bg-[rgba(102,115,94,0.12)] px-3 py-1 text-xs font-medium text-[#66735E]">
              {scoreLabels[metric.key] || metric.label} {metric.value > 70 ? '↑' : '↓'}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">建议</p>
            <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
              为什么不是更高
            </h2>
          </div>
        </div>

        <p className="mt-4 text-[14px] leading-[1.7] text-[#6f747b]">
          {scorecard.strategicSummary}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Link
            href={`/projects/${project.id}/capability`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            看能力
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            回今日
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">分项</p>
            <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
              依据
            </h2>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {scorecard.metrics.map((item) => (
            <div key={item.key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-[15px] leading-6 text-[#202124]">
                <span className="truncate">{item.label}</span>
                <span className="whitespace-nowrap font-display text-[#66735E]">{item.value}</span>
              </div>
              <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[rgba(102,115,94,0.12)]">
                <span className="block h-full rounded-full bg-[#66735E]" style={{ width: `${item.value}%` }} />
              </span>
              <p className="text-[15px] leading-[1.7] text-[#6f747b]">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
