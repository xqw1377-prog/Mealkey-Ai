"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { buildMeetingHref, detectDepartmentFromTopic } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";
import { panelChrome, type AtelierProps } from "./atelier";

type Props = AtelierProps & { projectId: string };

const LEVEL_LABEL: Record<string, string> = {
  critical: "严重",
  high: "高",
  medium: "中",
  low: "低",
};
const STATUS_LABEL: Record<string, string> = {
  open: "待确认",
  reviewing: "复核中",
  resolved: "已关闭",
};
const TYPE_LABEL: Record<string, string> = {
  strategic: "战略",
  market: "市场",
  brand: "品牌",
  business: "商业",
  financial: "财务",
  execution: "执行",
};

export function RiskRuntimePanel({ projectId, atelier }: Props) {
  const ui = panelChrome(atelier);
  const utils = trpc.useUtils();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [closing, setClosing] = useState<{ id: string; title: string } | null>(
    null,
  );
  const { data, isLoading, error } = trpc.riskRuntime.listOpen.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const confirm = trpc.riskRuntime.confirm.useMutation({
    onSuccess: () => {
      setFeedback("已标记为复核中");
      void utils.riskRuntime.listOpen.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
    },
    onError: (e) => setFeedback(e.message),
  });
  const resolve = trpc.riskRuntime.resolve.useMutation({
    onSuccess: () => {
      setClosing(null);
      setFeedback("风险已关闭");
      void utils.riskRuntime.listOpen.invalidate({ projectId });
      void utils.dashboard.getHome.invalidate();
    },
    onError: (e) => setFeedback(e.message),
  });

  const alerts = data?.alerts ?? [];
  const urgent = alerts.filter(
    (a) => a.level === "critical" || a.level === "high",
  ).length;

  return (
    <section className={ui.section}>
      {!atelier ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className={ui.eyebrow}>风险</p>
            <p className={ui.blurb}>确认或关掉；严重的先复会</p>
          </div>
          <p className={ui.meta}>
            开放 {alerts.length}
            {urgent > 0 ? ` · 高优先 ${urgent}` : ""}
          </p>
        </div>
      ) : (
        <div className="mb-1 flex justify-end">
          <p className={ui.meta}>
            开放 {alerts.length}
            {urgent > 0 ? ` · 高优先 ${urgent}` : ""}
          </p>
        </div>
      )}

      {feedback ? <p className={`mt-3 ${ui.feedback}`}>{feedback}</p> : null}

      {isLoading ? (
        <p className="mt-4 text-[13px] text-[#6f747b]">加载风险列表…</p>
      ) : error ? (
        <p className="mt-4 text-[13px] text-[#a56b4d]">{error.message}</p>
      ) : alerts.length === 0 ? (
        <div
          className={
            atelier
              ? "mt-2 border border-dashed border-[rgba(20,20,19,0.14)] bg-[var(--mpnt-field)] px-6 py-10 text-center"
              : "mt-5"
          }
        >
          <p className={ui.emptyTitle}>暂无开放风险</p>
          <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
            验证偏航、禁区冲突或现金流告警出现后会落在这里。
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((alert, i) => {
            const busy =
              (confirm.isPending && confirm.variables?.riskId === alert.id) ||
              (resolve.isPending && resolve.variables?.riskId === alert.id);
            const topic =
              alert.suggestedTopic || `风险复核：${alert.title}`;
            const isHot =
              alert.level === "critical" || alert.level === "high";
            return (
              <li
                key={alert.id}
                className={`mpnt-rise ${isHot ? ui.hotItem : ui.item}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-semibold text-[#141413]">
                    {alert.title}
                  </span>
                  <span
                    className={`text-[11px] ${
                      isHot ? "text-[#a56b4d]" : "text-[#6f747b]"
                    }`}
                  >
                    {LEVEL_LABEL[alert.level] || alert.level}
                    {typeof alert.score === "number"
                      ? ` · ${Math.round(alert.score)} 分`
                      : ""}
                  </span>
                  <span className="text-[11px] text-[#6f747b]">
                    {TYPE_LABEL[alert.type] || alert.type} ·{" "}
                    {STATUS_LABEL[alert.status] || alert.status}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-6 text-[#6f747b]">
                  {alert.description}
                </p>
                {alert.suggestExpert ? (
                  <p className="mt-1 text-[12px] text-[#6f747b]">
                    建议席位 {alert.suggestExpert}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={buildMeetingHref(
                      projectId,
                      topic,
                      detectDepartmentFromTopic(topic),
                      { confirmSpend: true, spendKind: "growth" },
                    )}
                    prefetch={false}
                    className={`${ui.primaryBtn} no-underline`}
                  >
                    带着风险复会 <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  {alert.status === "open" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setFeedback(null);
                        confirm.mutate({ projectId, riskId: alert.id });
                      }}
                      className={ui.secondaryBtn}
                    >
                      确认复核
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setClosing({ id: alert.id, title: alert.title })
                    }
                    className={ui.ghostBtn}
                  >
                    关闭
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(closing)}
        title={`关闭风险「${closing?.title || ""}」？`}
        description="关闭后今日简报不再优先展示该项。需要时可在流程层重新检出。"
        confirmLabel="确认关闭"
        danger
        busy={resolve.isPending}
        onCancel={() => setClosing(null)}
        onConfirm={() => {
          if (!closing) return;
          setFeedback(null);
          resolve.mutate({ projectId, riskId: closing.id });
        }}
      />
    </section>
  );
}
