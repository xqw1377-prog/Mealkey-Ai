"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DecisionCenterMorning } from "@/components/operating/DecisionCenterMorning";
import { MKPageHeader } from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { ThreeEasyHint } from "@/components/operating/ThreeEasyGuide";
import { greetingByHour } from "@/lib/time-greeting";
import { trpc } from "@/lib/trpc";
import type { DailyScanV1 } from "@/server/founder-layer/contracts/decision-center";
import type { ProjectItem } from "@/types/operating";

type DashboardHomeData = {
  todayLabel: string;
  ownerName: string;
  projectStatus: string;
  homeMode: string;
  dailyScan?: DailyScanV1 | null;
  biggestRisk: string;
  currentProblemTitle: string;
  dailyJudgement: string;
  dailyRecommendation: string;
  dailyObservation: string;
  dailyDiagnosis: string;
  brandPortfolio?: {
    enterpriseName: string;
    brandCount: number;
    activeBrandName: string;
    activeBrandId: string;
    brandNames: string[];
  } | null;
  pendingMeetingDraft?: {
    topic: string;
    lifecycleLabel: string;
    deliberationRound: number;
    href: string;
  } | null;
  pendingCouncilAdjudication?: {
    topic: string;
    level?: string | null;
    recommendedAction?: string | null;
    insightCount?: number;
    biggestDispute?: string | null;
    statusLabel: string;
    href: string;
  } | null;
  pendingMobileDecision?: {
    title: string;
    reason: string;
    goalTitle?: string | null;
    href: string;
    agentHref: string;
  } | null;
  founderIntelligence?: {
    headline: string;
    styleLine: string;
    confidence: number;
    riskPreference: string;
    aiStance: string;
    followThrough: string;
    completionRate?: number | null;
    lesson?: string | null;
    industryOptIn: boolean;
    href: string;
  } | null;
  activeValidationTask?: {
    hypothesisStatement?: string;
    title: string;
    daysRemaining: number;
    suggestRedeision?: boolean;
    status: string;
    aiJudgement?: string | null;
    triggerReasons?: string[];
    latestNote?: string | null;
    href: string;
  } | null;
  pendingRedeision?: {
    topic: string;
    reason: string;
    href: string;
  } | null;
  openRiskAlert?: {
    id: string;
    type: string;
    level: string;
    title: string;
    description: string;
    suggestedTopic: string;
    suggestExpert: string | null;
    suggestCouncil?: boolean;
  } | null;
  openOpportunity?: {
    id: string;
    title: string;
    score: number | null;
    status: string;
    suggestedTopic: string;
    suggestExpert: string | null;
  } | null;
  riskBlocksOpportunity?: boolean;
  lastActionPlan?: {
    planId: string;
    summary: string;
    goals: Array<{ title: string; horizonDays?: number }>;
    actions: Array<{
      actionId?: string;
      title: string;
      owner?: string;
      status: string;
      dueInDays?: number;
    }>;
    validationTaskId?: string;
  } | null;
  founderGrowth?: {
    summary: string | null;
    learningNext: string[];
    reflections: string[];
    weakest: {
      id: string;
      label: string;
      score: number;
      note: string;
    } | null;
    cognitiveGap?: {
      summary: string;
      believedCause: string;
      likelyRootCause: string;
      kind: string;
      suggestCommittee: string | null;
    } | null;
    growthTasks?: Array<{ goal: string; topic: string }>;
  } | null;
  growthPlan?: {
    daysRemaining: number;
    decisionSummary: string;
  } | null;
};

function CouncilPendingBanner({
  projectId,
  item,
}: {
  projectId: string;
  item: NonNullable<DashboardHomeData["pendingCouncilAdjudication"]>;
}) {
  const utils = trpc.useUtils();
  const dismiss = trpc.decisionCouncil.dismissActiveDraft.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getHome.invalidate();
    },
  });

  return (
    <section className="relative mt-5 flex flex-col gap-3 border-l-2 border-[#B47C5C] bg-[rgba(180,124,92,0.06)] py-3.5 pl-4 pr-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.1em] text-[#B47C5C]">待你进决策室</p>
        <p className="mt-1 text-[15px] font-medium leading-6 text-[#202124] sm:truncate">
          {item.topic}
        </p>
        <p className="mt-0.5 text-[12px] text-[#6f747b]">
          {item.recommendedAction
            ? `建议：${item.recommendedAction}`
            : item.statusLabel}
        </p>
      </div>
      <div className="flex gap-2 sm:mt-0.5 sm:shrink-0 sm:flex-col sm:items-end">
        <Link
          href={item.href}
          prefetch={false}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98] sm:min-h-11 sm:flex-none sm:rounded-none sm:bg-transparent sm:px-0 sm:text-[13px] sm:text-[#181817]"
        >
          去决策室 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate({ projectId })}
          className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[15px] text-[#6f747b] touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-[13px] sm:underline sm:underline-offset-2"
        >
          放弃
        </button>
      </div>
    </section>
  );
}

/** 无企业：引导首次/补填基础信息（不旁路空壳建店） */
function EmptyWorldGate({ greeting }: { greeting: string }) {
  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="首次登录"
        title={greeting}
        description="先花一分钟告诉我你的店和当下最想解决的事，再进入对话。"
      >
        <Link
          href="/onboarding?force=1"
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
        >
          填写基础信息
          <ArrowRight className="h-4 w-4" />
        </Link>
      </MKPageHeader>
    </PageContent>
  );
}

/**
 * 今日决策看板 — Phase 1 细节打磨
 * 今日经营动态 → 值得关注 → 决策室（拍板只在决策室）
 */
