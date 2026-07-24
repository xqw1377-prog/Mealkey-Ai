"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Check,
  Clock,
  History,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { ActionTracker } from "./components";
import { ValidationFeedbackCard } from "./ValidationFeedbackCard";
import {
  PositioningReviewQueue,
  PositioningVersionTimeline,
  BrandSwitcher,
  DecisionOpinionsTimeline,
  parseDecisionOpinions,
  DecisionRuntimePanel,
  ExecutionRuntimePanel,
  CouncilTracePanel,
} from "@/components/operating";
import { MKPageHeader } from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import { formatRelativeDate } from "@/lib/format";
import { useProjectId } from "@/hooks/useProjectId";
import { trpc } from "@/lib/trpc";
import type { ReviewQueueItem } from "@/lib/positioning-review";
import type { PositioningSnapshot } from "@/lib/positioning";

type DecisionItem = {
  id: string;
  problem: string;
  judgement: string;
  diagnosis: string;
  strategy: string;
  action: string;
  observation: string;
  confidence: number;
  type: string;
  evidence: unknown[];
  outcome: unknown;
  learning: unknown;
  createdAt: Date;
  agentRun: {
    id: string;
    agentId: string;
    duration: number;
    tokens: number;
    status: string;
    createdAt: Date;
  } | null;
};

type DecisionOutcome = {
  helpful?: boolean;
  comment?: string | null;
  feedbackAt?: string;
  status?: string;
  result?: string;
  progressNote?: string | null;
  validationPlan?: string;
  focusChoice?: string | null;
  meetingTitle?: string;
  supportCount?: number;
  opposeCount?: number;
  confirmedAt?: string;
  evidenceGrade?: string;
  confirmMode?: string;
  evidenceIds?: string[];
  evidenceSufficient?: boolean;
  /** Decision Runtime 会议种子意见 */
  opinions?: Array<{
    decisionId?: string;
    expert: string;
    position: string;
    reason: string;
    confidence?: number;
    evidenceIds?: string[];
  }>;
  mkStatus?: string;
  growthPlan?: {
    day30?: string;
    day60?: string;
    day90?: string;
  } | null;
  validationTask?: {
    id: string;
    title?: string;
    objective?: string;
    owner?: string;
    horizonDays?: number;
    status?: string;
    lifecycle?: string;
    hypothesis?: {
      statement?: string;
      confidence?: number;
      riskIfWrong?: string;
      committee?: string;
    };
    hypothesisStatement?: string;
    aiJudgement?: string;
    passProbability?: number;
    suggestRedeision?: boolean;
    triggerReasons?: string[];
    committeeLabel?: string;
    lifecycleLabel?: string;
    metrics?: Array<{
      id?: string;
      label: string;
      target?: string | number;
      targetLabel?: string;
      actual?: string | number;
      actualLabel?: string;
      status?: string;
    }>;
    checkIns?: Array<{ note?: string; deviationDays?: number; riskLevel?: string }>;
  } | null;
  review?: {
    needsReReview?: boolean;
    status?: string;
    reason?: string;
  };
  councilSource?: string | null;
  councilTrace?: {
    caseId?: string;
    sessionId?: string;
    insightCount?: number;
    recommendedAction?: string;
    founderChoice?: string;
    decisionTrace?: {
      insights?: Array<{
        id?: string;
        sourceAgent?: string;
        domain?: string;
        finding?: string;
        confidence?: number;
      }>;
      councilOpinions?: Array<{
        member?: string;
        position?: string;
        judgment?: string;
      }>;
      resolution?: {
        recommendedAction?: string;
        majorityView?: string[];
      };
      outcome?: { status?: string };
    } | null;
  } | null;
  decisionContract?: {
    source?: string;
    insights?: Array<{
      id?: string;
      sourceAgent?: string;
      domain?: string;
      finding?: string;
      confidence?: number;
    }>;
    level?: string;
    roster?: string[];
  } | null;
};

type DecisionLearning = {
  type?: string;
  summary?: string;
  comment?: string | null;
};

function parseOutcome(value: unknown): DecisionOutcome | null {
  if (!value || typeof value !== "object") return null;
  return value as DecisionOutcome;
}

function parseLearning(value: unknown): DecisionLearning | null {
  if (!value || typeof value !== "object") return null;
  return value as DecisionLearning;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "border-[rgba(102,115,94,0.16)] bg-[rgba(102,115,94,0.10)] text-[#66735E]"
      : pct >= 60
        ? "border-[rgba(180,124,92,0.16)] bg-[rgba(180,124,92,0.10)] text-[#B47C5C]"
        : "border-[rgba(24,24,23,0.12)] bg-[rgba(24,24,23,0.06)] text-[#202124]";

  return (
    <span className={`inline-flex items-center rounded-[12px] border px-2.5 py-0.5 text-[11px] font-medium ${color}`}>
      {pct}%
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    general: "综合",
    meeting: "咨询会议",
    positioning: "定位",
    investment: "投资",
    location: "选址",
    branding: "品牌",
    product: "产品",
    marketing: "营销",
    risk: "风险",
  };

  const isMeeting = type === "meeting";

  return (
    <span
      className={`inline-flex items-center rounded-[12px] px-2.5 py-0.5 text-[11px] font-medium ${
        isMeeting
          ? "bg-[rgba(102,115,94,0.12)] text-[#66735E]"
          : "bg-[#F5F3EE] text-[#6f747b]"
      }`}
    >
      {labels[type] ?? type}
    </span>
  );
}

