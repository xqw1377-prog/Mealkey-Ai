"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export type ValidationResult = "aligned" | "partial" | "off";

const OPTIONS: Array<{ id: ValidationResult; label: string; hint: string; helpful: boolean }> = [
  { id: "aligned", label: "符合预期", hint: "按决策推进，结果基本对", helpful: true },
  { id: "partial", label: "部分成立", hint: "方向对，需要调整细节", helpful: true },
  { id: "off", label: "偏离了", hint: "需要复盘或第二次会议", helpful: false },
];

/**
 * 验证回填 — 会议决策卡的执行结果闭环
 */
export function ValidationFeedbackCard({
  judgement,
  validationPlan,
  growthPlan,
  submitting,
  done,
  onSubmit,
}: {
  judgement: string;
  validationPlan?: string;
  growthPlan?: { day30?: string; day60?: string; day90?: string } | null;
  submitting?: boolean;
  done?: boolean;
  onSubmit: (payload: {
    result: ValidationResult;
    helpful: boolean;
    comment?: string;
    progressNote?: string;
  }) => void | Promise<void>;
}) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [progressNote, setProgressNote] = useState("");
  const [comment, setComment] = useState("");

  if (done) {
    return (
      <div className="rounded-[16px] border border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.08)] px-4 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#66735E]">
          <Check className="h-3.5 w-3.5" />
          验证结果已回填，已写入 Memory
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[rgba(180,124,92,0.2)] bg-[rgba(180,124,92,0.06)] px-4 py-4">
      <p className="text-[12px] tracking-[0.06em] text-[#B47C5C]">验证回填</p>
      <p className="mt-1 text-[14px] leading-6 text-[#202124]">
        上次决定：{judgement}
      </p>
      {validationPlan ? (
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
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setResult(opt.id)}
            className={`rounded-[12px] border px-3 py-2.5 text-left transition ${
              result === opt.id
                ? "border-[#181817] bg-[#181817] text-white"
                : "border-[rgba(24,24,23,0.08)] bg-white text-[#202124]"
            }`}
          >
            <p className="text-[13px] font-medium">{opt.label}</p>
            <p className={`mt-0.5 text-[11px] leading-4 ${result === opt.id ? "text-white/70" : "text-[#9a968e]"}`}>
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
        className="mt-3 w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
      />
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="补充说明（可选）"
        className="mt-2 w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
      />

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
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-[12px] bg-[#181817] px-4 text-[13px] font-semibold text-white disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "写入中…" : "确认回填"}
      </button>
    </div>
  );
}
