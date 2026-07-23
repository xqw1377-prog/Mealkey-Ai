"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { MKPageHeader } from "@/components/operating";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";

export default function ProjectKnowledgePage({
  params,
}: {
  params: { projectId: string };
}) {
  const { data, isLoading, error } = trpc.dashboard.getProjectKnowledge.useQuery({ projectId: params.projectId });

  if (isLoading) {
    return <PageLoadingState eyebrow="项目智慧" title="AI 正在整理项目智慧" description="正在关联项目风险、经营规则和适合当前阶段的认知提示。" />;
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="项目智慧"
          title="当前无法生成项目认知"
          description="项目或知识数据还没同步完成。先回经营世界或经营会议。"
          primaryAction={{ href: `/projects/${params.projectId}`, label: "返回经营世界" }}
          secondaryAction={{ href: `/projects/${params.projectId}/advisor`, label: "进入会议" }}
        />
      </div>
    );
  }

  if (!data?.currentProject) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageEmptyState
          eyebrow="项目智慧"
          title="当前无法打开这份经营洞察"
          description="当前经营世界不存在或链接已经失效。先回到经营世界，重新进入一个有效世界。"
          primaryAction={{ href: "/projects", label: "返回经营世界" }}
          secondaryAction={{ href: "/dashboard", label: "回到今日" }}
        />
      </div>
    );
  }

  const project = data.currentProject;
  const insight = data.insight;

  return (
    <div className="space-y-5 pb-2">
      <MKPageHeader
        eyebrow="项目智慧"
        title="项目智慧"
        description={`${project.name} · 这里放判断依据。`}
        
        badge={
          <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
            项目关联
          </div>
        }
      />

      {insight ? (
        <>
          <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">项目判断</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">今日项目认知</h2>
              </div>
              <Lightbulb className="h-5 w-5 text-[#66735E]" />
            </div>

            <p className="mt-4 text-[22px] leading-[1.2] tracking-[-0.02em] text-[#202124] md:text-[28px]">{insight.title}</p>

            <div className="mt-4 border-t border-[rgba(24,24,23,0.08)] pt-4">
              <p className="text-[16px] leading-[1.65] tracking-[-0.02em] text-[#202124]">
                {insight.explanation}
              </p>
            </div>
          </section>

          <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">证据</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">案例支撑</h2>
              </div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">面向当前项目</p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {insight.source && (
                <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(24,24,23,0.08)] pb-3">
                  <span className="text-[16px] leading-[1.45] tracking-[-0.02em] text-[#202124]">来源：{insight.source}</span>
                </div>
              )}
              {insight.tags.length > 0 && (
                <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(24,24,23,0.08)] pb-3">
                  <span className="text-[16px] leading-[1.45] tracking-[-0.02em] text-[#202124]">标签：{insight.tags.join(" · ")}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(24,24,23,0.08)] pb-3">
                <span className="text-[16px] leading-[1.45] tracking-[-0.02em] text-[#202124]">关联项目：{project.name}</span>
              </div>
            </div>

            <p className="mt-4 text-[14px] leading-[1.7] text-[#6f747b]">
              针对当前项目，最值得继续验证的是：
              {insight.biggestRisk}
            </p>

            <div className="mt-4 rounded-[16px] bg-[rgba(102,115,94,0.07)] p-3.5">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">转成动作</p>
              <p className="mt-2 text-[14px] leading-[1.7] text-[#202124]">
                {insight.nextAction}
              </p>
            </div>

            <div className="mt-4 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FBFAF7] p-3.5">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">知识如何影响判断</p>
              <p className="mt-2 text-[14px] leading-[1.7] text-[#202124]">
                {insight.evidence}
              </p>
            </div>

            {insight.related.length > 0 ? (
              <div className="mt-4 space-y-3">
                {insight.related.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white px-3.5 py-2.5"
                  >
                    <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">关联认知 {index + 1}</p>
                    <p className="mt-1 text-[14px] leading-[1.6] text-[#202124]">{item.title}</p>
                    {item.source ? (
                      <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">来源：{item.source}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <Link
              href={`/projects/${project.id}/report`}
              prefetch={false}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5"
            >
              <span>回到报告</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </>
      ) : (
        <PageEmptyState
          eyebrow="项目智慧"
          title="当前项目还没有可引用的认知节点"
          description="先继续经营会议或生成决策档案，AI 会把更适合这个项目的知识依据逐步沉淀进来。"
          primaryAction={{ href: `/projects/${project.id}/advisor`, label: "进入经营会议" }}
          secondaryAction={{ href: `/projects/${project.id}`, label: "返回经营世界" }}
        />
      )}
    </div>
  );
}