/** 行动主列表窗口：近 3 日；更早收入历史 */
const ACTIVE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function isWithinActiveWindow(createdAt: Date | string | number) {
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= ACTIVE_WINDOW_MS;
}

function StageBadge({ decision }: { decision: DecisionItem }) {
  const outcome = parseOutcome(decision.outcome);
  const learning = parseLearning(decision.learning);
  const ageDays = Math.floor((Date.now() - new Date(decision.createdAt).getTime()) / 86400000);
  const isUserFeedback =
    outcome?.evidenceGrade === "user_feedback" ||
    String(outcome?.status || "").startsWith("feedback_");

  let label = "假设中";
  let className = "border-[rgba(24,24,23,0.12)] bg-[rgba(24,24,23,0.04)] text-[#6f747b]";

  if (outcome?.status === "hypothesis") {
    label = "假设推进";
    className = "border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.10)] text-[#B47C5C]";
  } else if (outcome?.status === "superseded") {
    label = "已修订";
    className = "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#6f747b]";
  } else if (isUserFeedback) {
    // 主观反馈不得显示为「已验证」
    if (outcome?.result === "aligned" || outcome?.status === "feedback_positive") {
      label = "反馈·正面";
    } else if (outcome?.result === "partial" || outcome?.status === "feedback_partial") {
      label = "反馈·部分";
    } else {
      label = "反馈·偏离";
    }
    className = "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#6f747b]";
  } else if (learning?.summary && !isUserFeedback) {
    label = "已学习";
    className = "border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.10)] text-[#66735E]";
  } else if (outcome?.result === "aligned" || outcome?.status === "validated") {
    label = "已验证";
    className = "border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.10)] text-[#66735E]";
  } else if (outcome?.result === "partial" || outcome?.status === "adjusted") {
    label = "需调整";
    className = "border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.10)] text-[#B47C5C]";
  } else if (outcome?.result === "off" || outcome?.status === "revisiting") {
    label = "待复盘";
    className = "border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.10)] text-[#B47C5C]";
  } else if (outcome?.status === "validating" || (outcome && outcome.helpful === undefined && !outcome.feedbackAt)) {
    label = "验证中";
    className = "border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.10)] text-[#B47C5C]";
  } else if (outcome?.helpful !== undefined) {
    label = "已有反馈";
    className = "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#6f747b]";
  } else if (outcome) {
    label = "执行中";
    className = "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#202124]";
  } else if (ageDays <= 14) {
    label = "执行中";
    className = "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#202124]";
  }

  return (
    <span className={`inline-flex items-center rounded-[12px] border px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}

function DecisionsArchivePageInner() {
  const projectId = useProjectId() || "";

  const { data: project, isLoading: projectLoading } = trpc.project.getById.useQuery(
    { id: projectId },
    { enabled: Boolean(projectId) },
  );
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.decisionArchive.list.useInfiniteQuery(
    { projectId, limit: 20 },
    {
      enabled: Boolean(projectId),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  );
  const listReady = Boolean(projectId) && (!isLoading || Boolean(data));

  const { data: stats } = trpc.decisionArchive.stats.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const { data: brands } = trpc.project.listBrands.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  // 次要上下文：等列表首屏就绪后再拉，降低首屏并行风暴
  const { data: positioningContext } = trpc.agent.positioningContext.useQuery(
    { projectId },
    { enabled: listReady },
  );
  const { data: equityContext } = trpc.agent.equityContext.useQuery(
    { projectId },
    { enabled: listReady },
  );
  const { data: reviewQueueData } = trpc.decisionArchive.reviewQueue.useQuery(
    { projectId },
    { enabled: listReady },
  );
  const { data: validationCenter } = trpc.validationOs.listActive.useQuery(
    { projectId },
    { enabled: listReady },
  );
  const { data: memorySnapshot } = trpc.founder.getMemorySnapshot.useQuery(
    { projectId },
    { enabled: listReady },
  );
  const utils = trpc.useUtils();

  const submitFeedback = trpc.decisionArchive.submitFeedback.useMutation({
    onSuccess: () => {
      void utils.decisionArchive.list.invalidate({ projectId });
      void utils.decisionArchive.stats.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
      void utils.validationOs.listActive.invalidate({ projectId });
    },
  });

  const validationCheckIn = trpc.validationOs.checkIn.useMutation({
    onSuccess: () => {
      void utils.decisionArchive.list.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
      void utils.validationOs.listActive.invalidate({ projectId });
    },
  });

  const validationComplete = trpc.validationOs.complete.useMutation({
    onSuccess: () => {
      void utils.decisionArchive.list.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
      void utils.validationOs.listActive.invalidate({ projectId });
      void utils.founder.getCapabilityStatus.invalidate({ projectId });
      void utils.founder.getMemorySnapshot.invalidate({ projectId });
    },
  });

  const resolveReview = trpc.decisionArchive.resolveReview.useMutation({
    onSuccess: () => {
      void utils.decisionArchive.reviewQueue.invalidate({ projectId });
      void utils.decisionArchive.stats.invalidate({ projectId });
      void utils.decisionArchive.list.invalidate({ projectId });
    },
  });

  const [feedbackState, setFeedbackState] = useState<Record<string, "submitting" | "done">>({});
  const [feedbackComment, setFeedbackComment] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const handleResolveReview = useCallback(
    async (decisionId: string, status: "dismissed" | "reviewed") => {
      setDismissingId(decisionId);
      try {
        await resolveReview.mutateAsync({ projectId, decisionId, status });
      } finally {
        setDismissingId(null);
      }
    },
    [projectId, resolveReview],
  );

  const handleFeedback = useCallback(
    async (
      decisionId: string,
      helpful: boolean,
      comment?: string,
      extra?: {
        result?: "aligned" | "partial" | "off";
        progressNote?: string;
        taskId?: string;
      },
    ) => {
      setFeedbackState((prev) => ({ ...prev, [decisionId]: "submitting" }));
      try {
        await submitFeedback.mutateAsync({
          decisionId,
          helpful,
          comment,
          result: extra?.result,
          progressNote: extra?.progressNote,
        });
        if (extra?.taskId && extra.result) {
          await validationComplete.mutateAsync({
            projectId,
            taskId: extra.taskId,
            result: extra.result,
            summary:
              comment ||
              extra.progressNote ||
              (extra.result === "aligned"
                ? "验证通过"
                : extra.result === "partial"
                  ? "部分成立，需调整"
                  : "验证偏离，需复盘"),
          });
        }
        setFeedbackState((prev) => ({ ...prev, [decisionId]: "done" }));
      } catch {
        setFeedbackState((prev) => {
          const next = { ...prev };
          delete next[decisionId];
          return next;
        });
      }
    },
    [projectId, submitFeedback, validationComplete],
  );

  const allDecisions = (data?.pages.flatMap((page) => page.items) ?? []) as DecisionItem[];
  const recentDecisions = allDecisions.filter((d) => isWithinActiveWindow(d.createdAt));
  const historyDecisions = allDecisions.filter((d) => !isWithinActiveWindow(d.createdAt));
  const isAwaitingValidation = (decision: DecisionItem) => {
    const outcome = parseOutcome(decision.outcome);
    if (parseLearning(decision.learning)?.summary) return false;
    if (!outcome) return true;
    if (outcome.feedbackAt || outcome.helpful !== undefined || outcome.result) return false;
    return outcome.status === "validating" || decision.type === "meeting";
  };
  const decisionsAwaitingValidation = recentDecisions.filter(isAwaitingValidation);
  const decisionsWithOutcome = recentDecisions.filter((decision) =>
    Boolean(parseOutcome(decision.outcome)),
  );
  const decisionsWithLearning = recentDecisions.filter((decision) =>
    Boolean(parseLearning(decision.learning)?.summary),
  );
  const featuredValidating = decisionsAwaitingValidation.slice(0, 3);
  const positioningMentalPosition =
    brands?.activeBrand?.mentalPosition ||
    positioningContext?.current?.brandPositioning?.mentalPosition ||
    positioningContext?.current?.oneLiner ||
    brands?.activeBrand?.oneLiner ||
    "";

  if (!projectId) {
    return (
      <div className="space-y-4 pb-2 pt-5 md:pt-6">
        <PageErrorState
          eyebrow="跟进"
          title="找不到企业"
          description="请从企业列表或经营动态重新进入。"
          primaryAction={{ href: "/projects", label: "企业列表" }}
          secondaryAction={{ href: "/dashboard?radar=1", label: "经营动态" }}
        />
      </div>
    );
  }

  if (projectLoading || isLoading) {
    return <PageLoadingState eyebrow="跟进" title="正在打开…" />;
  }

  if (error) {
    return (
      <div className="space-y-4 pb-2 pt-5 md:pt-6">
        <PageErrorState
          eyebrow="跟进"
          title="暂时打不开"
          description={error.message || "稍后再试。"}
          primaryAction={{ href: "/dashboard?radar=1", label: "经营动态" }}
        />
      </div>
    );
  }

  const overviewTitle =
    decisionsAwaitingValidation.length > 0
      ? `${decisionsAwaitingValidation.length} 项待打卡`
      : recentDecisions.length > 0
        ? `近3日 ${recentDecisions.length} 条`
        : historyDecisions.length > 0
          ? "近3日暂无"
          : "暂无行动";

  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="跟进"
        title="跟进验证"
        description="拍板后的验证、复盘与学习。"
        badge={
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2.5 py-1 text-[12px] text-[#6f747b]">
            <History className="h-3.5 w-3.5" />
            近3日 {recentDecisions.length}
            {historyDecisions.length > 0 ? (
              <span className="text-[#9aa0a6]">· 历史 {historyDecisions.length}</span>
            ) : null}
          </div>
        }
        meta={
          <>
            <BrandSwitcher projectId={projectId} variant="full" />
            <OpsSecondaryLinks
              projectId={projectId}
              links={[
                { href: `/projects/${projectId}/agent`, label: "回对话" },
                {
                  href: `/projects/${projectId}/decision-room`,
                  label: "决策室",
                },
                { href: "/dashboard?radar=1", label: "经营动态" },
              ]}
            />
          </>
        }
      />

      <section
        id="validation"
        className="border-y border-[rgba(24,24,23,0.08)] py-4"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">
            {overviewTitle}
          </h2>
          {(stats?.pendingReview ?? 0) > 0 ? (
            <p className="shrink-0 text-[12px] font-medium text-[#B47C5C]">
              待复审 {stats?.pendingReview}
            </p>
          ) : null}
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          <StatCard label="验证中" value={decisionsAwaitingValidation.length} />
          <StatCard label="有结果" value={decisionsWithOutcome.length} />
          <StatCard label="已学习" value={decisionsWithLearning.length} />
          <StatCard label="待复审" value={stats?.pendingReview ?? 0} />
        </div>
      </section>

      {memorySnapshot &&
      (memorySnapshot.counts.patterns > 0 ||
        memorySnapshot.counts.preferences > 0 ||
        memorySnapshot.counts.decisions > 0) ? (
        <section className="border-b border-[rgba(24,24,23,0.08)] pb-3">
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">经验沉淀</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {memorySnapshot.preferences.slice(0, 2).map((p) => (
              <div key={`${p.label}-${p.value}`} className="rounded-[10px] bg-[#F8F7F3] px-3 py-2">
                <p className="text-[11px] text-[#66735E]">偏好</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-[#202124]">
                  {p.label}：{p.value}
                </p>
              </div>
            ))}
            {memorySnapshot.patterns.slice(0, 2).map((p) => (
              <div key={p.patternId} className="rounded-[10px] bg-[#F8F7F3] px-3 py-2">
                <p className="text-[11px] text-[#B47C5C]">
                  {p.kind === "success" ? "成功" : p.kind === "failure" ? "教训" : "部分"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-[#202124]">{p.summary}</p>
              </div>
            ))}
            {memorySnapshot.decisions.slice(0, 1).map((d, i) => (
              <div key={d.decisionId || `dec-${i}`} className="rounded-[10px] bg-[#F8F7F3] px-3 py-2">
                <p className="text-[11px] text-[#66735E]">近期</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-[#202124]">{d.summary}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {positioningContext?.current ? (
        <section className="flex items-center justify-between gap-3 border-b border-[rgba(24,24,23,0.08)] py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.12em] text-[#66735E]">当前定位</p>
            <p className="mt-0.5 truncate text-[14px] font-medium text-[#202124]">
              {positioningMentalPosition}
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/positioning`}
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#181817] no-underline"
          >
            打开
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      {equityContext?.current ? (
        <section className="flex items-center justify-between gap-3 border-b border-[rgba(24,24,23,0.08)] py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.12em] text-[#66735E]">当前股权</p>
            <p className="mt-0.5 truncate text-[14px] font-medium text-[#202124]">
              {equityContext.current.oneLiner}
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/equity`}
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#181817] no-underline"
          >
            打开
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      {(positioningContext?.current ||
        ((reviewQueueData?.items as ReviewQueueItem[] | undefined)?.length ?? 0) > 0) ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <PositioningVersionTimeline
            current={(positioningContext?.current as PositioningSnapshot | null) ?? null}
            previous={(positioningContext?.previous as PositioningSnapshot | null) ?? null}
            history={
              (positioningContext?.history as Array<PositioningSnapshot | null> | undefined) ??
              []
            }
            projectId={projectId}
          />
          <PositioningReviewQueue
            items={(reviewQueueData?.items as ReviewQueueItem[]) ?? []}
            projectId={projectId}
            dismissingId={dismissingId}
            onDismiss={(id) => handleResolveReview(id, "dismissed")}
            onReviewed={(id) => handleResolveReview(id, "reviewed")}
          />
        </div>
      ) : null}

      {allDecisions.length === 0 ? (
        <section className="border-y border-[rgba(24,24,23,0.08)] py-6">
          <PageEmptyState
            eyebrow="行动"
            title="暂无待跟进"
            description="拍板后会出现在这里。"
            primaryAction={{
              href: `/projects/${projectId}/decision-room`,
              label: "去决策",
            }}
          />
        </section>
      ) : (
        <div className="space-y-3">
          {decisionsAwaitingValidation.length > 0 ? (
            <section className="border-y border-[rgba(24,24,23,0.08)] py-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-[#202124]">
                  待打卡
                </h2>
                <Brain className="h-4 w-4 text-[#66735E]" />
              </div>
              <ul className="mt-2 space-y-1.5">
                {featuredValidating.map((decision) => (
                  <li key={decision.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(decision.id)}
                      className="w-full min-h-9 rounded-[12px] bg-[#F8F7F3] px-3 py-2.5 text-left touch-manipulation"
                    >
                      <div className="flex items-center gap-2">
                        <StageBadge decision={decision} />
                        <ConfidenceBadge confidence={decision.confidence} />
                      </div>
                      <p className="mt-1.5 text-[14px] font-medium leading-5 text-[#202124]">
                        {decision.problem}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[12px] leading-5 text-[#6f747b]">
                        {decision.action || decision.judgement}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {recentDecisions.length === 0 && historyDecisions.length > 0 ? (
            <p className="py-1 text-[13px] leading-5 text-[#6f747b]">
              近 3 日暂无新行动，更早的已收入历史。
            </p>
          ) : null}

          {recentDecisions.map((decision) => {
            const outcome = parseOutcome(decision.outcome);
            const learning = parseLearning(decision.learning);
            const opinions = parseDecisionOpinions(outcome);
            const isExpanded = expandedId === decision.id;
            const needsReReview =
              outcome?.review?.needsReReview === true &&
              outcome?.review?.status === "pending";

            return (
              <div
                id={`decision-${decision.id}`}
                key={decision.id}
                className={`rounded-[12px] border bg-[#FBFAF7] p-3 transition ${
                  needsReReview
                    ? "border-[rgba(180,124,92,0.35)] ring-1 ring-[rgba(180,124,92,0.12)]"
                    : "border-[rgba(24,24,23,0.08)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {needsReReview ? (
                        <span className="inline-flex items-center border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.12)] px-2 py-0.5 text-[11px] font-medium text-[#B47C5C]">
                          需复审
                        </span>
                      ) : null}
                      <StageBadge decision={decision} />
                      <TypeBadge type={decision.type} />
                      <ConfidenceBadge confidence={decision.confidence} />
                      {outcome?.councilSource === "decision_council" ||
                      outcome?.decisionContract?.source === "decision_council" ||
                      outcome?.councilTrace ? (
                        <span className="inline-flex items-center border border-[rgba(102,115,94,0.22)] bg-[rgba(102,115,94,0.10)] px-2 py-0.5 text-[11px] font-medium text-[#66735E]">
                          决策室
                        </span>
                      ) : null}
                      {outcome?.helpful !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium ${
                            outcome.helpful
                              ? "bg-[rgba(102,115,94,0.10)] text-[#66735E]"
                              : "bg-[rgba(180,124,92,0.10)] text-[#B47C5C]"
                          }`}
                        >
                          {outcome.helpful ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                          {outcome.result === "partial"
                            ? "部分成立"
                            : outcome.helpful
                              ? "结果认可"
                              : "结果偏差"}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-display text-[16px] font-semibold leading-snug text-[#202124]">
                      {decision.problem}
                    </h3>
                    <p
                      className={`mt-1.5 text-[13px] leading-6 text-[#6f747b] ${
                        isExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      {decision.judgement}
                    </p>
                    {needsReReview && outcome?.review?.reason ? (
                      <p className="mt-2 bg-[rgba(180,124,92,0.08)] px-3 py-1.5 text-[12px] leading-5 text-[#B47C5C]">
                        {outcome.review.reason}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "收起" : "展开"}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] text-[#6f747b] touch-manipulation"
                  >
                    <span className={`text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#6f747b]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeDate(decision.createdAt)}
                  </span>
                  {isExpanded && decision.agentRun ? (
                    <span className="hidden items-center gap-1 sm:inline-flex">
                      <Zap className="h-3 w-3" />
                      {(decision.agentRun.duration / 1000).toFixed(1)}s
                    </span>
                  ) : null}
                </div>

                {!isExpanded ? (
                  <p className="mt-2 line-clamp-1 text-[13px] leading-6 text-[#6f747b]">
                    {decision.action ||
                      outcome?.validationPlan ||
                      decision.diagnosis ||
                      "展开查看共识、原因与验证"}
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-2.5">
                    <SummaryCard label="共识" value={decision.judgement} tone="neutral" />
                    <SummaryCard
                      label="原因"
                      value={decision.diagnosis || decision.observation}
                      tone="light"
                    />
                    <SummaryCard
                      label="验证"
                      value={
                        outcome?.validationPlan ||
                        decision.action ||
                        "等待补充验证动作"
                      }
                      tone="warning"
                    />
                  </div>
                )}

                {opinions.length > 0 && !isExpanded ? (
                  <button
                    type="button"
                    onClick={() => setExpandedId(decision.id)}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 text-[13px] font-medium text-[#66735E] touch-manipulation sm:w-auto sm:justify-start sm:border-0 sm:bg-transparent sm:px-0"
                  >
                    <History className="h-3.5 w-3.5" />
                    {opinions.length} 条意见 · 展开
                  </button>
                ) : null}

                {isExpanded && opinions.length > 0 ? (
                  <DecisionOpinionsTimeline opinions={opinions} />
                ) : null}

                {isExpanded ? (
                  <>
                    <CouncilTracePanel
                      projectId={projectId}
                      councilSource={outcome?.councilSource}
                      councilTrace={outcome?.councilTrace}
                      decisionContract={outcome?.decisionContract}
                    />
                    <DecisionRuntimePanel
                      projectId={projectId}
                      decisionId={decision.id}
                      compact
                    />
                    <ExecutionRuntimePanel
                      projectId={projectId}
                      decisionId={decision.id}
                      embedded
                    />
                  </>
                ) : null}

                {!isExpanded &&
                (outcome?.councilTrace ||
                  outcome?.councilSource === "decision_council") ? (
                  <button
                    type="button"
                    onClick={() => setExpandedId(decision.id)}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 text-[13px] font-medium text-[#66735E] touch-manipulation sm:w-auto sm:justify-start sm:border-0 sm:bg-transparent sm:px-0"
                  >
                    <Brain className="h-3.5 w-3.5" />
                    查看决策过程
                    {outcome.councilTrace?.insightCount
                      ? ` · ${outcome.councilTrace.insightCount}`
                      : ""}
                  </button>
                ) : null}

                {isExpanded && decision.type === "meeting" && outcome ? (
                  <div className="mt-3 rounded-[16px] bg-[#202124] px-4 py-3 text-white">
                    <p className="text-[11px] tracking-[0.08em] text-white/60">决策卡</p>
                    <p className="mt-1 text-[14px] leading-6">问题：{decision.problem}</p>
                    <p className="text-[14px] leading-6">共识：{decision.judgement}</p>
                    {outcome.meetingTitle ? (
                      <p className="text-[13px] leading-6 text-white/75">来源：{outcome.meetingTitle}</p>
                    ) : null}
                    <p className="text-[13px] leading-6 text-white/75">
                      状态：
                      {outcome.status === "hypothesis"
                        ? "假设推进（证据不足）"
                        : outcome.status === "superseded"
                          ? "已被修订案取代"
                          : outcome.status === "validating"
                          ? "验证中"
                          : outcome.status === "validated"
                            ? "已验证"
                            : outcome.status === "feedback_positive"
                              ? "用户反馈·正面（非验证）"
                              : outcome.status === "feedback_partial"
                                ? "用户反馈·部分（非验证）"
                                : outcome.status === "feedback_negative"
                                  ? "用户反馈·偏离（非验证）"
                                  : outcome.status === "adjusted"
                                    ? "需调整"
                                    : outcome.status === "revisiting"
                                      ? "待复盘"
                                      : "执行中"}
                      {outcome.validationPlan ? ` · ${outcome.validationPlan}` : ""}
                    </p>
                    {(outcome.supportCount != null || outcome.opposeCount != null) ? (
                      <p className="text-[12px] leading-6 text-white/60">
                        支持 {outcome.supportCount ?? 0} · 反对 {outcome.opposeCount ?? 0}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isAwaitingValidation(decision) ||
                feedbackState[decision.id] === "done" ||
                Boolean(outcome?.feedbackAt) ? (
                  <div className="mt-3">
                    <ValidationFeedbackCard
                      judgement={decision.judgement}
                      validationPlan={outcome?.validationPlan || decision.action}
                      growthPlan={outcome?.growthPlan}
                      remmeetHref={`/projects/${projectId}/decision-room?topic=${encodeURIComponent(`复盘：${decision.problem}`)}`}
                      validationTask={(() => {
                        const fromCenter = validationCenter?.items?.find(
                          (item) =>
                            item.id === outcome?.validationTask?.id ||
                            item.decisionId === decision.id,
                        );
                        const base = outcome?.validationTask;
                        if (!base && !fromCenter) return null;
                        const resultOff =
                          outcome?.result === "off" ||
                          String(outcome?.status || "").includes("feedback_off");
                        return {
                          id: fromCenter?.id || base?.id || "",
                          title: fromCenter?.title || base?.title,
                          objective: fromCenter?.objective || base?.objective,
                          owner: fromCenter?.owner || base?.owner,
                          horizonDays: fromCenter?.horizonDays || base?.horizonDays,
                          status: fromCenter?.status || base?.status,
                          lifecycleLabel: fromCenter?.lifecycleLabel,
                          committeeLabel: fromCenter?.committeeLabel,
                          hypothesisStatement:
                            fromCenter?.hypothesisStatement ||
                            base?.hypothesis?.statement ||
                            base?.hypothesisStatement,
                          aiJudgement: fromCenter?.aiJudgement || base?.aiJudgement,
                          passProbability: fromCenter?.passProbability ?? base?.passProbability,
                          suggestRedeision:
                            fromCenter?.suggestRedeision ??
                            base?.suggestRedeision ??
                            resultOff,
                          triggerReasons: fromCenter?.triggerReasons || base?.triggerReasons,
                          metrics: (fromCenter?.metrics || base?.metrics || []).map((m) => ({
                            id:
                              ("metricId" in m && m.metricId
                                ? String(m.metricId)
                                : "id" in m && m.id
                                  ? String(m.id)
                                  : undefined),
                            metricId:
                              "metricId" in m && m.metricId
                                ? String(m.metricId)
                                : "id" in m && m.id
                                  ? String(m.id)
                                  : undefined,
                            label:
                              "label" in m
                                ? String(m.label)
                                : String((m as { name?: string }).name || ""),
                            target: "target" in m ? m.target : undefined,
                            targetLabel: "targetLabel" in m ? m.targetLabel : undefined,
                            actual: "actual" in m ? m.actual : undefined,
                            actualLabel: "actualLabel" in m ? m.actualLabel : undefined,
                            status: "status" in m ? m.status : undefined,
                          })),
                          checkIns: fromCenter?.checkIns || base?.checkIns,
                        };
                      })()}
                      submitting={
                        feedbackState[decision.id] === "submitting" ||
                        validationCheckIn.isPending ||
                        validationComplete.isPending
                      }
                      done={
                        feedbackState[decision.id] === "done" ||
                        Boolean(outcome?.feedbackAt || outcome?.result)
                      }
                      onCheckIn={
                        outcome?.validationTask?.id ||
                        validationCenter?.items?.find((item) => item.decisionId === decision.id)?.id
                          ? async (payload) => {
                              const taskId =
                                outcome?.validationTask?.id ||
                                validationCenter?.items?.find((item) => item.decisionId === decision.id)
                                  ?.id;
                              if (!taskId) return;
                              await validationCheckIn.mutateAsync({
                                projectId,
                                taskId,
                                note: payload.note,
                                metrics: payload.metrics,
                              });
                            }
                          : undefined
                      }
                      onSubmit={(payload) =>
                        handleFeedback(decision.id, payload.helpful, payload.comment, {
                          result: payload.result,
                          progressNote: payload.progressNote,
                          taskId:
                            outcome?.validationTask?.id ||
                            validationCenter?.items?.find((item) => item.decisionId === decision.id)
                              ?.id,
                        })
                      }
                    />
                  </div>
                ) : null}

                {isExpanded ? (
                  <div className="mt-3 space-y-2.5 border-t border-[rgba(24,24,23,0.08)] pt-3">
                    <DetailRow label="判断" value={decision.judgement} />
                    <DetailRow label="策略建议" value={decision.strategy} />
                    <DetailRow label="依据" value={decision.observation} />
                    <DetailRow label="反方挑战" value={decision.diagnosis} />
                    <DetailRow label="验证" value={decision.action} />

                    {decision.evidence.length > 0 ? (
                      <div>
                        <p className="mb-1 text-xs font-medium text-[#6f747b]">关键证据</p>
                        <div className="space-y-1">
                          {(decision.evidence as Array<{ source: string; content: string; relevance: number }>).slice(0, 5).map((ev, index) => (
                            <div key={`${decision.id}-evidence-${index}`} className="flex items-start gap-2 text-xs text-[#6f747b]">
                              <span className="shrink-0 rounded bg-[#F5F3EE] px-1.5 py-0.5 text-[11px] text-[#5f655d]">{ev.source}</span>
                              <span className="line-clamp-1">{ev.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {outcome || learning?.summary ? (
                      <div className="rounded-[16px] bg-[#F8F7F3] p-3.5">
                        <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">结果与学习</p>
                        {outcome ? (
                          <p className="mt-1 text-[13px] leading-[1.72] text-[#202124]">
                            {outcome.helpful ? "结果：这次判断被认为有帮助。" : "结果：这次判断被认为存在偏差。"}
                            {outcome.comment ? ` 补充说明：${outcome.comment}` : ""}
                          </p>
                        ) : null}
                        {learning?.summary ? (
                          <p className="mt-2 text-[13px] leading-[1.72] text-[#202124]">学习：{learning.summary}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <ActionTracker decisionId={decision.id} initialAction={decision.action} />

                    {feedbackState[decision.id] !== "done" &&
                    !isAwaitingValidation(decision) &&
                    outcome?.helpful === undefined ? (
                      <div className="border-t border-[rgba(24,24,23,0.06)] pt-3">
                        <p className="mb-2 text-xs font-medium text-[#6f747b]">这条判断结果如何？</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleFeedback(decision.id, true, undefined, { result: "aligned" })}
                            disabled={feedbackState[decision.id] === "submitting"}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.10)] px-4 text-[13px] font-medium text-[#66735E] touch-manipulation hover:bg-[rgba(102,115,94,0.14)] disabled:opacity-50"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            结果正确
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const comment = feedbackComment[decision.id]?.trim();
                              void handleFeedback(decision.id, false, comment || undefined, { result: "off" });
                            }}
                            disabled={feedbackState[decision.id] === "submitting"}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.10)] px-4 text-[13px] font-medium text-[#B47C5C] touch-manipulation hover:bg-[rgba(180,124,92,0.14)] disabled:opacity-50"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            结果偏差
                          </button>
                        </div>
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="补充结果、偏差原因或新的情况..."
                            value={feedbackComment[decision.id] ?? ""}
                            onChange={(event) =>
                              setFeedbackComment((prev) => ({
                                ...prev,
                                [decision.id]: event.target.value,
                              }))
                            }
                            className="min-h-11 w-full rounded-lg border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 text-[14px] text-[#202124] placeholder:text-[#6f747b] focus:outline-none focus:ring-1"
                          />
                        </div>
                      </div>
                    ) : feedbackState[decision.id] === "done" && !isAwaitingValidation(decision) ? (
                      <div className="border-t border-[rgba(24,24,23,0.06)] pt-3">
                        <p className="flex items-center gap-1 text-xs text-[#66735E]">
                          <Check className="h-3.5 w-3.5" />
                          反馈已保存，这条判断会继续进入学习。
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {historyDecisions.length > 0 ? (
            <details className="border-y border-[rgba(24,24,23,0.08)]">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-[14px] font-semibold text-[#202124] [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-[#66735E]" />
                  历史项目
                </span>
                <span className="text-[12px] font-medium text-[#6f747b]">
                  {historyDecisions.length} 条
                </span>
              </summary>
              <ul className="space-y-1.5 pb-3">
                {historyDecisions.map((decision) => {
                  const isExpanded = expandedId === decision.id;
                  return (
                    <li key={decision.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : decision.id)
                        }
                        className="w-full min-h-9 rounded-[12px] border border-[rgba(24,24,23,0.06)] bg-[#F8F7F3] px-3 py-2.5 text-left touch-manipulation"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <StageBadge decision={decision} />
                            <span className="truncate text-[13px] font-medium text-[#202124]">
                              {decision.problem}
                            </span>
                          </div>
                          <span className="shrink-0 text-[11px] text-[#9aa0a6]">
                            {formatRelativeDate(decision.createdAt)}
                          </span>
                        </div>
                        {isExpanded ? (
                          <div className="mt-2 space-y-1.5 border-t border-[rgba(24,24,23,0.06)] pt-2">
                            <p className="text-[12px] leading-5 text-[#6f747b]">
                              {decision.judgement}
                            </p>
                            {decision.action ? (
                              <p className="text-[12px] leading-5 text-[#6f747b]">
                                动作 · {decision.action}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hasNextPage ? (
                <div className="pb-3 text-center">
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[13px] font-medium text-[#202124] touch-manipulation disabled:opacity-50"
                  >
                    {isFetchingNextPage ? "加载中…" : "加载更多历史"}
                  </button>
                </div>
              ) : null}
            </details>
          ) : hasNextPage ? (
            <div className="py-3 text-center">
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[13px] font-medium text-[#202124] touch-manipulation disabled:opacity-50"
              >
                {isFetchingNextPage ? "加载中…" : "加载更多"}
              </button>
            </div>
          ) : null}
        </div>
      )}

    </PageContent>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[10px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-2 py-2">
      <p className="text-[10px] tracking-[0.06em] text-[#6f747b]">{label}</p>
      <p className="mt-1 font-display text-[18px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "light" | "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-[rgba(180,124,92,0.10)]"
      : tone === "light"
        ? "bg-[rgba(24,24,23,0.03)]"
        : "bg-[#F8F7F3]";

  return (
    <div className={`rounded-[16px] p-3 md:p-4 ${toneClass}`}>
      <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">{label}</p>
      <p className="mt-1 line-clamp-2 text-[14px] leading-[1.72] text-[#202124] md:line-clamp-3">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div>
      <p className="mb-0.5 text-xs font-medium text-[#6f747b]">{label}</p>
      <p className="text-sm leading-relaxed text-[#202124]">{value}</p>
    </div>
  );
}

export default function DecisionsArchivePage() {
  return (
    <PageErrorBoundary fallbackTitle="行动页暂时无法打开">
      <DecisionsArchivePageInner />
    </PageErrorBoundary>
  );
}
