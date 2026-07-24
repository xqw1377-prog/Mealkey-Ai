"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export type ValidationResult = "aligned" | "partial" | "off";

const OPTIONS: Array<{ id: ValidationResult; label: string; hint: string; helpful: boolean }> = [
  { id: "aligned", label: "符合预期", hint: "按决策推进，结果基本对", helpful: true },
  { id: "partial", label: "部分成立", hint: "方向对，需要调整细节", helpful: true },
  { id: "off", label: "偏离了", hint: "需要复盘或再去拍板", helpful: false },
];

type ValidationTaskView = {
  id: string;
  title?: string;
  objective?: string;
  owner?: string;
  horizonDays?: number;
  status?: string;
  lifecycleLabel?: string;
  committeeLabel?: string;
  hypothesisStatement?: string;
  aiJudgement?: string;
  passProbability?: number;
  suggestRedeision?: boolean;
  triggerReasons?: string[];
  metrics?: Array<{
    id?: string;
    metricId?: string;
    label: string;
    target?: string | number;
    targetLabel?: string;
    actual?: string | number;
    actualLabel?: string;
    status?: string;
  }>;
  checkIns?: Array<{ note?: string; deviationDays?: number; riskLevel?: string }>;
};

function metricKey(m: { id?: string; metricId?: string; label: string }, index: number) {
  return m.metricId || m.id || `m-${index}-${m.label}`;
}

/**
 * 行动档案验证卡片 — 假设监督 + 指标回填 + 结果沉淀
 */
