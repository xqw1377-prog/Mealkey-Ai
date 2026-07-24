"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MKPageHeader } from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components/operating/PageState";
import { useProjectId } from "@/hooks/useProjectId";
import { buildMeetingHref, detectDepartmentFromTopic } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";

export default function ProjectDetailPage() {
  const projectId = useProjectId() || "";
  const { data, isLoading, error } = trpc.dashboard.getProjectOverview.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const { data: latestPositioning } = trpc.agent.latestPositioning.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="企业"
        title="正在打开…"
        description="读取这家店。"
      />
    );
  }

  if (error) {
    return (
      <PageContent width="narrow" inset="shell">
        <PageErrorState
          eyebrow="企业"
          title="暂时打不开"
          description="先回经营动态，或稍后重试。"
          primaryAction={{ href: "/dashboard?radar=1", label: "经营动态" }}
          secondaryAction={{
            href: projectId
              ? `/projects/${projectId}/decision-case`
              : "/projects",
            label: "发起决策",
          }}
        />
      </PageContent>
    );
  }

  if (!projectId || !data?.currentProject || !data?.overview) {
    return (
      <PageContent width="narrow" inset="shell">
        <PageEmptyState
          eyebrow="企业"
          title="进不了这家企业"
          description="回列表再选一次。"
          primaryAction={{ href: "/projects", label: "我的企业" }}
          secondaryAction={{ href: "/dashboard?radar=1", label: "经营动态" }}
        />
      </PageContent>
    );
  }

  const project = data.currentProject;
  const overview = data.overview;
  const who =
    latestPositioning?.brandPositioning?.mentalPosition ||
    latestPositioning?.oneLiner ||
    overview.positioning ||
    `${project.category || "餐饮"}品牌`;
  const wantToBe = overview.currentStageLabel || project.stage || "验证 → 复制";
  const advantage = overview.focusCoreAbility
    ? overview.focusCoreAbility
    : "优势还在校准";
  const risk = overview.biggestRisk || "风险待识别";
  const topic =
    overview.biggestRisk || overview.nextPush?.title || "当前核心经营问题";
  const department = detectDepartmentFromTopic(topic);
  const meetingHref =
    overview.nextPush?.meetingHref ??
    buildMeetingHref(project.id, topic, department, {
      autoStart: true,
    });

  const discussing = [
    { label: "我的餐厅", href: `/projects/${project.id}/restaurant` },
    { label: "经营身份", href: `/projects/${project.id}/business-identity` },
    { label: "商业", href: `/projects/${project.id}/business` },
    { label: "品牌", href: `/projects/${project.id}/positioning` },
    { label: "市场", href: `/projects/${project.id}/market` },
    { label: "组织", href: `/projects/${project.id}/equity` },
  ];

  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="企业"
        title={project.name}
        description={[
          project.category,
          project.city,
          overview.currentStageLabel || project.stage,
        ]
          .filter(Boolean)
          .join(" · ")}
        meta={
          <OpsSecondaryLinks
            projectId={project.id}
            links={[
              { href: `/projects/${project.id}/agent`, label: "回对话" },
              {
                href: `/projects/${project.id}/decision-room`,
                label: "去拍板",
              },
              {
                href: `/projects/${project.id}/capability`,
                label: "能力一览",
              },
              {
                href: `/projects/${project.id}/settings`,
                label: "企业设置",
              },
            ]}
          />
        }
      />

      <section className="space-y-4 border-y border-[rgba(24,24,23,0.1)] py-6">
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">现在这样</p>
        <div className="space-y-3">
          <p className="text-[15px] leading-7 text-[#202124]">
            <span className="text-[#6f747b]">你是谁：</span>
            {who}
          </p>
          <p className="text-[15px] leading-7 text-[#202124]">
            <span className="text-[#6f747b]">想成为：</span>
            {wantToBe}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">观察</p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">优势：</span>
          {advantage}
        </p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">风险：</span>
          {risk}
        </p>
        <p className="mt-4 text-[11px] tracking-[0.1em] text-[#6f747b]">
          当前议题
        </p>
        <p className="font-display text-[20px] font-semibold leading-snug tracking-[-0.02em] text-[#202124]">
          {topic}
        </p>
        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap">
          <Link
            href={meetingHref}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
          >
            去拍板
            <Sparkles className="h-4 w-4" />
          </Link>
          <Link
            href={`/projects/${project.id}/decision-case`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.15)] bg-white px-5 text-[15px] font-semibold text-[#181817] no-underline touch-manipulation active:scale-[0.98]"
          >
            第二家店决策室
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          <Link
            href="/dashboard?radar=1"
            prefetch={false}
            className="inline-flex min-h-10 items-center text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
          >
            经营动态
          </Link>
          <Link
            href={`/projects/${project.id}/mission`}
            prefetch={false}
            className="inline-flex min-h-10 items-center text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
          >
            一句话开新议题 →
          </Link>
        </div>
      </section>

      <section className="space-y-3 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[11px] tracking-[0.12em] text-[#6f747b]">专项</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2.5">
          {discussing.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="inline-flex items-center gap-1 text-[14px] font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
            >
              {item.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      </section>
    </PageContent>
  );
}
