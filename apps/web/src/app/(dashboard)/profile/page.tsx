"use client";

import Link from "next/link";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { BusinessPointsStrip } from "@/components/operating/BusinessPointsStrip";
import { IntelligenceProfilePanel } from "@/components/operating/IntelligenceProfilePanel";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useBusinessWallet } from "@/hooks/useBusinessWallet";
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

  const { data: agentState } = trpc.mobileAgent.getState.useQuery(
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

  const growthDelta = capability?.lastGrowthDelta;
  const reflections = growthDelta?.reflections?.filter(Boolean) ?? [];
  const learningNext = growthDelta?.learningNext?.filter(Boolean) ?? [];

  const focus = agentState?.known?.focus ?? [];
  const aiAssets = agentState?.state?.assets ?? [];
  const activeGoal = agentState?.state?.activeGoal;

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

  const agentHref = projectId ? `/projects/${projectId}/agent` : "/dashboard";

  return (
    <PageContent width="default" inset="shell" className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] tracking-[0.14em] text-[#66735E]">我的</p>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] text-[#202124] md:text-[34px]">
          {enterpriseName}
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          账户与经营习惯。目标与方案请回对话。
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
        {focus.length ? (
          <p className="text-[13px] text-[#66735E]">
            AI 记得你关注：{focus.join("、")}
          </p>
        ) : null}
        {activeGoal ? (
          <p className="text-[13px] text-[#6f747b]">
            进行中：{activeGoal.title}
            {activeGoal.currentStage ? ` · ${activeGoal.currentStage}` : ""}
          </p>
        ) : null}
      </section>

      {projectId ? (
        <section className="space-y-3 border-b border-[rgba(24,24,23,0.08)] pb-6">
          <IntelligenceProfilePanel projectId={projectId} />
        </section>
      ) : null}

      {aiAssets.length > 0 ? (
        <section className="space-y-2 border-b border-[rgba(24,24,23,0.08)] pb-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
              AI 产出资产
            </p>
            <Link
              href="/profile/assets"
              prefetch={false}
              className="text-[13px] font-medium text-[#66735E] no-underline"
            >
              资料中心 →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {aiAssets.slice(0, 4).map((a) => (
              <li key={a.assetId} className="text-[15px] leading-7 text-[#202124]">
                · {a.title}
                <span className="ml-2 text-[12px] text-[#9a968e]">{a.version}</span>
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
          href={agentHref}
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[14px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
        >
          回对话
        </Link>
        <Link
          href="/profile/assets"
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[14px] font-semibold text-[#181817] no-underline touch-manipulation"
        >
          经营资产
        </Link>
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