export function ValidationFeedbackCard({
  judgement,
  validationPlan,
  growthPlan,
  validationTask,
  remmeetHref,
  submitting,
  done,
  onSubmit,
  onCheckIn,
}: {
  judgement: string;
  validationPlan?: string;
  growthPlan?: { day30?: string; day60?: string; day90?: string } | null;
  validationTask?: ValidationTaskView | null;
  /** 偏航时回到拍板再判断 */
  remmeetHref?: string | null;
  submitting?: boolean;
  done?: boolean;
  onSubmit: (payload: {
    result: ValidationResult;
    helpful: boolean;
    comment?: string;
    progressNote?: string;
  }) => void | Promise<void>;
  onCheckIn?: (payload: {
    note: string;
    metrics?: Array<{ metricId: string; actual: string }>;
  }) => void | Promise<void>;
}) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [progressNote, setProgressNote] = useState("");
  const [comment, setComment] = useState("");
  const [metricActuals, setMetricActuals] = useState<Record<string, string>>({});

  const editableMetrics = useMemo(
    () => (validationTask?.metrics || []).slice(0, 4),
    [validationTask?.metrics],
  );

  const collectedMetrics = (): Array<{ metricId: string; actual: string }> =>
    editableMetrics
      .map((m, i) => {
        const key = metricKey(m, i);
        const actual = (metricActuals[key] ?? "").trim();
        if (!actual) return null;
        return { metricId: key, actual: actual.slice(0, 80) };
      })
      .filter(Boolean) as Array<{ metricId: string; actual: string }>;

  if (done) {
    return (
      <div className="border border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.08)] px-4 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#66735E]">
          <Check className="h-3.5 w-3.5" />
          验证结果已回填
        </p>
        {remmeetHref && validationTask?.suggestRedeision ? (
          <Link
            href={remmeetHref}
            prefetch={false}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 bg-[#181817] px-4 text-[13px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98] sm:w-auto"
          >
            去拍板复盘 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    );
  }

  const lastCheckIn = validationTask?.checkIns?.at(-1);
  const passPct =
    typeof validationTask?.passProbability === "number"
      ? Math.round(validationTask.passProbability * 100)
      : null;

  return (
    <div className="border border-[rgba(180,124,92,0.2)] bg-[rgba(180,124,92,0.06)] px-4 py-4">
      <p className="text-[12px] tracking-[0.06em] text-[#B47C5C]">正在验证</p>
      <p className="mt-1 text-[14px] leading-6 text-[#202124]">决策：{judgement}</p>
      {validationTask?.hypothesisStatement ? (
        <p className="mt-2 text-[13px] leading-6 text-[#5f655d]">
          假设：{validationTask.hypothesisStatement}
        </p>
      ) : null}
      {validationTask ? (
        <div className="mt-2 bg-white/80 px-3 py-2.5">
          <p className="text-[13px] font-medium text-[#202124]">
            {validationTask.lifecycleLabel || "进行中"}
            {validationTask.committeeLabel ? ` · ${validationTask.committeeLabel}` : ""}
            {validationTask.horizonDays ? ` · ${validationTask.horizonDays}天` : ""}
            {passPct !== null ? ` · 通过概率 ${passPct}%` : ""}
          </p>
          {validationTask.aiJudgement ? (
            <p className="mt-1 text-[12px] leading-5 text-[#B47C5C]">
              判断：{validationTask.aiJudgement}
            </p>
          ) : null}
          {validationTask.suggestRedeision || result === "off" ? (
            <div className="mt-2 space-y-2">
              <p className="text-[12px] font-medium text-[#B47C5C]">
                建议再开一笔决策
                {validationTask.triggerReasons?.[0]
                  ? `：${validationTask.triggerReasons[0]}`
                  : result === "off"
                    ? "：验证偏离，需校准路径"
                    : ""}
              </p>
              {remmeetHref ? (
                <Link
                  href={remmeetHref}
                  prefetch={false}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1 bg-[#181817] px-4 text-[13px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98] sm:w-auto"
                >
                  去拍板复盘 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          ) : null}
          {editableMetrics.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-[12px] font-medium text-[#202124]">今日实际指标</p>
              {editableMetrics.map((metric, index) => {
                const key = metricKey(metric, index);
                return (
                  <label
                    key={key}
                    className="flex flex-col gap-1.5 border border-[rgba(24,24,23,0.06)] bg-white px-3 py-2.5"
                  >
                    <span className="min-w-0 text-[12px] leading-5 text-[#5f655d]">
                      {metric.label}
                      {metric.targetLabel || metric.target
                        ? ` · 目标 ${metric.targetLabel || metric.target}`
                        : ""}
                      {metric.actualLabel || metric.actual
                        ? ` · 上次 ${metric.actualLabel || metric.actual}`
                        : ""}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={metricActuals[key] ?? ""}
                      onChange={(e) =>
                        setMetricActuals((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder="今日实际"
                      className="min-h-11 w-full border border-[rgba(24,24,23,0.08)] bg-[#fbfaf7] px-3 text-[14px] text-[#202124] outline-none focus:border-[#181817]"
                    />
                  </label>
                );
              })}
            </div>
          ) : null}
          {lastCheckIn?.note ? (
            <p className="mt-2 text-[12px] text-[#B47C5C]">
              最近进展：{lastCheckIn.note}
              {typeof lastCheckIn.deviationDays === "number" && lastCheckIn.deviationDays > 0
                ? ` · 偏离 +${lastCheckIn.deviationDays} 天`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}
      {validationPlan && !validationTask?.hypothesisStatement ? (
        <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">计划：{validationPlan}</p>
      ) : null}
      {growthPlan?.day30 ? (
        <ul className="mt-2 space-y-0.5 text-[12px] leading-5 text-[#6f747b]">
          <li>30天：{growthPlan.day30}</li>
          {growthPlan.day60 ? <li>60天：{growthPlan.day60}</li> : null}
          {growthPlan.day90 ? <li>90天：{growthPlan.day90}</li> : null}
        </ul>
      ) : null}

      <p className="mt-4 text-[13px] font-medium text-[#202124]">执行到现在，结果如何？</p>
      <div className="mt-2 grid gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setResult(opt.id)}
            className={`min-h-14 border px-3 py-3 text-left transition touch-manipulation active:scale-[0.99] sm:min-h-11 ${
              result === opt.id
                ? "border-[#181817] bg-[#181817] text-white"
                : "border-[rgba(24,24,23,0.08)] bg-white text-[#202124]"
            }`}
          >
            <p className="text-[14px] font-medium sm:text-[13px]">{opt.label}</p>
            <p
              className={`mt-0.5 text-[12px] leading-4 ${
                result === opt.id ? "text-white/70" : "text-[#9a968e]"
              }`}
            >
              {opt.hint}
            </p>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={progressNote}
        onChange={(e) => setProgressNote(e.target.value)}
        placeholder="进展一句（可选）：例如培训完成 70%"
        className="mt-3 min-h-11 w-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[14px] text-[#202124] outline-none focus:border-[#181817]"
      />
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="补充说明（可选）"
        className="mt-2 min-h-11 w-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[14px] text-[#202124] outline-none focus:border-[#181817]"
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {onCheckIn ? (
          <button
            type="button"
            disabled={
              submitting ||
              (!progressNote.trim() && collectedMetrics().length === 0)
            }
            onClick={() => {
              const metrics = collectedMetrics();
              const note =
                progressNote.trim() ||
                (metrics.length
                  ? `指标打卡：${metrics.map((m) => m.actual).join(" / ")}`
                  : "");
              if (!note) return;
              void onCheckIn({ note, metrics: metrics.length ? metrics : undefined });
              setProgressNote("");
              setMetricActuals({});
            }}
            className="inline-flex min-h-12 w-full items-center justify-center border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[14px] font-medium text-[#202124] touch-manipulation disabled:opacity-50 sm:min-h-11 sm:w-auto sm:text-[13px]"
          >
            提交指标 / 进度
          </button>
        ) : null}
        <button
          type="button"
          disabled={!result || submitting}
          onClick={() => {
            if (!result) return;
            const opt = OPTIONS.find((o) => o.id === result)!;
            void onSubmit({
              result,
              helpful: opt.helpful,
              comment: comment.trim() || undefined,
              progressNote: progressNote.trim() || undefined,
            });
          }}
          className="inline-flex min-h-12 w-full items-center justify-center bg-[#181817] px-4 text-[14px] font-semibold text-white touch-manipulation active:scale-[0.98] disabled:opacity-50 sm:min-h-11 sm:w-auto sm:text-[13px]"
        >
          {submitting ? "写入中…" : "确认回填"}
        </button>
      </div>
    </div>
  );
}