export function DashboardPage({
  currentProject,
  home,
}: {
  currentProject?: ProjectItem | null;
  home?: DashboardHomeData | null;
}) {
  const greeting = greetingByHour();

  if (!currentProject || !home) {
    return <EmptyWorldGate greeting={greeting} />;
  }

  const scan = home.dailyScan;
  const isConsultingDraft = Boolean(
    home.pendingMeetingDraft?.href.includes("/advisor"),
  );

  return (
    <PageContent width="console" inset="shell" className="relative space-y-6 pb-8">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(102,115,94,0.09),_transparent_68%)]" />

      <MKPageHeader
        eyebrow="经营动态"
        title={greeting}
        description={`${home.todayLabel} · ${currentProject.name} · 一眼看清今天最该做的事`}
        meta={
          <div className="space-y-2">
            <ThreeEasyHint projectId={currentProject.id} />
            <OpsSecondaryLinks
              projectId={currentProject.id}
              links={[
                { href: `/projects/${currentProject.id}/agent`, label: "回对话" },
                {
                  href: `/projects/${currentProject.id}/decision-room`,
                  label: "决策室",
                },
                {
                  href: `/projects/${currentProject.id}/decisions`,
                  label: "跟进",
                },
              ]}
            />
          </div>
        }
      />

      {home.pendingCouncilAdjudication ? (
        <CouncilPendingBanner
          projectId={currentProject.id}
          item={home.pendingCouncilAdjudication}
        />
      ) : null}

      {!home.pendingCouncilAdjudication && home.pendingMobileDecision ? (
        <section className="relative mt-5 flex flex-col gap-3 border-l-2 border-[#181817] bg-[rgba(24,24,23,0.04)] py-3.5 pl-4 pr-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.1em] text-[#66735E]">
              对话里待确认
            </p>
            <p className="mt-1 text-[15px] font-medium leading-6 text-[#202124] sm:truncate">
              {home.pendingMobileDecision.title}
            </p>
            <p className="mt-0.5 text-[12px] text-[#6f747b]">
              {home.pendingMobileDecision.reason}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <Link
              href={home.pendingMobileDecision.href}
              prefetch={false}
              className="inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation sm:w-auto"
            >
              去决策室 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={home.pendingMobileDecision.agentHref}
              prefetch={false}
              className="text-center text-[12px] text-[#66735E] no-underline underline-offset-2 hover:underline"
            >
              回对话
            </Link>
          </div>
        </section>
      ) : null}

      {home.pendingMeetingDraft && !isConsultingDraft ? (
        <section className="relative mt-5 flex flex-col gap-3 border-l-2 border-[#66735E] bg-[rgba(102,115,94,0.05)] py-3.5 pl-4 pr-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.1em] text-[#66735E]">
              未完成的决策
            </p>
            <p className="mt-1 text-[15px] font-medium leading-6 text-[#202124] sm:truncate">
              {home.pendingMeetingDraft.topic}
            </p>
          </div>
          <Link
            href={
              home.pendingMeetingDraft.href.includes("decision-")
                ? home.pendingMeetingDraft.href
                : `/projects/${currentProject.id}/decision-room?topic=${encodeURIComponent(home.pendingMeetingDraft.topic)}`
            }
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation sm:w-auto"
          >
            继续决策 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      {scan ? (
        <div className="relative mt-2">
          <DecisionCenterMorning
            scan={scan}
            projectId={currentProject.id}
            embedded
          />
        </div>
      ) : (
        <section className="relative mt-8 space-y-4">
          <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
            今日决策
          </p>
          <h2 className="font-display text-[22px] font-semibold text-[#202124]">
            系统扫描还在准备，你仍可先进入决策室
          </h2>
          <p className="text-[15px] leading-7 text-[#6f747b]">
            用语音说清一件事，就能进入决策室完成判断。
          </p>
          <Link
            href={`/projects/${currentProject.id}/decision-room?intake=voice`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
          >
            语音发起决策
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      {/* 次级入口：咨询 / 习惯 / 快捷链，不与主决策区同层竞争 */}
      <details className="relative mt-8 border-t border-[rgba(24,24,23,0.06)] pt-4">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-[#6f747b] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
          更多入口
        </summary>
        <div className="mt-4 space-y-5">
          {home.pendingMeetingDraft && isConsultingDraft ? (
            <section>
              <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
                未完成的咨询（与今日决策分开）
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] text-[#3a3d41]">
                  {home.pendingMeetingDraft.topic}
                </p>
                <Link
                  href={home.pendingMeetingDraft.href}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center text-[13px] font-medium text-[#66735E] underline-offset-4 hover:underline"
                >
                  继续咨询
                </Link>
              </div>
            </section>
          ) : null}

          {home.founderIntelligence ? (
            <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
                  经营决策习惯
                </p>
                <p className="mt-1 text-[14px] leading-6 text-[#3a3d41]">
                  {home.founderIntelligence.headline}
                </p>
              </div>
              <Link
                href={home.founderIntelligence.href}
                prefetch={false}
                className="inline-flex min-h-11 shrink-0 items-center text-[13px] font-medium text-[#66735E] underline-offset-4 hover:underline"
              >
                查看
              </Link>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-x-1 gap-y-1">
            <Link
              href={`/projects/${currentProject.id}/agent`}
              prefetch={false}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#181817] no-underline underline-offset-4 touch-manipulation hover:underline"
            >
              回对话
            </Link>
            <Link
              href={`/projects/${currentProject.id}/decision-room`}
              prefetch={false}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 touch-manipulation hover:underline"
            >
              决策室
            </Link>
            <Link
              href="/profile"
              prefetch={false}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 touch-manipulation hover:underline"
            >
              我的
            </Link>
          </div>
        </div>
      </details>
    </PageContent>
  );
}
