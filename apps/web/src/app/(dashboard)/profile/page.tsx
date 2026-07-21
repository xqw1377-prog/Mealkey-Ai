"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { BusinessPointsStrip } from "@/components/operating/BusinessPointsStrip";
import { IntelligenceProfilePanel } from "@/components/operating/IntelligenceProfilePanel";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useBusinessWallet } from "@/hooks/useBusinessWallet";
import { trendTone } from "@/lib/format";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

const PREFERENCE_LABEL: Record<string, string> = {
  growth: "快速增长型",
  profit: "稳健增长型",
  brand: "品牌长期价值型",
};

export default function ProfilePage() {
  const storeProjectId = useProjectStore((s) => s.currentProjectId);
  const { data, isLoading, error } = trpc.dashboard.getOwnerPortrait.useQuery();
  const { data: projects } = trpc.project.list.useQuery();
  const { wallet, loading: walletLoading } = useBusinessWallet();
  const currentProject =
    projects?.find((p) => p.id === storeProjectId) || projects?.[0];
  const projectId = currentProject?.id;

  const { data: capability } = trpc.founder.getCapabilityStatus.useQuery(
    { projectId: projectId! },
    { enabled: Boolean(projectId) },
  );

  const { data: brands } = trpc.project.listBrands.useQuery(
    { projectId: projectId! },
    { enabled: Boolean(projectId) },
  );

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="我的"
        title="正在打开…"
        description="读取你的经营习惯与短板。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="我的"
          title="暂时打不开"
          description="先回今日，稍后再看。"
          primaryAction={{ href: "/dashboard", label: "回今日" }}
          secondaryAction={{ href: "/projects", label: "企业" }}
        />
      </div>
    );
  }

  const portrait = data?.portrait;
  const enterpriseName =
    brands?.activeBrand?.brandName ||
    capability?.projectName ||
    currentProject?.name ||
    "你的企业";
  const profilePref =
    currentProject && currentProject.profile && typeof currentProject.profile === "object"
      ? (currentProject.profile as { founderPreference?: string }).founderPreference
      : undefined;
  const styleLabel =
    (profilePref && PREFERENCE_LABEL[profilePref]) || "稳健增长型";

  const capScores = capability?.scores ?? [];
  const strongestCap = capScores.length
    ? [...capScores].sort((a, b) => b.score - a.score)[0]
    : null;
  const weakestCap = capScores.length
    ? [...capScores].sort((a, b) => a.score - b.score)[0]
    : null;

  const growthDelta = capability?.lastGrowthDelta;
  const reflections = growthDelta?.reflections?.filter(Boolean) ?? [];
  const learningNext = growthDelta?.learningNext?.filter(Boolean) ?? [];

  const strengths = [
    strongestCap ? `${strongestCap.label}相对更稳（${strongestCap.score}）` : null,
    portrait?.strongestCapability && !strongestCap
      ? portrait.strongestCapability
      : null,
    portrait?.roleLabel,
  ].filter(Boolean) as string[];

  const risks = [
    weakestCap
      ? `${weakestCap.label}是当前短板（${weakestCap.score}）：${weakestCap.note}`
      : portrait?.weakestCapability
        ? `${portrait.weakestCapability}相关能力偏弱`
        : null,
    portrait?.bottleneckReason && !weakestCap
      ? portrait.bottleneckReason
      : null,
  ].filter(Boolean) as string[];

  const isInitial = Boolean(
    (portrait as { isInitialPortrait?: boolean } | undefined)?.isInitialPortrait,
  );
  const before = isInitial
    ? "单店经营"
    : (portrait?.stageTrack?.[0] as { label?: string } | undefined)?.label ||
      "早期经营";
  const now = portrait?.currentStage || "进入复制 / 校准阶段";
  const summary =
    growthDelta?.summary ||
    portrait?.stateJudgement ||
    `你是一家运营能力相对扎实，但品牌与组织资产仍需强化的餐饮企业。经营风格偏${styleLabel}。`;

  const meetingHref = projectId
    ? `/projects/${projectId}/advisor`
    : "/dashboard";
  const capabilityHref = projectId
    ? `/projects/${projectId}/capability`
    : "/capability";

  return (
    <PageContent width="default" inset="shell" className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] tracking-[0.14em] text-[#66735E]">我的</p>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] text-[#202124] md:text-[34px]">
          {enterpriseName}
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          账户、经营习惯与能力短板。
        </p>
        {projectId ? <BrandSwitcher projectId={projectId} variant="full" /> : null}
      </header>

      {!walletLoading ? (
        <section className="space-y-2">
          <p className="text-[11px] tracking-[0.12em] text-[#6f747b]">账户余额</p>
          <BusinessPointsStrip wallet={wallet} compact />
        </section>
      ) : null}

      <section className="space-y-3 border-y border-[rgba(24,24,23,0.1)] py-6">
        <p className="text-[11px] tracking-[0.12em] text-[#6f747b]">现在这样</p>
        <p className="text-[17px] leading-[1.7] text-[#202124]">{summary}</p>
        <p className="text-[13px] text-[#6f747b]">风格：{styleLabel}</p>
      </section>

      {projectId ? (
        <section className="space-y-3 border-b border-[rgba(24,24,23,0.08)] pb-6">
          <IntelligenceProfilePanel projectId={projectId} />
        </section>
      ) : null}

      {capScores.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] tracking-[0.08em] text-[#66735E]">能力</p>
            <Link
              href={capabilityHref}
              prefetch={false}
              className="text-[13px] font-medium text-[#66735E] no-underline"
            >
              全部 →
            </Link>
          </div>
          <ul className="divide-y divide-[rgba(24,24,23,0.08)] border-y border-[rgba(24,24,23,0.08)]">
            {capScores.map((s) => (
              <li
                key={s.id}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-[15px] font-medium text-[#202124]">{s.label}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#6f747b]">
                    {s.note}
                  </p>
                </div>
                <p
                  className={`font-display text-[22px] font-semibold tracking-[-0.03em] ${trendTone(s.trendGlyph)}`}
                >
                  {s.score}
                  <span className="ml-1 text-[14px]">{s.trendGlyph}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {reflections.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">最近复盘</p>
          <ul className="space-y-1.5">
            {reflections.slice(0, 4).map((item) => (
              <li key={item} className="text-[15px] leading-7 text-[#202124]">
                · {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[12px] tracking-[0.08em] text-[#66735E]">优势</p>
        <ul className="space-y-1.5">
          {(strengths.length ? strengths : ["还在观察中"]).map((item) => (
            <li key={item} className="text-[15px] leading-7 text-[#202124]">
              · {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">瓶颈</p>
        <ul className="space-y-1.5">
          {(risks.length ? risks : ["验证还少，画像还在形成"]).map(
            (item) => (
              <li key={item} className="text-[15px] leading-7 text-[#202124]">
                · {item}
              </li>
            ),
          )}
        </ul>
      </section>

      {learningNext.length > 0 ? (
        <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">下一步</p>
          <ul className="space-y-1.5">
            {learningNext.slice(0, 3).map((item, idx) => (
              <li key={item} className="text-[15px] leading-7 text-[#202124]">
                {idx + 1}. {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">轨迹</p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">之前：</span>
          {before}
          <span className="mx-2 text-[#c5c2ba]">→</span>
          <span className="text-[#6f747b]">现在：</span>
          {now}
        </p>
      </section>

      <section className="flex flex-col gap-2.5 border-t border-[rgba(24,24,23,0.08)] pt-6 sm:flex-row sm:flex-wrap">
        <Link
          href={
            projectId
              ? `/projects/${projectId}/decision-case`
              : meetingHref
          }
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[14px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
        >
          去拍板
          <Compass className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[14px] font-semibold text-[#181817] no-underline touch-manipulation"
        >
          回今日
        </Link>
        {projectId ? (
          <Link
            href={`/projects/${projectId}/runtime?tab=growth`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[14px] font-medium text-[#66735E] no-underline touch-manipulation"
          >
            成长 Runtime
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
        <Link
          href="/billing"
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 text-[14px] font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
        >
          经营点
        </Link>
      </section>
    </PageContent>
  );
}
