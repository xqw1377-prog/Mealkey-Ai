"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { buildMeetingHref, detectDepartmentFromTopic } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";
import { panelChrome, type AtelierProps } from "./atelier";

type Props = AtelierProps & {
  projectId: string;
  decisionId?: string;
  embedded?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  planned: "已规划",
  running: "进行中",
  at_risk: "有风险",
  done: "已完成",
  validated: "已验证",
};

const ACTION_STATUS: Record<string, string> = {
  planned: "待做",
  doing: "进行中",
  done: "已完成",
  blocked: "受阻",
};

export function ExecutionRuntimePanel({
  projectId,
  decisionId,
  embedded,
  atelier,
}: Props) {
  const ui = panelChrome(atelier);
  const utils = trpc.useUtils();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const { data, isLoading, error, refetch } =
    trpc.executionRuntime.getDecisionExecution.useQuery(
      { projectId, decisionId },
      { enabled: Boolean(projectId) },
    );
  const { data: deviations } = trpc.executionRuntime.listDeviations.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  const createFrom = trpc.executionRuntime.createFromDecision.useMutation({
    onSuccess: () => {
      setFeedback("执行计划已就绪");
      void refetch();
      void utils.dashboard.getHome.invalidate();
    },
    onError: (e) => setFeedback(e.message),
  });
  const rebuild = trpc.executionRuntime.rebuildActionPlan.useMutation({
    onSuccess: (res) => {
      setRebuildOpen(false);
      setFeedback(
        `今日三动作已重建${
          typeof res.preservedDoneCount === "number" &&
          res.preservedDoneCount > 0
            ? `（保留已完成 ${res.preservedDoneCount} 项）`
            : ""
        }`,
      );
      void refetch();
      void utils.dashboard.getHome.invalidate();
    },
    onError: (e) => setFeedback(e.message),
  });
  const runDeviation = trpc.executionRuntime.runDeviationCheck.useMutation({
    onSuccess: (res) => {
      setFeedback(
        res.deviation ? "检测到偏航，已写入建议去拍板" : "未发现中高偏航",
      );
      void utils.executionRuntime.listDeviations.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
      void refetch();
    },
    onError: (e) => setFeedback(e.message),
  });

  const execution = data?.execution;
  const activeDecisionId = decisionId || execution?.decisionId;
  const lastDev = deviations?.items?.[0] as
    | {
        summary?: string;
        severity?: string;
        suggestedCouncilTopic?: string;
        validationTaskId?: string;
      }
    | undefined;

  const doneCount =
    execution?.actions.filter((a) => a.status === "done").length ?? 0;
  const totalActions = execution?.actions.length ?? 0;

  const shell =
    embedded && !atelier
      ? "mt-3 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3.5 py-3"
      : atelier
        ? ""
        : "border-y border-[rgba(24,24,23,0.08)] py-5";

  return (
    <section className={shell || ui.section}>
      {!atelier ? (
        <>
          <p className={ui.eyebrow}>执行</p>
          <p className={ui.blurb}>
            拆成可勾选动作；偏航只建议去拍板，不终局改战略
          </p>
        </>
      ) : null}

      {feedback ? <p className={`mt-3 ${ui.feedback}`}>{feedback}</p> : null}

      {isLoading ? (
        <p className="mt-3 text-[13px] text-[#6f747b]">加载执行计划…</p>
      ) : error ? (
        <p className="mt-3 text-[13px] text-[#a56b4d]">{error.message}</p>
      ) : execution ? (
        <div className="mt-2 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p
              className={
                atelier
                  ? "font-serif-cn text-[20px] font-semibold text-[#141413]"
                  : "text-[15px] font-medium text-[#202124]"
              }
            >
              {execution.objective || "当前执行计划"}
            </p>
            <p className={ui.meta}>
              {STATUS_LABEL[execution.status] || execution.status}
              {totalActions > 0 ? ` · ${doneCount}/${totalActions}` : ""}
            </p>
          </div>
          <ul className="space-y-2">
            {execution.actions.slice(0, 6).map((a, index) => (
              <li
                key={a.actionId}
                className={`flex items-start gap-3 text-[14px] leading-6 text-[#141413] ${
                  atelier ? ui.item : ""
                }`}
              >
                <span className="mt-px w-5 shrink-0 text-[12px] tracking-[0.08em] text-[#5f6b4e]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      a.status === "done"
                        ? "text-[#6f747b] line-through decoration-[rgba(20,20,19,0.25)]"
                        : ""
                    }
                  >
                    {a.title}
                  </span>
                  <span className="ml-2 text-[11px] text-[#6f747b]">
                    {ACTION_STATUS[a.status] || a.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {execution.lastDeviation || lastDev ? (
            <div className={ui.warnBox}>
              <p className="text-[12px] font-medium">偏航</p>
              <p className="mt-1 text-[13px] leading-6">
                {(execution.lastDeviation as { summary?: string } | null)
                  ?.summary ||
                  lastDev?.summary ||
                  "检测到执行偏航"}
              </p>
              {(
                (execution.lastDeviation as { suggestedCouncilTopic?: string })
                  ?.suggestedCouncilTopic || lastDev?.suggestedCouncilTopic
              ) ? (
                <Link
                  href={buildMeetingHref(
                    projectId,
                    (execution.lastDeviation as { suggestedCouncilTopic?: string })
                      ?.suggestedCouncilTopic ||
                      lastDev!.suggestedCouncilTopic!,
                    detectDepartmentFromTopic(
                      (execution.lastDeviation as { suggestedCouncilTopic?: string })
                        ?.suggestedCouncilTopic ||
                        lastDev!.suggestedCouncilTopic!,
                    ),
                    { confirmSpend: true, spendKind: "growth" },
                  )}
                  prefetch={false}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#141413] no-underline"
                >
                  带着偏航去拍板 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={
            atelier
              ? "mt-2 border border-dashed border-[rgba(20,20,19,0.14)] bg-[var(--mpnt-field)] px-6 py-10 text-center"
              : "mt-4"
          }
        >
          <p className={ui.emptyTitle}>
            {activeDecisionId ? "该决策还没有执行计划" : "暂无执行计划"}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
            {activeDecisionId
              ? "决策需处于已批准 / 执行中 / 验证中，才能创建今日三动作。"
              : "先批准一项决策，再在此拆成可执行动作。"}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {activeDecisionId ? (
          <>
            <button
              type="button"
              disabled={createFrom.isPending}
              onClick={() => {
                setFeedback(null);
                createFrom.mutate({
                  projectId,
                  decisionId: activeDecisionId,
                });
              }}
              className={ui.primaryBtn}
            >
              {createFrom.isPending
                ? "创建中…"
                : execution
                  ? "刷新执行计划"
                  : "从决策创建执行"}
            </button>
            {execution ? (
              <button
                type="button"
                disabled={rebuild.isPending}
                onClick={() => setRebuildOpen(true)}
                className={ui.secondaryBtn}
              >
                {rebuild.isPending ? "重建中…" : "重建今日三动作"}
              </button>
            ) : null}
          </>
        ) : null}
        {(execution?.validationTaskIds?.[0] || lastDev?.validationTaskId) && (
          <button
            type="button"
            disabled={runDeviation.isPending}
            onClick={() => {
              setFeedback(null);
              runDeviation.mutate({
                projectId,
                validationTaskId:
                  execution?.validationTaskIds?.[0] ||
                  lastDev!.validationTaskId!,
              });
            }}
            className="inline-flex min-h-11 items-center border border-[rgba(165,107,77,0.35)] px-4 text-[13px] font-medium text-[#a56b4d] disabled:opacity-50"
          >
            {runDeviation.isPending ? "检测中…" : "跑偏航检测"}
          </button>
        )}
      </div>

      {!embedded && execution ? (
        <p className="mt-4 text-[12px] leading-5 text-[#6f747b]">
          勾选完成进度请回经营动态；这里负责计划与偏航。
          <Link
            href="/dashboard?radar=1"
            prefetch={false}
            className="ml-1.5 font-medium text-[#141413] underline-offset-2 hover:underline"
          >
            去经营动态
          </Link>
        </p>
      ) : null}

      <ConfirmDialog
        open={rebuildOpen}
        title="重建今日三动作？"
        description="已完成项会尽量保留，未完成项将按当前决策重排。不会改战略判断。"
        confirmLabel="确认重建"
        busy={rebuild.isPending}
        onCancel={() => setRebuildOpen(false)}
        onConfirm={() => {
          if (!activeDecisionId) return;
          setFeedback(null);
          rebuild.mutate({
            projectId,
            decisionId: activeDecisionId,
          });
        }}
      />
    </section>
  );
}
