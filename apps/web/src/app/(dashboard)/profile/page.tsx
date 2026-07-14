"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";

const PREFERENCE_LABEL: Record<string, string> = {
  growth: "快速增长型",
  profit: "稳健增长型",
  brand: "品牌长期价值型",
};

export default function ProfilePage() {
  const { data, isLoading, error } = trpc.dashboard.getOwnerPortrait.useQuery();
  const { data: projects } = trpc.project.list.useQuery();
  const currentProject = projects?.[0];

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="AI眼中的你"
        title="正在整理对你的理解"
        description="从决策历史与经营偏好中校准。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="AI眼中的你"
          title="暂时还没有完全同步"
          description="先回今日顾问简报。"
          primaryAction={{ href: "/dashboard", label: "回到今日" }}
          secondaryAction={{ href: "/projects", label: "企业世界" }}
        />
      </div>
    );
  }

  const portrait = data?.portrait;
  const enterpriseName = currentProject?.name || "你的企业";
  const profilePref =
    currentProject && currentProject.profile && typeof currentProject.profile === "object"
      ? (currentProject.profile as { founderPreference?: string }).founderPreference
      : undefined;
  const styleLabel =
    (profilePref && PREFERENCE_LABEL[profilePref]) || "稳健增长型";

  const strengths = [
    portrait?.strongestCapability,
    portrait?.roleLabel,
  ].filter(Boolean) as string[];

  const risks = [
    portrait?.weakestCapability ? `${portrait.weakestCapability}相关能力偏弱` : null,
    portrait?.bottleneckReason || "品牌资产与组织复制需要强化",
  ].filter(Boolean) as string[];

  const isInitial = Boolean((portrait as { isInitialPortrait?: boolean } | undefined)?.isInitialPortrait);
  const before = isInitial
    ? "单店经营"
    : (portrait?.stageTrack?.[0] as { label?: string } | undefined)?.label || "早期经营";
  const now = portrait?.currentStage || "进入复制 / 校准阶段";
  const summary =
    portrait?.stateJudgement ||
    `你是一家运营能力相对扎实，但品牌与组织资产仍需强化的餐饮企业。经营风格偏${styleLabel}。`;

  const meetingHref = currentProject
    ? `/projects/${currentProject.id}/mission`
    : "/dashboard";

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-8 pt-6 md:pt-10">
      <header className="space-y-2">
        <p className="text-[13px] tracking-[0.08em] text-[#66735E]">AI眼中的你</p>
        <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#202124] md:text-[36px]">
          AI眼中的{enterpriseName}
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          不是能力打分。这里是我对这家企业的长期理解。
        </p>
      </header>

      <section className="space-y-3 border-y border-[rgba(24,24,23,0.08)] py-6">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">我认为</p>
        <p className="text-[17px] leading-[1.7] text-[#202124]">{summary}</p>
      </section>

      <section className="space-y-2">
        <p className="text-[12px] tracking-[0.08em] text-[#66735E]">你的优势</p>
        <ul className="space-y-1.5">
          {(strengths.length ? strengths : ["经营经验待校准"]).map((item) => (
            <li key={item} className="text-[15px] leading-7 text-[#202124]">
              ✓ {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">你的风险</p>
        <ul className="space-y-1.5">
          {risks.map((item) => (
            <li key={item} className="text-[15px] leading-7 text-[#202124]">
              ⚠ {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">最近变化</p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">之前：</span>
          {before}
        </p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">现在：</span>
          {now}
        </p>
      </section>

      <section className="flex flex-wrap gap-3 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white no-underline"
        >
          回到今日简报
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={meetingHref}
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-medium text-[#202124] no-underline"
        >
          发起商业议题
          <Compass className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
