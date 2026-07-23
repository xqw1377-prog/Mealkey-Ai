"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Brain,
  Check,
  Compass,
  Clock,
  FileText,
  History,
  MessageSquare,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { ActionTracker } from "./components";
import { ValidationFeedbackCard } from "./ValidationFeedbackCard";
import {
  MKPageHeader,
  PositioningReviewQueue,
  PositioningVersionTimeline,
} from "@/components/operating";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
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
  growthPlan?: {
    day30?: string;
    day60?: string;
    day90?: string;
  } | null;
  review?: {
    needsReReview?: boolean;
    status?: string;
    reason?: string;
  };
};

type DecisionLearning = {
  type?: string;
  summary?: string;
  comment?: string | null;
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

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
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isMeeting
          ? "bg-[rgba(102,115,94,0.12)] text-[#66735E]"
          : "bg-[#F5F3EE] text-[#6f747b]"
      }`}
    >
      {labels[type] ?? type}
    </span>
  );
}

function StageBadge({ decision }: { decision: DecisionItem }) {
  const outcome = parseOutcome(decision.outcome);
  const learning = parseLearning(decision.learning);
  const ageDays = Math.floor((Date.now() - new Date(decision.createdAt).getTime()) / 86400000);

  let label = "假设中";
  let className = "border-[rgba(24,24,23,0.12)] bg-[rgba(24,24,23,0.04)] text-[#5f655d]";

  if (learning?.summary) {
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
    label = "已有结果";
    className = "border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.10)] text-[#B47C5C]";
  } else if (outcome) {
    label = "执行中";
    className = "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#202124]";
  } else if (ageDays <= 14) {
    label = "执行中";
    className = "border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] text-[#202124]";
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function DecisionsArchivePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? "";

  const { data: project, isLoading: projectLoading } = trpc.project.getById.useQuery({ id: projectId });
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.decisionArchive.list.useInfiniteQuery(
    { projectId, limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const { data: stats } = trpc.decisionArchive.stats.useQuery({ projectId });
  const { data: positioningContext } = trpc.agent.positioningContext.useQuery({
    projectId,
  });
  const { data: marketContext } = trpc.agent.marketContext.useQuery({
    projectId,
  });
  const { data: equityContext } = trpc.agent.equityContext.useQuery({
    projectId,
  });
  const { data: reviewQueueData } = trpc.decisionArchive.reviewQueue.useQuery({
    projectId,
  });
  const utils = trpc.useUtils();

  const submitFeedback = trpc.decisionArchive.submitFeedback.useMutation({
    onSuccess: () => {
      void utils.decisionArchive.list.invalidate({ projectId });
      void utils.decisionArchive.stats.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
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
        setFeedbackState((prev) => ({ ...prev, [decisionId]: "done" }));
      } catch {
        setFeedbackState((prev) => {
          const next = { ...prev };
          delete next[decisionId];
          return next;
        });
      }
    },
    [submitFeedback],
  );

  const allDecisions = (data?.pages.flatMap((page) => page.items) ?? []) as DecisionItem[];
  const isAwaitingValidation = (decision: DecisionItem) => {
    const outcome = parseOutcome(decision.outcome);
    if (parseLearning(decision.learning)?.summary) return false;
    if (!outcome) return true;
    if (outcome.feedbackAt || outcome.helpful !== undefined || outcome.result) return false;
    return outcome.status === "validating" || decision.type === "meeting";
  };
  const decisionsAwaitingValidation = allDecisions.filter(isAwaitingValidation);
  const decisionsWithoutOutcome = allDecisions.filter((decision) => !parseOutcome(decision.outcome));
  const decisionsWithOutcome = allDecisions.filter((decision) => Boolean(parseOutcome(decision.outcome)));
  const decisionsWithLearning = allDecisions.filter((decision) => Boolean(parseLearning(decision.learning)?.summary));
  const featuredValidating = decisionsAwaitingValidation.slice(0, 3);
  const positioningBrandName =
    positioningContext?.current?.brandPositioning?.brandName || project?.name || "";
  const positioningCategory =
    positioningContext?.current?.brandPositioning?.category || project?.category || "";
  const positioningMentalPosition =
    positioningContext?.current?.brandPositioning?.mentalPosition ||
    positioningContext?.current?.oneLiner ||
    "";
  const topInsight = stats
    ? stats.withFeedback > 0
      ? `已收到 ${stats.withFeedback} 次结果反馈，当前认可率 ${stats.helpfulRate}%。`
      : "判断在累积，但反馈还不够。先补最近一条结果。"
    : "正在整理反馈。";

  if (projectLoading || isLoading) {
    return (
      <PageLoadingState
        eyebrow="决策"
        title="AI 正在整理你的经营判断资产"
        description="正在读取判断、反馈和学习。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="决策"
          title="经营判断资产暂时无法读取"
          description={error.message || "判断资产还在同步。先回会议或世界。"}
          primaryAction={{ href: `/projects/${projectId}/advisor`, label: "回到会议" }}
          secondaryAction={{ href: `/projects/${projectId}`, label: "回到世界" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-2 pt-2 md:pt-0">
      <MKPageHeader
        eyebrow="决策档案"
        title="决策档案"
        description="企业的战略历史。一年后 AI 最懂你的地方，是这里。"
        badge={
          <div className="inline-flex items-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-1.5 text-[13px] text-[#6f747b]">
            <History className="h-4 w-4" />
            {stats ? `${stats.total} 个经营判断` : "加载中"}
          </div>
        }
      >
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:w-auto md:flex-wrap">
          <Link
            href={`/projects/${projectId}/advisor`}
            prefetch={false}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#181817] px-4 py-2 text-[13px] font-medium text-white no-underline transition hover:-translate-y-0.5"
          >
            进入会议
            <Sparkles className="h-4 w-4" />
          </Link>
          <Link
            href={`/projects/${projectId}`}
            prefetch={false}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-2 text-[13px] font-medium text-[#202124] no-underline"
          >
            企业世界
          </Link>
        </div>
      </MKPageHeader>
      <section className="mb-6 rounded-[24px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_16px_34px_rgba(24,24,23,0.05)] md:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">总览</p>
            <h2 className="mt-1 text-[22px] leading-[1.18] tracking-[-0.04em] text-[#202124] md:text-[28px]">
              已沉淀 {stats?.total ?? allDecisions.length} 条判断，{decisionsAwaitingValidation.length} 条待验证
            </h2>
            <p className="mt-3 text-[15px] leading-[1.78] text-[#5f655d]">{topInsight}</p>
            {(stats?.pendingReview ?? 0) > 0 ? (
              <p className="mt-2 text-[14px] leading-6 text-[#B47C5C]">
                另有 {stats?.pendingReview} 条判断待复审。
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="验证中" value={decisionsAwaitingValidation.length} />
            <StatCard label="已有结果" value={decisionsWithOutcome.length} />
            <StatCard label="进入学习" value={decisionsWithLearning.length} />
            <StatCard label="待复审" value={stats?.pendingReview ?? 0} />
          </div>
        </div>
      </section>

      {positioningContext?.current ? (
        <section className="mb-6 rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">当前定位</p>
              <p className="mt-1 text-[18px] leading-[1.6] text-[#202124]">
                {positioningMentalPosition}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
                {[
                  positioningBrandName ? `品牌名：${positioningBrandName}` : null,
                  positioningCategory ? `品类：${positioningCategory}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
                {(stats?.pendingReview ?? 0) > 0
                  ? `${stats?.pendingReview} 条判断正在等待定位复审。`
                  : "这条定位会继续影响后续判断与复盘。"}
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 md:flex md:w-auto md:flex-wrap">
              <Link
                href={`/projects/${projectId}/positioning`}
                prefetch={false}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-2 text-[13px] font-medium text-[#202124] no-underline"
              >
                打开定位工作台
              </Link>
              <Link
                href={`/projects/${projectId}/advisor`}
                prefetch={false}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#181817] px-4 py-2 text-[13px] font-medium text-white no-underline"
              >
                带着定位开会
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}



      {equityContext?.current ? (
        <section className="mb-6 rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">当前股权</p>
              <p className="mt-1 text-[18px] leading-[1.6] text-[#202124]">
                {equityContext.current.oneLiner}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
                {equityContext.current.pageOutput.health.biggestRisk}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
                {[
                  `阶段：${equityContext.current.stage}`,
                  `健康度：${equityContext.current.pageOutput.health.score}`,
                  `控制权：${equityContext.current.pageOutput.health.control}`,
                ].join(" · ")}
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 md:flex md:w-auto md:flex-wrap">
              <Link
                href={`/projects/${projectId}/equity`}
                prefetch={false}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-2 text-[13px] font-medium text-[#202124] no-underline"
              >
                股权诊断
              </Link>
              <Link
                href={`/projects/${projectId}/advisor`}
                prefetch={false}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#181817] px-4 py-2 text-[13px] font-medium text-white no-underline"
              >
                带着股权进入会议
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
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

      {allDecisions.length === 0 ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5 shadow-[0_14px_28px_rgba(24,24,23,0.04)] md:p-8">
          <PageEmptyState
            eyebrow="决策"
            title="还没有经营判断资产"
            description="会议里的判断会自动沉淀到这里。"
            primaryAction={{ href: `/projects/${projectId}/advisor`, label: "进入会议" }}
          />
        </section>
      ) : (
        <div className="space-y-4">
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">验证中</p>
                  <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
                    继续跟踪
                  </h2>
                </div>
                <Brain className="h-5 w-5 text-[#66735E]" />
              </div>
              <div className="mt-4 space-y-3">
                {(featuredValidating.length > 0 ? featuredValidating : allDecisions.slice(0, 3)).map((decision) => (
                  <button
                    key={decision.id}
                    type="button"
                    onClick={() => setExpandedId(decision.id)}
                    className="w-full rounded-[16px] bg-[#F8F7F3] p-3.5 text-left transition hover:bg-[#F1F0EA]"
                  >
                    <div className="flex items-center gap-2">
                      <StageBadge decision={decision} />
                      <ConfidenceBadge confidence={decision.confidence} />
                    </div>
                    <p className="mt-2 text-[15px] leading-[1.6] text-[#202124]">{decision.problem}</p>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-[1.72] text-[#6f747b]">
                      {decision.action || decision.judgement}
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-[#B47C5C]">点击回填验证结果 →</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">AI 发现</p>
                  <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
                    这批判断说明了什么
                  </h2>
                </div>
                <MessageSquare className="h-5 w-5 text-[#66735E]" />
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[16px] bg-[rgba(102,115,94,0.07)] p-3.5">
                  <p className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">反馈</p>
                  <p className="mt-1 text-[14px] leading-[1.72] text-[#202124]">
                    {stats?.withFeedback
                      ? `已有 ${stats.withFeedback} 条判断拿到结果。`
                      : "还没有结果反馈。"}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(180,124,92,0.10)] p-3.5">
                  <p className="text-[12px] leading-5 tracking-[0.01em] text-[#B47C5C]">提醒</p>
                  <p className="mt-1 text-[14px] leading-[1.72] text-[#202124]">
                    {(stats?.pendingReview ?? 0) > 0
                      ? `定位已更新，有 ${stats?.pendingReview} 条判断待复审。`
                      : decisionsAwaitingValidation.length > 0
                        ? `还有 ${decisionsAwaitingValidation.length} 条判断在验证中，先补最近结果。`
                        : "大部分判断已有结果，继续沉淀学习。"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {allDecisions.map((decision) => {
            const outcome = parseOutcome(decision.outcome);
            const learning = parseLearning(decision.learning);
            const isExpanded = expandedId === decision.id;
            const needsReReview =
              outcome?.review?.needsReReview === true &&
              outcome?.review?.status === "pending";

            return (
              <div
                id={`decision-${decision.id}`}
                key={decision.id}
                className={`rounded-[22px] border bg-white p-3.5 shadow-[0_14px_28px_rgba(24,24,23,0.04)] transition hover:shadow-md ${
                  needsReReview
                    ? "border-[rgba(180,124,92,0.35)] ring-1 ring-[rgba(180,124,92,0.12)]"
                    : "border-[rgba(24,24,23,0.08)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {needsReReview ? (
                        <span className="inline-flex items-center rounded-full border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.12)] px-2.5 py-0.5 text-xs font-medium text-[#B47C5C]">
                          需复审 · 定位变更
                        </span>
                      ) : null}
                      <StageBadge decision={decision} />
                      <TypeBadge type={decision.type} />
                      <ConfidenceBadge confidence={decision.confidence} />
                      {outcome?.helpful !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
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
                    <h3 className="text-[17px] font-semibold leading-snug text-[#202124]">{decision.problem}</h3>
                    <p className="mt-1.5 text-[14px] leading-[1.72] text-[#6f747b]">{decision.judgement}</p>
                    {needsReReview && outcome?.review?.reason ? (
                      <p className="mt-2 rounded-[12px] bg-[rgba(180,124,92,0.08)] px-3 py-1.5 text-[12px] leading-5 text-[#B47C5C]">
                        {outcome.review.reason}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                    className="shrink-0 rounded-full p-1.5 transition hover:bg-[#F5F3EE]"
                  >
                    <span className={`text-sm text-[#6f747b] transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#6f747b]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(decision.createdAt)}
                  </span>
                  {decision.agentRun ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {(decision.agentRun.duration / 1000).toFixed(1)}s
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {decision.agentRun.tokens} tokens
                      </span>
                    </>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                  <SummaryCard label="共识" value={decision.judgement} tone="neutral" />
                  <SummaryCard label="原因" value={decision.diagnosis || decision.observation} tone="light" />
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

                {decision.type === "meeting" && outcome ? (
                  <div className="mt-3 rounded-[16px] bg-[#202124] px-4 py-3 text-white">
                    <p className="text-[11px] tracking-[0.08em] text-white/60">决策卡</p>
                    <p className="mt-1 text-[14px] leading-6">问题：{decision.problem}</p>
                    <p className="text-[14px] leading-6">共识：{decision.judgement}</p>
                    {outcome.meetingTitle ? (
                      <p className="text-[13px] leading-6 text-white/75">来源：{outcome.meetingTitle}</p>
                    ) : null}
                    <p className="text-[13px] leading-6 text-white/75">
                      状态：
                      {outcome.status === "validating"
                        ? "验证中"
                        : outcome.status === "validated"
                          ? "已验证"
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
                      submitting={feedbackState[decision.id] === "submitting"}
                      done={
                        feedbackState[decision.id] === "done" ||
                        Boolean(outcome?.feedbackAt || outcome?.result)
                      }
                      onSubmit={(payload) =>
                        handleFeedback(decision.id, payload.helpful, payload.comment, {
                          result: payload.result,
                          progressNote: payload.progressNote,
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
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.10)] px-3 py-1.5 text-xs font-medium text-[#66735E] hover:bg-[rgba(102,115,94,0.14)] disabled:opacity-50"
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
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.10)] px-3 py-1.5 text-xs font-medium text-[#B47C5C] hover:bg-[rgba(180,124,92,0.14)] disabled:opacity-50"
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
                            className="w-full rounded-lg border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-1.5 text-[12px] text-[#202124] placeholder:text-[#6f747b] focus:outline-none focus:ring-1"
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

          {hasNextPage ? (
            <div className="py-4 text-center">
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-6 py-2.5 text-sm font-medium text-[#202124] hover:bg-[#F5F3EE] disabled:opacity-50"
              >
                {isFetchingNextPage ? "加载中..." : "加载更多"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/projects/${projectId}/advisor`}
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#181817] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          继续进入会议
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/projects/${projectId}`}
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-6 py-2.5 text-sm font-medium text-[#202124] hover:bg-[#EEF1EA]"
        >
          回到世界
          <History className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[18px] border border-[rgba(24,24,23,0.06)] bg-white/82 p-3 md:p-4">
      <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">{label}</p>
      <p className="mt-2 text-[28px] leading-none tracking-[-0.04em] text-[#202124] md:text-[32px]">{value}</p>
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
