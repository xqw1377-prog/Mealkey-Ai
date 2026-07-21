"use client";

import type { ConsultingNextStep } from "@mealkey/agents/m-pnt/consulting";

/** 顶部固定：永远只告诉老板「现在做这一件」 */
export function ConsultingNextStepBar({
  step,
  pending,
  onCta,
}: {
  step: ConsultingNextStep;
  pending?: boolean;
  onCta: () => void;
}) {
  const done = step.actionId === "done";
  return (
    <div
      className={`sticky top-0 z-20 -mx-1 border px-4 py-3 shadow-[0_8px_24px_rgba(24,24,23,0.06)] backdrop-blur-sm ${
        done
          ? "border-[rgba(102,115,94,0.35)] bg-[rgba(102,115,94,0.12)]"
          : "border-[#181817] bg-[#181817] text-white"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p
            className={`text-[11px] tracking-[0.1em] ${
              done ? "text-[#66735E]" : "text-white/70"
            }`}
          >
            现在只做这一步 · {step.stepLabel}
          </p>
          <p
            className={`text-[15px] font-semibold leading-6 ${
              done ? "text-[#202124]" : "text-white"
            }`}
          >
            {step.title}
          </p>
          <p
            className={`text-[13px] leading-5 ${
              done ? "text-[#66735E]" : "text-white/75"
            }`}
          >
            {step.detail}
          </p>
        </div>
        {!done ? (
          <button
            type="button"
            disabled={pending}
            onClick={onCta}
            className="inline-flex min-h-11 shrink-0 items-center justify-center bg-white px-5 text-[14px] font-semibold text-[#181817] disabled:opacity-50"
          >
            {step.ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
