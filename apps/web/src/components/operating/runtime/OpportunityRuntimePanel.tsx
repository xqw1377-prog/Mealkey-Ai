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
  riskBlocks?: boolean;
  onGoToRisk?: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  detected: "已发现",
  analyzing: "研究中",
  exploring: "可进席",
  approved: "已批准",
  rejected: "已驳回",
};

export function OpportunityRuntimePanel({
  projectId,
  riskBlocks,
  onGoToRisk,
  atelier,
}: Props) {
  const ui = panelChrome(atelier);
  const utils = trpc.useUtils();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const { data, isLoading, error } = trpc.opportunityRuntime.listOpen.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const dismiss = trpc.opportunityRuntime.dismiss.useMutation({
    onSuccess: () => {
      setDismissing(null);
      setFeedback("已驳回该机会");
      void utils.opportunityRuntime.listOpen.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
    },
    onError: (e) => setFeedback(e.message),
  });
  const requestReview = trpc.opportunityRuntime.requestReview.useMutation({
    onSuccess: () => {
      setFeedback("已标记为研究中，可进席判断是否值得做");
      void utils.opportunityRuntime.listOpen.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
    },
    onError: (e) => setFeedback(e.message),
  });

  const opportunities = data?.opportunities ?? [];

  return (
    <section className={ui.section}>
      {!atelier ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className={ui.eyebrow}>机会</p>
            <p className={ui.blurb}>候选列表；值不值得做去今日决策判断</p>
          </div>
          <p className={ui.meta}>开放 {opportunities.length}</p>
        </div>
      ) : (
        <div className="mb-1 flex justify-end">
          <p className={ui.meta}>开放 {opportunities.length}</p>
        </div>
      )}

      {riskBlocks ? (
        <div className={`mt-3 ${ui.warnBox}`}>
          <p className="text-[13px] font-medium">先处理风险</p>
          <p className="mt-1 text-[13px] leading-6">
            有阻断风险时，机会先放一放。
          </p>
          {onGoToRisk ? (
            <button
              type="button"
              onClick={onGoToRisk}
              className="mt-3 inline-flex min-h-10 items-center bg-[#141413] px-4 text-[12px] font-semibold text-white"
            >
              去看风险
            </button>
          ) : null}
        </div>
      ) : null}

      {feedback ? <p className={`mt-3 ${ui.feedback}`}>{feedback}</p> : null}

      {isLoading ? (
        <p className="mt-4 text-[13px] text-[#6f747b]">加载机会列表…</p>
      ) : error ? (
        <p className="mt-4 text-[13px] text-[#a56b4d]">{error.message}</p>
      ) : opportunities.length === 0 ? (
        <div
          className={
            atelier
              ? "mt-2 border border-dashed border-[rgba(20,20,19,0.14)] bg-[var(--mpnt-field)] px-6 py-10 text-center"
              : "mt-5"
          }
        >
          <p className={ui.emptyTitle}>暂无开放机会</p>
          <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
            市场信号与企业 Fit 命中后会出现候选；这里不是点子机。
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {opportunities.map((opp, i) => {
            const busy =
              (dismiss.isPending &&
                dismiss.variables?.opportunityId === opp.id) ||
              (requestReview.isPending &&
                requestReview.variables?.opportunityId === opp.id);
            const topic = opp.suggestedTopic || opp.title;
            return (
              <li
                key={opp.id}
                className={`mpnt-rise ${ui.item}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-semibold text-[#141413]">
                    {opp.title}
                  </span>
                  <span className="text-[11px] text-[#5f6b4e]">
                    {Math.round(opp.score)} 分
                  </span>
                  <span className="text-[11px] text-[#6f747b]">
                    {STATUS_LABEL[opp.status] || opp.status}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-6 text-[#6f747b]">
                  {opp.description}
                </p>
                {opp.suggestExpert ? (
                  <p className="mt-1 text-[12px] text-[#6f747b]">
                    建议席位 {opp.suggestExpert}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!riskBlocks ? (
                    <Link
                      href={buildMeetingHref(
                        projectId,
                        topic,
                        detectDepartmentFromTopic(topic),
                        { confirmSpend: true, spendKind: "council" },
                      )}
                      prefetch={false}
                      className={`${ui.primaryBtn} no-underline`}
                    >
                      进席研究 <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="bg-[rgba(20,20,19,0.06)] px-3.5 py-2 text-[12px] text-[#6f747b]">
                      进席已暂缓
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={busy || riskBlocks}
                    onClick={() => {
                      setFeedback(null);
                      requestReview.mutate({
                        projectId,
                        opportunityId: opp.id,
                      });
                    }}
                    className={ui.secondaryBtn}
                  >
                    标记研究中
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setDismissing({ id: opp.id, title: opp.title })
                    }
                    className={ui.ghostBtn}
                  >
                    驳回
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(dismissing)}
        title={`驳回「${dismissing?.title || ""}」？`}
        description="驳回后不再出现在开放列表。需要时可等待新信号再次检出。"
        confirmLabel="确认驳回"
        danger
        busy={dismiss.isPending}
        onCancel={() => setDismissing(null)}
        onConfirm={() => {
          if (!dismissing) return;
          setFeedback(null);
          dismiss.mutate({
            projectId,
            opportunityId: dismissing.id,
          });
        }}
      />
    </section>
  );
}
