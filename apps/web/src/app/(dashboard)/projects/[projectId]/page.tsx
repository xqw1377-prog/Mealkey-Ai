"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { buildMeetingHref, detectDepartmentFromTopic } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";

export default function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { data, isLoading, error } = trpc.dashboard.getProjectOverview.useQuery({
    projectId: params.projectId,
  });
  const { data: latestPositioning } = trpc.agent.latestPositioning.useQuery({
    projectId: params.projectId,
  });

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="企业世界"
        title="AI 正在理解这家企业"
        description="正在读取长期记忆与当前议题。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="企业世界"
          title="暂时无法打开"
          description="先回今日判断，或稍后重试。"
          primaryAction={{ href: "/dashboard", label: "回到今日判断" }}
          secondaryAction={{
            href: `/projects/${params.projectId}/advisor`,
            label: "进入会议",
          }}
        />
      </div>
    );
  }

  if (!data?.currentProject || !data?.overview) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageEmptyState
          eyebrow="企业世界"
          title="企业世界不可用"
          description="先回到列表重新进入。"
          primaryAction={{ href: "/projects", label: "我的企业" }}
          secondaryAction={{ href: "/dashboard", label: "今日判断" }}
        />
      </div>
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
  const advantage =
    overview.focusCoreAbility
      ? `当前优势焦点：${overview.focusCoreAbility}`
      : "产品与运营能力待进一步校准";
  const risk = overview.biggestRisk || "关键风险待识别";
  const topic = overview.biggestRisk || overview.nextPush?.title || "当前核心经营问题";
  const department = detectDepartmentFromTopic(topic);
  const meetingHref =
    overview.nextPush?.meetingHref ??
    buildMeetingHref(project.id, topic, department, {
      autoStart: true,
    });

  const discussing = [
    { label: "商业战略部", href: `/projects/${project.id}/business` },
    { label: "品牌定位部", href: `/projects/${project.id}/positioning` },
    { label: "市场研究部", href: `/projects/${project.id}/market` },
    { label: "组织设计部", href: `/projects/${project.id}/equity` },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 overflow-x-hidden pb-8 pt-6 md:pt-10">
      <header className="space-y-2">
        <p className="text-[13px] tracking-[0.08em] text-[#66735E]">企业世界</p>
        <h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#202124] md:text-[40px]">
          {project.name}
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          {[project.category, project.city, overview.currentStageLabel || project.stage]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-6">
        <p className="text-[12px] tracking-[0.08em] text-[#66735E]">AI理解</p>
        <div className="space-y-3">
          <p className="text-[15px] leading-7 text-[#202124]">
            <span className="text-[#6f747b]">你是谁：</span>
            {who}
          </p>
          <p className="text-[15px] leading-7 text-[#202124]">
            <span className="text-[#6f747b]">你想成为：</span>
            {wantToBe}
          </p>
          <p className="text-[15px] leading-7 text-[#202124]">
            <span className="text-[#6f747b]">当前阶段：</span>
            {overview.stageInsight || wantToBe}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[12px] tracking-[0.08em] text-[#66735E]">AI观察</p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">优势：</span>
          {advantage}
        </p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">风险：</span>
          {risk}
        </p>
        <p className="mt-4 text-[12px] tracking-[0.08em] text-[#6f747b]">当前议题</p>
        <p className="text-[20px] font-semibold leading-snug tracking-[-0.02em] text-[#202124]">
          {topic}
        </p>
        <Link
          href={meetingHref}
          prefetch={false}
          className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline"
        >
          进入会议
          <Sparkles className="h-4 w-4" />
        </Link>
        <Link
          href={`/projects/${project.id}/mission`}
          prefetch={false}
          className="mt-2 inline-flex min-h-10 items-center text-[13px] font-medium text-[#66735E] no-underline"
        >
          用一句话发起新议题 →
        </Link>
      </section>

      <section className="space-y-3 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">正在讨论</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {discussing.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="inline-flex items-center gap-1 text-[14px] font-medium text-[#66735E] no-underline"
            >
              {item.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
        <p className="pt-2 text-[13px] leading-6 text-[#9a968e]">
          这里是 AI 对企业的长期记忆，不是体检报告。
        </p>
      </section>
    </div>
  );
}
