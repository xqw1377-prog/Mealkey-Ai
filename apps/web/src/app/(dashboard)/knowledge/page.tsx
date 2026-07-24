"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  MKPageHeader,
  mkPageHeaderPrimaryCtaClass,
  mkPageHeaderSecondaryCtaClass,
} from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

export default function KnowledgePage() {
  const storeProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: projects } = trpc.project.list.useQuery();
  const projectId = storeProjectId || projects?.[0]?.id;
  const { data, isLoading, error } = trpc.dashboard.getKnowledgeCenter.useQuery();

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="成长"
        title="正在整理…"
        description="挑几条今天能用的。"
      />
    );
  }

  if (error) {
    return (
      <PageContent width="narrow" inset="shell">
        <PageErrorState
          eyebrow="成长"
          title="暂时打不开"
          description="数据还在同步。"
          primaryAction={{ href: "/dashboard?radar=1", label: "经营动态" }}
          secondaryAction={{ href: "/projects", label: "我的企业" }}
        />
      </PageContent>
    );
  }

  const insight = data?.insight ?? null;
  const projectKnowledgeHref = projectId
    ? `/projects/${projectId}/knowledge`
    : "/projects";

  return (
    <PageContent width="narrow" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="成长"
        title="今日可读"
        description="带回企业里用的判断。"
        meta={
          <OpsSecondaryLinks
            projectId={projectId}
            links={[
              ...(projectId
                ? [{ href: `/projects/${projectId}/agent`, label: "回对话" }]
                : []),
              { href: "/dashboard?radar=1", label: "经营动态" },
              { href: projectKnowledgeHref, label: "企业知识库" },
            ]}
          />
        }
      />

      {insight ? (
        <>
          <section className="space-y-4 border-y border-[rgba(24,24,23,0.1)] py-6">
            <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
              今日认知
            </p>
            <h2 className="font-display text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#202124]">
              {insight.title}
            </h2>
            <p className="text-[15px] leading-7 text-[#202124]">
              {insight.primaryInsight}
            </p>
            <p className="text-[14px] leading-6 text-[#66735E]">
              {insight.takeaway}
            </p>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] tracking-[0.12em] text-[#66735E]">证据</p>
            {insight.source ? (
              <p className="text-[14px] leading-6 text-[#202124]">
                来源：{insight.source}
              </p>
            ) : null}
            {insight.tags.length > 0 ? (
              <p className="text-[14px] leading-6 text-[#202124]">
                标签：{insight.tags.join(" · ")}
              </p>
            ) : null}
            {insight.related.length > 0 ? (
              <p className="text-[14px] leading-6 text-[#202124]">
                继续延伸：
                {insight.related.map((item) => item.title).join(" · ")}
              </p>
            ) : null}
            {insight.projectHint ? (
              <p className="text-[13px] leading-6 text-[#6f747b]">
                {insight.projectHint}
              </p>
            ) : null}
          </section>

          <div className="flex flex-col gap-2.5 border-t border-[rgba(24,24,23,0.08)] pt-6 sm:flex-row">
            <Link
              href={projectKnowledgeHref}
              className={mkPageHeaderPrimaryCtaClass}
            >
              打开企业知识库
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard?radar=1"
              className={mkPageHeaderSecondaryCtaClass}
            >
              经营动态
            </Link>
          </div>
        </>
      ) : (
        <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-8">
          <p className="font-display text-[18px] font-semibold text-[#202124]">
            暂无洞察
          </p>
          <p className="text-[14px] leading-6 text-[#6f747b]">
            先回经营动态，或进企业知识库。
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/dashboard?radar=1"
              className={mkPageHeaderPrimaryCtaClass}
            >
              经营动态
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={projectKnowledgeHref}
              className={mkPageHeaderSecondaryCtaClass}
            >
              企业知识
            </Link>
          </div>
        </section>
      )}
    </PageContent>
  );
}
