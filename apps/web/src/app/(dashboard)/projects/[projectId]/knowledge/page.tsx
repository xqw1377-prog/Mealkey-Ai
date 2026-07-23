"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { MKPageHeader } from "@/components/operating";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";

export default function ProjectKnowledgePage({
  params,
}: {
  params: { projectId: string };
}) {
  const { data, isLoading, error } = trpc.dashboard.getProjectKnowledge.useQuery({ projectId: params.projectId });

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="知识库"
        title="正在打开…"
        description="整理记得住的经验。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="知识库"
          title="暂时打不开"
          description="数据还在同步。"
          primaryAction={{ href: `/projects/${params.projectId}`, label: "回企业" }}
          secondaryAction={{
            href: `/projects/${params.projectId}/decision-room`,
            label: "进决策室",
          }}
        />
      </div>
    );
  }

  if (!data?.currentProject) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageEmptyState
          eyebrow="知识库"
          title="进不了知识库"
          description="回列表再选企业。"
          primaryAction={{ href: "/projects", label: "我的企业" }}
          secondaryAction={{ href: "/dashboard", label: "回今日" }}
        />
      </div>
    );
  }

  const project = data.currentProject;
  const insight = data.insight;

  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="知识库"
        title={project.name}
        description="记得住的规则与经验，开会会用到。"
        badge={
          <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
            经验
          </div>
        }
        meta={
          <OpsSecondaryLinks
            projectId={project.id}
            links={[
              { href: `/projects/${project.id}/agent`, label: "回对话" },
              {
                href: `/projects/${project.id}/decision-room`,
                label: "决策室",
              },
            ]}
          />
        }
      />

      {insight ? (
        <>
          <section className="border-y border-[rgba(24,24,23,0.08)] py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">项目判断</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">今天可用</h2>
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

          <section className="border-y border-[rgba(24,24,23,0.08)] py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">证据</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">依据</h2>
              </div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">当前企业</p>
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
          eyebrow="知识库"
          title="还没有可引用的经验"
          description="先开会或留下决策，经验会慢慢沉淀。"
          primaryAction={{
            href: `/projects/${project.id}/decision-room`,
            label: "进决策室",
          }}
          secondaryAction={{ href: `/projects/${project.id}`, label: "回企业" }}
          inset="shell"
        />
      )}
    </PageContent>
  );
}
