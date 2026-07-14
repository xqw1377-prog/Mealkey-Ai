"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

type FeedbackWidgetProps = {
  question: string;
  onSubmit: (helpful: boolean, comment?: string) => Promise<void> | void;
  pending?: boolean;
  done?: boolean;
  allowComment?: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
  className?: string;
};

export function FeedbackWidget({
  question,
  onSubmit,
  pending = false,
  done = false,
  allowComment = false,
  positiveLabel = "有帮助",
  negativeLabel = "有偏差",
  className,
}: FeedbackWidgetProps) {
  const [choice, setChoice] = useState<"positive" | "negative" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (done) {
    return <p className="text-[13px] text-[#66735E]">感谢反馈。</p>;
  }

  const busy = pending || submitting;

  async function commit(helpful: boolean, nextComment?: string) {
    setSubmitting(true);
    try {
      await onSubmit(helpful, nextComment);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className={
        className ??
        "rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)]"
      }
    >
      <p className="text-[13px] leading-5 tracking-[0.01em] text-[#5f6368]">{question}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (allowComment) {
              setChoice("positive");
              return;
            }
            void commit(true);
          }}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] transition active:scale-[0.98] disabled:opacity-50 ${
            choice === "positive"
              ? "border-[#66735E] bg-[rgba(102,115,94,0.10)] text-[#66735E]"
              : "border-[rgba(24,24,23,0.08)] bg-[#FBF9F5] text-[#202124] hover:border-[#66735E]"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {positiveLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (allowComment) {
              setChoice("negative");
              return;
            }
            void commit(false);
          }}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] transition active:scale-[0.98] disabled:opacity-50 ${
            choice === "negative"
              ? "border-[#B47C5C] bg-[rgba(180,124,92,0.10)] text-[#8A4F31]"
              : "border-[rgba(24,24,23,0.08)] bg-[#FBF9F5] text-[#202124] hover:border-[#B47C5C]"
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {negativeLabel}
        </button>
        {busy ? <span className="text-[12px] text-[#6f747b]">提交中…</span> : null}
      </div>

      {allowComment && choice ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBF9F5] px-3 py-2 text-[13px] text-[#202124] outline-none focus:border-[#66735E]"
            placeholder={choice === "positive" ? "有什么特别认可的地方？" : "你觉得哪里不对？"}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#6f747b]">{comment.length}/500</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void commit(choice === "positive", comment || undefined)}
              className="inline-flex min-h-9 items-center rounded-full bg-[#181817] px-4 text-[12px] font-medium text-white disabled:opacity-50"
            >
              提交反馈
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
