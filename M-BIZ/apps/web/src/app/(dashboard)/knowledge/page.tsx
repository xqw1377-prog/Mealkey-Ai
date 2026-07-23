"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { MKPageHeader } from "@/components/operating";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";

export default function KnowledgePage() {
  const { data, isLoading, error } = trpc.dashboard.getKnowledgeCenter.useQuery();

  if (isLoading) {
    return <PageLoadingState eyebrow="经营智慧" title="AI 正在整理今日经营智慧" description="正在读取适合当前阶段的经营洞察和成长建议。" />;
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="经营智慧"
          title="今日认知暂时无法生成"
          description="知识数据还没完全同步。你可以先回到今日或经营世界继续使用。"
          primaryAction={{ href: "/dashboard", label: "回到今日" }}
          secondaryAction={{ href: "/projects", label: "进入经营世界" }}
        />
      </div>
    );
  }

  const insight = data?.insight ?? null;

  return (
    <div className="space-y-5 pb-2">
      <MKPageHeader
        eyebrow="经营智慧"
        title="经营智慧中心"
        description="这里把经营智慧带回判断。"
        badge={
          <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
            今日成长
          </div>
        }
      />

      {insight ? (
        <>
          <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">今日认知</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">今日经营智慧</h2>
              </div>
              <Lightbulb className="h-5 w-5 text-[#66735E]" />
            </div>

            <p className="mt-4 text-[22px] leading-[1.2] tracking-[-0.02em] text-[#202124] md:text-[28px]">{insight.title}</p>

            <div className="mt-4 border-t border-[rgba(32,33,36,0.08)] pt-4">
              <p className="text-[16px] leading-[1.65] tracking-[-0.02em] text-[#202124]">
                {insight.primaryInsight}
              </p>
              <p className="mt-2 text-[16px] leading-[1.65] tracking-[-0.02em] text-[#66735E]">
                {insight.takeaway}
              </p>
            </div>
          </section>

          <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">证据</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">如何带回项目里用</h2>
              </div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">轻量可信</p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {insight.source && (
                <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(32,33,36,0.08)] pb-3">
                  <span className="text-[16px] leading-[1.45] tracking-[-0.02em] text-[#202124]">来源：{insight.source}</span>
                </div>
              )}
              {insight.tags.length > 0 && (
                <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(32,33,36,0.08)] pb-3">
                  <span className="text-[16px] leading-[1.45] tracking-[-0.02em] text-[#202124]">标签：{insight.tags.join(' · ')}</span>
                </div>
              )}
              {insight.related.length > 0 && (
                <div className="flex items-baseline justify-between gap-3 pb-1">
                  <span className="text-[16px] leading-[1.45] tracking-[-0.02em] text-[#202124]">
                    继续延伸：{insight.related.map((item) => item.title).join(" · ")}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-4 text-[14px] leading-[1.7] text-[#6f747b]">
              {insight.projectHint}
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Link
                href="/projects"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5"
              >
                <span>带回经营世界</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5"
              >
                <span>回到大脑首页</span>
                <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[24px] border border-[rgba(24,24,23,0.08)] bg-white p-5 shadow-[0_18px_42px_rgba(24,24,23,0.04)]">
          <div className="py-10 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-[#66735E]" />
            <h2 className="mt-4 text-lg font-semibold text-[#202124]">暂无洞察</h2>
            <p className="mt-2 text-sm text-[#6f747b]">
              这里会持续推送适合当前阶段的经营智慧。现在先回到今日或项目页。
            </p>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5"
              >
                <span>回到今日</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/projects"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5"
              >
                <span>进入经营世界</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
