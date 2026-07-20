"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { BusinessPointsStrip } from "@/components/operating/BusinessPointsStrip";
import { DecisionCenterMorning } from "@/components/operating/DecisionCenterMorning";
import { PageContent } from "@/components/operating/PageContent";
import { useBusinessWallet } from "@/hooks/useBusinessWallet";
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

function clampBrief(text: string, max = 140) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

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
        <p className="text-[11px] tracking-[0.1em] text-[#B47C5C]">待你拍板</p>
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
          去拍板 <ArrowRight className="h-3.5 w-3.5" />
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

/**
 * 今日决策看板 — Phase 1 细节打磨
 * 价值顺序：待拍板 → 今日判断 → 自助发起 → 收件箱/行动
 */
export function DashboardPage({
  currentProject,
  home,
}: {
  currentProject?: ProjectItem | null;
  home?: DashboardHomeData | null;
}) {
  const { wallet, loading: walletLoading } = useBusinessWallet();
  const greeting = greetingByHour();
  const utils = trpc.useUtils();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "loading" | "success" | "error";
    message: string;
  } | null>(null);
  const [optimisticActionStates, setOptimisticActionStates] = useState<Record<string, boolean>>({});
  const [recentActionUpdate, setRecentActionUpdate] = useState<{
    id: string;
    done: boolean;
    title: string;
  } | null>(null);
  const toggleTodayAction = trpc.dashboard.toggleTodayAction.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getHome.invalidate();
      setPendingActionId(null);
    },
    onError: () => {
      setPendingActionId(null);
      setOptimisticActionStates({});
      setActionFeedback({ tone: "error", message: "更新失败，请重试" });
      window.setTimeout(() => setActionFeedback(null), 2400);
    },
  });

  if (!currentProject || !home) {
    return (
      <PageContent width="narrow" inset="shell" className="space-y-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-[#66735E]">
          餐启 · 今日决策
        </p>
        <h1 className="font-display text-[34px] font-semibold leading-[1.12] tracking-[-0.045em] text-[#202124]">
          {greeting}
        </h1>
        <p className="max-w-md text-[15px] leading-7 text-[#6f747b]">
          先建立你的企业，才能帮你判断今天该拍什么板。
        </p>
        <Link
          href="/onboarding"
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
        >
          创建企业
          <ArrowRight className="h-4 w-4" />
        </Link>
      </PageContent>
    );
  }

  const scan = home.dailyScan;
  const displayScan = useMemo(() => {
    if (!scan) return scan;
    if (Object.keys(optimisticActionStates).length === 0) return scan;
    return {
      ...scan,
      actions: scan.actions.map((item) =>
        Object.prototype.hasOwnProperty.call(optimisticActionStates, item.id)
          ? { ...item, done: optimisticActionStates[item.id] }
          : item,
      ),
    };
  }, [optimisticActionStates, scan]);
  const isConsultingDraft = Boolean(
    home.pendingMeetingDraft?.href.includes("/advisor"),
  );

  useEffect(() => {
    if (!scan) return;
    setOptimisticActionStates({});
  }, [scan]);

  useEffect(() => {
    if (!recentActionUpdate) return;
    const timer = window.setTimeout(() => setRecentActionUpdate(null), 3200);
    return () => window.clearTimeout(timer);
  }, [recentActionUpdate]);

  return (
    <PageContent width="narrow" inset="shell" className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(102,115,94,0.09),_transparent_68%)]" />

      {/* 钱包条退到次视觉层，不与今日主 CTA 抢注意力 */}
      <div className="relative mt-1 opacity-90">
        {!walletLoading ? <BusinessPointsStrip wallet={wallet} compact /> : null}
      </div>

      {actionFeedback ? (
        <div
          role={actionFeedback.tone === "loading" ? "status" : "alert"}
          aria-live={actionFeedback.tone === "loading" ? "polite" : "assertive"}
          className={`fixed bottom-4 right-4 z-40 max-w-[min(92vw,360px)] rounded-[16px] px-4 py-3 text-[13px] font-medium shadow-[0_18px_40px_rgba(24,24,23,0.16)] ${
            actionFeedback.tone === "success"
              ? "border border-[rgba(102,115,94,0.18)] bg-[#F2F6EE] text-[#465240]"
              : actionFeedback.tone === "error"
                ? "border border-[rgba(180,124,92,0.18)] bg-[#FBF1EB] text-[#8A4F2D]"
                : "border border-[rgba(24,24,23,0.08)] bg-[rgba(24,24,23,0.03)] text-[#5f6368]"
          }`}
        >
          {actionFeedback.message}
        </div>
      ) : null}

      {/* 仅决策相关未完成条占主位；咨询草稿降级 */}
      {home.pendingCouncilAdjudication ? (
        <CouncilPendingBanner
          projectId={currentProject.id}
          item={home.pendingCouncilAdjudication}
        />
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
            <p className="mt-0.5 text-[12px] text-[#6f747b]">
              {home.pendingMeetingDraft.lifecycleLabel}
            </p>
          </div>
          <Link
            href={
              home.pendingMeetingDraft.href.includes("decision-")
                ? home.pendingMeetingDraft.href
                : `/projects/${currentProject.id}/decision-room?topic=${encodeURIComponent(home.pendingMeetingDraft.topic)}`
            }
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98] sm:mt-0.5 sm:min-h-11 sm:w-auto sm:shrink-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:text-[13px] sm:text-[#181817]"
          >
            继续决策 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      {home.activeValidationTask || home.pendingRedeision ? (
        <section className="relative mt-5 flex flex-col gap-2 border-l-2 border-[rgba(24,24,23,0.14)] py-3 pl-4 pr-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
              {home.activeValidationTask?.suggestRedeision ||
              home.pendingRedeision
                ? "验证偏航 · 该复盘了"
                : "正在验证"}
            </p>
            <p className="mt-1 text-[14px] leading-6 text-[#202124]">
              {clampBrief(
                home.activeValidationTask?.hypothesisStatement ||
                  home.activeValidationTask?.title ||
                  home.pendingRedeision?.topic ||
                  "",
                72,
              )}
              {home.activeValidationTask ? (
                <span className="text-[#6f747b]">
                  {" "}
                  · 剩 {home.activeValidationTask.daysRemaining} 天
                </span>
              ) : null}
            </p>
          </div>
          <Link
            href={
              home.pendingRedeision?.href?.includes("decision-")
                ? home.pendingRedeision.href
                : home.activeValidationTask?.href ||
                  `/projects/${currentProject.id}/decisions`
            }
            prefetch={false}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-semibold text-[#181817] no-underline underline-offset-4 touch-manipulation hover:underline"
          >
            {home.pendingRedeision ||
            home.activeValidationTask?.suggestRedeision
              ? "去复盘"
              : "去打卡"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      {displayScan ? (
        <div className="relative mt-7">
          <DecisionCenterMorning
            scan={displayScan}
            projectId={currentProject.id}
            pendingActionId={pendingActionId}
            recentActionUpdate={recentActionUpdate}
            onToggleAction={(actionId) => {
              const action = displayScan.actions.find((item) => item.id === actionId);
              if (!action) return;
              const wasDone = Boolean(
                action.done,
              );
              const nextDone = !wasDone;
              setPendingActionId(actionId);
              setOptimisticActionStates((current) => ({
                ...current,
                [actionId]: nextDone,
              }));
              setActionFeedback({
                tone: "loading",
                message: wasDone ? "正在取消完成…" : `正在完成：${action.title}`,
              });
              toggleTodayAction.mutate(
                {
                  projectId: currentProject.id,
                  actionId,
                },
                {
                  onSuccess: (result) => {
                    const updated = result.actions.find((item) => item.actionId === actionId);
                    const confirmedDone = updated
                      ? updated.status === "done" || updated.status === "completed"
                      : nextDone;
                    setRecentActionUpdate({
                      id: actionId,
                      done: confirmedDone,
                      title: action.title,
                    });
                    setActionFeedback({
                      tone: "success",
                      message: confirmedDone
                        ? `已完成：${action.title}`
                        : `已恢复未完成：${action.title}`,
                    });
                    window.setTimeout(() => setActionFeedback(null), 2400);
                  },
                },
              );
            }}
          />
        </div>
      ) : (
        <section className="relative mt-8 space-y-4">
          <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
            今日决策
          </p>
          <h2 className="font-display text-[22px] font-semibold text-[#202124]">
            系统扫描还在准备，你仍可先拍板
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
              href={`/projects/${currentProject.id}/decision-room`}
              prefetch={false}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#181817] no-underline underline-offset-4 touch-manipulation hover:underline"
            >
              决策室
            </Link>
            <Link
              href={`/projects/${currentProject.id}/decisions`}
              prefetch={false}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 touch-manipulation hover:underline"
            >
              行动打卡
            </Link>
            <Link
              href={`/projects/${currentProject.id}/restaurant-intelligence`}
              prefetch={false}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 touch-manipulation hover:underline"
            >
              经营画像
            </Link>
            <Link
              href={`/projects/${currentProject.id}/capability`}
              prefetch={false}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 touch-manipulation hover:underline"
            >
              能力
            </Link>
          </div>
        </div>
      </details>
    </PageContent>
  );
}
